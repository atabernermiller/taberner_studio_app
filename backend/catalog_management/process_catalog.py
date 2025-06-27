"""
process_catalog.py

Purpose:
    Generates or updates catalog.json by processing all images in the catalog/images/ directory.
    For each image, extracts the 5 most dominant colors using KMeans clustering and creates a record
    with a unique ID, filename, title, artist, description, price, product URL, and attributes (dominant colors, mood, style, subject—latter three are placeholders).
    Uses catalog_metadata.json for custom descriptions and product URLs.
    Writes all records to catalog.json.

Usage:
    Run this script to create a fresh catalog or update it based on the images present.
    Update catalog_metadata.json to customize descriptions and product URLs for each image.
"""
import os
import json
import uuid
from PIL import Image
import numpy as np
from sklearn.cluster import KMeans

CATALOG_DIR = os.path.join(os.path.dirname(__file__), 'catalog')
IMAGE_DIR = os.path.join(CATALOG_DIR, 'images')
CATALOG_JSON_PATH = os.path.join(CATALOG_DIR, 'catalog.json')
METADATA_PATH = os.path.join(os.path.dirname(__file__), 'catalog_metadata.json')

def load_metadata():
    """Loads the metadata file with custom descriptions and product URLs."""
    try:
        with open(METADATA_PATH, 'r') as f:
            metadata = json.load(f)
        print(f"Loaded metadata for {len(metadata.get('metadata', {}))} images")
        return metadata
    except FileNotFoundError:
        print(f"Warning: Metadata file not found at {METADATA_PATH}. Using defaults.")
        return {
            'metadata': {},
            'defaults': {
                'artist': 'Annette Taberner',
                'price': '12.95',
                'description': 'A beautiful piece of art from Taberner Studio. This piece explores themes of color and form, creating a vibrant and engaging visual experience.',
                'product_url': 'https://www.tabernerstudio.com/shop'
            }
        }
    except json.JSONDecodeError:
        print(f"Error: Could not parse metadata file {METADATA_PATH}. Using defaults.")
        return {
            'metadata': {},
            'defaults': {
                'artist': 'Annette Taberner',
                'price': '12.95',
                'description': 'A beautiful piece of art from Taberner Studio. This piece explores themes of color and form, creating a vibrant and engaging visual experience.',
                'product_url': 'https://www.tabernerstudio.com/shop'
            }
        }

def extract_dominant_colors(image_path, n_colors=5):
    """Extracts the n_colors most dominant colors from an image with their percentages."""
    try:
        img = Image.open(image_path).convert('RGB')
        # Resize for faster processing
        img.thumbnail((100, 100))
        
        # Reshape the image to be a list of pixels
        pixels = np.array(img).reshape(-1, 3)
        
        # Use KMeans to find dominant colors
        kmeans = KMeans(n_clusters=n_colors, random_state=42, n_init='auto')
        kmeans.fit(pixels)
        
        # Get cluster centers (colors) and labels
        colors = kmeans.cluster_centers_.astype(int)
        labels = kmeans.labels_
        
        # Count pixels in each cluster and calculate percentages
        if labels is not None:
            label_counts = np.bincount(labels)
            total_pixels = len(pixels)
            percentages = label_counts / total_pixels
            
            # Combine colors and percentages
            dominant_colors = []
            for i in range(len(colors)):
                dominant_colors.append({
                    'color': f'#{colors[i][0]:02x}{colors[i][1]:02x}{colors[i][2]:02x}',
                    'percentage': float(percentages[i])
                })
                
            # Sort by percentage in descending order
            dominant_colors.sort(key=lambda x: x['percentage'], reverse=True)
            
            return dominant_colors
        else:
            print(f"Error: No labels generated for {image_path}")
            return []
    except Exception as e:
        print(f"Error processing {image_path}: {e}")
        return []

def get_artwork_metadata(filename, metadata):
    """Gets metadata for a specific artwork, falling back to defaults if not found."""
    image_metadata = metadata.get('metadata', {}).get(filename, {})
    defaults = metadata.get('defaults', {})
    
    return {
        'title': image_metadata.get('title', f"Artwork {filename.split('.')[0]}"),
        'artist': image_metadata.get('artist', defaults.get('artist', 'Annette Taberner')),
        'description': image_metadata.get('description', defaults.get('description', 'A beautiful piece of art from Taberner Studio.')),
        'price': image_metadata.get('price', defaults.get('price', '12.95')),
        'product_url': image_metadata.get('product_url', defaults.get('product_url', 'https://www.tabernerstudio.com/shop'))
    }

def process_catalog():
    """Processes all images in the IMAGE_DIR and updates the catalog.json file."""
    print("Starting art catalog processing...")
    
    # Load metadata
    metadata = load_metadata()
    
    catalog_data = []
    
    image_files = [f for f in os.listdir(IMAGE_DIR) if f.lower().endswith(('png', 'jpg', 'jpeg', 'heic'))]

    for filename in image_files:
        print(f"Processing {filename}...")
        image_path = os.path.join(IMAGE_DIR, filename)
        
        dominant_colors = extract_dominant_colors(image_path)
        
        if not dominant_colors:
            continue

        # Get metadata for this artwork
        artwork_metadata = get_artwork_metadata(filename, metadata)

        # Create a record for the artwork
        art_record = {
            'id': str(uuid.uuid4()),
            'filename': filename,
            'title': artwork_metadata['title'],
            'artist': artwork_metadata['artist'],
            'description': artwork_metadata['description'],
            'price': artwork_metadata['price'],
            'product_url': artwork_metadata['product_url'],
            'attributes': {
                'dominant_colors': dominant_colors,
                # Placeholders for future AI-driven attributes
                'mood': None,
                'style': None,
                'subject': None
            }
        }
        catalog_data.append(art_record)

    # Write the updated catalog to the JSON file
    with open(CATALOG_JSON_PATH, 'w') as f:
        json.dump(catalog_data, f, indent=4)
        
    print(f"\nProcessing complete. {len(catalog_data)} images added to catalog.json.")
    print(f"To customize descriptions and product URLs, edit {METADATA_PATH}")

if __name__ == '__main__':
    process_catalog()
