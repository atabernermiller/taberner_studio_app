# Taberner Studio App - Troubleshooting Guide

## Quick Start

### Option 1: Use the Startup Script (Recommended)
```bash
./start_app.sh
```

### Option 2: Manual Start
```bash
cd backend
source venv/bin/activate
export AWS_REGION=us-east-1
export CATALOG_BUCKET_NAME=taberner-studio-catalog-us-east-1
export APPROVED_BUCKET=taberner-studio-images-us-east-1
export QUARANTINE_BUCKET=taberner-studio-quarantine-us-east-1
python app_aws.py
```

## Common Issues & Solutions

### 1. Decimal Arithmetic Error
**Error:** `unsupported operand type(s) for -: 'float' and 'decimal.Decimal'`

**Solution:** ✅ **FIXED** - Updated the `calculate_color_similarity_score` function to properly handle Decimal types from DynamoDB.

### 2. Port 8000 Already in Use
**Error:** `Address already in use` or `Port 8000 is in use`

**Solutions:**
```bash
# Find and kill processes using port 8000
lsof -ti :8000 | xargs kill -9

# Or use a different port
export PORT=8001
python app_aws.py
```

### 3. Virtual Environment Issues
**Error:** `source: no such file or directory: venv/bin/activate`

**Solutions:**
```bash
# Create virtual environment if it doesn't exist
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements_aws.txt
```

### 4. Watchdog Import Error (Debug Mode)
**Error:** `ImportError: cannot import name 'EVENT_TYPE_OPENED' from 'watchdog.events'`

**Solution:** ✅ **FIXED** - Debug mode is now disabled by default to avoid this issue.

### 5. Missing Environment Variables
**Error:** Application fails to start or AWS errors

**Solution:** Use the startup script or set these manually:
```bash
export AWS_REGION=us-east-1
export CATALOG_TABLE_NAME=taberner-studio-catalog
export CATALOG_BUCKET_NAME=taberner-studio-catalog-us-east-1
export APPROVED_BUCKET=taberner-studio-images-us-east-1
export QUARANTINE_BUCKET=taberner-studio-quarantine-us-east-1
```

## Testing the Application

### 1. Check if Backend is Running
```bash
curl http://localhost:8000/health
```

### 2. Use Preview Mode
Open `preview.html` in your browser to see the application in an iframe with status monitoring.

### 3. Test Room Analysis
1. Open the application
2. Upload a room image
3. Check the logs for contextual analysis:
   - Room type detection (bedroom, living room, etc.)
   - Architectural style (contemporary, traditional, etc.)
   - Color analysis (warm/cool, muted/vibrant)
   - Contextual art recommendations

## Application Features

### Enhanced Room Analysis
- **Room Type Detection**: Bedroom, living room, kitchen, etc.
- **Architectural Style**: Contemporary, traditional, modern, etc.
- **Color Analysis**: Temperature (warm/cool) and saturation (muted/vibrant)
- **Lighting Analysis**: Bright, medium, dark
- **Texture Complexity**: Simple, moderate, complex

### Contextual Recommendations
- **Style Matching**: Art styles that complement room aesthetics
- **Subject Compatibility**: Appropriate subjects for room function
- **Mood Alignment**: Art mood matching room characteristics
- **Size Recommendations**: Appropriate artwork sizes for space

## Logs and Debugging

### Key Log Messages to Look For
- `Room analysis complete: {...}` - Shows detected room characteristics
- `Art recommendations: {...}` - Shows recommended art styles and subjects
- `Contextual filtering - Preferred subjects: [...]` - Shows filtering criteria
- `Top match - Color score: X, Context bonus: Y` - Shows scoring details

### Common Log Errors
- `Error in contextual recommendations: ...` - Check Decimal handling
- `DynamoDB catalog is empty` - Falls back to local catalog
- `Error loading catalog from DynamoDB` - Check AWS credentials

## Performance Optimizations

### Memory Usage
- Application monitors memory usage at startup and shutdown
- Caches catalog data for 5 minutes to reduce DynamoDB calls
- Images are resized for efficient processing

### AWS Optimizations
- Uses us-east-1 region for better performance
- Implements caching for catalog, URLs, and moderation results
- Efficient DynamoDB scanning with projection expressions

## Need Help?

1. Check the application logs in `backend/app.log`
2. Verify AWS credentials are configured
3. Ensure all environment variables are set
4. Test the health endpoint: `http://localhost:8000/health`
5. Use preview.html to monitor application status 