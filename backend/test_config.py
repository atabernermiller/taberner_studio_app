#!/usr/bin/env python3
"""
Test script to verify configuration system and set AWS region.
"""

import os
import sys
from config import config

def main():
    """Test the configuration system."""
    print("=== Taberner Studio Configuration Test ===")
    print()
    
    # Test current configuration
    print("Current Configuration:")
    print(config)
    print()
    
    # Test setting AWS region
    print("Setting AWS_REGION to us-east-1...")
    os.environ['AWS_REGION'] = 'us-east-1'
    
    # Reload configuration
    from config import config as new_config
    print()
    print("Updated Configuration:")
    print(new_config)
    print()
    
    # Test AWS config
    aws_config = new_config.get_aws_config()
    print("AWS Configuration:")
    for key, value in aws_config.items():
        print(f"  {key}: {value}")
    print()
    
    # Test recommendation config
    rec_config = new_config.get_recommendation_config()
    print("Recommendation Configuration:")
    for key, value in rec_config.items():
        print(f"  {key}: {value}")
    print()
    
    print("Configuration test completed successfully!")

if __name__ == "__main__":
    main() 