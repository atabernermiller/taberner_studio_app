# Taberner Studio Deployment Debugging Guide

This guide helps you debug deployment issues by testing the application locally using Docker, simulating the AWS CodeBuild environment.

## Overview

The deployment process involves:
1. **CodeBuild** - Builds the Docker image and pushes to ECR
2. **ECS Deployment** - Deploys the container to ECS Fargate
3. **Service Rollback** - Occurs if the deployment fails

## Prerequisites

Before running the debugging scripts, ensure you have:

- Docker and Docker Compose installed
- AWS CLI configured with appropriate credentials
- Access to the required AWS resources (DynamoDB, S3, ECR)

## Quick Start

### 1. Check AWS Setup

First, verify your AWS configuration:

```bash
./check-aws-setup.sh
```

This script will check:
- AWS CLI installation
- AWS credentials configuration
- Required AWS resources (DynamoDB table, S3 buckets)
- IAM permissions

### 2. Run Deployment Test

Simulate the AWS CodeBuild process locally:

```bash
./test-deployment.sh
```

This script will:
- Copy frontend files to backend (simulating buildspec.yml)
- Install Python dependencies
- Build the Docker image
- Start the application
- Test endpoints and AWS connectivity

## Understanding the Build Process

### CodeBuild buildspec.yml Steps

The `buildspec.yml` file defines these phases:

1. **pre_build**:
   - Login to ECR
   - Copy frontend files to backend/static
   - Install Python dependencies

2. **build**:
   - Build Docker image with `--no-cache`
   - Tag image for ECR

3. **post_build**:
   - Push image to ECR
   - Create imageDefinitions.json

### Local Docker Setup

The `docker-compose.yml` file:
- Builds from the backend Dockerfile
- Mounts AWS credentials from host
- Uses host networking for AWS service access
- Sets required environment variables

## Common Deployment Issues

### 1. Application Startup Failures

**Symptoms**: Container fails to start or health checks fail

**Debugging**:
```bash
# Check container logs
docker-compose logs taberner-studio

# Check application logs
tail -f app.log

# Test health endpoint manually
curl http://localhost:8000/health
```

**Common Causes**:
- Missing environment variables
- AWS credentials not accessible
- Port conflicts
- Missing dependencies

### 2. AWS Connectivity Issues

**Symptoms**: Application can't access DynamoDB, S3, or other AWS services

**Debugging**:
```bash
# Test AWS credentials inside container
docker-compose exec taberner-studio aws sts get-caller-identity

# Test DynamoDB access
docker-compose exec taberner-studio aws dynamodb describe-table --table-name taberner-studio-catalog --region us-east-1

# Test S3 access
docker-compose exec taberner-studio aws s3 ls s3://taberner-studio-catalog-us-east-1 --region us-east-1
```

**Common Causes**:
- AWS credentials not mounted properly
- IAM permissions insufficient
- Network connectivity issues
- Region configuration mismatch

### 3. Memory Issues

**Symptoms**: Container runs out of memory or crashes

**Debugging**:
```bash
# Check container resource usage
docker stats

# Check application memory usage
docker-compose exec taberner-studio ps aux
```

**Common Causes**:
- Large model loading (transformers, torch)
- Memory leaks in application
- Insufficient container memory limits

### 4. Frontend File Issues

**Symptoms**: Static files not served correctly

**Debugging**:
```bash
# Check if frontend files were copied
ls -la backend/static/

# Test static file serving
curl http://localhost:8000/
```

## Environment Variables

The application requires these environment variables:

```bash
AWS_REGION=us-east-1
CATALOG_BUCKET_NAME=taberner-studio-catalog-us-east-1
CATALOG_TABLE_NAME=taberner-studio-catalog
APPROVED_BUCKET=taberner-studio-images
QUARANTINE_BUCKET=taberner-studio-quarantine
APP_ENV=aws
```

## AWS Resources Required

### DynamoDB
- Table: `taberner-studio-catalog`
- Region: `us-east-1`

### S3 Buckets
- `taberner-studio-catalog-us-east-1` - Catalog data
- `taberner-studio-images` - Approved images
- `taberner-studio-quarantine` - Quarantined images

### ECR
- Repository: `taberner-studio`
- Region: `us-east-1`

### IAM Permissions
The application needs permissions for:
- DynamoDB: Read/Write access to catalog table
- S3: Read/Write access to image buckets
- Rekognition: Content moderation
- CloudWatch: Logging

## Troubleshooting Steps

### Step 1: Verify Local Build
```bash
# Clean previous builds
docker-compose down
docker system prune -f

# Run deployment test
./test-deployment.sh
```

### Step 2: Check Application Logs
```bash
# View real-time logs
docker-compose logs -f taberner-studio

# Check application log file
tail -f app.log
```

### Step 3: Test Individual Components
```bash
# Test health endpoint
curl http://localhost:8000/health

# Test main application
curl http://localhost:8000/

# Test AWS connectivity
docker-compose exec taberner-studio aws sts get-caller-identity
```

### Step 4: Compare with AWS Environment
If local testing works but AWS deployment fails:

1. Check ECS task definition memory/CPU limits
2. Verify ECS service configuration
3. Check CloudWatch logs for ECS tasks
4. Verify load balancer configuration
5. Check security group rules

## Manual Testing

Once the application is running locally, you can test:

1. **Health Check**: `http://localhost:8000/health`
2. **Main Application**: `http://localhost:8000/`
3. **API Endpoints**: 
   - `POST /recommend`
   - `GET /api/preferences-options`
   - `POST /api/generate-mockup`

## Next Steps

If local testing reveals issues:

1. Fix the identified problems
2. Update the application code
3. Test locally again
4. Deploy to AWS
5. Monitor the deployment

If local testing works but AWS deployment still fails:

1. Compare ECS task definition with local Docker setup
2. Check ECS service logs in CloudWatch
3. Verify network and security configurations
4. Test with a minimal deployment first

## Useful Commands

```bash
# Stop all containers
docker-compose down

# Remove all containers and images
docker-compose down --rmi all --volumes --remove-orphans

# View container logs
docker-compose logs taberner-studio

# Execute commands in container
docker-compose exec taberner-studio bash

# Check container status
docker-compose ps

# Rebuild without cache
docker-compose build --no-cache
``` 