// Quick script to load test data - can be run in browser console
// Usage: Copy and paste this entire script into browser console and run

console.log('🧪 Loading Healthcare OS Test Data...');

const sampleUserProfile = {
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

const sampleCareEpisodes = [
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
    },
    triage: {
      urgencyLevel: 'urgent',
      aiAssessment: {
        confidence: 0.85,
        reasoning: 'Severe headache with neurological symptoms requires urgent evaluation',
      },
    },
    interactions: [
      {
        timestamp: '2024-01-15T10:30:00Z',
        type: 'symptom_report',
        actor: 'patient',
        details: { source: 'patient_app' },
      },
    ],
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
      associatedSymptoms: 'Fever (101°F), fatigue, mild chest discomfort',
      medicalHistory: 'Diabetes, recent travel history',
    },
    triage: {
      urgencyLevel: 'routine',
      aiAssessment: {
        confidence: 0.78,
        reasoning: 'Respiratory symptoms with fever suggest possible respiratory infection',
      },
    },
    interactions: [
      {
        timestamp: '2024-01-28T08:15:00Z',
        type: 'symptom_report',
        actor: 'patient',
        details: { source: 'patient_app' },
      },
    ],
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
    },
    triage: {
      urgencyLevel: 'emergency',
      aiAssessment: {
        confidence: 0.95,
        reasoning: 'Chest pain with associated symptoms suggests possible cardiac emergency',
      },
    },
    interactions: [
      {
        timestamp: '2024-01-20T14:20:00Z',
        type: 'symptom_report',
        actor: 'patient',
        details: { source: 'patient_app' },
      },
    ],
  },
];

const sampleSettings = {
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

// Load data into localStorage
try {
  localStorage.setItem('healthcare_episodes', JSON.stringify(sampleCareEpisodes));
  localStorage.setItem('healthcare_profile', JSON.stringify(sampleUserProfile));
  localStorage.setItem('healthcare_settings', JSON.stringify(sampleSettings));
  
  console.log('✅ Test data loaded successfully!');
  console.log('📊 Loaded:');
  console.log('  - User Profile: Priya Sharma (32F, Mumbai)');
  console.log('  - Care Episodes: 3 episodes (completed, active, escalated)');
  console.log('  - App Settings: Default configuration');
  console.log('');
  console.log('🎯 You can now test:');
  console.log('  - Profile page: /profile');
  console.log('  - Episodes page: /episodes');
  console.log('  - Settings page: /settings');
  console.log('');
  console.log('🔄 To clear data: localStorage.clear()');
  
} catch (error) {
  console.error('❌ Failed to load test data:', error);
}

// Make data available globally for inspection
window.testData = {
  profile: sampleUserProfile,
  episodes: sampleCareEpisodes,
  settings: sampleSettings,
};

console.log('🔍 Access data via: window.testData');