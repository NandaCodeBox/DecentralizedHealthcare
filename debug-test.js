// Debug test to isolate the symptom intake issue
const { handler } = require('./lib/lambda/symptom-intake/index.js');

async function debugTest() {
  const mockContext = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'test-function',
    functionVersion: '1',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
    memoryLimitInMB: '256',
    awsRequestId: 'test-request-id',
    logGroupName: '/aws/lambda/test-function',
    logStreamName: '2023/01/01/[$LATEST]test-stream',
    getRemainingTimeInMillis: () => 30000,
    done: () => {},
    fail: () => {},
    succeed: () => {}
  };

  const validSymptomInput = {
    patientId: '550e8400-e29b-41d4-a716-446655440000',
    symptoms: {
      primaryComplaint: 'Severe headache and nausea that started suddenly this morning',
      duration: '2 days ago, started suddenly',
      severity: 7,
      associatedSymptoms: ['dizziness', 'sensitivity to light', 'nausea'],
      inputMethod: 'text'
    }
  };

  const event = {
    body: JSON.stringify(validSymptomInput),
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/symptoms',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {},
    resource: ''
  };

  try {
    console.log('Calling handler...');
    const result = await handler(event, mockContext);
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

debugTest();