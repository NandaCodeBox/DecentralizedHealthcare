#!/usr/bin/env python3
"""
Combine Desktop Demo Video with Story-Driven Voiceover
"""

from moviepy.editor import VideoFileClip, AudioFileClip
import os

def combine_video_audio():
    print("🎬 Combining Desktop Demo with Story Voiceover...")
    
    # Input files
    video_file = "Arogya_AI_Hackathon_Demo_Final.mp4"
    audio_file = "story-voiceover-final.mp3"
    output_file = "Arogya_AI_Final_Demo_With_Story.mp4"
    
    # Check if files exist
    if not os.path.exists(video_file):
        print(f"❌ Error: Video file not found: {video_file}")
        return
    
    if not os.path.exists(audio_file):
        print(f"❌ Error: Audio file not found: {audio_file}")
        return
    
    print(f"📹 Loading video: {video_file}")
    video = VideoFileClip(video_file)
    
    print(f"🎵 Loading audio: {audio_file}")
    audio = AudioFileClip(audio_file)
    
    print(f"⏱️  Video duration: {video.duration:.1f}s")
    print(f"⏱️  Audio duration: {audio.duration:.1f}s")
    
    # Trim or extend video to match audio duration
    if video.duration > audio.duration:
        print(f"✂️  Trimming video from {video.duration:.1f}s to {audio.duration:.1f}s")
        video = video.subclip(0, audio.duration)
    elif video.duration < audio.duration:
        print(f"⚠️  Warning: Video ({video.duration:.1f}s) is shorter than audio ({audio.duration:.1f}s)")
        print(f"   Audio will be trimmed to match video duration")
        audio = audio.subclip(0, video.duration)
    
    # Set audio to video
    print("🔊 Adding voiceover to video...")
    final_video = video.set_audio(audio)
    
    # Write output
    print(f"💾 Writing output: {output_file}")
    final_video.write_videofile(
        output_file,
        codec='libx264',
        audio_codec='aac',
        bitrate='2000k',
        preset='medium',
        fps=25
    )
    
    # Get file size
    file_size = os.path.getsize(output_file) / (1024 * 1024)
    
    print("\n✅ Video combination complete!")
    print(f"📁 Output: {output_file}")
    print(f"📊 Size: {file_size:.2f} MB")
    print(f"⏱️  Duration: {final_video.duration:.1f} seconds")
    
    # Cleanup
    video.close()
    audio.close()
    final_video.close()

if __name__ == "__main__":
    combine_video_audio()
