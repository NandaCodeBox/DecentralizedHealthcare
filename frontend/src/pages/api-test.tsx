import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout/Layout';
import activeApiService from '@/config/api';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

const ApiTestPage: React.FC = () => {
  const [testResults, setTestResults] = useState<Record<string, 'pending' | 'success' | 'error'>>({});
  const [testMessages, setTestMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    runTests();
  }, []);

  const runTests = async () => {
    const tests = [
      { name: 'healthCheck', test: () => activeApiService.healthCheck() },
      { name: 'getEpisodes', test: () => activeApiService.getEpisodes() },
      { name: 'getProfile', test: () => activeApiService.getProfile() },
      { name: 'findProviders', test: () => activeApiService.findProviders({}) },
    ];

    for (const { name, test } of tests) {
      setTestResults(prev => ({ ...prev, [name]: 'pending' }));
      
      try {
        const result = await test();
        if (name === 'healthCheck') {
          const healthResult = result as boolean;
          setTestResults(prev => ({ ...prev, [name]: healthResult ? 'success' : 'error' }));
          setTestMessages(prev => ({ ...prev, [name]: healthResult ? 'API is healthy' : 'API health check failed' }));
        } else {
          const apiResult = result as any;
          setTestResults(prev => ({ ...prev, [name]: apiResult.success ? 'success' : 'error' }));
          setTestMessages(prev => ({ ...prev, [name]: apiResult.success ? 'API call successful' : apiResult.error || 'Unknown error' }));
        }
      } catch (error: any) {
        setTestResults(prev => ({ ...prev, [name]: 'error' }));
        setTestMessages(prev => ({ ...prev, [name]: error.message || 'Test failed' }));
      }
    }
  };

  const getStatusIcon = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500 animate-spin" />;
      case 'success':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: 'pending' | 'success' | 'error') => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-50 border-yellow-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
    }
  };

  return (
    <>
      <Head>
        <title>API Test - Healthcare OS</title>
        <meta name="description" content="Test API connectivity and functionality" />
      </Head>

      <Layout>
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              API Connectivity Test
            </h1>
            <p className="text-lg text-gray-600">
              Testing API endpoints to verify functionality
            </p>
          </div>

          {/* Configuration Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">Current Configuration</h2>
            <div className="text-sm text-blue-700">
              <p><strong>Mock API Enabled:</strong> {process.env.NEXT_PUBLIC_USE_MOCK_API}</p>
              <p><strong>API Base URL:</strong> {process.env.NEXT_PUBLIC_API_BASE_URL}</p>
            </div>
          </div>

          {/* Test Results */}
          <div className="space-y-4">
            {Object.entries(testResults).map(([testName, status]) => (
              <div key={testName} className={`p-4 rounded-lg border ${getStatusColor(status)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(status)}
                    <div>
                      <h3 className="font-medium text-gray-900">{testName}</h3>
                      <p className="text-sm text-gray-600">{testMessages[testName] || 'Running test...'}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    status === 'success' ? 'bg-green-100 text-green-800' :
                    status === 'error' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {status.toUpperCase()}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-8 flex space-x-4">
            <button
              onClick={runTests}
              className="px-4 py-2 bg-primary-600 text-white font-medium rounded-md hover:bg-primary-700"
            >
              Run Tests Again
            </button>
            
            <button
              onClick={() => {
                localStorage.setItem('healthcare_episodes', JSON.stringify([]));
                localStorage.setItem('healthcare_profile', JSON.stringify({}));
                window.location.reload();
              }}
              className="px-4 py-2 bg-gray-600 text-white font-medium rounded-md hover:bg-gray-700"
            >
              Clear Cache & Reload
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Next Steps</h2>
            <div className="space-y-2 text-sm text-gray-700">
              <p>✅ If all tests pass, you can proceed to test symptom intake</p>
              <p>🔄 If tests fail, check the browser console for errors</p>
              <p>📊 Load sample data: <a href="/test-data" className="text-primary-600 hover:text-primary-500">Test Data Page</a></p>
              <p>🩺 Test symptoms: <a href="/symptom-intake" className="text-primary-600 hover:text-primary-500">Symptom Intake</a></p>
              <p>📋 View episodes: <a href="/episodes" className="text-primary-600 hover:text-primary-500">Episodes</a></p>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
};

export default ApiTestPage;