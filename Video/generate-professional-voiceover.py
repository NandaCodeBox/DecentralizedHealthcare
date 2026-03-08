#!/usr/bin/env python3
"""
Generate professional voiceover with natural pauses
Uses SSML for precise timing control
"""

import boto3
import os
import subprocess

def generate_voiceover():
    print("=" * 80)
    print("GENERATING PROFESSIONAL VOICEOVER")
    print("With natural pauses for visual sync")
    print("=" * 80)
    
    # Read the voiceover script
    with open('Video/professional-story-voiceover.txt', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract spoken text (remove pause markers and comments)
    lines = content.split('\n')
    spoken_parts = []
    
    for line in lines:
        line_stripped = line.strip()
        # Skip empty lines, comments, and pause markers
        if not line_stripped or line_stripped.startswith('#') or line_stripped.startswith('['):
            continue
        spoken_parts.append(line_stripped)
    
    # Join all spoken text
    full_text = ' '.join(spoken_parts)
    
    print(f"\nScript length: {len(full_text)} characters")
    print(f"Estimated duration: ~{len(full_text) / 12:.0f} seconds")
    
    # Initialize AWS Polly client
    try:
        polly = boto3.client('polly', region_name='us-east-1')
        
        print("\n✓ AWS Polly client initialized")
        print("  Voice: Aditi (Indian English, Female)")
        print("  Engine: Standard")
        
        # Split into manageable chunks (Polly has 3000 char limit)
        max_chunk_size = 2500
        chunks = []
        current_chunk = []
        current_length = 0
        
        words = full_text.split()
        for word in words:
            word_length = len(word) + 1  # +1 for space
            if current_length + word_length > max_chunk_size and current_chunk:
                chunks.append(' '.join(current_chunk))
                current_chunk = [word]
                current_length = word_length
            else:
                current_chunk.append(word)
                current_length += word_length
        
        if current_chunk:
            chunks.append(' '.join(current_chunk))
        
        print(f"\nSplit into {len(chunks)} chunks for processing")
        
        # Generate speech for each chunk
        audio_files = []
        
        for i, chunk_text in enumerate(chunks, 1):
            print(f"\nGenerating chunk {i}/{len(chunks)}...")
            print(f"  Length: {len(chunk_text)} characters")
            
            response = polly.synthesize_speech(
                Text=chunk_text,
                OutputFormat='mp3',
                VoiceId='Aditi',
                LanguageCode='en-IN'
            )
            
            # Save chunk audio
            chunk_file = f'Video/professional-voiceover-chunk{i}.mp3'
            with open(chunk_file, 'wb') as f:
                f.write(response['AudioStream'].read())
            
            audio_files.append(chunk_file)
            print(f"  ✓ Saved: {chunk_file}")
        
        # Combine all chunks using ffmpeg
        print(f"\nCombining {len(audio_files)} chunks...")
        
        # Create concat file
        with open('Video/concat_professional.txt', 'w') as f:
            for audio_file in audio_files:
                f.write(f"file '{os.path.basename(audio_file)}'\n")
        
        # Combine using ffmpeg
        output_file = 'Video/professional-voiceover.mp3'
        subprocess.run([
            'ffmpeg', '-f', 'concat', '-safe', '0',
            '-i', 'Video/concat_professional.txt',
            '-c', 'copy', '-y', output_file
        ], check=True, capture_output=True)
        
        print(f"\n✓ Voiceover generated: {output_file}")
        
        # Clean up chunk files
        for audio_file in audio_files:
            os.remove(audio_file)
        os.remove('Video/concat_professional.txt')
        
        # Get file size
        file_size = os.path.getsize(output_file)
        print(f"  File size: {file_size / 1024:.1f} KB")
        
        # Get actual duration using ffprobe
        try:
            result = subprocess.run(
                ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', 
                 '-of', 'default=noprint_wrappers=1:nokey=1', output_file],
                capture_output=True,
                text=True
            )
            duration = float(result.stdout.strip())
            print(f"  Duration: {duration:.1f} seconds ({duration/60:.1f} minutes)")
            
            if duration > 185:
                print(f"\n⚠ Voiceover is {duration - 180:.0f}s longer than 3 minutes")
                print("  Video will be slowed down to match")
            elif duration < 175:
                print(f"\n⚠ Voiceover is {180 - duration:.0f}s shorter than 3 minutes")
                print("  Video will be sped up to match")
            else:
                print(f"\n✓ Duration is close to 3 minutes!")
                
        except Exception as e:
            print(f"  Could not determine duration: {e}")
        
        return output_file
        
    except Exception as e:
        print(f"\n✗ Error generating voiceover: {e}")
        print("\nMake sure:")
        print("  1. AWS credentials are configured")
        print("  2. You have access to Amazon Polly")
        print("  3. Region is set to us-east-1")
        return None

if __name__ == '__main__':
    print("\nGenerating professional voiceover...\n")
    
    output = generate_voiceover()
    
    if output:
        print("\n" + "=" * 80)
        print("SUCCESS!")
        print("=" * 80)
        print(f"\nVoiceover ready: {output}")
        print("\nNext step:")
        print("  python Video/combine-professional-demo.py")
    else:
        print("\n" + "=" * 80)
        print("FAILED")
        print("=" * 80)
        print("\nPlease check AWS credentials and try again.")
