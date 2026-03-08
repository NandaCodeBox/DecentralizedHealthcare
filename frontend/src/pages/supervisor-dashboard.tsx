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
import { useStaticTranslation } from '@/hooks/useStaticTranslation';

interface VitalSigns {
  heartRate: number;
  bloodPressure: string;
  temperature: string;
}

interface Validation {
  id: number;
  patientName: string;
  age: number;
  symptoms: string;
  primaryComplaint: string;
  duration: string;
  severity: number;
  urgencyLevel: string;
  aiAssessment: string;
  aiReasoning: string;
  confidence: number;
  flagReason: string | null;
  timestamp: string;
  status: string;
  vitalSigns: VitalSigns;
  agenticAIDecision?: string | null;
  agenticAIReasoning?: string | null;
  supervisorNotes?: string;
}

const SupervisorDashboard: React.FC = () => {
  const { t } = useStaticTranslation();
  const [agenticAIEnabled, setAgenticAIEnabled] = useState(true);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [validations, setValidations] = useState<Validation[]>([
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
      agenticAIDecision: null,
      agenticAIReasoning: null,
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
      agenticAIDecision: null,
      agenticAIReasoning: null,
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

  // Agentic AI function with multi-level reasoning
  const runAgenticAI = async (validation: Validation) => {
    // Call AWS Lambda Supervisor Validation Agent
    const agentUrl = process.env.NEXT_PUBLIC_SUPERVISOR_AGENT_URL || 'https://35v66sz7u43rqq67e5fqmh6yeu0svwme.lambda-url.us-east-1.on.aws/';
    
    try {
      const response = await fetch(agentUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ validation }),
      });

      if (response.ok) {
        const result = await response.json();
        return {
          decision: result.decision,
          reasoning: result.reasoning,
          autoApproved: result.autoApproved,
        };
      }
    } catch (error) {
      console.error('Error calling Agentic AI agent:', error);
    }

    // Fallback to client-side reasoning if API fails
    const reasoning: string[] = [];
    let autoApprove = false;
    let confidence = validation.confidence;

    // Level 1: Confidence Check
    if (confidence >= 85) {
      reasoning.push(`High AI confidence (${confidence}%) indicates reliable assessment`);
      autoApprove = true;
    } else if (confidence >= 70) {
      reasoning.push(`Moderate confidence (${confidence}%) - proceeding with additional checks`);
    } else {
      reasoning.push(`Low confidence (${confidence}%) - requires human review`);
      return {
        decision: 'escalate_to_human',
        reasoning: reasoning.join('. ') + '. Human expertise needed for accurate assessment.',
        autoApproved: false,
      };
    }

    // Level 2: Severity Analysis
    if (validation.severity >= 8) {
      reasoning.push('High severity score warrants immediate attention');
      if (validation.urgencyLevel === 'emergency') {
        reasoning.push('Emergency classification aligns with severity');
        autoApprove = true;
      }
    } else if (validation.severity <= 4) {
      reasoning.push('Low severity indicates routine care appropriate');
      autoApprove = true;
    }

    // Level 3: Pattern Matching (check for common scenarios)
    const commonPatterns = [
      { symptoms: ['fever', 'cough'], urgency: 'urgent', confidence: 75 },
      { symptoms: ['headache', 'fatigue'], urgency: 'routine', confidence: 70 },
      { symptoms: ['chest pain', 'shortness of breath'], urgency: 'emergency', confidence: 90 },
    ];

    const symptomsLower = validation.symptoms.toLowerCase();
    const matchedPattern = commonPatterns.find(pattern =>
      pattern.symptoms.every(s => symptomsLower.includes(s))
    );

    if (matchedPattern) {
      reasoning.push(`Matches known pattern for ${matchedPattern.urgency} care`);
      if (validation.urgencyLevel === matchedPattern.urgency) {
        reasoning.push('Assessment aligns with established clinical patterns');
        autoApprove = true;
      }
    }

    // Level 4: Vital Signs Check
    const hr = validation.vitalSigns.heartRate;
    const temp = parseFloat(validation.vitalSigns.temperature);
    
    if (hr > 100 || temp > 101) {
      reasoning.push('Elevated vital signs support urgency assessment');
    } else if (hr < 90 && temp < 100) {
      reasoning.push('Normal vital signs consistent with lower urgency');
    }

    // Level 5: Flag Check
    if (validation.flagReason) {
      reasoning.push('Case flagged for review - escalating to human supervisor');
      return {
        decision: 'escalate_to_human',
        reasoning: reasoning.join('. ') + '. ' + validation.flagReason,
        autoApproved: false,
      };
    }

    // Final Decision
    if (autoApprove && confidence >= 75) {
      reasoning.push('All checks passed - auto-approving assessment');
      return {
        decision: 'auto_approve',
        reasoning: reasoning.join('. ') + '. Assessment validated through multi-level AI reasoning.',
        autoApproved: true,
      };
    } else {
      reasoning.push('Uncertain factors detected - human review recommended');
      return {
        decision: 'escalate_to_human',
        reasoning: reasoning.join('. ') + '. Human expertise will ensure optimal care decision.',
        autoApproved: false,
      };
    }
  };

  // Auto-run Agentic AI on pending cases
  React.useEffect(() => {
    if (!agenticAIEnabled) return;

    const pendingValidations = validations.filter(v => 
      v.status === 'pending' && !v.agenticAIDecision
    );

    if (pendingValidations.length > 0 && !aiProcessing) {
      setAiProcessing(true);
      
      // Process each validation with AWS Lambda agent
      Promise.all(
        pendingValidations.map(async (v) => {
          const aiResult = await runAgenticAI(v);
          return { id: v.id, aiResult };
        })
      ).then((results) => {
        setValidations(prevValidations => 
          prevValidations.map(v => {
            const result = results.find(r => r.id === v.id);
            if (result && v.status === 'pending' && !v.agenticAIDecision) {
              const aiResult = result.aiResult;
              
              // Auto-approve if AI decides
              if (aiResult.autoApproved) {
                return {
                  ...v,
                  agenticAIDecision: aiResult.decision,
                  agenticAIReasoning: aiResult.reasoning,
                  status: 'approved',
                  supervisorNotes: 'Auto-approved by Agentic AI',
                };
              } else {
                return {
                  ...v,
                  agenticAIDecision: aiResult.decision,
                  agenticAIReasoning: aiResult.reasoning,
                };
              }
            }
            return v;
          })
        );
        setAiProcessing(false);
      });
    }
  }, [validations, agenticAIEnabled, aiProcessing]);

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
  const aiApprovedCount = validations.filter(v => v.status === 'approved' && v.supervisorNotes === 'Auto-approved by Agentic AI').length;
  const totalProcessed = validations.filter(v => v.status !== 'pending').length;
  const aiApprovalRate = totalProcessed > 0 ? Math.round((aiApprovedCount / totalProcessed) * 100) : 0;

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
        <title>Supervisor Dashboard - Arogya.ai</title>
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
                  {t('back_to_home')}
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">Supervisor Dashboard</h1>
                <p className="text-gray-600 mt-1">Review and validate patient triage assessments</p>
                
                {/* Agentic AI Toggle */}
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={() => setAgenticAIEnabled(!agenticAIEnabled)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
                      agenticAIEnabled
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <SparklesIcon className="h-5 w-5" />
                    Agentic AI: {agenticAIEnabled ? 'ON' : 'OFF'}
                  </button>
                  {aiProcessing && (
                    <span className="text-sm text-purple-600 font-semibold animate-pulse">
                      🤖 AI Processing...
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
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
                  {agenticAIEnabled && (
                    <>
                      <div>
                        <div className="text-3xl font-bold text-purple-600">{aiApprovedCount}</div>
                        <div className="text-xs text-gray-600">AI Approved</div>
                      </div>
                      <div>
                        <div className="text-3xl font-bold text-green-600">{aiApprovalRate}%</div>
                        <div className="text-xs text-gray-600">AI Rate</div>
                      </div>
                    </>
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-lg">{validation.patientName}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(validation.status)}`}>
                            {validation.status.charAt(0).toUpperCase() + validation.status.slice(1)}
                          </span>
                          {validation.agenticAIDecision === 'auto_approve' && validation.status === 'approved' && (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 flex items-center gap-1">
                              <SparklesIcon className="h-3 w-3" />
                              AI Approved
                            </span>
                          )}
                          {validation.agenticAIDecision === 'escalate_to_human' && validation.status === 'pending' && (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 flex items-center gap-1">
                              <UserIcon className="h-3 w-3" />
                              Human Review
                            </span>
                          )}
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

                    {validation.agenticAIReasoning && (
                      <div className="mb-3 p-2 bg-purple-50 border-l-4 border-purple-500 rounded">
                        <p className="text-xs font-semibold text-purple-900 flex items-center gap-1">
                          <SparklesIcon className="h-4 w-4" />
                          Agentic AI Analysis
                        </p>
                        <p className="text-xs text-purple-800 mt-1">{validation.agenticAIReasoning}</p>
                      </div>
                    )}

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

                          {validation.agenticAIReasoning && (
                            <div className="mb-3">
                              <p className="text-xs font-semibold text-purple-700 mb-1 flex items-center gap-1">
                                <SparklesIcon className="h-4 w-4" />
                                Agentic AI Multi-Level Analysis:
                              </p>
                              <p className="text-xs text-purple-900 bg-purple-100 p-2 rounded border border-purple-300">
                                {validation.agenticAIReasoning}
                              </p>
                              {validation.agenticAIDecision === 'auto_approve' && (
                                <div className="mt-2 px-3 py-2 bg-green-50 border border-green-300 rounded flex items-center gap-2">
                                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                                  <span className="text-xs font-semibold text-green-800">
                                    ✓ Auto-Approved by Agentic AI
                                  </span>
                                </div>
                              )}
                              {validation.agenticAIDecision === 'escalate_to_human' && (
                                <div className="mt-2 px-3 py-2 bg-orange-50 border border-orange-300 rounded flex items-center gap-2">
                                  <UserIcon className="h-5 w-5 text-orange-600" />
                                  <span className="text-xs font-semibold text-orange-800">
                                    ⚠ Escalated for Human Review
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

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
                              data-testid="approve-button"
                              onClick={() => handleApprove(validation.id)}
                              className="w-full px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                            >
                              <CheckCircleIcon className="h-5 w-5" />
                              Approve Assessment
                            </button>
                            
                            <button
                              data-testid="override-button"
                              onClick={() => handleOverride(validation.id)}
                              disabled={!overrideReason.trim() || !newUrgencyLevel}
                              className="w-full px-4 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              <ExclamationTriangleIcon className="h-5 w-5" />
                              Override Urgency
                            </button>

                            <button
                              data-testid="escalate-button"
                              onClick={() => handleEscalate(validation.id)}
                              disabled={!supervisorNotes.trim()}
                              className="w-full px-4 py-2 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                              🚨 Escalate to Emergency
                            </button>

                            <button
                              data-testid="reject-button"
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
