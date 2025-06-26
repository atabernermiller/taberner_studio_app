"""
update_metadata.py

Purpose:
    Helper script to easily update the catalog_metadata.json file with custom descriptions
    and product URLs for each artwork. This allows you to customize the metadata without
    having to manually edit the JSON file.

Usage:
    python update_metadata.py --filename "image.jpg" --title "Custom Title" --description "Custom description" --url "https://example.com"
    python update_metadata.py --list  # List all current metadata
    python update_metadata.py --add-new "new_image.jpg"  # Add metadata for a new image
"""
import json
import argparse
import os

METADATA_PATH = os.path.join(os.path.dirname(__file__), 'catalog_metadata.json')

def load_metadata():
    """Loads the current metadata file."""
    try:
        with open(METADATA_PATH, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {
            'metadata': {},
            'defaults': {
                'artist': 'Annette Taberner',
                'price': '12.95',
                'description': 'A beautiful piece of art from Taberner Studio. This piece explores themes of color and form, creating a vibrant and engaging visual experience.',
                'product_url': 'https://www.tabernerstudio.com/shop'
            }
        }

def save_metadata(metadata):
    """Saves the metadata to file."""
    with open(METADATA_PATH, 'w') as f:
        json.dump(metadata, f, indent=4)
    print(f"Metadata saved to {METADATA_PATH}")

def list_metadata():
    """Lists all current metadata entries."""
    metadata = load_metadata()
    print("\n=== Current Metadata ===")
    for filename, data in metadata.get('metadata', {}).items():
        print(f"\n📁 {filename}")
        print(f"   Title: {data.get('title', 'Not set')}")
        print(f"   Artist: {data.get('artist', 'Not set')}")
        print(f"   Price: {data.get('price', 'Not set')}")
        print(f"   Description: {data.get('description', 'Not set')[:100]}...")
        print(f"   URL: {data.get('product_url', 'Not set')}")

def update_metadata(filename, title=None, artist=None, description=None, price=None, url=None):
    """Updates metadata for a specific filename."""
    metadata = load_metadata()
    
    if filename not in metadata['metadata']:
        metadata['metadata'][filename] = {}
    
    if title:
        metadata['metadata'][filename]['title'] = title
    if artist:
        metadata['metadata'][filename]['artist'] = artist
    if description:
        metadata['metadata'][filename]['description'] = description
    if price:
        metadata['metadata'][filename]['price'] = price
    if url:
        metadata['metadata'][filename]['product_url'] = url
    
    save_metadata(metadata)
    print(f"✅ Updated metadata for {filename}")

def add_new_image(filename):
    """Adds a new image to the metadata with default values."""
    metadata = load_metadata()
    
    if filename in metadata['metadata']:
        print(f"⚠️  {filename} already exists in metadata")
        return
    
    defaults = metadata['defaults']
    metadata['metadata'][filename] = {
        'title': f"Artwork {filename.split('.')[0]}",
        'artist': defaults['artist'],
        'description': defaults['description'],
        'price': defaults['price'],
        'product_url': defaults['product_url']
    }
    
    save_metadata(metadata)
    print(f"✅ Added {filename} with default metadata")
    print(f"   Edit {METADATA_PATH} to customize the metadata")

def main():
    parser = argparse.ArgumentParser(description='Update catalog metadata')
    parser.add_argument('--filename', help='Image filename to update')
    parser.add_argument('--title', help='Artwork title')
    parser.add_argument('--artist', help='Artist name')
    parser.add_argument('--description', help='Artwork description')
    parser.add_argument('--price', help='Artwork price')
    parser.add_argument('--url', help='Product URL')
    parser.add_argument('--list', action='store_true', help='List all current metadata')
    parser.add_argument('--add-new', help='Add a new image with default metadata')
    
    args = parser.parse_args()
    
    if args.list:
        list_metadata()
    elif args.add_new:
        add_new_image(args.add_new)
    elif args.filename:
        update_metadata(
            args.filename,
            title=args.title,
            artist=args.artist,
            description=args.description,
            price=args.price,
            url=args.url
        )
    else:
        print("Use --help to see available options")
        print("\nExamples:")
        print("  python update_metadata.py --list")
        print("  python update_metadata.py --add-new 'new_image.jpg'")
        print("  python update_metadata.py --filename 'image.jpg' --title 'Custom Title' --description 'Custom description'")

if __name__ == '__main__':
    main() 