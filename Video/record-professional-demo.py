#!/usr/bin/env python3
"""
Record Professional Story-Driven Demo
Synchronized with voiceover pauses for perfect sync
"""

import time
from playwright.sync_api import sync_playwright
import subprocess
import os

BASE_URL = "http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com"

def record_professional_demo():
    print("=" * 80)
    print("RECORDING PROFESSIONAL STORY-DRIVEN DEMO")
    print("Synchronized with voiceover timing")
    print("=" * 80)
    
    with sync_playwright() as p:
        # Launch browser with mobile viewport
        browser = p.chromium.launch(headless=False)
        
        context = browser.new_context(
            viewport={'width': 390, 'height': 844},
            device_scale_factor=3,
            is_mobile=True,
            has_touch=True,
            record_video_dir="Video/recordings",
            record_video_size={'width': 390, 'height': 844}
        )
        page = context.new_page()
        
        # OPENING: THE PROBLEM (0-30s)
        print("\n[0-30s] THE PROBLEM - Rajesh's Story...")
        
        # Show homepage - PAUSE 2s
        page.goto(BASE_URL)
        time.sleep(2)
        
        # Narration about Rajesh (8s of speech)
        time.sleep(8)
        
        # Show emergency banner - PAUSE 2s
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(2)
        
        # Narration about hospital distance (8s of speech)
        time.sleep(8)
        
        # Scroll homepage - PAUSE 2s
        page.evaluate("window.scrollTo(0, 0)")
        page.evaluate("window.scrollBy(0, 300)")
        time.sleep(2)
        
        # Narration about 900M Indians (8s of speech)
        time.sleep(8)
        
        # SOLUTION BEGINS: PATIENT JOURNEY (30-90s)
        print("[30-90s] PATIENT JOURNEY...")
        
        # Language selection - PAUSE 2s
        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(2)
        
        # Narration intro (4s)
        time.sleep(4)
        
        # Select Hindi - PAUSE 3s
        try:
            page.click('button:has-text("English")', timeout=3000)
            time.sleep(1)
            page.click('button:has-text("हिंदी")', timeout=3000)
            time.sleep(3)
        except:
            time.sleep(3)
        
        # Narration about language (5s)
        time.sleep(5)
        
        # Navigate to symptom intake - PAUSE 3s
        try:
            page.click('a[href="/symptom-intake"]', timeout=3000)
        except:
            page.goto(f"{BASE_URL}/symptom-intake")
        time.sleep(3)
        
        # Narration about interface (6s)
        time.sleep(6)
        
        # Click symptom tiles - PAUSE 4s
        try:
            page.click('[data-testid="symptom-chest_pain"]', timeout=2000)
            time.sleep(1)
            page.click('[data-testid="symptom-shortness_of_breath"]', timeout=2000)
            time.sleep(1)
            page.click('[data-testid="symptom-fever"]', timeout=2000)
            time.sleep(2)
        except:
            time.sleep(4)
        
        # Narration about symptoms (5s)
        time.sleep(5)
        
        # Scroll and select severity - PAUSE 3s
        page.evaluate("window.scrollBy(0, 300)")
        try:
            page.click('button:has-text("Severe")', timeout=2000)
        except:
            pass
        time.sleep(3)
        
        # Narration about severity (4s)
        time.sleep(4)
        
        # Select duration and scroll - PAUSE 3s
        page.evaluate("window.scrollBy(0, 300)")
        try:
            page.select_option('select', '1_3_days', timeout=2000)
        except:
            pass
        time.sleep(3)
        
        # Narration about submission (3s)
        time.sleep(3)
        
        # Submit - PAUSE 4s
        page.evaluate("window.scrollBy(0, 300)")
        try:
            page.click('button[type="submit"]', timeout=2000)
        except:
            page.goto(f"{BASE_URL}/triage-dashboard")
        time.sleep(4)
        
        # Narration about AI processing (8s)
        time.sleep(8)
        
        # Show AI results - PAUSE 4s
        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(2)
        page.evaluate("window.scrollBy(0, 300)")
        time.sleep(2)
        
        # Narration about facilities (8s)
        time.sleep(8)
        
        # Show facility details - PAUSE 4s
        page.evaluate("window.scrollBy(0, 300)")
        time.sleep(4)
        
        # Narration about booking (6s)
        time.sleep(6)
        
        # Book appointment - PAUSE 2s
        try:
            page.click('[data-testid="book-appointment-1"]', timeout=2000)
            time.sleep(2)
            page.keyboard.press('Escape')
        except:
            pass
        time.sleep(2)
        
        # Narration about speed (6s)
        time.sleep(6)
        
        # THE REVOLUTION: AGENTIC AI (90-150s)
        print("[90-150s] AGENTIC AI REVOLUTION...")
        
        # Switch to tablet view - PAUSE 3s
        page.set_viewport_size({'width': 768, 'height': 1024})
        page.goto(f"{BASE_URL}/supervisor-dashboard")
        time.sleep(3)
        
        # Narration about agents (6s)
        time.sleep(6)
        
        # Show AI toggle - PAUSE 3s
        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(3)
        
        # Narration about toggle (5s)
        time.sleep(5)
        
        # Show statistics - PAUSE 3s
        time.sleep(3)
        
        # Narration about stats (8s)
        time.sleep(8)
        
        # Click on case - PAUSE 4s
        try:
            page.click('.cursor-pointer', timeout=2000)
            time.sleep(4)
        except:
            time.sleep(4)
        
        # Narration about 6-level reasoning (12s)
        time.sleep(12)
        
        # Show green indicator - PAUSE 3s
        page.evaluate("window.scrollBy(0, 300)")
        time.sleep(3)
        
        # Narration about auto-approval (5s)
        time.sleep(5)
        
        # Show another case - PAUSE 4s
        page.evaluate("window.scrollTo(0, 0)")
        try:
            cases = page.query_selector_all('.cursor-pointer')
            if len(cases) > 1:
                cases[1].click()
                time.sleep(4)
        except:
            time.sleep(4)
        
        # Narration about escalation (8s)
        time.sleep(8)
        
        # SCALE AND IMPACT (150-175s)
        print("[150-175s] SCALE AND IMPACT...")
        
        # Language demonstration - PAUSE 3s
        page.set_viewport_size({'width': 390, 'height': 844})
        page.goto(BASE_URL)
        time.sleep(3)
        
        # Narration about languages (6s)
        time.sleep(6)
        
        # Provider search - PAUSE 3s
        page.goto(f"{BASE_URL}/provider-search")
        time.sleep(3)
        
        # Narration about search (6s)
        time.sleep(6)
        
        # Show final stats - PAUSE 3s
        page.goto(f"{BASE_URL}/supervisor-dashboard")
        page.set_viewport_size({'width': 768, 'height': 1024})
        time.sleep(3)
        
        # Narration about AWS (6s)
        time.sleep(6)
        
        # Show cost - PAUSE 2s
        time.sleep(2)
        
        # Narration about cost (4s)
        time.sleep(4)
        
        # CLOSING: THE IMPACT (175-180s)
        print("[175-180s] THE IMPACT...")
        
        # Final view - PAUSE 2s
        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(2)
        
        # Narration about impact (3s)
        time.sleep(3)
        
        # Final message - PAUSE 1s
        time.sleep(1)
        
        # Closing (2s)
        time.sleep(2)
        
        print("\n✓ Recording complete!")
        
        context.close()
        browser.close()
        
        # Find and convert video
        video_path = None
        for file in os.listdir("Video/recordings"):
            if file.endswith(".webm"):
                video_path = os.path.join("Video/recordings", file)
                break
        
        if video_path:
            output_path = "Video/Professional_Demo_Raw.mp4"
            print(f"\nConverting to MP4: {output_path}")
            subprocess.run([
                'ffmpeg', '-i', video_path,
                '-c:v', 'libx264',
                '-preset', 'medium',
                '-crf', '23',
                '-vf', 'scale=390:844',
                '-y',
                output_path
            ], capture_output=True)
            
            print(f"\n✓ Raw video ready: {output_path}")
            return output_path
        
        return None

if __name__ == '__main__':
    print("\nRecording professional story-driven demo...")
    print("This will be perfectly synchronized with voiceover.\n")
    print("Press Enter to start...")
    input()
    
    video_path = record_professional_demo()
    
    if video_path:
        print("\n" + "=" * 80)
        print("NEXT STEPS")
        print("=" * 80)
        print("1. Generate voiceover: python Video/generate-professional-voiceover.py")
        print("2. Combine: python Video/combine-professional-demo.py")
