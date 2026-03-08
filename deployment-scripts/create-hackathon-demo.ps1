# PowerShell Script to Create Complete Hackathon Demo
# Runs all steps: Record → Voiceover → Combine → Update PPTX

Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 79) -ForegroundColor Cyan
Write-Host "HACKATHON DEMO CREATION - AUTOMATED" -ForegroundColor Yellow
Write-Host "Story-Driven 3-Minute Video + Updated PowerPoint" -ForegroundColor Yellow
Write-Host ("=" * 80) -ForegroundColor Cyan

Write-Host "`nThis script will:" -ForegroundColor White
Write-Host "  1. Record 3-minute demo video (mobile view)" -ForegroundColor Gray
Write-Host "  2. Generate story-driven voiceover (AWS Polly)" -ForegroundColor Gray
Write-Host "  3. Combine video + audio" -ForegroundColor Gray
Write-Host "  4. Update PowerPoint presentation" -ForegroundColor Gray

Write-Host "`nEstimated time: 5-7 minutes" -ForegroundColor Cyan
Write-Host "`nPress Enter to start..." -ForegroundColor Yellow
Read-Host

# Step 1: Record Video
Write-Host "`n" -NoNewline
Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host "STEP 1: RECORDING VIDEO" -ForegroundColor Yellow
Write-Host ("=" * 80) -ForegroundColor Cyan

Write-Host "`nStarting Playwright recording..." -ForegroundColor White
Write-Host "This will open a browser window and record for ~3 minutes." -ForegroundColor Gray
Write-Host "Please do not interact with the browser during recording.`n" -ForegroundColor Yellow

python Video/record-hackathon-demo.py

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n✗ Video recording failed!" -ForegroundColor Red
    Write-Host "Please check the error messages above." -ForegroundColor Red
    exit 1
}

Write-Host "`n✓ Video recording complete!" -ForegroundColor Green

# Step 2: Generate Voiceover
Write-Host "`n" -NoNewline
Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host "STEP 2: GENERATING VOICEOVER" -ForegroundColor Yellow
Write-Host ("=" * 80) -ForegroundColor Cyan

Write-Host "`nGenerating voiceover with AWS Polly..." -ForegroundColor White
Write-Host "Voice: Aditi (Indian English, Neural)`n" -ForegroundColor Gray

python Video/generate-hackathon-voiceover.py

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n✗ Voiceover generation failed!" -ForegroundColor Red
    Write-Host "Please check AWS credentials and try again." -ForegroundColor Red
    exit 1
}

Write-Host "`n✓ Voiceover generation complete!" -ForegroundColor Green

# Step 3: Combine Video + Audio
Write-Host "`n" -NoNewline
Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host "STEP 3: COMBINING VIDEO + AUDIO" -ForegroundColor Yellow
Write-Host ("=" * 80) -ForegroundColor Cyan

Write-Host "`nCombining video with voiceover..." -ForegroundColor White
Write-Host "This may take 1-2 minutes...`n" -ForegroundColor Gray

python Video/combine-hackathon-demo.py

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n✗ Video combination failed!" -ForegroundColor Red
    Write-Host "Please check ffmpeg installation." -ForegroundColor Red
    exit 1
}

Write-Host "`n✓ Video combination complete!" -ForegroundColor Green

# Step 4: Update PowerPoint
Write-Host "`n" -NoNewline
Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host "STEP 4: UPDATING POWERPOINT" -ForegroundColor Yellow
Write-Host ("=" * 80) -ForegroundColor Cyan

Write-Host "`nUpdating PowerPoint presentation...`n" -ForegroundColor White

python update-hackathon-pptx.py

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n✗ PowerPoint update failed!" -ForegroundColor Red
    Write-Host "Please check if python-pptx is installed: pip install python-pptx" -ForegroundColor Red
    exit 1
}

Write-Host "`n✓ PowerPoint update complete!" -ForegroundColor Green

# Success Summary
Write-Host "`n" -NoNewline
Write-Host ("=" * 80) -ForegroundColor Green
Write-Host "SUCCESS! HACKATHON DEMO READY! 🎉" -ForegroundColor Yellow
Write-Host ("=" * 80) -ForegroundColor Green

Write-Host "`nYour hackathon materials are ready:" -ForegroundColor White
Write-Host "`n📹 Video:" -ForegroundColor Cyan
Write-Host "   Video/Hackathon_Demo_Final.mp4" -ForegroundColor White
Write-Host "   Duration: ~3 minutes" -ForegroundColor Gray
Write-Host "   Format: MP4 (mobile view)" -ForegroundColor Gray

Write-Host "`n📊 PowerPoint:" -ForegroundColor Cyan
Write-Host "   Deck/Arogya_AI_Hackathon_Updated.pptx" -ForegroundColor White
Write-Host "   New slides: 4 (Demo, Agentic AI, Architecture, Impact)" -ForegroundColor Gray

Write-Host "`n📝 Documentation:" -ForegroundColor Cyan
Write-Host "   HACKATHON_DEMO_COMPLETE_GUIDE.md" -ForegroundColor White

Write-Host "`n🎯 Key Highlights:" -ForegroundColor Yellow
Write-Host "   ✓ Story-driven narration (problem → solution → impact)" -ForegroundColor Green
Write-Host "   ✓ Patient journey in mobile view" -ForegroundColor Green
Write-Host "   ✓ Supervisor dashboard with Agentic AI" -ForegroundColor Green
Write-Host "   ✓ Multi-language support demonstration" -ForegroundColor Green
Write-Host "   ✓ Impact metrics (90X faster, 81% automation, $0.0006/patient)" -ForegroundColor Green

Write-Host "`n🏆 You're ready to win the hackathon!" -ForegroundColor Yellow
Write-Host "`nGood luck! 🚀`n" -ForegroundColor Cyan
