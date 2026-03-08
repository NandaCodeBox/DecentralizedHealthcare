# Generate Complete Demo Voiceover using AWS Polly
# 3-minute comprehensive demo with all use cases

$text = Get-Content -Path "Video/complete-demo-voiceover.txt" -Raw

Write-Host "Generating voiceover with AWS Polly..." -ForegroundColor Cyan
Write-Host "Text length: $($text.Length) characters" -ForegroundColor Yellow

# Use Aditi (Indian English female voice) for natural storytelling
aws polly synthesize-speech `
    --output-format mp3 `
    --voice-id Aditi `
    --text "$text" `
    --engine neural `
    Video/complete-demo-voiceover.mp3

if ($LASTEXITCODE -eq 0) {
    Write-Host "Success: Voiceover generated successfully!" -ForegroundColor Green
    
    # Get file info
    $fileInfo = Get-Item "Video/complete-demo-voiceover.mp3"
    Write-Host "File size: $([math]::Round($fileInfo.Length / 1MB, 2)) MB" -ForegroundColor Green
    
    # Get duration using ffprobe
    $duration = ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "Video/complete-demo-voiceover.mp3"
    Write-Host "Duration: $([math]::Round([double]$duration, 1)) seconds" -ForegroundColor Green
    
    Write-Host "`nVoiceover ready: Video/complete-demo-voiceover.mp3" -ForegroundColor Cyan
} else {
    Write-Host "Error: Failed to generate voiceover" -ForegroundColor Red
}
