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
  'get_right_care': {
    en: 'Get the Right Care, Right Now',
    hi: 'अभी सही देखभाल प्राप्त करें',
    ta: 'இப்போதே சரியான பராமரிப்பைப் பெறுங்கள்',
    te: 'ఇప్పుడే సరైన సంరక్షణ పొందండి',
  },
  'tell_us_your_symptoms': {
    en: 'Tell Us Your Symptoms',
    hi: 'हमें अपने लक्षण बताएं',
    ta: 'உங்கள் அறிகுறிகளைச் சொல்லுங்கள்',
    te: 'మీ లక్షణాలను చెప్పండి',
  },
  'ai_provider_search_title': {
    en: 'AI Provider Search',
    hi: 'एआई प्रदाता खोज',
    ta: 'AI வழங்குநர் தேடல்',
    te: 'AI ప్రొవైడర్ శోధన',
  },
  'semantic_search_powered': {
    en: 'Semantic search powered by AI',
    hi: 'एआई द्वारा संचालित सिमेंटिक खोज',
    ta: 'AI மூலம் இயக்கப்படும் சொற்பொருள் தேடல்',
    te: 'AI ద్వారా శక్తివంతం చేయబడిన సెమాంటిక్ శోధన',
  },
  'find_your_care': {
    en: 'Find Your Care',
    hi: 'अपनी देखभाल खोजें',
    ta: 'உங்கள் பராமரிப்பைக் கண்டறியவும்',
    te: 'మీ సంరక్షణను కనుగొనండి',
  },
  'see_all': {
    en: 'See All',
    hi: 'सभी देखें',
    ta: 'அனைத்தையும் காண்க',
    te: 'అన్నీ చూడండి',
  },
  'neurology': {
    en: 'Neurology',
    hi: 'न्यूरोलॉजी',
    ta: 'நரம்பியல்',
    te: 'న్యూరాలజీ',
  },
  'cardiology': {
    en: 'Cardiology',
    hi: 'कार्डियोलॉजी',
    ta: 'இருதயவியல்',
    te: 'కార్డియాలజీ',
  },
  'orthopedics': {
    en: 'Orthopedics',
    hi: 'आर्थोपेडिक्स',
    ta: 'எலும்பியல்',
    te: 'ఆర్థోపెడిక్స్',
  },
  'pathology': {
    en: 'Pathology',
    hi: 'पैथोलॉजी',
    ta: 'நோயியல்',
    te: 'పాథాలజీ',
  },
  'dashboards_tools': {
    en: 'Dashboards & Tools',
    hi: 'डैशबोर्ड और उपकरण',
    ta: 'டாஷ்போர்டுகள் & கருவிகள்',
    te: 'డాష్‌బోర్డ్‌లు & సాధనాలు',
  },
  'critical_operations': {
    en: 'Critical Operations',
    hi: 'महत्वपूर्ण संचालन',
    ta: 'முக்கியமான செயல்பாடுகள்',
    te: 'క్లిష్టమైన కార్యకలాపాలు',
  },
  'care_status': {
    en: 'Care Status',
    hi: 'देखभाल स्थिति',
    ta: 'பராமரிப்பு நிலை',
    te: 'సంరక్షణ స్థితి',
  },
  'provider': {
    en: 'Provider',
    hi: 'प्रदाता',
    ta: 'வழங்குநர்',
    te: 'ప్రొవైడర్',
  },
  'facilities': {
    en: 'Facilities',
    hi: 'सुविधाएं',
    ta: 'வசதிகள்',
    te: 'సౌకర్యాలు',
  },
  'alerts': {
    en: 'Alerts',
    hi: 'अलर्ट',
    ta: 'எச்சரிக்கைகள்',
    te: 'హెచ్చరికలు',
  },
  'admin': {
    en: 'Admin',
    hi: 'व्यवस्थापक',
    ta: 'நிர்வாகி',
    te: 'అడ్మిన్',
  },
  'analytics': {
    en: 'Analytics',
    hi: 'विश्लेषण',
    ta: 'பகுப்பாய்வு',
    te: 'విశ్లేషణలు',
  },
  'appointments': {
    en: 'Appointments',
    hi: 'नियुक्तियां',
    ta: 'சந்திப்புகள்',
    te: 'అపాయింట్‌మెంట్‌లు',
  },
  'history': {
    en: 'History',
    hi: 'इतिहास',
    ta: 'வரலாறு',
    te: 'చరిత్ర',
  },
  'ai_triage': {
    en: 'AI Triage',
    hi: 'एआई ट्राइएज',
    ta: 'AI வகைப்படுத்தல்',
    te: 'AI ట్రయాజ్',
  },
  'predict': {
    en: 'Predict',
    hi: 'भविष्यवाणी',
    ta: 'கணிப்பு',
    te: 'అంచనా',
  },
  'always_available': {
    en: 'Always Available',
    hi: 'हमेशा उपलब्ध',
    ta: 'எப்போதும் கிடைக்கும்',
    te: 'ఎల్లప్పుడూ అందుబాటులో',
  },
  'verified': {
    en: 'Verified',
    hi: 'सत्यापित',
    ta: 'சரிபார்க்கப்பட்டது',
    te: 'ధృవీకరించబడింది',
  },
  'fast_response': {
    en: 'Fast Response',
    hi: 'तेज़ प्रतिक्रिया',
    ta: 'விரைவான பதில்',
    te: 'వేగవంతమైన ప్రతిస్పందన',
  },
  'languages': {
    en: 'Languages',
    hi: 'भाषाएं',
    ta: 'மொழிகள்',
    te: 'భాషలు',
  },
  'medical_emergency': {
    en: 'Medical Emergency?',
    hi: 'चिकित्सा आपातकाल?',
    ta: 'மருத்துவ அவசரம்?',
    te: 'వైద్య అత్యవసరం?',
  },
  'life_threatening': {
    en: 'For life-threatening situations, call emergency services immediately.',
    hi: 'जीवन-घातक स्थितियों के लिए, तुरंत आपातकालीन सेवाओं को कॉल करें।',
    ta: 'உயிருக்கு ஆபத்தான சூழ்நிலைகளுக்கு, உடனடியாக அவசர சேவைகளை அழைக்கவும்.',
    te: 'ప్రాణాపాయ పరిస్థితుల కోసం, వెంటనే అత్యవసర సేవలకు కాల్ చేయండి.',
  },
  'call_now': {
    en: 'Call 108 Now',
    hi: '108 पर कॉल करें',
    ta: '108 ஐ இப்போது அழைக்கவும்',
    te: 'ఇప్పుడు 108కి కాల్ చేయండి',
  },
  'messages': {
    en: 'Messages',
    hi: 'संदेश',
    ta: 'செய்திகள்',
    te: 'సందేశాలు',
  },
  'more': {
    en: 'More',
    hi: 'अधिक',
    ta: 'மேலும்',
    te: 'మరిన్ని',
  },
  'demo_mode': {
    en: 'Demo Mode',
    hi: 'डेमो मोड',
    ta: 'டெமோ பயன்முறை',
    te: 'డెమో మోడ్',
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
