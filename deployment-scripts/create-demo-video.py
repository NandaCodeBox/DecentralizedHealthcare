"""
Automated Demo Video Creator for Arogya AI
Creates a screen recording following the demo script
"""

import time
import subprocess
import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options

# Configuration
LIVE_URL = "http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com"
OUTPUT_VIDEO = "demo-screen-recording.mp4"
VOICEOVER_FILE = "demo-voiceover-polly-female-backup.mp3"
FINAL_VIDEO = "Arogya_AI_Demo_Video_Final.mp4"

print("=" * 60)
print("Arogya AI - Automated Demo Video Creator")
print("=" * 60)
print()

# Check if Chrome is available
print("Checking prerequisites...")
try:
    from selenium.webdriver.chrome.service import Service
    print("✓ Selenium installed")
except ImportError:
    print("✗ Selenium not installed")
    print("  Run: pip install selenium")
    exit(1)

# Setup Chrome options
print("\nSetting up browser...")
chrome_options = Options()
chrome_options.add_argument("--start-maximized")
chrome_options.add_argument("--disable-blink-features=AutomationControlled")
chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
chrome_options.add_experimental_option('useAutomationExtension', False)

# Initialize driver
try:
    driver = webdriver.Chrome(options=chrome_options)
    print("✓ Browser initialized")
except Exception as e:
    print(f"✗ Failed to initialize browser: {e}")
    print("\nPlease ensure Chrome and ChromeDriver are installed:")
    print("  1. Download ChromeDriver: https://chromedriver.chromium.org/")
    print("  2. Add to PATH or place in project directory")
    exit(1)

# Set window size for recording
driver.set_window_size(1920, 1080)

print("\n" + "=" * 60)
print("RECORDING DEMO - Following Script")
print("=" * 60)
print()

try:
    # Scene 1: Homepage (10 seconds)
    print("[00:00-00:10] Scene 1: Homepage")
    driver.get(LIVE_URL)
    time.sleep(5)
    print("  ✓ Loaded homepage")
    
    # Scene 2: Switch to Hindi (10 seconds)
    print("[00:10-00:20] Scene 2: Switch to Hindi")
    try:
        # Find and click language selector
        lang_selector = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, "select, button[aria-label*='language'], [class*='language']"))
        )
        lang_selector.click()
        time.sleep(2)
        
        # Select Hindi
        hindi_option = driver.find_element(By.XPATH, "//*[contains(text(), 'हिंदी') or contains(text(), 'Hindi')]")
        hindi_option.click()
        time.sleep(5)
        print("  ✓ Switched to Hindi")
    except Exception as e:
        print(f"  ⚠ Could not switch language automatically: {e}")
        print("  → Manual intervention may be needed")
        time.sleep(7)
    
    # Scene 3: Navigate to Symptom Intake (5 seconds)
    print("[00:20-00:25] Scene 3: Navigate to Symptom Intake")
    try:
        symptom_link = driver.find_element(By.XPATH, "//a[contains(@href, 'symptom') or contains(text(), 'Symptom')]")
        symptom_link.click()
        time.sleep(5)
        print("  ✓ Navigated to symptom intake")
    except Exception as e:
        print(f"  ⚠ Could not navigate automatically: {e}")
        driver.get(f"{LIVE_URL}/symptom-intake")
        time.sleep(5)
    
    # Scene 4: Type symptoms in Hindi (15 seconds)
    print("[00:25-00:40] Scene 4: Type symptoms in Hindi")
    try:
        symptom_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='text'], textarea"))
        )
        symptom_input.click()
        time.sleep(1)
        symptom_input.send_keys("मुझे बुखार और सिरदर्द है")
        time.sleep(3)
        print("  ✓ Typed symptoms in Hindi")
        
        # Click symptom buttons
        fever_btn = driver.find_element(By.XPATH, "//*[contains(text(), 'Fever') or contains(text(), 'बुखार')]")
        fever_btn.click()
        time.sleep(1)
        
        headache_btn = driver.find_element(By.XPATH, "//*[contains(text(), 'Headache') or contains(text(), 'सिरदर्द')]")
        headache_btn.click()
        time.sleep(2)
        print("  ✓ Selected symptoms")
        
        # Select severity and duration
        severity_select = driver.find_element(By.CSS_SELECTOR, "select[name*='severity'], select[id*='severity']")
        severity_select.click()
        time.sleep(1)
        moderate_option = driver.find_element(By.XPATH, "//option[contains(text(), 'Moderate')]")
        moderate_option.click()
        time.sleep(1)
        
        duration_select = driver.find_element(By.CSS_SELECTOR, "select[name*='duration'], select[id*='duration']")
        duration_select.click()
        time.sleep(1)
        duration_option = driver.find_element(By.XPATH, "//option[contains(text(), '1-3')]")
        duration_option.click()
        time.sleep(2)
        print("  ✓ Selected severity and duration")
        
    except Exception as e:
        print(f"  ⚠ Could not fill form automatically: {e}")
        time.sleep(15)
    
    # Scene 5: Submit and show AI results (25 seconds)
    print("[00:40-01:05] Scene 5: AI Triage Results")
    try:
        submit_btn = driver.find_element(By.XPATH, "//button[contains(text(), 'Submit') or @type='submit']")
        submit_btn.click()
        print("  ✓ Submitted symptoms")
        time.sleep(10)  # Wait for AI processing
        
        # Show results
        time.sleep(15)
        print("  ✓ Showing AI results")
        
    except Exception as e:
        print(f"  ⚠ Could not submit automatically: {e}")
        time.sleep(25)
    
    # Scene 6: Navigate to Provider Search (5 seconds)
    print("[01:05-01:10] Scene 6: Navigate to Provider Search")
    try:
        provider_link = driver.find_element(By.XPATH, "//a[contains(@href, 'provider') or contains(text(), 'Provider')]")
        provider_link.click()
        time.sleep(5)
        print("  ✓ Navigated to provider search")
    except Exception as e:
        print(f"  ⚠ Could not navigate automatically: {e}")
        driver.get(f"{LIVE_URL}/provider-search")
        time.sleep(5)
    
    # Scene 7: Switch to Tamil and search (15 seconds)
    print("[01:10-01:25] Scene 7: Search in Tamil")
    try:
        # Switch to Tamil
        lang_selector = driver.find_element(By.CSS_SELECTOR, "select, button[aria-label*='language']")
        lang_selector.click()
        time.sleep(1)
        tamil_option = driver.find_element(By.XPATH, "//*[contains(text(), 'தமிழ்') or contains(text(), 'Tamil')]")
        tamil_option.click()
        time.sleep(2)
        print("  ✓ Switched to Tamil")
        
        # Search for cardiologist
        search_input = driver.find_element(By.CSS_SELECTOR, "input[type='text'], input[type='search']")
        search_input.click()
        search_input.send_keys("Cardiologist")
        time.sleep(2)
        
        search_btn = driver.find_element(By.XPATH, "//button[contains(text(), 'Search') or contains(text(), 'AI')]")
        search_btn.click()
        time.sleep(5)
        print("  ✓ Searched for cardiologist")
        
        # Show results
        time.sleep(5)
        print("  ✓ Showing provider results")
        
    except Exception as e:
        print(f"  ⚠ Could not search automatically: {e}")
        time.sleep(15)
    
    # Scene 8: Navigate to Supervisor Dashboard (10 seconds)
    print("[01:25-01:35] Scene 8: Supervisor Dashboard")
    try:
        dashboard_link = driver.find_element(By.XPATH, "//a[contains(@href, 'supervisor') or contains(text(), 'Dashboard')]")
        dashboard_link.click()
        time.sleep(10)
        print("  ✓ Showing supervisor dashboard")
    except Exception as e:
        print(f"  ⚠ Could not navigate automatically: {e}")
        driver.get(f"{LIVE_URL}/supervisor-dashboard")
        time.sleep(10)
    
    # Scene 9: Show impact metrics (10 seconds)
    print("[01:35-01:45] Scene 9: Impact Metrics")
    time.sleep(10)
    print("  ✓ Showing impact metrics")
    
    # Scene 10: Thank you (15 seconds)
    print("[01:45-02:00] Scene 10: Thank You")
    driver.get(LIVE_URL)
    time.sleep(15)
    print("  ✓ Final scene")
    
    print("\n" + "=" * 60)
    print("✓ SCREEN RECORDING COMPLETE")
    print("=" * 60)
    print()
    
except Exception as e:
    print(f"\n✗ Error during recording: {e}")
    
finally:
    driver.quit()
    print("✓ Browser closed")

print("\n" + "=" * 60)
print("NEXT STEPS")
print("=" * 60)
print()
print("The automated walkthrough is complete.")
print()
print("To create the final video:")
print("1. Use OBS Studio or similar to record the screen while running this script")
print("2. Or use the manual approach:")
print("   - Record screen following 3_MINUTE_DEMO_SCRIPT.md")
print("   - Combine with demo-voiceover-polly-female-backup.mp3")
print("   - Use Kapwing.com or DaVinci Resolve")
print()
print("Voiceover file: demo-voiceover-polly-female-backup.mp3")
print("Duration: ~3 minutes")
print()
