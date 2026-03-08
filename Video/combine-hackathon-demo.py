#!/usr/bin/env python3
"""
Combine recorded video with voiceover for Hackathon Demo
Creates final 3-minute presentation video
"""

import subprocess
import os

def combine_video_audio():
    print("=" * 80)
    print("COMBINING HACKATHON DEMO VIDEO + VOICEOVER")
    print("=" * 80)
    
    video_file = "Video/Hackathon_Demo_Raw.mp4"
    audio_file = "Video/hackathon-voiceover.mp3"
    output_file = "Video/Hackathon_Demo_Final.mp4"
    
    # Check if files exist
    if not os.path.exists(video_file):
        print(f"\n✗ Video file not found: {video_file}")
        print("  Run: python Video/record-hackathon-demo.py")
        return False
    
    if not os.path.exists(audio_file):
        print(f"\n✗ Audio file not found: {audio_file}")
        print("  Run: python Video/generate-hackathon-voiceover.py")
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
    
    # Determine strategy
    if abs(video_duration - audio_duration) < 5:
        print("\n✓ Durations match well, combining directly...")
        strategy = "direct"
    elif video_duration > audio_duration:
        print(f"\n⚠ Video is {video_duration - audio_duration:.1f}s longer")
        print("  Strategy: Speed up video to match audio")
        strategy = "speed_video"
    else:
        print(f"\n⚠ Audio is {audio_duration - video_duration:.1f}s longer")
        print("  Strategy: Slow down video to match audio")
        strategy = "slow_video"
    
    print(f"\nCombining with strategy: {strategy}")
    print("This may take a minute...")
    
    try:
        if strategy == "direct":
            # Direct combination
            subprocess.run([
                'ffmpeg',
                '-i', video_file,
                '-i', audio_file,
                '-c:v', 'copy',
                '-c:a', 'aac',
                '-map', '0:v:0',
                '-map', '1:a:0',
                '-shortest',
                '-y',
                output_file
            ], check=True)
            
        elif strategy == "speed_video":
            # Speed up video to match audio
            speed_factor = video_duration / audio_duration
            subprocess.run([
                'ffmpeg',
                '-i', video_file,
                '-i', audio_file,
                '-filter:v', f'setpts={1/speed_factor}*PTS',
                '-c:v', 'libx264',
                '-preset', 'medium',
                '-crf', '23',
                '-c:a', 'aac',
                '-map', '0:v:0',
                '-map', '1:a:0',
                '-shortest',
                '-y',
                output_file
            ], check=True)
            
        else:  # slow_video
            # Slow down video to match audio
            speed_factor = video_duration / audio_duration
            subprocess.run([
                'ffmpeg',
                '-i', video_file,
                '-i', audio_file,
                '-filter:v', f'setpts={1/speed_factor}*PTS',
                '-c:v', 'libx264',
                '-preset', 'medium',
                '-crf', '23',
                '-c:a', 'aac',
                '-map', '0:v:0',
                '-map', '1:a:0',
                '-shortest',
                '-y',
                output_file
            ], check=True)
        
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
    print("\nCombining hackathon demo video with voiceover...\n")
    
    success = combine_video_audio()
    
    if success:
        print("\n" + "=" * 80)
        print("SUCCESS! 🎉")
        print("=" * 80)
        print("\nYour hackathon demo video is ready!")
        print("  File: Video/Hackathon_Demo_Final.mp4")
        print("\nThis video includes:")
        print("  ✓ Story-driven narration")
        print("  ✓ Problem statement emphasis")
        print("  ✓ Patient journey demonstration")
        print("  ✓ Supervisor & Agentic AI showcase")
        print("  ✓ Multi-language support")
        print("  ✓ Impact and ROI")
        print("\nReady for your hackathon presentation!")
    else:
        print("\n" + "=" * 80)
        print("FAILED")
        print("=" * 80)
        print("\nPlease check the error messages above.")
