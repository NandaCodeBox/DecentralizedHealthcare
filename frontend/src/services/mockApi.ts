// Mock API service for testing when backend is not available
import { ApiResponse, SymptomData, CareEpisode, Provider, Patient } from '@/types';
import sampleData from '@/data/sampleData';

class MockApiService {
  private delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  async submitSymptoms(symptomData: SymptomData): Promise<ApiResponse<CareEpisode>> {
    await this.delay(1000); // Simulate network delay

    // Create a new episode based on the symptom data
    const newEpisode: CareEpisode = {
      episodeId: `EP${Date.now()}`,
      patientId: 'PAT001',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      symptoms: symptomData,
      triage: {
        urgencyLevel: this.determineUrgency(symptomData),
        ruleBasedScore: this.calculateRuleBasedScore(symptomData),
        aiAssessment: {
          used: true,
          confidence: 0.8,
          reasoning: `Based on your symptoms (severity ${symptomData.severity}/10), this appears to require ${this.determineUrgency(symptomData)} care.`,
        },
      },
      interactions: [
        {
          timestamp: new Date().toISOString(),
          type: 'symptom_report',
          actor: 'patient',
          details: { source: 'patient_app' },
        },
      ],
      carePathway: {
        recommendedLevel: this.determineUrgency(symptomData) === 'emergency' ? 'emergency_care' : 'primary_care',
        alternativeProviders: ['PROV001', 'PROV002'],
        estimatedCost: 800,
        expectedDuration: '24-48 hours',
      },
    };

    return {
      success: true,
      data: newEpisode,
      message: 'Symptoms submitted successfully (mock response)',
    };
  }

  async getEpisodes(): Promise<ApiResponse<CareEpisode[]>> {
    await this.delay(500);
    
    return {
      success: true,
      data: sampleData.careEpisodes,
    };
  }

  async getEpisode(episodeId: string): Promise<ApiResponse<CareEpisode>> {
    await this.delay(300);
    
    const episode = sampleData.careEpisodes.find(ep => ep.episodeId === episodeId);
    
    if (episode) {
      return {
        success: true,
        data: episode,
      };
    } else {
      return {
        success: false,
        error: 'Episode not found',
      };
    }
  }

  async findProviders(): Promise<ApiResponse<Provider[]>> {
    await this.delay(800);
    
    return {
      success: true,
      data: sampleData.providers,
    };
  }

  async getProvider(providerId: string): Promise<ApiResponse<Provider>> {
    await this.delay(300);
    
    const provider = sampleData.providers.find(p => p.providerId === providerId);
    
    if (provider) {
      return {
        success: true,
        data: provider,
      };
    } else {
      return {
        success: false,
        error: 'Provider not found',
      };
    }
  }

  async getProfile(): Promise<ApiResponse<Patient>> {
    await this.delay(400);
    
    // Convert sample profile to Patient type
    const patient: Patient = {
      patientId: 'PAT001',
      demographics: {
        age: parseInt(sampleData.userProfile.personalInfo.age),
        gender: sampleData.userProfile.personalInfo.gender,
        location: {
          state: 'Maharashtra',
          district: 'Mumbai',
          pincode: '400050',
          coordinates: { lat: 19.0596, lng: 72.8295 },
        },
        preferredLanguage: sampleData.userProfile.preferences.preferredLanguage,
        insuranceInfo: {
          provider: 'Star Health Insurance',
          policyNumber: 'SH123456789',
          coverage: {},
        },
      },
      medicalHistory: {
        conditions: sampleData.userProfile.medicalInfo.medicalConditions.split(', '),
        medications: sampleData.userProfile.medicalInfo.medications.split(', '),
        allergies: sampleData.userProfile.medicalInfo.allergies.split(', '),
      },
      preferences: {
        providerGender: sampleData.userProfile.preferences.providerGender,
        maxTravelDistance: parseInt(sampleData.userProfile.preferences.maxTravelDistance),
        costSensitivity: sampleData.userProfile.preferences.costSensitivity,
      },
      createdAt: '2023-01-01T00:00:00Z',
      updatedAt: new Date().toISOString(),
    };
    
    return {
      success: true,
      data: patient,
    };
  }

  async updateProfile(profileData: Partial<Patient>): Promise<ApiResponse<Patient>> {
    await this.delay(600);
    
    // In a real implementation, this would update the profile
    const currentProfile = await this.getProfile();
    
    if (currentProfile.success && currentProfile.data) {
      const updatedProfile = { ...currentProfile.data, ...profileData };
      return {
        success: true,
        data: updatedProfile,
        message: 'Profile updated successfully (mock response)',
      };
    }
    
    return {
      success: false,
      error: 'Failed to update profile',
    };
  }

  async healthCheck(): Promise<boolean> {
    await this.delay(100);
    return true; // Mock API is always "healthy"
  }

  async testConnection(): Promise<boolean> {
    await this.delay(100);
    return true; // Mock API is always "connected"
  }

  // Helper methods
  private determineUrgency(symptomData: SymptomData): 'emergency' | 'urgent' | 'routine' | 'self-care' {
    const severity = symptomData.severity;
    const complaint = symptomData.primaryComplaint.toLowerCase();
    
    // Emergency keywords
    if (complaint.includes('chest pain') || 
        complaint.includes('difficulty breathing') || 
        complaint.includes('severe bleeding') ||
        severity >= 9) {
      return 'emergency';
    }
    
    // Urgent keywords
    if (complaint.includes('severe') || 
        complaint.includes('intense') || 
        severity >= 7) {
      return 'urgent';
    }
    
    // Self-care for mild symptoms
    if (severity <= 3) {
      return 'self-care';
    }
    
    // Default to routine
    return 'routine';
  }

  private calculateRuleBasedScore(symptomData: SymptomData): number {
    let score = symptomData.severity * 10;
    
    // Adjust based on duration
    if (symptomData.duration === 'lessThan1Hour') score += 10;
    if (symptomData.duration === '1to6Hours') score += 15;
    if (symptomData.duration === '6to24Hours') score += 10;
    
    // Adjust based on complaint keywords
    const complaint = symptomData.primaryComplaint.toLowerCase();
    if (complaint.includes('chest') || complaint.includes('heart')) score += 20;
    if (complaint.includes('breathing') || complaint.includes('breath')) score += 15;
    if (complaint.includes('severe') || complaint.includes('intense')) score += 10;
    
    return Math.min(score, 100); // Cap at 100
  }
}

export const mockApiService = new MockApiService();
export default mockApiService;