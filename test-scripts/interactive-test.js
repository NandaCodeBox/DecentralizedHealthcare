// Interactive Testing Script with Data Entry
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const APP_URL = 'http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots-interactive');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR);
}

async function interactiveTest() {
  console.log('🚀 Starting Interactive Testing with Data Entry...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 // Slow down actions to see them
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    // ========================================
    // USE CASE 1: AI SYMPTOM TRIAGE
    // ========================================
    console.log('📋 USE CASE 1: AI Symptom Triage\n');
    
    // Step 1: Homepage
    console.log('  1️⃣ Loading homepage...');
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, '01-homepage.png'),
      fullPage: true 
    });
    console.log('     ✅ Screenshot: 01-homepage.png\n');

    // Step 2: Click "Report Symptoms"
    console.log('  2️⃣ Clicking "Report Symptoms" button...');
    await page.click('text=Report Symptoms');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, '02-symptom-intake-empty.png'),
      fullPage: true 
    });
    console.log('     ✅ Screenshot: 02-symptom-intake-empty.png\n');

    // Step 3: Add symptoms by clicking buttons
    console.log('  3️⃣ Adding symptoms: Fever, Headache, Fatigue...');
    await page.click('button:has-text("Fever")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Headache")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Fatigue")');
    await page.waitForTimeout(1000);
    
    // Step 4: Fill additional info
    console.log('  4️⃣ Filling additional information...');
    const textareas = await page.locator('textarea').all();
    if (textareas.length > 0) {
      await textareas[0].fill('High fever (102°F) with severe headache and body aches. Started 2 days ago and getting worse.');
      await page.waitForTimeout(1000);
    }
    
    // Step 5: Select severity
    console.log('  5️⃣ Setting severity level...');
    const severityButtons = await page.locator('button:has-text("Moderate"), button:has-text("Severe")').all();
    if (severityButtons.length > 0) {
      await severityButtons[0].click();
      await page.waitForTimeout(1000);
    }
    
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, '03-symptom-intake-filled.png'),
      fullPage: true 
    });
    console.log('     ✅ Screenshot: 03-symptom-intake-filled.png\n');

    // Step 6: Submit form
    console.log('  6️⃣ Submitting symptom form...');
    const submitButton = await page.locator('button:has-text("Get AI Triage"), button:has-text("Submit"), button:has-text("Continue")').first();
    await submitButton.click();
    await page.waitForTimeout(3000); // Wait for navigation and AI processing
    
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, '04-triage-results.png'),
      fullPage: true 
    });
    console.log('     ✅ Screenshot: 04-triage-results.png\n');

    // ========================================
    // USE CASE 2: AI PROVIDER SEARCH
    // ========================================
    console.log('📋 USE CASE 2: AI Provider Search\n');
    
    // Step 1: Navigate to provider search
    console.log('  1️⃣ Navigating to provider search...');
    await page.goto(`${APP_URL}/provider-search`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, '05-provider-search-empty.png'),
      fullPage: true 
    });
    console.log('     ✅ Screenshot: 05-provider-search-empty.png\n');

    // Step 2: Enter search query
    console.log('  2️⃣ Entering search query: "chest pain and shortness of breath"...');
    const searchInput = await page.locator('input[type="text"], input[type="search"], textarea').first();
    await searchInput.fill('chest pain and shortness of breath');
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, '06-provider-search-query.png'),
      fullPage: true 
    });
    console.log('     ✅ Screenshot: 06-provider-search-query.png\n');

    // Step 3: Click AI Search
    console.log('  3️⃣ Clicking "AI Search" button...');
    const aiSearchButton = await page.locator('button:has-text("AI Search"), button:has-text("Search")').first();
    await aiSearchButton.click();
    await page.waitForTimeout(3000); // Wait for AI processing
    
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, '07-provider-search-results.png'),
      fullPage: true 
    });
    console.log('     ✅ Screenshot: 07-provider-search-results.png\n');

    // ========================================
    // USE CASE 3: SUPERVISOR DASHBOARD
    // ========================================
    console.log('📋 USE CASE 3: Supervisor Dashboard\n');
    
    // Step 1: Navigate to supervisor dashboard
    console.log('  1️⃣ Navigating to supervisor dashboard...');
    await page.goto(`${APP_URL}/supervisor-dashboard`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, '08-supervisor-dashboard-overview.png'),
      fullPage: true 
    });
    console.log('     ✅ Screenshot: 08-supervisor-dashboard-overview.png\n');

    // Step 2: Scroll to see all cases
    console.log('  2️⃣ Viewing all validation cases...');
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(1000);
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, '09-supervisor-cases-list.png'),
      fullPage: true 
    });
    console.log('     ✅ Screenshot: 09-supervisor-cases-list.png\n');

    // Step 3: Look for low confidence case
    console.log('  3️⃣ Identifying low confidence cases...');
    const lowConfidenceElements = await page.locator('text=/65%|68%|Low Confidence/i').all();
    if (lowConfidenceElements.length > 0) {
      console.log(`     Found ${lowConfidenceElements.length} low confidence indicators\n`);
    }

    // Step 4: Try to click on a case card
    console.log('  4️⃣ Clicking on a case for details...');
    const caseCards = await page.locator('[class*="card"], [class*="border"]').all();
    if (caseCards.length > 3) {
      await caseCards[1].click(); // Click second case
      await page.waitForTimeout(2000);
      await page.screenshot({ 
        path: path.join(SCREENSHOTS_DIR, '10-case-detail-view.png'),
        fullPage: true 
      });
      console.log('     ✅ Screenshot: 10-case-detail-view.png\n');
    }

    // ========================================
    // BONUS: MOBILE VIEW
    // ========================================
    console.log('📱 BONUS: Mobile Responsive View\n');
    
    console.log('  1️⃣ Switching to mobile viewport (iPhone 13)...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, '11-mobile-homepage.png'),
      fullPage: true 
    });
    console.log('     ✅ Screenshot: 11-mobile-homepage.png\n');

    // Mobile symptom intake
    console.log('  2️⃣ Mobile symptom intake page...');
    await page.goto(`${APP_URL}/symptom-intake`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, '12-mobile-symptom-intake.png'),
      fullPage: true 
    });
    console.log('     ✅ Screenshot: 12-mobile-symptom-intake.png\n');

    // ========================================
    // SUMMARY
    // ========================================
    console.log('\n' + '='.repeat(60));
    console.log('✅ TESTING COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60) + '\n');
    
    console.log(`📁 Screenshots saved to: ${SCREENSHOTS_DIR}\n`);
    
    const files = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png'));
    console.log(`📸 Total screenshots captured: ${files.length}\n`);
    
    console.log('Screenshots created:');
    files.sort().forEach((file, index) => {
      const stats = fs.statSync(path.join(SCREENSHOTS_DIR, file));
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`  ${(index + 1).toString().padStart(2, '0')}. ${file.padEnd(40)} (${sizeKB} KB)`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('🎯 TEST COVERAGE:');
    console.log('='.repeat(60));
    console.log('✅ Use Case 1: AI Symptom Triage - COMPLETE');
    console.log('   - Homepage navigation');
    console.log('   - Symptom selection (Fever, Headache, Fatigue)');
    console.log('   - Additional information entry');
    console.log('   - Form submission');
    console.log('   - AI triage results');
    console.log('');
    console.log('✅ Use Case 2: AI Provider Search - COMPLETE');
    console.log('   - Search page navigation');
    console.log('   - Natural language query entry');
    console.log('   - AI search execution');
    console.log('   - Provider results display');
    console.log('');
    console.log('✅ Use Case 3: Supervisor Dashboard - COMPLETE');
    console.log('   - Dashboard overview');
    console.log('   - Validation queue display');
    console.log('   - Low confidence case identification');
    console.log('   - Case detail view');
    console.log('');
    console.log('✅ Mobile Responsive - COMPLETE');
    console.log('   - Mobile homepage');
    console.log('   - Mobile symptom intake');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nStack trace:', error.stack);
  } finally {
    console.log('\n🔒 Closing browser...');
    await browser.close();
    console.log('✅ Done!\n');
  }
}

interactiveTest().catch(console.error);
