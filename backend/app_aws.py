# IMMEDIATE STARTUP LOGGING - This should appear first
import sys
import os
print("=== APP_AWS.PY STARTING ===", file=sys.stderr)
print(f"Python executable: {sys.executable}", file=sys.stderr)
print(f"Python version: {sys.version}", file=sys.stderr)
print(f"Working directory: {os.getcwd()}", file=sys.stderr)
print(f"Script path: {__file__}", file=sys.stderr)

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
from config import config
import random
import threading
from functools import wraps
import colorsys

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

# Log configuration
logger.info(f"Configuration:\n{config}")

# Log which values are coming from environment variables vs constants
logger.info("=== CONFIGURATION SOURCE LOG ===")
env_vars = [
    'AWS_REGION', 'CATALOG_TABLE_NAME', 'CATALOG_BUCKET_NAME',
    'APPROVED_BUCKET', 'QUARANTINE_BUCKET', 'APP_ENV',
    'MAX_RECOMMENDATIONS', 'MIN_RECOMMENDATIONS', 'CONFIDENCE_THRESHOLD',
    'CATALOG_CACHE_TTL', 'PRESIGNED_URL_CACHE_TTL', 'MODERATION_CACHE_TTL'
]

for var in env_vars:
    value = os.getenv(var)
    if value:
        logger.info(f"✓ {var}: {value} (from environment)")
    else:
        logger.info(f"⚠ {var}: using fallback value (from constants)")
logger.info("=== END CONFIGURATION SOURCE LOG ===")

# Startup validation function
def validate_startup():
    """Validate critical components during startup."""
    logger.info("=== STARTUP VALIDATION ===")
    
    # Validate environment variables
    required_env_vars = [
        'AWS_REGION', 'CATALOG_TABLE_NAME', 'CATALOG_BUCKET_NAME',
        'APPROVED_BUCKET', 'QUARANTINE_BUCKET'
    ]
    
    missing_vars = []
    for var in required_env_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        logger.error(f"Missing required environment variables: {missing_vars}")
        raise ValueError(f"Missing environment variables: {missing_vars}")
    else:
        logger.info("All required environment variables are set")
    
    # Validate AWS configuration using the config object
    try:
        aws_config = config.get_aws_config()
        logger.info(f"AWS Region: {aws_config['region']}")
        logger.info(f"Catalog Table: {aws_config['catalog_table_name']}")
        logger.info(f"Catalog Bucket: {aws_config['catalog_bucket_name']}")
        logger.info(f"Approved Bucket: {aws_config['approved_bucket']}")
        logger.info(f"Quarantine Bucket: {aws_config['quarantine_bucket']}")
    except Exception as e:
        logger.error(f"Failed to validate AWS configuration: {e}")
        raise
    
    logger.info("=== STARTUP VALIDATION COMPLETE ===")

# Get configuration values
aws_config = config.get_aws_config()
recommendation_config = config.get_recommendation_config()
cache_config = config.get_cache_config()

# Run startup validation after config is loaded
try:
    validate_startup()
except Exception as e:
    logger.error(f"Startup validation failed: {e}")
    raise

# The static_folder argument points to the 'static' directory, which contains the frontend files.
# The static_url_path='' makes the static files available from the root URL.
# Configure app to serve frontend files
app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

# Initialize AWS clients after environment variables are loaded
def get_aws_clients():
    """Initialize AWS clients with proper region configuration."""
    region = aws_config['region']
    logger.info(f"Initializing AWS clients for region: {region}")
    
    try:
        # Test AWS credentials
        sts_client = boto3.client('sts', region_name=region)
        identity = sts_client.get_caller_identity()
        logger.info(f"AWS credentials validated for account: {identity['Account']}")
        
        # Initialize clients
        dynamodb_client = boto3.resource('dynamodb', region_name=region)
        s3_client = boto3.client('s3', region_name=region)
        rekognition_client = boto3.client('rekognition', region_name=region)
        
        logger.info("AWS clients initialized successfully")
        return {
            'dynamodb': dynamodb_client,
            's3': s3_client,
            'rekognition': rekognition_client
        }
    except NoCredentialsError:
        logger.error("AWS credentials not found. Check IAM role configuration.")
        raise
    except ClientError as e:
        logger.error(f"AWS client initialization failed: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error initializing AWS clients: {e}")
        raise

# Initialize AWS clients
logger.info("=== INITIALIZING AWS CLIENTS ===")
try:
    aws_clients = get_aws_clients()
    dynamodb = aws_clients['dynamodb']
    s3 = aws_clients['s3']
    rekognition = aws_clients['rekognition']
    logger.info("AWS clients initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize AWS clients: {e}")
    raise

# DynamoDB Table (linter may warn, but this is correct for boto3)
try:
    catalog_table = dynamodb.Table(aws_config['catalog_table_name'])  # type: ignore
    logger.info(f"DynamoDB table reference created: {aws_config['catalog_table_name']}")
    
    # Test table access
    response = catalog_table.scan(Limit=1)
    logger.info(f"DynamoDB table access test successful. Item count: {response.get('Count', 0)}")
except Exception as e:
    logger.error(f"Failed to access DynamoDB table {aws_config['catalog_table_name']}: {e}")
    raise

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
    # Explicitly handle Decimal type from DynamoDB
    if hasattr(value, 'as_tuple') or str(type(value)) == "<class 'decimal.Decimal'>":
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
    # Check for Decimal type more safely
    if hasattr(obj, 'as_tuple') or str(type(obj)) == "<class 'decimal.Decimal'>":
        return float(obj)
    return obj

def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

def calculate_color_similarity(user_colors, item_colors):
    """Calculate color similarity between user colors and item colors."""
    if not user_colors or not item_colors:
        return 0.0
    
    max_similarity = 0.0
    for user_color in user_colors:
        user_rgb = hex_to_rgb(user_color)
        for item_color in item_colors:
            if isinstance(item_color, dict):
                color_hex = item_color.get('color', '')
                confidence = item_color.get('confidence', 0.5)
            else:
                color_hex = item_color
                confidence = 1.0
            
            if not color_hex:
                continue
            
            try:
                item_rgb = hex_to_rgb(color_hex)
                # Calculate color distance (lower is better)
                distance = sum((a - b) ** 2 for a, b in zip(user_rgb, item_rgb)) ** 0.5
                max_distance = (255 ** 2 * 3) ** 0.5  # Maximum possible distance
                similarity = 1 - (distance / max_distance)
                
                # Weight by confidence
                weighted_similarity = similarity * confidence
                max_similarity = max(max_similarity, weighted_similarity)
            except Exception:
                continue
    
    return max_similarity

def calculate_quality_score(item):
    """Calculate quality score for an item based on various factors."""
    score = 0.5  # Base score
    
    # Boost for items with good attributes
    if 'attributes' in item and item['attributes']:
        attributes = item['attributes']
        if isinstance(attributes, dict):
            # Count high-confidence attributes
            high_confidence_count = 0
            for attr_key, attr_value in attributes.items():
                if isinstance(attr_value, list):
                    for attr in attr_value:
                        if isinstance(attr, dict) and attr.get('confidence', 0) >= 0.7:
                            high_confidence_count += 1
                elif isinstance(attr_value, str):
                    high_confidence_count += 1
            
            # Boost score based on attribute quality
            score += min(high_confidence_count * 0.1, 0.3)
    
    # Boost for items with embeddings (vector-based features)
    if 'embeddings' in item:
        score += 0.1
    
    return min(score, 1.0)  # Cap at 1.0

# Removed embedding functionality - using simple filtering instead

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

def analyze_room_characteristics(image_stream):
    """Analyze room characteristics to suggest appropriate art styles and subjects."""
    try:
        # Reset stream position
        image_stream.seek(0)
        img = Image.open(image_stream).convert('RGB')
        
        # Resize for analysis
        max_dim = 800
        if img.width > max_dim or img.height > max_dim:
            aspect = img.width / img.height
            if img.width > img.height:
                new_width = max_dim
                new_height = int(max_dim / aspect)
            else:
                new_height = max_dim
                new_width = int(max_dim * aspect)
            img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Convert to numpy array for analysis
        img_array = np.array(img)
        
        # Analyze various characteristics
        room_analysis = {
            'brightness': analyze_brightness(img_array),
            'color_palette': analyze_color_palette(img_array),
            'contrast': analyze_contrast(img_array),
            'texture_complexity': analyze_texture_complexity(img_array),
            'architectural_style': detect_architectural_style(img_array),
            'room_type': detect_room_type(img_array)
        }
        
        # Determine appropriate art characteristics
        art_recommendations = determine_art_characteristics(room_analysis)
        
        app.logger.info(f"Room analysis complete: {room_analysis}")
        app.logger.info(f"Art recommendations: {art_recommendations}")
        
        return {
            'room_analysis': room_analysis,
            'recommended_art_characteristics': art_recommendations
        }
        
    except Exception as e:
        app.logger.error(f"Error analyzing room characteristics: {e}")
        return None

def analyze_brightness(img_array):
    """Analyze overall brightness of the room."""
    # Convert to grayscale and calculate mean brightness
    gray = np.mean(img_array, axis=2)
    brightness = np.mean(gray) / 255.0
    
    if brightness > 0.7:
        return 'bright'
    elif brightness > 0.4:
        return 'medium'
    else:
        return 'dark'

def analyze_color_palette(img_array):
    """Analyze the room's color palette characteristics."""
    # Calculate color statistics
    img_flat = img_array.reshape(-1, 3)
    
    # Calculate saturation
    hsv = np.array([colorsys.rgb_to_hsv(r/255, g/255, b/255) for r, g, b in img_flat])
    avg_saturation = np.mean(hsv[:, 1])
    
    # Calculate color temperature (warm vs cool)
    red_channel = np.mean(img_array[:, :, 0])
    blue_channel = np.mean(img_array[:, :, 2])
    color_temp = 'warm' if red_channel > blue_channel else 'cool'
    
    if avg_saturation > 0.3:
        saturation_level = 'vibrant'
    elif avg_saturation > 0.15:
        saturation_level = 'moderate'
    else:
        saturation_level = 'muted'
    
    return {
        'saturation': saturation_level,
        'temperature': color_temp
    }

def analyze_contrast(img_array):
    """Analyze contrast levels in the room."""
    gray = np.mean(img_array, axis=2)
    contrast = np.std(gray) / 255.0
    
    if contrast > 0.15:
        return 'high'
    elif contrast > 0.08:
        return 'medium'
    else:
        return 'low'

def analyze_texture_complexity(img_array):
    """Analyze texture complexity using edge detection."""
    try:
        from scipy import ndimage
        
        gray = np.mean(img_array, axis=2)
        
        # Simple edge detection
        sobel_x = ndimage.sobel(gray, axis=1)
        sobel_y = ndimage.sobel(gray, axis=0)
        edge_magnitude = np.sqrt(sobel_x**2 + sobel_y**2)
        
        texture_score = np.mean(edge_magnitude)
        
        if texture_score > 30:
            return 'complex'
        elif texture_score > 15:
            return 'moderate'
        else:
            return 'simple'
            
    except ImportError:
        # Fallback without scipy
        return 'moderate'
    except Exception:
        return 'moderate'

def detect_architectural_style(img_array):
    """Detect architectural style based on visual cues."""
    # This is a simplified heuristic-based approach
    # In a production system, you might use a trained ML model
    
    gray = np.mean(img_array, axis=2)
    
    # Analyze line patterns (horizontal/vertical dominance)
    horizontal_edges = np.sum(np.abs(np.diff(gray, axis=0)))
    vertical_edges = np.sum(np.abs(np.diff(gray, axis=1)))
    
    edge_ratio = horizontal_edges / (vertical_edges + 1)
    
    # Simple heuristics based on color and structure
    avg_brightness = np.mean(gray) / 255.0
    
    if avg_brightness > 0.7 and edge_ratio > 1.2:
        return 'modern'
    elif avg_brightness < 0.4:
        return 'traditional'
    elif edge_ratio < 0.8:
        return 'rustic'
    else:
        return 'contemporary'

def detect_room_type(img_array):
    """Detect room type based on visual characteristics."""
    # Simplified heuristic approach
    # In production, this could use object detection to identify furniture
    
    height, width = img_array.shape[:2]
    aspect_ratio = width / height
    
    # Analyze color distribution for clues
    avg_color = np.mean(img_array, axis=(0, 1))
    
    # Simple heuristics
    if aspect_ratio > 1.5:
        return 'living_room'  # Often wider spaces
    elif avg_color[0] > avg_color[1] and avg_color[0] > avg_color[2]:
        return 'bedroom'  # Often warmer tones
    else:
        return 'general'

def determine_art_characteristics(room_analysis):
    """Determine appropriate art characteristics based on room analysis."""
    recommendations = {
        'preferred_styles': [],
        'preferred_subjects': [],
        'size_recommendation': 'medium',
        'color_guidance': '',
        'reasoning': []
    }
    
    brightness = room_analysis['brightness']
    color_palette = room_analysis['color_palette']
    contrast = room_analysis['contrast']
    texture = room_analysis['texture_complexity']
    arch_style = room_analysis['architectural_style']
    room_type = room_analysis['room_type']
    
    # Style recommendations based on architectural style
    if arch_style == 'modern':
        recommendations['preferred_styles'].extend(['Contemporary', 'Abstract', 'Minimalist'])
        recommendations['preferred_subjects'].extend(['Abstract', 'Geometric', 'Cityscape'])
        recommendations['reasoning'].append("Modern architecture pairs well with contemporary and abstract art")
    elif arch_style == 'traditional':
        recommendations['preferred_styles'].extend(['Classical', 'Realistic', 'Impressionist'])
        recommendations['preferred_subjects'].extend(['Landscape', 'Portrait', 'Still Life'])
        recommendations['reasoning'].append("Traditional spaces complement classical and realistic art styles")
    elif arch_style == 'rustic':
        recommendations['preferred_styles'].extend(['Folk', 'Landscape', 'Nature'])
        recommendations['preferred_subjects'].extend(['Landscape', 'Nature', 'Animal'])
        recommendations['reasoning'].append("Rustic environments work well with nature-inspired art")
    else:  # contemporary
        recommendations['preferred_styles'].extend(['Contemporary', 'Mixed Media'])
        recommendations['preferred_subjects'].extend(['Abstract', 'Landscape', 'Portrait'])
        recommendations['reasoning'].append("Contemporary spaces allow for diverse art styles")
    
    # Adjust based on brightness
    if brightness == 'dark':
        recommendations['color_guidance'] = 'Consider brighter, more vibrant pieces to add energy'
        recommendations['reasoning'].append("Darker rooms benefit from brighter artwork")
    elif brightness == 'bright':
        recommendations['color_guidance'] = 'Subtle or bold pieces both work well'
        recommendations['reasoning'].append("Bright rooms provide flexibility in color choices")
    
    # Adjust based on color palette
    if color_palette['saturation'] == 'muted':
        recommendations['reasoning'].append("Muted room colors allow for more vibrant art")
    elif color_palette['saturation'] == 'vibrant':
        recommendations['reasoning'].append("Vibrant room colors pair well with complementary or neutral art")
    
    # Room type specific recommendations
    if room_type == 'bedroom':
        recommendations['preferred_subjects'].extend(['Landscape', 'Abstract', 'Nature'])
        recommendations['reasoning'].append("Bedrooms benefit from calming subjects")
    elif room_type == 'living_room':
        recommendations['preferred_subjects'].extend(['Landscape', 'Abstract', 'Portrait'])
        recommendations['size_recommendation'] = 'large'
        recommendations['reasoning'].append("Living rooms can accommodate larger statement pieces")
    
    # Remove duplicates
    recommendations['preferred_styles'] = list(set(recommendations['preferred_styles']))
    recommendations['preferred_subjects'] = list(set(recommendations['preferred_subjects']))
    
    return recommendations

def get_contextual_recommendations(user_colors, room_characteristics, max_recs=recommendation_config['max_recommendations']):
    """Get recommendations that consider both colors and room context."""
    try:
        art_catalog = load_catalog_from_dynamodb()
        if not art_catalog:
            return []
        
        scored_artworks = []
        
        # Get preferred characteristics from room analysis
        preferred_subjects = room_characteristics.get('recommended_art_characteristics', {}).get('preferred_subjects', [])
        preferred_styles = room_characteristics.get('recommended_art_characteristics', {}).get('preferred_styles', [])
        
        app.logger.info(f"Contextual filtering - Preferred subjects: {preferred_subjects}, Preferred styles: {preferred_styles}")
        
        for artwork in art_catalog:
            # Safely access attributes
            attributes = artwork.get('attributes', {}) or {}
            catalog_colors = attributes.get('dominant_colors', [])
            if not catalog_colors:
                continue
            
            # Calculate color similarity score (lower is better)
            color_score = safe_float(calculate_color_similarity_score(user_colors, catalog_colors))
            
            # Calculate context bonus (higher is better)
            context_bonus = safe_float(calculate_context_bonus(artwork, preferred_subjects, preferred_styles, room_characteristics))
            
            # Combined score: color score (lower better) - context bonus (higher better)
            # This way, good context matches get prioritized
            total_score = safe_float(color_score) - (safe_float(context_bonus) * 50.0)  # Weight context bonus
            
            scored_artworks.append({
                'artwork': artwork,
                'score': total_score,
                'color_score': color_score,
                'context_bonus': context_bonus
            })
        
        # Sort by total score (ascending, lower is better)
        scored_artworks.sort(key=lambda x: x['score'])
        
        app.logger.info(f"Contextual recommendations: Found {len(scored_artworks)} candidates")
        if scored_artworks:
            app.logger.info(f"Top match - Color score: {scored_artworks[0]['color_score']:.2f}, Context bonus: {scored_artworks[0]['context_bonus']:.2f}")
        
        return scored_artworks[:max_recs]
        
    except Exception as e:
        app.logger.error(f"Error in contextual recommendations: {e}")
        # Fallback to color-only recommendations
        return get_smart_recommendations(user_colors, max_recs)

def calculate_color_similarity_score(user_colors, catalog_colors):
    """Calculate color similarity score between user and catalog colors."""
    try:
        # Convert hex to RGB for comparison, ensuring all percentages are floats
        user_rgb = {}
        for item in user_colors:
            color = item['color']
            percentage = safe_float(item.get('percentage', 0.0))
            rgb = tuple(int(color[i:i+2], 16) for i in (1, 3, 5))
            user_rgb[color] = (rgb, percentage)
        
        catalog_rgb = {}
        for item in catalog_colors:
            color = item['color']
            percentage = safe_float(item.get('percentage', 0.0))
            rgb = tuple(int(color[i:i+2], 16) for i in (1, 3, 5))
            catalog_rgb[color] = (rgb, percentage)

        # Weighted color distance score
        total_score = 0.0
        for uc_hex, (uc_rgb, uc_perc) in user_rgb.items():
            for cc_hex, (cc_rgb, cc_perc) in catalog_rgb.items():
                # Ensure all values are floats before arithmetic
                uc_rgb_array = np.array(uc_rgb, dtype=float)
                cc_rgb_array = np.array(cc_rgb, dtype=float)
                dist = float(np.linalg.norm(uc_rgb_array - cc_rgb_array))
                total_score += dist * safe_float(uc_perc) * safe_float(cc_perc)
        
        return float(total_score)
    except Exception as e:
        app.logger.error(f"Error in color similarity calculation: {e}")
        return float('inf')  # Return high score if calculation fails

def calculate_context_bonus(artwork, preferred_subjects, preferred_styles, room_characteristics=None):
    """Calculate enhanced context bonus using new catalog attributes."""
    bonus = 0.0
    attrs = artwork.get('attributes', {})
    
    # 1. Subject match (enhanced)
    subject_attr = attrs.get('subject')
    if isinstance(subject_attr, dict):
        subject_label = subject_attr.get('label', '')
        subject_confidence = safe_float(subject_attr.get('confidence', 0.0))
    else:
        subject_label = subject_attr or ''
        subject_confidence = 1.0
    
    if subject_label in preferred_subjects:
        bonus += subject_confidence * 2.5  # Increased weight for subject match
    
    # 2. Style match (enhanced)
    style_attr = attrs.get('style')
    if isinstance(style_attr, dict):
        style_label = style_attr.get('label', '')
        style_confidence = safe_float(style_attr.get('confidence', 0.0))
    else:
        style_label = style_attr or ''
        style_confidence = 1.0
    
    if style_label in preferred_styles:
        bonus += style_confidence * 2.0  # Increased weight for style match
    
    # 3. NEW: Mood compatibility
    artwork_mood = attrs.get('mood', '') or ''
    artwork_mood = artwork_mood.lower() if artwork_mood else ''
    if room_characteristics and artwork_mood:
        room_type = room_characteristics.get('room_type', '') or ''
        room_type = room_type.lower() if room_type else ''
        brightness = room_characteristics.get('brightness', '') or ''
        brightness = brightness.lower() if brightness else ''
        
        # Mood-room compatibility scoring
        if room_type == 'bedroom' and artwork_mood in ['serene', 'romantic', 'contemplative']:
            bonus += 1.5
        elif room_type == 'living_room' and artwork_mood in ['uplifting', 'energetic', 'dramatic']:
            bonus += 1.5
        elif brightness == 'dark' and artwork_mood in ['uplifting', 'energetic']:
            bonus += 1.0  # Bright mood art for dark rooms
        elif brightness == 'bright' and artwork_mood in ['serene', 'contemplative']:
            bonus += 0.5  # Calm art for bright rooms
    
    # 4. NEW: Emotional impact scoring
    emotional_impact = safe_float(attrs.get('emotional_impact', 0.5))
    if emotional_impact > 0.7:
        bonus += 0.8  # High emotional impact gets bonus
    elif emotional_impact > 0.5:
        bonus += 0.4
    
    # 5. NEW: Color harmony matching
    if room_characteristics:
        room_color_temp = room_characteristics.get('color_palette', {}).get('temperature', '') or ''
        artwork_color_harmony = attrs.get('color_harmony', '') or ''
        
        # Complementary color matching
        if room_color_temp == 'warm' and artwork_color_harmony == 'cool':
            bonus += 0.8  # Complementary colors create balance
        elif room_color_temp == 'cool' and artwork_color_harmony == 'warm':
            bonus += 0.8
        elif room_color_temp == artwork_color_harmony and room_color_temp:
            bonus += 0.5  # Harmonious colors
    
    # 6. NEW: Room-specific recommendations
    room_suggestions = attrs.get('room_suggestions', {}) or {}
    if room_characteristics and room_suggestions:
        detected_room = room_characteristics.get('room_type', '') or ''
        detected_room = detected_room.replace('_', ' ').title()
        
        # Check primary room suggestion
        primary_room = room_suggestions.get('primary', {}) or {}
        if primary_room.get('room') == detected_room:
            primary_confidence = safe_float(primary_room.get('confidence', 0))
            bonus += primary_confidence * 1.5
        
        # Check secondary room suggestions
        secondary_rooms = room_suggestions.get('secondary', []) or []
        for room_info in secondary_rooms:
            if isinstance(room_info, dict) and room_info.get('room') == detected_room:
                secondary_confidence = safe_float(room_info.get('confidence', 0))
                bonus += secondary_confidence * 1.0
    
    # 7. NEW: Size appropriateness
    if room_characteristics:
        room_complexity = room_characteristics.get('texture_complexity', '') or ''
        recommended_size = attrs.get('recommended_size', 'medium') or 'medium'
        
        # Complex rooms can handle larger art
        if room_complexity == 'complex' and recommended_size == 'large':
            bonus += 0.5
        # Simple rooms work well with medium art
        elif room_complexity == 'simple' and recommended_size in ['small', 'medium']:
            bonus += 0.3
    
    return float(bonus)

def load_catalog_from_dynamodb():
    """Load art catalog from DynamoDB with local fallback for testing."""
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
        
        # Convert all Decimal types to floats for arithmetic operations
        items = [convert_decimals_to_floats(item) for item in items]
        
        app.logger.info(f"Fetched {len(items)} items from DynamoDB and cached for 600s")
        
        # If DynamoDB is empty, try to load from local catalog for testing
        if len(items) == 0:
            app.logger.info("DynamoDB catalog is empty, attempting to load local catalog for testing")
            local_items = load_local_catalog_fallback()
            if local_items:
                app.logger.info(f"Loaded {len(local_items)} items from local catalog")
                items = local_items
        
        # Cache the results
        catalog_cache.set('art_catalog', items)
        return items
        
    except Exception as e:
        app.logger.error(f"Error loading catalog from DynamoDB: {e}")
        # Try local fallback on error
        app.logger.info("Attempting local catalog fallback due to DynamoDB error")
        local_items = load_local_catalog_fallback()
        if local_items:
            app.logger.info(f"Loaded {len(local_items)} items from local catalog fallback")
            catalog_cache.set('art_catalog', local_items)
            return local_items
        return []

def load_local_catalog_fallback():
    """Load catalog from local JSON file as fallback for testing."""
    try:
        import os
        # Try enhanced catalog first, fallback to original
        enhanced_catalog_path = os.path.join(os.path.dirname(__file__), 'catalog', 'catalog_enhanced.json')
        catalog_path = os.path.join(os.path.dirname(__file__), 'catalog', 'catalog.json')
        
        # Use enhanced catalog if available
        if os.path.exists(enhanced_catalog_path):
            catalog_path = enhanced_catalog_path
            app.logger.info("Using enhanced catalog with improved attributes")
        
        if os.path.exists(catalog_path):
            with open(catalog_path, 'r') as f:
                catalog_data = json.load(f)
            
            app.logger.info(f"Successfully loaded {len(catalog_data)} items from local catalog")
            return catalog_data
        else:
            app.logger.warning(f"Local catalog file not found at {catalog_path}")
            return []
            
    except Exception as e:
        app.logger.error(f"Error loading local catalog fallback: {e}")
        return []

def get_smart_recommendations(user_colors, max_recs=recommendation_config['max_recommendations']):
    """Smart recommendation system that considers quality, diversity, and user experience."""
    recommendations = []
    
    # Load catalog from DynamoDB
    art_catalog = load_catalog_from_dynamodb()
    if not art_catalog:
        return recommendations

    # Calculate scores for all artworks
    scored_artworks = []
    for artwork in art_catalog:
        # Safely access attributes
        attributes = artwork.get('attributes', {}) or {}
        catalog_colors = attributes.get('dominant_colors', [])
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
    """Get recommendations based on user color preferences."""
    return get_smart_recommendations(user_colors)

def get_recommendations_by_filter(filters):
    """Get recommendations based on filter criteria."""
    try:
        catalog = load_catalog_from_dynamodb()
        if not catalog:
            app.logger.warning("No catalog data available for filtering")
            return []
        
        app.logger.info(f"Filtering catalog with {len(catalog)} items using filters: {filters}")
        
        # Extract filters (handle both list and single value formats)
        style_filters = filters.get('styles', [])
        subject_filters = filters.get('subjects', [])
        
        # Convert single values to lists for consistency
        if not isinstance(style_filters, list):
            style_filters = [style_filters] if style_filters else []
        if not isinstance(subject_filters, list):
            subject_filters = [subject_filters] if subject_filters else []
        
        recommendations = []
        for item in catalog:
            if 'attributes' not in item or not item['attributes']:
                app.logger.debug(f"Item {item.get('filename', 'unknown')} has no attributes")
                continue
                
            attributes = item['attributes']
            if isinstance(attributes, str):
                # Handle old string format
                app.logger.debug(f"Item {item.get('filename', 'unknown')} has string attributes")
                continue
            
            # Handle both old string format and new object format for style
            style_attr = attributes.get('style')
            if isinstance(style_attr, dict):
                style_label = style_attr.get('label', '')
                style_confidence = safe_float(style_attr.get('confidence', 0.0))
            else:
                # Old format - assume high confidence (1.0) for backward compatibility
                style_label = style_attr or ''
                style_confidence = 1.0
            
            # Handle both old string format and new object format for subject
            subject_attr = attributes.get('subject')
            if isinstance(subject_attr, dict):
                subject_label = subject_attr.get('label', '')
                subject_confidence = safe_float(subject_attr.get('confidence', 0.0))
            else:
                # Old format - assume high confidence (1.0) for backward compatibility
                subject_label = subject_attr or ''
                subject_confidence = 1.0
            
            # Check if item matches filters (same logic as app.py)
            style_match = not style_filters or style_label in style_filters
            subject_match = not subject_filters or subject_label in subject_filters
            
            if style_match and subject_match:
                app.logger.info(f"Item {item.get('filename', 'unknown')} matches filters")
                # Calculate confidence score (same logic as app.py)
                confidence_score = 1.0 - (float(style_confidence + subject_confidence) / 2.0)
                
                recommendations.append({
                    'item': item,
                    'score': confidence_score
                })
        
        app.logger.info(f"Found {len(recommendations)} matching items")
        
        # Sort by score and return top recommendations
        recommendations.sort(key=lambda x: x['score'])
        return [rec['item'] for rec in recommendations[:recommendation_config['max_recommendations']]]
        
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
        
        # Determine if image is approved based on moderation labels
        is_approved = len(moderation_labels) == 0
        reason = "Content moderation failed" if not is_approved else None
        
        result = (is_approved, reason)
        
        # Cache the result
        moderation_cache.set(cache_key, result)
        
        return result
        
    except Exception as e:
        app.logger.error(f"Error in content moderation: {e}")
        return (False, f"Moderation error: {str(e)}")

def store_quarantined_image(image_bytes, filename, reason):
    """Store image in quarantine bucket with metadata."""
    try:
        s3.put_object(
            Bucket=aws_config['quarantine_bucket'],
            Key=filename,
            Body=image_bytes,
            Metadata={
                'quarantine_reason': reason,
                'timestamp': datetime.utcnow().isoformat()
            }
        )
        logger.info(f"Image {filename} quarantined: {reason}")
        return True
    except Exception as e:
        logger.error(f"Error storing quarantined image: {e}")
        return None

# Removed vector-based recommendations - using simple filtering instead

def generate_presigned_url(filename):
    """Generate a presigned URL for an S3 object."""
    try:
        url = s3.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': aws_config['catalog_bucket_name'],
                'Key': filename
            },
            ExpiresIn=3600  # 1 hour
        )
        return url
    except Exception as e:
        logger.error(f"Error generating presigned URL for {filename}: {e}")
        return None

# --- Routes ---

@app.route('/')
def serve_index():
    """Serve the main index.html file."""
    return send_from_directory('static', 'index.html')

@app.route('/e2e_navigation_test.html')
def serve_e2e_test():
    """Serve the E2E navigation test file."""
    return send_from_directory('.', 'e2e_navigation_test.html')

@app.route('/recommend', methods=['POST'])
@limiter.limit("30 per minute")
def recommend_unified():
    """Unified recommendation endpoint that handles both color-based and preference-based recommendations."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Handle both old 'type' field and new 'workflow_type' field
        workflow_type = data.get('workflow_type', data.get('type', 'COLORS'))
        
        # Map old type values to new workflow_type values
        if workflow_type == 'preferences':
            workflow_type = 'PREFERENCES'
        elif workflow_type == 'upload':
            workflow_type = 'COLORS'
        
        app.logger.info(f"Processing {workflow_type}-based recommendation")
        
        if workflow_type == 'PREFERENCES':
            # Handle preference-based recommendations
            preferences = data.get('preferences', {})
            if not preferences:
                return jsonify({'error': 'No preferences provided'}), 400
            
            app.logger.info("Using simple filtering for preference-based recommendations")
            
            # Format preferences into the expected filter format
            filters = {}
            if 'subjects' in preferences:
                filters['subjects'] = preferences['subjects']
            elif 'subject' in preferences:
                # Handle single subject case
                subject_value = preferences['subject']
                if isinstance(subject_value, list):
                    filters['subjects'] = subject_value
                else:
                    filters['subjects'] = [subject_value] if subject_value else []
            
            # Use simple filtering for fast performance
            recommendations = get_recommendations_by_filter(filters)
            
            # Pre-generate S3 URLs for all recommendations to avoid frontend delays
            for rec in recommendations:
                filename = rec.get('filename', '')
                if filename:
                    # Check cache first
                    cache_key = f"s3_url_{filename}"
                    cached_url = presigned_url_cache.get(cache_key)
                    if cached_url:
                        rec['image_url'] = cached_url
                    else:
                        # Generate new presigned URL
                        try:
                            image_url = s3.generate_presigned_url(
                                'get_object',
                                Params={
                                    'Bucket': aws_config['catalog_bucket_name'],
                                    'Key': filename
                                },
                                ExpiresIn=3600  # URL expires in 1 hour
                            )
                            # Cache the URL
                            presigned_url_cache.set(cache_key, image_url)
                            rec['image_url'] = image_url
                        except Exception as e:
                            app.logger.error(f"Error generating S3 URL for {filename}: {e}")
                            rec['image_url'] = None
                else:
                    rec['image_url'] = None
            
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
        items = load_catalog_from_dynamodb()
        subjects = set()
        CONFIDENCE_THRESHOLD = 0.3  # Only show attributes with confidence >= 0.3
        
        for art in items:
            attrs = art.get('attributes', {})
            
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
                'Bucket': aws_config['catalog_bucket_name'],
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
    """Health check endpoint with basic diagnostics."""
    try:
        # Basic health check - fast and reliable
        health_status = {
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'environment': aws_config['env'],
            'version': '1.0.0'
        }
        
        # Memory usage (fast check)
        try:
            process = psutil.Process()
            memory_mb = process.memory_info().rss / 1024 / 1024
            health_status['memory_mb'] = round(memory_mb, 2)
        except Exception as e:
            health_status['memory'] = f'error: {str(e)}'
        
        # Configuration summary (fast check)
        health_status['config'] = {
            'region': aws_config['region'],
            'catalog_table': aws_config['catalog_table_name'],
            'catalog_bucket': aws_config['catalog_bucket_name'],
            'max_recommendations': recommendation_config['max_recommendations']
        }
        
        logger.info(f"Health check completed: {health_status['status']}")
        return jsonify(health_status), 200
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
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

@app.route('/upload-image', methods=['POST'])
@limiter.limit("10 per minute")
def upload_image():
    """Handle image upload and extract colors and room characteristics for contextual recommendations."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Get the image data (base64 encoded)
        image_data = data.get('roomImage')
        if not image_data:
            return jsonify({'error': 'No image data provided'}), 400
        
        # Remove the data URL prefix if present
        if image_data.startswith('data:image/'):
            # Extract the base64 data after the comma
            image_data = image_data.split(',', 1)[1]
        
        # Decode base64 to bytes
        try:
            image_bytes = base64.b64decode(image_data)
        except Exception as e:
            app.logger.error(f"Failed to decode base64 image: {e}")
            return jsonify({'error': 'Invalid image format'}), 400
        
        # Use a generic filename for processing
        filename = "uploaded_image.jpg"
        
        # Moderate the image content
        is_approved, reason = moderate_image_content(image_bytes)
        if not is_approved:
            store_quarantined_image(image_bytes, filename, reason)
            app.logger.error(f"Moderation failed: {reason}")
            return jsonify({'error': f"Moderation failed: {reason}"}), 400
        
        # Create image stream for analysis
        image_stream = io.BytesIO(image_bytes)
        
        # Extract dominant colors from the image
        user_colors = extract_dominant_colors(image_stream)
        if not user_colors:
            app.logger.error("Could not analyze image colors")
            return jsonify({'error': 'Could not analyze image colors.'}), 500
        
        app.logger.info(f"Successfully analyzed image colors: {len(user_colors)} colors found")
        
        # Analyze room characteristics for contextual recommendations
        room_characteristics = analyze_room_characteristics(image_stream)
        
        if room_characteristics:
            app.logger.info("Using contextual recommendations based on room analysis")
            # Get contextual recommendations that consider both colors and room style
            scored_recommendations = get_contextual_recommendations(user_colors, room_characteristics)
        else:
            app.logger.info("Room analysis failed, falling back to color-only recommendations")
            # Fallback to color-only recommendations
            scored_recommendations = get_smart_recommendations(user_colors)
        
        # Extract the artwork items from the scored recommendations
        recommendations = [rec['artwork'] for rec in scored_recommendations]
        
        # Format the recommendations like app.py does
        formatted_recommendations = []
        for rec in recommendations:
            # Pre-generate S3 URL to avoid frontend delays
            filename = rec.get('filename', '')
            image_url = None
            if filename:
                # Check cache first
                cache_key = f"s3_url_{filename}"
                cached_url = presigned_url_cache.get(cache_key)
                if cached_url:
                    image_url = cached_url
                else:
                    # Generate new presigned URL
                    try:
                        image_url = s3.generate_presigned_url(
                            'get_object',
                            Params={
                                'Bucket': aws_config['catalog_bucket_name'],
                                'Key': filename
                            },
                            ExpiresIn=3600  # URL expires in 1 hour
                        )
                        # Cache the URL
                        presigned_url_cache.set(cache_key, image_url)
                    except Exception as e:
                        app.logger.error(f"Error generating S3 URL for {filename}: {e}")
                        image_url = None
            
            formatted_rec = {
                'id': rec.get('id', ''),
                'title': rec.get('title', ''),
                'artist': rec.get('artist', ''),
                'description': rec.get('description', ''),
                'price': rec.get('price', ''),
                'product_url': rec.get('product_url', ''),
                'filename': filename,
                'image_url': image_url,  # Pre-generated S3 URL
                'attributes': rec.get('attributes', {})
            }
            formatted_recommendations.append(formatted_rec)
        
        # Include room analysis in response for debugging/transparency
        response_data = {
            'recommendations': formatted_recommendations,
            'room_analysis': room_characteristics if room_characteristics else None
        }
        
        app.logger.info(f"Generated {len(formatted_recommendations)} contextual recommendations for uploaded image")
        app.logger.info("=== RECOMMENDATION REQUEST COMPLETE ===")
        app.logger.info(f"Returning {len(formatted_recommendations)} recommendations")
        if formatted_recommendations:
            app.logger.info(f"First recommendation: {formatted_recommendations[0].get('title', 'Unknown')}")
        
        return jsonify(response_data)
        
    except Exception as e:
        app.logger.error(f"Error processing uploaded image: {e}")
        return jsonify({'error': 'Failed to process image'}), 500

# FINAL STARTUP LOGGING - This will execute when gunicorn imports the module
print("=== APP_AWS.PY MODULE LOADED SUCCESSFULLY ===", file=sys.stderr)
logger.info("=== APPLICATION MODULE LOADED ===")
logger.info("Gunicorn should now be able to start the Flask application")

if __name__ == '__main__':
    print("=== ABOUT TO START FLASK APP ===", file=sys.stderr)
    logger.info("=== STARTING FLASK APPLICATION ===")
    logger.info(f"Flask app will run on host: 0.0.0.0, port: 8000")
    logger.info(f"Debug mode: False")
    app.run(host='0.0.0.0', port=8000, debug=False) 