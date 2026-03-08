#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Automated Screen Recorder using Playwright
Records all use cases based on voiceover script
"""

import asyncio
import time
import sys
import os

# Set UTF-8 encoding for Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

try:
    from playwright.async_api import async_playwright
    print("Playwright imported successfully!")
except ImportError:
    print("Installing playwright...")
    os.system("pip install playwright")
    os.system("playwright install chromium")
    from playwright.async_api import async_playwright

async def record_demo():
    print("\n" + "="*70)
    print("AUTOMATED SCREEN RECORDER - Arogya.ai Demo")
    print("="*70 + "\n")
    
    # Configuration
    app_url = "http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com"
    output_file = "Arogya_AI_Automated_Recording.mp4"
    
    print(f"Target URL: {app_url}")
    print(f"Output file: {output_file}")
    print(f"Total duration: ~3 minutes\n")
    
    async with async_playwright() as p:
        # Launch browser with video recording
        print("Launching browser with screen recording...")
        browser = await p.chromium.launch(
            headless=False,
            args=['--start-maximized']
        )
        
        context = await browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            record_video_dir=".",
            record_video_size={'width': 1920, 'height': 1080}
        )
        
        page = await context.new_page()
        
        print("Recording started!\n")
        print("="*70)
        
        try:
            # SCENE 1: OPENING & LOGIN (0:00 - 0:20) - 20 seconds
            print("\n[0:00-0:20] SCENE 1: Opening & Login")
            print("-" * 70)
            
            print("  → Navigating to homepage...")
            await page.goto(app_url, wait_until='networkidle')
            await asyncio.sleep(3)  # Show homepage
            
            print("  → Clicking 'Login as Patient'...")
            await page.click('button:has-text("Login as Patient")')
            await asyncio.sleep(2)
            
            print("  → Waiting for homepage to load...")
            await page.wait_for_url('**/index', timeout=10000)
            await asyncio.sleep(3)  # Show logged-in homepage
            
            # SCENE 2: MULTILINGUAL HOMEPAGE (0:20 - 0:40) - 20 seconds
            print("\n[0:20-0:40] SCENE 2: Multilingual Homepage")
            print("-" * 70)
            
            print("  → Showing homepage in English...")
            await asyncio.sleep(2)
            
            print("  → Switching to Hindi...")
            # Click language selector
            await page.click('button:has-text("English"), button:has-text("EN")')
            await asyncio.sleep(1)
            
            # Select Hindi
            await page.click('text=हिंदी')
            await asyncio.sleep(2)
            
            print("  → Showing homepage in Hindi...")
            await page.wait_for_load_state('networkidle')
            await asyncio.sleep(3)
            
            # Scroll down to show content
            await page.evaluate('window.scrollTo(0, 300)')
            await asyncio.sleep(2)
            await page.evaluate('window.scrollTo(0, 0)')
            await asyncio.sleep(2)
            
            # SCENE 3: SYMPTOM INTAKE IN HINDI (0:40 - 1:40) - 60 seconds
            print("\n[0:40-1:40] SCENE 3: Symptom Intake in Hindi")
            print("-" * 70)
            
            print("  → Navigating to symptom intake...")
            await page.click('a[href="/symptom-intake"], button:has-text("लक्षण")')
            await asyncio.sleep(3)
            
            print("  → Showing symptom intake page...")
            await asyncio.sleep(2)
            
            print("  → Selecting common symptoms...")
            # Click Fever button
            await page.click('button:has-text("बुखार"), button:has-text("Fever")')
            await asyncio.sleep(1.5)
            
            # Click Headache button
            await page.click('button:has-text("सिरदर्द"), button:has-text("Headache")')
            await asyncio.sleep(1.5)
            
            # Click Cough button
            await page.click('button:has-text("खांसी"), button:has-text("Cough")')
            await asyncio.sleep(2)
            
            print("  → Adding custom symptom in Hindi...")
            # Find custom symptom input
            custom_input = await page.query_selector('input[placeholder*="लक्षण"], input[placeholder*="symptom"]')
            if custom_input:
                await custom_input.fill('मुझे चक्कर आ रहे हैं')
                await asyncio.sleep(2)
                # Click add button
                await page.click('button:has-text("+"), button[type="button"]:near(input)')
                await asyncio.sleep(2)
            
            print("  → Scrolling to severity section...")
            await page.evaluate('window.scrollTo(0, 400)')
            await asyncio.sleep(2)
            
            print("  → Selecting severity: Moderate...")
            await page.click('button:has-text("मध्यम"), button:has-text("Moderate")')
            await asyncio.sleep(2)
            
            print("  → Scrolling to duration section...")
            await page.evaluate('window.scrollTo(0, 600)')
            await asyncio.sleep(2)
            
            print("  → Selecting duration: 1-3 days...")
            # Click duration dropdown
            await page.click('select, button:has-text("दिन"), button:has-text("days")')
            await asyncio.sleep(1)
            await page.select_option('select', '1-3 days')
            await asyncio.sleep(2)
            
            print("  → Adding additional information...")
            await page.evaluate('window.scrollTo(0, 800)')
            await asyncio.sleep(1)
            
            additional_input = await page.query_selector('textarea')
            if additional_input:
                await additional_input.fill('मुझे कमजोरी भी महसूस हो रही है')
                await asyncio.sleep(2)
            
            print("  → Scrolling to submit button...")
            await page.evaluate('window.scrollTo(0, 1000)')
            await asyncio.sleep(2)
            
            print("  → Submitting symptom assessment...")
            await page.click('button:has-text("Submit"), button:has-text("मूल्यांकन")')
            await asyncio.sleep(3)
            
            # SCENE 4: AI TRIAGE RESULTS (1:40 - 2:10) - 30 seconds
            print("\n[1:40-2:10] SCENE 4: AI Triage Results")
            print("-" * 70)
            
            print("  → Waiting for AI processing...")
            await page.wait_for_load_state('networkidle', timeout=15000)
            await asyncio.sleep(3)
            
            print("  → Showing triage results...")
            await page.evaluate('window.scrollTo(0, 0)')
            await asyncio.sleep(3)
            
            print("  → Scrolling through results...")
            await page.evaluate('window.scrollTo(0, 300)')
            await asyncio.sleep(2)
            
            await page.evaluate('window.scrollTo(0, 600)')
            await asyncio.sleep(2)
            
            print("  → Showing facility recommendations...")
            await page.evaluate('window.scrollTo(0, 900)')
            await asyncio.sleep(3)
            
            await page.evaluate('window.scrollTo(0, 1200)')
            await asyncio.sleep(2)
            
            # SCENE 5: PROVIDER SEARCH IN TAMIL (2:10 - 2:40) - 30 seconds
            print("\n[2:10-2:40] SCENE 5: Provider Search in Tamil")
            print("-" * 70)
            
            print("  → Navigating to provider search...")
            await page.click('a[href="/provider-search"]')
            await asyncio.sleep(3)
            
            print("  → Switching to Tamil...")
            await page.click('button:has-text("हिंदी"), button:has-text("Hindi")')
            await asyncio.sleep(1)
            await page.click('text=தமிழ்')
            await asyncio.sleep(2)
            
            print("  → Showing provider search page in Tamil...")
            await asyncio.sleep(2)
            
            print("  → Searching for cardiologist...")
            search_input = await page.query_selector('input[type="text"], input[placeholder*="search"]')
            if search_input:
                await search_input.fill('இதய மருத்துவர்')
                await asyncio.sleep(2)
                
                print("  → Clicking search button...")
                await page.click('button:has-text("Search"), button:has-text("தேடல்")')
                await asyncio.sleep(3)
            
            print("  → Showing search results...")
            await page.wait_for_load_state('networkidle', timeout=10000)
            await asyncio.sleep(3)
            
            print("  → Scrolling through provider results...")
            await page.evaluate('window.scrollTo(0, 400)')
            await asyncio.sleep(2)
            await page.evaluate('window.scrollTo(0, 800)')
            await asyncio.sleep(2)
            
            # SCENE 6: SUPERVISOR DASHBOARD (2:40 - 3:00) - 20 seconds
            print("\n[2:40-3:00] SCENE 6: Supervisor Dashboard")
            print("-" * 70)
            
            print("  → Logging out...")
            # Try to find and click logout/profile button
            try:
                await page.click('button:has-text("Sign Out"), button:has-text("Logout")')
                await asyncio.sleep(2)
            except:
                # Navigate directly to login
                await page.goto(app_url)
                await asyncio.sleep(2)
            
            print("  → Logging in as Supervisor...")
            await page.click('button:has-text("Login as Supervisor")')
            await asyncio.sleep(3)
            
            print("  → Navigating to supervisor dashboard...")
            await page.goto(f"{app_url}/supervisor-dashboard")
            await asyncio.sleep(3)
            
            print("  → Showing supervisor dashboard...")
            await page.wait_for_load_state('networkidle', timeout=10000)
            await asyncio.sleep(3)
            
            print("  → Scrolling through cases...")
            await page.evaluate('window.scrollTo(0, 300)')
            await asyncio.sleep(2)
            await page.evaluate('window.scrollTo(0, 600)')
            await asyncio.sleep(2)
            await page.evaluate('window.scrollTo(0, 0)')
            await asyncio.sleep(2)
            
            print("\n" + "="*70)
            print("Recording complete!")
            print("="*70 + "\n")
            
        except Exception as e:
            print(f"\nERROR during recording: {str(e)}")
            import traceback
            traceback.print_exc()
        
        finally:
            # Close and save video
            print("Saving video...")
            await context.close()
            await browser.close()
            
            # Find the recorded video file
            print("\nLooking for recorded video file...")
            video_files = [f for f in os.listdir('.') if f.endswith('.webm')]
            if video_files:
                video_file = video_files[0]
                print(f"Found: {video_file}")
                
                # Rename to output file
                if os.path.exists(output_file):
                    os.remove(output_file)
                os.rename(video_file, output_file)
                
                file_size = os.path.getsize(output_file) / (1024 * 1024)
                print(f"\n✅ Video saved: {output_file}")
                print(f"   Size: {file_size:.1f} MB")
                print(f"   Duration: ~3 minutes")
            else:
                print("⚠️  No video file found. Check Playwright video recording settings.")

if __name__ == "__main__":
    print("\n🎬 Starting automated screen recording...")
    print("This will take approximately 3 minutes.\n")
    
    try:
        asyncio.run(record_demo())
        print("\n✅ SUCCESS! Video recording complete!")
        print("\nNext steps:")
        print("1. Convert video to MP4 if needed")
        print("2. Add voiceover using video editor")
        print("3. Upload to YouTube")
    except KeyboardInterrupt:
        print("\n\n⚠️  Recording interrupted by user")
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
