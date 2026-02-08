import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { ArrowLeftIcon, ChartBarIcon } from '@heroicons/react/24/outline';

const AnalyticsDashboard: React.FC = () => {
  return (
    <>
      <Head>
        <title>Analytics Dashboard - Healthcare OS</title>
        <meta name="description" content="System analytics and insights" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Link href="/" className="inline-flex items-center text-teal-600 hover:text-teal-700 mb-4">
              <ArrowLeftIcon className="h-5 w-5 mr-2" />
              Back to Home
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">System metrics and insights</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-600 mb-2">Total Patients</p>
              <p className="text-4xl font-bold text-teal-600 mb-2">2,543</p>
              <p className="text-sm text-green-600">↑ 12% from last month</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-600 mb-2">Active Episodes</p>
              <p className="text-4xl font-bold text-blue-600 mb-2">342</p>
              <p className="text-sm text-green-600">↑ 5% from last week</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-600 mb-2">Avg Response Time</p>
              <p className="text-4xl font-bold text-purple-600 mb-2">2.3s</p>
              <p className="text-sm text-green-600">↓ 15% improvement</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-sm text-gray-600 mb-2">Success Rate</p>
              <p className="text-4xl font-bold text-green-600 mb-2">98.5%</p>
              <p className="text-sm text-green-600">↑ 2% from last month</p>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Patient Distribution */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Patient Distribution by Urgency</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-900">Emergency</span>
                    <span className="text-sm font-bold text-red-600">15%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-red-600 h-2 rounded-full" style={{ width: '15%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-900">Urgent</span>
                    <span className="text-sm font-bold text-orange-600">35%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-orange-600 h-2 rounded-full" style={{ width: '35%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-900">Routine</span>
                    <span className="text-sm font-bold text-blue-600">40%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '40%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-900">Self-Care</span>
                    <span className="text-sm font-bold text-green-600">10%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '10%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Provider Performance */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Top Providers by Volume</h3>
              <div className="space-y-4">
                {[
                  { name: 'City General Hospital', patients: 245, rating: 4.8 },
                  { name: 'Prime Care Clinic', patients: 189, rating: 4.6 },
                  { name: 'Advanced Care Hospital', patients: 156, rating: 4.7 },
                  { name: 'Wellness Diagnostic', patients: 134, rating: 4.5 },
                ].map((provider, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{provider.name}</p>
                      <p className="text-xs text-gray-600">{provider.patients} patients</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-yellow-500">⭐ {provider.rating}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Trends */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Weekly Trends</h3>
            <div className="space-y-4">
              {[
                { day: 'Monday', episodes: 45, completed: 42, success: '93%' },
                { day: 'Tuesday', episodes: 52, completed: 50, success: '96%' },
                { day: 'Wednesday', episodes: 48, completed: 47, success: '98%' },
                { day: 'Thursday', episodes: 55, completed: 54, success: '98%' },
                { day: 'Friday', episodes: 61, completed: 60, success: '98%' },
                { day: 'Saturday', episodes: 38, completed: 37, success: '97%' },
                { day: 'Sunday', episodes: 32, completed: 31, success: '97%' },
              ].map((trend, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-semibold text-gray-900 w-20">{trend.day}</span>
                  <div className="flex-1 flex items-center gap-4 ml-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-600">Episodes: {trend.episodes}</span>
                        <span className="text-xs text-gray-600">Completed: {trend.completed}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-teal-600 h-2 rounded-full"
                          style={{ width: `${(trend.completed / trend.episodes) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-green-600 ml-4">{trend.success}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AnalyticsDashboard;
