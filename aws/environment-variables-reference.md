# Environment Variables Reference

This document lists all the environment variables that can be configured in the AWS ECS task definition.

## AWS Configuration

| Variable | Description | Default Value | Required |
|----------|-------------|---------------|----------|
| `AWS_REGION` | AWS region for all services | `us-east-1` | No |
| `CATALOG_TABLE_NAME` | DynamoDB table name for catalog | `taberner-studio-catalog` | No |
| `CATALOG_BUCKET_NAME` | S3 bucket for catalog images | `taberner-studio-catalog-us-east-1` | No |
| `APPROVED_BUCKET` | S3 bucket for approved images | `taberner-studio-images-us-east-1` | No |
| `QUARANTINE_BUCKET` | S3 bucket for quarantined images | `taberner-studio-quarantine-us-east-1` | No |

## Application Configuration

| Variable | Description | Default Value | Required |
|----------|-------------|---------------|----------|
| `APP_ENV` | Application environment | `aws` | No |
| `MAX_RECOMMENDATIONS` | Maximum number of recommendations to return | `8` | No |
| `MIN_RECOMMENDATIONS` | Minimum number of recommendations to return | `4` | No |
| `CONFIDENCE_THRESHOLD` | Confidence threshold for showing attributes | `0.7` | No |

## Cache Configuration

| Variable | Description | Default Value | Required |
|----------|-------------|---------------|----------|
| `CATALOG_CACHE_TTL` | Catalog cache TTL in seconds | `300` (5 minutes) | No |
| `PRESIGNED_URL_CACHE_TTL` | Presigned URL cache TTL in seconds | `3600` (1 hour) | No |
| `MODERATION_CACHE_TTL` | Moderation cache TTL in seconds | `600` (10 minutes) | No |

## Usage

### In AWS ECS Task Definition

Add these as environment variables in your ECS task definition:

```json
{
  "environment": [
    {
      "name": "AWS_REGION",
      "value": "us-east-1"
    },
    {
      "name": "CATALOG_TABLE_NAME", 
      "value": "taberner-studio-catalog"
    },
    {
      "name": "CATALOG_BUCKET_NAME",
      "value": "taberner-studio-catalog-us-east-1"
    },
    {
      "name": "APPROVED_BUCKET",
      "value": "taberner-studio-images-us-east-1"
    },
    {
      "name": "QUARANTINE_BUCKET",
      "value": "taberner-studio-quarantine-us-east-1"
    },
    {
      "name": "APP_ENV",
      "value": "aws"
    },
    {
      "name": "MAX_RECOMMENDATIONS",
      "value": "8"
    },
    {
      "name": "MIN_RECOMMENDATIONS", 
      "value": "4"
    },
    {
      "name": "CONFIDENCE_THRESHOLD",
      "value": "0.7"
    },
    {
      "name": "CATALOG_CACHE_TTL",
      "value": "300"
    },
    {
      "name": "PRESIGNED_URL_CACHE_TTL",
      "value": "3600"
    },
    {
      "name": "MODERATION_CACHE_TTL",
      "value": "600"
    }
  ]
}
```

### Local Development

For local development, you can set these in a `.env` file or export them:

```bash
export AWS_REGION=us-east-1
export CATALOG_TABLE_NAME=taberner-studio-catalog
export CATALOG_BUCKET_NAME=taberner-studio-catalog-us-east-1
# ... etc
```

## Benefits

1. **Environment-specific configuration**: Different values for dev/staging/prod
2. **Security**: Sensitive values can be managed through AWS Systems Manager Parameter Store
3. **Flexibility**: Easy to change values without code deployment
4. **Best practices**: Follows 12-factor app principles 