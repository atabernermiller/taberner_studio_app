#!/usr/bin/env python3
"""
Simple script to verify DynamoDB table contents
"""
import boto3
import json

# Configuration
DYNAMO_TABLE_NAME = 'taberner-studio-catalog'

def verify_dynamodb_table():
    """Verify the DynamoDB table contents"""
    dynamodb = boto3.resource('dynamodb')
    
    try:
        table = dynamodb.Table(DYNAMO_TABLE_NAME)
        
        # Get table count
        response = table.scan(Select='COUNT')
        count = response['Count']
        
        print(f"✅ DynamoDB table '{DYNAMO_TABLE_NAME}' contains {count} items")
        
        # Get a few sample items
        response = table.scan(Limit=3)
        items = response['Items']
        
        print(f"\nSample items:")
        for i, item in enumerate(items, 1):
            print(f"\nItem {i}:")
            print(f"  ID: {item.get('id', 'N/A')}")
            print(f"  Title: {item.get('title', 'N/A')}")
            print(f"  Artist: {item.get('artist', 'N/A')}")
            print(f"  Image: {item.get('image', 'N/A')}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error accessing DynamoDB table: {e}")
        return False

if __name__ == "__main__":
    verify_dynamodb_table() 