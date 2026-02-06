// Example usage of data models and validation schemas
// This file demonstrates how to use the TypeScript interfaces and validation

import { v4 as uuidv4 } from 'uuid';
import {
  Patient,
  Episode,
  Provider,
  Referral,
  CreatePatientInput,
  CreateEpisodeInput,
  CreateProviderInput,
  CreateReferralInput,
  UrgencyLevel,
  EpisodeStatus,
  ProviderType,
  ReferralStatus,
  InputMethod,
  Gender,
  Language,
  CostSensitivity,
  PaymentMethod
} from '../types';
import {
  createPatientInputSchema,
  createEpisodeInputSchema,
  createProviderInputSchema,
  createReferralInputSchema,
  patientSchema,
  episodeSchema,
  providerSchema,
  referralSchema
} from '../validation';
import { validateOrThrow, ValidationError } from '../validation/validation-utils';

/**
 * Example: Creating and validating a new patient
 */
export function createPatientExample(): Patient {
  const patientInput: CreatePatientInput = {
    demographics: {
      age: 35,
      gender: Gender.FEMALE,
      location: {
        state: 'Karnataka',
        district: 'Bangalore Urban',
        pincode: '560001',
        coordinates: { lat: 12.9716, lng: 77.5946 }
      },
      preferredLanguage: Language.ENGLISH,
      insuranceInfo: {
        provider: 'Star Health Insurance',
        policyNumber: 'SH123456789',
        coverage: {
          maxAmount: 500000,
          deductible: 5000,
          copayPercentage: 20,
          coveredServices: ['consultation', 'diagnostics', 'surgery', 'pharmacy']
        }
      }
    },
    medicalHistory: {
      conditions: ['hypertension', 'type 2 diabetes'],
      medications: ['metformin 500mg', 'lisinopril 10mg'],
      allergies: ['penicillin', 'shellfish'],
      lastVisit: new Date('2023-12-15')
    },
    preferences: {
      providerGender: Gender.FEMALE,
      maxTravelDistance: 25,
      costSensitivity: CostSensitivity.MEDIUM,
      preferredLanguage: Language.ENGLISH
    }
  };

  try {
    // Validate the input
    const validatedInput = validateOrThrow<CreatePatientInput>(createPatientInputSchema, patientInput);
    
    // Create the complete patient record
    const patient: Patient = {
      patientId: uuidv4(),
      ...validatedInput,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Validate the complete patient record
    const validatedPatient = validateOrThrow<Patient>(patientSchema, patient);
    
    console.log('✅ Patient created successfully:', validatedPatient.patientId);
    return validatedPatient;
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('❌ Patient validation failed:', error.errors);
    }
    throw error;
  }
}

/**
 * Example: Creating and validating a new episode
 */
export function createEpisodeExample(patientId: string): Episode {
  const episodeInput: CreateEpisodeInput = {
    patientId,
    symptoms: {
      primaryComplaint: 'Severe headache with nausea and sensitivity to light',
      duration: '2 days',
      severity: 8,
      associatedSymptoms: ['nausea', 'photophobia', 'neck stiffness'],
      inputMethod: InputMethod.TEXT
    }
  };

  try {
    // Validate the input
    const validatedInput = validateOrThrow<CreateEpisodeInput>(createEpisodeInputSchema, episodeInput);
    
    // Create the complete episode record
    const episode: Episode = {
      episodeId: uuidv4(),
      ...validatedInput,
      status: EpisodeStatus.ACTIVE,
      interactions: [
        {
          timestamp: new Date(),
          type: 'symptom_intake',
          actor: 'patient',
          details: { 
            method: 'web_portal',
            sessionId: uuidv4(),
            userAgent: 'Mozilla/5.0 Healthcare Portal'
          }
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Validate the complete episode record
    const validatedEpisode = validateOrThrow<Episode>(episodeSchema, episode);
    
    console.log('✅ Episode created successfully:', validatedEpisode.episodeId);
    return validatedEpisode;
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('❌ Episode validation failed:', error.errors);
    }
    throw error;
  }
}

/**
 * Example: Creating and validating a new provider
 */
export function createProviderExample(): Provider {
  const providerInput: CreateProviderInput = {
    type: ProviderType.HOSPITAL,
    name: 'Apollo Hospital Bangalore',
    location: {
      state: 'Karnataka',
      district: 'Bangalore Urban',
      pincode: '560076',
      coordinates: { lat: 12.9698, lng: 77.7500 }
    },
    capabilities: {
      specialties: ['cardiology', 'neurology', 'emergency medicine', 'orthopedics'],
      services: ['emergency care', 'surgery', 'diagnostics', 'pharmacy', 'ambulance'],
      equipment: ['MRI', 'CT scan', 'cardiac catheterization', 'dialysis', 'ventilators'],
      languages: [Language.ENGLISH, Language.HINDI]
    },
    capacity: {
      totalBeds: 500,
      availableBeds: 45,
      dailyPatientCapacity: 1000,
      currentLoad: 75
    },
    qualityMetrics: {
      rating: 4.5,
      patientReviews: 2500,
      successRate: 95,
      averageWaitTime: 30
    },
    costStructure: {
      consultationFee: 800,
      insuranceAccepted: ['Star Health', 'HDFC Ergo', 'ICICI Lombard', 'Max Bupa'],
      paymentMethods: [PaymentMethod.CASH, PaymentMethod.CARD, PaymentMethod.UPI, PaymentMethod.INSURANCE]
    },
    availability: {
      hours: {
        monday: { open: '00:00', close: '23:59' },
        tuesday: { open: '00:00', close: '23:59' },
        wednesday: { open: '00:00', close: '23:59' },
        thursday: { open: '00:00', close: '23:59' },
        friday: { open: '00:00', close: '23:59' },
        saturday: { open: '00:00', close: '23:59' },
        sunday: { open: '00:00', close: '23:59' }
      },
      emergencyAvailable: true,
      lastUpdated: new Date()
    },
    credentials: {
      licenses: ['KAR-HOSP-2023-001', 'NABH-ACC-2023'],
      certifications: ['ISO 9001:2015', 'JCI Accredited'],
      verified: true
    }
  };

  try {
    // Validate the input
    const validatedInput = validateOrThrow<CreateProviderInput>(createProviderInputSchema, providerInput);
    
    // Create the complete provider record
    const provider: Provider = {
      providerId: uuidv4(),
      ...validatedInput,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Validate the complete provider record
    const validatedProvider = validateOrThrow<Provider>(providerSchema, provider);
    
    console.log('✅ Provider created successfully:', validatedProvider.providerId);
    return validatedProvider;
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('❌ Provider validation failed:', error.errors);
    }
    throw error;
  }
}

/**
 * Example: Creating and validating a new referral
 */
export function createReferralExample(episodeId: string, fromProviderId: string, toProviderId: string): Referral {
  const referralInput: CreateReferralInput = {
    episodeId,
    fromProvider: fromProviderId,
    toProvider: toProviderId,
    urgency: UrgencyLevel.URGENT,
    reason: 'Patient requires specialized cardiac evaluation due to chest pain and abnormal ECG findings',
    patientContext: {
      symptoms: { 
        chestPain: true, 
        shortnessOfBreath: true,
        radiatingPain: true
      },
      assessments: { 
        ecg: 'ST elevation in leads II, III, aVF',
        bloodPressure: '160/95',
        heartRate: 95,
        oxygenSaturation: 98
      },
      treatments: { 
        medications: ['aspirin 325mg', 'metoprolol 25mg'],
        interventions: ['oxygen therapy', 'IV access established']
      },
      notes: 'Patient presenting with acute chest pain, possible STEMI. Requires immediate cardiac catheterization.',
      vitalSigns: {
        temperature: 98.6,
        heartRate: 95,
        bloodPressure: '160/95',
        respiratoryRate: 18,
        oxygenSaturation: 98
      },
      labResults: {
        troponin: 'elevated',
        creatineKinase: 'elevated',
        bloodGlucose: 120,
        hemoglobin: 14.2
      }
    },
    followUpInstructions: 'Ensure patient brings all previous cardiac reports and current medications list'
  };

  try {
    // Validate the input
    const validatedInput = validateOrThrow<CreateReferralInput>(createReferralInputSchema, referralInput);
    
    // Create the complete referral record
    const referral: Referral = {
      referralId: uuidv4(),
      ...validatedInput,
      status: ReferralStatus.PENDING,
      timeline: {
        requestedAt: new Date(),
        acceptedAt: undefined,
        completedAt: undefined,
        rejectedAt: undefined
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Validate the complete referral record
    const validatedReferral = validateOrThrow<Referral>(referralSchema, referral);
    
    console.log('✅ Referral created successfully:', validatedReferral.referralId);
    return validatedReferral;
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('❌ Referral validation failed:', error.errors);
    }
    throw error;
  }
}

/**
 * Example: Complete workflow demonstration
 */
export function demonstrateWorkflow(): void {
  console.log('🏥 Healthcare Orchestration Data Model Demo\n');

  try {
    // 1. Create a patient
    console.log('1. Creating patient...');
    const patient = createPatientExample();
    
    // 2. Create an episode for the patient
    console.log('\n2. Creating episode...');
    const episode = createEpisodeExample(patient.patientId);
    
    // 3. Create a provider
    console.log('\n3. Creating provider...');
    const provider = createProviderExample();
    
    // 4. Create another provider for referral
    console.log('\n4. Creating specialist provider...');
    const specialistProvider = createProviderExample();
    
    // 5. Create a referral
    console.log('\n5. Creating referral...');
    const referral = createReferralExample(episode.episodeId, provider.providerId, specialistProvider.providerId);
    
    console.log('\n✅ Complete workflow demonstration successful!');
    console.log(`📊 Created: Patient ${patient.patientId}, Episode ${episode.episodeId}, Referral ${referral.referralId}`);
    
  } catch (error) {
    console.error('\n❌ Workflow demonstration failed:', error);
  }
}

// Export for use in other modules
export {
  Patient,
  Episode,
  Provider,
  Referral,
  UrgencyLevel,
  EpisodeStatus,
  ProviderType,
  ReferralStatus,
  InputMethod,
  Gender,
  Language,
  CostSensitivity,
  PaymentMethod
};