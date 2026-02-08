import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeftIcon, DocumentTextIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

const CareHistoryPage: React.FC = () => {
  const episodes = [
    {
      id: 'EP-2024-001',
      date: '2024-02-07',
      symptoms: 'Chest pain, shortness of breath',
      urgency: 'emergency',
      provider: 'City General Hospital',
      doctor: 'Dr. Rajesh Verma',
      status: 'in-progress',
      outcome: null,
    },
    {
      id: 'EP-2024-002',
      date: '2024-01-28',
      symptoms: 'High fever, cough',
      urgency: 'urgent',
      provider: 'Prime Care Clinic',
      doctor: 'Dr. Priya Singh',
      status: 'completed',
      outcome: 'Viral infection - prescribed antibiotics and rest',
    },
    {
      id: 'EP-2024-003',
      date: '2024-01-15',
      symptoms: 'Mild headache, fatigue',
      urgency: 'routine',
      provider: 'Health Plus Clinic',
      doctor: 'Dr. Amit Patel',
      status: 'completed',
      outcome: 'General fatigue - recommended rest and hydration',
    },
  ];

  return (
    <>
      <Head>
        <title>Care History - Healthcare OS</title>
        <meta name="description" content="Your complete care history" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Link href="/" className="inline-flex items-center text-teal-600 hover:text-teal-700 mb-4">
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Back to Home
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Care History</h1>
            <p className="text-gray-600 mt-1">Complete record of your healthcare episodes</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            {episodes.map((episode) => (
              <div key={episode.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{episode.id}</h3>
                    <p className="text-sm text-gray-600">{episode.date}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        episode.urgency === 'emergency'
                          ? 'bg-red-100 text-red-800'
                          : episode.urgency === 'urgent'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {episode.urgency.toUpperCase()}
                    </span>
                    <span
                      className={`ml-2 px-3 py-1 rounded-full text-xs font-semibold ${
                        episode.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {episode.status === 'completed' ? 'Completed' : 'In Progress'}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-200">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Symptoms</p>
                    <p className="text-sm font-semibold text-gray-900">{episode.symptoms}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Provider</p>
                    <p className="text-sm font-semibold text-gray-900">{episode.provider}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Doctor</p>
                    <p className="text-sm font-semibold text-gray-900">{episode.doctor}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Status</p>
                    <div className="flex items-center gap-2">
                      {episode.status === 'completed' ? (
                        <CheckCircleIcon className="h-4 w-4 text-green-600" />
                      ) : (
                        <ClockIcon className="h-4 w-4 text-yellow-600" />
                      )}
                      <span className="text-sm font-semibold text-gray-900">
                        {episode.status === 'completed' ? 'Completed' : 'In Progress'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Outcome */}
                {episode.outcome && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <DocumentTextIcon className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-green-900 mb-1">Outcome</p>
                        <p className="text-sm text-green-800">{episode.outcome}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-4 flex gap-3">
                  <button className="px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors text-sm">
                    View Details
                  </button>
                  <button className="px-4 py-2 bg-gray-200 text-gray-900 font-semibold rounded-lg hover:bg-gray-300 transition-colors text-sm">
                    Download Report
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Summary Stats */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
              <p className="text-3xl font-bold text-teal-600 mb-1">3</p>
              <p className="text-sm text-gray-600">Total Episodes</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
              <p className="text-3xl font-bold text-green-600 mb-1">2</p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
              <p className="text-3xl font-bold text-yellow-600 mb-1">1</p>
              <p className="text-sm text-gray-600">In Progress</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CareHistoryPage;
