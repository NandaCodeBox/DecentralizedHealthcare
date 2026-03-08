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
      symptoms: 'Chest pain, shortness of breath, sweating',
      primaryComplaint: 'Chest pain',
      duration: '30 minutes',
      severity: 9,
      urgencyLevel: 'emergency',
      aiAssessment: 'Possible cardiac event - requires immediate hospital admission',
      aiReasoning: 'Combination of chest pain, shortness of breath, and sweating are classic cardiac symptoms. High severity score and sudden onset indicate potential myocardial infarction.',
      confidence: 92,
      flagReason: null,
      timestamp: '2 minutes ago',
      status: 'pending',
      vitalSigns: { heartRate: 110, bloodPressure: '150/95', temperature: '98.6°F' },
    },
    {
      id: 2,
      patientName: 'Priya Singh',
      age: 32,
      symptoms: 'High fever, cough, body ache, dizziness',
      primaryComplaint: 'High fever',
      duration: '3 days',
      severity: 7,
      urgencyLevel: 'urgent',
      aiAssessment: 'Likely viral infection - recommend urgent care clinic',
      aiReasoning: 'Fever persisting for 3 days with respiratory symptoms suggests viral infection. Dizziness may indicate dehydration. Urgent care appropriate for symptom management.',
      confidence: 65,
      flagReason: 'Low confidence (< 70%) - Conflicting symptoms require human review',
      timestamp: '5 minutes ago',
      status: 'pending',
      vitalSigns: { heartRate: 95, bloodPressure: '120/80', temperature: '102.5°F' },
    },
    {
      id: 3,
      patientName: 'Amit Patel',
      age: 28,
      symptoms: 'Mild headache, fatigue, nausea',
      primaryComplaint: 'Headache',
      duration: '2 days',
      severity: 3,
      urgencyLevel: 'routine',
      aiAssessment: 'Minor illness - self-care recommended',
      aiReasoning: 'Low severity symptoms with gradual onset. No red flags present. Self-care with over-the-counter medication appropriate.',
      confidence: 78,
      flagReason: null,
      timestamp: '10 minutes ago',
      status: 'pending',
      vitalSigns: { heartRate: 72, bloodPressure: '118/75', temperature: '98.2°F' },
    },
    {
      id: 4,
      patientName: 'Sunita Reddy',
      age: 55,
      symptoms: 'Severe abdominal pain, vomiting, fever',
      primaryComplaint: 'Abdominal pain',
      duration: '6 hours',
      severity: 8,
      urgencyLevel: 'urgent',
      aiAssessment: 'Possible appendicitis or acute abdomen - urgent evaluation needed',
      aiReasoning: 'Severe abdominal pain with fever and vomiting requires urgent evaluation to rule out surgical emergency like appendicitis.',
      confidence: 68,
      flagReason: 'Low confidence (< 70%) - Symptoms could indicate multiple conditions',
      timestamp: '8 minutes ago',
      status: 'pending',
      vitalSigns: { heartRate: 105, bloodPressure: '130/85', temperature: '101.8°F' },
    },
  ]);

  const [selectedValidation, setSelectedValidation] = useState<number | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [newUrgencyLevel, setNewUrgencyLevel] = useState('');
  const [supervisorNotes, setSupervisorNotes] = useState('');

  const handleApprove = (id: number) => {
    setValidations(validations.map(v => 
      v.id === id ? { ...v, status: 'approved', supervisorNotes } : v
    ));
    setSupervisorNotes('');
    setSelectedValidation(null);
  };

  const handleReject = (id: number) => {
    if (!supervisorNotes.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    setValidations(validations.map(v => 
      v.id === id ? { ...v, status: 'rejected', supervisorNotes } : v
    ));
    setSupervisorNotes('');
    setSelectedValidation(null);
  };

  const handleOverride = (id: number) => {
    if (!overrideReason.trim() || !newUrgencyLevel) {
      alert('Please provide both new urgency level and reason for override');
      return;
    }
    setValidations(validations.map(v => 
      v.id === id ? { 
        ...v, 
        status: 'overridden', 
        urgencyLevel: newUrgencyLevel,
        supervisorNotes: overrideReason 
      } : v
    ));
    setOverrideReason('');
    setNewUrgencyLevel('');
    setSelectedValidation(null);
  };

  const handleEscalate = (id: number) => {
    if (!supervisorNotes.trim()) {
      alert('Please provide escalation notes');
      return;
    }
    setValidations(validations.map(v => 
      v.id === id ? { 
        ...v, 
        status: 'escalated',
        urgencyLevel: 'emergency',
        supervisorNotes 
      } : v
    ));
    setSupervisorNotes('');
    setSelectedValidation(null);
  };

  const pendingCount = validations.filter(v => v.status === 'pending').length;
  const emergencyCount = validations.filter(v => v.urgencyLevel === 'emergency' && v.status === 'pending').length;
  const lowConfidenceCount = validations.filter(v => v.confidence < 70 && v.status === 'pending').length;

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
      case 'escalated':
        return 'bg-red-100 text-red-800';
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
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold text-teal-600">{pendingCount}</div>
                    <div className="text-xs text-gray-600">Pending</div>
                  </div>
                  {emergencyCount > 0 && (
                    <div>
                      <div className="text-3xl font-bold text-red-600">{emergencyCount}</div>
                      <div className="text-xs text-gray-600">Emergency</div>
                    </div>
                  )}
                  {lowConfidenceCount > 0 && (
                    <div>
                      <div className="text-3xl font-bold text-orange-600">{lowConfidenceCount}</div>
                      <div className="text-xs text-gray-600">Low Confidence</div>
                    </div>
                  )}
                </div>
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

                    {validation.flagReason && (
                      <div className="mb-3 p-2 bg-orange-100 border-l-4 border-orange-500 rounded">
                        <p className="text-xs font-semibold text-orange-900 flex items-center gap-1">
                          <ExclamationTriangleIcon className="h-4 w-4" />
                          Flagged for Review
                        </p>
                        <p className="text-xs text-orange-800 mt-1">{validation.flagReason}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs opacity-75">
                      <span className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        {validation.timestamp}
                      </span>
                      <span className={`flex items-center gap-1 ${validation.confidence < 70 ? 'text-orange-600 font-bold' : ''}`}>
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
                          <div className="flex items-center gap-2 mb-3">
                            <SparklesIcon className="h-5 w-5 text-purple-600" />
                            <p className="text-sm font-semibold text-gray-700">AI Assessment:</p>
                          </div>
                          <p className="text-sm text-gray-900 mb-3">{validation.aiAssessment}</p>
                          
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-gray-600 mb-1">AI Reasoning:</p>
                            <p className="text-xs text-gray-700 bg-purple-50 p-2 rounded">{validation.aiReasoning}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${validation.confidence < 70 ? 'bg-orange-500' : 'bg-teal-600'}`}
                                style={{ width: `${validation.confidence}%` }}
                              />
                            </div>
                            <span className={`text-sm font-semibold ${validation.confidence < 70 ? 'text-orange-600' : 'text-gray-900'}`}>
                              {validation.confidence}%
                            </span>
                          </div>
                          
                          {validation.flagReason && (
                            <div className="mt-3 p-2 bg-orange-100 border-l-4 border-orange-500 rounded">
                              <p className="text-xs font-semibold text-orange-900">⚠️ Flagged for Review</p>
                              <p className="text-xs text-orange-800 mt-1">{validation.flagReason}</p>
                            </div>
                          )}
                        </div>

                        {/* Vital Signs */}
                        <div className="mb-6 pb-6 border-b border-gray-200">
                          <p className="text-sm font-semibold text-gray-700 mb-3">Vital Signs:</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-gray-50 p-2 rounded">
                              <p className="text-gray-600">Heart Rate</p>
                              <p className="font-bold text-gray-900">{validation.vitalSigns.heartRate} bpm</p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded">
                              <p className="text-gray-600">BP</p>
                              <p className="font-bold text-gray-900">{validation.vitalSigns.bloodPressure}</p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded col-span-2">
                              <p className="text-gray-600">Temperature</p>
                              <p className="font-bold text-gray-900">{validation.vitalSigns.temperature}</p>
                            </div>
                          </div>
                        </div>

                        {/* Symptom Details */}
                        <div className="mb-6 pb-6 border-b border-gray-200">
                          <p className="text-sm font-semibold text-gray-700 mb-2">Symptom Details:</p>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Primary Complaint:</span>
                              <span className="font-semibold text-gray-900">{validation.primaryComplaint}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Duration:</span>
                              <span className="font-semibold text-gray-900">{validation.duration}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Severity:</span>
                              <span className="font-semibold text-gray-900">{validation.severity}/10</span>
                            </div>
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

                        {/* Supervisor Notes */}
                        {validation.status === 'pending' && (
                          <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Supervisor Notes:
                            </label>
                            <textarea
                              value={supervisorNotes}
                              onChange={(e) => setSupervisorNotes(e.target.value)}
                              placeholder="Add your notes or reasoning..."
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                              rows={2}
                            />
                          </div>
                        )}

                        {/* Override Section */}
                        {validation.status === 'pending' && (
                          <div className="mb-6 p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <p className="text-sm font-semibold text-purple-900 mb-2">Override Assessment:</p>
                            <select
                              value={newUrgencyLevel}
                              onChange={(e) => setNewUrgencyLevel(e.target.value)}
                              className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm mb-2 focus:ring-2 focus:ring-purple-500"
                            >
                              <option value="">Select new urgency level...</option>
                              <option value="emergency">Emergency</option>
                              <option value="urgent">Urgent</option>
                              <option value="routine">Routine</option>
                              <option value="self-care">Self-Care</option>
                            </select>
                            <textarea
                              value={overrideReason}
                              onChange={(e) => setOverrideReason(e.target.value)}
                              placeholder="Explain why you're overriding the AI assessment..."
                              className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                              rows={2}
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
                              onClick={() => handleOverride(validation.id)}
                              disabled={!overrideReason.trim() || !newUrgencyLevel}
                              className="w-full px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              <ExclamationTriangleIcon className="h-5 w-5" />
                              Override Urgency
                            </button>

                            <button
                              onClick={() => handleEscalate(validation.id)}
                              disabled={!supervisorNotes.trim()}
                              className="w-full px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              🚨 Escalate to Emergency
                            </button>

                            <button
                              onClick={() => handleReject(validation.id)}
                              disabled={!supervisorNotes.trim()}
                              className="w-full px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              <XCircleIcon className="h-5 w-5" />
                              Reject & Request More Info
                            </button>
                          </div>
                        )}

                        {validation.status !== 'pending' && (
                          <div className={`px-4 py-3 rounded-lg text-center font-semibold ${getStatusBadge(validation.status)}`}>
                            {validation.status === 'approved' && '✓ Assessment Approved'}
                            {validation.status === 'rejected' && '✗ Assessment Rejected - More Info Requested'}
                            {validation.status === 'overridden' && `⚠ Overridden to: ${validation.urgencyLevel.toUpperCase()}`}
                            {validation.status === 'escalated' && '🚨 Escalated to Emergency'}
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
