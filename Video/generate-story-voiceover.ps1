# Generate Story-Driven Voiceover using AWS Polly
# Creates professional voiceover for 3-minute demo

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "GENERATING STORY-DRIVEN VOICEOVER" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Voiceover text (3 minutes)
$voiceoverText = @"
<speak>
<prosody rate="medium" pitch="medium">

<break time="500ms"/>

Meet Rajesh, a farmer in rural Maharashtra. His mother has been suffering from fever and headache for three days. But there's a problem - the nearest doctor is 15 kilometers away, and she doesn't speak English. Like millions of Indians, she faces two critical barriers: language and access to healthcare. This is where Arogya dot ai changes everything.

<break time="1s"/>

Arogya dot ai is India's first AI-powered multilingual healthcare platform. Watch as we switch to Hindi - the interface instantly translates. No more language barriers. Whether you speak Hindi, Tamil, Telugu, or English, quality healthcare is now accessible in your mother tongue.

<break time="1s"/>

Rajesh's mother can now describe her symptoms in Hindi. She clicks common symptoms like fever and headache, or types custom symptoms in her own language. She selects the severity - moderate - and indicates the symptoms have lasted for three days. The AI understands natural language input, making it easy for anyone to use, regardless of education level.

<break time="1s"/>

Within seconds, our AI - powered by Amazon Bedrock - analyzes her symptoms and provides an intelligent assessment with 87 percent confidence. It recommends the urgency level and suggests three nearby facilities, each with an AI match score. The system considers distance, wait times, and availability. No more guessing where to go - AI guides you to the right care, right now.

<break time="1s"/>

Need a specific doctor? Our AI-powered semantic search understands intent, not just keywords. Type 'chest pain and shortness of breath' in Tamil, and the AI instantly recommends a cardiologist. It filters results intelligently, showing only relevant specialists with match scores, ratings, and availability. You can book appointments directly from the platform.

<break time="1s"/>

But AI isn't perfect. That's why we have healthcare supervisors who review AI assessments in real-time. This human-in-the-loop approach ensures quality and accuracy. Cases are color-coded by severity, and low-confidence assessments are flagged for human review. It's the perfect blend of AI efficiency and human expertise.

<break time="1s"/>

And it works everywhere. Arogya dot ai is fully mobile-responsive, designed for smartphones that millions of rural Indians use. Touch-friendly buttons, optimized layouts, and PWA technology mean it works even with poor internet connectivity. Healthcare in your pocket, in your language.

<break time="1s"/>

Arogya dot ai - breaking down language barriers, bridging the urban-rural divide, and making quality healthcare accessible to every Indian. Because healthcare is a right, not a privilege. Visit us at Arogya dot ai.

<break time="500ms"/>

</prosody>
</speak>
"@

Write-Host "Voiceover text prepared (3 minutes)" -ForegroundColor Green
Write-Host "Voice: Aditi (Indian female)" -ForegroundColor Yellow
Write-Host ""

# Save text to file for reference
$voiceoverText | Out-File -FilePath "story-voiceover-text.txt" -Encoding UTF8
Write-Host "✓ Saved voiceover text to: story-voiceover-text.txt" -ForegroundColor Green

# Generate voiceover using AWS Polly
Write-Host ""
Write-Host "Generating voiceover with AWS Polly..." -ForegroundColor Cyan

try {
    aws polly synthesize-speech `
        --output-format mp3 `
        --voice-id Aditi `
        --text-type ssml `
        --text $voiceoverText `
        story-driven-voiceover.mp3

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "================================================================" -ForegroundColor Green
        Write-Host "✅ VOICEOVER GENERATED SUCCESSFULLY!" -ForegroundColor Green
        Write-Host "================================================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Output file: story-driven-voiceover.mp3" -ForegroundColor Yellow
        
        # Get file size
        $fileSize = (Get-Item "story-driven-voiceover.mp3").Length / 1MB
        Write-Host "File size: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Yellow
        
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Run: python story-driven-recorder.py" -ForegroundColor White
        Write-Host "2. Combine video + voiceover" -ForegroundColor White
        Write-Host "3. Upload to YouTube" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "❌ ERROR: AWS Polly failed" -ForegroundColor Red
        Write-Host "Make sure AWS CLI is configured with credentials" -ForegroundColor Yellow
        Write-Host ""
    }
} catch {
    Write-Host ""
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
}

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
