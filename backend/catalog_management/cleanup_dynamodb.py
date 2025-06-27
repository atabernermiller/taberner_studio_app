#!/usr/bin/env python3
"""
cleanup_dynamodb.py

Purpose:
    Deletes items from DynamoDB that are not present in the local catalog.json.
    Use with caution! This will permanently remove extra items from your DynamoDB table.

Usage:
    python cleanup_dynamodb.py
"""
import os
import json
import boto3
from botocore.exceptions import ClientError

# Configuration
DYNAMODB_TABLE_NAME = os.environ.get('CATALOG_TABLE_NAME', 'taberner-studio-catalog')
CATALOG_JSON_PATH = os.path.join(os.path.dirname(__file__), 'catalog', 'catalog.json')


def load_local_catalog_ids():
    with open(CATALOG_JSON_PATH, 'r') as f:
        catalog = json.load(f)
    return {item['id'] for item in catalog}

def get_dynamodb_ids(table):
    ids = set()
    response = table.scan(ProjectionExpression='id')
    for item in response.get('Items', []):
        ids.add(item['id'])
    # Handle pagination
    while 'LastEvaluatedKey' in response:
        response = table.scan(
            ProjectionExpression='id',
            ExclusiveStartKey=response['LastEvaluatedKey']
        )
        for item in response.get('Items', []):
            ids.add(item['id'])
    return ids

def delete_items_from_dynamodb(table, ids_to_delete):
    if not ids_to_delete:
        print("✅ No extra items to delete from DynamoDB.")
        return
    print(f"⚠️  Deleting {len(ids_to_delete)} items from DynamoDB...")
    for item_id in ids_to_delete:
        try:
            table.delete_item(Key={'id': item_id})
            print(f"  Deleted item: {item_id}")
        except ClientError as e:
            print(f"  Error deleting {item_id}: {e}")
    print("✅ Cleanup complete.")

def main():
    print("Loading local catalog IDs...")
    local_ids = load_local_catalog_ids()
    print(f"  Local catalog items: {len(local_ids)}")

    print("Connecting to DynamoDB...")
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(DYNAMODB_TABLE_NAME)

    print("Fetching DynamoDB IDs...")
    dynamodb_ids = get_dynamodb_ids(table)
    print(f"  DynamoDB items: {len(dynamodb_ids)}")

    ids_to_delete = dynamodb_ids - local_ids
    print(f"  Items to delete: {len(ids_to_delete)}")
    if ids_to_delete:
        confirm = input(f"Are you sure you want to delete {len(ids_to_delete)} items from DynamoDB? (yes/no): ")
        if confirm.lower() == 'yes':
            delete_items_from_dynamodb(table, ids_to_delete)
        else:
            print("Aborted. No items deleted.")
    else:
        print("✅ DynamoDB is already in sync with the local catalog.")

if __name__ == '__main__':
    main() 