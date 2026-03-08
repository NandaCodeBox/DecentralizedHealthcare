#!/usr/bin/env python3
"""
Generate complete professional voiceover
Explains all features, Agentic AI, and problem-solving
"""

import boto3
import os

def generate_voiceover():
    print("=" * 80)
    print("GENERATING COMPLETE PROFESSIONAL VOICEOVER")
    print("=" * 80)
    
    # Read voiceover text
    with open('Video/complete-professional-voiceover.txt', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract only spoken text
    lines = []
    for line in content.split('\n'):
        line = line.strip()
        if line and not line.startswith('#') and not line.startswith('['):
            lines.append(line)
    
    text = ' '.join(lines)
    
    print(f"\n✓ Text length: {len(text)} characters")
    print(f"✓ Estimated duration: ~3 minutes")
    
    # Add SSML for natural pacing
    ssml_text = f'''<speak>
    <prosody rate="medium" pitch="medium">
    {text}
    </prosody>
    </speak>'''
    
    # Initialize AWS Polly
    print("\n✓ Connecting to AWS Polly...")
    polly = boto3.client('polly', region_name='us-east-1')
    
    print("✓ Generating speech (Aditi - Indian English, Neural)...")
    
    try:
        response = polly.synthesize_speech(
            Text=ssml_text,
            TextType='ssml',
            OutputFormat='mp3',
            VoiceId='Aditi'
        )
        
        # Save audio file
        output_file = 'Video/complete-professional-voiceover.mp3'
        with open(output_file, 'wb') as f:
            f.write(response['AudioStream'].read())
        
        print(f"\n✓ Voiceover created: {output_file}")
        
        # Get file size
        file_size = os.path.getsize(output_file)
        print(f"  File size: {file_size / 1024:.1f} KB")
        
        print("\n✓ Professional voiceover ready!")
        print("  - Explains all features")
        print("  - Covers Agentic AI in detail")
        print("  - Shows problem-solving approach")
        print("  - Highlights multilingual support")
        print("  - Demonstrates 6-level reasoning")
        
        return True
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        return False

if __name__ == '__main__':
    print("\nGenerating complete professional voiceover...\n")
    
    success = generate_voiceover()
    
    if success:
        print("\n" + "=" * 80)
        print("SUCCESS!")
        print("=" * 80)
        print("\nVoiceover ready: Video/complete-professional-voiceover.mp3")
        print("Next: Combine with video recordings")
    else:
        print("\n" + "=" * 80)
        print("FAILED")
        print("=" * 80)
