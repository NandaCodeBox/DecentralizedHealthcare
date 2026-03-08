#!/usr/bin/env python3
"""
Record 3-minute demo video matching the voiceover timing
Fast-paced to cover all use cases
"""

import time
from playwright.sync_api import sync_playwright
import subprocess
import os

BASE_URL = "http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com"

def record_demo():
    print("=" * 60)
    print("Recording 3-Minute Complete Demo")
    print("=" * 60)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            record_video_dir="Video/recordings",
            record_video_size={'width': 1920, 'height': 1080}
        )
        page = context.new_page()
        
        # Segment 1: Homepage & Triage (0-30s)
        print("\n[0-30s] Homepage and Triage System...")
        page.goto(BASE_URL)
        time.sleep(2)
        
        page.goto(f"{BASE_URL}/triage-dashboard")
        time.sleep(2)
        
        # Quick form fill
        page.fill('input[placeholder*="name" i]', 'Rajesh Kumar')
        page.fill('input[type="number"]', '45')
        time.sleep(1)
        page.fill('textarea', 'Chest pain, shortness of breath, sweating')
        time.sleep(2)
        page.evaluate("window.scrollBy(0, 400)")
        time.sleep(2)
        
        # Segment 2: Supervisor Dashboard - Agentic AI (30-90s)
        print("[30-90s] Supervisor Dashboard with Agentic AI...")
        page.goto(f"{BASE_URL}/supervisor-dashboard")
        time.sleep(3)
        
        # Show AI toggle
        time.sleep(2)
        
        # Click first case
        page.click('.cursor-pointer')
        time.sleep(3)
        
        # Scroll to show AI reasoning
        page.evaluate("window.scrollBy(0, 300)")
        time.sleep(3)
        
        # Show statistics
        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(2)
        
        # Click another case
        cases = page.query_selector_all('.cursor-pointer')
        if len(cases) > 1:
            cases[1].click()
            time.sleep(3)
        
        # Segment 3: Provider Search & AI Search (90-120s)
        print("[90-120s] Provider Search and AI Features...")
        page.goto(f"{BASE_URL}/provider-search")
        time.sleep(2)
        
        page.fill('input[type="text"]', 'Cardiologist')
        time.sleep(1)
        page.click('button:has-text("Search")')
        time.sleep(3)
        
        # Show provider details
        page.evaluate("window.scrollBy(0, 300)")
        time.sleep(2)
        
        # Segment 4: Language Support (120-140s)
        print("[120-140s] Multi-language Support...")
        page.click('button:has-text("English")')
        time.sleep(1)
        page.click('button:has-text("हिंदी")')
        time.sleep(2)
        
        page.goto(f"{BASE_URL}/triage-dashboard")
        time.sleep(2)
        
        page.click('button:has-text("हिंदी")')
        time.sleep(1)
        page.click('button:has-text("தமிழ்")')
        time.sleep(2)
        
        # Segment 5: Mobile View (140-160s)
        print("[140-160s] Mobile Responsive Design...")
        page.set_viewport_size({'width': 375, 'height': 812})
        page.goto(BASE_URL)
        time.sleep(2)
        
        page.goto(f"{BASE_URL}/triage-dashboard")
        time.sleep(2)
        
        page.evaluate("window.scrollBy(0, 300)")
        time.sleep(2)
        
        # Segment 6: Back to Supervisor - Final Stats (160-180s)
        print("[160-180s] Final Statistics and Impact...")
        page.set_viewport_size({'width': 1920, 'height': 1080})
        page.goto(f"{BASE_URL}/supervisor-dashboard")
        time.sleep(3)
        
        # Highlight statistics
        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(2)
        
        # Show multiple cases
        page.evaluate("window.scrollBy(0, 400)")
        time.sleep(2)
        
        print("\n✓ Recording complete (3 minutes)!")
        
        context.close()
        browser.close()
        
        # Find and convert video
        video_path = None
        for file in os.listdir("Video/recordings"):
            if file.endswith(".webm"):
                video_path = os.path.join("Video/recordings", file)
                break
        
        if video_path:
            output_path = "Video/Arogya_AI_Complete_Demo_Raw.mp4"
            print(f"\nConverting to MP4: {output_path}")
            subprocess.run([
                'ffmpeg', '-i', video_path,
                '-c:v', 'libx264',
                '-preset', 'medium',
                '-crf', '23',
                '-y',
                output_path
            ])
            
            print(f"\n✓ Raw video ready: {output_path}")
            return output_path
        
        return None

if __name__ == '__main__':
    video_path = record_demo()
    
    if video_path:
        print("\n" + "=" * 60)
        print("Next: Combine with voiceover")
        print("=" * 60)
        print("Run: python Video/combine-complete-demo.py")
