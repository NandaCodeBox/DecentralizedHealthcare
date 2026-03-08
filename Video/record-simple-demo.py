#!/usr/bin/env python3
"""
Simple robust recording - Mobile for patient, Desktop for supervisor
Handles errors gracefully and continues recording
"""

from playwright.sync_api import sync_playwright
import time
import os
import shutil

def safe_click(page, selector, description="element"):
    """Try to click, continue if fails"""
    try:
        page.click(selector, timeout=5000)
        return True
    except:
        print(f"    (Skipped: {description})")
        return False

def safe_fill(page, selector, value, description="field"):
    """Try to fill, continue if fails"""
    try:
        page.fill(selector, value, timeout=5000)
        return True
    except:
        print(f"    (Skipped: {description})")
        return False

def record_demo():
    print("=" * 80)
    print("RECORDING DEMO - Mobile + Desktop")
    print("=" * 80)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        
        # ============================================================
        # PART 1: PATIENT - MOBILE VIEW
        # ============================================================
        print("\n[PART 1] Patient Journey - Mobile (390x844)")
        
        mobile_context = browser.new_context(
            viewport={'width': 390, 'height': 844},
            record_video_dir='Video/',
            record_video_size={'width': 390, 'height': 844}
        )
        
        page = mobile_context.new_page()
        
        print("  → Homepage...")
        page.goto('http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com')
        time.sleep(3)
        
        page.evaluate('window.scrollBy(0, 400)')
        time.sleep(2)
        
        print("  → Login page...")
        page.goto('http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com/login')
        time.sleep(2)
        
        print("  → Logging in...")
        safe_fill(page, 'input[type="email"]', 'patient@arogya.ai', 'email')
        time.sleep(1)
        safe_fill(page, 'input[type="password"]', 'PatientPass123!', 'password')
        time.sleep(1)
        safe_click(page, 'button[type="submit"]', 'submit button')
        time.sleep(4)
        
        print("  → Dashboard...")
        time.sleep(3)
        page.evaluate('window.scrollBy(0, 300)')
        time.sleep(2)
        
        print("  → Symptom intake...")
        # Try multiple ways to get to symptom intake
        if not safe_click(page, 'text=Tell us your symptoms', 'symptom link'):
            if not safe_click(page, 'a[href*="symptom"]', 'symptom href'):
                page.goto('http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com/symptom-intake')
        time.sleep(3)
        
        print("  → Selecting symptoms...")
        safe_click(page, 'text=Chest Pain', 'chest pain')
        time.sleep(2)
        safe_click(page, 'text=Fever', 'fever')
        time.sleep(2)
        
        page.evaluate('window.scrollBy(0, 300)')
        time.sleep(2)
        
        print("  → Submitting...")
        safe_click(page, 'button[type="submit"]', 'submit')
        time.sleep(5)
        
        print("  → Results...")
        page.evaluate('window.scrollBy(0, 400)')
        time.sleep(3)
        page.evaluate('window.scrollBy(0, 400)')
        time.sleep(3)
        
        print("  ✓ Mobile recording complete")
        
        # Save mobile video
        page.close()
        video_path = page.video.path()
        mobile_context.close()
        
        if video_path and os.path.exists(video_path):
            shutil.move(video_path, 'Video/Patient_Mobile_Raw.webm')
            print("  ✓ Saved: Video/Patient_Mobile_Raw.webm")
        
        # ============================================================
        # PART 2: SUPERVISOR - DESKTOP VIEW
        # ============================================================
        print("\n[PART 2] Supervisor Dashboard - Desktop (1920x1080)")
        
        desktop_context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            record_video_dir='Video/',
            record_video_size={'width': 1920, 'height': 1080}
        )
        
        page = desktop_context.new_page()
        
        print("  → Homepage...")
        page.goto('http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com')
        time.sleep(2)
        
        print("  → Login page...")
        page.goto('http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com/login')
        time.sleep(2)
        
        print("  → Logging in as supervisor...")
        safe_fill(page, 'input[type="email"]', 'supervisor@arogya.ai', 'email')
        time.sleep(1)
        safe_fill(page, 'input[type="password"]', 'SupervisorPass123!', 'password')
        time.sleep(1)
        safe_click(page, 'button[type="submit"]', 'submit')
        time.sleep(4)
        
        print("  → Supervisor dashboard...")
        time.sleep(3)
        
        print("  → Showing AI toggle...")
        try:
            page.hover('[class*="toggle"]', timeout=3000)
        except:
            pass
        time.sleep(3)
        
        print("  → Scrolling dashboard...")
        page.evaluate('window.scrollBy(0, 300)')
        time.sleep(3)
        
        print("  → Viewing case...")
        safe_click(page, 'tbody tr:first-child', 'first case')
        time.sleep(4)
        
        page.evaluate('window.scrollBy(0, 400)')
        time.sleep(3)
        
        print("  → Back to dashboard...")
        page.go_back()
        time.sleep(3)
        
        print("  → Another case...")
        safe_click(page, 'tbody tr:nth-child(2)', 'second case')
        time.sleep(3)
        
        page.evaluate('window.scrollBy(0, 400)')
        time.sleep(3)
        
        print("  → Final view...")
        page.go_back()
        time.sleep(2)
        
        page.evaluate('window.scrollBy(0, 300)')
        time.sleep(3)
        
        print("  ✓ Desktop recording complete")
        
        # Save desktop video
        page.close()
        video_path = page.video.path()
        desktop_context.close()
        
        if video_path and os.path.exists(video_path):
            shutil.move(video_path, 'Video/Supervisor_Desktop_Raw.webm')
            print("  ✓ Saved: Video/Supervisor_Desktop_Raw.webm")
        
        browser.close()
        
        print("\n" + "=" * 80)
        print("RECORDING COMPLETE!")
        print("=" * 80)
        print("\nFiles:")
        print("  1. Video/Patient_Mobile_Raw.webm")
        print("  2. Video/Supervisor_Desktop_Raw.webm")
        print("\nNext: Generate voiceover and combine")

if __name__ == '__main__':
    print("\nStarting in 3 seconds...\n")
    time.sleep(3)
    record_demo()
