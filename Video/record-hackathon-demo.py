#!/usr/bin/env python3
"""
Record Hackathon Demo - 3 Minutes with Story-Driven Flow
Emphasizes Problem Statement → Solution → Impact
Mobile view for Patient, Supervisor, and Agentic AI use cases
"""

import time
from playwright.sync_api import sync_playwright
import subprocess
import os

BASE_URL = "http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com"

def record_hackathon_demo():
    print("=" * 80)
    print("RECORDING HACKATHON DEMO - 3 MINUTES")
    print("Story: Problem → Solution → Impact")
    print("=" * 80)
    
    with sync_playwright() as p:
        # Launch browser with mobile viewport (iPhone 12 Pro)
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
        
        # SEGMENT 1: THE PROBLEM (0-30s)
        print("\n[0-30s] THE PROBLEM - Rajesh's Story...")
        
        # Show a static problem statement screen (homepage with text overlay concept)
        page.goto(BASE_URL)
        time.sleep(3)
        
        # Scroll to show emergency banner
        page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        time.sleep(3)
        
        # Scroll back up
        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(2)
        
        # Show the challenge - scroll through homepage
        page.evaluate("window.scrollBy(0, 300)")
        time.sleep(2)
        page.evaluate("window.scrollBy(0, 300)")
        time.sleep(2)
        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(3)
        
        # SEGMENT 2: THE SOLUTION - PATIENT JOURNEY (30-75s)
        print("[30-75s] THE SOLUTION - Patient Journey...")
        
        # Change to Hindi
        print("  → Selecting Hindi language...")
        try:
            page.click('button:has-text("English")', timeout=5000)
            time.sleep(1)
            page.click('button:has-text("हिंदी")')
            time.sleep(2)
        except:
            print("  ⚠ Language selector not found")
        
        # Click "Tell us your symptoms"
        print("  → Opening symptom intake...")
        try:
            page.click('a[href="/symptom-intake"]', timeout=5000)
            time.sleep(2)
        except:
            # Alternative: navigate directly
            page.goto(f"{BASE_URL}/symptom-intake")
            time.sleep(2)
        
        # Click symptom tiles
        print("  → Selecting symptoms...")
        try:
            page.click('[data-testid="symptom-chest_pain"]', timeout=3000)
            time.sleep(1)
        except:
            print("  ⚠ Chest pain tile not found, continuing...")
        
        try:
            page.click('[data-testid="symptom-shortness_of_breath"]', timeout=3000)
            time.sleep(1)
        except:
            print("  ⚠ Shortness of breath tile not found, continuing...")
        
        try:
            page.click('[data-testid="symptom-fever"]', timeout=3000)
            time.sleep(2)
        except:
            print("  ⚠ Fever tile not found, continuing...")
        
        # Scroll to show selected symptoms
        page.evaluate("window.scrollBy(0, 300)")
        time.sleep(2)
        
        # Select severity - Severe
        print("  → Setting severity to Severe...")
        try:
            page.click('button:has-text("Severe")', timeout=3000)
            time.sleep(1)
        except:
            print("  ⚠ Severity button not found, continuing...")
        
        # Scroll to duration
        page.evaluate("window.scrollBy(0, 300)")
        time.sleep(1)
        
        # Select duration
        print("  → Selecting duration...")
        try:
            page.select_option('select', '1_3_days', timeout=3000)
            time.sleep(1)
        except:
            print("  ⚠ Duration selector not found, continuing...")
        
        # Scroll to submit button
        page.evaluate("window.scrollBy(0, 300)")
        time.sleep(2)
        
        # Submit form
        print("  → Submitting for AI analysis...")
        page.click('button[type="submit"]')
        time.sleep(4)  # Wait for AI processing
        
        # TRIAGE RESULTS
        print("  → Viewing AI triage results...")
        # Show AI confidence score
        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(3)
        
        # Scroll to show severity
        page.evaluate("window.scrollBy(0, 300)")
        time.sleep(2)
        
        # Scroll to show recommended facilities
        page.evaluate("window.scrollBy(0, 300)")
        time.sleep(3)
        
        # Click "Book Appointment"
        print("  → Booking appointment...")
        try:
            page.click('[data-testid="book-appointment-1"]')
            time.sleep(2)
            
            # Fill booking form quickly
            page.fill('input[type="date"]', '2026-03-15')
            time.sleep(0.5)
            page.select_option('select', '09:00')
            time.sleep(0.5)
            page.fill('input[type="tel"]', '+91 98765 43210')
            time.sleep(1)
            
            # Submit booking
            page.click('button[type="submit"]')
            time.sleep(2)
            
            # Close modal
            page.keyboard.press('Escape')
            time.sleep(1)
        except:
            print("  ⚠ Booking flow skipped")
        
        # SEGMENT 3: SUPERVISOR & AGENTIC AI (75-135s)
        print("[75-135s] SUPERVISOR & AGENTIC AI...")
        
        # Switch to tablet view for better supervisor dashboard visibility
        page.set_viewport_size({'width': 768, 'height': 1024})
        time.sleep(1)
        
        print("  → Opening supervisor dashboard...")
        page.goto(f"{BASE_URL}/supervisor-dashboard")
        time.sleep(3)
        
        # Show Agentic AI toggle at top
        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(3)
        
        # Show statistics
        print("  → Showing AI statistics...")
        time.sleep(3)
        
        # Scroll to show cases
        page.evaluate("window.scrollBy(0, 300)")
        time.sleep(2)
        
        # Click on first case (Rajesh - auto-approved)
        print("  → Viewing auto-approved case...")
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
        time.sleep(2)
        
        # Click on another case (escalated for human review)
        print("  → Viewing escalated case...")
        cases = page.query_selector_all('.cursor-pointer')
        if len(cases) > 1:
            cases[1].click()
            time.sleep(3)
            
            # Show AI analysis
            page.evaluate("window.scrollBy(0, 300)")
            time.sleep(3)
            
            # Show decision indicator
            page.evaluate("window.scrollBy(0, 300)")
            time.sleep(2)
        
        # Back to top to show statistics again
        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(2)
        
        # SEGMENT 4: MULTI-LANGUAGE & SCALE (135-165s)
        print("[135-165s] MULTI-LANGUAGE & SCALE...")
        
        # Back to mobile view
        page.set_viewport_size({'width': 390, 'height': 844})
        time.sleep(1)
        
        # Go to homepage
        page.goto(BASE_URL)
        time.sleep(2)
        
        # Cycle through languages
        print("  → Demonstrating multi-language support...")
        
        # Tamil
        try:
            page.click('button:has-text("हिंदी")', timeout=3000)
            time.sleep(1)
            page.click('button:has-text("தமிழ்")', timeout=3000)
            time.sleep(2)
        except:
            print("  ⚠ Tamil language not available, continuing...")
        
        # Show symptom intake in Tamil
        try:
            page.click('a[href="/symptom-intake"]', timeout=3000)
            time.sleep(2)
        except:
            page.goto(f"{BASE_URL}/symptom-intake")
            time.sleep(2)
        
        page.evaluate("window.scrollBy(0, 300)")
        time.sleep(1)
        
        # Telugu
        try:
            page.click('button:has-text("தமிழ்")', timeout=3000)
            time.sleep(1)
            page.click('button:has-text("తెలుగు")', timeout=3000)
            time.sleep(2)
        except:
            print("  ⚠ Telugu language not available, continuing...")
        
        # Bengali
        try:
            page.click('button:has-text("తెలుగు")', timeout=3000)
            time.sleep(1)
            page.click('button:has-text("বাংলা")', timeout=3000)
            time.sleep(2)
        except:
            print("  ⚠ Bengali language not available, continuing...")
        
        # Provider Search
        print("  → Showing AI-powered provider search...")
        try:
            page.click('button:has-text("বাংলা")', timeout=3000)
            time.sleep(1)
            page.click('button:has-text("English")', timeout=3000)
            time.sleep(1)
        except:
            print("  ⚠ Language selector not available, continuing...")
        
        page.goto(f"{BASE_URL}/provider-search")
        time.sleep(2)
        
        # Search for cardiologist
        page.fill('input[type="text"]', 'Cardiologist')
        time.sleep(1)
        page.click('button')
        time.sleep(2)
        
        # Scroll to show results
        page.evaluate("window.scrollBy(0, 300)")
        time.sleep(2)
        
        # SEGMENT 5: THE IMPACT (165-180s)
        print("[165-180s] THE IMPACT...")
        
        # Back to supervisor dashboard for final impact
        page.goto(f"{BASE_URL}/supervisor-dashboard")
        time.sleep(2)
        
        # Show final statistics
        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(3)
        
        # Scroll to show cases
        page.evaluate("window.scrollBy(0, 300)")
        time.sleep(2)
        
        # Scroll to show more impact
        page.evaluate("window.scrollBy(0, 300)")
        time.sleep(2)
        
        # Final view - back to top
        page.evaluate("window.scrollTo(0, 0)")
        time.sleep(3)
        
        print("\n✓ Recording complete!")
        print("   Story: Problem → Patient Journey → Agentic AI → Multi-language → Impact")
        
        context.close()
        browser.close()
        
        # Find and convert video
        video_path = None
        for file in os.listdir("Video/recordings"):
            if file.endswith(".webm"):
                video_path = os.path.join("Video/recordings", file)
                break
        
        if video_path:
            output_path = "Video/Hackathon_Demo_Raw.mp4"
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
    print("\n" + "=" * 80)
    print("HACKATHON DEMO RECORDING")
    print("=" * 80)
    print("\nThis will record a 3-minute story-driven demo:")
    print("  1. The Problem (0-30s)")
    print("  2. Patient Journey (30-75s)")
    print("  3. Supervisor & Agentic AI (75-135s)")
    print("  4. Multi-language & Scale (135-165s)")
    print("  5. The Impact (165-180s)")
    print("\nPress Enter to start recording...")
    input()
    
    video_path = record_hackathon_demo()
    
    if video_path:
        print("\n" + "=" * 80)
        print("NEXT STEPS")
        print("=" * 80)
        print("1. Generate voiceover:")
        print("   python Video/generate-hackathon-voiceover.py")
        print("\n2. Combine video + audio:")
        print("   python Video/combine-hackathon-demo.py")
        print("\n3. Final video will be: Video/Hackathon_Demo_Final.mp4")
