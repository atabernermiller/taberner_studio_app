#!/bin/bash

# Taberner Studio App Startup Script
echo "=== Starting Taberner Studio App ==="

# Change to the backend directory
cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Creating one..."
    python3 -m venv venv
    echo "Activating virtual environment..."
    source venv/bin/activate
    echo "Installing requirements..."
    pip install -r requirements_aws.txt
else
    echo "Activating virtual environment..."
    source venv/bin/activate
fi

# Set AWS environment variables
export AWS_REGION=us-east-1
export CATALOG_TABLE_NAME=taberner-studio-catalog
export CATALOG_BUCKET_NAME=taberner-studio-catalog-us-east-1
export APPROVED_BUCKET=taberner-studio-images-us-east-1
export QUARANTINE_BUCKET=taberner-studio-quarantine-us-east-1
export APP_ENV=aws
export MAX_RECOMMENDATIONS=8
export MIN_RECOMMENDATIONS=4

# Optional: Set these for better performance
export KMP_DUPLICATE_LIB_OK=True
export KMP_INIT_AT_FORK=FALSE

echo "Environment variables set:"
echo "  AWS_REGION: $AWS_REGION"
echo "  CATALOG_TABLE_NAME: $CATALOG_TABLE_NAME"
echo "  CATALOG_BUCKET_NAME: $CATALOG_BUCKET_NAME"
echo "  APPROVED_BUCKET: $APPROVED_BUCKET"
echo "  QUARANTINE_BUCKET: $QUARANTINE_BUCKET"

# Check if port 8000 is in use
if lsof -i :8000 >/dev/null 2>&1; then
    echo "Port 8000 is in use. Attempting to free it..."
    # Try to kill processes using port 8000
    lsof -ti :8000 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

echo "Starting Flask application..."
python app_aws.py

echo "Application stopped." 