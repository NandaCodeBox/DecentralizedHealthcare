#!/usr/bin/env python3
"""
Generate voiceover for Hackathon Demo using AWS Polly
Story-driven narration emphasizing problem statement
"""

import boto3
import os

def generate_voiceover():
    print("=" * 80)
    print("GENERATING HACKATHON DEMO VOICEOVER")
    print("Using AWS Polly (Aditi - Indian English)")
    print("=" * 80)
    
    # Read the voiceover script
    with open('Video/hackathon-story-voiceover.txt', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract segments by looking for SEGMENT markers
    segments = []
    current_segment = []
    in_segment = False
    
    lines = content.split('\n')
    for line in lines:
        line_stripped = line.strip()
        
        # Check if this is a segment header
        if '## SEGMENT' in line_stripped:
            # Save previous segment if exists
            if current_segment:
                segment_text = ' '.join(current_segment)
                if segment_text:
                    segments.append(segment_text)
                current_segment = []
            in_segment = True
            continue
        
        # Skip empty lines and single # comments
        if not line_stripped or line_stripped.startswith('# '):
            continue
        
        # Add content lines to current segment
        if in_segment and not line_stripped.startswith('#'):
            current_segment.append(line_stripped)
    
    # Add last segment
    if current_segment:
        segment_text = ' '.join(current_segment)
        if segment_text:
            segments.append(segment_text)
    
    print(f"\nFound {len(segments)} segments")
    
    # Initialize AWS Polly client
    try:
        polly = boto3.client('polly', region_name='us-east-1')
        
        print("\n✓ AWS Polly client initialized")
        print("  Voice: Aditi (Indian English, Female)")
        print("  Engine: Standard")
        
        # Generate speech for each segment
        audio_files = []
        
        for i, segment_text in enumerate(segments, 1):
            print(f"\nGenerating segment {i}/{len(segments)}...")
            print(f"  Length: {len(segment_text)} characters")
            
            response = polly.synthesize_speech(
                Text=segment_text,
                OutputFormat='mp3',
                VoiceId='Aditi',
                LanguageCode='en-IN'
            )
            
            # Save segment audio
            segment_file = f'Video/hackathon-voiceover-segment{i}.mp3'
            with open(segment_file, 'wb') as f:
                f.write(response['AudioStream'].read())
            
            audio_files.append(segment_file)
            print(f"  ✓ Saved: {segment_file}")
        
        # Combine all segments using ffmpeg
        print(f"\nCombining {len(audio_files)} segments...")
        
        # Create concat file
        with open('Video/concat_list.txt', 'w') as f:
            for audio_file in audio_files:
                f.write(f"file '{os.path.basename(audio_file)}'\n")
        
        # Combine using ffmpeg
        import subprocess
        output_file = 'Video/hackathon-voiceover.mp3'
        subprocess.run([
            'ffmpeg', '-f', 'concat', '-safe', '0',
            '-i', 'Video/concat_list.txt',
            '-c', 'copy', '-y', output_file
        ], check=True, capture_output=True)
        
        print(f"\n✓ Voiceover generated: {output_file}")
        
        # Clean up segment files
        for audio_file in audio_files:
            os.remove(audio_file)
        os.remove('Video/concat_list.txt')
        
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
                print(f"\n⚠ WARNING: Voiceover is {duration - 180:.0f}s longer than 3 minutes!")
                print("  Consider shortening the script.")
            elif duration < 175:
                print(f"\n⚠ WARNING: Voiceover is {180 - duration:.0f}s shorter than 3 minutes!")
                print("  Consider adding more content or slowing down.")
            else:
                print(f"\n✓ Duration is perfect for 3-minute video!")
                
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
    print("\nGenerating story-driven voiceover for hackathon demo...")
    print("This emphasizes the problem statement and impact.\n")
    
    output = generate_voiceover()
    
    if output:
        print("\n" + "=" * 80)
        print("SUCCESS!")
        print("=" * 80)
        print(f"\nVoiceover ready: {output}")
        print("\nNext step:")
        print("  python Video/combine-hackathon-demo.py")
    else:
        print("\n" + "=" * 80)
        print("FAILED")
        print("=" * 80)
        print("\nPlease check AWS credentials and try again.")
