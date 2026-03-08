#!/usr/bin/env python3
"""
Combine professional video with voiceover
Perfect synchronization
"""

import subprocess
import os

def combine_video_audio():
    print("=" * 80)
    print("COMBINING PROFESSIONAL DEMO VIDEO + VOICEOVER")
    print("=" * 80)
    
    video_file = "Video/Professional_Demo_Raw.mp4"
    audio_file = "Video/professional-voiceover.mp3"
    output_file = "Video/Arogya_AI_Professional_Demo.mp4"
    
    # Check if files exist
    if not os.path.exists(video_file):
        print(f"\n✗ Video file not found: {video_file}")
        print("  Run: python Video/record-professional-demo.py")
        return False
    
    if not os.path.exists(audio_file):
        print(f"\n✗ Audio file not found: {audio_file}")
        print("  Run: python Video/generate-professional-voiceover.py")
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
        video_duration = 180
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
    
    # Calculate speed factor
    speed_factor = video_duration / audio_duration
    
    print(f"\n✓ Video and audio will be synchronized")
    print(f"  Speed adjustment: {speed_factor:.3f}x")
    print("\nCombining... (this may take 1-2 minutes)")
    
    try:
        # Combine with speed adjustment
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
    print("\nCombining professional demo...\n")
    
    success = combine_video_audio()
    
    if success:
        print("\n" + "=" * 80)
        print("SUCCESS! 🎉")
        print("=" * 80)
        print("\nYour professional hackathon demo is ready!")
        print("  File: Video/Arogya_AI_Professional_Demo.mp4")
        print("\nThis video includes:")
        print("  ✓ Professional story-driven narration")
        print("  ✓ Perfect voice-video synchronization")
        print("  ✓ Natural pacing with pauses")
        print("  ✓ Clear explanation of MVP benefits")
        print("  ✓ How the app helps patients")
        print("\nReady for your hackathon presentation!")
    else:
        print("\n" + "=" * 80)
        print("FAILED")
        print("=" * 80)
        print("\nPlease check the error messages above.")
