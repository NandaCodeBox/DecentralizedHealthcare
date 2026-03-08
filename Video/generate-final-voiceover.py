#!/usr/bin/env python3
"""
Generate voiceover for final 3-minute demo
Uses AWS Polly with Aditi voice (Indian English)
"""

import boto3
import time

def generate_voiceover():
    print("=" * 80)
    print("GENERATING VOICEOVER - AWS POLLY")
    print("=" * 80)
    
    # Read voiceover text
    with open('Video/final-3min-voiceover.txt', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract only spoken text (remove comments and pause markers)
    lines = []
    for line in content.split('\n'):
        line = line.strip()
        if line and not line.startswith('#') and not line.startswith('['):
            lines.append(line)
    
    text = ' '.join(lines)
    
    # Add SSML pauses for natural pacing
    ssml_text = f'''<speak>
    <prosody rate="medium" pitch="medium">
    {text}
    </prosody>
    </speak>'''
    
    print(f"\n✓ Text length: {len(text)} characters")
    print(f"✓ Estimated duration: ~3 minutes")
    
    # Initialize AWS Polly
    print("\n✓ Connecting to AWS Polly...")
    polly = boto3.client('polly', region_name='us-east-1')
    
    print("✓ Generating speech (Aditi - Indian English)...")
    
    try:
        response = polly.synthesize_speech(
            Text=ssml_text,
            TextType='ssml',
            OutputFormat='mp3',
            VoiceId='Aditi',
            Engine='neural'
        )
        
        # Save audio file
        output_file = 'Video/final-voiceover.mp3'
        with open(output_file, 'wb') as f:
            f.write(response['AudioStream'].read())
        
        print(f"\n✓ Voiceover created: {output_file}")
        
        # Get file size
        import os
        file_size = os.path.getsize(output_file)
        print(f"  File size: {file_size / 1024:.1f} KB")
        
        return True
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        return False

if __name__ == '__main__':
    print("\nGenerating professional voiceover...\n")
    
    success = generate_voiceover()
    
    if success:
        print("\n" + "=" * 80)
        print("SUCCESS!")
        print("=" * 80)
        print("\nVoiceover ready: Video/final-voiceover.mp3")
        print("Next: Combine with video recordings")
    else:
        print("\n" + "=" * 80)
        print("FAILED")
        print("=" * 80)
