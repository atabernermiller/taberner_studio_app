#!/usr/bin/env python3
"""
clear_dynamodb.py

Purpose:
    Clears all items from the DynamoDB catalog table to prepare for a clean migration.

Usage:
    python clear_dynamodb.py
"""

import boto3
import sys
import os
from botocore.exceptions import ClientError

# Add backend directory to path to import config
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))
from config import config

def clear_dynamodb_table():
    """Clear all items from the DynamoDB table."""
    
    dynamodb = boto3.resource('dynamodb', region_name=config.aws_region)
    table = dynamodb.Table(config.catalog_table_name)
    
    print(f"Clearing all items from table: {config.catalog_table_name}")
    
    try:
        # Scan to get all items
        response = table.scan()
        items = response['Items']
        
        # Handle pagination
        while 'LastEvaluatedKey' in response:
            response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            items.extend(response['Items'])
        
        print(f"Found {len(items)} items to delete")
        
        if len(items) == 0:
            print("Table is already empty")
            return
        
        # Delete items in batches
        deleted_count = 0
        
        with table.batch_writer() as batch:
            for item in items:
                batch.delete_item(Key={'id': item['id']})
                deleted_count += 1
                
                if deleted_count % 10 == 0:
                    print(f"Deleted {deleted_count} items...")
        
        print(f"\n✅ Successfully deleted {deleted_count} items from DynamoDB")
        
        # Verify table is empty
        response = table.scan(Select='COUNT')
        remaining_count = response['Count']
        
        if remaining_count == 0:
            print("✅ Table is now empty and ready for clean migration")
        else:
            print(f"⚠️  Warning: {remaining_count} items still remain in table")
            
    except ClientError as e:
        print(f"❌ Error clearing table: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

if __name__ == "__main__":
    print("This will DELETE ALL items from the DynamoDB catalog table.")
    response = input("Are you sure you want to proceed? (yes/no): ")
    
    if response.lower() in ['yes', 'y']:
        clear_dynamodb_table()
    else:
        print("Operation cancelled.") 