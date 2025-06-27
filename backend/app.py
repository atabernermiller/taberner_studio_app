import os
try:
    from dotenv import load_dotenv
    load_dotenv()  # Loads variables from .env if present
except ImportError:
    pass  # dotenv is optional in production
import json
import io
import uuid
import logging
import psutil
import gc
import signal
import sys
from datetime import datetime, timedelta
import numpy as np
import boto3
from flask import Flask, request, jsonify, send_from_directory, render_template_string
from PIL import Image, ImageDraw, ImageFont
import pillow_heif
from sklearn.cluster import KMeans
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import base64
import requests
import time
from functools import lru_cache
from flask_cors import CORS
import hashlib
import re
from io import BytesIO
from werkzeug.utils import secure_filename
from botocore.exceptions import ClientError, NoCredentialsError

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

# --- AWS Configuration ---
APP_ENV = os.environ.get('APP_ENV', 'aws')  # Default to AWS mode

# Recommendation Configuration
MAX_RECOMMENDATIONS = int(os.environ.get('MAX_RECOMMENDATIONS', '8'))  # Default to 8 for better UX
MIN_RECOMMENDATIONS = int(os.environ.get('MIN_RECOMMENDATIONS', '4'))  # Minimum to show

# AWS Resource Names
CATALOG_TABLE_NAME = os.environ.get('CATALOG_TABLE_NAME', 'taberner-studio-catalog')
CATALOG_BUCKET_NAME = os.environ.get('CATALOG_BUCKET_NAME', 'taberner-studio-catalog-images')
APPROVED_BUCKET = os.environ.get('APPROVED_BUCKET', 'taberner-studio-images')
QUARANTINE_BUCKET = os.environ.get('QUARANTINE_BUCKET', 'taberner-studio-quarantine')

# AWS Clients
dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')
rekognition = boto3.client('rekognition')

# DynamoDB Table (linter may warn, but this is correct for boto3)
catalog_table = dynamodb.Table(CATALOG_TABLE_NAME)  # type: ignore

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

# Initialize caches
catalog_cache = SimpleCache(ttl_seconds=300)  # 5 minutes cache
presigned_url_cache = SimpleCache(ttl_seconds=3600)  # 1 hour cache for S3 URLs
moderation_cache = SimpleCache(ttl_seconds=600)  # 10 minutes cache for moderation results

# --- Core Logic: Color Analysis, Moderation, Storage ---
def safe_float(value, default=0.0):
    """Safely convert a value to float, handling Decimal types from DynamoDB"""
    if hasattr(value, '__float__'):
        return float(value)
    elif isinstance(value, (int, float)):
        return float(value)
    else:
        return default

def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def extract_dominant_colors(image_stream, n_colors=5):
    """Extracts dominant colors from an image stream with their percentages."""
    try:
        img = Image.open(image_stream).convert('RGB')
        # Aggressively resize very large images (like HEIC from iPhones)
        max_dim = 1200  # Don't process images larger than 1200x1200 for color extraction
        if img.width > max_dim or img.height > max_dim:
            aspect = img.width / img.height
            if img.width > img.height:
                new_width = max_dim
                new_height = int(max_dim / aspect)
            else:
                new_height = max_dim
                new_width = int(max_dim * aspect)
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
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
    """Load art catalog from DynamoDB with improved caching."""
    # Check cache first
    cached_data = catalog_cache.get('art_catalog')
    if cached_data:
        app.logger.info("Returning cached catalog data")
        return cached_data
    
    # Cache miss - fetch from DynamoDB
    app.logger.info("Cache miss - fetching catalog from DynamoDB")
    try:
        # Use a more efficient scan with projection
        response = catalog_table.scan(
            ProjectionExpression='id, title, artist, description, price, product_url, filename, attributes'
        )
        items = response.get('Items', [])
        
        # Handle pagination if needed (but limit to reasonable size)
        scan_count = 1
        while 'LastEvaluatedKey' in response and scan_count < 5:  # Limit to 5 scans max
            response = catalog_table.scan(
                ExclusiveStartKey=response['LastEvaluatedKey'],
                ProjectionExpression='id, title, artist, description, price, product_url, filename, attributes'
            )
            items.extend(response.get('Items', []))
            scan_count += 1
        
        # Store in cache with longer TTL in production
        cache_ttl = 600 if APP_ENV == 'aws' else 300  # 10 minutes in production, 5 in dev
        catalog_cache.ttl = cache_ttl
        catalog_cache.set('art_catalog', items)
        app.logger.info(f"Fetched {len(items)} items from DynamoDB and cached for {cache_ttl}s")
        
        return items
    except Exception as e:
        app.logger.error(f"Error loading catalog from DynamoDB: {str(e)}")
        return []

def get_smart_recommendations(user_colors, max_recs=MAX_RECOMMENDATIONS):
    """Smart recommendation system that considers quality, diversity, and user experience."""
    recommendations = []
    
    # Load catalog from DynamoDB
    art_catalog = load_catalog_from_dynamodb()
    if not art_catalog:
        return recommendations

    # Calculate scores for all artworks
    scored_artworks = []
    for artwork in art_catalog:
        catalog_colors = artwork['attributes']['dominant_colors']
        if not catalog_colors:
            continue

        # Convert hex to RGB for comparison
        user_rgb = {item['color']: (tuple(int(item['color'][i:i+2], 16) for i in (1, 3, 5)), float(item['percentage'])) for item in user_colors}
        catalog_rgb = {item['color']: (tuple(int(item['color'][i:i+2], 16) for i in (1, 3, 5)), float(item['percentage'])) for item in catalog_colors}

        # Weighted color distance score
        total_score = 0
        for uc_hex, (uc_rgb, uc_perc) in user_rgb.items():
            for cc_hex, (cc_rgb, cc_perc) in catalog_rgb.items():
                dist = np.linalg.norm(np.array(uc_rgb) - np.array(cc_rgb))
                total_score += dist * uc_perc * cc_perc
        
        if total_score > 0:
            scored_artworks.append({
                'artwork': artwork,
                'score': total_score
            })

    # Sort by score (ascending, lower is better)
    scored_artworks.sort(key=lambda x: x['score'])
    
    # Smart selection strategy
    if len(scored_artworks) <= max_recs:
        # If we have fewer than max, return all
        return scored_artworks
    
    # Quality-based selection: take top 60% by score
    quality_count = min(max_recs, int(max_recs * 0.6))
    quality_recs = scored_artworks[:quality_count]
    
    # Diversity-based selection: add some variety from middle range
    remaining_count = max_recs - quality_count
    if remaining_count > 0 and len(scored_artworks) > quality_count:
        # Take some from middle range for diversity
        middle_start = quality_count
        middle_end = min(len(scored_artworks), quality_count + remaining_count * 2)
        diversity_candidates = scored_artworks[middle_start:middle_end]
        
        # Randomly select from diversity candidates
        import random
        if len(diversity_candidates) > remaining_count:
            diversity_recs = random.sample(diversity_candidates, remaining_count)
        else:
            diversity_recs = diversity_candidates
        
        # Combine quality and diversity recommendations
        final_recs = quality_recs + diversity_recs
        final_recs.sort(key=lambda x: x['score'])  # Re-sort by score
        return final_recs
    
    return quality_recs

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
    return recommendations[:MAX_RECOMMENDATIONS]

def get_recommendations_by_filter(filters):
    """Get recommendations based on style and subject filters"""
    art_catalog = load_catalog_from_dynamodb()
    if not art_catalog:
        return []
    
    style_filters = filters.get('styles', [])
    subject_filters = filters.get('subjects', [])
    
    filtered_artworks = []
    
    for artwork in art_catalog:
        attrs = artwork.get('attributes', {})
        
        # Handle both old string format and new object format for style
        style_attr = attrs.get('style')
        if isinstance(style_attr, dict):
            style_label = style_attr.get('label', '')
            style_confidence = style_attr.get('confidence', 0.0)
        else:
            # Old format - assume high confidence (1.0) for backward compatibility
            style_label = style_attr or ''
            style_confidence = 1.0
        
        # Handle both old string format and new object format for subject
        subject_attr = attrs.get('subject')
        if isinstance(subject_attr, dict):
            subject_label = subject_attr.get('label', '')
            subject_confidence = subject_attr.get('confidence', 0.0)
        else:
            # Old format - assume high confidence (1.0) for backward compatibility
            subject_label = subject_attr or ''
            subject_confidence = 1.0
        
        # Check if artwork matches filters
        style_match = not style_filters or style_label in style_filters
        subject_match = not subject_filters or subject_label in subject_filters
        
        if style_match and subject_match:
            # Calculate a confidence-based score
            # Higher confidence = better score (lower number since we sort ascending)
            # Convert Decimal to float for arithmetic operations
            style_conf_float = safe_float(style_confidence)
            subject_conf_float = safe_float(subject_confidence)
            confidence_score = 1.0 - (float(style_conf_float + subject_conf_float) / 2.0)
            filtered_artworks.append({'artwork': artwork, 'score': confidence_score})
    
    # Sort by confidence score (ascending, lower is better)
    filtered_artworks.sort(key=lambda x: x['score'])
    return filtered_artworks[:MAX_RECOMMENDATIONS]

def moderate_image_content(image_bytes):
    """Moderate image content using AWS Rekognition with caching"""
    # Create a hash of the image for caching
    image_hash = hashlib.md5(image_bytes).hexdigest()
    
    # Check cache first
    cached_result = moderation_cache.get(image_hash)
    if cached_result:
        app.logger.info("Returning cached moderation result")
        return cached_result
    
    try:
        # Only moderate in production, skip in development for speed
        if APP_ENV == 'development':
            app.logger.info("Skipping moderation in development mode")
            result = (True, "Skipped in development")
        else:
            app.logger.info("Running AWS Rekognition moderation")
            response = rekognition.detect_moderation_labels(Image={'Bytes': image_bytes}, MinConfidence=75)
            if response['ModerationLabels']:
                labels = {l['Name'] for l in response['ModerationLabels']}
                result = (False, f"Inappropriate content detected: {', '.join(labels)}")
            else:
                result = (True, "Image approved")
        
        # Cache the result
        moderation_cache.set(image_hash, result)
        return result
        
    except Exception as e:
        app.logger.error(f"Error during moderation: {e}. Approving by default.")
        result = (True, "Moderation check failed, approved by default")
        moderation_cache.set(image_hash, result)
        return result

def store_quarantined_image(image_bytes, filename, reason):
    # Placeholder for quarantine logic
    pass

@app.route('/')
def serve_index():
    return app.send_static_file('index.html')

@app.route('/recommend', methods=['POST'])
@limiter.limit("30 per minute")
def recommend_unified():
    data = request.get_json()
    if not data:
        app.logger.error("Invalid request - no JSON data")
        return jsonify(error="Invalid request"), 400

    rec_type = data.get('type')
    recommendations = []

    if rec_type == 'upload':
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
            recs = get_smart_recommendations(user_colors)
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
        
        # Use simple hard filtering with confidence > 0.7
        style_pref = preferences.get('style')
        subject_pref = preferences.get('subject')
        
        # Convert arrays to strings if needed
        style_value = style_pref[0] if isinstance(style_pref, list) and style_pref else style_pref
        subject_value = subject_pref[0] if isinstance(subject_pref, list) and subject_pref else subject_pref
        
        filters = {
            'styles': [style_value] if style_value and str(style_value).strip() else [],
            'subjects': [subject_value] if subject_value and str(subject_value).strip() else [],
        }
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
    items = load_catalog_from_dynamodb()
    styles = set()
    subjects = set()
    CONFIDENCE_THRESHOLD = 0.7  # Only show attributes with confidence >= 0.7
    
    for art in items:
        attrs = art.get('attributes', {})
        
        # Handle both old string format and new object format for style
        style_attr = attrs.get('style')
        if isinstance(style_attr, dict):
            style_label = style_attr.get('label', '')
            style_confidence = safe_float(style_attr.get('confidence', 0.0))
            # Only include if confidence meets threshold
            if style_label and style_confidence >= CONFIDENCE_THRESHOLD:
                styles.add(style_label)
        else:
            # Old format - assume high confidence (1.0) for backward compatibility
            style_label = style_attr or ''
            if style_label:
                styles.add(style_label)
        
        # Handle both old string format and new object format for subject
        subject_attr = attrs.get('subject')
        if isinstance(subject_attr, dict):
            subject_label = subject_attr.get('label', '')
            subject_confidence = safe_float(subject_attr.get('confidence', 0.0))
            # Only include if confidence meets threshold
            if subject_label and subject_confidence >= CONFIDENCE_THRESHOLD:
                subjects.add(subject_label)
        else:
            # Old format - assume high confidence (1.0) for backward compatibility
            subject_label = subject_attr or ''
            if subject_label:
                subjects.add(subject_label)
    
    return jsonify({
        'styles': sorted(list(styles)),
        'subjects': sorted(list(subjects))
    })

@app.route('/api/generate-mockup', methods=['POST'])
@limiter.limit("10 per minute")
def generate_mockup():
    """Generate a mockup image by compositing artwork onto room background using PIL with optimized color preservation"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400
        
        artwork_url = data.get('artwork_url')
        room_url = data.get('room_url')
        artwork_position = data.get('artwork_position', {})
        
        if not artwork_url or not room_url:
            return jsonify({'success': False, 'error': 'Missing artwork_url or room_url'}), 400
        
        app.logger.info(f"Generating mockup - Artwork URL type: {'data_url' if artwork_url.startswith('data:') else 'http_url'}")
        
        # Load images with better color preservation
        if artwork_url.startswith('data:'):
            # Handle data URL
            header, encoded = artwork_url.split(",", 1)
            artwork_data = base64.b64decode(encoded)
            artwork_img = Image.open(BytesIO(artwork_data))
        else:
            # Handle HTTP URL
            artwork_response = requests.get(artwork_url, timeout=30)
            artwork_response.raise_for_status()
            artwork_img = Image.open(BytesIO(artwork_response.content))
        
        if room_url.startswith('data:'):
            # Handle data URL
            header, encoded = room_url.split(",", 1)
            room_data = base64.b64decode(encoded)
            room_img = Image.open(BytesIO(room_data))
        else:
            # Handle HTTP URL
            room_response = requests.get(room_url, timeout=30)
            room_response.raise_for_status()
            room_img = Image.open(BytesIO(room_response.content))
        
        # Preserve original color modes to maintain vibrancy
        original_artwork_mode = artwork_img.mode
        original_room_mode = room_img.mode
        
        app.logger.info(f"Original artwork mode: {original_artwork_mode}, room mode: {original_room_mode}")
        
        # Only convert to RGB if absolutely necessary, and preserve color information
        if artwork_img.mode not in ['RGB', 'RGBA']:
            artwork_img = artwork_img.convert('RGB')
        if room_img.mode not in ['RGB', 'RGBA']:
            room_img = room_img.convert('RGB')
        
        # Get dimensions
        room_width, room_height = room_img.size
        artwork_width, artwork_height = artwork_img.size
        
        app.logger.info(f"Room dimensions: {room_width}x{room_height}")
        app.logger.info(f"Artwork dimensions: {artwork_width}x{artwork_height}")
        app.logger.info(f"Artwork position: {artwork_position}")
        
        # Calculate artwork size (limit to 30% of room size)
        artwork_ratio = artwork_width / artwork_height
        if artwork_ratio > 1:  # Landscape
            new_artwork_width = min(int(room_width * 0.3), artwork_width)
            new_artwork_height = int(new_artwork_width / artwork_ratio)
        else:  # Portrait
            new_artwork_height = min(int(room_height * 0.3), artwork_height)
            new_artwork_width = int(new_artwork_height * artwork_ratio)
        
        # Resize artwork with high quality resampling to preserve colors
        artwork_img = artwork_img.resize((new_artwork_width, new_artwork_height), Image.Resampling.LANCZOS)
        
        app.logger.info(f"Final artwork size: {new_artwork_width}x{new_artwork_height}")
        
        # Calculate position
        x_percent = artwork_position.get('x', 50) / 100.0
        y_percent = artwork_position.get('y', 50) / 100.0
        
        # Calculate paste position (center the artwork at the calculated position)
        paste_x = int((room_width * x_percent) - (new_artwork_width / 2))
        paste_y = int((room_height * y_percent) - (new_artwork_height / 2))
        
        app.logger.info(f"Final paste position: ({paste_x}, {paste_y})")
        
        # Create result image with same mode as room image for better color preservation
        result_img = room_img.copy()
        
        # Paste artwork onto room background
        if artwork_img.mode == 'RGBA':
            # If artwork has transparency, use alpha compositing
            result_img.paste(artwork_img, (paste_x, paste_y), artwork_img)
        else:
            # Otherwise, paste directly
            result_img.paste(artwork_img, (paste_x, paste_y))
        
        # Convert to bytes with maximum quality JPEG for best color preservation
        output_buffer = BytesIO()
        result_img.save(output_buffer, format='JPEG', quality=100, optimize=False, progressive=False, subsampling=0)
        output_buffer.seek(0)
        
        app.logger.info(f"Mockup saved as JPEG with quality 100, size: {len(output_buffer.getvalue())} bytes")
        
        # Convert to base64
        image_data = base64.b64encode(output_buffer.getvalue()).decode('utf-8')
        data_url = f"data:image/jpeg;base64,{image_data}"
        
        app.logger.info(f"Mockup generated successfully as JPEG data URL (length: {len(data_url)} chars)")
        
        return jsonify({
            'success': True,
            'data_url': data_url
        })
        
    except Exception as e:
        app.logger.error(f"Error generating mockup: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

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
@limiter.limit("200 per hour")  # Higher limit for image requests
def serve_catalog_image(filename):
    """Serve catalog images from S3 with caching"""
    try:
        # Check cache first
        cache_key = f"s3_url_{filename}"
        cached_url = presigned_url_cache.get(cache_key)
        if cached_url:
            app.logger.info(f"Returning cached S3 URL for {filename}")
            return jsonify({'url': cached_url})
        
        # Generate new presigned URL
        app.logger.info(f"Generating new S3 URL for {filename}")
        url = s3.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': CATALOG_BUCKET_NAME,
                'Key': filename
            },
            ExpiresIn=3600  # URL expires in 1 hour
        )
        
        # Cache the URL
        presigned_url_cache.set(cache_key, url)
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
    # Only clear cache in development mode to avoid performance issues in production
    if APP_ENV == 'development':
        catalog_cache.clear()
        app.logger.info("Catalog cache cleared (development mode)")
        return jsonify({'message': 'Cache cleared successfully'})
    else:
        app.logger.info("Cache clear request ignored in production mode")
        return jsonify({'message': 'Cache clearing disabled in production'})

@app.route('/api/cache-stats')
def cache_stats():
    """Get cache statistics (admin endpoint)."""
    cache_info = {
        'catalog_cache_size': len(catalog_cache.cache),
        'presigned_url_cache_size': len(presigned_url_cache.cache),
        'moderation_cache_size': len(moderation_cache.cache),
        'catalog_ttl_seconds': catalog_cache.ttl,
        'presigned_url_ttl_seconds': presigned_url_cache.ttl,
        'moderation_ttl_seconds': moderation_cache.ttl
    }
    return jsonify(cache_info)

@app.route('/api/reset-workflow', methods=['POST'])
def reset_workflow():
    """Clear cache when user resets workflow (Back to Start)."""
    # Only clear cache in development mode to avoid performance issues in production
    if APP_ENV == 'development':
        catalog_cache.clear()
        app.logger.info("Workflow reset: Catalog cache cleared (development mode)")
    else:
        app.logger.info("Workflow reset: Cache clearing skipped in production mode")
    return jsonify({'message': 'Workflow reset successfully'})

if __name__ == '__main__':
    host = os.environ.get('FLASK_RUN_HOST', '127.0.0.1')
    port = int(os.environ.get('FLASK_RUN_PORT', 8000))
    debug = os.environ.get('FLASK_DEBUG', 'True') == 'True'
    app.run(host=host, port=port, debug=debug, use_reloader=True)
