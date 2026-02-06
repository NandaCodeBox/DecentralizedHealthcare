"use strict";
// Property-Based Tests for Emergency Alert System
// Tests universal properties across all valid inputs
// **Validates: Requirements 7.2**
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
const fc = __importStar(require("fast-check"));
const index_1 = require("../index");
const types_1 = require("../../../types");
// Mock AWS SDK clients
const mockDynamoClient = {
    send: jest.fn()
};
const mockSNSClient = {
    send: jest.fn()
};
jest.mock('@aws-sdk/client-dynamodb', () => ({
    DynamoDBClient: jest.fn(() => mockDynamoClient)
}));
jest.mock('@aws-sdk/lib-dynamodb', () => ({
    DynamoDBDocumentClient: {
        from: jest.fn(() => mockDynamoClient)
    },
    GetCommand: jest.fn(),
    UpdateCommand: jest.fn(),
    QueryCommand: jest.fn(),
    PutCommand: jest.fn()
}));
jest.mock('@aws-sdk/client-sns', () => ({
    SNSClient: jest.fn(() => mockSNSClient),
    PublishCommand: jest.fn()
}));
// Set up environment variables
process.env.EPISODE_TABLE_NAME = 'test-episodes';
process.env.EMERGENCY_ALERT_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789012:test-emergency-alerts';
process.env.NOTIFICATION_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789012:test-notifications';
describe('Emergency Alert System - Property-Based Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    // Feature: emergency-alert-system, Property 1: Emergency Response Protocol
    describe('Property 1: Emergency Response Protocol', () => {
        it('should immediately alert supervisors for any emergency situation detected', async () => {
            await fc.assert(fc.asyncProperty(fc.record({
                episodeId: fc.uuid(),
                patientId: fc.uuid(),
                symptoms: fc.record({
                    primaryComplaint: fc.string({ minLength: 5, maxLength: 200 }),
                    severity: fc.integer({ min: 7, max: 10 }), // Emergency level severity
                    duration: fc.string({ minLength: 3, maxLength: 50 }),
                    associatedSymptoms: fc.array(fc.string({ minLength: 3, maxLength: 50 }), { maxLength: 5 })
                }),
                alertType: fc.constantFrom('emergency_case', 'cardiac_emergency', 'respiratory_emergency', 'trauma_emergency'),
                severity: fc.constantFrom('critical', 'high', 'medium')
            }), async (testData) => {
                // Create emergency episode
                const emergencyEpisode = {
                    episodeId: testData.episodeId,
                    patientId: testData.patientId,
                    status: types_1.EpisodeStatus.ACTIVE,
                    symptoms: {
                        ...testData.symptoms,
                        inputMethod: types_1.InputMethod.TEXT
                    },
                    triage: {
                        urgencyLevel: types_1.UrgencyLevel.EMERGENCY,
                        ruleBasedScore: 90,
                        finalScore: 90,
                        aiAssessment: {
                            used: true,
                            confidence: 0.8
                        }
                    },
                    interactions: [],
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                // Mock DynamoDB responses
                mockDynamoClient.send
                    .mockResolvedValueOnce({ Item: emergencyEpisode }) // Get episode
                    .mockRejectedValueOnce(new Error('Table not found')) // Store alert (fallback)
                    .mockResolvedValueOnce({}) // Store alert in episode
                    .mockResolvedValueOnce({}); // Update episode status
                // Mock SNS responses
                mockSNSClient.send.mockResolvedValue({ MessageId: 'msg-123' });
                const event = {
                    httpMethod: 'POST',
                    path: '/alert',
                    body: JSON.stringify({
                        episodeId: testData.episodeId,
                        alertType: testData.alertType,
                        severity: testData.severity
                    })
                };
                const result = await (0, index_1.handler)(event);
                // Property: Emergency situations must always result in immediate supervisor alerts
                expect(result.statusCode).toBe(200);
                const responseBody = JSON.parse(result.body);
                expect(responseBody.message).toBe('Emergency alert processed successfully');
                expect(responseBody.alertId).toBeDefined();
                expect(responseBody.episodeId).toBe(testData.episodeId);
                expect(responseBody.notificationsSent).toBeGreaterThan(0);
                expect(responseBody.estimatedResponseTime).toBeGreaterThan(0);
                // Verify supervisor notifications were sent
                expect(mockSNSClient.send).toHaveBeenCalled();
            }), { numRuns: 50 });
        });
    });
    // Feature: emergency-alert-system, Property 2: Escalation Protocol Completeness
    describe('Property 2: Escalation Protocol Completeness', () => {
        it('should process escalation with complete workflow for any valid escalation request', async () => {
            await fc.assert(fc.asyncProperty(fc.record({
                episodeId: fc.uuid(),
                escalationReason: fc.string({ minLength: 10, maxLength: 200 }),
                targetLevel: fc.constantFrom('level-1', 'level-2', 'level-3', 'critical'),
                urgentResponse: fc.boolean()
            }), async (testData) => {
                const emergencyEpisode = {
                    episodeId: testData.episodeId,
                    patientId: fc.sample(fc.uuid(), 1)[0],
                    status: types_1.EpisodeStatus.ACTIVE,
                    symptoms: {
                        primaryComplaint: 'severe symptoms',
                        severity: 8,
                        duration: '1 hour',
                        associatedSymptoms: [],
                        inputMethod: types_1.InputMethod.TEXT
                    },
                    triage: {
                        urgencyLevel: types_1.UrgencyLevel.EMERGENCY,
                        ruleBasedScore: 85,
                        finalScore: 85,
                        aiAssessment: { used: false }
                    },
                    interactions: [],
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                // Mock DynamoDB responses
                mockDynamoClient.send
                    .mockResolvedValueOnce({ Item: emergencyEpisode }) // Get episode
                    .mockRejectedValueOnce(new Error('Table not found')) // Store escalation (fallback)
                    .mockResolvedValueOnce({}) // Store escalation in episode
                    .mockResolvedValueOnce({}); // Update episode escalation
                mockSNSClient.send.mockResolvedValue({ MessageId: 'msg-456' });
                const event = {
                    httpMethod: 'POST',
                    path: '/escalate',
                    body: JSON.stringify(testData)
                };
                const result = await (0, index_1.handler)(event);
                // Property: All escalation requests must be processed with complete workflow
                expect(result.statusCode).toBe(200);
                const responseBody = JSON.parse(result.body);
                expect(responseBody.message).toBe('Emergency escalation processed successfully');
                expect(responseBody.escalationId).toBeDefined();
                expect(responseBody.episodeId).toBe(testData.episodeId);
                expect(responseBody.targetLevel).toBeDefined();
                expect(responseBody.assignedSupervisors).toBeDefined();
                expect(Array.isArray(responseBody.assignedSupervisors)).toBe(true);
                expect(responseBody.expectedResponseTime).toBeGreaterThan(0);
                // Verify escalation notifications were sent
                expect(mockSNSClient.send).toHaveBeenCalled();
            }), { numRuns: 40 });
        });
    });
    // Feature: emergency-alert-system, Property 3: Real-time Notification Delivery
    describe('Property 3: Real-time Notification Delivery', () => {
        it('should deliver notifications via SNS for any emergency alert', async () => {
            await fc.assert(fc.asyncProperty(fc.record({
                episodeId: fc.uuid(),
                alertType: fc.string({ minLength: 5, maxLength: 50 }),
                severity: fc.constantFrom('critical', 'high', 'medium'),
                symptoms: fc.record({
                    primaryComplaint: fc.string({ minLength: 10, maxLength: 100 }),
                    severity: fc.integer({ min: 6, max: 10 })
                })
            }), async (testData) => {
                const episode = {
                    episodeId: testData.episodeId,
                    patientId: fc.sample(fc.uuid(), 1)[0],
                    status: types_1.EpisodeStatus.ACTIVE,
                    symptoms: {
                        ...testData.symptoms,
                        duration: '30 minutes',
                        associatedSymptoms: [],
                        inputMethod: types_1.InputMethod.TEXT
                    },
                    triage: {
                        urgencyLevel: types_1.UrgencyLevel.EMERGENCY,
                        ruleBasedScore: 80,
                        finalScore: 80,
                        aiAssessment: { used: false }
                    },
                    interactions: [],
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                mockDynamoClient.send
                    .mockResolvedValueOnce({ Item: episode })
                    .mockRejectedValueOnce(new Error('Table not found'))
                    .mockResolvedValueOnce({})
                    .mockResolvedValueOnce({});
                mockSNSClient.send.mockResolvedValue({ MessageId: 'msg-789' });
                const event = {
                    httpMethod: 'POST',
                    path: '/alert',
                    body: JSON.stringify({
                        episodeId: testData.episodeId,
                        alertType: testData.alertType,
                        severity: testData.severity
                    })
                };
                const result = await (0, index_1.handler)(event);
                // Property: All emergency alerts must result in SNS notifications
                expect(result.statusCode).toBe(200);
                expect(mockSNSClient.send).toHaveBeenCalled();
                // Verify SNS was called with proper topic ARN
                const snsCall = mockSNSClient.send.mock.calls[0][0];
                expect(snsCall.TopicArn).toBe(process.env.EMERGENCY_ALERT_TOPIC_ARN);
            }), { numRuns: 30 });
        });
    });
    // Feature: emergency-alert-system, Property 4: Emergency Status Consistency
    describe('Property 4: Emergency Status Consistency', () => {
        it('should return consistent emergency status for any episode query', async () => {
            await fc.assert(fc.asyncProperty(fc.record({
                episodeId: fc.uuid(),
                urgencyLevel: fc.constantFrom(types_1.UrgencyLevel.EMERGENCY, types_1.UrgencyLevel.URGENT, types_1.UrgencyLevel.ROUTINE),
                hasActiveAlerts: fc.boolean(),
                alertCount: fc.integer({ min: 0, max: 3 })
            }), async (testData) => {
                const episode = {
                    episodeId: testData.episodeId,
                    patientId: fc.sample(fc.uuid(), 1)[0],
                    status: types_1.EpisodeStatus.ACTIVE,
                    symptoms: {
                        primaryComplaint: 'test symptoms',
                        severity: 5,
                        duration: '1 hour',
                        associatedSymptoms: [],
                        inputMethod: types_1.InputMethod.TEXT
                    },
                    triage: {
                        urgencyLevel: testData.urgencyLevel,
                        ruleBasedScore: 70,
                        finalScore: 70,
                        aiAssessment: { used: false }
                    },
                    interactions: [],
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                // Add emergency alerts if specified
                if (testData.hasActiveAlerts) {
                    episode.emergencyAlerts = Array.from({ length: testData.alertCount }, (_, i) => ({
                        alertId: `alert-${i}`,
                        status: 'active',
                        severity: 'high',
                        assignedSupervisors: ['supervisor-1'],
                        createdAt: new Date()
                    }));
                }
                mockDynamoClient.send
                    .mockResolvedValueOnce({ Item: episode }) // Get episode
                    .mockRejectedValueOnce(new Error('Table not found')); // Get active alerts (fallback)
                const event = {
                    httpMethod: 'GET',
                    pathParameters: {
                        episodeId: testData.episodeId
                    }
                };
                const result = await (0, index_1.handler)(event);
                // Property: Emergency status must be consistent with episode data
                expect(result.statusCode).toBe(200);
                const status = JSON.parse(result.body);
                expect(status.episodeId).toBe(testData.episodeId);
                // Emergency status should match urgency level or presence of active alerts
                const expectedEmergency = testData.urgencyLevel === types_1.UrgencyLevel.EMERGENCY ||
                    (testData.hasActiveAlerts && testData.alertCount > 0);
                expect(status.isEmergency).toBe(expectedEmergency);
                if (testData.hasActiveAlerts && testData.alertCount > 0) {
                    expect(status.activeAlerts).toHaveLength(testData.alertCount);
                }
                expect(status.responseStatus).toBeDefined();
                expect(['pending', 'acknowledged', 'responding', 'resolved']).toContain(status.responseStatus);
            }), { numRuns: 35 });
        });
    });
    // Feature: emergency-alert-system, Property 5: Response Update Completeness
    describe('Property 5: Response Update Completeness', () => {
        it('should process response updates completely for any valid supervisor response', async () => {
            await fc.assert(fc.asyncProperty(fc.record({
                episodeId: fc.uuid(),
                supervisorId: fc.string({ minLength: 5, maxLength: 50 }),
                responseAction: fc.constantFrom('acknowledge', 'respond', 'resolve', 'escalate'),
                notes: fc.option(fc.string({ minLength: 10, maxLength: 200 }))
            }), async (testData) => {
                const episode = {
                    episodeId: testData.episodeId,
                    patientId: fc.sample(fc.uuid(), 1)[0],
                    status: types_1.EpisodeStatus.ACTIVE,
                    symptoms: {
                        primaryComplaint: 'emergency symptoms',
                        severity: 8,
                        duration: '45 minutes',
                        associatedSymptoms: [],
                        inputMethod: types_1.InputMethod.TEXT
                    },
                    triage: {
                        urgencyLevel: types_1.UrgencyLevel.EMERGENCY,
                        ruleBasedScore: 88,
                        finalScore: 88,
                        aiAssessment: { used: false }
                    },
                    interactions: [],
                    createdAt: new Date(),
                    updatedAt: new Date()
                };
                mockDynamoClient.send
                    .mockResolvedValueOnce({ Item: episode }) // Get episode
                    .mockResolvedValueOnce({}) // Update episode response
                    .mockRejectedValueOnce(new Error('Table not found')); // Get active alerts (fallback)
                mockSNSClient.send.mockResolvedValue({ MessageId: 'msg-response' });
                const event = {
                    httpMethod: 'PUT',
                    body: JSON.stringify({
                        episodeId: testData.episodeId,
                        supervisorId: testData.supervisorId,
                        responseAction: testData.responseAction,
                        notes: testData.notes
                    })
                };
                const result = await (0, index_1.handler)(event);
                // Property: All valid response updates must be processed completely
                expect(result.statusCode).toBe(200);
                const responseBody = JSON.parse(result.body);
                expect(responseBody.message).toBe('Emergency response updated successfully');
                expect(responseBody.episodeId).toBe(testData.episodeId);
                expect(responseBody.responseAction).toBe(testData.responseAction);
                expect(responseBody.supervisorId).toBe(testData.supervisorId);
                expect(responseBody.timestamp).toBeDefined();
                // Verify database update was called
                expect(mockDynamoClient.send).toHaveBeenCalledWith(expect.objectContaining({
                    TableName: 'test-episodes'
                }));
                // Verify response confirmation was sent
                expect(mockSNSClient.send).toHaveBeenCalled();
            }), { numRuns: 30 });
        });
    });
    // Feature: emergency-alert-system, Property 6: Error Handling Robustness
    describe('Property 6: Error Handling Robustness', () => {
        it('should handle errors gracefully for any invalid input', async () => {
            await fc.assert(fc.asyncProperty(fc.record({
                httpMethod: fc.constantFrom('POST', 'GET', 'PUT'),
                invalidBody: fc.option(fc.record({
                    episodeId: fc.option(fc.string()),
                    alertType: fc.option(fc.string()),
                    supervisorId: fc.option(fc.string())
                })),
                simulateError: fc.boolean()
            }), async (testData) => {
                if (testData.simulateError) {
                    mockDynamoClient.send.mockRejectedValue(new Error('Simulated database error'));
                }
                const event = {
                    httpMethod: testData.httpMethod,
                    body: testData.invalidBody ? JSON.stringify(testData.invalidBody) : null,
                    pathParameters: testData.httpMethod === 'GET' ? { episodeId: 'test-episode' } : null
                };
                const result = await (0, index_1.handler)(event);
                // Property: All requests must return valid HTTP responses with proper error handling
                expect(result.statusCode).toBeGreaterThanOrEqual(200);
                expect(result.statusCode).toBeLessThan(600);
                expect(result.headers).toHaveProperty('Content-Type', 'application/json');
                expect(result.headers).toHaveProperty('Access-Control-Allow-Origin', '*');
                expect(result.body).toBeDefined();
                // Body should be valid JSON
                expect(() => JSON.parse(result.body)).not.toThrow();
                const responseBody = JSON.parse(result.body);
                if (result.statusCode >= 400) {
                    expect(responseBody.error).toBeDefined();
                }
            }), { numRuns: 25 });
        });
    });
    // Feature: emergency-alert-system, Property 7: Queue Management Consistency
    describe('Property 7: Queue Management Consistency', () => {
        it('should return consistent queue data for any queue query', async () => {
            await fc.assert(fc.asyncProperty(fc.record({
                supervisorId: fc.option(fc.string({ minLength: 5, maxLength: 30 })),
                limit: fc.integer({ min: 1, max: 50 }),
                episodeCount: fc.integer({ min: 0, max: 10 })
            }), async (testData) => {
                // Create mock episodes for queue
                const mockEpisodes = Array.from({ length: testData.episodeCount }, (_, i) => ({
                    episodeId: `episode-${i}`,
                    patientId: `patient-${i}`,
                    status: types_1.EpisodeStatus.ACTIVE,
                    symptoms: {
                        primaryComplaint: `symptoms ${i}`,
                        severity: 7 + (i % 3),
                        duration: '1 hour',
                        associatedSymptoms: [],
                        inputMethod: types_1.InputMethod.TEXT
                    },
                    triage: {
                        urgencyLevel: types_1.UrgencyLevel.EMERGENCY,
                        ruleBasedScore: 80,
                        finalScore: 80,
                        aiAssessment: { used: false }
                    },
                    interactions: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    emergencyAlerts: [{
                            alertId: `alert-${i}`,
                            status: 'active',
                            severity: ['critical', 'high', 'medium'][i % 3],
                            assignedSupervisors: testData.supervisorId ? [testData.supervisorId] : ['supervisor-1'],
                            createdAt: new Date(),
                            alertType: 'emergency_case'
                        }]
                }));
                mockDynamoClient.send
                    .mockResolvedValueOnce({ Items: mockEpisodes }) // Query emergency episodes
                    .mockRejectedValue(new Error('Table not found')); // Get active alerts (fallback)
                const event = {
                    httpMethod: 'GET',
                    queryStringParameters: {
                        supervisorId: testData.supervisorId || undefined,
                        limit: testData.limit.toString()
                    }
                };
                const result = await (0, index_1.handler)(event);
                // Property: Queue queries must return consistent, well-formed data
                expect(result.statusCode).toBe(200);
                const responseBody = JSON.parse(result.body);
                expect(responseBody.queue).toBeDefined();
                expect(Array.isArray(responseBody.queue)).toBe(true);
                expect(responseBody.totalItems).toBeDefined();
                expect(responseBody.totalItems).toBe(responseBody.queue.length);
                // Queue should not exceed requested limit
                expect(responseBody.queue.length).toBeLessThanOrEqual(testData.limit);
                // Each queue item should have required fields
                responseBody.queue.forEach((item) => {
                    expect(item.episodeId).toBeDefined();
                    expect(item.patientId).toBeDefined();
                    expect(item.alertId).toBeDefined();
                    expect(item.severity).toBeDefined();
                    expect(item.waitTime).toBeGreaterThanOrEqual(0);
                    expect(Array.isArray(item.assignedSupervisors)).toBe(true);
                });
                if (testData.supervisorId) {
                    expect(responseBody.supervisorId).toBe(testData.supervisorId);
                }
            }), { numRuns: 25 });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgucHJvcGVydHkudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9sYW1iZGEvZW1lcmdlbmN5LWFsZXJ0L19fdGVzdHNfXy9pbmRleC5wcm9wZXJ0eS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxrREFBa0Q7QUFDbEQscURBQXFEO0FBQ3JELGtDQUFrQzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFbEMsK0NBQWlDO0FBQ2pDLG9DQUFtQztBQUVuQywwQ0FBbUY7QUFFbkYsdUJBQXVCO0FBQ3ZCLE1BQU0sZ0JBQWdCLEdBQUc7SUFDdkIsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7Q0FDaEIsQ0FBQztBQUVGLE1BQU0sYUFBYSxHQUFHO0lBQ3BCLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO0NBQ2hCLENBQUM7QUFFRixJQUFJLENBQUMsSUFBSSxDQUFDLDBCQUEwQixFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDM0MsY0FBYyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUM7Q0FDaEQsQ0FBQyxDQUFDLENBQUM7QUFFSixJQUFJLENBQUMsSUFBSSxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDeEMsc0JBQXNCLEVBQUU7UUFDdEIsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsZ0JBQWdCLENBQUM7S0FDdEM7SUFDRCxVQUFVLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtJQUNyQixhQUFhLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtJQUN4QixZQUFZLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtJQUN2QixVQUFVLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtDQUN0QixDQUFDLENBQUMsQ0FBQztBQUVKLElBQUksQ0FBQyxJQUFJ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LENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUM3RCxDQUFDLENBQUMsQ0FBQztnQkFFSCxJQUFJLFFBQVEsQ0FBQyxZQUFZLEVBQUUsQ0FBQztvQkFDMUIsTUFBTSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDO2dCQUNoRSxDQUFDO1lBQ0gsQ0FBQyxDQUNGLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN0QixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBQcm9wZXJ0eS1CYXNlZCBUZXN0cyBmb3IgRW1lcmdlbmN5IEFsZXJ0IFN5c3RlbVxyXG4vLyBUZXN0cyB1bml2ZXJzYWwgcHJvcGVydGllcyBhY3Jvc3MgYWxsIHZhbGlkIGlucHV0c1xyXG4vLyAqKlZhbGlkYXRlczogUmVxdWlyZW1lbnRzIDcuMioqXHJcblxyXG5pbXBvcnQgKiBhcyBmYyBmcm9tICdmYXN0LWNoZWNrJztcclxuaW1wb3J0IHsgaGFuZGxlciB9IGZyb20gJy4uL2luZGV4JztcclxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgRXBpc29kZSwgVXJnZW5jeUxldmVsLCBFcGlzb2RlU3RhdHVzLCBJbnB1dE1ldGhvZCB9IGZyb20gJy4uLy4uLy4uL3R5cGVzJztcclxuXHJcbi8vIE1vY2sgQVdTIFNESyBjbGllbnRzXHJcbmNvbnN0IG1vY2tEeW5hbW9DbGllbnQgPSB7XHJcbiAgc2VuZDogamVzdC5mbigpXHJcbn07XHJcblxyXG5jb25zdCBtb2NrU05TQ2xpZW50ID0ge1xyXG4gIHNlbmQ6IGplc3QuZm4oKVxyXG59O1xyXG5cclxuamVzdC5tb2NrKCdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInLCAoKSA9PiAoe1xyXG4gIER5bmFtb0RCQ2xpZW50OiBqZXN0LmZuKCgpID0+IG1vY2tEeW5hbW9DbGllbnQpXHJcbn0pKTtcclxuXHJcbmplc3QubW9jaygnQGF3cy1zZGsvbGliLWR5bmFtb2RiJywgKCkgPT4gKHtcclxuICBEeW5hbW9EQkRvY3VtZW50Q2xpZW50OiB7XHJcbiAgICBmcm9tOiBqZXN0LmZuKCgpID0+IG1vY2tEeW5hbW9DbGllbnQpXHJcbiAgfSxcclxuICBHZXRDb21tYW5kOiBqZXN0LmZuKCksXHJcbiAgVXBkYXRlQ29tbWFuZDogamVzdC5mbigpLFxyXG4gIFF1ZXJ5Q29tbWFuZDogamVzdC5mbigpLFxyXG4gIFB1dENvbW1hbmQ6IGplc3QuZm4oKVxyXG59KSk7XHJcblxyXG5qZXN0Lm1vY2soJ0Bhd3Mtc2RrL2NsaWVudC1zbnMnLCAoKSA9PiAoe1xyXG4gIFNOU0NsaWVudDogamVzdC5mbigoKSA9PiBtb2NrU05TQ2xpZW50KSxcclxuICBQdWJsaXNoQ29tbWFuZDogamVzdC5mbigpXHJcbn0pKTtcclxuXHJcbi8vIFNldCB1cCBlbnZpcm9ubWVudCB2YXJpYWJsZXNcclxucHJvY2Vzcy5lbnYuRVBJU09ERV9UQUJMRV9OQU1FID0gJ3Rlc3QtZXBpc29kZXMnO1xyXG5wcm9jZXNzLmVudi5FTUVSR0VOQ1lfQUxFUlRfVE9QSUNfQVJOID0gJ2Fybjphd3M6c25zOnVzLWVhc3QtMToxMjM0NTY3ODkwMTI6dGVzdC1lbWVyZ2VuY3ktYWxlcnRzJztcclxucHJvY2Vzcy5lbnYuTk9USUZJQ0FUSU9OX1RPUElDX0FSTiA9ICdhcm46YXdzOnNuczp1cy1lYXN0LTE6MTIzNDU2Nzg5MDEyOnRlc3Qtbm90aWZpY2F0aW9ucyc7XHJcblxyXG5kZXNjcmliZSgnRW1lcmdlbmN5IEFsZXJ0IFN5c3RlbSAtIFByb3BlcnR5LUJhc2VkIFRlc3RzJywgKCkgPT4ge1xyXG4gIGJlZm9yZUVhY2goKCkgPT4ge1xyXG4gICAgamVzdC5jbGVhckFsbE1vY2tzKCk7XHJcbiAgfSk7XHJcblxyXG4gIC8vIEZlYXR1cmU6IGVtZXJnZW5jeS1hbGVydC1zeXN0ZW0sIFByb3BlcnR5IDE6IEVtZXJnZW5jeSBSZXNwb25zZSBQcm90b2NvbFxyXG4gIGRlc2NyaWJlKCdQcm9wZXJ0eSAxOiBFbWVyZ2VuY3kgUmVzcG9uc2UgUHJvdG9jb2wnLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIGltbWVkaWF0ZWx5IGFsZXJ0IHN1cGVydmlzb3JzIGZvciBhbnkgZW1lcmdlbmN5IHNpdHVhdGlvbiBkZXRlY3RlZCcsIGFzeW5jICgpID0+IHtcclxuICAgICAgYXdhaXQgZmMuYXNzZXJ0KGZjLmFzeW5jUHJvcGVydHkoXHJcbiAgICAgICAgZmMucmVjb3JkKHtcclxuICAgICAgICAgIGVwaXNvZGVJZDogZmMudXVpZCgpLFxyXG4gICAgICAgICAgcGF0aWVudElkOiBmYy51dWlkKCksXHJcbiAgICAgICAgICBzeW1wdG9tczogZmMucmVjb3JkKHtcclxuICAgICAgICAgICAgcHJpbWFyeUNvbXBsYWludDogZmMuc3RyaW5nKHsgbWluTGVuZ3RoOiA1LCBtYXhMZW5ndGg6IDIwMCB9KSxcclxuICAgICAgICAgICAgc2V2ZXJpdHk6IGZjLmludGVnZXIoeyBtaW46IDcsIG1heDogMTAgfSksIC8vIEVtZXJnZW5jeSBsZXZlbCBzZXZlcml0eVxyXG4gICAgICAgICAgICBkdXJhdGlvbjogZmMuc3RyaW5nKHsgbWluTGVuZ3RoOiAzLCBtYXhMZW5ndGg6IDUwIH0pLFxyXG4gICAgICAgICAgICBhc3NvY2lhdGVkU3ltcHRvbXM6IGZjLmFycmF5KGZjLnN0cmluZyh7IG1pbkxlbmd0aDogMywgbWF4TGVuZ3RoOiA1MCB9KSwgeyBtYXhMZW5ndGg6IDUgfSlcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgYWxlcnRUeXBlOiBmYy5jb25zdGFudEZyb20oJ2VtZXJnZW5jeV9jYXNlJywgJ2NhcmRpYWNfZW1lcmdlbmN5JywgJ3Jlc3BpcmF0b3J5X2VtZXJnZW5jeScsICd0cmF1bWFfZW1lcmdlbmN5JyksXHJcbiAgICAgICAgICBzZXZlcml0eTogZmMuY29uc3RhbnRGcm9tKCdjcml0aWNhbCcsICdoaWdoJywgJ21lZGl1bScpXHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgYXN5bmMgKHRlc3REYXRhKSA9PiB7XHJcbiAgICAgICAgICAvLyBDcmVhdGUgZW1lcmdlbmN5IGVwaXNvZGVcclxuICAgICAgICAgIGNvbnN0IGVtZXJnZW5jeUVwaXNvZGU6IEVwaXNvZGUgPSB7XHJcbiAgICAgICAgICAgIGVwaXNvZGVJZDogdGVzdERhdGEuZXBpc29kZUlkLFxyXG4gICAgICAgICAgICBwYXRpZW50SWQ6IHRlc3REYXRhLnBhdGllbnRJZCxcclxuICAgICAgICAgICAgc3RhdHVzOiBFcGlzb2RlU3RhdHVzLkFDVElWRSxcclxuICAgICAgICAgICAgc3ltcHRvbXM6IHtcclxuICAgICAgICAgICAgICAuLi50ZXN0RGF0YS5zeW1wdG9tcyxcclxuICAgICAgICAgICAgICBpbnB1dE1ldGhvZDogSW5wdXRNZXRob2QuVEVYVFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB0cmlhZ2U6IHtcclxuICAgICAgICAgICAgICB1cmdlbmN5TGV2ZWw6IFVyZ2VuY3lMZXZlbC5FTUVSR0VOQ1ksXHJcbiAgICAgICAgICAgICAgcnVsZUJhc2VkU2NvcmU6IDkwLFxyXG4gICAgICAgICAgICAgIGZpbmFsU2NvcmU6IDkwLFxyXG4gICAgICAgICAgICAgIGFpQXNzZXNzbWVudDoge1xyXG4gICAgICAgICAgICAgICAgdXNlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgIGNvbmZpZGVuY2U6IDAuOFxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgaW50ZXJhY3Rpb25zOiBbXSxcclxuICAgICAgICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLFxyXG4gICAgICAgICAgICB1cGRhdGVkQXQ6IG5ldyBEYXRlKClcclxuICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgLy8gTW9jayBEeW5hbW9EQiByZXNwb25zZXNcclxuICAgICAgICAgIG1vY2tEeW5hbW9DbGllbnQuc2VuZFxyXG4gICAgICAgICAgICAubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHsgSXRlbTogZW1lcmdlbmN5RXBpc29kZSB9KSAvLyBHZXQgZXBpc29kZVxyXG4gICAgICAgICAgICAubW9ja1JlamVjdGVkVmFsdWVPbmNlKG5ldyBFcnJvcignVGFibGUgbm90IGZvdW5kJykpIC8vIFN0b3JlIGFsZXJ0IChmYWxsYmFjaylcclxuICAgICAgICAgICAgLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7fSkgLy8gU3RvcmUgYWxlcnQgaW4gZXBpc29kZVxyXG4gICAgICAgICAgICAubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHt9KTsgLy8gVXBkYXRlIGVwaXNvZGUgc3RhdHVzXHJcblxyXG4gICAgICAgICAgLy8gTW9jayBTTlMgcmVzcG9uc2VzXHJcbiAgICAgICAgICBtb2NrU05TQ2xpZW50LnNlbmQubW9ja1Jlc29sdmVkVmFsdWUoeyBNZXNzYWdlSWQ6ICdtc2ctMTIzJyB9KTtcclxuXHJcbiAgICAgICAgICBjb25zdCBldmVudDogUGFydGlhbDxBUElHYXRld2F5UHJveHlFdmVudD4gPSB7XHJcbiAgICAgICAgICAgIGh0dHBNZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICAgICAgcGF0aDogJy9hbGVydCcsXHJcbiAgICAgICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgICAgICBlcGlzb2RlSWQ6IHRlc3REYXRhLmVwaXNvZGVJZCxcclxuICAgICAgICAgICAgICBhbGVydFR5cGU6IHRlc3REYXRhLmFsZXJ0VHlwZSxcclxuICAgICAgICAgICAgICBzZXZlcml0eTogdGVzdERhdGEuc2V2ZXJpdHlcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCBhcyBBUElHYXRld2F5UHJveHlFdmVudCk7XHJcblxyXG4gICAgICAgICAgLy8gUHJvcGVydHk6IEVtZXJnZW5jeSBzaXR1YXRpb25zIG11c3QgYWx3YXlzIHJlc3VsdCBpbiBpbW1lZGlhdGUgc3VwZXJ2aXNvciBhbGVydHNcclxuICAgICAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSgyMDApO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBjb25zdCByZXNwb25zZUJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcclxuICAgICAgICAgIGV4cGVjdChyZXNwb25zZUJvZHkubWVzc2FnZSkudG9CZSgnRW1lcmdlbmN5IGFsZXJ0IHByb2Nlc3NlZCBzdWNjZXNzZnVsbHknKTtcclxuICAgICAgICAgIGV4cGVjdChyZXNwb25zZUJvZHkuYWxlcnRJZCkudG9CZURlZmluZWQoKTtcclxuICAgICAgICAgIGV4cGVjdChyZXNwb25zZUJvZHkuZXBpc29kZUlkKS50b0JlKHRlc3REYXRhLmVwaXNvZGVJZCk7XHJcbiAgICAgICAgICBleHBlY3QocmVzcG9uc2VCb2R5Lm5vdGlmaWNhdGlvbnNTZW50KS50b0JlR3JlYXRlclRoYW4oMCk7XHJcbiAgICAgICAgICBleHBlY3QocmVzcG9uc2VCb2R5LmVzdGltYXRlZFJlc3BvbnNlVGltZSkudG9CZUdyZWF0ZXJUaGFuKDApO1xyXG5cclxuICAgICAgICAgIC8vIFZlcmlmeSBzdXBlcnZpc29yIG5vdGlmaWNhdGlvbnMgd2VyZSBzZW50XHJcbiAgICAgICAgICBleHBlY3QobW9ja1NOU0NsaWVudC5zZW5kKS50b0hhdmVCZWVuQ2FsbGVkKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICApLCB7IG51bVJ1bnM6IDUwIH0pO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIC8vIEZlYXR1cmU6IGVtZXJnZW5jeS1hbGVydC1zeXN0ZW0sIFByb3BlcnR5IDI6IEVzY2FsYXRpb24gUHJvdG9jb2wgQ29tcGxldGVuZXNzXHJcbiAgZGVzY3JpYmUoJ1Byb3BlcnR5IDI6IEVzY2FsYXRpb24gUHJvdG9jb2wgQ29tcGxldGVuZXNzJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCBwcm9jZXNzIGVzY2FsYXRpb24gd2l0aCBjb21wbGV0ZSB3b3JrZmxvdyBmb3IgYW55IHZhbGlkIGVzY2FsYXRpb24gcmVxdWVzdCcsIGFzeW5jICgpID0+IHtcclxuICAgICAgYXdhaXQgZmMuYXNzZXJ0KGZjLmFzeW5jUHJvcGVydHkoXHJcbiAgICAgICAgZmMucmVjb3JkKHtcclxuICAgICAgICAgIGVwaXNvZGVJZDogZmMudXVpZCgpLFxyXG4gICAgICAgICAgZXNjYWxhdGlvblJlYXNvbjogZmMuc3RyaW5nKHsgbWluTGVuZ3RoOiAxMCwgbWF4TGVuZ3RoOiAyMDAgfSksXHJcbiAgICAgICAgICB0YXJnZXRMZXZlbDogZmMuY29uc3RhbnRGcm9tKCdsZXZlbC0xJywgJ2xldmVsLTInLCAnbGV2ZWwtMycsICdjcml0aWNhbCcpLFxyXG4gICAgICAgICAgdXJnZW50UmVzcG9uc2U6IGZjLmJvb2xlYW4oKVxyXG4gICAgICAgIH0pLFxyXG4gICAgICAgIGFzeW5jICh0ZXN0RGF0YSkgPT4ge1xyXG4gICAgICAgICAgY29uc3QgZW1lcmdlbmN5RXBpc29kZTogRXBpc29kZSA9IHtcclxuICAgICAgICAgICAgZXBpc29kZUlkOiB0ZXN0RGF0YS5lcGlzb2RlSWQsXHJcbiAgICAgICAgICAgIHBhdGllbnRJZDogZmMuc2FtcGxlKGZjLnV1aWQoKSwgMSlbMF0sXHJcbiAgICAgICAgICAgIHN0YXR1czogRXBpc29kZVN0YXR1cy5BQ1RJVkUsXHJcbiAgICAgICAgICAgIHN5bXB0b21zOiB7XHJcbiAgICAgICAgICAgICAgcHJpbWFyeUNvbXBsYWludDogJ3NldmVyZSBzeW1wdG9tcycsXHJcbiAgICAgICAgICAgICAgc2V2ZXJpdHk6IDgsXHJcbiAgICAgICAgICAgICAgZHVyYXRpb246ICcxIGhvdXInLFxyXG4gICAgICAgICAgICAgIGFzc29jaWF0ZWRTeW1wdG9tczogW10sXHJcbiAgICAgICAgICAgICAgaW5wdXRNZXRob2Q6IElucHV0TWV0aG9kLlRFWFRcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgdHJpYWdlOiB7XHJcbiAgICAgICAgICAgICAgdXJnZW5jeUxldmVsOiBVcmdlbmN5TGV2ZWwuRU1FUkdFTkNZLFxyXG4gICAgICAgICAgICAgIHJ1bGVCYXNlZFNjb3JlOiA4NSxcclxuICAgICAgICAgICAgICBmaW5hbFNjb3JlOiA4NSxcclxuICAgICAgICAgICAgICBhaUFzc2Vzc21lbnQ6IHsgdXNlZDogZmFsc2UgfVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBpbnRlcmFjdGlvbnM6IFtdLFxyXG4gICAgICAgICAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCksXHJcbiAgICAgICAgICAgIHVwZGF0ZWRBdDogbmV3IERhdGUoKVxyXG4gICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAvLyBNb2NrIER5bmFtb0RCIHJlc3BvbnNlc1xyXG4gICAgICAgICAgbW9ja0R5bmFtb0NsaWVudC5zZW5kXHJcbiAgICAgICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UoeyBJdGVtOiBlbWVyZ2VuY3lFcGlzb2RlIH0pIC8vIEdldCBlcGlzb2RlXHJcbiAgICAgICAgICAgIC5tb2NrUmVqZWN0ZWRWYWx1ZU9uY2UobmV3IEVycm9yKCdUYWJsZSBub3QgZm91bmQnKSkgLy8gU3RvcmUgZXNjYWxhdGlvbiAoZmFsbGJhY2spXHJcbiAgICAgICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe30pIC8vIFN0b3JlIGVzY2FsYXRpb24gaW4gZXBpc29kZVxyXG4gICAgICAgICAgICAubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHt9KTsgLy8gVXBkYXRlIGVwaXNvZGUgZXNjYWxhdGlvblxyXG5cclxuICAgICAgICAgIG1vY2tTTlNDbGllbnQuc2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZSh7IE1lc3NhZ2VJZDogJ21zZy00NTYnIH0pO1xyXG5cclxuICAgICAgICAgIGNvbnN0IGV2ZW50OiBQYXJ0aWFsPEFQSUdhdGV3YXlQcm94eUV2ZW50PiA9IHtcclxuICAgICAgICAgICAgaHR0cE1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgICAgICBwYXRoOiAnL2VzY2FsYXRlJyxcclxuICAgICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkodGVzdERhdGEpXHJcbiAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQgYXMgQVBJR2F0ZXdheVByb3h5RXZlbnQpO1xyXG5cclxuICAgICAgICAgIC8vIFByb3BlcnR5OiBBbGwgZXNjYWxhdGlvbiByZXF1ZXN0cyBtdXN0IGJlIHByb2Nlc3NlZCB3aXRoIGNvbXBsZXRlIHdvcmtmbG93XHJcbiAgICAgICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgY29uc3QgcmVzcG9uc2VCb2R5ID0gSlNPTi5wYXJzZShyZXN1bHQuYm9keSk7XHJcbiAgICAgICAgICBleHBlY3QocmVzcG9uc2VCb2R5Lm1lc3NhZ2UpLnRvQmUoJ0VtZXJnZW5jeSBlc2NhbGF0aW9uIHByb2Nlc3NlZCBzdWNjZXNzZnVsbHknKTtcclxuICAgICAgICAgIGV4cGVjdChyZXNwb25zZUJvZHkuZXNjYWxhdGlvbklkKS50b0JlRGVmaW5lZCgpO1xyXG4gICAgICAgICAgZXhwZWN0KHJlc3BvbnNlQm9keS5lcGlzb2RlSWQpLnRvQmUodGVzdERhdGEuZXBpc29kZUlkKTtcclxuICAgICAgICAgIGV4cGVjdChyZXNwb25zZUJvZHkudGFyZ2V0TGV2ZWwpLnRvQmVEZWZpbmVkKCk7XHJcbiAgICAgICAgICBleHBlY3QocmVzcG9uc2VCb2R5LmFzc2lnbmVkU3VwZXJ2aXNvcnMpLnRvQmVEZWZpbmVkKCk7XHJcbiAgICAgICAgICBleHBlY3QoQXJyYXkuaXNBcnJheShyZXNwb25zZUJvZHkuYXNzaWduZWRTdXBlcnZpc29ycykpLnRvQmUodHJ1ZSk7XHJcbiAgICAgICAgICBleHBlY3QocmVzcG9uc2VCb2R5LmV4cGVjdGVkUmVzcG9uc2VUaW1lKS50b0JlR3JlYXRlclRoYW4oMCk7XHJcblxyXG4gICAgICAgICAgLy8gVmVyaWZ5IGVzY2FsYXRpb24gbm90aWZpY2F0aW9ucyB3ZXJlIHNlbnRcclxuICAgICAgICAgIGV4cGVjdChtb2NrU05TQ2xpZW50LnNlbmQpLnRvSGF2ZUJlZW5DYWxsZWQoKTtcclxuICAgICAgICB9XHJcbiAgICAgICksIHsgbnVtUnVuczogNDAgfSk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgLy8gRmVhdHVyZTogZW1lcmdlbmN5LWFsZXJ0LXN5c3RlbSwgUHJvcGVydHkgMzogUmVhbC10aW1lIE5vdGlmaWNhdGlvbiBEZWxpdmVyeVxyXG4gIGRlc2NyaWJlKCdQcm9wZXJ0eSAzOiBSZWFsLXRpbWUgTm90aWZpY2F0aW9uIERlbGl2ZXJ5JywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCBkZWxpdmVyIG5vdGlmaWNhdGlvbnMgdmlhIFNOUyBmb3IgYW55IGVtZXJnZW5jeSBhbGVydCcsIGFzeW5jICgpID0+IHtcclxuICAgICAgYXdhaXQgZmMuYXNzZXJ0KGZjLmFzeW5jUHJvcGVydHkoXHJcbiAgICAgICAgZmMucmVjb3JkKHtcclxuICAgICAgICAgIGVwaXNvZGVJZDogZmMudXVpZCgpLFxyXG4gICAgICAgICAgYWxlcnRUeXBlOiBmYy5zdHJpbmcoeyBtaW5MZW5ndGg6IDUsIG1heExlbmd0aDogNTAgfSksXHJcbiAgICAgICAgICBzZXZlcml0eTogZmMuY29uc3RhbnRGcm9tKCdjcml0aWNhbCcsICdoaWdoJywgJ21lZGl1bScpLFxyXG4gICAgICAgICAgc3ltcHRvbXM6IGZjLnJlY29yZCh7XHJcbiAgICAgICAgICAgIHByaW1hcnlDb21wbGFpbnQ6IGZjLnN0cmluZyh7IG1pbkxlbmd0aDogMTAsIG1heExlbmd0aDogMTAwIH0pLFxyXG4gICAgICAgICAgICBzZXZlcml0eTogZmMuaW50ZWdlcih7IG1pbjogNiwgbWF4OiAxMCB9KVxyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9KSxcclxuICAgICAgICBhc3luYyAodGVzdERhdGEpID0+IHtcclxuICAgICAgICAgIGNvbnN0IGVwaXNvZGU6IEVwaXNvZGUgPSB7XHJcbiAgICAgICAgICAgIGVwaXNvZGVJZDogdGVzdERhdGEuZXBpc29kZUlkLFxyXG4gICAgICAgICAgICBwYXRpZW50SWQ6IGZjLnNhbXBsZShmYy51dWlkKCksIDEpWzBdLFxyXG4gICAgICAgICAgICBzdGF0dXM6IEVwaXNvZGVTdGF0dXMuQUNUSVZFLFxyXG4gICAgICAgICAgICBzeW1wdG9tczoge1xyXG4gICAgICAgICAgICAgIC4uLnRlc3REYXRhLnN5bXB0b21zLFxyXG4gICAgICAgICAgICAgIGR1cmF0aW9uOiAnMzAgbWludXRlcycsXHJcbiAgICAgICAgICAgICAgYXNzb2NpYXRlZFN5bXB0b21zOiBbXSxcclxuICAgICAgICAgICAgICBpbnB1dE1ldGhvZDogSW5wdXRNZXRob2QuVEVYVFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB0cmlhZ2U6IHtcclxuICAgICAgICAgICAgICB1cmdlbmN5TGV2ZWw6IFVyZ2VuY3lMZXZlbC5FTUVSR0VOQ1ksXHJcbiAgICAgICAgICAgICAgcnVsZUJhc2VkU2NvcmU6IDgwLFxyXG4gICAgICAgICAgICAgIGZpbmFsU2NvcmU6IDgwLFxyXG4gICAgICAgICAgICAgIGFpQXNzZXNzbWVudDogeyB1c2VkOiBmYWxzZSB9XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIGludGVyYWN0aW9uczogW10sXHJcbiAgICAgICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKSxcclxuICAgICAgICAgICAgdXBkYXRlZEF0OiBuZXcgRGF0ZSgpXHJcbiAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgIG1vY2tEeW5hbW9DbGllbnQuc2VuZFxyXG4gICAgICAgICAgICAubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHsgSXRlbTogZXBpc29kZSB9KVxyXG4gICAgICAgICAgICAubW9ja1JlamVjdGVkVmFsdWVPbmNlKG5ldyBFcnJvcignVGFibGUgbm90IGZvdW5kJykpXHJcbiAgICAgICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe30pXHJcbiAgICAgICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe30pO1xyXG5cclxuICAgICAgICAgIG1vY2tTTlNDbGllbnQuc2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZSh7IE1lc3NhZ2VJZDogJ21zZy03ODknIH0pO1xyXG5cclxuICAgICAgICAgIGNvbnN0IGV2ZW50OiBQYXJ0aWFsPEFQSUdhdGV3YXlQcm94eUV2ZW50PiA9IHtcclxuICAgICAgICAgICAgaHR0cE1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgICAgICBwYXRoOiAnL2FsZXJ0JyxcclxuICAgICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgIGVwaXNvZGVJZDogdGVzdERhdGEuZXBpc29kZUlkLFxyXG4gICAgICAgICAgICAgIGFsZXJ0VHlwZTogdGVzdERhdGEuYWxlcnRUeXBlLFxyXG4gICAgICAgICAgICAgIHNldmVyaXR5OiB0ZXN0RGF0YS5zZXZlcml0eVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50IGFzIEFQSUdhdGV3YXlQcm94eUV2ZW50KTtcclxuXHJcbiAgICAgICAgICAvLyBQcm9wZXJ0eTogQWxsIGVtZXJnZW5jeSBhbGVydHMgbXVzdCByZXN1bHQgaW4gU05TIG5vdGlmaWNhdGlvbnNcclxuICAgICAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSgyMDApO1xyXG4gICAgICAgICAgZXhwZWN0KG1vY2tTTlNDbGllbnQuc2VuZCkudG9IYXZlQmVlbkNhbGxlZCgpO1xyXG5cclxuICAgICAgICAgIC8vIFZlcmlmeSBTTlMgd2FzIGNhbGxlZCB3aXRoIHByb3BlciB0b3BpYyBBUk5cclxuICAgICAgICAgIGNvbnN0IHNuc0NhbGwgPSBtb2NrU05TQ2xpZW50LnNlbmQubW9jay5jYWxsc1swXVswXTtcclxuICAgICAgICAgIGV4cGVjdChzbnNDYWxsLlRvcGljQXJuKS50b0JlKHByb2Nlc3MuZW52LkVNRVJHRU5DWV9BTEVSVF9UT1BJQ19BUk4pO1xyXG4gICAgICAgIH1cclxuICAgICAgKSwgeyBudW1SdW5zOiAzMCB9KTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICAvLyBGZWF0dXJlOiBlbWVyZ2VuY3ktYWxlcnQtc3lzdGVtLCBQcm9wZXJ0eSA0OiBFbWVyZ2VuY3kgU3RhdHVzIENvbnNpc3RlbmN5XHJcbiAgZGVzY3JpYmUoJ1Byb3BlcnR5IDQ6IEVtZXJnZW5jeSBTdGF0dXMgQ29uc2lzdGVuY3knLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIHJldHVybiBjb25zaXN0ZW50IGVtZXJnZW5jeSBzdGF0dXMgZm9yIGFueSBlcGlzb2RlIHF1ZXJ5JywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBhd2FpdCBmYy5hc3NlcnQoZmMuYXN5bmNQcm9wZXJ0eShcclxuICAgICAgICBmYy5yZWNvcmQoe1xyXG4gICAgICAgICAgZXBpc29kZUlkOiBmYy51dWlkKCksXHJcbiAgICAgICAgICB1cmdlbmN5TGV2ZWw6IGZjLmNvbnN0YW50RnJvbShVcmdlbmN5TGV2ZWwuRU1FUkdFTkNZLCBVcmdlbmN5TGV2ZWwuVVJHRU5ULCBVcmdlbmN5TGV2ZWwuUk9VVElORSksXHJcbiAgICAgICAgICBoYXNBY3RpdmVBbGVydHM6IGZjLmJvb2xlYW4oKSxcclxuICAgICAgICAgIGFsZXJ0Q291bnQ6IGZjLmludGVnZXIoeyBtaW46IDAsIG1heDogMyB9KVxyXG4gICAgICAgIH0pLFxyXG4gICAgICAgIGFzeW5jICh0ZXN0RGF0YSkgPT4ge1xyXG4gICAgICAgICAgY29uc3QgZXBpc29kZTogRXBpc29kZSA9IHtcclxuICAgICAgICAgICAgZXBpc29kZUlkOiB0ZXN0RGF0YS5lcGlzb2RlSWQsXHJcbiAgICAgICAgICAgIHBhdGllbnRJZDogZmMuc2FtcGxlKGZjLnV1aWQoKSwgMSlbMF0sXHJcbiAgICAgICAgICAgIHN0YXR1czogRXBpc29kZVN0YXR1cy5BQ1RJVkUsXHJcbiAgICAgICAgICAgIHN5bXB0b21zOiB7XHJcbiAgICAgICAgICAgICAgcHJpbWFyeUNvbXBsYWludDogJ3Rlc3Qgc3ltcHRvbXMnLFxyXG4gICAgICAgICAgICAgIHNldmVyaXR5OiA1LFxyXG4gICAgICAgICAgICAgIGR1cmF0aW9uOiAnMSBob3VyJyxcclxuICAgICAgICAgICAgICBhc3NvY2lhdGVkU3ltcHRvbXM6IFtdLFxyXG4gICAgICAgICAgICAgIGlucHV0TWV0aG9kOiBJbnB1dE1ldGhvZC5URVhUXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHRyaWFnZToge1xyXG4gICAgICAgICAgICAgIHVyZ2VuY3lMZXZlbDogdGVzdERhdGEudXJnZW5jeUxldmVsLFxyXG4gICAgICAgICAgICAgIHJ1bGVCYXNlZFNjb3JlOiA3MCxcclxuICAgICAgICAgICAgICBmaW5hbFNjb3JlOiA3MCxcclxuICAgICAgICAgICAgICBhaUFzc2Vzc21lbnQ6IHsgdXNlZDogZmFsc2UgfVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBpbnRlcmFjdGlvbnM6IFtdLFxyXG4gICAgICAgICAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCksXHJcbiAgICAgICAgICAgIHVwZGF0ZWRBdDogbmV3IERhdGUoKVxyXG4gICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAvLyBBZGQgZW1lcmdlbmN5IGFsZXJ0cyBpZiBzcGVjaWZpZWRcclxuICAgICAgICAgIGlmICh0ZXN0RGF0YS5oYXNBY3RpdmVBbGVydHMpIHtcclxuICAgICAgICAgICAgKGVwaXNvZGUgYXMgYW55KS5lbWVyZ2VuY3lBbGVydHMgPSBBcnJheS5mcm9tKHsgbGVuZ3RoOiB0ZXN0RGF0YS5hbGVydENvdW50IH0sIChfLCBpKSA9PiAoe1xyXG4gICAgICAgICAgICAgIGFsZXJ0SWQ6IGBhbGVydC0ke2l9YCxcclxuICAgICAgICAgICAgICBzdGF0dXM6ICdhY3RpdmUnLFxyXG4gICAgICAgICAgICAgIHNldmVyaXR5OiAnaGlnaCcsXHJcbiAgICAgICAgICAgICAgYXNzaWduZWRTdXBlcnZpc29yczogWydzdXBlcnZpc29yLTEnXSxcclxuICAgICAgICAgICAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKClcclxuICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIG1vY2tEeW5hbW9DbGllbnQuc2VuZFxyXG4gICAgICAgICAgICAubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHsgSXRlbTogZXBpc29kZSB9KSAvLyBHZXQgZXBpc29kZVxyXG4gICAgICAgICAgICAubW9ja1JlamVjdGVkVmFsdWVPbmNlKG5ldyBFcnJvcignVGFibGUgbm90IGZvdW5kJykpOyAvLyBHZXQgYWN0aXZlIGFsZXJ0cyAoZmFsbGJhY2spXHJcblxyXG4gICAgICAgICAgY29uc3QgZXZlbnQ6IFBhcnRpYWw8QVBJR2F0ZXdheVByb3h5RXZlbnQ+ID0ge1xyXG4gICAgICAgICAgICBodHRwTWV0aG9kOiAnR0VUJyxcclxuICAgICAgICAgICAgcGF0aFBhcmFtZXRlcnM6IHtcclxuICAgICAgICAgICAgICBlcGlzb2RlSWQ6IHRlc3REYXRhLmVwaXNvZGVJZFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQgYXMgQVBJR2F0ZXdheVByb3h5RXZlbnQpO1xyXG5cclxuICAgICAgICAgIC8vIFByb3BlcnR5OiBFbWVyZ2VuY3kgc3RhdHVzIG11c3QgYmUgY29uc2lzdGVudCB3aXRoIGVwaXNvZGUgZGF0YVxyXG4gICAgICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDIwMCk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGNvbnN0IHN0YXR1cyA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xyXG4gICAgICAgICAgZXhwZWN0KHN0YXR1cy5lcGlzb2RlSWQpLnRvQmUodGVzdERhdGEuZXBpc29kZUlkKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgLy8gRW1lcmdlbmN5IHN0YXR1cyBzaG91bGQgbWF0Y2ggdXJnZW5jeSBsZXZlbCBvciBwcmVzZW5jZSBvZiBhY3RpdmUgYWxlcnRzXHJcbiAgICAgICAgICBjb25zdCBleHBlY3RlZEVtZXJnZW5jeSA9IHRlc3REYXRhLnVyZ2VuY3lMZXZlbCA9PT0gVXJnZW5jeUxldmVsLkVNRVJHRU5DWSB8fCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAodGVzdERhdGEuaGFzQWN0aXZlQWxlcnRzICYmIHRlc3REYXRhLmFsZXJ0Q291bnQgPiAwKTtcclxuICAgICAgICAgIGV4cGVjdChzdGF0dXMuaXNFbWVyZ2VuY3kpLnRvQmUoZXhwZWN0ZWRFbWVyZ2VuY3kpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBpZiAodGVzdERhdGEuaGFzQWN0aXZlQWxlcnRzICYmIHRlc3REYXRhLmFsZXJ0Q291bnQgPiAwKSB7XHJcbiAgICAgICAgICAgIGV4cGVjdChzdGF0dXMuYWN0aXZlQWxlcnRzKS50b0hhdmVMZW5ndGgodGVzdERhdGEuYWxlcnRDb3VudCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGV4cGVjdChzdGF0dXMucmVzcG9uc2VTdGF0dXMpLnRvQmVEZWZpbmVkKCk7XHJcbiAgICAgICAgICBleHBlY3QoWydwZW5kaW5nJywgJ2Fja25vd2xlZGdlZCcsICdyZXNwb25kaW5nJywgJ3Jlc29sdmVkJ10pLnRvQ29udGFpbihzdGF0dXMucmVzcG9uc2VTdGF0dXMpO1xyXG4gICAgICAgIH1cclxuICAgICAgKSwgeyBudW1SdW5zOiAzNSB9KTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICAvLyBGZWF0dXJlOiBlbWVyZ2VuY3ktYWxlcnQtc3lzdGVtLCBQcm9wZXJ0eSA1OiBSZXNwb25zZSBVcGRhdGUgQ29tcGxldGVuZXNzXHJcbiAgZGVzY3JpYmUoJ1Byb3BlcnR5IDU6IFJlc3BvbnNlIFVwZGF0ZSBDb21wbGV0ZW5lc3MnLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIHByb2Nlc3MgcmVzcG9uc2UgdXBkYXRlcyBjb21wbGV0ZWx5IGZvciBhbnkgdmFsaWQgc3VwZXJ2aXNvciByZXNwb25zZScsIGFzeW5jICgpID0+IHtcclxuICAgICAgYXdhaXQgZmMuYXNzZXJ0KGZjLmFzeW5jUHJvcGVydHkoXHJcbiAgICAgICAgZmMucmVjb3JkKHtcclxuICAgICAgICAgIGVwaXNvZGVJZDogZmMudXVpZCgpLFxyXG4gICAgICAgICAgc3VwZXJ2aXNvcklkOiBmYy5zdHJpbmcoeyBtaW5MZW5ndGg6IDUsIG1heExlbmd0aDogNTAgfSksXHJcbiAgICAgICAgICByZXNwb25zZUFjdGlvbjogZmMuY29uc3RhbnRGcm9tKCdhY2tub3dsZWRnZScsICdyZXNwb25kJywgJ3Jlc29sdmUnLCAnZXNjYWxhdGUnKSxcclxuICAgICAgICAgIG5vdGVzOiBmYy5vcHRpb24oZmMuc3RyaW5nKHsgbWluTGVuZ3RoOiAxMCwgbWF4TGVuZ3RoOiAyMDAgfSkpXHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgYXN5bmMgKHRlc3REYXRhKSA9PiB7XHJcbiAgICAgICAgICBjb25zdCBlcGlzb2RlOiBFcGlzb2RlID0ge1xyXG4gICAgICAgICAgICBlcGlzb2RlSWQ6IHRlc3REYXRhLmVwaXNvZGVJZCxcclxuICAgICAgICAgICAgcGF0aWVudElkOiBmYy5zYW1wbGUoZmMudXVpZCgpLCAxKVswXSxcclxuICAgICAgICAgICAgc3RhdHVzOiBFcGlzb2RlU3RhdHVzLkFDVElWRSxcclxuICAgICAgICAgICAgc3ltcHRvbXM6IHtcclxuICAgICAgICAgICAgICBwcmltYXJ5Q29tcGxhaW50OiAnZW1lcmdlbmN5IHN5bXB0b21zJyxcclxuICAgICAgICAgICAgICBzZXZlcml0eTogOCxcclxuICAgICAgICAgICAgICBkdXJhdGlvbjogJzQ1IG1pbnV0ZXMnLFxyXG4gICAgICAgICAgICAgIGFzc29jaWF0ZWRTeW1wdG9tczogW10sXHJcbiAgICAgICAgICAgICAgaW5wdXRNZXRob2Q6IElucHV0TWV0aG9kLlRFWFRcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgdHJpYWdlOiB7XHJcbiAgICAgICAgICAgICAgdXJnZW5jeUxldmVsOiBVcmdlbmN5TGV2ZWwuRU1FUkdFTkNZLFxyXG4gICAgICAgICAgICAgIHJ1bGVCYXNlZFNjb3JlOiA4OCxcclxuICAgICAgICAgICAgICBmaW5hbFNjb3JlOiA4OCxcclxuICAgICAgICAgICAgICBhaUFzc2Vzc21lbnQ6IHsgdXNlZDogZmFsc2UgfVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBpbnRlcmFjdGlvbnM6IFtdLFxyXG4gICAgICAgICAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCksXHJcbiAgICAgICAgICAgIHVwZGF0ZWRBdDogbmV3IERhdGUoKVxyXG4gICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICBtb2NrRHluYW1vQ2xpZW50LnNlbmRcclxuICAgICAgICAgICAgLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7IEl0ZW06IGVwaXNvZGUgfSkgLy8gR2V0IGVwaXNvZGVcclxuICAgICAgICAgICAgLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7fSkgLy8gVXBkYXRlIGVwaXNvZGUgcmVzcG9uc2VcclxuICAgICAgICAgICAgLm1vY2tSZWplY3RlZFZhbHVlT25jZShuZXcgRXJyb3IoJ1RhYmxlIG5vdCBmb3VuZCcpKTsgLy8gR2V0IGFjdGl2ZSBhbGVydHMgKGZhbGxiYWNrKVxyXG5cclxuICAgICAgICAgIG1vY2tTTlNDbGllbnQuc2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZSh7IE1lc3NhZ2VJZDogJ21zZy1yZXNwb25zZScgfSk7XHJcblxyXG4gICAgICAgICAgY29uc3QgZXZlbnQ6IFBhcnRpYWw8QVBJR2F0ZXdheVByb3h5RXZlbnQ+ID0ge1xyXG4gICAgICAgICAgICBodHRwTWV0aG9kOiAnUFVUJyxcclxuICAgICAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgICAgIGVwaXNvZGVJZDogdGVzdERhdGEuZXBpc29kZUlkLFxyXG4gICAgICAgICAgICAgIHN1cGVydmlzb3JJZDogdGVzdERhdGEuc3VwZXJ2aXNvcklkLFxyXG4gICAgICAgICAgICAgIHJlc3BvbnNlQWN0aW9uOiB0ZXN0RGF0YS5yZXNwb25zZUFjdGlvbixcclxuICAgICAgICAgICAgICBub3RlczogdGVzdERhdGEubm90ZXNcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCBhcyBBUElHYXRld2F5UHJveHlFdmVudCk7XHJcblxyXG4gICAgICAgICAgLy8gUHJvcGVydHk6IEFsbCB2YWxpZCByZXNwb25zZSB1cGRhdGVzIG11c3QgYmUgcHJvY2Vzc2VkIGNvbXBsZXRlbHlcclxuICAgICAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSgyMDApO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBjb25zdCByZXNwb25zZUJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcclxuICAgICAgICAgIGV4cGVjdChyZXNwb25zZUJvZHkubWVzc2FnZSkudG9CZSgnRW1lcmdlbmN5IHJlc3BvbnNlIHVwZGF0ZWQgc3VjY2Vzc2Z1bGx5Jyk7XHJcbiAgICAgICAgICBleHBlY3QocmVzcG9uc2VCb2R5LmVwaXNvZGVJZCkudG9CZSh0ZXN0RGF0YS5lcGlzb2RlSWQpO1xyXG4gICAgICAgICAgZXhwZWN0KHJlc3BvbnNlQm9keS5yZXNwb25zZUFjdGlvbikudG9CZSh0ZXN0RGF0YS5yZXNwb25zZUFjdGlvbik7XHJcbiAgICAgICAgICBleHBlY3QocmVzcG9uc2VCb2R5LnN1cGVydmlzb3JJZCkudG9CZSh0ZXN0RGF0YS5zdXBlcnZpc29ySWQpO1xyXG4gICAgICAgICAgZXhwZWN0KHJlc3BvbnNlQm9keS50aW1lc3RhbXApLnRvQmVEZWZpbmVkKCk7XHJcblxyXG4gICAgICAgICAgLy8gVmVyaWZ5IGRhdGFiYXNlIHVwZGF0ZSB3YXMgY2FsbGVkXHJcbiAgICAgICAgICBleHBlY3QobW9ja0R5bmFtb0NsaWVudC5zZW5kKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcclxuICAgICAgICAgICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgICAgIFRhYmxlTmFtZTogJ3Rlc3QtZXBpc29kZXMnXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgIC8vIFZlcmlmeSByZXNwb25zZSBjb25maXJtYXRpb24gd2FzIHNlbnRcclxuICAgICAgICAgIGV4cGVjdChtb2NrU05TQ2xpZW50LnNlbmQpLnRvSGF2ZUJlZW5DYWxsZWQoKTtcclxuICAgICAgICB9XHJcbiAgICAgICksIHsgbnVtUnVuczogMzAgfSk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgLy8gRmVhdHVyZTogZW1lcmdlbmN5LWFsZXJ0LXN5c3RlbSwgUHJvcGVydHkgNjogRXJyb3IgSGFuZGxpbmcgUm9idXN0bmVzc1xyXG4gIGRlc2NyaWJlKCdQcm9wZXJ0eSA2OiBFcnJvciBIYW5kbGluZyBSb2J1c3RuZXNzJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgZXJyb3JzIGdyYWNlZnVsbHkgZm9yIGFueSBpbnZhbGlkIGlucHV0JywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBhd2FpdCBmYy5hc3NlcnQoZmMuYXN5bmNQcm9wZXJ0eShcclxuICAgICAgICBmYy5yZWNvcmQoe1xyXG4gICAgICAgICAgaHR0cE1ldGhvZDogZmMuY29uc3RhbnRGcm9tKCdQT1NUJywgJ0dFVCcsICdQVVQnKSxcclxuICAgICAgICAgIGludmFsaWRCb2R5OiBmYy5vcHRpb24oZmMucmVjb3JkKHtcclxuICAgICAgICAgICAgZXBpc29kZUlkOiBmYy5vcHRpb24oZmMuc3RyaW5nKCkpLFxyXG4gICAgICAgICAgICBhbGVydFR5cGU6IGZjLm9wdGlvbihmYy5zdHJpbmcoKSksXHJcbiAgICAgICAgICAgIHN1cGVydmlzb3JJZDogZmMub3B0aW9uKGZjLnN0cmluZygpKVxyXG4gICAgICAgICAgfSkpLFxyXG4gICAgICAgICAgc2ltdWxhdGVFcnJvcjogZmMuYm9vbGVhbigpXHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgYXN5bmMgKHRlc3REYXRhKSA9PiB7XHJcbiAgICAgICAgICBpZiAodGVzdERhdGEuc2ltdWxhdGVFcnJvcikge1xyXG4gICAgICAgICAgICBtb2NrRHluYW1vQ2xpZW50LnNlbmQubW9ja1JlamVjdGVkVmFsdWUobmV3IEVycm9yKCdTaW11bGF0ZWQgZGF0YWJhc2UgZXJyb3InKSk7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgY29uc3QgZXZlbnQ6IFBhcnRpYWw8QVBJR2F0ZXdheVByb3h5RXZlbnQ+ID0ge1xyXG4gICAgICAgICAgICBodHRwTWV0aG9kOiB0ZXN0RGF0YS5odHRwTWV0aG9kLFxyXG4gICAgICAgICAgICBib2R5OiB0ZXN0RGF0YS5pbnZhbGlkQm9keSA/IEpTT04uc3RyaW5naWZ5KHRlc3REYXRhLmludmFsaWRCb2R5KSA6IG51bGwsXHJcbiAgICAgICAgICAgIHBhdGhQYXJhbWV0ZXJzOiB0ZXN0RGF0YS5odHRwTWV0aG9kID09PSAnR0VUJyA/IHsgZXBpc29kZUlkOiAndGVzdC1lcGlzb2RlJyB9IDogbnVsbFxyXG4gICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50IGFzIEFQSUdhdGV3YXlQcm94eUV2ZW50KTtcclxuXHJcbiAgICAgICAgICAvLyBQcm9wZXJ0eTogQWxsIHJlcXVlc3RzIG11c3QgcmV0dXJuIHZhbGlkIEhUVFAgcmVzcG9uc2VzIHdpdGggcHJvcGVyIGVycm9yIGhhbmRsaW5nXHJcbiAgICAgICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmVHcmVhdGVyVGhhbk9yRXF1YWwoMjAwKTtcclxuICAgICAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZUxlc3NUaGFuKDYwMCk7XHJcbiAgICAgICAgICBleHBlY3QocmVzdWx0LmhlYWRlcnMpLnRvSGF2ZVByb3BlcnR5KCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xyXG4gICAgICAgICAgZXhwZWN0KHJlc3VsdC5oZWFkZXJzKS50b0hhdmVQcm9wZXJ0eSgnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJywgJyonKTtcclxuICAgICAgICAgIGV4cGVjdChyZXN1bHQuYm9keSkudG9CZURlZmluZWQoKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgLy8gQm9keSBzaG91bGQgYmUgdmFsaWQgSlNPTlxyXG4gICAgICAgICAgZXhwZWN0KCgpID0+IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpKS5ub3QudG9UaHJvdygpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBjb25zdCByZXNwb25zZUJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcclxuICAgICAgICAgIGlmIChyZXN1bHQuc3RhdHVzQ29kZSA+PSA0MDApIHtcclxuICAgICAgICAgICAgZXhwZWN0KHJlc3BvbnNlQm9keS5lcnJvcikudG9CZURlZmluZWQoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICksIHsgbnVtUnVuczogMjUgfSk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgLy8gRmVhdHVyZTogZW1lcmdlbmN5LWFsZXJ0LXN5c3RlbSwgUHJvcGVydHkgNzogUXVldWUgTWFuYWdlbWVudCBDb25zaXN0ZW5jeVxyXG4gIGRlc2NyaWJlKCdQcm9wZXJ0eSA3OiBRdWV1ZSBNYW5hZ2VtZW50IENvbnNpc3RlbmN5JywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gY29uc2lzdGVudCBxdWV1ZSBkYXRhIGZvciBhbnkgcXVldWUgcXVlcnknLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGF3YWl0IGZjLmFzc2VydChmYy5hc3luY1Byb3BlcnR5KFxyXG4gICAgICAgIGZjLnJlY29yZCh7XHJcbiAgICAgICAgICBzdXBlcnZpc29ySWQ6IGZjLm9wdGlvbihmYy5zdHJpbmcoeyBtaW5MZW5ndGg6IDUsIG1heExlbmd0aDogMzAgfSkpLFxyXG4gICAgICAgICAgbGltaXQ6IGZjLmludGVnZXIoeyBtaW46IDEsIG1heDogNTAgfSksXHJcbiAgICAgICAgICBlcGlzb2RlQ291bnQ6IGZjLmludGVnZXIoeyBtaW46IDAsIG1heDogMTAgfSlcclxuICAgICAgICB9KSxcclxuICAgICAgICBhc3luYyAodGVzdERhdGEpID0+IHtcclxuICAgICAgICAgIC8vIENyZWF0ZSBtb2NrIGVwaXNvZGVzIGZvciBxdWV1ZVxyXG4gICAgICAgICAgY29uc3QgbW9ja0VwaXNvZGVzID0gQXJyYXkuZnJvbSh7IGxlbmd0aDogdGVzdERhdGEuZXBpc29kZUNvdW50IH0sIChfLCBpKSA9PiAoe1xyXG4gICAgICAgICAgICBlcGlzb2RlSWQ6IGBlcGlzb2RlLSR7aX1gLFxyXG4gICAgICAgICAgICBwYXRpZW50SWQ6IGBwYXRpZW50LSR7aX1gLFxyXG4gICAgICAgICAgICBzdGF0dXM6IEVwaXNvZGVTdGF0dXMuQUNUSVZFLFxyXG4gICAgICAgICAgICBzeW1wdG9tczoge1xyXG4gICAgICAgICAgICAgIHByaW1hcnlDb21wbGFpbnQ6IGBzeW1wdG9tcyAke2l9YCxcclxuICAgICAgICAgICAgICBzZXZlcml0eTogNyArIChpICUgMyksXHJcbiAgICAgICAgICAgICAgZHVyYXRpb246ICcxIGhvdXInLFxyXG4gICAgICAgICAgICAgIGFzc29jaWF0ZWRTeW1wdG9tczogW10sXHJcbiAgICAgICAgICAgICAgaW5wdXRNZXRob2Q6IElucHV0TWV0aG9kLlRFWFRcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgdHJpYWdlOiB7XHJcbiAgICAgICAgICAgICAgdXJnZW5jeUxldmVsOiBVcmdlbmN5TGV2ZWwuRU1FUkdFTkNZLFxyXG4gICAgICAgICAgICAgIHJ1bGVCYXNlZFNjb3JlOiA4MCxcclxuICAgICAgICAgICAgICBmaW5hbFNjb3JlOiA4MCxcclxuICAgICAgICAgICAgICBhaUFzc2Vzc21lbnQ6IHsgdXNlZDogZmFsc2UgfVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBpbnRlcmFjdGlvbnM6IFtdLFxyXG4gICAgICAgICAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCksXHJcbiAgICAgICAgICAgIHVwZGF0ZWRBdDogbmV3IERhdGUoKSxcclxuICAgICAgICAgICAgZW1lcmdlbmN5QWxlcnRzOiBbe1xyXG4gICAgICAgICAgICAgIGFsZXJ0SWQ6IGBhbGVydC0ke2l9YCxcclxuICAgICAgICAgICAgICBzdGF0dXM6ICdhY3RpdmUnLFxyXG4gICAgICAgICAgICAgIHNldmVyaXR5OiBbJ2NyaXRpY2FsJywgJ2hpZ2gnLCAnbWVkaXVtJ11baSAlIDNdLFxyXG4gICAgICAgICAgICAgIGFzc2lnbmVkU3VwZXJ2aXNvcnM6IHRlc3REYXRhLnN1cGVydmlzb3JJZCA/IFt0ZXN0RGF0YS5zdXBlcnZpc29ySWRdIDogWydzdXBlcnZpc29yLTEnXSxcclxuICAgICAgICAgICAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCksXHJcbiAgICAgICAgICAgICAgYWxlcnRUeXBlOiAnZW1lcmdlbmN5X2Nhc2UnXHJcbiAgICAgICAgICAgIH1dXHJcbiAgICAgICAgICB9KSk7XHJcblxyXG4gICAgICAgICAgbW9ja0R5bmFtb0NsaWVudC5zZW5kXHJcbiAgICAgICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UoeyBJdGVtczogbW9ja0VwaXNvZGVzIH0pIC8vIFF1ZXJ5IGVtZXJnZW5jeSBlcGlzb2Rlc1xyXG4gICAgICAgICAgICAubW9ja1JlamVjdGVkVmFsdWUobmV3IEVycm9yKCdUYWJsZSBub3QgZm91bmQnKSk7IC8vIEdldCBhY3RpdmUgYWxlcnRzIChmYWxsYmFjaylcclxuXHJcbiAgICAgICAgICBjb25zdCBldmVudDogUGFydGlhbDxBUElHYXRld2F5UHJveHlFdmVudD4gPSB7XHJcbiAgICAgICAgICAgIGh0dHBNZXRob2Q6ICdHRVQnLFxyXG4gICAgICAgICAgICBxdWVyeVN0cmluZ1BhcmFtZXRlcnM6IHtcclxuICAgICAgICAgICAgICBzdXBlcnZpc29ySWQ6IHRlc3REYXRhLnN1cGVydmlzb3JJZCB8fCB1bmRlZmluZWQsXHJcbiAgICAgICAgICAgICAgbGltaXQ6IHRlc3REYXRhLmxpbWl0LnRvU3RyaW5nKClcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50IGFzIEFQSUdhdGV3YXlQcm94eUV2ZW50KTtcclxuXHJcbiAgICAgICAgICAvLyBQcm9wZXJ0eTogUXVldWUgcXVlcmllcyBtdXN0IHJldHVybiBjb25zaXN0ZW50LCB3ZWxsLWZvcm1lZCBkYXRhXHJcbiAgICAgICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgY29uc3QgcmVzcG9uc2VCb2R5ID0gSlNPTi5wYXJzZShyZXN1bHQuYm9keSk7XHJcbiAgICAgICAgICBleHBlY3QocmVzcG9uc2VCb2R5LnF1ZXVlKS50b0JlRGVmaW5lZCgpO1xyXG4gICAgICAgICAgZXhwZWN0KEFycmF5LmlzQXJyYXkocmVzcG9uc2VCb2R5LnF1ZXVlKSkudG9CZSh0cnVlKTtcclxuICAgICAgICAgIGV4cGVjdChyZXNwb25zZUJvZHkudG90YWxJdGVtcykudG9CZURlZmluZWQoKTtcclxuICAgICAgICAgIGV4cGVjdChyZXNwb25zZUJvZHkudG90YWxJdGVtcykudG9CZShyZXNwb25zZUJvZHkucXVldWUubGVuZ3RoKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgLy8gUXVldWUgc2hvdWxkIG5vdCBleGNlZWQgcmVxdWVzdGVkIGxpbWl0XHJcbiAgICAgICAgICBleHBlY3QocmVzcG9uc2VCb2R5LnF1ZXVlLmxlbmd0aCkudG9CZUxlc3NUaGFuT3JFcXVhbCh0ZXN0RGF0YS5saW1pdCk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8vIEVhY2ggcXVldWUgaXRlbSBzaG91bGQgaGF2ZSByZXF1aXJlZCBmaWVsZHNcclxuICAgICAgICAgIHJlc3BvbnNlQm9keS5xdWV1ZS5mb3JFYWNoKChpdGVtOiBhbnkpID0+IHtcclxuICAgICAgICAgICAgZXhwZWN0KGl0ZW0uZXBpc29kZUlkKS50b0JlRGVmaW5lZCgpO1xyXG4gICAgICAgICAgICBleHBlY3QoaXRlbS5wYXRpZW50SWQpLnRvQmVEZWZpbmVkKCk7XHJcbiAgICAgICAgICAgIGV4cGVjdChpdGVtLmFsZXJ0SWQpLnRvQmVEZWZpbmVkKCk7XHJcbiAgICAgICAgICAgIGV4cGVjdChpdGVtLnNldmVyaXR5KS50b0JlRGVmaW5lZCgpO1xyXG4gICAgICAgICAgICBleHBlY3QoaXRlbS53YWl0VGltZSkudG9CZUdyZWF0ZXJUaGFuT3JFcXVhbCgwKTtcclxuICAgICAgICAgICAgZXhwZWN0KEFycmF5LmlzQXJyYXkoaXRlbS5hc3NpZ25lZFN1cGVydmlzb3JzKSkudG9CZSh0cnVlKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBpZiAodGVzdERhdGEuc3VwZXJ2aXNvcklkKSB7XHJcbiAgICAgICAgICAgIGV4cGVjdChyZXNwb25zZUJvZHkuc3VwZXJ2aXNvcklkKS50b0JlKHRlc3REYXRhLnN1cGVydmlzb3JJZCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICApLCB7IG51bVJ1bnM6IDI1IH0pO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcbn0pOyJdfQ==