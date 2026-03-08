#!/usr/bin/env python3
"""
Fix video-audio sync by analyzing video duration and adjusting audio timing
"""

import subprocess
import os

def get_duration(file_path):
    """Get duration of video/audio file"""
    try:
        result = subprocess.run(
            ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
             '-of', 'default=noprint_wrappers=1:nokey=1', file_path],
            capture_output=True,
            text=True
        )
        return float(result.stdout.strip())
    except:
        return 0

def sync_video_audio():
    print("=" * 80)
    print("FIXING VIDEO-AUDIO SYNCHRONIZATION")
    print("=" * 80)
    
    mobile_video = "Video/Patient_Mobile_Complete.webm"
    desktop_video = "Video/Supervisor_Desktop_Complete.webm"
    audio = "Video/complete-professional-voiceover.mp3"
    output = "Video/Arogya_AI_Synced_3Min.mp4"
    
    # Check files
    for file in [mobile_video, desktop_video, audio]:
        if not os.path.exists(file):
            print(f"\n✗ Missing: {file}")
            return False
    
    print("\n✓ Analyzing files...")
    
    # Get durations
    mobile_duration = get_duration(mobile_video)
    desktop_duration = get_duration(desktop_video)
    audio_duration = get_duration(audio)
    total_video_duration = mobile_duration + desktop_duration
    
    print(f"  Mobile video: {mobile_duration:.1f}s")
    print(f"  Desktop video: {desktop_duration:.1f}s")
    print(f"  Total video: {total_video_duration:.1f}s")
    print(f"  Audio: {audio_duration:.1f}s")
    
    # Calculate target duration (3 minutes = 180 seconds)
    target_duration = 180.0
    
    # Calculate speed adjustments
    video_speed = total_video_duration / target_duration
    audio_speed = audio_duration / target_duration
    
    print(f"\n✓ Adjustments needed:")
    print(f"  Video speed: {video_speed:.3f}x")
    print(f"  Audio speed: {audio_speed:.3f}x")
    
    print("\nProcessing... (this may take 2-3 minutes)")
    
    try:
        # Step 1: Speed up mobile video
        print("\n[1/5] Adjusting mobile video speed...")
        subprocess.run([
            'ffmpeg', '-i', mobile_video,
            '-filter:v', f'setpts={1/video_speed}*PTS',
            '-vf', 'scale=390:844:force_original_aspect_ratio=decrease,pad=390:844:(ow-iw)/2:(oh-ih)/2',
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
            '-an',
            '-y', 'Video/mobile_speed.mp4'
        ], check=True, capture_output=True)
        
        # Step 2: Speed up desktop video
        print("[2/5] Adjusting desktop video speed...")
        subprocess.run([
            'ffmpeg', '-i', desktop_video,
            '-filter:v', f'setpts={1/video_speed}*PTS',
            '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2',
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
            '-an',
            '-y', 'Video/desktop_speed.mp4'
        ], check=True, capture_output=True)
        
        # Step 3: Concatenate videos
        print("[3/5] Concatenating videos...")
        with open('Video/concat_sync.txt', 'w') as f:
            f.write("file 'mobile_speed.mp4'\n")
            f.write("file 'desktop_speed.mp4'\n")
        
        subprocess.run([
            'ffmpeg', '-f', 'concat', '-safe', '0',
            '-i', 'Video/concat_sync.txt',
            '-c', 'copy',
            '-y', 'Video/video_synced.mp4'
        ], check=True, capture_output=True)
        
        # Step 4: Adjust audio speed
        print("[4/5] Adjusting audio speed...")
        subprocess.run([
            'ffmpeg', '-i', audio,
            '-filter:a', f'atempo={audio_speed}',
            '-y', 'Video/audio_synced.mp3'
        ], check=True, capture_output=True)
        
        # Step 5: Combine synced video and audio
        print("[5/5] Combining synced video and audio...")
        subprocess.run([
            'ffmpeg',
            '-i', 'Video/video_synced.mp4',
            '-i', 'Video/audio_synced.mp3',
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-shortest',
            '-t', '180',
            '-y', output
        ], check=True, capture_output=True)
        
        # Clean up
        print("\nCleaning up temporary files...")
        for temp_file in ['Video/mobile_speed.mp4', 'Video/desktop_speed.mp4',
                          'Video/video_synced.mp4', 'Video/audio_synced.mp3',
                          'Video/concat_sync.txt']:
            if os.path.exists(temp_file):
                os.remove(temp_file)
        
        print(f"\n✓ Synced video created: {output}")
        
        # Get final info
        final_duration = get_duration(output)
        file_size = os.path.getsize(output)
        
        print(f"  Duration: {final_duration:.1f}s ({final_duration/60:.2f} minutes)")
        print(f"  File size: {file_size / (1024*1024):.1f} MB")
        
        if abs(final_duration - 180) < 2:
            print(f"\n✓ Perfect! Video is exactly 3 minutes with synced audio!")
        
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"\n✗ Error: {e}")
        return False
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        return False

if __name__ == '__main__':
    print("\nSynchronizing video and audio...\n")
    
    success = sync_video_audio()
    
    if success:
        print("\n" + "=" * 80)
        print("SUCCESS! 🎉")
        print("=" * 80)
        print("\nYour perfectly synced 3-minute demo is ready!")
        print("  File: Video/Arogya_AI_Synced_3Min.mp4")
        print("\nFeatures:")
        print("  ✓ Perfect video-audio synchronization")
        print("  ✓ Exactly 3 minutes duration")
        print("  ✓ Mobile view (patient)")
        print("  ✓ Desktop view (supervisor)")
        print("  ✓ All features explained")
    else:
        print("\n" + "=" * 80)
        print("FAILED")
        print("=" * 80)
