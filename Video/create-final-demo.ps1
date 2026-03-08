# Create Final 3-Minute Demo
# Mobile view for patient, Desktop view for supervisor

Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 79) -ForegroundColor Cyan
Write-Host "CREATING FINAL 3-MINUTE HACKATHON DEMO" -ForegroundColor Yellow
Write-Host "Patient: Mobile View | Supervisor: Desktop View" -ForegroundColor Yellow
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 79) -ForegroundColor Cyan

Write-Host "`nThis will:"
Write-Host "  1. Record patient journey (mobile view)"
Write-Host "  2. Record supervisor dashboard (desktop view)"
Write-Host "  3. Generate professional voiceover"
Write-Host "  4. Combine everything into 3-minute video"

Write-Host "`nPress any key to start..." -ForegroundColor Green
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Step 1: Record videos
Write-Host "`n[STEP 1/3] Recording videos..." -ForegroundColor Cyan
Write-Host "This will open browser windows. Please don't interfere." -ForegroundColor Yellow
python Video/record-final-3min.py

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nRecording failed!" -ForegroundColor Red
    exit 1
}

# Step 2: Generate voiceover
Write-Host "`n[STEP 2/3] Generating voiceover..." -ForegroundColor Cyan
python Video/generate-final-voiceover.py

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nVoiceover generation failed!" -ForegroundColor Red
    exit 1
}

# Step 3: Combine everything
Write-Host "`n[STEP 3/3] Combining video and audio..." -ForegroundColor Cyan
python Video/combine-final-3min.py

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nVideo combination failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n" -NoNewline
Write-Host "=" -NoNewline -ForegroundColor Green
Write-Host ("=" * 79) -ForegroundColor Green
Write-Host "SUCCESS! 🎉" -ForegroundColor Green
Write-Host "=" -NoNewline -ForegroundColor Green
Write-Host ("=" * 79) -ForegroundColor Green

Write-Host "`nYour final 3-minute demo is ready!" -ForegroundColor Yellow
Write-Host "  File: Video/Arogya_AI_Final_3Min.mp4" -ForegroundColor Cyan

Write-Host "`nFeatures:" -ForegroundColor Yellow
Write-Host "  ✓ Patient journey in mobile view (390x844)" -ForegroundColor Green
Write-Host "  ✓ Supervisor dashboard in desktop view (1920x1080)" -ForegroundColor Green
Write-Host "  ✓ Professional story-driven narration" -ForegroundColor Green
Write-Host "  ✓ Perfect voice-video synchronization" -ForegroundColor Green
Write-Host "  ✓ Exactly 3 minutes duration" -ForegroundColor Green

Write-Host "`nReady for your hackathon presentation! 🚀" -ForegroundColor Yellow
