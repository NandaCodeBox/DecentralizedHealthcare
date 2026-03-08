# Multilingual Input Testing Guide

## Quick Test Instructions

### Prerequisites
1. Enable Hindi/Tamil/Telugu keyboard on your device
2. Open the application: http://arogya-ai-healthcare-20260308102925.s3-website-us-east-1.amazonaws.com
3. Open browser console (F12) to see translation logs

## Test 1: Hindi Symptom Input (5 minutes)

### Steps:
1. **Switch to Hindi**
   - Click language selector (top right)
   - Select "हिंदी"
   - Page reloads with Hindi UI

2. **Navigate to Symptom Intake**
   - Click "अपने लक्षण बताएं" button
   - You should see symptom intake page in Hindi

3. **Type Symptoms in Hindi**
   - Switch keyboard to Hindi (Windows + Space on Windows)
   - Type: `मुझे बुखार और सिरदर्द है`
   - Or click common symptoms in Hindi

4. **Fill Form**
   - Select severity: "मध्यम" (Moderate)
   - Select duration: "1-3 दिन"
   - Add additional info (optional): `मुझे कमजोरी भी महसूस हो रही है`

5. **Submit**
   - Click "AI ट्राइएज मूल्यांकन प्राप्त करें"
   - Watch for loading indicator

6. **Verify Translation**
   - Open browser console (F12)
   - Type: `JSON.parse(sessionStorage.getItem('triageData'))`
   - You should see:
   ```javascript
   {
     symptoms: ["I have fever and headache"],  // English!
     severity: "moderate",
     duration: "1_3_days",
     additionalInfo: "I also feel weak",       // English!
     originalLanguage: "hi"
   }
   ```

### Expected Result:
✅ Hindi input is translated to English
✅ English text is stored for backend
✅ Original language is preserved

## Test 2: Tamil Provider Search (3 minutes)

### Steps:
1. **Switch to Tamil**
   - Click language selector
   - Select "தமிழ்"
   - Page reloads with Tamil UI

2. **Navigate to Provider Search**
   - Click "வழங்குநரைக் கண்டறியவும்" button

3. **Type Search Query in Tamil**
   - Switch keyboard to Tamil
   - Type: `இதய நோய் நிபுணர்` (Cardiologist)
   - Or: `குழந்தை மருத்துவர்` (Pediatrician)

4. **Click AI Search**
   - Click "AI தேடல்" button
   - Watch for AI processing

5. **Verify Translation**
   - Open browser console
   - Type: `JSON.parse(sessionStorage.getItem('providerSearchQuery'))`
   - You should see:
   ```javascript
   {
     originalQuery: "இதய நோய் நிபுணர்",
     englishQuery: "Cardiologist",
     language: "ta"
   }
   ```

### Expected Result:
✅ Tamil input is translated to English
✅ AI processes English query
✅ Relevant suggestions appear

## Test 3: Telugu Mixed Input (3 minutes)

### Steps:
1. **Switch to Telugu**
   - Select "తెలుగు"

2. **Go to Symptom Intake**
   - Click "మీ లక్షణాలను చెప్పండి"

3. **Type in Telugu**
   - Type: `నాకు జ్వరం మరియు తలనొప్పి ఉంది`
   - Add more symptoms

4. **Submit and Verify**
   - Submit form
   - Check console for English translation

### Expected Result:
✅ Telugu input translated correctly
✅ Backend receives English text

## Test 4: Language Switching (2 minutes)

### Steps:
1. Start in English
2. Type: "I have fever"
3. Switch to Hindi
4. Type: "मुझे सिरदर्द है"
5. Switch to Tamil
6. Type: "எனக்கு காய்ச்சல் உள்ளது"

### Expected Result:
✅ Each input is translated based on current language
✅ No errors when switching languages

## Test 5: Error Handling (2 minutes)

### Steps:
1. **Disconnect Internet**
   - Turn off WiFi or disconnect network

2. **Try to Submit**
   - Type symptoms
   - Click submit

3. **Verify Fallback**
   - Should continue with original text
   - No crash or error screen

### Expected Result:
✅ Graceful fallback to original text
✅ User can still proceed

## Common Test Phrases

### Hindi (हिंदी)
```
मुझे बुखार है - I have fever
सिरदर्द है - Headache
खांसी आ रही है - I have cough
थकान महसूस हो रही है - Feeling tired
पेट में दर्द है - Stomach pain
```

### Tamil (தமிழ்)
```
எனக்கு காய்ச்சல் உள்ளது - I have fever
தலைவலி - Headache
இருமல் - Cough
சோர்வு - Fatigue
வயிற்று வலி - Stomach pain
```

### Telugu (తెలుగు)
```
నాకు జ్వరం ఉంది - I have fever
తలనొప్పి - Headache
దగ్గు - Cough
అలసట - Fatigue
కడుపు నొప్పి - Stomach pain
```

## Keyboard Shortcuts

### Windows
- **Switch Keyboard**: Windows + Space
- **Language Settings**: Settings → Time & Language → Language

### Mac
- **Switch Keyboard**: Control + Space
- **Language Settings**: System Preferences → Keyboard → Input Sources

### Android
- **Switch Keyboard**: Tap globe icon on keyboard
- **Add Language**: Settings → System → Languages & Input

### iOS
- **Switch Keyboard**: Tap globe icon on keyboard
- **Add Language**: Settings → General → Keyboard → Keyboards

## Browser Console Commands

### Check Current Language
```javascript
localStorage.getItem('preferredLanguage')
// Returns: "hi", "ta", "te", or null (English)
```

### Check Translated Symptoms
```javascript
JSON.parse(sessionStorage.getItem('triageData'))
// Shows translated symptoms in English
```

### Check Search Query
```javascript
JSON.parse(sessionStorage.getItem('providerSearchQuery'))
// Shows original and translated query
```

### Clear Storage
```javascript
localStorage.clear()
sessionStorage.clear()
// Resets to English
```

## Expected API Calls

When you submit, you should see these API calls in Network tab:

### Translation API
```
POST /v1/translate
Request: {
  "text": "मुझे बुखार है",
  "sourceLanguage": "hi",
  "targetLanguage": "en"
}
Response: {
  "translatedText": "I have fever"
}
```

## Troubleshooting

### Issue: Text not translating
**Solution**: 
- Check browser console for errors
- Verify internet connection
- Check if AWS Translate API is responding

### Issue: Wrong language detected
**Solution**:
- Manually select language from dropdown
- Clear browser cache
- Reload page

### Issue: Keyboard not switching
**Solution**:
- Install language pack on your device
- Use Windows + Space (Windows) or Control + Space (Mac)
- Try on-screen keyboard

### Issue: Translation taking too long
**Solution**:
- Check network speed
- Translation service caches results
- First translation may be slower

## Success Criteria

✅ User can type in Hindi/Tamil/Telugu
✅ Input is translated to English automatically
✅ Backend receives English text
✅ Original language is preserved
✅ No errors or crashes
✅ Graceful fallback if translation fails

## Demo Script (For Presentation)

**1. Introduction (30 seconds)**
"Our application supports full multilingual input. Users can type in their native language, and the system automatically translates it for AI processing."

**2. Demo Hindi Input (1 minute)**
- Switch to Hindi
- Show UI in Hindi
- Type symptoms in Hindi
- Submit and show translation in console
- "Notice how the Hindi text is automatically translated to English for the AI"

**3. Demo Tamil Search (1 minute)**
- Switch to Tamil
- Type provider search in Tamil
- Show AI processing English query
- "The AI receives English text and provides accurate results"

**4. Show Error Handling (30 seconds)**
- Mention graceful fallback
- Show that original text is preserved
- "If translation fails, the system continues with original text"

**5. Conclusion (30 seconds)**
"This enables users across India to use the application in their preferred language while ensuring the AI backend receives optimal English input for accurate processing."

## Total Testing Time: ~15 minutes

This covers all major multilingual input scenarios and verifies the implementation is working correctly.
