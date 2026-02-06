import React, { useState } from 'react';
import Head from 'next/head';
import { useTranslation } from 'react-i18next';
import Layout from '@/components/Layout/Layout';
import sampleData from '@/data/sampleData';
import {
  BeakerIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const TestDataPage: React.FC = () => {
  const { t } = useTranslation();
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handlePopulateData = () => {
    try {
      const success = sampleData.populateSampleData();
      if (success) {
        showMessage('success', 'Sample data loaded successfully! You can now test the app with realistic data.');
      } else {
        showMessage('error', 'Failed to load sample data.');
      }
    } catch (error) {
      showMessage('error', 'Error loading sample data.');
    }
  };

  const handleClearData = () => {
    if (confirm('Are you sure you want to clear all test data? This will remove all sample episodes, profile data, and settings.')) {
      try {
        const success = sampleData.clearSampleData();
        if (success) {
          showMessage('success', 'All sample data cleared successfully!');
        } else {
          showMessage('error', 'Failed to clear sample data.');
        }
      } catch (error) {
        showMessage('error', 'Error clearing sample data.');
      }
    }
  };

  const copyToClipboard = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    showMessage('success', 'Data copied to clipboard!');
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: BeakerIcon },
    { id: 'profile', name: 'User Profile', icon: DocumentDuplicateIcon },
    { id: 'episodes', name: 'Care Episodes', icon: DocumentDuplicateIcon },
    { id: 'providers', name: 'Providers', icon: DocumentDuplicateIcon },
    { id: 'settings', name: 'Settings', icon: DocumentDuplicateIcon },
  ];

  const renderDataSection = (title: string, data: any, description?: string) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
        </div>
        <button
          onClick={() => copyToClipboard(data)}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-primary-600 hover:text-primary-500 border border-primary-300 rounded-md hover:bg-primary-50"
        >
          <DocumentDuplicateIcon className="h-4 w-4 mr-1" />
          Copy JSON
        </button>
      </div>
      <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto text-sm">
        <code>{JSON.stringify(data, null, 2)}</code>
      </pre>
    </div>
  );

  return (
    <>
      <Head>
        <title>Test Data - Healthcare OS</title>
        <meta name="description" content="Test data management for Healthcare OS" />
      </Head>

      <Layout>
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-purple-100 rounded-full mr-4">
                <BeakerIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Test Data Management
                </h1>
                <p className="text-lg text-gray-600">
                  Load sample data to test the Healthcare OS application
                </p>
              </div>
            </div>

            {/* Message */}
            {message && (
              <div className={`p-4 rounded-md mb-4 ${
                message.type === 'success' 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center">
                  {message.type === 'success' ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
                  ) : (
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
                  )}
                  <p className={`text-sm ${
                    message.type === 'success' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {message.text}
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <button
                onClick={handlePopulateData}
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white font-medium rounded-md hover:bg-purple-700"
              >
                <BeakerIcon className="h-5 w-5 mr-2" />
                Load Sample Data
              </button>
              <button
                onClick={handleClearData}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700"
              >
                <TrashIcon className="h-5 w-5 mr-2" />
                Clear All Data
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-5 w-5 inline mr-2" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === 'overview' && (
              <div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Sample Data Overview</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="font-medium text-blue-900">Care Episodes</h3>
                      <p className="text-2xl font-bold text-blue-600">{sampleData.careEpisodes.length}</p>
                      <p className="text-sm text-blue-700">Sample episodes with different urgency levels</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h3 className="font-medium text-green-900">Healthcare Providers</h3>
                      <p className="text-2xl font-bold text-green-600">{sampleData.providers.length}</p>
                      <p className="text-sm text-green-700">Doctors across different specialties</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h3 className="font-medium text-purple-900">User Profile</h3>
                      <p className="text-2xl font-bold text-purple-600">1</p>
                      <p className="text-sm text-purple-700">Complete patient profile with medical history</p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <h3 className="font-medium text-orange-900">Emergency Contacts</h3>
                      <p className="text-2xl font-bold text-orange-600">{sampleData.emergencyContacts.length}</p>
                      <p className="text-sm text-orange-700">Important emergency numbers for India</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">What's Included</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-900">Patient Profile (Priya Sharma)</h3>
                      <p className="text-sm text-gray-600">32-year-old female from Mumbai with diabetes and hypertension</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Care Episodes</h3>
                      <ul className="text-sm text-gray-600 ml-4 list-disc">
                        <li>Completed: Severe migraine episode (urgent care)</li>
                        <li>Active: Respiratory infection with fever (routine care)</li>
                        <li>Escalated: Chest pain emergency (cardiac event)</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">Healthcare Providers</h3>
                      <ul className="text-sm text-gray-600 ml-4 list-disc">
                        <li>Dr. Rajesh Kumar - General Medicine</li>
                        <li>Dr. Anjali Patel - Neurology</li>
                        <li>Dr. Priya Menon - Cardiology</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'profile' && renderDataSection(
              'User Profile Data',
              sampleData.userProfile,
              'Complete patient profile including personal info, medical history, and preferences'
            )}

            {activeTab === 'episodes' && renderDataSection(
              'Care Episodes Data',
              sampleData.careEpisodes,
              'Sample care episodes showing different urgency levels and care pathways'
            )}

            {activeTab === 'providers' && renderDataSection(
              'Healthcare Providers Data',
              sampleData.providers,
              'Sample healthcare providers with different specialties and locations'
            )}

            {activeTab === 'settings' && renderDataSection(
              'App Settings Data',
              sampleData.settings,
              'Default app settings including notifications, privacy, and offline preferences'
            )}
          </div>
        </div>
      </Layout>
    </>
  );
};

export default TestDataPage;