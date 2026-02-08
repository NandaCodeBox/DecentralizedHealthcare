import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/Layout/Layout';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

const SpecialtiesPage: React.FC = () => {
  const specialties = [
    { name: 'Neurology', icon: '🧠', color: 'bg-red-50', description: 'Brain and nervous system disorders' },
    { name: 'Cardiology', icon: '❤️', color: 'bg-pink-50', description: 'Heart and cardiovascular health' },
    { name: 'Orthopedics', icon: '🦴', color: 'bg-orange-50', description: 'Bones, joints, and muscles' },
    { name: 'Pathology', icon: '🔬', color: 'bg-yellow-50', description: 'Laboratory and diagnostic tests' },
    { name: 'Dermatology', icon: '🩹', color: 'bg-purple-50', description: 'Skin and dermatological care' },
    { name: 'Pediatrics', icon: '👶', color: 'bg-blue-50', description: 'Child and infant healthcare' },
    { name: 'Gynecology', icon: '👩‍⚕️', color: 'bg-rose-50', description: 'Women\'s health and reproductive care' },
    { name: 'Psychiatry', icon: '🧠', color: 'bg-indigo-50', description: 'Mental health and psychology' },
    { name: 'Oncology', icon: '🏥', color: 'bg-cyan-50', description: 'Cancer treatment and care' },
    { name: 'Urology', icon: '💊', color: 'bg-lime-50', description: 'Urinary and reproductive system' },
    { name: 'ENT', icon: '👂', color: 'bg-amber-50', description: 'Ear, nose, and throat' },
    { name: 'Ophthalmology', icon: '👁️', color: 'bg-emerald-50', description: 'Eye care and vision' },
  ];

  return (
    <>
      <Head>
        <title>All Specialties - Healthcare OS</title>
        <meta name="description" content="Browse all medical specialties" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <Layout showNavigation={false}>
        <div className="w-full pb-12">
          {/* Header */}
          <div className="mb-6 sm:mb-8 lg:mb-12">
            <Link href="/" className="inline-flex items-center text-teal-600 hover:text-teal-700 mb-4">
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Back to Home
            </Link>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
              All Medical Specialties
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600">
              Browse all available medical specialties and find the right care for your needs
            </p>
          </div>

          {/* Specialties Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {specialties.map((specialty) => (
              <Link key={specialty.name} href="/symptom-intake">
                <div className={`${specialty.color} rounded-2xl p-4 sm:p-6 hover:shadow-md transition-all cursor-pointer h-full`}>
                  <div className="text-4xl sm:text-5xl mb-3">{specialty.icon}</div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">{specialty.name}</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mb-4">{specialty.description}</p>
                  <button className="w-full px-3 sm:px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors text-xs sm:text-sm">
                    Get Care
                  </button>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </Layout>
    </>
  );
};

export default SpecialtiesPage;
