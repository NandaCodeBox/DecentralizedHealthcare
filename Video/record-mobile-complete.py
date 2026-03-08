#!/usr/bin/env python3
"""
Record complete 3-minute mobile demo
Includes supervisor dashboard and Agentic AI features
"""

import time
from playwright.sync_api import sync_playwright
import subprocess
import os

BASE_URL = "http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com"

def record_mobile_demo():
    print("=" * 60)
    print("Recording Mobile Complete Demo (3 minutes)")
    print("Includes: Triage, Supervisor, Agentic AI, Multi-language")
    print("=" * 60)
    
    with sync_playwright() as p:
        # Launch browser with mobile viewport
        browser = p.chromium.launch(headless=False)
        
        # iPhone 12 Pro dimensions
        context = browser.new_context(
            viewport={'width': 390, 'height': 844},
            device_scale_factor=3,
            is_mobile=True,
            has_touch=True,
            record_video_dir="Video/recordings",
            record_video_size={'width': 390, 'height': 844}
        )
        page = context.new_page()
        
        # Segment 1: Patient Login & Symptom Tiles (0-50s)
        print("\n[0-50s] Patient Login & Symptom Selection...")
        page.goto(BASE_URL)
        time.sleep(3)
        
        # Show homepage
        page.evaluate("window.scrollBy(0, 200)")
        time.sleep(2)
        
        # Change to Hindi
        page.click('button:has-text("English")')
        time.sleep(1)
        page.click('button:has-text("हिंदी")')
        time.sleep(2)
        
        # Click "Tell us your symptoms"
        page.click('a[href="/symptom-intake"]')
        time.sleep(2)
        
        # Click symptom tiles
        page.click('[data-testid="symptom-chest_pain"]')
        time.sleep(1)
        page.click('[data-testid="symptom-shortness_of_breath"]')
        time.sleep(1)
        page.click('[data-testid="symptom-fever"]')
        time.sleep(2)
        
        # Scroll to show selected symptoms
        page.evaluate("window.scrollBy(0, 300)")
        time.sleep(2)
        
        # Select severity
        page.click('button:has-text("Severe")')
        time.sleep(1)
        
        # Scroll to duration
        page.evaluate("window.scrollBy(0, 300)")
        time.sleep(1)
        
        # Select duration
        page.select_option('select', '1_3_days')
        time.sleep(2)
        
        # Scroll to submit
        page.evaluate("window.scrollBy(0, 300)")
        time.sleep(2)
        
        # Submit form
        page.click('button[type="submit"]')
        time.sleep(4)  # Wait for AI processing
        
        # Segment 2: Triage Results & Appointment Booking (50-90s)
        print("[50-90s] AI Triage Results & Booking...")
        
        # Show AI confidence score
        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(2)
        
        # Scroll to show severity
        page.evaluate("window.scrollBy(0, 300)")
        time.sleep(2)
        
        # Scroll to show recommended facilities
        page.evaluate("window.scrollBy(0, 300)")
        time.sleep(3)
        
        # Click "Book Appointment" on first facility
        try:
            page.click('[data-testid="book-appointment-1"]')
            time.sleep(2)
            
            # Fill booking form
            page.fill('input[type="date"]', '2026-03-15')
            time.sleep(1)
            page.select_option('select', '09:00')
            time.sleep(1)
            page.fill('input[type="tel"]', '+91 98765 43210')
            time.sleep(2)
            
            # Submit booking
            page.click('button[type="submit"]')
            time.sleep(2)
            
            # Close confirmation
            page.keyboard.press('Escape')
            time.sleep(1)
        except:
            print("   ⚠ Could not complete booking flow")
        
        # Scroll to show alternative options
        page.evaluate("window.scrollBy(0, 300)")
        time.sleep(2)
        
        # Segment 3: Supervisor Dashboard - Desktop View (90-140s)
        print("[90-140s] Supervisor Dashboard with Agentic AI...")
        
        # Switch to tablet/desktop view for supervisor
        page.set_viewport_size({'width': 1024, 'height': 768})
        time.sleep(1)
        
        page.goto(f"{BASE_URL}/supervisor-dashboard")
        time.sleep(3)
        
        # Show Agentic AI toggle
        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(2)
        
        # Show statistics
        time.sleep(2)
        
        # Click on first case
        page.click('.cursor-pointer')
        time.sleep(3)
        
        # Scroll to show AI reasoning
        page.evaluate("window.scrollBy(0, 300)")
        time.sleep(3)
        
        # Scroll to show decision indicator
        page.evaluate("window.scrollBy(0, 300)")
        time.sleep(3)
        
        # Go back to list
        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(1)
        
        # Click on another case
        cases = page.query_selector_all('.cursor-pointer')
        if len(cases) > 1:
            cases[1].click()
            time.sleep(3)
            
            # Show AI analysis
            page.evaluate("window.scrollBy(0, 300)")
            time.sleep(3)
        
        # Show statistics again
        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(2)
        
        # Segment 4: Mobile - Multi-language & Provider Search (140-170s)
        print("[140-170s] Mobile Multi-language & Provider Search...")
        
        # Back to mobile view
        page.set_viewport_size({'width': 390, 'height': 844})
        time.sleep(1)
        
        # Change to Tamil
        page.goto(BASE_URL)
        time.sleep(1)
        page.click('button:has-text("हिंदी")')
        time.sleep(1)
        page.click('button:has-text("தமிழ்")')
        time.sleep(2)
        
        # Go to provider search
        page.goto(f"{BASE_URL}/provider-search")
        time.sleep(2)
        
        # Search for providers
        page.fill('input[type="text"]', 'Cardiologist')
        time.sleep(1)
        page.click('button')
        time.sleep(2)
        
        # Scroll to show results
        page.evaluate("window.scrollBy(0, 300)")
        time.sleep(2)
        
        # Change to Telugu
        page.click('button:has-text("தமிழ்")')
        time.sleep(1)
        page.click('button:has-text("తెలుగు")')
        time.sleep(2)
        
        # Segment 5: Final Statistics & Impact (170-180s)
        print("[170-180s] Final Statistics & Impact...")
        
        # Change back to English
        page.click('button:has-text("తెలుగు")')
        time.sleep(1)
        page.click('button:has-text("English")')
        time.sleep(1)
        
        # Go to supervisor dashboard for final stats
        page.goto(f"{BASE_URL}/supervisor-dashboard")
        time.sleep(2)
        
        # Show final statistics
        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(2)
        
        # Show AI toggle and stats
        time.sleep(2)
        
        # Scroll to show cases
        page.evaluate("window.scrollBy(0, 300)")
        time.sleep(2)
        
        print("\n✓ Recording complete!")
        print("   Flow: Login → Language → Symptoms → Form → Triage → Booking → Supervisor → AI")
        
        context.close()
        browser.close()
        
        # Find and convert video
        video_path = None
        for file in os.listdir("Video/recordings"):
            if file.endswith(".webm"):
                video_path = os.path.join("Video/recordings", file)
                break
        
        if video_path:
            output_path = "Video/Arogya_AI_Mobile_Complete_Raw.mp4"
            print(f"\nConverting to MP4: {output_path}")
            subprocess.run([
                'ffmpeg', '-i', video_path,
                '-c:v', 'libx264',
                '-preset', 'medium',
                '-crf', '23',
                '-vf', 'scale=390:844',
                '-y',
                output_path
            ])
            
            print(f"\n✓ Raw video ready: {output_path}")
            return output_path
        
        return None

if __name__ == '__main__':
    video_path = record_mobile_demo()
    
    if video_path:
        print("\n" + "=" * 60)
        print("Next Steps:")
        print("=" * 60)
        print("1. Generate voiceover: python Video/generate-mobile-voiceover.py")
        print("2. Combine: python Video/combine-mobile-complete.py")
