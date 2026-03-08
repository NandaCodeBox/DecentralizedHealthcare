// Automated Screenshot Testing Script for Arogya AI
// Run with: node test-screenshots.js

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const APP_URL = 'http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

// Create screenshots directory
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR);
}

async function testAllUseCases() {
  console.log('🚀 Starting automated testing...\n');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  try {
    // ========================================
    // USE CASE 1: AI SYMPTOM TRIAGE
    // ========================================
    console.log('📋 Testing Use Case 1: AI Symptom Triage');
    
    // Step 1: Homepage
    console.log('  → Navigating to homepage...');
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, '01-homepage.png'),
      fullPage: true 
    });
    console.log('  ✅ Screenshot: 01-homepage.png');

    // Step 2: Navigate to symptom intake
    console.log('  → Navigating to symptom intake...');
    await page.click('text=Report Symptoms');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, '02-symptom-intake-page.png'),
      fullPage: true 
    });
    console.log('  ✅ Screenshot: 02-symptom-intake-page.png');

    // Step 3: Fill symptom form
    console.log('  → Filling symptom form...');
    await page.fill('input[name="primarySymptom"]', 'Fever');
    await page.fill('textarea[name="description"]', 'High fever with headache and body aches for 2 days');
    await page.fill('input[type="range"]', '7');
    await page.fill('input[name="duration"]', '2 days');
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, '03-symptom-form-filled.png'),
      fullPage: true 
    });
    console.log('  ✅ Screenshot: 03-symptom-form-filled.png');

    // Step 4: Submit and view results
    console.log('  → Submitting form...');
    await page.click('button:has-text("Get AI Triage Assessment")');
    await page.waitForTimeout(2000); // Wait for AI processing
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, '04-triage-results.png'),
      fullPage: true 
    });
    console.log('  ✅ Screenshot: 04-triage-results.png');

    // ========================================
    // USE CASE 2: AI PROVIDER SEARCH
    // ========================================
    console.log('\n📋 Testing Use Case 2: AI Provider Search');
    
    // Step 1: Navigate to provider search
    console.log('  → Navigating to provider search...');
    await page.goto(`${APP_URL}/provider-search`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, '05-provider-search-page.png'),
      fullPage: true 
    });
    console.log('  ✅ Screenshot: 05-provider-search-page.png');

    // Step 2: Enter search query
    console.log('  → Entering search query...');
    await page.fill('input[type="text"]', 'chest pain and shortness of breath');
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, '06-search-query-entered.png'),
      fullPage: true 
    });
    console.log('  ✅ Screenshot: 06-search-query-entered.png');

    // Step 3: Click AI Search and view results
    console.log('  → Clicking AI Search...');
    await page.click('button:has-text("AI Search")');
    await page.waitForTimeout(2000); // Wait for AI processing
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, '07-provider-search-results.png'),
      fullPage: true 
    });
    console.log('  ✅ Screenshot: 07-provider-search-results.png');

    // ========================================
    // USE CASE 3: SUPERVISOR DASHBOARD
    // ========================================
    console.log('\n📋 Testing Use Case 3: Supervisor Dashboard');
    
    // Step 1: Navigate to supervisor dashboard
    console.log('  → Navigating to supervisor dashboard...');
    await page.goto(`${APP_URL}/supervisor-dashboard`);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, '08-supervisor-dashboard.png'),
      fullPage: true 
    });
    console.log('  ✅ Screenshot: 08-supervisor-dashboard.png');

    // Step 2: Click on low confidence case
    console.log('  → Clicking on low confidence case...');
    const lowConfidenceCase = await page.locator('text=65%').first();
    if (await lowConfidenceCase.isVisible()) {
      await lowConfidenceCase.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ 
        path: path.join(SCREENSHOTS_DIR, '09-low-confidence-case-detail.png'),
        fullPage: true 
      });
      console.log('  ✅ Screenshot: 09-low-confidence-case-detail.png');
    }

    console.log('\n✅ All tests completed successfully!');
    console.log(`📁 Screenshots saved to: ${SCREENSHOTS_DIR}`);

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the tests
testAllUseCases().catch(console.error);
