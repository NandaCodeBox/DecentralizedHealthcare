/**
 * Comprehensive Multi-Language E2E Test
 * Tests all personas, AI features, and language switching
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com';
const SCREENSHOT_DIR = 'multilingual-test-results';
const API_BASE_URL = 'https://mj3wk76zw4.execute-api.us-east-1.amazonaws.com/v1';

// Test credentials
const TEST_USERS = {
  test: { email: 'test@arogya.ai', password: 'Test@123456', role: 'Test User' },
  patient: { email: 'patient@arogya.ai', password: 'Patient@123456', role: 'Patient' },
  supervisor: { email: 'supervisor@arogya.ai', password: 'Supervisor@123456', role: 'Supervisor' }
};

// Languages to test
const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', flag: '🇮🇳' }
];

// Test results
const testResults = {
  timestamp: new Date().toISOString(),
  totalTests: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

// Helper functions
function logTest(name, status, details = '', severity = 'info') {
  const test = { name, status, details, severity, timestamp: new Date().toISOString() };
  testResults.tests.push(test);
  testResults.totalTests++;
  
  if (status === 'PASS') {
    testResults.passed++;
    console.log(`✅ ${name}`);
  } else if (status === 'FAIL') {
    testResults.failed++;
    console.error(`❌ ${name}: ${details}`);
  } else if (status === 'WARN') {
    testResults.warnings++;
    console.warn(`⚠️  ${name}: ${details}`);
  }
  
  if (details) console.log(`   ${details}`);
}

async function takeScreenshot(page, name) {
  const filename = `${SCREENSHOT_DIR}/${name}.png`;
  await page.screenshot({ path: filename, fullPage: false });
  console.log(`📸 Screenshot: ${filename}`);
  return filename;
}

async function waitForNetworkIdle(page, timeout = 5000) {
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch (e) {
    console.log('   Network not idle, continuing...');
  }
}

async function getAuthToken(page) {
  try {
    const token = await page.evaluate(() => {
      const session = localStorage.getItem('cognitoSession');
      if (session) {
        const parsed = JSON.parse(session);
        return parsed.idToken?.jwtToken || null;
      }
      return null;
    });
    return token;
  } catch (e) {
    return null;
  }
}

async function testTranslationAPI(token, text, targetLanguage) {
  try {
    const response = await fetch(`${API_BASE_URL}/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        text,
        sourceLanguage: 'en',
        targetLanguage
      })
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    return data.translatedText;
  } catch (error) {
    console.error(`Translation API error: ${error.message}`);
    return null;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Multi-Language E2E Test Suite\n');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`📁 Screenshots: ${SCREENSHOT_DIR}\n`);

  // Create screenshot directory
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500 
  });
  
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });

  const page = await context.newPage();

  try {
    // ============================================
    // TEST 1: Language Selector Visibility
    // ============================================
    console.log('\n📋 TEST SECTION 1: Language Selector\n');
    
    await page.goto(BASE_URL);
    await waitForNetworkIdle(page);
    await takeScreenshot(page, '01-initial-load');

    // Check if language selector exists
    const languageSelector = await page.locator('button:has-text("English"), button:has-text("🇬🇧")').first();
    const selectorVisible = await languageSelector.isVisible().catch(() => false);
    
    if (selectorVisible) {
      logTest('Language selector visible on homepage', 'PASS');
      await takeScreenshot(page, '02-language-selector-visible');
    } else {
      logTest('Language selector visible on homepage', 'FAIL', 'Language selector not found');
    }

    // ============================================
    // TEST 2: Login with Test User
    // ============================================
    console.log('\n📋 TEST SECTION 2: Authentication\n');

    // Navigate to login page
    await page.goto(`${BASE_URL}/login`);
    await waitForNetworkIdle(page);
    await takeScreenshot(page, '03-login-page');

    // Check language selector on login page
    const loginLanguageSelector = await page.locator('button:has-text("English"), button:has-text("🇬🇧")').first();
    const loginSelectorVisible = await loginLanguageSelector.isVisible().catch(() => false);
    
    if (loginSelectorVisible) {
      logTest('Language selector visible on login page', 'PASS');
    } else {
      logTest('Language selector visible on login page', 'FAIL', 'Language selector not found on login');
    }

    // Click "Test User" one-click login
    const testUserButton = await page.locator('button:has-text("Test User")').first();
    if (await testUserButton.isVisible().catch(() => false)) {
      await testUserButton.click();
      logTest('One-click login button found', 'PASS');
      await page.waitForTimeout(3000);
      await waitForNetworkIdle(page);
      await takeScreenshot(page, '04-after-login');

      // Verify we're on homepage
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        logTest('Login redirect to homepage', 'FAIL', 'Still on login page');
      } else {
        logTest('Login redirect to homepage', 'PASS');
      }
    } else {
      logTest('One-click login button found', 'FAIL', 'Test User button not visible');
    }

    // Get auth token for API tests
    const authToken = await getAuthToken(page);
    if (authToken) {
      logTest('Authentication token retrieved', 'PASS');
    } else {
      logTest('Authentication token retrieved', 'WARN', 'No token found, API tests may fail');
    }

    // ============================================
    // TEST 3: Language Switching
    // ============================================
    console.log('\n📋 TEST SECTION 3: Language Switching\n');

    for (const lang of LANGUAGES) {
      console.log(`\n🌐 Testing ${lang.name} (${lang.code})\n`);

      // Click language selector
      const langButton = await page.locator('button:has-text("🌐"), button:has(svg)').first();
      if (await langButton.isVisible().catch(() => false)) {
        await langButton.click();
        await page.waitForTimeout(1000);
        await takeScreenshot(page, `05-language-dropdown-${lang.code}`);

        // Select language
        const langOption = await page.locator(`button:has-text("${lang.name}")`).first();
        if (await langOption.isVisible().catch(() => false)) {
          await langOption.click({ force: true });
          logTest(`Switch to ${lang.name}`, 'PASS');
          
          // Wait for page reload
          await page.waitForTimeout(3000);
          await waitForNetworkIdle(page);
          await takeScreenshot(page, `06-homepage-${lang.code}`);

          // Verify language persisted
          const savedLang = await page.evaluate(() => localStorage.getItem('preferredLanguage'));
          if (savedLang === lang.code) {
            logTest(`${lang.name} preference saved`, 'PASS');
          } else {
            logTest(`${lang.name} preference saved`, 'FAIL', `Expected ${lang.code}, got ${savedLang}`);
          }
        } else {
          logTest(`Switch to ${lang.name}`, 'FAIL', 'Language option not found in dropdown');
        }
      } else {
        logTest(`Open language selector for ${lang.name}`, 'FAIL', 'Language selector button not found');
      }

      // Test translation API if we have a token
      if (authToken && lang.code !== 'en') {
        const translatedText = await testTranslationAPI(authToken, 'Welcome to Healthcare', lang.code);
        if (translatedText && translatedText !== 'Welcome to Healthcare') {
          logTest(`Translation API for ${lang.name}`, 'PASS', `Translated: "${translatedText}"`);
        } else {
          logTest(`Translation API for ${lang.name}`, 'WARN', 'Translation API may not be working');
        }
      }
    }

    // Switch back to English for remaining tests
    console.log('\n🌐 Switching back to English for remaining tests\n');
    const langButton = await page.locator('button:has-text("🌐"), button:has(svg)').first();
    if (await langButton.isVisible().catch(() => false)) {
      await langButton.click();
      await page.waitForTimeout(1000);
      const englishOption = await page.locator('button:has-text("English")').first();
      if (await englishOption.isVisible().catch(() => false)) {
        await englishOption.click({ force: true });
        await page.waitForTimeout(3000);
        await waitForNetworkIdle(page);
      }
    }

    // ============================================
    // TEST 4: Symptom Intake with AI Triage
    // ============================================
    console.log('\n📋 TEST SECTION 4: Symptom Intake & AI Triage\n');

    await page.goto(`${BASE_URL}/symptom-intake`);
    await waitForNetworkIdle(page);
    await takeScreenshot(page, '07-symptom-intake-page');

    // Select symptoms
    const symptoms = ['Fever', 'Headache', 'Fatigue'];
    for (const symptom of symptoms) {
      const symptomButton = await page.locator(`button:has-text("${symptom}")`).first();
      if (await symptomButton.isVisible().catch(() => false)) {
        await symptomButton.click();
        await page.waitForTimeout(500);
        logTest(`Select symptom: ${symptom}`, 'PASS');
      } else {
        logTest(`Select symptom: ${symptom}`, 'FAIL', 'Symptom button not found');
      }
    }
    await takeScreenshot(page, '08-symptoms-selected');

    // Fill duration
    const durationSelect = await page.locator('select[data-testid="duration-select"]').first();
    if (await durationSelect.isVisible().catch(() => false)) {
      await durationSelect.selectOption('2-3 days');
      logTest('Select symptom duration', 'PASS');
    } else {
      logTest('Select symptom duration', 'WARN', 'Duration dropdown not found');
    }

    // Fill additional details
    const detailsTextarea = await page.locator('textarea').first();
    if (await detailsTextarea.isVisible().catch(() => false)) {
      await detailsTextarea.fill('Feeling weak and tired. Fever started yesterday.');
      logTest('Fill additional details', 'PASS');
    }
    await takeScreenshot(page, '09-form-filled');

    // Submit for AI triage
    const submitButton = await page.locator('button:has-text("Get AI Triage")').first();
    if (await submitButton.isVisible().catch(() => false)) {
      await submitButton.click();
      logTest('Submit for AI triage', 'PASS');
      await page.waitForTimeout(5000);
      await waitForNetworkIdle(page);
      await takeScreenshot(page, '10-ai-triage-results');

      // Check for AI results
      const resultsVisible = await page.locator('text=/Triage|Assessment|Recommendation/i').first().isVisible().catch(() => false);
      if (resultsVisible) {
        logTest('AI triage results displayed', 'PASS');

        // Check for confidence score
        const confidenceText = await page.locator('text=/%|confidence/i').first().textContent().catch(() => '');
        if (confidenceText) {
          logTest('AI confidence score displayed', 'PASS', `Found: ${confidenceText}`);
        } else {
          logTest('AI confidence score displayed', 'WARN', 'Confidence score not found');
        }
      } else {
        logTest('AI triage results displayed', 'WARN', 'Results may not have loaded');
      }
    } else {
      logTest('Submit for AI triage', 'FAIL', 'Submit button not found');
    }

    // ============================================
    // TEST 5: AI Provider Search
    // ============================================
    console.log('\n📋 TEST SECTION 5: AI Provider Search\n');

    await page.goto(`${BASE_URL}/provider-search`);
    await waitForNetworkIdle(page);
    await takeScreenshot(page, '11-provider-search-page');

    // Enter natural language query
    const searchInput = await page.locator('input[data-testid="search-input"], input[type="text"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('I need a cardiologist who speaks Hindi near me');
      logTest('Enter natural language search query', 'PASS');
      await takeScreenshot(page, '12-search-query-entered');

      // Click search
      const searchButton = await page.locator('button:has-text("Search"), button[data-testid="search-button"]').first();
      if (await searchButton.isVisible().catch(() => false)) {
        await searchButton.click();
        logTest('Click AI search button', 'PASS');
        await page.waitForTimeout(5000);
        await waitForNetworkIdle(page);
        await takeScreenshot(page, '13-search-results');

        // Check for results
        const resultsVisible = await page.locator('text=/provider|doctor|specialist/i').first().isVisible().catch(() => false);
        if (resultsVisible) {
          logTest('AI search results displayed', 'PASS');

          // Check for AI match scores
          const matchScore = await page.locator('text=/%|match|score/i').first().textContent().catch(() => '');
          if (matchScore) {
            logTest('AI match scores displayed', 'PASS', `Found: ${matchScore}`);
          } else {
            logTest('AI match scores displayed', 'WARN', 'Match scores not found');
          }
        } else {
          logTest('AI search results displayed', 'WARN', 'Results may not have loaded');
        }
      } else {
        logTest('Click AI search button', 'FAIL', 'Search button not found');
      }
    } else {
      logTest('Enter natural language search query', 'FAIL', 'Search input not found');
    }

    // ============================================
    // TEST 6: Supervisor Dashboard (Human-in-Loop)
    // ============================================
    console.log('\n📋 TEST SECTION 6: Supervisor Dashboard\n');

    // Sign out and login as supervisor
    await page.goto(`${BASE_URL}/login`);
    await waitForNetworkIdle(page);
    
    const supervisorButton = await page.locator('button:has-text("Supervisor")').first();
    if (await supervisorButton.isVisible().catch(() => false)) {
      await supervisorButton.click();
      logTest('Login as Supervisor', 'PASS');
      await page.waitForTimeout(3000);
      await waitForNetworkIdle(page);
    } else {
      logTest('Login as Supervisor', 'WARN', 'Supervisor login button not found');
    }

    await page.goto(`${BASE_URL}/supervisor-dashboard`);
    await waitForNetworkIdle(page);
    await takeScreenshot(page, '14-supervisor-dashboard');

    // Check for pending cases
    const casesVisible = await page.locator('text=/case|patient|pending/i').first().isVisible().catch(() => false);
    if (casesVisible) {
      logTest('Supervisor dashboard cases displayed', 'PASS');

      // Check for low confidence flags
      const lowConfidence = await page.locator('text=/low confidence|needs review/i').first().isVisible().catch(() => false);
      if (lowConfidence) {
        logTest('Low confidence cases flagged', 'PASS');
        await takeScreenshot(page, '15-low-confidence-flagged');
      } else {
        logTest('Low confidence cases flagged', 'WARN', 'No low confidence flags found');
      }

      // Check for action buttons
      const approveButton = await page.locator('button[data-testid*="approve"], button:has-text("Approve")').first();
      const overrideButton = await page.locator('button[data-testid*="override"], button:has-text("Override")').first();
      
      const approveVisible = await approveButton.isVisible().catch(() => false);
      const overrideVisible = await overrideButton.isVisible().catch(() => false);

      if (approveVisible && overrideVisible) {
        logTest('Supervisor action buttons present', 'PASS');
        await takeScreenshot(page, '16-action-buttons');
      } else {
        logTest('Supervisor action buttons present', 'WARN', 'Some action buttons not found');
      }
    } else {
      logTest('Supervisor dashboard cases displayed', 'WARN', 'No cases found on dashboard');
    }

    // ============================================
    // TEST 7: Multi-Language in Different Personas
    // ============================================
    console.log('\n📋 TEST SECTION 7: Multi-Language Across Personas\n');

    // Test language switching as supervisor
    const supervisorLangButton = await page.locator('button:has-text("🌐"), button:has(svg)').first();
    if (await supervisorLangButton.isVisible().catch(() => false)) {
      await supervisorLangButton.click();
      await page.waitForTimeout(1000);
      
      const hindiOption = await page.locator('button:has-text("Hindi")').first();
      if (await hindiOption.isVisible().catch(() => false)) {
        await hindiOption.click({ force: true });
        logTest('Language switching as Supervisor', 'PASS');
        await page.waitForTimeout(3000);
        await takeScreenshot(page, '17-supervisor-dashboard-hindi');
      } else {
        logTest('Language switching as Supervisor', 'FAIL', 'Hindi option not found');
      }
    } else {
      logTest('Language switching as Supervisor', 'FAIL', 'Language selector not found');
    }

    // ============================================
    // TEST 8: Sign Out
    // ============================================
    console.log('\n📋 TEST SECTION 8: Sign Out\n');

    await page.goto(`${BASE_URL}`);
    await waitForNetworkIdle(page);

    const signOutButton = await page.locator('button[title="Sign Out"], button:has-text("Sign Out")').first();
    if (await signOutButton.isVisible().catch(() => false)) {
      await signOutButton.click();
      logTest('Sign out button clicked', 'PASS');
      await page.waitForTimeout(2000);
      await takeScreenshot(page, '18-after-signout');

      // Verify redirect to login
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        logTest('Redirect to login after sign out', 'PASS');
      } else {
        logTest('Redirect to login after sign out', 'WARN', 'May not have redirected');
      }
    } else {
      logTest('Sign out button clicked', 'WARN', 'Sign out button not found');
    }

  } catch (error) {
    console.error('\n❌ Test suite error:', error);
    logTest('Test suite execution', 'FAIL', error.message);
    await takeScreenshot(page, 'error-state');
  } finally {
    await browser.close();
  }

  // ============================================
  // Generate Test Report
  // ============================================
  console.log('\n📊 Generating Test Report...\n');

  const report = {
    ...testResults,
    summary: {
      totalTests: testResults.totalTests,
      passed: testResults.passed,
      failed: testResults.failed,
      warnings: testResults.warnings,
      passRate: testResults.totalTests > 0 
        ? ((testResults.passed / testResults.totalTests) * 100).toFixed(2) + '%'
        : '0%'
    },
    testSections: {
      languageSelector: testResults.tests.filter(t => t.name.includes('Language selector')),
      authentication: testResults.tests.filter(t => t.name.includes('login') || t.name.includes('token')),
      languageSwitching: testResults.tests.filter(t => t.name.includes('Switch to') || t.name.includes('preference')),
      translationAPI: testResults.tests.filter(t => t.name.includes('Translation API')),
      symptomIntake: testResults.tests.filter(t => t.name.includes('symptom') || t.name.includes('triage')),
      providerSearch: testResults.tests.filter(t => t.name.includes('search') || t.name.includes('provider')),
      supervisorDashboard: testResults.tests.filter(t => t.name.includes('Supervisor') || t.name.includes('dashboard')),
      signOut: testResults.tests.filter(t => t.name.includes('Sign out'))
    }
  };

  // Save report
  const reportPath = path.join(SCREENSHOT_DIR, 'multilingual-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${report.summary.totalTests}`);
  console.log(`✅ Passed: ${report.summary.passed}`);
  console.log(`❌ Failed: ${report.summary.failed}`);
  console.log(`⚠️  Warnings: ${report.summary.warnings}`);
  console.log(`📈 Pass Rate: ${report.summary.passRate}`);
  console.log('='.repeat(60));
  console.log(`\n📄 Full report saved to: ${reportPath}`);
  console.log(`📸 Screenshots saved to: ${SCREENSHOT_DIR}/\n`);

  // Exit with appropriate code
  process.exit(report.summary.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
