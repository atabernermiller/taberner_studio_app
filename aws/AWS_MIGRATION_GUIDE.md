# AWS Migration Guide for Taberner Studio

This guide will help you migrate your Taberner Studio app from local development to AWS cloud infrastructure.

## Overview

The migration involves:
1. **DynamoDB** - Store catalog data instead of JSON files
2. **S3** - Store catalog images instead of local files
3. **AWS Rekognition** - Image moderation
4. **IAM** - Security and permissions
5. **Containerization** - Docker deployment

## Prerequisites

- AWS CLI configured with appropriate permissions
- Python 3.9+ installed
- Docker installed (for containerized deployment)

## Step 1: Set Up AWS Infrastructure

### 1.1 Configure AWS CLI
```bash
aws configure
```

### 1.2 Run Infrastructure Setup
```bash
cd backend
python setup_aws_infrastructure.py
```

This will create:
- DynamoDB table: `taberner-studio-catalog`
- S3 buckets: 
  - `taberner-studio-catalog-images` (public read)
  - `taberner-studio-images` (private)
  - `taberner-studio-quarantine` (private)
- IAM role: `TabernerStudioAppRole`

## Step 2: Migrate Data

### 2.1 Migrate Catalog to DynamoDB
```bash
cd backend
python migrate_to_dynamodb.py
```

### 2.2 Migrate Images to S3
```bash
cd backend
python migrate_to_s3.py
```

## Step 3: Update Application

### 3.1 Environment Variables
Set these environment variables for your AWS deployment:

```bash
# AWS Configuration
APP_ENV=aws
AWS_REGION=us-east-1

# DynamoDB
CATALOG_TABLE_NAME=taberner-studio-catalog

# S3 Buckets
CATALOG_BUCKET_NAME=taberner-studio-catalog-images
APPROVED_BUCKET=taberner-studio-images
QUARANTINE_BUCKET=taberner-studio-quarantine

# IAM Role (if using EC2)
IAM_ROLE_ARN=arn:aws:iam::YOUR_ACCOUNT:role/TabernerStudioAppRole
```

### 3.2 Use AWS Version of App
The AWS-enabled version is in `backend/app_aws.py`. This version:
- Loads catalog from DynamoDB instead of JSON
- Serves images from S3 with presigned URLs
- Uses AWS Rekognition for image moderation
- Includes proper error handling and logging

## Step 4: Deploy to AWS

### Option A: Docker Deployment (Recommended)

#### 4.1 Build Docker Image
```bash
cd backend
docker build -t taberner-studio-app .
```

#### 4.2 Deploy to ECS/EKS
```bash
# Tag and push to ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com
docker tag taberner-studio-app:latest YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/taberner-studio-app:latest
docker push YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/taberner-studio-app:latest
```

#### 4.3 ECS Task Definition
```json
{
  "family": "taberner-studio-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::YOUR_ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::YOUR_ACCOUNT:role/TabernerStudioAppRole",
  "containerDefinitions": [
    {
      "name": "taberner-studio-app",
      "image": "YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/taberner-studio-app:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "APP_ENV",
          "value": "aws"
        },
        {
          "name": "CATALOG_TABLE_NAME",
          "value": "taberner-studio-catalog"
        },
        {
          "name": "CATALOG_BUCKET_NAME",
          "value": "taberner-studio-catalog-images"
        },
        {
          "name": "APPROVED_BUCKET",
          "value": "taberner-studio-images"
        },
        {
          "name": "QUARANTINE_BUCKET",
          "value": "taberner-studio-quarantine"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/taberner-studio-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Option B: Elastic Beanstalk

#### 4.1 Create Application
```bash
eb init taberner-studio-app --platform python-3.9 --region us-east-1
```

#### 4.2 Create Environment
```bash
eb create taberner-studio-prod --instance-type t3.small --envvars APP_ENV=aws,CATALOG_TABLE_NAME=taberner-studio-catalog
```

#### 4.3 Deploy
```bash
eb deploy
```

## Step 5: Configure Frontend

The frontend has been updated to handle S3 image URLs. The `getImageUrl()` function will:
1. Try to get a presigned URL from the backend
2. Fall back to local paths if S3 fails
3. Handle loading states and errors gracefully

## Step 6: Testing

### 6.1 Test Local AWS Mode
```bash
cd backend
export APP_ENV=aws
export CATALOG_TABLE_NAME=taberner-studio-catalog
export CATALOG_BUCKET_NAME=taberner-studio-catalog-images
python app_aws.py
```

### 6.2 Test Deployed Application
1. Upload a room photo
2. Check that recommendations load from DynamoDB
3. Verify images load from S3
4. Test image moderation with Rekognition

## Step 7: Monitoring and Maintenance

### 7.1 CloudWatch Logs
Monitor application logs in CloudWatch:
- ECS: `/ecs/taberner-studio-app`
- Elastic Beanstalk: `/aws/elasticbeanstalk/your-app-name`

### 7.2 Metrics to Monitor
- DynamoDB read/write capacity
- S3 request counts and errors
- Rekognition API calls
- Application response times

### 7.3 Cost Optimization
- Use DynamoDB on-demand billing for low traffic
- Set up S3 lifecycle policies for old images
- Monitor Rekognition usage costs

## Troubleshooting

### Common Issues

1. **DynamoDB Connection Errors**
   - Check IAM permissions
   - Verify table name and region
   - Ensure credentials are configured

2. **S3 Image Loading Issues**
   - Check bucket permissions
   - Verify CORS configuration
   - Check presigned URL expiration

3. **Rekognition Errors**
   - Verify IAM permissions include Rekognition
   - Check image format and size limits
   - Monitor API quotas

### Debug Commands

```bash
# Check DynamoDB table
aws dynamodb scan --table-name taberner-studio-catalog --limit 5

# List S3 objects
aws s3 ls s3://taberner-studio-catalog-images/

# Test Rekognition
aws rekognition detect-moderation-labels --image S3Object={Bucket=your-bucket,Name=test-image.jpg}
```

## Security Considerations

1. **IAM Roles**: Use least privilege principle
2. **S3 Buckets**: Only catalog bucket should be public
3. **DynamoDB**: Enable encryption at rest
4. **VPC**: Consider running in private subnets
5. **HTTPS**: Always use HTTPS in production

## Backup and Recovery

1. **DynamoDB**: Enable point-in-time recovery
2. **S3**: Enable versioning for important buckets
3. **Application**: Use blue-green deployments
4. **Data**: Regular exports of catalog data

## Performance Optimization

1. **DynamoDB**: Use appropriate read/write capacity
2. **S3**: Use CloudFront for image delivery
3. **Application**: Implement caching where appropriate
4. **Images**: Optimize image sizes and formats

## Support

For issues with this migration:
1. Check AWS documentation
2. Review CloudWatch logs
3. Test with AWS CLI commands
4. Consider AWS support if needed 