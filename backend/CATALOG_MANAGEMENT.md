# Catalog Management Guide

This guide explains how to manage your art catalog with custom descriptions and product URLs.

## Overview

The catalog system now uses an external metadata file (`catalog_metadata.json`) to store custom descriptions and product URLs for each artwork. This allows you to:

- ✅ **Customize descriptions** for each artwork without reprocessing images
- ✅ **Update product URLs** easily
- ✅ **Maintain version control** of your metadata changes
- ✅ **Use defaults** for new images automatically

## Files

- `catalog_metadata.json` - Contains custom descriptions and product URLs
- `process_catalog.py` - Processes images and applies metadata
- `update_metadata.py` - Helper script to manage metadata
- `catalog/catalog.json` - Final catalog with all data (auto-generated)

## Quick Start

### 1. View Current Metadata
```bash
cd backend
python update_metadata.py --list
```

### 2. Update an Existing Image
```bash
python update_metadata.py --filename "ThreeSisters.jpeg" \
  --title "Wild Onaqui Mares" \
  --description "The Onaqui wild horses of Utah stand as symbols of freedom..." \
  --url "https://www.tabernerstudio.com/warehouse-open-edition-prints/art_print_products/wild-onaqui-mares"
```

### 3. Add a New Image
```bash
# First, add the image to catalog/images/
# Then add metadata:
python update_metadata.py --add-new "new_artwork.jpg"
```

### 4. Regenerate Catalog
```bash
python process_catalog.py
```

## Detailed Usage

### Using the Helper Script

The `update_metadata.py` script provides several commands:

#### List All Metadata
```bash
python update_metadata.py --list
```
Shows all current metadata entries with titles, descriptions, and URLs.

#### Update Specific Fields
```bash
# Update just the title
python update_metadata.py --filename "image.jpg" --title "New Title"

# Update description and URL
python update_metadata.py --filename "image.jpg" \
  --description "New description" \
  --url "https://new-url.com"

# Update multiple fields
python update_metadata.py --filename "image.jpg" \
  --title "New Title" \
  --artist "New Artist" \
  --description "New description" \
  --price "15.99" \
  --url "https://new-url.com"
```

#### Add New Image
```bash
python update_metadata.py --add-new "new_image.jpg"
```
This adds the image with default metadata. You can then edit the `catalog_metadata.json` file or use the update command to customize it.

### Manual Editing

You can also edit `catalog_metadata.json` directly:

```json
{
    "metadata": {
        "image_filename.jpg": {
            "title": "Custom Title",
            "artist": "Annette Taberner",
            "description": "Custom description...",
            "price": "12.95",
            "product_url": "https://www.tabernerstudio.com/shop"
        }
    },
    "defaults": {
        "artist": "Annette Taberner",
        "price": "12.95",
        "description": "Default description...",
        "product_url": "https://www.tabernerstudio.com/shop"
    }
}
```

## Workflow for Adding New Artwork

1. **Add the image file** to `catalog/images/`
2. **Add metadata** using the helper script:
   ```bash
   python update_metadata.py --add-new "new_artwork.jpg"
   ```
3. **Customize the metadata** (edit `catalog_metadata.json` or use update commands)
4. **Regenerate the catalog**:
   ```bash
   python process_catalog.py
   ```
5. **Test the application** to ensure the new artwork appears correctly

## Workflow for Updating Existing Artwork

1. **Update the metadata** using the helper script or edit `catalog_metadata.json`
2. **Regenerate the catalog**:
   ```bash
   python process_catalog.py
   ```
3. **Test the application** to ensure changes appear correctly

## Default Values

If an image doesn't have custom metadata, the system uses these defaults:

- **Artist**: "Annette Taberner"
- **Price**: "12.95"
- **Description**: "A beautiful piece of art from Taberner Studio..."
- **Product URL**: "https://www.tabernerstudio.com/shop"
- **Title**: "Artwork {filename}" (generated from filename)

## Tips

- **Backup your metadata**: The `catalog_metadata.json` file contains all your custom descriptions and URLs
- **Use version control**: Commit changes to `catalog_metadata.json` to track your updates
- **Test after changes**: Always run `python process_catalog.py` and test the application after making changes
- **Keep descriptions consistent**: Use similar tone and length for better user experience

## Troubleshooting

### Image Not Appearing
- Check that the image file exists in `catalog/images/`
- Ensure the filename in metadata matches the actual file exactly
- Run `python process_catalog.py` to regenerate the catalog

### Metadata Not Applied
- Check that the filename in `catalog_metadata.json` matches the image file exactly
- Verify the JSON syntax is valid
- Run `python update_metadata.py --list` to see current metadata

### Helper Script Errors
- Make sure you're in the `backend` directory when running the script
- Check that `catalog_metadata.json` exists and has valid JSON syntax
- Use `python update_metadata.py --help` to see all available options 