import os
from typing import Dict, Any

# Import constants as fallbacks for local development
try:
    from constants import (
        AWS_REGION, CATALOG_TABLE_NAME, CATALOG_BUCKET_NAME, 
        APPROVED_BUCKET, QUARANTINE_BUCKET, APP_ENV,
        MAX_RECOMMENDATIONS, MIN_RECOMMENDATIONS, CONFIDENCE_THRESHOLD,
        CATALOG_CACHE_TTL, PRESIGNED_URL_CACHE_TTL, MODERATION_CACHE_TTL
    )
except ImportError:
    # Fallback values if constants.py is not available
    AWS_REGION = 'us-east-1'
    CATALOG_TABLE_NAME = 'taberner-studio-catalog'
    CATALOG_BUCKET_NAME = 'taberner-studio-catalog-us-east-1'
    APPROVED_BUCKET = 'taberner-studio-images-us-east-1'
    QUARANTINE_BUCKET = 'taberner-studio-quarantine-us-east-1'
    APP_ENV = 'aws'
    MAX_RECOMMENDATIONS = 8
    MIN_RECOMMENDATIONS = 4
    CONFIDENCE_THRESHOLD = 0.7
    CATALOG_CACHE_TTL = 300
    PRESIGNED_URL_CACHE_TTL = 3600
    MODERATION_CACHE_TTL = 600

class Config:
    """Central configuration management for the Taberner Studio app"""
    
    def __init__(self):
        # Load configuration from environment variables with fallbacks
        self._load_config()
    
    def _load_config(self):
        """Load configuration from environment variables with fallbacks to constants"""
        # AWS Configuration - Environment variables take precedence
        self.aws_region = os.getenv('AWS_REGION', AWS_REGION)
        self.app_env = os.getenv('APP_ENV', APP_ENV)
        
        # AWS Resource Names - Environment variables take precedence
        self.catalog_table_name = os.getenv('CATALOG_TABLE_NAME', CATALOG_TABLE_NAME)
        self.catalog_bucket_name = os.getenv('CATALOG_BUCKET_NAME', CATALOG_BUCKET_NAME)
        self.approved_bucket = os.getenv('APPROVED_BUCKET', APPROVED_BUCKET)
        self.quarantine_bucket = os.getenv('QUARANTINE_BUCKET', QUARANTINE_BUCKET)
        
        # Recommendation Configuration - Environment variables take precedence
        self.max_recommendations = int(os.getenv('MAX_RECOMMENDATIONS', MAX_RECOMMENDATIONS))
        self.min_recommendations = int(os.getenv('MIN_RECOMMENDATIONS', MIN_RECOMMENDATIONS))
        
        # Cache Configuration - Environment variables take precedence
        self.catalog_cache_ttl = int(os.getenv('CATALOG_CACHE_TTL', CATALOG_CACHE_TTL))
        self.presigned_url_cache_ttl = int(os.getenv('PRESIGNED_URL_CACHE_TTL', PRESIGNED_URL_CACHE_TTL))
        self.moderation_cache_ttl = int(os.getenv('MODERATION_CACHE_TTL', MODERATION_CACHE_TTL))
        
        # Confidence threshold for showing attributes
        self.confidence_threshold = float(os.getenv('CONFIDENCE_THRESHOLD', CONFIDENCE_THRESHOLD))
    
    def get_aws_config(self) -> Dict[str, Any]:
        """Get AWS configuration as a dictionary"""
        return {
            'region': self.aws_region,
            'env': self.app_env,
            'catalog_table_name': self.catalog_table_name,
            'catalog_bucket_name': self.catalog_bucket_name,
            'approved_bucket': self.approved_bucket,
            'quarantine_bucket': self.quarantine_bucket
        }
    
    def get_recommendation_config(self) -> Dict[str, Any]:
        """Get recommendation configuration as a dictionary"""
        return {
            'max_recommendations': self.max_recommendations,
            'min_recommendations': self.min_recommendations,
            'confidence_threshold': self.confidence_threshold
        }
    
    def get_cache_config(self) -> Dict[str, Any]:
        """Get cache configuration as a dictionary"""
        return {
            'catalog_cache_ttl': self.catalog_cache_ttl,
            'presigned_url_cache_ttl': self.presigned_url_cache_ttl,
            'moderation_cache_ttl': self.moderation_cache_ttl
        }
    
    def __str__(self) -> str:
        """String representation of configuration"""
        return f"""Config:
  AWS Region: {self.aws_region}
  App Environment: {self.app_env}
  Catalog Table: {self.catalog_table_name}
  Catalog Bucket: {self.catalog_bucket_name}
  Approved Bucket: {self.approved_bucket}
  Quarantine Bucket: {self.quarantine_bucket}
  Max Recommendations: {self.max_recommendations}
  Min Recommendations: {self.min_recommendations}
  Confidence Threshold: {self.confidence_threshold}
  Cache TTLs: Catalog={self.catalog_cache_ttl}s, URLs={self.presigned_url_cache_ttl}s, Moderation={self.moderation_cache_ttl}s"""

# Global configuration instance
config = Config() 