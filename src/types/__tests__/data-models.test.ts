// Unit tests for data models and validation schemas

import { v4 as uuidv4 } from 'uuid';
import {
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
  CostSensitivity
} from '../index';
import {
  patientSchema,
  episodeSchema,
  providerSchema,
  referralSchema,
  createPatientInputSchema,
  createEpisodeInputSchema,
  createProviderInputSchema,
  createReferralInputSchema
} from '../../validation';
import { validateData } from '../../validation/validation-utils';

describe('Data Models and Validation', () => {
  describe('Patient Data Model', () => {
    const validPatient: Patient = {
      patientId: uuidv4(),
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
          provider: 'Star Health',
          policyNumber: 'SH123456789',
          coverage: {
            maxAmount: 500000,
            deductible: 5000,
            copayPercentage: 20,
            coveredServices: ['consultation', 'diagnostics', 'surgery']
          }
        }
      },
      medicalHistory: {
        conditions: ['hypertension', 'diabetes'],
        medications: ['metformin', 'lisinopril'],
        allergies: ['penicillin'],
        lastVisit: new Date('2023-01-15')
      },
      preferences: {
        providerGender: Gender.FEMALE,
        maxTravelDistance: 25,
        costSensitivity: CostSensitivity.MEDIUM,
        preferredLanguage: Language.ENGLISH
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should validate a complete patient record', () => {
      const result = validateData(patientSchema, validPatient);
      expect(result.isValid).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should reject patient with invalid age', () => {
      const invalidPatient = { ...validPatient, demographics: { ...validPatient.demographics, age: -5 } };
      const result = validateData(patientSchema, invalidPatient);
      expect(result.isValid).toBe(false);
      expect(result.errors?.some(error => error.includes('age'))).toBe(true);
    });

    it('should reject patient with invalid pincode', () => {
      const invalidPatient = {
        ...validPatient,
        demographics: {
          ...validPatient.demographics,
          location: { ...validPatient.demographics.location, pincode: '12345' }
        }
      };
      const result = validateData(patientSchema, invalidPatient);
      expect(result.isValid).toBe(false);
    });

    it('should validate patient creation input', () => {
      const createInput = {
        demographics: validPatient.demographics,
        medicalHistory: validPatient.medicalHistory,
        preferences: validPatient.preferences
      };
      const result = validateData(createPatientInputSchema, createInput);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Episode Data Model', () => {
    const validEpisode: Episode = {
      episodeId: uuidv4(),
      patientId: uuidv4(),
      status: EpisodeStatus.ACTIVE,
      symptoms: {
        primaryComplaint: 'Severe headache and fever',
        duration: '2 days',
        severity: 7,
        associatedSymptoms: ['nausea', 'sensitivity to light'],
        inputMethod: InputMethod.TEXT
      },
      triage: {
        urgencyLevel: UrgencyLevel.URGENT,
        ruleBasedScore: 75,
        aiAssessment: {
          used: true,
          confidence: 0.85,
          reasoning: 'Symptoms suggest possible migraine or viral infection',
          modelUsed: 'claude-3-haiku',
          timestamp: new Date()
        },
        humanValidation: {
          supervisorId: uuidv4(),
          approved: true,
          timestamp: new Date(),
          notes: 'Approved for urgent care pathway'
        },
        finalScore: 80
      },
      carePathway: {
        recommendedLevel: 'urgent care clinic',
        assignedProvider: uuidv4(),
        alternativeProviders: [uuidv4(), uuidv4()],
        estimatedCost: 2500,
        expectedDuration: '2-3 hours',
        instructions: 'Visit urgent care clinic within 4 hours'
      },
      interactions: [
        {
          timestamp: new Date(),
          type: 'symptom_intake',
          actor: 'patient',
          details: { method: 'web_portal' }
        }
      ],
      outcome: {
        resolution: 'Diagnosed with viral fever, prescribed medication',
        followUpRequired: true,
        patientSatisfaction: 4,
        costActual: 2200
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should validate a complete episode record', () => {
      const result = validateData(episodeSchema, validEpisode);
      expect(result.isValid).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should reject episode with invalid severity score', () => {
      const invalidEpisode = {
        ...validEpisode,
        symptoms: { ...validEpisode.symptoms, severity: 15 }
      };
      const result = validateData(episodeSchema, invalidEpisode);
      expect(result.isValid).toBe(false);
    });

    it('should validate episode creation input', () => {
      const createInput = {
        patientId: validEpisode.patientId,
        symptoms: validEpisode.symptoms
      };
      const result = validateData(createEpisodeInputSchema, createInput);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Provider Data Model', () => {
    const validProvider: Provider = {
      providerId: uuidv4(),
      type: ProviderType.HOSPITAL,
      name: 'Apollo Hospital Bangalore',
      location: {
        state: 'Karnataka',
        district: 'Bangalore Urban',
        pincode: '560076',
        coordinates: { lat: 12.9698, lng: 77.7500 }
      },
      capabilities: {
        specialties: ['cardiology', 'neurology', 'emergency medicine'],
        services: ['emergency care', 'surgery', 'diagnostics'],
        equipment: ['MRI', 'CT scan', 'cardiac catheterization'],
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
        insuranceAccepted: ['Star Health', 'HDFC Ergo', 'ICICI Lombard'],
        paymentMethods: ['cash', 'card', 'upi', 'insurance']
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
      },
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should validate a complete provider record', () => {
      const result = validateData(providerSchema, validProvider);
      expect(result.isValid).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should reject provider with invalid rating', () => {
      const invalidProvider = {
        ...validProvider,
        qualityMetrics: { ...validProvider.qualityMetrics, rating: 6 }
      };
      const result = validateData(providerSchema, invalidProvider);
      expect(result.isValid).toBe(false);
    });

    it('should validate provider creation input', () => {
      const createInput = {
        type: validProvider.type,
        name: validProvider.name,
        location: validProvider.location,
        capabilities: validProvider.capabilities,
        capacity: validProvider.capacity,
        qualityMetrics: validProvider.qualityMetrics,
        costStructure: validProvider.costStructure,
        availability: validProvider.availability,
        credentials: validProvider.credentials
      };
      const result = validateData(createProviderInputSchema, createInput);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Referral Data Model', () => {
    const validReferral: Referral = {
      referralId: uuidv4(),
      episodeId: uuidv4(),
      fromProvider: uuidv4(),
      toProvider: uuidv4(),
      urgency: UrgencyLevel.URGENT,
      reason: 'Patient requires specialized cardiac evaluation',
      patientContext: {
        symptoms: { chest_pain: true, shortness_of_breath: true },
        assessments: { ecg: 'abnormal', blood_pressure: '160/95' },
        treatments: { medications: ['aspirin', 'metoprolol'] },
        notes: 'Patient presenting with chest pain and elevated BP',
        vitalSigns: { heart_rate: 95, blood_pressure: '160/95', temperature: 98.6 }
      },
      status: ReferralStatus.PENDING,
      timeline: {
        requestedAt: new Date(),
        acceptedAt: undefined,
        completedAt: undefined,
        rejectedAt: undefined
      },
      followUpInstructions: 'Ensure patient brings all previous cardiac reports',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should validate a complete referral record', () => {
      const result = validateData(referralSchema, validReferral);
      expect(result.isValid).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should validate referral creation input', () => {
      const createInput = {
        episodeId: validReferral.episodeId,
        fromProvider: validReferral.fromProvider,
        toProvider: validReferral.toProvider,
        urgency: validReferral.urgency,
        reason: validReferral.reason,
        patientContext: validReferral.patientContext,
        followUpInstructions: validReferral.followUpInstructions
      };
      const result = validateData(createReferralInputSchema, createInput);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Enum Values', () => {
    it('should have correct urgency level values', () => {
      expect(Object.values(UrgencyLevel)).toEqual([
        'emergency',
        'urgent',
        'routine',
        'self-care'
      ]);
    });

    it('should have correct episode status values', () => {
      expect(Object.values(EpisodeStatus)).toEqual([
        'active',
        'completed',
        'escalated',
        'cancelled'
      ]);
    });

    it('should have correct provider type values', () => {
      expect(Object.values(ProviderType)).toEqual([
        'hospital',
        'clinic',
        'specialist',
        'pharmacy'
      ]);
    });

    it('should have correct referral status values', () => {
      expect(Object.values(ReferralStatus)).toEqual([
        'pending',
        'accepted',
        'completed',
        'rejected'
      ]);
    });
  });
});