#!/usr/bin/env python3
"""
Generate voiceover in parts (AWS Polly has 3000 character limit)
Then combine all parts into one audio file
"""

import boto3
import subprocess
import os

# Read the full script
with open('Video/complete-demo-voiceover.txt', 'r', encoding='utf-8') as f:
    full_text = f.read()

# Split into parts (max 2900 characters each to be safe)
def split_text(text, max_length=2900):
    """Split text at sentence boundaries"""
    sentences = text.replace('. ', '.|').split('|')
    parts = []
    current_part = ""
    
    for sentence in sentences:
        if len(current_part) + len(sentence) < max_length:
            current_part += sentence
        else:
            if current_part:
                parts.append(current_part.strip())
            current_part = sentence
    
    if current_part:
        parts.append(current_part.strip())
    
    return parts

# Initialize Polly client
polly = boto3.client('polly', region_name='us-east-1')

print("=" * 60)
print("Generating Voiceover in Parts")
print("=" * 60)

# Split text
parts = split_text(full_text)
print(f"\nText split into {len(parts)} parts")

# Generate each part
audio_files = []
for i, part in enumerate(parts, 1):
    print(f"\nGenerating part {i}/{len(parts)} ({len(part)} characters)...")
    
    try:
        response = polly.synthesize_speech(
            Text=part,
            OutputFormat='mp3',
            VoiceId='Aditi',
            Engine='standard'
        )
        
        # Save audio file
        filename = f'Video/voiceover_part_{i}.mp3'
        with open(filename, 'wb') as f:
            f.write(response['AudioStream'].read())
        
        audio_files.append(filename)
        print(f"✓ Saved: {filename}")
        
    except Exception as e:
        print(f"✗ Error generating part {i}: {e}")

if audio_files:
    print(f"\n✓ Generated {len(audio_files)} audio files")
    
    # Create file list for ffmpeg
    with open('Video/audio_files.txt', 'w') as f:
        for audio_file in audio_files:
            f.write(f"file '{os.path.basename(audio_file)}'\n")
    
    # Combine all parts
    print("\nCombining audio files...")
    subprocess.run([
        'ffmpeg',
        '-f', 'concat',
        '-safe', '0',
        '-i', 'Video/audio_files.txt',
        '-c', 'copy',
        '-y',
        'Video/complete-demo-voiceover.mp3'
    ], cwd=os.getcwd())
    
    # Get duration
    result = subprocess.run([
        'ffprobe',
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        'Video/complete-demo-voiceover.mp3'
    ], capture_output=True, text=True)
    
    duration = float(result.stdout.strip())
    
    print(f"\n✓ Combined voiceover created!")
    print(f"Duration: {duration:.1f} seconds ({duration/60:.1f} minutes)")
    print(f"File: Video/complete-demo-voiceover.mp3")
    
    # Clean up part files
    print("\nCleaning up temporary files...")
    for audio_file in audio_files:
        os.remove(audio_file)
    os.remove('Video/audio_files.txt')
    
    print("\n" + "=" * 60)
    print("Voiceover Generation Complete!")
    print("=" * 60)
    print("\nNext step: Record video and combine with voiceover")
    print("Run: python Video/record-complete-demo.py")

else:
    print("\n✗ Failed to generate voiceover")
