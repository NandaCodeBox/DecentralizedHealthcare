# QR Code Generation Script
# Generates QR codes for Live App and GitHub Repository

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "QR Code Generator" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Create Screenshots folder if it doesn't exist
$screenshotsFolder = "Deck\Screenshots"
if (-not (Test-Path $screenshotsFolder)) {
    New-Item -ItemType Directory -Path $screenshotsFolder | Out-Null
}

# URLs to encode
$liveAppUrl = "http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com"
$githubUrl = "https://github.com/NandaCodeBox/DecentralizedHealthcare"

Write-Host "Generating QR codes..." -ForegroundColor Yellow
Write-Host ""

# Function to generate QR code using Google Charts API
function Generate-QRCode {
    param(
        [string]$url,
        [string]$outputPath
    )
    
    $encodedUrl = [System.Web.HttpUtility]::UrlEncode($url)
    $qrApiUrl = "https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=$encodedUrl"
    
    try {
        Invoke-WebRequest -Uri $qrApiUrl -OutFile $outputPath
        Write-Host "✓ Generated: $outputPath" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "✗ Failed to generate: $outputPath" -ForegroundColor Red
        Write-Host "  Error: $_" -ForegroundColor Red
        return $false
    }
}

# Load System.Web for URL encoding
Add-Type -AssemblyName System.Web

# Generate QR codes
Write-Host "1. Generating Live App QR Code..." -ForegroundColor White
$qr1Path = Join-Path $screenshotsFolder "qr-live-app.png"
$success1 = Generate-QRCode -url $liveAppUrl -outputPath $qr1Path

Write-Host ""
Write-Host "2. Generating GitHub QR Code..." -ForegroundColor White
$qr2Path = Join-Path $screenshotsFolder "qr-github.png"
$success2 = Generate-QRCode -url $githubUrl -outputPath $qr2Path

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "RESULTS" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

if ($success1 -and $success2) {
    Write-Host "✓ Both QR codes generated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Files created:" -ForegroundColor Yellow
    Write-Host "  - $qr1Path" -ForegroundColor White
    Write-Host "  - $qr2Path" -ForegroundColor White
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Open PowerPoint: Deck\Arogya_AI_Hackathon_Final_Presentation.pptx" -ForegroundColor White
    Write-Host "2. Go to Slide 12 - Add 6 screenshots" -ForegroundColor White
    Write-Host "3. Go to Slide 16 - Add 2 QR codes" -ForegroundColor White
    Write-Host "4. Export as PDF" -ForegroundColor White
} else {
    Write-Host "⚠ Some QR codes failed to generate" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Generate manually at https://www.qr-code-generator.com/" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "URLs to encode:" -ForegroundColor Yellow
    Write-Host "  Live App: $liveAppUrl" -ForegroundColor White
    Write-Host "  GitHub: $githubUrl" -ForegroundColor White
}

Write-Host ""
Write-Host "Press ENTER to exit..." -ForegroundColor Cyan
Read-Host
