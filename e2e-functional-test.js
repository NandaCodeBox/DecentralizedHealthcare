// End-to-End Functional Testing with Data Entry and Validation
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const APP_URL = 'http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com';
const SCREENSHOTS_DIR = path.join(__dirname, 'test-results');
const ISSUES = [];

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR);
}

function logIssue(severity, useCase, description) {
  ISSUES.push({ severity, useCase, description });
  console.log(`   ⚠️  ${severity.toUpperCase()}: ${description}`);
}

function logSuccess(message) {
  console.log(`   ✅ ${message}`);
}

async function testUseCase1(page) {
  console.log('\n' + '='.repeat(70));
  console.log('📋 USE CASE 1: AI-Powered Symptom Triage');
  console.log('='.repeat(70) + '\n');

  try {
    // Test 1.1: Homepage loads
    console.log('🧪 Test 1.1: Homepage loads correctly');
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Check for key elements
    const title = await page.textContent('h1');
    if (title && title.includes('Healthcare OS')) {
      logSuccess('Homepage title found: "Healthcare OS"');
    } else {
      logIssue('HIGH', 'Use Case 1', 'Homepage title not found or incorrect');
    }
    
    // Check online status
    const onlineStatus = await page.locator('text=/online/i').first();
    if (await onlineStatus.isVisible()) {
      logSuccess('Online status indicator visible');
    } else {
      logIssue('MEDIUM', 'Use Case 1', 'Online status not visible');
    }
    
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, 'test1-01-homepage.png'),
      fullPage: true 
    });
    logSuccess('Screenshot captured: test1-01-homepage.png');

    // Test 1.2: Navigate to symptom intake
    console.log('\n🧪 Test 1.2: Navigate to symptom intake page');
    const reportButton = await page.locator('text=/Report Symptoms/i').first();
    if (await reportButton.isVisible()) {
      logSuccess('Report Symptoms button found');
      await reportButton.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      if (currentUrl.includes('symptom-intake')) {
        logSuccess('Navigated to symptom intake page');
      } else {
        logIssue('HIGH', 'Use Case 1', `Navigation failed. Current URL: ${currentUrl}`);
      }
    } else {
      logIssue('CRITICAL', 'Use Case 1', 'Report Symptoms button not found');
      return;
    }
    
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, 'test1-02-symptom-intake-empty.png'),
      fullPage: true 
    });
    logSuccess('Screenshot captured: test1-02-symptom-intake-empty.png');

    // Test 1.3: Add symptoms
    console.log('\n🧪 Test 1.3: Add symptoms using quick select buttons');
    
    // Try to click Fever button
    try {
      const feverButton = await page.locator('button:has-text("Fever")').first();
      await feverButton.waitFor({ state: 'visible', timeout: 5000 });
      await feverButton.click();
      await page.waitForTimeout(1000);
      logSuccess('Clicked "Fever" symptom');
      
      // Check if symptom was added
      const selectedSymptoms = await page.locator('text=/Your Symptoms/i').first();
      if (await selectedSymptoms.isVisible()) {
        logSuccess('Symptom added to selection');
      }
    } catch (error) {
      logIssue('HIGH', 'Use Case 1', `Failed to click Fever button: ${error.message}`);
    }
    
    // Try to click Headache button
    try {
      const headacheButton = await page.locator('button:has-text("Headache")').first();
      await headacheButton.click();
      await page.waitForTimeout(1000);
      logSuccess('Clicked "Headache" symptom');
    } catch (error) {
      logIssue('MEDIUM', 'Use Case 1', `Failed to click Headache button: ${error.message}`);
    }
    
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, 'test1-03-symptoms-selected.png'),
      fullPage: true 
    });
    logSuccess('Screenshot captured: test1-03-symptoms-selected.png');

    // Test 1.4: Fill additional information
    console.log('\n🧪 Test 1.4: Fill additional information');
    
    try {
      const textareas = await page.locator('textarea').all();
      if (textareas.length > 0) {
        await textareas[0].fill('High fever (102°F) with severe headache. Started 2 days ago.');
        await page.waitForTimeout(1000);
        logSuccess('Additional information filled');
      } else {
        logIssue('LOW', 'Use Case 1', 'No textarea found for additional information');
      }
    } catch (error) {
      logIssue('MEDIUM', 'Use Case 1', `Failed to fill additional info: ${error.message}`);
    }
    
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, 'test1-04-form-filled.png'),
      fullPage: true 
    });
    logSuccess('Screenshot captured: test1-04-form-filled.png');

    // Test 1.5: Submit form
    console.log('\n🧪 Test 1.5: Submit symptom form');
    
    try {
      const submitButton = await page.locator('button:has-text("Get AI Triage"), button:has-text("Submit"), button:has-text("Continue")').first();
      await submitButton.waitFor({ state: 'visible', timeout: 5000 });
      await submitButton.click();
      logSuccess('Submit button clicked');
      
      await page.waitForTimeout(3000); // Wait for navigation and AI processing
      
      const currentUrl = page.url();
      if (currentUrl.includes('triage') || currentUrl.includes('dashboard')) {
        logSuccess('Form submitted successfully, navigated to results');
      } else {
        logIssue('HIGH', 'Use Case 1', `Form submission may have failed. URL: ${currentUrl}`);
      }
    } catch (error) {
      logIssue('CRITICAL', 'Use Case 1', `Failed to submit form: ${error.message}`);
    }
    
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, 'test1-05-triage-results.png'),
      fullPage: true 
    });
    logSuccess('Screenshot captured: test1-05-triage-results.png');

    // Test 1.6: Verify AI results
    console.log('\n🧪 Test 1.6: Verify AI triage results display');
    
    try {
      // Check for confidence score
      const confidenceScore = await page.locator('text=/%/i').first();
      if (await confidenceScore.isVisible()) {
        const scoreText = await confidenceScore.textContent();
        logSuccess(`AI confidence score found: ${scoreText}`);
      } else {
        logIssue('HIGH', 'Use Case 1', 'AI confidence score not displayed');
      }
      
      // Check for facility recommendations
      const facilities = await page.locator('text=/facility|hospital|clinic/i').all();
      if (facilities.length > 0) {
        logSuccess(`Found ${facilities.length} facility recommendations`);
      } else {
        logIssue('MEDIUM', 'Use Case 1', 'No facility recommendations found');
      }
    } catch (error) {
      logIssue('MEDIUM', 'Use Case 1', `Failed to verify results: ${error.message}`);
    }

    console.log('\n✅ Use Case 1 Testing Complete\n');

  } catch (error) {
    logIssue('CRITICAL', 'Use Case 1', `Unexpected error: ${error.message}`);
    console.error(error.stack);
  }
}

async function testUseCase2(page) {
  console.log('\n' + '='.repeat(70));
  console.log('📋 USE CASE 2: AI Semantic Provider Search');
  console.log('='.repeat(70) + '\n');

  try {
    // Test 2.1: Navigate to provider search
    console.log('🧪 Test 2.1: Navigate to provider search page');
    await page.goto(`${APP_URL}/provider-search`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    if (currentUrl.includes('provider-search')) {
      logSuccess('Provider search page loaded');
    } else {
      logIssue('CRITICAL', 'Use Case 2', `Failed to load provider search. URL: ${currentUrl}`);
      return;
    }
    
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, 'test2-01-provider-search-page.png'),
      fullPage: true 
    });
    logSuccess('Screenshot captured: test2-01-provider-search-page.png');

    // Test 2.2: Enter search query
    console.log('\n🧪 Test 2.2: Enter natural language search query');
    
    try {
      const searchInput = await page.locator('input[type="text"], input[type="search"], textarea').first();
      await searchInput.waitFor({ state: 'visible', timeout: 5000 });
      await searchInput.fill('chest pain and shortness of breath');
      await page.waitForTimeout(1000);
      logSuccess('Search query entered: "chest pain and shortness of breath"');
    } catch (error) {
      logIssue('CRITICAL', 'Use Case 2', `Failed to enter search query: ${error.message}`);
      return;
    }
    
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, 'test2-02-query-entered.png'),
      fullPage: true 
    });
    logSuccess('Screenshot captured: test2-02-query-entered.png');

    // Test 2.3: Click AI Search
    console.log('\n🧪 Test 2.3: Execute AI search');
    
    try {
      const searchButton = await page.locator('button:has-text("AI Search"), button:has-text("Search")').first();
      await searchButton.waitFor({ state: 'visible', timeout: 5000 });
      await searchButton.click();
      logSuccess('AI Search button clicked');
      
      await page.waitForTimeout(3000); // Wait for AI processing
    } catch (error) {
      logIssue('HIGH', 'Use Case 2', `Failed to click search button: ${error.message}`);
    }
    
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, 'test2-03-search-results.png'),
      fullPage: true 
    });
    logSuccess('Screenshot captured: test2-03-search-results.png');

    // Test 2.4: Verify search results
    console.log('\n🧪 Test 2.4: Verify provider search results');
    
    try {
      // Check for AI specialty suggestions
      const specialties = await page.locator('text=/cardiologist|emergency|doctor/i').all();
      if (specialties.length > 0) {
        logSuccess(`Found ${specialties.length} specialty suggestions`);
      } else {
        logIssue('MEDIUM', 'Use Case 2', 'No specialty suggestions found');
      }
      
      // Check for provider cards
      const providers = await page.locator('text=/Dr\\.|Doctor/i').all();
      if (providers.length > 0) {
        logSuccess(`Found ${providers.length} provider results`);
      } else {
        logIssue('HIGH', 'Use Case 2', 'No provider results displayed');
      }
      
      // Check for match scores
      const matchScores = await page.locator('text=/%.*Match/i').all();
      if (matchScores.length > 0) {
        logSuccess(`Found ${matchScores.length} AI match scores`);
      } else {
        logIssue('MEDIUM', 'Use Case 2', 'No AI match scores displayed');
      }
    } catch (error) {
      logIssue('MEDIUM', 'Use Case 2', `Failed to verify results: ${error.message}`);
    }

    console.log('\n✅ Use Case 2 Testing Complete\n');

  } catch (error) {
    logIssue('CRITICAL', 'Use Case 2', `Unexpected error: ${error.message}`);
    console.error(error.stack);
  }
}

async function testUseCase3(page) {
  console.log('\n' + '='.repeat(70));
  console.log('📋 USE CASE 3: Human-in-the-Loop Validation');
  console.log('='.repeat(70) + '\n');

  try {
    // Test 3.1: Navigate to supervisor dashboard
    console.log('🧪 Test 3.1: Navigate to supervisor dashboard');
    await page.goto(`${APP_URL}/supervisor-dashboard`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    if (currentUrl.includes('supervisor-dashboard')) {
      logSuccess('Supervisor dashboard loaded');
    } else {
      logIssue('CRITICAL', 'Use Case 3', `Failed to load dashboard. URL: ${currentUrl}`);
      return;
    }
    
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, 'test3-01-supervisor-dashboard.png'),
      fullPage: true 
    });
    logSuccess('Screenshot captured: test3-01-supervisor-dashboard.png');

    // Test 3.2: Verify statistics header
    console.log('\n🧪 Test 3.2: Verify dashboard statistics');
    
    try {
      const stats = await page.locator('text=/pending|emergency|confidence/i').all();
      if (stats.length >= 3) {
        logSuccess(`Found ${stats.length} statistics indicators`);
      } else {
        logIssue('MEDIUM', 'Use Case 3', 'Statistics header incomplete');
      }
    } catch (error) {
      logIssue('LOW', 'Use Case 3', `Failed to verify statistics: ${error.message}`);
    }

    // Test 3.3: Verify validation queue
    console.log('\n🧪 Test 3.3: Verify validation queue displays cases');
    
    try {
      // Look for case cards
      const caseCards = await page.locator('[class*="card"], [class*="border"]').all();
      if (caseCards.length >= 4) {
        logSuccess(`Found ${caseCards.length} case cards in queue`);
      } else {
        logIssue('HIGH', 'Use Case 3', `Only ${caseCards.length} cases found, expected 4`);
      }
      
      // Check for patient names
      const patientNames = await page.locator('text=/Rajesh|Priya|Amit|Sunita/i').all();
      if (patientNames.length > 0) {
        logSuccess(`Found ${patientNames.length} patient names`);
      } else {
        logIssue('MEDIUM', 'Use Case 3', 'No patient names found');
      }
    } catch (error) {
      logIssue('MEDIUM', 'Use Case 3', `Failed to verify queue: ${error.message}`);
    }

    // Test 3.4: Identify low confidence cases
    console.log('\n🧪 Test 3.4: Identify low confidence cases (< 70%)');
    
    try {
      const lowConfidence = await page.locator('text=/65%|68%|Low Confidence/i').all();
      if (lowConfidence.length >= 2) {
        logSuccess(`Found ${lowConfidence.length} low confidence indicators`);
      } else {
        logIssue('HIGH', 'Use Case 3', 'Low confidence cases not properly flagged');
      }
      
      // Check for warning icons
      const warnings = await page.locator('[class*="orange"], [class*="yellow"], [class*="warning"]').all();
      if (warnings.length > 0) {
        logSuccess(`Found ${warnings.length} warning indicators`);
      } else {
        logIssue('MEDIUM', 'Use Case 3', 'No visual warning indicators found');
      }
    } catch (error) {
      logIssue('MEDIUM', 'Use Case 3', `Failed to identify low confidence: ${error.message}`);
    }
    
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, 'test3-02-low-confidence-flagged.png'),
      fullPage: true 
    });
    logSuccess('Screenshot captured: test3-02-low-confidence-flagged.png');

    // Test 3.5: Verify action buttons
    console.log('\n🧪 Test 3.5: Verify supervisor action buttons');
    
    try {
      const approveButtons = await page.locator('button:has-text("Approve")').all();
      const overrideButtons = await page.locator('button:has-text("Override")').all();
      const escalateButtons = await page.locator('button:has-text("Escalate")').all();
      
      if (approveButtons.length > 0) {
        logSuccess(`Found ${approveButtons.length} Approve buttons`);
      } else {
        logIssue('HIGH', 'Use Case 3', 'No Approve buttons found');
      }
      
      if (overrideButtons.length > 0) {
        logSuccess(`Found ${overrideButtons.length} Override buttons`);
      } else {
        logIssue('HIGH', 'Use Case 3', 'No Override buttons found');
      }
      
      if (escalateButtons.length > 0) {
        logSuccess(`Found ${escalateButtons.length} Escalate buttons`);
      } else {
        logIssue('MEDIUM', 'Use Case 3', 'No Escalate buttons found');
      }
    } catch (error) {
      logIssue('MEDIUM', 'Use Case 3', `Failed to verify buttons: ${error.message}`);
    }

    console.log('\n✅ Use Case 3 Testing Complete\n');

  } catch (error) {
    logIssue('CRITICAL', 'Use Case 3', `Unexpected error: ${error.message}`);
    console.error(error.stack);
  }
}

async function runAllTests() {
  console.log('\n' + '█'.repeat(70));
  console.log('🎬 AROGYA AI - END-TO-END FUNCTIONAL TESTING');
  console.log('█'.repeat(70));
  console.log(`\n📍 Testing URL: ${APP_URL}`);
  console.log(`📁 Results: ${SCREENSHOTS_DIR}\n`);

  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100 
  });
  const page = await browser.newPage({ 
    viewport: { width: 1440, height: 900 }
  });

  try {
    await testUseCase1(page);
    await testUseCase2(page);
    await testUseCase3(page);

    // Generate test report
    console.log('\n' + '█'.repeat(70));
    console.log('📊 TEST REPORT');
    console.log('█'.repeat(70) + '\n');

    const critical = ISSUES.filter(i => i.severity === 'CRITICAL');
    const high = ISSUES.filter(i => i.severity === 'HIGH');
    const medium = ISSUES.filter(i => i.severity === 'MEDIUM');
    const low = ISSUES.filter(i => i.severity === 'LOW');

    console.log(`Total Issues Found: ${ISSUES.length}`);
    console.log(`  🔴 Critical: ${critical.length}`);
    console.log(`  🟠 High: ${high.length}`);
    console.log(`  🟡 Medium: ${medium.length}`);
    console.log(`  🟢 Low: ${low.length}\n`);

    if (ISSUES.length > 0) {
      console.log('Issues Details:\n');
      ISSUES.forEach((issue, index) => {
        console.log(`${index + 1}. [${issue.severity}] ${issue.useCase}`);
        console.log(`   ${issue.description}\n`);
      });
    } else {
      console.log('🎉 NO ISSUES FOUND! All tests passed successfully!\n');
    }

    // Save report to file
    const report = {
      timestamp: new Date().toISOString(),
      url: APP_URL,
      totalIssues: ISSUES.length,
      issues: ISSUES,
      summary: {
        critical: critical.length,
        high: high.length,
        medium: medium.length,
        low: low.length
      }
    };

    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, 'test-report.json'),
      JSON.stringify(report, null, 2)
    );
    console.log(`📄 Test report saved: ${path.join(SCREENSHOTS_DIR, 'test-report.json')}\n`);

    console.log('█'.repeat(70));
    if (critical.length === 0 && high.length === 0) {
      console.log('✅ TESTING COMPLETE - READY FOR DEMO!');
    } else {
      console.log('⚠️  TESTING COMPLETE - ISSUES NEED ATTENTION');
    }
    console.log('█'.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

runAllTests().catch(console.error);
