# AWS Configuration Constants
AWS_REGION = 'us-east-1'
CATALOG_TABLE_NAME = 'taberner-studio-catalog'
CATALOG_BUCKET_NAME = 'taberner-studio-catalog-us-east-1'
APPROVED_BUCKET = 'taberner-studio-images-us-east-1'
QUARANTINE_BUCKET = 'taberner-studio-quarantine-us-east-1'

# Application Configuration
APP_ENV = 'aws'
MAX_RECOMMENDATIONS = 8
MIN_RECOMMENDATIONS = 4
CONFIDENCE_THRESHOLD = 0.7

# Cache Configuration
CATALOG_CACHE_TTL = 300  # 5 minutes
PRESIGNED_URL_CACHE_TTL = 3600  # 1 hour
MODERATION_CACHE_TTL = 600  # 10 minutes 