import os
import json
import io
import uuid
from datetime import datetime
import numpy as np
import boto3
from flask import Flask, request, jsonify, send_from_directory, render_template_string
from PIL import Image
import pillow_heif
from sklearn.cluster import KMeans
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import base64
import requests
import logging
from flask_cors import CORS
import time
from functools import lru_cache

# Configure Flask app
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), 'static'))
app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path='')
CORS(app)

# --- AWS Configuration ---
APP_ENV = os.environ.get('APP_ENV', 'aws')  # Default to AWS mode

# AWS Resource Names
CATALOG_TABLE_NAME = os.environ.get('CATALOG_TABLE_NAME', 'taberner-studio-catalog')
CATALOG_BUCKET_NAME = os.environ.get('CATALOG_BUCKET_NAME', 'taberner-studio-catalog-images')
APPROVED_BUCKET = os.environ.get('APPROVED_BUCKET', 'taberner-studio-images')
QUARANTINE_BUCKET = os.environ.get('QUARANTINE_BUCKET', 'taberner-studio-quarantine')

# AWS Clients
dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')
rekognition = boto3.client('rekognition')

# DynamoDB Table
catalog_table = dynamodb.Table(CATALOG_TABLE_NAME)

# Rate limiting
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://",
    enabled=True,
)

# Simple in-memory cache
class SimpleCache:
    def __init__(self, ttl_seconds=300):  # 5 minutes default TTL
        self.cache = {}
        self.ttl = ttl_seconds
    
    def get(self, key):
        if key in self.cache:
            data, timestamp = self.cache[key]
            if time.time() - timestamp < self.ttl:
                return data
            else:
                del self.cache[key]  # Expired
        return None
    
    def set(self, key, value):
        self.cache[key] = (value, time.time())
    
    def clear(self):
        self.cache.clear()

# Initialize cache
catalog_cache = SimpleCache(ttl_seconds=300)  # 5 minutes cache

# Configure logging

# --- Core Logic: Color Analysis, Moderation, Storage ---

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def extract_dominant_colors(image_stream, n_colors=5):
    """Extracts dominant colors from an image stream with their percentages."""
    try:
        img = Image.open(image_stream).convert('RGB')
        img.thumbnail((100, 100))
        pixels = np.array(img).reshape(-1, 3)
        kmeans = KMeans(n_clusters=n_colors, random_state=42, n_init='auto').fit(pixels)
        
        colors = kmeans.cluster_centers_.astype(int)
        labels = kmeans.labels_
        
        if labels is not None:
            label_counts = np.bincount(labels)
            total_pixels = len(pixels)
            percentages = label_counts / total_pixels
            
            dominant_colors = []
            for i in range(len(colors)):
                dominant_colors.append({
                    'color': f'#{colors[i][0]:02x}{colors[i][1]:02x}{colors[i][2]:02x}',
                    'percentage': float(percentages[i])
                })
                
            dominant_colors.sort(key=lambda x: x['percentage'], reverse=True)
            return dominant_colors
        return []
    except Exception as e:
        app.logger.error(f"Error extracting colors: {e}")
        return []

def load_catalog_from_dynamodb():
    """Load art catalog from DynamoDB with caching."""
    # Check cache first
    cached_data = catalog_cache.get('art_catalog')
    if cached_data:
        app.logger.info("Returning cached catalog data")
        return cached_data
    
    # Cache miss - fetch from DynamoDB
    app.logger.info("Cache miss - fetching catalog from DynamoDB")
    try:
        response = catalog_table.scan()
        items = response.get('Items', [])
        
        # Handle pagination if needed
        while 'LastEvaluatedKey' in response:
            response = catalog_table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            items.extend(response.get('Items', []))
        
        # Store in cache
        catalog_cache.set('art_catalog', items)
        app.logger.info(f"Fetched {len(items)} items from DynamoDB and cached")
        
        return items
    except Exception as e:
        app.logger.error(f"Error loading catalog from DynamoDB: {str(e)}")
        return []

def get_recommendations(user_colors):
    """Finds the best matching artworks from the catalog based on weighted color harmony."""
    recommendations = []
    
    # Load catalog from DynamoDB
    art_catalog = load_catalog_from_dynamodb()
    if not art_catalog:
        return recommendations

    for artwork in art_catalog:
        catalog_colors = artwork['attributes']['dominant_colors']
        if not catalog_colors:
            continue

        # Convert hex to RGB for comparison, and ensure percentages are float
        user_rgb = {item['color']: (tuple(int(item['color'][i:i+2], 16) for i in (1, 3, 5)), float(item['percentage'])) for item in user_colors}
        catalog_rgb = {item['color']: (tuple(int(item['color'][i:i+2], 16) for i in (1, 3, 5)), float(item['percentage'])) for item in catalog_colors}

        # Weighted color distance score
        total_score = 0
        for uc_hex, (uc_rgb, uc_perc) in user_rgb.items():
            for cc_hex, (cc_rgb, cc_perc) in catalog_rgb.items():
                dist = np.linalg.norm(np.array(uc_rgb) - np.array(cc_rgb))
                # Weight the distance by the product of the color percentages
                total_score += dist * uc_perc * cc_perc
        
        if total_score > 0:
            recommendations.append({
                'artwork': artwork,
                'score': total_score
            })

    # Sort by score (ascending, lower is better)
    recommendations.sort(key=lambda x: x['score'])
    return recommendations[:10]

def get_recommendations_by_filter(filters):
    """Finds artworks matching the selected mood, style, subject, and color filters."""
    # Load catalog from DynamoDB
    art_catalog = load_catalog_from_dynamodb()
    if not art_catalog:
        return []

    # Check if any actual filter values were selected
    all_selected_filters = filters.get('moods', []) + filters.get('styles', []) + filters.get('subjects', []) + filters.get('colors', [])
    if not all_selected_filters:
        # If no filters are provided, return a default list of recommendations.
        return [{'artwork': art, 'score': 0} for art in art_catalog[:10]]

    filtered_artworks = []

    for artwork in art_catalog:
        attrs = artwork.get('attributes', {})
        
        # Check if artwork matches the selected filters
        mood_match = not filters.get('moods') or (attrs.get('mood') and any(f.lower() in attrs.get('mood', '').lower() for f in filters['moods']))
        style_match = not filters.get('styles') or (attrs.get('style') and any(f.lower() in attrs.get('style', '').lower() for f in filters['styles']))
        subject_match = not filters.get('subjects') or (attrs.get('subject') and any(f.lower() in attrs.get('subject', '').lower() for f in filters['subjects']))
        
        # For color matching, we'll use the dominant colors instead of color_scheme
        color_match = True  # Default to True if no color filter
        if filters.get('colors'):
            # Check if any of the dominant colors match the color preference
            dominant_colors = attrs.get('dominant_colors', [])
            if dominant_colors:
                # Simple color matching based on color names
                color_match = False
                for color_info in dominant_colors:
                    color_hex = color_info.get('color', '').lower()
                    for color_filter in filters['colors']:
                        if color_filter.lower() in ['warm', 'cool', 'neutral', 'bold', 'pastel']:
                            # Basic color categorization
                            if color_filter.lower() == 'warm' and any(c in color_hex for c in ['ff', 'f0', 'e0', 'd0', 'c0', 'b0', 'a0', '90', '80', '70', '60', '50', '40', '30', '20', '10']):
                                color_match = True
                                break
                            elif color_filter.lower() == 'cool' and any(c in color_hex for c in ['00', '10', '20', '30', '40', '50', '60', '70', '80', '90', 'a0', 'b0', 'c0', 'd0', 'e0', 'f0']):
                                color_match = True
                                break
                            elif color_filter.lower() == 'neutral' and any(c in color_hex for c in ['88', '99', 'aa', 'bb', 'cc', 'dd', 'ee', 'ff']):
                                color_match = True
                                break
                        if color_match:
                            break
                    if color_match:
                        break

        if mood_match and style_match and subject_match and color_match:
            score = 0
            if filters.get('moods'): score += 1
            if filters.get('styles'): score += 1
            if filters.get('subjects'): score += 1
            if filters.get('colors'): score += 1
            
            filtered_artworks.append({
                'artwork': artwork,
                'score': score
            })

    filtered_artworks.sort(key=lambda x: x['score'], reverse=True)
    return filtered_artworks[:9]

def moderate_image_content(image_bytes):
    """Moderate image content using AWS Rekognition"""
    try:
        response = rekognition.detect_moderation_labels(Image={'Bytes': image_bytes}, MinConfidence=75)
        if response['ModerationLabels']:
            labels = {l['Name'] for l in response['ModerationLabels']}
            return False, f"Inappropriate content detected: {', '.join(labels)}"
        return True, "Image approved"
    except Exception as e:
        app.logger.error(f"Error during moderation: {e}. Approving by default.")
        return True, "Moderation check failed, approved by default"

def store_quarantined_image(image_bytes, filename, reason):
    """Store quarantined image in S3"""
    key = f"quarantine/{uuid.uuid4()}-{filename}"
    try:
        s3.put_object(
            Bucket=QUARANTINE_BUCKET, 
            Key=key, 
            Body=image_bytes, 
            Metadata={'reason': reason}
        )
        app.logger.info(f"Stored quarantined image in S3: {key}")
    except Exception as e:
        app.logger.error(f"Error storing quarantined image in S3: {e}")

# --- API Endpoints ---

@app.route('/')
def serve_index():
    if app.static_folder:
        return send_from_directory(app.static_folder, 'index.html')
    return "Frontend not found", 404

@app.route('/recommend', methods=['POST'])
@limiter.limit("30 per minute")
def recommend_unified():
    """
    Unified endpoint for getting recommendations.
    Accepts either an image upload or a set of preferences.
    """
    # Clear cache at the beginning to ensure fresh recommendations
    app.logger.info("=== RECOMMENDATION REQUEST START ===")
    app.logger.info(f"Cache size before clearing: {len(catalog_cache.cache)}")
    catalog_cache.clear()
    app.logger.info(f"Cache cleared. Cache size after clearing: {len(catalog_cache.cache)}")
    
    data = request.get_json()
    if not data:
        return jsonify(error="Invalid request"), 400

    rec_type = data.get('type')
    app.logger.info(f"Recommendation type: {rec_type}")
    
    recommendations = []

    if rec_type == 'upload':
        app.logger.info("Processing UPLOAD-based recommendation")
        image_data = data.get('roomImage')
        if not image_data:
            app.logger.error("No image data provided for upload type")
            return jsonify(error="No image data provided for upload type"), 400
        
        try:
            # Decode the base64 string
            header, encoded = image_data.split(",", 1)
            image_bytes = base64.b64decode(encoded)
            
            # Use a generic filename for processing
            filename = "uploaded_image.jpg"
            
            is_approved, reason = moderate_image_content(image_bytes)
            if not is_approved:
                store_quarantined_image(image_bytes, filename, reason)
                app.logger.error(f"Moderation failed: {reason}")
                return jsonify(error=f"Moderation failed: {reason}"), 400
            
            user_colors = extract_dominant_colors(io.BytesIO(image_bytes))
            if not user_colors:
                app.logger.error("Could not analyze image colors")
                return jsonify(error="Could not analyze image colors."), 500
            
            app.logger.info(f"Successfully analyzed image colors: {len(user_colors)} colors found")
            recs = get_recommendations(user_colors)
            recommendations = [rec['artwork'] for rec in recs]
            app.logger.info(f"Generated {len(recommendations)} recommendations for uploaded image")

        except Exception as e:
            app.logger.error(f"Error processing uploaded image: {e}")
            return jsonify(error="Failed to process image"), 500
        
    elif rec_type == 'preferences':
        app.logger.info("Processing PREFERENCES-based recommendation")
        preferences = data.get('preferences')
        if not preferences:
            app.logger.error("No preferences provided for preferences type")
            return jsonify(error="No preferences provided for preferences type"), 400
        
        # Filter out empty values and adapt the preferences to the format expected by get_recommendations_by_filter
        filters = {
            'moods': [preferences['mood']] if preferences.get('mood') and preferences['mood'].strip() else [],
            'styles': [preferences['style']] if preferences.get('style') and preferences['style'].strip() else [],
            'subjects': [preferences['subject']] if preferences.get('subject') and preferences['subject'].strip() else [],
            'colors': [preferences['color']] if preferences.get('color') and preferences['color'].strip() else [],
        }
        
        app.logger.info(f"Processing preferences: {filters}")
        recs = get_recommendations_by_filter(filters)
        recommendations = [rec['artwork'] for rec in recs]
        app.logger.info(f"Generated {len(recommendations)} recommendations for preferences")
        
    else:
        app.logger.error(f"Invalid recommendation type: {rec_type}")
        return jsonify(error="Invalid recommendation type specified"), 400

    # Format the final recommendations list
    formatted_recommendations = []
    for rec in recommendations:
        formatted_rec = {
            'id': rec['id'],
            'title': rec['title'],
            'artist': rec['artist'],
            'description': rec.get('description', ''),
            'price': rec.get('price', ''),
            'product_url': rec.get('product_url', ''),
            'filename': rec.get('filename', ''),
            'attributes': rec.get('attributes', {})
        }
        formatted_recommendations.append(formatted_rec)
    
    app.logger.info(f"=== RECOMMENDATION REQUEST COMPLETE ===")
    app.logger.info(f"Returning {len(formatted_recommendations)} recommendations")
    app.logger.info(f"First recommendation: {formatted_recommendations[0]['title'] if formatted_recommendations else 'None'}")
    
    return jsonify({
        'recommendations': formatted_recommendations,
        'type': rec_type
    })

@app.route('/api/preferences-options')
def preferences_options():
    """Return unique styles, moods, subjects, and colors from the catalog."""
    items = load_catalog_from_dynamodb()
    styles = set()
    moods = set()
    subjects = set()
    colors = set()
    for art in items:
        attrs = art.get('attributes', {})
        if attrs.get('style'):
            styles.add(attrs['style'])
        if attrs.get('mood'):
            moods.add(attrs['mood'])
        if attrs.get('subject'):
            subjects.add(attrs['subject'])
        if attrs.get('dominant_colors'):
            for color in attrs['dominant_colors']:
                if color.get('color'):
                    colors.add(color['color'])
    return jsonify({
        'styles': sorted(list(styles)),
        'moods': sorted(list(moods)),
        'subjects': sorted(list(subjects)),
        'colors': sorted(list(colors))
    })

@app.route('/api/convert-image-to-data-url')
def convert_image_to_data_url():
    """Convert an S3 image URL to a data URL to avoid CORS issues."""
    image_url = request.args.get('url')
    if not image_url:
        return jsonify({'error': 'No URL provided'}), 400
    
    try:
        # Fetch the image from S3
        response = requests.get(image_url, timeout=30)
        response.raise_for_status()
        
        # Get the content type
        content_type = response.headers.get('content-type', 'image/jpeg')
        
        # Convert to base64
        image_data = base64.b64encode(response.content).decode('utf-8')
        
        # Create data URL
        data_url = f"data:{content_type};base64,{image_data}"
        
        return jsonify({'data_url': data_url})
        
    except Exception as e:
        app.logger.error(f"Error converting image to data URL: {str(e)}")
        return jsonify({'error': 'Failed to convert image'}), 500

@app.route('/catalog/images/<path:filename>')
def serve_catalog_image(filename):
    """Serve catalog images from S3"""
    try:
        # Generate a presigned URL for the image in S3
        url = s3.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': CATALOG_BUCKET_NAME,
                'Key': filename
            },
            ExpiresIn=3600  # URL expires in 1 hour
        )
        return jsonify({'url': url})
    except Exception as e:
        app.logger.error(f"Error generating S3 URL for {filename}: {e}")
        return jsonify(error="Image not found"), 404

@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify(error="ratelimit exceeded", description=str(e.description)), 429

@app.route('/health')
def health_check():
    """Health check endpoint for Docker and load balancers"""
    try:
        # Simple health check - don't check DynamoDB for now
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'environment': APP_ENV
        }), 200
    except Exception as e:
        app.logger.error(f"Health check failed: {e}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        }), 500

@app.route('/api/clear-cache')
def clear_cache():
    """Clear the catalog cache (admin endpoint)."""
    catalog_cache.clear()
    app.logger.info("Catalog cache cleared")
    return jsonify({'message': 'Cache cleared successfully'})

@app.route('/api/cache-stats')
def cache_stats():
    """Get cache statistics (admin endpoint)."""
    cache_info = {
        'cache_size': len(catalog_cache.cache),
        'ttl_seconds': catalog_cache.ttl,
        'cache_keys': list(catalog_cache.cache.keys())
    }
    return jsonify(cache_info)

@app.route('/api/reset-workflow', methods=['POST'])
def reset_workflow():
    """Clear cache when user resets workflow (Back to Start)."""
    catalog_cache.clear()
    app.logger.info("Workflow reset: Catalog cache cleared")
    return jsonify({'message': 'Workflow reset successfully'})

# Main entry point
if __name__ == '__main__':
    app.run(debug=True, port=8000, use_reloader=True) 