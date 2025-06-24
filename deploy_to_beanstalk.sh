#!/bin/bash

# Taberner Studio - Elastic Beanstalk Deployment Script
echo "🚀 Starting Taberner Studio deployment to AWS Elastic Beanstalk..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if EB CLI is installed
if ! command -v eb &> /dev/null; then
    echo "❌ EB CLI is not installed. Installing now..."
    pip install awsebcli
fi

# Check AWS credentials
echo "🔐 Checking AWS credentials..."
aws sts get-caller-identity

# Initialize EB application (if not already done)
if [ ! -f ".elasticbeanstalk/config.yml" ]; then
    echo "📝 Initializing Elastic Beanstalk application..."
    eb init taberner-studio-app \
        --platform python-3.9 \
        --region us-east-1
fi

# Create environment (if not already done)
if ! eb status &> /dev/null; then
    echo "🌍 Creating Elastic Beanstalk environment..."
    eb create taberner-studio-prod \
        --instance-type t2.micro \
        --single-instance \
        --timeout 20
else
    echo "✅ Environment already exists"
fi

# Deploy the application
echo "📦 Deploying application..."
eb deploy

# Get the application URL
echo "🌐 Getting application URL..."
APP_URL=$(eb status | grep "CNAME" | awk '{print $2}')
echo "✅ Your application is deployed at: http://$APP_URL"
echo ""
echo "🔒 To enable HTTPS:"
echo "1. Run: ./setup_https_default_domain.sh"
echo "2. Follow the instructions to request an SSL certificate for: $APP_URL"
echo "3. Update the SSL configuration and redeploy"
echo ""
echo "🎉 Deployment complete!" 