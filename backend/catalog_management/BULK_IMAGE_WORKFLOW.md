# Bulk Image Workflow Guide

This guide shows you how to efficiently add 100+ new images with custom descriptions and product URLs.

## **🚀 Quick Start for 100 New Images**

### **Step 1: Add Images to Directory**
```bash
# Copy your 100 new image files to catalog/images/
# Example: new_artwork_1.jpg, new_artwork_2.jpg, etc.
```

### **Step 2: Bulk Add Initial Metadata**
```bash
cd backend

# First, see what would be added (dry run)
python bulk_add_images.py --dry-run

# Then actually add them
python bulk_add_images.py
```

### **Step 3: Customize Descriptions and URLs**
Edit `catalog_metadata.json` to add your custom descriptions and product URLs.

### **Step 4: Regenerate Catalog**
```bash
python process_catalog.py
```

## **📋 Detailed Workflow**

### **Phase 1: Preparation**

1. **Organize your images** with descriptive filenames:
   ```
   catalog/images/
   ├── sunset_beach_hawaii.jpg
   ├── mountain_landscape_colorado.jpg
   ├── wild_horses_utah.jpg
   └── ...
   ```

2. **Prepare your descriptions and URLs** in a spreadsheet or document:
   ```
   Filename                    | Title                    | Description                    | Product URL
   sunset_beach_hawaii.jpg     | Hawaiian Sunset          | Beautiful sunset over...      | https://...
   mountain_landscape_colorado.jpg | Colorado Peaks      | Majestic mountain range...    | https://...
   ```

### **Phase 2: Bulk Processing**

#### **Option A: Automated Bulk Add (Recommended)**
```bash
# Add all new images with default metadata
python bulk_add_images.py

# Output will show:
# 📁 Found 100 new images that need metadata:
#    - sunset_beach_hawaii.jpg
#    - mountain_landscape_colorado.jpg
#    ...
# ✅ Added sunset_beach_hawaii.jpg
# ✅ Added mountain_landscape_colorado.jpg
# ...
# 🎉 Successfully added metadata for 100 new images!
```

#### **Option B: Manual Individual Add**
```bash
# For each image (not recommended for 100 images)
python update_metadata.py --add-new "sunset_beach_hawaii.jpg"
python update_metadata.py --add-new "mountain_landscape_colorado.jpg"
# ... repeat 98 more times
```

### **Phase 3: Customization**

#### **Method 1: Edit JSON File Directly (Recommended for bulk)**
Open `catalog_metadata.json` and update the entries:

```json
{
  "metadata": {
    "sunset_beach_hawaii.jpg": {
      "title": "Hawaiian Sunset",
      "artist": "Annette Taberner",
      "description": "A breathtaking sunset over the Pacific Ocean, capturing the warm golden light as it dances across the waves.",
      "price": "12.95",
      "product_url": "https://www.tabernerstudio.com/warehouse-open-edition-prints/art_print_products/hawaiian-sunset"
    },
    "mountain_landscape_colorado.jpg": {
      "title": "Colorado Mountain Peaks",
      "artist": "Annette Taberner", 
      "description": "Majestic snow-capped peaks rise dramatically against a clear blue sky, showcasing the raw beauty of the Rocky Mountains.",
      "price": "12.95",
      "product_url": "https://www.tabernerstudio.com/warehouse-open-edition-prints/art_print_products/colorado-peaks"
    }
  }
}
```

#### **Method 2: Use Helper Script (Good for individual updates)**
```bash
# Update specific images
python update_metadata.py --filename "sunset_beach_hawaii.jpg" \
  --title "Hawaiian Sunset" \
  --description "A breathtaking sunset over the Pacific Ocean..." \
  --url "https://www.tabernerstudio.com/warehouse-open-edition-prints/art_print_products/hawaiian-sunset"
```

### **Phase 4: Final Processing**

```bash
# Regenerate the catalog with all your custom metadata
python process_catalog.py

# Test your application
# Visit http://127.0.0.1:8000 to see your new images
```

## **⚡ Efficiency Tips for 100+ Images**

### **1. Batch Processing**
- Use the bulk script for initial setup
- Edit the JSON file directly for customization
- Use find/replace in your text editor for common patterns

### **2. Template Approach**
Create a template for similar types of artwork:

```json
{
  "template_horse": {
    "artist": "Annette Taberner",
    "description": "The Onaqui wild horses of Utah stand as symbols of freedom, resilience, and the enduring spirit of the American West.",
    "price": "12.95",
    "product_url_base": "https://www.tabernerstudio.com/warehouse-open-edition-prints/art_print_products/"
  },
  "template_landscape": {
    "artist": "Annette Taberner", 
    "description": "A stunning landscape that captures the natural beauty and serenity of the American wilderness.",
    "price": "12.95",
    "product_url_base": "https://www.tabernerstudio.com/warehouse-open-edition-prints/art_print_products/"
  }
}
```

### **3. Spreadsheet Workflow**
1. Create a spreadsheet with columns: Filename, Title, Description, Product URL
2. Fill in your data
3. Export to CSV or copy/paste into JSON format
4. Use find/replace to format as JSON

### **4. Validation**
```bash
# Check that all images have metadata
python update_metadata.py --list | grep "Not set"

# Verify the catalog processes correctly
python process_catalog.py
```

## **🔧 Advanced Workflow**

### **For Very Large Batches (500+ images)**

1. **Use a database or spreadsheet** to manage metadata
2. **Create a script** to generate the JSON from your data source
3. **Use version control** to track changes to metadata
4. **Test in batches** before processing everything

### **Example: Generate JSON from CSV**
```python
import csv
import json

def csv_to_metadata(csv_file, json_file):
    metadata = {"metadata": {}, "defaults": {...}}
    
    with open(csv_file, 'r') as f:
        reader = csv.DictReader(f)
        for row in reader:
            metadata['metadata'][row['filename']] = {
                'title': row['title'],
                'artist': row['artist'],
                'description': row['description'],
                'price': row['price'],
                'product_url': row['product_url']
            }
    
    with open(json_file, 'w') as f:
        json.dump(metadata, f, indent=4)
```

## **✅ Quality Assurance**

### **Before Going Live:**
1. **Check all images load** in your application
2. **Verify descriptions** are appropriate and complete
3. **Test product URLs** to ensure they work
4. **Review pricing** is consistent
5. **Check for typos** in titles and descriptions

### **Common Issues:**
- **Missing metadata**: Use `python update_metadata.py --list` to check
- **Broken URLs**: Test all product URLs manually
- **Inconsistent pricing**: Use find/replace to standardize
- **Duplicate titles**: Review for uniqueness

## **📊 Performance Considerations**

- **Processing 100 images** takes about 2-3 minutes
- **Color analysis** is the most time-consuming part
- **Metadata updates** are instant
- **Catalog regeneration** takes about 30 seconds

This workflow allows you to efficiently manage large batches of images while maintaining quality and consistency! 