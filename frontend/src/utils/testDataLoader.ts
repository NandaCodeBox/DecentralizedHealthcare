// Utility to load test data into the application
import sampleData from '@/data/sampleData';

// Load sample data into the app's services
export const loadTestDataIntoApp = () => {
  try {
    // Load data into localStorage for offline service
    localStorage.setItem('healthcare_episodes', JSON.stringify(sampleData.careEpisodes));
    localStorage.setItem('healthcare_profile', JSON.stringify(sampleData.userProfile));
    localStorage.setItem('healthcare_settings', JSON.stringify(sampleData.settings));
    localStorage.setItem('healthcare_providers', JSON.stringify(sampleData.providers));
    
    // Set session data for current session
    sessionStorage.setItem('current_user', JSON.stringify({
      id: 'PAT001',
      name: sampleData.userProfile.personalInfo.name,
      email: sampleData.userProfile.personalInfo.email,
    }));
    
    console.log('✅ Test data loaded successfully!');
    console.log('📊 Loaded:', {
      episodes: sampleData.careEpisodes.length,
      providers: sampleData.providers.length,
      profile: 'Complete',
      settings: 'Default'
    });
    
    return true;
  } catch (error) {
    console.error('❌ Failed to load test data:', error);
    return false;
  }
};

// Quick console commands for testing
if (typeof window !== 'undefined') {
  // Make functions available in browser console
  (window as any).loadTestData = loadTestDataIntoApp;
  (window as any).clearTestData = sampleData.clearSampleData;
  (window as any).sampleData = sampleData;
  
  console.log('🧪 Test data utilities loaded!');
  console.log('📝 Available commands:');
  console.log('  - loadTestData() - Load all sample data');
  console.log('  - clearTestData() - Clear all sample data');
  console.log('  - sampleData - Access all sample data objects');
}