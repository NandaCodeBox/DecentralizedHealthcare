// Final Screenshot Capture - All 3 Use Cases
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const APP_URL = 'http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com';
const SCREENSHOTS_DIR = path.join(__dirname, 'final-screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR);
}

async function captureAllScreenshots() {
  console.log('🎬 Arogya AI - Final Screenshot Capture');
  console.log('=' .repeat(60) + '\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    // USE CASE 1: AI SYMPTOM TRIAGE
    console.log('📋 USE CASE 1: AI-Powered Symptom Triage\n');
    
    console.log('   📸 Homepage...');
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, 'usecase1-01-homepage.png'),
      fullPage: true 
    });
    
    console.log('   📸 Symptom Intake Page...');
    await page.goto(`${APP_URL}/symptom-intake`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, 'usecase1-02-symptom-intake.png'),
      fullPage: true 
    });
    
    console.log('   📸 Triage Dashboard (AI Results)...');
    await page.goto(`${APP_URL}/triage-dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, 'usecase1-03-triage-results.png'),
      fullPage: true 
    });
    console.log('   ✅ Use Case 1 Complete\n');

    // USE CASE 2: AI PROVIDER SEARCH
    console.log('📋 USE CASE 2: AI Semantic Provider Search\n');
    
    console.log('   📸 Provider Search Page...');
    await page.goto(`${APP_URL}/provider-search`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, 'usecase2-01-provider-search.png'),
      fullPage: true 
    });
    console.log('   ✅ Use Case 2 Complete\n');

    // USE CASE 3: SUPERVISOR DASHBOARD
    console.log('📋 USE CASE 3: Human-in-the-Loop Validation\n');
    
    console.log('   📸 Supervisor Dashboard...');
    await page.goto(`${APP_URL}/supervisor-dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, 'usecase3-01-supervisor-dashboard.png'),
      fullPage: true 
    });
    console.log('   ✅ Use Case 3 Complete\n');

    // BONUS SCREENSHOTS
    console.log('📱 BONUS: Additional Views\n');
    
    console.log('   📸 Mobile Homepage...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, 'bonus-01-mobile-homepage.png'),
      fullPage: true 
    });
    
    console.log('   📸 Desktop Full Homepage...');
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, 'bonus-02-desktop-full.png'),
      fullPage: false 
    });
    console.log('   ✅ Bonus Screenshots Complete\n');

    // SUMMARY
    console.log('=' .repeat(60));
    console.log('✅ ALL SCREENSHOTS CAPTURED SUCCESSFULLY!');
    console.log('='.repeat(60) + '\n');
    
    const files = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png'));
    console.log(`📁 Location: ${SCREENSHOTS_DIR}`);
    console.log(`📸 Total: ${files.length} screenshots\n`);
    
    console.log('Screenshots:');
    files.sort().forEach((file, i) => {
      const stats = fs.statSync(path.join(SCREENSHOTS_DIR, file));
      const sizeKB = (stats.size / 1024).toFixed(1);
      console.log(`  ${(i+1).toString().padStart(2)}. ${file.padEnd(45)} ${sizeKB.padStart(6)} KB`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 HACKATHON DEMO READY!');
    console.log('='.repeat(60));
    console.log('✅ Use Case 1: AI Symptom Triage');
    console.log('✅ Use Case 2: AI Provider Search');
    console.log('✅ Use Case 3: Supervisor Dashboard');
    console.log('✅ Mobile Responsive View');
    console.log('✅ Desktop Full View');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

captureAllScreenshots().catch(console.error);
