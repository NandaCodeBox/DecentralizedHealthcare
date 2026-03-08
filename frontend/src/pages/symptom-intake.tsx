import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { 
  HomeIcon,
  MicrophoneIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useStaticTranslation } from '@/hooks/useStaticTranslation';
import { translateInputToEnglish } from '@/utils/inputTranslation';

const SymptomIntakePage: React.FC = () => {
  const router = useRouter();
  const { t, currentLanguage } = useStaticTranslation();
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [currentSymptom, setCurrentSymptom] = useState('');
  const [severity, setSeverity] = useState('moderate');
  const [duration, setDuration] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  const commonSymptoms = [
    { key: 'fever', label: 'Fever' },
    { key: 'headache', label: 'Headache' },
    { key: 'cough', label: 'Cough' },
    { key: 'fatigue', label: 'Fatigue' },
    { key: 'nausea', label: 'Nausea' },
    { key: 'chest_pain', label: 'Chest Pain' },
    { key: 'shortness_of_breath', label: 'Shortness of Breath' },
    { key: 'dizziness', label: 'Dizziness' },
    { key: 'abdominal_pain', label: 'Abdominal Pain' }
  ];

  const addSymptom = (symptom: string) => {
    if (symptom && !symptoms.includes(symptom)) {
      setSymptoms([...symptoms, symptom]);
      setCurrentSymptom('');
    }
  };

  const removeSymptom = (symptom: string) => {
    setSymptoms(symptoms.filter(s => s !== symptom));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTranslating(true);
    
    try {
      // Translate symptoms to English if needed
      const translatedSymptoms = await Promise.all(
        symptoms.map(symptom => translateInputToEnglish(symptom, currentLanguage))
      );
      
      // Translate additional info to English if needed
      const translatedAdditionalInfo = await translateInputToEnglish(additionalInfo, currentLanguage);
      
      // Store translated data for backend processing
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('triageData', JSON.stringify({
          symptoms: translatedSymptoms,
          severity,
          duration,
          additionalInfo: translatedAdditionalInfo,
          originalLanguage: currentLanguage
        }));
      }
      
      // Show loading state before navigation
      const submitButton = document.getElementById('submit-button');
      if (submitButton) {
        submitButton.innerHTML = '<span class="flex items-center gap-2"><svg class="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>AI Analyzing...</span>';
      }
      
      // Navigate to triage dashboard after short delay
      setTimeout(() => {
        router.push('/triage-dashboard');
      }, 1500);
    } catch (error) {
      console.error('Translation error:', error);
      setIsTranslating(false);
      // Continue with original text if translation fails
      router.push('/triage-dashboard');
    }
  };

  return (
    <>
      <Head>
        <title>Symptom Intake - Arogya.ai</title>
        <meta name="description" content="Report your symptoms and get personalized care recommendations" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div className="w-full bg-gray-50 min-h-screen pb-24 lg:pb-12">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3">
              <Link href="/" className="p-2 hover:bg-gray-100 rounded-full">
                <HomeIcon className="h-6 w-6 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('tell_us_symptoms')}</h1>
                <p className="text-xs sm:text-sm text-gray-500">{t('find_your_care')}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Quick Select Symptoms */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h3 className="font-bold text-gray-900 mb-3">{t('common_symptoms')}</h3>
              <div className="flex flex-wrap gap-2">
                {commonSymptoms.map((symptom) => (
                  <button
                    key={symptom.key}
                    type="button"
                    data-testid={`symptom-${symptom.key}`}
                    onClick={() => addSymptom(symptom.label)}
                    disabled={symptoms.includes(symptom.label)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      symptoms.includes(symptom.label)
                        ? 'bg-teal-100 text-teal-700 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {t(symptom.key)}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Symptom Input */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h3 className="font-bold text-gray-900 mb-3">{t('add_custom_symptom')}</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentSymptom}
                  onChange={(e) => setCurrentSymptom(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSymptom(currentSymptom))}
                  placeholder={t('type_symptom')}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => addSymptom(currentSymptom)}
                  className="p-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
                >
                  <PlusIcon className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <MicrophoneIcon className="h-6 w-6 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Selected Symptoms */}
            {symptoms.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                <h3 className="font-bold text-gray-900 mb-3">Your Symptoms ({symptoms.length})</h3>
                <div className="flex flex-wrap gap-2">
                  {symptoms.map((symptom) => (
                    <div
                      key={symptom}
                      className="flex items-center gap-2 px-3 py-2 bg-teal-50 text-teal-700 rounded-lg"
                    >
                      <span className="font-medium">{symptom}</span>
                      <button
                        type="button"
                        onClick={() => removeSymptom(symptom)}
                        className="hover:bg-teal-100 rounded-full p-0.5"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Severity */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h3 className="font-bold text-gray-900 mb-3">{t('how_severe')}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['mild', 'moderate', 'severe', 'critical'].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSeverity(level)}
                    className={`px-4 py-3 rounded-lg font-semibold transition-colors ${
                      severity === level
                        ? 'bg-teal-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {t(level)}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h3 className="font-bold text-gray-900 mb-3">{t('how_long_symptoms')}</h3>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                data-testid="duration-select"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                required
              >
                <option value="">{t('select_duration')}</option>
                <option value="less_than_day">Less than a day</option>
                <option value="1_3_days">1-3 days</option>
                <option value="4_7_days">4-7 days</option>
                <option value="1_2_weeks">1-2 weeks</option>
                <option value="more_than_2_weeks">More than 2 weeks</option>
              </select>
            </div>

            {/* Additional Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h3 className="font-bold text-gray-900 mb-3">{t('additional_info')}</h3>
              <textarea
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                placeholder={t('additional_info_placeholder')}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Submit Button */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="mb-3 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
                <div className="flex items-center gap-2 text-sm text-blue-900">
                  <span className="text-xl">🤖</span>
                  <div>
                    <p className="font-semibold">{t('ai_powered_assessment')}</p>
                    <p className="text-xs text-blue-700">{t('ai_analyze_seconds')}</p>
                  </div>
                </div>
              </div>
              <button
                id="submit-button"
                type="submit"
                disabled={symptoms.length === 0 || !duration}
                className="w-full px-6 py-4 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span className="text-xl">✨</span>
                {t('get_ai_triage')}
              </button>
              <p className="text-xs text-gray-500 text-center mt-3">
                🔒 {t('info_secure')}
              </p>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default SymptomIntakePage;