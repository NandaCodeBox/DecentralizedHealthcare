"""
Simple Mobile Demo Recording - Robust Version
Synchronized with voiceover (108 seconds)
"""

from playwright.sync_api import sync_playwright
import time

def record_mobile_demo():
    """Record mobile demo with proper timing"""
    
    with sync_playwright() as p:
        # Launch browser with mobile viewport
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(
            viewport={'width': 390, 'height': 844},
            device_scale_factor=3,
            is_mobile=True,
            has_touch=True,
            record_video_dir=".",
            record_video_size={"width": 390, "height": 844}
        )
        
        page = context.new_page()
        
        print("Starting mobile demo recording...")
        print("Total duration: ~108 seconds\n")
        
        # Scene 1: Login (0-15s)
        print("Scene 1: Login (15s)")
        page.goto('http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com/login')
        time.sleep(3)
        page.fill('input[type="email"]', 'patient@arogya.ai')
        time.sleep(1)
        page.fill('input[type="password"]', 'PatientPass123!')
        time.sleep(1)
        page.click('button[type="submit"]')
        time.sleep(5)
        
        # Scene 2: Language Switch (15-22s = 7s)
        print("Scene 2: Language Switch (7s)")
        page.click('button:has-text("English")')
        time.sleep(1.5)
        page.click('text=हिंदी')
        time.sleep(4.5)
        
        # Scene 3: Symptom Intake (22-45s = 23s)
        print("Scene 3: Symptom Intake (23s)")
        page.goto('http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com/symptom-intake')
        time.sleep(3)
        
        # Select symptoms quickly
        page.click('[data-testid="symptom-fever"]')
        time.sleep(1)
        page.click('[data-testid="symptom-headache"]')
        time.sleep(1)
        page.click('[data-testid="symptom-fatigue"]')
        time.sleep(2)
        
        # Scroll and select severity
        page.evaluate('window.scrollTo(0, 400)')
        time.sleep(1.5)
        # Click moderate (2nd button)
        page.click('button.px-4.py-3.rounded-lg >> nth=1')
        time.sleep(1.5)
        
        # Select duration
        page.evaluate('window.scrollTo(0, 600)')
        time.sleep(1)
        page.select_option('[data-testid="duration-select"]', '1_3_days')
        time.sleep(1.5)
        
        # Scroll to submit
        page.evaluate('window.scrollTo(0, 900)')
        time.sleep(1.5)
        page.click('button[type="submit"]')
        time.sleep(6)
        
        # Scene 4: Triage Results (45-73s = 28s)
        print("Scene 4: Triage Results (28s)")
        time.sleep(3)
        page.evaluate('window.scrollTo(0, 400)')
        time.sleep(3)
        page.evaluate('window.scrollTo(0, 700)')
        time.sleep(3)
        
        # Show booking modal
        page.evaluate('window.scrollTo(0, 500)')
        time.sleep(1)
        page.click('[data-testid="book-appointment-1"]')
        time.sleep(2)
        page.click('button:has-text("Cancel")')
        time.sleep(1)
        
        # Scene 5: Provider Search (73-95s = 22s)
        print("Scene 5: Provider Search (22s)")
        page.goto('http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com/provider-search')
        time.sleep(2)
        
        # Type search
        page.fill('[data-testid="provider-search-input"]', 'chest pain shortness of breath')
        time.sleep(2)
        page.click('button:has-text("AI Search")')
        time.sleep(3)
        
        # Show results
        time.sleep(2)
        page.evaluate('window.scrollTo(0, 400)')
        time.sleep(2)
        page.evaluate('window.scrollTo(0, 600)')
        time.sleep(2)
        
        # Scene 6: Supervisor Dashboard (95-108s = 13s)
        print("Scene 6: Supervisor Dashboard (13s)")
        # Logout
        page.goto('http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com/')
        time.sleep(2)
        page.click('button:has-text("Sign Out")')
        time.sleep(2)
        
        # Login as supervisor
        page.fill('input[type="email"]', 'supervisor@arogya.ai')
        time.sleep(0.5)
        page.fill('input[type="password"]', 'SupervisorPass123!')
        time.sleep(0.5)
        page.click('button[type="submit"]')
        time.sleep(2)
        
        # Go to supervisor dashboard
        page.goto('http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com/supervisor-dashboard')
        time.sleep(2)
        
        # Show validation queue
        time.sleep(1.5)
        page.click('.border.rounded-lg.p-4')
        time.sleep(1.5)
        
        # Final pause
        time.sleep(1)
        
        print("\n✓ Recording complete!")
        print("Total duration: ~108 seconds")
        
        # Close browser
        context.close()
        browser.close()

if __name__ == "__main__":
    record_mobile_demo()
