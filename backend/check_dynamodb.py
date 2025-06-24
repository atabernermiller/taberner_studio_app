#!/usr/bin/env python3
"""
Simple script to check DynamoDB table contents
"""

import boto3
import os

# Configuration
CATALOG_TABLE_NAME = os.environ.get('CATALOG_TABLE_NAME', 'taberner-studio-catalog')

def check_dynamodb_table():
    """Check the DynamoDB table contents"""
    dynamodb = boto3.resource('dynamodb')
    
    try:
        table = dynamodb.Table(CATALOG_TABLE_NAME)
        
        # Get table count
        response = table.scan(Select='COUNT')
        count = response['Count']
        
        print(f"✅ DynamoDB table '{CATALOG_TABLE_NAME}' contains {count} items")
        
        # Get a few sample items
        response = table.scan(Limit=3)
        items = response['Items']
        
        print(f"\nSample items:")
        for i, item in enumerate(items, 1):
            print(f"  {i}. ID: {item.get('id', 'N/A')}")
            print(f"     Title: {item.get('title', 'N/A')}")
            print(f"     Artist: {item.get('artist', 'N/A')}")
            print()
            
    except Exception as e:
        print(f"❌ Error checking DynamoDB table: {e}")

if __name__ == '__main__':
    check_dynamodb_table() 