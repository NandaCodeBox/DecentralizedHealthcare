/**
 * Hook for Static Translations
 * Uses pre-translated static text without API calls
 */

import { useState, useEffect } from 'react';
import { translationService, SupportedLanguage } from '@/services/translationService';
import { getTranslation } from '@/locales/translations';

export function useStaticTranslation() {
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(
    translationService.getCurrentLanguage()
  );

  useEffect(() => {
    const handleLanguageChange = (event: CustomEvent) => {
      setCurrentLanguage(event.detail.language);
    };

    window.addEventListener('languageChange', handleLanguageChange as EventListener);

    return () => {
      window.removeEventListener('languageChange', handleLanguageChange as EventListener);
    };
  }, []);

  /**
   * Get static translation for a key
   */
  const t = (key: string): string => {
    return getTranslation(key, currentLanguage);
  };

  return {
    t,
    currentLanguage,
    isEnglish: currentLanguage === 'en',
  };
}
