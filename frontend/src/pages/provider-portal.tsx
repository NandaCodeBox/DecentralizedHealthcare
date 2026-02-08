import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserIcon,
  PhoneIcon,
  DocumentTextIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

const ProviderPortal: React.FC = () => {
  const [patients, setPatients] = useState([
    {
      id: 1,
      episodeId: 'EP-2024-001',
      patientName: 'Rajesh Kumar',
      age: 45,
      symptoms: 'Chest pain, shortness of breath',
      urgency: 'emergency',
      assignedAt: '2024-02-07 10:40 AM',
      appointmentTime: '2024-02-07 11:00 AM',
      status: 'confirmed',
      phone: '+91-98765-43210',
      notes: 'Patient has history of hypertension. Requires immediate ECG and cardiac assessment.',
    },
    {
      id: 2,
      episodeId: 'EP-2024-002',
      patientName: 'Priya Singh',
      age: 32,
      symptoms: 'High fever, cough, body ache',
      urgency: 'urgent',
      assignedAt: '2024-02-07 10:50 AM',
      appointmentTime: '2024-02-07 02:00 PM',
      status: 'confirmed',
      phone: '+91-98765-43211',
      notes: 'Suspected viral infection. Recommend COVID-19 test and chest X-ray.',
    },
    {
      id: 3,
      episodeId: 'EP-2024-003',
      patientName: 'Amit Patel',
      age: 28,
      symptoms: 'Mild headache, fatigue',
      urgency: 'routine',
      assignedAt: '2024-02-07 11:00 AM',
      appointmentTime: '2024-02-07 04:00 PM',
      status: 'pending',
      phone: '+91-98765-43212',
      notes: 'General consultation. May require blood tests if symptoms persist.',
    },
  ]);

  const [selectedPatient, setSelectedPatient] = useState<number | null>(null);
  const [availability, setAvailability] = useState({
    status: 'open',
    beds: 5,
    capacity: 20,
    hours: '24/7',
  });

  const handleAcceptReferral = (id: number) => {
    setPatients(patients.map(p => 
      p.id === id ? { ...p, status: 'accepted' } : p
    ));
  };

  const handleRejectReferral = (id: number) => {
    setPatients(patients.map(p => 
      p.id === id ? { ...p, status: 'rejected' } : p
    ));
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'urgent':
        return 'bg-orange-50 border-orange-200 text-orange-900';
      case 'routine':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-blue-100 text-blue-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const confirmedCount = patients.filter(p => p.status === 'confirmed' || p.status === 'accepted').length;
  const pendingCount = patients.filter(p => p.status === 'pending').length;

  return (
    <>
      <Head>
        <title>Provider Portal - Healthcare OS</title>
        <meta name="description" content="Provider portal for managing assigned patients" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <Link href="/" className="inline-flex items-center text-teal-600 hover:text-teal-700 mb-4">
                  <ArrowLeftIcon className="h-5 w-5 mr-2" />
                  Back to Home
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">Provider Portal</h1>
                <p className="text-gray-600 mt-1">City General Hospital - Cardiology Department</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-teal-600">{confirmedCount}</div>
                <div className="text-sm text-gray-600">Confirmed Appointments</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Patients List */}
            <div className="lg:col-span-2">
              <div className="space-y-6">
                {/* Availability Status */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Facility Status</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-teal-600">{availability.beds}</p>
                      <p className="text-sm text-gray-600">Available Beds</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{availability.capacity}</p>
                      <p className="text-sm text-gray-600">Total Capacity</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">Open</p>
                      <p className="text-sm text-gray-600">Status</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-900">{availability.hours}</p>
                      <p className="text-sm text-gray-600">Hours</p>
                    </div>
                  </div>
                </div>

                {/* Patients List */}
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Assigned Patients</h2>
                  <div className="space-y-4">
                    {patients.map((patient) => (
                      <div
                        key={patient.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          selectedPatient === patient.id
                            ? 'ring-2 ring-teal-500 shadow-lg'
                            : 'hover:shadow-md'
                        } ${getUrgencyColor(patient.urgency)}`}
                        onClick={() => setSelectedPatient(patient.id)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-lg">{patient.patientName}</h3>
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(patient.status)}`}>
                                {patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}
                              </span>
                            </div>
                            <p className="text-sm opacity-75">{patient.age} years old</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold opacity-75">Episode</p>
                            <p className="text-sm font-bold">{patient.episodeId}</p>
                          </div>
                        </div>

                        <div className="mb-3">
                          <p className="text-sm font-semibold mb-1">Symptoms:</p>
                          <p className="text-sm">{patient.symptoms}</p>
                        </div>

                        <div className="flex items-center justify-between text-xs opacity-75">
                          <span className="flex items-center gap-1">
                            <ClockIcon className="h-4 w-4" />
                            {patient.appointmentTime}
                          </span>
                          <span className={`px-2 py-1 rounded-full font-semibold ${
                            patient.urgency === 'emergency' ? 'bg-red-100 text-red-800' :
                            patient.urgency === 'urgent' ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {patient.urgency.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Patient Details */}
            <div className="lg:col-span-1">
              {selectedPatient ? (
                <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6 space-y-6">
                  {(() => {
                    const patient = patients.find(p => p.id === selectedPatient);
                    if (!patient) return null;

                    return (
                      <>
                        <h3 className="text-lg font-bold text-gray-900">Patient Details</h3>

                        {/* Patient Info */}
                        <div className="pb-6 border-b border-gray-200">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                              <UserIcon className="h-6 w-6 text-teal-600" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{patient.patientName}</p>
                              <p className="text-sm text-gray-600">{patient.age} years old</p>
                            </div>
                          </div>
                        </div>

                        {/* Contact */}
                        <div className="pb-6 border-b border-gray-200">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Contact:</p>
                          <a href={`tel:${patient.phone}`} className="flex items-center gap-2 text-teal-600 hover:text-teal-700">
                            <PhoneIcon className="h-5 w-5" />
                            <span>{patient.phone}</span>
                          </a>
                        </div>

                        {/* Appointment */}
                        <div className="pb-6 border-b border-gray-200">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Appointment:</p>
                          <div className="flex items-center gap-2 text-gray-900 mb-2">
                            <CalendarIcon className="h-5 w-5 text-gray-600" />
                            <span>{patient.appointmentTime}</span>
                          </div>
                        </div>

                        {/* Clinical Notes */}
                        <div className="pb-6 border-b border-gray-200">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Clinical Notes:</p>
                          <p className="text-sm text-gray-900">{patient.notes}</p>
                        </div>

                        {/* Symptoms */}
                        <div className="pb-6 border-b border-gray-200">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Reported Symptoms:</p>
                          <p className="text-sm text-gray-900">{patient.symptoms}</p>
                        </div>

                        {/* Action Buttons */}
                        {patient.status === 'pending' && (
                          <div className="space-y-2">
                            <button
                              onClick={() => handleAcceptReferral(patient.id)}
                              className="w-full px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <CheckCircleIcon className="h-5 w-5" />
                              Accept Referral
                            </button>
                            <button
                              onClick={() => handleRejectReferral(patient.id)}
                              className="w-full px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <XCircleIcon className="h-5 w-5" />
                              Reject Referral
                            </button>
                          </div>
                        )}

                        {(patient.status === 'confirmed' || patient.status === 'accepted') && (
                          <div className="space-y-2">
                            <button className="w-full px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors">
                              Record Outcome
                            </button>
                            <button className="w-full px-4 py-2 bg-gray-200 text-gray-900 font-semibold rounded-lg hover:bg-gray-300 transition-colors">
                              Reschedule
                            </button>
                          </div>
                        )}

                        {patient.status === 'rejected' && (
                          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-center">
                            <p className="text-sm font-semibold text-red-800">Referral Rejected</p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                  <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">Select a patient to view details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProviderPortal;
