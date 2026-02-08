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

const SymptomIntakePage: React.FC = () => {
  const router = useRouter();
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [currentSymptom, setCurrentSymptom] = useState('');
  const [severity, setSeverity] = useState('moderate');
  const [duration, setDuration] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');

  const commonSymptoms = [
    'Fever', 'Headache', 'Cough', 'Fatigue', 'Nausea',
    'Chest Pain', 'Shortness of Breath', 'Dizziness', 'Abdominal Pain'
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Show loading state before navigation
    const submitButton = document.getElementById('submit-button');
    if (submitButton) {
      submitButton.innerHTML = '<span class="flex items-center gap-2"><svg class="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>AI Analyzing...</span>';
    }
    // Navigate to triage dashboard after short delay
    setTimeout(() => {
      router.push('/triage-dashboard');
    }, 1500);
  };

  return (
    <>
      <Head>
        <title>Symptom Intake - Healthcare OS</title>
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
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Tell Us Your Symptoms</h1>
                <p className="text-xs sm:text-sm text-gray-500">We'll help you find the right care</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Quick Select Symptoms */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h3 className="font-bold text-gray-900 mb-3">Common Symptoms</h3>
              <div className="flex flex-wrap gap-2">
                {commonSymptoms.map((symptom) => (
                  <button
                    key={symptom}
                    type="button"
                    onClick={() => addSymptom(symptom)}
                    disabled={symptoms.includes(symptom)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      symptoms.includes(symptom)
                        ? 'bg-teal-100 text-teal-700 cursor-not-allowed'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {symptom}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Symptom Input */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h3 className="font-bold text-gray-900 mb-3">Add Custom Symptom</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentSymptom}
                  onChange={(e) => setCurrentSymptom(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSymptom(currentSymptom))}
                  placeholder="Type your symptom..."
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
              <h3 className="font-bold text-gray-900 mb-3">How severe are your symptoms?</h3>
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
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h3 className="font-bold text-gray-900 mb-3">How long have you had these symptoms?</h3>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                required
              >
                <option value="">Select duration...</option>
                <option value="less_than_day">Less than a day</option>
                <option value="1_3_days">1-3 days</option>
                <option value="4_7_days">4-7 days</option>
                <option value="1_2_weeks">1-2 weeks</option>
                <option value="more_than_2_weeks">More than 2 weeks</option>
              </select>
            </div>

            {/* Additional Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h3 className="font-bold text-gray-900 mb-3">Additional Information (Optional)</h3>
              <textarea
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                placeholder="Any other details that might help us understand your condition..."
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
                    <p className="font-semibold">AI-Powered Assessment</p>
                    <p className="text-xs text-blue-700">Our AI will analyze your symptoms in seconds</p>
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
                Get AI Triage Assessment
              </button>
              <p className="text-xs text-gray-500 text-center mt-3">
                🔒 Your information is secure and confidential
              </p>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default SymptomIntakePage;