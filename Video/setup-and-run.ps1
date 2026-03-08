# Setup and Run Intelligent Video Editor
# Installs dependencies and processes your video

Write-Host "🎬 Arogya.ai Intelligent Video Editor" -ForegroundColor Cyan
Write-Host "=" * 70
Write-Host ""

# Check if Python is installed
Write-Host "🔍 Checking Python installation..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found!" -ForegroundColor Red
    Write-Host "Please install Python from: https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host "Make sure to check 'Add Python to PATH' during installation" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Check if pip is available
Write-Host "🔍 Checking pip..." -ForegroundColor Yellow
try {
    $pipVersion = pip --version 2>&1
    Write-Host "✅ pip found: $pipVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ pip not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Install required packages
Write-Host "📦 Installing required packages..." -ForegroundColor Cyan
Write-Host "This may take a few minutes on first run..." -ForegroundColor Yellow
Write-Host ""

$packages = @(
    "opencv-python",
    "moviepy",
    "numpy"
)

foreach ($package in $packages) {
    Write-Host "Installing $package..." -ForegroundColor White
    pip install $package --quiet
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $package installed" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Warning: $package installation had issues" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=" * 70
Write-Host ""

# Run the video editor
Write-Host "🎬 Starting intelligent video editor..." -ForegroundColor Cyan
Write-Host ""

python intelligent-video-editor.py

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=" * 70
    Write-Host "✅ SUCCESS! Your video is ready!" -ForegroundColor Green
    Write-Host "=" * 70
    Write-Host ""
    Write-Host "📁 Output: Arogya_AI_Demo_Final.mp4" -ForegroundColor Yellow
    Write-Host "📤 Next: Upload to YouTube (unlisted)" -ForegroundColor Yellow
    Write-Host ""
    
    # Ask if user wants to open the video
    $response = Read-Host "Would you like to play the video now? (Y/N)"
    if ($response -eq "Y" -or $response -eq "y") {
        Start-Process "Arogya_AI_Demo_Final.mp4"
    }
    
} else {
    Write-Host ""
    Write-Host "❌ Error occurred during video processing" -ForegroundColor Red
    Write-Host "Please check the error messages above" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
