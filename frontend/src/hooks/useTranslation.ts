/**
 * React Hook for Translation
 * Provides easy access to translation functionality in components
 */

import { useState, useEffect, useCallback } from 'react';
import { translationService, SupportedLanguage } from '@/services/translationService';

export function useTranslation() {
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(
    translationService.getCurrentLanguage()
  );
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    const handleLanguageChange = (event: CustomEvent) => {
      setCurrentLanguage(event.detail.language);
    };

    window.addEventListener('languageChange', handleLanguageChange as EventListener);

    return () => {
      window.removeEventListener('languageChange', handleLanguageChange as EventListener);
    };
  }, []);

  const t = useCallback(
    async (text: string): Promise<string> => {
      if (currentLanguage === 'en' || !text) {
        return text;
      }

      setIsTranslating(true);
      try {
        const translated = await translationService.translate(text, currentLanguage);
        return translated;
      } catch (error) {
        console.error('Translation error:', error);
        return text;
      } finally {
        setIsTranslating(false);
      }
    },
    [currentLanguage]
  );

  const changeLanguage = useCallback((language: SupportedLanguage) => {
    translationService.setLanguage(language);
    setCurrentLanguage(language);
  }, []);

  return {
    t,
    currentLanguage,
    changeLanguage,
    isTranslating,
    isEnglish: currentLanguage === 'en',
  };
}
