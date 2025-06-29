#!/usr/bin/env python3
"""
Migration script to populate DynamoDB with catalog data
"""

import json
import sys
import os
from decimal import Decimal

# Add the backend directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def convert_floats(obj):
    """Convert floats to Decimal for DynamoDB compatibility"""
    if isinstance(obj, list):
        return [convert_floats(v) for v in obj]
    elif isinstance(obj, dict):
        return {k: convert_floats(v) for k, v in obj.items()}
    elif isinstance(obj, float):
        return Decimal(str(obj))
    else:
        return obj

def main():
    try:
        # Import after adding to path
        from backend.app_aws import catalog_table, logger
        
        # Load local catalog
        catalog_path = 'backend/catalog/catalog.json'
        with open(catalog_path, 'r') as f:
            catalog = json.load(f)
        
        print(f'Loading {len(catalog)} items to DynamoDB...')
        
        success_count = 0
        error_count = 0
        
        # Upload each item
        for item in catalog:
            try:
                converted_item = convert_floats(item)
                catalog_table.put_item(Item=converted_item)
                print(f'✓ Uploaded: {item["title"]}')
                success_count += 1
            except Exception as e:
                print(f'✗ Failed to upload {item["title"]}: {e}')
                error_count += 1
        
        print(f'\nMigration complete!')
        print(f'Success: {success_count} items')
        print(f'Errors: {error_count} items')
        
        if error_count == 0:
            print('🎉 All items successfully migrated to DynamoDB!')
        else:
            print(f'⚠️  {error_count} items failed to migrate')
            
    except Exception as e:
        print(f'Migration failed: {e}')
        sys.exit(1)

if __name__ == '__main__':
    main() 