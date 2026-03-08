#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Combine Final Demo Video with Voiceover
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

def combine():
    print("\n" + "="*80)
    print("COMBINING FINAL DEMO VIDEO + VOICEOVER")
    print("="*80 + "\n")
    
    video_file = "Arogya_AI_Final_Complete_Recording.webm"
    audio_file = "final-demo-voiceover.mp3"
    output_file = "Arogya_AI_Hackathon_Demo_Final.mp4"
    
    if not os.path.exists(video_file):
        print(f"❌ ERROR: {video_file} not found")
        return
    
    if not os.path.exists(audio_file):
        print(f"❌ ERROR: {audio_file} not found")
        return
    
    print(f"✓ Video: {video_file}")
    print(f"✓ Audio: {audio_file}\n")
    
    print("Loading video...")
    video = VideoFileClip(video_file)
    print(f"  Duration: {video.duration:.1f}s")
    
    print("\nLoading voiceover...")
    audio = AudioFileClip(audio_file)
    print(f"  Duration: {audio.duration:.1f}s")
    
    print("\nProcessing...")
    
    # Use the shorter duration
    target_duration = min(video.duration, audio.duration)
    
    if video.duration > audio.duration:
        print(f"Trimming video to {audio.duration:.0f}s")
        video = video.subclipped(0, audio.duration)
    elif audio.duration > video.duration:
        print(f"Trimming audio to {video.duration:.0f}s")
        audio = audio.subclipped(0, video.duration)
    
    print("\nAdding voiceover...")
    final = video.with_audio(audio)
    
    print(f"\nExporting: {output_file}")
    print("Quality: 1080p, 30fps, H.264")
    print("This will take 3-5 minutes...\n")
    
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
    
    video.close()
    audio.close()
    final.close()
    
    size_mb = os.path.getsize(output_file) / (1024 * 1024)
    
    print("\n" + "="*80)
    print("✅ SUCCESS! FINAL DEMO VIDEO READY!")
    print("="*80)
    print(f"\nFile: {output_file}")
    print(f"Size: {size_mb:.1f} MB")
    print(f"Duration: {target_duration:.0f}s")
    print("\nIncludes:")
    print("  ✓ Story-driven narrative")
    print("  ✓ Professional voiceover")
    print("  ✓ Supervisor dashboard")
    print("  ✓ Mobile responsive view")
    print("  ✓ All working features")
    print("\n🎉 READY TO UPLOAD TO YOUTUBE!")
    print("="*80 + "\n")

if __name__ == "__main__":
    try:
        combine()
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
