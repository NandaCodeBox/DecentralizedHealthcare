// Comprehensive E2E Testing - All Functionalities
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const APP_URL = 'http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com';
const SCREENSHOTS_DIR = path.join(__dirname, 'comprehensive-test-results');
const ISSUES = [];
const TEST_USER = { email: 'test@arogya.ai', password: 'SecurePass123!' };

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR);
}

function logIssue(severity, useCase, description) {
  ISSUES.push({ severity, useCase, description });
  console.log(`   ⚠️  ${severity}: ${description}`);
}

function logSuccess(message) {
  console.log(`   ✅ ${message}`);
}

async function testAuthentication(page) {
  console.log('\n' + '='.repeat(70));
  console.log('🔐 COMPREHENSIVE AUTHENTICATION TESTING');
  console.log('='.repeat(70) + '\n');

  try {
    console.log('🧪 Test 1: Redirect to login when not authenticated');
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    if (page.url().includes('login')) {
      logSuccess('Correctly redirected to login page');
    } else {
      logIssue('HIGH', 'Authentication', 'Not redirected to login');
    }
    
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-login-page.png'), fullPage: true });
    logSuccess('Screenshot: 01-login-page.png');

    console.log('\n🧪 Test 2: One-click login button');
    const quickLoginButton = await page.locator('button:has-text("Login as Test User")').first();
    await quickLoginButton.waitFor({ state: 'visible', timeout: 5000 });
    logSuccess('One-click login button found');
    
    await quickLoginButton.click();
    logSuccess('Clicked one-click login button');
    await page.waitForTimeout(5000);
    
    if (!page.url().includes('login')) {
      logSuccess('Successfully authenticated and redirected');
    } else {
      logIssue('CRITICAL', 'Authentication', 'Login failed');
      throw new Error('Cannot proceed without authentication');
    }

    console.log('\n🧪 Test 3: Verify username display (not GUID)');
    await page.waitForTimeout(2000);
    const usernameElement = await page.locator('text=/Test|test/i').first();
    if (await usernameElement.isVisible()) {
      const usernameText = await usernameElement.textContent();
      if (usernameText.toLowerCase().includes('test') && !usernameText.match(/[0-9a-f]{8}-[0-9a-f]{4}/)) {
        logSuccess(`Username displays correctly: "${usernameText}"`);
      } else {
        logIssue('HIGH', 'Authentication', `Username shows GUID: ${usernameText}`);
      }
    } else {
      logIssue('MEDIUM', 'Authentication', 'Username not visible');
    }
    
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-homepage-authenticated.png'), fullPage: true });
    logSuccess('Screenshot: 02-homepage-authenticated.png');

    console.log('\n✅ Authentication Testing Complete\n');
    return true;
  } catch (error) {
    logIssue('CRITICAL', 'Authentication', `Failed: ${error.message}`);
    return false;
  }
}

async function testSymptomIntake(page) {
  console.log('\n' + '='.repeat(70));
  console.log('📋 COMPREHENSIVE SYMPTOM INTAKE TESTING');
  console.log('='.repeat(70) + '\n');

  try {
    console.log('🧪 Test 1: Navigate to symptom intake');
    await page.goto(`${APP_URL}/symptom-intake`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    if (page.url().includes('symptom-intake')) {
      logSuccess('Symptom intake page loaded');
    } else {
      logIssue('CRITICAL', 'Symptom Intake', 'Failed to load page');
      return;
    }
    
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-symptom-intake-empty.png'), fullPage: true });
    logSuccess('Screenshot: 03-symptom-intake-empty.png');

    console.log('\n🧪 Test 2: Select symptoms using quick buttons');
    try {
      const feverButton = await page.locator('button[data-testid="symptom-fever"], button:has-text("Fever")').first();
      await feverButton.waitFor({ state: 'visible', timeout: 5000 });
      await feverButton.click();
      await page.waitForTimeout(1000);
      logSuccess('Selected "Fever" symptom');
      
      const headacheButton = await page.locator('button[data-testid="symptom-headache"], button:has-text("Headache")').first();
      await headacheButton.click();
      await page.waitForTimeout(1000);
      logSuccess('Selected "Headache" symptom');
      
      const coughButton = await page.locator('button[data-testid="symptom-cough"], button:has-text("Cough")').first();
      await coughButton.click();
      await page.waitForTimeout(1000);
      logSuccess('Selected "Cough" symptom');
    } catch (error) {
      logIssue('HIGH', 'Symptom Intake', `Failed to select symptoms: ${error.message}`);
    }
    
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-symptoms-selected.png'), fullPage: true });
    logSuccess('Screenshot: 04-symptoms-selected.png');

    console.log('\n🧪 Test 3: Fill additional details');
    try {
      // Fill duration field (required) - it's a select dropdown
      const durationSelect = await page.locator('select').first();
      if (await durationSelect.isVisible({ timeout: 3000 })) {
        await durationSelect.selectOption({ index: 2 }); // Select "2-3 days" or similar
        await page.waitForTimeout(500);
        logSuccess('Duration selected from dropdown');
      } else {
        logIssue('HIGH', 'Symptom Intake', 'Duration field not found');
      }
      
      // Fill additional information
      const textareas = await page.locator('textarea').all();
      if (textareas.length > 0) {
        await textareas[0].fill('High fever (102°F) with severe headache and persistent cough. Started 3 days ago. Feeling very weak.');
        await page.waitForTimeout(1000);
        logSuccess('Additional details filled');
      }
    } catch (error) {
      logIssue('MEDIUM', 'Symptom Intake', `Failed to fill details: ${error.message}`);
    }
    
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-form-filled.png'), fullPage: true });
    logSuccess('Screenshot: 05-form-filled.png');

    console.log('\n🧪 Test 4: Submit symptom form');
    try {
      const submitButton = await page.locator('button:has-text("Get AI Triage"), button:has-text("Submit"), button:has-text("Continue")').first();
      await submitButton.waitFor({ state: 'visible', timeout: 5000 });
      await submitButton.click();
      logSuccess('Submit button clicked');
      
      await page.waitForTimeout(4000);
      
      if (page.url().includes('triage') || page.url().includes('dashboard')) {
        logSuccess('Form submitted, navigated to results');
      } else {
        logIssue('HIGH', 'Symptom Intake', `Unexpected URL after submit: ${page.url()}`);
      }
    } catch (error) {
      logIssue('CRITICAL', 'Symptom Intake', `Failed to submit: ${error.message}`);
    }
    
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-triage-results.png'), fullPage: true });
    logSuccess('Screenshot: 06-triage-results.png');

    console.log('\n🧪 Test 5: Verify AI triage results');
    try {
      const confidenceScore = await page.locator('text=/%/i').first();
      if (await confidenceScore.isVisible()) {
        const scoreText = await confidenceScore.textContent();
        logSuccess(`AI confidence score displayed: ${scoreText}`);
      } else {
        logIssue('HIGH', 'Symptom Intake', 'No confidence score displayed');
      }
      
      const urgencyLevel = await page.locator('text=/emergency|urgent|routine/i').first();
      if (await urgencyLevel.isVisible()) {
        const urgencyText = await urgencyLevel.textContent();
        logSuccess(`Urgency level displayed: ${urgencyText}`);
      } else {
        logIssue('MEDIUM', 'Symptom Intake', 'No urgency level displayed');
      }
      
      const facilities = await page.locator('text=/facility|hospital|clinic/i').all();
      if (facilities.length > 0) {
        logSuccess(`Found ${facilities.length} facility recommendations`);
      } else {
        logIssue('MEDIUM', 'Symptom Intake', 'No facility recommendations');
      }
    } catch (error) {
      logIssue('MEDIUM', 'Symptom Intake', `Failed to verify results: ${error.message}`);
    }

    console.log('\n✅ Symptom Intake Testing Complete\n');
  } catch (error) {
    logIssue('CRITICAL', 'Symptom Intake', `Unexpected error: ${error.message}`);
  }
}


async function testProviderSearch(page) {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 COMPREHENSIVE PROVIDER SEARCH TESTING');
  console.log('='.repeat(70) + '\n');

  try {
    console.log('🧪 Test 1: Navigate to provider search');
    await page.goto(`${APP_URL}/provider-search`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    if (page.url().includes('provider-search')) {
      logSuccess('Provider search page loaded');
    } else {
      logIssue('CRITICAL', 'Provider Search', 'Failed to load page');
      return;
    }
    
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '07-provider-search-empty.png'), fullPage: true });
    logSuccess('Screenshot: 07-provider-search-empty.png');

    console.log('\n🧪 Test 2: Enter natural language query');
    try {
      const searchInput = await page.locator('input[data-testid="provider-search-input"], input[type="text"], input[type="search"]').first();
      await searchInput.waitFor({ state: 'visible', timeout: 5000 });
      await searchInput.fill('I have severe chest pain and shortness of breath, need urgent care');
      await page.waitForTimeout(1000);
      logSuccess('Natural language query entered');
    } catch (error) {
      logIssue('CRITICAL', 'Provider Search', `Failed to enter query: ${error.message}`);
      return;
    }
    
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '08-query-entered.png'), fullPage: true });
    logSuccess('Screenshot: 08-query-entered.png');

    console.log('\n🧪 Test 3: Execute AI search');
    try {
      const searchButton = await page.locator('button:has-text("AI Search"), button:has-text("Search")').first();
      await searchButton.waitFor({ state: 'visible', timeout: 5000 });
      await searchButton.click();
      logSuccess('AI Search button clicked');
      
      await page.waitForTimeout(4000);
    } catch (error) {
      logIssue('HIGH', 'Provider Search', `Failed to search: ${error.message}`);
    }
    
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '09-search-results.png'), fullPage: true });
    logSuccess('Screenshot: 09-search-results.png');

    console.log('\n🧪 Test 4: Verify AI specialty suggestions');
    try {
      const specialties = await page.locator('text=/cardiologist|emergency|cardiology/i').all();
      if (specialties.length > 0) {
        logSuccess(`Found ${specialties.length} AI specialty suggestions`);
      } else {
        logIssue('MEDIUM', 'Provider Search', 'No specialty suggestions found');
      }
    } catch (error) {
      logIssue('MEDIUM', 'Provider Search', `Failed to verify specialties: ${error.message}`);
    }

    console.log('\n🧪 Test 5: Verify provider results');
    try {
      const providers = await page.locator('text=/Dr\\.|Doctor/i').all();
      if (providers.length > 0) {
        logSuccess(`Found ${providers.length} provider results`);
      } else {
        logIssue('HIGH', 'Provider Search', 'No provider results displayed');
      }
      
      const matchScores = await page.locator('text=/%.*Match/i').all();
      if (matchScores.length > 0) {
        logSuccess(`Found ${matchScores.length} AI match scores`);
      } else {
        logIssue('MEDIUM', 'Provider Search', 'No AI match scores displayed');
      }
      
      const aiReasoning = await page.locator('text=/reasoning|because|match/i').all();
      if (aiReasoning.length > 0) {
        logSuccess(`Found ${aiReasoning.length} AI reasoning explanations`);
      } else {
        logIssue('LOW', 'Provider Search', 'No AI reasoning displayed');
      }
    } catch (error) {
      logIssue('MEDIUM', 'Provider Search', `Failed to verify results: ${error.message}`);
    }

    console.log('\n✅ Provider Search Testing Complete\n');
  } catch (error) {
    logIssue('CRITICAL', 'Provider Search', `Unexpected error: ${error.message}`);
  }
}


async function testSupervisorDashboard(page) {
  console.log('\n' + '='.repeat(70));
  console.log('👨‍⚕️ COMPREHENSIVE SUPERVISOR DASHBOARD TESTING');
  console.log('='.repeat(70) + '\n');

  try {
    console.log('🧪 Test 1: Navigate to supervisor dashboard');
    await page.goto(`${APP_URL}/supervisor-dashboard`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    if (page.url().includes('supervisor-dashboard')) {
      logSuccess('Supervisor dashboard loaded');
    } else {
      logIssue('CRITICAL', 'Supervisor Dashboard', 'Failed to load page');
      return;
    }
    
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '10-supervisor-dashboard.png'), fullPage: true });
    logSuccess('Screenshot: 10-supervisor-dashboard.png');

    console.log('\n🧪 Test 2: Verify statistics header');
    try {
      const pendingCount = await page.locator('text=/pending/i').first();
      if (await pendingCount.isVisible()) {
        logSuccess('Pending count displayed');
      }
      
      const emergencyCount = await page.locator('text=/emergency/i').first();
      if (await emergencyCount.isVisible()) {
        logSuccess('Emergency count displayed');
      }
      
      const lowConfidenceCount = await page.locator('text=/low confidence/i').first();
      if (await lowConfidenceCount.isVisible()) {
        logSuccess('Low confidence count displayed');
      }
    } catch (error) {
      logIssue('MEDIUM', 'Supervisor Dashboard', `Failed to verify statistics: ${error.message}`);
    }

    console.log('\n🧪 Test 3: Verify validation queue');
    try {
      const patientNames = await page.locator('text=/Rajesh|Priya|Amit|Sunita/i').all();
      if (patientNames.length >= 4) {
        logSuccess(`Found ${patientNames.length} patient cases in queue`);
      } else {
        logIssue('HIGH', 'Supervisor Dashboard', `Only ${patientNames.length} cases found, expected 4`);
      }
    } catch (error) {
      logIssue('MEDIUM', 'Supervisor Dashboard', `Failed to verify queue: ${error.message}`);
    }

    console.log('\n🧪 Test 4: Verify low confidence flagging');
    try {
      const lowConfidenceIndicators = await page.locator('text=/65%|68%|Low Confidence/i').all();
      if (lowConfidenceIndicators.length >= 2) {
        logSuccess(`Found ${lowConfidenceIndicators.length} low confidence indicators`);
      } else {
        logIssue('HIGH', 'Supervisor Dashboard', 'Low confidence cases not properly flagged');
      }
      
      const warningIcons = await page.locator('[class*="orange"], [class*="yellow"], [class*="warning"]').all();
      if (warningIcons.length > 0) {
        logSuccess(`Found ${warningIcons.length} warning visual indicators`);
      }
    } catch (error) {
      logIssue('MEDIUM', 'Supervisor Dashboard', `Failed to verify flagging: ${error.message}`);
    }
    
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '11-low-confidence-flagged.png'), fullPage: true });
    logSuccess('Screenshot: 11-low-confidence-flagged.png');

    console.log('\n🧪 Test 5: Click on a case to view details');
    try {
      const firstCase = await page.locator('text=/Priya Singh/i').first();
      await firstCase.click();
      await page.waitForTimeout(2000);
      logSuccess('Clicked on low confidence case (Priya Singh)');
      
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '12-case-details.png'), fullPage: true });
      logSuccess('Screenshot: 12-case-details.png');
    } catch (error) {
      logIssue('MEDIUM', 'Supervisor Dashboard', `Failed to click case: ${error.message}`);
    }

    console.log('\n🧪 Test 6: Verify action buttons appear');
    try {
      const approveButton = await page.locator('button[data-testid="approve-button"], button:has-text("Approve")').first();
      if (await approveButton.isVisible({ timeout: 3000 })) {
        logSuccess('Approve button visible');
      } else {
        logIssue('HIGH', 'Supervisor Dashboard', 'Approve button not visible');
      }
      
      const overrideButton = await page.locator('button[data-testid="override-button"], button:has-text("Override")').first();
      if (await overrideButton.isVisible({ timeout: 3000 })) {
        logSuccess('Override button visible');
      } else {
        logIssue('HIGH', 'Supervisor Dashboard', 'Override button not visible');
      }
      
      const escalateButton = await page.locator('button[data-testid="escalate-button"], button:has-text("Escalate")').first();
      if (await escalateButton.isVisible({ timeout: 3000 })) {
        logSuccess('Escalate button visible');
      } else {
        logIssue('MEDIUM', 'Supervisor Dashboard', 'Escalate button not visible');
      }
      
      const rejectButton = await page.locator('button[data-testid="reject-button"], button:has-text("Reject")').first();
      if (await rejectButton.isVisible({ timeout: 3000 })) {
        logSuccess('Reject button visible');
      } else {
        logIssue('MEDIUM', 'Supervisor Dashboard', 'Reject button not visible');
      }
    } catch (error) {
      logIssue('HIGH', 'Supervisor Dashboard', `Failed to verify buttons: ${error.message}`);
    }

    console.log('\n🧪 Test 7: Test Override functionality');
    try {
      // First, add supervisor notes (required for buttons to be enabled)
      const notesTextarea = await page.locator('textarea[placeholder*="notes"], textarea[placeholder*="reason"]').first();
      if (await notesTextarea.isVisible({ timeout: 3000 })) {
        await notesTextarea.fill('Patient symptoms indicate possible viral infection. Recommend urgent care evaluation.');
        await page.waitForTimeout(1000);
        logSuccess('Supervisor notes added');
      }
      
      const overrideButton = await page.locator('button[data-testid="override-button"], button:has-text("Override")').first();
      await overrideButton.waitFor({ state: 'visible', timeout: 3000 });
      
      // Check if button is enabled now
      const isDisabled = await overrideButton.getAttribute('disabled');
      if (isDisabled === null) {
        await overrideButton.click();
        await page.waitForTimeout(1000);
        logSuccess('Clicked Override button');
        
        const urgencySelector = await page.locator('select, [role="listbox"]').first();
        if (await urgencySelector.isVisible({ timeout: 3000 })) {
          logSuccess('Urgency selector appeared');
        } else {
          logIssue('MEDIUM', 'Supervisor Dashboard', 'Urgency selector not visible');
        }
        
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '13-override-modal.png'), fullPage: true });
        logSuccess('Screenshot: 13-override-modal.png');
      } else {
        logIssue('MEDIUM', 'Supervisor Dashboard', 'Override button still disabled after adding notes');
      }
    } catch (error) {
      logIssue('MEDIUM', 'Supervisor Dashboard', `Failed to test override: ${error.message}`);
    }

    console.log('\n✅ Supervisor Dashboard Testing Complete\n');
  } catch (error) {
    logIssue('CRITICAL', 'Supervisor Dashboard', `Unexpected error: ${error.message}`);
  }
}


async function testSignOut(page) {
  console.log('\n' + '='.repeat(70));
  console.log('🚪 SIGN OUT TESTING');
  console.log('='.repeat(70) + '\n');

  try {
    console.log('🧪 Test 1: Navigate to homepage');
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    console.log('\n🧪 Test 2: Click sign-out button');
    try {
      const signOutButton = await page.locator('button[title="Sign Out"], button:has([class*="ArrowRightOnRectangle"])').first();
      await signOutButton.waitFor({ state: 'visible', timeout: 5000 });
      await signOutButton.click();
      logSuccess('Sign-out button clicked');
      
      await page.waitForTimeout(3000);
      
      if (page.url().includes('login')) {
        logSuccess('Redirected to login page after sign-out');
      } else {
        logIssue('HIGH', 'Sign Out', 'Not redirected to login after sign-out');
      }
      
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '14-after-signout.png'), fullPage: true });
      logSuccess('Screenshot: 14-after-signout.png');
    } catch (error) {
      logIssue('HIGH', 'Sign Out', `Failed to sign out: ${error.message}`);
    }

    console.log('\n✅ Sign Out Testing Complete\n');
  } catch (error) {
    logIssue('CRITICAL', 'Sign Out', `Unexpected error: ${error.message}`);
  }
}

async function runAllTests() {
  console.log('\n' + '█'.repeat(70));
  console.log('🎬 AROGYA AI - COMPREHENSIVE E2E TESTING');
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
    const authSuccess = await testAuthentication(page);
    if (!authSuccess) {
      console.log('\n❌ Authentication failed. Cannot proceed.\n');
      return;
    }
    
    await testSymptomIntake(page);
    await testProviderSearch(page);
    await testSupervisorDashboard(page);
    await testSignOut(page);

    console.log('\n' + '█'.repeat(70));
    console.log('📊 COMPREHENSIVE TEST REPORT');
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
      },
      testsConducted: {
        authentication: true,
        symptomIntake: true,
        providerSearch: true,
        supervisorDashboard: true,
        signOut: true
      }
    };

    fs.writeFileSync(
      path.join(SCREENSHOTS_DIR, 'comprehensive-test-report.json'),
      JSON.stringify(report, null, 2)
    );
    console.log(`📄 Test report saved: ${path.join(SCREENSHOTS_DIR, 'comprehensive-test-report.json')}\n`);

    console.log('█'.repeat(70));
    if (critical.length === 0 && high.length === 0) {
      console.log('✅ ALL TESTS PASSED - READY FOR HACKATHON DEMO!');
    } else if (critical.length === 0) {
      console.log('⚠️  TESTS COMPLETE - MINOR ISSUES FOUND');
    } else {
      console.log('❌ TESTS COMPLETE - CRITICAL ISSUES NEED ATTENTION');
    }
    console.log('█'.repeat(70) + '\n');

    const screenshots = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png'));
    console.log(`📸 Screenshots Captured: ${screenshots.length}`);
    screenshots.forEach((file, i) => {
      console.log(`  ${(i+1).toString().padStart(2)}. ${file}`);
    });
    console.log('');

  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

runAllTests().catch(console.error);
