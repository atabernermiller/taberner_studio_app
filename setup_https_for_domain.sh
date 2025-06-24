#!/bin/bash

echo "🔒 Setting up HTTPS for your Elastic Beanstalk domain..."
echo ""

# Get the current domain
DOMAIN=$(eb status | grep CNAME | awk '{print $2}')
echo "✅ Your domain: $DOMAIN"
echo ""

echo "📝 Next steps to enable HTTPS:"
echo ""
echo "1. Go to AWS Certificate Manager (ACM) in US East (N. Virginia) region"
echo "2. Click 'Request a certificate'"
echo "3. Choose 'Request a public certificate'"
echo "4. Enter domain: $DOMAIN"
echo "5. Choose 'DNS validation'"
echo "6. Click 'Request' and wait for validation (5-30 minutes)"
echo ""
echo "7. Once validated, copy the certificate ARN and update .ebextensions/02_ssl.config"
echo "8. Replace 'YOUR-CERTIFICATE-ID' with your actual certificate ID"
echo "9. Run: eb deploy"
echo ""
echo "🔗 Your app URL: http://$DOMAIN"
echo "🔒 After HTTPS setup: https://$DOMAIN" 