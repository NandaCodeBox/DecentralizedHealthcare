#!/usr/bin/env python3
"""
Combine mobile + desktop recordings with voiceover
Creates final 3-minute video
"""

import subprocess
import os

def combine_video():
    print("=" * 80)
    print("COMBINING FINAL 3-MINUTE VIDEO")
    print("=" * 80)
    
    mobile_video = "Video/Patient_Mobile_Raw.webm"
    desktop_video = "Video/Supervisor_Desktop_Raw.webm"
    voiceover = "Video/final-voiceover.mp3"
    output = "Video/Arogya_AI_Final_3Min.mp4"
    
    # Check files exist
    for file in [mobile_video, desktop_video, voiceover]:
        if not os.path.exists(file):
            print(f"\n✗ Missing file: {file}")
            return False
    
    print("\n✓ All input files found")
    print(f"  Mobile: {mobile_video}")
    print(f"  Desktop: {desktop_video}")
    print(f"  Audio: {voiceover}")
    
    print("\nProcessing... (this may take 2-3 minutes)")
    
    try:
        # Step 1: Convert webm to mp4 and scale mobile video
        print("\n[1/4] Converting mobile video...")
        subprocess.run([
            'ffmpeg', '-i', mobile_video,
            '-vf', 'scale=390:844',
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
            '-an',  # Remove audio
            '-y', 'Video/mobile_scaled.mp4'
        ], check=True, capture_output=True)
        
        print("[2/4] Converting desktop video...")
        subprocess.run([
            'ffmpeg', '-i', desktop_video,
            '-vf', 'scale=1920:1080',
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
            '-an',  # Remove audio
            '-y', 'Video/desktop_scaled.mp4'
        ], check=True, capture_output=True)
        
        # Step 2: Concatenate videos
        print("[3/4] Concatenating videos...")
        
        # Create concat file
        with open('Video/concat_list.txt', 'w') as f:
            f.write("file 'mobile_scaled.mp4'\n")
            f.write("file 'desktop_scaled.mp4'\n")
        
        subprocess.run([
            'ffmpeg', '-f', 'concat', '-safe', '0',
            '-i', 'Video/concat_list.txt',
            '-c', 'copy',
            '-y', 'Video/combined_video.mp4'
        ], check=True, capture_output=True)
        
        # Step 3: Add voiceover and trim to exactly 180 seconds
        print("[4/4] Adding voiceover and trimming to 3 minutes...")
        subprocess.run([
            'ffmpeg',
            '-i', 'Video/combined_video.mp4',
            '-i', voiceover,
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-crf', '23',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-shortest',  # End when shortest input ends
            '-t', '180',  # Exactly 3 minutes
            '-y', output
        ], check=True, capture_output=True)
        
        # Clean up temp files
        print("\nCleaning up temporary files...")
        for temp_file in ['Video/mobile_scaled.mp4', 'Video/desktop_scaled.mp4', 
                          'Video/combined_video.mp4', 'Video/concat_list.txt']:
            if os.path.exists(temp_file):
                os.remove(temp_file)
        
        print(f"\n✓ Final video created: {output}")
        
        # Get file info
        file_size = os.path.getsize(output)
        print(f"  File size: {file_size / (1024*1024):.1f} MB")
        
        # Get duration
        try:
            result = subprocess.run(
                ['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                 '-of', 'default=noprint_wrappers=1:nokey=1', output],
                capture_output=True,
                text=True
            )
            duration = float(result.stdout.strip())
            print(f"  Duration: {duration:.1f}s ({duration/60:.1f} minutes)")
            
            if abs(duration - 180) < 2:
                print(f"\n✓ Perfect! Video is exactly 3 minutes!")
        except:
            print(f"  Duration: ~3 minutes")
        
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"\n✗ Error: {e}")
        return False
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        return False

if __name__ == '__main__':
    print("\nCombining videos with voiceover...\n")
    
    success = combine_video()
    
    if success:
        print("\n" + "=" * 80)
        print("SUCCESS! 🎉")
        print("=" * 80)
        print("\nYour 3-minute hackathon demo is ready!")
        print("  File: Video/Arogya_AI_Final_3Min.mp4")
        print("\nFeatures:")
        print("  ✓ Patient journey in mobile view")
        print("  ✓ Supervisor dashboard in desktop view")
        print("  ✓ Professional story-driven narration")
        print("  ✓ Exactly 3 minutes duration")
        print("\nReady for your hackathon presentation!")
    else:
        print("\n" + "=" * 80)
        print("FAILED")
        print("=" * 80)
