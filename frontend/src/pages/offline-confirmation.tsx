import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import Layout from '@/components/Layout/Layout';
import {
  CloudArrowUpIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

const OfflineConfirmationPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <>
      <Head>
        <title>Symptoms Saved - Healthcare OS</title>
        <meta name="description" content="Your symptoms have been saved and will be processed when you're back online" />
      </Head>

      <Layout>
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            {/* Success Icon */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {t('offline.savedLocally')}
            </h1>

            {/* Description */}
            <p className="text-lg text-gray-600 mb-8">
              {t('offline.message')}
            </p>

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-center mb-2">
                  <CloudArrowUpIcon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold text-blue-900 mb-1">
                  Automatic Sync
                </h3>
                <p className="text-sm text-blue-700">
                  Your data will be automatically synchronized when you reconnect to the internet
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center justify-center mb-2">
                  <ClockIcon className="h-6 w-6 text-yellow-600" />
                </div>
                <h3 className="font-semibold text-yellow-900 mb-1">
                  Processing Queue
                </h3>
                <p className="text-sm text-yellow-700">
                  Your symptoms are queued for processing and will receive care recommendations once synced
                </p>
              </div>
            </div>

            {/* What happens next */}
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <h3 className="font-semibold text-gray-900 mb-4">
                What happens next?
              </h3>
              <div className="text-left space-y-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-xs font-medium text-primary-600">1</span>
                  </div>
                  <p className="text-sm text-gray-700">
                    When you reconnect to the internet, your symptoms will be automatically submitted
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-xs font-medium text-primary-600">2</span>
                  </div>
                  <p className="text-sm text-gray-700">
                    Our AI system will assess your symptoms and provide care recommendations
                  </p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-xs font-medium text-primary-600">3</span>
                  </div>
                  <p className="text-sm text-gray-700">
                    You'll receive notifications about your care episode and next steps
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/"
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                {t('navigation.home')}
              </Link>
              <Link
                href="/episodes"
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                {t('navigation.episodes')}
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default OfflineConfirmationPage;