"use strict";
// Unit tests for Emergency Alert System Lambda Handler
// Tests specific examples and integration points
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
const types_1 = require("../../../types");
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
    const mockEpisode = {
        episodeId: 'episode-123',
        patientId: 'patient-456',
        status: types_1.EpisodeStatus.ACTIVE,
        symptoms: {
            primaryComplaint: 'severe chest pain',
            duration: '30 minutes',
            severity: 9,
            associatedSymptoms: ['shortness of breath', 'nausea'],
            inputMethod: types_1.InputMethod.TEXT
        },
        triage: {
            urgencyLevel: types_1.UrgencyLevel.EMERGENCY,
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
            const event = {
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
            const result = await (0, index_1.handler)(event);
            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.message).toBe('Emergency alert processed successfully');
            expect(body.alertId).toBe('alert-789');
            expect(body.episodeId).toBe('episode-123');
            expect(body.notificationsSent).toBe(2);
        });
        it('should return 400 for missing required fields', async () => {
            const event = {
                httpMethod: 'POST',
                path: '/alert',
                body: JSON.stringify({
                    alertType: 'emergency_case'
                    // Missing episodeId
                })
            };
            const result = await (0, index_1.handler)(event);
            expect(result.statusCode).toBe(400);
            const body = JSON.parse(result.body);
            expect(body.error).toBe('Missing required fields: episodeId, alertType');
        });
        it('should handle service errors gracefully', async () => {
            const event = {
                httpMethod: 'POST',
                path: '/alert',
                body: JSON.stringify({
                    episodeId: 'episode-123',
                    alertType: 'emergency_case',
                    severity: 'high'
                })
            };
            const mockAlertService = require('../emergency-alert-service').EmergencyAlertService;
            mockAlertService.prototype.processEmergencyAlert = jest.fn().mockRejectedValue(new Error('Service unavailable'));
            const result = await (0, index_1.handler)(event);
            expect(result.statusCode).toBe(500);
            const body = JSON.parse(result.body);
            expect(body.error).toBe('Failed to process emergency alert');
        });
    });
    describe('POST /escalate - Emergency Escalation', () => {
        it('should process emergency escalation successfully', async () => {
            const event = {
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
            const result = await (0, index_1.handler)(event);
            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.message).toBe('Emergency escalation processed successfully');
            expect(body.escalationId).toBe('escalation-456');
            expect(body.targetLevel).toBe('level-2');
        });
        it('should return 400 for missing escalation reason', async () => {
            const event = {
                httpMethod: 'POST',
                path: '/escalate',
                body: JSON.stringify({
                    episodeId: 'episode-123'
                    // Missing escalationReason
                })
            };
            const result = await (0, index_1.handler)(event);
            expect(result.statusCode).toBe(400);
            const body = JSON.parse(result.body);
            expect(body.error).toBe('Missing required fields: episodeId, escalationReason');
        });
    });
    describe('POST / - Process Emergency Case', () => {
        it('should process emergency case with escalation assessment', async () => {
            const event = {
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
            const result = await (0, index_1.handler)(event);
            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.message).toBe('Emergency case processed successfully');
            expect(body.escalated).toBe(true);
        });
        it('should return 400 for non-emergency episode', async () => {
            const nonEmergencyEpisode = {
                ...mockEpisode,
                triage: {
                    ...mockEpisode.triage,
                    urgencyLevel: types_1.UrgencyLevel.ROUTINE
                }
            };
            const event = {
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
            const result = await (0, index_1.handler)(event);
            expect(result.statusCode).toBe(400);
            const body = JSON.parse(result.body);
            expect(body.error).toBe('Episode is not classified as emergency');
        });
        it('should return 404 for non-existent episode', async () => {
            const event = {
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
            const result = await (0, index_1.handler)(event);
            expect(result.statusCode).toBe(404);
            const body = JSON.parse(result.body);
            expect(body.error).toBe('Episode not found');
        });
    });
    describe('GET /:episodeId - Get Emergency Status', () => {
        it('should return emergency status for episode', async () => {
            const event = {
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
            const result = await (0, index_1.handler)(event);
            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.episodeId).toBe('episode-123');
            expect(body.isEmergency).toBe(true);
        });
    });
    describe('GET / - Get Emergency Queue', () => {
        it('should return emergency queue', async () => {
            const event = {
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
            const result = await (0, index_1.handler)(event);
            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.queue).toHaveLength(1);
            expect(body.supervisorId).toBe('emergency-supervisor-1');
        });
    });
    describe('PUT / - Update Emergency Response', () => {
        it('should update emergency response successfully', async () => {
            const event = {
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
            const result = await (0, index_1.handler)(event);
            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.message).toBe('Emergency response updated successfully');
            expect(body.responseAction).toBe('acknowledge');
        });
        it('should return 400 for missing required fields', async () => {
            const event = {
                httpMethod: 'PUT',
                body: JSON.stringify({
                    episodeId: 'episode-123'
                    // Missing supervisorId and responseAction
                })
            };
            const result = await (0, index_1.handler)(event);
            expect(result.statusCode).toBe(400);
            const body = JSON.parse(result.body);
            expect(body.error).toBe('Missing required fields: episodeId, supervisorId, responseAction');
        });
    });
    describe('Error Handling', () => {
        it('should return 405 for unsupported HTTP methods', async () => {
            const event = {
                httpMethod: 'DELETE'
            };
            const result = await (0, index_1.handler)(event);
            expect(result.statusCode).toBe(405);
            const body = JSON.parse(result.body);
            expect(body.error).toBe('Method not allowed');
        });
        it('should handle JSON parsing errors', async () => {
            const event = {
                httpMethod: 'POST',
                body: 'invalid json'
            };
            const result = await (0, index_1.handler)(event);
            expect(result.statusCode).toBe(500);
            const body = JSON.parse(result.body);
            expect(body.error).toBe('Internal server error in emergency alert system');
        });
        it('should include CORS headers in all responses', async () => {
            const event = {
                httpMethod: 'GET',
                pathParameters: {
                    episodeId: 'episode-123'
                }
            };
            const mockAlertService = require('../emergency-alert-service').EmergencyAlertService;
            mockAlertService.prototype.getEmergencyStatus = jest.fn().mockResolvedValue({});
            const result = await (0, index_1.handler)(event);
            expect(result.headers).toHaveProperty('Access-Control-Allow-Origin', '*');
            expect(result.headers).toHaveProperty('Content-Type', 'application/json');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9sYW1iZGEvZW1lcmdlbmN5LWFsZXJ0L19fdGVzdHNfXy9pbmRleC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSx1REFBdUQ7QUFDdkQsaURBQWlEOztBQUdqRCxvQ0FBbUM7QUFDbkMsMENBQW1GO0FBRW5GLHVCQUF1QjtBQUN2QixJQUFJLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLENBQUM7QUFDdEMsSUFBSSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0FBQ25DLElBQUksQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUVqQyxnQkFBZ0I7QUFDaEIsSUFBSSxDQUFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0FBQ3hDLElBQUksQ0FBQyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztBQUM1QyxJQUFJLENBQUMsSUFBSSxDQUFDLG1DQUFtQyxDQUFDLENBQUM7QUFFL0MsK0JBQStCO0FBQy9CLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEdBQUcsZUFBZSxDQUFDO0FBQ2pELE9BQU8sQ0FBQyxHQUFHLENBQUMseUJBQXlCLEdBQUcsMERBQTBELENBQUM7QUFDbkcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsR0FBRyx1REFBdUQsQ0FBQztBQUU3RixRQUFRLENBQUMsZ0NBQWdDLEVBQUUsR0FBRyxFQUFFO0lBQzlDLE1BQU0sV0FBVyxHQUFZO1FBQzNCLFNBQVMsRUFBRSxhQUFhO1FBQ3hCLFNBQVMsRUFBRSxhQUFhO1FBQ3hCLE1BQU0sRUFBRSxxQkFBYSxDQUFDLE1BQU07UUFDNUIsUUFBUSxFQUFFO1lBQ1IsZ0JBQWdCLEVBQUUsbUJBQW1CO1lBQ3JDLFFBQVEsRUFBRSxZQUFZO1lBQ3RCLFFBQVEsRUFBRSxDQUFDO1lBQ1gsa0JBQWtCLEVBQUUsQ0FBQyxxQkFBcUIsRUFBRSxR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QUFpQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBRWhGLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBQSxlQUFPLEVBQUMsS0FBNkIsQ0FBQyxDQUFDO1lBRTVELE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsY0FBYyxDQUFDLDZCQUE2QixFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzFFLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsY0FBYyxDQUFDLGNBQWMsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQzVFLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFVuaXQgdGVzdHMgZm9yIEVtZXJnZW5jeSBBbGVydCBTeXN0ZW0gTGFtYmRhIEhhbmRsZXJcclxuLy8gVGVzdHMgc3BlY2lmaWMgZXhhbXBsZXMgYW5kIGludGVncmF0aW9uIHBvaW50c1xyXG5cclxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgaGFuZGxlciB9IGZyb20gJy4uL2luZGV4JztcclxuaW1wb3J0IHsgRXBpc29kZSwgVXJnZW5jeUxldmVsLCBFcGlzb2RlU3RhdHVzLCBJbnB1dE1ldGhvZCB9IGZyb20gJy4uLy4uLy4uL3R5cGVzJztcclxuXHJcbi8vIE1vY2sgQVdTIFNESyBjbGllbnRzXHJcbmplc3QubW9jaygnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJyk7XHJcbmplc3QubW9jaygnQGF3cy1zZGsvbGliLWR5bmFtb2RiJyk7XHJcbmplc3QubW9jaygnQGF3cy1zZGsvY2xpZW50LXNucycpO1xyXG5cclxuLy8gTW9jayBzZXJ2aWNlc1xyXG5qZXN0Lm1vY2soJy4uL2VtZXJnZW5jeS1hbGVydC1zZXJ2aWNlJyk7XHJcbmplc3QubW9jaygnLi4vZXNjYWxhdGlvbi1wcm90b2NvbC1zZXJ2aWNlJyk7XHJcbmplc3QubW9jaygnLi4vZW1lcmdlbmN5LW5vdGlmaWNhdGlvbi1zZXJ2aWNlJyk7XHJcblxyXG4vLyBTZXQgdXAgZW52aXJvbm1lbnQgdmFyaWFibGVzXHJcbnByb2Nlc3MuZW52LkVQSVNPREVfVEFCTEVfTkFNRSA9ICd0ZXN0LWVwaXNvZGVzJztcclxucHJvY2Vzcy5lbnYuRU1FUkdFTkNZX0FMRVJUX1RPUElDX0FSTiA9ICdhcm46YXdzOnNuczp1cy1lYXN0LTE6MTIzNDU2Nzg5MDEyOnRlc3QtZW1lcmdlbmN5LWFsZXJ0cyc7XHJcbnByb2Nlc3MuZW52Lk5PVElGSUNBVElPTl9UT1BJQ19BUk4gPSAnYXJuOmF3czpzbnM6dXMtZWFzdC0xOjEyMzQ1Njc4OTAxMjp0ZXN0LW5vdGlmaWNhdGlvbnMnO1xyXG5cclxuZGVzY3JpYmUoJ0VtZXJnZW5jeSBBbGVydCBMYW1iZGEgSGFuZGxlcicsICgpID0+IHtcclxuICBjb25zdCBtb2NrRXBpc29kZTogRXBpc29kZSA9IHtcclxuICAgIGVwaXNvZGVJZDogJ2VwaXNvZGUtMTIzJyxcclxuICAgIHBhdGllbnRJZDogJ3BhdGllbnQtNDU2JyxcclxuICAgIHN0YXR1czogRXBpc29kZVN0YXR1cy5BQ1RJVkUsXHJcbiAgICBzeW1wdG9tczoge1xyXG4gICAgICBwcmltYXJ5Q29tcGxhaW50OiAnc2V2ZXJlIGNoZXN0IHBhaW4nLFxyXG4gICAgICBkdXJhdGlvbjogJzMwIG1pbnV0ZXMnLFxyXG4gICAgICBzZXZlcml0eTogOSxcclxuICAgICAgYXNzb2NpYXRlZFN5bXB0b21zOiBbJ3Nob3J0bmVzcyBvZiBicmVhdGgnLCAnbmF1c2VhJ10sXHJcbiAgICAgIGlucHV0TWV0aG9kOiBJbnB1dE1ldGhvZC5URVhUXHJcbiAgICB9LFxyXG4gICAgdHJpYWdlOiB7XHJcbiAgICAgIHVyZ2VuY3lMZXZlbDogVXJnZW5jeUxldmVsLkVNRVJHRU5DWSxcclxuICAgICAgcnVsZUJhc2VkU2NvcmU6IDk1LFxyXG4gICAgICBmaW5hbFNjb3JlOiA5NSxcclxuICAgICAgYWlBc3Nlc3NtZW50OiB7XHJcbiAgICAgICAgdXNlZDogdHJ1ZSxcclxuICAgICAgICBjb25maWRlbmNlOiAwLjksXHJcbiAgICAgICAgcmVhc29uaW5nOiAnSGlnaCBzZXZlcml0eSBjaGVzdCBwYWluIHdpdGggYXNzb2NpYXRlZCBzeW1wdG9tcyBzdWdnZXN0cyBjYXJkaWFjIGVtZXJnZW5jeSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIGludGVyYWN0aW9uczogW10sXHJcbiAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCcyMDI0LTAxLTAxVDEwOjAwOjAwWicpLFxyXG4gICAgdXBkYXRlZEF0OiBuZXcgRGF0ZSgnMjAyNC0wMS0wMVQxMDowMDowMFonKVxyXG4gIH07XHJcblxyXG4gIGJlZm9yZUVhY2goKCkgPT4ge1xyXG4gICAgamVzdC5jbGVhckFsbE1vY2tzKCk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdQT1NUIC9hbGVydCAtIEVtZXJnZW5jeSBBbGVydCBQcm9jZXNzaW5nJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCBwcm9jZXNzIGVtZXJnZW5jeSBhbGVydCBzdWNjZXNzZnVsbHknLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGV2ZW50OiBQYXJ0aWFsPEFQSUdhdGV3YXlQcm94eUV2ZW50PiA9IHtcclxuICAgICAgICBodHRwTWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgICAgcGF0aDogJy9hbGVydCcsXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXBpc29kZUlkOiAnZXBpc29kZS0xMjMnLFxyXG4gICAgICAgICAgYWxlcnRUeXBlOiAnZW1lcmdlbmN5X2Nhc2UnLFxyXG4gICAgICAgICAgc2V2ZXJpdHk6ICdoaWdoJyxcclxuICAgICAgICAgIGFkZGl0aW9uYWxJbmZvOiB7IHNvdXJjZTogJ3RyaWFnZV9lbmdpbmUnIH1cclxuICAgICAgICB9KVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8gTW9jayBzZXJ2aWNlIHJlc3BvbnNlc1xyXG4gICAgICBjb25zdCBtb2NrQWxlcnRTZXJ2aWNlID0gcmVxdWlyZSgnLi4vZW1lcmdlbmN5LWFsZXJ0LXNlcnZpY2UnKS5FbWVyZ2VuY3lBbGVydFNlcnZpY2U7XHJcbiAgICAgIGNvbnN0IG1vY2tOb3RpZmljYXRpb25TZXJ2aWNlID0gcmVxdWlyZSgnLi4vZW1lcmdlbmN5LW5vdGlmaWNhdGlvbi1zZXJ2aWNlJykuRW1lcmdlbmN5Tm90aWZpY2F0aW9uU2VydmljZTtcclxuXHJcbiAgICAgIG1vY2tBbGVydFNlcnZpY2UucHJvdG90eXBlLnByb2Nlc3NFbWVyZ2VuY3lBbGVydCA9IGplc3QuZm4oKS5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcbiAgICAgICAgYWxlcnRJZDogJ2FsZXJ0LTc4OScsXHJcbiAgICAgICAgZXBpc29kZTogbW9ja0VwaXNvZGUsXHJcbiAgICAgICAgYWxlcnREZXRhaWxzOiB7XHJcbiAgICAgICAgICBhbGVydElkOiAnYWxlcnQtNzg5JyxcclxuICAgICAgICAgIGVwaXNvZGVJZDogJ2VwaXNvZGUtMTIzJyxcclxuICAgICAgICAgIGFsZXJ0VHlwZTogJ2VtZXJnZW5jeV9jYXNlJyxcclxuICAgICAgICAgIHNldmVyaXR5OiAnaGlnaCcsXHJcbiAgICAgICAgICBhc3NpZ25lZFN1cGVydmlzb3JzOiBbJ2VtZXJnZW5jeS1zdXBlcnZpc29yLTEnLCAnZW1lcmdlbmN5LXN1cGVydmlzb3ItMiddXHJcbiAgICAgICAgfSxcclxuICAgICAgICBub3RpZmljYXRpb25zU2VudDogMixcclxuICAgICAgICBlc3RpbWF0ZWRSZXNwb25zZVRpbWU6IDUsXHJcbiAgICAgICAgc2V2ZXJpdHk6ICdoaWdoJ1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIG1vY2tOb3RpZmljYXRpb25TZXJ2aWNlLnByb3RvdHlwZS5zZW5kSW1tZWRpYXRlQWxlcnQgPSBqZXN0LmZuKCkubW9ja1Jlc29sdmVkVmFsdWUodW5kZWZpbmVkKTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQgYXMgQVBJR2F0ZXdheVByb3h5RXZlbnQpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDIwMCk7XHJcbiAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcclxuICAgICAgZXhwZWN0KGJvZHkubWVzc2FnZSkudG9CZSgnRW1lcmdlbmN5IGFsZXJ0IHByb2Nlc3NlZCBzdWNjZXNzZnVsbHknKTtcclxuICAgICAgZXhwZWN0KGJvZHkuYWxlcnRJZCkudG9CZSgnYWxlcnQtNzg5Jyk7XHJcbiAgICAgIGV4cGVjdChib2R5LmVwaXNvZGVJZCkudG9CZSgnZXBpc29kZS0xMjMnKTtcclxuICAgICAgZXhwZWN0KGJvZHkubm90aWZpY2F0aW9uc1NlbnQpLnRvQmUoMik7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIHJldHVybiA0MDAgZm9yIG1pc3NpbmcgcmVxdWlyZWQgZmllbGRzJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBldmVudDogUGFydGlhbDxBUElHYXRld2F5UHJveHlFdmVudD4gPSB7XHJcbiAgICAgICAgaHR0cE1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgIHBhdGg6ICcvYWxlcnQnLFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGFsZXJ0VHlwZTogJ2VtZXJnZW5jeV9jYXNlJ1xyXG4gICAgICAgICAgLy8gTWlzc2luZyBlcGlzb2RlSWRcclxuICAgICAgICB9KVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCBhcyBBUElHYXRld2F5UHJveHlFdmVudCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNDAwKTtcclxuICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xyXG4gICAgICBleHBlY3QoYm9keS5lcnJvcikudG9CZSgnTWlzc2luZyByZXF1aXJlZCBmaWVsZHM6IGVwaXNvZGVJZCwgYWxlcnRUeXBlJyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGhhbmRsZSBzZXJ2aWNlIGVycm9ycyBncmFjZWZ1bGx5JywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBldmVudDogUGFydGlhbDxBUElHYXRld2F5UHJveHlFdmVudD4gPSB7XHJcbiAgICAgICAgaHR0cE1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgIHBhdGg6ICcvYWxlcnQnLFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVwaXNvZGVJZDogJ2VwaXNvZGUtMTIzJyxcclxuICAgICAgICAgIGFsZXJ0VHlwZTogJ2VtZXJnZW5jeV9jYXNlJyxcclxuICAgICAgICAgIHNldmVyaXR5OiAnaGlnaCdcclxuICAgICAgICB9KVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgbW9ja0FsZXJ0U2VydmljZSA9IHJlcXVpcmUoJy4uL2VtZXJnZW5jeS1hbGVydC1zZXJ2aWNlJykuRW1lcmdlbmN5QWxlcnRTZXJ2aWNlO1xyXG4gICAgICBtb2NrQWxlcnRTZXJ2aWNlLnByb3RvdHlwZS5wcm9jZXNzRW1lcmdlbmN5QWxlcnQgPSBqZXN0LmZuKCkubW9ja1JlamVjdGVkVmFsdWUoXHJcbiAgICAgICAgbmV3IEVycm9yKCdTZXJ2aWNlIHVuYXZhaWxhYmxlJylcclxuICAgICAgKTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQgYXMgQVBJR2F0ZXdheVByb3h5RXZlbnQpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDUwMCk7XHJcbiAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcclxuICAgICAgZXhwZWN0KGJvZHkuZXJyb3IpLnRvQmUoJ0ZhaWxlZCB0byBwcm9jZXNzIGVtZXJnZW5jeSBhbGVydCcpO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdQT1NUIC9lc2NhbGF0ZSAtIEVtZXJnZW5jeSBFc2NhbGF0aW9uJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCBwcm9jZXNzIGVtZXJnZW5jeSBlc2NhbGF0aW9uIHN1Y2Nlc3NmdWxseScsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgZXZlbnQ6IFBhcnRpYWw8QVBJR2F0ZXdheVByb3h5RXZlbnQ+ID0ge1xyXG4gICAgICAgIGh0dHBNZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICBwYXRoOiAnL2VzY2FsYXRlJyxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcGlzb2RlSWQ6ICdlcGlzb2RlLTEyMycsXHJcbiAgICAgICAgICBlc2NhbGF0aW9uUmVhc29uOiAnVGltZW91dCBleGNlZWRlZCcsXHJcbiAgICAgICAgICB0YXJnZXRMZXZlbDogJ2xldmVsLTInLFxyXG4gICAgICAgICAgdXJnZW50UmVzcG9uc2U6IHRydWVcclxuICAgICAgICB9KVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgbW9ja0VzY2FsYXRpb25TZXJ2aWNlID0gcmVxdWlyZSgnLi4vZXNjYWxhdGlvbi1wcm90b2NvbC1zZXJ2aWNlJykuRXNjYWxhdGlvblByb3RvY29sU2VydmljZTtcclxuICAgICAgY29uc3QgbW9ja05vdGlmaWNhdGlvblNlcnZpY2UgPSByZXF1aXJlKCcuLi9lbWVyZ2VuY3ktbm90aWZpY2F0aW9uLXNlcnZpY2UnKS5FbWVyZ2VuY3lOb3RpZmljYXRpb25TZXJ2aWNlO1xyXG5cclxuICAgICAgbW9ja0VzY2FsYXRpb25TZXJ2aWNlLnByb3RvdHlwZS5wcm9jZXNzRXNjYWxhdGlvbiA9IGplc3QuZm4oKS5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcbiAgICAgICAgZXNjYWxhdGlvbklkOiAnZXNjYWxhdGlvbi00NTYnLFxyXG4gICAgICAgIGVwaXNvZGU6IG1vY2tFcGlzb2RlLFxyXG4gICAgICAgIGVzY2FsYXRpb25EZXRhaWxzOiB7XHJcbiAgICAgICAgICBlc2NhbGF0aW9uSWQ6ICdlc2NhbGF0aW9uLTQ1NicsXHJcbiAgICAgICAgICBlc2NhbGF0aW9uTGV2ZWw6ICdsZXZlbC0yJyxcclxuICAgICAgICAgIGFzc2lnbmVkU3VwZXJ2aXNvcnM6IFsnc2VuaW9yLXN1cGVydmlzb3ItMScsICdzZW5pb3Itc3VwZXJ2aXNvci0yJ11cclxuICAgICAgICB9LFxyXG4gICAgICAgIHRhcmdldExldmVsOiAnbGV2ZWwtMicsXHJcbiAgICAgICAgYXNzaWduZWRTdXBlcnZpc29yczogWydzZW5pb3Itc3VwZXJ2aXNvci0xJywgJ3Nlbmlvci1zdXBlcnZpc29yLTInXSxcclxuICAgICAgICBleHBlY3RlZFJlc3BvbnNlVGltZTogMTBcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBtb2NrTm90aWZpY2F0aW9uU2VydmljZS5wcm90b3R5cGUuc2VuZEVzY2FsYXRpb25BbGVydCA9IGplc3QuZm4oKS5tb2NrUmVzb2x2ZWRWYWx1ZSh1bmRlZmluZWQpO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCBhcyBBUElHYXRld2F5UHJveHlFdmVudCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcclxuICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xyXG4gICAgICBleHBlY3QoYm9keS5tZXNzYWdlKS50b0JlKCdFbWVyZ2VuY3kgZXNjYWxhdGlvbiBwcm9jZXNzZWQgc3VjY2Vzc2Z1bGx5Jyk7XHJcbiAgICAgIGV4cGVjdChib2R5LmVzY2FsYXRpb25JZCkudG9CZSgnZXNjYWxhdGlvbi00NTYnKTtcclxuICAgICAgZXhwZWN0KGJvZHkudGFyZ2V0TGV2ZWwpLnRvQmUoJ2xldmVsLTInKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgcmV0dXJuIDQwMCBmb3IgbWlzc2luZyBlc2NhbGF0aW9uIHJlYXNvbicsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgZXZlbnQ6IFBhcnRpYWw8QVBJR2F0ZXdheVByb3h5RXZlbnQ+ID0ge1xyXG4gICAgICAgIGh0dHBNZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICBwYXRoOiAnL2VzY2FsYXRlJyxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcGlzb2RlSWQ6ICdlcGlzb2RlLTEyMydcclxuICAgICAgICAgIC8vIE1pc3NpbmcgZXNjYWxhdGlvblJlYXNvblxyXG4gICAgICAgIH0pXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50IGFzIEFQSUdhdGV3YXlQcm94eUV2ZW50KTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSg0MDApO1xyXG4gICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShyZXN1bHQuYm9keSk7XHJcbiAgICAgIGV4cGVjdChib2R5LmVycm9yKS50b0JlKCdNaXNzaW5nIHJlcXVpcmVkIGZpZWxkczogZXBpc29kZUlkLCBlc2NhbGF0aW9uUmVhc29uJyk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ1BPU1QgLyAtIFByb2Nlc3MgRW1lcmdlbmN5IENhc2UnLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIHByb2Nlc3MgZW1lcmdlbmN5IGNhc2Ugd2l0aCBlc2NhbGF0aW9uIGFzc2Vzc21lbnQnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGV2ZW50OiBQYXJ0aWFsPEFQSUdhdGV3YXlQcm94eUV2ZW50PiA9IHtcclxuICAgICAgICBodHRwTWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXBpc29kZUlkOiAnZXBpc29kZS0xMjMnXHJcbiAgICAgICAgfSlcclxuICAgICAgfTtcclxuXHJcbiAgICAgIC8vIE1vY2sgRHluYW1vREIgcmVzcG9uc2VcclxuICAgICAgY29uc3QgbW9ja0RvY0NsaWVudCA9IHtcclxuICAgICAgICBzZW5kOiBqZXN0LmZuKCkubW9ja1Jlc29sdmVkVmFsdWUoe1xyXG4gICAgICAgICAgSXRlbTogbW9ja0VwaXNvZGVcclxuICAgICAgICB9KVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgbW9ja0FsZXJ0U2VydmljZSA9IHJlcXVpcmUoJy4uL2VtZXJnZW5jeS1hbGVydC1zZXJ2aWNlJykuRW1lcmdlbmN5QWxlcnRTZXJ2aWNlO1xyXG4gICAgICBjb25zdCBtb2NrRXNjYWxhdGlvblNlcnZpY2UgPSByZXF1aXJlKCcuLi9lc2NhbGF0aW9uLXByb3RvY29sLXNlcnZpY2UnKS5Fc2NhbGF0aW9uUHJvdG9jb2xTZXJ2aWNlO1xyXG4gICAgICBjb25zdCBtb2NrTm90aWZpY2F0aW9uU2VydmljZSA9IHJlcXVpcmUoJy4uL2VtZXJnZW5jeS1ub3RpZmljYXRpb24tc2VydmljZScpLkVtZXJnZW5jeU5vdGlmaWNhdGlvblNlcnZpY2U7XHJcblxyXG4gICAgICBtb2NrQWxlcnRTZXJ2aWNlLnByb3RvdHlwZS5wcm9jZXNzRW1lcmdlbmN5QWxlcnQgPSBqZXN0LmZuKCkubW9ja1Jlc29sdmVkVmFsdWUoe1xyXG4gICAgICAgIGFsZXJ0SWQ6ICdhbGVydC03ODknLFxyXG4gICAgICAgIGVwaXNvZGU6IG1vY2tFcGlzb2RlLFxyXG4gICAgICAgIGFsZXJ0RGV0YWlsczogeyBhbGVydElkOiAnYWxlcnQtNzg5JyB9LFxyXG4gICAgICAgIG5vdGlmaWNhdGlvbnNTZW50OiAyLFxyXG4gICAgICAgIGVzdGltYXRlZFJlc3BvbnNlVGltZTogNVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIG1vY2tFc2NhbGF0aW9uU2VydmljZS5wcm90b3R5cGUuYXNzZXNzRXNjYWxhdGlvbk5lZWQgPSBqZXN0LmZuKCkubW9ja1Jlc29sdmVkVmFsdWUoe1xyXG4gICAgICAgIHJlcXVpcmVkOiB0cnVlLFxyXG4gICAgICAgIHJlYXNvbjogJ0NyaXRpY2FsIHN5bXB0b21zIGRldGVjdGVkJyxcclxuICAgICAgICB0YXJnZXRMZXZlbDogJ2xldmVsLTInLFxyXG4gICAgICAgIHVyZ2VudFJlc3BvbnNlOiB0cnVlXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgbW9ja0VzY2FsYXRpb25TZXJ2aWNlLnByb3RvdHlwZS5wcm9jZXNzRXNjYWxhdGlvbiA9IGplc3QuZm4oKS5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcbiAgICAgICAgZXNjYWxhdGlvbklkOiAnZXNjYWxhdGlvbi00NTYnLFxyXG4gICAgICAgIGVzY2FsYXRpb25EZXRhaWxzOiB7IGVzY2FsYXRpb25JZDogJ2VzY2FsYXRpb24tNDU2JyB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgbW9ja05vdGlmaWNhdGlvblNlcnZpY2UucHJvdG90eXBlLnNlbmRJbW1lZGlhdGVBbGVydCA9IGplc3QuZm4oKS5tb2NrUmVzb2x2ZWRWYWx1ZSh1bmRlZmluZWQpO1xyXG4gICAgICBtb2NrTm90aWZpY2F0aW9uU2VydmljZS5wcm90b3R5cGUuc2VuZEVzY2FsYXRpb25BbGVydCA9IGplc3QuZm4oKS5tb2NrUmVzb2x2ZWRWYWx1ZSh1bmRlZmluZWQpO1xyXG5cclxuICAgICAgLy8gTW9jayB0aGUgZ2V0RXBpc29kZSBmdW5jdGlvblxyXG4gICAgICBqZXN0LmRvTW9jaygnQGF3cy1zZGsvbGliLWR5bmFtb2RiJywgKCkgPT4gKHtcclxuICAgICAgICBEeW5hbW9EQkRvY3VtZW50Q2xpZW50OiB7XHJcbiAgICAgICAgICBmcm9tOiBqZXN0LmZuKCkubW9ja1JldHVyblZhbHVlKG1vY2tEb2NDbGllbnQpXHJcbiAgICAgICAgfSxcclxuICAgICAgICBHZXRDb21tYW5kOiBqZXN0LmZuKClcclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCBhcyBBUElHYXRld2F5UHJveHlFdmVudCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcclxuICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xyXG4gICAgICBleHBlY3QoYm9keS5tZXNzYWdlKS50b0JlKCdFbWVyZ2VuY3kgY2FzZSBwcm9jZXNzZWQgc3VjY2Vzc2Z1bGx5Jyk7XHJcbiAgICAgIGV4cGVjdChib2R5LmVzY2FsYXRlZCkudG9CZSh0cnVlKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgcmV0dXJuIDQwMCBmb3Igbm9uLWVtZXJnZW5jeSBlcGlzb2RlJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBub25FbWVyZ2VuY3lFcGlzb2RlID0ge1xyXG4gICAgICAgIC4uLm1vY2tFcGlzb2RlLFxyXG4gICAgICAgIHRyaWFnZToge1xyXG4gICAgICAgICAgLi4ubW9ja0VwaXNvZGUudHJpYWdlISxcclxuICAgICAgICAgIHVyZ2VuY3lMZXZlbDogVXJnZW5jeUxldmVsLlJPVVRJTkVcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCBldmVudDogUGFydGlhbDxBUElHYXRld2F5UHJveHlFdmVudD4gPSB7XHJcbiAgICAgICAgaHR0cE1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVwaXNvZGVJZDogJ2VwaXNvZGUtMTIzJ1xyXG4gICAgICAgIH0pXHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBNb2NrIER5bmFtb0RCIHJlc3BvbnNlXHJcbiAgICAgIGNvbnN0IG1vY2tEb2NDbGllbnQgPSB7XHJcbiAgICAgICAgc2VuZDogamVzdC5mbigpLm1vY2tSZXNvbHZlZFZhbHVlKHtcclxuICAgICAgICAgIEl0ZW06IG5vbkVtZXJnZW5jeUVwaXNvZGVcclxuICAgICAgICB9KVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgamVzdC5kb01vY2soJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYicsICgpID0+ICh7XHJcbiAgICAgICAgRHluYW1vREJEb2N1bWVudENsaWVudDoge1xyXG4gICAgICAgICAgZnJvbTogamVzdC5mbigpLm1vY2tSZXR1cm5WYWx1ZShtb2NrRG9jQ2xpZW50KVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgR2V0Q29tbWFuZDogamVzdC5mbigpXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQgYXMgQVBJR2F0ZXdheVByb3h5RXZlbnQpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDQwMCk7XHJcbiAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcclxuICAgICAgZXhwZWN0KGJvZHkuZXJyb3IpLnRvQmUoJ0VwaXNvZGUgaXMgbm90IGNsYXNzaWZpZWQgYXMgZW1lcmdlbmN5Jyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIHJldHVybiA0MDQgZm9yIG5vbi1leGlzdGVudCBlcGlzb2RlJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBldmVudDogUGFydGlhbDxBUElHYXRld2F5UHJveHlFdmVudD4gPSB7XHJcbiAgICAgICAgaHR0cE1ldGhvZDogJ1BPU1QnLFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVwaXNvZGVJZDogJ25vbi1leGlzdGVudC1lcGlzb2RlJ1xyXG4gICAgICAgIH0pXHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBNb2NrIER5bmFtb0RCIHJlc3BvbnNlXHJcbiAgICAgIGNvbnN0IG1vY2tEb2NDbGllbnQgPSB7XHJcbiAgICAgICAgc2VuZDogamVzdC5mbigpLm1vY2tSZXNvbHZlZFZhbHVlKHtcclxuICAgICAgICAgIEl0ZW06IG51bGxcclxuICAgICAgICB9KVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgamVzdC5kb01vY2soJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYicsICgpID0+ICh7XHJcbiAgICAgICAgRHluYW1vREJEb2N1bWVudENsaWVudDoge1xyXG4gICAgICAgICAgZnJvbTogamVzdC5mbigpLm1vY2tSZXR1cm5WYWx1ZShtb2NrRG9jQ2xpZW50KVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgR2V0Q29tbWFuZDogamVzdC5mbigpXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQgYXMgQVBJR2F0ZXdheVByb3h5RXZlbnQpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDQwNCk7XHJcbiAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcclxuICAgICAgZXhwZWN0KGJvZHkuZXJyb3IpLnRvQmUoJ0VwaXNvZGUgbm90IGZvdW5kJyk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ0dFVCAvOmVwaXNvZGVJZCAtIEdldCBFbWVyZ2VuY3kgU3RhdHVzJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gZW1lcmdlbmN5IHN0YXR1cyBmb3IgZXBpc29kZScsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgZXZlbnQ6IFBhcnRpYWw8QVBJR2F0ZXdheVByb3h5RXZlbnQ+ID0ge1xyXG4gICAgICAgIGh0dHBNZXRob2Q6ICdHRVQnLFxyXG4gICAgICAgIHBhdGhQYXJhbWV0ZXJzOiB7XHJcbiAgICAgICAgICBlcGlzb2RlSWQ6ICdlcGlzb2RlLTEyMydcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCBtb2NrQWxlcnRTZXJ2aWNlID0gcmVxdWlyZSgnLi4vZW1lcmdlbmN5LWFsZXJ0LXNlcnZpY2UnKS5FbWVyZ2VuY3lBbGVydFNlcnZpY2U7XHJcbiAgICAgIG1vY2tBbGVydFNlcnZpY2UucHJvdG90eXBlLmdldEVtZXJnZW5jeVN0YXR1cyA9IGplc3QuZm4oKS5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcbiAgICAgICAgZXBpc29kZUlkOiAnZXBpc29kZS0xMjMnLFxyXG4gICAgICAgIGlzRW1lcmdlbmN5OiB0cnVlLFxyXG4gICAgICAgIGFjdGl2ZUFsZXJ0czogW10sXHJcbiAgICAgICAgcmVzcG9uc2VTdGF0dXM6ICdwZW5kaW5nJyxcclxuICAgICAgICBhc3NpZ25lZFN1cGVydmlzb3JzOiBbJ2VtZXJnZW5jeS1zdXBlcnZpc29yLTEnXSxcclxuICAgICAgICBlc3RpbWF0ZWRSZXNwb25zZVRpbWU6IDVcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50IGFzIEFQSUdhdGV3YXlQcm94eUV2ZW50KTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSgyMDApO1xyXG4gICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShyZXN1bHQuYm9keSk7XHJcbiAgICAgIGV4cGVjdChib2R5LmVwaXNvZGVJZCkudG9CZSgnZXBpc29kZS0xMjMnKTtcclxuICAgICAgZXhwZWN0KGJvZHkuaXNFbWVyZ2VuY3kpLnRvQmUodHJ1ZSk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ0dFVCAvIC0gR2V0IEVtZXJnZW5jeSBRdWV1ZScsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgcmV0dXJuIGVtZXJnZW5jeSBxdWV1ZScsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgZXZlbnQ6IFBhcnRpYWw8QVBJR2F0ZXdheVByb3h5RXZlbnQ+ID0ge1xyXG4gICAgICAgIGh0dHBNZXRob2Q6ICdHRVQnLFxyXG4gICAgICAgIHF1ZXJ5U3RyaW5nUGFyYW1ldGVyczoge1xyXG4gICAgICAgICAgc3VwZXJ2aXNvcklkOiAnZW1lcmdlbmN5LXN1cGVydmlzb3ItMScsXHJcbiAgICAgICAgICBsaW1pdDogJzEwJ1xyXG4gICAgICAgIH1cclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnN0IG1vY2tBbGVydFNlcnZpY2UgPSByZXF1aXJlKCcuLi9lbWVyZ2VuY3ktYWxlcnQtc2VydmljZScpLkVtZXJnZW5jeUFsZXJ0U2VydmljZTtcclxuICAgICAgbW9ja0FsZXJ0U2VydmljZS5wcm90b3R5cGUuZ2V0RW1lcmdlbmN5UXVldWUgPSBqZXN0LmZuKCkubW9ja1Jlc29sdmVkVmFsdWUoW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIGVwaXNvZGVJZDogJ2VwaXNvZGUtMTIzJyxcclxuICAgICAgICAgIGFsZXJ0SWQ6ICdhbGVydC03ODknLFxyXG4gICAgICAgICAgc2V2ZXJpdHk6ICdoaWdoJyxcclxuICAgICAgICAgIHdhaXRUaW1lOiA1XHJcbiAgICAgICAgfVxyXG4gICAgICBdKTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQgYXMgQVBJR2F0ZXdheVByb3h5RXZlbnQpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDIwMCk7XHJcbiAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcclxuICAgICAgZXhwZWN0KGJvZHkucXVldWUpLnRvSGF2ZUxlbmd0aCgxKTtcclxuICAgICAgZXhwZWN0KGJvZHkuc3VwZXJ2aXNvcklkKS50b0JlKCdlbWVyZ2VuY3ktc3VwZXJ2aXNvci0xJyk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ1BVVCAvIC0gVXBkYXRlIEVtZXJnZW5jeSBSZXNwb25zZScsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgdXBkYXRlIGVtZXJnZW5jeSByZXNwb25zZSBzdWNjZXNzZnVsbHknLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGV2ZW50OiBQYXJ0aWFsPEFQSUdhdGV3YXlQcm94eUV2ZW50PiA9IHtcclxuICAgICAgICBodHRwTWV0aG9kOiAnUFVUJyxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcGlzb2RlSWQ6ICdlcGlzb2RlLTEyMycsXHJcbiAgICAgICAgICBzdXBlcnZpc29ySWQ6ICdlbWVyZ2VuY3ktc3VwZXJ2aXNvci0xJyxcclxuICAgICAgICAgIHJlc3BvbnNlQWN0aW9uOiAnYWNrbm93bGVkZ2UnLFxyXG4gICAgICAgICAgbm90ZXM6ICdSZXNwb25kaW5nIHRvIGVtZXJnZW5jeSdcclxuICAgICAgICB9KVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgbW9ja0FsZXJ0U2VydmljZSA9IHJlcXVpcmUoJy4uL2VtZXJnZW5jeS1hbGVydC1zZXJ2aWNlJykuRW1lcmdlbmN5QWxlcnRTZXJ2aWNlO1xyXG4gICAgICBjb25zdCBtb2NrTm90aWZpY2F0aW9uU2VydmljZSA9IHJlcXVpcmUoJy4uL2VtZXJnZW5jeS1ub3RpZmljYXRpb24tc2VydmljZScpLkVtZXJnZW5jeU5vdGlmaWNhdGlvblNlcnZpY2U7XHJcblxyXG4gICAgICBtb2NrQWxlcnRTZXJ2aWNlLnByb3RvdHlwZS51cGRhdGVFbWVyZ2VuY3lSZXNwb25zZSA9IGplc3QuZm4oKS5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcbiAgICAgICAgZXBpc29kZTogbW9ja0VwaXNvZGUsXHJcbiAgICAgICAgcmVzcG9uc2VEZXRhaWxzOiB7XHJcbiAgICAgICAgICBzdXBlcnZpc29ySWQ6ICdlbWVyZ2VuY3ktc3VwZXJ2aXNvci0xJyxcclxuICAgICAgICAgIHJlc3BvbnNlQWN0aW9uOiAnYWNrbm93bGVkZ2UnLFxyXG4gICAgICAgICAgbm90ZXM6ICdSZXNwb25kaW5nIHRvIGVtZXJnZW5jeSdcclxuICAgICAgICB9LFxyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIG1vY2tOb3RpZmljYXRpb25TZXJ2aWNlLnByb3RvdHlwZS5zZW5kUmVzcG9uc2VDb25maXJtYXRpb24gPSBqZXN0LmZuKCkubW9ja1Jlc29sdmVkVmFsdWUodW5kZWZpbmVkKTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQgYXMgQVBJR2F0ZXdheVByb3h5RXZlbnQpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDIwMCk7XHJcbiAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcclxuICAgICAgZXhwZWN0KGJvZHkubWVzc2FnZSkudG9CZSgnRW1lcmdlbmN5IHJlc3BvbnNlIHVwZGF0ZWQgc3VjY2Vzc2Z1bGx5Jyk7XHJcbiAgICAgIGV4cGVjdChib2R5LnJlc3BvbnNlQWN0aW9uKS50b0JlKCdhY2tub3dsZWRnZScpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gNDAwIGZvciBtaXNzaW5nIHJlcXVpcmVkIGZpZWxkcycsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgZXZlbnQ6IFBhcnRpYWw8QVBJR2F0ZXdheVByb3h5RXZlbnQ+ID0ge1xyXG4gICAgICAgIGh0dHBNZXRob2Q6ICdQVVQnLFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVwaXNvZGVJZDogJ2VwaXNvZGUtMTIzJ1xyXG4gICAgICAgICAgLy8gTWlzc2luZyBzdXBlcnZpc29ySWQgYW5kIHJlc3BvbnNlQWN0aW9uXHJcbiAgICAgICAgfSlcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQgYXMgQVBJR2F0ZXdheVByb3h5RXZlbnQpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDQwMCk7XHJcbiAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcclxuICAgICAgZXhwZWN0KGJvZHkuZXJyb3IpLnRvQmUoJ01pc3NpbmcgcmVxdWlyZWQgZmllbGRzOiBlcGlzb2RlSWQsIHN1cGVydmlzb3JJZCwgcmVzcG9uc2VBY3Rpb24nKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnRXJyb3IgSGFuZGxpbmcnLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIHJldHVybiA0MDUgZm9yIHVuc3VwcG9ydGVkIEhUVFAgbWV0aG9kcycsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgZXZlbnQ6IFBhcnRpYWw8QVBJR2F0ZXdheVByb3h5RXZlbnQ+ID0ge1xyXG4gICAgICAgIGh0dHBNZXRob2Q6ICdERUxFVEUnXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50IGFzIEFQSUdhdGV3YXlQcm94eUV2ZW50KTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSg0MDUpO1xyXG4gICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShyZXN1bHQuYm9keSk7XHJcbiAgICAgIGV4cGVjdChib2R5LmVycm9yKS50b0JlKCdNZXRob2Qgbm90IGFsbG93ZWQnKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgaGFuZGxlIEpTT04gcGFyc2luZyBlcnJvcnMnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGV2ZW50OiBQYXJ0aWFsPEFQSUdhdGV3YXlQcm94eUV2ZW50PiA9IHtcclxuICAgICAgICBodHRwTWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgICAgYm9keTogJ2ludmFsaWQganNvbidcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQgYXMgQVBJR2F0ZXdheVByb3h5RXZlbnQpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDUwMCk7XHJcbiAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcclxuICAgICAgZXhwZWN0KGJvZHkuZXJyb3IpLnRvQmUoJ0ludGVybmFsIHNlcnZlciBlcnJvciBpbiBlbWVyZ2VuY3kgYWxlcnQgc3lzdGVtJyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGluY2x1ZGUgQ09SUyBoZWFkZXJzIGluIGFsbCByZXNwb25zZXMnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGV2ZW50OiBQYXJ0aWFsPEFQSUdhdGV3YXlQcm94eUV2ZW50PiA9IHtcclxuICAgICAgICBodHRwTWV0aG9kOiAnR0VUJyxcclxuICAgICAgICBwYXRoUGFyYW1ldGVyczoge1xyXG4gICAgICAgICAgZXBpc29kZUlkOiAnZXBpc29kZS0xMjMnXHJcbiAgICAgICAgfVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgbW9ja0FsZXJ0U2VydmljZSA9IHJlcXVpcmUoJy4uL2VtZXJnZW5jeS1hbGVydC1zZXJ2aWNlJykuRW1lcmdlbmN5QWxlcnRTZXJ2aWNlO1xyXG4gICAgICBtb2NrQWxlcnRTZXJ2aWNlLnByb3RvdHlwZS5nZXRFbWVyZ2VuY3lTdGF0dXMgPSBqZXN0LmZuKCkubW9ja1Jlc29sdmVkVmFsdWUoe30pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCBhcyBBUElHYXRld2F5UHJveHlFdmVudCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LmhlYWRlcnMpLnRvSGF2ZVByb3BlcnR5KCdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nLCAnKicpO1xyXG4gICAgICBleHBlY3QocmVzdWx0LmhlYWRlcnMpLnRvSGF2ZVByb3BlcnR5KCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcbn0pOyJdfQ==