/**
 * TranslatedText Component
 * Automatically translates text using static translations or AWS Translate API
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/hooks/useTranslation';
import { getTranslation } from '@/locales/translations';

interface TranslatedTextProps {
  text: string;
  translationKey?: string; // Optional key for static translations
  className?: string;
  as?: 'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

const TranslatedText: React.FC<TranslatedTextProps> = ({
  text,
  translationKey,
  className = '',
  as: Component = 'span',
}) => {
  const { currentLanguage, isEnglish } = useTranslation();
  const [translatedText, setTranslatedText] = useState(text);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    translateText();
  }, [text, translationKey, currentLanguage]);

  const translateText = async () => {
    // If English, use original text
    if (isEnglish) {
      setTranslatedText(text);
      return;
    }

    // Try static translation first if key is provided
    if (translationKey) {
      const staticTranslation = getTranslation(translationKey, currentLanguage);
      if (staticTranslation !== translationKey) {
        setTranslatedText(staticTranslation);
        return;
      }
    }

    // Fall back to API translation for dynamic content
    setIsLoading(true);
    try {
      const { translationService } = await import('@/services/translationService');
      const translated = await translationService.translate(text, currentLanguage);
      setTranslatedText(translated);
    } catch (error) {
      console.error('Translation error:', error);
      setTranslatedText(text); // Fallback to original
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Component className={className}>
      {isLoading ? text : translatedText}
    </Component>
  );
};

export default TranslatedText;
