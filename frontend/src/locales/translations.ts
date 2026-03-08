/**
 * Static Translations for Common UI Elements
 * Pre-translated to avoid API calls for frequently used text
 */

import { SupportedLanguage } from '@/services/translationService';

export interface Translations {
  [key: string]: {
    [lang in SupportedLanguage]: string;
  };
}

export const translations: Translations = {
  // Navigation
  'home': {
    en: 'Home',
    hi: 'होम',
    ta: 'முகப்பு',
    te: 'హోమ్',
  },
  'back': {
    en: 'Back',
    hi: 'वापस',
    ta: 'பின்',
    te: 'వెనుకకు',
  },
  
  // Authentication
  'sign_in': {
    en: 'Sign In',
    hi: 'साइन इन करें',
    ta: 'உள்நுழைக',
    te: 'సైన్ ఇన్',
  },
  'sign_out': {
    en: 'Sign Out',
    hi: 'साइन आउट',
    ta: 'வெளியேறு',
    te: 'సైన్ అవుట్',
  },
  'email': {
    en: 'Email',
    hi: 'ईमेल',
    ta: 'மின்னஞ்சல்',
    te: 'ఇమెయిల్',
  },
  'password': {
    en: 'Password',
    hi: 'पासवर्ड',
    ta: 'கடவுச்சொல்',
    te: 'పాస్‌వర్డ్',
  },
  'welcome_back': {
    en: 'Welcome Back',
    hi: 'वापसी पर स्वागत है',
    ta: 'மீண்டும் வரவேற்கிறோம்',
    te: 'తిరిగి స్వాగతం',
  },
  
  // Symptom Intake
  'tell_us_symptoms': {
    en: 'Tell Us Your Symptoms',
    hi: 'हमें अपने लक्षण बताएं',
    ta: 'உங்கள் அறிகுறிகளைச் சொல்லுங்கள்',
    te: 'మీ లక్షణాలను చెప్పండి',
  },
  'common_symptoms': {
    en: 'Common Symptoms',
    hi: 'सामान्य लक्षण',
    ta: 'பொதுவான அறிகுறிகள்',
    te: 'సాధారణ లక్షణాలు',
  },
  'fever': {
    en: 'Fever',
    hi: 'बुखार',
    ta: 'காய்ச்சல்',
    te: 'జ్వరం',
  },
  'headache': {
    en: 'Headache',
    hi: 'सिरदर्द',
    ta: 'தலைவலி',
    te: 'తలనొప్పి',
  },
  'cough': {
    en: 'Cough',
    hi: 'खांसी',
    ta: 'இருமல்',
    te: 'దగ్గు',
  },
  'fatigue': {
    en: 'Fatigue',
    hi: 'थकान',
    ta: 'சோர்வு',
    te: 'అలసట',
  },
  'nausea': {
    en: 'Nausea',
    hi: 'मतली',
    ta: 'குமட்டல்',
    te: 'వాంతులు',
  },
  'chest_pain': {
    en: 'Chest Pain',
    hi: 'सीने में दर्द',
    ta: 'மார்பு வலி',
    te: 'ఛాతీ నొప్పి',
  },
  'shortness_of_breath': {
    en: 'Shortness of Breath',
    hi: 'सांस लेने में तकलीफ',
    ta: 'மூச்சுத் திணறல்',
    te: 'శ్వాస ఆడకపోవడం',
  },
  'dizziness': {
    en: 'Dizziness',
    hi: 'चक्कर आना',
    ta: 'தலைச்சுற்றல்',
    te: 'తలతిరగడం',
  },
  'abdominal_pain': {
    en: 'Abdominal Pain',
    hi: 'पेट दर्द',
    ta: 'வயிற்று வலி',
    te: 'కడుపు నొప్పి',
  },
  'submit': {
    en: 'Submit',
    hi: 'जमा करें',
    ta: 'சமர்ப்பிக்கவும்',
    te: 'సమర్పించండి',
  },
  'get_ai_triage': {
    en: 'Get AI Triage Assessment',
    hi: 'एआई ट्राइएज मूल्यांकन प्राप्त करें',
    ta: 'AI மதிப்பீட்டைப் பெறுங்கள்',
    te: 'AI అంచనా పొందండి',
  },
  
  // Provider Search
  'find_provider': {
    en: 'Find Provider',
    hi: 'प्रदाता खोजें',
    ta: 'வழங்குநரைக் கண்டறியவும்',
    te: 'ప్రొవైడర్‌ను కనుగొనండి',
  },
  'ai_search': {
    en: 'AI Search',
    hi: 'एआई खोज',
    ta: 'AI தேடல்',
    te: 'AI శోధన',
  },
  'search': {
    en: 'Search',
    hi: 'खोजें',
    ta: 'தேடு',
    te: 'శోధించండి',
  },
  
  // Supervisor Dashboard
  'supervisor_dashboard': {
    en: 'Supervisor Dashboard',
    hi: 'पर्यवेक्षक डैशबोर्ड',
    ta: 'மேற்பார்வையாளர் டாஷ்போர்டு',
    te: 'సూపర్‌వైజర్ డాష్‌బోర్డ్',
  },
  'pending': {
    en: 'Pending',
    hi: 'लंबित',
    ta: 'நிலுவையில்',
    te: 'పెండింగ్',
  },
  'emergency': {
    en: 'Emergency',
    hi: 'आपातकाल',
    ta: 'அவசரம்',
    te: 'అత్యవసరం',
  },
  'low_confidence': {
    en: 'Low Confidence',
    hi: 'कम विश्वास',
    ta: 'குறைந்த நம்பிக்கை',
    te: 'తక్కువ విశ్వాసం',
  },
  'approve': {
    en: 'Approve',
    hi: 'स्वीकृत करें',
    ta: 'அங்கீகரிக்கவும்',
    te: 'ఆమోదించండి',
  },
  'override': {
    en: 'Override',
    hi: 'ओवरराइड',
    ta: 'மேலெழுதவும்',
    te: 'ఓవర్‌రైడ్',
  },
  'escalate': {
    en: 'Escalate',
    hi: 'बढ़ाएं',
    ta: 'அதிகரிக்கவும்',
    te: 'పెంచండి',
  },
  'reject': {
    en: 'Reject',
    hi: 'अस्वीकार करें',
    ta: 'நிராகரிக்கவும்',
    te: 'తిరస్కరించండి',
  },
  
  // Common Actions
  'loading': {
    en: 'Loading...',
    hi: 'लोड हो रहा है...',
    ta: 'ஏற்றுகிறது...',
    te: 'లోడ్ అవుతోంది...',
  },
  'save': {
    en: 'Save',
    hi: 'सहेजें',
    ta: 'சேமிக்கவும்',
    te: 'సేవ్ చేయండి',
  },
  'cancel': {
    en: 'Cancel',
    hi: 'रद्द करें',
    ta: 'ரத்துசெய்',
    te: 'రద్దు చేయండి',
  },
  'continue': {
    en: 'Continue',
    hi: 'जारी रखें',
    ta: 'தொடரவும்',
    te: 'కొనసాగించండి',
  },
  'close': {
    en: 'Close',
    hi: 'बंद करें',
    ta: 'மூடு',
    te: 'మూసివేయండి',
  },
  
  // Status Messages
  'success': {
    en: 'Success',
    hi: 'सफलता',
    ta: 'வெற்றி',
    te: 'విజయం',
  },
  'error': {
    en: 'Error',
    hi: 'त्रुटि',
    ta: 'பிழை',
    te: 'లోపం',
  },
  'warning': {
    en: 'Warning',
    hi: 'चेतावनी',
    ta: 'எச்சரிக்கை',
    te: 'హెచ్చరిక',
  },
};

/**
 * Get translated text for a key
 */
export function getTranslation(key: string, language: SupportedLanguage): string {
  return translations[key]?.[language] || translations[key]?.['en'] || key;
}

/**
 * Get all translations for a language
 */
export function getAllTranslations(language: SupportedLanguage): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const [key, trans] of Object.entries(translations)) {
    result[key] = trans[language] || trans['en'];
  }
  
  return result;
}
