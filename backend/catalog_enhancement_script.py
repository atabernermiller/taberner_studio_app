#!/usr/bin/env python3
"""
Catalog Enhancement Script
Adds missing attributes and improves existing ones for better contextual recommendations.
"""

import json
import colorsys
from decimal import Decimal
from typing import Dict, List, Any

class DecimalEncoder(json.JSONEncoder):
    """Custom JSON encoder that handles Decimal types."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)

def analyze_artwork_mood(artwork: Dict[str, Any]) -> str:
    """Analyze artwork characteristics to determine mood."""
    subject = artwork.get('attributes', {}).get('subject', {}).get('label', '').lower()
    style = artwork.get('attributes', {}).get('style', {}).get('label', '').lower()
    title = artwork.get('title', '').lower()
    description = artwork.get('description', '').lower()
    
    # Get dominant colors for mood analysis
    colors = artwork.get('attributes', {}).get('dominant_colors', [])
    
    # Analyze color mood
    warm_colors = 0
    cool_colors = 0
    dark_colors = 0
    bright_colors = 0
    
    for color_info in colors:
        hex_color = color_info.get('color', '#000000')
        percentage = color_info.get('percentage', 0)
        
        # Convert hex to RGB
        try:
            r = int(hex_color[1:3], 16) / 255.0
            g = int(hex_color[3:5], 16) / 255.0  
            b = int(hex_color[5:7], 16) / 255.0
            
            # Calculate warmth (red/orange vs blue)
            if r > b:
                warm_colors += percentage
            else:
                cool_colors += percentage
                
            # Calculate brightness
            brightness = (r + g + b) / 3
            if brightness > 0.6:
                bright_colors += percentage
            elif brightness < 0.3:
                dark_colors += percentage
                
        except (ValueError, IndexError):
            continue
    
    # Determine mood based on multiple factors
    mood_keywords = {
        'serene': ['calm', 'peaceful', 'quiet', 'still', 'tranquil', 'gentle', 'soft'],
        'energetic': ['vibrant', 'bold', 'dynamic', 'bright', 'lively', 'wild'],
        'contemplative': ['reflection', 'thought', 'meditation', 'deep', 'introspective'],
        'dramatic': ['storm', 'contrast', 'power', 'intense', 'strong', 'striking'],
        'uplifting': ['joy', 'light', 'hope', 'positive', 'warm', 'sunny', 'golden'],
        'melancholic': ['autumn', 'dusk', 'fading', 'lonely', 'nostalgic', 'wistful'],
        'mysterious': ['shadow', 'dark', 'hidden', 'secret', 'night', 'unknown'],
        'romantic': ['sunset', 'soft', 'dreamy', 'intimate', 'tender', 'gentle']
    }
    
    # Check text for mood keywords
    text_content = f"{title} {description}".lower()
    mood_scores = {}
    
    for mood, keywords in mood_keywords.items():
        score = sum(1 for keyword in keywords if keyword in text_content)
        if score > 0:
            mood_scores[mood] = score
    
    # Add color-based mood scoring
    if warm_colors > 0.6:
        mood_scores['uplifting'] = mood_scores.get('uplifting', 0) + 2
        mood_scores['romantic'] = mood_scores.get('romantic', 0) + 1
    elif cool_colors > 0.6:
        mood_scores['serene'] = mood_scores.get('serene', 0) + 2
        mood_scores['contemplative'] = mood_scores.get('contemplative', 0) + 1
        
    if dark_colors > 0.5:
        mood_scores['dramatic'] = mood_scores.get('dramatic', 0) + 2
        mood_scores['mysterious'] = mood_scores.get('mysterious', 0) + 1
    elif bright_colors > 0.5:
        mood_scores['energetic'] = mood_scores.get('energetic', 0) + 2
        mood_scores['uplifting'] = mood_scores.get('uplifting', 0) + 1
    
    # Subject-based mood adjustments
    if 'landscape' in subject or 'nature' in subject:
        mood_scores['serene'] = mood_scores.get('serene', 0) + 1
        mood_scores['contemplative'] = mood_scores.get('contemplative', 0) + 1
    elif 'wildlife' in subject or 'animal' in subject:
        mood_scores['energetic'] = mood_scores.get('energetic', 0) + 1
    elif 'cityscape' in subject:
        mood_scores['dramatic'] = mood_scores.get('dramatic', 0) + 1
        mood_scores['energetic'] = mood_scores.get('energetic', 0) + 1
    
    # Return the mood with highest score, or 'neutral' if no clear winner
    if mood_scores:
        return max(mood_scores.items(), key=lambda x: x[1])[0]
    else:
        return 'neutral'

def ensure_decimal(value: Any) -> Any:
    """Convert numeric values to Decimal for DynamoDB compatibility."""
    if isinstance(value, (int, float)):
        return Decimal(str(value))
    elif isinstance(value, str):
        try:
            # Only convert if it's actually a numeric string
            float(value)  # Test if it's numeric
            return Decimal(value)
        except (ValueError, TypeError):
            return value
    elif isinstance(value, dict):
        # Recursively convert dict values
        return {k: ensure_decimal(v) for k, v in value.items()}
    elif isinstance(value, list):
        # Recursively convert list items
        return [ensure_decimal(item) for item in value]
    return value

def enhance_style_category(current_style: str, subject: str, title: str, description: str) -> str:
    """Enhance style categories with more specific art movement classifications."""
    current_style = current_style.lower() if current_style else ''
    subject = subject.lower() if subject else ''
    title = title.lower()
    description = description.lower()
    
    # Map current generic styles to more specific ones
    style_mappings = {
        'nature': 'Contemporary Nature',
        'modern': 'Contemporary',
        'minimalism': 'Minimalist',
        'black and white': 'Monochromatic',
        'street photography': 'Urban Contemporary',
        'long exposure': 'Fine Art Photography'
    }
    
    # Check content for style indicators
    content = f"{title} {description}".lower()
    
    # Photorealistic indicators
    if any(word in content for word in ['captured', 'frozen', 'moment', 'light', 'shadow']):
        if 'landscape' in subject or 'seascape' in subject:
            return 'Landscape Photography'
        elif 'wildlife' in subject or 'animal' in subject:
            return 'Wildlife Photography'
        elif 'cityscape' in subject:
            return 'Urban Photography'
        else:
            return 'Fine Art Photography'
    
    # Abstract indicators  
    if any(word in content for word in ['abstract', 'pattern', 'geometric', 'flowing']):
        return 'Abstract'
    
    # Impressionistic indicators
    if any(word in content for word in ['soft', 'gentle', 'dreamy', 'atmospheric']):
        return 'Impressionistic'
    
    # Contemporary indicators
    if any(word in content for word in ['contemporary', 'modern', 'urban', 'architectural']):
        return 'Contemporary'
    
    # Use mapping if available, otherwise enhance current style
    if current_style in style_mappings:
        return style_mappings[current_style]
    elif current_style:
        return current_style.title()
    else:
        return 'Contemporary'

def add_emotional_impact_score(artwork: Dict[str, Any]) -> Decimal:
    """Calculate emotional impact score based on various factors."""
    score = 0.5  # Base score
    
    # Color intensity impact
    colors = artwork.get('attributes', {}).get('dominant_colors', [])
    if colors:
        # Calculate color diversity and saturation
        total_saturation = 0
        for color_info in colors:
            hex_color = color_info.get('color', '#000000')
            try:
                r = int(hex_color[1:3], 16) / 255.0
                g = int(hex_color[3:5], 16) / 255.0
                b = int(hex_color[5:7], 16) / 255.0
                
                # Convert to HSV to get saturation
                h, s, v = colorsys.rgb_to_hsv(r, g, b)
                total_saturation += s * color_info.get('percentage', 0)
            except (ValueError, IndexError):
                continue
        
        # High saturation increases emotional impact
        if total_saturation > 0.4:
            score += 0.2
        elif total_saturation < 0.2:
            score -= 0.1
    
    # Subject matter impact
    subject = artwork.get('attributes', {}).get('subject', {}).get('label', '').lower()
    high_impact_subjects = ['wildlife', 'horse', 'bird', 'eagle']
    medium_impact_subjects = ['landscape', 'seascape', 'cityscape']
    
    if any(subj in subject for subj in high_impact_subjects):
        score += 0.3
    elif any(subj in subject for subj in medium_impact_subjects):
        score += 0.1
    
    # Title/description emotional words
    content = f"{artwork.get('title', '')} {artwork.get('description', '')}".lower()
    emotional_words = [
        'wild', 'free', 'power', 'strength', 'grace', 'beauty', 'dramatic',
        'stunning', 'magnificent', 'breathtaking', 'serene', 'peaceful',
        'vibrant', 'bold', 'striking', 'elegant', 'majestic'
    ]
    
    emotional_word_count = sum(1 for word in emotional_words if word in content)
    score += min(emotional_word_count * 0.05, 0.3)  # Cap at 0.3
    
    # Ensure score stays within reasonable bounds
    final_score = max(0.1, min(1.0, score))
    return Decimal(str(final_score))

def add_size_recommendations(artwork: Dict[str, Any]) -> str:
    """Recommend optimal size based on artwork characteristics."""
    subject = artwork.get('attributes', {}).get('subject', {}).get('label', '').lower()
    style = artwork.get('attributes', {}).get('style', {}).get('label', '').lower()
    
    # Large format subjects
    if any(subj in subject for subj in ['landscape', 'seascape', 'cityscape', 'panorama']):
        return 'large'
    
    # Medium format subjects  
    elif any(subj in subject for subj in ['wildlife', 'horse', 'bird', 'animal']):
        return 'medium'
    
    # Small format subjects
    elif any(subj in subject for subj in ['portrait', 'detail', 'close-up', 'macro']):
        return 'small'
    
    # Style-based recommendations
    elif 'minimalism' in style or 'abstract' in style:
        return 'medium'
    
    return 'medium'  # Default

def improve_room_suggestions(artwork: Dict[str, Any]) -> Dict[str, Any]:
    """Improve room suggestions based on enhanced analysis."""
    subject = artwork.get('attributes', {}).get('subject', {}).get('label', '').lower()
    mood = artwork.get('attributes', {}).get('mood', 'neutral').lower()
    
    # Define room compatibility scores
    room_scores = {}
    
    # Subject-based room matching
    if 'landscape' in subject or 'seascape' in subject:
        room_scores.update({
            'Living Room': 0.9,
            'Bedroom': 0.8,
            'Office': 0.7,
            'Family Room': 0.8,
            'Guest Room': 0.7
        })
    elif 'wildlife' in subject or 'animal' in subject:
        room_scores.update({
            'Family Room': 0.8,
            'Office': 0.7,
            'Den': 0.9,
            'Living Room': 0.6,
            'Kids Room': 0.8
        })
    elif 'cityscape' in subject:
        room_scores.update({
            'Office': 0.9,
            'Living Room': 0.7,
            'Family Room': 0.6,
            'Foyer': 0.8
        })
    elif 'abstract' in subject:
        room_scores.update({
            'Living Room': 0.8,
            'Bedroom': 0.7,
            'Office': 0.9,
            'Family Room': 0.7
        })
    
    # Mood-based adjustments
    if mood in ['serene', 'contemplative', 'romantic']:
        room_scores['Bedroom'] = room_scores.get('Bedroom', 0.5) + 0.2
        room_scores['Guest Room'] = room_scores.get('Guest Room', 0.5) + 0.1
    elif mood in ['energetic', 'dramatic', 'uplifting']:
        room_scores['Living Room'] = room_scores.get('Living Room', 0.5) + 0.2
        room_scores['Family Room'] = room_scores.get('Family Room', 0.5) + 0.2
    elif mood in ['mysterious', 'melancholic']:
        room_scores['Office'] = room_scores.get('Office', 0.5) + 0.2
        room_scores['Den'] = room_scores.get('Den', 0.5) + 0.1
    
    # Ensure scores don't exceed 1.0
    for room in room_scores:
        room_scores[room] = min(1.0, room_scores[room])
    
    # Sort by score and create response structure
    sorted_rooms = sorted(room_scores.items(), key=lambda x: x[1], reverse=True)
    
    if sorted_rooms:
        primary_room, primary_score = sorted_rooms[0]
        secondary_rooms = [
            {"room": room, "confidence": score} 
            for room, score in sorted_rooms[1:4]  # Top 3 secondary
            if score > 0.5
        ]
        
        return {
            "primary": {
                "room": primary_room,
                "confidence": Decimal(str(primary_score))
            },
            "secondary": [
                {"room": room, "confidence": Decimal(str(score))} 
                for room, score in sorted_rooms[1:4]  # Top 3 secondary
                if score > 0.5
            ]
        }
    else:
        # Fallback to current structure
        return artwork.get('attributes', {}).get('room_suggestions', {})

def enhance_catalog_entry(artwork: Dict[str, Any]) -> Dict[str, Any]:
    """Enhance a single catalog entry with improved attributes."""
    enhanced = artwork.copy()
    attributes = enhanced.setdefault('attributes', {})
    
    # Get current values
    subject_info = attributes.get('subject', {})
    subject_label = subject_info.get('label', '') if isinstance(subject_info, dict) else subject_info
    
    style_info = attributes.get('style', {})
    style_label = style_info.get('label', '') if isinstance(style_info, dict) else style_info
    
    # 1. Add mood if missing
    if not attributes.get('mood'):
        attributes['mood'] = analyze_artwork_mood(artwork)
    
    # 2. Enhance style category
    enhanced_style = enhance_style_category(
        style_label, 
        subject_label, 
        artwork.get('title', ''), 
        artwork.get('description', '')
    )
    
    if isinstance(style_info, dict):
        attributes['style']['label'] = enhanced_style
    else:
        attributes['style'] = {
            'label': enhanced_style,
            'confidence': Decimal('0.8')
        }
    
    # 3. Add new contextual attributes
    attributes['emotional_impact'] = add_emotional_impact_score(artwork)
    attributes['recommended_size'] = add_size_recommendations(artwork)
    
    # 4. Add room compatibility attributes
    attributes['room_compatibility'] = {
        'brightness_preference': 'any',  # bright, medium, dark, any
        'space_size': add_size_recommendations(artwork),  # small, medium, large
        'style_compatibility': ['contemporary', 'traditional', 'eclectic']  # Default to flexible
    }
    
    # 5. Improve room suggestions
    attributes['room_suggestions'] = improve_room_suggestions(enhanced)
    
    # 6. Add color harmony information
    colors = attributes.get('dominant_colors', [])
    if colors:
        # Determine color harmony type
        warm_count = 0
        cool_count = 0
        
        for color_info in colors:
            hex_color = color_info.get('color', '#000000')
            try:
                r = int(hex_color[1:3], 16)
                b = int(hex_color[5:7], 16)
                if r > b:
                    warm_count += 1
                else:
                    cool_count += 1
            except (ValueError, IndexError):
                continue
        
        if warm_count > cool_count:
            color_harmony = 'warm'
        elif cool_count > warm_count:
            color_harmony = 'cool'
        else:
            color_harmony = 'neutral'
            
        attributes['color_harmony'] = color_harmony
    
    # 7. Ensure all numeric values are Decimal for DynamoDB compatibility
    enhanced = ensure_decimal(enhanced)
    
    return enhanced

def enhance_catalog(input_file: str, output_file: str):
    """Enhance the entire catalog with improved attributes."""
    print(f"Loading catalog from {input_file}...")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        catalog = json.load(f)
    
    print(f"Enhancing {len(catalog)} artworks...")
    
    enhanced_catalog = []
    for i, artwork in enumerate(catalog):
        if i % 10 == 0:
            print(f"Processing artwork {i+1}/{len(catalog)}...")
        
        enhanced_artwork = enhance_catalog_entry(artwork)
        enhanced_catalog.append(enhanced_artwork)
    
    print(f"Saving enhanced catalog to {output_file}...")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(enhanced_catalog, f, indent=2, ensure_ascii=False, cls=DecimalEncoder)
    
    print("✅ Catalog enhancement complete!")
    
    # Print summary of enhancements
    mood_count = sum(1 for artwork in enhanced_catalog if artwork.get('attributes', {}).get('mood'))
    style_count = sum(1 for artwork in enhanced_catalog if artwork.get('attributes', {}).get('style', {}).get('label'))
    
    print(f"\n📊 Enhancement Summary:")
    print(f"  • Moods added: {mood_count}/{len(enhanced_catalog)}")
    print(f"  • Styles enhanced: {style_count}/{len(enhanced_catalog)}")
    print(f"  • Emotional impact scores: {len(enhanced_catalog)}")
    print(f"  • Size recommendations: {len(enhanced_catalog)}")
    print(f"  • Room compatibility data: {len(enhanced_catalog)}")

if __name__ == "__main__":
    enhance_catalog(
        input_file="catalog/catalog.json",
        output_file="catalog/catalog_enhanced.json"
    ) 