#!/usr/bin/env python3
"""
Script to set up AWS infrastructure for Taberner Studio app
"""

import boto3
import json
import os
from botocore.exceptions import ClientError

# Configuration
REGION = os.environ.get('AWS_REGION', 'us-west-2')
CATALOG_TABLE_NAME = os.environ.get('CATALOG_TABLE_NAME', 'taberner-studio-catalog')
CATALOG_BUCKET_NAME = os.environ.get('CATALOG_BUCKET_NAME', 'taberner-studio-catalog-images')
APPROVED_BUCKET = os.environ.get('APPROVED_BUCKET', 'taberner-studio-images')
QUARANTINE_BUCKET = os.environ.get('QUARANTINE_BUCKET', 'taberner-studio-quarantine')

def create_dynamodb_table():
    """Create DynamoDB table for catalog data"""
    dynamodb = boto3.resource('dynamodb', region_name=REGION)
    
    try:
        # Check if table exists
        table = dynamodb.Table(CATALOG_TABLE_NAME)
        table.load()
        print(f"✅ DynamoDB table {CATALOG_TABLE_NAME} already exists")
        return True
    except ClientError as e:
        if e.response['Error']['Code'] == 'ResourceNotFoundException':
            # Table doesn't exist, create it
            print(f"Creating DynamoDB table {CATALOG_TABLE_NAME}...")
            
            table = dynamodb.create_table(
                TableName=CATALOG_TABLE_NAME,
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
            table.meta.client.get_waiter('table_exists').wait(TableName=CATALOG_TABLE_NAME)
            print(f"✅ DynamoDB table {CATALOG_TABLE_NAME} created successfully")
            return True
        else:
            print(f"❌ Error creating DynamoDB table: {e}")
            return False

def create_s3_bucket(bucket_name, public_read=False):
    """Create S3 bucket with optional public read access"""
    s3 = boto3.client('s3', region_name=REGION)
    
    try:
        # Check if bucket exists
        s3.head_bucket(Bucket=bucket_name)
        print(f"✅ S3 bucket {bucket_name} already exists")
        return True
    except ClientError as e:
        error_code = e.response['Error']['Code']
        if error_code == '404':
            # Bucket doesn't exist, create it
            print(f"Creating S3 bucket {bucket_name}...")
            try:
                s3.create_bucket(
                    Bucket=bucket_name,
                    CreateBucketConfiguration={
                        'LocationConstraint': REGION
                    }
                )
                
                # Configure bucket for public read access if requested
                if public_read:
                    # Disable public access block settings first
                    s3.put_public_access_block(
                        Bucket=bucket_name,
                        PublicAccessBlockConfiguration={
                            'BlockPublicAcls': False,
                            'IgnorePublicAcls': False,
                            'BlockPublicPolicy': False,
                            'RestrictPublicBuckets': False
                        }
                    )
                    
                    bucket_policy = {
                        "Version": "2012-10-17",
                        "Statement": [
                            {
                                "Sid": "PublicReadGetObject",
                                "Effect": "Allow",
                                "Principal": "*",
                                "Action": "s3:GetObject",
                                "Resource": f"arn:aws:s3:::{bucket_name}/*"
                            }
                        ]
                    }
                    
                    s3.put_bucket_policy(
                        Bucket=bucket_name,
                        Policy=json.dumps(bucket_policy)
                    )
                    
                    # Configure CORS for web access
                    cors_configuration = {
                        'CORSRules': [{
                            'AllowedHeaders': ['*'],
                            'AllowedMethods': ['GET', 'HEAD'],
                            'AllowedOrigins': ['*'],
                            'ExposeHeaders': []
                        }]
                    }
                    
                    s3.put_bucket_cors(
                        Bucket=bucket_name,
                        CORSConfiguration=cors_configuration
                    )
                
                print(f"✅ S3 bucket {bucket_name} created successfully")
                return True
            except Exception as create_error:
                print(f"❌ Error creating S3 bucket {bucket_name}: {create_error}")
                return False
        else:
            print(f"❌ Error checking S3 bucket {bucket_name}: {e}")
            return False

def create_iam_role():
    """Create IAM role for the application"""
    iam = boto3.client('iam')
    role_name = 'TabernerStudioAppRole'
    
    try:
        # Check if role exists
        iam.get_role(RoleName=role_name)
        print(f"✅ IAM role {role_name} already exists")
        return role_name
    except ClientError as e:
        if e.response['Error']['Code'] == 'NoSuchEntity':
            # Role doesn't exist, create it
            print(f"Creating IAM role {role_name}...")
            
            # Trust policy for EC2
            trust_policy = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {
                            "Service": "ec2.amazonaws.com"
                        },
                        "Action": "sts:AssumeRole"
                    }
                ]
            }
            
            # Create role
            iam.create_role(
                RoleName=role_name,
                AssumeRolePolicyDocument=json.dumps(trust_policy),
                Description='Role for Taberner Studio application'
            )
            
            # Create policy for required permissions
            policy_name = 'TabernerStudioAppPolicy'
            policy_document = {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Action": [
                            "dynamodb:GetItem",
                            "dynamodb:PutItem",
                            "dynamodb:UpdateItem",
                            "dynamodb:DeleteItem",
                            "dynamodb:Scan",
                            "dynamodb:Query"
                        ],
                        "Resource": f"arn:aws:dynamodb:{REGION}:*:table/{CATALOG_TABLE_NAME}"
                    },
                    {
                        "Effect": "Allow",
                        "Action": [
                            "s3:GetObject",
                            "s3:PutObject",
                            "s3:DeleteObject",
                            "s3:ListBucket"
                        ],
                        "Resource": [
                            f"arn:aws:s3:::{CATALOG_BUCKET_NAME}",
                            f"arn:aws:s3:::{CATALOG_BUCKET_NAME}/*",
                            f"arn:aws:s3:::{APPROVED_BUCKET}",
                            f"arn:aws:s3:::{APPROVED_BUCKET}/*",
                            f"arn:aws:s3:::{QUARANTINE_BUCKET}",
                            f"arn:aws:s3:::{QUARANTINE_BUCKET}/*"
                        ]
                    },
                    {
                        "Effect": "Allow",
                        "Action": [
                            "rekognition:DetectModerationLabels"
                        ],
                        "Resource": "*"
                    }
                ]
            }
            
            # Create policy
            policy_response = iam.create_policy(
                PolicyName=policy_name,
                PolicyDocument=json.dumps(policy_document),
                Description='Policy for Taberner Studio application'
            )
            
            # Attach policy to role
            iam.attach_role_policy(
                RoleName=role_name,
                PolicyArn=policy_response['Policy']['Arn']
            )
            
            print(f"✅ IAM role {role_name} created successfully")
            return role_name
        else:
            print(f"❌ Error creating IAM role: {e}")
            return None

def setup_aws_infrastructure():
    """Set up all AWS infrastructure"""
    print("🚀 Setting up AWS infrastructure for Taberner Studio...")
    print(f"Region: {REGION}")
    print()
    
    success = True
    
    # Create DynamoDB table
    if not create_dynamodb_table():
        success = False
    
    # Create S3 buckets
    if not create_s3_bucket(CATALOG_BUCKET_NAME, public_read=True):
        success = False
    
    if not create_s3_bucket(APPROVED_BUCKET):
        success = False
    
    if not create_s3_bucket(QUARANTINE_BUCKET):
        success = False
    
    # Create IAM role
    role_name = create_iam_role()
    if not role_name:
        success = False
    
    print()
    if success:
        print("✅ AWS infrastructure setup completed successfully!")
        print()
        print("📋 Next steps:")
        print("1. Run migrate_to_dynamodb.py to populate the catalog table")
        print("2. Run migrate_to_s3.py to upload catalog images")
        print("3. Deploy your application with the following environment variables:")
        print(f"   - CATALOG_TABLE_NAME={CATALOG_TABLE_NAME}")
        print(f"   - CATALOG_BUCKET_NAME={CATALOG_BUCKET_NAME}")
        print(f"   - APPROVED_BUCKET={APPROVED_BUCKET}")
        print(f"   - QUARANTINE_BUCKET={QUARANTINE_BUCKET}")
        print(f"   - APP_ENV=aws")
        print(f"   - AWS_REGION={REGION}")
        if role_name:
            print(f"   - IAM_ROLE_ARN=arn:aws:iam::*:role/{role_name}")
    else:
        print("❌ AWS infrastructure setup failed!")
    
    return success

if __name__ == '__main__':
    setup_aws_infrastructure() 