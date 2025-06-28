#!/bin/bash

# Quick Docker Test Script
# This script quickly tests if the Docker setup works

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

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Clean up any existing containers
cleanup() {
    print_status "Cleaning up existing containers..."
    docker-compose down 2>/dev/null || true
    docker system prune -f 2>/dev/null || true
}

# Test Docker build
test_build() {
    print_status "Testing Docker build..."
    
    # Copy frontend files (simulating buildspec.yml)
    mkdir -p backend/static
    cp -r frontend/* backend/static/
    
    # Build the image
    if docker-compose build --no-cache; then
        print_success "Docker build successful"
    else
        print_error "Docker build failed"
        exit 1
    fi
}

# Test container startup
test_startup() {
    print_status "Testing container startup..."
    
    # Start the container
    if docker-compose up -d; then
        print_success "Container started successfully"
    else
        print_error "Container startup failed"
        docker-compose logs
        exit 1
    fi
    
    # Wait for container to be ready
    print_status "Waiting for container to be ready..."
    sleep 15
    
    # Check if container is running
    if docker-compose ps | grep -q "Up"; then
        print_success "Container is running"
    else
        print_error "Container is not running"
        docker-compose logs
        exit 1
    fi
}

# Test health endpoint
test_health() {
    print_status "Testing health endpoint..."
    
    # Wait a bit more for the application to fully start
    sleep 10
    
    # Test health endpoint
    if curl -f http://localhost:8000/health >/dev/null 2>&1; then
        print_success "Health endpoint working"
    else
        print_error "Health endpoint failed"
        print_status "Container logs:"
        docker-compose logs
        exit 1
    fi
}

# Test AWS connectivity
test_aws() {
    print_status "Testing AWS connectivity..."
    
    # Test AWS credentials inside container
    if docker-compose exec taberner-studio aws sts get-caller-identity >/dev/null 2>&1; then
        print_success "AWS credentials working inside container"
    else
        print_error "AWS credentials not working inside container"
        print_status "This might be expected if AWS credentials are not mounted properly"
    fi
}

# Main execution
main() {
    print_status "=== QUICK DOCKER TEST ==="
    
    cleanup
    test_build
    test_startup
    test_health
    test_aws
    
    print_success "=== QUICK DOCKER TEST COMPLETED SUCCESSFULLY ==="
    print_status "The application is running at http://localhost:8000"
    print_status "You can now run the full deployment test with: ./test-deployment.sh"
    
    # Keep container running for manual testing
    print_status "Container is running. Press Ctrl+C to stop."
    docker-compose logs -f
}

# Handle cleanup on script exit
trap cleanup EXIT

# Run main function
main "$@" 