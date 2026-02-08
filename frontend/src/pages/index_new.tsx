import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/Layout/Layout';
import {
  SparklesIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  WifiIcon,
  ExclamationCircleIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';

const HomePage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Healthcare OS - Home</title>
        <meta name="description" content="AI-enabled healthcare orchestration system" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <Layout>
        <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8 pb-20">
          {/* Hero Banner - PWA Healthcare Style */}
          <div className="relative bg-gradient-to-br from-teal-600 to-teal-700 rounded-3xl overflow-hidden mb-8 shadow-xl">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -mr-48 -mt-48"></div>
            </div>
            <div className="relative px-6 sm:px-8 py-12 sm:py-16">
              <div className="max-w-2xl">
                {/* Greeting */}
                <p className="text-teal-100 text-sm font-semibold mb-2">Welcome Back</p>
                
                {/* Main Heading */}
                <h1 className="text-3xl sm:text-4xl font-black text-white mb-3 leading-tight">
                  Get the Right Care, Right Now
                </h1>
                
                {/* Subheading */}
                <p className="text-teal-50 text-base sm:text-lg mb-8 max-w-xl">
                  Emergency? Urgent? Routine? We assess your symptoms and route you to the perfect care level.
                </p>

                {/* CTA Button */}
                <Link
                  href="/symptom-intake"
                  className="inline-flex items-center justify-center px-8 py-4 bg-white text-teal-600 font-bold rounded-2xl hover:bg-gray-50 transition-all shadow-lg text-base"
                >
                  <SparklesIcon className="h-5 w-5 mr-2" />
                  Tell Us Your Symptoms
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Actions - Icon Grid */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Find Your Care</h2>
              <Link href="#" className="text-teal-600 text-sm font-semibold">See All →</Link>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {/* Specialty 1 */}
              <div className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-gray-100 hover:border-teal-300 hover:shadow-md transition-all cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-2xl">🧠</div>
                <span className="text-xs font-semibold text-gray-900 text-center">Neurology</span>
              </div>

              {/* Specialty 2 */}
              <div className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-gray-100 hover:border-teal-300 hover:shadow-md transition-all cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center text-2xl">❤️</div>
                <span className="text-xs font-semibold text-gray-900 text-center">Cardiology</span>
              </div>

              {/* Specialty 3 */}
              <div className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-gray-100 hover:border-teal-300 hover:shadow-md transition-all cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-2xl">🦴</div>
                <span className="text-xs font-semibold text-gray-900 text-center">Orthopedics</span>
              </div>

              {/* Specialty 4 */}
              <div className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-gray-100 hover:border-teal-300 hover:shadow-md transition-all cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-2xl">👶</div>
                <span className="text-xs font-semibold text-gray-900 text-center">Pediatrics</span>
              </div>

              {/* Specialty 5 */}
              <div className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-gray-100 hover:border-teal-300 hover:shadow-md transition-all cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl">👁️</div>
                <span className="text-xs font-semibold text-gray-900 text-center">Ophthalmology</span>
              </div>

              {/* Specialty 6 */}
              <div className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white border border-gray-100 hover:border-teal-300 hover:shadow-md transition-all cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-2xl">🦷</div>
                <span className="text-xs font-semibold text-gray-900 text-center">Dentistry</span>
              </div>
            </div>
          </div>

          {/* Trust Indicators - Compact */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <div className="text-2xl font-bold text-teal-600 mb-1">24/7</div>
              <div className="text-xs text-gray-600 font-semibold">Always Available</div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <div className="text-2xl font-bold text-teal-600 mb-1">&lt;30s</div>
              <div className="text-xs text-gray-600 font-semibold">Fast Response</div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <div className="text-2xl font-bold text-teal-600 mb-1">100%</div>
              <div className="text-xs text-gray-600 font-semibold">Verified Doctors</div>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <div className="text-2xl font-bold text-teal-600 mb-1">10+</div>
              <div className="text-xs text-gray-600 font-semibold">Languages</div>
            </div>
          </div>

          {/* Why Choose - Feature Cards */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Why Choose Healthcare OS</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center mb-4">
                  <SparklesIcon className="h-6 w-6 text-teal-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">AI-Powered Triage</h3>
                <p className="text-sm text-gray-600">Advanced ML algorithms for accurate symptom assessment</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center mb-4">
                  <ShieldCheckIcon className="h-6 w-6 text-teal-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Verified Doctors</h3>
                <p className="text-sm text-gray-600">All recommendations reviewed by licensed professionals</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center mb-4">
                  <GlobeAltIcon className="h-6 w-6 text-teal-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Multilingual Support</h3>
                <p className="text-sm text-gray-600">Available in 10+ languages including Hindi and English</p>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center mb-4">
                  <WifiIcon className="h-6 w-6 text-teal-600" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Works Offline</h3>
                <p className="text-sm text-gray-600">Progressive Web App - functions on 2G networks</p>
              </div>
            </div>
          </div>

          {/* How It Works - Timeline */}
          <div className="mb-8 bg-gray-50 rounded-3xl p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-8 text-center">How It Works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="relative">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
                  <div className="text-4xl mb-3">📝</div>
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-teal-600 text-white font-bold rounded-full mb-3">
                    1
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Tell Us</h3>
                  <p className="text-sm text-gray-600">Describe symptoms via text or voice</p>
                </div>
              </div>

              <div className="relative">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
                  <div className="text-4xl mb-3">🤖</div>
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-teal-600 text-white font-bold rounded-full mb-3">
                    2
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Analyze</h3>
                  <p className="text-sm text-gray-600">AI analyzes and triages instantly</p>
                </div>
              </div>

              <div className="relative">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
                  <div className="text-4xl mb-3">👨‍⚕️</div>
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-teal-600 text-white font-bold rounded-full mb-3">
                    3
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Verify</h3>
                  <p className="text-sm text-gray-600">Doctor reviews recommendation</p>
                </div>
              </div>

              <div className="relative">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
                  <div className="text-4xl mb-3">✅</div>
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-teal-600 text-white font-bold rounded-full mb-3">
                    4
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Connect</h3>
                  <p className="text-sm text-gray-600">Get matched with right provider</p>
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Banner */}
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-6 mb-8">
            <div className="flex items-start gap-4">
              <ExclamationCircleIcon className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-bold text-red-900 mb-2">Medical Emergency?</h3>
                <p className="text-sm text-red-800 mb-4">
                  For life-threatening situations, call emergency services immediately. This app is not a substitute for emergency care.
                </p>
                <a
                  href="tel:108"
                  className="inline-flex items-center px-6 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors"
                >
                  <PhoneIcon className="h-4 w-4 mr-2" />
                  Call 108 Now
                </a>
              </div>
            </div>
          </div>

          {/* Footer CTA */}
          <div className="text-center">
            <p className="text-gray-600 text-sm mb-4">
              Ready to take control of your health?
            </p>
            <Link
              href="/symptom-intake"
              className="inline-flex items-center px-8 py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-all shadow-lg hover:shadow-xl"
            >
              <SparklesIcon className="h-5 w-5 mr-2" />
              Get Started Now
            </Link>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default HomePage;
