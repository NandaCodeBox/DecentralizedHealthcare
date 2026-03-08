#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extended Video Editor - Includes supervisor frames
Extends video to 3 minutes by including supervisor dashboard from end of original video
"""

import os
import sys

# Set UTF-8 encoding for Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

try:
    from moviepy import VideoFileClip, AudioFileClip, concatenate_videoclips
    from moviepy.audio.AudioClip import CompositeAudioClip
    print("Moviepy imported successfully!")
except ImportError as e:
    print(f"Error importing moviepy: {e}")
    print("Installing moviepy...")
    os.system("pip install moviepy --quiet")
    from moviepy import VideoFileClip, AudioFileClip, concatenate_videoclips
    from moviepy.audio.AudioClip import CompositeAudioClip

def main():
    print("\n" + "="*70)
    print("EXTENDED VIDEO EDITOR - Arogya.ai Demo with Supervisor Frames")
    print("="*70 + "\n")
    
    # File paths
    video_path = "Sign In - Arogya.ai - Google Chrome 2026-03-08 16-58-53.mp4"
    audio_path = "custom-voiceover-3min.mp3"
    output_path = "Arogya_AI_Demo_Final_Extended.mp4"
    
    # Check files
    if not os.path.exists(video_path):
        print(f"ERROR: Video file not found: {video_path}")
        return
    
    if not os.path.exists(audio_path):
        print(f"ERROR: Audio file not found: {audio_path}")
        return
    
    print(f"Found video: {video_path}")
    print(f"Found audio: {audio_path}\n")
    
    # Load video
    print("Loading original video...")
    video = VideoFileClip(video_path)
    print(f"Original video duration: {video.duration:.1f} seconds ({int(video.duration//60)}:{int(video.duration%60):02d})")
    
    # Load audio
    print("Loading voiceover...")
    audio = AudioFileClip(audio_path)
    print(f"Voiceover duration: {audio.duration:.1f} seconds\n")
    
    # Target: 3 minutes (180 seconds)
    target_duration = 180
    
    print("Creating extended video with supervisor frames...")
    print(f"Strategy:")
    print(f"  - First {audio.duration:.0f} seconds: Main content with voiceover")
    print(f"  - Remaining {target_duration - audio.duration:.0f} seconds: Supervisor dashboard from end of video")
    print()
    
    # Part 1: First 134 seconds with voiceover (main content)
    print("Part 1: Extracting main content (0-134 sec)...")
    part1 = video.subclipped(0, audio.duration)
    part1 = part1.with_audio(audio)
    
    # Part 2: Supervisor dashboard from end of original video
    # The supervisor section should be the last ~46 seconds of the original video
    supervisor_duration = target_duration - audio.duration
    supervisor_start = video.duration - supervisor_duration - 10  # Start 10 sec before end to get good supervisor content
    
    print(f"Part 2: Extracting supervisor dashboard ({supervisor_start:.0f}-{supervisor_start + supervisor_duration:.0f} sec)...")
    part2 = video.subclipped(supervisor_start, supervisor_start + supervisor_duration)
    # Keep original audio for supervisor section at reduced volume
    if part2.audio:
        part2 = part2.with_audio(part2.audio.with_volume_scaled(0.3))
    
    # Concatenate both parts
    print("\nCombining parts...")
    final_video = concatenate_videoclips([part1, part2], method="compose")
    
    # Export
    print(f"\nExporting to: {output_path}")
    print("This will take 5-7 minutes...")
    print("Quality: 1080p, 30fps, H.264\n")
    
    final_video.write_videofile(
        output_path,
        codec='libx264',
        audio_codec='aac',
        fps=30,
        preset='medium',
        bitrate='5000k',
        threads=4,
        logger='bar'
    )
    
    # Cleanup
    video.close()
    audio.close()
    part1.close()
    part2.close()
    final_video.close()
    
    # Get file size
    file_size = os.path.getsize(output_path) / (1024 * 1024)
    
    print("\n" + "="*70)
    print("SUCCESS! Extended video created with supervisor frames!")
    print("="*70)
    print(f"\nOutput: {output_path}")
    print(f"Size: {file_size:.1f} MB")
    print(f"Duration: {target_duration} seconds (3:00)")
    print("\nContent:")
    print(f"  0:00-2:14 - Main demo with voiceover")
    print(f"  2:14-3:00 - Supervisor dashboard")
    print("\nReady to upload to YouTube!")
    print("="*70 + "\n")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\nERROR: {str(e)}")
        import traceback
        traceback.print_exc()
