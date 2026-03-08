// End-to-End Testing with Authentication
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const APP_URL = 'http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com';
const SCREENSHOTS_DIR = path.join(__dirname, 'test-results-auth');
const ISSUES = [];

// Test credentials
const TEST_USER = {
  email: 'test@arogya.ai',
  password: 'SecurePass123!'
};

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

async function testAuthentication(page) {
  console.log('\n' + '='.repeat(70));
  console.log('🔐 AUTHENTICATION TESTING');
  console.log('='.repeat(70) + '\n');

  try {
    console.log('🧪 Test: Login with one-click button');
    
    // Navigate to app (should redirect to login)
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // Check if we're on login page
    const currentUrl = page.url();
    if (currentUrl.includes('login')) {
      logSuccess('Redirected to login page (authentication required)');
    } else {
      logIssue('HIGH', 'Authentication', 'Not redirected to login page');
    }
    
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, 'auth-01-login-page.png'),
      fullPage: true 
    });
    logSuccess('Screenshot captured: auth-01-login-page.png');
    
    // Try one-click login button
    console.log('\n🧪 Test: Click one-click login button');
    try {
      const quickLoginButton = await page.locator('button:has-text("Login as Test User")').first();
      await quickLoginButton.waitFor({ state: 'visible', timeout: 5000 });
      logSuccess('One-click login button found');
      
      await quickLoginButton.click();
      logSuccess('Clicked one-click login button');
      
      // Wait for authentication and redirect
      await page.waitForTimeout(5000);
      
      const afterLoginUrl = page.url();
      if (!afterLoginUrl.includes('login')) {
        logSuccess('Successfully logged in and redirected');
      } else {
        logIssue('CRITICAL', 'Authentication', 'Login failed - still on login page');
      }
      
      await page.screenshot({ 
        path: path.join(SCREENSHOTS_DIR, 'auth-02-after-login.png'),
        fullPage: true 
      });
      logSuccess('Screenshot captured: auth-02-after-login.png');
      
    } catch (error) {
      logIssue('CRITICAL', 'Authentication', `One-click login failed: ${error.message}`);
      
      // Fallback: Try manual login
      console.log('\n🧪 Test: Fallback to manual login');
      try {
        const emailInput = await page.locator('input[type="email"]').first();
        await emailInput.fill(TEST_USER.email);
        
        const passwordInput = await page.locator('input[type="password"]').first();
        await passwordInput.fill(TEST_USER.password);
        
        const signInButton = await page.locator('button:has-text("Sign In")').first();
        await signInButton.click();
        
        await page.waitForTimeout(5000);
        logSuccess('Manual login attempted');
      } catch (manualError) {
        logIssue('CRITICAL', 'Authentication', `Manual login also failed: ${manualError.message}`);
        throw new Error('Cannot proceed without authentication');
      }
    }
    
    console.log('\n✅ Authentication Testing Complete\n');
    return true;
    
  } catch (error) {
    logIssue('CRITICAL', 'Authentication', `Authentication failed: ${error.message}`);
    return false;
  }
}

async function testUseCase1(page) {
  console.log('\n' + '='.repeat(70));
  console.log('📋 USE CASE 1: AI-Powered Symptom Triage');
  console.log('='.repeat(70) + '\n');

  try {
    // Test 1.1: Homepage loads
    console.log('🧪 Test 1.1: Homepage loads correctly (authenticated)');
    
    // Should already be on homepage after login
    await page.waitForTimeout(2000);
    
    const title = await page.locator('h1').first().textContent();
    if (title && title.includes('Healthcare')) {
      logSuccess(`Homepage title found: "${title}"`);
    } else {
      logIssue('HIGH', 'Use Case 1', 'Homepage title not found or incorrect');
    }
    
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, 'test1-01-homepage.png'),
      fullPage: true 
    });
    logSuccess('Screenshot captured: test1-01-homepage.png');

    // Test 1.2: Navigate to symptom intake
    console.log('\n🧪 Test 1.2: Navigate to symptom intake page');
    const reportButton = await page.locator('text=/Report Symptoms/i, a[href*="symptom"]').first();
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
      path: path.join(SCREENSHOTS_DIR, 'test1-02-symptom-intake.png'),
      fullPage: true 
    });
    logSuccess('Screenshot captured: test1-02-symptom-intake.png');

    // Test 1.3: Add symptoms
    console.log('\n🧪 Test 1.3: Add symptoms using quick select buttons');
    
    try {
      const feverButton = await page.locator('button[data-testid="symptom-fever"], button:has-text("Fever")').first();
      await feverButton.waitFor({ state: 'visible', timeout: 5000 });
      await feverButton.click();
      await page.waitForTimeout(1000);
      logSuccess('Clicked "Fever" symptom');
      
      const headacheButton = await page.locator('button[data-testid="symptom-headache"], button:has-text("Headache")').first();
      await headacheButton.click();
      await page.waitForTimeout(1000);
      logSuccess('Clicked "Headache" symptom');
    } catch (error) {
      logIssue('HIGH', 'Use Case 1', `Failed to select symptoms: ${error.message}`);
    }
    
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, 'test1-03-symptoms-selected.png'),
      fullPage: true 
    });
    logSuccess('Screenshot captured: test1-03-symptoms-selected.png');

    // Test 1.4: Submit form
    console.log('\n🧪 Test 1.4: Submit symptom form');
    
    try {
      const submitButton = await page.locator('button:has-text("Get AI Triage"), button:has-text("Submit"), button:has-text("Continue")').first();
      await submitButton.waitFor({ state: 'visible', timeout: 5000 });
      await submitButton.click();
      logSuccess('Submit button clicked');
      
      await page.waitForTimeout(3000);
      
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
      path: path.join(SCREENSHOTS_DIR, 'test1-04-triage-results.png'),
      fullPage: true 
    });
    logSuccess('Screenshot captured: test1-04-triage-results.png');

    // Test 1.5: Verify AI results
    console.log('\n🧪 Test 1.5: Verify AI triage results display');
    
    try {
      const confidenceScore = await page.locator('text=/%/i').first();
      if (await confidenceScore.isVisible()) {
        const scoreText = await confidenceScore.textContent();
        logSuccess(`AI confidence score found: ${scoreText}`);
      } else {
        logIssue('HIGH', 'Use Case 1', 'AI confidence score not displayed');
      }
      
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
      path: path.join(SCREENSHOTS_DIR, 'test2-01-provider-search.png'),
      fullPage: true 
    });
    logSuccess('Screenshot captured: test2-01-provider-search.png');

    console.log('\n🧪 Test 2.2: Enter natural language search query');
    
    try {
      const searchInput = await page.locator('input[data-testid="provider-search-input"], input[type="text"], input[type="search"]').first();
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

    console.log('\n🧪 Test 2.3: Execute AI search');
    
    try {
      const searchButton = await page.locator('button:has-text("AI Search"), button:has-text("Search")').first();
      await searchButton.waitFor({ state: 'visible', timeout: 5000 });
      await searchButton.click();
      logSuccess('AI Search button clicked');
      
      await page.waitForTimeout(3000);
    } catch (error) {
      logIssue('HIGH', 'Use Case 2', `Failed to click search button: ${error.message}`);
    }
    
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, 'test2-03-search-results.png'),
      fullPage: true 
    });
    logSuccess('Screenshot captured: test2-03-search-results.png');

    console.log('\n🧪 Test 2.4: Verify search results');
    
    try {
      const specialties = await page.locator('text=/cardiologist|emergency|doctor/i').all();
      if (specialties.length > 0) {
        logSuccess(`Found ${specialties.length} specialty suggestions`);
      } else {
        logIssue('MEDIUM', 'Use Case 2', 'No specialty suggestions found');
      }
      
      const providers = await page.locator('text=/Dr\\.|Doctor/i').all();
      if (providers.length > 0) {
        logSuccess(`Found ${providers.length} provider results`);
      } else {
        logIssue('HIGH', 'Use Case 2', 'No provider results displayed');
      }
      
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

    console.log('\n🧪 Test 3.3: Verify validation queue displays cases');
    
    try {
      const patientNames = await page.locator('text=/Rajesh|Priya|Amit|Sunita/i').all();
      if (patientNames.length >= 4) {
        logSuccess(`Found ${patientNames.length} patient cases`);
      } else {
        logIssue('HIGH', 'Use Case 3', `Only ${patientNames.length} cases found, expected 4`);
      }
    } catch (error) {
      logIssue('MEDIUM', 'Use Case 3', `Failed to verify queue: ${error.message}`);
    }

    console.log('\n🧪 Test 3.4: Identify low confidence cases (< 70%)');
    
    try {
      const lowConfidence = await page.locator('text=/65%|68%|Low Confidence/i').all();
      if (lowConfidence.length >= 2) {
        logSuccess(`Found ${lowConfidence.length} low confidence indicators`);
      } else {
        logIssue('HIGH', 'Use Case 3', 'Low confidence cases not properly flagged');
      }
    } catch (error) {
      logIssue('MEDIUM', 'Use Case 3', `Failed to identify low confidence: ${error.message}`);
    }
    
    await page.screenshot({ 
      path: path.join(SCREENSHOTS_DIR, 'test3-02-low-confidence-flagged.png'),
      fullPage: true 
    });
    logSuccess('Screenshot captured: test3-02-low-confidence-flagged.png');

    console.log('\n🧪 Test 3.5: Verify supervisor action buttons');
    
    try {
      const approveButtons = await page.locator('button[data-testid="approve-button"], button:has-text("Approve")').all();
      const overrideButtons = await page.locator('button[data-testid="override-button"], button:has-text("Override")').all();
      const escalateButtons = await page.locator('button[data-testid="escalate-button"], button:has-text("Escalate")').all();
      
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
  console.log('🎬 AROGYA AI - E2E TESTING WITH AUTHENTICATION');
  console.log('█'.repeat(70));
  console.log(`\n📍 Testing URL: ${APP_URL}`);
  console.log(`📁 Results: ${SCREENSHOTS_DIR}`);
  console.log(`🔐 Test User: ${TEST_USER.email}\n`);

  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 100 
  });
  const page = await browser.newPage({ 
    viewport: { width: 1440, height: 900 }
  });

  try {
    // Test authentication first
    const authSuccess = await testAuthentication(page);
    
    if (!authSuccess) {
      console.log('\n❌ Authentication failed. Cannot proceed with other tests.\n');
      return;
    }
    
    // Run all use case tests
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
      testUser: TEST_USER.email,
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
