# Automated Demo Video Creation Script
# This script helps you create the demo video with the female voiceover

param(
    [switch]$UseOBS,
    [switch]$UsePowerPoint
)

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                            ║" -ForegroundColor Cyan
Write-Host "║     DEMO VIDEO CREATOR - WITH FEMALE VOICEOVER            ║" -ForegroundColor Cyan
Write-Host "║                                                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if voiceover exists
if (-not (Test-Path "demo-voiceover-polly-female-backup.mp3")) {
    Write-Host "✗ Female voiceover file not found!" -ForegroundColor Red
    Write-Host "  Expected: demo-voiceover-polly-female-backup.mp3" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Female voiceover found: demo-voiceover-polly-female-backup.mp3" -ForegroundColor Green
Write-Host ""

# Get voiceover duration
$voiceoverFile = Get-Item "demo-voiceover-polly-female-backup.mp3"
$voiceoverSizeMB = [math]::Round($voiceoverFile.Length / 1MB, 2)
Write-Host "Voiceover Details:" -ForegroundColor Yellow
Write-Host "  Voice: Aditi (Female, Indian English)" -ForegroundColor White
Write-Host "  Size: $voiceoverSizeMB MB" -ForegroundColor White
Write-Host "  Duration: ~3 minutes" -ForegroundColor White
Write-Host ""

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "VIDEO CREATION OPTIONS" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Choose your method:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Quick Method - Use Kapwing.com (Recommended)" -ForegroundColor White
Write-Host "   - Record screen with Windows Game Bar (Win + G)" -ForegroundColor Gray
Write-Host "   - Upload to Kapwing.com" -ForegroundColor Gray
Write-Host "   - Add voiceover" -ForegroundColor Gray
Write-Host "   - Time: 30 minutes" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Professional Method - Use OBS Studio" -ForegroundColor White
Write-Host "   - Record with OBS Studio" -ForegroundColor Gray
Write-Host "   - Combine with DaVinci Resolve" -ForegroundColor Gray
Write-Host "   - Time: 45 minutes" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Automated Method - Use PowerPoint Recording" -ForegroundColor White
Write-Host "   - Create slides with screenshots" -ForegroundColor Gray
Write-Host "   - Record PowerPoint presentation" -ForegroundColor Gray
Write-Host "   - Add voiceover" -ForegroundColor Gray
Write-Host "   - Time: 40 minutes" -ForegroundColor Gray
Write-Host ""

$choice = Read-Host "Enter your choice (1-3)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
        Write-Host "METHOD 1: QUICK METHOD WITH KAPWING" -ForegroundColor Green
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
        Write-Host ""
        
        Write-Host "STEP 1: Record Screen (15 minutes)" -ForegroundColor Yellow
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
        Write-Host ""
        Write-Host "1. Press Win + G to open Windows Game Bar" -ForegroundColor White
        Write-Host "2. Click the Record button (or Win + Alt + R)" -ForegroundColor White
        Write-Host "3. Open this URL in browser:" -ForegroundColor White
        Write-Host "   http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "4. Follow these actions (from 3_MINUTE_DEMO_SCRIPT.md):" -ForegroundColor White
        Write-Host "   - Show homepage (5 sec)" -ForegroundColor Gray
        Write-Host "   - Switch to Hindi (5 sec)" -ForegroundColor Gray
        Write-Host "   - Go to symptom intake (5 sec)" -ForegroundColor Gray
        Write-Host "   - Type in Hindi: मुझे बुखार और सिरदर्द है (10 sec)" -ForegroundColor Gray
        Write-Host "   - Submit and show results (20 sec)" -ForegroundColor Gray
        Write-Host "   - Go to provider search (5 sec)" -ForegroundColor Gray
        Write-Host "   - Search in Tamil (10 sec)" -ForegroundColor Gray
        Write-Host "   - Show supervisor dashboard (10 sec)" -ForegroundColor Gray
        Write-Host "   - Show impact metrics (10 sec)" -ForegroundColor Gray
        Write-Host "   - Show thank you (10 sec)" -ForegroundColor Gray
        Write-Host ""
        Write-Host "5. Press Win + Alt + R to stop recording" -ForegroundColor White
        Write-Host "6. Video saved to: C:\Users\$env:USERNAME\Videos\Captures\" -ForegroundColor White
        Write-Host ""
        
        Read-Host "Press ENTER when screen recording is complete"
        
        Write-Host ""
        Write-Host "STEP 2: Combine with Voiceover (15 minutes)" -ForegroundColor Yellow
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Opening Kapwing.com..." -ForegroundColor White
        Start-Process "https://www.kapwing.com/studio/editor"
        Write-Host ""
        Write-Host "In Kapwing:" -ForegroundColor White
        Write-Host "1. Click 'Upload' and select your screen recording" -ForegroundColor Gray
        Write-Host "2. Click 'Audio' → 'Upload' → Select: demo-voiceover-polly-female-backup.mp3" -ForegroundColor Gray
        Write-Host "3. Drag audio to timeline" -ForegroundColor Gray
        Write-Host "4. Sync audio with video (adjust timing if needed)" -ForegroundColor Gray
        Write-Host "5. Click 'Export' → Download as MP4" -ForegroundColor Gray
        Write-Host "6. Save as: Arogya_AI_Demo_Video_Final.mp4" -ForegroundColor Gray
        Write-Host ""
        
        # Open file explorer to voiceover location
        Write-Host "Opening folder with voiceover file..." -ForegroundColor White
        Start-Process "explorer.exe" -ArgumentList "/select,`"$PWD\demo-voiceover-polly-female-backup.mp3`""
        Write-Host ""
        
        Read-Host "Press ENTER when video is exported from Kapwing"
        
        Write-Host ""
        Write-Host "STEP 3: Upload to YouTube (10 minutes)" -ForegroundColor Yellow
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Opening YouTube upload..." -ForegroundColor White
        Start-Process "https://youtube.com/upload"
        Write-Host ""
        Write-Host "Upload details:" -ForegroundColor White
        Write-Host ""
        Write-Host "Title:" -ForegroundColor Yellow
        Write-Host "Arogya AI Healthcare Platform - AWS AI Bharat Hackathon Demo" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Description:" -ForegroundColor Yellow
        Write-Host "Arogya AI Healthcare Platform - AI-Powered Healthcare Access for Rural India" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Live App: http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com" -ForegroundColor Cyan
        Write-Host "GitHub: https://github.com/NandaCodeBox/DecentralizedHealthcare" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Visibility: Unlisted" -ForegroundColor Yellow
        Write-Host ""
        
        Read-Host "Press ENTER when video is uploaded to YouTube"
        
        $youtubeUrl = Read-Host "Enter your YouTube video URL"
        
        Write-Host ""
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
        Write-Host "✓ VIDEO CREATION COMPLETE!" -ForegroundColor Green
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
        Write-Host ""
        Write-Host "Your YouTube URL:" -ForegroundColor Yellow
        Write-Host $youtubeUrl -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Save this URL for hackathon submission!" -ForegroundColor Yellow
        Write-Host ""
    }
    
    "2" {
        Write-Host ""
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
        Write-Host "METHOD 2: PROFESSIONAL METHOD WITH OBS" -ForegroundColor Green
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
        Write-Host ""
        
        Write-Host "Prerequisites:" -ForegroundColor Yellow
        Write-Host "  - OBS Studio (download from obsproject.com)" -ForegroundColor White
        Write-Host "  - DaVinci Resolve (download from blackmagicdesign.com)" -ForegroundColor White
        Write-Host ""
        
        Write-Host "STEP 1: Record with OBS Studio (20 minutes)" -ForegroundColor Yellow
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
        Write-Host ""
        Write-Host "1. Open OBS Studio" -ForegroundColor White
        Write-Host "2. Add Source → Display Capture" -ForegroundColor White
        Write-Host "3. Settings → Output → Recording Quality: High" -ForegroundColor White
        Write-Host "4. Click 'Start Recording'" -ForegroundColor White
        Write-Host "5. Follow 3_MINUTE_DEMO_SCRIPT.md" -ForegroundColor White
        Write-Host "6. Click 'Stop Recording'" -ForegroundColor White
        Write-Host "7. Video saved to: Videos folder" -ForegroundColor White
        Write-Host ""
        
        Write-Host "Opening demo script..." -ForegroundColor White
        Start-Process "3_MINUTE_DEMO_SCRIPT.md"
        Write-Host ""
        
        Read-Host "Press ENTER when OBS recording is complete"
        
        Write-Host ""
        Write-Host "STEP 2: Combine with DaVinci Resolve (15 minutes)" -ForegroundColor Yellow
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
        Write-Host ""
        Write-Host "1. Open DaVinci Resolve" -ForegroundColor White
        Write-Host "2. Create New Project" -ForegroundColor White
        Write-Host "3. Import screen recording" -ForegroundColor White
        Write-Host "4. Import: demo-voiceover-polly-female-backup.mp3" -ForegroundColor White
        Write-Host "5. Drag both to timeline" -ForegroundColor White
        Write-Host "6. Sync audio with video" -ForegroundColor White
        Write-Host "7. File → Export → MP4" -ForegroundColor White
        Write-Host "8. Save as: Arogya_AI_Demo_Video_Final.mp4" -ForegroundColor White
        Write-Host ""
        
        # Open file explorer
        Start-Process "explorer.exe" -ArgumentList "/select,`"$PWD\demo-voiceover-polly-female-backup.mp3`""
        Write-Host ""
        
        Read-Host "Press ENTER when video is exported"
        
        Write-Host ""
        Write-Host "STEP 3: Upload to YouTube (10 minutes)" -ForegroundColor Yellow
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
        Write-Host ""
        Start-Process "https://youtube.com/upload"
        Write-Host "Follow same upload instructions as Method 1" -ForegroundColor White
        Write-Host ""
        
        Read-Host "Press ENTER when uploaded"
        
        $youtubeUrl = Read-Host "Enter your YouTube video URL"
        
        Write-Host ""
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
        Write-Host "✓ VIDEO CREATION COMPLETE!" -ForegroundColor Green
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
        Write-Host ""
        Write-Host "Your YouTube URL:" -ForegroundColor Yellow
        Write-Host $youtubeUrl -ForegroundColor Cyan
        Write-Host ""
    }
    
    "3" {
        Write-Host ""
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
        Write-Host "METHOD 3: POWERPOINT RECORDING METHOD" -ForegroundColor Green
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
        Write-Host ""
        
        Write-Host "This method uses your existing PowerPoint presentation!" -ForegroundColor Yellow
        Write-Host ""
        
        Write-Host "STEP 1: Add screenshots to PowerPoint (10 minutes)" -ForegroundColor Yellow
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Opening PowerPoint..." -ForegroundColor White
        Start-Process "Deck\Arogya_AI_Hackathon_Final_Presentation.pptx"
        Write-Host ""
        Write-Host "Add screenshots to Slide 12 (if not already done)" -ForegroundColor White
        Write-Host ""
        
        Read-Host "Press ENTER when screenshots are added"
        
        Write-Host ""
        Write-Host "STEP 2: Record PowerPoint with voiceover (20 minutes)" -ForegroundColor Yellow
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
        Write-Host ""
        Write-Host "In PowerPoint:" -ForegroundColor White
        Write-Host "1. Go to Slide Show → Record Slide Show" -ForegroundColor Gray
        Write-Host "2. Click 'Record from Beginning'" -ForegroundColor Gray
        Write-Host "3. Advance slides manually while voiceover plays" -ForegroundColor Gray
        Write-Host "4. File → Export → Create a Video" -ForegroundColor Gray
        Write-Host "5. Save as: Arogya_AI_Demo_Video_Final.mp4" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Note: Play demo-voiceover-polly-female-backup.mp3 in background" -ForegroundColor Yellow
        Write-Host ""
        
        Read-Host "Press ENTER when video is exported"
        
        Write-Host ""
        Write-Host "STEP 3: Upload to YouTube (10 minutes)" -ForegroundColor Yellow
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
        Write-Host ""
        Start-Process "https://youtube.com/upload"
        Write-Host ""
        
        Read-Host "Press ENTER when uploaded"
        
        $youtubeUrl = Read-Host "Enter your YouTube video URL"
        
        Write-Host ""
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
        Write-Host "✓ VIDEO CREATION COMPLETE!" -ForegroundColor Green
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
        Write-Host ""
        Write-Host "Your YouTube URL:" -ForegroundColor Yellow
        Write-Host $youtubeUrl -ForegroundColor Cyan
        Write-Host ""
    }
    
    default {
        Write-Host ""
        Write-Host "Invalid choice. Please run the script again." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "NEXT STEPS" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "✓ Demo video created with female voiceover" -ForegroundColor Green
Write-Host "✓ Video uploaded to YouTube" -ForegroundColor Green
Write-Host ""
Write-Host "Now you can:" -ForegroundColor Yellow
Write-Host "1. Update PowerPoint with YouTube URL" -ForegroundColor White
Write-Host "2. Export PowerPoint as PDF" -ForegroundColor White
Write-Host "3. Submit all 4 deliverables" -ForegroundColor White
Write-Host ""
Write-Host "Run: .\COMPLETE_HACKATHON_SUBMISSION.ps1" -ForegroundColor Cyan
Write-Host ""
