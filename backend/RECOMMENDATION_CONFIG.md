# Recommendation Configuration Guide

## Overview

This guide explains how to configure the number of artwork thumbnails shown to users in the Taberner Studio app.

## Current Configuration

### Environment Variables

- `MAX_RECOMMENDATIONS`: Maximum number of thumbnails to show (default: 8)
- `MIN_RECOMMENDATIONS`: Minimum number of thumbnails to show (default: 4)

### Default Settings

- **Production (AWS)**: 8 recommendations maximum
- **Development**: 8 recommendations maximum
- **Smart Selection**: 60% quality + 40% diversity

## Recommendation Strategies

### 1. **Simple Limit (Current)**
- Shows top N recommendations by score
- Fast and predictable
- Good for small catalogs

### 2. **Smart Selection (New)**
- **Quality Selection**: 60% of slots filled with best matches
- **Diversity Selection**: 40% of slots filled with varied options
- Better user experience with larger catalogs
- Prevents showing too many similar artworks

## Configuration Examples

### For Small Catalogs (< 50 artworks)
```bash
MAX_RECOMMENDATIONS=6
MIN_RECOMMENDATIONS=3
```

### For Medium Catalogs (50-200 artworks)
```bash
MAX_RECOMMENDATIONS=8
MIN_RECOMMENDATIONS=4
```

### For Large Catalogs (> 200 artworks)
```bash
MAX_RECOMMENDATIONS=12
MIN_RECOMMENDATIONS=6
```

## User Experience Considerations

### **Optimal Thumbnail Counts**
- **Mobile**: 4-6 thumbnails (2-3 rows)
- **Desktop**: 6-8 thumbnails (2-3 rows)
- **Large Screens**: 8-12 thumbnails (3-4 rows)

### **Loading Performance**
- Fewer thumbnails = faster page load
- More thumbnails = more S3 requests
- Balance between variety and performance

### **Decision Fatigue**
- Too many options can overwhelm users
- 5-8 options is optimal for decision-making
- Smart selection reduces similar choices

## Implementation Details

### Smart Selection Algorithm
1. **Score Calculation**: Color harmony scoring for all artworks
2. **Quality Selection**: Top 60% by score
3. **Diversity Selection**: Random selection from middle 40%
4. **Final Sort**: Re-sort by score for consistency

### Cache Impact
- Recommendations are cached per request
- Smart selection adds minimal overhead
- Cache duration: 10 minutes (production)

## Monitoring

### Log Messages
```
INFO Generated 8 recommendations for uploaded image
INFO Smart selection: 5 quality + 3 diversity recommendations
INFO Returning 8 recommendations
```

### Performance Metrics
- Response time impact: < 50ms additional
- Memory usage: Minimal increase
- Cache hit rate: Unchanged

## Future Enhancements

### Potential Improvements
1. **User Preference Learning**: Adjust based on user behavior
2. **Seasonal Recommendations**: Time-based filtering
3. **Popularity Weighting**: Include view/purchase data
4. **Category Balancing**: Ensure variety across subjects/styles

### A/B Testing
- Test different recommendation counts
- Measure user engagement and conversion
- Optimize based on real user data 