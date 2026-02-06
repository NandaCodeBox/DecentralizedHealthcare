// Property-based tests for data model validation
// Feature: decentralized-healthcare-orchestration, Property 1: Data model completeness and validation

import * as fc from 'fast-check';
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
  CostSensitivity,
  PaymentMethod
} from '../index';
import {
  patientSchema,
  episodeSchema,
  providerSchema,
  referralSchema
} from '../../validation';
import { validateData, ValidationResult } from '../../validation/validation-utils';

describe('Property-Based Tests for Data Models', () => {
  describe('Property 1: Data model completeness and validation', () => {
    /**
     * **Validates: Requirements 4.1, 4.5**
     * 
     * For any valid data model instance, the validation schema should:
     * 1. Accept the data as valid
     * 2. Return the validated data without loss
     * 3. Maintain type safety and data integrity
     */

    it('should validate patient records with valid variations', () => {
      // Use a base valid patient and vary specific fields
      const basePatient: Patient = {
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

      fc.assert(
        fc.property(
          fc.record({
            age: fc.integer({ min: 1, max: 120 }),
            gender: fc.constantFrom(...Object.values(Gender)),
            maxTravelDistance: fc.integer({ min: 1, max: 500 }),
            costSensitivity: fc.constantFrom(...Object.values(CostSensitivity))
          }),
          (variations) => {
            const patient = {
              ...basePatient,
              patientId: uuidv4(),
              demographics: {
                ...basePatient.demographics,
                age: variations.age,
                gender: variations.gender
              },
              preferences: {
                ...basePatient.preferences,
                maxTravelDistance: variations.maxTravelDistance,
                costSensitivity: variations.costSensitivity
              },
              createdAt: new Date(),
              updatedAt: new Date()
            };

            const result = validateData<Patient>(patientSchema, patient);
            
            // Property: All valid patient variations should pass validation
            expect(result.isValid).toBe(true);
            expect(result.data).toBeDefined();
            
            if (result.data) {
              expect(result.data.patientId).toBeDefined();
              expect(result.data.demographics.age).toBe(variations.age);
              expect(result.data.demographics.gender).toBe(variations.gender);
            }
            
            return result.isValid;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should validate episode records with valid variations', () => {
      const baseEpisode: Episode = {
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
        interactions: [
          {
            timestamp: new Date(),
            type: 'symptom_intake',
            actor: 'patient',
            details: { method: 'web_portal' }
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      fc.assert(
        fc.property(
          fc.record({
            severity: fc.integer({ min: 1, max: 10 }),
            status: fc.constantFrom(...Object.values(EpisodeStatus)),
            inputMethod: fc.constantFrom(...Object.values(InputMethod))
          }),
          (variations) => {
            const episode = {
              ...baseEpisode,
              episodeId: uuidv4(),
              patientId: uuidv4(),
              status: variations.status,
              symptoms: {
                ...baseEpisode.symptoms,
                severity: variations.severity,
                inputMethod: variations.inputMethod
              },
              createdAt: new Date(),
              updatedAt: new Date()
            };

            const result = validateData<Episode>(episodeSchema, episode);
            
            // Property: All valid episode variations should pass validation
            expect(result.isValid).toBe(true);
            expect(result.data).toBeDefined();
            
            if (result.data) {
              expect(result.data.symptoms.severity).toBe(variations.severity);
              expect(result.data.status).toBe(variations.status);
            }
            
            return result.isValid;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should consistently reject invalid data', () => {
      // Property: Invalid data should always be rejected
      fc.assert(
        fc.property(
          fc.record({
            invalidAge: fc.integer({ min: -100, max: 0 }),
            invalidSeverity: fc.integer({ min: 11, max: 20 }),
            invalidRating: fc.float({ min: 6, max: 10 })
          }),
          (invalid) => {
            // Test invalid patient
            const invalidPatient = {
              patientId: 'not-a-uuid',
              demographics: {
                age: invalid.invalidAge, // Invalid age
                gender: 'invalid-gender',
                location: {
                  state: 'Karnataka',
                  district: 'Bangalore',
                  pincode: '12345', // Invalid pincode
                  coordinates: { lat: 12.9716, lng: 77.5946 }
                },
                preferredLanguage: Language.ENGLISH
              },
              medicalHistory: {
                conditions: [],
                medications: [],
                allergies: []
              },
              preferences: {
                maxTravelDistance: 25,
                costSensitivity: CostSensitivity.MEDIUM,
                preferredLanguage: Language.ENGLISH
              },
              createdAt: new Date(),
              updatedAt: new Date()
            };

            const patientResult = validateData<Patient>(patientSchema, invalidPatient);
            
            // Property: Invalid data should always fail validation
            expect(patientResult.isValid).toBe(false);
            expect(patientResult.errors).toBeDefined();
            expect(patientResult.errors!.length).toBeGreaterThan(0);
            
            return !patientResult.isValid;
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should maintain type safety and data integrity', () => {
      // Property: Validation should preserve type information and data integrity
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
          preferredLanguage: Language.ENGLISH
        },
        medicalHistory: {
          conditions: ['hypertension'],
          medications: ['metformin'],
          allergies: ['penicillin']
        },
        preferences: {
          maxTravelDistance: 25,
          costSensitivity: CostSensitivity.MEDIUM,
          preferredLanguage: Language.ENGLISH
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          (runNumber) => {
            // Create a fresh patient for each run
            const patient = {
              ...validPatient,
              patientId: uuidv4(),
              demographics: {
                ...validPatient.demographics,
                age: 20 + (runNumber % 80) // Age between 20-99
              },
              createdAt: new Date(),
              updatedAt: new Date()
            };

            const result = validateData<Patient>(patientSchema, patient);
            
            // Property: Valid data should always validate successfully
            expect(result.isValid).toBe(true);
            expect(result.data).toBeDefined();
            
            if (result.data) {
              // Property: Validated data should maintain correct types
              expect(typeof result.data.patientId).toBe('string');
              expect(typeof result.data.demographics.age).toBe('number');
              expect(typeof result.data.demographics.gender).toBe('string');
              expect(Array.isArray(result.data.medicalHistory.conditions)).toBe(true);
              expect(result.data.createdAt instanceof Date).toBe(true);
              
              // Property: Data integrity should be preserved
              expect(result.data.demographics.age).toBeGreaterThan(0);
              expect(result.data.demographics.age).toBeLessThan(150);
              expect(Object.values(Gender)).toContain(result.data.demographics.gender);
            }
            
            return result.isValid;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});