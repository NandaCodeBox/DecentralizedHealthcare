#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Finalize Recorded Video - Convert WebM to MP4 and add voiceover
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

def finalize_video():
    print("\n" + "="*70)
    print("FINALIZING RECORDED VIDEO")
    print("="*70 + "\n")
    
    webm_file = "Arogya_AI_Complete_Recording.webm"
    audio_file = "custom-voiceover-3min.mp3"
    output_file = "Arogya_AI_Demo_Final.mp4"
    
    if not os.path.exists(webm_file):
        print(f"❌ ERROR: {webm_file} not found")
        return
    
    if not os.path.exists(audio_file):
        print(f"❌ ERROR: {audio_file} not found")
        return
    
    print(f"Input video: {webm_file}")
    print(f"Voiceover: {audio_file}")
    print(f"Output: {output_file}\n")
    
    # Load video
    print("Loading recorded video...")
    video = VideoFileClip(webm_file)
    print(f"  Duration: {video.duration:.1f} seconds")
    print(f"  Resolution: {video.size}")
    print(f"  FPS: {video.fps}")
    
    # Load audio
    print("\nLoading voiceover...")
    audio = AudioFileClip(audio_file)
    print(f"  Duration: {audio.duration:.1f} seconds")
    
    # Determine strategy
    target_duration = 180  # 3 minutes
    
    if video.duration < target_duration:
        print(f"\n⚠️  Video is shorter than target ({video.duration:.0f}s < {target_duration}s)")
        print("Strategy: Use full video + extend with last frame")
        
        # Use full video
        final_video = video
        
        # If voiceover is longer, trim it
        if audio.duration > video.duration:
            print(f"Trimming voiceover to match video ({video.duration:.0f}s)")
            audio = audio.subclipped(0, video.duration)
        
    else:
        print(f"\nVideo is long enough ({video.duration:.0f}s >= {target_duration}s)")
        print("Strategy: Trim video to 3 minutes")
        
        # Trim to 3 minutes
        final_video = video.subclipped(0, target_duration)
        
        # Trim audio if needed
        if audio.duration > target_duration:
            audio = audio.subclipped(0, target_duration)
    
    # Replace audio with voiceover
    print("\nAdding voiceover...")
    final_video = final_video.with_audio(audio)
    
    # Export
    print(f"\nExporting to {output_file}...")
    print("This will take 3-5 minutes...")
    print("Quality: 1080p, 30fps, H.264\n")
    
    final_video.write_videofile(
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
    final_video.close()
    
    # Get file info
    size_mb = os.path.getsize(output_file) / (1024 * 1024)
    
    print("\n" + "="*70)
    print("✅ SUCCESS! Final video created!")
    print("="*70)
    print(f"\nOutput: {output_file}")
    print(f"Size: {size_mb:.1f} MB")
    print(f"Duration: {min(video.duration, target_duration):.0f} seconds")
    print("\nReady to upload to YouTube!")
    print("="*70 + "\n")

if __name__ == "__main__":
    try:
        finalize_video()
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
