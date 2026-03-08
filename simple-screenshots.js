// Simple Screenshot Script - Just navigate and capture
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const APP_URL = 'http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR);
}

async function captureScreenshots() {
  console.log('🚀 Capturing screenshots...\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    // Homepage
    console.log('📸 1/6: Homepage');
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-homepage.png'), fullPage: true });
    
    // Symptom Intake Page
    console.log('📸 2/6: Symptom Intake Page');
    await page.goto(`${APP_URL}/symptom-intake`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-symptom-intake.png'), fullPage: true });
    
    // Triage Dashboard
    console.log('📸 3/6: Triage Dashboard');
    await page.goto(`${APP_URL}/triage-dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-triage-dashboard.png'), fullPage: true });
    
    // Provider Search Page
    console.log('📸 4/6: Provider Search Page');
    await page.goto(`${APP_URL}/provider-search`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-provider-search.png'), fullPage: true });
    
    // Supervisor Dashboard
    console.log('📸 5/6: Supervisor Dashboard');
    await page.goto(`${APP_URL}/supervisor-dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-supervisor-dashboard.png'), fullPage: true });
    
    // Mobile view of homepage
    console.log('📸 6/6: Mobile Homepage');
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-mobile-homepage.png'), fullPage: true });
    
    console.log('\n✅ All screenshots captured successfully!');
    console.log(`📁 Location: ${SCREENSHOTS_DIR}\n`);
    
    // List all screenshots
    const files = fs.readdirSync(SCREENSHOTS_DIR);
    console.log('Screenshots created:');
    files.forEach(file => console.log(`  ✓ ${file}`));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

captureScreenshots().catch(console.error);
