// API configuration for development and production
import { apiService } from '@/services/api';
import { mockApiService } from '@/services/mockApi';
import { demoApiService } from '@/services/demoApi';

// Configuration flags
const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';
const USE_DEMO_API = process.env.NEXT_PUBLIC_USE_DEMO_API === 'true';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';

// Export the appropriate service based on configuration
export const activeApiService = USE_MOCK_API ? mockApiService : 
                                USE_DEMO_API ? demoApiService : 
                                apiService;

// Development helper to switch APIs at runtime
if (typeof window !== 'undefined') {
  (window as any).switchToMockApi = () => {
    console.log('🔄 Switched to Mock API for testing');
    return mockApiService;
  };
  
  (window as any).switchToDemoApi = () => {
    console.log('🔄 Switched to Demo API for testing (no auth required)');
    return demoApiService;
  };
  
  (window as any).switchToRealApi = () => {
    console.log('🔄 Switched to Real API (requires authentication)');
    return apiService;
  };
  
  (window as any).testConnection = async () => {
    try {
      const isConnected = await activeApiService.testConnection();
      console.log(`🌐 Connection test: ${isConnected ? 'SUCCESS' : 'FAILED'}`);
      return isConnected;
    } catch (error) {
      console.log('🌐 Connection test: FAILED', error);
      return false;
    }
  };
  
  console.log(`🔧 API Configuration:
  - Base URL: ${API_BASE_URL}
  - Using Mock API: ${USE_MOCK_API}
  - Using Demo API: ${USE_DEMO_API}
  - Backend Available: Real AWS infrastructure deployed
  - Available commands:
    • switchToMockApi() - Use mock data for testing
    • switchToDemoApi() - Use demo API (no auth required)
    • switchToRealApi() - Use real backend API (requires auth)
    • testConnection() - Test backend connectivity`);
}

export { apiService, mockApiService, demoApiService };
export default activeApiService;