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
from sklearn.metrics.pairwise import cosine_similarity
import torch

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

# Configure Flask app
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

def safe_float(value):
    """Safely convert a value to float, handling Decimal types from DynamoDB."""
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return float(value)
    if hasattr(value, '__float__'):
        return float(value)
    try:
        return float(value)
    except (ValueError, TypeError):
        return 0.0

def convert_decimals_to_floats(obj):
    """Recursively convert Decimal values to float for arithmetic operations"""
    if obj is None:
        return None
    if isinstance(obj, dict):
        return {key: convert_decimals_to_floats(value) for key, value in obj.items()}
    if isinstance(obj, list):
        return [convert_decimals_to_floats(item) for item in obj]
    if hasattr(obj, 'as_tuple'):  # Decimal type check
        return float(obj)
    return obj

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
        while 'LastEvaluatedKey' in response and len(items) < 1000:  # Safety limit
            response = catalog_table.scan(
                ProjectionExpression='id, title, artist, description, price, product_url, filename, attributes',
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            items.extend(response.get('Items', []))
        
        app.logger.info(f"Fetched {len(items)} items from DynamoDB and cached for 600s")
        
        # Cache the results
        catalog_cache.set('art_catalog', items)
        return items
        
    except Exception as e:
        app.logger.error(f"Error loading catalog from DynamoDB: {e}")
        return []

def get_smart_recommendations(user_colors, max_recs=MAX_RECOMMENDATIONS):
    """Get smart recommendations based on user color preferences."""
    try:
        catalog = load_catalog_from_dynamodb()
        if not catalog:
            return []
        
        recommendations = []
        for item in catalog:
            if 'attributes' not in item or not item['attributes']:
                continue
                
            attributes = item['attributes']
            if isinstance(attributes, str):
                # Handle old string format
                continue
            
            # Get color attributes with confidence scores
            color_attrs = attributes.get('colors', [])
            if not color_attrs:
                continue
            
            # Calculate color similarity score
            color_score = 0
            for user_color in user_colors:
                user_rgb = hex_to_rgb(user_color)
                for color_attr in color_attrs:
                    if isinstance(color_attr, dict) and 'color' in color_attr:
                        attr_color = color_attr['color']
                        attr_confidence = color_attr.get('confidence', 0.5)
                        attr_rgb = hex_to_rgb(attr_color)
                        
                        # Calculate color distance (lower is better)
                        distance = sum((a - b) ** 2 for a, b in zip(user_rgb, attr_rgb)) ** 0.5
                        max_distance = (255 ** 2 * 3) ** 0.5  # Maximum possible distance
                        similarity = 1 - (distance / max_distance)
                        
                        # Weight by confidence
                        weighted_similarity = similarity * attr_confidence
                        color_score = max(color_score, weighted_similarity)
            
            if color_score > 0.1:  # Minimum threshold
                recommendations.append({
                    'item': item,
                    'score': color_score
                })
        
        # Sort by score and return top recommendations
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        return [rec['item'] for rec in recommendations[:max_recs]]
        
    except Exception as e:
        app.logger.error(f"Error in smart recommendations: {e}")
        return []

def get_recommendations(user_colors):
    """Get recommendations based on user color preferences."""
    return get_smart_recommendations(user_colors)

def get_recommendations_by_filter(filters):
    """Get recommendations based on filter criteria."""
    try:
        catalog = load_catalog_from_dynamodb()
        if not catalog:
            return []
        
        recommendations = []
        for item in catalog:
            if 'attributes' not in item or not item['attributes']:
                continue
                
            attributes = item['attributes']
            if isinstance(attributes, str):
                # Handle old string format
                continue
            
            # Check if item matches all filters
            matches = True
            for filter_key, filter_value in filters.items():
                if filter_key not in attributes:
                    matches = False
                    break
                
                attr_value = attributes[filter_key]
                if isinstance(attr_value, list):
                    # Handle list of objects with confidence scores
                    if not any(isinstance(obj, dict) and obj.get('name') == filter_value and obj.get('confidence', 0) >= 0.7 for obj in attr_value):
                        matches = False
                        break
                elif isinstance(attr_value, str):
                    # Handle old string format
                    if attr_value != filter_value:
                        matches = False
                        break
                else:
                    matches = False
                    break
            
            if matches:
                # Calculate confidence score
                style_confidence = 0.5
                subject_confidence = 0.5
                
                if 'style' in attributes:
                    style_attrs = attributes['style']
                    if isinstance(style_attrs, list):
                        for attr in style_attrs:
                            if isinstance(attr, dict) and attr.get('name') == filters.get('style'):
                                style_confidence = attr.get('confidence', 0.5)
                                break
                
                if 'subject' in attributes:
                    subject_attrs = attributes['subject']
                    if isinstance(subject_attrs, list):
                        for attr in subject_attrs:
                            if isinstance(attr, dict) and attr.get('name') == filters.get('subject'):
                                subject_confidence = attr.get('confidence', 0.5)
                                break
                
                confidence_score = 1.0 - ((style_confidence + subject_confidence) / 2.0)
                
                recommendations.append({
                    'item': item,
                    'score': confidence_score
                })
        
        # Sort by score and return top recommendations
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        return [rec['item'] for rec in recommendations[:MAX_RECOMMENDATIONS]]
        
    except Exception as e:
        app.logger.error(f"Error in filter recommendations: {e}")
        return []

def moderate_image_content(image_bytes):
    """Moderate image content using AWS Rekognition."""
    try:
        # Check cache first
        cache_key = hashlib.md5(image_bytes).hexdigest()
        cached_result = moderation_cache.get(cache_key)
        if cached_result:
            return cached_result
        
        # Use AWS Rekognition for content moderation
        response = rekognition.detect_moderation_labels(
            Image={'Bytes': image_bytes}
        )
        
        moderation_labels = response.get('ModerationLabels', [])
        
        # Cache the result
        moderation_cache.set(cache_key, moderation_labels)
        
        return moderation_labels
        
    except Exception as e:
        app.logger.error(f"Error in content moderation: {e}")
        return []

def store_quarantined_image(image_bytes, filename, reason):
    """Store quarantined image in S3."""
    try:
        s3.put_object(
            Bucket=QUARANTINE_BUCKET,
            Key=filename,
            Body=image_bytes,
            Metadata={'quarantine_reason': reason}
        )
        app.logger.info(f"Stored quarantined image: {filename}")
    except Exception as e:
        app.logger.error(f"Error storing quarantined image: {e}")

def get_text_embedding(text, model, processor):
    """Get text embedding using CLIP model."""
    try:
        inputs = processor(text, return_tensors="pt", padding=True, truncation=True)
        with torch.no_grad():
            text_features = model.get_text_features(**inputs)
        return text_features.cpu().numpy()
    except Exception as e:
        app.logger.error(f"Error getting text embedding: {e}")
        return None

def get_vector_based_recommendations(user_preferences, max_recs=MAX_RECOMMENDATIONS):
    """Get vector-based recommendations using CLIP embeddings."""
    try:
        from transformers import CLIPProcessor, CLIPModel
        
        # Load CLIP model
        model_name = "openai/clip-vit-base-patch32"
        model = CLIPModel.from_pretrained(model_name)
        processor = CLIPProcessor.from_pretrained(model_name)
        
        # Get user preference embedding
        user_text = " ".join([f"{k}: {v}" for k, v in user_preferences.items()])
        user_embedding = get_text_embedding(user_text, model, processor)
        
        if user_embedding is None:
            return []
        
        catalog = load_catalog_from_dynamodb()
        if not catalog:
            return []
        
        recommendations = []
        for item in catalog:
            if 'attributes' not in item or not item['attributes']:
                continue
                
            attributes = item['attributes']
            if isinstance(attributes, str):
                continue
            
            # Create item description from attributes
            item_description = []
            for attr_key, attr_value in attributes.items():
                if isinstance(attr_value, list):
                    for attr in attr_value:
                        if isinstance(attr, dict) and attr.get('confidence', 0) >= 0.7:
                            item_description.append(f"{attr_key}: {attr.get('name', '')}")
                elif isinstance(attr_value, str):
                    item_description.append(f"{attr_key}: {attr_value}")
            
            if not item_description:
                continue
            
            item_text = " ".join(item_description)
            item_embedding = get_text_embedding(item_text, model, processor)
            
            if item_embedding is not None:
                # Calculate cosine similarity
                similarity = cosine_similarity(user_embedding, item_embedding)[0][0]
                recommendations.append({
                    'item': item,
                    'score': float(similarity)
                })
        
        # Sort by similarity score
        recommendations.sort(key=lambda x: x['score'], reverse=True)
        return [rec['item'] for rec in recommendations[:max_recs]]
        
    except Exception as e:
        app.logger.error(f"Error in vector-based recommendations: {e}")
        return []

# --- Routes ---

@app.route('/')
def serve_index():
    """Serve the main index.html file."""
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/recommend', methods=['POST'])
@limiter.limit("30 per minute")
def recommend_unified():
    """Unified recommendation endpoint that handles both color-based and preference-based recommendations."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        workflow_type = data.get('workflow_type', 'COLORS')
        app.logger.info(f"Processing {workflow_type}-based recommendation")
        
        if workflow_type == 'PREFERENCES':
            # Handle preference-based recommendations
            preferences = data.get('preferences', {})
            if not preferences:
                return jsonify({'error': 'No preferences provided'}), 400
            
            app.logger.info("Attempting vector-based recommendations")
            
            # Try vector-based recommendations first
            try:
                recommendations = get_vector_based_recommendations(preferences)
                if recommendations:
                    app.logger.info(f"Generated {len(recommendations)} vector-based recommendations")
                    app.logger.info(f"Generated {len(recommendations)} recommendations for preferences")
                    app.logger.info("=== RECOMMENDATION REQUEST COMPLETE ===")
                    app.logger.info(f"Returning {len(recommendations)} recommendations")
                    if recommendations:
                        app.logger.info(f"First recommendation: Artwork {recommendations[0].get('title', 'Unknown')}")
                    return jsonify({'recommendations': recommendations})
                else:
                    app.logger.info("No vector-based recommendations found, falling back to traditional filtering")
            except Exception as e:
                app.logger.warning(f"Vector-based recommendations failed: {e}, falling back to traditional filtering")
            
            # Fallback to traditional filtering
            recommendations = get_recommendations_by_filter(preferences)
            app.logger.info(f"Generated {len(recommendations)} recommendations for preferences")
            app.logger.info("=== RECOMMENDATION REQUEST COMPLETE ===")
            app.logger.info(f"Returning {len(recommendations)} recommendations")
            if recommendations:
                app.logger.info(f"First recommendation: Artwork {recommendations[0].get('title', 'Unknown')}")
            return jsonify({'recommendations': recommendations})
        
        else:
            # Handle color-based recommendations (legacy)
            user_colors = data.get('colors', [])
            if not user_colors:
                return jsonify({'error': 'No colors provided'}), 400
            
            recommendations = get_recommendations(user_colors)
            return jsonify({'recommendations': recommendations})
            
    except Exception as e:
        app.logger.error(f"Error in recommendation: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/preferences-options')
def preferences_options():
    """Get available preference options from the catalog."""
    try:
        catalog = load_catalog_from_dynamodb()
        if not catalog:
            return jsonify({'error': 'No catalog data available'}), 500
        
        # Extract unique options from catalog
        styles = set()
        subjects = set()
        
        for item in catalog:
            if 'attributes' not in item or not item['attributes']:
                continue
                
            attributes = item['attributes']
            if isinstance(attributes, str):
                continue
            
            # Extract styles
            if 'style' in attributes:
                style_attrs = attributes['style']
                if isinstance(style_attrs, list):
                    for attr in style_attrs:
                        if isinstance(attr, dict) and attr.get('confidence', 0) >= 0.7:
                            styles.add(attr.get('name', ''))
                elif isinstance(style_attrs, str):
                    styles.add(style_attrs)
            
            # Extract subjects
            if 'subject' in attributes:
                subject_attrs = attributes['subject']
                if isinstance(subject_attrs, list):
                    for attr in subject_attrs:
                        if isinstance(attr, dict) and attr.get('confidence', 0) >= 0.7:
                            subjects.add(attr.get('name', ''))
                elif isinstance(subject_attrs, str):
                    subjects.add(subject_attrs)
        
        return jsonify({
            'styles': sorted(list(styles)),
            'subjects': sorted(list(subjects))
        })
        
    except Exception as e:
        app.logger.error(f"Error getting preference options: {e}")
        return jsonify({'error': 'Internal server error'}), 500

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
    """Clear all caches."""
    try:
        catalog_cache.clear()
        presigned_url_cache.clear()
        moderation_cache.clear()
        app.logger.info("All caches cleared")
        return jsonify({'success': True, 'message': 'All caches cleared'})
    except Exception as e:
        app.logger.error(f"Error clearing cache: {e}")
        return jsonify({'error': 'Failed to clear cache'}), 500

@app.route('/api/cache-stats')
def cache_stats():
    """Get cache statistics."""
    try:
        return jsonify({
            'catalog_cache_size': len(catalog_cache.cache),
            'presigned_url_cache_size': len(presigned_url_cache.cache),
            'moderation_cache_size': len(moderation_cache.cache)
        })
    except Exception as e:
        app.logger.error(f"Error getting cache stats: {e}")
        return jsonify({'error': 'Failed to get cache stats'}), 500

@app.route('/api/reset-workflow', methods=['POST'])
def reset_workflow():
    """Reset the workflow state."""
    try:
        # Clear caches to ensure fresh data
        catalog_cache.clear()
        presigned_url_cache.clear()
        moderation_cache.clear()
        
        return jsonify({'success': True, 'message': 'Workflow reset successfully'})
    except Exception as e:
        app.logger.error(f"Error resetting workflow: {e}")
        return jsonify({'error': 'Failed to reset workflow'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True) 