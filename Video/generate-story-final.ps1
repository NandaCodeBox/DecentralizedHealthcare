# Generate Story-Driven Voiceover using AWS Polly

$scriptPath = "story-voiceover-final.txt"
$outputPath = "story-voiceover-final.mp3"

Write-Host "Reading story script..." -ForegroundColor Cyan
$text = Get-Content $scriptPath -Raw

Write-Host "Generating voiceover with AWS Polly (Aditi voice)..." -ForegroundColor Cyan
Write-Host "Text length: $($text.Length) characters" -ForegroundColor Yellow

try {
    aws polly synthesize-speech --text-type text --text file://$scriptPath --output-format mp3 --voice-id Aditi --engine standard $outputPath

    if ($LASTEXITCODE -eq 0) {
        $fileSize = (Get-Item $outputPath).Length
        $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
        
        Write-Host ""
        Write-Host "Voiceover generated successfully!" -ForegroundColor Green
        Write-Host "Output: $outputPath" -ForegroundColor Green
        Write-Host "Size: $fileSizeMB MB" -ForegroundColor Green
        
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
Write-Host "Next step: Combine with desktop demo video" -ForegroundColor Yellow
Write-Host "Use: Arogya_AI_Hackathon_Demo_Final.mp4" -ForegroundColor Yellow
