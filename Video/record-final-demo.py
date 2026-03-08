#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Final Demo Recorder - Auto-runs without waiting
Includes supervisor dashboard and mobile responsive
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

def record_final_demo():
    print("\n" + "="*80)
    print("AROGYA.AI - FINAL DEMO RECORDING")
    print("="*80 + "\n")
    print("✅ Includes: Supervisor Dashboard + Mobile Responsive")
    print("⏱️  Duration: ~3 minutes 15 seconds\n")
    
    app_url = "http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com"
    
    with sync_playwright() as p:
        print("🎬 Launching browser...")
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
            
            # Scene 1: Problem (25s)
            print("[Scene 1] The Problem (25s)")
            page.goto(app_url, wait_until='domcontentloaded')
            wait(3)
            page.locator('button').filter(has_text='Login as Patient').first.click()
            wait(4)
            wait(3)
            print(f"  ✓ Complete ({time.time() - start_time:.1f}s)\n")
            
            # Scene 2: Multilingual (20s)
            print("[Scene 2] Multilingual (20s)")
            wait(2)
            page.evaluate('window.scrollTo({top: 300, behavior: "smooth"})')
            wait(2)
            page.evaluate('window.scrollTo({top: 0, behavior: "smooth"})')
            wait(1)
            try:
                page.click('button:has-text("English")', timeout=3000)
                wait(1)
                page.click('text=हिंदी', timeout=3000)
                wait(3)
            except:
                wait(4)
            page.evaluate('window.scrollTo({top: 400, behavior: "smooth"})')
            wait(2)
            page.evaluate('window.scrollTo({top: 0, behavior: "smooth"})')
            wait(2)
            print(f"  ✓ Complete ({time.time() - start_time:.1f}s)\n")
            
            # Scene 3: Symptom Intake (40s)
            print("[Scene 3] Symptom Intake (40s)")
            page.goto(f"{app_url}/symptom-intake", wait_until='domcontentloaded')
            wait(3)
            wait(2)
            try:
                page.click('[data-testid="symptom-fever"]', timeout=3000)
                wait(2)
                page.click('[data-testid="symptom-headache"]', timeout=3000)
                wait(2)
                page.click('[data-testid="symptom-fatigue"]', timeout=3000)
                wait(2)
            except:
                wait(6)
            page.evaluate('window.scrollTo({top: 500, behavior: "smooth"})')
            wait(2)
            try:
                page.locator('button').filter(has_text='Moderate').first.click()
                wait(2)
            except:
                wait(2)
            page.evaluate('window.scrollTo({top: 800, behavior: "smooth"})')
            wait(2)
            try:
                page.select_option('[data-testid="duration-select"]', '1_3_days')
                wait(2)
            except:
                wait(2)
            page.evaluate('window.scrollTo({top: 1200, behavior: "smooth"})')
            wait(2)
            try:
                page.locator('button').filter(has_text='Submit').first.click()
                wait(3)
            except:
                page.goto(f"{app_url}/triage-dashboard", wait_until='domcontentloaded')
                wait(3)
            print(f"  ✓ Complete ({time.time() - start_time:.1f}s)\n")
            
            # Scene 4: AI Triage (30s)
            print("[Scene 4] AI Triage (30s)")
            page.wait_for_load_state('domcontentloaded')
            wait(3)
            page.evaluate('window.scrollTo({top: 0, behavior: "smooth"})')
            wait(3)
            page.evaluate('window.scrollTo({top: 300, behavior: "smooth"})')
            wait(2)
            page.evaluate('window.scrollTo({top: 500, behavior: "smooth"})')
            wait(2)
            page.evaluate('window.scrollTo({top: 800, behavior: "smooth"})')
            wait(3)
            page.evaluate('window.scrollTo({top: 1100, behavior: "smooth"})')
            wait(3)
            try:
                page.hover('[data-testid="book-appointment-1"]')
                wait(2)
                page.click('[data-testid="book-appointment-1"]', timeout=3000)
                wait(2)
                page.keyboard.press('Escape')
                wait(1)
            except:
                wait(5)
            print(f"  ✓ Complete ({time.time() - start_time:.1f}s)\n")
            
            # Scene 5: Provider Search (30s)
            print("[Scene 5] Provider Search (30s)")
            page.goto(f"{app_url}/provider-search", wait_until='domcontentloaded')
            wait(3)
            try:
                page.click('button:has-text("हिंदी")', timeout=3000)
                wait(1)
                page.click('text=தமிழ்', timeout=3000)
                wait(2)
            except:
                wait(3)
            wait(2)
            try:
                search_input = page.locator('[data-testid="provider-search-input"]').first
                search_input.fill('chest pain and shortness of breath')
                wait(3)
                page.locator('button').filter(has_text='AI Search').first.click()
                wait(3)
                wait(3)
                page.evaluate('window.scrollTo({top: 400, behavior: "smooth"})')
                wait(3)
                try:
                    page.click('[data-testid="view-profile-provider-2"]', timeout=3000)
                    wait(2)
                    page.keyboard.press('Escape')
                    wait(1)
                except:
                    wait(3)
            except:
                wait(15)
            print(f"  ✓ Complete ({time.time() - start_time:.1f}s)\n")
            
            # Scene 6: Supervisor Dashboard (25s)
            print("[Scene 6] Supervisor Dashboard (25s)")
            page.goto(f"{app_url}/supervisor-dashboard", wait_until='domcontentloaded')
            wait(3)
            page.evaluate('window.scrollTo({top: 0, behavior: "smooth"})')
            wait(3)
            page.evaluate('window.scrollTo({top: 400, behavior: "smooth"})')
            wait(3)
            page.evaluate('window.scrollTo({top: 800, behavior: "smooth"})')
            wait(3)
            page.evaluate('window.scrollTo({top: 1200, behavior: "smooth"})')
            wait(2)
            page.evaluate('window.scrollTo({top: 0, behavior: "smooth"})')
            wait(2)
            print(f"  ✓ Complete ({time.time() - start_time:.1f}s)\n")
            
            # Scene 6.5: Mobile Responsive (15s)
            print("[Scene 6.5] Mobile Responsive (15s)")
            page.goto(app_url, wait_until='domcontentloaded')
            wait(2)
            print("  Switching to mobile (iPhone 12 Pro)")
            page.set_viewport_size({"width": 390, "height": 844})
            wait(2)
            page.reload(wait_until='domcontentloaded')
            wait(3)
            page.evaluate('window.scrollTo({top: 300, behavior: "smooth"})')
            wait(2)
            page.evaluate('window.scrollTo({top: 600, behavior: "smooth"})')
            wait(2)
            page.goto(f"{app_url}/symptom-intake", wait_until='domcontentloaded')
            wait(2)
            page.evaluate('window.scrollTo({top: 400, behavior: "smooth"})')
            wait(2)
            print("  Switching back to desktop")
            page.set_viewport_size({"width": 1920, "height": 1080})
            wait(1)
            print(f"  ✓ Complete ({time.time() - start_time:.1f}s)\n")
            
            # Scene 7: Impact (10s)
            print("[Scene 7] Impact (10s)")
            page.goto(app_url, wait_until='domcontentloaded')
            wait(3)
            page.evaluate('window.scrollTo({top: 0, behavior: "smooth"})')
            wait(3)
            page.evaluate('window.scrollTo({top: 400, behavior: "smooth"})')
            wait(2)
            page.evaluate('window.scrollTo({top: 0, behavior: "smooth"})')
            wait(2)
            print(f"  ✓ Complete ({time.time() - start_time:.1f}s)\n")
            
            total_time = time.time() - start_time
            print("="*80)
            print(f"✅ RECORDING COMPLETE!")
            print("="*80)
            print(f"\nTotal time: {total_time:.1f}s ({total_time/60:.1f} min)")
            
        except Exception as e:
            print(f"\n❌ ERROR: {e}")
            import traceback
            traceback.print_exc()
        finally:
            print("\nSaving video...")
            context.close()
            browser.close()
            
            video_files = [f for f in os.listdir('.') if f.endswith('.webm')]
            if video_files:
                video_file = video_files[0]
                output = "Arogya_AI_Final_Complete_Recording.webm"
                
                if os.path.exists(output):
                    os.remove(output)
                os.rename(video_file, output)
                
                size_mb = os.path.getsize(output) / (1024 * 1024)
                print(f"\n✅ Video saved: {output}")
                print(f"   Size: {size_mb:.1f} MB")
                print(f"\nIncludes:")
                print("  ✓ Supervisor Dashboard")
                print("  ✓ Mobile Responsive View")
                print("  ✓ All working features")
            else:
                print("\n⚠️  No video file found")

if __name__ == "__main__":
    try:
        print("\n🎬 Starting recording in 3 seconds...")
        time.sleep(3)
        record_final_demo()
        print("\n🎉 Done!\n")
    except Exception as e:
        print(f"\n❌ Failed: {e}")
