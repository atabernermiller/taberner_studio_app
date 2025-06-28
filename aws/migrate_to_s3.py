#!/usr/bin/env python3
"""
Script to migrate catalog images from local directory to S3
"""

import os
import sys
import boto3
import json
from botocore.exceptions import ClientError

# Add backend directory to path to import config
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))
from config import config

# Get configuration
S3_BUCKET_NAME = config.catalog_bucket_name
AWS_REGION = config.aws_region
CATALOG_JSON_PATH = os.path.join(os.path.dirname(__file__), '..', 'backend', 'catalog', 'catalog.json')
IMAGES_DIR = os.path.join(os.path.dirname(__file__), '..', 'backend', 'catalog', 'images')

def create_s3_bucket():
    """Create the S3 bucket if it doesn't exist"""
    s3 = boto3.client('s3', region_name=AWS_REGION)
    
    try:
        # Check if bucket exists
        s3.head_bucket(Bucket=S3_BUCKET_NAME)
        print(f"Bucket {S3_BUCKET_NAME} already exists in {AWS_REGION}")
        return True
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == '404':
            # Bucket doesn't exist, create it
            print(f"Creating bucket {S3_BUCKET_NAME} in {AWS_REGION}...")
            try:
                # For us-east-1, we don't need LocationConstraint
                if AWS_REGION == 'us-east-1':
                    s3.create_bucket(Bucket=S3_BUCKET_NAME)
                else:
                    s3.create_bucket(
                        Bucket=S3_BUCKET_NAME,
                        CreateBucketConfiguration={
                            'LocationConstraint': AWS_REGION
                        }
                    )
                print(f"Bucket {S3_BUCKET_NAME} created successfully in {AWS_REGION}")
                return True
            except Exception as create_error:
                print(f"Error creating bucket: {create_error}")
                return False
        else:
            print(f"Error checking bucket: {e}")
            return False

def upload_image_to_s3(image_path, s3_key):
    """Upload a single image to S3"""
    s3 = boto3.client('s3', region_name=AWS_REGION)
    
    try:
        # Check if file already exists in S3
        try:
            s3.head_object(Bucket=S3_BUCKET_NAME, Key=s3_key)
            print(f"  Image {s3_key} already exists in S3, skipping...")
            return True
        except ClientError as e:
            if e.response['Error']['Code'] != '404':
                raise e
        
        # Upload file
        s3.upload_file(
            image_path,
            S3_BUCKET_NAME,
            s3_key,
            ExtraArgs={
                'ContentType': 'image/jpeg',
                'CacheControl': 'public, max-age=31536000'  # 1 year cache
            }
        )
        print(f"  Uploaded {s3_key}")
        return True
        
    except Exception as e:
        print(f"  Error uploading {s3_key}: {e}")
        return False

def migrate_images_to_s3():
    """Migrate all catalog images to S3"""
    print(f"Using AWS Region: {AWS_REGION}")
    print(f"Using S3 Bucket: {S3_BUCKET_NAME}")
    print(f"Catalog JSON path: {CATALOG_JSON_PATH}")
    print(f"Images directory: {IMAGES_DIR}")
    
    # Load catalog data to get filenames
    try:
        with open(CATALOG_JSON_PATH, 'r') as f:
            catalog_data = json.load(f)
        print(f"Loaded catalog with {len(catalog_data)} items")
    except FileNotFoundError:
        print(f"Error: {CATALOG_JSON_PATH} not found")
        return
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {CATALOG_JSON_PATH}: {e}")
        return
    
    # Create bucket if needed
    if not create_s3_bucket():
        print("Failed to create S3 bucket. Exiting.")
        return
    
    # Get list of image files from catalog
    catalog_filenames = {item['filename'] for item in catalog_data}
    
    # Upload images
    success_count = 0
    error_count = 0
    
    for filename in catalog_filenames:
        image_path = os.path.join(IMAGES_DIR, filename)
        
        if os.path.exists(image_path):
            if upload_image_to_s3(image_path, filename):
                success_count += 1
            else:
                error_count += 1
        else:
            print(f"  Warning: Image file {filename} not found in {IMAGES_DIR}")
            error_count += 1
    
    print(f"\nImage migration completed:")
    print(f"  Successfully uploaded: {success_count} images")
    print(f"  Errors: {error_count} images")
    print(f"  Total catalog images: {len(catalog_filenames)}")

def verify_s3_migration():
    """Verify that all images were uploaded to S3"""
    s3 = boto3.client('s3', region_name=AWS_REGION)
    
    # Load catalog data
    with open(CATALOG_JSON_PATH, 'r') as f:
        catalog_data = json.load(f)
    
    catalog_filenames = {item['filename'] for item in catalog_data}
    
    # List objects in S3 bucket
    try:
        response = s3.list_objects_v2(Bucket=S3_BUCKET_NAME)
        s3_files = {obj['Key'] for obj in response.get('Contents', [])}
    except Exception as e:
        print(f"Error listing S3 objects: {e}")
        return
    
    print(f"\nS3 Migration Verification:")
    print(f"  Catalog images: {len(catalog_filenames)}")
    print(f"  S3 images: {len(s3_files)}")
    
    missing_files = catalog_filenames - s3_files
    if missing_files:
        print(f"  Missing files: {missing_files}")
        print("  ❌ S3 migration verification failed!")
    else:
        print("  ✅ S3 migration verification successful!")

if __name__ == '__main__':
    print("Starting image migration to S3...")
    migrate_images_to_s3()
    verify_s3_migration() 