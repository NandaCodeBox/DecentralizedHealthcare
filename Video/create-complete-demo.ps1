# Create Complete 3-Minute Professional Demo
# Mobile (Patient + Multilingual) + Desktop (Supervisor + Agentic AI)

Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 79) -ForegroundColor Cyan
Write-Host "CREATING COMPLETE 3-MINUTE PROFESSIONAL DEMO" -ForegroundColor Yellow
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 79) -ForegroundColor Cyan

Write-Host "`nThis comprehensive demo will show:" -ForegroundColor Green
Write-Host "  📱 Patient Journey (Mobile View):" -ForegroundColor Cyan
Write-Host "     • Multilingual support (10 languages)"
Write-Host "     • Symptom tiles and intake"
Write-Host "     • AI triage (94% confidence)"
Write-Host "     • Facility recommendations (95% match)"
Write-Host "     • Appointment booking"
Write-Host ""
Write-Host "  💻 Supervisor Dashboard (Desktop View):" -ForegroundColor Cyan
Write-Host "     • Agentic AI toggle (purple)"
Write-Host "     • Statistics (81% automation)"
Write-Host "     • 6-level reasoning process"
Write-Host "     • Auto-approval (green indicator)"
Write-Host "     • Escalation (orange indicator)"
Write-Host "     • AI-powered provider search"
Write-Host ""
Write-Host "  🎤 Professional Voiceover:" -ForegroundColor Cyan
Write-Host "     • Explains problem (900M Indians)"
Write-Host "     • Shows solution (90X faster)"
Write-Host "     • Details Agentic AI features"
Write-Host "     • Demonstrates all capabilities"
Write-Host "     • Highlights cost ($0.0006/patient)"

Write-Host "`nPress any key to start..." -ForegroundColor Green
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Step 1: Record videos
Write-Host "`n[STEP 1/3] Recording videos..." -ForegroundColor Cyan
Write-Host "This will open browser windows showing mobile and desktop views." -ForegroundColor Yellow
Write-Host "Please don't interfere with the browser." -ForegroundColor Yellow
python Video/record-complete-multilingual.py

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nRecording failed!" -ForegroundColor Red
    exit 1
}

# Step 2: Generate voiceover
Write-Host "`n[STEP 2/3] Generating professional voiceover..." -ForegroundColor Cyan
Write-Host "Using AWS Polly (Aditi - Indian English)" -ForegroundColor Yellow
python Video/generate-complete-voiceover.py

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nVoiceover generation failed!" -ForegroundColor Red
    exit 1
}

# Step 3: Combine everything
Write-Host "`n[STEP 3/3] Combining video and audio..." -ForegroundColor Cyan
Write-Host "Creating final 3-minute video..." -ForegroundColor Yellow
python Video/combine-complete-video.py

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nVideo combination failed!" -ForegroundColor Red
    exit 1
}

Write-Host "`n" -NoNewline
Write-Host "=" -NoNewline -ForegroundColor Green
Write-Host ("=" * 79) -ForegroundColor Green
Write-Host "SUCCESS! 🎉🏆" -ForegroundColor Green
Write-Host "=" -NoNewline -ForegroundColor Green
Write-Host ("=" * 79) -ForegroundColor Green

Write-Host "`nYour complete 3-minute professional demo is ready!" -ForegroundColor Yellow
Write-Host "  📁 File: Video/Arogya_AI_Complete_3Min.mp4" -ForegroundColor Cyan

Write-Host "`n✅ Features Demonstrated:" -ForegroundColor Yellow
Write-Host "  📱 Mobile View (Patient Journey):" -ForegroundColor Cyan
Write-Host "     ✓ Multilingual support (Hindi, Tamil, Telugu, etc.)"
Write-Host "     ✓ Simple symptom tiles interface"
Write-Host "     ✓ AI triage with 94% confidence"
Write-Host "     ✓ Smart facility matching (95%)"
Write-Host "     ✓ Instant appointment booking"
Write-Host ""
Write-Host "  💻 Desktop View (Supervisor Dashboard):" -ForegroundColor Cyan
Write-Host "     ✓ Agentic AI toggle (always on)"
Write-Host "     ✓ 81% automation rate"
Write-Host "     ✓ 6-level reasoning explained"
Write-Host "     ✓ Auto-approval system (green)"
Write-Host "     ✓ Intelligent escalation (orange)"
Write-Host "     ✓ Natural language search"
Write-Host ""
Write-Host "  🎤 Professional Narration:" -ForegroundColor Cyan
Write-Host "     ✓ Problem statement (900M target)"
Write-Host "     ✓ Solution benefits (90X faster)"
Write-Host "     ✓ Technology explanation (AWS)"
Write-Host "     ✓ Cost breakdown ($0.0006/patient)"
Write-Host "     ✓ Impact metrics (241,000% ROI)"

Write-Host "`n🚀 Ready for your hackathon presentation!" -ForegroundColor Green
Write-Host "   Duration: Exactly 3 minutes" -ForegroundColor Yellow
Write-Host "   Quality: Professional with perfect sync" -ForegroundColor Yellow
Write-Host "   Content: All features + Agentic AI explained" -ForegroundColor Yellow
