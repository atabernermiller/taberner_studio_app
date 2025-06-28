#!/bin/bash

# AWS Setup Verification Script
# This script checks AWS credentials and permissions needed for the application

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check AWS CLI installation
check_aws_cli() {
    print_status "Checking AWS CLI installation..."
    if command -v aws >/dev/null 2>&1; then
        AWS_VERSION=$(aws --version)
        print_success "AWS CLI installed: $AWS_VERSION"
    else
        print_error "AWS CLI not installed. Please install it first."
        exit 1
    fi
}

# Check AWS credentials
check_aws_credentials() {
    print_status "Checking AWS credentials..."
    
    if aws sts get-caller-identity >/dev/null 2>&1; then
        IDENTITY=$(aws sts get-caller-identity --query 'Arn' --output text)
        ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)
        print_success "AWS credentials configured"
        print_status "  Identity: $IDENTITY"
        print_status "  Account ID: $ACCOUNT_ID"
    else
        print_error "AWS credentials not configured or invalid"
        print_status "Please run 'aws configure' to set up your credentials"
        exit 1
    fi
}

# Check AWS region
check_aws_region() {
    print_status "Checking AWS region configuration..."
    
    REGION=$(aws configure get region)
    if [ -n "$REGION" ]; then
        print_success "AWS region configured: $REGION"
    else
        print_warning "AWS region not configured, defaulting to us-east-1"
        export AWS_REGION=us-east-1
    fi
}

# Check DynamoDB table
check_dynamodb_table() {
    print_status "Checking DynamoDB table: taberner-studio-catalog"
    
    if aws dynamodb describe-table --table-name taberner-studio-catalog --region us-east-1 >/dev/null 2>&1; then
        TABLE_STATUS=$(aws dynamodb describe-table --table-name taberner-studio-catalog --region us-east-1 --query 'Table.TableStatus' --output text)
        print_success "DynamoDB table exists with status: $TABLE_STATUS"
    else
        print_error "DynamoDB table 'taberner-studio-catalog' does not exist"
        print_status "You may need to create the table or check permissions"
    fi
}

# Check S3 buckets
check_s3_buckets() {
    print_status "Checking S3 buckets..."
    
    BUCKETS=(
        "taberner-studio-catalog-us-east-1"
        "taberner-studio-images-us-east-1"
        "taberner-studio-quarantine-us-east-1"
    )
    
    for bucket in "${BUCKETS[@]}"; do
        if aws s3 ls "s3://$bucket" --region us-east-1 >/dev/null 2>&1; then
            print_success "S3 bucket exists: $bucket"
        else
            print_error "S3 bucket does not exist: $bucket"
        fi
    done
}

# Check IAM permissions
check_iam_permissions() {
    print_status "Checking IAM permissions..."
    
    # Test DynamoDB permissions
    if aws dynamodb list-tables --region us-east-1 >/dev/null 2>&1; then
        print_success "DynamoDB permissions: OK"
    else
        print_error "DynamoDB permissions: FAILED"
    fi
    
    # Test S3 permissions
    if aws s3 ls --region us-east-1 >/dev/null 2>&1; then
        print_success "S3 permissions: OK"
    else
        print_error "S3 permissions: FAILED"
    fi
    
    # Test Rekognition permissions
    if aws rekognition list-collections --region us-east-1 >/dev/null 2>&1; then
        print_success "Rekognition permissions: OK"
    else
        print_warning "Rekognition permissions: FAILED (this may be expected if no collections exist)"
    fi
}

# Check ECR repository
check_ecr_repository() {
    print_status "Checking ECR repository..."
    
    ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)
    REPOSITORY_URI="$ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/taberner-studio"
    
    if aws ecr describe-repositories --repository-names taberner-studio --region us-east-1 >/dev/null 2>&1; then
        print_success "ECR repository exists: taberner-studio"
    else
        print_warning "ECR repository does not exist: taberner-studio"
        print_status "This will be created during deployment if needed"
    fi
}

# Main execution
main() {
    print_status "=== AWS SETUP VERIFICATION ==="
    
    check_aws_cli
    check_aws_credentials
    check_aws_region
    check_dynamodb_table
    check_s3_buckets
    check_iam_permissions
    check_ecr_repository
    
    print_success "=== AWS SETUP VERIFICATION COMPLETED ==="
    print_status "If you see any errors above, please fix them before running the deployment test"
}

main "$@" 