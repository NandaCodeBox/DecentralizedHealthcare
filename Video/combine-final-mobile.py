"""
Combine Final Mobile Demo Video with Voiceover
Properly synchronized version
"""

from moviepy import VideoFileClip, AudioFileClip
import os
import glob

def find_latest_recording():
    """Find the most recent .webm recording"""
    webm_files = glob.glob("*.webm")
    if not webm_files:
        return None
    # Sort by modification time, most recent first
    webm_files.sort(key=os.path.getmtime, reverse=True)
    return webm_files[0]

def combine_video_audio(video_path, audio_path, output_path):
    """Combine video with voiceover audio"""
    
    print(f"\n{'='*60}")
    print("COMBINING MOBILE DEMO VIDEO WITH VOICEOVER")
    print(f"{'='*60}\n")
    
    # Load video
    print(f"Loading video: {video_path}")
    video = VideoFileClip(video_path)
    video_duration = video.duration
    print(f"  Video duration: {video_duration:.1f} seconds")
    print(f"  Video size: {video.size}")
    print(f"  Video FPS: {video.fps}")
    
    # Load audio
    print(f"\nLoading voiceover: {audio_path}")
    voiceover = AudioFileClip(audio_path)
    audio_duration = voiceover.duration
    print(f"  Audio duration: {audio_duration:.1f} seconds")
    
    # Check duration match
    duration_diff = abs(video_duration - audio_duration)
    print(f"\nDuration difference: {duration_diff:.1f} seconds")
    
    if duration_diff > 5:
        print(f"⚠️  WARNING: Video and audio durations differ by {duration_diff:.1f} seconds")
        
        if video_duration > audio_duration:
            print(f"   Trimming video to match audio duration ({audio_duration:.1f}s)")
            video = video.subclipped(0, audio_duration)
        else:
            print(f"   Extending video to match audio duration ({audio_duration:.1f}s)")
            video = video.with_duration(audio_duration)
    else:
        print("✓ Video and audio durations are well matched")
        # Small difference - trim or extend
        if video_duration > audio_duration:
            video = video.subclipped(0, audio_duration)
        elif video_duration < audio_duration:
            video = video.with_duration(audio_duration)
    
    # Set audio
    print("\nAdding voiceover to video...")
    final_video = video.with_audio(voiceover)
    
    # Write output
    print(f"\nWriting final video: {output_path}")
    print("This may take a few minutes...")
    
    final_video.write_videofile(
        output_path,
        codec='libx264',
        audio_codec='aac',
        fps=video.fps,
        preset='medium',
        bitrate='2500k',
        audio_bitrate='192k',
        threads=4,
        logger=None
    )
    
    # Get file size
    file_size = os.path.getsize(output_path) / (1024 * 1024)
    
    print(f"\n{'='*60}")
    print("✓ VIDEO CREATION COMPLETE!")
    print(f"{'='*60}")
    print(f"\nOutput: {output_path}")
    print(f"Size: {file_size:.2f} MB")
    print(f"Duration: {audio_duration:.1f} seconds")
    print(f"Resolution: {video.size[0]}x{video.size[1]}")
    print(f"\n{'='*60}\n")
    
    # Cleanup
    video.close()
    voiceover.close()
    final_video.close()

if __name__ == "__main__":
    # File paths
    audio_file = "mobile-voiceover-final.mp3"
    output_file = "Arogya_AI_Mobile_Demo_With_Audio.mp4"
    
    # Find latest recording
    print("Looking for latest video recording...")
    video_file = find_latest_recording()
    
    if not video_file:
        print(f"❌ Error: No .webm video file found")
        print(f"   Run: python record-mobile-final.py")
        exit(1)
    
    print(f"✓ Found video: {video_file}")
    
    if not os.path.exists(audio_file):
        print(f"❌ Error: Audio file not found: {audio_file}")
        print(f"   Run: powershell -File generate-final-voiceover.ps1")
        exit(1)
    
    # Combine video and audio
    combine_video_audio(video_file, audio_file, output_file)
    
    print("✓ Mobile demo video with synchronized voiceover is ready!")
    print(f"  File: {output_file}")
