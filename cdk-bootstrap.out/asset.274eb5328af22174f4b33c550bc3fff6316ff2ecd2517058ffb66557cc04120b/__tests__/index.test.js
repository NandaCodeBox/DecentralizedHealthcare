"use strict";
// Unit tests for Symptom Intake Lambda Function
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const aws_sdk_client_mock_1 = require("aws-sdk-client-mock");
const uuid_1 = require("uuid");
const enums_1 = require("../../../types/enums");
const voiceInputService = __importStar(require("../voice-input-service"));
// Mock AWS SDK
const ddbMock = (0, aws_sdk_client_mock_1.mockClient)(lib_dynamodb_1.DynamoDBDocumentClient);
// Mock environment variables
process.env.PATIENT_TABLE_NAME = 'test-patients';
process.env.EPISODE_TABLE_NAME = 'test-episodes';
process.env.AUDIO_UPLOAD_BUCKET = 'test-audio-bucket';
// Mock voice input service
jest.mock('../voice-input-service');
// Mock UUID generation for predictable tests
jest.mock('uuid');
const mockUuidv4 = uuid_1.v4;
describe('Symptom Intake Lambda Function', () => {
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
        done: jest.fn(),
        fail: jest.fn(),
        succeed: jest.fn()
    };
    const mockPatient = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        demographics: {
            age: 35,
            gender: enums_1.Gender.FEMALE,
            location: {
                state: 'Maharashtra',
                district: 'Mumbai',
                pincode: '400001',
                coordinates: { lat: 19.0760, lng: 72.8777 }
            },
            preferredLanguage: enums_1.Language.ENGLISH
        },
        medicalHistory: {
            conditions: [],
            medications: [],
            allergies: [],
            lastVisit: new Date('2023-01-01')
        },
        preferences: {
            providerGender: enums_1.Gender.FEMALE,
            maxTravelDistance: 10,
            costSensitivity: 'medium'
        },
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
    };
    const validSymptomInput = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        symptoms: {
            primaryComplaint: 'Severe headache and nausea',
            duration: '2 days',
            severity: 7,
            associatedSymptoms: ['dizziness', 'sensitivity to light'],
            inputMethod: enums_1.InputMethod.TEXT
        }
    };
    beforeEach(() => {
        ddbMock.reset();
        mockUuidv4.mockReturnValue('550e8400-e29b-41d4-a716-446655440001');
        jest.clearAllMocks();
        // Set the mock client for the Lambda function
        (0, index_1.setDynamoClient)(ddbMock);
    });
    describe('Successful symptom intake', () => {
        it('should successfully process valid symptom data', async () => {
            // Mock patient exists
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({
                Item: mockPatient
            });
            // Mock episode creation
            ddbMock.on(lib_dynamodb_1.PutCommand).resolves({});
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
            const result = await (0, index_1.handler)(event, mockContext);
            expect(result.statusCode).toBe(200);
            const responseBody = JSON.parse(result.body);
            expect(responseBody.episodeId).toBe('550e8400-e29b-41d4-a716-446655440001');
            expect(responseBody.status).toBe(enums_1.EpisodeStatus.ACTIVE);
            expect(responseBody.message).toBe('Symptom intake completed successfully');
            // Verify DynamoDB calls
            expect(ddbMock.commandCalls(lib_dynamodb_1.GetCommand)).toHaveLength(1);
            expect(ddbMock.commandCalls(lib_dynamodb_1.PutCommand)).toHaveLength(1);
            const putCall = ddbMock.commandCalls(lib_dynamodb_1.PutCommand)[0];
            const episodeData = putCall.args[0].input.Item;
            expect(episodeData).toBeDefined();
            expect(episodeData.episodeId).toBe('550e8400-e29b-41d4-a716-446655440001');
            expect(episodeData.patientId).toBe('550e8400-e29b-41d4-a716-446655440000');
            expect(episodeData.status).toBe(enums_1.EpisodeStatus.ACTIVE);
            expect(episodeData.symptoms.primaryComplaint).toBe('Severe headache and nausea');
            expect(episodeData.interactions).toHaveLength(1);
            expect(episodeData.interactions[0].type).toBe('symptom_intake');
        });
        it('should sanitize symptom text input', async () => {
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({ Item: mockPatient });
            ddbMock.on(lib_dynamodb_1.PutCommand).resolves({});
            const inputWithHtml = {
                ...validSymptomInput,
                symptoms: {
                    ...validSymptomInput.symptoms,
                    primaryComplaint: '<script>alert("xss")</script>Headache with   multiple   spaces',
                    associatedSymptoms: ['<b>nausea</b>', 'fever>']
                }
            };
            const event = {
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
                requestContext: {},
                resource: ''
            };
            const result = await (0, index_1.handler)(event, mockContext);
            expect(result.statusCode).toBe(200);
            const putCall = ddbMock.commandCalls(lib_dynamodb_1.PutCommand)[0];
            const episodeData = putCall.args[0].input.Item;
            expect(episodeData).toBeDefined();
            expect(episodeData.symptoms.primaryComplaint).toBe('scriptalert("xss")/scriptHeadache with multiple spaces');
            expect(episodeData.symptoms.associatedSymptoms[0]).toBe('bnausea/b');
            expect(episodeData.symptoms.associatedSymptoms[1]).toBe('fever');
        });
        it('should analyze urgency indicators correctly', async () => {
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({ Item: mockPatient });
            ddbMock.on(lib_dynamodb_1.PutCommand).resolves({});
            const emergencyInput = {
                ...validSymptomInput,
                symptoms: {
                    ...validSymptomInput.symptoms,
                    primaryComplaint: 'Severe chest pain and difficulty breathing',
                    severity: 9,
                    duration: 'sudden onset'
                }
            };
            const event = {
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
                requestContext: {},
                resource: ''
            };
            await (0, index_1.handler)(event, mockContext);
            // Verify the function processes emergency indicators
            // (The actual urgency analysis is logged but not returned in response)
            expect(ddbMock.commandCalls(lib_dynamodb_1.PutCommand)).toHaveLength(1);
        });
    });
    describe('Validation errors', () => {
        it('should return 400 for missing request body', async () => {
            const event = {
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
                requestContext: {},
                resource: ''
            };
            const result = await (0, index_1.handler)(event, mockContext);
            expect(result.statusCode).toBe(400);
            const responseBody = JSON.parse(result.body);
            expect(responseBody.error).toBe('Request body is required');
        });
        it('should return 400 for invalid JSON', async () => {
            const event = {
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
                requestContext: {},
                resource: ''
            };
            const result = await (0, index_1.handler)(event, mockContext);
            expect(result.statusCode).toBe(400);
            const responseBody = JSON.parse(result.body);
            expect(responseBody.error).toBe('Invalid JSON in request body');
        });
        it('should return 400 for missing required fields', async () => {
            const invalidInput = {
                patientId: '550e8400-e29b-41d4-a716-446655440000',
                symptoms: {
                    // Missing primaryComplaint
                    duration: '2 days',
                    severity: 7,
                    associatedSymptoms: [],
                    inputMethod: enums_1.InputMethod.TEXT
                }
            };
            const event = {
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
                requestContext: {},
                resource: ''
            };
            const result = await (0, index_1.handler)(event, mockContext);
            expect(result.statusCode).toBe(400);
            const responseBody = JSON.parse(result.body);
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
            const event = {
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
                requestContext: {},
                resource: ''
            };
            const result = await (0, index_1.handler)(event, mockContext);
            expect(result.statusCode).toBe(400);
            const responseBody = JSON.parse(result.body);
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
            const event = {
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
                requestContext: {},
                resource: ''
            };
            const result = await (0, index_1.handler)(event, mockContext);
            expect(result.statusCode).toBe(400);
            const responseBody = JSON.parse(result.body);
            expect(responseBody.error).toBe('Validation failed');
            expect(responseBody.details).toContain('"symptoms.inputMethod" must be one of [text, voice]');
        });
    });
    describe('Patient not found', () => {
        it('should return 404 when patient does not exist', async () => {
            // Mock patient not found
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({
                Item: undefined
            });
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
            const result = await (0, index_1.handler)(event, mockContext);
            expect(result.statusCode).toBe(404);
            const responseBody = JSON.parse(result.body);
            expect(responseBody.error).toBe('Patient not found');
        });
    });
    describe('Database errors', () => {
        it('should return 500 for DynamoDB get errors', async () => {
            // Mock DynamoDB error
            ddbMock.on(lib_dynamodb_1.GetCommand).rejects(new Error('DynamoDB error'));
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
            const result = await (0, index_1.handler)(event, mockContext);
            expect(result.statusCode).toBe(500);
            const responseBody = JSON.parse(result.body);
            expect(responseBody.error).toBe('Internal server error');
        });
        it('should return 500 for DynamoDB put errors', async () => {
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({ Item: mockPatient });
            ddbMock.on(lib_dynamodb_1.PutCommand).rejects(new Error('DynamoDB put error'));
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
            const result = await (0, index_1.handler)(event, mockContext);
            expect(result.statusCode).toBe(500);
            const responseBody = JSON.parse(result.body);
            expect(responseBody.error).toBe('Internal server error');
        });
    });
    describe('CORS headers', () => {
        it('should include proper CORS headers in all responses', async () => {
            const event = {
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
                requestContext: {},
                resource: ''
            };
            const result = await (0, index_1.handler)(event, mockContext);
            expect(result.headers).toEqual({
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
                'Access-Control-Allow-Methods': 'POST,OPTIONS'
            });
        });
    });
    describe('Voice input integration', () => {
        const mockProcessVoiceInput = voiceInputService.processVoiceInput;
        const mockCreatePresignedUploadUrl = voiceInputService.createPresignedUploadUrl;
        beforeEach(() => {
            mockProcessVoiceInput.mockReset();
            mockCreatePresignedUploadUrl.mockReset();
        });
        it('should successfully process voice input', async () => {
            // Mock patient exists
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({ Item: mockPatient });
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
            const event = {
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
                requestContext: {},
                resource: ''
            };
            const result = await (0, index_1.handler)(event, mockContext);
            expect(result.statusCode).toBe(200);
            const responseBody = JSON.parse(result.body);
            expect(responseBody.transcribedText).toBe('I have a severe headache and nausea');
            expect(responseBody.confidence).toBe(0.95);
            expect(responseBody.language).toBe('en-IN');
            expect(responseBody.message).toBe('Voice input processed successfully');
            // Verify voice processing was called with correct parameters
            expect(mockProcessVoiceInput).toHaveBeenCalledWith(expect.objectContaining({
                buffer: expect.any(Buffer),
                mimeType: 'audio/wav',
                size: expect.any(Number)
            }), '550e8400-e29b-41d4-a716-446655440000', 'EN_IN');
        });
        it('should handle voice processing failure', async () => {
            // Mock patient exists
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({ Item: mockPatient });
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
            const event = {
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
                requestContext: {},
                resource: ''
            };
            const result = await (0, index_1.handler)(event, mockContext);
            expect(result.statusCode).toBe(422);
            const responseBody = JSON.parse(result.body);
            expect(responseBody.error).toBe('Voice processing failed');
            expect(responseBody.details).toContain('Audio quality too poor for transcription');
            expect(responseBody.details).toContain('Please try again or use text input instead');
        });
        it('should handle Hindi voice input', async () => {
            // Mock patient exists
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({ Item: mockPatient });
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
            const event = {
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
                requestContext: {},
                resource: ''
            };
            const result = await (0, index_1.handler)(event, mockContext);
            expect(result.statusCode).toBe(200);
            const responseBody = JSON.parse(result.body);
            expect(responseBody.transcribedText).toBe('मुझे सिरदर्द और बुखार है');
            expect(responseBody.language).toBe('hi-IN');
            // Verify Hindi language code was used
            expect(mockProcessVoiceInput).toHaveBeenCalledWith(expect.any(Object), '550e8400-e29b-41d4-a716-446655440000', 'HI_IN');
        });
        it('should return 400 for missing voice input fields', async () => {
            const incompleteRequest = {
                patientId: '550e8400-e29b-41d4-a716-446655440000'
                // Missing audioData and mimeType
            };
            const event = {
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
                requestContext: {},
                resource: ''
            };
            const result = await (0, index_1.handler)(event, mockContext);
            expect(result.statusCode).toBe(400);
            const responseBody = JSON.parse(result.body);
            expect(responseBody.error).toBe('Missing required fields: patientId, audioData, mimeType');
        });
        it('should handle voice processing service errors', async () => {
            // Mock patient exists
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({ Item: mockPatient });
            // Mock voice processing service error
            mockProcessVoiceInput.mockRejectedValue(new Error('Transcribe service unavailable'));
            const voiceInputRequest = {
                patientId: '550e8400-e29b-41d4-a716-446655440000',
                audioData: Buffer.from('audio data').toString('base64'),
                mimeType: 'audio/wav'
            };
            const event = {
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
                requestContext: {},
                resource: ''
            };
            const result = await (0, index_1.handler)(event, mockContext);
            expect(result.statusCode).toBe(500);
            const responseBody = JSON.parse(result.body);
            expect(responseBody.error).toBe('Voice processing failed');
            expect(responseBody.details).toContain('Unable to process voice input at this time');
        });
    });
    describe('Presigned URL generation', () => {
        const mockCreatePresignedUploadUrl = voiceInputService.createPresignedUploadUrl;
        beforeEach(() => {
            mockCreatePresignedUploadUrl.mockReset();
        });
        it('should successfully create presigned URL', async () => {
            // Mock patient exists
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({ Item: mockPatient });
            // Mock presigned URL creation
            mockCreatePresignedUploadUrl.mockResolvedValue({
                uploadUrl: 'https://test-audio-bucket.s3.amazonaws.com/audio-uploads/test-patient/test-file.wav',
                s3Key: 'audio-uploads/test-patient/test-file.wav'
            });
            const presignedUrlRequest = {
                patientId: '550e8400-e29b-41d4-a716-446655440000',
                mimeType: 'audio/wav'
            };
            const event = {
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
                requestContext: {},
                resource: ''
            };
            const result = await (0, index_1.handler)(event, mockContext);
            expect(result.statusCode).toBe(200);
            const responseBody = JSON.parse(result.body);
            expect(responseBody.uploadUrl).toContain('test-audio-bucket.s3.amazonaws.com');
            expect(responseBody.s3Key).toContain('audio-uploads/test-patient');
            expect(responseBody.message).toBe('Presigned URL created successfully');
            expect(responseBody.expiresIn).toBe('15 minutes');
            // Verify presigned URL creation was called with correct parameters
            expect(mockCreatePresignedUploadUrl).toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000', 'audio/wav');
        });
        it('should return 400 for missing presigned URL fields', async () => {
            const incompleteRequest = {
                patientId: '550e8400-e29b-41d4-a716-446655440000'
                // Missing mimeType
            };
            const event = {
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
                requestContext: {},
                resource: ''
            };
            const result = await (0, index_1.handler)(event, mockContext);
            expect(result.statusCode).toBe(400);
            const responseBody = JSON.parse(result.body);
            expect(responseBody.error).toBe('Missing required fields: patientId, mimeType');
        });
        it('should handle presigned URL creation errors', async () => {
            // Mock patient exists
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({ Item: mockPatient });
            // Mock presigned URL creation error
            mockCreatePresignedUploadUrl.mockRejectedValue(new Error('S3 service unavailable'));
            const presignedUrlRequest = {
                patientId: '550e8400-e29b-41d4-a716-446655440000',
                mimeType: 'audio/wav'
            };
            const event = {
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
                requestContext: {},
                resource: ''
            };
            const result = await (0, index_1.handler)(event, mockContext);
            expect(result.statusCode).toBe(500);
            const responseBody = JSON.parse(result.body);
            expect(responseBody.error).toBe('Failed to create upload URL');
        });
    });
    describe('Method routing', () => {
        it('should return 405 for unsupported methods', async () => {
            const event = {
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
                requestContext: {},
                resource: ''
            };
            const result = await (0, index_1.handler)(event, mockContext);
            expect(result.statusCode).toBe(405);
            const responseBody = JSON.parse(result.body);
            expect(responseBody.error).toBe('Method not allowed');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9sYW1iZGEvc3ltcHRvbS1pbnRha2UvX190ZXN0c19fL2luZGV4LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLGdEQUFnRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFHaEQsb0NBQW9EO0FBQ3BELHdEQUF1RjtBQUN2Riw2REFBaUQ7QUFDakQsK0JBQW9DO0FBQ3BDLGdEQUFvRjtBQUNwRiwwRUFBNEQ7QUFFNUQsZUFBZTtBQUNmLE1BQU0sT0FBTyxHQUFHLElBQUEsZ0NBQVUsRUFBQyxxQ0FBc0IsQ0FBQyxDQUFDO0FBRW5ELDZCQUE2QjtBQUM3QixPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixHQUFHLGVBQWUsQ0FBQztBQUNqRCxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixHQUFHLGVBQWUsQ0FBQztBQUNqRCxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixHQUFHLG1CQUFtQixDQUFDO0FBRXRELDJCQUEyQjtBQUMzQixJQUFJLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUM7QUFFcEMsNkNBQTZDO0FBQzdDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDbEIsTUFBTSxVQUFVLEdBQUcsU0FBNEMsQ0FBQztBQUVoRSxRQUFRLENBQUMsZ0NBQWdDLEVBQUUsR0FBRyxFQUFFO0lBQzlDLE1BQU0sV0FBVyxHQUFZO1FBQzNCLDhCQUE4QixFQUFFLEtBQUs7UUFDckMsWUFBWSxFQUFFLGVBQWU7UUFDN0IsZUFBZSxFQUFFLEdBQUc7UUFDcEIsa0JBQWtCLEVBQUUsOERBQThEO1FBQ2xGLGVBQWUsRUFBRSxLQUFLO1FBQ3RCLFlBQVksRUFBRSxpQkFBaUI7UUFDL0IsWUFBWSxFQUFFLDJCQUEyQjtRQUN6QyxhQUFhLEVBQUUsaUNBQWlDO1FBQ2hELHdCQUF3QixFQUFFLEdB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LEtBQUs7Z0JBQ3RCLElBQUksRUFBRSxXQUFXO2dCQUNqQixjQUFjLEVBQUUsSUFBSTtnQkFDcEIscUJBQXFCLEVBQUUsSUFBSTtnQkFDM0IsK0JBQStCLEVBQUUsSUFBSTtnQkFDckMsY0FBYyxFQUFFLElBQUk7Z0JBQ3BCLGNBQWMsRUFBRSxFQUFTO2dCQUN6QixRQUFRLEVBQUUsRUFBRTthQUNiLENBQUM7WUFFRixNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUEsZUFBTyxFQUFDLEtBQUssRUFBRSxXQUFXLENBQUMsQ0FBQztZQUVqRCxNQUFNLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUVwQyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM3QyxNQUFNLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQ3hELENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFVuaXQgdGVzdHMgZm9yIFN5bXB0b20gSW50YWtlIExhbWJkYSBGdW5jdGlvblxyXG5cclxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIENvbnRleHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgaGFuZGxlciwgc2V0RHluYW1vQ2xpZW50IH0gZnJvbSAnLi4vaW5kZXgnO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LCBQdXRDb21tYW5kLCBHZXRDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcclxuaW1wb3J0IHsgbW9ja0NsaWVudCB9IGZyb20gJ2F3cy1zZGstY2xpZW50LW1vY2snO1xyXG5pbXBvcnQgeyB2NCBhcyB1dWlkdjQgfSBmcm9tICd1dWlkJztcclxuaW1wb3J0IHsgRXBpc29kZVN0YXR1cywgSW5wdXRNZXRob2QsIEdlbmRlciwgTGFuZ3VhZ2UgfSBmcm9tICcuLi8uLi8uLi90eXBlcy9lbnVtcyc7XHJcbmltcG9ydCAqIGFzIHZvaWNlSW5wdXRTZXJ2aWNlIGZyb20gJy4uL3ZvaWNlLWlucHV0LXNlcnZpY2UnO1xyXG5cclxuLy8gTW9jayBBV1MgU0RLXHJcbmNvbnN0IGRkYk1vY2sgPSBtb2NrQ2xpZW50KER5bmFtb0RCRG9jdW1lbnRDbGllbnQpO1xyXG5cclxuLy8gTW9jayBlbnZpcm9ubWVudCB2YXJpYWJsZXNcclxucHJvY2Vzcy5lbnYuUEFUSUVOVF9UQUJMRV9OQU1FID0gJ3Rlc3QtcGF0aWVudHMnO1xyXG5wcm9jZXNzLmVudi5FUElTT0RFX1RBQkxFX05BTUUgPSAndGVzdC1lcGlzb2Rlcyc7XHJcbnByb2Nlc3MuZW52LkFVRElPX1VQTE9BRF9CVUNLRVQgPSAndGVzdC1hdWRpby1idWNrZXQnO1xyXG5cclxuLy8gTW9jayB2b2ljZSBpbnB1dCBzZXJ2aWNlXHJcbmplc3QubW9jaygnLi4vdm9pY2UtaW5wdXQtc2VydmljZScpO1xyXG5cclxuLy8gTW9jayBVVUlEIGdlbmVyYXRpb24gZm9yIHByZWRpY3RhYmxlIHRlc3RzXHJcbmplc3QubW9jaygndXVpZCcpO1xyXG5jb25zdCBtb2NrVXVpZHY0ID0gdXVpZHY0IGFzIGplc3QuTW9ja2VkRnVuY3Rpb248dHlwZW9mIHV1aWR2ND47XHJcblxyXG5kZXNjcmliZSgnU3ltcHRvbSBJbnRha2UgTGFtYmRhIEZ1bmN0aW9uJywgKCkgPT4ge1xyXG4gIGNvbnN0IG1vY2tDb250ZXh0OiBDb250ZXh0ID0ge1xyXG4gICAgY2FsbGJhY2tXYWl0c0ZvckVtcHR5RXZlbnRMb29wOiBmYWxzZSxcclxuICAgIGZ1bmN0aW9uTmFtZTogJ3Rlc3QtZnVuY3Rpb24nLFxyXG4gICAgZnVuY3Rpb25WZXJzaW9uOiAnMScsXHJcbiAgICBpbnZva2VkRnVuY3Rpb25Bcm46ICdhcm46YXdzOmxhbWJkYTp1cy1lYXN0LTE6MTIzNDU2Nzg5MDEyOmZ1bmN0aW9uOnRlc3QtZnVuY3Rpb24nLFxyXG4gICAgbWVtb3J5TGltaXRJbk1COiAnMjU2JyxcclxuICAgIGF3c1JlcXVlc3RJZDogJ3Rlc3QtcmVxdWVzdC1pZCcsXHJcbiAgICBsb2dHcm91cE5hbWU6ICcvYXdzL2xhbWJkYS90ZXN0LWZ1bmN0aW9uJyxcclxuICAgIGxvZ1N0cmVhbU5hbWU6ICcyMDIzLzAxLzAxL1skTEFURVNUXXRlc3Qtc3RyZWFtJyxcclxuICAgIGdldFJlbWFpbmluZ1RpbWVJbk1pbGxpczogKCkgPT4gMzAwMDAsXHJcbiAgICBkb25lOiBqZXN0LmZuKCksXHJcbiAgICBmYWlsOiBqZXN0LmZuKCksXHJcbiAgICBzdWNjZWVkOiBqZXN0LmZuKClcclxuICB9O1xyXG5cclxuICBjb25zdCBtb2NrUGF0aWVudCA9IHtcclxuICAgIHBhdGllbnRJZDogJzU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCcsXHJcbiAgICBkZW1vZ3JhcGhpY3M6IHtcclxuICAgICAgYWdlOiAzNSxcclxuICAgICAgZ2VuZGVyOiBHZW5kZXIuRkVNQUxFLFxyXG4gICAgICBsb2NhdGlvbjoge1xyXG4gICAgICAgIHN0YXRlOiAnTWFoYXJhc2h0cmEnLFxyXG4gICAgICAgIGRpc3RyaWN0OiAnTXVtYmFpJyxcclxuICAgICAgICBwaW5jb2RlOiAnNDAwMDAxJyxcclxuICAgICAgICBjb29yZGluYXRlczogeyBsYXQ6IDE5LjA3NjAsIGxuZzogNzIuODc3NyB9XHJcbiAgICAgIH0sXHJcbiAgICAgIHByZWZlcnJlZExhbmd1YWdlOiBMYW5ndWFnZS5FTkdMSVNIXHJcbiAgICB9LFxyXG4gICAgbWVkaWNhbEhpc3Rvcnk6IHtcclxuICAgICAgY29uZGl0aW9uczogW10sXHJcbiAgICAgIG1lZGljYXRpb25zOiBbXSxcclxuICAgICAgYWxsZXJnaWVzOiBbXSxcclxuICAgICAgbGFzdFZpc2l0OiBuZXcgRGF0ZSgnMjAyMy0wMS0wMScpXHJcbiAgICB9LFxyXG4gICAgcHJlZmVyZW5jZXM6IHtcclxuICAgICAgcHJvdmlkZXJHZW5kZXI6IEdlbmRlci5GRU1BTEUsXHJcbiAgICAgIG1heFRyYXZlbERpc3RhbmNlOiAxMCxcclxuICAgICAgY29zdFNlbnNpdGl2aXR5OiAnbWVkaXVtJ1xyXG4gICAgfSxcclxuICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoJzIwMjMtMDEtMDEnKSxcclxuICAgIHVwZGF0ZWRBdDogbmV3IERhdGUoJzIwMjMtMDEtMDEnKVxyXG4gIH07XHJcblxyXG4gIGNvbnN0IHZhbGlkU3ltcHRvbUlucHV0ID0ge1xyXG4gICAgcGF0aWVudElkOiAnNTUwZTg0MDAtZTI5Yi00MWQ0LWE3MTYtNDQ2NjU1NDQwMDAwJyxcclxuICAgIHN5bXB0b21zOiB7XHJcbiAgICAgIHByaW1hcnlDb21wbGFpbnQ6ICdTZXZlcmUgaGVhZGFjaGUgYW5kIG5hdXNlYScsXHJcbiAgICAgIGR1cmF0aW9uOiAnMiBkYXlzJyxcclxuICAgICAgc2V2ZXJpdHk6IDcsXHJcbiAgICAgIGFzc29jaWF0ZWRTeW1wdG9tczogWydkaXp6aW5lc3MnLCAnc2Vuc2l0aXZpdHkgdG8gbGlnaHQnXSxcclxuICAgICAgaW5wdXRNZXRob2Q6IElucHV0TWV0aG9kLlRFWFRcclxuICAgIH1cclxuICB9O1xyXG5cclxuICBiZWZvcmVFYWNoKCgpID0+IHtcclxuICAgIGRkYk1vY2sucmVzZXQoKTtcclxuICAgIG1vY2tVdWlkdjQubW9ja1JldHVyblZhbHVlKCc1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDEnKTtcclxuICAgIGplc3QuY2xlYXJBbGxNb2NrcygpO1xyXG4gICAgXHJcbiAgICAvLyBTZXQgdGhlIG1vY2sgY2xpZW50IGZvciB0aGUgTGFtYmRhIGZ1bmN0aW9uXHJcbiAgICBzZXREeW5hbW9DbGllbnQoZGRiTW9jayBhcyBhbnkpO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnU3VjY2Vzc2Z1bCBzeW1wdG9tIGludGFrZScsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgc3VjY2Vzc2Z1bGx5IHByb2Nlc3MgdmFsaWQgc3ltcHRvbSBkYXRhJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAvLyBNb2NrIHBhdGllbnQgZXhpc3RzXHJcbiAgICAgIGRkYk1vY2sub24oR2V0Q29tbWFuZCkucmVzb2x2ZXMoe1xyXG4gICAgICAgIEl0ZW06IG1vY2tQYXRpZW50XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gTW9jayBlcGlzb2RlIGNyZWF0aW9uXHJcbiAgICAgIGRkYk1vY2sub24oUHV0Q29tbWFuZCkucmVzb2x2ZXMoe30pO1xyXG5cclxuICAgICAgY29uc3QgZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50ID0ge1xyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHZhbGlkU3ltcHRvbUlucHV0KSxcclxuICAgICAgICBoZWFkZXJzOiB7fSxcclxuICAgICAgICBtdWx0aVZhbHVlSGVhZGVyczoge30sXHJcbiAgICAgICAgaHR0cE1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgIGlzQmFzZTY0RW5jb2RlZDogZmFsc2UsXHJcbiAgICAgICAgcGF0aDogJy9zeW1wdG9tcycsXHJcbiAgICAgICAgcGF0aFBhcmFtZXRlcnM6IG51bGwsXHJcbiAgICAgICAgcXVlcnlTdHJpbmdQYXJhbWV0ZXJzOiBudWxsLFxyXG4gICAgICAgIG11bHRpVmFsdWVRdWVyeVN0cmluZ1BhcmFtZXRlcnM6IG51bGwsXHJcbiAgICAgICAgc3RhZ2VWYXJpYWJsZXM6IG51bGwsXHJcbiAgICAgICAgcmVxdWVzdENvbnRleHQ6IHt9IGFzIGFueSxcclxuICAgICAgICByZXNvdXJjZTogJydcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQsIG1vY2tDb250ZXh0KTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSgyMDApO1xyXG4gICAgICBcclxuICAgICAgY29uc3QgcmVzcG9uc2VCb2R5ID0gSlNPTi5wYXJzZShyZXN1bHQuYm9keSk7XHJcbiAgICAgIGV4cGVjdChyZXNwb25zZUJvZHkuZXBpc29kZUlkKS50b0JlKCc1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDEnKTtcclxuICAgICAgZXhwZWN0KHJlc3BvbnNlQm9keS5zdGF0dXMpLnRvQmUoRXBpc29kZVN0YXR1cy5BQ1RJVkUpO1xyXG4gICAgICBleHBlY3QocmVzcG9uc2VCb2R5Lm1lc3NhZ2UpLnRvQmUoJ1N5bXB0b20gaW50YWtlIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHknKTtcclxuXHJcbiAgICAgIC8vIFZlcmlmeSBEeW5hbW9EQiBjYWxsc1xyXG4gICAgICBleHBlY3QoZGRiTW9jay5jb21tYW5kQ2FsbHMoR2V0Q29tbWFuZCkpLnRvSGF2ZUxlbmd0aCgxKTtcclxuICAgICAgZXhwZWN0KGRkYk1vY2suY29tbWFuZENhbGxzKFB1dENvbW1hbmQpKS50b0hhdmVMZW5ndGgoMSk7XHJcblxyXG4gICAgICBjb25zdCBwdXRDYWxsID0gZGRiTW9jay5jb21tYW5kQ2FsbHMoUHV0Q29tbWFuZClbMF07XHJcbiAgICAgIGNvbnN0IGVwaXNvZGVEYXRhID0gcHV0Q2FsbC5hcmdzWzBdLmlucHV0Lkl0ZW07XHJcbiAgICAgIFxyXG4gICAgICBleHBlY3QoZXBpc29kZURhdGEpLnRvQmVEZWZpbmVkKCk7XHJcbiAgICAgIGV4cGVjdChlcGlzb2RlRGF0YSEuZXBpc29kZUlkKS50b0JlKCc1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDEnKTtcclxuICAgICAgZXhwZWN0KGVwaXNvZGVEYXRhIS5wYXRpZW50SWQpLnRvQmUoJzU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCcpO1xyXG4gICAgICBleHBlY3QoZXBpc29kZURhdGEhLnN0YXR1cykudG9CZShFcGlzb2RlU3RhdHVzLkFDVElWRSk7XHJcbiAgICAgIGV4cGVjdChlcGlzb2RlRGF0YSEuc3ltcHRvbXMucHJpbWFyeUNvbXBsYWludCkudG9CZSgnU2V2ZXJlIGhlYWRhY2hlIGFuZCBuYXVzZWEnKTtcclxuICAgICAgZXhwZWN0KGVwaXNvZGVEYXRhIS5pbnRlcmFjdGlvbnMpLnRvSGF2ZUxlbmd0aCgxKTtcclxuICAgICAgZXhwZWN0KGVwaXNvZGVEYXRhIS5pbnRlcmFjdGlvbnNbMF0udHlwZSkudG9CZSgnc3ltcHRvbV9pbnRha2UnKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgc2FuaXRpemUgc3ltcHRvbSB0ZXh0IGlucHV0JywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBkZGJNb2NrLm9uKEdldENvbW1hbmQpLnJlc29sdmVzKHsgSXRlbTogbW9ja1BhdGllbnQgfSk7XHJcbiAgICAgIGRkYk1vY2sub24oUHV0Q29tbWFuZCkucmVzb2x2ZXMoe30pO1xyXG5cclxuICAgICAgY29uc3QgaW5wdXRXaXRoSHRtbCA9IHtcclxuICAgICAgICAuLi52YWxpZFN5bXB0b21JbnB1dCxcclxuICAgICAgICBzeW1wdG9tczoge1xyXG4gICAgICAgICAgLi4udmFsaWRTeW1wdG9tSW5wdXQuc3ltcHRvbXMsXHJcbiAgICAgICAgICBwcmltYXJ5Q29tcGxhaW50OiAnPHNjcmlwdD5hbGVydChcInhzc1wiKTwvc2NyaXB0PkhlYWRhY2hlIHdpdGggICBtdWx0aXBsZSAgIHNwYWNlcycsXHJcbiAgICAgICAgICBhc3NvY2lhdGVkU3ltcHRvbXM6IFsnPGI+bmF1c2VhPC9iPicsICdmZXZlcj4nXVxyXG4gICAgICAgIH1cclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnN0IGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCA9IHtcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShpbnB1dFdpdGhIdG1sKSxcclxuICAgICAgICBoZWFkZXJzOiB7fSxcclxuICAgICAgICBtdWx0aVZhbHVlSGVhZGVyczoge30sXHJcbiAgICAgICAgaHR0cE1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgIGlzQmFzZTY0RW5jb2RlZDogZmFsc2UsXHJcbiAgICAgICAgcGF0aDogJy9zeW1wdG9tcycsXHJcbiAgICAgICAgcGF0aFBhcmFtZXRlcnM6IG51bGwsXHJcbiAgICAgICAgcXVlcnlTdHJpbmdQYXJhbWV0ZXJzOiBudWxsLFxyXG4gICAgICAgIG11bHRpVmFsdWVRdWVyeVN0cmluZ1BhcmFtZXRlcnM6IG51bGwsXHJcbiAgICAgICAgc3RhZ2VWYXJpYWJsZXM6IG51bGwsXHJcbiAgICAgICAgcmVxdWVzdENvbnRleHQ6IHt9IGFzIGFueSxcclxuICAgICAgICByZXNvdXJjZTogJydcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQsIG1vY2tDb250ZXh0KTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSgyMDApO1xyXG5cclxuICAgICAgY29uc3QgcHV0Q2FsbCA9IGRkYk1vY2suY29tbWFuZENhbGxzKFB1dENvbW1hbmQpWzBdO1xyXG4gICAgICBjb25zdCBlcGlzb2RlRGF0YSA9IHB1dENhbGwuYXJnc1swXS5pbnB1dC5JdGVtO1xyXG4gICAgICBcclxuICAgICAgZXhwZWN0KGVwaXNvZGVEYXRhKS50b0JlRGVmaW5lZCgpO1xyXG4gICAgICBleHBlY3QoZXBpc29kZURhdGEhLnN5bXB0b21zLnByaW1hcnlDb21wbGFpbnQpLnRvQmUoJ3NjcmlwdGFsZXJ0KFwieHNzXCIpL3NjcmlwdEhlYWRhY2hlIHdpdGggbXVsdGlwbGUgc3BhY2VzJyk7XHJcbiAgICAgIGV4cGVjdChlcGlzb2RlRGF0YSEuc3ltcHRvbXMuYXNzb2NpYXRlZFN5bXB0b21zWzBdKS50b0JlKCdibmF1c2VhL2InKTtcclxuICAgICAgZXhwZWN0KGVwaXNvZGVEYXRhIS5zeW1wdG9tcy5hc3NvY2lhdGVkU3ltcHRvbXNbMV0pLnRvQmUoJ2ZldmVyJyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGFuYWx5emUgdXJnZW5jeSBpbmRpY2F0b3JzIGNvcnJlY3RseScsIGFzeW5jICgpID0+IHtcclxuICAgICAgZGRiTW9jay5vbihHZXRDb21tYW5kKS5yZXNvbHZlcyh7IEl0ZW06IG1vY2tQYXRpZW50IH0pO1xyXG4gICAgICBkZGJNb2NrLm9uKFB1dENvbW1hbmQpLnJlc29sdmVzKHt9KTtcclxuXHJcbiAgICAgIGNvbnN0IGVtZXJnZW5jeUlucHV0ID0ge1xyXG4gICAgICAgIC4uLnZhbGlkU3ltcHRvbUlucHV0LFxyXG4gICAgICAgIHN5bXB0b21zOiB7XHJcbiAgICAgICAgICAuLi52YWxpZFN5bXB0b21JbnB1dC5zeW1wdG9tcyxcclxuICAgICAgICAgIHByaW1hcnlDb21wbGFpbnQ6ICdTZXZlcmUgY2hlc3QgcGFpbiBhbmQgZGlmZmljdWx0eSBicmVhdGhpbmcnLFxyXG4gICAgICAgICAgc2V2ZXJpdHk6IDksXHJcbiAgICAgICAgICBkdXJhdGlvbjogJ3N1ZGRlbiBvbnNldCdcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQgPSB7XHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoZW1lcmdlbmN5SW5wdXQpLFxyXG4gICAgICAgIGhlYWRlcnM6IHt9LFxyXG4gICAgICAgIG11bHRpVmFsdWVIZWFkZXJzOiB7fSxcclxuICAgICAgICBodHRwTWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgICAgaXNCYXNlNjRFbmNvZGVkOiBmYWxzZSxcclxuICAgICAgICBwYXRoOiAnL3N5bXB0b21zJyxcclxuICAgICAgICBwYXRoUGFyYW1ldGVyczogbnVsbCxcclxuICAgICAgICBxdWVyeVN0cmluZ1BhcmFtZXRlcnM6IG51bGwsXHJcbiAgICAgICAgbXVsdGlWYWx1ZVF1ZXJ5U3RyaW5nUGFyYW1ldGVyczogbnVsbCxcclxuICAgICAgICBzdGFnZVZhcmlhYmxlczogbnVsbCxcclxuICAgICAgICByZXF1ZXN0Q29udGV4dDoge30gYXMgYW55LFxyXG4gICAgICAgIHJlc291cmNlOiAnJ1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgYXdhaXQgaGFuZGxlcihldmVudCwgbW9ja0NvbnRleHQpO1xyXG5cclxuICAgICAgLy8gVmVyaWZ5IHRoZSBmdW5jdGlvbiBwcm9jZXNzZXMgZW1lcmdlbmN5IGluZGljYXRvcnNcclxuICAgICAgLy8gKFRoZSBhY3R1YWwgdXJnZW5jeSBhbmFseXNpcyBpcyBsb2dnZWQgYnV0IG5vdCByZXR1cm5lZCBpbiByZXNwb25zZSlcclxuICAgICAgZXhwZWN0KGRkYk1vY2suY29tbWFuZENhbGxzKFB1dENvbW1hbmQpKS50b0hhdmVMZW5ndGgoMSk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ1ZhbGlkYXRpb24gZXJyb3JzJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gNDAwIGZvciBtaXNzaW5nIHJlcXVlc3QgYm9keScsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50ID0ge1xyXG4gICAgICAgIGJvZHk6IG51bGwsXHJcbiAgICAgICAgaGVhZGVyczoge30sXHJcbiAgICAgICAgbXVsdGlWYWx1ZUhlYWRlcnM6IHt9LFxyXG4gICAgICAgIGh0dHBNZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICBpc0Jhc2U2NEVuY29kZWQ6IGZhbHNlLFxyXG4gICAgICAgIHBhdGg6ICcvc3ltcHRvbXMnLFxyXG4gICAgICAgIHBhdGhQYXJhbWV0ZXJzOiBudWxsLFxyXG4gICAgICAgIHF1ZXJ5U3RyaW5nUGFyYW1ldGVyczogbnVsbCxcclxuICAgICAgICBtdWx0aVZhbHVlUXVlcnlTdHJpbmdQYXJhbWV0ZXJzOiBudWxsLFxyXG4gICAgICAgIHN0YWdlVmFyaWFibGVzOiBudWxsLFxyXG4gICAgICAgIHJlcXVlc3RDb250ZXh0OiB7fSBhcyBhbnksXHJcbiAgICAgICAgcmVzb3VyY2U6ICcnXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50LCBtb2NrQ29udGV4dCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNDAwKTtcclxuICAgICAgY29uc3QgcmVzcG9uc2VCb2R5ID0gSlNPTi5wYXJzZShyZXN1bHQuYm9keSk7XHJcbiAgICAgIGV4cGVjdChyZXNwb25zZUJvZHkuZXJyb3IpLnRvQmUoJ1JlcXVlc3QgYm9keSBpcyByZXF1aXJlZCcpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gNDAwIGZvciBpbnZhbGlkIEpTT04nLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCA9IHtcclxuICAgICAgICBib2R5OiAnaW52YWxpZCBqc29uJyxcclxuICAgICAgICBoZWFkZXJzOiB7fSxcclxuICAgICAgICBtdWx0aVZhbHVlSGVhZGVyczoge30sXHJcbiAgICAgICAgaHR0cE1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgIGlzQmFzZTY0RW5jb2RlZDogZmFsc2UsXHJcbiAgICAgICAgcGF0aDogJy9zeW1wdG9tcycsXHJcbiAgICAgICAgcGF0aFBhcmFtZXRlcnM6IG51bGwsXHJcbiAgICAgICAgcXVlcnlTdHJpbmdQYXJhbWV0ZXJzOiBudWxsLFxyXG4gICAgICAgIG11bHRpVmFsdWVRdWVyeVN0cmluZ1BhcmFtZXRlcnM6IG51bGwsXHJcbiAgICAgICAgc3RhZ2VWYXJpYWJsZXM6IG51bGwsXHJcbiAgICAgICAgcmVxdWVzdENvbnRleHQ6IHt9IGFzIGFueSxcclxuICAgICAgICByZXNvdXJjZTogJydcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQsIG1vY2tDb250ZXh0KTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSg0MDApO1xyXG4gICAgICBjb25zdCByZXNwb25zZUJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcclxuICAgICAgZXhwZWN0KHJlc3BvbnNlQm9keS5lcnJvcikudG9CZSgnSW52YWxpZCBKU09OIGluIHJlcXVlc3QgYm9keScpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gNDAwIGZvciBtaXNzaW5nIHJlcXVpcmVkIGZpZWxkcycsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgaW52YWxpZElucHV0ID0ge1xyXG4gICAgICAgIHBhdGllbnRJZDogJzU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCcsXHJcbiAgICAgICAgc3ltcHRvbXM6IHtcclxuICAgICAgICAgIC8vIE1pc3NpbmcgcHJpbWFyeUNvbXBsYWludFxyXG4gICAgICAgICAgZHVyYXRpb246ICcyIGRheXMnLFxyXG4gICAgICAgICAgc2V2ZXJpdHk6IDcsXHJcbiAgICAgICAgICBhc3NvY2lhdGVkU3ltcHRvbXM6IFtdLFxyXG4gICAgICAgICAgaW5wdXRNZXRob2Q6IElucHV0TWV0aG9kLlRFWFRcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQgPSB7XHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoaW52YWxpZElucHV0KSxcclxuICAgICAgICBoZWFkZXJzOiB7fSxcclxuICAgICAgICBtdWx0aVZhbHVlSGVhZGVyczoge30sXHJcbiAgICAgICAgaHR0cE1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgIGlzQmFzZTY0RW5jb2RlZDogZmFsc2UsXHJcbiAgICAgICAgcGF0aDogJy9zeW1wdG9tcycsXHJcbiAgICAgICAgcGF0aFBhcmFtZXRlcnM6IG51bGwsXHJcbiAgICAgICAgcXVlcnlTdHJpbmdQYXJhbWV0ZXJzOiBudWxsLFxyXG4gICAgICAgIG11bHRpVmFsdWVRdWVyeVN0cmluZ1BhcmFtZXRlcnM6IG51bGwsXHJcbiAgICAgICAgc3RhZ2VWYXJpYWJsZXM6IG51bGwsXHJcbiAgICAgICAgcmVxdWVzdENvbnRleHQ6IHt9IGFzIGFueSxcclxuICAgICAgICByZXNvdXJjZTogJydcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQsIG1vY2tDb250ZXh0KTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSg0MDApO1xyXG4gICAgICBjb25zdCByZXNwb25zZUJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcclxuICAgICAgZXhwZWN0KHJlc3BvbnNlQm9keS5lcnJvcikudG9CZSgnVmFsaWRhdGlvbiBmYWlsZWQnKTtcclxuICAgICAgZXhwZWN0KHJlc3BvbnNlQm9keS5kZXRhaWxzKS50b0NvbnRhaW4oJ1wic3ltcHRvbXMucHJpbWFyeUNvbXBsYWludFwiIGlzIHJlcXVpcmVkJyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIHJldHVybiA0MDAgZm9yIGludmFsaWQgc2V2ZXJpdHkgcmFuZ2UnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGludmFsaWRJbnB1dCA9IHtcclxuICAgICAgICAuLi52YWxpZFN5bXB0b21JbnB1dCxcclxuICAgICAgICBzeW1wdG9tczoge1xyXG4gICAgICAgICAgLi4udmFsaWRTeW1wdG9tSW5wdXQuc3ltcHRvbXMsXHJcbiAgICAgICAgICBzZXZlcml0eTogMTUgLy8gSW52YWxpZCByYW5nZVxyXG4gICAgICAgIH1cclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnN0IGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCA9IHtcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShpbnZhbGlkSW5wdXQpLFxyXG4gICAgICAgIGhlYWRlcnM6IHt9LFxyXG4gICAgICAgIG11bHRpVmFsdWVIZWFkZXJzOiB7fSxcclxuICAgICAgICBodHRwTWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgICAgaXNCYXNlNjRFbmNvZGVkOiBmYWxzZSxcclxuICAgICAgICBwYXRoOiAnL3N5bXB0b21zJyxcclxuICAgICAgICBwYXRoUGFyYW1ldGVyczogbnVsbCxcclxuICAgICAgICBxdWVyeVN0cmluZ1BhcmFtZXRlcnM6IG51bGwsXHJcbiAgICAgICAgbXVsdGlWYWx1ZVF1ZXJ5U3RyaW5nUGFyYW1ldGVyczogbnVsbCxcclxuICAgICAgICBzdGFnZVZhcmlhYmxlczogbnVsbCxcclxuICAgICAgICByZXF1ZXN0Q29udGV4dDoge30gYXMgYW55LFxyXG4gICAgICAgIHJlc291cmNlOiAnJ1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCwgbW9ja0NvbnRleHQpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDQwMCk7XHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlQm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xyXG4gICAgICBleHBlY3QocmVzcG9uc2VCb2R5LmVycm9yKS50b0JlKCdWYWxpZGF0aW9uIGZhaWxlZCcpO1xyXG4gICAgICBleHBlY3QocmVzcG9uc2VCb2R5LmRldGFpbHMpLnRvQ29udGFpbignXCJzeW1wdG9tcy5zZXZlcml0eVwiIG11c3QgYmUgbGVzcyB0aGFuIG9yIGVxdWFsIHRvIDEwJyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIHJldHVybiA0MDAgZm9yIGludmFsaWQgaW5wdXQgbWV0aG9kJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBpbnZhbGlkSW5wdXQgPSB7XHJcbiAgICAgICAgLi4udmFsaWRTeW1wdG9tSW5wdXQsXHJcbiAgICAgICAgc3ltcHRvbXM6IHtcclxuICAgICAgICAgIC4uLnZhbGlkU3ltcHRvbUlucHV0LnN5bXB0b21zLFxyXG4gICAgICAgICAgaW5wdXRNZXRob2Q6ICdpbnZhbGlkLW1ldGhvZCdcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQgPSB7XHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoaW52YWxpZElucHV0KSxcclxuICAgICAgICBoZWFkZXJzOiB7fSxcclxuICAgICAgICBtdWx0aVZhbHVlSGVhZGVyczoge30sXHJcbiAgICAgICAgaHR0cE1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgIGlzQmFzZTY0RW5jb2RlZDogZmFsc2UsXHJcbiAgICAgICAgcGF0aDogJy9zeW1wdG9tcycsXHJcbiAgICAgICAgcGF0aFBhcmFtZXRlcnM6IG51bGwsXHJcbiAgICAgICAgcXVlcnlTdHJpbmdQYXJhbWV0ZXJzOiBudWxsLFxyXG4gICAgICAgIG11bHRpVmFsdWVRdWVyeVN0cmluZ1BhcmFtZXRlcnM6IG51bGwsXHJcbiAgICAgICAgc3RhZ2VWYXJpYWJsZXM6IG51bGwsXHJcbiAgICAgICAgcmVxdWVzdENvbnRleHQ6IHt9IGFzIGFueSxcclxuICAgICAgICByZXNvdXJjZTogJydcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQsIG1vY2tDb250ZXh0KTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSg0MDApO1xyXG4gICAgICBjb25zdCByZXNwb25zZUJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcclxuICAgICAgZXhwZWN0KHJlc3BvbnNlQm9keS5lcnJvcikudG9CZSgnVmFsaWRhdGlvbiBmYWlsZWQnKTtcclxuICAgICAgZXhwZWN0KHJlc3BvbnNlQm9keS5kZXRhaWxzKS50b0NvbnRhaW4oJ1wic3ltcHRvbXMuaW5wdXRNZXRob2RcIiBtdXN0IGJlIG9uZSBvZiBbdGV4dCwgdm9pY2VdJyk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ1BhdGllbnQgbm90IGZvdW5kJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gNDA0IHdoZW4gcGF0aWVudCBkb2VzIG5vdCBleGlzdCcsIGFzeW5jICgpID0+IHtcclxuICAgICAgLy8gTW9jayBwYXRpZW50IG5vdCBmb3VuZFxyXG4gICAgICBkZGJNb2NrLm9uKEdldENvbW1hbmQpLnJlc29sdmVzKHtcclxuICAgICAgICBJdGVtOiB1bmRlZmluZWRcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQgPSB7XHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkodmFsaWRTeW1wdG9tSW5wdXQpLFxyXG4gICAgICAgIGhlYWRlcnM6IHt9LFxyXG4gICAgICAgIG11bHRpVmFsdWVIZWFkZXJzOiB7fSxcclxuICAgICAgICBodHRwTWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgICAgaXNCYXNlNjRFbmNvZGVkOiBmYWxzZSxcclxuICAgICAgICBwYXRoOiAnL3N5bXB0b21zJyxcclxuICAgICAgICBwYXRoUGFyYW1ldGVyczogbnVsbCxcclxuICAgICAgICBxdWVyeVN0cmluZ1BhcmFtZXRlcnM6IG51bGwsXHJcbiAgICAgICAgbXVsdGlWYWx1ZVF1ZXJ5U3RyaW5nUGFyYW1ldGVyczogbnVsbCxcclxuICAgICAgICBzdGFnZVZhcmlhYmxlczogbnVsbCxcclxuICAgICAgICByZXF1ZXN0Q29udGV4dDoge30gYXMgYW55LFxyXG4gICAgICAgIHJlc291cmNlOiAnJ1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCwgbW9ja0NvbnRleHQpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDQwNCk7XHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlQm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xyXG4gICAgICBleHBlY3QocmVzcG9uc2VCb2R5LmVycm9yKS50b0JlKCdQYXRpZW50IG5vdCBmb3VuZCcpO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdEYXRhYmFzZSBlcnJvcnMnLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIHJldHVybiA1MDAgZm9yIER5bmFtb0RCIGdldCBlcnJvcnMnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIC8vIE1vY2sgRHluYW1vREIgZXJyb3JcclxuICAgICAgZGRiTW9jay5vbihHZXRDb21tYW5kKS5yZWplY3RzKG5ldyBFcnJvcignRHluYW1vREIgZXJyb3InKSk7XHJcblxyXG4gICAgICBjb25zdCBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQgPSB7XHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkodmFsaWRTeW1wdG9tSW5wdXQpLFxyXG4gICAgICAgIGhlYWRlcnM6IHt9LFxyXG4gICAgICAgIG11bHRpVmFsdWVIZWFkZXJzOiB7fSxcclxuICAgICAgICBodHRwTWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgICAgaXNCYXNlNjRFbmNvZGVkOiBmYWxzZSxcclxuICAgICAgICBwYXRoOiAnL3N5bXB0b21zJyxcclxuICAgICAgICBwYXRoUGFyYW1ldGVyczogbnVsbCxcclxuICAgICAgICBxdWVyeVN0cmluZ1BhcmFtZXRlcnM6IG51bGwsXHJcbiAgICAgICAgbXVsdGlWYWx1ZVF1ZXJ5U3RyaW5nUGFyYW1ldGVyczogbnVsbCxcclxuICAgICAgICBzdGFnZVZhcmlhYmxlczogbnVsbCxcclxuICAgICAgICByZXF1ZXN0Q29udGV4dDoge30gYXMgYW55LFxyXG4gICAgICAgIHJlc291cmNlOiAnJ1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCwgbW9ja0NvbnRleHQpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDUwMCk7XHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlQm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xyXG4gICAgICBleHBlY3QocmVzcG9uc2VCb2R5LmVycm9yKS50b0JlKCdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3InKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgcmV0dXJuIDUwMCBmb3IgRHluYW1vREIgcHV0IGVycm9ycycsIGFzeW5jICgpID0+IHtcclxuICAgICAgZGRiTW9jay5vbihHZXRDb21tYW5kKS5yZXNvbHZlcyh7IEl0ZW06IG1vY2tQYXRpZW50IH0pO1xyXG4gICAgICBkZGJNb2NrLm9uKFB1dENvbW1hbmQpLnJlamVjdHMobmV3IEVycm9yKCdEeW5hbW9EQiBwdXQgZXJyb3InKSk7XHJcblxyXG4gICAgICBjb25zdCBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQgPSB7XHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkodmFsaWRTeW1wdG9tSW5wdXQpLFxyXG4gICAgICAgIGhlYWRlcnM6IHt9LFxyXG4gICAgICAgIG11bHRpVmFsdWVIZWFkZXJzOiB7fSxcclxuICAgICAgICBodHRwTWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgICAgaXNCYXNlNjRFbmNvZGVkOiBmYWxzZSxcclxuICAgICAgICBwYXRoOiAnL3N5bXB0b21zJyxcclxuICAgICAgICBwYXRoUGFyYW1ldGVyczogbnVsbCxcclxuICAgICAgICBxdWVyeVN0cmluZ1BhcmFtZXRlcnM6IG51bGwsXHJcbiAgICAgICAgbXVsdGlWYWx1ZVF1ZXJ5U3RyaW5nUGFyYW1ldGVyczogbnVsbCxcclxuICAgICAgICBzdGFnZVZhcmlhYmxlczogbnVsbCxcclxuICAgICAgICByZXF1ZXN0Q29udGV4dDoge30gYXMgYW55LFxyXG4gICAgICAgIHJlc291cmNlOiAnJ1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCwgbW9ja0NvbnRleHQpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDUwMCk7XHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlQm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xyXG4gICAgICBleHBlY3QocmVzcG9uc2VCb2R5LmVycm9yKS50b0JlKCdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3InKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnQ09SUyBoZWFkZXJzJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCBpbmNsdWRlIHByb3BlciBDT1JTIGhlYWRlcnMgaW4gYWxsIHJlc3BvbnNlcycsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50ID0ge1xyXG4gICAgICAgIGJvZHk6IG51bGwsXHJcbiAgICAgICAgaGVhZGVyczoge30sXHJcbiAgICAgICAgbXVsdGlWYWx1ZUhlYWRlcnM6IHt9LFxyXG4gICAgICAgIGh0dHBNZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICBpc0Jhc2U2NEVuY29kZWQ6IGZhbHNlLFxyXG4gICAgICAgIHBhdGg6ICcvc3ltcHRvbXMnLFxyXG4gICAgICAgIHBhdGhQYXJhbWV0ZXJzOiBudWxsLFxyXG4gICAgICAgIHF1ZXJ5U3RyaW5nUGFyYW1ldGVyczogbnVsbCxcclxuICAgICAgICBtdWx0aVZhbHVlUXVlcnlTdHJpbmdQYXJhbWV0ZXJzOiBudWxsLFxyXG4gICAgICAgIHN0YWdlVmFyaWFibGVzOiBudWxsLFxyXG4gICAgICAgIHJlcXVlc3RDb250ZXh0OiB7fSBhcyBhbnksXHJcbiAgICAgICAgcmVzb3VyY2U6ICcnXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50LCBtb2NrQ29udGV4dCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LmhlYWRlcnMpLnRvRXF1YWwoe1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctSGVhZGVycyc6ICdDb250ZW50LVR5cGUsWC1BbXotRGF0ZSxBdXRob3JpemF0aW9uLFgtQXBpLUtleSxYLUFtei1TZWN1cml0eS1Ub2tlbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiAnUE9TVCxPUFRJT05TJ1xyXG4gICAgICB9KTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnVm9pY2UgaW5wdXQgaW50ZWdyYXRpb24nLCAoKSA9PiB7XHJcbiAgICBjb25zdCBtb2NrUHJvY2Vzc1ZvaWNlSW5wdXQgPSB2b2ljZUlucHV0U2VydmljZS5wcm9jZXNzVm9pY2VJbnB1dCBhcyBqZXN0Lk1vY2tlZEZ1bmN0aW9uPHR5cGVvZiB2b2ljZUlucHV0U2VydmljZS5wcm9jZXNzVm9pY2VJbnB1dD47XHJcbiAgICBjb25zdCBtb2NrQ3JlYXRlUHJlc2lnbmVkVXBsb2FkVXJsID0gdm9pY2VJbnB1dFNlcnZpY2UuY3JlYXRlUHJlc2lnbmVkVXBsb2FkVXJsIGFzIGplc3QuTW9ja2VkRnVuY3Rpb248dHlwZW9mIHZvaWNlSW5wdXRTZXJ2aWNlLmNyZWF0ZVByZXNpZ25lZFVwbG9hZFVybD47XHJcblxyXG4gICAgYmVmb3JlRWFjaCgoKSA9PiB7XHJcbiAgICAgIG1vY2tQcm9jZXNzVm9pY2VJbnB1dC5tb2NrUmVzZXQoKTtcclxuICAgICAgbW9ja0NyZWF0ZVByZXNpZ25lZFVwbG9hZFVybC5tb2NrUmVzZXQoKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgc3VjY2Vzc2Z1bGx5IHByb2Nlc3Mgdm9pY2UgaW5wdXQnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIC8vIE1vY2sgcGF0aWVudCBleGlzdHNcclxuICAgICAgZGRiTW9jay5vbihHZXRDb21tYW5kKS5yZXNvbHZlcyh7IEl0ZW06IG1vY2tQYXRpZW50IH0pO1xyXG5cclxuICAgICAgLy8gTW9jayBzdWNjZXNzZnVsIHZvaWNlIHByb2Nlc3NpbmdcclxuICAgICAgbW9ja1Byb2Nlc3NWb2ljZUlucHV0Lm1vY2tSZXNvbHZlZFZhbHVlKHtcclxuICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgIHRyYW5zY3JpYmVkVGV4dDogJ0kgaGF2ZSBhIHNldmVyZSBoZWFkYWNoZSBhbmQgbmF1c2VhJyxcclxuICAgICAgICBjb25maWRlbmNlOiAwLjk1LFxyXG4gICAgICAgIGxhbmd1YWdlOiAnZW4tSU4nLFxyXG4gICAgICAgIHByb2Nlc3NpbmdUaW1lTXM6IDI1MDBcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCB2b2ljZUlucHV0UmVxdWVzdCA9IHtcclxuICAgICAgICBwYXRpZW50SWQ6ICc1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAnLFxyXG4gICAgICAgIGF1ZGlvRGF0YTogQnVmZmVyLmZyb20oJ21vY2sgYXVkaW8gZGF0YScpLnRvU3RyaW5nKCdiYXNlNjQnKSxcclxuICAgICAgICBtaW1lVHlwZTogJ2F1ZGlvL3dhdicsXHJcbiAgICAgICAgbGFuZ3VhZ2U6ICdlbidcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnN0IGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCA9IHtcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh2b2ljZUlucHV0UmVxdWVzdCksXHJcbiAgICAgICAgaGVhZGVyczoge30sXHJcbiAgICAgICAgbXVsdGlWYWx1ZUhlYWRlcnM6IHt9LFxyXG4gICAgICAgIGh0dHBNZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICBpc0Jhc2U2NEVuY29kZWQ6IGZhbHNlLFxyXG4gICAgICAgIHBhdGg6ICcvc3ltcHRvbXMvdm9pY2UtaW5wdXQnLFxyXG4gICAgICAgIHBhdGhQYXJhbWV0ZXJzOiBudWxsLFxyXG4gICAgICAgIHF1ZXJ5U3RyaW5nUGFyYW1ldGVyczogbnVsbCxcclxuICAgICAgICBtdWx0aVZhbHVlUXVlcnlTdHJpbmdQYXJhbWV0ZXJzOiBudWxsLFxyXG4gICAgICAgIHN0YWdlVmFyaWFibGVzOiBudWxsLFxyXG4gICAgICAgIHJlcXVlc3RDb250ZXh0OiB7fSBhcyBhbnksXHJcbiAgICAgICAgcmVzb3VyY2U6ICcnXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50LCBtb2NrQ29udGV4dCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcclxuICAgICAgXHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlQm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xyXG4gICAgICBleHBlY3QocmVzcG9uc2VCb2R5LnRyYW5zY3JpYmVkVGV4dCkudG9CZSgnSSBoYXZlIGEgc2V2ZXJlIGhlYWRhY2hlIGFuZCBuYXVzZWEnKTtcclxuICAgICAgZXhwZWN0KHJlc3BvbnNlQm9keS5jb25maWRlbmNlKS50b0JlKDAuOTUpO1xyXG4gICAgICBleHBlY3QocmVzcG9uc2VCb2R5Lmxhbmd1YWdlKS50b0JlKCdlbi1JTicpO1xyXG4gICAgICBleHBlY3QocmVzcG9uc2VCb2R5Lm1lc3NhZ2UpLnRvQmUoJ1ZvaWNlIGlucHV0IHByb2Nlc3NlZCBzdWNjZXNzZnVsbHknKTtcclxuXHJcbiAgICAgIC8vIFZlcmlmeSB2b2ljZSBwcm9jZXNzaW5nIHdhcyBjYWxsZWQgd2l0aCBjb3JyZWN0IHBhcmFtZXRlcnNcclxuICAgICAgZXhwZWN0KG1vY2tQcm9jZXNzVm9pY2VJbnB1dCkudG9IYXZlQmVlbkNhbGxlZFdpdGgoXHJcbiAgICAgICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgYnVmZmVyOiBleHBlY3QuYW55KEJ1ZmZlciksXHJcbiAgICAgICAgICBtaW1lVHlwZTogJ2F1ZGlvL3dhdicsXHJcbiAgICAgICAgICBzaXplOiBleHBlY3QuYW55KE51bWJlcilcclxuICAgICAgICB9KSxcclxuICAgICAgICAnNTUwZTg0MDAtZTI5Yi00MWQ0LWE3MTYtNDQ2NjU1NDQwMDAwJyxcclxuICAgICAgICAnRU5fSU4nXHJcbiAgICAgICk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGhhbmRsZSB2b2ljZSBwcm9jZXNzaW5nIGZhaWx1cmUnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIC8vIE1vY2sgcGF0aWVudCBleGlzdHNcclxuICAgICAgZGRiTW9jay5vbihHZXRDb21tYW5kKS5yZXNvbHZlcyh7IEl0ZW06IG1vY2tQYXRpZW50IH0pO1xyXG5cclxuICAgICAgLy8gTW9jayB2b2ljZSBwcm9jZXNzaW5nIGZhaWx1cmVcclxuICAgICAgbW9ja1Byb2Nlc3NWb2ljZUlucHV0Lm1vY2tSZXNvbHZlZFZhbHVlKHtcclxuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcclxuICAgICAgICBlcnJvcjogJ0F1ZGlvIHF1YWxpdHkgdG9vIHBvb3IgZm9yIHRyYW5zY3JpcHRpb24nLFxyXG4gICAgICAgIGZhbGxiYWNrVXNlZDogdHJ1ZSxcclxuICAgICAgICBwcm9jZXNzaW5nVGltZU1zOiAxNTAwXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3Qgdm9pY2VJbnB1dFJlcXVlc3QgPSB7XHJcbiAgICAgICAgcGF0aWVudElkOiAnNTUwZTg0MDAtZTI5Yi00MWQ0LWE3MTYtNDQ2NjU1NDQwMDAwJyxcclxuICAgICAgICBhdWRpb0RhdGE6IEJ1ZmZlci5mcm9tKCdwb29yIHF1YWxpdHkgYXVkaW8nKS50b1N0cmluZygnYmFzZTY0JyksXHJcbiAgICAgICAgbWltZVR5cGU6ICdhdWRpby93YXYnXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQgPSB7XHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkodm9pY2VJbnB1dFJlcXVlc3QpLFxyXG4gICAgICAgIGhlYWRlcnM6IHt9LFxyXG4gICAgICAgIG11bHRpVmFsdWVIZWFkZXJzOiB7fSxcclxuICAgICAgICBodHRwTWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgICAgaXNCYXNlNjRFbmNvZGVkOiBmYWxzZSxcclxuICAgICAgICBwYXRoOiAnL3N5bXB0b21zL3ZvaWNlLWlucHV0JyxcclxuICAgICAgICBwYXRoUGFyYW1ldGVyczogbnVsbCxcclxuICAgICAgICBxdWVyeVN0cmluZ1BhcmFtZXRlcnM6IG51bGwsXHJcbiAgICAgICAgbXVsdGlWYWx1ZVF1ZXJ5U3RyaW5nUGFyYW1ldGVyczogbnVsbCxcclxuICAgICAgICBzdGFnZVZhcmlhYmxlczogbnVsbCxcclxuICAgICAgICByZXF1ZXN0Q29udGV4dDoge30gYXMgYW55LFxyXG4gICAgICAgIHJlc291cmNlOiAnJ1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCwgbW9ja0NvbnRleHQpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDQyMik7XHJcbiAgICAgIFxyXG4gICAgICBjb25zdCByZXNwb25zZUJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcclxuICAgICAgZXhwZWN0KHJlc3BvbnNlQm9keS5lcnJvcikudG9CZSgnVm9pY2UgcHJvY2Vzc2luZyBmYWlsZWQnKTtcclxuICAgICAgZXhwZWN0KHJlc3BvbnNlQm9keS5kZXRhaWxzKS50b0NvbnRhaW4oJ0F1ZGlvIHF1YWxpdHkgdG9vIHBvb3IgZm9yIHRyYW5zY3JpcHRpb24nKTtcclxuICAgICAgZXhwZWN0KHJlc3BvbnNlQm9keS5kZXRhaWxzKS50b0NvbnRhaW4oJ1BsZWFzZSB0cnkgYWdhaW4gb3IgdXNlIHRleHQgaW5wdXQgaW5zdGVhZCcpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgSGluZGkgdm9pY2UgaW5wdXQnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIC8vIE1vY2sgcGF0aWVudCBleGlzdHNcclxuICAgICAgZGRiTW9jay5vbihHZXRDb21tYW5kKS5yZXNvbHZlcyh7IEl0ZW06IG1vY2tQYXRpZW50IH0pO1xyXG5cclxuICAgICAgLy8gTW9jayBzdWNjZXNzZnVsIEhpbmRpIHZvaWNlIHByb2Nlc3NpbmdcclxuICAgICAgbW9ja1Byb2Nlc3NWb2ljZUlucHV0Lm1vY2tSZXNvbHZlZFZhbHVlKHtcclxuICAgICAgICBzdWNjZXNzOiB0cnVlLFxyXG4gICAgICAgIHRyYW5zY3JpYmVkVGV4dDogJ+CkruClgeCkneClhyDgpLjgpL/gpLDgpKbgpLDgpY3gpKYg4KSU4KSwIOCkrOClgeCkluCkvuCksCDgpLngpYgnLFxyXG4gICAgICAgIGNvbmZpZGVuY2U6IDAuODgsXHJcbiAgICAgICAgbGFuZ3VhZ2U6ICdoaS1JTicsXHJcbiAgICAgICAgcHJvY2Vzc2luZ1RpbWVNczogMzAwMFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHZvaWNlSW5wdXRSZXF1ZXN0ID0ge1xyXG4gICAgICAgIHBhdGllbnRJZDogJzU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCcsXHJcbiAgICAgICAgYXVkaW9EYXRhOiBCdWZmZXIuZnJvbSgnaGluZGkgYXVkaW8gZGF0YScpLnRvU3RyaW5nKCdiYXNlNjQnKSxcclxuICAgICAgICBtaW1lVHlwZTogJ2F1ZGlvL3dhdicsXHJcbiAgICAgICAgbGFuZ3VhZ2U6ICdoaSdcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnN0IGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCA9IHtcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh2b2ljZUlucHV0UmVxdWVzdCksXHJcbiAgICAgICAgaGVhZGVyczoge30sXHJcbiAgICAgICAgbXVsdGlWYWx1ZUhlYWRlcnM6IHt9LFxyXG4gICAgICAgIGh0dHBNZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICBpc0Jhc2U2NEVuY29kZWQ6IGZhbHNlLFxyXG4gICAgICAgIHBhdGg6ICcvc3ltcHRvbXMvdm9pY2UtaW5wdXQnLFxyXG4gICAgICAgIHBhdGhQYXJhbWV0ZXJzOiBudWxsLFxyXG4gICAgICAgIHF1ZXJ5U3RyaW5nUGFyYW1ldGVyczogbnVsbCxcclxuICAgICAgICBtdWx0aVZhbHVlUXVlcnlTdHJpbmdQYXJhbWV0ZXJzOiBudWxsLFxyXG4gICAgICAgIHN0YWdlVmFyaWFibGVzOiBudWxsLFxyXG4gICAgICAgIHJlcXVlc3RDb250ZXh0OiB7fSBhcyBhbnksXHJcbiAgICAgICAgcmVzb3VyY2U6ICcnXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50LCBtb2NrQ29udGV4dCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcclxuICAgICAgXHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlQm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xyXG4gICAgICBleHBlY3QocmVzcG9uc2VCb2R5LnRyYW5zY3JpYmVkVGV4dCkudG9CZSgn4KSu4KWB4KSd4KWHIOCkuOCkv+CksOCkpuCksOCljeCkpiDgpJTgpLAg4KSs4KWB4KSW4KS+4KSwIOCkueCliCcpO1xyXG4gICAgICBleHBlY3QocmVzcG9uc2VCb2R5Lmxhbmd1YWdlKS50b0JlKCdoaS1JTicpO1xyXG5cclxuICAgICAgLy8gVmVyaWZ5IEhpbmRpIGxhbmd1YWdlIGNvZGUgd2FzIHVzZWRcclxuICAgICAgZXhwZWN0KG1vY2tQcm9jZXNzVm9pY2VJbnB1dCkudG9IYXZlQmVlbkNhbGxlZFdpdGgoXHJcbiAgICAgICAgZXhwZWN0LmFueShPYmplY3QpLFxyXG4gICAgICAgICc1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAnLFxyXG4gICAgICAgICdISV9JTidcclxuICAgICAgKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgcmV0dXJuIDQwMCBmb3IgbWlzc2luZyB2b2ljZSBpbnB1dCBmaWVsZHMnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGluY29tcGxldGVSZXF1ZXN0ID0ge1xyXG4gICAgICAgIHBhdGllbnRJZDogJzU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCdcclxuICAgICAgICAvLyBNaXNzaW5nIGF1ZGlvRGF0YSBhbmQgbWltZVR5cGVcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnN0IGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCA9IHtcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShpbmNvbXBsZXRlUmVxdWVzdCksXHJcbiAgICAgICAgaGVhZGVyczoge30sXHJcbiAgICAgICAgbXVsdGlWYWx1ZUhlYWRlcnM6IHt9LFxyXG4gICAgICAgIGh0dHBNZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICBpc0Jhc2U2NEVuY29kZWQ6IGZhbHNlLFxyXG4gICAgICAgIHBhdGg6ICcvc3ltcHRvbXMvdm9pY2UtaW5wdXQnLFxyXG4gICAgICAgIHBhdGhQYXJhbWV0ZXJzOiBudWxsLFxyXG4gICAgICAgIHF1ZXJ5U3RyaW5nUGFyYW1ldGVyczogbnVsbCxcclxuICAgICAgICBtdWx0aVZhbHVlUXVlcnlTdHJpbmdQYXJhbWV0ZXJzOiBudWxsLFxyXG4gICAgICAgIHN0YWdlVmFyaWFibGVzOiBudWxsLFxyXG4gICAgICAgIHJlcXVlc3RDb250ZXh0OiB7fSBhcyBhbnksXHJcbiAgICAgICAgcmVzb3VyY2U6ICcnXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50LCBtb2NrQ29udGV4dCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNDAwKTtcclxuICAgICAgXHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlQm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xyXG4gICAgICBleHBlY3QocmVzcG9uc2VCb2R5LmVycm9yKS50b0JlKCdNaXNzaW5nIHJlcXVpcmVkIGZpZWxkczogcGF0aWVudElkLCBhdWRpb0RhdGEsIG1pbWVUeXBlJyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGhhbmRsZSB2b2ljZSBwcm9jZXNzaW5nIHNlcnZpY2UgZXJyb3JzJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAvLyBNb2NrIHBhdGllbnQgZXhpc3RzXHJcbiAgICAgIGRkYk1vY2sub24oR2V0Q29tbWFuZCkucmVzb2x2ZXMoeyBJdGVtOiBtb2NrUGF0aWVudCB9KTtcclxuXHJcbiAgICAgIC8vIE1vY2sgdm9pY2UgcHJvY2Vzc2luZyBzZXJ2aWNlIGVycm9yXHJcbiAgICAgIG1vY2tQcm9jZXNzVm9pY2VJbnB1dC5tb2NrUmVqZWN0ZWRWYWx1ZShuZXcgRXJyb3IoJ1RyYW5zY3JpYmUgc2VydmljZSB1bmF2YWlsYWJsZScpKTtcclxuXHJcbiAgICAgIGNvbnN0IHZvaWNlSW5wdXRSZXF1ZXN0ID0ge1xyXG4gICAgICAgIHBhdGllbnRJZDogJzU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCcsXHJcbiAgICAgICAgYXVkaW9EYXRhOiBCdWZmZXIuZnJvbSgnYXVkaW8gZGF0YScpLnRvU3RyaW5nKCdiYXNlNjQnKSxcclxuICAgICAgICBtaW1lVHlwZTogJ2F1ZGlvL3dhdidcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnN0IGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCA9IHtcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh2b2ljZUlucHV0UmVxdWVzdCksXHJcbiAgICAgICAgaGVhZGVyczoge30sXHJcbiAgICAgICAgbXVsdGlWYWx1ZUhlYWRlcnM6IHt9LFxyXG4gICAgICAgIGh0dHBNZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICBpc0Jhc2U2NEVuY29kZWQ6IGZhbHNlLFxyXG4gICAgICAgIHBhdGg6ICcvc3ltcHRvbXMvdm9pY2UtaW5wdXQnLFxyXG4gICAgICAgIHBhdGhQYXJhbWV0ZXJzOiBudWxsLFxyXG4gICAgICAgIHF1ZXJ5U3RyaW5nUGFyYW1ldGVyczogbnVsbCxcclxuICAgICAgICBtdWx0aVZhbHVlUXVlcnlTdHJpbmdQYXJhbWV0ZXJzOiBudWxsLFxyXG4gICAgICAgIHN0YWdlVmFyaWFibGVzOiBudWxsLFxyXG4gICAgICAgIHJlcXVlc3RDb250ZXh0OiB7fSBhcyBhbnksXHJcbiAgICAgICAgcmVzb3VyY2U6ICcnXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50LCBtb2NrQ29udGV4dCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNTAwKTtcclxuICAgICAgXHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlQm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xyXG4gICAgICBleHBlY3QocmVzcG9uc2VCb2R5LmVycm9yKS50b0JlKCdWb2ljZSBwcm9jZXNzaW5nIGZhaWxlZCcpO1xyXG4gICAgICBleHBlY3QocmVzcG9uc2VCb2R5LmRldGFpbHMpLnRvQ29udGFpbignVW5hYmxlIHRvIHByb2Nlc3Mgdm9pY2UgaW5wdXQgYXQgdGhpcyB0aW1lJyk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ1ByZXNpZ25lZCBVUkwgZ2VuZXJhdGlvbicsICgpID0+IHtcclxuICAgIGNvbnN0IG1vY2tDcmVhdGVQcmVzaWduZWRVcGxvYWRVcmwgPSB2b2ljZUlucHV0U2VydmljZS5jcmVhdGVQcmVzaWduZWRVcGxvYWRVcmwgYXMgamVzdC5Nb2NrZWRGdW5jdGlvbjx0eXBlb2Ygdm9pY2VJbnB1dFNlcnZpY2UuY3JlYXRlUHJlc2lnbmVkVXBsb2FkVXJsPjtcclxuXHJcbiAgICBiZWZvcmVFYWNoKCgpID0+IHtcclxuICAgICAgbW9ja0NyZWF0ZVByZXNpZ25lZFVwbG9hZFVybC5tb2NrUmVzZXQoKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgc3VjY2Vzc2Z1bGx5IGNyZWF0ZSBwcmVzaWduZWQgVVJMJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAvLyBNb2NrIHBhdGllbnQgZXhpc3RzXHJcbiAgICAgIGRkYk1vY2sub24oR2V0Q29tbWFuZCkucmVzb2x2ZXMoeyBJdGVtOiBtb2NrUGF0aWVudCB9KTtcclxuXHJcbiAgICAgIC8vIE1vY2sgcHJlc2lnbmVkIFVSTCBjcmVhdGlvblxyXG4gICAgICBtb2NrQ3JlYXRlUHJlc2lnbmVkVXBsb2FkVXJsLm1vY2tSZXNvbHZlZFZhbHVlKHtcclxuICAgICAgICB1cGxvYWRVcmw6ICdodHRwczovL3Rlc3QtYXVkaW8tYnVja2V0LnMzLmFtYXpvbmF3cy5jb20vYXVkaW8tdXBsb2Fkcy90ZXN0LXBhdGllbnQvdGVzdC1maWxlLndhdicsXHJcbiAgICAgICAgczNLZXk6ICdhdWRpby11cGxvYWRzL3Rlc3QtcGF0aWVudC90ZXN0LWZpbGUud2F2J1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHByZXNpZ25lZFVybFJlcXVlc3QgPSB7XHJcbiAgICAgICAgcGF0aWVudElkOiAnNTUwZTg0MDAtZTI5Yi00MWQ0LWE3MTYtNDQ2NjU1NDQwMDAwJyxcclxuICAgICAgICBtaW1lVHlwZTogJ2F1ZGlvL3dhdidcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnN0IGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCA9IHtcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShwcmVzaWduZWRVcmxSZXF1ZXN0KSxcclxuICAgICAgICBoZWFkZXJzOiB7fSxcclxuICAgICAgICBtdWx0aVZhbHVlSGVhZGVyczoge30sXHJcbiAgICAgICAgaHR0cE1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgIGlzQmFzZTY0RW5jb2RlZDogZmFsc2UsXHJcbiAgICAgICAgcGF0aDogJy9zeW1wdG9tcy9wcmVzaWduZWQtdXJsJyxcclxuICAgICAgICBwYXRoUGFyYW1ldGVyczogbnVsbCxcclxuICAgICAgICBxdWVyeVN0cmluZ1BhcmFtZXRlcnM6IG51bGwsXHJcbiAgICAgICAgbXVsdGlWYWx1ZVF1ZXJ5U3RyaW5nUGFyYW1ldGVyczogbnVsbCxcclxuICAgICAgICBzdGFnZVZhcmlhYmxlczogbnVsbCxcclxuICAgICAgICByZXF1ZXN0Q29udGV4dDoge30gYXMgYW55LFxyXG4gICAgICAgIHJlc291cmNlOiAnJ1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCwgbW9ja0NvbnRleHQpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDIwMCk7XHJcbiAgICAgIFxyXG4gICAgICBjb25zdCByZXNwb25zZUJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcclxuICAgICAgZXhwZWN0KHJlc3BvbnNlQm9keS51cGxvYWRVcmwpLnRvQ29udGFpbigndGVzdC1hdWRpby1idWNrZXQuczMuYW1hem9uYXdzLmNvbScpO1xyXG4gICAgICBleHBlY3QocmVzcG9uc2VCb2R5LnMzS2V5KS50b0NvbnRhaW4oJ2F1ZGlvLXVwbG9hZHMvdGVzdC1wYXRpZW50Jyk7XHJcbiAgICAgIGV4cGVjdChyZXNwb25zZUJvZHkubWVzc2FnZSkudG9CZSgnUHJlc2lnbmVkIFVSTCBjcmVhdGVkIHN1Y2Nlc3NmdWxseScpO1xyXG4gICAgICBleHBlY3QocmVzcG9uc2VCb2R5LmV4cGlyZXNJbikudG9CZSgnMTUgbWludXRlcycpO1xyXG5cclxuICAgICAgLy8gVmVyaWZ5IHByZXNpZ25lZCBVUkwgY3JlYXRpb24gd2FzIGNhbGxlZCB3aXRoIGNvcnJlY3QgcGFyYW1ldGVyc1xyXG4gICAgICBleHBlY3QobW9ja0NyZWF0ZVByZXNpZ25lZFVwbG9hZFVybCkudG9IYXZlQmVlbkNhbGxlZFdpdGgoXHJcbiAgICAgICAgJzU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCcsXHJcbiAgICAgICAgJ2F1ZGlvL3dhdidcclxuICAgICAgKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgcmV0dXJuIDQwMCBmb3IgbWlzc2luZyBwcmVzaWduZWQgVVJMIGZpZWxkcycsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgaW5jb21wbGV0ZVJlcXVlc3QgPSB7XHJcbiAgICAgICAgcGF0aWVudElkOiAnNTUwZTg0MDAtZTI5Yi00MWQ0LWE3MTYtNDQ2NjU1NDQwMDAwJ1xyXG4gICAgICAgIC8vIE1pc3NpbmcgbWltZVR5cGVcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnN0IGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCA9IHtcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShpbmNvbXBsZXRlUmVxdWVzdCksXHJcbiAgICAgICAgaGVhZGVyczoge30sXHJcbiAgICAgICAgbXVsdGlWYWx1ZUhlYWRlcnM6IHt9LFxyXG4gICAgICAgIGh0dHBNZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICBpc0Jhc2U2NEVuY29kZWQ6IGZhbHNlLFxyXG4gICAgICAgIHBhdGg6ICcvc3ltcHRvbXMvcHJlc2lnbmVkLXVybCcsXHJcbiAgICAgICAgcGF0aFBhcmFtZXRlcnM6IG51bGwsXHJcbiAgICAgICAgcXVlcnlTdHJpbmdQYXJhbWV0ZXJzOiBudWxsLFxyXG4gICAgICAgIG11bHRpVmFsdWVRdWVyeVN0cmluZ1BhcmFtZXRlcnM6IG51bGwsXHJcbiAgICAgICAgc3RhZ2VWYXJpYWJsZXM6IG51bGwsXHJcbiAgICAgICAgcmVxdWVzdENvbnRleHQ6IHt9IGFzIGFueSxcclxuICAgICAgICByZXNvdXJjZTogJydcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQsIG1vY2tDb250ZXh0KTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSg0MDApO1xyXG4gICAgICBcclxuICAgICAgY29uc3QgcmVzcG9uc2VCb2R5ID0gSlNPTi5wYXJzZShyZXN1bHQuYm9keSk7XHJcbiAgICAgIGV4cGVjdChyZXNwb25zZUJvZHkuZXJyb3IpLnRvQmUoJ01pc3NpbmcgcmVxdWlyZWQgZmllbGRzOiBwYXRpZW50SWQsIG1pbWVUeXBlJyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGhhbmRsZSBwcmVzaWduZWQgVVJMIGNyZWF0aW9uIGVycm9ycycsIGFzeW5jICgpID0+IHtcclxuICAgICAgLy8gTW9jayBwYXRpZW50IGV4aXN0c1xyXG4gICAgICBkZGJNb2NrLm9uKEdldENvbW1hbmQpLnJlc29sdmVzKHsgSXRlbTogbW9ja1BhdGllbnQgfSk7XHJcblxyXG4gICAgICAvLyBNb2NrIHByZXNpZ25lZCBVUkwgY3JlYXRpb24gZXJyb3JcclxuICAgICAgbW9ja0NyZWF0ZVByZXNpZ25lZFVwbG9hZFVybC5tb2NrUmVqZWN0ZWRWYWx1ZShuZXcgRXJyb3IoJ1MzIHNlcnZpY2UgdW5hdmFpbGFibGUnKSk7XHJcblxyXG4gICAgICBjb25zdCBwcmVzaWduZWRVcmxSZXF1ZXN0ID0ge1xyXG4gICAgICAgIHBhdGllbnRJZDogJzU1MGU4NDAwLWUyOWItNDFkNC1hNzE2LTQ0NjY1NTQ0MDAwMCcsXHJcbiAgICAgICAgbWltZVR5cGU6ICdhdWRpby93YXYnXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQgPSB7XHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocHJlc2lnbmVkVXJsUmVxdWVzdCksXHJcbiAgICAgICAgaGVhZGVyczoge30sXHJcbiAgICAgICAgbXVsdGlWYWx1ZUhlYWRlcnM6IHt9LFxyXG4gICAgICAgIGh0dHBNZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICBpc0Jhc2U2NEVuY29kZWQ6IGZhbHNlLFxyXG4gICAgICAgIHBhdGg6ICcvc3ltcHRvbXMvcHJlc2lnbmVkLXVybCcsXHJcbiAgICAgICAgcGF0aFBhcmFtZXRlcnM6IG51bGwsXHJcbiAgICAgICAgcXVlcnlTdHJpbmdQYXJhbWV0ZXJzOiBudWxsLFxyXG4gICAgICAgIG11bHRpVmFsdWVRdWVyeVN0cmluZ1BhcmFtZXRlcnM6IG51bGwsXHJcbiAgICAgICAgc3RhZ2VWYXJpYWJsZXM6IG51bGwsXHJcbiAgICAgICAgcmVxdWVzdENvbnRleHQ6IHt9IGFzIGFueSxcclxuICAgICAgICByZXNvdXJjZTogJydcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQsIG1vY2tDb250ZXh0KTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSg1MDApO1xyXG4gICAgICBcclxuICAgICAgY29uc3QgcmVzcG9uc2VCb2R5ID0gSlNPTi5wYXJzZShyZXN1bHQuYm9keSk7XHJcbiAgICAgIGV4cGVjdChyZXNwb25zZUJvZHkuZXJyb3IpLnRvQmUoJ0ZhaWxlZCB0byBjcmVhdGUgdXBsb2FkIFVSTCcpO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdNZXRob2Qgcm91dGluZycsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgcmV0dXJuIDQwNSBmb3IgdW5zdXBwb3J0ZWQgbWV0aG9kcycsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50ID0ge1xyXG4gICAgICAgIGJvZHk6IG51bGwsXHJcbiAgICAgICAgaGVhZGVyczoge30sXHJcbiAgICAgICAgbXVsdGlWYWx1ZUhlYWRlcnM6IHt9LFxyXG4gICAgICAgIGh0dHBNZXRob2Q6ICdHRVQnLCAvLyBVbnN1cHBvcnRlZCBtZXRob2RcclxuICAgICAgICBpc0Jhc2U2NEVuY29kZWQ6IGZhbHNlLFxyXG4gICAgICAgIHBhdGg6ICcvc3ltcHRvbXMnLFxyXG4gICAgICAgIHBhdGhQYXJhbWV0ZXJzOiBudWxsLFxyXG4gICAgICAgIHF1ZXJ5U3RyaW5nUGFyYW1ldGVyczogbnVsbCxcclxuICAgICAgICBtdWx0aVZhbHVlUXVlcnlTdHJpbmdQYXJhbWV0ZXJzOiBudWxsLFxyXG4gICAgICAgIHN0YWdlVmFyaWFibGVzOiBudWxsLFxyXG4gICAgICAgIHJlcXVlc3RDb250ZXh0OiB7fSBhcyBhbnksXHJcbiAgICAgICAgcmVzb3VyY2U6ICcnXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50LCBtb2NrQ29udGV4dCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNDA1KTtcclxuICAgICAgXHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlQm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xyXG4gICAgICBleHBlY3QocmVzcG9uc2VCb2R5LmVycm9yKS50b0JlKCdNZXRob2Qgbm90IGFsbG93ZWQnKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG59KTsiXX0=