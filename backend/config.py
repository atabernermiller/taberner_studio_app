import os
from typing import Dict, Any
from constants import (
    AWS_REGION, CATALOG_TABLE_NAME, CATALOG_BUCKET_NAME, 
    APPROVED_BUCKET, QUARANTINE_BUCKET, APP_ENV,
    MAX_RECOMMENDATIONS, MIN_RECOMMENDATIONS, CONFIDENCE_THRESHOLD,
    CATALOG_CACHE_TTL, PRESIGNED_URL_CACHE_TTL, MODERATION_CACHE_TTL
)

class Config:
    """Central configuration management for the Taberner Studio app"""
    
    def __init__(self):
        # Load configuration from constants
        self._load_config()
    
    def _load_config(self):
        """Load configuration from constants"""
        # AWS Configuration
        self.aws_region = AWS_REGION
        self.app_env = APP_ENV
        
        # AWS Resource Names
        self.catalog_table_name = CATALOG_TABLE_NAME
        self.catalog_bucket_name = CATALOG_BUCKET_NAME
        self.approved_bucket = APPROVED_BUCKET
        self.quarantine_bucket = QUARANTINE_BUCKET
        
        # Recommendation Configuration
        self.max_recommendations = MAX_RECOMMENDATIONS
        self.min_recommendations = MIN_RECOMMENDATIONS
        
        # Cache Configuration
        self.catalog_cache_ttl = CATALOG_CACHE_TTL
        self.presigned_url_cache_ttl = PRESIGNED_URL_CACHE_TTL
        self.moderation_cache_ttl = MODERATION_CACHE_TTL
        
        # Confidence threshold for showing attributes
        self.confidence_threshold = CONFIDENCE_THRESHOLD
    
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