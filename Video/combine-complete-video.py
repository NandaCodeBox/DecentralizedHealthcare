#!/usr/bin/env python3
"""
Combine mobile + desktop videos with complete professional voiceover
Creates final 3-minute video with all features explained
"""

import subprocess
import os

def combine_video():
    print("=" * 80)
    print("COMBINING COMPLETE 3-MINUTE VIDEO")
    print("=" * 80)
    
    mobile_video = "Video/Patient_Mobile_Complete.webm"
    desktop_video = "Video/Supervisor_Desktop_Complete.webm"
    voiceover = "Video/complete-professional-voiceover.mp3"
    output = "Video/Arogya_AI_Complete_3Min.mp4"
    
    # Check files exist
    missing_files = []
    for file in [mobile_video, desktop_video, voiceover]:
        if not os.path.exists(file):
            missing_files.append(file)
    
    if missing_files:
        print("\n✗ Missing files:")
        for file in missing_files:
            print(f"  - {file}")
        return False
    
    print("\n✓ All input files found")
    print(f"  Mobile: {mobile_video}")
    print(f"  Desktop: {desktop_video}")
    print(f"  Audio: {voiceover}")
    
    print("\nProcessing... (this may take 2-3 minutes)")
    
    try:
        # Step 1: Convert and scale mobile video
        print("\n[1/4] Converting mobile video (390x844)...")
        subprocess.run([
            'ffmpeg', '-i', mobile_video,
            '-vf', 'scale=390:844:force_original_aspect_ratio=decrease,pad=390:844:(ow-iw)/2:(oh-ih)/2',
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
            '-an',
            '-y', 'Video/mobile_final.mp4'
        ], check=True, capture_output=True)
        
        # Step 2: Convert and scale desktop video
        print("[2/4] Converting desktop video (1920x1080)...")
        subprocess.run([
            'ffmpeg', '-i', desktop_video,
            '-vf', 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2',
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
            '-an',
            '-y', 'Video/desktop_final.mp4'
        ], check=True, capture_output=True)
        
        # Step 3: Concatenate videos
        print("[3/4] Concatenating videos...")
        
        with open('Video/concat_list.txt', 'w') as f:
            f.write("file 'mobile_final.mp4'\n")
            f.write("file 'desktop_final.mp4'\n")
        
        subprocess.run([
            'ffmpeg', '-f', 'concat', '-safe', '0',
            '-i', 'Video/concat_list.txt',
            '-c', 'copy',
            '-y', 'Video/combined_complete.mp4'
        ], check=True, capture_output=True)
        
        # Step 4: Add voiceover and trim to 180 seconds
        print("[4/4] Adding voiceover and trimming to exactly 3 minutes...")
        subprocess.run([
            'ffmpeg',
            '-i', 'Video/combined_complete.mp4',
            '-i', voiceover,
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-crf', '23',
            '-c:a', 'aac',
            '-b:a', '128k',
            '-shortest',
            '-t', '180',
            '-y', output
        ], check=True, capture_output=True)
        
        # Clean up temp files
        print("\nCleaning up temporary files...")
        for temp_file in ['Video/mobile_final.mp4', 'Video/desktop_final.mp4', 
                          'Video/combined_complete.mp4', 'Video/concat_list.txt']:
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
            print(f"  Duration: {duration:.1f}s ({duration/60:.2f} minutes)")
            
            if abs(duration - 180) < 2:
                print(f"\n✓ Perfect! Video is exactly 3 minutes!")
        except:
            print(f"  Duration: ~3 minutes")
        
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"\n✗ Error: {e}")
        if e.stderr:
            print(f"  Details: {e.stderr.decode()}")
        return False
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        return False

if __name__ == '__main__':
    print("\nCombining complete video with professional voiceover...\n")
    
    success = combine_video()
    
    if success:
        print("\n" + "=" * 80)
        print("SUCCESS! 🎉")
        print("=" * 80)
        print("\nYour complete 3-minute hackathon demo is ready!")
        print("  File: Video/Arogya_AI_Complete_3Min.mp4")
        print("\nFeatures Demonstrated:")
        print("  ✓ Patient journey in mobile view")
        print("  ✓ Multilingual support (10 languages)")
        print("  ✓ Symptom tiles and AI triage")
        print("  ✓ Facility recommendations and booking")
        print("  ✓ Supervisor dashboard in desktop view")
        print("  ✓ Agentic AI toggle and statistics")
        print("  ✓ 6-level reasoning process")
        print("  ✓ Auto-approval vs escalation")
        print("  ✓ AI-powered provider search")
        print("  ✓ Professional problem-solving explanation")
        print("\nReady for your hackathon presentation!")
    else:
        print("\n" + "=" * 80)
        print("FAILED")
        print("=" * 80)
