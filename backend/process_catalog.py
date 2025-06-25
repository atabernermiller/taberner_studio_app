"""
process_catalog.py

Purpose:
    Generates or updates catalog.json by processing all images in the catalog/images/ directory.
    For each image, extracts the 5 most dominant colors using KMeans clustering and creates a record
    with a unique ID, filename, title, artist, description, price, product URL, and attributes (dominant colors, mood, style, subject—latter three are placeholders).
    Writes all records to catalog.json.

Usage:
    Run this script to create a fresh catalog or update it based on the images present.
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

def extract_dominant_colors(image_path, n_colors=5):
    """Extracts the n_colors most dominant colors from an image with their percentages."""
    try:
        img = Image.open(image_path).convert('RGB')
        # Resize for faster processing
        img.thumbnail((100, 100))
        
        # Reshape the image to be a list of pixels
        pixels = np.array(img).reshape(-1, 3)
        
        # Use KMeans to find dominant colors
        kmeans = KMeans(n_clusters=n_colors, random_state=42, n_init=10)
        kmeans.fit(pixels)
        
        # Get cluster centers (colors) and labels
        colors = kmeans.cluster_centers_.astype(int)
        labels = kmeans.labels_
        
        # Count pixels in each cluster and calculate percentages
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
    except Exception as e:
        print(f"Error processing {image_path}: {e}")
        return []

def process_catalog():
    """Processes all images in the IMAGE_DIR and updates the catalog.json file."""
    print("Starting art catalog processing...")
    catalog_data = []
    
    image_files = [f for f in os.listdir(IMAGE_DIR) if f.lower().endswith(('png', 'jpg', 'jpeg', 'heic'))]

    for filename in image_files:
        print(f"Processing {filename}...")
        image_path = os.path.join(IMAGE_DIR, filename)
        
        dominant_colors = extract_dominant_colors(image_path)
        
        if not dominant_colors:
            continue

        # Create a record for the artwork
        art_record = {
            'id': str(uuid.uuid4()),
            'filename': filename,
            'title': f"Artwork {filename.split('.')[0]}",
            'artist': 'Taberner Studio',
            'description': 'A beautiful piece of art from Taberner Studio. This piece explores themes of color and form, creating a vibrant and engaging visual experience.',
            'price': '1,200',
            'product_url': 'https://www.tabernerstudio.com/shop',
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

if __name__ == '__main__':
    process_catalog()
