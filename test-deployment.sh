#!/bin/bash

# Taberner Studio Local Deployment Test Script
# This script simulates the AWS CodeBuild process locally

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    if ! command_exists docker-compose; then
        print_error "Docker Compose is not installed. Please install it first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        print_error "AWS credentials not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Simulate CodeBuild pre_build phase
pre_build() {
    print_status "=== PRE-BUILD PHASE ==="
    
    # Copy frontend files to backend directory (simulating buildspec.yml)
    print_status "Copying frontend files to backend directory..."
    mkdir -p backend/static
    cp -r frontend/* backend/static/
    
    print_status "Installing Python dependencies..."
    cd backend
    pip install -r requirements_aws.txt
    cd ..
    
    print_success "Pre-build phase completed"
}

# Simulate CodeBuild build phase
build() {
    print_status "=== BUILD PHASE ==="
    
    print_status "Building the Docker image..."
    docker-compose build --no-cache
    
    print_success "Build phase completed"
}

# Test the application
test_application() {
    print_status "=== TESTING APPLICATION ==="
    
    print_status "Starting the application..."
    docker-compose up -d
    
    # Wait for application to start
    print_status "Waiting for application to start..."
    sleep 10
    
    # Test health endpoint
    print_status "Testing health endpoint..."
    if curl -f http://localhost:8000/health; then
        print_success "Health check passed"
    else
        print_error "Health check failed"
        docker-compose logs
        exit 1
    fi
    
    # Test main endpoint
    print_status "Testing main endpoint..."
    if curl -f http://localhost:8000/; then
        print_success "Main endpoint accessible"
    else
        print_error "Main endpoint failed"
        docker-compose logs
        exit 1
    fi
    
    print_success "Application testing completed"
}

# Test AWS connectivity
test_aws_connectivity() {
    print_status "=== TESTING AWS CONNECTIVITY ==="
    
    # Test AWS credentials inside container
    print_status "Testing AWS credentials inside container..."
    if docker-compose exec taberner-studio aws sts get-caller-identity; then
        print_success "AWS credentials working inside container"
    else
        print_error "AWS credentials not working inside container"
        print_warning "Make sure your AWS credentials are properly configured"
        exit 1
    fi
    
    # Test DynamoDB connectivity
    print_status "Testing DynamoDB connectivity..."
    if docker-compose exec taberner-studio aws dynamodb describe-table --table-name taberner-studio-catalog --region us-east-1; then
        print_success "DynamoDB connectivity working"
    else
        print_error "DynamoDB connectivity failed"
        print_warning "Check if the DynamoDB table exists and you have proper permissions"
    fi
    
    # Test S3 connectivity
    print_status "Testing S3 connectivity..."
    if docker-compose exec taberner-studio aws s3 ls s3://taberner-studio-catalog-us-east-1 --region us-east-1; then
        print_success "S3 connectivity working"
    else
        print_error "S3 connectivity failed"
        print_warning "Check if the S3 bucket exists and you have proper permissions"
    fi
}

# Cleanup
cleanup() {
    print_status "=== CLEANUP ==="
    
    print_status "Stopping containers..."
    docker-compose down
    
    print_status "Cleaning up static directory..."
    rm -rf backend/static
    
    print_success "Cleanup completed"
}

# Main execution
main() {
    print_status "Starting Taberner Studio deployment test..."
    
    check_prerequisites
    pre_build
    build
    test_application
    test_aws_connectivity
    
    print_success "=== DEPLOYMENT TEST COMPLETED SUCCESSFULLY ==="
    print_status "The application is running at http://localhost:8000"
    print_status "Press Ctrl+C to stop the application"
    
    # Keep the application running for manual testing
    docker-compose logs -f
}

# Handle cleanup on script exit
trap cleanup EXIT

# Run main function
main "$@" 