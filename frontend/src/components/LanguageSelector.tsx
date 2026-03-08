/**
 * Language Selector Component
 * Allows users to switch between supported languages
 */

import React, { useState } from 'react';
import { translationService, SUPPORTED_LANGUAGES, SupportedLanguage } from '@/services/translationService';
import { GlobeAltIcon, CheckIcon } from '@heroicons/react/24/outline';

interface LanguageSelectorProps {
  className?: string;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(
    translationService.getCurrentLanguage()
  );

  const handleLanguageChange = (language: SupportedLanguage) => {
    translationService.setLanguage(language);
    setCurrentLanguage(language);
    setIsOpen(false);
    
    // Reload page to apply translations
    window.location.reload();
  };

  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage);

  return (
    <div className={`relative ${className}`}>
      {/* Language Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Select Language"
      >
        <GlobeAltIcon className="h-5 w-5 text-gray-600" />
        <span className="text-sm font-medium text-gray-700 hidden sm:inline">
          {currentLang?.flag} {currentLang?.nativeName}
        </span>
        <span className="text-sm font-medium text-gray-700 sm:hidden">
          {currentLang?.flag}
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                Select Language
              </div>
              {SUPPORTED_LANGUAGES.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageChange(language.code)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                    currentLanguage === language.code
                      ? 'bg-teal-50 text-teal-700'
                      : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{language.flag}</span>
                    <div>
                      <div className="font-medium">{language.nativeName}</div>
                      <div className="text-xs text-gray-500">{language.name}</div>
                    </div>
                  </div>
                  {currentLanguage === language.code && (
                    <CheckIcon className="h-5 w-5 text-teal-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSelector;
