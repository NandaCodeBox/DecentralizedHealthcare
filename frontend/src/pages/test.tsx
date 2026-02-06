import React from 'react';
import Head from 'next/head';
import { useTranslation } from 'react-i18next';
import Layout from '@/components/Layout/Layout';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOfflineSync } from '@/hooks/useOfflineSync';

const TestPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isOnline = useOnlineStatus();
  const { isSyncing, pendingCount } = useOfflineSync();

  return (
    <>
      <Head>
        <title>Test Page - Healthcare OS</title>
        <meta name="description" content="Test page for PWA functionality" />
      </Head>

      <Layout>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            PWA Test Page
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Internationalization Test */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Internationalization
              </h2>
              <div className="space-y-2">
                <p><strong>Current Language:</strong> {i18n.language}</p>
                <p><strong>Home:</strong> {t('navigation.home')}</p>
                <p><strong>Loading:</strong> {t('common.loading')}</p>
                <p><strong>Submit:</strong> {t('common.submit')}</p>
              </div>
            </div>

            {/* Online Status Test */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Online Status
              </h2>
              <div className="space-y-2">
                <p><strong>Online:</strong> {isOnline ? 'Yes' : 'No'}</p>
                <p><strong>Syncing:</strong> {isSyncing ? 'Yes' : 'No'}</p>
                <p><strong>Pending Items:</strong> {pendingCount}</p>
              </div>
            </div>

            {/* PWA Features Test */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                PWA Features
              </h2>
              <div className="space-y-2">
                <p><strong>Service Worker:</strong> {'serviceWorker' in navigator ? 'Supported' : 'Not Supported'}</p>
                <p><strong>Local Storage:</strong> {typeof Storage !== 'undefined' ? 'Available' : 'Not Available'}</p>
                <p><strong>Online Events:</strong> {'onLine' in navigator ? 'Supported' : 'Not Supported'}</p>
              </div>
            </div>

            {/* Responsive Design Test */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Responsive Design
              </h2>
              <div className="space-y-2">
                <div className="block sm:hidden">
                  <p className="text-green-600">Mobile View</p>
                </div>
                <div className="hidden sm:block md:hidden">
                  <p className="text-blue-600">Tablet View</p>
                </div>
                <div className="hidden md:block">
                  <p className="text-purple-600">Desktop View</p>
                </div>
                <p><strong>Screen Width:</strong> {typeof window !== 'undefined' ? window.innerWidth : 'Unknown'}px</p>
              </div>
            </div>
          </div>

          {/* Test Actions */}
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Test Actions
            </h2>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'hi' : 'en')}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Toggle Language
              </button>
              <button
                onClick={() => {
                  if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.ready.then(() => {
                      alert('Service Worker is ready!');
                    });
                  }
                }}
                className="px-4 py-2 bg-secondary-600 text-white rounded-md hover:bg-secondary-700"
              >
                Test Service Worker
              </button>
              <button
                onClick={() => {
                  const testData = { test: 'data', timestamp: new Date().toISOString() };
                  localStorage.setItem('test-data', JSON.stringify(testData));
                  alert('Test data saved to localStorage');
                }}
                className="px-4 py-2 bg-accent-600 text-white rounded-md hover:bg-accent-700"
              >
                Test Local Storage
              </button>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default TestPage;