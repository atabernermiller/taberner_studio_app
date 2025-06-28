# Catalog Management

This folder contains scripts for building, updating, and managing the Taberner Studio art catalog.

## Quick Start Guide

### 🖼️ Adding New Images to Your Catalog

Choose the workflow that matches your needs:

---

## 📁 **BULK IMAGE WORKFLOW** (Multiple Images)

**Use this when you have several new images to add at once.**

### Step 1: Add Images to Directory
```bash
# Copy your new images to the catalog/images/ directory
cp /path/to/your/new/images/* backend/catalog/images/
```

### Step 2: Bulk Add Metadata
```bash
cd backend/catalog_management

# First, see what new images will be added (dry run)
python bulk_add_images.py --dry-run

# Then add all new images with default metadata
python bulk_add_images.py
```

### Step 3: Process Catalog
```bash
# Regenerate the catalog with all images
python process_catalog.py
```

### Step 4: Customize Metadata (Optional)
```bash
# List all current metadata to see what was added
python update_metadata.py --list

# Update specific images with custom information
python update_metadata.py --filename "your_image.jpg" --title "Custom Title" --description "Custom description" --url "https://your-product-url.com"
```

### Step 5: Final Catalog Update
```bash
# Re-run catalog processing to include custom metadata
python process_catalog.py
```

---

## 🖼️ **SINGLE IMAGE WORKFLOW** (One Image)

**Use this when you have just one new image to add.**

### Step 1: Add Image to Directory
```bash
# Copy your single image to the catalog/images/ directory
cp /path/to/your/image.jpg backend/catalog/images/
```

### Step 2: Add Metadata
```bash
cd backend/catalog_management

# Add the image with default metadata
python update_metadata.py --add-new "your_image.jpg"
```

### Step 3: Customize Metadata (Optional)
```bash
# Update with custom information
python update_metadata.py --filename "your_image.jpg" --title "Your Custom Title" --description "Your custom description" --url "https://your-product-url.com"
```

### Step 4: Process Catalog
```bash
# Regenerate the catalog
python process_catalog.py
```

---

## 🔧 **Available Scripts**

### Core Scripts
- **`process_catalog.py`** - Main script that processes images and generates catalog.json
- **`bulk_add_images.py`** - Bulk adds metadata for multiple new images
- **`update_metadata.py`** - Updates metadata for individual images

### Utility Scripts
- **`enrich_catalog.py`** - Enriches catalog with AI-generated attributes and embeddings
- **`cleanup_dynamodb.py`** - Cleans up DynamoDB entries

### Documentation
- **`CATALOG_MANAGEMENT.md`** - Detailed catalog management documentation
- **`BULK_IMAGE_WORKFLOW.md`** - Comprehensive bulk image workflow guide

## 📋 **File Structure**

```
backend/catalog_management/
├── catalog_metadata.json    # Custom metadata for images
├── process_catalog.py       # Main catalog processing script
├── bulk_add_images.py       # Bulk metadata addition
├── update_metadata.py       # Individual metadata updates
└── README.md               # This file

backend/catalog/
├── images/                 # Your image files go here
├── catalog.json           # Generated catalog (don't edit manually)
└── catalog_metadata.json  # Custom metadata (edit this)
```

## ⚠️ **Important Notes**

1. **Always run from the correct directory**: `backend/catalog_management/`
2. **Images must be in**: `backend/catalog/images/`
3. **Supported formats**: PNG, JPG, JPEG, HEIC
4. **Customize metadata in**: `catalog_metadata.json`
5. **Don't edit**: `catalog.json` (it's generated automatically)

## 🚀 **Deployment**

After updating your catalog:

1. **Commit your changes**:
   ```bash
   git add backend/catalog/
   git add backend/catalog_management/catalog_metadata.json
   git commit -m "Add new images to catalog"
   git push origin main
   ```

2. **Deploy to AWS**: Your CodeBuild will automatically pick up the changes and deploy the updated catalog.

## 🆘 **Troubleshooting**

### "No such file or directory" error
- Make sure you're running scripts from `backend/catalog_management/`
- Check that images are in `backend/catalog/images/`

### Images not showing up
- Run `python process_catalog.py` after adding metadata
- Check that image filenames match exactly in metadata

### Metadata not updating
- Edit `catalog_metadata.json` directly, then run `process_catalog.py`
- Or use `update_metadata.py` with the correct filename

## 📞 **Need Help?**

Check the detailed documentation:
- `CATALOG_MANAGEMENT.md` - Complete workflow guide
- `BULK_IMAGE_WORKFLOW.md` - Bulk processing details 