// Sample test data for Healthcare OS application
import { CareEpisode, Provider, Patient } from '@/types';

// Sample User Profile Data
export const sampleUserProfile = {
  personalInfo: {
    name: 'Priya Sharma',
    age: '32',
    gender: 'Female',
    location: 'Mumbai, Maharashtra',
    phone: '+91 98765 43210',
    email: 'priya.sharma@email.com',
    emergencyContact: 'Raj Sharma (Husband) - +91 98765 43211',
  },
  medicalInfo: {
    medicalConditions: 'Type 2 Diabetes, Hypertension',
    medications: 'Metformin 500mg twice daily, Amlodipine 5mg once daily',
    allergies: 'Penicillin, Shellfish',
    insurance: 'Star Health Insurance - Policy #SH123456789',
  },
  preferences: {
    preferredLanguage: 'Hindi',
    providerGender: 'Female',
    maxTravelDistance: '10 km',
    costSensitivity: 'Balanced',
  },
};

// Sample Care Episodes Data
export const sampleCareEpisodes: CareEpisode[] = [
  {
    episodeId: 'EP001',
    patientId: 'PAT001',
    status: 'completed',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-16T14:45:00Z',
    symptoms: {
      primaryComplaint: 'Severe headache with nausea and sensitivity to light',
      duration: '6to24Hours',
      severity: 8,
      associatedSymptoms: 'Nausea, vomiting, light sensitivity, neck stiffness',
      medicalHistory: 'History of migraines, currently taking diabetes medication',
      inputMethod: 'text',
    },
    triage: {
      urgencyLevel: 'urgent',
      ruleBasedScore: 85,
      aiAssessment: {
        used: true,
        confidence: 0.85,
        reasoning: 'Severe headache with neurological symptoms requires urgent evaluation to rule out serious conditions',
      },
      humanValidation: {
        supervisorId: 'SUP001',
        approved: true,
        timestamp: '2024-01-15T11:00:00Z',
      },
    },
    interactions: [
      {
        timestamp: '2024-01-15T10:30:00Z',
        type: 'symptom_report',
        actor: 'patient',
        details: { source: 'patient_app' },
      },
      {
        timestamp: '2024-01-15T10:45:00Z',
        type: 'triage_assessment',
        actor: 'system',
        details: { urgency: 'urgent', confidence: 0.85 },
      },
      {
        timestamp: '2024-01-15T15:30:00Z',
        type: 'provider_consultation',
        actor: 'provider',
        details: { provider: 'Dr. Rajesh Kumar', diagnosis: 'Severe migraine episode' },
      },
    ],
    carePathway: {
      recommendedLevel: 'urgent_care',
      assignedProvider: 'PROV001',
      alternativeProviders: ['PROV002'],
      estimatedCost: 1500,
      expectedDuration: '2-4 hours',
    },
    outcome: {
      resolution: 'Severe migraine with aura - treated with sumatriptan, advised rest in dark room',
      followUpRequired: true,
      patientSatisfaction: 4,
      costActual: 1200,
    },
  },
  {
    episodeId: 'EP002',
    patientId: 'PAT001',
    status: 'active',
    createdAt: '2024-01-28T08:15:00Z',
    updatedAt: '2024-01-28T08:15:00Z',
    symptoms: {
      primaryComplaint: 'Persistent cough with fever for 3 days',
      duration: '3to7Days',
      severity: 6,
      associatedSymptoms: 'Fever (101°F), fatigue, mild chest discomfort, loss of appetite',
      medicalHistory: 'Diabetes, recent travel history',
      inputMethod: 'text',
    },
    triage: {
      urgencyLevel: 'routine',
      ruleBasedScore: 65,
      aiAssessment: {
        used: true,
        confidence: 0.78,
        reasoning: 'Respiratory symptoms with fever suggest possible respiratory infection. Routine care appropriate given stable vital signs.',
      },
    },
    interactions: [
      {
        timestamp: '2024-01-28T08:15:00Z',
        type: 'symptom_report',
        actor: 'patient',
        details: { source: 'patient_app' },
      },
      {
        timestamp: '2024-01-28T08:30:00Z',
        type: 'triage_assessment',
        actor: 'system',
        details: { urgency: 'routine', confidence: 0.78 },
      },
    ],
    carePathway: {
      recommendedLevel: 'primary_care',
      alternativeProviders: ['PROV001', 'PROV003'],
      estimatedCost: 800,
      expectedDuration: '24-48 hours',
    },
  },
  {
    episodeId: 'EP003',
    patientId: 'PAT001',
    status: 'escalated',
    createdAt: '2024-01-20T14:20:00Z',
    updatedAt: '2024-01-21T09:30:00Z',
    symptoms: {
      primaryComplaint: 'Chest pain and shortness of breath',
      duration: '1to6Hours',
      severity: 9,
      associatedSymptoms: 'Sweating, dizziness, left arm pain',
      medicalHistory: 'Diabetes, hypertension, family history of heart disease',
      inputMethod: 'text',
    },
    triage: {
      urgencyLevel: 'emergency',
      ruleBasedScore: 95,
      aiAssessment: {
        used: true,
        confidence: 0.95,
        reasoning: 'Chest pain with associated symptoms in high-risk patient suggests possible acute coronary syndrome. Immediate emergency care required.',
      },
      humanValidation: {
        supervisorId: 'SUP002',
        approved: true,
        timestamp: '2024-01-20T14:25:00Z',
      },
    },
    interactions: [
      {
        timestamp: '2024-01-20T14:20:00Z',
        type: 'symptom_report',
        actor: 'patient',
        details: { source: 'patient_app' },
      },
      {
        timestamp: '2024-01-20T14:25:00Z',
        type: 'emergency_alert',
        actor: 'system',
        details: { alert_type: 'cardiac_emergency', emergency_services_notified: true },
      },
      {
        timestamp: '2024-01-20T16:45:00Z',
        type: 'hospital_admission',
        actor: 'provider',
        details: { hospital: 'Apollo Hospital Mumbai', department: 'Emergency' },
      },
    ],
    carePathway: {
      recommendedLevel: 'emergency_care',
      assignedProvider: 'PROV003',
      alternativeProviders: [],
      estimatedCost: 50000,
      expectedDuration: 'immediate',
    },
    outcome: {
      resolution: 'Non-ST elevation myocardial infarction (NSTEMI) - cardiac catheterization, stent placement, medication therapy',
      followUpRequired: true,
      patientSatisfaction: 5,
      costActual: 45000,
    },
  },
];

// Sample Healthcare Providers Data
export const sampleProviders: Provider[] = [
  {
    providerId: 'PROV001',
    type: 'clinic',
    name: 'Kumar Clinic - Dr. Rajesh Kumar',
    location: {
      address: 'Kumar Clinic, Bandra West, Mumbai',
      state: 'Maharashtra',
      district: 'Mumbai',
      pincode: '400050',
      coordinates: { lat: 19.0596, lng: 72.8295 },
    },
    capabilities: {
      specialties: ['General Medicine', 'Internal Medicine'],
      services: ['Consultation', 'Basic Diagnostics', 'Prescription'],
      equipment: ['BP Monitor', 'Stethoscope', 'Thermometer', 'Pulse Oximeter'],
      languages: ['English', 'Hindi', 'Marathi'],
    },
    capacity: {
      dailyPatientCapacity: 50,
      currentLoad: 30,
    },
    qualityMetrics: {
      rating: 4.8,
      patientReviews: 234,
      successRate: 92,
      averageWaitTime: 15,
    },
    costStructure: {
      consultationFee: 800,
      insuranceAccepted: ['Star Health', 'HDFC Ergo', 'ICICI Lombard'],
      paymentMethods: ['Cash', 'Card', 'UPI', 'Insurance'],
    },
    availability: {
      hours: {
        monday: '9:00-18:00',
        tuesday: '9:00-18:00',
        wednesday: '9:00-18:00',
        thursday: '9:00-18:00',
        friday: '9:00-18:00',
        saturday: '9:00-14:00',
        sunday: 'closed',
      },
      emergencyAvailable: false,
      lastUpdated: '2024-01-28T08:00:00Z',
    },
    credentials: {
      licenses: ['MCI Registration', 'Maharashtra Medical Council'],
      certifications: ['MBBS', 'MD Internal Medicine'],
      verified: true,
    },
    distance: 2.3,
    createdAt: '2023-01-15T00:00:00Z',
    updatedAt: '2024-01-28T08:00:00Z',
  },
  {
    providerId: 'PROV002',
    type: 'specialist',
    name: 'Neuro Care Center - Dr. Anjali Patel',
    location: {
      address: 'Neuro Care Center, Powai, Mumbai',
      state: 'Maharashtra',
      district: 'Mumbai',
      pincode: '400076',
      coordinates: { lat: 19.1176, lng: 72.9060 },
    },
    capabilities: {
      specialties: ['Neurology', 'Neurological Disorders'],
      services: ['Neurological Consultation', 'EEG', 'Nerve Conduction Studies'],
      equipment: ['EEG Machine', 'EMG Equipment', 'Neurological Examination Tools'],
      languages: ['English', 'Hindi', 'Gujarati'],
    },
    capacity: {
      dailyPatientCapacity: 25,
      currentLoad: 18,
    },
    qualityMetrics: {
      rating: 4.9,
      patientReviews: 156,
      successRate: 95,
      averageWaitTime: 20,
    },
    costStructure: {
      consultationFee: 1500,
      insuranceAccepted: ['Star Health', 'HDFC Ergo', 'Max Bupa'],
      paymentMethods: ['Cash', 'Card', 'UPI', 'Insurance'],
    },
    availability: {
      hours: {
        monday: '10:00-17:00',
        tuesday: '10:00-17:00',
        wednesday: '10:00-17:00',
        thursday: '10:00-17:00',
        friday: '10:00-17:00',
        saturday: '10:00-14:00',
        sunday: 'closed',
      },
      emergencyAvailable: false,
      lastUpdated: '2024-01-28T08:00:00Z',
    },
    credentials: {
      licenses: ['MCI Registration', 'Maharashtra Medical Council'],
      certifications: ['MBBS', 'DM Neurology'],
      verified: true,
    },
    distance: 8.7,
    createdAt: '2023-03-20T00:00:00Z',
    updatedAt: '2024-01-28T08:00:00Z',
  },
  {
    providerId: 'PROV003',
    type: 'hospital',
    name: 'Heart Care Hospital - Dr. Priya Menon',
    location: {
      address: 'Heart Care Hospital, Andheri East, Mumbai',
      state: 'Maharashtra',
      district: 'Mumbai',
      pincode: '400069',
      coordinates: { lat: 19.1136, lng: 72.8697 },
    },
    capabilities: {
      specialties: ['Cardiology', 'Cardiac Surgery', 'Emergency Medicine'],
      services: ['Cardiac Consultation', 'ECG', 'Echocardiography', 'Cardiac Catheterization'],
      equipment: ['ECG Machine', 'Echo Machine', 'Cath Lab', 'ICU Equipment'],
      languages: ['English', 'Hindi', 'Malayalam'],
    },
    capacity: {
      totalBeds: 100,
      availableBeds: 15,
      dailyPatientCapacity: 80,
      currentLoad: 65,
    },
    qualityMetrics: {
      rating: 4.7,
      patientReviews: 298,
      successRate: 94,
      averageWaitTime: 30,
    },
    costStructure: {
      consultationFee: 2000,
      insuranceAccepted: ['Star Health', 'HDFC Ergo', 'ICICI Lombard', 'Max Bupa'],
      paymentMethods: ['Cash', 'Card', 'UPI', 'Insurance', 'EMI'],
    },
    availability: {
      hours: {
        monday: '24/7',
        tuesday: '24/7',
        wednesday: '24/7',
        thursday: '24/7',
        friday: '24/7',
        saturday: '24/7',
        sunday: '24/7',
      },
      emergencyAvailable: true,
      lastUpdated: '2024-01-28T08:00:00Z',
    },
    credentials: {
      licenses: ['Hospital License', 'NABH Accreditation'],
      certifications: ['ISO 9001', 'JCI Accreditation'],
      verified: true,
    },
    distance: 5.2,
    createdAt: '2022-06-10T00:00:00Z',
    updatedAt: '2024-01-28T08:00:00Z',
  },
];

// Sample Symptom Intake Data
export const sampleSymptomIntake = {
  primaryComplaint: 'I have been experiencing severe stomach pain and nausea since yesterday morning',
  duration: '1to3Days',
  severity: 7,
  associatedSymptoms: 'Nausea, vomiting, loss of appetite, mild fever',
  medicalHistory: 'No significant medical history. Taking multivitamins daily.',
  inputMethod: 'text' as const,
};

// Sample Triage Results
export const sampleTriageResults = {
  urgencyLevel: 'urgent',
  confidence: 0.82,
  reasoning: 'Severe abdominal pain with systemic symptoms in the context described suggests possible gallbladder inflammation or other serious abdominal condition requiring urgent evaluation.',
  recommendations: [
    'Seek medical attention within 2-4 hours',
    'Avoid fatty foods and large meals',
    'Stay hydrated with clear fluids',
    'Monitor for worsening symptoms',
  ],
  redFlags: [
    'Severe persistent pain',
    'Vomiting preventing fluid intake',
    'Signs of dehydration',
  ],
  selfCareInstructions: [
    'Apply heat pad to abdomen for comfort',
    'Sip clear fluids frequently',
    'Rest in comfortable position',
    'Avoid solid foods until seen by provider',
  ],
  estimatedWaitTime: '2-4 hours for urgent care',
  followUpInstructions: 'Return immediately if pain becomes unbearable or if you develop high fever',
};

// Sample Settings Data
export const sampleSettings = {
  language: 'en',
  notifications: {
    push: true,
    email: true,
    sms: false,
    careUpdates: true,
    appointments: true,
  },
  privacy: {
    shareDataForResearch: false,
    allowAnalytics: true,
    locationTracking: true,
  },
  offline: {
    autoSync: true,
    cacheSize: '50MB',
  },
};

// Sample Emergency Contacts
export const sampleEmergencyContacts = [
  {
    name: 'Emergency Services',
    number: '108',
    type: 'emergency',
    description: 'National Emergency Number (Ambulance, Fire, Police)',
  },
  {
    name: 'Poison Control',
    number: '1066',
    type: 'poison',
    description: 'National Poison Information Centre',
  },
  {
    name: 'Mental Health Helpline',
    number: '9152987821',
    type: 'mental_health',
    description: 'COOJ Mental Health Foundation',
  },
  {
    name: 'Women Helpline',
    number: '1091',
    type: 'women_safety',
    description: 'Women In Distress',
  },
];

// Sample Offline Data Structure
export const sampleOfflineData = {
  episodes: sampleCareEpisodes,
  profile: sampleUserProfile,
  settings: sampleSettings,
  providers: sampleProviders.slice(0, 2), // Limited providers for offline
  lastSync: '2024-01-28T12:00:00Z',
  pendingSync: [
    {
      type: 'symptom_report',
      data: sampleSymptomIntake,
      timestamp: '2024-01-28T14:30:00Z',
    },
  ],
};

// Function to populate sample data in localStorage for testing
export const populateSampleData = () => {
  try {
    // Store sample data in localStorage for offline testing
    localStorage.setItem('healthcare_episodes', JSON.stringify(sampleCareEpisodes));
    localStorage.setItem('healthcare_profile', JSON.stringify(sampleUserProfile));
    localStorage.setItem('healthcare_settings', JSON.stringify(sampleSettings));
    localStorage.setItem('healthcare_providers', JSON.stringify(sampleProviders));
    localStorage.setItem('healthcare_offline_data', JSON.stringify(sampleOfflineData));
    
    console.log('Sample data populated successfully!');
    return true;
  } catch (error) {
    console.error('Failed to populate sample data:', error);
    return false;
  }
};

// Function to clear all sample data
export const clearSampleData = () => {
  try {
    const keys = [
      'healthcare_episodes',
      'healthcare_profile', 
      'healthcare_settings',
      'healthcare_providers',
      'healthcare_offline_data'
    ];
    
    keys.forEach(key => localStorage.removeItem(key));
    console.log('Sample data cleared successfully!');
    return true;
  } catch (error) {
    console.error('Failed to clear sample data:', error);
    return false;
  }
};

// Export all sample data as default
export default {
  userProfile: sampleUserProfile,
  careEpisodes: sampleCareEpisodes,
  providers: sampleProviders,
  symptomIntake: sampleSymptomIntake,
  triageResults: sampleTriageResults,
  settings: sampleSettings,
  emergencyContacts: sampleEmergencyContacts,
  offlineData: sampleOfflineData,
  populateSampleData,
  clearSampleData,
};