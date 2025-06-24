#!/bin/bash

# Taberner Studio ECS Deployment Script
# This script builds, pushes, and deploys the application to AWS ECS

set -e  # Exit on any error

# Configuration - Update these values
AWS_REGION="us-east-1"  # Change to your region
AWS_ACCOUNT_ID=""  # Will be auto-detected
ECR_REPOSITORY="taberner-studio"
ECS_CLUSTER="taberner-studio-cluster"
ECS_SERVICE="taberner-studio-service"
TASK_DEFINITION_FAMILY="taberner-studio"

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
    
    if ! command_exists aws; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        print_error "AWS credentials not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    # Get AWS account ID
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    print_success "Using AWS Account ID: $AWS_ACCOUNT_ID"
    
    print_success "Prerequisites check passed"
}

# Create ECR repository if it doesn't exist
create_ecr_repository() {
    print_status "Checking ECR repository..."
    
    if ! aws ecr describe-repositories --repository-names "$ECR_REPOSITORY" --region "$AWS_REGION" >/dev/null 2>&1; then
        print_status "Creating ECR repository: $ECR_REPOSITORY"
        aws ecr create-repository \
            --repository-name "$ECR_REPOSITORY" \
            --region "$AWS_REGION" \
            --image-scanning-configuration scanOnPush=true \
            --encryption-configuration encryptionType=AES256
        
        print_success "ECR repository created"
    else
        print_success "ECR repository already exists"
    fi
}

# Build and push Docker image
build_and_push_image() {
    print_status "Building Docker image..."
    
    # Get ECR login token
    aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
    
    # Build image
    docker build -t "$ECR_REPOSITORY:latest" ./backend
    
    # Tag image for ECR
    docker tag "$ECR_REPOSITORY:latest" "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest"
    
    # Push image
    print_status "Pushing image to ECR..."
    docker push "$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPOSITORY:latest"
    
    print_success "Image built and pushed successfully"
}

# Create ECS cluster if it doesn't exist
create_ecs_cluster() {
    print_status "Checking ECS cluster..."
    
    if ! aws ecs describe-clusters --clusters "$ECS_CLUSTER" --region "$AWS_REGION" --query 'clusters[0].status' --output text 2>/dev/null | grep -q ACTIVE; then
        print_status "Creating ECS cluster: $ECS_CLUSTER"
        aws ecs create-cluster \
            --cluster-name "$ECS_CLUSTER" \
            --region "$AWS_REGION" \
            --capacity-providers FARGATE \
            --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1
        
        print_success "ECS cluster created"
    else
        print_success "ECS cluster already exists"
    fi
}

# Create CloudWatch log group
create_log_group() {
    print_status "Checking CloudWatch log group..."
    
    if ! aws logs describe-log-groups --log-group-name-prefix "/ecs/$TASK_DEFINITION_FAMILY" --region "$AWS_REGION" --query 'logGroups[0].logGroupName' --output text 2>/dev/null | grep -q "/ecs/$TASK_DEFINITION_FAMILY"; then
        print_status "Creating CloudWatch log group: /ecs/$TASK_DEFINITION_FAMILY"
        aws logs create-log-group \
            --log-group-name "/ecs/$TASK_DEFINITION_FAMILY" \
            --region "$AWS_REGION"
        
        print_success "CloudWatch log group created"
    else
        print_success "CloudWatch log group already exists"
    fi
}

# Update task definition
update_task_definition() {
    print_status "Updating task definition..."
    
    # Update the task definition JSON with actual values
    sed -i.bak "s/ACCOUNT_ID/$AWS_ACCOUNT_ID/g; s/REGION/$AWS_REGION/g" ecs-task-definition.json
    
    # Register new task definition
    TASK_DEFINITION_ARN=$(aws ecs register-task-definition \
        --cli-input-json file://ecs-task-definition.json \
        --region "$AWS_REGION" \
        --query 'taskDefinition.taskDefinitionArn' \
        --output text)
    
    print_success "Task definition updated: $TASK_DEFINITION_ARN"
}

# Update service
update_service() {
    print_status "Updating ECS service..."
    
    # Get the latest task definition revision
    TASK_DEFINITION_ARN=$(aws ecs describe-task-definition \
        --task-definition "$TASK_DEFINITION_FAMILY" \
        --region "$AWS_REGION" \
        --query 'taskDefinition.taskDefinitionArn' \
        --output text)
    
    # Update service
    aws ecs update-service \
        --cluster "$ECS_CLUSTER" \
        --service "$ECS_SERVICE" \
        --task-definition "$TASK_DEFINITION_ARN" \
        --region "$AWS_REGION" \
        --force-new-deployment
    
    print_success "Service updated successfully"
}

# Wait for deployment to complete
wait_for_deployment() {
    print_status "Waiting for deployment to complete..."
    
    # Wait for service to be stable
    aws ecs wait services-stable \
        --cluster "$ECS_CLUSTER" \
        --services "$ECS_SERVICE" \
        --region "$AWS_REGION"
    
    print_success "Deployment completed successfully"
}

# Get service URL
get_service_url() {
    print_status "Getting service URL..."
    
    # Try to get the load balancer DNS name
    LOAD_BALANCER_ARN=$(aws ecs describe-services \
        --cluster "$ECS_CLUSTER" \
        --services "$ECS_SERVICE" \
        --region "$AWS_REGION" \
        --query 'services[0].loadBalancers[0].targetGroupArn' \
        --output text 2>/dev/null || echo "")
    
    if [ -n "$LOAD_BALANCER_ARN" ] && [ "$LOAD_BALANCER_ARN" != "None" ]; then
        TARGET_GROUP_NAME=$(echo "$LOAD_BALANCER_ARN" | cut -d'/' -f2)
        LOAD_BALANCER_ARN=$(aws elbv2 describe-target-groups \
            --target-group-arns "$LOAD_BALANCER_ARN" \
            --region "$AWS_REGION" \
            --query 'TargetGroups[0].LoadBalancerArns[0]' \
            --output text 2>/dev/null || echo "")
        
        if [ -n "$LOAD_BALANCER_ARN" ] && [ "$LOAD_BALANCER_ARN" != "None" ]; then
            LOAD_BALANCER_DNS=$(aws elbv2 describe-load-balancers \
                --load-balancer-arns "$LOAD_BALANCER_ARN" \
                --region "$AWS_REGION" \
                --query 'LoadBalancers[0].DNSName' \
                --output text)
            
            print_success "Service URL: http://$LOAD_BALANCER_DNS"
        fi
    fi
    
    # If no load balancer, show the public IP of the task
    if [ -z "$LOAD_BALANCER_DNS" ]; then
        print_warning "No load balancer found. Getting task public IP..."
        
        TASK_ARN=$(aws ecs list-tasks \
            --cluster "$ECS_CLUSTER" \
            --service-name "$ECS_SERVICE" \
            --region "$AWS_REGION" \
            --query 'taskArns[0]' \
            --output text)
        
        if [ -n "$TASK_ARN" ] && [ "$TASK_ARN" != "None" ]; then
            ENI_ID=$(aws ecs describe-tasks \
                --cluster "$ECS_CLUSTER" \
                --tasks "$TASK_ARN" \
                --region "$AWS_REGION" \
                --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value' \
                --output text)
            
            if [ -n "$ENI_ID" ] && [ "$ENI_ID" != "None" ]; then
                PUBLIC_IP=$(aws ec2 describe-network-interfaces \
                    --network-interface-ids "$ENI_ID" \
                    --region "$AWS_REGION" \
                    --query 'NetworkInterfaces[0].Association.PublicIp' \
                    --output text)
                
                if [ -n "$PUBLIC_IP" ] && [ "$PUBLIC_IP" != "None" ]; then
                    print_success "Service URL: http://$PUBLIC_IP:8000"
                fi
            fi
        fi
    fi
}

# Main deployment function
main() {
    print_status "Starting Taberner Studio ECS deployment..."
    
    check_prerequisites
    create_ecr_repository
    build_and_push_image
    create_ecs_cluster
    create_log_group
    update_task_definition
    update_service
    wait_for_deployment
    get_service_url
    
    print_success "Deployment completed successfully!"
    print_status "You can monitor the deployment in the AWS ECS console:"
    print_status "https://$AWS_REGION.console.aws.amazon.com/ecs/home?region=$AWS_REGION#/clusters/$ECS_CLUSTER/services/$ECS_SERVICE"
}

# Run main function
main "$@" 