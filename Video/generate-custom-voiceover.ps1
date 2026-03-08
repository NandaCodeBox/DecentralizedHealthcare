# Generate Custom Voiceover for 3-Minute Demo Video
# Uses AWS Polly to generate professional voiceover

Write-Host "🎙️ Generating Custom Voiceover for Arogya.ai Demo..." -ForegroundColor Cyan
Write-Host ""

# Full voiceover script (3 minutes)
$voiceoverText = @"
<speak>
    <prosody rate="medium" pitch="medium">
        Welcome to Arogya dot ai - India's first AI-powered multilingual healthcare platform. 
        We're breaking down language barriers to make quality healthcare accessible to everyone, especially in rural areas. 
        Let me show you how it works.
        
        <break time="1s"/>
        
        Our platform supports four Indian languages - English, Hindi, Tamil, and Telugu. 
        Watch as I switch to Hindi and describe symptoms naturally. 
        Rural users can click common symptoms like fever, headache, and cough - all in their native language. 
        They can also type custom symptoms in Hindi. 
        I'm selecting moderate severity and indicating the symptoms have lasted for three days. 
        Our AI will process this information in seconds and provide an intelligent assessment.
        
        <break time="1s"/>
        
        Here's the power of our AI. 
        It analyzes the symptoms and provides a triage assessment with an 87 percent confidence score. 
        The system recommends the appropriate urgency level and suggests nearby healthcare facilities. 
        Each facility recommendation includes an AI match score, distance, wait times, and reasoning for why it's a good fit. 
        This helps patients make informed decisions about where to seek care.
        
        <break time="1s"/>
        
        Users can also search for specific healthcare providers. 
        Watch as I switch to Tamil and search for a cardiologist. 
        Our semantic AI understands the intent, not just keywords. 
        It provides relevant results with match scores, ratings, and availability - all powered by artificial intelligence.
        
        <break time="1s"/>
        
        Finally, healthcare supervisors can review AI assessments through our dashboard. 
        This human-in-the-loop approach ensures quality and accuracy. 
        Cases are color-coded by severity, and low-confidence assessments are flagged for human review. 
        This combines AI efficiency with human expertise - the best of both worlds.
        
        <break time="500ms"/>
        
        Thank you for watching. 
        Arogya dot ai - Making healthcare accessible for all of India.
    </prosody>
</speak>
"@

Write-Host "📝 Voiceover Script:" -ForegroundColor Yellow
Write-Host $voiceoverText
Write-Host ""

# Save script to file
$voiceoverText | Out-File -FilePath "Video\custom-voiceover-script.txt" -Encoding UTF8
Write-Host "✅ Script saved to: Video\custom-voiceover-script.txt" -ForegroundColor Green
Write-Host ""

# Generate voiceover with AWS Polly (Female Indian voice - Aditi)
Write-Host "🎤 Generating voiceover with AWS Polly (Aditi - Female Indian English)..." -ForegroundColor Cyan

try {
    # Use Aditi voice (Female, Indian English)
    aws polly synthesize-speech `
        --output-format mp3 `
        --voice-id Aditi `
        --engine neural `
        --text-type ssml `
        --text $voiceoverText `
        Video\custom-voiceover-3min.mp3

    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ SUCCESS! Voiceover generated!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📁 Output file: Video\custom-voiceover-3min.mp3" -ForegroundColor Yellow
        Write-Host ""
        
        # Get file size
        $fileSize = (Get-Item "Video\custom-voiceover-3min.mp3").Length
        $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
        Write-Host "📊 File size: $fileSizeMB MB" -ForegroundColor Cyan
        
        # Calculate cost (Neural voice: $16 per 1M characters)
        $charCount = $voiceoverText.Length
        $cost = [math]::Round(($charCount / 1000000) * 16, 4)
        Write-Host "💰 Estimated cost: `$$cost" -ForegroundColor Cyan
        Write-Host ""
        
        Write-Host "🎬 NEXT STEPS:" -ForegroundColor Yellow
        Write-Host "1. Trim your video to 3 minutes using Kapwing.com or Video Editor" -ForegroundColor White
        Write-Host "2. Combine trimmed video with custom-voiceover-3min.mp3" -ForegroundColor White
        Write-Host "3. Export final video as MP4" -ForegroundColor White
        Write-Host "4. Upload to YouTube (unlisted)" -ForegroundColor White
        Write-Host ""
        
        # Play the voiceover
        Write-Host "🔊 Playing voiceover..." -ForegroundColor Cyan
        Start-Process "Video\custom-voiceover-3min.mp3"
        
    } else {
        Write-Host ""
        Write-Host "❌ ERROR: Failed to generate voiceover" -ForegroundColor Red
        Write-Host "Please check your AWS credentials and try again" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Make sure AWS CLI is configured:" -ForegroundColor Yellow
    Write-Host "   aws configure" -ForegroundColor White
    Write-Host ""
}

Write-Host ""
Write-Host "✅ Script complete!" -ForegroundColor Green
Write-Host ""
