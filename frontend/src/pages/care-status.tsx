import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  PhoneIcon,
  CalendarIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

const CareStatusPage: React.FC = () => {
  const [activeEpisode] = useState({
    id: 'EP-2024-001',
    patientName: 'Rajesh Kumar',
    status: 'in-progress',
    createdAt: '2024-02-07 10:30 AM',
    symptoms: 'Chest pain, shortness of breath',
    urgencyLevel: 'emergency',
    triageAssessment: 'Possible cardiac event - requires immediate hospital admission',
    supervisorApproval: {
      status: 'approved',
      supervisorName: 'Dr. Priya Sharma',
      approvedAt: '2024-02-07 10:35 AM',
    },
    assignedProvider: {
      name: 'City General Hospital',
      type: 'Hospital',
      specialty: 'Cardiology',
      distance: '2.3 km',
      address: '123 Medical Street, New Delhi',
      phone: '+91-11-2345-6789',
      rating: 4.5,
      reviews: 2530,
    },
    appointment: {
      date: '2024-02-07',
      time: '11:00 AM',
      status: 'confirmed',
      doctorName: 'Dr. Rajesh Verma',
      doctorSpecialty: 'Cardiologist',
    },
    timeline: [
      {
        time: '10:30 AM',
        event: 'Symptoms Submitted',
        description: 'Patient submitted symptoms through mobile app',
        status: 'completed',
      },
      {
        time: '10:32 AM',
        event: 'Triage Assessment',
        description: 'AI-powered triage assessment completed',
        status: 'completed',
      },
      {
        time: '10:35 AM',
        event: 'Supervisor Validation',
        description: 'Healthcare supervisor approved the assessment',
        status: 'completed',
      },
      {
        time: '10:37 AM',
        event: 'Provider Assignment',
        description: 'Assigned to City General Hospital',
        status: 'completed',
      },
      {
        time: '10:40 AM',
        event: 'Appointment Scheduled',
        description: 'Appointment confirmed for 11:00 AM',
        status: 'completed',
      },
      {
        time: 'Pending',
        event: 'Provider Consultation',
        description: 'Awaiting consultation with assigned provider',
        status: 'pending',
      },
    ],
  });

  return (
    <>
      <Head>
        <title>Care Status - Healthcare OS</title>
        <meta name="description" content="Track your care episode status" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Link href="/my-episodes" className="inline-flex items-center text-teal-600 hover:text-teal-700 mb-4">
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Back to Episodes
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Care Status Tracking</h1>
            <p className="text-gray-600 mt-1">Episode ID: {activeEpisode.id}</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Status & Timeline */}
            <div className="lg:col-span-2 space-y-8">
              {/* Current Status */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Current Status</h2>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Episode Status</p>
                    <p className="text-2xl font-bold text-teal-600">In Progress</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 mb-1">Created</p>
                    <p className="text-lg font-semibold text-gray-900">{activeEpisode.createdAt}</p>
                  </div>
                </div>

                {/* Urgency Badge */}
                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-semibold text-red-800">
                    🚨 EMERGENCY - Requires immediate attention
                  </p>
                </div>
              </div>

              {/* Symptoms & Assessment */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Symptoms & Assessment</h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">Your Symptoms:</p>
                    <p className="text-gray-900">{activeEpisode.symptoms}</p>
                  </div>
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">AI Assessment:</p>
                    <p className="text-gray-900">{activeEpisode.triageAssessment}</p>
                  </div>
                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Supervisor Approval:</p>
                    <div className="flex items-center gap-2">
                      <CheckCircleIcon className="h-5 w-5 text-green-600" />
                      <span className="text-gray-900">
                        Approved by {activeEpisode.supervisorApproval.supervisorName} at {activeEpisode.supervisorApproval.approvedAt}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Care Journey Timeline</h2>
                <div className="space-y-4">
                  {activeEpisode.timeline.map((item, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          item.status === 'completed' ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          {item.status === 'completed' ? (
                            <CheckCircleIcon className="h-6 w-6 text-green-600" />
                          ) : (
                            <ClockIcon className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                        {index < activeEpisode.timeline.length - 1 && (
                          <div className={`w-1 h-12 ${item.status === 'completed' ? 'bg-green-200' : 'bg-gray-200'}`} />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-bold text-gray-900">{item.event}</p>
                          <p className="text-sm text-gray-600">{item.time}</p>
                        </div>
                        <p className="text-sm text-gray-600">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Provider & Appointment */}
            <div className="lg:col-span-1 space-y-6">
              {/* Assigned Provider */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Assigned Provider</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Facility</p>
                    <p className="text-lg font-bold text-gray-900">{activeEpisode.assignedProvider.name}</p>
                    <p className="text-sm text-gray-600">{activeEpisode.assignedProvider.type}</p>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-sm text-gray-600 mb-1">Specialty</p>
                    <p className="font-semibold text-gray-900">{activeEpisode.assignedProvider.specialty}</p>
                  </div>

                  <div className="border-t border-gray-200 pt-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPinIcon className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-600">Location</p>
                        <p className="text-sm font-semibold text-gray-900">{activeEpisode.assignedProvider.address}</p>
                        <p className="text-xs text-gray-600 mt-1">{activeEpisode.assignedProvider.distance} away</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <PhoneIcon className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-600">Contact</p>
                        <a href={`tel:${activeEpisode.assignedProvider.phone}`} className="text-sm font-semibold text-teal-600 hover:text-teal-700">
                          {activeEpisode.assignedProvider.phone}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <DocumentTextIcon className="h-5 w-5 text-teal-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-600">Rating</p>
                        <p className="text-sm font-semibold text-gray-900">
                          ⭐ {activeEpisode.assignedProvider.rating} ({activeEpisode.assignedProvider.reviews} reviews)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Appointment Details */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Appointment Details</h3>
                <div className="space-y-4">
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircleIcon className="h-5 w-5 text-green-600" />
                      <p className="font-semibold text-green-800">Appointment Confirmed</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-gray-600" />
                        <span className="text-sm text-gray-900">{activeEpisode.appointment.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ClockIcon className="h-4 w-4 text-gray-600" />
                        <span className="text-sm text-gray-900">{activeEpisode.appointment.time}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <p className="text-sm text-gray-600 mb-2">Doctor</p>
                    <p className="font-semibold text-gray-900">{activeEpisode.appointment.doctorName}</p>
                    <p className="text-sm text-gray-600">{activeEpisode.appointment.doctorSpecialty}</p>
                  </div>

                  <button className="w-full mt-4 px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors">
                    Reschedule Appointment
                  </button>
                </div>
              </div>

              {/* Next Steps */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-900 mb-2">📋 Next Steps:</p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>✓ Arrive 15 minutes early</li>
                  <li>✓ Bring ID and insurance card</li>
                  <li>✓ Bring any medical records</li>
                  <li>✓ List all current medications</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CareStatusPage;
