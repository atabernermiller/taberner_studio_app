/**
 * Configuration file for Taberner Studio Art Recommender
 * Handles environment-specific settings
 */

const config = {
  // Environment detection (can be expanded with proper environment variables in AWS)
  environment: window.location.hostname === 'localhost' ? 'development' : 'production',
  
  // API endpoints
  api: {
    baseUrl: window.location.hostname === 'localhost' 
      ? 'http://127.0.0.1:8000' 
      : '',
    uploadEndpoint: '/upload',
    searchEndpoint: '/search'
  },
  
  // Feature flags
  features: {
    enableAnalytics: false, // Set to true in production
    debugMode: true // Set to false in production
  },
  
  // AWS specific settings
  aws: {
    region: 'us-east-1', // Default region, can be overridden
    s3Bucket: 'taberner-studio-assets' // S3 bucket for assets
  }
};



// Make config globally available
window.config = config;
