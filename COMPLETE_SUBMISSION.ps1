# Complete Hackathon Submission Script
# Run this after taking screenshots and recording screen

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Arogya AI Hackathon Submission Helper" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if voiceover exists
if (Test-Path "demo-voiceover-polly.mp3") {
    Write-Host "✅ Voiceover found: demo-voiceover-polly.mp3" -ForegroundColor Green
    $voiceoverSize = (Get-Item "demo-voiceover-polly.mp3").Length / 1MB
    Write-Host "   Size: $([math]::Round($voiceoverSize, 2)) MB" -ForegroundColor Gray
} else {
    Write-Host "❌ Voiceover not found!" -ForegroundColor Red
    Write-Host "   Run: aws polly synthesize-speech ..." -ForegroundColor Yellow
}

Write-Host ""

# Check if presentation exists
if (Test-Path "Deck/Arogya_AI_Hackathon_Final_Presentation.pptx") {
    Write-Host "✅ Presentation found" -ForegroundColor Green
} else {
    Write-Host "❌ Presentation not found!" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SUBMISSION CHECKLIST" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Working Prototype Link:" -ForegroundColor Yellow
Write-Host "   http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com" -ForegroundColor White
Write-Host ""

Write-Host "2. Demo Video Link:" -ForegroundColor Yellow
Write-Host "   [Upload to YouTube and paste URL here]" -ForegroundColor White
Write-Host ""

Write-Host "3. Presentation Deck:" -ForegroundColor Yellow
Write-Host "   Deck/Arogya_AI_Hackathon_Final_Presentation.pdf" -ForegroundColor White
Write-Host ""

Write-Host "4. GitHub Repository:" -ForegroundColor Yellow
Write-Host "   https://github.com/NandaCodeBox/DecentralizedHealthcare" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "NEXT STEPS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Take Screenshots (30 min)" -ForegroundColor Cyan
Write-Host "  - Open: SCREENSHOT_CHECKLIST.md" -ForegroundColor Gray
Write-Host "  - Take 6 screenshots from live app" -ForegroundColor Gray
Write-Host "  - Generate 2 QR codes" -ForegroundColor Gray
Write-Host ""

Write-Host "Step 2: Update PowerPoint (10 min)" -ForegroundColor Cyan
Write-Host "  - Add screenshots to Slide 12" -ForegroundColor Gray
Write-Host "  - Add QR codes to Slide 16" -ForegroundColor Gray
Write-Host "  - Export as PDF" -ForegroundColor Gray
Write-Host ""

Write-Host "Step 3: Create Video (45 min)" -ForegroundColor Cyan
Write-Host "  - Record screen (20 min)" -ForegroundColor Gray
Write-Host "  - Combine with demo-voiceover-polly.mp3 (15 min)" -ForegroundColor Gray
Write-Host "  - Upload to YouTube (10 min)" -ForegroundColor Gray
Write-Host ""

Write-Host "Step 4: Submit (15 min)" -ForegroundColor Cyan
Write-Host "  - Update presentation with video link" -ForegroundColor Gray
Write-Host "  - Submit all 4 deliverables" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TOTAL TIME: 1.5 hours" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Press any key to open guides..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Open key files
Write-Host "Opening guides..." -ForegroundColor Cyan
Start-Process "WHAT_I_DID_FOR_YOU.md"
Start-Process "SCREENSHOT_CHECKLIST.md"
Start-Process "3_MINUTE_DEMO_SCRIPT.md"

Write-Host "✅ Guides opened!" -ForegroundColor Green
Write-Host "Good luck with your submission! 🚀" -ForegroundColor Cyan
