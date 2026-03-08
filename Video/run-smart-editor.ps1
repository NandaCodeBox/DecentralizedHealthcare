# Smart Video Editor - Intelligent trimming based on voiceover script
# Analyzes video content and matches to voiceover timing

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                                                                      ║" -ForegroundColor Cyan
Write-Host "║   🧠 SMART VIDEO EDITOR - Arogya.ai                                 ║" -ForegroundColor Cyan
Write-Host "║                                                                      ║" -ForegroundColor Cyan
Write-Host "║   Intelligently trims video based on voiceover script               ║" -ForegroundColor Cyan
Write-Host "║                                                                      ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check Python
Write-Host "🔍 Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Python from: https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host "Make sure to check 'Add Python to PATH' during installation" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 1
}

Write-Host ""

# Install dependencies
Write-Host "📦 Installing required packages..." -ForegroundColor Cyan
Write-Host "This may take a few minutes on first run..." -ForegroundColor Yellow
Write-Host ""

$packages = @("opencv-python", "moviepy", "numpy")

foreach ($package in $packages) {
    Write-Host "   Installing $package..." -ForegroundColor White
    pip install $package --quiet --disable-pip-version-check
}

Write-Host ""
Write-Host "✅ Dependencies installed!" -ForegroundColor Green
Write-Host ""
Write-Host "=" * 70
Write-Host ""

# Run the smart editor
Write-Host "🎬 Starting smart video editor..." -ForegroundColor Cyan
Write-Host ""
Write-Host "What this does:" -ForegroundColor Yellow
Write-Host "  1. Analyzes your video frame by frame" -ForegroundColor White
Write-Host "  2. Detects page transitions and scene changes" -ForegroundColor White
Write-Host "  3. Maps video segments to voiceover script timing" -ForegroundColor White
Write-Host "  4. Intelligently trims to match voiceover perfectly" -ForegroundColor White
Write-Host "  5. Exports final 3-minute video" -ForegroundColor White
Write-Host ""
Write-Host "This will take 5-10 minutes..." -ForegroundColor Yellow
Write-Host ""

python smart-video-editor.py

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=" * 70
    Write-Host "✅ SUCCESS! Your video is ready!" -ForegroundColor Green
    Write-Host "=" * 70
    Write-Host ""
    Write-Host "📁 Output: Arogya_AI_Demo_Final.mp4" -ForegroundColor Yellow
    Write-Host "⏱️ Duration: 3 minutes" -ForegroundColor Cyan
    Write-Host "🎤 Voiceover: Perfectly synced" -ForegroundColor Cyan
    Write-Host "✂️ Editing: Intelligent scene-based" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📤 Next: Upload to YouTube (unlisted)" -ForegroundColor Yellow
    Write-Host ""
    
    # Ask if user wants to play
    $response = Read-Host "Would you like to play the video now? (Y/N)"
    if ($response -eq "Y" -or $response -eq "y") {
        Start-Process "Arogya_AI_Demo_Final.mp4"
    }
    
} else {
    Write-Host ""
    Write-Host "❌ Error occurred during processing" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "  1. Missing dependencies - run: pip install moviepy opencv-python numpy" -ForegroundColor White
    Write-Host "  2. Video file not found - check file name" -ForegroundColor White
    Write-Host "  3. Audio file not found - check custom-voiceover-3min.mp3 exists" -ForegroundColor White
    Write-Host ""
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
