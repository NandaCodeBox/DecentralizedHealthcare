# Complete Hackathon Submission Automation
# This master script guides you through all remaining tasks

param(
    [switch]$SkipScreenshots,
    [switch]$SkipQRCodes,
    [switch]$AutoOpen
)

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                            ║" -ForegroundColor Cyan
Write-Host "║     AROGYA AI - HACKATHON SUBMISSION AUTOMATION           ║" -ForegroundColor Cyan
Write-Host "║                                                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
Write-Host ""

$allGood = $true

# Check if PowerPoint file exists
if (Test-Path "Deck\Arogya_AI_Hackathon_Final_Presentation.pptx") {
    Write-Host "✓ PowerPoint presentation found" -ForegroundColor Green
} else {
    Write-Host "✗ PowerPoint presentation NOT found" -ForegroundColor Red
    $allGood = $false
}

# Check if voiceover exists
if (Test-Path "demo-voiceover-polly.mp3") {
    Write-Host "✓ AWS Polly voiceover found" -ForegroundColor Green
} else {
    Write-Host "✗ Voiceover file NOT found" -ForegroundColor Red
    $allGood = $false
}

# Check if demo script exists
if (Test-Path "3_MINUTE_DEMO_SCRIPT.md") {
    Write-Host "✓ Demo script found" -ForegroundColor Green
} else {
    Write-Host "✗ Demo script NOT found" -ForegroundColor Red
    $allGood = $false
}

Write-Host ""

if (-not $allGood) {
    Write-Host "⚠ Some required files are missing!" -ForegroundColor Red
    Write-Host "Please ensure all files are in place before continuing." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Press ENTER to exit..." -ForegroundColor Cyan
    Read-Host
    exit 1
}

# Display status
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "CURRENT STATUS" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "✓ PowerPoint Presentation: 90% Complete" -ForegroundColor Green
Write-Host "✓ AWS Polly Voiceover: 100% Complete" -ForegroundColor Green
Write-Host "✓ All Documentation: 100% Complete" -ForegroundColor Green
Write-Host ""
Write-Host "⏳ Screenshots: Pending (30 min)" -ForegroundColor Yellow
Write-Host "⏳ QR Codes: Pending (5 min)" -ForegroundColor Yellow
Write-Host "⏳ Demo Video: Pending (45 min)" -ForegroundColor Yellow
Write-Host "⏳ Final Submission: Pending (15 min)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Overall Progress: 70% Complete" -ForegroundColor Yellow
Write-Host "Time Remaining: ~1.5 hours" -ForegroundColor Yellow
Write-Host ""

# Main menu
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "WHAT WOULD YOU LIKE TO DO?" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Take Screenshots (15 min)" -ForegroundColor White
Write-Host "2. Generate QR Codes (2 min)" -ForegroundColor White
Write-Host "3. View Demo Video Instructions" -ForegroundColor White
Write-Host "4. View Submission Checklist" -ForegroundColor White
Write-Host "5. Complete All Tasks (Guided)" -ForegroundColor White
Write-Host "6. Exit" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1-6)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Starting screenshot automation..." -ForegroundColor Green
        Write-Host ""
        Start-Sleep -Seconds 1
        & ".\Take-Screenshots.ps1"
    }
    "2" {
        Write-Host ""
        Write-Host "Generating QR codes..." -ForegroundColor Green
        Write-Host ""
        Start-Sleep -Seconds 1
        & ".\Generate-QRCodes.ps1"
    }
    "3" {
        Write-Host ""
        Write-Host "Opening demo video instructions..." -ForegroundColor Green
        Start-Sleep -Seconds 1
        if (Test-Path "3_MINUTE_DEMO_SCRIPT.md") {
            Start-Process "3_MINUTE_DEMO_SCRIPT.md"
        }
        if (Test-Path "AWS_POLLY_VOICEOVER_GUIDE.md") {
            Start-Process "AWS_POLLY_VOICEOVER_GUIDE.md"
        }
    }
    "4" {
        Write-Host ""
        Write-Host "Opening submission checklist..." -ForegroundColor Green
        Start-Sleep -Seconds 1
        if (Test-Path "HACKATHON_SUBMISSION_CHECKLIST.md") {
            Start-Process "HACKATHON_SUBMISSION_CHECKLIST.md"
        }
        if (Test-Path "START_HERE.md") {
            Start-Process "START_HERE.md"
        }
    }
    "5" {
        Write-Host ""
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
        Write-Host "GUIDED COMPLETION MODE" -ForegroundColor Cyan
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "This will guide you through all remaining tasks:" -ForegroundColor Yellow
        Write-Host "  1. Take 6 screenshots (15 min)" -ForegroundColor White
        Write-Host "  2. Generate 2 QR codes (2 min)" -ForegroundColor White
        Write-Host "  3. Add to PowerPoint (10 min)" -ForegroundColor White
        Write-Host "  4. Create demo video (45 min)" -ForegroundColor White
        Write-Host "  5. Submit (15 min)" -ForegroundColor White
        Write-Host ""
        Write-Host "Total time: ~1.5 hours" -ForegroundColor Yellow
        Write-Host ""
        $confirm = Read-Host "Ready to start? (Y/N)"
        
        if ($confirm -eq "Y" -or $confirm -eq "y") {
            # Step 1: Screenshots
            Write-Host ""
            Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
            Write-Host "STEP 1: TAKE SCREENSHOTS" -ForegroundColor Green
            Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
            Write-Host ""
            Start-Sleep -Seconds 2
            & ".\Take-Screenshots.ps1"
            
            # Step 2: QR Codes
            Write-Host ""
            Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
            Write-Host "STEP 2: GENERATE QR CODES" -ForegroundColor Green
            Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
            Write-Host ""
            Start-Sleep -Seconds 2
            & ".\Generate-QRCodes.ps1"
            
            # Step 3: PowerPoint
            Write-Host ""
            Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
            Write-Host "STEP 3: ADD TO POWERPOINT" -ForegroundColor Green
            Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
            Write-Host ""
            Write-Host "Opening PowerPoint presentation..." -ForegroundColor Yellow
            Start-Process "Deck\Arogya_AI_Hackathon_Final_Presentation.pptx"
            Write-Host ""
            Write-Host "INSTRUCTIONS:" -ForegroundColor Yellow
            Write-Host "1. Go to Slide 12 (Live Demo)" -ForegroundColor White
            Write-Host "2. Insert → Pictures → Select all 6 screenshots from Deck\Screenshots\" -ForegroundColor White
            Write-Host "3. Arrange in a 2x3 grid" -ForegroundColor White
            Write-Host "4. Go to Slide 16 (Thank You)" -ForegroundColor White
            Write-Host "5. Insert → Pictures → Add 2 QR codes at bottom" -ForegroundColor White
            Write-Host "6. File → Save As → PDF" -ForegroundColor White
            Write-Host "7. Save as: Arogya_AI_Hackathon_Final_Presentation.pdf" -ForegroundColor White
            Write-Host ""
            Read-Host "Press ENTER when PowerPoint is complete"
            
            # Step 4: Demo Video
            Write-Host ""
            Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
            Write-Host "STEP 4: CREATE DEMO VIDEO" -ForegroundColor Green
            Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
            Write-Host ""
            Write-Host "Opening demo video guide..." -ForegroundColor Yellow
            Start-Process "3_MINUTE_DEMO_SCRIPT.md"
            Write-Host ""
            Write-Host "QUICK STEPS:" -ForegroundColor Yellow
            Write-Host "1. Record screen (15 min) - Follow 3_MINUTE_DEMO_SCRIPT.md" -ForegroundColor White
            Write-Host "2. Combine with demo-voiceover-polly.mp3 (15 min)" -ForegroundColor White
            Write-Host "   - Use Kapwing.com (online, easy)" -ForegroundColor White
            Write-Host "   - Or DaVinci Resolve (desktop, professional)" -ForegroundColor White
            Write-Host "3. Upload to YouTube (10 min) - Set to Unlisted" -ForegroundColor White
            Write-Host "4. Copy video URL" -ForegroundColor White
            Write-Host ""
            Write-Host "Voiceover file: demo-voiceover-polly.mp3 ✓" -ForegroundColor Green
            Write-Host ""
            Read-Host "Press ENTER when video is uploaded to YouTube"
            
            # Step 5: Submission
            Write-Host ""
            Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
            Write-Host "STEP 5: FINAL SUBMISSION" -ForegroundColor Green
            Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
            Write-Host ""
            Write-Host "Submit these 4 deliverables to the hackathon portal:" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "1. Working Prototype:" -ForegroundColor White
            Write-Host "   http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "2. Demo Video:" -ForegroundColor White
            $videoUrl = Read-Host "   Enter your YouTube URL"
            Write-Host ""
            Write-Host "3. Presentation Deck:" -ForegroundColor White
            Write-Host "   Upload: Arogya_AI_Hackathon_Final_Presentation.pdf" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "4. GitHub Repository:" -ForegroundColor White
            Write-Host "   https://github.com/NandaCodeBox/DecentralizedHealthcare" -ForegroundColor Cyan
            Write-Host ""
            Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
            Write-Host "✓ ALL TASKS COMPLETE!" -ForegroundColor Green
            Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
            Write-Host ""
            Write-Host "Congratulations! You're ready to submit!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Final checklist:" -ForegroundColor Yellow
            Write-Host "  ✓ PowerPoint with screenshots and QR codes" -ForegroundColor Green
            Write-Host "  ✓ PDF exported" -ForegroundColor Green
            Write-Host "  ✓ Demo video on YouTube" -ForegroundColor Green
            Write-Host "  ✓ All 4 deliverables ready" -ForegroundColor Green
            Write-Host ""
            Write-Host "Good luck! 🚀" -ForegroundColor Cyan
        }
    }
    "6" {
        Write-Host ""
        Write-Host "Exiting..." -ForegroundColor Yellow
        exit 0
    }
    default {
        Write-Host ""
        Write-Host "Invalid choice. Please run the script again." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Press ENTER to exit..." -ForegroundColor Cyan
Read-Host
