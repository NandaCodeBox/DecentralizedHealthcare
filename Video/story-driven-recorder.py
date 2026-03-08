#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Story-Driven Playwright Recorder for Arogya.ai Demo
Records 3-minute demo with compelling narrative
"""

import sys
import os
import time

if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from playwright.sync_api import sync_playwright

def wait(seconds, message=""):
    """Wait with optional message"""
    if message:
        print(f"  {message}")
    time.sleep(seconds)

def record_story_driven_demo():
    print("\n" + "="*80)
    print("AROGYA.AI - STORY-DRIVEN DEMO RECORDING")
    print("="*80 + "\n")
    print("📖 Story: Rural farmer's mother needs healthcare")
    print("🎯 Solution: AI-powered multilingual platform")
    print("⏱️  Duration: 3 minutes (180 seconds)\n")
    
    app_url = "http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com"
    
    with sync_playwright() as p:
        print("🎬 Launching browser with recording...")
        browser = p.chromium.launch(
            headless=False,
            args=['--start-maximized']
        )
        
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            record_video_dir=".",
            record_video_size={'width': 1920, 'height': 1080}
        )
        
        page = context.new_page()
        
        try:
            print("\n🔴 RECORDING STARTED\n")
            start_time = time.time()
            
            # ================================================================
            # SCENE 1: THE PROBLEM (0:00 - 0:25) - 25 seconds
            # ================================================================
            print("[0:00-0:25] Scene 1: The Problem - Language & Access Barriers")
            print("-" * 80)
            
            # Show login page - represents the barrier
            page.goto(app_url, wait_until='domcontentloaded')
            wait(3, "Showing login page (the starting point)")
            
            # Hover over language selector to show options
            try:
                page.hover('button:has-text("English")')
                wait(2, "Highlighting language barrier")
            except:
                pass
            
            # Show the problem - multiple languages available
            wait(3, "Emphasizing the challenge")
            
            # Login as patient (Rajesh's mother)
            page.locator('button').filter(has_text='Login as Patient').first.click()
            wait(4, "Patient logged in")
            
            # Show homepage briefly
            wait(3, "Homepage loaded")
            
            elapsed = time.time() - start_time
            print(f"  ✓ Scene 1 complete ({elapsed:.1f}s elapsed)")
            
            # ================================================================
            # SCENE 2: MULTILINGUAL ACCESS (0:25 - 0:45) - 20 seconds
            # ================================================================
            print("\n[0:25-0:45] Scene 2: Breaking Language Barriers")
            print("-" * 80)
            
            # Show English homepage
            wait(2, "Homepage in English")
            
            # Scroll to show content
            page.evaluate('window.scrollTo({top: 300, behavior: "smooth"})')
            wait(2, "Showing features")
            page.evaluate('window.scrollTo({top: 0, behavior: "smooth"})')
            wait(1)
            
            # Switch to Hindi - THE SOLUTION
            try:
                page.click('button:has-text("English")', timeout=3000)
                wait(1, "Opening language selector")
                page.click('text=हिंदी', timeout=3000)
                wait(3, "Switched to Hindi - barrier broken!")
            except:
                print("  ⚠️  Language switch skipped")
                wait(4)
            
            # Show translated interface
            page.evaluate('window.scrollTo({top: 400, behavior: "smooth"})')
            wait(2, "All content in Hindi")
            page.evaluate('window.scrollTo({top: 0, behavior: "smooth"})')
            wait(2)
            
            elapsed = time.time() - start_time
            print(f"  ✓ Scene 2 complete ({elapsed:.1f}s elapsed)")
            
            # ================================================================
            # SCENE 3: SYMPTOM REPORTING (0:45 - 1:25) - 40 seconds
            # ================================================================
            print("\n[0:45-1:25] Scene 3: Easy Symptom Reporting in Hindi")
            print("-" * 80)
            
            # Navigate to symptom intake
            page.goto(f"{app_url}/symptom-intake", wait_until='domcontentloaded')
            wait(3, "Symptom intake page loaded")
            
            # Show the form
            wait(2, "Showing symptom form in Hindi")
            
            # Click symptoms one by one
            try:
                # Fever
                page.click('[data-testid="symptom-fever"]', timeout=3000)
                wait(2, "Selected: Fever")
                
                # Headache
                page.click('[data-testid="symptom-headache"]', timeout=3000)
                wait(2, "Selected: Headache")
                
                # Fatigue
                page.click('[data-testid="symptom-fatigue"]', timeout=3000)
                wait(2, "Selected: Fatigue")
            except:
                print("  ⚠️  Using fallback symptom selection")
                try:
                    page.locator('button').filter(has_text='Fever').first.click()
                    wait(2)
                    page.locator('button').filter(has_text='Headache').first.click()
                    wait(2)
                except:
                    pass
            
            # Scroll to severity
            page.evaluate('window.scrollTo({top: 500, behavior: "smooth"})')
            wait(2, "Scrolling to severity")
            
            # Select moderate severity
            try:
                page.locator('button').filter(has_text='Moderate').first.click()
                wait(2, "Selected: Moderate severity")
            except:
                print("  ⚠️  Severity selection skipped")
                wait(2)
            
            # Scroll to duration
            page.evaluate('window.scrollTo({top: 800, behavior: "smooth"})')
            wait(2, "Scrolling to duration")
            
            # Select duration
            try:
                page.select_option('[data-testid="duration-select"]', '1_3_days')
                wait(2, "Selected: 3 days duration")
            except:
                try:
                    page.select_option('select', '1-3 days')
                    wait(2)
                except:
                    print("  ⚠️  Duration selection skipped")
                    wait(2)
            
            # Scroll to submit
            page.evaluate('window.scrollTo({top: 1200, behavior: "smooth"})')
            wait(2, "Scrolling to submit")
            
            # Submit
            try:
                page.locator('button').filter(has_text='Submit').first.click()
                wait(3, "Submitting to AI...")
            except:
                print("  ⚠️  Submit skipped, navigating manually")
                page.goto(f"{app_url}/triage-dashboard", wait_until='domcontentloaded')
                wait(3)
            
            elapsed = time.time() - start_time
            print(f"  ✓ Scene 3 complete ({elapsed:.1f}s elapsed)")
            
            # ================================================================
            # SCENE 4: AI TRIAGE INTELLIGENCE (1:25 - 1:55) - 30 seconds
            # ================================================================
            print("\n[1:25-1:55] Scene 4: AI-Powered Intelligent Assessment")
            print("-" * 80)
            
            # Wait for results page
            page.wait_for_load_state('domcontentloaded')
            wait(3, "AI processing complete - 87% confidence!")
            
            # Show confidence score at top
            page.evaluate('window.scrollTo({top: 0, behavior: "smooth"})')
            wait(3, "Showing AI confidence score")
            
            # Scroll to severity
            page.evaluate('window.scrollTo({top: 300, behavior: "smooth"})')
            wait(2, "Showing urgency level")
            
            # Scroll to symptoms
            page.evaluate('window.scrollTo({top: 500, behavior: "smooth"})')
            wait(2, "Showing reported symptoms")
            
            # Scroll to facility recommendations
            page.evaluate('window.scrollTo({top: 800, behavior: "smooth"})')
            wait(3, "Showing AI-recommended facilities")
            
            # Scroll through facilities
            page.evaluate('window.scrollTo({top: 1100, behavior: "smooth"})')
            wait(3, "3 facilities with AI match scores")
            
            # Hover over first facility to highlight
            try:
                page.hover('[data-testid="book-appointment-1"]')
                wait(2, "Highlighting top match (95% AI score)")
            except:
                wait(2)
            
            # Click "Book Appointment" to show functionality
            try:
                page.click('[data-testid="book-appointment-1"]', timeout=3000)
                wait(2, "Opening booking modal")
                # Close modal
                page.keyboard.press('Escape')
                wait(1, "Modal closed")
            except:
                print("  ⚠️  Booking modal skipped")
                wait(3)
            
            elapsed = time.time() - start_time
            print(f"  ✓ Scene 4 complete ({elapsed:.1f}s elapsed)")
            
            # ================================================================
            # SCENE 5: SMART PROVIDER SEARCH (1:55 - 2:25) - 30 seconds
            # ================================================================
            print("\n[1:55-2:25] Scene 5: AI-Powered Semantic Search")
            print("-" * 80)
            
            # Navigate to provider search
            page.goto(f"{app_url}/provider-search", wait_until='domcontentloaded')
            wait(3, "Provider search page loaded")
            
            # Switch to Tamil for variety
            try:
                page.click('button:has-text("हिंदी")', timeout=3000)
                wait(1)
                page.click('text=தமிழ்', timeout=3000)
                wait(2, "Switched to Tamil")
            except:
                print("  ⚠️  Language switch skipped")
                wait(3)
            
            # Show search interface
            wait(2, "Showing AI search interface")
            
            # Type search query
            try:
                search_input = page.locator('[data-testid="provider-search-input"]').first
                search_input.fill('chest pain and shortness of breath')
                wait(3, "Typed: chest pain and shortness of breath")
                
                # Click AI Search
                page.locator('button').filter(has_text='AI Search').first.click()
                wait(3, "AI analyzing query...")
                
                # Show AI suggestions
                wait(3, "AI recommends: Cardiologist")
                
                # Show filtered results
                page.evaluate('window.scrollTo({top: 400, behavior: "smooth"})')
                wait(3, "Results filtered by AI")
                
                # Click "View Profile" to show functionality
                try:
                    page.click('[data-testid="view-profile-provider-2"]', timeout=3000)
                    wait(2, "Opening provider profile")
                    # Close modal
                    page.keyboard.press('Escape')
                    wait(1)
                except:
                    wait(3)
                
            except:
                print("  ⚠️  Search functionality skipped")
                wait(12)
            
            elapsed = time.time() - start_time
            print(f"  ✓ Scene 5 complete ({elapsed:.1f}s elapsed)")
            
            # ================================================================
            # SCENE 6: HUMAN-IN-THE-LOOP (2:25 - 2:50) - 25 seconds
            # ================================================================
            print("\n[2:25-2:50] Scene 6: Human-in-the-Loop Quality Assurance")
            print("-" * 80)
            
            # Navigate directly to supervisor dashboard (bypass login)
            page.goto(f"{app_url}/supervisor-dashboard", wait_until='domcontentloaded')
            wait(3, "Supervisor dashboard loaded")
            
            # Show dashboard from top
            page.evaluate('window.scrollTo({top: 0, behavior: "smooth"})')
            wait(3, "Showing AI confidence scores")
            
            # Scroll through cases
            page.evaluate('window.scrollTo({top: 400, behavior: "smooth"})')
            wait(3, "Color-coded by severity")
            
            # Scroll more to show more cases
            page.evaluate('window.scrollTo({top: 800, behavior: "smooth"})')
            wait(3, "Low-confidence cases flagged")
            
            # Scroll to show facility recommendations
            page.evaluate('window.scrollTo({top: 1200, behavior: "smooth"})')
            wait(2, "Showing facility details")
            
            # Back to top
            page.evaluate('window.scrollTo({top: 0, behavior: "smooth"})')
            wait(2, "Human expertise + AI efficiency")
            
            elapsed = time.time() - start_time
            print(f"  ✓ Scene 6 complete ({elapsed:.1f}s elapsed)")
            
            # ================================================================
            # SCENE 6.5: MOBILE RESPONSIVE (2:50 - 3:05) - 15 seconds
            # ================================================================
            print("\n[2:50-3:05] Scene 6.5: Mobile Responsive Design")
            print("-" * 80)
            
            # Go to homepage
            page.goto(app_url, wait_until='domcontentloaded')
            wait(2, "Homepage loaded")
            
            # Switch to mobile viewport
            print("  Switching to mobile view (iPhone 12 Pro)")
            page.set_viewport_size({"width": 390, "height": 844})
            wait(2, "Mobile viewport set")
            
            # Reload to show mobile layout
            page.reload(wait_until='domcontentloaded')
            wait(3, "Showing mobile homepage")
            
            # Scroll on mobile
            page.evaluate('window.scrollTo({top: 300, behavior: "smooth"})')
            wait(2, "Scrolling mobile view")
            
            page.evaluate('window.scrollTo({top: 600, behavior: "smooth"})')
            wait(2, "Mobile-optimized interface")
            
            # Go to symptom intake on mobile
            page.goto(f"{app_url}/symptom-intake", wait_until='domcontentloaded')
            wait(2, "Symptom intake on mobile")
            
            # Scroll to show mobile form
            page.evaluate('window.scrollTo({top: 400, behavior: "smooth"})')
            wait(2, "Touch-friendly buttons")
            
            # Back to desktop view
            print("  Switching back to desktop view")
            page.set_viewport_size({"width": 1920, "height": 1080})
            wait(1)
            
            elapsed = time.time() - start_time
            print(f"  ✓ Scene 6.5 complete ({elapsed:.1f}s elapsed)")
            
            # ================================================================
            # SCENE 7: THE IMPACT (3:05 - 3:15) - 10 seconds
            # ================================================================
            print("\n[3:05-3:15] Scene 7: The Impact - Closing Message")
            print("-" * 80)
            
            # Go back to homepage for final shot
            page.goto(app_url, wait_until='domcontentloaded')
            wait(3, "Homepage - final shot")
            
            # Show logo and branding
            page.evaluate('window.scrollTo({top: 0, behavior: "smooth"})')
            wait(3, "Arogya.ai - Healthcare for all")
            
            # Scroll down to show features one last time
            page.evaluate('window.scrollTo({top: 400, behavior: "smooth"})')
            wait(2, "Breaking barriers, bridging divides")
            
            # End on homepage
            page.evaluate('window.scrollTo({top: 0, behavior: "smooth"})')
            wait(2, "Visit us at Arogya.ai")
            
            elapsed = time.time() - start_time
            print(f"  ✓ Scene 7 complete ({elapsed:.1f}s elapsed)")
            
            # ================================================================
            # RECORDING COMPLETE
            # ================================================================
            total_time = time.time() - start_time
            print("\n" + "="*80)
            print(f"✅ RECORDING COMPLETE!")
            print("="*80)
            print(f"\nTotal recording time: {total_time:.1f} seconds ({total_time/60:.1f} minutes)")
            print(f"Target time: 180 seconds (3 minutes)")
            print(f"Difference: {total_time - 180:.1f} seconds")
            
        except KeyboardInterrupt:
            print("\n⚠️  Recording interrupted by user")
        except Exception as e:
            print(f"\n❌ ERROR: {e}")
            import traceback
            traceback.print_exc()
        finally:
            print("\nSaving video...")
            context.close()
            browser.close()
            
            # Find and rename video
            video_files = [f for f in os.listdir('.') if f.endswith('.webm')]
            if video_files:
                video_file = video_files[0]
                output = "Arogya_AI_Story_Driven_Recording.webm"
                
                if os.path.exists(output):
                    os.remove(output)
                os.rename(video_file, output)
                
                size_mb = os.path.getsize(output) / (1024 * 1024)
                print(f"\n✅ Video saved: {output}")
                print(f"   Size: {size_mb:.1f} MB")
                print(f"   Format: WebM")
                print(f"\nNext steps:")
                print(f"1. Generate voiceover from: story-driven-voiceover.txt")
                print(f"2. Combine video + voiceover")
                print(f"3. Upload to YouTube")
            else:
                print("\n⚠️  No video file found")

if __name__ == "__main__":
    try:
        print("\n📖 Story: Rural healthcare access problem")
        print("💡 Solution: AI-powered multilingual platform")
        print("🎯 Goal: Compelling 3-minute demo\n")
        input("Press Enter to start recording...")
        
        record_story_driven_demo()
        
        print("\n🎉 Done! Now generate voiceover and combine.\n")
    except KeyboardInterrupt:
        print("\n\n⚠️  Stopped by user")
    except Exception as e:
        print(f"\n❌ Failed: {e}")
