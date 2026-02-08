import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  ClockIcon,
  UserIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

const SupervisorDashboard: React.FC = () => {
  const [validations, setValidations] = useState([
    {
      id: 1,
      patientName: 'Rajesh Kumar',
      age: 45,
      symptoms: 'Chest pain, shortness of breath',
      severity: 9,
      urgencyLevel: 'emergency',
      aiAssessment: 'Possible cardiac event - requires immediate hospital admission',
      confidence: 92,
      timestamp: '2 minutes ago',
      status: 'pending',
    },
    {
      id: 2,
      patientName: 'Priya Singh',
      age: 32,
      symptoms: 'High fever, cough, body ache',
      severity: 7,
      urgencyLevel: 'urgent',
      aiAssessment: 'Likely viral infection - recommend urgent care clinic',
      confidence: 85,
      timestamp: '5 minutes ago',
      status: 'pending',
    },
    {
      id: 3,
      patientName: 'Amit Patel',
      age: 28,
      symptoms: 'Mild headache, fatigue',
      severity: 3,
      urgencyLevel: 'routine',
      aiAssessment: 'Minor illness - self-care recommended',
      confidence: 78,
      timestamp: '10 minutes ago',
      status: 'pending',
    },
  ]);

  const [selectedValidation, setSelectedValidation] = useState<number | null>(null);
  const [overrideReason, setOverrideReason] = useState('');

  const handleApprove = (id: number) => {
    setValidations(validations.map(v => 
      v.id === id ? { ...v, status: 'approved' } : v
    ));
    setSelectedValidation(null);
  };

  const handleReject = (id: number) => {
    setValidations(validations.map(v => 
      v.id === id ? { ...v, status: 'rejected' } : v
    ));
    setSelectedValidation(null);
  };

  const handleOverride = (id: number) => {
    if (!overrideReason.trim()) {
      alert('Please provide a reason for override');
      return;
    }
    setValidations(validations.map(v => 
      v.id === id ? { ...v, status: 'overridden' } : v
    ));
    setOverrideReason('');
    setSelectedValidation(null);
  };

  const pendingCount = validations.filter(v => v.status === 'pending').length;
  const emergencyCount = validations.filter(v => v.urgencyLevel === 'emergency' && v.status === 'pending').length;

  const getUrgencyColor = (level: string) => {
    switch (level) {
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
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'overridden':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <Head>
        <title>Supervisor Dashboard - Healthcare OS</title>
        <meta name="description" content="Supervisor validation dashboard" />
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
                <h1 className="text-3xl font-bold text-gray-900">Supervisor Dashboard</h1>
                <p className="text-gray-600 mt-1">Review and validate patient triage assessments</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-teal-600">{pendingCount}</div>
                <div className="text-sm text-gray-600">Pending Validations</div>
                {emergencyCount > 0 && (
                  <div className="mt-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
                    {emergencyCount} Emergency
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Validation Queue */}
            <div className="lg:col-span-2">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Validation Queue</h2>
              <div className="space-y-4">
                {validations.map((validation) => (
                  <div
                    key={validation.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedValidation === validation.id
                        ? 'ring-2 ring-teal-500 shadow-lg'
                        : 'hover:shadow-md'
                    } ${getUrgencyColor(validation.urgencyLevel)}`}
                    onClick={() => setSelectedValidation(validation.id)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg">{validation.patientName}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(validation.status)}`}>
                            {validation.status.charAt(0).toUpperCase() + validation.status.slice(1)}
                          </span>
                        </div>
                        <p className="text-sm opacity-75">{validation.age} years old</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{validation.severity}/10</div>
                        <p className="text-xs opacity-75">Severity</p>
                      </div>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm font-semibold mb-1">Symptoms:</p>
                      <p className="text-sm">{validation.symptoms}</p>
                    </div>

                    <div className="flex items-center justify-between text-xs opacity-75">
                      <span className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        {validation.timestamp}
                      </span>
                      <span className="flex items-center gap-1">
                        <SparklesIcon className="h-4 w-4" />
                        {validation.confidence}% confidence
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Validation Details */}
            <div className="lg:col-span-1">
              {selectedValidation ? (
                <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
                  {(() => {
                    const validation = validations.find(v => v.id === selectedValidation);
                    if (!validation) return null;

                    return (
                      <>
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Assessment Details</h3>

                        {/* Patient Info */}
                        <div className="mb-6 pb-6 border-b border-gray-200">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
                              <UserIcon className="h-6 w-6 text-teal-600" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{validation.patientName}</p>
                              <p className="text-sm text-gray-600">{validation.age} years old</p>
                            </div>
                          </div>
                        </div>

                        {/* AI Assessment */}
                        <div className="mb-6 pb-6 border-b border-gray-200">
                          <p className="text-sm font-semibold text-gray-700 mb-2">AI Assessment:</p>
                          <p className="text-sm text-gray-900 mb-3">{validation.aiAssessment}</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-teal-600 h-2 rounded-full"
                                style={{ width: `${validation.confidence}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-gray-900">{validation.confidence}%</span>
                          </div>
                        </div>

                        {/* Urgency Level */}
                        <div className="mb-6 pb-6 border-b border-gray-200">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Recommended Urgency:</p>
                          <div className={`px-3 py-2 rounded-lg text-sm font-semibold text-center ${
                            validation.urgencyLevel === 'emergency' ? 'bg-red-100 text-red-800' :
                            validation.urgencyLevel === 'urgent' ? 'bg-orange-100 text-orange-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {validation.urgencyLevel.toUpperCase()}
                          </div>
                        </div>

                        {/* Override Reason */}
                        {validation.status === 'pending' && (
                          <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Override Reason (if needed):
                            </label>
                            <textarea
                              value={overrideReason}
                              onChange={(e) => setOverrideReason(e.target.value)}
                              placeholder="Explain why you're overriding the AI assessment..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              rows={3}
                            />
                          </div>
                        )}

                        {/* Action Buttons */}
                        {validation.status === 'pending' && (
                          <div className="space-y-2">
                            <button
                              onClick={() => handleApprove(validation.id)}
                              className="w-full px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <CheckCircleIcon className="h-5 w-5" />
                              Approve Assessment
                            </button>
                            <button
                              onClick={() => handleReject(validation.id)}
                              className="w-full px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <XCircleIcon className="h-5 w-5" />
                              Reject Assessment
                            </button>
                            <button
                              onClick={() => handleOverride(validation.id)}
                              disabled={!overrideReason.trim()}
                              className="w-full px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              <ExclamationTriangleIcon className="h-5 w-5" />
                              Override with Reason
                            </button>
                          </div>
                        )}

                        {validation.status !== 'pending' && (
                          <div className={`px-4 py-3 rounded-lg text-center font-semibold ${getStatusBadge(validation.status)}`}>
                            {validation.status === 'approved' && '✓ Assessment Approved'}
                            {validation.status === 'rejected' && '✗ Assessment Rejected'}
                            {validation.status === 'overridden' && '⚠ Assessment Overridden'}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-lg p-6 text-center">
                  <ExclamationTriangleIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">Select a validation to view details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SupervisorDashboard;
