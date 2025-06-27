print('Script started')
try:
    import boto3
    print('Imported boto3')
    import json
    print('Imported json')
except Exception as e:
    print(f'Import error: {e}')

# Configuration
DYNAMO_TABLE_NAME = 'taberner-studio-catalog'

print(f"Connecting to DynamoDB and checking table: {DYNAMO_TABLE_NAME}")

def verify_dynamodb_table():
    """Verify the DynamoDB table contents"""
    try:
        dynamodb = boto3.resource('dynamodb')
        print("Connected to boto3 DynamoDB resource.")
        table = dynamodb.Table(DYNAMO_TABLE_NAME)  # type: ignore[attr-defined]
        print("Got table resource.")
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
        import traceback; traceback.print_exc()
        return False

if __name__ == "__main__":
    print('Before verify_dynamodb_table()')
    verify_dynamodb_table()
    print('After verify_dynamodb_table()') 