// Test script to verify frontend configuration
const API_BASE_URL = 'https://gm858vl0lh.execute-api.us-east-1.amazonaws.com/v1';

async function testFrontendConfig() {
  console.log('🔍 Testing frontend configuration...');
  
  // Test the demo symptoms endpoint directly
  try {
    console.log('\n🩺 Testing demo symptoms endpoint directly...');
    const response = await fetch(`${API_BASE_URL}/demo/symptoms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        primaryComplaint: 'Test headache',
        duration: '2hours',
        severity: 5,
        inputMethod: 'text'
      })
    });
    
    console.log('Demo Symptoms Status:', response.status);
    console.log('Demo Symptoms Headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      const data = await response.json();
      console.log('Demo Symptoms Response:', data);
      console.log('✅ Demo symptoms endpoint working!');
    } else {
      const errorText = await response.text();
      console.log('❌ Demo symptoms failed:', errorText);
    }
  } catch (error) {
    console.log('❌ Demo symptoms failed:', error.message);
  }
  
  // Test the regular symptoms endpoint (should fail with 401)
  try {
    console.log('\n🔒 Testing regular symptoms endpoint (should fail with 401)...');
    const response = await fetch(`${API_BASE_URL}/symptoms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        primaryComplaint: 'Test headache',
        duration: '2hours',
        severity: 5,
        inputMethod: 'text'
      })
    });
    
    console.log('Regular Symptoms Status:', response.status);
    if (response.status === 401) {
      console.log('✅ Regular symptoms endpoint correctly requires authentication');
    } else {
      console.log('❌ Regular symptoms endpoint should return 401');
    }
  } catch (error) {
    console.log('❌ Regular symptoms test failed:', error.message);
  }
}

testFrontendConfig().then(() => {
  console.log('\n🏁 Frontend configuration test completed');
}).catch(error => {
  console.log('💥 Test script error:', error);
});