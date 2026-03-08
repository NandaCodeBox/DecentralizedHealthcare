"""
Create Demo Video from Screenshots
This script creates a video from screenshots with voiceover
"""

import os
import subprocess
from pathlib import Path

print("=" * 60)
print("Arogya AI - Video Creator from Screenshots")
print("=" * 60)
print()

# Configuration
SCREENSHOTS_DIR = "Deck/Screenshots"
VOICEOVER_FILE = "demo-voiceover-polly-female-backup.mp3"
OUTPUT_VIDEO = "Arogya_AI_Demo_Video_Final.mp4"

# Check if ffmpeg is available
print("Checking prerequisites...")
try:
    result = subprocess.run(['ffmpeg', '-version'], capture_output=True, text=True)
    print("✓ FFmpeg installed")
except FileNotFoundError:
    print("✗ FFmpeg not installed")
    print("\nPlease install FFmpeg:")
    print("  1. Download from: https://ffmpeg.org/download.html")
    print("  2. Or use: winget install ffmpeg")
    print("  3. Or use: choco install ffmpeg")
    exit(1)

# Check if voiceover exists
if not os.path.exists(VOICEOVER_FILE):
    print(f"✗ Voiceover file not found: {VOICEOVER_FILE}")
    exit(1)

print(f"✓ Voiceover file found: {VOICEOVER_FILE}")
print()

# Check for screenshots
screenshots_path = Path(SCREENSHOTS_DIR)
if not screenshots_path.exists():
    print(f"✗ Screenshots directory not found: {SCREENSHOTS_DIR}")
    print("\nPlease run: .\\Take-Screenshots.ps1 first")
    exit(1)

screenshots = list(screenshots_path.glob("*.png"))
if len(screenshots) < 6:
    print(f"✗ Not enough screenshots found: {len(screenshots)}/6")
    print("\nPlease run: .\\Take-Screenshots.ps1 to take all screenshots")
    exit(1)

print(f"✓ Found {len(screenshots)} screenshots")
print()

# Create video from screenshots
print("=" * 60)
print("Creating video from screenshots...")
print("=" * 60)
print()

# Expected screenshots in order
screenshot_order = [
    "homepage-hindi.png",
    "symptom-intake-hindi.png",
    "triage-results.png",
    "provider-search-results.png",
    "supervisor-dashboard.png",
    "mobile-view.png"
]

# Create input file for ffmpeg
input_file = "ffmpeg_input.txt"
with open(input_file, 'w') as f:
    for screenshot in screenshot_order:
        screenshot_path = os.path.join(SCREENSHOTS_DIR, screenshot)
        if os.path.exists(screenshot_path):
            # Each screenshot shows for 30 seconds (180 seconds / 6 screenshots)
            f.write(f"file '{screenshot_path}'\n")
            f.write(f"duration 30\n")
        else:
            print(f"⚠ Warning: {screenshot} not found, skipping...")

print("Creating video slideshow...")

# Create video from images
cmd = [
    'ffmpeg',
    '-f', 'concat',
    '-safe', '0',
    '-i', input_file,
    '-i', VOICEOVER_FILE,
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-shortest',
    '-y',
    OUTPUT_VIDEO
]

try:
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0:
        print(f"✓ Video created: {OUTPUT_VIDEO}")
        print()
        print("=" * 60)
        print("✓ VIDEO CREATION COMPLETE!")
        print("=" * 60)
        print()
        print(f"Video file: {OUTPUT_VIDEO}")
        print(f"Duration: ~3 minutes")
        print()
        print("Next steps:")
        print("1. Review the video")
        print("2. Upload to YouTube (unlisted)")
        print("3. Copy video URL for submission")
        print()
    else:
        print(f"✗ Error creating video: {result.stderr}")
except Exception as e:
    print(f"✗ Error: {e}")
finally:
    # Cleanup
    if os.path.exists(input_file):
        os.remove(input_file)

print("Note: This creates a slideshow from screenshots.")
print("For better quality, consider recording screen manually.")
print()
