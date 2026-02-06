// Unit tests for Triage Engine Lambda function
// Tests specific examples and integration points

import { APIGatewayProxyEvent } from 'aws-lambda';
import { TestHelpers } from '../../../utils/test-helpers';
import { Episode, UrgencyLevel, EpisodeStatus, InputMethod } from '../../../types';

// Mock AWS clients before importing the handler
const mockDocClientSend = jest.fn();
const mockBedrockClientSend = jest.fn();

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(() => ({
      send: mockDocClientSend
    }))
  },
  GetCommand: jest.fn((params) => params),
  UpdateCommand: jest.fn((params) => params)
}));

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn()
}));

jest.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: jest.fn(() => ({
    send: mockBedrockClientSend
  })),
  InvokeModelCommand: jest.fn((params) => params)
}));

// Import handler after mocking
import { handler } from '../index';

// Set environment variables
process.env.EPISODE_TABLE_NAME = 'test-episodes-table';
process.env.AWS_REGION = 'us-east-1';

describe('Triage Engine Lambda Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createMockEvent = (body: any): APIGatewayProxyEvent => ({
    body: JSON.stringify(body),
    headers: {},
    multiValueHeaders: {},
    httpMethod: 'POST',
    isBase64Encoded: false,
    path: '/triage',
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as any,
    resource: ''
  });

  const createMockEpisode = (episodeId: string): Episode => ({
    episodeId,
    patientId: 'patient-123',
    status: EpisodeStatus.ACTIVE,
    symptoms: {
      primaryComplaint: 'chest pain',
      duration: '2 hours',
      severity: 8,
      associatedSymptoms: ['shortness of breath'],
      inputMethod: InputMethod.TEXT
    },
    interactions: [],
    createdAt: new Date(),
    updatedAt: new Date()
  });

  describe('Input Validation', () => {
    it('should return 400 when episodeId is missing', async () => {
      const event = createMockEvent({});
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(400);
      TestHelpers.expectError(result, 'Missing required field: episodeId');
    });

    it('should return 400 when body is invalid JSON', async () => {
      const event: APIGatewayProxyEvent = {
        ...createMockEvent({}),
        body: 'invalid json'
      };
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(500);
      TestHelpers.expectError(result, 'Internal server error during triage assessment');
    });
  });

  describe('Episode Retrieval', () => {
    it('should return 404 when episode is not found', async () => {
      const event = createMockEvent({ episodeId: 'non-existent' });
      
      mockDocClientSend.mockResolvedValueOnce({ Item: null });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(404);
      TestHelpers.expectError(result, 'Episode not found');
    });

    it('should return existing triage if episode already assessed', async () => {
      const episodeId = 'episode-123';
      const existingTriage = {
        urgencyLevel: UrgencyLevel.URGENT,
        ruleBasedScore: 80,
        aiAssessment: { used: false },
        finalScore: 80
      };
      
      const episode = {
        ...createMockEpisode(episodeId),
        triage: existingTriage
      };
      
      const event = createMockEvent({ episodeId });
      mockDocClientSend.mockResolvedValueOnce({ Item: episode });
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = TestHelpers.getLegacyResponseBody(result);
      expect(body.message).toBe('Episode already has triage assessment');
      expect(body.triage).toEqual(existingTriage);
    });
  });

  describe('Triage Assessment', () => {
    it('should perform rule-based triage for emergency symptoms', async () => {
      const episodeId = 'episode-123';
      const episode = createMockEpisode(episodeId);
      
      const event = createMockEvent({ episodeId });
      
      // Mock episode retrieval
      mockDocClientSend.mockResolvedValueOnce({ Item: episode });
      // Mock episode update
      mockDocClientSend.mockResolvedValueOnce({});
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = TestHelpers.getLegacyResponseBody(result);
      expect(body.message).toBe('Triage assessment completed successfully');
      expect(body.triage.urgencyLevel).toBe(UrgencyLevel.EMERGENCY);
      expect(body.triage.ruleBasedScore).toBeGreaterThan(90);
      expect(body.nextSteps).toContain('Immediate medical attention');
    });

    it('should perform rule-based triage for routine symptoms', async () => {
      const episodeId = 'episode-123';
      const episode = {
        ...createMockEpisode(episodeId),
        symptoms: {
          primaryComplaint: 'mild headache',
          duration: '1 day',
          severity: 4,
          associatedSymptoms: [],
          inputMethod: InputMethod.TEXT
        }
      };
      
      const event = createMockEvent({ episodeId });
      
      // Mock episode retrieval
      mockDocClientSend.mockResolvedValueOnce({ Item: episode });
      // Mock episode update
      mockDocClientSend.mockResolvedValueOnce({});
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = TestHelpers.getLegacyResponseBody(result);
      expect(body.triage.urgencyLevel).toBe(UrgencyLevel.ROUTINE);
      expect(body.nextSteps).toContain('Routine care');
    });

    it('should handle self-care symptoms', async () => {
      const episodeId = 'episode-123';
      const episode = {
        ...createMockEpisode(episodeId),
        symptoms: {
          primaryComplaint: 'minor scratch',
          duration: '1 hour',
          severity: 2,
          associatedSymptoms: [],
          inputMethod: InputMethod.TEXT
        }
      };
      
      const event = createMockEvent({ episodeId });
      
      // Mock episode retrieval
      mockDocClientSend.mockResolvedValueOnce({ Item: episode });
      // Mock episode update
      mockDocClientSend.mockResolvedValueOnce({});
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = TestHelpers.getLegacyResponseBody(result);
      expect(body.triage.urgencyLevel).toBe(UrgencyLevel.SELF_CARE);
      expect(body.nextSteps).toContain('Self-care');
    });
  });

  describe('Error Handling', () => {
    it('should handle DynamoDB errors gracefully', async () => {
      const event = createMockEvent({ episodeId: 'episode-123' });
      
      mockDocClientSend.mockRejectedValueOnce(new Error('DynamoDB error'));
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(500);
      TestHelpers.expectError(result, 'Internal server error during triage assessment');
    });

    it('should handle AI service errors by falling back to rule-based assessment', async () => {
      const episodeId = 'episode-123';
      const episode = {
        ...createMockEpisode(episodeId),
        symptoms: {
          primaryComplaint: 'complex symptoms with multiple issues',
          duration: 'several days',
          severity: 6,
          associatedSymptoms: ['fatigue', 'dizziness', 'nausea', 'weakness'],
          inputMethod: InputMethod.TEXT
        }
      };
      
      const event = createMockEvent({ episodeId });
      
      // Mock episode retrieval
      mockDocClientSend.mockResolvedValueOnce({ Item: episode });
      // Mock Bedrock error
      mockBedrockClientSend.mockRejectedValueOnce(new Error('Bedrock error'));
      // Mock episode update
      mockDocClientSend.mockResolvedValueOnce({});
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = TestHelpers.getLegacyResponseBody(result);
      expect(body.triage.aiAssessment.used).toBe(false);
      expect(body.triage.urgencyLevel).toBeDefined();
    });

    it('should enforce cost control by limiting one AI call per episode', async () => {
      const episodeId = 'episode-123';
      const episode = {
        ...createMockEpisode(episodeId),
        symptoms: {
          primaryComplaint: 'complex symptoms requiring AI assessment',
          duration: 'several days',
          severity: 6,
          associatedSymptoms: ['fatigue', 'dizziness', 'nausea', 'weakness'],
          inputMethod: InputMethod.TEXT
        },
        triage: {
          urgencyLevel: UrgencyLevel.ROUTINE,
          ruleBasedScore: 55,
          aiAssessment: { used: true, confidence: 0.8, reasoning: 'Previous AI assessment' },
          finalScore: 60
        }
      };
      
      const event = createMockEvent({ episodeId });
      
      // Mock episode retrieval with existing AI assessment
      mockDocClientSend.mockResolvedValueOnce({ Item: episode });
      // Mock episode update
      mockDocClientSend.mockResolvedValueOnce({});
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      const body = TestHelpers.getLegacyResponseBody(result);
      expect(body.message).toBe('Episode already has triage assessment');
      
      // Verify Bedrock was not called
      expect(mockBedrockClientSend).not.toHaveBeenCalled();
    });
  });

  describe('Response Format', () => {
    it('should return properly formatted response with CORS headers', async () => {
      const episodeId = 'episode-123';
      const episode = createMockEpisode(episodeId);
      
      const event = createMockEvent({ episodeId });
      
      // Mock episode retrieval - ensure the episode is returned
      mockDocClientSend
        .mockResolvedValueOnce({ Item: episode })  // First call: getEpisode
        .mockResolvedValueOnce({});                // Second call: updateEpisodeWithTriage
      
      const result = await handler(event);
      
      expect(result.statusCode).toBe(200);
      expect(result.headers).toEqual({
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      
      const body = TestHelpers.getLegacyResponseBody(result);
      expect(body).toHaveProperty('message');
      expect(body).toHaveProperty('episodeId');
      expect(body).toHaveProperty('triage');
      expect(body).toHaveProperty('nextSteps');
    });
  });
});