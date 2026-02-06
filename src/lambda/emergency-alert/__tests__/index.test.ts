// Unit tests for Emergency Alert System Lambda Handler
// Tests specific examples and integration points

import { APIGatewayProxyEvent } from 'aws-lambda';
import { TestHelpers } from '../../../utils/test-helpers';
import { handler } from '../index';
import { Episode, UrgencyLevel, EpisodeStatus, InputMethod } from '../../../types';

// Mock AWS SDK clients
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');
jest.mock('@aws-sdk/client-sns');

// Mock services
jest.mock('../emergency-alert-service');
jest.mock('../escalation-protocol-service');
jest.mock('../emergency-notification-service');

// Set up environment variables
process.env.EPISODE_TABLE_NAME = 'test-episodes';
process.env.EMERGENCY_ALERT_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789012:test-emergency-alerts';
process.env.NOTIFICATION_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789012:test-notifications';

describe('Emergency Alert Lambda Handler', () => {
  const mockEpisode: Episode = {
    episodeId: 'episode-123',
    patientId: 'patient-456',
    status: EpisodeStatus.ACTIVE,
    symptoms: {
      primaryComplaint: 'severe chest pain',
      duration: '30 minutes',
      severity: 9,
      associatedSymptoms: ['shortness of breath', 'nausea'],
      inputMethod: InputMethod.TEXT
    },
    triage: {
      urgencyLevel: UrgencyLevel.EMERGENCY,
      ruleBasedScore: 95,
      finalScore: 95,
      aiAssessment: {
        used: true,
        confidence: 0.9,
        reasoning: 'High severity chest pain with associated symptoms suggests cardiac emergency'
      }
    },
    interactions: [],
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z')
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /alert - Emergency Alert Processing', () => {
    it('should process emergency alert successfully', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        path: '/alert',
        body: JSON.stringify({
          episodeId: 'episode-123',
          alertType: 'emergency_case',
          severity: 'high',
          additionalInfo: { source: 'triage_engine' }
        })
      };

      // Mock service responses
      const mockAlertService = require('../emergency-alert-service').EmergencyAlertService;
      const mockNotificationService = require('../emergency-notification-service').EmergencyNotificationService;

      mockAlertService.prototype.processEmergencyAlert = jest.fn().mockResolvedValue({
        alertId: 'alert-789',
        episode: mockEpisode,
        alertDetails: {
          alertId: 'alert-789',
          episodeId: 'episode-123',
          alertType: 'emergency_case',
          severity: 'high',
          assignedSupervisors: ['emergency-supervisor-1', 'emergency-supervisor-2']
        },
        notificationsSent: 2,
        estimatedResponseTime: 5,
        severity: 'high'
      });

      mockNotificationService.prototype.sendImmediateAlert = jest.fn().mockResolvedValue(undefined);

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = TestHelpers.getLegacyResponseBody(result);
      expect(body.message).toBe('Emergency alert processed successfully');
      expect(body.alertId).toBe('alert-789');
      expect(body.episodeId).toBe('episode-123');
      expect(body.notificationsSent).toBe(2);
    });

    it('should return 400 for missing required fields', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        path: '/alert',
        body: JSON.stringify({
          alertType: 'emergency_case'
          // Missing episodeId
        })
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = TestHelpers.getLegacyResponseBody(result);
      expect(body.error).toBe('Missing required fields: episodeId, alertType');
    });

    it('should handle service errors gracefully', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        path: '/alert',
        body: JSON.stringify({
          episodeId: 'episode-123',
          alertType: 'emergency_case',
          severity: 'high'
        })
      };

      const mockAlertService = require('../emergency-alert-service').EmergencyAlertService;
      mockAlertService.prototype.processEmergencyAlert = jest.fn().mockRejectedValue(
        new Error('Service unavailable')
      );

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(500);
      const body = TestHelpers.getLegacyResponseBody(result);
      expect(body.error).toBe('Failed to process emergency alert');
    });
  });

  describe('POST /escalate - Emergency Escalation', () => {
    it('should process emergency escalation successfully', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        path: '/escalate',
        body: JSON.stringify({
          episodeId: 'episode-123',
          escalationReason: 'Timeout exceeded',
          targetLevel: 'level-2',
          urgentResponse: true
        })
      };

      const mockEscalationService = require('../escalation-protocol-service').EscalationProtocolService;
      const mockNotificationService = require('../emergency-notification-service').EmergencyNotificationService;

      mockEscalationService.prototype.processEscalation = jest.fn().mockResolvedValue({
        escalationId: 'escalation-456',
        episode: mockEpisode,
        escalationDetails: {
          escalationId: 'escalation-456',
          escalationLevel: 'level-2',
          assignedSupervisors: ['senior-supervisor-1', 'senior-supervisor-2']
        },
        targetLevel: 'level-2',
        assignedSupervisors: ['senior-supervisor-1', 'senior-supervisor-2'],
        expectedResponseTime: 10
      });

      mockNotificationService.prototype.sendEscalationAlert = jest.fn().mockResolvedValue(undefined);

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = TestHelpers.getLegacyResponseBody(result);
      expect(body.message).toBe('Emergency escalation processed successfully');
      expect(body.escalationId).toBe('escalation-456');
      expect(body.targetLevel).toBe('level-2');
    });

    it('should return 400 for missing escalation reason', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        path: '/escalate',
        body: JSON.stringify({
          episodeId: 'episode-123'
          // Missing escalationReason
        })
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = TestHelpers.getLegacyResponseBody(result);
      expect(body.error).toBe('Missing required fields: episodeId, escalationReason');
    });
  });

  describe('POST / - Process Emergency Case', () => {
    it('should process emergency case with escalation assessment', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        body: JSON.stringify({
          episodeId: 'episode-123'
        })
      };

      // Mock DynamoDB response
      const mockDocClient = {
        send: jest.fn().mockResolvedValue({
          Item: mockEpisode
        })
      };

      const mockAlertService = require('../emergency-alert-service').EmergencyAlertService;
      const mockEscalationService = require('../escalation-protocol-service').EscalationProtocolService;
      const mockNotificationService = require('../emergency-notification-service').EmergencyNotificationService;

      mockAlertService.prototype.processEmergencyAlert = jest.fn().mockResolvedValue({
        alertId: 'alert-789',
        episode: mockEpisode,
        alertDetails: { alertId: 'alert-789' },
        notificationsSent: 2,
        estimatedResponseTime: 5
      });

      mockEscalationService.prototype.assessEscalationNeed = jest.fn().mockResolvedValue({
        required: true,
        reason: 'Critical symptoms detected',
        targetLevel: 'level-2',
        urgentResponse: true
      });

      mockEscalationService.prototype.processEscalation = jest.fn().mockResolvedValue({
        escalationId: 'escalation-456',
        escalationDetails: { escalationId: 'escalation-456' }
      });

      mockNotificationService.prototype.sendImmediateAlert = jest.fn().mockResolvedValue(undefined);
      mockNotificationService.prototype.sendEscalationAlert = jest.fn().mockResolvedValue(undefined);

      // Mock the getEpisode function
      jest.doMock('@aws-sdk/lib-dynamodb', () => ({
        DynamoDBDocumentClient: {
          from: jest.fn().mockReturnValue(mockDocClient)
        },
        GetCommand: jest.fn()
      }));

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = TestHelpers.getLegacyResponseBody(result);
      expect(body.message).toBe('Emergency case processed successfully');
      expect(body.escalated).toBe(true);
    });

    it('should return 400 for non-emergency episode', async () => {
      const nonEmergencyEpisode = {
        ...mockEpisode,
        triage: {
          ...mockEpisode.triage!,
          urgencyLevel: UrgencyLevel.ROUTINE
        }
      };

      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        body: JSON.stringify({
          episodeId: 'episode-123'
        })
      };

      // Mock DynamoDB response
      const mockDocClient = {
        send: jest.fn().mockResolvedValue({
          Item: nonEmergencyEpisode
        })
      };

      jest.doMock('@aws-sdk/lib-dynamodb', () => ({
        DynamoDBDocumentClient: {
          from: jest.fn().mockReturnValue(mockDocClient)
        },
        GetCommand: jest.fn()
      }));

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = TestHelpers.getLegacyResponseBody(result);
      expect(body.error).toBe('Episode is not classified as emergency');
    });

    it('should return 404 for non-existent episode', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        body: JSON.stringify({
          episodeId: 'non-existent-episode'
        })
      };

      // Mock DynamoDB response
      const mockDocClient = {
        send: jest.fn().mockResolvedValue({
          Item: null
        })
      };

      jest.doMock('@aws-sdk/lib-dynamodb', () => ({
        DynamoDBDocumentClient: {
          from: jest.fn().mockReturnValue(mockDocClient)
        },
        GetCommand: jest.fn()
      }));

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(404);
      const body = TestHelpers.getLegacyResponseBody(result);
      expect(body.error).toBe('Episode not found');
    });
  });

  describe('GET /:episodeId - Get Emergency Status', () => {
    it('should return emergency status for episode', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        pathParameters: {
          episodeId: 'episode-123'
        }
      };

      const mockAlertService = require('../emergency-alert-service').EmergencyAlertService;
      mockAlertService.prototype.getEmergencyStatus = jest.fn().mockResolvedValue({
        episodeId: 'episode-123',
        isEmergency: true,
        activeAlerts: [],
        responseStatus: 'pending',
        assignedSupervisors: ['emergency-supervisor-1'],
        estimatedResponseTime: 5
      });

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = TestHelpers.getLegacyResponseBody(result);
      expect(body.episodeId).toBe('episode-123');
      expect(body.isEmergency).toBe(true);
    });
  });

  describe('GET / - Get Emergency Queue', () => {
    it('should return emergency queue', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        queryStringParameters: {
          supervisorId: 'emergency-supervisor-1',
          limit: '10'
        }
      };

      const mockAlertService = require('../emergency-alert-service').EmergencyAlertService;
      mockAlertService.prototype.getEmergencyQueue = jest.fn().mockResolvedValue([
        {
          episodeId: 'episode-123',
          alertId: 'alert-789',
          severity: 'high',
          waitTime: 5
        }
      ]);

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = TestHelpers.getLegacyResponseBody(result);
      expect(body.queue).toHaveLength(1);
      expect(body.supervisorId).toBe('emergency-supervisor-1');
    });
  });

  describe('PUT / - Update Emergency Response', () => {
    it('should update emergency response successfully', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          episodeId: 'episode-123',
          supervisorId: 'emergency-supervisor-1',
          responseAction: 'acknowledge',
          notes: 'Responding to emergency'
        })
      };

      const mockAlertService = require('../emergency-alert-service').EmergencyAlertService;
      const mockNotificationService = require('../emergency-notification-service').EmergencyNotificationService;

      mockAlertService.prototype.updateEmergencyResponse = jest.fn().mockResolvedValue({
        episode: mockEpisode,
        responseDetails: {
          supervisorId: 'emergency-supervisor-1',
          responseAction: 'acknowledge',
          notes: 'Responding to emergency'
        },
        timestamp: new Date()
      });

      mockNotificationService.prototype.sendResponseConfirmation = jest.fn().mockResolvedValue(undefined);

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      const body = TestHelpers.getLegacyResponseBody(result);
      expect(body.message).toBe('Emergency response updated successfully');
      expect(body.responseAction).toBe('acknowledge');
    });

    it('should return 400 for missing required fields', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          episodeId: 'episode-123'
          // Missing supervisorId and responseAction
        })
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      const body = TestHelpers.getLegacyResponseBody(result);
      expect(body.error).toBe('Missing required fields: episodeId, supervisorId, responseAction');
    });
  });

  describe('Error Handling', () => {
    it('should return 405 for unsupported HTTP methods', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'DELETE'
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(405);
      const body = TestHelpers.getLegacyResponseBody(result);
      expect(body.error).toBe('Method not allowed');
    });

    it('should handle JSON parsing errors', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'POST',
        body: 'invalid json'
      };

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(500);
      const body = TestHelpers.getLegacyResponseBody(result);
      expect(body.error).toBe('Internal server error in emergency alert system');
    });

    it('should include CORS headers in all responses', async () => {
      const event: Partial<APIGatewayProxyEvent> = {
        httpMethod: 'GET',
        pathParameters: {
          episodeId: 'episode-123'
        }
      };

      const mockAlertService = require('../emergency-alert-service').EmergencyAlertService;
      mockAlertService.prototype.getEmergencyStatus = jest.fn().mockResolvedValue({});

      const result = await handler(event as APIGatewayProxyEvent);

      expect(result.headers).toHaveProperty('Access-Control-Allow-Origin', '*');
      expect(result.headers).toHaveProperty('Content-Type', 'application/json');
    });
  });
});