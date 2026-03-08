#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Mobile-Only Demo Recorder - 3 Minutes
Records in mobile viewport (iPhone 12 Pro) for proper mobile demonstration
"""

import sys
import os
import time

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from playwright.sync_api import sync_playwright

def wait(seconds, message=""):
    if message:
        print(f"  {message}")
    time.sleep(seconds)

def record_mobile_demo():
    print("\n" + "="*80)
    print("AROGYA.AI - MOBILE DEMO RECORDING (3 MINUTES)")
    print("="*80 + "\n")
    print("📱 Device: iPhone 12 Pro (390x844)")
    print("⏱️  Duration: 3 minutes (180 seconds)\n")
    
    app_url = "http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com"
    
    with sync_playwright() as p:
        print("🎬 Launching browser in mobile mode...")
        
        # Launch browser
        browser = p.chromium.launch(
            headless=False,
            args=['--window-size=390,844']
        )
        
        # Create context with iPhone 12 Pro specs
        context = browser.new_context(
            viewport={'width': 390, 'height': 844},
            device_scale_factor=3,
            is_mobile=True,
            has_touch=True,
            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
            record_video_dir=".",
            record_video_size={'width': 390, 'height': 844}
        )
        
        page = context.new_page()
        
        try:
            print("\n🔴 RECORDING STARTED (Mobile View)\n")
            start_time = time.time()
            
            # ================================================================
            # SCENE 1: LOGIN & HOMEPAGE (0:00 - 0:30) - 30 seconds
            # ================================================================
            print("[0:00-0:30] Scene 1: Mobile Login & Homepage")
            print("-" * 80)
            
            page.goto(app_url, wait_until='domcontentloaded')
            wait(3, "Login page loaded")
            
            # Login as patient
            page.locator('button').filter(has_text='Login as Patient').first.click()
            wait(4, "Logged in")
            
            # Show homepage
            wait(3, "Homepage in mobile view")
            
            # Scroll homepage
            page.evaluate('window.scrollTo({top: 400, behavior: "smooth"})')
            wait(3, "Scrolling homepage")
            
            page.evaluate('window.scrollTo({top: 800, behavior: "smooth"})')
            wait(3, "Showing features")
            
            page.evaluate('window.scrollTo({top: 0, behavior: "smooth"})')
            wait(2)
            
            print(f"  ✓ Complete ({time.time() - start_time:.1f}s)\n")
            
            # ================================================================
            # SCENE 2: SWITCH TO HINDI (0:30 - 0:45) - 15 seconds
            # ================================================================
            print("[0:30-0:45] Scene 2: Switch to Hindi")
            print("-" * 80)
            
            # Switch to Hindi
            try:
                page.click('button:has-text("English")', timeout=3000)
                wait(1, "Language menu opened")
                page.click('text=हिंदी', timeout=3000)
                wait(3, "Switched to Hindi")
            except:
                print("  ⚠️  Language switch skipped")
                wait(4)
            
            # Show translated interface
            page.evaluate('window.scrollTo({top: 400, behavior: "smooth"})')
            wait(2, "All content in Hindi")
            
            page.evaluate('window.scrollTo({top: 0, behavior: "smooth"})')
            wait(2)
            
            print(f"  ✓ Complete ({time.time() - start_time:.1f}s)\n")
            
            # ================================================================
            # SCENE 3: SYMPTOM INTAKE (0:45 - 1:30) - 45 seconds
            # ================================================================
            print("[0:45-1:30] Scene 3: Symptom Intake on Mobile")
            print("-" * 80)
            
            page.goto(f"{app_url}/symptom-intake", wait_until='domcontentloaded')
            wait(3, "Symptom intake loaded")
            
            # Show form
            wait(2, "Mobile-optimized form")
            
            # Click symptoms
            try:
                page.click('[data-testid="symptom-fever"]', timeout=3000)
                wait(2, "Fever selected")
                
                page.click('[data-testid="symptom-headache"]', timeout=3000)
                wait(2, "Headache selected")
                
                page.click('[data-testid="symptom-cough"]', timeout=3000)
                wait(2, "Cough selected")
            except:
                print("  ⚠️  Using fallback")
                wait(6)
            
            # Scroll to severity
            page.evaluate('window.scrollTo({top: 600, behavior: "smooth"})')
            wait(2, "Scrolling to severity")
            
            # Select severity
            try:
                page.locator('button').filter(has_text='Moderate').first.click()
                wait(2, "Moderate selected")
            except:
                wait(2)
            
            # Scroll to duration
            page.evaluate('window.scrollTo({top: 1000, behavior: "smooth"})')
            wait(2, "Scrolling to duration")
            
            # Select duration
            try:
                page.select_option('[data-testid="duration-select"]', '1_3_days')
                wait(2, "Duration selected")
            except:
                wait(2)
            
            # Scroll to submit
            page.evaluate('window.scrollTo({top: 1400, behavior: "smooth"})')
            wait(2, "Scrolling to submit")
            
            # Submit
            try:
                page.locator('button').filter(has_text='Submit').first.click()
                wait(3, "Submitting...")
            except:
                page.goto(f"{app_url}/triage-dashboard", wait_until='domcontentloaded')
                wait(3)
            
            print(f"  ✓ Complete ({time.time() - start_time:.1f}s)\n")
            
            # ================================================================
            # SCENE 4: TRIAGE RESULTS (1:30 - 2:00) - 30 seconds
            # ================================================================
            print("[1:30-2:00] Scene 4: AI Triage Results on Mobile")
            print("-" * 80)
            
            page.wait_for_load_state('domcontentloaded')
            wait(3, "Results loaded")
            
            # Show confidence score
            page.evaluate('window.scrollTo({top: 0, behavior: "smooth"})')
            wait(3, "AI confidence: 87%")
            
            # Scroll through results
            page.evaluate('window.scrollTo({top: 400, behavior: "smooth"})')
            wait(2, "Showing severity")
            
            page.evaluate('window.scrollTo({top: 800, behavior: "smooth"})')
            wait(3, "Showing symptoms")
            
            page.evaluate('window.scrollTo({top: 1200, behavior: "smooth"})')
            wait(3, "Facility recommendations")
            
            page.evaluate('window.scrollTo({top: 1600, behavior: "smooth"})')
            wait(2, "AI match scores")
            
            # Try to open booking modal
            try:
                page.click('[data-testid="book-appointment-1"]', timeout=3000)
                wait(2, "Booking modal opened")
                page.keyboard.press('Escape')
                wait(1)
            except:
                wait(3)
            
            print(f"  ✓ Complete ({time.time() - start_time:.1f}s)\n")
            
            # ================================================================
            # SCENE 5: PROVIDER SEARCH (2:00 - 2:30) - 30 seconds
            # ================================================================
            print("[2:00-2:30] Scene 5: Provider Search on Mobile")
            print("-" * 80)
            
            page.goto(f"{app_url}/provider-search", wait_until='domcontentloaded')
            wait(3, "Provider search loaded")
            
            # Show search interface
            wait(2, "Mobile search interface")
            
            # Type search
            try:
                search_input = page.locator('[data-testid="provider-search-input"]').first
                search_input.fill('cardiologist')
                wait(3, "Search query entered")
                
                page.locator('button').filter(has_text='AI Search').first.click()
                wait(3, "AI analyzing...")
                
                wait(2, "Results filtered")
                
                # Scroll results
                page.evaluate('window.scrollTo({top: 600, behavior: "smooth"})')
                wait(3, "Showing providers")
                
                page.evaluate('window.scrollTo({top: 1000, behavior: "smooth"})')
                wait(2, "AI match scores")
                
            except:
                print("  ⚠️  Search skipped")
                wait(13)
            
            print(f"  ✓ Complete ({time.time() - start_time:.1f}s)\n")
            
            # ================================================================
            # SCENE 6: SUPERVISOR DASHBOARD (2:30 - 2:50) - 20 seconds
            # ================================================================
            print("[2:30-2:50] Scene 6: Supervisor Dashboard on Mobile")
            print("-" * 80)
            
            page.goto(f"{app_url}/supervisor-dashboard", wait_until='domcontentloaded')
            wait(3, "Supervisor dashboard loaded")
            
            # Show dashboard
            page.evaluate('window.scrollTo({top: 0, behavior: "smooth"})')
            wait(3, "Dashboard overview")
            
            page.evaluate('window.scrollTo({top: 600, behavior: "smooth"})')
            wait(3, "Color-coded cases")
            
            page.evaluate('window.scrollTo({top: 1200, behavior: "smooth"})')
            wait(3, "Case details")
            
            page.evaluate('window.scrollTo({top: 0, behavior: "smooth"})')
            wait(2)
            
            print(f"  ✓ Complete ({time.time() - start_time:.1f}s)\n")
            
            # ================================================================
            # SCENE 7: CLOSING (2:50 - 3:00) - 10 seconds
            # ================================================================
            print("[2:50-3:00] Scene 7: Closing on Mobile")
            print("-" * 80)
            
            page.goto(app_url, wait_until='domcontentloaded')
            wait(3, "Homepage")
            
            page.evaluate('window.scrollTo({top: 400, behavior: "smooth"})')
            wait(2, "Features")
            
            page.evaluate('window.scrollTo({top: 0, behavior: "smooth"})')
            wait(3, "Arogya.ai logo")
            
            print(f"  ✓ Complete ({time.time() - start_time:.1f}s)\n")
            
            total_time = time.time() - start_time
            print("="*80)
            print(f"✅ MOBILE RECORDING COMPLETE!")
            print("="*80)
            print(f"\nTotal time: {total_time:.1f}s ({total_time/60:.1f} min)")
            print(f"Target: 180s (3 min)")
            print(f"Difference: {total_time - 180:.1f}s")
            
        except Exception as e:
            print(f"\n❌ ERROR: {e}")
            import traceback
            traceback.print_exc()
        finally:
            print("\nSaving mobile video...")
            context.close()
            browser.close()
            
            video_files = [f for f in os.listdir('.') if f.endswith('.webm')]
            if video_files:
                video_file = video_files[0]
                output = "Arogya_AI_Mobile_Demo.webm"
                
                if os.path.exists(output):
                    os.remove(output)
                os.rename(video_file, output)
                
                size_mb = os.path.getsize(output) / (1024 * 1024)
                print(f"\n✅ Mobile video saved: {output}")
                print(f"   Size: {size_mb:.1f} MB")
                print(f"   Resolution: 390x844 (iPhone 12 Pro)")
                print(f"   Duration: ~3 minutes")
                print(f"\n📱 Perfect for mobile demonstration!")
            else:
                print("\n⚠️  No video file found")

if __name__ == "__main__":
    try:
        print("\n📱 Mobile Demo Recording")
        print("🎬 Starting in 3 seconds...")
        time.sleep(3)
        record_mobile_demo()
        print("\n🎉 Done!\n")
    except Exception as e:
        print(f"\n❌ Failed: {e}")
