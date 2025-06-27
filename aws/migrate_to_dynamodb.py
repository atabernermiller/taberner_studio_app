#!/usr/bin/env python3
"""
migrate_to_dynamodb.py

Purpose:
    Migrates your catalog data from catalog.json to a DynamoDB table, creating the table if it doesn't exist.

Key Functions:
    - convert_floats_to_decimals: Recursively converts all float values in the data to Decimal objects (required for DynamoDB compatibility).
    - create_dynamodb_table: Checks if the DynamoDB table exists; if not, creates it with id as the partition key.
    - migrate_catalog_data: Loads catalog.json, prepares each item, and inserts (puts) it into DynamoDB. Prints progress and error counts.
    - verify_migration: Compares the number of items in catalog.json to the number of items in DynamoDB and prints a success or failure message.

Usage:
    Run the script directly (python migrate_to_dynamodb.py). It will migrate all items from catalog.json to DynamoDB (overwriting items with the same ID) and verify the migration.
"""

import json
import boto3
import os
from botocore.exceptions import ClientError
from decimal import Decimal

# Configuration
DYNAMODB_TABLE_NAME = os.environ.get('CATALOG_TABLE_NAME', 'taberner-studio-catalog')
CATALOG_JSON_PATH = os.path.join(os.path.dirname(__file__), 'catalog', 'catalog.json')

def convert_floats_to_decimals(obj):
    """Recursively convert float values to Decimal for DynamoDB compatibility"""
    if isinstance(obj, float):
        return Decimal(str(obj))
    elif isinstance(obj, dict):
        return {key: convert_floats_to_decimals(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_floats_to_decimals(item) for item in obj]
    else:
        return obj

def create_dynamodb_table():
    """Create the DynamoDB table if it doesn't exist"""
    dynamodb = boto3.resource('dynamodb')
    
    try:
        # Check if table exists
        table = dynamodb.Table(DYNAMODB_TABLE_NAME)
        table.load()
        print(f"Table {DYNAMODB_TABLE_NAME} already exists")
        return table
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceNotFoundException':
            # Table doesn't exist, create it
            print(f"Creating table {DYNAMODB_TABLE_NAME}...")
            
            table = dynamodb.create_table(
                TableName=DYNAMODB_TABLE_NAME,
                KeySchema=[
                    {
                        'AttributeName': 'id',
                        'KeyType': 'HASH'  # Partition key
                    }
                ],
                AttributeDefinitions=[
                    {
                        'AttributeName': 'id',
                        'AttributeType': 'S'
                    }
                ],
                BillingMode='PAY_PER_REQUEST',
                Tags=[
                    {
                        'Key': 'Project',
                        'Value': 'Taberner Studio'
                    },
                    {
                        'Key': 'Environment',
                        'Value': 'Production'
                    }
                ]
            )
            
            # Wait for table to be created
            table.meta.client.get_waiter('table_exists').wait(TableName=DYNAMODB_TABLE_NAME)
            print(f"Table {DYNAMODB_TABLE_NAME} created successfully")
            return table
        else:
            raise e

def migrate_catalog_data():
    """Migrate catalog data from JSON to DynamoDB"""
    # Load catalog data
    try:
        with open(CATALOG_JSON_PATH, 'r') as f:
            catalog_data = json.load(f)
        print(f"Loaded {len(catalog_data)} items from catalog.json")
    except FileNotFoundError:
        print(f"Error: {CATALOG_JSON_PATH} not found")
        return
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {CATALOG_JSON_PATH}: {e}")
        return
    
    # Create or get table
    table = create_dynamodb_table()
    
    # Migrate data
    success_count = 0
    error_count = 0
    
    for item in catalog_data:
        try:
            # Prepare item for DynamoDB and convert floats to decimals
            dynamodb_item = convert_floats_to_decimals({
                'id': item['id'],
                'filename': item['filename'],
                'title': item['title'],
                'artist': item['artist'],
                'description': item['description'],
                'price': item['price'],
                'product_url': item['product_url'],
                'attributes': item['attributes']
            })
            
            # Put item in DynamoDB
            table.put_item(Item=dynamodb_item)
            success_count += 1
            
            if success_count % 5 == 0:
                print(f"Migrated {success_count} items...")
                
        except Exception as e:
            print(f"Error migrating item {item.get('id', 'unknown')}: {e}")
            error_count += 1
    
    print(f"\nMigration completed:")
    print(f"  Successfully migrated: {success_count} items")
    print(f"  Errors: {error_count} items")
    print(f"  Total items in catalog: {len(catalog_data)}")

def verify_migration():
    """Verify that all data was migrated correctly"""
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(DYNAMODB_TABLE_NAME)
    
    # Load original data
    with open(CATALOG_JSON_PATH, 'r') as f:
        original_data = json.load(f)
    
    # Count items in DynamoDB
    response = table.scan(Select='COUNT')
    dynamodb_count = response['Count']
    
    print(f"\nVerification:")
    print(f"  Original catalog items: {len(original_data)}")
    print(f"  DynamoDB items: {dynamodb_count}")
    
    if len(original_data) == dynamodb_count:
        print("  ✅ Migration verification successful!")
    else:
        print("  ❌ Migration verification failed!")

if __name__ == '__main__':
    print("Starting catalog migration to DynamoDB...")
    migrate_catalog_data()
    verify_migration() 