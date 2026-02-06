import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import Layout from '@/components/Layout/Layout';
import {
  QuestionMarkCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PhoneIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const HelpPage: React.FC = () => {
  const { t } = useTranslation();
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const faqData: FAQItem[] = [
    {
      id: '1',
      category: 'getting-started',
      question: 'How do I report my symptoms?',
      answer: 'To report your symptoms, click on "Report Symptoms" in the navigation menu or on the home page. Fill out the form with your main complaint, duration, severity, and any additional symptoms. The system will provide care recommendations based on your input.',
    },
    {
      id: '2',
      category: 'getting-started',
      question: 'What information do I need to provide?',
      answer: 'You\'ll need to describe your main symptoms, how long you\'ve had them, rate their severity (1-10), and provide any relevant medical history. The more accurate information you provide, the better recommendations you\'ll receive.',
    },
    {
      id: '3',
      category: 'care',
      question: 'How does the AI assessment work?',
      answer: 'Our AI system analyzes your symptoms using medical knowledge and guidelines to determine urgency level and provide appropriate care recommendations. It considers factors like symptom severity, duration, and your medical history.',
    },
    {
      id: '4',
      category: 'care',
      question: 'What are the different urgency levels?',
      answer: 'There are four urgency levels: Emergency (immediate medical attention required), Urgent (see provider within hours), Routine (schedule appointment in days), and Self-Care (manageable at home with guidance).',
    },
    {
      id: '5',
      category: 'providers',
      question: 'How are healthcare providers recommended?',
      answer: 'Providers are recommended based on your symptoms, location, preferences, insurance, and availability. The system considers factors like specialty match, distance, cost, and provider ratings.',
    },
    {
      id: '6',
      category: 'providers',
      question: 'Can I filter provider recommendations?',
      answer: 'Yes, you can filter providers by specialty, maximum distance, cost range, and availability. You can also set preferences in your profile for provider gender and language.',
    },
    {
      id: '7',
      category: 'technical',
      question: 'Does the app work offline?',
      answer: 'Yes, the app has offline capabilities. You can report symptoms and view your care history offline. Data will be synchronized when you reconnect to the internet.',
    },
    {
      id: '8',
      category: 'technical',
      question: 'How is my data protected?',
      answer: 'Your health data is encrypted and stored securely. We follow healthcare privacy regulations and only share anonymized data for research if you opt-in. You can manage privacy settings in the Settings page.',
    },
    {
      id: '9',
      category: 'account',
      question: 'How do I update my profile?',
      answer: 'Go to the Profile page from the navigation menu. You can edit your personal information, medical history, and preferences. Changes are saved automatically.',
    },
    {
      id: '10',
      category: 'account',
      question: 'Can I export my health data?',
      answer: 'Yes, you can export your health data from the Settings page. This includes your profile, care episodes, and app settings in JSON format.',
    },
  ];

  const categories = [
    { id: 'all', name: 'All Topics', icon: QuestionMarkCircleIcon },
    { id: 'getting-started', name: 'Getting Started', icon: DocumentTextIcon },
    { id: 'care', name: 'Care & Assessment', icon: ChatBubbleLeftRightIcon },
    { id: 'providers', name: 'Healthcare Providers', icon: PhoneIcon },
    { id: 'technical', name: 'Technical Support', icon: QuestionMarkCircleIcon },
    { id: 'account', name: 'Account & Profile', icon: EnvelopeIcon },
  ];

  const filteredFAQs = selectedCategory === 'all' 
    ? faqData 
    : faqData.filter(faq => faq.category === selectedCategory);

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  return (
    <>
      <Head>
        <title>{t('navigation.help')} - Healthcare OS</title>
        <meta name="description" content="Get help and support for Healthcare OS" />
      </Head>

      <Layout>
        <div className="max-w-6xl mx-auto px-4 sm:px-0">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center mb-4 space-y-3 sm:space-y-0">
              <div className="p-3 bg-primary-100 rounded-full sm:mr-4 self-start">
                <QuestionMarkCircleIcon className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {t('navigation.help')} & Support
                </h1>
                <p className="text-base sm:text-lg text-gray-600">
                  Find answers to common questions and get support
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
            {/* Sidebar - Categories */}
            <div className="lg:col-span-1 order-2 lg:order-1">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 lg:sticky lg:top-8">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Help Topics</h2>
                <nav className="space-y-1 sm:space-y-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        selectedCategory === category.id
                          ? 'bg-primary-100 text-primary-700'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <category.icon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 flex-shrink-0" />
                      <span className="truncate">{category.name}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3 order-1 lg:order-2">
              {/* Emergency Notice */}
              <div className="mb-6 sm:mb-8 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start">
                  <ExclamationTriangleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="ml-2 sm:ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Medical Emergency
                    </h3>
                    <p className="mt-1 text-sm text-red-700">
                      If you are experiencing a medical emergency, please call emergency services immediately 
                      (108 in India) or go to the nearest hospital. This app is not a substitute for emergency care.
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mb-6 sm:mb-8 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <Link
                  href="/symptom-intake"
                  className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <DocumentTextIcon className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600 mb-2" />
                  <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">Report Symptoms</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Start your care journey</p>
                </Link>
                
                <Link
                  href="/profile"
                  className="p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <EnvelopeIcon className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600 mb-2" />
                  <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">Update Profile</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Manage your information</p>
                </Link>
                
                <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
                  <PhoneIcon className="h-6 w-6 sm:h-8 sm:w-8 text-primary-600 mb-2" />
                  <h3 className="font-semibold text-gray-900 mb-1 text-sm sm:text-base">Contact Support</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Get personalized help</p>
                </div>
              </div>

              {/* FAQ Section */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 sm:p-6 border-b border-gray-200">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
                    Frequently Asked Questions
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedCategory === 'all' 
                      ? `Showing all ${filteredFAQs.length} questions`
                      : `Showing ${filteredFAQs.length} questions in ${categories.find(c => c.id === selectedCategory)?.name}`
                    }
                  </p>
                </div>
                
                <div className="divide-y divide-gray-200">
                  {filteredFAQs.map((faq) => (
                    <div key={faq.id} className="p-4 sm:p-6">
                      <button
                        onClick={() => toggleFAQ(faq.id)}
                        className="w-full flex items-start justify-between text-left"
                      >
                        <h3 className="text-base sm:text-lg font-medium text-gray-900 pr-4 leading-6">
                          {faq.question}
                        </h3>
                        <div className="flex-shrink-0 mt-1">
                          {expandedFAQ === faq.id ? (
                            <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                          ) : (
                            <ChevronRightIcon className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                      </button>
                      
                      {expandedFAQ === faq.id && (
                        <div className="mt-4 pr-4 sm:pr-8">
                          <p className="text-gray-700 leading-relaxed text-sm sm:text-base">
                            {faq.answer}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact Support */}
              <div className="mt-6 sm:mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">
                  Still Need Help?
                </h2>
                <p className="text-gray-600 mb-4 sm:mb-6 text-sm sm:text-base">
                  Can't find what you're looking for? Our support team is here to help.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="flex items-center p-3 sm:p-4 bg-gray-50 rounded-lg">
                    <EnvelopeIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400 mr-3 flex-shrink-0" />
                    <div className="min-w-0">
                      <h3 className="font-medium text-gray-900 text-sm sm:text-base">Email Support</h3>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">support@healthcare-os.com</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center p-3 sm:p-4 bg-gray-50 rounded-lg">
                    <PhoneIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400 mr-3 flex-shrink-0" />
                    <div className="min-w-0">
                      <h3 className="font-medium text-gray-900 text-sm sm:text-base">Phone Support</h3>
                      <p className="text-xs sm:text-sm text-gray-600">1800-XXX-XXXX (Toll Free)</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-3 sm:p-4 bg-blue-50 rounded-lg">
                  <p className="text-xs sm:text-sm text-blue-700">
                    <strong>Support Hours:</strong> Monday to Friday, 9:00 AM to 6:00 PM IST
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default HelpPage;