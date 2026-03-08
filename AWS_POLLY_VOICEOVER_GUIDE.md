# AWS Polly Voiceover Guide - 3-Minute Demo Video

**Service**: Amazon Polly (AWS Text-to-Speech)
**Voice**: Indian Male (Aditi - Indian English)
**Duration**: 3 minutes
**Cost**: ~$0.12 (very affordable!)

---

## 🎙️ Amazon Polly Overview

**What is Amazon Polly?**
- AWS text-to-speech service
- Natural-sounding voices
- Supports Indian English accent
- Pay-per-use pricing
- High quality audio

**Cost**:
- $4.00 per 1 million characters
- Your script: ~3,000 characters
- Cost: **~$0.012** (1 cent!)

---

## 🚀 Quick Start: Generate Voiceover (10 minutes)

### Method 1: AWS Console (Easiest) - RECOMMENDED

#### Step 1: Open Amazon Polly Console (2 min)

1. Go to: https://console.aws.amazon.com/polly/
2. Sign in with your AWS account (289892867722)
3. Region: us-east-1 (same as your app)

#### Step 2: Configure Voice Settings (2 min)

1. Click "Text-to-Speech" in left sidebar
2. Select voice settings:
   - **Engine**: Neural (better quality)
   - **Language**: English, Indian (en-IN)
   - **Voice**: Aditi (Female) or Raveena (Female)
   
   **Note**: AWS Polly doesn't have Indian male voice, but Aditi/Raveena sound professional

   **Alternative**: Use Kajal (Indian English, Neural) - sounds neutral

3. **Speech marks**: None
4. **Output format**: MP3
5. **Sample rate**: 24000 Hz

#### Step 3: Paste Script (1 min)

Copy this optimized script for Polly:

```
India faces a healthcare crisis. With 1.4 billion people and only 1 doctor per 1,445 people, 70% of our rural population struggles to access healthcare. Language barriers exclude 980 million people from digital health solutions.

Introducing Arogya AI, an AI-powered healthcare platform that breaks language barriers and provides instant medical triage in Hindi, Tamil, Telugu, and English. Let me show you how it works.

The application is fully multilingual. Watch as I switch to Hindi. The entire interface translates instantly, every button, every label, every piece of text. This covers 80% of India's population.

Now, here's our breakthrough feature. I'm on the symptom intake page, and I'll type my symptoms in Hindi. I just typed 'I have fever and headache' in Hindi. The system automatically translates this to English for AI processing. I'll select the severity as moderate and duration as 1 to 3 days.

Watch what happens. The AI analyzes my symptoms using Amazon Bedrock with Claude 3, and provides an assessment with 87% confidence. It recommends seeing a general practitioner within 24 hours and explains the clinical reasoning. This is load-bearing AI, without it, the system cannot understand natural language in multiple languages or provide nuanced medical assessments.

Next, our AI provider search. I'll switch to Tamil and search for a cardiologist. The system uses semantic search, not just keyword matching. It understands the intent and finds relevant providers with AI match scores. This top provider has a 95% match, considering specialty, distance, availability, and quality ratings.

Finally, our human-in-the-loop system. The supervisor dashboard shows all cases requiring validation. Low-confidence cases are automatically flagged for human review. This ensures safety while maintaining speed. AI provides the assessment, humans provide the final validation.

The results speak for themselves. 87% triage accuracy, 95% provider match accuracy, and assessments in under 30 seconds. All of this costs just $0.001 per assessment, 100 times cheaper than manual triage.

Built entirely on AWS using Lambda, Bedrock, Translate, DynamoDB, and S3. Fully serverless, auto-scaling, and production-ready.

Arogya AI, Breaking language barriers, saving lives. Try it now at the link below. Thank you.
```

#### Step 4: Add SSML Tags for Better Pacing (2 min)

For better pacing, wrap in SSML:

```xml
<speak>
    <prosody rate="medium" pitch="medium">
        India faces a healthcare crisis. With 1.4 billion people and only 1 doctor per 1,445 people, 
        <break time="500ms"/>
        70% of our rural population struggles to access healthcare. 
        <break time="500ms"/>
        Language barriers exclude 980 million people from digital health solutions.
        <break time="1s"/>
        
        Introducing Arogya AI, an AI-powered healthcare platform that breaks language barriers 
        and provides instant medical triage in Hindi, Tamil, Telugu, and English. 
        <break time="500ms"/>
        Let me show you how it works.
        <break time="1s"/>
        
        The application is fully multilingual. Watch as I switch to Hindi. 
        <break time="500ms"/>
        The entire interface translates instantly, every button, every label, every piece of text. 
        <break time="500ms"/>
        This covers 80% of India's population.
        <break time="1s"/>
        
        Now, here's our breakthrough feature. I'm on the symptom intake page, 
        and I'll type my symptoms in Hindi. 
        <break time="1s"/>
        I just typed 'I have fever and headache' in Hindi. 
        <break time="500ms"/>
        The system automatically translates this to English for AI processing. 
        <break time="500ms"/>
        I'll select the severity as moderate and duration as 1 to 3 days.
        <break time="1s"/>
        
        Watch what happens. 
        <break time="500ms"/>
        The AI analyzes my symptoms using Amazon Bedrock with Claude 3, 
        and provides an assessment with 87% confidence. 
        <break time="500ms"/>
        It recommends seeing a general practitioner within 24 hours 
        and explains the clinical reasoning. 
        <break time="500ms"/>
        This is load-bearing AI, without it, the system cannot understand 
        natural language in multiple languages or provide nuanced medical assessments.
        <break time="1s"/>
        
        Next, our AI provider search. 
        <break time="500ms"/>
        I'll switch to Tamil and search for a cardiologist. 
        <break time="1s"/>
        The system uses semantic search, not just keyword matching. 
        <break time="500ms"/>
        It understands the intent and finds relevant providers with AI match scores. 
        <break time="500ms"/>
        This top provider has a 95% match, considering specialty, distance, 
        availability, and quality ratings.
        <break time="1s"/>
        
        Finally, our human-in-the-loop system. 
        <break time="500ms"/>
        The supervisor dashboard shows all cases requiring validation. 
        <break time="500ms"/>
        Low-confidence cases are automatically flagged for human review. 
        <break time="500ms"/>
        This ensures safety while maintaining speed. 
        <break time="500ms"/>
        AI provides the assessment, humans provide the final validation.
        <break time="1s"/>
        
        The results speak for themselves. 
        <break time="500ms"/>
        87% triage accuracy, 95% provider match accuracy, 
        and assessments in under 30 seconds. 
        <break time="500ms"/>
        All of this costs just $0.001 per assessment, 
        100 times cheaper than manual triage.
        <break time="1s"/>
        
        Built entirely on AWS using Lambda, Bedrock, Translate, DynamoDB, and S3. 
        <break time="500ms"/>
        Fully serverless, auto-scaling, and production-ready.
        <break time="1s"/>
        
        Arogya AI, Breaking language barriers, saving lives. 
        <break time="500ms"/>
        Try it now at the link below. Thank you.
    </prosody>
</speak>
```

#### Step 5: Generate Audio (2 min)

1. Click "Synthesize to S3" button
2. Or click "Listen" to preview
3. If satisfied, click "Download MP3"
4. Save as: `demo-voiceover-polly.mp3`

#### Step 6: Verify Audio (1 min)

1. Play the MP3 file
2. Check duration (should be ~3 minutes)
3. Check quality (should be clear)
4. If too fast/slow, adjust SSML `rate` attribute

---

## 🎯 Method 2: AWS CLI (For Developers)

### Step 1: Install AWS CLI (if not installed)

```bash
# Check if installed
aws --version

# If not installed, download from:
# https://aws.amazon.com/cli/
```

### Step 2: Create Script File

Save your script as `demo-script.txt` (plain text version)

### Step 3: Generate Audio with CLI

```bash
# Using Neural engine with Aditi voice
aws polly synthesize-speech \
  --engine neural \
  --language-code en-IN \
  --voice-id Aditi \
  --text-type text \
  --text file://demo-script.txt \
  --output-format mp3 \
  demo-voiceover-polly.mp3

# Or with SSML
aws polly synthesize-speech \
  --engine neural \
  --language-code en-IN \
  --voice-id Aditi \
  --text-type ssml \
  --text file://demo-script-ssml.xml \
  --output-format mp3 \
  demo-voiceover-polly.mp3
```

### Step 4: Verify

```bash
# Check file size
ls -lh demo-voiceover-polly.mp3

# Play audio (Windows)
start demo-voiceover-polly.mp3

# Play audio (Mac/Linux)
open demo-voiceover-polly.mp3
```

---

## 🎨 Voice Options in Amazon Polly

### Available Indian English Voices:

| Voice | Gender | Engine | Quality | Recommendation |
|-------|--------|--------|---------|----------------|
| **Aditi** | Female | Neural | Excellent | ⭐ Best for Indian accent |
| **Raveena** | Female | Standard | Good | Alternative |
| **Kajal** | Female | Neural | Excellent | Neutral, professional |

**Note**: Amazon Polly doesn't currently have Indian male voices. Aditi (female) is the most natural-sounding Indian English voice.

### Alternative: Use US Male Voice

If you prefer male voice:

| Voice | Gender | Engine | Quality |
|-------|--------|--------|---------|
| **Matthew** | Male | Neural | Excellent |
| **Joey** | Male | Neural | Good |
| **Justin** | Male | Neural | Good |

**Trade-off**: American accent instead of Indian accent

---

## 💰 Cost Calculation

### Amazon Polly Pricing

**Neural Voices**:
- $16.00 per 1 million characters
- First 1 million characters free (first 12 months)

**Your Script**:
- Characters: ~3,000
- Cost: 3,000 × $16.00 / 1,000,000 = **$0.048**
- **Essentially free!**

**Standard Voices** (if you use Raveena):
- $4.00 per 1 million characters
- Cost: **$0.012** (1 cent)

---

## 🎬 Complete Workflow

### Step-by-Step (30 minutes total)

1. **Generate Voiceover with Polly** (10 min)
   - Open Polly console
   - Select Aditi voice
   - Paste script with SSML
   - Download MP3

2. **Record Screen** (15 min)
   - Open OBS Studio / Loom
   - Follow `3_MINUTE_DEMO_SCRIPT.md` actions
   - Save as `demo-screen-recording.mp4`

3. **Combine Video + Audio** (5 min)
   - Use Kapwing.com or DaVinci Resolve
   - Upload screen recording
   - Upload Polly voiceover
   - Sync and export

---

## 🔧 Troubleshooting

### Issue: Voice sounds robotic
**Solution**: Use Neural engine instead of Standard

### Issue: Too fast/slow
**Solution**: Adjust SSML `rate` attribute:
```xml
<prosody rate="slow">text</prosody>    <!-- Slower -->
<prosody rate="medium">text</prosody>  <!-- Normal -->
<prosody rate="fast">text</prosody>    <!-- Faster -->
```

### Issue: No pauses between sentences
**Solution**: Add SSML breaks:
```xml
<break time="500ms"/>  <!-- Half second pause -->
<break time="1s"/>     <!-- One second pause -->
```

### Issue: Wrong pronunciation
**Solution**: Use phoneme tags:
```xml
<phoneme alphabet="ipa" ph="əˈroʊɡjə">Arogya</phoneme>
```

---

## 📋 Quick Checklist

### Before Generating
- [ ] AWS account logged in
- [ ] Region set to us-east-1
- [ ] Script ready (with SSML)
- [ ] Voice selected (Aditi recommended)

### After Generating
- [ ] Audio downloaded
- [ ] Duration verified (~3 minutes)
- [ ] Quality checked (clear audio)
- [ ] File saved as `demo-voiceover-polly.mp3`

### Combining with Video
- [ ] Screen recording ready
- [ ] Voiceover ready
- [ ] Video editor open (Kapwing/DaVinci)
- [ ] Audio synced with video
- [ ] Final video exported

---

## 🎯 Recommended Settings

### For Best Quality:

```
Engine: Neural
Language: English, Indian (en-IN)
Voice: Aditi
Output Format: MP3
Sample Rate: 24000 Hz
Text Type: SSML (with breaks)
```

### SSML Template:

```xml
<speak>
    <prosody rate="medium" pitch="medium">
        Your script here with <break time="500ms"/> pauses
    </prosody>
</speak>
```

---

## 🚀 Quick Start Command

If you want to use CLI for fastest generation:

```bash
# Create script file
cat > demo-script.txt << 'EOF'
[Paste your script here]
EOF

# Generate audio
aws polly synthesize-speech \
  --engine neural \
  --language-code en-IN \
  --voice-id Aditi \
  --text-type text \
  --text file://demo-script.txt \
  --output-format mp3 \
  demo-voiceover-polly.mp3

# Verify
echo "Audio generated: demo-voiceover-polly.mp3"
ls -lh demo-voiceover-polly.mp3
```

---

## 💡 Pro Tips

1. **Preview First**: Use "Listen" button in console before downloading
2. **Use SSML**: Adds natural pauses and better pacing
3. **Adjust Rate**: If too fast, use `rate="slow"` or `rate="95%"`
4. **Add Emphasis**: Use `<emphasis>` tags for important words
5. **Test Duration**: Aim for 2:45-3:00 minutes

---

## 📊 Comparison: Polly vs Other Options

| Option | Cost | Quality | Time | Indian Accent |
|--------|------|---------|------|---------------|
| **AWS Polly** | $0.05 | Excellent | 10 min | ✅ Yes (Aditi) |
| ElevenLabs | Free tier | Excellent | 5 min | ✅ Yes |
| Your voice | Free | Variable | 30 min | ✅ Yes |
| Murf.ai | $10 | Excellent | 10 min | ✅ Yes |

**Recommendation**: Use AWS Polly since you're already using AWS services!

---

## ✅ Final Checklist

- [ ] AWS Polly console opened
- [ ] Aditi voice selected
- [ ] Script pasted (with SSML)
- [ ] Audio generated and downloaded
- [ ] Duration verified (~3 minutes)
- [ ] Quality checked
- [ ] Ready to combine with screen recording

---

## 🎬 Next Steps

After generating voiceover:

1. ✅ Record screen following `3_MINUTE_DEMO_SCRIPT.md`
2. ✅ Combine video + Polly audio
3. ✅ Upload to YouTube
4. ✅ Add to submission

**Total time**: 30 minutes

---

**Created**: March 8, 2026
**Service**: Amazon Polly (AWS)
**Voice**: Aditi (Indian English, Female, Neural)
**Cost**: ~$0.05 (essentially free)
**Quality**: Excellent
**Time**: 10 minutes to generate
