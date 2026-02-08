import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  MagnifyingGlassIcon,
  BellIcon,
  ExclamationCircleIcon,
  PhoneIcon,
  HomeIcon,
  BuildingLibraryIcon,
  ChatBubbleLeftIcon,
  EllipsisHorizontalIcon,
} from '@heroicons/react/24/outline';

const HomePage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Healthcare OS - Home</title>
        <meta name="description" content="AI-enabled healthcare orchestration system" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <div className="w-full bg-white min-h-screen pb-24 lg:pb-12">
        {/* Header */}
        <div className="px-4 sm:px-6 lg:px-8 pt-6 pb-4 border-b border-gray-200">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm sm:text-lg">
                  N
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-500">Welcome Back</p>
                  <p className="text-sm sm:text-base font-bold text-gray-900">Nanda</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <MagnifyingGlassIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <BellIcon className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Hero Card - Main CTA */}
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Symptom Intake Card */}
              <div className="relative bg-gradient-to-r from-teal-600 to-teal-700 rounded-2xl overflow-hidden shadow-lg">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -mr-20 -mt-20"></div>
                </div>
                <div className="relative px-4 sm:px-6 py-4 sm:py-5 flex flex-row items-center justify-center gap-3">
                  <div className="flex-1 flex flex-col items-center text-center">
                    <h2 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">
                      Get the Right Care, Right Now
                    </h2>
                    <Link
                      href="/symptom-intake"
                      className="inline-flex items-center px-4 py-2 bg-white text-teal-600 font-bold rounded-full hover:bg-gray-50 transition-all text-xs sm:text-sm"
                    >
                      Tell Us Your Symptoms
                    </Link>
                  </div>
                  <div className="text-3xl sm:text-4xl">⚕️</div>
                </div>
              </div>

              {/* Find Provider Card */}
              <Link href="/provider-search" className="no-underline">
                <div className="relative bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl overflow-hidden shadow-lg h-full hover:shadow-xl transition-shadow cursor-pointer">
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -mr-20 -mt-20"></div>
                  </div>
                  <div className="relative px-4 sm:px-6 py-4 sm:py-5 flex flex-row items-center justify-center gap-3 h-full">
                    <div className="flex-1 flex flex-col items-center text-center">
                      <div className="flex items-center gap-2 mb-2">
                        <h2 className="text-lg sm:text-xl font-bold text-white">
                          AI Provider Search
                        </h2>
                        <span className="text-2xl">✨</span>
                      </div>
                      <p className="text-xs sm:text-sm text-purple-100 mb-2">
                        Semantic search powered by AI
                      </p>
                      <div className="inline-flex items-center px-4 py-2 bg-white text-purple-600 font-bold rounded-full hover:bg-gray-50 transition-all text-xs sm:text-sm">
                        Find Provider
                      </div>
                    </div>
                    <div className="text-3xl sm:text-4xl">🧭</div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Find Your Care - Specialties */}
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">Find Your Care</h3>
              <Link href="/specialties" className="text-teal-600 text-xs font-semibold hover:underline">See All →</Link>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {/* Specialty 1 */}
              <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-red-50 hover:bg-red-100 transition-colors cursor-pointer">
                <div className="text-2xl">🧠</div>
                <span className="text-xs font-semibold text-gray-900 text-center line-clamp-1">Neurology</span>
              </div>

              {/* Specialty 2 */}
              <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-pink-50 hover:bg-pink-100 transition-colors cursor-pointer">
                <div className="text-2xl">❤️</div>
                <span className="text-xs font-semibold text-gray-900 text-center line-clamp-1">Cardiology</span>
              </div>

              {/* Specialty 3 */}
              <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors cursor-pointer">
                <div className="text-2xl">🦴</div>
                <span className="text-xs font-semibold text-gray-900 text-center line-clamp-1">Orthopedics</span>
              </div>

              {/* Specialty 4 */}
              <div className="flex flex-col items-center gap-1 p-2 rounded-lg bg-yellow-50 hover:bg-yellow-100 transition-colors cursor-pointer">
                <div className="text-2xl">🔬</div>
                <span className="text-xs font-semibold text-gray-900 text-center line-clamp-1">Pathology</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboards & Tools Section */}
        <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="max-w-7xl mx-auto">
            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-6">Dashboards & Tools</h3>
            
            {/* Critical Dashboards */}
            <div className="mb-8">
              <p className="text-sm font-semibold text-gray-700 mb-4">Critical Operations</p>
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {/* Supervisor Dashboard */}
                <Link href="/supervisor-dashboard" className="no-underline">
                  <div className="bg-white rounded-lg p-2 sm:p-3 shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer h-full">
                    <div className="text-2xl sm:text-3xl mb-1">👨‍⚖️</div>
                    <h4 className="font-bold text-xs sm:text-sm text-gray-900">Supervisor</h4>
                  </div>
                </Link>

                {/* Care Status */}
                <Link href="/care-status" className="no-underline">
                  <div className="bg-white rounded-lg p-2 sm:p-3 shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer h-full">
                    <div className="text-2xl sm:text-3xl mb-1">📊</div>
                    <h4 className="font-bold text-xs sm:text-sm text-gray-900">Care Status</h4>
                  </div>
                </Link>

                {/* Provider Portal */}
                <Link href="/provider-portal" className="no-underline">
                  <div className="bg-white rounded-lg p-2 sm:p-3 shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer h-full">
                    <div className="text-2xl sm:text-3xl mb-1">🏥</div>
                    <h4 className="font-bold text-xs sm:text-sm text-gray-900">Provider</h4>
                  </div>
                </Link>

                {/* Facilities */}
                <Link href="/facilities" className="no-underline">
                  <div className="bg-white rounded-lg p-2 sm:p-3 shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer h-full">
                    <div className="text-2xl sm:text-3xl mb-1">🏨</div>
                    <h4 className="font-bold text-xs sm:text-sm text-gray-900">Facilities</h4>
                  </div>
                </Link>

                {/* Notifications */}
                <Link href="/notifications" className="no-underline">
                  <div className="bg-white rounded-lg p-2 sm:p-3 shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer h-full">
                    <div className="text-2xl sm:text-3xl mb-1">🔔</div>
                    <h4 className="font-bold text-xs sm:text-sm text-gray-900">Alerts</h4>
                  </div>
                </Link>

                {/* Admin Console */}
                <Link href="/admin-console" className="no-underline">
                  <div className="bg-white rounded-lg p-2 sm:p-3 shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer h-full">
                    <div className="text-2xl sm:text-3xl mb-1">⚙️</div>
                    <h4 className="font-bold text-xs sm:text-sm text-gray-900">Admin</h4>
                  </div>
                </Link>
              </div>
            </div>

            {/* Management & Patient Experience */}
            <div className="mb-8">
              <p className="text-sm font-semibold text-gray-700 mb-4">Patient & Management</p>
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {/* Analytics Dashboard */}
                <Link href="/analytics">
                  <div className="bg-white rounded-lg p-2 sm:p-3 shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer h-full">
                    <div className="text-2xl sm:text-3xl mb-1">📈</div>
                    <h4 className="font-bold text-xs sm:text-sm text-gray-900">Analytics</h4>
                  </div>
                </Link>

                {/* Appointments */}
                <Link href="/appointments">
                  <div className="bg-white rounded-lg p-2 sm:p-3 shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer h-full">
                    <div className="text-2xl sm:text-3xl mb-1">📅</div>
                    <h4 className="font-bold text-xs sm:text-sm text-gray-900">Appointments</h4>
                  </div>
                </Link>

                {/* Care History */}
                <Link href="/care-history">
                  <div className="bg-white rounded-lg p-2 sm:p-3 shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer h-full">
                    <div className="text-2xl sm:text-3xl mb-1">📋</div>
                    <h4 className="font-bold text-xs sm:text-sm text-gray-900">History</h4>
                  </div>
                </Link>

                {/* AI Triage */}
                <Link href="/triage-dashboard">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-2 sm:p-3 border border-blue-200 h-full relative">
                    <div className="absolute top-1 right-1 bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">AI</div>
                    <div className="text-2xl sm:text-3xl mb-1">🤖</div>
                    <h4 className="font-bold text-xs sm:text-sm text-blue-900">AI Triage</h4>
                  </div>
                </Link>

                {/* Smart Routing */}
                <Link href="/provider-search">
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-2 sm:p-3 border border-purple-200 h-full relative">
                    <div className="absolute top-1 right-1 bg-purple-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">AI</div>
                    <div className="text-2xl sm:text-3xl mb-1">🧭</div>
                    <h4 className="font-bold text-xs sm:text-sm text-purple-900">Find Provider</h4>
                  </div>
                </Link>

                {/* Predictions */}
                <Link href="/analytics">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-2 sm:p-3 border border-green-200 h-full relative">
                    <div className="absolute top-1 right-1 bg-green-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">AI</div>
                    <div className="text-2xl sm:text-3xl mb-1">🔮</div>
                    <h4 className="font-bold text-xs sm:text-sm text-green-900">Predict</h4>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-teal-50 rounded-2xl p-4 sm:p-5 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-teal-600 mb-1">24/7</div>
                <div className="text-xs sm:text-sm text-gray-600 font-semibold">Always Available</div>
              </div>
              <div className="bg-teal-50 rounded-2xl p-4 sm:p-5 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-teal-600 mb-1">100%</div>
                <div className="text-xs sm:text-sm text-gray-600 font-semibold">Verified</div>
              </div>
              <div className="bg-teal-50 rounded-2xl p-4 sm:p-5 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-teal-600 mb-1">&lt;30s</div>
                <div className="text-xs sm:text-sm text-gray-600 font-semibold">Fast Response</div>
              </div>
              <div className="bg-teal-50 rounded-2xl p-4 sm:p-5 text-center">
                <div className="text-2xl sm:text-3xl font-bold text-teal-600 mb-1">10+</div>
                <div className="text-xs sm:text-sm text-gray-600 font-semibold">Languages</div>
              </div>
            </div>
          </div>
        </div>

        {/* Emergency Banner */}
        <div className="px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="max-w-7xl mx-auto">
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 sm:p-5">
              <div className="flex items-start gap-3 sm:gap-4">
                <ExclamationCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-bold text-red-900 text-sm sm:text-base mb-1">Medical Emergency?</h4>
                  <p className="text-xs sm:text-sm text-red-800 mb-3">
                    For life-threatening situations, call emergency services immediately.
                  </p>
                  <a
                    href="tel:108"
                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors text-xs sm:text-sm"
                  >
                    <PhoneIcon className="h-4 w-4 mr-2" />
                    Call 108 Now
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation - Mobile Only */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 lg:hidden">
        <div className="flex items-center justify-around px-4 py-3">
          <button className="flex flex-col items-center gap-1 text-teal-600 hover:text-teal-700 transition-colors">
            <HomeIcon className="h-6 w-6" />
            <span className="text-xs font-semibold">Home</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
            <BuildingLibraryIcon className="h-6 w-6" />
            <span className="text-xs font-semibold">Facilities</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
            <ChatBubbleLeftIcon className="h-6 w-6" />
            <span className="text-xs font-semibold">Messages</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
            <EllipsisHorizontalIcon className="h-6 w-6" />
            <span className="text-xs font-semibold">More</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default HomePage;



