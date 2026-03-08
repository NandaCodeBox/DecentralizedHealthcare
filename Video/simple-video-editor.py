#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Simple Video Editor - Trims video and adds voiceover
"""

import os
import sys

# Set UTF-8 encoding for Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

try:
    from moviepy import VideoFileClip, AudioFileClip
    print("Moviepy imported successfully!")
except ImportError as e:
    print(f"Error importing moviepy: {e}")
    print("Installing moviepy...")
    os.system("pip install moviepy --quiet")
    from moviepy import VideoFileClip, AudioFileClip

def main():
    print("\n" + "="*70)
    print("SMART VIDEO EDITOR - Arogya.ai Demo")
    print("="*70 + "\n")
    
    # File paths
    video_path = "Sign In - Arogya.ai - Google Chrome 2026-03-08 16-58-53.mp4"
    audio_path = "custom-voiceover-3min.mp3"
    output_path = "Arogya_AI_Demo_Final.mp4"
    
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
    print("Loading video...")
    video = VideoFileClip(video_path)
    print(f"Video duration: {video.duration:.1f} seconds")
    
    # Load audio
    print("Loading voiceover...")
    audio = AudioFileClip(audio_path)
    print(f"Audio duration: {audio.duration:.1f} seconds\n")
    
    # Trim video to match audio duration (3 minutes)
    target_duration = min(180, audio.duration)  # 3 minutes or audio length
    
    print(f"Trimming video to {target_duration:.1f} seconds...")
    
    # Strategy: Take first 3 minutes of video
    trimmed_video = video.subclipped(0, target_duration)
    
    # Replace audio with voiceover
    print("Adding voiceover...")
    final_video = trimmed_video.with_audio(audio)
    
    # Export
    print(f"\nExporting to: {output_path}")
    print("This will take 3-5 minutes...")
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
    final_video.close()
    
    # Get file size
    file_size = os.path.getsize(output_path) / (1024 * 1024)
    
    print("\n" + "="*70)
    print("SUCCESS! Video created!")
    print("="*70)
    print(f"\nOutput: {output_path}")
    print(f"Size: {file_size:.1f} MB")
    print(f"Duration: {target_duration:.1f} seconds")
    print("\nReady to upload to YouTube!")
    print("="*70 + "\n")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"\nERROR: {str(e)}")
        print("\nIf you see import errors, run:")
        print("  pip install moviepy opencv-python")
        import traceback
        traceback.print_exc()
