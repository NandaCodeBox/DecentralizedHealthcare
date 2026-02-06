import axios, { AxiosInstance } from 'axios';
import { ApiResponse, SymptomData, CareEpisode, Provider, Patient } from '@/types';

class DemoApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Demo symptom intake - no authentication required
  async submitSymptoms(symptomData: SymptomData): Promise<ApiResponse<CareEpisode>> {
    try {
      const response = await this.api.post('/demo/symptoms', symptomData);
      
      // Create a mock episode response
      const mockEpisode: CareEpisode = {
        episodeId: response.data.episodeId || `demo-episode-${Date.now()}`,
        patientId: 'demo-patient',
        symptoms: symptomData, // Use the entire symptomData object
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        interactions: [
          {
            timestamp: new Date().toISOString(),
            type: 'symptom_report',
            actor: 'patient',
            details: { source: 'demo_api' }
          }
        ],
        triage: {
          urgencyLevel: 'routine',
          ruleBasedScore: 50,
          aiAssessment: {
            used: true,
            confidence: 0.85,
            reasoning: 'Based on your symptoms, this appears to be a non-emergency condition that should be evaluated by a healthcare provider.'
          }
        }
      };
      
      return {
        success: true,
        data: mockEpisode,
        message: 'Demo symptoms submitted successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to submit demo symptoms'
      };
    }
  }

  // Mock episodes for demo
  async getEpisodes(): Promise<ApiResponse<CareEpisode[]>> {
    return {
      success: true,
      data: [
        {
          episodeId: 'demo-episode-1',
          patientId: 'demo-patient',
          symptoms: {
            primaryComplaint: 'Persistent headache for 2 days',
            duration: '2days',
            severity: 5,
            associatedSymptoms: 'fatigue, mild nausea',
            inputMethod: 'text'
          },
          status: 'active',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          updatedAt: new Date(Date.now() - 86400000).toISOString(),
          interactions: [
            {
              timestamp: new Date(Date.now() - 86400000).toISOString(),
              type: 'symptom_report',
              actor: 'patient',
              details: { source: 'demo_api' }
            }
          ],
          triage: {
            urgencyLevel: 'routine',
            ruleBasedScore: 50,
            aiAssessment: {
              used: true,
              confidence: 0.8,
              reasoning: 'Tension headache likely, monitor symptoms'
            }
          }
        }
      ]
    };
  }

  // Mock profile for demo
  async getProfile(): Promise<ApiResponse<Patient>> {
    return {
      success: true,
      data: {
        patientId: 'demo-patient',
        demographics: {
          age: 30,
          gender: 'other',
          location: {
            state: 'Demo State',
            district: 'Demo District',
            pincode: '12345',
            coordinates: { lat: 19.0596, lng: 72.8295 }
          },
          preferredLanguage: 'en',
          insuranceInfo: {
            provider: 'Demo Insurance',
            policyNumber: 'DEMO123456',
            coverage: {}
          }
        },
        medicalHistory: {
          conditions: ['Demo condition'],
          medications: ['Demo medication'],
          allergies: ['Demo allergy']
        },
        preferences: {
          providerGender: 'any',
          maxTravelDistance: 25,
          costSensitivity: 'moderate'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
  }

  // Mock profile update for demo
  async updateProfile(profileData: Partial<Patient>): Promise<ApiResponse<Patient>> {
    return {
      success: true,
      data: {
        patientId: 'demo-patient',
        demographics: {
          age: 30,
          gender: 'other',
          location: {
            state: 'Demo State',
            district: 'Demo District',
            pincode: '12345',
            coordinates: { lat: 19.0596, lng: 72.8295 }
          },
          preferredLanguage: 'en',
          insuranceInfo: {
            provider: 'Demo Insurance',
            policyNumber: 'DEMO123456',
            coverage: {}
          }
        },
        medicalHistory: {
          conditions: ['Demo condition'],
          medications: ['Demo medication'],
          allergies: ['Demo allergy']
        },
        preferences: {
          providerGender: 'any',
          maxTravelDistance: 25,
          costSensitivity: 'moderate'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      message: 'Demo profile updated successfully'
    };
  }

  // Mock providers for demo
  async findProviders(): Promise<ApiResponse<Provider[]>> {
    return {
      success: true,
      data: [
        {
          providerId: 'demo-provider-1',
          type: 'clinic',
          name: 'Demo Medical Clinic',
          location: {
            address: '456 Medical Street',
            state: 'Demo State',
            district: 'Demo District',
            pincode: '12345',
            coordinates: { lat: 19.0596, lng: 72.8295 }
          },
          capabilities: {
            specialties: ['General Practice'],
            services: ['Consultation', 'Basic Tests'],
            equipment: ['X-Ray', 'ECG'],
            languages: ['English', 'Hindi']
          },
          capacity: {
            dailyPatientCapacity: 50,
            currentLoad: 25
          },
          qualityMetrics: {
            rating: 4.5,
            patientReviews: 100,
            successRate: 95,
            averageWaitTime: 15
          },
          costStructure: {
            consultationFee: 500,
            insuranceAccepted: ['Demo Insurance'],
            paymentMethods: ['cash', 'card', 'upi']
          },
          availability: {
            hours: {
              monday: { start: '09:00', end: '17:00' },
              tuesday: { start: '09:00', end: '17:00' },
              wednesday: { start: '09:00', end: '17:00' },
              thursday: { start: '09:00', end: '17:00' },
              friday: { start: '09:00', end: '17:00' }
            },
            emergencyAvailable: false,
            lastUpdated: new Date().toISOString()
          },
          credentials: {
            licenses: ['DEMO123'],
            certifications: ['Demo Certification'],
            verified: true
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]
    };
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.api.get('/health');
      return response.status === 200;
    } catch {
      return false;
    }
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/test`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const demoApiService = new DemoApiService();
export default demoApiService;