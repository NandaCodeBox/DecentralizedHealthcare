#!/usr/bin/env python3
"""
Combine recorded video with voiceover
Adjust video speed to match 3-minute voiceover
"""

import subprocess
import os

print("=" * 60)
print("Combining Video with Voiceover")
print("=" * 60)

video_file = "Video/Arogya_AI_Complete_Demo_Raw.mp4"
audio_file = "Video/complete-demo-voiceover.mp3"
output_file = "Video/Arogya_AI_Complete_Demo_Final.mp4"

# Check files exist
if not os.path.exists(video_file):
    print(f"✗ Video file not found: {video_file}")
    print("Run: python Video/record-3min-demo.py first")
    exit(1)

if not os.path.exists(audio_file):
    print(f"✗ Audio file not found: {audio_file}")
    print("Run: python Video/generate-voiceover-parts.py first")
    exit(1)

# Get video duration
result = subprocess.run([
    'ffprobe',
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    video_file
], capture_output=True, text=True)

video_duration = float(result.stdout.strip())

# Get audio duration
result = subprocess.run([
    'ffprobe',
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    audio_file
], capture_output=True, text=True)

audio_duration = float(result.stdout.strip())

print(f"\nVideo duration: {video_duration:.1f} seconds")
print(f"Audio duration: {audio_duration:.1f} seconds")

# Calculate speed adjustment
speed_factor = video_duration / audio_duration
print(f"Speed adjustment: {speed_factor:.2f}x")

# Combine video and audio with speed adjustment
print("\nCombining video and audio...")
subprocess.run([
    'ffmpeg',
    '-i', video_file,
    '-i', audio_file,
    '-filter_complex', f'[0:v]setpts={1/speed_factor}*PTS[v]',
    '-map', '[v]',
    '-map', '1:a',
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '23',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    '-y',
    output_file
])

if os.path.exists(output_file):
    # Get final duration
    result = subprocess.run([
        'ffprobe',
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=noprint_wrappers=1:nokey=1',
        output_file
    ], capture_output=True, text=True)
    
    final_duration = float(result.stdout.strip())
    file_size = os.path.getsize(output_file) / (1024 * 1024)
    
    print("\n" + "=" * 60)
    print("✓ Video Creation Complete!")
    print("=" * 60)
    print(f"\nOutput: {output_file}")
    print(f"Duration: {final_duration:.1f} seconds ({final_duration/60:.1f} minutes)")
    print(f"File size: {file_size:.1f} MB")
    print("\n✓ Ready for presentation!")
else:
    print("\n✗ Failed to create final video")
