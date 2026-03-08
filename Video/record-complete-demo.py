#!/usr/bin/env python3
"""
Record complete 3-minute demo video with voiceover
Covers all use cases with storytelling
"""

import time
from playwright.sync_api import sync_playwright
import subprocess
import os

# Live URL
BASE_URL = "http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com"

def record_demo():
    print("=" * 60)
    print("Recording Complete Demo Video (3 minutes)")
    print("=" * 60)
    
    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            record_video_dir="Video/recordings",
            record_video_size={'width': 1920, 'height': 1080}
        )
        page = context.new_page()
        
        print("\n1. Opening homepage...")
        page.goto(BASE_URL)
        time.sleep(3)
        
        print("2. Showing triage system...")
        page.goto(f"{BASE_URL}/triage-dashboard")
        time.sleep(4)
        
        # Fill triage form
        print("3. Filling patient symptoms...")
        page.fill('input[placeholder*="name" i]', 'Rajesh Kumar')
        time.sleep(1)
        page.fill('input[type="number"]', '45')
        time.sleep(1)
        page.fill('textarea', 'Chest pain, shortness of breath, sweating')
        time.sleep(2)
        
        # Scroll to show more
        page.evaluate("window.scrollBy(0, 300)")
        time.sleep(2)
        
        print("4. Showing AI assessment...")
        page.evaluate("window.scrollBy(0, 300)")
        time.sleep(3)
        
        print("5. Opening supervisor dashboard...")
        page.goto(f"{BASE_URL}/supervisor-dashboard")
        time.sleep(5)
        
        # Show Agentic AI toggle
        print("6. Highlighting Agentic AI features...")
        time.sleep(3)
        
        # Click on a case to show details
        print("7. Showing AI reasoning...")
        page.click('.cursor-pointer')
        time.sleep(4)
        
        # Scroll to show AI analysis
        page.evaluate("window.scrollBy(0, 200)")
        time.sleep(3)
        
        print("8. Showing provider search...")
        page.goto(f"{BASE_URL}/provider-search")
        time.sleep(3)
        
        # Search for providers
        page.fill('input[type="text"]', 'Cardiologist')
        time.sleep(2)
        page.click('button:has-text("Search")')
        time.sleep(3)
        
        print("9. Showing language support...")
        # Click language selector
        page.click('button:has-text("English")')
        time.sleep(2)
        page.click('button:has-text("हिंदी")')
        time.sleep(3)
        
        print("10. Showing mobile view...")
        # Switch to mobile viewport
        page.set_viewport_size({'width': 375, 'height': 812})
        time.sleep(2)
        page.goto(BASE_URL)
        time.sleep(3)
        
        print("11. Mobile triage...")
        page.goto(f"{BASE_URL}/triage-dashboard")
        time.sleep(3)
        
        print("12. Back to supervisor dashboard...")
        page.set_viewport_size({'width': 1920, 'height': 1080})
        page.goto(f"{BASE_URL}/supervisor-dashboard")
        time.sleep(4)
        
        # Show statistics
        print("13. Highlighting AI statistics...")
        time.sleep(3)
        
        print("\n✓ Recording complete!")
        
        # Close and save
        context.close()
        browser.close()
        
        # Get video path
        video_path = None
        for file in os.listdir("Video/recordings"):
            if file.endswith(".webm"):
                video_path = os.path.join("Video/recordings", file)
                break
        
        if video_path:
            print(f"\nVideo saved: {video_path}")
            
            # Convert to MP4
            output_path = "Video/Arogya_AI_Complete_Demo.mp4"
            print(f"\nConverting to MP4: {output_path}")
            subprocess.run([
                'ffmpeg', '-i', video_path,
                '-c:v', 'libx264',
                '-preset', 'medium',
                '-crf', '23',
                '-y',
                output_path
            ])
            
            print(f"\n✓ Video ready: {output_path}")
            return output_path
        
        return None

if __name__ == '__main__':
    video_path = record_demo()
    
    if video_path:
        print("\n" + "=" * 60)
        print("Next Steps:")
        print("=" * 60)
        print("1. Generate voiceover in parts (text is too long for single call)")
        print("2. Combine video with voiceover")
        print("3. Add captions/subtitles")
        print("\nVideo file:", video_path)
