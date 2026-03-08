/**
 * AWS Translate Integration Service
 * Provides multi-language support for the application
 * Supports: English, Hindi, Tamil, Telugu
 */

export type SupportedLanguage = 'en' | 'hi' | 'ta' | 'te';

export interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', flag: '🇮🇳' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', flag: '🇮🇳' },
];

class TranslationService {
  private currentLanguage: SupportedLanguage = 'en';
  private translations: Map<string, Map<SupportedLanguage, string>> = new Map();
  private apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
    this.loadLanguageFromStorage();
  }

  /**
   * Load saved language preference from localStorage
   */
  private loadLanguageFromStorage(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const saved = localStorage.getItem('preferredLanguage');
      if (saved && this.isValidLanguage(saved)) {
        this.currentLanguage = saved as SupportedLanguage;
      }
    } catch (error) {
      console.error('Failed to load language preference:', error);
    }
  }

  /**
   * Save language preference to localStorage
   */
  private saveLanguageToStorage(language: SupportedLanguage): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('preferredLanguage', language);
    } catch (error) {
      console.error('Failed to save language preference:', error);
    }
  }

  /**
   * Check if language code is valid
   */
  private isValidLanguage(code: string): boolean {
    return SUPPORTED_LANGUAGES.some(lang => lang.code === code);
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  /**
   * Set current language
   */
  setLanguage(language: SupportedLanguage): void {
    if (!this.isValidLanguage(language)) {
      console.error(`Invalid language code: ${language}`);
      return;
    }
    
    this.currentLanguage = language;
    this.saveLanguageToStorage(language);
    
    // Trigger language change event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('languageChange', { detail: { language } }));
    }
  }

  /**
   * Translate text using AWS Translate API
   */
  async translate(text: string, targetLanguage?: SupportedLanguage, sourceLanguage: SupportedLanguage = 'en'): Promise<string> {
    const target = targetLanguage || this.currentLanguage;
    
    // If target is same as source, return as-is
    if (target === sourceLanguage || !text || text.trim() === '') {
      return text;
    }

    // Check cache first
    const cacheKey = `${sourceLanguage}:${text}:${target}`;
    const cached = this.translations.get(cacheKey)?.get(target);
    if (cached) {
      return cached;
    }

    try {
      // Call backend API for translation
      const response = await fetch(`${this.apiBaseUrl}/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          sourceLanguage,
          targetLanguage: target,
        }),
      });

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      const data = await response.json();
      const translatedText = data.translatedText || text;

      // Cache the translation
      if (!this.translations.has(cacheKey)) {
        this.translations.set(cacheKey, new Map());
      }
      this.translations.get(cacheKey)!.set(target, translatedText);

      return translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      // Return original text on error
      return text;
    }
  }

  /**
   * Translate multiple texts in batch
   */
  async translateBatch(texts: string[], targetLanguage?: SupportedLanguage): Promise<string[]> {
    const target = targetLanguage || this.currentLanguage;
    
    if (target === 'en') {
      return texts;
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/translate/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          texts,
          sourceLanguage: 'en',
          targetLanguage: target,
        }),
      });

      if (!response.ok) {
        throw new Error('Batch translation failed');
      }

      const data = await response.json();
      return data.translatedTexts || texts;
    } catch (error) {
      console.error('Batch translation error:', error);
      return texts;
    }
  }

  /**
   * Get language name
   */
  getLanguageName(code: SupportedLanguage): string {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
    return lang?.name || 'English';
  }

  /**
   * Get native language name
   */
  getNativeLanguageName(code: SupportedLanguage): string {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
    return lang?.nativeName || 'English';
  }

  /**
   * Clear translation cache
   */
  clearCache(): void {
    this.translations.clear();
  }
}

export const translationService = new TranslationService();
export default translationService;
