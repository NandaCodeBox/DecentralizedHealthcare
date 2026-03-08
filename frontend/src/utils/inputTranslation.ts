/**
 * Input Translation Utility
 * Translates user input from their selected language to English for backend processing
 */

import { translationService, SupportedLanguage } from '@/services/translationService';

/**
 * Translate user input to English if needed
 * @param text - User input text
 * @param currentLanguage - Current UI language
 * @returns Translated text (English) or original if already English
 */
export async function translateInputToEnglish(text: string, currentLanguage?: SupportedLanguage): Promise<string> {
  // If no text or already English, return as-is
  if (!text || !currentLanguage || currentLanguage === 'en') {
    return text;
  }

  try {
    // Translate from current language to English
    const translatedText = await translationService.translate(text, 'en', currentLanguage);
    return translatedText;
  } catch (error) {
    console.error('Failed to translate input:', error);
    // Return original text if translation fails
    return text;
  }
}

/**
 * Translate backend response from English to user's language
 * @param text - Backend response text (in English)
 * @param targetLanguage - User's selected language
 * @returns Translated text or original if English
 */
export async function translateOutputToUserLanguage(text: string, targetLanguage?: SupportedLanguage): Promise<string> {
  // If no text or target is English, return as-is
  if (!text || !targetLanguage || targetLanguage === 'en') {
    return text;
  }

  try {
    // Translate from English to user's language
    const translatedText = await translationService.translate(text, targetLanguage);
    return translatedText;
  } catch (error) {
    console.error('Failed to translate output:', error);
    // Return original text if translation fails
    return text;
  }
}

/**
 * Check if text contains non-English characters
 * Useful for detecting if user is typing in their native language
 */
export function containsNonEnglish(text: string): boolean {
  // Check for Hindi (Devanagari), Tamil, Telugu scripts
  const hindiRegex = /[\u0900-\u097F]/;
  const tamilRegex = /[\u0B80-\u0BFF]/;
  const teluguRegex = /[\u0C00-\u0C7F]/;
  
  return hindiRegex.test(text) || tamilRegex.test(text) || teluguRegex.test(text);
}

/**
 * Detect language of input text
 * Returns language code or 'en' if cannot detect
 */
export function detectInputLanguage(text: string): string {
  if (!text) return 'en';
  
  // Check for specific scripts
  if (/[\u0900-\u097F]/.test(text)) return 'hi'; // Hindi
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'; // Tamil
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te'; // Telugu
  
  return 'en'; // Default to English
}
