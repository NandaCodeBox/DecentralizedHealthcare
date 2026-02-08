import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  UserGroupIcon,
  BuildingLibraryIcon,
  CogIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

const AdminConsole: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const stats = [
    { label: 'Total Patients', value: '2,543', change: '+12%' },
    { label: 'Active Episodes', value: '342', change: '+5%' },
    { label: 'Providers', value: '156', change: '+3%' },
    { label: 'System Health', value: '99.9%', change: 'Excellent' },
  ];

  const providers = [
    { id: 1, name: 'City General Hospital', type: 'Hospital', status: 'Active', beds: 45, capacity: 100 },
    { id: 2, name: 'Prime Care Clinic', type: 'Clinic', status: 'Active', beds: 12, capacity: 30 },
    { id: 3, name: 'MediCare Pharmacy', type: 'Pharmacy', status: 'Active', beds: 0, capacity: 50 },
  ];

  const users = [
    { id: 1, name: 'Dr. Priya Sharma', role: 'Supervisor', status: 'Active', lastLogin: '2 hours ago' },
    { id: 2, name: 'Dr. Rajesh Verma', role: 'Provider', status: 'Active', lastLogin: '30 minutes ago' },
    { id: 3, name: 'Admin User', role: 'Administrator', status: 'Active', lastLogin: '1 hour ago' },
  ];

  return (
    <>
      <Head>
        <title>Admin Console - Healthcare OS</title>
        <meta name="description" content="System administration and management" />
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
            <h1 className="text-3xl font-bold text-gray-900">Admin Console</h1>
            <p className="text-gray-600 mt-1">System management and configuration</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <p className="text-sm text-gray-600 mb-2">{stat.label}</p>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm font-semibold text-green-600">{stat.change}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="border-b border-gray-200 flex">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-4 font-semibold text-sm ${
                  activeTab === 'overview'
                    ? 'text-teal-600 border-b-2 border-teal-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <CogIcon className="h-5 w-5 inline mr-2" />
                Overview
              </button>
              <button
                onClick={() => setActiveTab('providers')}
                className={`px-6 py-4 font-semibold text-sm ${
                  activeTab === 'providers'
                    ? 'text-teal-600 border-b-2 border-teal-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <BuildingLibraryIcon className="h-5 w-5 inline mr-2" />
                Providers
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`px-6 py-4 font-semibold text-sm ${
                  activeTab === 'users'
                    ? 'text-teal-600 border-b-2 border-teal-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <UserGroupIcon className="h-5 w-5 inline mr-2" />
                Users
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`px-6 py-4 font-semibold text-sm ${
                  activeTab === 'logs'
                    ? 'text-teal-600 border-b-2 border-teal-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <DocumentTextIcon className="h-5 w-5 inline mr-2" />
                Audit Logs
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4">System Configuration</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <span className="text-sm font-semibold text-gray-900">API Rate Limit</span>
                        <input type="text" defaultValue="10000 req/min" className="px-3 py-1 border border-gray-300 rounded text-sm" />
                      </div>
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <span className="text-sm font-semibold text-gray-900">Session Timeout</span>
                        <input type="text" defaultValue="30 minutes" className="px-3 py-1 border border-gray-300 rounded text-sm" />
                      </div>
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <span className="text-sm font-semibold text-gray-900">Backup Frequency</span>
                        <input type="text" defaultValue="Daily at 2 AM" className="px-3 py-1 border border-gray-300 rounded text-sm" />
                      </div>
                    </div>
                  </div>
                  <button className="px-6 py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors">
                    Save Configuration
                  </button>
                </div>
              )}

              {activeTab === 'providers' && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Provider Management</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Name</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Type</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Beds</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {providers.map((provider) => (
                          <tr key={provider.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="py-3 px-4 text-gray-900">{provider.name}</td>
                            <td className="py-3 px-4 text-gray-600">{provider.type}</td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                                {provider.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-900">{provider.beds}/{provider.capacity}</td>
                            <td className="py-3 px-4">
                              <button className="text-teal-600 hover:text-teal-700 font-semibold text-xs">Edit</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'users' && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">User Management</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Name</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Role</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Last Login</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((user) => (
                          <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50">
                            <td className="py-3 px-4 text-gray-900">{user.name}</td>
                            <td className="py-3 px-4 text-gray-600">{user.role}</td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                                {user.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-600">{user.lastLogin}</td>
                            <td className="py-3 px-4">
                              <button className="text-teal-600 hover:text-teal-700 font-semibold text-xs">Manage</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'logs' && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Audit Logs</h3>
                  <div className="space-y-3">
                    {[
                      { time: '2:45 PM', action: 'User login', user: 'Dr. Priya Sharma', status: 'Success' },
                      { time: '2:30 PM', action: 'Assessment approved', user: 'Dr. Priya Sharma', status: 'Success' },
                      { time: '2:15 PM', action: 'Patient data accessed', user: 'Dr. Rajesh Verma', status: 'Success' },
                      { time: '2:00 PM', action: 'System backup', user: 'System', status: 'Success' },
                    ].map((log, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{log.action}</p>
                          <p className="text-xs text-gray-600">{log.user}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-600">{log.time}</p>
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                            {log.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminConsole;
