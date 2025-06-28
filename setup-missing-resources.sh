#!/bin/bash

# Setup Missing AWS Resources Script
# This script creates missing AWS resources that could cause deployment failures

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create missing S3 buckets
create_s3_buckets() {
    print_status "Creating missing S3 buckets..."
    
    BUCKETS=(
        "taberner-studio-images-us-east-1"
        "taberner-studio-quarantine-us-east-1"
    )
    
    for bucket in "${BUCKETS[@]}"; do
        print_status "Creating bucket: $bucket"
        
        # Create bucket with versioning enabled
        aws s3 mb "s3://$bucket" --region us-east-1
        
        # Enable versioning
        aws s3api put-bucket-versioning \
            --bucket "$bucket" \
            --versioning-configuration Status=Enabled \
            --region us-east-1
        
        # Set up CORS configuration
        cat > /tmp/cors-config.json << EOF
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
            "AllowedOrigins": ["*"],
            "ExposeHeaders": ["ETag"]
        }
    ]
}
EOF
        
        aws s3api put-bucket-cors \
            --bucket "$bucket" \
            --cors-configuration file:///tmp/cors-config.json \
            --region us-east-1
        
        print_success "Bucket created: $bucket"
    done
    
    # Clean up temporary files
    rm -f /tmp/cors-config.json
}

# Verify bucket creation
verify_buckets() {
    print_status "Verifying bucket creation..."
    
    BUCKETS=(
        "taberner-studio-catalog-us-east-1"
        "taberner-studio-images-us-east-1"
        "taberner-studio-quarantine-us-east-1"
    )
    
    for bucket in "${BUCKETS[@]}"; do
        if aws s3 ls "s3://$bucket" --region us-east-1 >/dev/null 2>&1; then
            print_success "Bucket verified: $bucket"
        else
            print_error "Bucket verification failed: $bucket"
        fi
    done
}

# Main execution
main() {
    print_status "=== SETTING UP MISSING AWS RESOURCES ==="
    
    create_s3_buckets
    verify_buckets
    
    print_success "=== AWS RESOURCES SETUP COMPLETED ==="
    print_status "You can now run ./test-deployment.sh to test the deployment"
}

main "$@" 