"use strict";
// Unit tests for data models and validation schemas
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const index_1 = require("../index");
const validation_1 = require("../../validation");
const validation_utils_1 = require("../../validation/validation-utils");
describe('Data Models and Validation', () => {
    describe('Patient Data Model', () => {
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
        it('should validate a complete patient record', () => {
            const result = (0, validation_utils_1.validateData)(validation_1.patientSchema, validPatient);
            expect(result.isValid).toBe(true);
            expect(result.data).toBeDefined();
        });
        it('should reject patient with invalid age', () => {
            const invalidPatient = { ...validPatient, demographics: { ...validPatient.demographics, age: -5 } };
            const result = (0, validation_utils_1.validateData)(validation_1.patientSchema, invalidPatient);
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
            const result = (0, validation_utils_1.validateData)(validation_1.patientSchema, invalidPatient);
            expect(result.isValid).toBe(false);
        });
        it('should validate patient creation input', () => {
            const createInput = {
                demographics: validPatient.demographics,
                medicalHistory: validPatient.medicalHistory,
                preferences: validPatient.preferences
            };
            const result = (0, validation_utils_1.validateData)(validation_1.createPatientInputSchema, createInput);
            expect(result.isValid).toBe(true);
        });
    });
    describe('Episode Data Model', () => {
        const validEpisode = {
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
            triage: {
                urgencyLevel: index_1.UrgencyLevel.URGENT,
                ruleBasedScore: 75,
                aiAssessment: {
                    used: true,
                    confidence: 0.85,
                    reasoning: 'Symptoms suggest possible migraine or viral infection',
                    modelUsed: 'claude-3-haiku',
                    timestamp: new Date()
                },
                humanValidation: {
                    supervisorId: (0, uuid_1.v4)(),
                    approved: true,
                    timestamp: new Date(),
                    notes: 'Approved for urgent care pathway'
                },
                finalScore: 80
            },
            carePathway: {
                recommendedLevel: 'urgent care clinic',
                assignedProvider: (0, uuid_1.v4)(),
                alternativeProviders: [(0, uuid_1.v4)(), (0, uuid_1.v4)()],
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
            const result = (0, validation_utils_1.validateData)(validation_1.episodeSchema, validEpisode);
            expect(result.isValid).toBe(true);
            expect(result.data).toBeDefined();
        });
        it('should reject episode with invalid severity score', () => {
            const invalidEpisode = {
                ...validEpisode,
                symptoms: { ...validEpisode.symptoms, severity: 15 }
            };
            const result = (0, validation_utils_1.validateData)(validation_1.episodeSchema, invalidEpisode);
            expect(result.isValid).toBe(false);
        });
        it('should validate episode creation input', () => {
            const createInput = {
                patientId: validEpisode.patientId,
                symptoms: validEpisode.symptoms
            };
            const result = (0, validation_utils_1.validateData)(validation_1.createEpisodeInputSchema, createInput);
            expect(result.isValid).toBe(true);
        });
    });
    describe('Provider Data Model', () => {
        const validProvider = {
            providerId: (0, uuid_1.v4)(),
            type: index_1.ProviderType.HOSPITAL,
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
                languages: [index_1.Language.ENGLISH, index_1.Language.HINDI]
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
            const result = (0, validation_utils_1.validateData)(validation_1.providerSchema, validProvider);
            expect(result.isValid).toBe(true);
            expect(result.data).toBeDefined();
        });
        it('should reject provider with invalid rating', () => {
            const invalidProvider = {
                ...validProvider,
                qualityMetrics: { ...validProvider.qualityMetrics, rating: 6 }
            };
            const result = (0, validation_utils_1.validateData)(validation_1.providerSchema, invalidProvider);
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
            const result = (0, validation_utils_1.validateData)(validation_1.createProviderInputSchema, createInput);
            expect(result.isValid).toBe(true);
        });
    });
    describe('Referral Data Model', () => {
        const validReferral = {
            referralId: (0, uuid_1.v4)(),
            episodeId: (0, uuid_1.v4)(),
            fromProvider: (0, uuid_1.v4)(),
            toProvider: (0, uuid_1.v4)(),
            urgency: index_1.UrgencyLevel.URGENT,
            reason: 'Patient requires specialized cardiac evaluation',
            patientContext: {
                symptoms: { chest_pain: true, shortness_of_breath: true },
                assessments: { ecg: 'abnormal', blood_pressure: '160/95' },
                treatments: { medications: ['aspirin', 'metoprolol'] },
                notes: 'Patient presenting with chest pain and elevated BP',
                vitalSigns: { heart_rate: 95, blood_pressure: '160/95', temperature: 98.6 }
            },
            status: index_1.ReferralStatus.PENDING,
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
            const result = (0, validation_utils_1.validateData)(validation_1.referralSchema, validReferral);
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
            const result = (0, validation_utils_1.validateData)(validation_1.createReferralInputSchema, createInput);
            expect(result.isValid).toBe(true);
        });
    });
    describe('Enum Values', () => {
        it('should have correct urgency level values', () => {
            expect(Object.values(index_1.UrgencyLevel)).toEqual([
                'emergency',
                'urgent',
                'routine',
                'self-care'
            ]);
        });
        it('should have correct episode status values', () => {
            expect(Object.values(index_1.EpisodeStatus)).toEqual([
                'active',
                'completed',
                'escalated',
                'cancelled'
            ]);
        });
        it('should have correct provider type values', () => {
            expect(Object.values(index_1.ProviderType)).toEqual([
                'hospital',
                'clinic',
                'specialist',
                'pharmacy'
            ]);
        });
        it('should have correct referral status values', () => {
            expect(Object.values(index_1.ReferralStatus)).toEqual([
                'pending',
                'accepted',
                'completed',
                'rejected'
            ]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YS1tb2RlbHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy90eXBlcy9fX3Rlc3RzX18vZGF0YS1tb2RlbHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsb0RBQW9EOztBQUVwRCwrQkFBb0M7QUFDcEMsb0NBYWtCO0FBQ2xCLGlEQVMwQjtBQUMxQix3RUFBaUU7QUFFakUsUUFBUSxDQUFDLDRCQUE0QixFQUFFLEdBQUcsRUFBRTtJQUMxQyxRQUFRLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO1FBQ2xDLE1BQU0sWUFBWSxHQUFZO1lBQzVCLFNBQVMsRUFBRSxJQUFBLFNBQU0sR0FBRTtZQUNuQixZQUFZLEVBQUU7Z0JBQ1osR0FBRyxFQUFFLEVBQUU7Z0JBQ1AsTUFBTSxFQUFFLGNBQU0sQ0FBQyxNQUFNO2dCQUNyQixRQUFRLEVBQUU7b0JBQ1IsS0FBSyxFQUFFLFdBQVc7b0JBQ2xCLFFBQVEsRUFBRSxpQkFBaUI7b0JBQzNCLE9BQU8sRUFBRSxRQUFRO29CQUNqQixXQUFXLEVBQUUsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUU7aUJBQzVDO2dCQUNELGlCQUFpQixFQUFFLGdCQUFRLENBQUMsT0FBTztnQkFDbkMsYUFBYSxFQUFFO29CQUNiLFFBQVEsRUFBRSxhQUFhO29CQUN2QixZQUFZLEVBQUUsYUFBYTtvQkFDM0IsUUFBUSxFQUFFO3dCQUNSLFNBQVMsRUFBRSxNQUFNO3dCQUNqQixVQUFVLEVBQUUsSUFBSTt3QkFDaEIsZUFBZSxFQUFFLEVBQUU7d0JBQ25CLGVBQWUsRUFBRSxDQUFDLGNBQWMsRUFBRSxhQUFhLEVBQUUsU0FBUyxDQUFDO3FCQUM1RDtpQkFDRjthQUNGO1lBQ0QsY0FBYyxFQUFFO2dCQUNkLFVBQVUsRUFBRSxDQUFDLGNBQWMsRUFBRSxVQUFVLENBQUM7Z0JBQ3hDLFdBQVcsRUFBRSxDQUFDLFdBQVcsRUFBRSxZQUFZLENB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Q0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLG9CQUFZLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztnQkFDMUMsV0FBVztnQkFDWCxRQUFRO2dCQUNSLFNBQVM7Z0JBQ1QsV0FBVzthQUNaLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLDJDQUEyQyxFQUFFLEdBQUcsRUFBRTtZQUNuRCxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxxQkFBYSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7Z0JBQzNDLFFBQVE7Z0JBQ1IsV0FBVztnQkFDWCxXQUFXO2dCQUNYLFdBQVc7YUFDWixDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQywwQ0FBMEMsRUFBRSxHQUFHLEVBQUU7WUFDbEQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsb0JBQVksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO2dCQUMxQyxVQUFVO2dCQUNWLFFBQVE7Z0JBQ1IsWUFBWTtnQkFDWixVQUFVO2FBQ1gsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsNENBQTRDLEVBQUUsR0FBRyxFQUFFO1lBQ3BELE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLHNCQUFjLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztnQkFDNUMsU0FBUztnQkFDVCxVQUFVO2dCQUNWLFdBQVc7Z0JBQ1gsVUFBVTthQUNYLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFVuaXQgdGVzdHMgZm9yIGRhdGEgbW9kZWxzIGFuZCB2YWxpZGF0aW9uIHNjaGVtYXNcclxuXHJcbmltcG9ydCB7IHY0IGFzIHV1aWR2NCB9IGZyb20gJ3V1aWQnO1xyXG5pbXBvcnQge1xyXG4gIFBhdGllbnQsXHJcbiAgRXBpc29kZSxcclxuICBQcm92aWRlcixcclxuICBSZWZlcnJhbCxcclxuICBVcmdlbmN5TGV2ZWwsXHJcbiAgRXBpc29kZVN0YXR1cyxcclxuICBQcm92aWRlclR5cGUsXHJcbiAgUmVmZXJyYWxTdGF0dXMsXHJcbiAgSW5wdXRNZXRob2QsXHJcbiAgR2VuZGVyLFxyXG4gIExhbmd1YWdlLFxyXG4gIENvc3RTZW5zaXRpdml0eVxyXG59IGZyb20gJy4uL2luZGV4JztcclxuaW1wb3J0IHtcclxuICBwYXRpZW50U2NoZW1hLFxyXG4gIGVwaXNvZGVTY2hlbWEsXHJcbiAgcHJvdmlkZXJTY2hlbWEsXHJcbiAgcmVmZXJyYWxTY2hlbWEsXHJcbiAgY3JlYXRlUGF0aWVudElucHV0U2NoZW1hLFxyXG4gIGNyZWF0ZUVwaXNvZGVJbnB1dFNjaGVtYSxcclxuICBjcmVhdGVQcm92aWRlcklucHV0U2NoZW1hLFxyXG4gIGNyZWF0ZVJlZmVycmFsSW5wdXRTY2hlbWFcclxufSBmcm9tICcuLi8uLi92YWxpZGF0aW9uJztcclxuaW1wb3J0IHsgdmFsaWRhdGVEYXRhIH0gZnJvbSAnLi4vLi4vdmFsaWRhdGlvbi92YWxpZGF0aW9uLXV0aWxzJztcclxuXHJcbmRlc2NyaWJlKCdEYXRhIE1vZGVscyBhbmQgVmFsaWRhdGlvbicsICgpID0+IHtcclxuICBkZXNjcmliZSgnUGF0aWVudCBEYXRhIE1vZGVsJywgKCkgPT4ge1xyXG4gICAgY29uc3QgdmFsaWRQYXRpZW50OiBQYXRpZW50ID0ge1xyXG4gICAgICBwYXRpZW50SWQ6IHV1aWR2NCgpLFxyXG4gICAgICBkZW1vZ3JhcGhpY3M6IHtcclxuICAgICAgICBhZ2U6IDM1LFxyXG4gICAgICAgIGdlbmRlcjogR2VuZGVyLkZFTUFMRSxcclxuICAgICAgICBsb2NhdGlvbjoge1xyXG4gICAgICAgICAgc3RhdGU6ICdLYXJuYXRha2EnLFxyXG4gICAgICAgICAgZGlzdHJpY3Q6ICdCYW5nYWxvcmUgVXJiYW4nLFxyXG4gICAgICAgICAgcGluY29kZTogJzU2MDAwMScsXHJcbiAgICAgICAgICBjb29yZGluYXRlczogeyBsYXQ6IDEyLjk3MTYsIGxuZzogNzcuNTk0NiB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICBwcmVmZXJyZWRMYW5ndWFnZTogTGFuZ3VhZ2UuRU5HTElTSCxcclxuICAgICAgICBpbnN1cmFuY2VJbmZvOiB7XHJcbiAgICAgICAgICBwcm92aWRlcjogJ1N0YXIgSGVhbHRoJyxcclxuICAgICAgICAgIHBvbGljeU51bWJlcjogJ1NIMTIzNDU2Nzg5JyxcclxuICAgICAgICAgIGNvdmVyYWdlOiB7XHJcbiAgICAgICAgICAgIG1heEFtb3VudDogNTAwMDAwLFxyXG4gICAgICAgICAgICBkZWR1Y3RpYmxlOiA1MDAwLFxyXG4gICAgICAgICAgICBjb3BheVBlcmNlbnRhZ2U6IDIwLFxyXG4gICAgICAgICAgICBjb3ZlcmVkU2VydmljZXM6IFsnY29uc3VsdGF0aW9uJywgJ2RpYWdub3N0aWNzJywgJ3N1cmdlcnknXVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAgbWVkaWNhbEhpc3Rvcnk6IHtcclxuICAgICAgICBjb25kaXRpb25zOiBbJ2h5cGVydGVuc2lvbicsICdkaWFiZXRlcyddLFxyXG4gICAgICAgIG1lZGljYXRpb25zOiBbJ21ldGZvcm1pbicsICdsaXNpbm9wcmlsJ10sXHJcbiAgICAgICAgYWxsZXJnaWVzOiBbJ3BlbmljaWxsaW4nXSxcclxuICAgICAgICBsYXN0VmlzaXQ6IG5ldyBEYXRlKCcyMDIzLTAxLTE1JylcclxuICAgICAgfSxcclxuICAgICAgcHJlZmVyZW5jZXM6IHtcclxuICAgICAgICBwcm92aWRlckdlbmRlcjogR2VuZGVyLkZFTUFMRSxcclxuICAgICAgICBtYXhUcmF2ZWxEaXN0YW5jZTogMjUsXHJcbiAgICAgICAgY29zdFNlbnNpdGl2aXR5OiBDb3N0U2Vuc2l0aXZpdHkuTUVESVVNLFxyXG4gICAgICAgIHByZWZlcnJlZExhbmd1YWdlOiBMYW5ndWFnZS5FTkdMSVNIXHJcbiAgICAgIH0sXHJcbiAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKSxcclxuICAgICAgdXBkYXRlZEF0OiBuZXcgRGF0ZSgpXHJcbiAgICB9O1xyXG5cclxuICAgIGl0KCdzaG91bGQgdmFsaWRhdGUgYSBjb21wbGV0ZSBwYXRpZW50IHJlY29yZCcsICgpID0+IHtcclxuICAgICAgY29uc3QgcmVzdWx0ID0gdmFsaWRhdGVEYXRhKHBhdGllbnRTY2hlbWEsIHZhbGlkUGF0aWVudCk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQuaXNWYWxpZCkudG9CZSh0cnVlKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC5kYXRhKS50b0JlRGVmaW5lZCgpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCByZWplY3QgcGF0aWVudCB3aXRoIGludmFsaWQgYWdlJywgKCkgPT4ge1xyXG4gICAgICBjb25zdCBpbnZhbGlkUGF0aWVudCA9IHsgLi4udmFsaWRQYXRpZW50LCBkZW1vZ3JhcGhpY3M6IHsgLi4udmFsaWRQYXRpZW50LmRlbW9ncmFwaGljcywgYWdlOiAtNSB9IH07XHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHZhbGlkYXRlRGF0YShwYXRpZW50U2NoZW1hLCBpbnZhbGlkUGF0aWVudCk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQuaXNWYWxpZCkudG9CZShmYWxzZSk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQuZXJyb3JzPy5zb21lKGVycm9yID0+IGVycm9yLmluY2x1ZGVzKCdhZ2UnKSkpLnRvQmUodHJ1ZSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIHJlamVjdCBwYXRpZW50IHdpdGggaW52YWxpZCBwaW5jb2RlJywgKCkgPT4ge1xyXG4gICAgICBjb25zdCBpbnZhbGlkUGF0aWVudCA9IHtcclxuICAgICAgICAuLi52YWxpZFBhdGllbnQsXHJcbiAgICAgICAgZGVtb2dyYXBoaWNzOiB7XHJcbiAgICAgICAgICAuLi52YWxpZFBhdGllbnQuZGVtb2dyYXBoaWNzLFxyXG4gICAgICAgICAgbG9jYXRpb246IHsgLi4udmFsaWRQYXRpZW50LmRlbW9ncmFwaGljcy5sb2NhdGlvbiwgcGluY29kZTogJzEyMzQ1JyB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9O1xyXG4gICAgICBjb25zdCByZXN1bHQgPSB2YWxpZGF0ZURhdGEocGF0aWVudFNjaGVtYSwgaW52YWxpZFBhdGllbnQpO1xyXG4gICAgICBleHBlY3QocmVzdWx0LmlzVmFsaWQpLnRvQmUoZmFsc2UpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCB2YWxpZGF0ZSBwYXRpZW50IGNyZWF0aW9uIGlucHV0JywgKCkgPT4ge1xyXG4gICAgICBjb25zdCBjcmVhdGVJbnB1dCA9IHtcclxuICAgICAgICBkZW1vZ3JhcGhpY3M6IHZhbGlkUGF0aWVudC5kZW1vZ3JhcGhpY3MsXHJcbiAgICAgICAgbWVkaWNhbEhpc3Rvcnk6IHZhbGlkUGF0aWVudC5tZWRpY2FsSGlzdG9yeSxcclxuICAgICAgICBwcmVmZXJlbmNlczogdmFsaWRQYXRpZW50LnByZWZlcmVuY2VzXHJcbiAgICAgIH07XHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHZhbGlkYXRlRGF0YShjcmVhdGVQYXRpZW50SW5wdXRTY2hlbWEsIGNyZWF0ZUlucHV0KTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC5pc1ZhbGlkKS50b0JlKHRydWUpO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdFcGlzb2RlIERhdGEgTW9kZWwnLCAoKSA9PiB7XHJcbiAgICBjb25zdCB2YWxpZEVwaXNvZGU6IEVwaXNvZGUgPSB7XHJcbiAgICAgIGVwaXNvZGVJZDogdXVpZHY0KCksXHJcbiAgICAgIHBhdGllbnRJZDogdXVpZHY0KCksXHJcbiAgICAgIHN0YXR1czogRXBpc29kZVN0YXR1cy5BQ1RJVkUsXHJcbiAgICAgIHN5bXB0b21zOiB7XHJcbiAgICAgICAgcHJpbWFyeUNvbXBsYWludDogJ1NldmVyZSBoZWFkYWNoZSBhbmQgZmV2ZXInLFxyXG4gICAgICAgIGR1cmF0aW9uOiAnMiBkYXlzJyxcclxuICAgICAgICBzZXZlcml0eTogNyxcclxuICAgICAgICBhc3NvY2lhdGVkU3ltcHRvbXM6IFsnbmF1c2VhJywgJ3NlbnNpdGl2aXR5IHRvIGxpZ2h0J10sXHJcbiAgICAgICAgaW5wdXRNZXRob2Q6IElucHV0TWV0aG9kLlRFWFRcclxuICAgICAgfSxcclxuICAgICAgdHJpYWdlOiB7XHJcbiAgICAgICAgdXJnZW5jeUxldmVsOiBVcmdlbmN5TGV2ZWwuVVJHRU5ULFxyXG4gICAgICAgIHJ1bGVCYXNlZFNjb3JlOiA3NSxcclxuICAgICAgICBhaUFzc2Vzc21lbnQ6IHtcclxuICAgICAgICAgIHVzZWQ6IHRydWUsXHJcbiAgICAgICAgICBjb25maWRlbmNlOiAwLjg1LFxyXG4gICAgICAgICAgcmVhc29uaW5nOiAnU3ltcHRvbXMgc3VnZ2VzdCBwb3NzaWJsZSBtaWdyYWluZSBvciB2aXJhbCBpbmZlY3Rpb24nLFxyXG4gICAgICAgICAgbW9kZWxVc2VkOiAnY2xhdWRlLTMtaGFpa3UnLFxyXG4gICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpXHJcbiAgICAgICAgfSxcclxuICAgICAgICBodW1hblZhbGlkYXRpb246IHtcclxuICAgICAgICAgIHN1cGVydmlzb3JJZDogdXVpZHY0KCksXHJcbiAgICAgICAgICBhcHByb3ZlZDogdHJ1ZSxcclxuICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKSxcclxuICAgICAgICAgIG5vdGVzOiAnQXBwcm92ZWQgZm9yIHVyZ2VudCBjYXJlIHBhdGh3YXknXHJcbiAgICAgICAgfSxcclxuICAgICAgICBmaW5hbFNjb3JlOiA4MFxyXG4gICAgICB9LFxyXG4gICAgICBjYXJlUGF0aHdheToge1xyXG4gICAgICAgIHJlY29tbWVuZGVkTGV2ZWw6ICd1cmdlbnQgY2FyZSBjbGluaWMnLFxyXG4gICAgICAgIGFzc2lnbmVkUHJvdmlkZXI6IHV1aWR2NCgpLFxyXG4gICAgICAgIGFsdGVybmF0aXZlUHJvdmlkZXJzOiBbdXVpZHY0KCksIHV1aWR2NCgpXSxcclxuICAgICAgICBlc3RpbWF0ZWRDb3N0OiAyNTAwLFxyXG4gICAgICAgIGV4cGVjdGVkRHVyYXRpb246ICcyLTMgaG91cnMnLFxyXG4gICAgICAgIGluc3RydWN0aW9uczogJ1Zpc2l0IHVyZ2VudCBjYXJlIGNsaW5pYyB3aXRoaW4gNCBob3VycydcclxuICAgICAgfSxcclxuICAgICAgaW50ZXJhY3Rpb25zOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLFxyXG4gICAgICAgICAgdHlwZTogJ3N5bXB0b21faW50YWtlJyxcclxuICAgICAgICAgIGFjdG9yOiAncGF0aWVudCcsXHJcbiAgICAgICAgICBkZXRhaWxzOiB7IG1ldGhvZDogJ3dlYl9wb3J0YWwnIH1cclxuICAgICAgICB9XHJcbiAgICAgIF0sXHJcbiAgICAgIG91dGNvbWU6IHtcclxuICAgICAgICByZXNvbHV0aW9uOiAnRGlhZ25vc2VkIHdpdGggdmlyYWwgZmV2ZXIsIHByZXNjcmliZWQgbWVkaWNhdGlvbicsXHJcbiAgICAgICAgZm9sbG93VXBSZXF1aXJlZDogdHJ1ZSxcclxuICAgICAgICBwYXRpZW50U2F0aXNmYWN0aW9uOiA0LFxyXG4gICAgICAgIGNvc3RBY3R1YWw6IDIyMDBcclxuICAgICAgfSxcclxuICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLFxyXG4gICAgICB1cGRhdGVkQXQ6IG5ldyBEYXRlKClcclxuICAgIH07XHJcblxyXG4gICAgaXQoJ3Nob3VsZCB2YWxpZGF0ZSBhIGNvbXBsZXRlIGVwaXNvZGUgcmVjb3JkJywgKCkgPT4ge1xyXG4gICAgICBjb25zdCByZXN1bHQgPSB2YWxpZGF0ZURhdGEoZXBpc29kZVNjaGVtYSwgdmFsaWRFcGlzb2RlKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC5pc1ZhbGlkKS50b0JlKHRydWUpO1xyXG4gICAgICBleHBlY3QocmVzdWx0LmRhdGEpLnRvQmVEZWZpbmVkKCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIHJlamVjdCBlcGlzb2RlIHdpdGggaW52YWxpZCBzZXZlcml0eSBzY29yZScsICgpID0+IHtcclxuICAgICAgY29uc3QgaW52YWxpZEVwaXNvZGUgPSB7XHJcbiAgICAgICAgLi4udmFsaWRFcGlzb2RlLFxyXG4gICAgICAgIHN5bXB0b21zOiB7IC4uLnZhbGlkRXBpc29kZS5zeW1wdG9tcywgc2V2ZXJpdHk6IDE1IH1cclxuICAgICAgfTtcclxuICAgICAgY29uc3QgcmVzdWx0ID0gdmFsaWRhdGVEYXRhKGVwaXNvZGVTY2hlbWEsIGludmFsaWRFcGlzb2RlKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC5pc1ZhbGlkKS50b0JlKGZhbHNlKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgdmFsaWRhdGUgZXBpc29kZSBjcmVhdGlvbiBpbnB1dCcsICgpID0+IHtcclxuICAgICAgY29uc3QgY3JlYXRlSW5wdXQgPSB7XHJcbiAgICAgICAgcGF0aWVudElkOiB2YWxpZEVwaXNvZGUucGF0aWVudElkLFxyXG4gICAgICAgIHN5bXB0b21zOiB2YWxpZEVwaXNvZGUuc3ltcHRvbXNcclxuICAgICAgfTtcclxuICAgICAgY29uc3QgcmVzdWx0ID0gdmFsaWRhdGVEYXRhKGNyZWF0ZUVwaXNvZGVJbnB1dFNjaGVtYSwgY3JlYXRlSW5wdXQpO1xyXG4gICAgICBleHBlY3QocmVzdWx0LmlzVmFsaWQpLnRvQmUodHJ1ZSk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ1Byb3ZpZGVyIERhdGEgTW9kZWwnLCAoKSA9PiB7XHJcbiAgICBjb25zdCB2YWxpZFByb3ZpZGVyOiBQcm92aWRlciA9IHtcclxuICAgICAgcHJvdmlkZXJJZDogdXVpZHY0KCksXHJcbiAgICAgIHR5cGU6IFByb3ZpZGVyVHlwZS5IT1NQSVRBTCxcclxuICAgICAgbmFtZTogJ0Fwb2xsbyBIb3NwaXRhbCBCYW5nYWxvcmUnLFxyXG4gICAgICBsb2NhdGlvbjoge1xyXG4gICAgICAgIHN0YXRlOiAnS2FybmF0YWthJyxcclxuICAgICAgICBkaXN0cmljdDogJ0JhbmdhbG9yZSBVcmJhbicsXHJcbiAgICAgICAgcGluY29kZTogJzU2MDA3NicsXHJcbiAgICAgICAgY29vcmRpbmF0ZXM6IHsgbGF0OiAxMi45Njk4LCBsbmc6IDc3Ljc1MDAgfVxyXG4gICAgICB9LFxyXG4gICAgICBjYXBhYmlsaXRpZXM6IHtcclxuICAgICAgICBzcGVjaWFsdGllczogWydjYXJkaW9sb2d5JywgJ25ldXJvbG9neScsICdlbWVyZ2VuY3kgbWVkaWNpbmUnXSxcclxuICAgICAgICBzZXJ2aWNlczogWydlbWVyZ2VuY3kgY2FyZScsICdzdXJnZXJ5JywgJ2RpYWdub3N0aWNzJ10sXHJcbiAgICAgICAgZXF1aXBtZW50OiBbJ01SSScsICdDVCBzY2FuJywgJ2NhcmRpYWMgY2F0aGV0ZXJpemF0aW9uJ10sXHJcbiAgICAgICAgbGFuZ3VhZ2VzOiBbTGFuZ3VhZ2UuRU5HTElTSCwgTGFuZ3VhZ2UuSElOREldXHJcbiAgICAgIH0sXHJcbiAgICAgIGNhcGFjaXR5OiB7XHJcbiAgICAgICAgdG90YWxCZWRzOiA1MDAsXHJcbiAgICAgICAgYXZhaWxhYmxlQmVkczogNDUsXHJcbiAgICAgICAgZGFpbHlQYXRpZW50Q2FwYWNpdHk6IDEwMDAsXHJcbiAgICAgICAgY3VycmVudExvYWQ6IDc1XHJcbiAgICAgIH0sXHJcbiAgICAgIHF1YWxpdHlNZXRyaWNzOiB7XHJcbiAgICAgICAgcmF0aW5nOiA0LjUsXHJcbiAgICAgICAgcGF0aWVudFJldmlld3M6IDI1MDAsXHJcbiAgICAgICAgc3VjY2Vzc1JhdGU6IDk1LFxyXG4gICAgICAgIGF2ZXJhZ2VXYWl0VGltZTogMzBcclxuICAgICAgfSxcclxuICAgICAgY29zdFN0cnVjdHVyZToge1xyXG4gICAgICAgIGNvbnN1bHRhdGlvbkZlZTogODAwLFxyXG4gICAgICAgIGluc3VyYW5jZUFjY2VwdGVkOiBbJ1N0YXIgSGVhbHRoJywgJ0hERkMgRXJnbycsICdJQ0lDSSBMb21iYXJkJ10sXHJcbiAgICAgICAgcGF5bWVudE1ldGhvZHM6IFsnY2FzaCcsICdjYXJkJywgJ3VwaScsICdpbnN1cmFuY2UnXVxyXG4gICAgICB9LFxyXG4gICAgICBhdmFpbGFiaWxpdHk6IHtcclxuICAgICAgICBob3Vyczoge1xyXG4gICAgICAgICAgbW9uZGF5OiB7IG9wZW46ICcwMDowMCcsIGNsb3NlOiAnMjM6NTknIH0sXHJcbiAgICAgICAgICB0dWVzZGF5OiB7IG9wZW46ICcwMDowMCcsIGNsb3NlOiAnMjM6NTknIH0sXHJcbiAgICAgICAgICB3ZWRuZXNkYXk6IHsgb3BlbjogJzAwOjAwJywgY2xvc2U6ICcyMzo1OScgfSxcclxuICAgICAgICAgIHRodXJzZGF5OiB7IG9wZW46ICcwMDowMCcsIGNsb3NlOiAnMjM6NTknIH0sXHJcbiAgICAgICAgICBmcmlkYXk6IHsgb3BlbjogJzAwOjAwJywgY2xvc2U6ICcyMzo1OScgfSxcclxuICAgICAgICAgIHNhdHVyZGF5OiB7IG9wZW46ICcwMDowMCcsIGNsb3NlOiAnMjM6NTknIH0sXHJcbiAgICAgICAgICBzdW5kYXk6IHsgb3BlbjogJzAwOjAwJywgY2xvc2U6ICcyMzo1OScgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZW1lcmdlbmN5QXZhaWxhYmxlOiB0cnVlLFxyXG4gICAgICAgIGxhc3RVcGRhdGVkOiBuZXcgRGF0ZSgpXHJcbiAgICAgIH0sXHJcbiAgICAgIGNyZWRlbnRpYWxzOiB7XHJcbiAgICAgICAgbGljZW5zZXM6IFsnS0FSLUhPU1AtMjAyMy0wMDEnLCAnTkFCSC1BQ0MtMjAyMyddLFxyXG4gICAgICAgIGNlcnRpZmljYXRpb25zOiBbJ0lTTyA5MDAxOjIwMTUnLCAnSkNJIEFjY3JlZGl0ZWQnXSxcclxuICAgICAgICB2ZXJpZmllZDogdHJ1ZVxyXG4gICAgICB9LFxyXG4gICAgICBpc0FjdGl2ZTogdHJ1ZSxcclxuICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLFxyXG4gICAgICB1cGRhdGVkQXQ6IG5ldyBEYXRlKClcclxuICAgIH07XHJcblxyXG4gICAgaXQoJ3Nob3VsZCB2YWxpZGF0ZSBhIGNvbXBsZXRlIHByb3ZpZGVyIHJlY29yZCcsICgpID0+IHtcclxuICAgICAgY29uc3QgcmVzdWx0ID0gdmFsaWRhdGVEYXRhKHByb3ZpZGVyU2NoZW1hLCB2YWxpZFByb3ZpZGVyKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC5pc1ZhbGlkKS50b0JlKHRydWUpO1xyXG4gICAgICBleHBlY3QocmVzdWx0LmRhdGEpLnRvQmVEZWZpbmVkKCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIHJlamVjdCBwcm92aWRlciB3aXRoIGludmFsaWQgcmF0aW5nJywgKCkgPT4ge1xyXG4gICAgICBjb25zdCBpbnZhbGlkUHJvdmlkZXIgPSB7XHJcbiAgICAgICAgLi4udmFsaWRQcm92aWRlcixcclxuICAgICAgICBxdWFsaXR5TWV0cmljczogeyAuLi52YWxpZFByb3ZpZGVyLnF1YWxpdHlNZXRyaWNzLCByYXRpbmc6IDYgfVxyXG4gICAgICB9O1xyXG4gICAgICBjb25zdCByZXN1bHQgPSB2YWxpZGF0ZURhdGEocHJvdmlkZXJTY2hlbWEsIGludmFsaWRQcm92aWRlcik7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQuaXNWYWxpZCkudG9CZShmYWxzZSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIHZhbGlkYXRlIHByb3ZpZGVyIGNyZWF0aW9uIGlucHV0JywgKCkgPT4ge1xyXG4gICAgICBjb25zdCBjcmVhdGVJbnB1dCA9IHtcclxuICAgICAgICB0eXBlOiB2YWxpZFByb3ZpZGVyLnR5cGUsXHJcbiAgICAgICAgbmFtZTogdmFsaWRQcm92aWRlci5uYW1lLFxyXG4gICAgICAgIGxvY2F0aW9uOiB2YWxpZFByb3ZpZGVyLmxvY2F0aW9uLFxyXG4gICAgICAgIGNhcGFiaWxpdGllczogdmFsaWRQcm92aWRlci5jYXBhYmlsaXRpZXMsXHJcbiAgICAgICAgY2FwYWNpdHk6IHZhbGlkUHJvdmlkZXIuY2FwYWNpdHksXHJcbiAgICAgICAgcXVhbGl0eU1ldHJpY3M6IHZhbGlkUHJvdmlkZXIucXVhbGl0eU1ldHJpY3MsXHJcbiAgICAgICAgY29zdFN0cnVjdHVyZTogdmFsaWRQcm92aWRlci5jb3N0U3RydWN0dXJlLFxyXG4gICAgICAgIGF2YWlsYWJpbGl0eTogdmFsaWRQcm92aWRlci5hdmFpbGFiaWxpdHksXHJcbiAgICAgICAgY3JlZGVudGlhbHM6IHZhbGlkUHJvdmlkZXIuY3JlZGVudGlhbHNcclxuICAgICAgfTtcclxuICAgICAgY29uc3QgcmVzdWx0ID0gdmFsaWRhdGVEYXRhKGNyZWF0ZVByb3ZpZGVySW5wdXRTY2hlbWEsIGNyZWF0ZUlucHV0KTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC5pc1ZhbGlkKS50b0JlKHRydWUpO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdSZWZlcnJhbCBEYXRhIE1vZGVsJywgKCkgPT4ge1xyXG4gICAgY29uc3QgdmFsaWRSZWZlcnJhbDogUmVmZXJyYWwgPSB7XHJcbiAgICAgIHJlZmVycmFsSWQ6IHV1aWR2NCgpLFxyXG4gICAgICBlcGlzb2RlSWQ6IHV1aWR2NCgpLFxyXG4gICAgICBmcm9tUHJvdmlkZXI6IHV1aWR2NCgpLFxyXG4gICAgICB0b1Byb3ZpZGVyOiB1dWlkdjQoKSxcclxuICAgICAgdXJnZW5jeTogVXJnZW5jeUxldmVsLlVSR0VOVCxcclxuICAgICAgcmVhc29uOiAnUGF0aWVudCByZXF1aXJlcyBzcGVjaWFsaXplZCBjYXJkaWFjIGV2YWx1YXRpb24nLFxyXG4gICAgICBwYXRpZW50Q29udGV4dDoge1xyXG4gICAgICAgIHN5bXB0b21zOiB7IGNoZXN0X3BhaW46IHRydWUsIHNob3J0bmVzc19vZl9icmVhdGg6IHRydWUgfSxcclxuICAgICAgICBhc3Nlc3NtZW50czogeyBlY2c6ICdhYm5vcm1hbCcsIGJsb29kX3ByZXNzdXJlOiAnMTYwLzk1JyB9LFxyXG4gICAgICAgIHRyZWF0bWVudHM6IHsgbWVkaWNhdGlvbnM6IFsnYXNwaXJpbicsICdtZXRvcHJvbG9sJ10gfSxcclxuICAgICAgICBub3RlczogJ1BhdGllbnQgcHJlc2VudGluZyB3aXRoIGNoZXN0IHBhaW4gYW5kIGVsZXZhdGVkIEJQJyxcclxuICAgICAgICB2aXRhbFNpZ25zOiB7IGhlYXJ0X3JhdGU6IDk1LCBibG9vZF9wcmVzc3VyZTogJzE2MC85NScsIHRlbXBlcmF0dXJlOiA5OC42IH1cclxuICAgICAgfSxcclxuICAgICAgc3RhdHVzOiBSZWZlcnJhbFN0YXR1cy5QRU5ESU5HLFxyXG4gICAgICB0aW1lbGluZToge1xyXG4gICAgICAgIHJlcXVlc3RlZEF0OiBuZXcgRGF0ZSgpLFxyXG4gICAgICAgIGFjY2VwdGVkQXQ6IHVuZGVmaW5lZCxcclxuICAgICAgICBjb21wbGV0ZWRBdDogdW5kZWZpbmVkLFxyXG4gICAgICAgIHJlamVjdGVkQXQ6IHVuZGVmaW5lZFxyXG4gICAgICB9LFxyXG4gICAgICBmb2xsb3dVcEluc3RydWN0aW9uczogJ0Vuc3VyZSBwYXRpZW50IGJyaW5ncyBhbGwgcHJldmlvdXMgY2FyZGlhYyByZXBvcnRzJyxcclxuICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLFxyXG4gICAgICB1cGRhdGVkQXQ6IG5ldyBEYXRlKClcclxuICAgIH07XHJcblxyXG4gICAgaXQoJ3Nob3VsZCB2YWxpZGF0ZSBhIGNvbXBsZXRlIHJlZmVycmFsIHJlY29yZCcsICgpID0+IHtcclxuICAgICAgY29uc3QgcmVzdWx0ID0gdmFsaWRhdGVEYXRhKHJlZmVycmFsU2NoZW1hLCB2YWxpZFJlZmVycmFsKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC5pc1ZhbGlkKS50b0JlKHRydWUpO1xyXG4gICAgICBleHBlY3QocmVzdWx0LmRhdGEpLnRvQmVEZWZpbmVkKCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIHZhbGlkYXRlIHJlZmVycmFsIGNyZWF0aW9uIGlucHV0JywgKCkgPT4ge1xyXG4gICAgICBjb25zdCBjcmVhdGVJbnB1dCA9IHtcclxuICAgICAgICBlcGlzb2RlSWQ6IHZhbGlkUmVmZXJyYWwuZXBpc29kZUlkLFxyXG4gICAgICAgIGZyb21Qcm92aWRlcjogdmFsaWRSZWZlcnJhbC5mcm9tUHJvdmlkZXIsXHJcbiAgICAgICAgdG9Qcm92aWRlcjogdmFsaWRSZWZlcnJhbC50b1Byb3ZpZGVyLFxyXG4gICAgICAgIHVyZ2VuY3k6IHZhbGlkUmVmZXJyYWwudXJnZW5jeSxcclxuICAgICAgICByZWFzb246IHZhbGlkUmVmZXJyYWwucmVhc29uLFxyXG4gICAgICAgIHBhdGllbnRDb250ZXh0OiB2YWxpZFJlZmVycmFsLnBhdGllbnRDb250ZXh0LFxyXG4gICAgICAgIGZvbGxvd1VwSW5zdHJ1Y3Rpb25zOiB2YWxpZFJlZmVycmFsLmZvbGxvd1VwSW5zdHJ1Y3Rpb25zXHJcbiAgICAgIH07XHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IHZhbGlkYXRlRGF0YShjcmVhdGVSZWZlcnJhbElucHV0U2NoZW1hLCBjcmVhdGVJbnB1dCk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQuaXNWYWxpZCkudG9CZSh0cnVlKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnRW51bSBWYWx1ZXMnLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIGhhdmUgY29ycmVjdCB1cmdlbmN5IGxldmVsIHZhbHVlcycsICgpID0+IHtcclxuICAgICAgZXhwZWN0KE9iamVjdC52YWx1ZXMoVXJnZW5jeUxldmVsKSkudG9FcXVhbChbXHJcbiAgICAgICAgJ2VtZXJnZW5jeScsXHJcbiAgICAgICAgJ3VyZ2VudCcsXHJcbiAgICAgICAgJ3JvdXRpbmUnLFxyXG4gICAgICAgICdzZWxmLWNhcmUnXHJcbiAgICAgIF0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBoYXZlIGNvcnJlY3QgZXBpc29kZSBzdGF0dXMgdmFsdWVzJywgKCkgPT4ge1xyXG4gICAgICBleHBlY3QoT2JqZWN0LnZhbHVlcyhFcGlzb2RlU3RhdHVzKSkudG9FcXVhbChbXHJcbiAgICAgICAgJ2FjdGl2ZScsXHJcbiAgICAgICAgJ2NvbXBsZXRlZCcsXHJcbiAgICAgICAgJ2VzY2FsYXRlZCcsXHJcbiAgICAgICAgJ2NhbmNlbGxlZCdcclxuICAgICAgXSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGhhdmUgY29ycmVjdCBwcm92aWRlciB0eXBlIHZhbHVlcycsICgpID0+IHtcclxuICAgICAgZXhwZWN0KE9iamVjdC52YWx1ZXMoUHJvdmlkZXJUeXBlKSkudG9FcXVhbChbXHJcbiAgICAgICAgJ2hvc3BpdGFsJyxcclxuICAgICAgICAnY2xpbmljJyxcclxuICAgICAgICAnc3BlY2lhbGlzdCcsXHJcbiAgICAgICAgJ3BoYXJtYWN5J1xyXG4gICAgICBdKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgaGF2ZSBjb3JyZWN0IHJlZmVycmFsIHN0YXR1cyB2YWx1ZXMnLCAoKSA9PiB7XHJcbiAgICAgIGV4cGVjdChPYmplY3QudmFsdWVzKFJlZmVycmFsU3RhdHVzKSkudG9FcXVhbChbXHJcbiAgICAgICAgJ3BlbmRpbmcnLFxyXG4gICAgICAgICdhY2NlcHRlZCcsXHJcbiAgICAgICAgJ2NvbXBsZXRlZCcsXHJcbiAgICAgICAgJ3JlamVjdGVkJ1xyXG4gICAgICBdKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG59KTsiXX0=