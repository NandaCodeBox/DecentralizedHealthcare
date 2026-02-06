// Common types for the frontend application

export interface Patient {
  patientId: string;
  demographics: {
    age: number;
    gender: string;
    location: {
      state: string;
      district: string;
      pincode: string;
      coordinates: { lat: number; lng: number };
    };
    preferredLanguage: string;
    insuranceInfo?: {
      provider: string;
      policyNumber: string;
      coverage: Record<string, any>;
    };
  };
  medicalHistory: {
    conditions: string[];
    medications: string[];
    allergies: string[];
    lastVisit?: string;
  };
  preferences: {
    providerGender?: string;
    maxTravelDistance: number;
    costSensitivity: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SymptomData {
  primaryComplaint: string;
  duration: string;
  severity: number;
  associatedSymptoms?: string;
  medicalHistory?: string;
  inputMethod: 'text' | 'voice';
}

export interface CareEpisode {
  episodeId: string;
  patientId: string;
  status: 'active' | 'completed' | 'escalated';
  symptoms: SymptomData;
  triage?: {
    urgencyLevel: 'emergency' | 'urgent' | 'routine' | 'self-care';
    ruleBasedScore: number;
    aiAssessment?: {
      used: boolean;
      confidence: number;
      reasoning: string;
    };
    humanValidation?: {
      supervisorId: string;
      approved: boolean;
      overrideReason?: string;
      timestamp: string;
    };
  };
  carePathway?: {
    recommendedLevel: string;
    assignedProvider?: string;
    alternativeProviders: string[];
    estimatedCost?: number;
    expectedDuration?: string;
  };
  interactions: Array<{
    timestamp: string;
    type: string;
    actor: string;
    details: Record<string, any>;
  }>;
  outcome?: {
    resolution: string;
    followUpRequired: boolean;
    patientSatisfaction?: number;
    costActual?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Provider {
  providerId: string;
  type: 'hospital' | 'clinic' | 'specialist' | 'pharmacy';
  name: string;
  location: {
    address: string;
    state: string;
    district: string;
    pincode: string;
    coordinates: { lat: number; lng: number };
  };
  capabilities: {
    specialties: string[];
    services: string[];
    equipment: string[];
    languages: string[];
  };
  capacity: {
    totalBeds?: number;
    availableBeds?: number;
    dailyPatientCapacity: number;
    currentLoad: number;
  };
  qualityMetrics: {
    rating: number;
    patientReviews: number;
    successRate: number;
    averageWaitTime: number;
  };
  costStructure: {
    consultationFee: number;
    insuranceAccepted: string[];
    paymentMethods: string[];
  };
  availability: {
    hours: Record<string, any>;
    emergencyAvailable: boolean;
    lastUpdated: string;
  };
  credentials: {
    licenses: string[];
    certifications: string[];
    verified: boolean;
  };
  distance?: number; // Added by frontend for display
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  offline?: boolean; // Flag to indicate network/connection error
}

export interface OfflineData {
  id: string;
  type: 'symptom-intake' | 'episode-update' | 'profile-update';
  data: any;
  timestamp: string;
  synced: boolean;
}

export interface AppState {
  isOnline: boolean;
  currentLanguage: string;
  user?: Patient;
  currentEpisode?: CareEpisode;
  offlineQueue: OfflineData[];
}

// Form types
export interface SymptomIntakeForm {
  primaryComplaint: string;
  duration: string;
  severity: number;
  associatedSymptoms: string;
  medicalHistory: string;
}

export interface ProfileForm {
  name: string;
  age: number;
  gender: string;
  phone: string;
  email: string;
  location: {
    state: string;
    district: string;
    pincode: string;
  };
  medicalConditions: string[];
  medications: string[];
  allergies: string[];
  preferredLanguage: string;
  providerGender: string;
  maxTravelDistance: number;
  costSensitivity: string;
}

// API endpoints
export interface ApiEndpoints {
  symptomIntake: string;
  episodes: string;
  providers: string;
  profile: string;
  triage: string;
}