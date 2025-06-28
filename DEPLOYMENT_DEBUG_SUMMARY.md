# Taberner Studio Deployment Debug Summary

## Problem Statement
The project builds successfully in AWS CodeBuild, but deployment fails and triggers a rollback. We need to debug this locally using Docker to simulate the AWS environment.

## Root Cause Analysis

Based on the initial investigation, I've identified several potential issues:

### 1. Missing AWS Resources
- **Issue**: Two S3 buckets are missing: `taberner-studio-images` and `taberner-studio-quarantine`
- **Impact**: Application startup failures when trying to access these buckets
- **Solution**: Created `setup-missing-resources.sh` to create the missing buckets

### 2. Docker Configuration Issues
- **Issue**: Dockerfile had potential health check issues and missing AWS CLI
- **Impact**: Container health checks could fail, causing ECS to rollback
- **Solution**: Updated Dockerfile to include AWS CLI and fix health check

### 3. AWS Credentials Access
- **Issue**: Container might not have proper access to AWS credentials
- **Impact**: Application can't access DynamoDB, S3, or other AWS services
- **Solution**: Docker Compose mounts AWS credentials from host

## Debugging Setup Created

### 1. Docker Environment
- **`docker-compose.yml`**: Simulates the AWS environment locally
- **Updated `Dockerfile`**: Includes AWS CLI and fixes health check issues
- **Environment variables**: Matches AWS configuration

### 2. Testing Scripts
- **`check-aws-setup.sh`**: Verifies AWS credentials and resources
- **`setup-missing-resources.sh`**: Creates missing S3 buckets
- **`quick-docker-test.sh`**: Quick test of Docker setup
- **`test-deployment.sh`**: Full deployment simulation

### 3. Documentation
- **`DEBUG_DEPLOYMENT.md`**: Comprehensive debugging guide
- **`DEPLOYMENT_DEBUG_SUMMARY.md`**: This summary document

## Step-by-Step Debugging Process

### Step 1: Verify AWS Setup
```bash
./check-aws-setup.sh
```

**Expected Output**: All checks should pass except for the missing S3 buckets.

### Step 2: Create Missing Resources
```bash
./setup-missing-resources.sh
```

**Expected Output**: Missing S3 buckets should be created successfully.

### Step 3: Quick Docker Test
```bash
./quick-docker-test.sh
```

**Expected Output**: Docker build and container startup should succeed.

### Step 4: Full Deployment Test
```bash
./test-deployment.sh
```

**Expected Output**: Complete simulation of the AWS deployment process.

## Key Differences Between Local and AWS Environment

### Local Environment
- Uses Docker Compose for orchestration
- Mounts AWS credentials from host
- Uses host networking
- Direct access to AWS services

### AWS Environment
- Uses ECS Fargate for orchestration
- Uses IAM roles for AWS access
- Uses VPC networking
- May have different resource limits

## Common Deployment Failure Points

### 1. Application Startup Failures
- **Symptoms**: Container fails to start or health checks fail
- **Debugging**: Check container logs and application logs
- **Common Causes**: Missing environment variables, AWS connectivity issues

### 2. AWS Service Access Issues
- **Symptoms**: Application can't access DynamoDB, S3, or Rekognition
- **Debugging**: Test AWS credentials and permissions inside container
- **Common Causes**: IAM role permissions, network configuration

### 3. Memory/Resource Issues
- **Symptoms**: Container runs out of memory or crashes
- **Debugging**: Monitor container resource usage
- **Common Causes**: Large model loading, insufficient memory limits

### 4. Health Check Failures
- **Symptoms**: ECS marks container as unhealthy
- **Debugging**: Test health endpoint manually
- **Common Causes**: Application not ready, incorrect health check configuration

## Next Steps

### If Local Testing Reveals Issues:
1. Fix the identified problems in the code
2. Update the application configuration
3. Test locally again
4. Deploy to AWS
5. Monitor the deployment

### If Local Testing Works but AWS Still Fails:
1. Compare ECS task definition with local Docker setup
2. Check ECS service logs in CloudWatch
3. Verify network and security group configurations
4. Test with minimal deployment first

## Monitoring and Logging

### Local Monitoring
- **Container logs**: `docker-compose logs -f`
- **Application logs**: `tail -f app.log`
- **Resource usage**: `docker stats`

### AWS Monitoring
- **ECS service logs**: CloudWatch Logs
- **ECS task logs**: CloudWatch Logs
- **Application metrics**: CloudWatch Metrics

## Troubleshooting Commands

### Local Commands
```bash
# Check container status
docker-compose ps

# View container logs
docker-compose logs taberner-studio

# Execute commands in container
docker-compose exec taberner-studio bash

# Test health endpoint
curl http://localhost:8000/health

# Test AWS connectivity
docker-compose exec taberner-studio aws sts get-caller-identity
```

### AWS Commands
```bash
# Check ECS service status
aws ecs describe-services --cluster taberner-studio-cluster --services taberner-studio-service

# Check ECS task logs
aws logs describe-log-streams --log-group-name /ecs/taberner-studio

# Check ECR repository
aws ecr describe-repositories --repository-names taberner-studio
```

## Expected Outcomes

After running through this debugging process, you should be able to:

1. **Identify the root cause** of the deployment failures
2. **Test fixes locally** before deploying to AWS
3. **Verify AWS connectivity** and permissions
4. **Monitor the application** effectively
5. **Deploy successfully** to AWS ECS

## Files Created/Modified

### New Files
- `docker-compose.yml` - Docker environment setup
- `check-aws-setup.sh` - AWS verification script
- `setup-missing-resources.sh` - AWS resource creation
- `quick-docker-test.sh` - Quick Docker test
- `test-deployment.sh` - Full deployment simulation
- `DEBUG_DEPLOYMENT.md` - Comprehensive debugging guide
- `DEPLOYMENT_DEBUG_SUMMARY.md` - This summary

### Modified Files
- `backend/Dockerfile` - Added AWS CLI and fixed health check

## Conclusion

This debugging setup provides a comprehensive way to test the deployment process locally before deploying to AWS. By identifying and fixing issues locally, you can avoid the deployment failures and rollbacks that are currently occurring.

The key is to run through the debugging process systematically, starting with the AWS setup verification and working through to the full deployment test. This will help identify exactly where the deployment is failing and allow you to fix the issues before deploying to AWS. 