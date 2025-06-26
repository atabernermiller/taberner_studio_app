"""
bulk_add_images.py

Purpose:
    Bulk helper script to efficiently add metadata for multiple new images at once.
    This is much faster than running update_metadata.py --add-new for each image individually.

Usage:
    python bulk_add_images.py  # Adds all new images in catalog/images/ that aren't in metadata
    python bulk_add_images.py --dry-run  # Shows what would be added without actually adding
"""
import json
import os
import glob
from update_metadata import load_metadata, save_metadata

CATALOG_DIR = os.path.join(os.path.dirname(__file__), 'catalog')
IMAGE_DIR = os.path.join(CATALOG_DIR, 'images')
METADATA_PATH = os.path.join(os.path.dirname(__file__), 'catalog_metadata.json')

def get_all_image_files():
    """Get all image files in the catalog/images/ directory."""
    image_extensions = ('*.png', '*.jpg', '*.jpeg', '*.heic')
    image_files = []
    
    for ext in image_extensions:
        image_files.extend(glob.glob(os.path.join(IMAGE_DIR, ext)))
    
    # Extract just the filenames
    return [os.path.basename(f) for f in image_files]

def bulk_add_new_images(dry_run=False):
    """Add metadata for all new images that aren't already in the metadata file."""
    metadata = load_metadata()
    existing_images = set(metadata.get('metadata', {}).keys())
    
    # Get all image files
    all_image_files = get_all_image_files()
    new_images = [img for img in all_image_files if img not in existing_images]
    
    if not new_images:
        print("✅ No new images found. All images already have metadata.")
        return
    
    print(f"📁 Found {len(new_images)} new images that need metadata:")
    for img in new_images:
        print(f"   - {img}")
    
    if dry_run:
        print(f"\n🔍 DRY RUN: Would add {len(new_images)} images with default metadata")
        print("Run without --dry-run to actually add them")
        return
    
    # Add each new image with default metadata
    defaults = metadata.get('defaults', {})
    added_count = 0
    
    for img in new_images:
        metadata['metadata'][img] = {
            'title': f"Artwork {img.split('.')[0]}",
            'artist': defaults.get('artist', 'Annette Taberner'),
            'description': defaults.get('description', 'A beautiful piece of art from Taberner Studio.'),
            'price': defaults.get('price', '12.95'),
            'product_url': defaults.get('product_url', 'https://www.tabernerstudio.com/shop')
        }
        added_count += 1
        print(f"✅ Added {img}")
    
    # Save the updated metadata
    save_metadata(metadata)
    print(f"\n🎉 Successfully added metadata for {added_count} new images!")
    print(f"📝 Next steps:")
    print(f"   1. Edit {METADATA_PATH} to customize descriptions and URLs")
    print(f"   2. Run 'python process_catalog.py' to regenerate the catalog")
    print(f"   3. Test your application")

def main():
    import argparse
    parser = argparse.ArgumentParser(description='Bulk add metadata for new images')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be added without actually adding')
    
    args = parser.parse_args()
    bulk_add_new_images(dry_run=args.dry_run)

if __name__ == '__main__':
    main() 