# Quick Video Editor using FFmpeg
# Fast and simple - trims video and adds voiceover

Write-Host "🎬 Quick Video Editor - Arogya.ai Demo" -ForegroundColor Cyan
Write-Host "=" * 70
Write-Host ""

# File paths
$inputVideo = "Sign In - Arogya.ai - Google Chrome 2026-03-08 16-58-53.mp4"
$inputAudio = "custom-voiceover-3min.mp3"
$outputVideo = "Arogya_AI_Demo_Final.mp4"

# Check if files exist
if (-not (Test-Path $inputVideo)) {
    Write-Host "❌ Error: Video file not found: $inputVideo" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $inputAudio)) {
    Write-Host "❌ Error: Audio file not found: $inputAudio" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Input files found" -ForegroundColor Green
Write-Host ""

# Check if FFmpeg is installed
Write-Host "🔍 Checking FFmpeg..." -ForegroundColor Yellow
try {
    $ffmpegVersion = ffmpeg -version 2>&1 | Select-Object -First 1
    Write-Host "✅ FFmpeg found: $ffmpegVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ FFmpeg not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "📥 Installing FFmpeg..." -ForegroundColor Yellow
    Write-Host ""
    
    # Try to install via winget
    try {
        winget install --id=Gyan.FFmpeg -e --silent
        Write-Host "✅ FFmpeg installed!" -ForegroundColor Green
        Write-Host "⚠️ Please restart PowerShell and run this script again" -ForegroundColor Yellow
        exit 0
    } catch {
        Write-Host "❌ Could not install FFmpeg automatically" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please install FFmpeg manually:" -ForegroundColor Yellow
        Write-Host "1. Download from: https://www.gyan.dev/ffmpeg/builds/" -ForegroundColor White
        Write-Host "2. Extract to C:\ffmpeg" -ForegroundColor White
        Write-Host "3. Add C:\ffmpeg\bin to PATH" -ForegroundColor White
        Write-Host ""
        Write-Host "OR use the Python script: .\setup-and-run.ps1" -ForegroundColor Cyan
        exit 1
    }
}

Write-Host ""
Write-Host "=" * 70
Write-Host ""

# Get audio duration
Write-Host "📊 Analyzing files..." -ForegroundColor Cyan
$audioDuration = ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $inputAudio 2>$null
$audioDuration = [math]::Round([double]$audioDuration, 1)
Write-Host "   Audio duration: $audioDuration seconds" -ForegroundColor White

# Get video duration
$videoDuration = ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $inputVideo 2>$null
$videoDuration = [math]::Round([double]$videoDuration, 1)
Write-Host "   Video duration: $videoDuration seconds" -ForegroundColor White

Write-Host ""

# Determine trim strategy
$targetDuration = 180  # 3 minutes

if ($videoDuration -le $targetDuration) {
    Write-Host "✅ Video is already under 3 minutes!" -ForegroundColor Green
    $trimDuration = $videoDuration
} else {
    Write-Host "✂️ Trimming video to first $targetDuration seconds..." -ForegroundColor Yellow
    $trimDuration = $targetDuration
}

Write-Host ""
Write-Host "🎬 Processing video..." -ForegroundColor Cyan
Write-Host "This will take 2-5 minutes..." -ForegroundColor Yellow
Write-Host ""

# FFmpeg command to:
# 1. Trim video to target duration
# 2. Remove original audio
# 3. Add voiceover
# 4. Re-encode with good quality

$ffmpegArgs = @(
    "-i", $inputVideo,
    "-i", $inputAudio,
    "-t", $trimDuration,
    "-map", "0:v:0",
    "-map", "1:a:0",
    "-c:v", "libx264",
    "-preset", "medium",
    "-crf", "23",
    "-c:a", "aac",
    "-b:a", "192k",
    "-movflags", "+faststart",
    "-y",
    $outputVideo
)

# Run FFmpeg
$process = Start-Process -FilePath "ffmpeg" -ArgumentList $ffmpegArgs -NoNewWindow -Wait -PassThru

if ($process.ExitCode -eq 0) {
    Write-Host ""
    Write-Host "=" * 70
    Write-Host "✅ SUCCESS! Video created!" -ForegroundColor Green
    Write-Host "=" * 70
    Write-Host ""
    
    # Get output file info
    $outputSize = (Get-Item $outputVideo).Length / 1MB
    $outputSize = [math]::Round($outputSize, 1)
    
    Write-Host "📁 Output file: $outputVideo" -ForegroundColor Yellow
    Write-Host "📊 File size: $outputSize MB" -ForegroundColor Cyan
    Write-Host "⏱️ Duration: ~$trimDuration seconds" -ForegroundColor Cyan
    Write-Host "🎤 Voiceover: Included" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📤 Ready to upload to YouTube!" -ForegroundColor Green
    Write-Host ""
    
    # Ask if user wants to play
    $response = Read-Host "Would you like to play the video now? (Y/N)"
    if ($response -eq "Y" -or $response -eq "y") {
        Start-Process $outputVideo
    }
    
} else {
    Write-Host ""
    Write-Host "❌ Error occurred during processing" -ForegroundColor Red
    Write-Host "Exit code: $($process.ExitCode)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
