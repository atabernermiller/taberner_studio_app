#!/bin/bash

echo "🔒 Setting up HTTPS for default Elastic Beanstalk domain..."
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Get AWS Account ID
echo "📋 Getting your AWS Account ID..."
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
echo "✅ Your AWS Account ID: $ACCOUNT_ID"
echo ""

# Get current region
REGION=$(aws configure get region)
echo "🌍 Current AWS Region: $REGION"
echo ""

# Check if EB CLI is installed
if ! command -v eb &> /dev/null; then
    echo "❌ EB CLI is not installed. Installing now..."
    pip install awsebcli
fi

echo "📝 Next steps:"
echo ""
echo "1. First, deploy your application to Elastic Beanstalk:"
echo "   ./deploy_to_beanstalk.sh"
echo ""
echo "2. After deployment, get your default domain from the EB console or run:"
echo "   eb status"
echo ""
echo "3. Go to AWS Certificate Manager (ACM) in US East (N. Virginia) region"
echo "   https://console.aws.amazon.com/acm/home?region=us-east-1"
echo ""
echo "4. Click 'Request a certificate'"
echo ""
echo "5. Choose 'Request a public certificate'"
echo ""
echo "6. Enter your specific Elastic Beanstalk domain (e.g.,):"
echo "   your-app-name.us-east-1.elasticbeanstalk.com"
echo ""
echo "7. Choose 'DNS validation'"
echo ""
echo "8. Click 'Request' and wait for validation (5-30 minutes)"
echo ""
echo "9. Once validated, copy the certificate ARN and update .ebextensions/02_ssl.config"
echo ""
echo "10. Replace 'YOUR-CERTIFICATE-ID' in the config file with your actual certificate ID"
echo ""
echo "11. Redeploy: eb deploy"
echo ""
echo "⚠️  Note: You cannot use wildcard domains (*.elasticbeanstalk.com) in ACM."
echo "   You must use your specific domain name."
echo ""
echo "🔗 Useful commands:"
echo "   - View certificate ARN: aws acm list-certificates --region us-east-1"
echo "   - Get security group: aws ec2 describe-security-groups --filters Name=group-name,Values=*elasticbeanstalk*"
echo "   - Deploy: eb deploy"
echo "" 