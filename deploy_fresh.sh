#!/bin/bash

# Fresh AWS Elastic Beanstalk Deployment Script
# This script creates a new application and environment

set -e

# Configuration
APP_NAME="taberner-studio-app"
ENV_NAME="taberner-studio-prod"
REGION="us-east-1"
PLATFORM="Python 3.11"

echo "🚀 Starting fresh AWS Elastic Beanstalk deployment..."

# Check if application already exists
if aws elasticbeanstalk describe-applications --application-names $APP_NAME --region $REGION 2>/dev/null; then
    echo "⚠️  Application $APP_NAME already exists. Deleting..."
    aws elasticbeanstalk delete-application --application-name $APP_NAME --force-terminate --region $REGION
    echo "✅ Application deleted. Waiting for cleanup..."
    sleep 30
fi

# Create new application
echo "📦 Creating new Elastic Beanstalk application: $APP_NAME"
aws elasticbeanstalk create-application \
    --application-name $APP_NAME \
    --description "Taberner Studio Art Recommendation App" \
    --region $REGION

# Create application version
echo "📋 Creating application version..."
aws elasticbeanstalk create-application-version \
    --application-name $APP_NAME \
    --version-label "v1-$(date +%Y%m%d-%H%M%S)" \
    --source-bundle S3Bucket="elasticbeanstalk-$REGION-$(aws sts get-caller-identity --query Account --output text)",S3Key="taberner-studio-app.zip" \
    --auto-create-application \
    --region $REGION

# Create environment
echo "🌍 Creating Elastic Beanstalk environment: $ENV_NAME"
aws elasticbeanstalk create-environment \
    --application-name $APP_NAME \
    --environment-name $ENV_NAME \
    --solution-stack-name "64bit Amazon Linux 2 v5.8.0 running Python 3.11" \
    --option-settings \
        Namespace=aws:autoscaling:launchconfiguration,OptionName=IamInstanceProfile,Value=aws-elasticbeanstalk-ec2-role \
        Namespace=aws:elasticbeanstalk:environment,OptionName=EnvironmentType,Value=SingleInstance \
        Namespace=aws:elasticbeanstalk:application:environment,OptionName=FLASK_ENV,Value=production \
        Namespace=aws:elasticbeanstalk:application:environment,OptionName=APP_ENV,Value=aws \
        Namespace=aws:elasticbeanstalk:application:environment,OptionName=CATALOG_TABLE_NAME,Value=taberner-studio-catalog \
        Namespace=aws:elasticbeanstalk:application:environment,OptionName=CATALOG_BUCKET_NAME,Value=taberner-studio-catalog-images \
        Namespace=aws:elasticbeanstalk:application:environment,OptionName=APPROVED_BUCKET,Value=taberner-studio-images \
        Namespace=aws:elasticbeanstalk:application:environment,OptionName=QUARANTINE_BUCKET,Value=taberner-studio-quarantine \
    --region $REGION

echo "⏳ Waiting for environment to be ready..."
aws elasticbeanstalk wait environment-exists \
    --environment-names $ENV_NAME \
    --region $REGION

echo "✅ Deployment completed!"
echo "🌐 Your application will be available at:"
echo "   https://$ENV_NAME.elasticbeanstalk.com"
echo ""
echo "📊 Monitor deployment status with:"
echo "   aws elasticbeanstalk describe-environments --environment-names $ENV_NAME --region $REGION" 