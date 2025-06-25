import os
import json
import io
import uuid
import logging
import psutil
import gc
import signal
import sys
from datetime import datetime
import numpy as np
import boto3
from flask import Flask, request, jsonify, send_from_directory
from PIL import Image
import pillow_heif
from sklearn.cluster import KMeans
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import base64
import time
from functools import lru_cache
from flask_cors import CORS

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[
        logging.FileHandler("app.log"),
        logging.StreamHandler(sys.stdout)
    ]
)

logging.info(f"Entrypoint: {__file__}")
logging.info(f"Working directory: {os.getcwd()}")
logging.info(f"sys.argv: {sys.argv}")
logging.info(f"Python version: {sys.version}")
logging.info(f"__name__: {__name__}")
logging.info("Environment variables (filtered):")
for k, v in os.environ.items():
    if not any(s in k for s in ["KEY", "SECRET", "PASSWORD"]):
        logging.info(f"  {k}={v}")

logger = logging.getLogger(__name__)

# Memory monitoring function
def log_memory_usage(context=""):
    """Log current memory usage for debugging"""
    try:
        process = psutil.Process()
        memory_info = process.memory_info()
        memory_percent = process.memory_percent()
        logger.info(f"Memory usage {context}: {memory_info.rss / 1024 / 1024:.2f} MB ({memory_percent:.1f}%)")
        return memory_info.rss
    except Exception as e:
        logger.warning(f"Could not get memory usage: {e}")
        return 0

# Signal handlers for graceful shutdown
def signal_handler(signum, frame):
    """Handle shutdown signals gracefully"""
    logger.info(f"Received signal {signum}, shutting down gracefully...")
    log_memory_usage("before shutdown")
    sys.exit(0)

# Register signal handlers
signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

logger.info("=== Application Starting ===")
log_memory_usage("at startup")

# The static_folder argument points to the 'static' directory, which now contains the frontend.
# The static_url_path='' makes the static files available from the root URL.
# Configure app to serve frontend files
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend'))
app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path='')
CORS(app)

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

# --- Configuration & Setup ---
CATALOG_DIR = os.path.join(os.path.dirname(__file__), 'catalog')
CATALOG_JSON_PATH = os.path.join(CATALOG_DIR, 'catalog.json')
ARTWORK_IMAGE_DIR = os.path.join(CATALOG_DIR, 'images')
UPLOAD_DIR_APPROVED = os.path.join(os.path.dirname(__file__), 'uploads', 'approved')
UPLOAD_DIR_QUARANTINE = os.path.join(os.path.dirname(__file__), 'uploads', 'quarantined')

# Create upload directories if they don't exist for local mode
os.makedirs(UPLOAD_DIR_APPROVED, exist_ok=True)
os.makedirs(UPLOAD_DIR_QUARANTINE, exist_ok=True)

# Environment configuration ('local' or 'aws')
APP_ENV = os.environ.get('APP_ENV', 'local')
logger.info(f"Application environment: {APP_ENV}")

# Bucket configuration from environment variables (for aws mode)
APPROVED_BUCKET = os.environ.get('APPROVED_BUCKET', 'taberner-studio-images')
QUARANTINE_BUCKET = os.environ.get('QUARANTINE_BUCKET', 'taberner-studio-quarantine')

# Load art catalog from JSON file
def load_catalog():
    """Load art catalog from JSON file with caching."""
    # Check cache first
    cached_data = catalog_cache.get('art_catalog')
    if cached_data:
        logger.info("Returning cached catalog data")
        return cached_data
    
    # Cache miss - load from file
    logger.info("Cache miss - loading catalog from JSON file")
    try:
        catalog_path = os.path.join(os.path.dirname(__file__), 'catalog', 'catalog.json')
        with open(catalog_path, 'r') as f:
            data = json.load(f)
        
        # Store in cache
        catalog_cache.set('art_catalog', data)
        logger.info(f"Loaded {len(data)} items from JSON file and cached")
        
        return data
    except Exception as e:
        logger.error(f"Error loading catalog: {str(e)}")
        return []

# Load catalog data
art_catalog = load_catalog()

# --- AWS & Limiter Setup (Conditional) ---
rekognition, s3 = None, None
if APP_ENV == 'aws':
    try:
        logger.info("Initializing AWS clients...")
        rekognition = boto3.client('rekognition')
        s3 = boto3.client('s3')
        logger.info("AWS clients configured successfully for 'aws' mode.")
        log_memory_usage("after AWS client setup")
    except Exception as e:
        logger.error(f"CRITICAL: Error configuring AWS clients: {e}. AWS features will fail.")
else:
    logger.info("Running in 'local' mode. AWS services are disabled.")

# Rate limiting implementation (only enabled in 'aws' mode)
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://",
    enabled=(APP_ENV == 'aws'),
)
logger.info(f"Rate limiting enabled: {APP_ENV == 'aws'}")

# --- Core Logic: Color Analysis, Moderation, Storage ---

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def extract_dominant_colors(image_stream, n_colors=5):
    """Extracts dominant colors from an image stream with their percentages."""
    try:
        logger.debug("Starting color extraction...")
        img = Image.open(image_stream).convert('RGB')
        img.thumbnail((100, 100))
        pixels = np.array(img).reshape(-1, 3)
        
        logger.debug(f"Running KMeans clustering with {n_colors} colors...")
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
            logger.info(f"Successfully analyzed image colors: {len(dominant_colors)} colors found")
            return dominant_colors
        return []
    except Exception as e:
        logger.error(f"Error extracting colors: {e}")
        return []

def get_recommendations(user_colors):
    """Finds the best matching artworks from the catalog based on weighted color harmony."""
    logger.debug("Starting color-based recommendations...")
    recommendations = []
    if not art_catalog:
        logger.warning("No art catalog available for recommendations")
        return recommendations

    for artwork in art_catalog:
        catalog_colors = artwork['attributes']['dominant_colors']
        if not catalog_colors:
            continue

        # Convert hex to RGB for comparison
        user_rgb = {item['color']: (tuple(int(item['color'][i:i+2], 16) for i in (1, 3, 5)), item['percentage']) for item in user_colors}
        catalog_rgb = {item['color']: (tuple(int(item['color'][i:i+2], 16) for i in (1, 3, 5)), item['percentage']) for item in catalog_colors}

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
    logger.info(f"Generated {len(recommendations)} color-based recommendations")
    return recommendations[:10]

def get_recommendations_by_filter(filters):
    """Finds artworks matching the selected mood, style, subject, and color filters."""
    logger.debug(f"Starting filter-based recommendations with filters: {filters}")
    if not art_catalog:
        logger.warning("No art catalog available for filter recommendations")
        return []

    # Check if any actual filter values were selected
    all_selected_filters = filters.get('moods', []) + filters.get('styles', []) + filters.get('subjects', []) + filters.get('colors', [])
    if not all_selected_filters:
        logger.info("No filters provided, returning default recommendations")
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
    logger.info(f"Generated {len(filtered_artworks)} filter-based recommendations")
    return filtered_artworks[:9]

def moderate_image_content(image_bytes):
    if APP_ENV == 'local' or not rekognition:
        app.logger.info("Skipping moderation (not in 'aws' mode or client failed).")
        return True, "Image approved (local mode)"
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
    if APP_ENV == 'local':
        path = os.path.join(UPLOAD_DIR_QUARANTINE, f"{uuid.uuid4()}-{filename}")
        with open(path, 'wb') as f:
            f.write(image_bytes)
        app.logger.info(f"Stored quarantined image locally: {path}")
    elif s3:
        key = f"quarantine/{uuid.uuid4()}-{filename}"
        try:
            s3.put_object(Bucket=QUARANTINE_BUCKET, Key=key, Body=image_bytes, Metadata={'reason': reason})
            app.logger.info(f"Stored quarantined image in S3: {key}")
        except Exception as e:
            app.logger.error(f"Error storing quarantined image in S3: {e}")

# --- API Endpoints ---

@app.route('/')
def serve_index():
    logger.info("Serving index page")
    if app.static_folder:
        return send_from_directory(app.static_folder, 'index.html')
    logger.error("Frontend not found - static_folder not configured")
    return "Frontend not found", 404

@app.route('/recommend', methods=['POST'])
@limiter.limit("30 per minute")
def recommend_unified():
    """
    Unified endpoint for getting recommendations.
    Accepts either an image upload or a set of preferences.
    """
    logger.info("Received recommendation request")
    log_memory_usage("before recommendation processing")
    
    data = request.get_json()
    if not data:
        logger.warning("Invalid request - no JSON data")
        return jsonify(error="Invalid request"), 400

    rec_type = data.get('type')
    logger.info(f"Processing recommendation type: {rec_type}")
    recommendations = []

    if rec_type == 'upload':
        image_data = data.get('roomImage')
        if not image_data:
            logger.warning("No image data provided for upload type")
            return jsonify(error="No image data provided for upload type"), 400
        
        try:
            logger.info("Processing uploaded image...")
            # Decode the base64 string
            header, encoded = image_data.split(",", 1)
            image_bytes = base64.b64decode(encoded)
            
            # Use a generic filename for processing
            filename = "uploaded_image.jpg"
            
            is_approved, reason = moderate_image_content(image_bytes)
            if not is_approved:
                logger.warning(f"Image moderation failed: {reason}")
                store_quarantined_image(image_bytes, filename, reason)
                return jsonify(error=f"Moderation failed: {reason}"), 400

            user_colors = extract_dominant_colors(io.BytesIO(image_bytes))
            if not user_colors:
                logger.error("Could not analyze image colors")
                return jsonify(error="Could not analyze image colors."), 500
            
            recs = get_recommendations(user_colors)
            recommendations = [rec['artwork'] for rec in recs]
            logger.info(f"Successfully returned {len(recommendations)} recommendations for uploaded image")

        except Exception as e:
            logger.error(f"Error processing uploaded image: {e}")
            return jsonify(error="Failed to process image"), 500

    elif rec_type == 'preferences':
        preferences = data.get('preferences')
        if not preferences:
            logger.warning("No preferences provided for preferences type")
            return jsonify(error="No preferences provided for preferences type"), 400
        
        logger.info(f"Processing preferences: {preferences}")
        # Filter out empty values and adapt the preferences to the format expected by get_recommendations_by_filter
        filters = {
            'moods': [preferences['mood']] if preferences.get('mood') and preferences['mood'].strip() else [],
            'styles': [preferences['style']] if preferences.get('style') and preferences['style'].strip() else [],
            'subjects': [preferences['subject']] if preferences.get('subject') and preferences['subject'].strip() else [],
            'colors': [preferences['color']] if preferences.get('color') and preferences['color'].strip() else [],
        }
        recs = get_recommendations_by_filter(filters)
        recommendations = [rec['artwork'] for rec in recs]
        logger.info(f"Successfully returned {len(recommendations)} recommendations for preferences")
    
    else:
        logger.warning(f"Invalid recommendation type: {rec_type}")
        return jsonify(error="Invalid recommendation type specified"), 400

    # Format the final recommendations list
    formatted_recs = [{
        'id': art['id'],
        'title': art['title'],
        'artist': art['artist'],
        'description': art['description'],
        'price': f"${art['price']}",
        'product_url': art['product_url'],
        'filename': art['filename'],
        'attributes': art['attributes']
    } for art in recommendations]

    log_memory_usage("after recommendation processing")
    return jsonify(recommendations=formatted_recs)

@app.route('/api/preferences-options')
def preferences_options():
    """Return unique styles, moods, subjects, and colors from the catalog."""
    styles = set()
    moods = set()
    subjects = set()
    colors = set()
    
    if not art_catalog:
        logger.warning("No art catalog available for preferences options")
        return jsonify({
            'styles': [],
            'moods': [],
            'subjects': [],
            'colors': []
        })
    
    for art in art_catalog:
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
        import requests
        response = requests.get(image_url, timeout=30)
        response.raise_for_status()
        
        # Get the content type
        content_type = response.headers.get('content-type', 'image/jpeg')
        
        # Convert to base64
        import base64
        image_data = base64.b64encode(response.content).decode('utf-8')
        
        # Create data URL
        data_url = f"data:{content_type};base64,{image_data}"
        
        return jsonify({'data_url': data_url})
        
    except Exception as e:
        logger.error(f"Error converting image to data URL: {str(e)}")
        return jsonify({'error': 'Failed to convert image'}), 500

@app.route('/catalog/images/<path:filename>')
def serve_catalog_image(filename):
    logger.debug(f"Serving catalog image: {filename}")
    return send_from_directory(ARTWORK_IMAGE_DIR, filename)

@app.route('/api/clear-cache')
def clear_cache():
    """Clear the catalog cache (admin endpoint)."""
    catalog_cache.clear()
    logger.info("Catalog cache cleared")
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

@app.errorhandler(429)
def ratelimit_handler(e):
    logger.warning(f"Rate limit exceeded: {e.description}")
    return jsonify(error="ratelimit exceeded", description=str(e.description)), 429

@app.errorhandler(404)
def not_found_handler(e):
    logger.warning(f"404 error for path: {request.path}")
    return "Not found", 404

# Main entry point for running the app locally.
# When deployed on Elastic Beanstalk, the WSGI server (e.g., Gunicorn) will run the app.
if __name__ == '__main__':
    logger.info("=== Starting Flask Application ===")
    log_memory_usage("at application start")
    
    # For local development, we can run the app with debug mode.
    # Disable reloader to avoid semaphore issues and process cleanup problems
    try:
        logger.info("Starting Flask development server on port 8000...")
        # Disable reloader to prevent semaphore issues
        app.run(debug=True, port=8000, use_reloader=False, host='127.0.0.1')
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt, shutting down gracefully...")
    except Exception as e:
        logger.error(f"Failed to start Flask application: {e}")
        sys.exit(1)
    finally:
        logger.info("=== Flask Application Shutting Down ===")
        log_memory_usage("at application shutdown")
        # Force garbage collection
        gc.collect()
