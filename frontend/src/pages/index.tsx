import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import Layout from '@/components/Layout/Layout';
import {
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  UserIcon,
  HeartIcon,
} from '@heroicons/react/24/outline';

const HomePage: React.FC = () => {
  const { t } = useTranslation();

  const quickActions = [
    {
      name: t('navigation.symptomIntake'),
      description: 'Report your symptoms and get care recommendations',
      href: '/symptom-intake',
      icon: DocumentTextIcon,
      color: 'bg-primary-500',
    },
    {
      name: t('navigation.episodes'),
      description: 'View your care history and track progress',
      href: '/episodes',
      icon: ClipboardDocumentListIcon,
      color: 'bg-secondary-500',
    },
    {
      name: t('navigation.profile'),
      description: 'Manage your health profile and preferences',
      href: '/profile',
      icon: UserIcon,
      color: 'bg-accent-500',
    },
  ];

  return (
    <>
      <Head>
        <title>Healthcare OS - Home</title>
        <meta name="description" content="AI-enabled healthcare orchestration system" />
      </Head>

      <Layout>
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-primary-100 rounded-full">
                <HeartIcon className="h-12 w-12 text-primary-600" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome to Healthcare OS
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Get personalized care recommendations and connect with the right healthcare providers
              based on your symptoms and needs.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {quickActions.map((action) => (
              <Link
                key={action.name}
                href={action.href}
                className="group relative bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center mb-4">
                  <div className={`p-3 rounded-lg ${action.color}`}>
                    <action.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-primary-600">
                  {action.name}
                </h3>
                <p className="text-gray-600 text-sm">
                  {action.description}
                </p>
              </Link>
            ))}
          </div>

          {/* Features */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              How Healthcare OS Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-primary-600 font-bold">1</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Report Symptoms</h3>
                <p className="text-sm text-gray-600">
                  Describe your symptoms in your preferred language
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-primary-600 font-bold">2</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">AI Assessment</h3>
                <p className="text-sm text-gray-600">
                  Get intelligent triage and urgency assessment
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-primary-600 font-bold">3</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Find Providers</h3>
                <p className="text-sm text-gray-600">
                  Get matched with appropriate healthcare providers
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-primary-600 font-bold">4</span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Track Care</h3>
                <p className="text-sm text-gray-600">
                  Monitor your care journey and outcomes
                </p>
              </div>
            </div>
          </div>

          {/* Emergency Notice */}
          <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Emergency Situations
                </h3>
                <p className="mt-1 text-sm text-red-700">
                  If you are experiencing a medical emergency, please call emergency services immediately 
                  or go to the nearest hospital. This system is not a substitute for emergency care.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default HomePage;