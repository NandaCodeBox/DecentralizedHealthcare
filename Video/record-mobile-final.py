"""
Mobile Demo Recording - Final Version
Synchronized with voiceover timing
Includes supervisor dashboard workflow
"""

from playwright.sync_api import sync_playwright
import time

def record_mobile_demo():
    """Record mobile demo with proper timing for voiceover sync"""
    
    with sync_playwright() as p:
        # Launch browser with mobile viewport (iPhone 12 Pro)
        browser = p.chromium.launch(headless=False)
        context = browser.new_context(
            viewport={'width': 390, 'height': 844},
            device_scale_factor=3,
            is_mobile=True,
            has_touch=True,
            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
        )
        
        page = context.new_page()
        
        # Start recording
        print("Starting mobile demo recording...")
        print("Recording will be synchronized with voiceover timing\n")
        
        # Scene 1: Introduction & Login (0-15s)
        print("Scene 1: Introduction & Login (15s)")
        page.goto('http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com/login')
        time.sleep(3)
        
        # Login
        page.fill('input[type="email"]', 'patient@arogya.ai')
        time.sleep(1)
        page.fill('input[type="password"]', 'PatientPass123!')
        time.sleep(1)
        page.click('button[type="submit"]')
        time.sleep(3)
        
        # Wait for home page (root URL)
        time.sleep(2)
        
        # Scene 2: Language Switch to Hindi (15-22s = 7s)
        print("Scene 2: Language Switch (7s)")
        # Click language selector
        page.click('button:has-text("English")')
        time.sleep(1.5)
        # Select Hindi
        page.click('text=हिंदी')
        time.sleep(2)
        # Show the translated interface
        time.sleep(2.5)
        
        # Scene 3: Navigate to Symptom Intake (22-28s = 6s)
        print("Scene 3: Navigate to Symptom Intake (6s)")
        page.goto('http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com/symptom-intake')
        time.sleep(5)
        
        # Scene 4: Quick Symptom Selection (28-38s = 10s)
        print("Scene 4: Symptom Selection (10s)")
        # Click Fever symptom
        page.click('[data-testid="symptom-fever"]')
        time.sleep(1.5)
        # Click Headache
        page.click('[data-testid="symptom-headache"]')
        time.sleep(1.5)
        # Click Fatigue
        page.click('[data-testid="symptom-fatigue"]')
        time.sleep(1.5)
        # Show selected symptoms
        time.sleep(2)
        # Scroll to severity
        page.evaluate('window.scrollTo(0, 300)')
        time.sleep(2.5)
        
        # Scene 5: Severity & Duration (38-45s = 7s)
        print("Scene 5: Severity & Duration (7s)")
        # Select moderate severity
        page.click('button:has-text("Moderate")')
        time.sleep(1.5)
        # Scroll to duration
        page.evaluate('window.scrollTo(0, 500)')
        time.sleep(1)
        # Select duration
        page.select_option('[data-testid="duration-select"]', '1_3_days')
        time.sleep(1.5)
        # Scroll to submit
        page.evaluate('window.scrollTo(0, 800)')
        time.sleep(2)
        
        # Scene 6: Submit & AI Analysis (45-52s = 7s)
        print("Scene 6: Submit for AI Analysis (7s)")
        page.click('button[type="submit"]')
        time.sleep(2)
        # Wait for triage dashboard
        time.sleep(5)
        
        # Scene 7: AI Triage Results (52-68s = 16s)
        print("Scene 7: AI Triage Results (16s)")
        # Show AI confidence score
        time.sleep(3)
        # Scroll to show facilities
        page.evaluate('window.scrollTo(0, 400)')
        time.sleep(3)
        # Show first facility with AI match
        time.sleep(3)
        # Scroll to show more facilities
        page.evaluate('window.scrollTo(0, 700)')
        time.sleep(3)
        # Show facility details
        time.sleep(3)
        
        # Scene 8: Book Appointment Modal (68-73s = 5s)
        print("Scene 8: Book Appointment (5s)")
        page.evaluate('window.scrollTo(0, 400)')
        time.sleep(1)
        page.click('[data-testid="book-appointment-1"]')
        time.sleep(2)
        # Show booking form
        time.sleep(1.5)
        # Close modal
        page.click('button:has-text("Cancel")')
        time.sleep(0.5)
        
        # Scene 9: Navigate to Provider Search (73-78s = 5s)
        print("Scene 9: Navigate to Provider Search (5s)")
        page.goto('http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com/provider-search')
        time.sleep(4)
        
        # Scene 10: AI Provider Search (78-90s = 12s)
        print("Scene 10: AI Provider Search (12s)")
        # Type search query
        page.fill('[data-testid="provider-search-input"]', 'I have chest pain and shortness of breath')
        time.sleep(2)
        # Click AI Search
        page.click('button:has-text("AI Search")')
        time.sleep(2)
        # Show AI analyzing
        time.sleep(2)
        # Show AI recommendations
        time.sleep(2)
        # Scroll to show providers
        page.evaluate('window.scrollTo(0, 400)')
        time.sleep(2)
        # Show provider details
        time.sleep(1.5)
        
        # Scene 11: Provider Details (90-95s = 5s)
        print("Scene 11: Provider Details (5s)")
        page.evaluate('window.scrollTo(0, 600)')
        time.sleep(2)
        # Show AI match score
        time.sleep(2)
        
        # Scene 12: Navigate to Supervisor Dashboard (95-100s = 5s)
        print("Scene 12: Navigate to Home (5s)")
        # Go to home first
        page.goto('http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com/')
        time.sleep(4)
        
        # Scene 13: Logout and Login as Supervisor (100-108s = 8s)
        print("Scene 13: Switch to Supervisor (8s)")
        # Click profile/logout
        page.click('button:has-text("Sign Out")')
        time.sleep(2)
        time.sleep(1)
        
        # Login as supervisor
        page.fill('input[type="email"]', 'supervisor@arogya.ai')
        time.sleep(0.5)
        page.fill('input[type="password"]', 'SupervisorPass123!')
        time.sleep(0.5)
        page.click('button[type="submit"]')
        time.sleep(2)
        time.sleep(1)
        
        # Scene 14: Supervisor Dashboard (108-118s = 10s)
        print("Scene 14: Supervisor Dashboard (10s)")
        # Navigate to supervisor dashboard
        page.goto('http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com/supervisor-dashboard')
        time.sleep(2)
        time.sleep(2)
        
        # Show validation queue
        time.sleep(2)
        # Click on first validation
        page.click('.border.rounded-lg.p-4')
        time.sleep(2)
        # Show validation details
        time.sleep(1.5)
        
        # Final pause
        time.sleep(0.5)
        
        print("\n✓ Recording complete!")
        print("Total duration: ~118 seconds")
        print("Video saved automatically by Playwright")
        
        # Close browser
        browser.close()

if __name__ == "__main__":
    record_mobile_demo()
