import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { 
  ExclamationTriangleIcon, 
  CheckCircleIcon,
  ClockIcon,
  ArrowRightIcon,
  HomeIcon
} from '@heroicons/react/24/outline';

const TriageDashboard: React.FC = () => {
  const [triageResult] = useState({
    severity: 'moderate',
    urgency: 'within_24_hours',
    symptoms: ['Fever', 'Headache', 'Fatigue'],
    aiConfidence: 87,
    recommendedAction: 'Schedule appointment with General Practitioner',
    estimatedWaitTime: '2-4 hours',
    recommendedFacilities: [
      {
        id: 1,
        name: 'City General Hospital',
        type: 'Hospital',
        distance: '2.3 km',
        waitTime: '2-4 hours',
        availability: 'Available Now',
        rating: 4.8,
        aiMatch: 95,
        aiReason: 'Best match for moderate symptoms with immediate availability',
        hasEmergency: true,
        hasGP: true
      },
      {
        id: 2,
        name: 'Prime Care Clinic',
        type: 'Clinic',
        distance: '1.8 km',
        waitTime: '1-2 hours',
        availability: 'Available Now',
        rating: 4.6,
        aiMatch: 92,
        aiReason: 'Closest location with shorter wait time for non-emergency care',
        hasEmergency: false,
        hasGP: true
      },
      {
        id: 3,
        name: 'QuickCare Medical Center',
        type: 'Urgent Care',
        distance: '3.5 km',
        waitTime: '30-60 mins',
        availability: 'Available Now',
        rating: 4.7,
        aiMatch: 88,
        aiReason: 'Fast service for urgent but non-critical conditions',
        hasEmergency: false,
        hasGP: true
      }
    ],
    alternativeOptions: [
      { type: 'Telemedicine', waitTime: '15 mins', available: true },
      { type: 'Walk-in Clinic', waitTime: '1-2 hours', available: true },
      { type: 'Emergency Room', waitTime: 'Immediate', available: true }
    ]
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'moderate': return 'yellow';
      case 'low': return 'green';
      default: return 'gray';
    }
  };

  const severityColor = getSeverityColor(triageResult.severity);

  return (
    <>
      <Head>
        <title>Triage Dashboard - Healthcare OS</title>
        <meta name="description" content="AI-powered triage results and recommendations" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div className="w-full bg-gray-50 min-h-screen pb-24 lg:pb-12">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link href="/" className="p-2 hover:bg-gray-100 rounded-full">
                  <HomeIcon className="h-6 w-6 text-gray-600" />
                </Link>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Triage Results</h1>
                  <p className="text-xs sm:text-sm text-gray-500">AI-Powered Assessment</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                <span className="text-xs font-semibold text-blue-900">AI: {triageResult.aiConfidence}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* AI Processing Banner */}
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-lg p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center animate-spin">
                  <span className="text-2xl">🤖</span>
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
              </div>
              <div className="flex-1">
                <p className="font-bold text-blue-900">AI Assessment Complete</p>
                <p className="text-sm text-blue-700">Powered by Amazon Bedrock (Claude 3 Haiku)</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{triageResult.aiConfidence}%</div>
                <div className="text-xs text-blue-700">Confidence</div>
              </div>
            </div>
          </div>

          {/* Severity Alert */}
          <div className={`bg-${severityColor}-50 border-l-4 border-${severityColor}-500 rounded-lg p-4 mb-6`}>
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className={`h-6 w-6 text-${severityColor}-600 flex-shrink-0`} />
              <div className="flex-1">
                <h3 className={`font-bold text-${severityColor}-900 mb-1`}>
                  {triageResult.severity.charAt(0).toUpperCase() + triageResult.severity.slice(1)} Priority
                </h3>
                <p className={`text-sm text-${severityColor}-800`}>
                  Recommended action: {triageResult.urgency.replace(/_/g, ' ')}
                </p>
              </div>
            </div>
          </div>

          {/* Symptoms Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
            <h3 className="font-bold text-gray-900 mb-3">Reported Symptoms</h3>
            <div className="flex flex-wrap gap-2">
              {triageResult.symptoms.map((symptom, index) => (
                <span key={index} className="px-3 py-1 bg-teal-50 text-teal-700 rounded-full text-sm font-medium">
                  {symptom}
                </span>
              ))}
            </div>
          </div>

          {/* AI Recommended Facilities */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">AI Recommended Facilities</h3>
              <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 rounded-full">
                <span className="text-xs font-bold text-purple-900">✨ AI Matched</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">Based on your symptoms, location, and urgency</p>
            
            <div className="space-y-3">
              {triageResult.recommendedFacilities.map((facility) => (
                <div key={facility.id} className="border-2 border-gray-200 rounded-lg p-4 hover:border-teal-300 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-gray-900">{facility.name}</h4>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                          {facility.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-600 mb-2">
                        <span>📍 {facility.distance}</span>
                        <span>⏱️ {facility.waitTime}</span>
                        <span>⭐ {facility.rating}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 rounded">
                        <span className="text-xs font-bold text-purple-900">{facility.aiMatch}% Match</span>
                      </div>
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
                        {facility.availability}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mb-3 p-2 bg-purple-50 border-l-2 border-purple-400 rounded text-xs text-purple-800">
                    <span className="font-semibold">AI Insight:</span> {facility.aiReason}
                  </div>
                  
                  <div className="flex gap-2">
                    <button className="flex-1 px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors text-sm">
                      Book Appointment
                    </button>
                    <button className="px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors text-sm">
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900">
                <span className="font-semibold">💡 Tip:</span> Need a specific doctor? Use our{' '}
                <Link href="/provider-search" className="text-blue-600 font-semibold hover:underline">
                  AI-Powered Provider Search
                </Link>
              </p>
            </div>
          </div>

          {/* Recommended Action */}
          <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg border-2 border-teal-300 p-4 sm:p-6 mb-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-200 rounded-full -mr-16 -mt-16 opacity-50"></div>
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircleIcon className="h-6 w-6 text-teal-600" />
                <h3 className="font-bold text-teal-900">AI Recommended Next Step</h3>
                <span className="ml-auto px-2 py-1 bg-teal-600 text-white text-xs font-bold rounded-full animate-pulse">
                  ✨ AI
                </span>
              </div>
              <p className="text-sm text-teal-800 mb-3">{triageResult.recommendedAction}</p>
              <div className="flex items-center gap-2 text-sm text-teal-700 mb-4">
                <ClockIcon className="h-4 w-4" />
                <span>Estimated wait: {triageResult.estimatedWaitTime}</span>
              </div>
              <Link 
                href="/provider-search"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 transition-all shadow-lg hover:shadow-xl"
              >
                <span className="text-xl">🧭</span>
                Find Provider with AI Search
                <ArrowRightIcon className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Alternative Options */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
            <h3 className="font-bold text-gray-900 mb-4">Alternative Care Options</h3>
            <div className="space-y-3">
              {triageResult.alternativeOptions.map((option, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                  <div>
                    <p className="font-semibold text-gray-900">{option.type}</p>
                    <p className="text-sm text-gray-600">Wait time: {option.waitTime}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {option.available && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">Available</span>
                    )}
                    <ArrowRightIcon className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TriageDashboard;
