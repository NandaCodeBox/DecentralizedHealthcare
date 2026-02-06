import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ApiResponse, SymptomData, CareEpisode, Provider, Patient } from '@/types';
import { bandwidthService } from './bandwidth';

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';
    
    // Get network-aware timeout values
    const timeouts = bandwidthService.getTimeouts();
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: timeouts.request,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for auth and compression
    this.api.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add network quality headers for server optimization
        const networkQuality = bandwidthService.getNetworkQuality();
        const isDataSaver = bandwidthService.isDataSaverEnabled();
        
        config.headers['X-Network-Quality'] = networkQuality;
        config.headers['X-Data-Saver'] = isDataSaver.toString();

        // Compress request data for poor connections
        if (config.data && (networkQuality === 'poor' || networkQuality === 'moderate' || isDataSaver)) {
          const originalData = config.data;
          const compressedData = bandwidthService.compressData(originalData, {
            level: networkQuality === 'poor' ? 'high' : 'medium'
          });
          
          // Only use compression if it actually reduces size
          if (compressedData.length < JSON.stringify(originalData).length) {
            config.data = { _compressed: compressedData };
            config.headers['X-Content-Compressed'] = 'true';
          }
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling and decompression
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        // Track data usage
        const responseSize = bandwidthService.estimateDataSize(response.data);
        bandwidthService.trackDataUsage(responseSize);

        // Decompress response if needed
        if (response.headers['x-content-compressed'] === 'true' && response.data._compressed) {
          const decompressed = bandwidthService.decompressData(response.data._compressed);
          if (decompressed) {
            response.data = decompressed;
          }
        }

        return response;
      },
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized access
          this.handleUnauthorized();
        }
        return Promise.reject(error);
      }
    );
  }

  private getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken');
    }
    return null;
  }

  private handleUnauthorized(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      // Redirect to login or show auth modal
      window.location.href = '/login';
    }
  }

  /**
   * Make network-aware API request with automatic retries
   */
  private async makeRequest<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    retries: number = 3
  ): Promise<AxiosResponse<T>> {
    const timeouts = bandwidthService.getTimeouts();
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await requestFn();
      } catch (error: any) {
        const isNetworkError = !error.response || error.code === 'NETWORK_ERROR';
        const shouldRetry = attempt < retries && isNetworkError;
        
        if (shouldRetry) {
          // Exponential backoff with network-aware delays
          const delay = Math.min(timeouts.retry * Math.pow(2, attempt - 1), 30000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        throw error;
      }
    }
    
    throw new Error('Max retries exceeded');
  }

  // Symptom intake with AWS API Gateway
  async submitSymptoms(symptomData: SymptomData): Promise<ApiResponse<CareEpisode>> {
    try {
      const response = await this.makeRequest(() => 
        this.api.post('/symptoms', symptomData)
      );
      
      return {
        success: true,
        data: response.data,
        message: 'Symptoms submitted successfully'
      };
    } catch (error: any) {
      // Check if this is a network/connection error
      const isNetworkError = !error.response || 
        error.code === 'NETWORK_ERROR' || 
        error.code === 'ERR_CONNECTION_REFUSED' ||
        error.message?.includes('ERR_CONNECTION_REFUSED') ||
        error.message?.includes('Network Error');
      
      if (isNetworkError) {
        return {
          success: false,
          error: 'Unable to connect to server. Please check your internet connection or try again later.',
          offline: true // Flag to indicate this should be handled offline
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to submit symptoms'
      };
    }
  }

  // Get care episodes from AWS API
  async getEpisodes(patientId?: string, limit?: number, offset?: number): Promise<ApiResponse<CareEpisode[]>> {
    try {
      const networkQuality = bandwidthService.getNetworkQuality();
      
      // Adjust page size based on network quality
      const pageSize = limit || this.getOptimalPageSize(networkQuality);
      const params = new URLSearchParams();
      
      if (patientId) params.append('patientId', patientId);
      params.append('limit', pageSize.toString());
      if (offset) params.append('offset', offset.toString());
      
      const url = `/episodes?${params.toString()}`;
      const response = await this.makeRequest(() => this.api.get(url));
      
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      // Check if this is a network/connection error
      const isNetworkError = !error.response || 
        error.code === 'NETWORK_ERROR' || 
        error.code === 'ERR_CONNECTION_REFUSED' ||
        error.message?.includes('ERR_CONNECTION_REFUSED') ||
        error.message?.includes('Network Error');
      
      if (isNetworkError) {
        return {
          success: false,
          error: 'Unable to connect to server. Showing cached data.',
          offline: true
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch episodes'
      };
    }
  }

  /**
   * Get optimal page size based on network quality
   */
  private getOptimalPageSize(networkQuality: string): number {
    const pageSizes = {
      poor: 5,
      moderate: 10,
      good: 20,
      excellent: 50,
    };
    return pageSizes[networkQuality as keyof typeof pageSizes] || 10;
  }

  // Get episode by ID with caching
  async getEpisode(episodeId: string): Promise<ApiResponse<CareEpisode>> {
    try {
      const response = await this.makeRequest(() => 
        this.api.get(`/episodes/${episodeId}`)
      );
      
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch episode'
      };
    }
  }

  // Get triage results with compression
  async getTriageResults(episodeId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.makeRequest(() => 
        this.api.get(`/triage/${episodeId}`)
      );
      
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch triage results'
      };
    }
  }

  // Find providers with network-aware filtering
  async findProviders(criteria: {
    location?: { lat: number; lng: number };
    specialty?: string;
    urgencyLevel?: string;
    maxDistance?: number;
    costRange?: { min: number; max: number };
    limit?: number;
  }): Promise<ApiResponse<Provider[]>> {
    try {
      const networkQuality = bandwidthService.getNetworkQuality();
      
      // Limit results based on network quality to reduce data usage
      const optimizedCriteria = {
        ...criteria,
        limit: criteria.limit || this.getOptimalPageSize(networkQuality),
        // Reduce search radius for poor connections
        maxDistance: networkQuality === 'poor' ? 
          Math.min(criteria.maxDistance || 50, 25) : 
          criteria.maxDistance,
      };
      
      const response = await this.makeRequest(() => 
        this.api.post('/providers/search', optimizedCriteria)
      );
      
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to find providers'
      };
    }
  }

  // Get provider details with caching
  async getProvider(providerId: string): Promise<ApiResponse<Provider>> {
    try {
      const response = await this.makeRequest(() => 
        this.api.get(`/providers/${providerId}`)
      );
      
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch provider'
      };
    }
  }

  // Patient profile CRUD operations
  async getProfile(): Promise<ApiResponse<Patient>> {
    try {
      const response = await this.makeRequest(() => 
        this.api.get('/patients/profile')
      );
      
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch profile'
      };
    }
  }

  async updateProfile(profileData: Partial<Patient>): Promise<ApiResponse<Patient>> {
    try {
      const response = await this.makeRequest(() => 
        this.api.put('/patients/profile', profileData)
      );
      
      return {
        success: true,
        data: response.data,
        message: 'Profile updated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update profile'
      };
    }
  }

  async createProfile(profileData: Patient): Promise<ApiResponse<Patient>> {
    try {
      const response = await this.makeRequest(() => 
        this.api.post('/patients', profileData)
      );
      
      return {
        success: true,
        data: response.data,
        message: 'Profile created successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create profile'
      };
    }
  }

  async deleteProfile(): Promise<ApiResponse<void>> {
    try {
      await this.makeRequest(() => 
        this.api.delete('/patients/profile')
      );
      
      return {
        success: true,
        message: 'Profile deleted successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete profile'
      };
    }
  }

  // Episode CRUD operations
  async createEpisode(episodeData: Partial<CareEpisode>): Promise<ApiResponse<CareEpisode>> {
    try {
      const response = await this.makeRequest(() => 
        this.api.post('/episodes', episodeData)
      );
      
      return {
        success: true,
        data: response.data,
        message: 'Episode created successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create episode'
      };
    }
  }

  async updateEpisode(episodeId: string, episodeData: Partial<CareEpisode>): Promise<ApiResponse<CareEpisode>> {
    try {
      const response = await this.makeRequest(() => 
        this.api.put(`/episodes/${episodeId}`, episodeData)
      );
      
      return {
        success: true,
        data: response.data,
        message: 'Episode updated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update episode'
      };
    }
  }

  async deleteEpisode(episodeId: string): Promise<ApiResponse<void>> {
    try {
      await this.makeRequest(() => 
        this.api.delete(`/episodes/${episodeId}`)
      );
      
      return {
        success: true,
        message: 'Episode deleted successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete episode'
      };
    }
  }

  // Provider CRUD operations
  async createProvider(providerData: Partial<Provider>): Promise<ApiResponse<Provider>> {
    try {
      const response = await this.makeRequest(() => 
        this.api.post('/providers', providerData)
      );
      
      return {
        success: true,
        data: response.data,
        message: 'Provider created successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create provider'
      };
    }
  }

  async updateProvider(providerId: string, providerData: Partial<Provider>): Promise<ApiResponse<Provider>> {
    try {
      const response = await this.makeRequest(() => 
        this.api.put(`/providers/${providerId}`, providerData)
      );
      
      return {
        success: true,
        data: response.data,
        message: 'Provider updated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update provider'
      };
    }
  }

  async deleteProvider(providerId: string): Promise<ApiResponse<void>> {
    try {
      await this.makeRequest(() => 
        this.api.delete(`/providers/${providerId}`)
      );
      
      return {
        success: true,
        message: 'Provider deleted successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete provider'
      };
    }
  }

  // Triage operations
  async submitTriage(triageData: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.makeRequest(() => 
        this.api.post('/triage', triageData)
      );
      
      return {
        success: true,
        data: response.data,
        message: 'Triage submitted successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to submit triage'
      };
    }
  }

  // Emergency operations
  async submitEmergencyAlert(alertData: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.makeRequest(() => 
        this.api.post('/emergency/alert', alertData)
      );
      
      return {
        success: true,
        data: response.data,
        message: 'Emergency alert sent successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to send emergency alert'
      };
    }
  }

  async escalateEmergency(episodeId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.makeRequest(() => 
        this.api.post('/emergency/escalate', { episodeId })
      );
      
      return {
        success: true,
        data: response.data,
        message: 'Emergency escalated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to escalate emergency'
      };
    }
  }

  // Validation operations
  async submitValidation(validationData: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.makeRequest(() => 
        this.api.post('/validation', validationData)
      );
      
      return {
        success: true,
        data: response.data,
        message: 'Validation submitted successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to submit validation'
      };
    }
  }

  async getValidationQueue(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.makeRequest(() => 
        this.api.get('/validation')
      );
      
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch validation queue'
      };
    }
  }

  async updateValidation(validationId: string, validationData: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.makeRequest(() => 
        this.api.put(`/validation/${validationId}`, validationData)
      );
      
      return {
        success: true,
        data: response.data,
        message: 'Validation updated successfully'
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update validation'
      };
    }
  }

  // Health check with network awareness
  async healthCheck(): Promise<boolean> {
    try {
      const timeouts = bandwidthService.getTimeouts();
      const response = await Promise.race([
        this.api.get('/health'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), timeouts.request / 2)
        )
      ]);
      return true;
    } catch {
      return false;
    }
  }

  // Simple connectivity test that doesn't require auth
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get current data usage statistics
   */
  getDataUsage() {
    return bandwidthService.getDataUsage();
  }

  /**
   * Check if data limit is exceeded
   */
  isDataLimitExceeded(limitMB: number = 50): boolean {
    return bandwidthService.isDataLimitExceeded(limitMB);
  }

  /**
   * Get network quality for UI adaptation
   */
  getNetworkQuality() {
    return bandwidthService.getNetworkQuality();
  }
}

export const apiService = new ApiService();
export default apiService;