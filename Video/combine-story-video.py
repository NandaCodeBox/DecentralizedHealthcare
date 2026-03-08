#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Combine Story-Driven Video with Voiceover
Creates final production-ready MP4
"""

import sys
import os

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

try:
    from moviepy import VideoFileClip, AudioFileClip
    print("✅ Moviepy imported")
except ImportError:
    print("Installing moviepy...")
    os.system("pip install moviepy --quiet")
    from moviepy import VideoFileClip, AudioFileClip

def combine_video_audio():
    print("\n" + "="*80)
    print("COMBINING VIDEO + VOICEOVER")
    print("="*80 + "\n")
    
    video_file = "Arogya_AI_Story_Driven_Recording.webm"
    audio_file = "story-driven-voiceover.mp3"
    output_file = "Arogya_AI_Final_Demo.mp4"
    
    # Check files exist
    if not os.path.exists(video_file):
        print(f"❌ ERROR: {video_file} not found")
        print("Run: python story-driven-recorder.py first")
        return
    
    if not os.path.exists(audio_file):
        print(f"❌ ERROR: {audio_file} not found")
        print("Run: .\\generate-story-voiceover.ps1 first")
        return
    
    print(f"✓ Found video: {video_file}")
    print(f"✓ Found audio: {audio_file}\n")
    
    # Load video
    print("Loading video...")
    video = VideoFileClip(video_file)
    print(f"  Video duration: {video.duration:.1f} seconds")
    print(f"  Resolution: {video.size}")
    print(f"  FPS: {video.fps}")
    
    # Load audio
    print("\nLoading voiceover...")
    audio = AudioFileClip(audio_file)
    print(f"  Audio duration: {audio.duration:.1f} seconds")
    
    # Determine strategy
    print("\nProcessing...")
    
    if video.duration > audio.duration:
        print(f"Video is longer ({video.duration:.0f}s > {audio.duration:.0f}s)")
        print("Trimming video to match audio")
        video = video.subclipped(0, audio.duration)
    elif audio.duration > video.duration:
        print(f"Audio is longer ({audio.duration:.0f}s > {video.duration:.0f}s)")
        print("Trimming audio to match video")
        audio = audio.subclipped(0, video.duration)
    else:
        print("Video and audio are same length - perfect!")
    
    # Replace audio
    print("\nAdding voiceover to video...")
    final = video.with_audio(audio)
    
    # Export
    print(f"\nExporting to: {output_file}")
    print("This will take 3-5 minutes...")
    print("Quality: 1080p, 30fps, H.264\n")
    
    final.write_videofile(
        output_file,
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
    final.close()
    
    # Get file info
    size_mb = os.path.getsize(output_file) / (1024 * 1024)
    
    print("\n" + "="*80)
    print("✅ SUCCESS! Final demo video created!")
    print("="*80)
    print(f"\nOutput: {output_file}")
    print(f"Size: {size_mb:.1f} MB")
    print(f"Duration: ~3 minutes")
    print(f"Quality: 1080p, 30fps, H.264")
    print("\n🎉 Ready to upload to YouTube!")
    print("\nUpload as UNLISTED with:")
    print("  Title: Arogya.ai - Breaking Healthcare Barriers with AI")
    print("  Tags: healthcare, AI, multilingual, India, telemedicine")
    print("="*80 + "\n")

if __name__ == "__main__":
    try:
        combine_video_audio()
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
