# Screenshot Automation Script for Hackathon Submission
# This script will help you take all required screenshots quickly

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "Screenshot Automation Helper" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Create Screenshots folder
$screenshotsFolder = "Deck\Screenshots"
if (-not (Test-Path $screenshotsFolder)) {
    New-Item -ItemType Directory -Path $screenshotsFolder | Out-Null
    Write-Host "✓ Created Screenshots folder" -ForegroundColor Green
}

# Live URL
$liveUrl = "http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com"

Write-Host ""
Write-Host "INSTRUCTIONS:" -ForegroundColor Yellow
Write-Host "1. This script will open the website in your default browser" -ForegroundColor White
Write-Host "2. Follow the on-screen prompts to take each screenshot" -ForegroundColor White
Write-Host "3. Use Windows + Shift + S to capture screenshots" -ForegroundColor White
Write-Host "4. Save each screenshot with the exact name shown" -ForegroundColor White
Write-Host ""

# Function to wait for user
function Wait-ForUser {
    param([string]$message)
    Write-Host ""
    Write-Host $message -ForegroundColor Yellow
    Write-Host "Press ENTER when done..." -ForegroundColor Cyan
    Read-Host
}

# Screenshot 1: Homepage in Hindi
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "SCREENSHOT 1: Homepage in Hindi" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Opening website..." -ForegroundColor White
Start-Process $liveUrl
Start-Sleep -Seconds 3
Write-Host ""
Write-Host "STEPS:" -ForegroundColor Yellow
Write-Host "1. Click language selector (top right)" -ForegroundColor White
Write-Host "2. Select 'हिंदी' (Hindi)" -ForegroundColor White
Write-Host "3. Wait for page to reload" -ForegroundColor White
Write-Host "4. Press Windows + Shift + S" -ForegroundColor White
Write-Host "5. Capture the full page" -ForegroundColor White
Write-Host "6. Save as: $screenshotsFolder\homepage-hindi.png" -ForegroundColor Green
Wait-ForUser "Complete Screenshot 1"

# Screenshot 2: Symptom Intake with Hindi Input
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "SCREENSHOT 2: Symptom Intake (Hindi)" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "STEPS:" -ForegroundColor Yellow
Write-Host "1. Navigate to Symptom Intake page" -ForegroundColor White
Write-Host "2. Type in Hindi: मुझे बुखार और सिरदर्द है" -ForegroundColor White
Write-Host "3. Click 'Fever' and 'Headache' buttons" -ForegroundColor White
Write-Host "4. Select Severity: Moderate" -ForegroundColor White
Write-Host "5. Select Duration: 1-3 days" -ForegroundColor White
Write-Host "6. Press Windows + Shift + S" -ForegroundColor White
Write-Host "7. Save as: $screenshotsFolder\symptom-intake-hindi.png" -ForegroundColor Green
Wait-ForUser "Complete Screenshot 2"

# Screenshot 3: AI Triage Results
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "SCREENSHOT 3: AI Triage Results" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "STEPS:" -ForegroundColor Yellow
Write-Host "1. Click 'Submit' button" -ForegroundColor White
Write-Host "2. Wait 5-10 seconds for AI processing" -ForegroundColor White
Write-Host "3. Results page will load" -ForegroundColor White
Write-Host "4. Press Windows + Shift + S" -ForegroundColor White
Write-Host "5. Save as: $screenshotsFolder\triage-results.png" -ForegroundColor Green
Wait-ForUser "Complete Screenshot 3"

# Screenshot 4: Provider Search Results
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "SCREENSHOT 4: Provider Search (Tamil)" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "STEPS:" -ForegroundColor Yellow
Write-Host "1. Navigate to Provider Search page" -ForegroundColor White
Write-Host "2. Switch language to Tamil (தமிழ்)" -ForegroundColor White
Write-Host "3. Type: Cardiologist" -ForegroundColor White
Write-Host "4. Click 'AI Search' button" -ForegroundColor White
Write-Host "5. Wait for results (3-5 seconds)" -ForegroundColor White
Write-Host "6. Press Windows + Shift + S" -ForegroundColor White
Write-Host "7. Save as: $screenshotsFolder\provider-search-results.png" -ForegroundColor Green
Wait-ForUser "Complete Screenshot 4"

# Screenshot 5: Supervisor Dashboard
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "SCREENSHOT 5: Supervisor Dashboard" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "STEPS:" -ForegroundColor Yellow
Write-Host "1. Navigate to Supervisor Dashboard" -ForegroundColor White
Write-Host "2. Wait for cases to load" -ForegroundColor White
Write-Host "3. Press Windows + Shift + S" -ForegroundColor White
Write-Host "4. Save as: $screenshotsFolder\supervisor-dashboard.png" -ForegroundColor Green
Wait-ForUser "Complete Screenshot 5"

# Screenshot 6: Mobile View
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "SCREENSHOT 6: Mobile View" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "STEPS:" -ForegroundColor Yellow
Write-Host "1. Go back to homepage" -ForegroundColor White
Write-Host "2. Press F12 (open DevTools)" -ForegroundColor White
Write-Host "3. Press Ctrl + Shift + M (toggle device toolbar)" -ForegroundColor White
Write-Host "4. Select 'iPhone 12 Pro' from dropdown" -ForegroundColor White
Write-Host "5. Press Windows + Shift + S" -ForegroundColor White
Write-Host "6. Save as: $screenshotsFolder\mobile-view.png" -ForegroundColor Green
Wait-ForUser "Complete Screenshot 6"

# Verify screenshots
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "VERIFICATION" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$screenshots = @(
    "homepage-hindi.png",
    "symptom-intake-hindi.png",
    "triage-results.png",
    "provider-search-results.png",
    "supervisor-dashboard.png",
    "mobile-view.png"
)

$allPresent = $true
foreach ($screenshot in $screenshots) {
    $path = Join-Path $screenshotsFolder $screenshot
    if (Test-Path $path) {
        Write-Host "✓ $screenshot" -ForegroundColor Green
    } else {
        Write-Host "✗ $screenshot (MISSING)" -ForegroundColor Red
        $allPresent = $false
    }
}

Write-Host ""
if ($allPresent) {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
    Write-Host "✓ ALL SCREENSHOTS COMPLETE!" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Generate QR codes (run: .\Generate-QRCodes.ps1)" -ForegroundColor White
    Write-Host "2. Add to PowerPoint" -ForegroundColor White
    Write-Host "3. Export as PDF" -ForegroundColor White
} else {
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Red
    Write-Host "⚠ SOME SCREENSHOTS MISSING" -ForegroundColor Red
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please take the missing screenshots and run this script again." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press ENTER to exit..." -ForegroundColor Cyan
Read-Host
