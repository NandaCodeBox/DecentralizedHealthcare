import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeftIcon, CalendarIcon, ClockIcon, UserIcon } from '@heroicons/react/24/outline';

const AppointmentsPage: React.FC = () => {
  const [appointments] = useState([
    {
      id: 1,
      date: '2024-02-07',
      time: '11:00 AM',
      doctor: 'Dr. Rajesh Verma',
      specialty: 'Cardiology',
      facility: 'City General Hospital',
      status: 'confirmed',
      type: 'Consultation',
    },
    {
      id: 2,
      date: '2024-02-10',
      time: '02:00 PM',
      doctor: 'Dr. Priya Singh',
      specialty: 'General Practice',
      facility: 'Prime Care Clinic',
      status: 'confirmed',
      type: 'Follow-up',
    },
    {
      id: 3,
      date: '2024-02-15',
      time: '10:30 AM',
      doctor: 'Dr. Amit Patel',
      specialty: 'Orthopedics',
      facility: 'Advanced Care Hospital',
      status: 'pending',
      type: 'Consultation',
    },
  ]);

  return (
    <>
      <Head>
        <title>Appointments - Healthcare OS</title>
        <meta name="description" content="Manage your appointments" />
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
            <h1 className="text-3xl font-bold text-gray-900">Appointments</h1>
            <p className="text-gray-600 mt-1">Schedule and manage your healthcare appointments</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Schedule New Appointment */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Schedule New Appointment</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="date"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <input
                type="time"
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
              <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                <option>Select Specialty</option>
                <option>Cardiology</option>
                <option>General Practice</option>
                <option>Orthopedics</option>
              </select>
              <button className="px-6 py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors">
                Search Availability
              </button>
            </div>
          </div>

          {/* Appointments List */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Your Appointments</h2>
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{appointment.type}</h3>
                    <p className="text-sm text-gray-600">{appointment.facility}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      appointment.status === 'confirmed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-teal-600" />
                    <div>
                      <p className="text-xs text-gray-600">Date</p>
                      <p className="text-sm font-semibold text-gray-900">{appointment.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ClockIcon className="h-5 w-5 text-teal-600" />
                    <div>
                      <p className="text-xs text-gray-600">Time</p>
                      <p className="text-sm font-semibold text-gray-900">{appointment.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserIcon className="h-5 w-5 text-teal-600" />
                    <div>
                      <p className="text-xs text-gray-600">Doctor</p>
                      <p className="text-sm font-semibold text-gray-900">{appointment.doctor}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button className="px-4 py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors text-sm">
                    Reschedule
                  </button>
                  <button className="px-4 py-2 bg-gray-200 text-gray-900 font-semibold rounded-lg hover:bg-gray-300 transition-colors text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default AppointmentsPage;
