import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '@/components/Layout/Layout';
import { ArrowLeftIcon, MapPinIcon, StarIcon, ClockIcon } from '@heroicons/react/24/outline';

const FacilitiesPage: React.FC = () => {
  const facilities = [
    {
      id: 1,
      name: 'City General Hospital',
      type: 'Hospital',
      specialty: 'Multi-specialty',
      distance: '2.3 km',
      rating: 4.5,
      reviews: 2530,
      availability: '24/7',
      icon: '🏥',
      services: ['Emergency', 'ICU', 'Surgery', 'Cardiology', 'Neurology', 'Orthopedics'],
    },
    {
      id: 2,
      name: 'Prime Care Clinic',
      type: 'Clinic',
      specialty: 'General Practice',
      distance: '1.8 km',
      rating: 4.2,
      reviews: 1240,
      availability: '9 AM - 9 PM',
      icon: '🏨',
      services: ['Consultation', 'Lab Tests', 'Vaccination', 'Health Checkup'],
    },
    {
      id: 3,
      name: 'MediCare Pharmacy',
      type: 'Pharmacy',
      specialty: 'Medicines & Supplies',
      distance: '0.9 km',
      rating: 4.7,
      reviews: 890,
      availability: '24/7',
      icon: '💊',
      services: ['Medicines', 'Delivery', 'Consultation', 'Health Products'],
    },
    {
      id: 4,
      name: 'Wellness Diagnostic Center',
      type: 'Diagnostic',
      specialty: 'Lab & Imaging',
      distance: '3.1 km',
      rating: 4.6,
      reviews: 1560,
      availability: '7 AM - 8 PM',
      icon: '🔬',
      services: ['Blood Tests', 'Imaging', 'Reports', 'Home Collection'],
    },
    {
      id: 5,
      name: 'Advanced Care Hospital',
      type: 'Hospital',
      specialty: 'Tertiary Care',
      distance: '4.2 km',
      rating: 4.8,
      reviews: 3200,
      availability: '24/7',
      icon: '🏥',
      services: ['Emergency', 'ICU', 'Trauma', 'Organ Transplant', 'Specialized Surgery'],
    },
    {
      id: 6,
      name: 'Quick Care Urgent Center',
      type: 'Urgent Care',
      specialty: 'Emergency & Urgent',
      distance: '1.2 km',
      rating: 4.4,
      reviews: 980,
      availability: '24/7',
      icon: '🚑',
      services: ['Emergency', 'Urgent Care', 'Minor Surgery', 'Wound Care'],
    },
    {
      id: 7,
      name: 'Health Plus Clinic',
      type: 'Clinic',
      specialty: 'Primary Care',
      distance: '2.5 km',
      rating: 4.3,
      reviews: 1100,
      availability: '8 AM - 8 PM',
      icon: '🏨',
      services: ['General Consultation', 'Preventive Care', 'Chronic Disease Management'],
    },
    {
      id: 8,
      name: 'Specialty Medical Center',
      type: 'Specialty Hospital',
      specialty: 'Specialized Services',
      distance: '5.0 km',
      rating: 4.7,
      reviews: 2100,
      availability: '9 AM - 6 PM',
      icon: '🏥',
      services: ['Cardiology', 'Neurology', 'Orthopedics', 'Oncology'],
    },
  ];

  return (
    <>
      <Head>
        <title>All Nearby Facilities - Healthcare OS</title>
        <meta name="description" content="Browse all nearby healthcare facilities" />
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
              All Nearby Facilities
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600">
              Browse all available healthcare facilities near you
            </p>
          </div>

          {/* Facilities Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {facilities.map((facility) => (
              <div
                key={facility.id}
                className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all"
              >
                {/* Facility Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="text-3xl sm:text-4xl">{facility.icon}</div>
                  <div className="flex-1">
                    <h4 className="font-bold text-sm sm:text-base text-gray-900">{facility.name}</h4>
                    <p className="text-xs sm:text-sm text-gray-600">{facility.type}</p>
                  </div>
                </div>

                {/* Facility Details */}
                <div className="space-y-2 mb-4">
                  {/* Distance */}
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                    <MapPinIcon className="h-4 w-4 text-teal-600" />
                    <span>{facility.distance}</span>
                  </div>

                  {/* Rating */}
                  <div className="flex items-center gap-2 text-xs sm:text-sm">
                    <StarIcon className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                    <span className="font-semibold text-gray-900">{facility.rating}</span>
                    <span className="text-gray-600">({facility.reviews})</span>
                  </div>

                  {/* Availability */}
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                    <ClockIcon className="h-4 w-4 text-teal-600" />
                    <span>{facility.availability}</span>
                  </div>

                  {/* Services */}
                  <div className="flex flex-wrap gap-1">
                    {facility.services.slice(0, 3).map((service, idx) => (
                      <span key={idx} className="text-xs px-2 py-1 bg-teal-50 text-teal-700 rounded-full">
                        {service}
                      </span>
                    ))}
                    {facility.services.length > 3 && (
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded-full">
                        +{facility.services.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                <Link
                  href="/symptom-intake"
                  className="w-full px-3 sm:px-4 py-2 bg-teal-600 text-white font-bold rounded-full hover:bg-teal-700 transition-colors text-xs sm:text-sm text-center block"
                >
                  Get Care
                </Link>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    </>
  );
};

export default FacilitiesPage;
