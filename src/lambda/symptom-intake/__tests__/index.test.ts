// Mock environment variables FIRST - before any imports
process.env.PATIENT_TABLE_NAME = 'test-patients';
process.env.EPISODE_TABLE_NAME = 'test-episodes';
process.env.AUDIO_UPLOAD_BUCKET = 'test-audio-bucket';

// Unit tests for Symptom Intake Lambda Function

import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { handler, setDynamoClient } from '../index';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { mockClient } from 'aws-sdk-client-mock';
import { v4 as uuidv4 } from 'uuid';
import { EpisodeStatus, InputMethod, Gender, Language } from '../../../types/enums';
import { TestHelpers } from '../../../utils/test-helpers';
import * as voiceInputService from '../voice-input-service';

// Mock AWS SDK
const ddbMock = mockClient(DynamoDBDocumentClient);

// Mock voice input service
jest.mock('../voice-input-service');

// Mock UUID generation for predictable tests
jest.mock('uuid');
const mockUuidv4 = uuidv4 as jest.MockedFunction<typeof uuidv4>;

describe('Symptom Intake Lambda Function', () => {
  const mockContext: Context = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'test-function',
    functionVersion: '1',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
    memoryLimitInMB: '256',
    awsRequestId: 'test-request-id',
    logGroupName: '/aws/lambda/test-function',
    logStreamName: '2023/01/01/[$LATEST]test-stream',
    getRemainingTimeInMillis: () => 30000,
    done: jest.fn(),
    fail: jest.fn(),
    succeed: jest.fn()
  };

  const mockPatient = {
    patientId: '550e8400-e29b-41d4-a716-446655440000',
    demographics: {
      age: 35,
      gender: Gender.FEMALE,
      location: {
        state: 'Maharashtra',
        district: 'Mumbai',
        pincode: '400001',
        coordinates: { lat: 19.0760, lng: 72.8777 }
      },
      preferredLanguage: Language.ENGLISH
    },
    medicalHistory: {
      conditions: [],
      medications: [],
      allergies: [],
      lastVisit: new Date('2023-01-01')
    },
    preferences: {
      providerGender: Gender.FEMALE,
      maxTravelDistance: 10,
      costSensitivity: 'medium'
    },
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  };

  const validSymptomInput = {
    patientId: '550e8400-e29b-41d4-a716-446655440000',
    symptoms: {
      primaryComplaint: 'Severe headache and nausea that started suddenly this morning',
      duration: '2 days ago, started suddenly',
      severity: 7,
      associatedSymptoms: ['dizziness', 'sensitivity to light', 'nausea'],
      inputMethod: InputMethod.TEXT
    }
  };

  beforeEach(() => {
    ddbMock.reset();
    mockUuidv4.mockReturnValue('550e8400-e29b-41d4-a716-446655440001');
    jest.clearAllMocks();
    
    // Set the mock client for the Lambda function
    setDynamoClient(ddbMock as any);
  });

  describe('Successful symptom intake', () => {
    it('should successfully process valid symptom data', async () => {
      // Mock patient exists
      ddbMock.on(GetCommand).resolves({
        Item: mockPatient
      });

      // Mock episode creation
      ddbMock.on(PutCommand).resolves({});

      const event: APIGatewayProxyEvent = {
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
        requestContext: {} as any,
        resource: ''
      };

      const result = await handler(event, mockContext);

      // Debug the actual result first
      console.log('=== DEBUG INFO ===');
      console.log('Status code:', result.statusCode);
      console.log('Headers:', result.headers);
      console.log('Body:', result.body);
      
      // Parse the body to see what we actually got
      let parsedBody;
      try {
        parsedBody = TestHelpers.getLegacyResponseBody(result);
        console.log('Parsed body:', parsedBody);
      } catch (error) {
        console.log('Failed to parse body:', error instanceof Error ? error.message : 'Unknown error');
      }

      // First, let's see what we actually got
      console.log('=== ACTUAL RESULT ===');
      console.log('Status:', result.statusCode);
      console.log('Body:', result.body);
      
      if (result.statusCode !== 200) {
        console.log('Test failed - not 200 status code');
        console.log('Expected: 200');
        console.log('Actual:', result.statusCode);
        console.log('Response body:', result.body);
        
        // Let's fail here to see what we got
        fail(`Expected status 200 but got ${result.statusCode}. Body: ${result.body}`);
      }
      
      expect(result.statusCode).toBe(200);
      
      TestHelpers.expectCorsHeaders(result);
      
      const responseBody = TestHelpers.getLegacyResponseBody(result);
      expect(responseBody.episodeId).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(responseBody.status).toBe(EpisodeStatus.ACTIVE);
      TestHelpers.expectSuccess(result, 'Symptom intake completed successfully');
      expect(responseBody.status).toBe(EpisodeStatus.ACTIVE);
      TestHelpers.expectSuccess(result, 'Symptom intake completed successfully');

      // Verify DynamoDB calls
      expect(ddbMock.commandCalls(GetCommand)).toHaveLength(1);
      expect(ddbMock.commandCalls(PutCommand)).toHaveLength(1);

      const putCall = ddbMock.commandCalls(PutCommand)[0];
      const episodeData = putCall.args[0].input.Item;
      
      expect(episodeData).toBeDefined();
      expect(episodeData!.episodeId).toBe('550e8400-e29b-41d4-a716-446655440001');
      expect(episodeData!.patientId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(episodeData!.status).toBe(EpisodeStatus.ACTIVE);
      expect(episodeData!.symptoms.primaryComplaint).toBe('Severe headache and nausea that started suddenly this morning');
      expect(episodeData!.interactions).toHaveLength(1);
      expect(episodeData!.interactions[0].type).toBe('symptom_intake');
    });

    it('should sanitize symptom text input', async () => {
      ddbMock.on(GetCommand).resolves({ Item: mockPatient });
      ddbMock.on(PutCommand).resolves({});

      const inputWithHtml = {
        ...validSymptomInput,
        symptoms: {
          ...validSymptomInput.symptoms,
          primaryComplaint: '<script>alert("xss")</script>Headache with   multiple   spaces',
          associatedSymptoms: ['<b>nausea</b>', 'fever>']
        }
      };

      const event: APIGatewayProxyEvent = {
        body: JSON.stringify(inputWithHtml),
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/symptoms',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: ''
      };

      const result = await handler(event, mockContext);

      TestHelpers.expectStatusCode(result, 200);

      const putCall = ddbMock.commandCalls(PutCommand)[0];
      const episodeData = putCall.args[0].input.Item;
      
      expect(episodeData).toBeDefined();
      expect(episodeData!.symptoms.primaryComplaint).toBe('scriptalert("xss")/scriptHeadache with multiple spaces');
      expect(episodeData!.symptoms.associatedSymptoms[0]).toBe('bnausea/b');
      expect(episodeData!.symptoms.associatedSymptoms[1]).toBe('fever');
    });

    it('should analyze urgency indicators correctly', async () => {
      ddbMock.on(GetCommand).resolves({ Item: mockPatient });
      ddbMock.on(PutCommand).resolves({});

      const emergencyInput = {
        ...validSymptomInput,
        symptoms: {
          ...validSymptomInput.symptoms,
          primaryComplaint: 'Severe chest pain and difficulty breathing that started suddenly',
          severity: 9,
          duration: 'sudden onset, started 30 minutes ago'
        }
      };

      const event: APIGatewayProxyEvent = {
        body: JSON.stringify(emergencyInput),
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/symptoms',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: ''
      };

      await handler(event, mockContext);

      // Verify the function processes emergency indicators
      // (The actual urgency analysis is logged but not returned in response)
      expect(ddbMock.commandCalls(PutCommand)).toHaveLength(1);
    });
  });

  describe('Validation errors', () => {
    it('should return 400 for missing request body', async () => {
      const event: APIGatewayProxyEvent = {
        body: null,
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/symptoms',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: ''
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(400);
      TestHelpers.expectError(result, 'Request body is required');
    });

    it('should return 400 for invalid JSON', async () => {
      const event: APIGatewayProxyEvent = {
        body: 'invalid json',
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/symptoms',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: ''
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(400);
      TestHelpers.expectError(result, 'Invalid JSON in request body');
    });

    it('should return 400 for missing required fields', async () => {
      const invalidInput = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        symptoms: {
          // Missing primaryComplaint
          duration: '2 days',
          severity: 7,
          associatedSymptoms: [],
          inputMethod: InputMethod.TEXT
        }
      };

      const event: APIGatewayProxyEvent = {
        body: JSON.stringify(invalidInput),
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/symptoms',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: ''
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(400);
      const responseBody = TestHelpers.getLegacyResponseBody(result);
      expect(responseBody.error).toBe('Validation failed');
      expect(responseBody.details).toContain('"symptoms.primaryComplaint" is required');
    });

    it('should return 400 for invalid severity range', async () => {
      const invalidInput = {
        ...validSymptomInput,
        symptoms: {
          ...validSymptomInput.symptoms,
          severity: 15 // Invalid range
        }
      };

      const event: APIGatewayProxyEvent = {
        body: JSON.stringify(invalidInput),
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/symptoms',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: ''
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(400);
      const responseBody = TestHelpers.getLegacyResponseBody(result);
      expect(responseBody.error).toBe('Validation failed');
      expect(responseBody.details).toContain('"symptoms.severity" must be less than or equal to 10');
    });

    it('should return 400 for invalid input method', async () => {
      const invalidInput = {
        ...validSymptomInput,
        symptoms: {
          ...validSymptomInput.symptoms,
          inputMethod: 'invalid-method'
        }
      };

      const event: APIGatewayProxyEvent = {
        body: JSON.stringify(invalidInput),
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/symptoms',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: ''
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(400);
      const responseBody = TestHelpers.getLegacyResponseBody(result);
      expect(responseBody.error).toBe('Validation failed');
      expect(responseBody.details).toContain('"symptoms.inputMethod" must be one of [text, voice]');
    });
  });

  describe('Patient not found', () => {
    it('should return 404 when patient does not exist', async () => {
      // Mock patient not found
      ddbMock.on(GetCommand).resolves({
        Item: undefined
      });

      const event: APIGatewayProxyEvent = {
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
        requestContext: {} as any,
        resource: ''
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(404);
      TestHelpers.expectError(result, 'Patient not found');
    });
  });

  describe('Database errors', () => {
    it('should return 500 for DynamoDB get errors', async () => {
      // Mock DynamoDB error
      ddbMock.on(GetCommand).rejects(new Error('DynamoDB error'));

      const event: APIGatewayProxyEvent = {
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
        requestContext: {} as any,
        resource: ''
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(500);
      const responseBody = TestHelpers.getLegacyResponseBody(result);
      expect(responseBody.error).toBe('Internal server error');
    });

    it('should return 500 for DynamoDB put errors', async () => {
      ddbMock.on(GetCommand).resolves({ Item: mockPatient });
      ddbMock.on(PutCommand).rejects(new Error('DynamoDB put error'));

      const event: APIGatewayProxyEvent = {
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
        requestContext: {} as any,
        resource: ''
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(500);
      const responseBody = TestHelpers.getLegacyResponseBody(result);
      expect(responseBody.error).toBe('Internal server error');
    });
  });

  describe('CORS headers', () => {
    it('should include proper CORS headers in all responses', async () => {
      const event: APIGatewayProxyEvent = {
        body: null,
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/symptoms',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: ''
      };

      const result = await handler(event, mockContext);

      expect(result.headers).toEqual({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
        'Access-Control-Allow-Methods': 'POST,OPTIONS'
      });
    });
  });

  describe('Voice input integration', () => {
    const mockProcessVoiceInput = voiceInputService.processVoiceInput as jest.MockedFunction<typeof voiceInputService.processVoiceInput>;
    const mockCreatePresignedUploadUrl = voiceInputService.createPresignedUploadUrl as jest.MockedFunction<typeof voiceInputService.createPresignedUploadUrl>;

    beforeEach(() => {
      mockProcessVoiceInput.mockReset();
      mockCreatePresignedUploadUrl.mockReset();
    });

    it('should successfully process voice input', async () => {
      // Mock patient exists
      ddbMock.on(GetCommand).resolves({ Item: mockPatient });

      // Mock successful voice processing
      mockProcessVoiceInput.mockResolvedValue({
        success: true,
        transcribedText: 'I have a severe headache and nausea',
        confidence: 0.95,
        language: 'en-IN',
        processingTimeMs: 2500
      });

      const voiceInputRequest = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        audioData: Buffer.from('mock audio data').toString('base64'),
        mimeType: 'audio/wav',
        language: 'en'
      };

      const event: APIGatewayProxyEvent = {
        body: JSON.stringify(voiceInputRequest),
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/symptoms/voice-input',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: ''
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      
      const responseBody = TestHelpers.getLegacyResponseBody(result);
      expect(responseBody.transcribedText).toBe('I have a severe headache and nausea');
      expect(responseBody.confidence).toBe(0.95);
      expect(responseBody.language).toBe('en-IN');
      expect(responseBody.message).toBe('Voice input processed successfully');

      // Verify voice processing was called with correct parameters
      expect(mockProcessVoiceInput).toHaveBeenCalledWith(
        expect.objectContaining({
          buffer: expect.any(Buffer),
          mimeType: 'audio/wav',
          size: expect.any(Number)
        }),
        '550e8400-e29b-41d4-a716-446655440000',
        'en-IN'
      );
    });

    it('should handle voice processing failure', async () => {
      // Mock patient exists
      ddbMock.on(GetCommand).resolves({ Item: mockPatient });

      // Mock voice processing failure
      mockProcessVoiceInput.mockResolvedValue({
        success: false,
        error: 'Audio quality too poor for transcription',
        fallbackUsed: true,
        processingTimeMs: 1500
      });

      const voiceInputRequest = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        audioData: Buffer.from('poor quality audio').toString('base64'),
        mimeType: 'audio/wav'
      };

      const event: APIGatewayProxyEvent = {
        body: JSON.stringify(voiceInputRequest),
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/symptoms/voice-input',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: ''
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(422);
      
      const responseBody = TestHelpers.getLegacyResponseBody(result);
      expect(responseBody.error).toBe('Voice processing failed');
      expect(responseBody.details).toContain('Audio quality too poor for transcription');
      expect(responseBody.details).toContain('Please try again or use text input instead');
    });

    it('should handle Hindi voice input', async () => {
      // Mock patient exists
      ddbMock.on(GetCommand).resolves({ Item: mockPatient });

      // Mock successful Hindi voice processing
      mockProcessVoiceInput.mockResolvedValue({
        success: true,
        transcribedText: 'मुझे सिरदर्द और बुखार है',
        confidence: 0.88,
        language: 'hi-IN',
        processingTimeMs: 3000
      });

      const voiceInputRequest = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        audioData: Buffer.from('hindi audio data').toString('base64'),
        mimeType: 'audio/wav',
        language: 'hi'
      };

      const event: APIGatewayProxyEvent = {
        body: JSON.stringify(voiceInputRequest),
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/symptoms/voice-input',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: ''
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      
      const responseBody = TestHelpers.getLegacyResponseBody(result);
      expect(responseBody.transcribedText).toBe('मुझे सिरदर्द और बुखार है');
      expect(responseBody.language).toBe('hi-IN');

      // Verify Hindi language code was used
      expect(mockProcessVoiceInput).toHaveBeenCalledWith(
        expect.any(Object),
        '550e8400-e29b-41d4-a716-446655440000',
        'hi-IN'
      );
    });

    it('should return 400 for missing voice input fields', async () => {
      const incompleteRequest = {
        patientId: '550e8400-e29b-41d4-a716-446655440000'
        // Missing audioData and mimeType
      };

      const event: APIGatewayProxyEvent = {
        body: JSON.stringify(incompleteRequest),
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/symptoms/voice-input',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: ''
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(400);
      
      const responseBody = TestHelpers.getLegacyResponseBody(result);
      expect(responseBody.error).toBe('Missing required fields: patientId, audioData, mimeType');
    });

    it('should handle voice processing service errors', async () => {
      // Mock patient exists
      ddbMock.on(GetCommand).resolves({ Item: mockPatient });

      // Mock voice processing service error
      mockProcessVoiceInput.mockRejectedValue(new Error('Transcribe service unavailable'));

      const voiceInputRequest = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        audioData: Buffer.from('audio data').toString('base64'),
        mimeType: 'audio/wav'
      };

      const event: APIGatewayProxyEvent = {
        body: JSON.stringify(voiceInputRequest),
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/symptoms/voice-input',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: ''
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(500);
      
      const responseBody = TestHelpers.getLegacyResponseBody(result);
      expect(responseBody.error).toBe('Voice processing failed');
      expect(responseBody.details).toContain('Unable to process voice input at this time');
    });
  });

  describe('Presigned URL generation', () => {
    const mockCreatePresignedUploadUrl = voiceInputService.createPresignedUploadUrl as jest.MockedFunction<typeof voiceInputService.createPresignedUploadUrl>;

    beforeEach(() => {
      mockCreatePresignedUploadUrl.mockReset();
    });

    it('should successfully create presigned URL', async () => {
      // Mock patient exists
      ddbMock.on(GetCommand).resolves({ Item: mockPatient });

      // Mock presigned URL creation
      mockCreatePresignedUploadUrl.mockResolvedValue({
        uploadUrl: 'https://test-audio-bucket.s3.amazonaws.com/audio-uploads/test-patient/test-file.wav',
        s3Key: 'audio-uploads/test-patient/test-file.wav'
      });

      const presignedUrlRequest = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        mimeType: 'audio/wav'
      };

      const event: APIGatewayProxyEvent = {
        body: JSON.stringify(presignedUrlRequest),
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/symptoms/presigned-url',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: ''
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(200);
      
      const responseBody = TestHelpers.getLegacyResponseBody(result);
      expect(responseBody.uploadUrl).toContain('test-audio-bucket.s3.amazonaws.com');
      expect(responseBody.s3Key).toContain('audio-uploads/test-patient');
      expect(responseBody.message).toBe('Presigned URL created successfully');
      expect(responseBody.expiresIn).toBe('15 minutes');

      // Verify presigned URL creation was called with correct parameters
      expect(mockCreatePresignedUploadUrl).toHaveBeenCalledWith(
        '550e8400-e29b-41d4-a716-446655440000',
        'audio/wav'
      );
    });

    it('should return 400 for missing presigned URL fields', async () => {
      const incompleteRequest = {
        patientId: '550e8400-e29b-41d4-a716-446655440000'
        // Missing mimeType
      };

      const event: APIGatewayProxyEvent = {
        body: JSON.stringify(incompleteRequest),
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/symptoms/presigned-url',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: ''
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(400);
      
      const responseBody = TestHelpers.getLegacyResponseBody(result);
      expect(responseBody.error).toBe('Missing required fields: patientId, mimeType');
    });

    it('should handle presigned URL creation errors', async () => {
      // Mock patient exists
      ddbMock.on(GetCommand).resolves({ Item: mockPatient });

      // Mock presigned URL creation error
      mockCreatePresignedUploadUrl.mockRejectedValue(new Error('S3 service unavailable'));

      const presignedUrlRequest = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        mimeType: 'audio/wav'
      };

      const event: APIGatewayProxyEvent = {
        body: JSON.stringify(presignedUrlRequest),
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/symptoms/presigned-url',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: ''
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(500);
      
      const responseBody = TestHelpers.getLegacyResponseBody(result);
      expect(responseBody.error).toBe('Failed to create upload URL');
    });
  });

  describe('Method routing', () => {
    it('should return 405 for unsupported methods', async () => {
      const event: APIGatewayProxyEvent = {
        body: null,
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'GET', // Unsupported method
        isBase64Encoded: false,
        path: '/symptoms',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: ''
      };

      const result = await handler(event, mockContext);

      expect(result.statusCode).toBe(405);
      
      TestHelpers.expectError(result, 'Method not allowed');
    });
  });
});