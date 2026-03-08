# Generate Final Mobile Demo Voiceover using AWS Polly
# Uses Aditi voice (Indian English female)

$scriptPath = "mobile-voiceover-final.txt"
$outputPath = "mobile-voiceover-final.mp3"

Write-Host "Reading voiceover script..." -ForegroundColor Cyan
$text = Get-Content $scriptPath -Raw

Write-Host "Generating voiceover with AWS Polly (Aditi voice)..." -ForegroundColor Cyan
Write-Host "Text length: $($text.Length) characters" -ForegroundColor Yellow

try {
    # Use Aditi voice (Indian English, female) with text from file
    aws polly synthesize-speech --text-type text --text file://$scriptPath --output-format mp3 --voice-id Aditi --engine standard $outputPath

    if ($LASTEXITCODE -eq 0) {
        $fileSize = (Get-Item $outputPath).Length
        $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
        
        Write-Host ""
        Write-Host "Voiceover generated successfully!" -ForegroundColor Green
        Write-Host "Output: $outputPath" -ForegroundColor Green
        Write-Host "Size: $fileSizeMB MB" -ForegroundColor Green
        
        # Get audio duration using ffprobe
        Write-Host ""
        Write-Host "Getting audio duration..." -ForegroundColor Cyan
        $duration = ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $outputPath
        $durationSeconds = [math]::Round([double]$duration, 1)
        Write-Host "Duration: $durationSeconds seconds" -ForegroundColor Green
        
    } else {
        Write-Host ""
        Write-Host "Failed to generate voiceover" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run: python record-mobile-final.py" -ForegroundColor Yellow
Write-Host "2. Run: python combine-final-mobile.py" -ForegroundColor Yellow
