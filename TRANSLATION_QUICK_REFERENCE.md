# Translation Quick Reference Guide

## For Developers: How to Add Translations to Your Pages

### Method 1: Static Translations (Recommended for Common UI Text)

Use this for buttons, labels, navigation, and other frequently used text.

```typescript
import { useStaticTranslation } from '@/hooks/useStaticTranslation';

function MyComponent() {
  const { t } = useStaticTranslation();
  
  return (
    <div>
      <h1>{t('welcome_back')}</h1>
      <button>{t('submit')}</button>
      <p>{t('loading')}</p>
    </div>
  );
}
```

**Available Keys:** See `frontend/src/locales/translations.ts` for all available keys.

### Method 2: Dynamic Translations (For User-Generated Content)

Use this for content that comes from APIs or user input.

```typescript
import { useTranslation } from '@/hooks/useTranslation';
import { useState, useEffect } from 'react';

function MyComponent() {
  const { t, currentLanguage } = useTranslation();
  const [translatedText, setTranslatedText] = useState('');
  
  useEffect(() => {
    async function translate() {
      const result = await t('Dynamic text from API');
      setTranslatedText(result);
    }
    translate();
  }, [currentLanguage]);
  
  return <p>{translatedText}</p>;
}
```

### Method 3: TranslatedText Component

Use this for simple text translation without managing state.

```typescript
import TranslatedText from '@/components/TranslatedText';

function MyComponent() {
  return (
    <div>
      {/* With static translation key */}
      <TranslatedText 
        text="Submit" 
        translationKey="submit" 
        as="button"
        className="btn-primary"
      />
      
      {/* Dynamic translation */}
      <TranslatedText 
        text="User generated content here" 
        as="p"
      />
    </div>
  );
}
```

### Method 4: Add Language Selector to Your Page

```typescript
import LanguageSelector from '@/components/LanguageSelector';

function MyPage() {
  return (
    <div>
      <header>
        <LanguageSelector />
      </header>
      {/* Rest of your page */}
    </div>
  );
}
```

## Adding New Static Translations

Edit `frontend/src/locales/translations.ts`:

```typescript
export const translations: Translations = {
  // ... existing translations
  
  'your_new_key': {
    en: 'Your English Text',
    hi: 'आपका हिंदी पाठ',
    ta: 'உங்கள் தமிழ் உரை',
    te: 'మీ తెలుగు వచనం',
  },
};
```

## Translation Best Practices

### DO ✅
- Use static translations for common UI elements
- Keep translation keys descriptive and lowercase with underscores
- Test translations in all 4 languages
- Provide fallback to English for missing translations
- Cache translations to reduce API calls

### DON'T ❌
- Don't translate technical terms (API, URL, etc.)
- Don't translate proper nouns (names, places)
- Don't translate numbers or dates (format them instead)
- Don't make API calls for every piece of text
- Don't forget to handle loading states

## Common Translation Keys

### Navigation
- `home`, `back`, `search`

### Authentication
- `sign_in`, `sign_out`, `email`, `password`, `welcome_back`

### Actions
- `submit`, `save`, `cancel`, `continue`, `close`
- `approve`, `override`, `escalate`, `reject`

### Status
- `loading`, `success`, `error`, `warning`
- `pending`, `emergency`, `low_confidence`

### Symptoms
- `fever`, `headache`, `cough`, `fatigue`, `nausea`
- `chest_pain`, `shortness_of_breath`, `dizziness`, `abdominal_pain`

### Healthcare
- `tell_us_symptoms`, `common_symptoms`, `get_ai_triage`
- `find_provider`, `ai_search`, `supervisor_dashboard`

## Testing Translations

### Browser Console Testing
```javascript
// Get translation service
const { translationService } = await import('./services/translationService');

// Change language
translationService.setLanguage('hi'); // Hindi
translationService.setLanguage('ta'); // Tamil
translationService.setLanguage('te'); // Telugu
translationService.setLanguage('en'); // English

// Get current language
console.log(translationService.getCurrentLanguage());

// Translate text
const translated = await translationService.translate('Hello', 'hi');
console.log(translated);
```

### API Testing with curl
```bash
# Get auth token first
TOKEN="your-cognito-token"

# Test translation
curl -X POST https://mj3wk76zw4.execute-api.us-east-1.amazonaws.com/v1/translate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "text": "Welcome to Healthcare",
    "sourceLanguage": "en",
    "targetLanguage": "hi"
  }'
```

## Language Codes Reference

| Language | Code | Native Name | Flag |
|----------|------|-------------|------|
| English  | en   | English     | 🇬🇧   |
| Hindi    | hi   | हिंदी       | 🇮🇳   |
| Tamil    | ta   | தமிழ்       | 🇮🇳   |
| Telugu   | te   | తెలుగు      | 🇮🇳   |

## Troubleshooting

### Translation not showing?
1. Check if language selector is visible
2. Verify translation key exists in `translations.ts`
3. Check browser console for errors
4. Ensure API endpoint is accessible

### Slow translations?
1. Use static translations for common text
2. Implement caching in your component
3. Use batch translation for multiple texts
4. Pre-translate during build time

### Language not persisting?
1. Check localStorage is enabled
2. Verify language selector saves preference
3. Clear browser cache and try again

## Example: Complete Page with Translations

```typescript
import React, { useState, useEffect } from 'react';
import { useStaticTranslation } from '@/hooks/useStaticTranslation';
import { useTranslation } from '@/hooks/useTranslation';
import LanguageSelector from '@/components/LanguageSelector';

function MyPage() {
  const { t: staticT } = useStaticTranslation();
  const { t: dynamicT, currentLanguage } = useTranslation();
  const [apiData, setApiData] = useState('');
  const [translatedData, setTranslatedData] = useState('');

  useEffect(() => {
    // Fetch data from API
    fetchData();
  }, []);

  useEffect(() => {
    // Translate API data when language changes
    if (apiData) {
      translateData();
    }
  }, [currentLanguage, apiData]);

  async function fetchData() {
    const response = await fetch('/api/data');
    const data = await response.json();
    setApiData(data.message);
  }

  async function translateData() {
    const translated = await dynamicT(apiData);
    setTranslatedData(translated);
  }

  return (
    <div>
      <header>
        <h1>{staticT('welcome_back')}</h1>
        <LanguageSelector />
      </header>

      <main>
        <button>{staticT('submit')}</button>
        <p>{staticT('loading')}</p>
        <div>{translatedData}</div>
      </main>
    </div>
  );
}

export default MyPage;
```

## Support

For issues or questions about translations:
1. Check this guide first
2. Review `MULTI_LANGUAGE_IMPLEMENTATION.md` for architecture details
3. Check CloudWatch logs for backend errors
4. Verify AWS Translate service status
