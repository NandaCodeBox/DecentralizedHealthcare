#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Playwright Screen Recorder with MCP Tools
Uses Playwright MCP server to record screen actions
"""

import asyncio
import time
import sys
import os

# Set UTF-8 encoding for Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

print("\n" + "="*70)
print("PLAYWRIGHT AUTOMATED RECORDER - Arogya.ai Demo")
print("="*70 + "\n")

print("This script will:")
print("1. Open browser with screen recording")
print("2. Navigate through all use cases")
print("3. Record everything automatically")
print("4. Save as video file\n")

print("Duration: ~3 minutes")
print("Output: Arogya_AI_Automated_Recording.webm\n")

print("="*70)
print("\nStarting in 3 seconds...")
time.sleep(3)

# Import after delay
try:
    from playwright.sync_api import sync_playwright
    print("✅ Playwright imported successfully!\n")
except ImportError:
    print("Installing playwright...")
    os.system("pip install playwright")
    os.system("playwright install chromium")
    from playwright.sync_api import sync_playwright

def record_demo():
    app_url = "http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com"
    
    with sync_playwright() as p:
        print("🎬 Launching browser with recording...")
        browser = p.chromium.launch(
            headless=False,
            args=[
                '--start-maximized',
                '--disable-blink-features=AutomationControlled'
            ]
        )
        
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            record_video_dir=".",
            record_video_size={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        
        page = context.new_page()
        
        try:
            print("\n" + "="*70)
            print("RECORDING STARTED")
            print("="*70 + "\n")
            
            # SCENE 1: LOGIN (0:00 - 0:20)
            print("[0:00-0:20] Scene 1: Opening & Login")
            print("-" * 70)
            
            print("  → Opening homepage...")
            page.goto(app_url, wait_until='networkidle', timeout=30000)
            time.sleep(3)
            
            print("  → Clicking 'Login as Patient'...")
            page.click('button:has-text("Login as Patient")', timeout=10000)
            time.sleep(3)
            
            print("  → Waiting for login to complete...")
            page.wait_for_load_state('networkidle', timeout=10000)
            time.sleep(3)
            
            # SCENE 2: MULTILINGUAL (0:20 - 0:40)
            print("\n[0:20-0:40] Scene 2: Multilingual Homepage")
            print("-" * 70)
            
            print("  → Showing English homepage...")
            time.sleep(2)
            
            print("  → Switching to Hindi...")
            try:
                page.click('button:has-text("English")', timeout=5000)
                time.sleep(1)
                page.click('text=हिंदी', timeout=5000)
                time.sleep(2)
            except:
                print("  ⚠️  Language selector not found, continuing...")
            
            print("  → Scrolling homepage...")
            page.evaluate('window.scrollTo(0, 300)')
            time.sleep(2)
            page.evaluate('window.scrollTo(0, 0)')
            time.sleep(2)
            
            # SCENE 3: SYMPTOM INTAKE (0:40 - 1:40)
            print("\n[0:40-1:40] Scene 3: Symptom Intake in Hindi")
            print("-" * 70)
            
            print("  → Navigating to symptom intake...")
            page.goto(f"{app_url}/symptom-intake", wait_until='networkidle')
            time.sleep(3)
            
            print("  → Selecting symptoms...")
            try:
                page.click('button:has-text("Fever")', timeout=5000)
                time.sleep(1.5)
                page.click('button:has-text("Headache")', timeout=5000)
                time.sleep(1.5)
                page.click('button:has-text("Cough")', timeout=5000)
                time.sleep(2)
            except Exception as e:
                print(f"  ⚠️  Could not click symptom buttons: {e}")
            
            print("  → Scrolling to severity...")
            page.evaluate('window.scrollTo(0, 400)')
            time.sleep(2)
            
            print("  → Selecting severity...")
            try:
                page.click('button:has-text("Moderate")', timeout=5000)
                time.sleep(2)
            except:
                print("  ⚠️  Severity button not found")
            
            print("  → Scrolling to duration...")
            page.evaluate('window.scrollTo(0, 600)')
            time.sleep(2)
            
            print("  → Selecting duration...")
            try:
                selects = page.query_selector_all('select')
                if selects:
                    selects[0].select_option('1-3 days')
                    time.sleep(2)
            except:
                print("  ⚠️  Duration dropdown not found")
            
            print("  → Scrolling to submit...")
            page.evaluate('window.scrollTo(0, 1000)')
            time.sleep(2)
            
            print("  → Submitting assessment...")
            try:
                page.click('button:has-text("Submit")', timeout=5000)
                time.sleep(3)
            except:
                print("  ⚠️  Submit button not found")
            
            # SCENE 4: TRIAGE RESULTS (1:40 - 2:10)
            print("\n[1:40-2:10] Scene 4: AI Triage Results")
            print("-" * 70)
            
            print("  → Waiting for results...")
            page.wait_for_load_state('networkidle', timeout=20000)
            time.sleep(3)
            
            print("  → Scrolling through results...")
            page.evaluate('window.scrollTo(0, 0)')
            time.sleep(2)
            page.evaluate('window.scrollTo(0, 400)')
            time.sleep(2)
            page.evaluate('window.scrollTo(0, 800)')
            time.sleep(2)
            page.evaluate('window.scrollTo(0, 1200)')
            time.sleep(2)
            
            # SCENE 5: PROVIDER SEARCH (2:10 - 2:40)
            print("\n[2:10-2:40] Scene 5: Provider Search in Tamil")
            print("-" * 70)
            
            print("  → Navigating to provider search...")
            page.goto(f"{app_url}/provider-search", wait_until='networkidle')
            time.sleep(3)
            
            print("  → Switching to Tamil...")
            try:
                page.click('button:has-text("हिंदी")', timeout=5000)
                time.sleep(1)
                page.click('text=தமிழ்', timeout=5000)
                time.sleep(2)
            except:
                print("  ⚠️  Language switch failed")
            
            print("  → Searching for provider...")
            try:
                search_input = page.query_selector('input[type="text"]')
                if search_input:
                    search_input.fill('Cardiologist')
                    time.sleep(2)
                    page.click('button:has-text("Search")', timeout=5000)
                    time.sleep(3)
            except:
                print("  ⚠️  Search failed")
            
            print("  → Scrolling results...")
            page.evaluate('window.scrollTo(0, 400)')
            time.sleep(2)
            page.evaluate('window.scrollTo(0, 800)')
            time.sleep(2)
            
            # SCENE 6: SUPERVISOR (2:40 - 3:00)
            print("\n[2:40-3:00] Scene 6: Supervisor Dashboard")
            print("-" * 70)
            
            print("  → Navigating to login...")
            page.goto(app_url, wait_until='networkidle')
            time.sleep(2)
            
            print("  → Logging in as Supervisor...")
            page.click('button:has-text("Login as Supervisor")', timeout=10000)
            time.sleep(3)
            
            print("  → Opening supervisor dashboard...")
            page.goto(f"{app_url}/supervisor-dashboard", wait_until='networkidle')
            time.sleep(3)
            
            print("  → Scrolling dashboard...")
            page.evaluate('window.scrollTo(0, 300)')
            time.sleep(2)
            page.evaluate('window.scrollTo(0, 600)')
            time.sleep(2)
            page.evaluate('window.scrollTo(0, 0)')
            time.sleep(2)
            
            print("\n" + "="*70)
            print("✅ RECORDING COMPLETE!")
            print("="*70 + "\n")
            
        except Exception as e:
            print(f"\n❌ ERROR: {str(e)}")
            import traceback
            traceback.print_exc()
        
        finally:
            print("Closing browser and saving video...")
            context.close()
            browser.close()
            
            # Find video file
            video_files = [f for f in os.listdir('.') if f.endswith('.webm')]
            if video_files:
                video_file = video_files[0]
                output_file = "Arogya_AI_Automated_Recording.webm"
                
                if os.path.exists(output_file):
                    os.remove(output_file)
                os.rename(video_file, output_file)
                
                file_size = os.path.getsize(output_file) / (1024 * 1024)
                print(f"\n✅ Video saved: {output_file}")
                print(f"   Size: {file_size:.1f} MB")
                print(f"   Format: WebM (convert to MP4 if needed)")
            else:
                print("\n⚠️  No video file found")

if __name__ == "__main__":
    try:
        record_demo()
        print("\n🎉 SUCCESS!")
        print("\nNext steps:")
        print("1. Convert WebM to MP4: ffmpeg -i input.webm -c:v libx264 output.mp4")
        print("2. Add voiceover using video editor")
        print("3. Upload to YouTube\n")
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
    except Exception as e:
        print(f"\n❌ FAILED: {str(e)}")
