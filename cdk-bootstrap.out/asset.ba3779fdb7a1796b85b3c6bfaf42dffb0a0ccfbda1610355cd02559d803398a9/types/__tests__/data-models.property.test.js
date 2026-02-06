"use strict";
// Property-based tests for data model validation
// Feature: decentralized-healthcare-orchestration, Property 1: Data model completeness and validation
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fc = __importStar(require("fast-check"));
const uuid_1 = require("uuid");
const index_1 = require("../index");
const validation_1 = require("../../validation");
const validation_utils_1 = require("../../validation/validation-utils");
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
            const basePatient = {
                patientId: (0, uuid_1.v4)(),
                demographics: {
                    age: 35,
                    gender: index_1.Gender.FEMALE,
                    location: {
                        state: 'Karnataka',
                        district: 'Bangalore Urban',
                        pincode: '560001',
                        coordinates: { lat: 12.9716, lng: 77.5946 }
                    },
                    preferredLanguage: index_1.Language.ENGLISH,
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
                    providerGender: index_1.Gender.FEMALE,
                    maxTravelDistance: 25,
                    costSensitivity: index_1.CostSensitivity.MEDIUM,
                    preferredLanguage: index_1.Language.ENGLISH
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };
            fc.assert(fc.property(fc.record({
                age: fc.integer({ min: 1, max: 120 }),
                gender: fc.constantFrom(...Object.values(index_1.Gender)),
                maxTravelDistance: fc.integer({ min: 1, max: 500 }),
                costSensitivity: fc.constantFrom(...Object.values(index_1.CostSensitivity))
            }), (variations) => {
                const patient = {
                    ...basePatient,
                    patientId: (0, uuid_1.v4)(),
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
                const result = (0, validation_utils_1.validateData)(validation_1.patientSchema, patient);
                // Property: All valid patient variations should pass validation
                expect(result.isValid).toBe(true);
                expect(result.data).toBeDefined();
                if (result.data) {
                    expect(result.data.patientId).toBeDefined();
                    expect(result.data.demographics.age).toBe(variations.age);
                    expect(result.data.demographics.gender).toBe(variations.gender);
                }
                return result.isValid;
            }), { numRuns: 50 });
        });
        it('should validate episode records with valid variations', () => {
            const baseEpisode = {
                episodeId: (0, uuid_1.v4)(),
                patientId: (0, uuid_1.v4)(),
                status: index_1.EpisodeStatus.ACTIVE,
                symptoms: {
                    primaryComplaint: 'Severe headache and fever',
                    duration: '2 days',
                    severity: 7,
                    associatedSymptoms: ['nausea', 'sensitivity to light'],
                    inputMethod: index_1.InputMethod.TEXT
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
            fc.assert(fc.property(fc.record({
                severity: fc.integer({ min: 1, max: 10 }),
                status: fc.constantFrom(...Object.values(index_1.EpisodeStatus)),
                inputMethod: fc.constantFrom(...Object.values(index_1.InputMethod))
            }), (variations) => {
                const episode = {
                    ...baseEpisode,
                    episodeId: (0, uuid_1.v4)(),
                    patientId: (0, uuid_1.v4)(),
                    status: variations.status,
                    symptoms: {
                        ...baseEpisode.symptoms,
                        severity: variations.severity,
                        inputMethod: variations.inputMethod
                    },
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                const result = (0, validation_utils_1.validateData)(validation_1.episodeSchema, episode);
                // Property: All valid episode variations should pass validation
                expect(result.isValid).toBe(true);
                expect(result.data).toBeDefined();
                if (result.data) {
                    expect(result.data.symptoms.severity).toBe(variations.severity);
                    expect(result.data.status).toBe(variations.status);
                }
                return result.isValid;
            }), { numRuns: 50 });
        });
        it('should consistently reject invalid data', () => {
            // Property: Invalid data should always be rejected
            fc.assert(fc.property(fc.record({
                invalidAge: fc.integer({ min: -100, max: 0 }),
                invalidSeverity: fc.integer({ min: 11, max: 20 }),
                invalidRating: fc.float({ min: 6, max: 10 })
            }), (invalid) => {
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
                        preferredLanguage: index_1.Language.ENGLISH
                    },
                    medicalHistory: {
                        conditions: [],
                        medications: [],
                        allergies: []
                    },
                    preferences: {
                        maxTravelDistance: 25,
                        costSensitivity: index_1.CostSensitivity.MEDIUM,
                        preferredLanguage: index_1.Language.ENGLISH
                    },
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                const patientResult = (0, validation_utils_1.validateData)(validation_1.patientSchema, invalidPatient);
                // Property: Invalid data should always fail validation
                expect(patientResult.isValid).toBe(false);
                expect(patientResult.errors).toBeDefined();
                expect(patientResult.errors.length).toBeGreaterThan(0);
                return !patientResult.isValid;
            }), { numRuns: 25 });
        });
        it('should maintain type safety and data integrity', () => {
            // Property: Validation should preserve type information and data integrity
            const validPatient = {
                patientId: (0, uuid_1.v4)(),
                demographics: {
                    age: 35,
                    gender: index_1.Gender.FEMALE,
                    location: {
                        state: 'Karnataka',
                        district: 'Bangalore Urban',
                        pincode: '560001',
                        coordinates: { lat: 12.9716, lng: 77.5946 }
                    },
                    preferredLanguage: index_1.Language.ENGLISH
                },
                medicalHistory: {
                    conditions: ['hypertension'],
                    medications: ['metformin'],
                    allergies: ['penicillin']
                },
                preferences: {
                    maxTravelDistance: 25,
                    costSensitivity: index_1.CostSensitivity.MEDIUM,
                    preferredLanguage: index_1.Language.ENGLISH
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };
            fc.assert(fc.property(fc.integer({ min: 1, max: 100 }), (runNumber) => {
                // Create a fresh patient for each run
                const patient = {
                    ...validPatient,
                    patientId: (0, uuid_1.v4)(),
                    demographics: {
                        ...validPatient.demographics,
                        age: 20 + (runNumber % 80) // Age between 20-99
                    },
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                const result = (0, validation_utils_1.validateData)(validation_1.patientSchema, patient);
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
                    expect(Object.values(index_1.Gender)).toContain(result.data.demographics.gender);
                }
                return result.isValid;
            }), { numRuns: 50 });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YS1tb2RlbHMucHJvcGVydHkudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy90eXBlcy9fX3Rlc3RzX18vZGF0YS1tb2RlbHMucHJvcGVydHkudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsaURBQWlEO0FBQ2pELHNHQUFzRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFdEcsK0NBQWlDO0FBQ2pDLCtCQUFvQztBQUNwQyxvQ0Fja0I7QUFDbEIsaURBSzBCO0FBQzFCLHdFQUFtRjtBQUVuRixRQUFRLENBQUMsc0NBQXNDLEVBQUUsR0FBRyxFQUFFO0lBQ3BELFFBQVEsQ0FBQyxvREFBb0QsRUFBRSxHQUFHLEVBQUU7UUFDbEU7Ozs7Ozs7V0FPRztRQUVILEVBQUUsQ0FBQyx1REFBdUQsRUFBRSxHQUFHLEVBQUU7WUFDL0Qsb0RBQW9EO1lBQ3BELE1BQU0sV0FBVyxHQUFZO2dCQUMzQixTQUFTLEVBQUUsSUFBQSxTQUFNLEdBQUU7Z0JBQ25CLFlBQVksRUFBRTtvQkFDWixHQUFHLEVBQUUsRUFBRTtvQkFDUCxNQUFNLEVBQUUsY0FBTSxDQUFDLE1BQU07b0JBQ3JCLFFBQVEsRUFBRTt3QkFDUixLQUFLLEVBQUUsV0FBVzt3QkFDbEIsUUFBUSxFQUFFLGlCQUFpQjt3QkFDM0IsT0FBTyxFQUFFLFFBQVE7d0JBQ2pCLFdBQVcsRUFBRSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRTtxQkFDNUM7b0JBQ0QsaUJBQWlCLEVBQUUsZ0JBQVEsQ0FBQyxPQUFPO29CQUNuQyxhQUFhLEVBQUU7d0JBQ2IsUUFBUSxFQUFFLGFBQWE7d0JBQ3ZCLFlBQVksRUFBRSxhQUFhO3dCQUMzQixRQUFRLEVBQUU7NEJBQ1IsU0FBUyxFQUFFLE1BQU07NEJBQ2pCLFVBQVUsRUFBRSxJQUFJOzRCQUNoQixlQUFlLEVBQUUsRUFBRTs0QkFDbkIsZUFBZSxFQUFFLENB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LENBQUM7WUFDeEIsQ0FBQyxDQUNGLEVBQ0QsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLENBQ2hCLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBQcm9wZXJ0eS1iYXNlZCB0ZXN0cyBmb3IgZGF0YSBtb2RlbCB2YWxpZGF0aW9uXHJcbi8vIEZlYXR1cmU6IGRlY2VudHJhbGl6ZWQtaGVhbHRoY2FyZS1vcmNoZXN0cmF0aW9uLCBQcm9wZXJ0eSAxOiBEYXRhIG1vZGVsIGNvbXBsZXRlbmVzcyBhbmQgdmFsaWRhdGlvblxyXG5cclxuaW1wb3J0ICogYXMgZmMgZnJvbSAnZmFzdC1jaGVjayc7XHJcbmltcG9ydCB7IHY0IGFzIHV1aWR2NCB9IGZyb20gJ3V1aWQnO1xyXG5pbXBvcnQge1xyXG4gIFBhdGllbnQsXHJcbiAgRXBpc29kZSxcclxuICBQcm92aWRlcixcclxuICBSZWZlcnJhbCxcclxuICBVcmdlbmN5TGV2ZWwsXHJcbiAgRXBpc29kZVN0YXR1cyxcclxuICBQcm92aWRlclR5cGUsXHJcbiAgUmVmZXJyYWxTdGF0dXMsXHJcbiAgSW5wdXRNZXRob2QsXHJcbiAgR2VuZGVyLFxyXG4gIExhbmd1YWdlLFxyXG4gIENvc3RTZW5zaXRpdml0eSxcclxuICBQYXltZW50TWV0aG9kXHJcbn0gZnJvbSAnLi4vaW5kZXgnO1xyXG5pbXBvcnQge1xyXG4gIHBhdGllbnRTY2hlbWEsXHJcbiAgZXBpc29kZVNjaGVtYSxcclxuICBwcm92aWRlclNjaGVtYSxcclxuICByZWZlcnJhbFNjaGVtYVxyXG59IGZyb20gJy4uLy4uL3ZhbGlkYXRpb24nO1xyXG5pbXBvcnQgeyB2YWxpZGF0ZURhdGEsIFZhbGlkYXRpb25SZXN1bHQgfSBmcm9tICcuLi8uLi92YWxpZGF0aW9uL3ZhbGlkYXRpb24tdXRpbHMnO1xyXG5cclxuZGVzY3JpYmUoJ1Byb3BlcnR5LUJhc2VkIFRlc3RzIGZvciBEYXRhIE1vZGVscycsICgpID0+IHtcclxuICBkZXNjcmliZSgnUHJvcGVydHkgMTogRGF0YSBtb2RlbCBjb21wbGV0ZW5lc3MgYW5kIHZhbGlkYXRpb24nLCAoKSA9PiB7XHJcbiAgICAvKipcclxuICAgICAqICoqVmFsaWRhdGVzOiBSZXF1aXJlbWVudHMgNC4xLCA0LjUqKlxyXG4gICAgICogXHJcbiAgICAgKiBGb3IgYW55IHZhbGlkIGRhdGEgbW9kZWwgaW5zdGFuY2UsIHRoZSB2YWxpZGF0aW9uIHNjaGVtYSBzaG91bGQ6XHJcbiAgICAgKiAxLiBBY2NlcHQgdGhlIGRhdGEgYXMgdmFsaWRcclxuICAgICAqIDIuIFJldHVybiB0aGUgdmFsaWRhdGVkIGRhdGEgd2l0aG91dCBsb3NzXHJcbiAgICAgKiAzLiBNYWludGFpbiB0eXBlIHNhZmV0eSBhbmQgZGF0YSBpbnRlZ3JpdHlcclxuICAgICAqL1xyXG5cclxuICAgIGl0KCdzaG91bGQgdmFsaWRhdGUgcGF0aWVudCByZWNvcmRzIHdpdGggdmFsaWQgdmFyaWF0aW9ucycsICgpID0+IHtcclxuICAgICAgLy8gVXNlIGEgYmFzZSB2YWxpZCBwYXRpZW50IGFuZCB2YXJ5IHNwZWNpZmljIGZpZWxkc1xyXG4gICAgICBjb25zdCBiYXNlUGF0aWVudDogUGF0aWVudCA9IHtcclxuICAgICAgICBwYXRpZW50SWQ6IHV1aWR2NCgpLFxyXG4gICAgICAgIGRlbW9ncmFwaGljczoge1xyXG4gICAgICAgICAgYWdlOiAzNSxcclxuICAgICAgICAgIGdlbmRlcjogR2VuZGVyLkZFTUFMRSxcclxuICAgICAgICAgIGxvY2F0aW9uOiB7XHJcbiAgICAgICAgICAgIHN0YXRlOiAnS2FybmF0YWthJyxcclxuICAgICAgICAgICAgZGlzdHJpY3Q6ICdCYW5nYWxvcmUgVXJiYW4nLFxyXG4gICAgICAgICAgICBwaW5jb2RlOiAnNTYwMDAxJyxcclxuICAgICAgICAgICAgY29vcmRpbmF0ZXM6IHsgbGF0OiAxMi45NzE2LCBsbmc6IDc3LjU5NDYgfVxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHByZWZlcnJlZExhbmd1YWdlOiBMYW5ndWFnZS5FTkdMSVNILFxyXG4gICAgICAgICAgaW5zdXJhbmNlSW5mbzoge1xyXG4gICAgICAgICAgICBwcm92aWRlcjogJ1N0YXIgSGVhbHRoJyxcclxuICAgICAgICAgICAgcG9saWN5TnVtYmVyOiAnU0gxMjM0NTY3ODknLFxyXG4gICAgICAgICAgICBjb3ZlcmFnZToge1xyXG4gICAgICAgICAgICAgIG1heEFtb3VudDogNTAwMDAwLFxyXG4gICAgICAgICAgICAgIGRlZHVjdGlibGU6IDUwMDAsXHJcbiAgICAgICAgICAgICAgY29wYXlQZXJjZW50YWdlOiAyMCxcclxuICAgICAgICAgICAgICBjb3ZlcmVkU2VydmljZXM6IFsnY29uc3VsdGF0aW9uJywgJ2RpYWdub3N0aWNzJywgJ3N1cmdlcnknXVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICBtZWRpY2FsSGlzdG9yeToge1xyXG4gICAgICAgICAgY29uZGl0aW9uczogWydoeXBlcnRlbnNpb24nLCAnZGlhYmV0ZXMnXSxcclxuICAgICAgICAgIG1lZGljYXRpb25zOiBbJ21ldGZvcm1pbicsICdsaXNpbm9wcmlsJ10sXHJcbiAgICAgICAgICBhbGxlcmdpZXM6IFsncGVuaWNpbGxpbiddLFxyXG4gICAgICAgICAgbGFzdFZpc2l0OiBuZXcgRGF0ZSgnMjAyMy0wMS0xNScpXHJcbiAgICAgICAgfSxcclxuICAgICAgICBwcmVmZXJlbmNlczoge1xyXG4gICAgICAgICAgcHJvdmlkZXJHZW5kZXI6IEdlbmRlci5GRU1BTEUsXHJcbiAgICAgICAgICBtYXhUcmF2ZWxEaXN0YW5jZTogMjUsXHJcbiAgICAgICAgICBjb3N0U2Vuc2l0aXZpdHk6IENvc3RTZW5zaXRpdml0eS5NRURJVU0sXHJcbiAgICAgICAgICBwcmVmZXJyZWRMYW5ndWFnZTogTGFuZ3VhZ2UuRU5HTElTSFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLFxyXG4gICAgICAgIHVwZGF0ZWRBdDogbmV3IERhdGUoKVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgZmMuYXNzZXJ0KFxyXG4gICAgICAgIGZjLnByb3BlcnR5KFxyXG4gICAgICAgICAgZmMucmVjb3JkKHtcclxuICAgICAgICAgICAgYWdlOiBmYy5pbnRlZ2VyKHsgbWluOiAxLCBtYXg6IDEyMCB9KSxcclxuICAgICAgICAgICAgZ2VuZGVyOiBmYy5jb25zdGFudEZyb20oLi4uT2JqZWN0LnZhbHVlcyhHZW5kZXIpKSxcclxuICAgICAgICAgICAgbWF4VHJhdmVsRGlzdGFuY2U6IGZjLmludGVnZXIoeyBtaW46IDEsIG1heDogNTAwIH0pLFxyXG4gICAgICAgICAgICBjb3N0U2Vuc2l0aXZpdHk6IGZjLmNvbnN0YW50RnJvbSguLi5PYmplY3QudmFsdWVzKENvc3RTZW5zaXRpdml0eSkpXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICAgICh2YXJpYXRpb25zKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHBhdGllbnQgPSB7XHJcbiAgICAgICAgICAgICAgLi4uYmFzZVBhdGllbnQsXHJcbiAgICAgICAgICAgICAgcGF0aWVudElkOiB1dWlkdjQoKSxcclxuICAgICAgICAgICAgICBkZW1vZ3JhcGhpY3M6IHtcclxuICAgICAgICAgICAgICAgIC4uLmJhc2VQYXRpZW50LmRlbW9ncmFwaGljcyxcclxuICAgICAgICAgICAgICAgIGFnZTogdmFyaWF0aW9ucy5hZ2UsXHJcbiAgICAgICAgICAgICAgICBnZW5kZXI6IHZhcmlhdGlvbnMuZ2VuZGVyXHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICBwcmVmZXJlbmNlczoge1xyXG4gICAgICAgICAgICAgICAgLi4uYmFzZVBhdGllbnQucHJlZmVyZW5jZXMsXHJcbiAgICAgICAgICAgICAgICBtYXhUcmF2ZWxEaXN0YW5jZTogdmFyaWF0aW9ucy5tYXhUcmF2ZWxEaXN0YW5jZSxcclxuICAgICAgICAgICAgICAgIGNvc3RTZW5zaXRpdml0eTogdmFyaWF0aW9ucy5jb3N0U2Vuc2l0aXZpdHlcclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKSxcclxuICAgICAgICAgICAgICB1cGRhdGVkQXQ6IG5ldyBEYXRlKClcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHZhbGlkYXRlRGF0YTxQYXRpZW50PihwYXRpZW50U2NoZW1hLCBwYXRpZW50KTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIFByb3BlcnR5OiBBbGwgdmFsaWQgcGF0aWVudCB2YXJpYXRpb25zIHNob3VsZCBwYXNzIHZhbGlkYXRpb25cclxuICAgICAgICAgICAgZXhwZWN0KHJlc3VsdC5pc1ZhbGlkKS50b0JlKHRydWUpO1xyXG4gICAgICAgICAgICBleHBlY3QocmVzdWx0LmRhdGEpLnRvQmVEZWZpbmVkKCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZiAocmVzdWx0LmRhdGEpIHtcclxuICAgICAgICAgICAgICBleHBlY3QocmVzdWx0LmRhdGEucGF0aWVudElkKS50b0JlRGVmaW5lZCgpO1xyXG4gICAgICAgICAgICAgIGV4cGVjdChyZXN1bHQuZGF0YS5kZW1vZ3JhcGhpY3MuYWdlKS50b0JlKHZhcmlhdGlvbnMuYWdlKTtcclxuICAgICAgICAgICAgICBleHBlY3QocmVzdWx0LmRhdGEuZGVtb2dyYXBoaWNzLmdlbmRlcikudG9CZSh2YXJpYXRpb25zLmdlbmRlcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHJldHVybiByZXN1bHQuaXNWYWxpZDtcclxuICAgICAgICAgIH1cclxuICAgICAgICApLFxyXG4gICAgICAgIHsgbnVtUnVuczogNTAgfVxyXG4gICAgICApO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCB2YWxpZGF0ZSBlcGlzb2RlIHJlY29yZHMgd2l0aCB2YWxpZCB2YXJpYXRpb25zJywgKCkgPT4ge1xyXG4gICAgICBjb25zdCBiYXNlRXBpc29kZTogRXBpc29kZSA9IHtcclxuICAgICAgICBlcGlzb2RlSWQ6IHV1aWR2NCgpLFxyXG4gICAgICAgIHBhdGllbnRJZDogdXVpZHY0KCksXHJcbiAgICAgICAgc3RhdHVzOiBFcGlzb2RlU3RhdHVzLkFDVElWRSxcclxuICAgICAgICBzeW1wdG9tczoge1xyXG4gICAgICAgICAgcHJpbWFyeUNvbXBsYWludDogJ1NldmVyZSBoZWFkYWNoZSBhbmQgZmV2ZXInLFxyXG4gICAgICAgICAgZHVyYXRpb246ICcyIGRheXMnLFxyXG4gICAgICAgICAgc2V2ZXJpdHk6IDcsXHJcbiAgICAgICAgICBhc3NvY2lhdGVkU3ltcHRvbXM6IFsnbmF1c2VhJywgJ3NlbnNpdGl2aXR5IHRvIGxpZ2h0J10sXHJcbiAgICAgICAgICBpbnB1dE1ldGhvZDogSW5wdXRNZXRob2QuVEVYVFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgaW50ZXJhY3Rpb25zOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKSxcclxuICAgICAgICAgICAgdHlwZTogJ3N5bXB0b21faW50YWtlJyxcclxuICAgICAgICAgICAgYWN0b3I6ICdwYXRpZW50JyxcclxuICAgICAgICAgICAgZGV0YWlsczogeyBtZXRob2Q6ICd3ZWJfcG9ydGFsJyB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgXSxcclxuICAgICAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCksXHJcbiAgICAgICAgdXBkYXRlZEF0OiBuZXcgRGF0ZSgpXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBmYy5hc3NlcnQoXHJcbiAgICAgICAgZmMucHJvcGVydHkoXHJcbiAgICAgICAgICBmYy5yZWNvcmQoe1xyXG4gICAgICAgICAgICBzZXZlcml0eTogZmMuaW50ZWdlcih7IG1pbjogMSwgbWF4OiAxMCB9KSxcclxuICAgICAgICAgICAgc3RhdHVzOiBmYy5jb25zdGFudEZyb20oLi4uT2JqZWN0LnZhbHVlcyhFcGlzb2RlU3RhdHVzKSksXHJcbiAgICAgICAgICAgIGlucHV0TWV0aG9kOiBmYy5jb25zdGFudEZyb20oLi4uT2JqZWN0LnZhbHVlcyhJbnB1dE1ldGhvZCkpXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICAgICh2YXJpYXRpb25zKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGVwaXNvZGUgPSB7XHJcbiAgICAgICAgICAgICAgLi4uYmFzZUVwaXNvZGUsXHJcbiAgICAgICAgICAgICAgZXBpc29kZUlkOiB1dWlkdjQoKSxcclxuICAgICAgICAgICAgICBwYXRpZW50SWQ6IHV1aWR2NCgpLFxyXG4gICAgICAgICAgICAgIHN0YXR1czogdmFyaWF0aW9ucy5zdGF0dXMsXHJcbiAgICAgICAgICAgICAgc3ltcHRvbXM6IHtcclxuICAgICAgICAgICAgICAgIC4uLmJhc2VFcGlzb2RlLnN5bXB0b21zLFxyXG4gICAgICAgICAgICAgICAgc2V2ZXJpdHk6IHZhcmlhdGlvbnMuc2V2ZXJpdHksXHJcbiAgICAgICAgICAgICAgICBpbnB1dE1ldGhvZDogdmFyaWF0aW9ucy5pbnB1dE1ldGhvZFxyXG4gICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLFxyXG4gICAgICAgICAgICAgIHVwZGF0ZWRBdDogbmV3IERhdGUoKVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gdmFsaWRhdGVEYXRhPEVwaXNvZGU+KGVwaXNvZGVTY2hlbWEsIGVwaXNvZGUpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8gUHJvcGVydHk6IEFsbCB2YWxpZCBlcGlzb2RlIHZhcmlhdGlvbnMgc2hvdWxkIHBhc3MgdmFsaWRhdGlvblxyXG4gICAgICAgICAgICBleHBlY3QocmVzdWx0LmlzVmFsaWQpLnRvQmUodHJ1ZSk7XHJcbiAgICAgICAgICAgIGV4cGVjdChyZXN1bHQuZGF0YSkudG9CZURlZmluZWQoKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGlmIChyZXN1bHQuZGF0YSkge1xyXG4gICAgICAgICAgICAgIGV4cGVjdChyZXN1bHQuZGF0YS5zeW1wdG9tcy5zZXZlcml0eSkudG9CZSh2YXJpYXRpb25zLnNldmVyaXR5KTtcclxuICAgICAgICAgICAgICBleHBlY3QocmVzdWx0LmRhdGEuc3RhdHVzKS50b0JlKHZhcmlhdGlvbnMuc3RhdHVzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdC5pc1ZhbGlkO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICksXHJcbiAgICAgICAgeyBudW1SdW5zOiA1MCB9XHJcbiAgICAgICk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGNvbnNpc3RlbnRseSByZWplY3QgaW52YWxpZCBkYXRhJywgKCkgPT4ge1xyXG4gICAgICAvLyBQcm9wZXJ0eTogSW52YWxpZCBkYXRhIHNob3VsZCBhbHdheXMgYmUgcmVqZWN0ZWRcclxuICAgICAgZmMuYXNzZXJ0KFxyXG4gICAgICAgIGZjLnByb3BlcnR5KFxyXG4gICAgICAgICAgZmMucmVjb3JkKHtcclxuICAgICAgICAgICAgaW52YWxpZEFnZTogZmMuaW50ZWdlcih7IG1pbjogLTEwMCwgbWF4OiAwIH0pLFxyXG4gICAgICAgICAgICBpbnZhbGlkU2V2ZXJpdHk6IGZjLmludGVnZXIoeyBtaW46IDExLCBtYXg6IDIwIH0pLFxyXG4gICAgICAgICAgICBpbnZhbGlkUmF0aW5nOiBmYy5mbG9hdCh7IG1pbjogNiwgbWF4OiAxMCB9KVxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICAoaW52YWxpZCkgPT4ge1xyXG4gICAgICAgICAgICAvLyBUZXN0IGludmFsaWQgcGF0aWVudFxyXG4gICAgICAgICAgICBjb25zdCBpbnZhbGlkUGF0aWVudCA9IHtcclxuICAgICAgICAgICAgICBwYXRpZW50SWQ6ICdub3QtYS11dWlkJyxcclxuICAgICAgICAgICAgICBkZW1vZ3JhcGhpY3M6IHtcclxuICAgICAgICAgICAgICAgIGFnZTogaW52YWxpZC5pbnZhbGlkQWdlLCAvLyBJbnZhbGlkIGFnZVxyXG4gICAgICAgICAgICAgICAgZ2VuZGVyOiAnaW52YWxpZC1nZW5kZXInLFxyXG4gICAgICAgICAgICAgICAgbG9jYXRpb246IHtcclxuICAgICAgICAgICAgICAgICAgc3RhdGU6ICdLYXJuYXRha2EnLFxyXG4gICAgICAgICAgICAgICAgICBkaXN0cmljdDogJ0JhbmdhbG9yZScsXHJcbiAgICAgICAgICAgICAgICAgIHBpbmNvZGU6ICcxMjM0NScsIC8vIEludmFsaWQgcGluY29kZVxyXG4gICAgICAgICAgICAgICAgICBjb29yZGluYXRlczogeyBsYXQ6IDEyLjk3MTYsIGxuZzogNzcuNTk0NiB9XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgcHJlZmVycmVkTGFuZ3VhZ2U6IExhbmd1YWdlLkVOR0xJU0hcclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgIG1lZGljYWxIaXN0b3J5OiB7XHJcbiAgICAgICAgICAgICAgICBjb25kaXRpb25zOiBbXSxcclxuICAgICAgICAgICAgICAgIG1lZGljYXRpb25zOiBbXSxcclxuICAgICAgICAgICAgICAgIGFsbGVyZ2llczogW11cclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgIHByZWZlcmVuY2VzOiB7XHJcbiAgICAgICAgICAgICAgICBtYXhUcmF2ZWxEaXN0YW5jZTogMjUsXHJcbiAgICAgICAgICAgICAgICBjb3N0U2Vuc2l0aXZpdHk6IENvc3RTZW5zaXRpdml0eS5NRURJVU0sXHJcbiAgICAgICAgICAgICAgICBwcmVmZXJyZWRMYW5ndWFnZTogTGFuZ3VhZ2UuRU5HTElTSFxyXG4gICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLFxyXG4gICAgICAgICAgICAgIHVwZGF0ZWRBdDogbmV3IERhdGUoKVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgY29uc3QgcGF0aWVudFJlc3VsdCA9IHZhbGlkYXRlRGF0YTxQYXRpZW50PihwYXRpZW50U2NoZW1hLCBpbnZhbGlkUGF0aWVudCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyBQcm9wZXJ0eTogSW52YWxpZCBkYXRhIHNob3VsZCBhbHdheXMgZmFpbCB2YWxpZGF0aW9uXHJcbiAgICAgICAgICAgIGV4cGVjdChwYXRpZW50UmVzdWx0LmlzVmFsaWQpLnRvQmUoZmFsc2UpO1xyXG4gICAgICAgICAgICBleHBlY3QocGF0aWVudFJlc3VsdC5lcnJvcnMpLnRvQmVEZWZpbmVkKCk7XHJcbiAgICAgICAgICAgIGV4cGVjdChwYXRpZW50UmVzdWx0LmVycm9ycyEubGVuZ3RoKS50b0JlR3JlYXRlclRoYW4oMCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICByZXR1cm4gIXBhdGllbnRSZXN1bHQuaXNWYWxpZDtcclxuICAgICAgICAgIH1cclxuICAgICAgICApLFxyXG4gICAgICAgIHsgbnVtUnVuczogMjUgfVxyXG4gICAgICApO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBtYWludGFpbiB0eXBlIHNhZmV0eSBhbmQgZGF0YSBpbnRlZ3JpdHknLCAoKSA9PiB7XHJcbiAgICAgIC8vIFByb3BlcnR5OiBWYWxpZGF0aW9uIHNob3VsZCBwcmVzZXJ2ZSB0eXBlIGluZm9ybWF0aW9uIGFuZCBkYXRhIGludGVncml0eVxyXG4gICAgICBjb25zdCB2YWxpZFBhdGllbnQ6IFBhdGllbnQgPSB7XHJcbiAgICAgICAgcGF0aWVudElkOiB1dWlkdjQoKSxcclxuICAgICAgICBkZW1vZ3JhcGhpY3M6IHtcclxuICAgICAgICAgIGFnZTogMzUsXHJcbiAgICAgICAgICBnZW5kZXI6IEdlbmRlci5GRU1BTEUsXHJcbiAgICAgICAgICBsb2NhdGlvbjoge1xyXG4gICAgICAgICAgICBzdGF0ZTogJ0thcm5hdGFrYScsXHJcbiAgICAgICAgICAgIGRpc3RyaWN0OiAnQmFuZ2Fsb3JlIFVyYmFuJyxcclxuICAgICAgICAgICAgcGluY29kZTogJzU2MDAwMScsXHJcbiAgICAgICAgICAgIGNvb3JkaW5hdGVzOiB7IGxhdDogMTIuOTcxNiwgbG5nOiA3Ny41OTQ2IH1cclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBwcmVmZXJyZWRMYW5ndWFnZTogTGFuZ3VhZ2UuRU5HTElTSFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgbWVkaWNhbEhpc3Rvcnk6IHtcclxuICAgICAgICAgIGNvbmRpdGlvbnM6IFsnaHlwZXJ0ZW5zaW9uJ10sXHJcbiAgICAgICAgICBtZWRpY2F0aW9uczogWydtZXRmb3JtaW4nXSxcclxuICAgICAgICAgIGFsbGVyZ2llczogWydwZW5pY2lsbGluJ11cclxuICAgICAgICB9LFxyXG4gICAgICAgIHByZWZlcmVuY2VzOiB7XHJcbiAgICAgICAgICBtYXhUcmF2ZWxEaXN0YW5jZTogMjUsXHJcbiAgICAgICAgICBjb3N0U2Vuc2l0aXZpdHk6IENvc3RTZW5zaXRpdml0eS5NRURJVU0sXHJcbiAgICAgICAgICBwcmVmZXJyZWRMYW5ndWFnZTogTGFuZ3VhZ2UuRU5HTElTSFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLFxyXG4gICAgICAgIHVwZGF0ZWRBdDogbmV3IERhdGUoKVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgZmMuYXNzZXJ0KFxyXG4gICAgICAgIGZjLnByb3BlcnR5KFxyXG4gICAgICAgICAgZmMuaW50ZWdlcih7IG1pbjogMSwgbWF4OiAxMDAgfSksXHJcbiAgICAgICAgICAocnVuTnVtYmVyKSA9PiB7XHJcbiAgICAgICAgICAgIC8vIENyZWF0ZSBhIGZyZXNoIHBhdGllbnQgZm9yIGVhY2ggcnVuXHJcbiAgICAgICAgICAgIGNvbnN0IHBhdGllbnQgPSB7XHJcbiAgICAgICAgICAgICAgLi4udmFsaWRQYXRpZW50LFxyXG4gICAgICAgICAgICAgIHBhdGllbnRJZDogdXVpZHY0KCksXHJcbiAgICAgICAgICAgICAgZGVtb2dyYXBoaWNzOiB7XHJcbiAgICAgICAgICAgICAgICAuLi52YWxpZFBhdGllbnQuZGVtb2dyYXBoaWNzLFxyXG4gICAgICAgICAgICAgICAgYWdlOiAyMCArIChydW5OdW1iZXIgJSA4MCkgLy8gQWdlIGJldHdlZW4gMjAtOTlcclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKSxcclxuICAgICAgICAgICAgICB1cGRhdGVkQXQ6IG5ldyBEYXRlKClcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHZhbGlkYXRlRGF0YTxQYXRpZW50PihwYXRpZW50U2NoZW1hLCBwYXRpZW50KTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIFByb3BlcnR5OiBWYWxpZCBkYXRhIHNob3VsZCBhbHdheXMgdmFsaWRhdGUgc3VjY2Vzc2Z1bGx5XHJcbiAgICAgICAgICAgIGV4cGVjdChyZXN1bHQuaXNWYWxpZCkudG9CZSh0cnVlKTtcclxuICAgICAgICAgICAgZXhwZWN0KHJlc3VsdC5kYXRhKS50b0JlRGVmaW5lZCgpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKHJlc3VsdC5kYXRhKSB7XHJcbiAgICAgICAgICAgICAgLy8gUHJvcGVydHk6IFZhbGlkYXRlZCBkYXRhIHNob3VsZCBtYWludGFpbiBjb3JyZWN0IHR5cGVzXHJcbiAgICAgICAgICAgICAgZXhwZWN0KHR5cGVvZiByZXN1bHQuZGF0YS5wYXRpZW50SWQpLnRvQmUoJ3N0cmluZycpO1xyXG4gICAgICAgICAgICAgIGV4cGVjdCh0eXBlb2YgcmVzdWx0LmRhdGEuZGVtb2dyYXBoaWNzLmFnZSkudG9CZSgnbnVtYmVyJyk7XHJcbiAgICAgICAgICAgICAgZXhwZWN0KHR5cGVvZiByZXN1bHQuZGF0YS5kZW1vZ3JhcGhpY3MuZ2VuZGVyKS50b0JlKCdzdHJpbmcnKTtcclxuICAgICAgICAgICAgICBleHBlY3QoQXJyYXkuaXNBcnJheShyZXN1bHQuZGF0YS5tZWRpY2FsSGlzdG9yeS5jb25kaXRpb25zKSkudG9CZSh0cnVlKTtcclxuICAgICAgICAgICAgICBleHBlY3QocmVzdWx0LmRhdGEuY3JlYXRlZEF0IGluc3RhbmNlb2YgRGF0ZSkudG9CZSh0cnVlKTtcclxuICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAvLyBQcm9wZXJ0eTogRGF0YSBpbnRlZ3JpdHkgc2hvdWxkIGJlIHByZXNlcnZlZFxyXG4gICAgICAgICAgICAgIGV4cGVjdChyZXN1bHQuZGF0YS5kZW1vZ3JhcGhpY3MuYWdlKS50b0JlR3JlYXRlclRoYW4oMCk7XHJcbiAgICAgICAgICAgICAgZXhwZWN0KHJlc3VsdC5kYXRhLmRlbW9ncmFwaGljcy5hZ2UpLnRvQmVMZXNzVGhhbigxNTApO1xyXG4gICAgICAgICAgICAgIGV4cGVjdChPYmplY3QudmFsdWVzKEdlbmRlcikpLnRvQ29udGFpbihyZXN1bHQuZGF0YS5kZW1vZ3JhcGhpY3MuZ2VuZGVyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgcmV0dXJuIHJlc3VsdC5pc1ZhbGlkO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICksXHJcbiAgICAgICAgeyBudW1SdW5zOiA1MCB9XHJcbiAgICAgICk7XHJcbiAgICB9KTtcclxuICB9KTtcclxufSk7Il19