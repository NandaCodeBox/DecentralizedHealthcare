#!/usr/bin/env python3
"""
Record 3-minute hackathon demo
- Patient journey: MOBILE VIEW (390x844)
- Supervisor dashboard: DESKTOP VIEW (1920x1080)
"""

from playwright.sync_api import sync_playwright
import time

def record_demo():
    print("=" * 80)
    print("RECORDING 3-MINUTE HACKATHON DEMO")
    print("Patient: Mobile View | Supervisor: Desktop View")
    print("=" * 80)
    
    with sync_playwright() as p:
        # Launch browser
        browser = p.chromium.launch(headless=False)
        
        # ============================================================
        # PART 1: PATIENT JOURNEY - MOBILE VIEW (0-90s)
        # ============================================================
        print("\n[PART 1] Patient Journey - Mobile View")
        
        # Create mobile context (iPhone 12 Pro size) with video recording
        mobile_context = browser.new_context(
            viewport={'width': 390, 'height': 844},
            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
            record_video_dir='Video/',
            record_video_size={'width': 390, 'height': 844}
        )
        
        page = mobile_context.new_page()
        
        print("  → Opening homepage...")
        page.goto('http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com')
        time.sleep(3)  # Show homepage
        
        print("  → Scrolling homepage...")
        page.evaluate('window.scrollBy(0, 300)')
        time.sleep(2)
        page.evaluate('window.scrollBy(0, 300)')
        time.sleep(2)
        
        print("  → Navigating to login...")
        page.goto('http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com/login')
        time.sleep(2)
        
        print("  → Logging in as patient...")
        page.fill('input[type="email"]', 'patient@arogya.ai')
        time.sleep(1)
        page.fill('input[type="password"]', 'PatientPass123!')
        time.sleep(1)
        page.click('button:has-text("Sign In")')
        time.sleep(4)
        
        print("  → Selecting language (Hindi)...")
        page.click('text=हिंदी')
        time.sleep(3)
        
        print("  → Navigating to symptom intake...")
        page.click('text=Tell us your symptoms')
        time.sleep(3)
        
        print("  → Selecting symptom tiles...")
        page.click('text=Chest Pain')
        time.sleep(2)
        page.click('text=Shortness of Breath')
        time.sleep(2)
        page.click('text=Fever')
        time.sleep(2)
        
        print("  → Scrolling form...")
        page.evaluate('window.scrollBy(0, 200)')
        time.sleep(2)
        
        print("  → Selecting severity...")
        page.click('select[name="severity"]')
        time.sleep(1)
        page.select_option('select[name="severity"]', 'severe')
        time.sleep(2)
        
        print("  → Submitting form...")
        page.click('button:has-text("Submit")')
        time.sleep(5)  # AI processing
        
        print("  → Showing triage results...")
        page.evaluate('window.scrollBy(0, 300)')
        time.sleep(3)
        
        print("  → Viewing facility recommendations...")
        page.evaluate('window.scrollBy(0, 300)')
        time.sleep(3)
        
        print("  → Booking appointment...")
        page.click('button:has-text("Book Appointment")')
        time.sleep(3)
        
        page.fill('input[name="date"]', '2026-03-10')
        time.sleep(1)
        page.fill('input[name="time"]', '10:00')
        time.sleep(1)
        page.fill('input[name="phone"]', '9876543210')
        time.sleep(1)
        page.click('button:has-text("Confirm")')
        time.sleep(3)
        
        print("  → Patient journey complete!")
        
        # Close mobile context (video saved automatically)
        page.close()
        video_path = page.video.path()
        mobile_context.close()
        
        # Rename video file
        import shutil
        if video_path and os.path.exists(video_path):
            shutil.move(video_path, 'Video/Patient_Mobile_Raw.webm')
            print(f"  ✓ Saved: Video/Patient_Mobile_Raw.webm")
        
        # ============================================================
        # PART 2: SUPERVISOR DASHBOARD - DESKTOP VIEW (90-180s)
        # ============================================================
        print("\n[PART 2] Supervisor Dashboard - Desktop View")
        
        # Create desktop context (Full HD) with video recording
        desktop_context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            record_video_dir='Video/',
            record_video_size={'width': 1920, 'height': 1080}
        )
        
        page = desktop_context.new_page()
        
        print("  → Opening homepage...")
        page.goto('http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com')
        time.sleep(2)
        
        print("  → Navigating to login...")
        page.goto('http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com/login')
        time.sleep(2)
        
        print("  → Logging in as supervisor...")
        page.fill('input[type="email"]', 'supervisor@arogya.ai')
        time.sleep(1)
        page.fill('input[type="password"]', 'SupervisorPass123!')
        time.sleep(1)
        page.click('button:has-text("Sign In")')
        time.sleep(4)
        
        print("  → Showing supervisor dashboard...")
        time.sleep(3)
        
        print("  → Highlighting Agentic AI toggle...")
        # Hover over AI toggle
        try:
            page.hover('text=Agentic AI')
            time.sleep(3)
        except:
            time.sleep(3)
        
        print("  → Showing statistics...")
        page.evaluate('window.scrollBy(0, 200)')
        time.sleep(3)
        
        print("  → Clicking on case...")
        try:
            page.click('tr:has-text("Rajesh Kumar")')
            time.sleep(4)
        except:
            page.click('tbody tr:first-child')
            time.sleep(4)
        
        print("  → Showing 6-level reasoning...")
        page.evaluate('window.scrollBy(0, 300)')
        time.sleep(4)
        
        print("  → Showing auto-approval indicator...")
        time.sleep(3)
        
        print("  → Going back to dashboard...")
        page.go_back()
        time.sleep(3)
        
        print("  → Showing another case (escalated)...")
        try:
            page.click('tbody tr:nth-child(2)')
            time.sleep(3)
        except:
            time.sleep(3)
        
        print("  → Scrolling to show escalation...")
        page.evaluate('window.scrollBy(0, 300)')
        time.sleep(3)
        
        print("  → Going back to dashboard...")
        page.go_back()
        time.sleep(2)
        
        print("  → Showing language selector...")
        try:
            page.click('select[name="language"]')
            time.sleep(2)
            page.select_option('select[name="language"]', 'ta')
            time.sleep(2)
        except:
            time.sleep(2)
        
        print("  → Showing provider search...")
        try:
            page.click('text=Find Provider')
            time.sleep(2)
            page.fill('input[placeholder*="Search"]', 'heart specialist')
            time.sleep(3)
        except:
            time.sleep(3)
        
        print("  → Final dashboard view...")
        time.sleep(3)
        
        print("  → Supervisor dashboard complete!")
        
        # Close desktop context (video saved automatically)
        page.close()
        video_path = page.video.path()
        desktop_context.close()
        
        # Rename video file
        if video_path and os.path.exists(video_path):
            shutil.move(video_path, 'Video/Supervisor_Desktop_Raw.webm')
            print(f"  ✓ Saved: Video/Supervisor_Desktop_Raw.webm")
        
        browser.close()
        
        print("\n" + "=" * 80)
        print("RECORDING COMPLETE!")
        print("=" * 80)
        print("\nFiles created:")
        print("  1. Video/Patient_Mobile_Raw.webm (mobile view)")
        print("  2. Video/Supervisor_Desktop_Raw.webm (desktop view)")
        print("\nNext: Combine with voiceover")

if __name__ == '__main__':
    print("\nStarting recording in 3 seconds...")
    print("Make sure the application is accessible!\n")
    time.sleep(3)
    
    record_demo()
