#!/usr/bin/env python3
"""
Complete 3-Minute Demo - Mobile + Desktop + Multilingual
Shows all features, Agentic AI, and problem-solving approach
"""

from playwright.sync_api import sync_playwright
import time
import os
import shutil

def safe_action(page, action, *args, description="action", **kwargs):
    """Execute action safely, continue if fails"""
    try:
        kwargs['timeout'] = kwargs.get('timeout', 5000)
        result = action(*args, **kwargs)
        return True
    except Exception as e:
        print(f"    (Skipped: {description})")
        return False

def record_demo():
    print("=" * 80)
    print("COMPLETE 3-MINUTE DEMO")
    print("Mobile (Patient + Multilingual) + Desktop (Supervisor + Agentic AI)")
    print("=" * 80)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        
        # ============================================================
        # PART 1: PATIENT JOURNEY - MOBILE VIEW (0-90s)
        # ============================================================
        print("\n[PART 1] Patient Journey - Mobile View (390x844)")
        print("Showing: Multilingual, Symptom Intake, AI Triage, Booking")
        
        mobile_context = browser.new_context(
            viewport={'width': 390, 'height': 844},
            record_video_dir='Video/',
            record_video_size={'width': 390, 'height': 844}
        )
        
        page = mobile_context.new_page()
        
        # Homepage
        print("\n  → Homepage (Emergency Banner)...")
        page.goto('http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com')
        time.sleep(3)
        
        page.evaluate('window.scrollBy(0, 400)')
        time.sleep(2)
        
        # Login
        print("  → Login as Patient...")
        page.goto('http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com/login')
        time.sleep(2)
        
        safe_action(page, page.fill, 'input[type="email"]', 'patient@arogya.ai', description='email')
        time.sleep(1)
        safe_action(page, page.fill, 'input[type="password"]', 'PatientPass123!', description='password')
        time.sleep(1)
        safe_action(page, page.click, 'button[type="submit"]', description='login button')
        time.sleep(4)
        
        # Language Selection - Show Multiple Languages
        print("  → Language Selection (Multilingual)...")
        time.sleep(2)
        
        # Try to show language selector
        if safe_action(page, page.click, 'select[name="language"]', description='language dropdown'):
            time.sleep(2)
            # Show Hindi
            safe_action(page, page.select_option, 'select[name="language"]', 'hi', description='Hindi')
            time.sleep(2)
            # Show Tamil
            safe_action(page, page.select_option, 'select[name="language"]', 'ta', description='Tamil')
            time.sleep(2)
            # Show English
            safe_action(page, page.select_option, 'select[name="language"]', 'en', description='English')
            time.sleep(2)
        
        # Dashboard
        print("  → Patient Dashboard...")
        page.evaluate('window.scrollBy(0, 300)')
        time.sleep(2)
        
        # Symptom Intake
        print("  → Symptom Intake (Symptom Tiles)...")
        if not safe_action(page, page.click, 'text=Tell us your symptoms', description='symptom link'):
            if not safe_action(page, page.click, 'a[href*="symptom"]', description='symptom href'):
                page.goto('http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com/symptom-intake')
        time.sleep(3)
        
        # Click Symptom Tiles
        print("  → Selecting Symptom Tiles...")
        safe_action(page, page.click, 'text=Chest Pain', description='chest pain tile')
        time.sleep(2)
        safe_action(page, page.click, 'text=Shortness of Breath', description='breathing tile')
        time.sleep(2)
        safe_action(page, page.click, 'text=Fever', description='fever tile')
        time.sleep(2)
        
        # Scroll and fill form
        print("  → Filling Symptom Details...")
        page.evaluate('window.scrollBy(0, 300)')
        time.sleep(2)
        
        # Severity
        if safe_action(page, page.click, 'select[name="severity"]', description='severity dropdown'):
            time.sleep(1)
            safe_action(page, page.select_option, 'select[name="severity"]', 'severe', description='severe option')
            time.sleep(2)
        
        # Submit
        print("  → Submitting for AI Analysis...")
        safe_action(page, page.click, 'button[type="submit"]', description='submit button')
        time.sleep(5)  # AI processing
        
        # Triage Results
        print("  → AI Triage Results (94% Confidence)...")
        page.evaluate('window.scrollBy(0, 400)')
        time.sleep(3)
        
        # Facility Recommendations
        print("  → Facility Recommendations (95% Match)...")
        page.evaluate('window.scrollBy(0, 400)')
        time.sleep(3)
        
        # Appointment Booking
        print("  → Booking Appointment...")
        if safe_action(page, page.click, 'button:has-text("Book")', description='book button'):
            time.sleep(2)
            safe_action(page, page.fill, 'input[name="date"]', '2026-03-10', description='date')
            time.sleep(1)
            safe_action(page, page.fill, 'input[name="time"]', '10:00', description='time')
            time.sleep(1)
            safe_action(page, page.fill, 'input[name="phone"]', '9876543210', description='phone')
            time.sleep(1)
            safe_action(page, page.click, 'button:has-text("Confirm")', description='confirm')
            time.sleep(3)
        else:
            time.sleep(3)
        
        print("  ✓ Mobile recording complete")
        
        # Save mobile video
        page.close()
        video_path = page.video.path()
        mobile_context.close()
        
        if video_path and os.path.exists(video_path):
            shutil.move(video_path, 'Video/Patient_Mobile_Complete.webm')
            print("  ✓ Saved: Video/Patient_Mobile_Complete.webm")
        
        # ============================================================
        # PART 2: SUPERVISOR DASHBOARD - DESKTOP VIEW (90-180s)
        # ============================================================
        print("\n[PART 2] Supervisor Dashboard - Desktop View (1920x1080)")
        print("Showing: Agentic AI, 6-Level Reasoning, Auto-Approval, Statistics")
        
        desktop_context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            record_video_dir='Video/',
            record_video_size={'width': 1920, 'height': 1080}
        )
        
        page = desktop_context.new_page()
        
        # Homepage
        print("\n  → Homepage...")
        page.goto('http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com')
        time.sleep(2)
        
        # Login
        print("  → Login as Supervisor...")
        page.goto('http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com/login')
        time.sleep(2)
        
        safe_action(page, page.fill, 'input[type="email"]', 'supervisor@arogya.ai', description='email')
        time.sleep(1)
        safe_action(page, page.fill, 'input[type="password"]', 'SupervisorPass123!', description='password')
        time.sleep(1)
        safe_action(page, page.click, 'button[type="submit"]', description='login')
        time.sleep(4)
        
        # Supervisor Dashboard
        print("  → Supervisor Dashboard Overview...")
        time.sleep(3)
        
        # Highlight Agentic AI Toggle
        print("  → Agentic AI Toggle (Purple)...")
        try:
            page.hover('[class*="toggle"]', timeout=3000)
            time.sleep(2)
        except:
            pass
        try:
            page.hover('text=Agentic AI', timeout=3000)
            time.sleep(2)
        except:
            pass
        time.sleep(2)
        
        # Show Statistics
        print("  → Statistics (47 Cases, 38 Auto-Approved, 81%)...")
        page.evaluate('window.scrollBy(0, 200)')
        time.sleep(3)
        
        # Click on First Case (Auto-Approved)
        print("  → Case Details (Auto-Approved - Green)...")
        if safe_action(page, page.click, 'tbody tr:first-child', description='first case'):
            time.sleep(4)
            
            # Show 6-Level Reasoning
            print("  → 6-Level Reasoning Process...")
            page.evaluate('window.scrollBy(0, 300)')
            time.sleep(3)
            
            page.evaluate('window.scrollBy(0, 300)')
            time.sleep(3)
            
            # Back to dashboard
            print("  → Back to Dashboard...")
            page.go_back()
            time.sleep(3)
        else:
            time.sleep(3)
        
        # Click on Second Case (Escalated)
        print("  → Case Details (Escalated - Orange)...")
        if safe_action(page, page.click, 'tbody tr:nth-child(2)', description='second case'):
            time.sleep(3)
            
            print("  → Showing Escalation Reason...")
            page.evaluate('window.scrollBy(0, 300)')
            time.sleep(3)
            
            # Back to dashboard
            page.go_back()
            time.sleep(2)
        else:
            time.sleep(2)
        
        # Show Multilingual Support
        print("  → Multilingual Support (10 Languages)...")
        if safe_action(page, page.click, 'select[name="language"]', description='language selector'):
            time.sleep(1)
            safe_action(page, page.select_option, 'select[name="language"]', 'ta', description='Tamil')
            time.sleep(2)
            safe_action(page, page.select_option, 'select[name="language"]', 'hi', description='Hindi')
            time.sleep(2)
            safe_action(page, page.select_option, 'select[name="language"]', 'en', description='English')
            time.sleep(2)
        
        # Provider Search
        print("  → AI-Powered Provider Search...")
        if safe_action(page, page.click, 'text=Find Provider', description='provider search'):
            time.sleep(2)
            if safe_action(page, page.fill, 'input[placeholder*="Search"]', 'heart specialist near me', description='search query'):
                time.sleep(3)
        else:
            time.sleep(2)
        
        # Final Dashboard View
        print("  → Final Dashboard Overview...")
        page.evaluate('window.scrollBy(0, -500)')
        time.sleep(3)
        
        print("  ✓ Desktop recording complete")
        
        # Save desktop video
        page.close()
        video_path = page.video.path()
        desktop_context.close()
        
        if video_path and os.path.exists(video_path):
            shutil.move(video_path, 'Video/Supervisor_Desktop_Complete.webm')
            print("  ✓ Saved: Video/Supervisor_Desktop_Complete.webm")
        
        browser.close()
        
        print("\n" + "=" * 80)
        print("RECORDING COMPLETE!")
        print("=" * 80)
        print("\nFiles Created:")
        print("  1. Video/Patient_Mobile_Complete.webm (Mobile view)")
        print("  2. Video/Supervisor_Desktop_Complete.webm (Desktop view)")
        print("\nNext Steps:")
        print("  1. Generate professional voiceover")
        print("  2. Combine videos with audio")
        print("  3. Create final 3-minute video")

if __name__ == '__main__':
    print("\nStarting complete demo recording in 3 seconds...")
    print("This will show ALL features including multilingual and Agentic AI\n")
    time.sleep(3)
    record_demo()
