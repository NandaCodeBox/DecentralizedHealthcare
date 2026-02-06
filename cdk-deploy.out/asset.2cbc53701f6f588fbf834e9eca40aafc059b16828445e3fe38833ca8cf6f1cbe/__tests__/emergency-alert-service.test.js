"use strict";
// Unit tests for Emergency Alert Service
// Tests specific examples and edge cases
Object.defineProperty(exports, "__esModule", { value: true });
const emergency_alert_service_1 = require("../emergency-alert-service");
const types_1 = require("../../../types");
// Mock AWS SDK clients
const mockDocClient = {
    send: jest.fn()
};
const mockSNSClient = {
    send: jest.fn()
};
describe('EmergencyAlertService', () => {
    let service;
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
        service = new emergency_alert_service_1.EmergencyAlertService(mockDocClient, mockSNSClient, 'test-episodes', 'arn:aws:sns:us-east-1:123456789012:test-emergency-alerts');
        jest.clearAllMocks();
    });
    describe('processEmergencyAlert', () => {
        it('should process emergency alert for critical severity', async () => {
            // Mock DynamoDB get episode
            mockDocClient.send.mockResolvedValueOnce({
                Item: mockEpisode
            });
            // Mock DynamoDB put alert (will fail and fallback to episode update)
            mockDocClient.send.mockRejectedValueOnce(new Error('Table not found'));
            // Mock episode update with alert
            mockDocClient.send.mockResolvedValueOnce({});
            // Mock episode emergency status update
            mockDocClient.send.mockResolvedValueOnce({});
            const result = await service.processEmergencyAlert('episode-123', 'cardiac_emergency', 'critical', { source: 'triage_engine' });
            expect(result.episode).toEqual(mockEpisode);
            expect(result.alertDetails.severity).toBe('critical');
            expect(result.alertDetails.assignedSupervisors).toHaveLength(3); // All supervisors for critical
            expect(result.estimatedResponseTime).toBe(2); // Critical response time
            expect(result.notificationsSent).toBe(3);
        });
        it('should process emergency alert for high severity', async () => {
            mockDocClient.send.mockResolvedValueOnce({
                Item: mockEpisode
            });
            mockDocClient.send.mockRejectedValueOnce(new Error('Table not found'));
            mockDocClient.send.mockResolvedValueOnce({});
            mockDocClient.send.mockResolvedValueOnce({});
            const result = await service.processEmergencyAlert('episode-123', 'emergency_case', 'high');
            expect(result.alertDetails.severity).toBe('high');
            expect(result.alertDetails.assignedSupervisors).toHaveLength(2); // First 2 supervisors for high
            expect(result.estimatedResponseTime).toBe(5); // High response time
        });
        it('should process emergency alert for medium severity', async () => {
            mockDocClient.send.mockResolvedValueOnce({
                Item: mockEpisode
            });
            mockDocClient.send.mockRejectedValueOnce(new Error('Table not found'));
            mockDocClient.send.mockResolvedValueOnce({});
            mockDocClient.send.mockResolvedValueOnce({});
            const result = await service.processEmergencyAlert('episode-123', 'emergency_case', 'medium');
            expect(result.alertDetails.severity).toBe('medium');
            expect(result.alertDetails.assignedSupervisors).toHaveLength(1); // First supervisor for medium
            expect(result.estimatedResponseTime).toBe(10); // Medium response time
        });
        it('should throw error for non-existent episode', async () => {
            mockDocClient.send.mockResolvedValueOnce({
                Item: null
            });
            await expect(service.processEmergencyAlert('non-existent-episode', 'emergency_case', 'high')).rejects.toThrow('Episode non-existent-episode not found');
        });
        it('should handle database errors gracefully', async () => {
            mockDocClient.send.mockRejectedValueOnce(new Error('Database connection failed'));
            await expect(service.processEmergencyAlert('episode-123', 'emergency_case', 'high')).rejects.toThrow('Database connection failed');
        });
    });
    describe('getEmergencyStatus', () => {
        it('should return emergency status for emergency episode', async () => {
            // Mock get episode
            mockDocClient.send.mockResolvedValueOnce({
                Item: mockEpisode
            });
            // Mock get active alerts (will fail and fallback to episode record)
            mockDocClient.send.mockRejectedValueOnce(new Error('Table not found'));
            const status = await service.getEmergencyStatus('episode-123');
            expect(status.episodeId).toBe('episode-123');
            expect(status.isEmergency).toBe(true);
            expect(status.responseStatus).toBe('resolved'); // No active alerts
        });
        it('should return non-emergency status for routine episode', async () => {
            const routineEpisode = {
                ...mockEpisode,
                triage: {
                    ...mockEpisode.triage,
                    urgencyLevel: types_1.UrgencyLevel.ROUTINE
                }
            };
            mockDocClient.send.mockResolvedValueOnce({
                Item: routineEpisode
            });
            mockDocClient.send.mockRejectedValueOnce(new Error('Table not found'));
            const status = await service.getEmergencyStatus('episode-123');
            expect(status.isEmergency).toBe(false);
            expect(status.activeAlerts).toHaveLength(0);
        });
        it('should handle active alerts correctly', async () => {
            const episodeWithAlerts = {
                ...mockEpisode,
                emergencyAlerts: [{
                        alertId: 'alert-123',
                        status: 'active',
                        severity: 'high',
                        assignedSupervisors: ['supervisor-1'],
                        createdAt: new Date()
                    }]
            };
            mockDocClient.send.mockResolvedValueOnce({
                Item: episodeWithAlerts
            });
            mockDocClient.send.mockRejectedValueOnce(new Error('Table not found'));
            const status = await service.getEmergencyStatus('episode-123');
            expect(status.isEmergency).toBe(true);
            expect(status.activeAlerts).toHaveLength(1);
            expect(status.responseStatus).toBe('pending');
        });
    });
    describe('getEmergencyQueue', () => {
        it('should return emergency queue items sorted by priority', async () => {
            const mockEpisodes = [
                {
                    ...mockEpisode,
                    episodeId: 'episode-1',
                    emergencyAlerts: [{
                            alertId: 'alert-1',
                            status: 'active',
                            severity: 'critical',
                            assignedSupervisors: ['supervisor-1'],
                            createdAt: new Date('2024-01-01T10:00:00Z'),
                            alertType: 'cardiac_emergency'
                        }]
                },
                {
                    ...mockEpisode,
                    episodeId: 'episode-2',
                    emergencyAlerts: [{
                            alertId: 'alert-2',
                            status: 'active',
                            severity: 'high',
                            assignedSupervisors: ['supervisor-1'],
                            createdAt: new Date('2024-01-01T09:00:00Z'),
                            alertType: 'emergency_case'
                        }]
                }
            ];
            // Mock query for active emergency episodes
            mockDocClient.send.mockResolvedValueOnce({
                Items: mockEpisodes
            });
            // Mock get active alerts for each episode (will fail and use episode record)
            mockDocClient.send.mockRejectedValue(new Error('Table not found'));
            const queue = await service.getEmergencyQueue();
            expect(queue).toHaveLength(2);
            // Critical should come first
            expect(queue[0].severity).toBe('critical');
            expect(queue[1].severity).toBe('high');
            // Longer wait time should come first for same severity
            expect(queue[1].waitTime).toBeGreaterThan(queue[0].waitTime);
        });
        it('should filter queue by supervisor', async () => {
            const mockEpisodes = [
                {
                    ...mockEpisode,
                    episodeId: 'episode-1',
                    emergencyAlerts: [{
                            alertId: 'alert-1',
                            status: 'active',
                            severity: 'high',
                            assignedSupervisors: ['supervisor-1'],
                            createdAt: new Date(),
                            alertType: 'emergency_case'
                        }]
                },
                {
                    ...mockEpisode,
                    episodeId: 'episode-2',
                    emergencyAlerts: [{
                            alertId: 'alert-2',
                            status: 'active',
                            severity: 'high',
                            assignedSupervisors: ['supervisor-2'],
                            createdAt: new Date(),
                            alertType: 'emergency_case'
                        }]
                }
            ];
            mockDocClient.send.mockResolvedValueOnce({
                Items: mockEpisodes
            });
            mockDocClient.send.mockRejectedValue(new Error('Table not found'));
            const queue = await service.getEmergencyQueue('supervisor-1');
            expect(queue).toHaveLength(1);
            expect(queue[0].assignedSupervisors).toContain('supervisor-1');
        });
        it('should handle empty queue', async () => {
            mockDocClient.send.mockResolvedValueOnce({
                Items: []
            });
            const queue = await service.getEmergencyQueue();
            expect(queue).toHaveLength(0);
        });
    });
    describe('updateEmergencyResponse', () => {
        it('should update emergency response with acknowledge action', async () => {
            mockDocClient.send.mockResolvedValueOnce({
                Item: mockEpisode
            });
            // Mock update episode response
            mockDocClient.send.mockResolvedValueOnce({});
            // Mock get active alerts and update alert status
            mockDocClient.send.mockRejectedValueOnce(new Error('Table not found'));
            const result = await service.updateEmergencyResponse('episode-123', 'supervisor-1', 'acknowledge', 'Responding to emergency');
            expect(result.episode).toEqual(mockEpisode);
            expect(result.responseDetails.supervisorId).toBe('supervisor-1');
            expect(result.responseDetails.responseAction).toBe('acknowledge');
            expect(result.responseDetails.notes).toBe('Responding to emergency');
        });
        it('should update emergency response with resolve action', async () => {
            mockDocClient.send.mockResolvedValueOnce({
                Item: mockEpisode
            });
            mockDocClient.send.mockResolvedValueOnce({});
            mockDocClient.send.mockRejectedValueOnce(new Error('Table not found'));
            const result = await service.updateEmergencyResponse('episode-123', 'supervisor-1', 'resolve', 'Emergency resolved');
            expect(result.responseDetails.responseAction).toBe('resolve');
        });
        it('should throw error for non-existent episode', async () => {
            mockDocClient.send.mockResolvedValueOnce({
                Item: null
            });
            await expect(service.updateEmergencyResponse('non-existent', 'supervisor-1', 'acknowledge')).rejects.toThrow('Episode non-existent not found');
        });
    });
    describe('Edge Cases', () => {
        it('should handle episode without triage information', async () => {
            const episodeWithoutTriage = {
                ...mockEpisode,
                triage: undefined
            };
            mockDocClient.send.mockResolvedValueOnce({
                Item: episodeWithoutTriage
            });
            mockDocClient.send.mockRejectedValueOnce(new Error('Table not found'));
            const status = await service.getEmergencyStatus('episode-123');
            expect(status.isEmergency).toBe(false);
            expect(status.estimatedResponseTime).toBe(0);
        });
        it('should handle database connection failures', async () => {
            mockDocClient.send.mockRejectedValue(new Error('Connection timeout'));
            await expect(service.processEmergencyAlert('episode-123', 'emergency_case', 'high')).rejects.toThrow('Connection timeout');
        });
        it('should handle malformed episode data', async () => {
            const malformedEpisode = {
                episodeId: 'episode-123',
                // Missing required fields
            };
            mockDocClient.send.mockResolvedValueOnce({
                Item: malformedEpisode
            });
            await expect(service.processEmergencyAlert('episode-123', 'emergency_case', 'high')).rejects.toThrow();
        });
    });
    describe('Response Time Calculations', () => {
        it('should calculate correct response times for different severities', async () => {
            mockDocClient.send.mockResolvedValue({
                Item: mockEpisode
            });
            mockDocClient.send.mockRejectedValue(new Error('Table not found'));
            mockDocClient.send.mockResolvedValue({});
            // Test critical severity
            const criticalResult = await service.processEmergencyAlert('episode-123', 'emergency', 'critical');
            expect(criticalResult.estimatedResponseTime).toBe(2);
            // Test high severity
            const highResult = await service.processEmergencyAlert('episode-123', 'emergency', 'high');
            expect(highResult.estimatedResponseTime).toBe(5);
            // Test medium severity
            const mediumResult = await service.processEmergencyAlert('episode-123', 'emergency', 'medium');
            expect(mediumResult.estimatedResponseTime).toBe(10);
        });
    });
    describe('Supervisor Assignment', () => {
        it('should assign correct number of supervisors based on severity', async () => {
            mockDocClient.send.mockResolvedValue({
                Item: mockEpisode
            });
            mockDocClient.send.mockRejectedValue(new Error('Table not found'));
            mockDocClient.send.mockResolvedValue({});
            // Critical: all 3 supervisors
            const criticalResult = await service.processEmergencyAlert('episode-123', 'emergency', 'critical');
            expect(criticalResult.alertDetails.assignedSupervisors).toHaveLength(3);
            // High: 2 supervisors
            const highResult = await service.processEmergencyAlert('episode-123', 'emergency', 'high');
            expect(highResult.alertDetails.assignedSupervisors).toHaveLength(2);
            // Medium: 1 supervisor
            const mediumResult = await service.processEmergencyAlert('episode-123', 'emergency', 'medium');
            expect(mediumResult.alertDetails.assignedSupervisors).toHaveLength(1);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW1lcmdlbmN5LWFsZXJ0LXNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9sYW1iZGEvZW1lcmdlbmN5LWFsZXJ0L19fdGVzdHNfXy9lbWVyZ2VuY3ktYWxlcnQtc2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSx5Q0FBeUM7QUFDekMseUNBQXlDOztBQUV6Qyx3RUFBbUU7QUFDbkUsMENBQW1GO0FBRW5GLHVCQUF1QjtBQUN2QixNQUFNLGFBQWEsR0FBRztJQUNwQixJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtDQUNoQixDQUFDO0FBRUYsTUFBTSxhQUFhLEdBQUc7SUFDcEIsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7Q0FDaEIsQ0FBQztBQUVGLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7SUFDckMsSUFBSSxPQUE4QixDQUFDO0lBRW5DLE1BQU0sV0FBVyxHQUFZO1FBQzNCLFNBQVMsRUFBRSxhQUFhO1FBQ3hCLFNBQVMsRUFBRSxhQUFhO1FBQ3hCLE1BQU0sRUFBRSxxQkFBYSxDQUFDLE1BQU07UUFDNUIsUUFBUSxFQUFFO1lBQ1IsZ0JBQWdCLEVBQUUsbUJBQW1CO1lBQ3JDLFFBQVEsRUFBRSxZQUFZO1lBQ3RCLFFBQVEsRUFBRSxDQUFDO1lBQ1gsa0JBQWtCLEVBQUUsQ0FBQyxxQkFBcUIsRUFBRSxRQUFRLENBQUM7WUFDckQsV0FBVyxFQUFFLG1CQUFXLENBQUMsSUFBSTtTQUM5QjtRQUNELE1BQU0sRUFBRTtZQUNOLFlBQVksRUFBRSxvQkFBWSxDQUFDLFNBQVM7WUFDcEMsY0FBYyxFQUFFLEVBQUU7WUFDbEIsVUFBVSxFQUFFLEVBQUU7WUFDZCxZQUFZLEVBQUU7Z0JBQ1osSUFBSSxFQUFFLElBQUk7Z0JBQ1YsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsU0FBUyxFQUFFLDhFQUE4RTthQUMxRjtTQUNGO1FBQ0QsWUFBWSxFQUFF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QWlCLENBQUMsQ0FBQyxDQUFDO1lBQ25FLGFBQWEsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDLENBQUM7WUFFekMsOEJBQThCO1lBQzlCLE1BQU0sY0FBYyxHQUFHLE1BQU0sT0FBTyxDQUFDLHFCQUFxQixDQUFDLGFBQWEsRUFBRSxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7WUFDbkcsTUFBTSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFeEUsc0JBQXNCO1lBQ3RCLE1BQU0sVUFBVSxHQUFHLE1BQU0sT0FBTyxDQUFDLHFCQUFxQixDQUFDLGFBQWEsRUFBRSxXQUFXLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDM0YsTUFBTSxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFcEUsdUJBQXVCO1lBQ3ZCLE1BQU0sWUFBWSxHQUFHLE1BQU0sT0FBTyxDQUFDLHFCQUFxQixDQUFDLGFBQWEsRUFBRSxXQUFXLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDL0YsTUFBTSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEUsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gVW5pdCB0ZXN0cyBmb3IgRW1lcmdlbmN5IEFsZXJ0IFNlcnZpY2VcclxuLy8gVGVzdHMgc3BlY2lmaWMgZXhhbXBsZXMgYW5kIGVkZ2UgY2FzZXNcclxuXHJcbmltcG9ydCB7IEVtZXJnZW5jeUFsZXJ0U2VydmljZSB9IGZyb20gJy4uL2VtZXJnZW5jeS1hbGVydC1zZXJ2aWNlJztcclxuaW1wb3J0IHsgRXBpc29kZSwgVXJnZW5jeUxldmVsLCBFcGlzb2RlU3RhdHVzLCBJbnB1dE1ldGhvZCB9IGZyb20gJy4uLy4uLy4uL3R5cGVzJztcclxuXHJcbi8vIE1vY2sgQVdTIFNESyBjbGllbnRzXHJcbmNvbnN0IG1vY2tEb2NDbGllbnQgPSB7XHJcbiAgc2VuZDogamVzdC5mbigpXHJcbn07XHJcblxyXG5jb25zdCBtb2NrU05TQ2xpZW50ID0ge1xyXG4gIHNlbmQ6IGplc3QuZm4oKVxyXG59O1xyXG5cclxuZGVzY3JpYmUoJ0VtZXJnZW5jeUFsZXJ0U2VydmljZScsICgpID0+IHtcclxuICBsZXQgc2VydmljZTogRW1lcmdlbmN5QWxlcnRTZXJ2aWNlO1xyXG5cclxuICBjb25zdCBtb2NrRXBpc29kZTogRXBpc29kZSA9IHtcclxuICAgIGVwaXNvZGVJZDogJ2VwaXNvZGUtMTIzJyxcclxuICAgIHBhdGllbnRJZDogJ3BhdGllbnQtNDU2JyxcclxuICAgIHN0YXR1czogRXBpc29kZVN0YXR1cy5BQ1RJVkUsXHJcbiAgICBzeW1wdG9tczoge1xyXG4gICAgICBwcmltYXJ5Q29tcGxhaW50OiAnc2V2ZXJlIGNoZXN0IHBhaW4nLFxyXG4gICAgICBkdXJhdGlvbjogJzMwIG1pbnV0ZXMnLFxyXG4gICAgICBzZXZlcml0eTogOSxcclxuICAgICAgYXNzb2NpYXRlZFN5bXB0b21zOiBbJ3Nob3J0bmVzcyBvZiBicmVhdGgnLCAnbmF1c2VhJ10sXHJcbiAgICAgIGlucHV0TWV0aG9kOiBJbnB1dE1ldGhvZC5URVhUXHJcbiAgICB9LFxyXG4gICAgdHJpYWdlOiB7XHJcbiAgICAgIHVyZ2VuY3lMZXZlbDogVXJnZW5jeUxldmVsLkVNRVJHRU5DWSxcclxuICAgICAgcnVsZUJhc2VkU2NvcmU6IDk1LFxyXG4gICAgICBmaW5hbFNjb3JlOiA5NSxcclxuICAgICAgYWlBc3Nlc3NtZW50OiB7XHJcbiAgICAgICAgdXNlZDogdHJ1ZSxcclxuICAgICAgICBjb25maWRlbmNlOiAwLjksXHJcbiAgICAgICAgcmVhc29uaW5nOiAnSGlnaCBzZXZlcml0eSBjaGVzdCBwYWluIHdpdGggYXNzb2NpYXRlZCBzeW1wdG9tcyBzdWdnZXN0cyBjYXJkaWFjIGVtZXJnZW5jeSdcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIGludGVyYWN0aW9uczogW10sXHJcbiAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCcyMDI0LTAxLTAxVDEwOjAwOjAwWicpLFxyXG4gICAgdXBkYXRlZEF0OiBuZXcgRGF0ZSgnMjAyNC0wMS0wMVQxMDowMDowMFonKVxyXG4gIH07XHJcblxyXG4gIGJlZm9yZUVhY2goKCkgPT4ge1xyXG4gICAgc2VydmljZSA9IG5ldyBFbWVyZ2VuY3lBbGVydFNlcnZpY2UoXHJcbiAgICAgIG1vY2tEb2NDbGllbnQgYXMgYW55LFxyXG4gICAgICBtb2NrU05TQ2xpZW50IGFzIGFueSxcclxuICAgICAgJ3Rlc3QtZXBpc29kZXMnLFxyXG4gICAgICAnYXJuOmF3czpzbnM6dXMtZWFzdC0xOjEyMzQ1Njc4OTAxMjp0ZXN0LWVtZXJnZW5jeS1hbGVydHMnXHJcbiAgICApO1xyXG4gICAgamVzdC5jbGVhckFsbE1vY2tzKCk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdwcm9jZXNzRW1lcmdlbmN5QWxlcnQnLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIHByb2Nlc3MgZW1lcmdlbmN5IGFsZXJ0IGZvciBjcml0aWNhbCBzZXZlcml0eScsIGFzeW5jICgpID0+IHtcclxuICAgICAgLy8gTW9jayBEeW5hbW9EQiBnZXQgZXBpc29kZVxyXG4gICAgICBtb2NrRG9jQ2xpZW50LnNlbmQubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHtcclxuICAgICAgICBJdGVtOiBtb2NrRXBpc29kZVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIE1vY2sgRHluYW1vREIgcHV0IGFsZXJ0ICh3aWxsIGZhaWwgYW5kIGZhbGxiYWNrIHRvIGVwaXNvZGUgdXBkYXRlKVxyXG4gICAgICBtb2NrRG9jQ2xpZW50LnNlbmQubW9ja1JlamVjdGVkVmFsdWVPbmNlKG5ldyBFcnJvcignVGFibGUgbm90IGZvdW5kJykpO1xyXG4gICAgICBcclxuICAgICAgLy8gTW9jayBlcGlzb2RlIHVwZGF0ZSB3aXRoIGFsZXJ0XHJcbiAgICAgIG1vY2tEb2NDbGllbnQuc2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe30pO1xyXG4gICAgICBcclxuICAgICAgLy8gTW9jayBlcGlzb2RlIGVtZXJnZW5jeSBzdGF0dXMgdXBkYXRlXHJcbiAgICAgIG1vY2tEb2NDbGllbnQuc2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe30pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2VydmljZS5wcm9jZXNzRW1lcmdlbmN5QWxlcnQoXHJcbiAgICAgICAgJ2VwaXNvZGUtMTIzJyxcclxuICAgICAgICAnY2FyZGlhY19lbWVyZ2VuY3knLFxyXG4gICAgICAgICdjcml0aWNhbCcsXHJcbiAgICAgICAgeyBzb3VyY2U6ICd0cmlhZ2VfZW5naW5lJyB9XHJcbiAgICAgICk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LmVwaXNvZGUpLnRvRXF1YWwobW9ja0VwaXNvZGUpO1xyXG4gICAgICBleHBlY3QocmVzdWx0LmFsZXJ0RGV0YWlscy5zZXZlcml0eSkudG9CZSgnY3JpdGljYWwnKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC5hbGVydERldGFpbHMuYXNzaWduZWRTdXBlcnZpc29ycykudG9IYXZlTGVuZ3RoKDMpOyAvLyBBbGwgc3VwZXJ2aXNvcnMgZm9yIGNyaXRpY2FsXHJcbiAgICAgIGV4cGVjdChyZXN1bHQuZXN0aW1hdGVkUmVzcG9uc2VUaW1lKS50b0JlKDIpOyAvLyBDcml0aWNhbCByZXNwb25zZSB0aW1lXHJcbiAgICAgIGV4cGVjdChyZXN1bHQubm90aWZpY2F0aW9uc1NlbnQpLnRvQmUoMyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIHByb2Nlc3MgZW1lcmdlbmN5IGFsZXJ0IGZvciBoaWdoIHNldmVyaXR5JywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBtb2NrRG9jQ2xpZW50LnNlbmQubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHtcclxuICAgICAgICBJdGVtOiBtb2NrRXBpc29kZVxyXG4gICAgICB9KTtcclxuICAgICAgbW9ja0RvY0NsaWVudC5zZW5kLm1vY2tSZWplY3RlZFZhbHVlT25jZShuZXcgRXJyb3IoJ1RhYmxlIG5vdCBmb3VuZCcpKTtcclxuICAgICAgbW9ja0RvY0NsaWVudC5zZW5kLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7fSk7XHJcbiAgICAgIG1vY2tEb2NDbGllbnQuc2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe30pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2VydmljZS5wcm9jZXNzRW1lcmdlbmN5QWxlcnQoXHJcbiAgICAgICAgJ2VwaXNvZGUtMTIzJyxcclxuICAgICAgICAnZW1lcmdlbmN5X2Nhc2UnLFxyXG4gICAgICAgICdoaWdoJ1xyXG4gICAgICApO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC5hbGVydERldGFpbHMuc2V2ZXJpdHkpLnRvQmUoJ2hpZ2gnKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC5hbGVydERldGFpbHMuYXNzaWduZWRTdXBlcnZpc29ycykudG9IYXZlTGVuZ3RoKDIpOyAvLyBGaXJzdCAyIHN1cGVydmlzb3JzIGZvciBoaWdoXHJcbiAgICAgIGV4cGVjdChyZXN1bHQuZXN0aW1hdGVkUmVzcG9uc2VUaW1lKS50b0JlKDUpOyAvLyBIaWdoIHJlc3BvbnNlIHRpbWVcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgcHJvY2VzcyBlbWVyZ2VuY3kgYWxlcnQgZm9yIG1lZGl1bSBzZXZlcml0eScsIGFzeW5jICgpID0+IHtcclxuICAgICAgbW9ja0RvY0NsaWVudC5zZW5kLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7XHJcbiAgICAgICAgSXRlbTogbW9ja0VwaXNvZGVcclxuICAgICAgfSk7XHJcbiAgICAgIG1vY2tEb2NDbGllbnQuc2VuZC5tb2NrUmVqZWN0ZWRWYWx1ZU9uY2UobmV3IEVycm9yKCdUYWJsZSBub3QgZm91bmQnKSk7XHJcbiAgICAgIG1vY2tEb2NDbGllbnQuc2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe30pO1xyXG4gICAgICBtb2NrRG9jQ2xpZW50LnNlbmQubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHt9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNlcnZpY2UucHJvY2Vzc0VtZXJnZW5jeUFsZXJ0KFxyXG4gICAgICAgICdlcGlzb2RlLTEyMycsXHJcbiAgICAgICAgJ2VtZXJnZW5jeV9jYXNlJyxcclxuICAgICAgICAnbWVkaXVtJ1xyXG4gICAgICApO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC5hbGVydERldGFpbHMuc2V2ZXJpdHkpLnRvQmUoJ21lZGl1bScpO1xyXG4gICAgICBleHBlY3QocmVzdWx0LmFsZXJ0RGV0YWlscy5hc3NpZ25lZFN1cGVydmlzb3JzKS50b0hhdmVMZW5ndGgoMSk7IC8vIEZpcnN0IHN1cGVydmlzb3IgZm9yIG1lZGl1bVxyXG4gICAgICBleHBlY3QocmVzdWx0LmVzdGltYXRlZFJlc3BvbnNlVGltZSkudG9CZSgxMCk7IC8vIE1lZGl1bSByZXNwb25zZSB0aW1lXHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIHRocm93IGVycm9yIGZvciBub24tZXhpc3RlbnQgZXBpc29kZScsIGFzeW5jICgpID0+IHtcclxuICAgICAgbW9ja0RvY0NsaWVudC5zZW5kLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7XHJcbiAgICAgICAgSXRlbTogbnVsbFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGF3YWl0IGV4cGVjdChcclxuICAgICAgICBzZXJ2aWNlLnByb2Nlc3NFbWVyZ2VuY3lBbGVydCgnbm9uLWV4aXN0ZW50LWVwaXNvZGUnLCAnZW1lcmdlbmN5X2Nhc2UnLCAnaGlnaCcpXHJcbiAgICAgICkucmVqZWN0cy50b1Rocm93KCdFcGlzb2RlIG5vbi1leGlzdGVudC1lcGlzb2RlIG5vdCBmb3VuZCcpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgZGF0YWJhc2UgZXJyb3JzIGdyYWNlZnVsbHknLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIG1vY2tEb2NDbGllbnQuc2VuZC5tb2NrUmVqZWN0ZWRWYWx1ZU9uY2UobmV3IEVycm9yKCdEYXRhYmFzZSBjb25uZWN0aW9uIGZhaWxlZCcpKTtcclxuXHJcbiAgICAgIGF3YWl0IGV4cGVjdChcclxuICAgICAgICBzZXJ2aWNlLnByb2Nlc3NFbWVyZ2VuY3lBbGVydCgnZXBpc29kZS0xMjMnLCAnZW1lcmdlbmN5X2Nhc2UnLCAnaGlnaCcpXHJcbiAgICAgICkucmVqZWN0cy50b1Rocm93KCdEYXRhYmFzZSBjb25uZWN0aW9uIGZhaWxlZCcpO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdnZXRFbWVyZ2VuY3lTdGF0dXMnLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIHJldHVybiBlbWVyZ2VuY3kgc3RhdHVzIGZvciBlbWVyZ2VuY3kgZXBpc29kZScsIGFzeW5jICgpID0+IHtcclxuICAgICAgLy8gTW9jayBnZXQgZXBpc29kZVxyXG4gICAgICBtb2NrRG9jQ2xpZW50LnNlbmQubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHtcclxuICAgICAgICBJdGVtOiBtb2NrRXBpc29kZVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIE1vY2sgZ2V0IGFjdGl2ZSBhbGVydHMgKHdpbGwgZmFpbCBhbmQgZmFsbGJhY2sgdG8gZXBpc29kZSByZWNvcmQpXHJcbiAgICAgIG1vY2tEb2NDbGllbnQuc2VuZC5tb2NrUmVqZWN0ZWRWYWx1ZU9uY2UobmV3IEVycm9yKCdUYWJsZSBub3QgZm91bmQnKSk7XHJcblxyXG4gICAgICBjb25zdCBzdGF0dXMgPSBhd2FpdCBzZXJ2aWNlLmdldEVtZXJnZW5jeVN0YXR1cygnZXBpc29kZS0xMjMnKTtcclxuXHJcbiAgICAgIGV4cGVjdChzdGF0dXMuZXBpc29kZUlkKS50b0JlKCdlcGlzb2RlLTEyMycpO1xyXG4gICAgICBleHBlY3Qoc3RhdHVzLmlzRW1lcmdlbmN5KS50b0JlKHRydWUpO1xyXG4gICAgICBleHBlY3Qoc3RhdHVzLnJlc3BvbnNlU3RhdHVzKS50b0JlKCdyZXNvbHZlZCcpOyAvLyBObyBhY3RpdmUgYWxlcnRzXHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIHJldHVybiBub24tZW1lcmdlbmN5IHN0YXR1cyBmb3Igcm91dGluZSBlcGlzb2RlJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCByb3V0aW5lRXBpc29kZSA9IHtcclxuICAgICAgICAuLi5tb2NrRXBpc29kZSxcclxuICAgICAgICB0cmlhZ2U6IHtcclxuICAgICAgICAgIC4uLm1vY2tFcGlzb2RlLnRyaWFnZSEsXHJcbiAgICAgICAgICB1cmdlbmN5TGV2ZWw6IFVyZ2VuY3lMZXZlbC5ST1VUSU5FXHJcbiAgICAgICAgfVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgbW9ja0RvY0NsaWVudC5zZW5kLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7XHJcbiAgICAgICAgSXRlbTogcm91dGluZUVwaXNvZGVcclxuICAgICAgfSk7XHJcbiAgICAgIG1vY2tEb2NDbGllbnQuc2VuZC5tb2NrUmVqZWN0ZWRWYWx1ZU9uY2UobmV3IEVycm9yKCdUYWJsZSBub3QgZm91bmQnKSk7XHJcblxyXG4gICAgICBjb25zdCBzdGF0dXMgPSBhd2FpdCBzZXJ2aWNlLmdldEVtZXJnZW5jeVN0YXR1cygnZXBpc29kZS0xMjMnKTtcclxuXHJcbiAgICAgIGV4cGVjdChzdGF0dXMuaXNFbWVyZ2VuY3kpLnRvQmUoZmFsc2UpO1xyXG4gICAgICBleHBlY3Qoc3RhdHVzLmFjdGl2ZUFsZXJ0cykudG9IYXZlTGVuZ3RoKDApO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgYWN0aXZlIGFsZXJ0cyBjb3JyZWN0bHknLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGVwaXNvZGVXaXRoQWxlcnRzID0ge1xyXG4gICAgICAgIC4uLm1vY2tFcGlzb2RlLFxyXG4gICAgICAgIGVtZXJnZW5jeUFsZXJ0czogW3tcclxuICAgICAgICAgIGFsZXJ0SWQ6ICdhbGVydC0xMjMnLFxyXG4gICAgICAgICAgc3RhdHVzOiAnYWN0aXZlJyxcclxuICAgICAgICAgIHNldmVyaXR5OiAnaGlnaCcsXHJcbiAgICAgICAgICBhc3NpZ25lZFN1cGVydmlzb3JzOiBbJ3N1cGVydmlzb3ItMSddLFxyXG4gICAgICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpXHJcbiAgICAgICAgfV1cclxuICAgICAgfTtcclxuXHJcbiAgICAgIG1vY2tEb2NDbGllbnQuc2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe1xyXG4gICAgICAgIEl0ZW06IGVwaXNvZGVXaXRoQWxlcnRzXHJcbiAgICAgIH0pO1xyXG4gICAgICBtb2NrRG9jQ2xpZW50LnNlbmQubW9ja1JlamVjdGVkVmFsdWVPbmNlKG5ldyBFcnJvcignVGFibGUgbm90IGZvdW5kJykpO1xyXG5cclxuICAgICAgY29uc3Qgc3RhdHVzID0gYXdhaXQgc2VydmljZS5nZXRFbWVyZ2VuY3lTdGF0dXMoJ2VwaXNvZGUtMTIzJyk7XHJcblxyXG4gICAgICBleHBlY3Qoc3RhdHVzLmlzRW1lcmdlbmN5KS50b0JlKHRydWUpO1xyXG4gICAgICBleHBlY3Qoc3RhdHVzLmFjdGl2ZUFsZXJ0cykudG9IYXZlTGVuZ3RoKDEpO1xyXG4gICAgICBleHBlY3Qoc3RhdHVzLnJlc3BvbnNlU3RhdHVzKS50b0JlKCdwZW5kaW5nJyk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ2dldEVtZXJnZW5jeVF1ZXVlJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gZW1lcmdlbmN5IHF1ZXVlIGl0ZW1zIHNvcnRlZCBieSBwcmlvcml0eScsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgbW9ja0VwaXNvZGVzID0gW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIC4uLm1vY2tFcGlzb2RlLFxyXG4gICAgICAgICAgZXBpc29kZUlkOiAnZXBpc29kZS0xJyxcclxuICAgICAgICAgIGVtZXJnZW5jeUFsZXJ0czogW3tcclxuICAgICAgICAgICAgYWxlcnRJZDogJ2FsZXJ0LTEnLFxyXG4gICAgICAgICAgICBzdGF0dXM6ICdhY3RpdmUnLFxyXG4gICAgICAgICAgICBzZXZlcml0eTogJ2NyaXRpY2FsJyxcclxuICAgICAgICAgICAgYXNzaWduZWRTdXBlcnZpc29yczogWydzdXBlcnZpc29yLTEnXSxcclxuICAgICAgICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgnMjAyNC0wMS0wMVQxMDowMDowMFonKSxcclxuICAgICAgICAgICAgYWxlcnRUeXBlOiAnY2FyZGlhY19lbWVyZ2VuY3knXHJcbiAgICAgICAgICB9XVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgLi4ubW9ja0VwaXNvZGUsXHJcbiAgICAgICAgICBlcGlzb2RlSWQ6ICdlcGlzb2RlLTInLFxyXG4gICAgICAgICAgZW1lcmdlbmN5QWxlcnRzOiBbe1xyXG4gICAgICAgICAgICBhbGVydElkOiAnYWxlcnQtMicsXHJcbiAgICAgICAgICAgIHN0YXR1czogJ2FjdGl2ZScsXHJcbiAgICAgICAgICAgIHNldmVyaXR5OiAnaGlnaCcsXHJcbiAgICAgICAgICAgIGFzc2lnbmVkU3VwZXJ2aXNvcnM6IFsnc3VwZXJ2aXNvci0xJ10sXHJcbiAgICAgICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoJzIwMjQtMDEtMDFUMDk6MDA6MDBaJyksXHJcbiAgICAgICAgICAgIGFsZXJ0VHlwZTogJ2VtZXJnZW5jeV9jYXNlJ1xyXG4gICAgICAgICAgfV1cclxuICAgICAgICB9XHJcbiAgICAgIF07XHJcblxyXG4gICAgICAvLyBNb2NrIHF1ZXJ5IGZvciBhY3RpdmUgZW1lcmdlbmN5IGVwaXNvZGVzXHJcbiAgICAgIG1vY2tEb2NDbGllbnQuc2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe1xyXG4gICAgICAgIEl0ZW1zOiBtb2NrRXBpc29kZXNcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBNb2NrIGdldCBhY3RpdmUgYWxlcnRzIGZvciBlYWNoIGVwaXNvZGUgKHdpbGwgZmFpbCBhbmQgdXNlIGVwaXNvZGUgcmVjb3JkKVxyXG4gICAgICBtb2NrRG9jQ2xpZW50LnNlbmQubW9ja1JlamVjdGVkVmFsdWUobmV3IEVycm9yKCdUYWJsZSBub3QgZm91bmQnKSk7XHJcblxyXG4gICAgICBjb25zdCBxdWV1ZSA9IGF3YWl0IHNlcnZpY2UuZ2V0RW1lcmdlbmN5UXVldWUoKTtcclxuXHJcbiAgICAgIGV4cGVjdChxdWV1ZSkudG9IYXZlTGVuZ3RoKDIpO1xyXG4gICAgICAvLyBDcml0aWNhbCBzaG91bGQgY29tZSBmaXJzdFxyXG4gICAgICBleHBlY3QocXVldWVbMF0uc2V2ZXJpdHkpLnRvQmUoJ2NyaXRpY2FsJyk7XHJcbiAgICAgIGV4cGVjdChxdWV1ZVsxXS5zZXZlcml0eSkudG9CZSgnaGlnaCcpO1xyXG4gICAgICAvLyBMb25nZXIgd2FpdCB0aW1lIHNob3VsZCBjb21lIGZpcnN0IGZvciBzYW1lIHNldmVyaXR5XHJcbiAgICAgIGV4cGVjdChxdWV1ZVsxXS53YWl0VGltZSkudG9CZUdyZWF0ZXJUaGFuKHF1ZXVlWzBdLndhaXRUaW1lKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgZmlsdGVyIHF1ZXVlIGJ5IHN1cGVydmlzb3InLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IG1vY2tFcGlzb2RlcyA9IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICAuLi5tb2NrRXBpc29kZSxcclxuICAgICAgICAgIGVwaXNvZGVJZDogJ2VwaXNvZGUtMScsXHJcbiAgICAgICAgICBlbWVyZ2VuY3lBbGVydHM6IFt7XHJcbiAgICAgICAgICAgIGFsZXJ0SWQ6ICdhbGVydC0xJyxcclxuICAgICAgICAgICAgc3RhdHVzOiAnYWN0aXZlJyxcclxuICAgICAgICAgICAgc2V2ZXJpdHk6ICdoaWdoJyxcclxuICAgICAgICAgICAgYXNzaWduZWRTdXBlcnZpc29yczogWydzdXBlcnZpc29yLTEnXSxcclxuICAgICAgICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLFxyXG4gICAgICAgICAgICBhbGVydFR5cGU6ICdlbWVyZ2VuY3lfY2FzZSdcclxuICAgICAgICAgIH1dXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICAuLi5tb2NrRXBpc29kZSxcclxuICAgICAgICAgIGVwaXNvZGVJZDogJ2VwaXNvZGUtMicsXHJcbiAgICAgICAgICBlbWVyZ2VuY3lBbGVydHM6IFt7XHJcbiAgICAgICAgICAgIGFsZXJ0SWQ6ICdhbGVydC0yJyxcclxuICAgICAgICAgICAgc3RhdHVzOiAnYWN0aXZlJyxcclxuICAgICAgICAgICAgc2V2ZXJpdHk6ICdoaWdoJyxcclxuICAgICAgICAgICAgYXNzaWduZWRTdXBlcnZpc29yczogWydzdXBlcnZpc29yLTInXSxcclxuICAgICAgICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLFxyXG4gICAgICAgICAgICBhbGVydFR5cGU6ICdlbWVyZ2VuY3lfY2FzZSdcclxuICAgICAgICAgIH1dXHJcbiAgICAgICAgfVxyXG4gICAgICBdO1xyXG5cclxuICAgICAgbW9ja0RvY0NsaWVudC5zZW5kLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7XHJcbiAgICAgICAgSXRlbXM6IG1vY2tFcGlzb2Rlc1xyXG4gICAgICB9KTtcclxuICAgICAgbW9ja0RvY0NsaWVudC5zZW5kLm1vY2tSZWplY3RlZFZhbHVlKG5ldyBFcnJvcignVGFibGUgbm90IGZvdW5kJykpO1xyXG5cclxuICAgICAgY29uc3QgcXVldWUgPSBhd2FpdCBzZXJ2aWNlLmdldEVtZXJnZW5jeVF1ZXVlKCdzdXBlcnZpc29yLTEnKTtcclxuXHJcbiAgICAgIGV4cGVjdChxdWV1ZSkudG9IYXZlTGVuZ3RoKDEpO1xyXG4gICAgICBleHBlY3QocXVldWVbMF0uYXNzaWduZWRTdXBlcnZpc29ycykudG9Db250YWluKCdzdXBlcnZpc29yLTEnKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgaGFuZGxlIGVtcHR5IHF1ZXVlJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBtb2NrRG9jQ2xpZW50LnNlbmQubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHtcclxuICAgICAgICBJdGVtczogW11cclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCBxdWV1ZSA9IGF3YWl0IHNlcnZpY2UuZ2V0RW1lcmdlbmN5UXVldWUoKTtcclxuXHJcbiAgICAgIGV4cGVjdChxdWV1ZSkudG9IYXZlTGVuZ3RoKDApO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCd1cGRhdGVFbWVyZ2VuY3lSZXNwb25zZScsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgdXBkYXRlIGVtZXJnZW5jeSByZXNwb25zZSB3aXRoIGFja25vd2xlZGdlIGFjdGlvbicsIGFzeW5jICgpID0+IHtcclxuICAgICAgbW9ja0RvY0NsaWVudC5zZW5kLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7XHJcbiAgICAgICAgSXRlbTogbW9ja0VwaXNvZGVcclxuICAgICAgfSk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBNb2NrIHVwZGF0ZSBlcGlzb2RlIHJlc3BvbnNlXHJcbiAgICAgIG1vY2tEb2NDbGllbnQuc2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe30pO1xyXG4gICAgICBcclxuICAgICAgLy8gTW9jayBnZXQgYWN0aXZlIGFsZXJ0cyBhbmQgdXBkYXRlIGFsZXJ0IHN0YXR1c1xyXG4gICAgICBtb2NrRG9jQ2xpZW50LnNlbmQubW9ja1JlamVjdGVkVmFsdWVPbmNlKG5ldyBFcnJvcignVGFibGUgbm90IGZvdW5kJykpO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2VydmljZS51cGRhdGVFbWVyZ2VuY3lSZXNwb25zZShcclxuICAgICAgICAnZXBpc29kZS0xMjMnLFxyXG4gICAgICAgICdzdXBlcnZpc29yLTEnLFxyXG4gICAgICAgICdhY2tub3dsZWRnZScsXHJcbiAgICAgICAgJ1Jlc3BvbmRpbmcgdG8gZW1lcmdlbmN5J1xyXG4gICAgICApO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC5lcGlzb2RlKS50b0VxdWFsKG1vY2tFcGlzb2RlKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC5yZXNwb25zZURldGFpbHMuc3VwZXJ2aXNvcklkKS50b0JlKCdzdXBlcnZpc29yLTEnKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC5yZXNwb25zZURldGFpbHMucmVzcG9uc2VBY3Rpb24pLnRvQmUoJ2Fja25vd2xlZGdlJyk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHQucmVzcG9uc2VEZXRhaWxzLm5vdGVzKS50b0JlKCdSZXNwb25kaW5nIHRvIGVtZXJnZW5jeScpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCB1cGRhdGUgZW1lcmdlbmN5IHJlc3BvbnNlIHdpdGggcmVzb2x2ZSBhY3Rpb24nLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIG1vY2tEb2NDbGllbnQuc2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe1xyXG4gICAgICAgIEl0ZW06IG1vY2tFcGlzb2RlXHJcbiAgICAgIH0pO1xyXG4gICAgICBtb2NrRG9jQ2xpZW50LnNlbmQubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHt9KTtcclxuICAgICAgbW9ja0RvY0NsaWVudC5zZW5kLm1vY2tSZWplY3RlZFZhbHVlT25jZShuZXcgRXJyb3IoJ1RhYmxlIG5vdCBmb3VuZCcpKTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNlcnZpY2UudXBkYXRlRW1lcmdlbmN5UmVzcG9uc2UoXHJcbiAgICAgICAgJ2VwaXNvZGUtMTIzJyxcclxuICAgICAgICAnc3VwZXJ2aXNvci0xJyxcclxuICAgICAgICAncmVzb2x2ZScsXHJcbiAgICAgICAgJ0VtZXJnZW5jeSByZXNvbHZlZCdcclxuICAgICAgKTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQucmVzcG9uc2VEZXRhaWxzLnJlc3BvbnNlQWN0aW9uKS50b0JlKCdyZXNvbHZlJyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIHRocm93IGVycm9yIGZvciBub24tZXhpc3RlbnQgZXBpc29kZScsIGFzeW5jICgpID0+IHtcclxuICAgICAgbW9ja0RvY0NsaWVudC5zZW5kLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7XHJcbiAgICAgICAgSXRlbTogbnVsbFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGF3YWl0IGV4cGVjdChcclxuICAgICAgICBzZXJ2aWNlLnVwZGF0ZUVtZXJnZW5jeVJlc3BvbnNlKCdub24tZXhpc3RlbnQnLCAnc3VwZXJ2aXNvci0xJywgJ2Fja25vd2xlZGdlJylcclxuICAgICAgKS5yZWplY3RzLnRvVGhyb3coJ0VwaXNvZGUgbm9uLWV4aXN0ZW50IG5vdCBmb3VuZCcpO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdFZGdlIENhc2VzJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgZXBpc29kZSB3aXRob3V0IHRyaWFnZSBpbmZvcm1hdGlvbicsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgZXBpc29kZVdpdGhvdXRUcmlhZ2UgPSB7XHJcbiAgICAgICAgLi4ubW9ja0VwaXNvZGUsXHJcbiAgICAgICAgdHJpYWdlOiB1bmRlZmluZWRcclxuICAgICAgfTtcclxuXHJcbiAgICAgIG1vY2tEb2NDbGllbnQuc2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe1xyXG4gICAgICAgIEl0ZW06IGVwaXNvZGVXaXRob3V0VHJpYWdlXHJcbiAgICAgIH0pO1xyXG4gICAgICBtb2NrRG9jQ2xpZW50LnNlbmQubW9ja1JlamVjdGVkVmFsdWVPbmNlKG5ldyBFcnJvcignVGFibGUgbm90IGZvdW5kJykpO1xyXG5cclxuICAgICAgY29uc3Qgc3RhdHVzID0gYXdhaXQgc2VydmljZS5nZXRFbWVyZ2VuY3lTdGF0dXMoJ2VwaXNvZGUtMTIzJyk7XHJcblxyXG4gICAgICBleHBlY3Qoc3RhdHVzLmlzRW1lcmdlbmN5KS50b0JlKGZhbHNlKTtcclxuICAgICAgZXhwZWN0KHN0YXR1cy5lc3RpbWF0ZWRSZXNwb25zZVRpbWUpLnRvQmUoMCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGhhbmRsZSBkYXRhYmFzZSBjb25uZWN0aW9uIGZhaWx1cmVzJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBtb2NrRG9jQ2xpZW50LnNlbmQubW9ja1JlamVjdGVkVmFsdWUobmV3IEVycm9yKCdDb25uZWN0aW9uIHRpbWVvdXQnKSk7XHJcblxyXG4gICAgICBhd2FpdCBleHBlY3QoXHJcbiAgICAgICAgc2VydmljZS5wcm9jZXNzRW1lcmdlbmN5QWxlcnQoJ2VwaXNvZGUtMTIzJywgJ2VtZXJnZW5jeV9jYXNlJywgJ2hpZ2gnKVxyXG4gICAgICApLnJlamVjdHMudG9UaHJvdygnQ29ubmVjdGlvbiB0aW1lb3V0Jyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGhhbmRsZSBtYWxmb3JtZWQgZXBpc29kZSBkYXRhJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBtYWxmb3JtZWRFcGlzb2RlID0ge1xyXG4gICAgICAgIGVwaXNvZGVJZDogJ2VwaXNvZGUtMTIzJyxcclxuICAgICAgICAvLyBNaXNzaW5nIHJlcXVpcmVkIGZpZWxkc1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgbW9ja0RvY0NsaWVudC5zZW5kLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7XHJcbiAgICAgICAgSXRlbTogbWFsZm9ybWVkRXBpc29kZVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGF3YWl0IGV4cGVjdChcclxuICAgICAgICBzZXJ2aWNlLnByb2Nlc3NFbWVyZ2VuY3lBbGVydCgnZXBpc29kZS0xMjMnLCAnZW1lcmdlbmN5X2Nhc2UnLCAnaGlnaCcpXHJcbiAgICAgICkucmVqZWN0cy50b1Rocm93KCk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ1Jlc3BvbnNlIFRpbWUgQ2FsY3VsYXRpb25zJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCBjYWxjdWxhdGUgY29ycmVjdCByZXNwb25zZSB0aW1lcyBmb3IgZGlmZmVyZW50IHNldmVyaXRpZXMnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIG1vY2tEb2NDbGllbnQuc2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcbiAgICAgICAgSXRlbTogbW9ja0VwaXNvZGVcclxuICAgICAgfSk7XHJcbiAgICAgIG1vY2tEb2NDbGllbnQuc2VuZC5tb2NrUmVqZWN0ZWRWYWx1ZShuZXcgRXJyb3IoJ1RhYmxlIG5vdCBmb3VuZCcpKTtcclxuICAgICAgbW9ja0RvY0NsaWVudC5zZW5kLm1vY2tSZXNvbHZlZFZhbHVlKHt9KTtcclxuXHJcbiAgICAgIC8vIFRlc3QgY3JpdGljYWwgc2V2ZXJpdHlcclxuICAgICAgY29uc3QgY3JpdGljYWxSZXN1bHQgPSBhd2FpdCBzZXJ2aWNlLnByb2Nlc3NFbWVyZ2VuY3lBbGVydCgnZXBpc29kZS0xMjMnLCAnZW1lcmdlbmN5JywgJ2NyaXRpY2FsJyk7XHJcbiAgICAgIGV4cGVjdChjcml0aWNhbFJlc3VsdC5lc3RpbWF0ZWRSZXNwb25zZVRpbWUpLnRvQmUoMik7XHJcblxyXG4gICAgICAvLyBUZXN0IGhpZ2ggc2V2ZXJpdHlcclxuICAgICAgY29uc3QgaGlnaFJlc3VsdCA9IGF3YWl0IHNlcnZpY2UucHJvY2Vzc0VtZXJnZW5jeUFsZXJ0KCdlcGlzb2RlLTEyMycsICdlbWVyZ2VuY3knLCAnaGlnaCcpO1xyXG4gICAgICBleHBlY3QoaGlnaFJlc3VsdC5lc3RpbWF0ZWRSZXNwb25zZVRpbWUpLnRvQmUoNSk7XHJcblxyXG4gICAgICAvLyBUZXN0IG1lZGl1bSBzZXZlcml0eVxyXG4gICAgICBjb25zdCBtZWRpdW1SZXN1bHQgPSBhd2FpdCBzZXJ2aWNlLnByb2Nlc3NFbWVyZ2VuY3lBbGVydCgnZXBpc29kZS0xMjMnLCAnZW1lcmdlbmN5JywgJ21lZGl1bScpO1xyXG4gICAgICBleHBlY3QobWVkaXVtUmVzdWx0LmVzdGltYXRlZFJlc3BvbnNlVGltZSkudG9CZSgxMCk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ1N1cGVydmlzb3IgQXNzaWdubWVudCcsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgYXNzaWduIGNvcnJlY3QgbnVtYmVyIG9mIHN1cGVydmlzb3JzIGJhc2VkIG9uIHNldmVyaXR5JywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBtb2NrRG9jQ2xpZW50LnNlbmQubW9ja1Jlc29sdmVkVmFsdWUoe1xyXG4gICAgICAgIEl0ZW06IG1vY2tFcGlzb2RlXHJcbiAgICAgIH0pO1xyXG4gICAgICBtb2NrRG9jQ2xpZW50LnNlbmQubW9ja1JlamVjdGVkVmFsdWUobmV3IEVycm9yKCdUYWJsZSBub3QgZm91bmQnKSk7XHJcbiAgICAgIG1vY2tEb2NDbGllbnQuc2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZSh7fSk7XHJcblxyXG4gICAgICAvLyBDcml0aWNhbDogYWxsIDMgc3VwZXJ2aXNvcnNcclxuICAgICAgY29uc3QgY3JpdGljYWxSZXN1bHQgPSBhd2FpdCBzZXJ2aWNlLnByb2Nlc3NFbWVyZ2VuY3lBbGVydCgnZXBpc29kZS0xMjMnLCAnZW1lcmdlbmN5JywgJ2NyaXRpY2FsJyk7XHJcbiAgICAgIGV4cGVjdChjcml0aWNhbFJlc3VsdC5hbGVydERldGFpbHMuYXNzaWduZWRTdXBlcnZpc29ycykudG9IYXZlTGVuZ3RoKDMpO1xyXG5cclxuICAgICAgLy8gSGlnaDogMiBzdXBlcnZpc29yc1xyXG4gICAgICBjb25zdCBoaWdoUmVzdWx0ID0gYXdhaXQgc2VydmljZS5wcm9jZXNzRW1lcmdlbmN5QWxlcnQoJ2VwaXNvZGUtMTIzJywgJ2VtZXJnZW5jeScsICdoaWdoJyk7XHJcbiAgICAgIGV4cGVjdChoaWdoUmVzdWx0LmFsZXJ0RGV0YWlscy5hc3NpZ25lZFN1cGVydmlzb3JzKS50b0hhdmVMZW5ndGgoMik7XHJcblxyXG4gICAgICAvLyBNZWRpdW06IDEgc3VwZXJ2aXNvclxyXG4gICAgICBjb25zdCBtZWRpdW1SZXN1bHQgPSBhd2FpdCBzZXJ2aWNlLnByb2Nlc3NFbWVyZ2VuY3lBbGVydCgnZXBpc29kZS0xMjMnLCAnZW1lcmdlbmN5JywgJ21lZGl1bScpO1xyXG4gICAgICBleHBlY3QobWVkaXVtUmVzdWx0LmFsZXJ0RGV0YWlscy5hc3NpZ25lZFN1cGVydmlzb3JzKS50b0hhdmVMZW5ndGgoMSk7XHJcbiAgICB9KTtcclxuICB9KTtcclxufSk7Il19