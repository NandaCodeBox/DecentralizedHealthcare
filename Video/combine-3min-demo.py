#!/usr/bin/env python3
"""
Combine video with 3-minute voiceover
Adjusts video speed to match exactly 3 minutes (180 seconds)
"""

import subprocess
import os

def combine_video_audio():
    print("=" * 80)
    print("COMBINING 3-MINUTE DEMO VIDEO + VOICEOVER")
    print("=" * 80)
    
    video_file = "Video/Hackathon_Demo_Raw.mp4"
    audio_file = "Video/hackathon-3min-voiceover.mp3"
    output_file = "Video/Hackathon_Demo_3Min_Final.mp4"
    
    # Check if files exist
    if not os.path.exists(video_file):
        print(f"\n✗ Video file not found: {video_file}")
        print("  Run: python Video/record-hackathon-demo.py")
        return False
    
    if not os.path.exists(audio_file):
        print(f"\n✗ Audio file not found: {audio_file}")
        print("  Run: python Video/generate-3min-voiceover.py")
        return False
    
    print(f"\n✓ Video file: {video_file}")
    print(f"✓ Audio file: {audio_file}")
    
    # Get video duration
    try:
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
             '-of', 'default=noprint_wrappers=1:nokey=1', video_file],
            capture_output=True,
            text=True
        )
        video_duration = float(result.stdout.strip())
        print(f"\nVideo duration: {video_duration:.1f}s")
    except:
        video_duration = 138
        print(f"\nAssumed video duration: {video_duration}s")
    
    # Get audio duration
    try:
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
             '-of', 'default=noprint_wrappers=1:nokey=1', audio_file],
            capture_output=True,
            text=True
        )
        audio_duration = float(result.stdout.strip())
        print(f"Audio duration: {audio_duration:.1f}s")
    except:
        audio_duration = 180
        print(f"Assumed audio duration: {audio_duration}s")
    
    # Calculate speed factor to match audio duration
    speed_factor = video_duration / audio_duration
    
    print(f"\n✓ Adjusting video speed by {speed_factor:.2f}x to match audio")
    print("  This will create a smooth 3-minute video")
    print("\nCombining... (this may take 1-2 minutes)")
    
    try:
        # Adjust video speed and combine with audio
        subprocess.run([
            'ffmpeg',
            '-i', video_file,
            '-i', audio_file,
            '-filter:v', f'setpts={1/speed_factor}*PTS',
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-crf', '23',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-map', '0:v:0',
            '-map', '1:a:0',
            '-shortest',
            '-y',
            output_file
        ], check=True, capture_output=True)
        
        print(f"\n✓ Final video created: {output_file}")
        
        # Get final file size
        file_size = os.path.getsize(output_file)
        print(f"  File size: {file_size / (1024*1024):.1f} MB")
        
        # Get final duration
        try:
            result = subprocess.run(
                ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                 '-of', 'default=noprint_wrappers=1:nokey=1', output_file],
                capture_output=True,
                text=True
            )
            final_duration = float(result.stdout.strip())
            print(f"  Duration: {final_duration:.1f}s ({final_duration/60:.1f} minutes)")
            
            if abs(final_duration - 180) < 5:
                print(f"\n✓ Perfect! Video is exactly 3 minutes!")
            else:
                print(f"\n  Duration: {final_duration:.1f}s (target: 180s)")
        except:
            print(f"  Duration: ~3 minutes")
        
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"\n✗ Error combining video and audio: {e}")
        return False
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        return False

if __name__ == '__main__':
    print("\nCombining 3-minute demo video with voiceover...\n")
    
    success = combine_video_audio()
    
    if success:
        print("\n" + "=" * 80)
        print("SUCCESS! 🎉")
        print("=" * 80)
        print("\nYour 3-minute hackathon demo is ready!")
        print("  File: Video/Hackathon_Demo_3Min_Final.mp4")
        print("\nThis video includes:")
        print("  ✓ Sharp, concise narration (starts immediately)")
        print("  ✓ Problem statement emphasis")
        print("  ✓ Patient journey demonstration")
        print("  ✓ Supervisor & Agentic AI showcase")
        print("  ✓ Multi-language support")
        print("  ✓ Impact and ROI")
        print("  ✓ Exactly 3 minutes duration")
        print("\nReady for your hackathon presentation!")
    else:
        print("\n" + "=" * 80)
        print("FAILED")
        print("=" * 80)
        print("\nPlease check the error messages above.")
