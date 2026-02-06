"use strict";
// Unit tests for Supervisor Notification Service
// Tests SNS notification functionality
Object.defineProperty(exports, "__esModule", { value: true });
const supervisor_notification_service_1 = require("../supervisor-notification-service");
const types_1 = require("../../../types");
// Mock SNS Client
const mockSNSClient = {
    send: jest.fn()
};
describe('SupervisorNotificationService', () => {
    let notificationService;
    const notificationTopicArn = 'arn:aws:sns:us-east-1:123456789012:notifications';
    const emergencyAlertTopicArn = 'arn:aws:sns:us-east-1:123456789012:emergency-alerts';
    beforeEach(() => {
        notificationService = new supervisor_notification_service_1.SupervisorNotificationService(mockSNSClient, notificationTopicArn, emergencyAlertTopicArn);
        jest.clearAllMocks();
    });
    const createMockEpisode = (urgencyLevel = types_1.UrgencyLevel.URGENT) => ({
        episodeId: 'episode-123',
        patientId: 'patient-456',
        status: types_1.EpisodeStatus.ACTIVE,
        symptoms: {
            primaryComplaint: 'Chest pain',
            duration: '2 hours',
            severity: 8,
            associatedSymptoms: ['shortness of breath', 'nausea'],
            inputMethod: types_1.InputMethod.TEXT
        },
        triage: {
            urgencyLevel,
            ruleBasedScore: 85,
            aiAssessment: {
                used: true,
                confidence: 0.9,
                reasoning: 'High severity chest pain with associated symptoms'
            },
            finalScore: 88
        },
        interactions: [],
        createdAt: new Date(),
        updatedAt: new Date()
    });
    const createMockValidation = () => ({
        supervisorId: 'supervisor-789',
        approved: true,
        timestamp: new Date(),
        notes: 'Assessment approved after review'
    });
    describe('notifySupervisor', () => {
        it('should send regular validation notification', async () => {
            const episode = createMockEpisode(types_1.UrgencyLevel.URGENT);
            const supervisorId = 'supervisor-789';
            mockSNSClient.send.mockResolvedValueOnce({
                MessageId: 'msg-123'
            });
            await notificationService.notifySupervisor(episode, supervisorId, false);
            expect(mockSNSClient.send).toHaveBeenCalledWith(expect.objectContaining({
                TopicArn: notificationTopicArn,
                Subject: '[URGENT] Healthcare Validation Required - Episode episode-123',
                Message: expect.stringContaining('Primary Complaint: Chest pain'),
                MessageAttributes: expect.objectContaining({
                    'notification_type': {
                        DataType: 'String',
                        StringValue: 'validation_required'
                    },
                    'urgency_level': {
                        DataType: 'String',
                        StringValue: types_1.UrgencyLevel.URGENT
                    },
                    'episode_id': {
                        DataType: 'String',
                        StringValue: 'episode-123'
                    },
                    'supervisor_id': {
                        DataType: 'String',
                        StringValue: supervisorId
                    }
                })
            }));
        });
        it('should send emergency alert notification', async () => {
            const episode = createMockEpisode(types_1.UrgencyLevel.EMERGENCY);
            const supervisorId = 'emergency-supervisor';
            mockSNSClient.send.mockResolvedValueOnce({
                MessageId: 'emergency-msg-123'
            });
            await notificationService.notifySupervisor(episode, supervisorId, true);
            expect(mockSNSClient.send).toHaveBeenCalledWith(expect.objectContaining({
                TopicArn: emergencyAlertTopicArn,
                Subject: '[EMERGENCY ALERT] Immediate Validation Required - Episode episode-123',
                Message: expect.stringContaining('🚨 EMERGENCY SITUATION DETECTED 🚨'),
                MessageAttributes: expect.objectContaining({
                    'notification_type': {
                        DataType: 'String',
                        StringValue: 'emergency_alert'
                    }
                })
            }));
        });
        it('should handle notification without assigned supervisor', async () => {
            const episode = createMockEpisode();
            mockSNSClient.send.mockResolvedValueOnce({
                MessageId: 'unassigned-msg-123'
            });
            await notificationService.notifySupervisor(episode);
            expect(mockSNSClient.send).toHaveBeenCalledWith(expect.objectContaining({
                MessageAttributes: expect.objectContaining({
                    'supervisor_id': {
                        DataType: 'String',
                        StringValue: 'unassigned'
                    }
                })
            }));
        });
        it('should include AI assessment details when available', async () => {
            const episode = createMockEpisode();
            episode.triage.aiAssessment = {
                used: true,
                confidence: 0.85,
                reasoning: 'Symptoms indicate moderate to high urgency'
            };
            mockSNSClient.send.mockResolvedValueOnce({
                MessageId: 'ai-msg-123'
            });
            await notificationService.notifySupervisor(episode, 'supervisor-123');
            expect(mockSNSClient.send).toHaveBeenCalledWith(expect.objectContaining({
                Message: expect.stringMatching(/AI Assessment Used: Yes.*AI Confidence: 0\.85.*AI Reasoning: Symptoms indicate moderate to high urgency/s)
            }));
        });
        it('should handle episodes without AI assessment', async () => {
            const episode = createMockEpisode();
            episode.triage.aiAssessment = { used: false };
            mockSNSClient.send.mockResolvedValueOnce({
                MessageId: 'no-ai-msg-123'
            });
            await notificationService.notifySupervisor(episode, 'supervisor-123');
            expect(mockSNSClient.send).toHaveBeenCalledWith(expect.objectContaining({
                Message: expect.stringContaining('AI Assessment Used: No')
            }));
        });
    });
    describe('notifyCareCoordinator', () => {
        it('should send validation completed notification for approved case', async () => {
            const episode = createMockEpisode();
            const validation = createMockValidation();
            mockSNSClient.send.mockResolvedValueOnce({
                MessageId: 'coordinator-msg-123'
            });
            await notificationService.notifyCareCoordinator(episode, validation);
            expect(mockSNSClient.send).toHaveBeenCalledWith(expect.objectContaining({
                TopicArn: notificationTopicArn,
                Subject: 'Validation Completed - Episode episode-123',
                Message: expect.stringContaining('Validation Decision: APPROVED'),
                MessageAttributes: expect.objectContaining({
                    'notification_type': {
                        DataType: 'String',
                        StringValue: 'validation_completed'
                    },
                    'approved': {
                        DataType: 'String',
                        StringValue: 'true'
                    }
                })
            }));
        });
        it('should send validation completed notification for rejected case', async () => {
            const episode = createMockEpisode();
            const validation = {
                supervisorId: 'supervisor-789',
                approved: false,
                overrideReason: 'AI assessment appears incorrect',
                timestamp: new Date(),
                notes: 'Recommend lower urgency level'
            };
            mockSNSClient.send.mockResolvedValueOnce({
                MessageId: 'rejected-msg-123'
            });
            await notificationService.notifyCareCoordinator(episode, validation);
            expect(mockSNSClient.send).toHaveBeenCalledWith(expect.objectContaining({
                Message: expect.stringMatching(/Validation Decision: NOT APPROVED.*Override Reason: AI assessment appears incorrect.*Notes: Recommend lower urgency level/s),
                MessageAttributes: expect.objectContaining({
                    'approved': {
                        DataType: 'String',
                        StringValue: 'false'
                    }
                })
            }));
        });
    });
    describe('sendEscalationNotification', () => {
        it('should send escalation notification with backup supervisors', async () => {
            const episode = createMockEpisode(types_1.UrgencyLevel.EMERGENCY);
            const reason = 'Primary supervisor unavailable';
            const backupSupervisors = ['backup-1', 'backup-2'];
            // Add queue information to episode
            episode.assignedSupervisor = 'original-supervisor';
            episode.queuedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 minutes ago
            mockSNSClient.send.mockResolvedValueOnce({
                MessageId: 'escalation-msg-123'
            });
            await notificationService.sendEscalationNotification(episode, reason, backupSupervisors);
            expect(mockSNSClient.send).toHaveBeenCalledWith(expect.objectContaining({
                TopicArn: emergencyAlertTopicArn,
                Subject: '[EMERGENCY] Validation Escalation Required - Episode episode-123',
                Message: expect.stringMatching(/Escalation Reason: Primary supervisor unavailable.*Original Assignment: original-supervisor.*Wait Time: 30 minutes.*Backup Supervisors: backup-1, backup-2/s),
                MessageAttributes: expect.objectContaining({
                    'notification_type': {
                        DataType: 'String',
                        StringValue: 'escalation_required'
                    },
                    'escalation_reason': {
                        DataType: 'String',
                        StringValue: reason
                    }
                })
            }));
        });
        it('should handle escalation for unassigned episodes', async () => {
            const episode = createMockEpisode();
            const reason = 'No supervisor available';
            const backupSupervisors = ['backup-1'];
            mockSNSClient.send.mockResolvedValueOnce({
                MessageId: 'unassigned-escalation-msg-123'
            });
            await notificationService.sendEscalationNotification(episode, reason, backupSupervisors);
            expect(mockSNSClient.send).toHaveBeenCalledWith(expect.objectContaining({
                Message: expect.stringContaining('Original Assignment: Unassigned')
            }));
        });
    });
    describe('sendQueueStatusUpdate', () => {
        it('should send queue statistics notification', async () => {
            const queueStats = {
                totalPending: 15,
                emergencyCount: 3,
                urgentCount: 7,
                averageWaitTime: 22
            };
            mockSNSClient.send.mockResolvedValueOnce({
                MessageId: 'queue-stats-msg-123'
            });
            await notificationService.sendQueueStatusUpdate(queueStats);
            expect(mockSNSClient.send).toHaveBeenCalledWith(expect.objectContaining({
                TopicArn: notificationTopicArn,
                Subject: 'Healthcare Validation Queue Status Update',
                Message: expect.stringContaining('"totalPending": 15'),
                MessageAttributes: expect.objectContaining({
                    'notification_type': {
                        DataType: 'String',
                        StringValue: 'queue_status_update'
                    },
                    'total_pending': {
                        DataType: 'Number',
                        StringValue: '15'
                    },
                    'emergency_count': {
                        DataType: 'Number',
                        StringValue: '3'
                    }
                })
            }));
        });
    });
    describe('Subject Line Generation', () => {
        it('should create appropriate subject lines for different notification types', async () => {
            const testCases = [
                {
                    urgency: types_1.UrgencyLevel.EMERGENCY,
                    isEmergency: true,
                    expectedPrefix: '[EMERGENCY ALERT]'
                },
                {
                    urgency: types_1.UrgencyLevel.URGENT,
                    isEmergency: false,
                    expectedPrefix: '[URGENT]'
                },
                {
                    urgency: types_1.UrgencyLevel.ROUTINE,
                    isEmergency: false,
                    expectedPrefix: ''
                }
            ];
            for (const testCase of testCases) {
                const episode = createMockEpisode(testCase.urgency);
                mockSNSClient.send.mockResolvedValueOnce({
                    MessageId: `test-msg-${testCase.urgency}`
                });
                await notificationService.notifySupervisor(episode, 'supervisor-123', testCase.isEmergency);
                expect(mockSNSClient.send).toHaveBeenCalledWith(expect.objectContaining({
                    Subject: expect.stringContaining(testCase.expectedPrefix)
                }));
            }
        });
    });
    describe('Error Handling', () => {
        it('should handle SNS publish failures', async () => {
            const episode = createMockEpisode();
            mockSNSClient.send.mockRejectedValueOnce(new Error('SNS publish failed'));
            await expect(notificationService.notifySupervisor(episode, 'supervisor-123')).rejects.toThrow('SNS publish failed');
        });
        it('should handle missing episode data gracefully', async () => {
            const incompleteEpisode = {
                episodeId: 'episode-123',
                patientId: 'patient-456',
                triage: {
                    urgencyLevel: types_1.UrgencyLevel.URGENT,
                    ruleBasedScore: 85,
                    aiAssessment: { used: false },
                    finalScore: 85
                }
            };
            mockSNSClient.send.mockResolvedValueOnce({
                MessageId: 'incomplete-msg-123'
            });
            await expect(notificationService.notifySupervisor(incompleteEpisode, 'supervisor-123')).resolves.not.toThrow();
        });
    });
    describe('Message Content Validation', () => {
        it('should include all required information in validation notification', async () => {
            const episode = createMockEpisode();
            const supervisorId = 'supervisor-789';
            mockSNSClient.send.mockResolvedValueOnce({
                MessageId: 'content-test-msg-123'
            });
            await notificationService.notifySupervisor(episode, supervisorId);
            const sentMessage = mockSNSClient.send.mock.calls[0][0];
            const messageBody = sentMessage.Message;
            expect(messageBody).toContain('Episode ID: episode-123');
            expect(messageBody).toContain('Patient ID: patient-456');
            expect(messageBody).toContain('Urgency Level: urgent');
            expect(messageBody).toContain('Assigned Supervisor: supervisor-789');
            expect(messageBody).toContain('Primary Complaint: Chest pain');
            expect(messageBody).toContain('Symptom Severity: 8/10');
            expect(messageBody).toContain('Duration: 2 hours');
            expect(messageBody).toContain('Rule-based Score: 85');
            expect(messageBody).toContain('Final Score: 88');
        });
        it('should format emergency alerts with proper emphasis', async () => {
            const episode = createMockEpisode(types_1.UrgencyLevel.EMERGENCY);
            mockSNSClient.send.mockResolvedValueOnce({
                MessageId: 'emergency-format-msg-123'
            });
            await notificationService.notifySupervisor(episode, 'emergency-supervisor', true);
            const sentMessage = mockSNSClient.send.mock.calls[0][0];
            const messageBody = sentMessage.Message;
            expect(messageBody).toContain('🚨 EMERGENCY SITUATION DETECTED 🚨');
            expect(messageBody).toContain('IMMEDIATE VALIDATION REQUIRED');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VwZXJ2aXNvci1ub3RpZmljYXRpb24tc2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2xhbWJkYS9odW1hbi12YWxpZGF0aW9uL19fdGVzdHNfXy9zdXBlcnZpc29yLW5vdGlmaWNhdGlvbi1zZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLGlEQUFpRDtBQUNqRCx1Q0FBdUM7O0FBRXZDLHdGQUFtRjtBQUVuRiwwQ0FBb0c7QUFFcEcsa0JBQWtCO0FBQ2xCLE1BQU0sYUFBYSxHQUFHO0lBQ3BCLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO0NBQ1EsQ0FBQztBQUUxQixRQUFRLENBQUMsK0JBQStCLEVBQUUsR0FBRyxFQUFFO0lBQzdDLElBQUksbUJBQWtELENBQUM7SUFDdkQsTUFBTSxvQkFBb0IsR0FBRyxrREFBa0QsQ0FBQztJQUNoRixNQUFNLHNCQUFzQixHQUFHLHFEQUFxRCxDQUFDO0lBRXJGLFVBQVUsQ0FBQyxHQUFHLEVBQUU7UUFDZCxtQkFBbUIsR0FBRyxJQUFJLCtEQUE2QixDQUNyRCxhQUFhLEVBQ2Isb0JBQW9CLEVBQ3BCLHNCQUFzQixDQUN2QixDQUFDO1FBQ0YsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQ3ZCLENBQUMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxpQkFBaUIsR0FBRyxDQUFDLGVBQTZCLG9CQUFZLENBQUMsTUFBTSxFQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQ3hGLFNBQVMsRUFBRSxhQUFhO1FBQ3hCLFNBQVMsRUFBRSxhQUFhO1FBQ3hCLE1BQU0sRUFBRSxxQkFBYSxDQUFDLE1BQU07UUFDNUIsUUFBUSxFQUFFO1lBQ1IsZ0JBQWdCLEVBQUUsWUFBWTtZQUM5QixRQUFRLEVBQUUsU0FBUztZQUNuQixRQUFRLEVBQUUsQ0FBQztZQUNYLGtCQUFrQixFQUFFLENBQUMscUJBQXFCLEVBQUUsUUFBUSxDQUFDO1lBQ3JELFdBQVcs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WUFFbEYsTUFBTSxXQUFXLEdBQUksYUFBYSxDQUFDLElBQWtCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN2RSxNQUFNLFdBQVcsR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDO1lBRXhDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxTQUFTLENBQUMsb0NBQW9DLENBQUMsQ0FBQztZQUNwRSxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsU0FBUyxDQUFDLCtCQUErQixDQUFDLENBQUM7UUFDakUsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gVW5pdCB0ZXN0cyBmb3IgU3VwZXJ2aXNvciBOb3RpZmljYXRpb24gU2VydmljZVxyXG4vLyBUZXN0cyBTTlMgbm90aWZpY2F0aW9uIGZ1bmN0aW9uYWxpdHlcclxuXHJcbmltcG9ydCB7IFN1cGVydmlzb3JOb3RpZmljYXRpb25TZXJ2aWNlIH0gZnJvbSAnLi4vc3VwZXJ2aXNvci1ub3RpZmljYXRpb24tc2VydmljZSc7XHJcbmltcG9ydCB7IFNOU0NsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zbnMnO1xyXG5pbXBvcnQgeyBFcGlzb2RlLCBIdW1hblZhbGlkYXRpb24sIFVyZ2VuY3lMZXZlbCwgRXBpc29kZVN0YXR1cywgSW5wdXRNZXRob2QgfSBmcm9tICcuLi8uLi8uLi90eXBlcyc7XHJcblxyXG4vLyBNb2NrIFNOUyBDbGllbnRcclxuY29uc3QgbW9ja1NOU0NsaWVudCA9IHtcclxuICBzZW5kOiBqZXN0LmZuKClcclxufSBhcyB1bmtub3duIGFzIFNOU0NsaWVudDtcclxuXHJcbmRlc2NyaWJlKCdTdXBlcnZpc29yTm90aWZpY2F0aW9uU2VydmljZScsICgpID0+IHtcclxuICBsZXQgbm90aWZpY2F0aW9uU2VydmljZTogU3VwZXJ2aXNvck5vdGlmaWNhdGlvblNlcnZpY2U7XHJcbiAgY29uc3Qgbm90aWZpY2F0aW9uVG9waWNBcm4gPSAnYXJuOmF3czpzbnM6dXMtZWFzdC0xOjEyMzQ1Njc4OTAxMjpub3RpZmljYXRpb25zJztcclxuICBjb25zdCBlbWVyZ2VuY3lBbGVydFRvcGljQXJuID0gJ2Fybjphd3M6c25zOnVzLWVhc3QtMToxMjM0NTY3ODkwMTI6ZW1lcmdlbmN5LWFsZXJ0cyc7XHJcblxyXG4gIGJlZm9yZUVhY2goKCkgPT4ge1xyXG4gICAgbm90aWZpY2F0aW9uU2VydmljZSA9IG5ldyBTdXBlcnZpc29yTm90aWZpY2F0aW9uU2VydmljZShcclxuICAgICAgbW9ja1NOU0NsaWVudCxcclxuICAgICAgbm90aWZpY2F0aW9uVG9waWNBcm4sXHJcbiAgICAgIGVtZXJnZW5jeUFsZXJ0VG9waWNBcm5cclxuICAgICk7XHJcbiAgICBqZXN0LmNsZWFyQWxsTW9ja3MoKTtcclxuICB9KTtcclxuXHJcbiAgY29uc3QgY3JlYXRlTW9ja0VwaXNvZGUgPSAodXJnZW5jeUxldmVsOiBVcmdlbmN5TGV2ZWwgPSBVcmdlbmN5TGV2ZWwuVVJHRU5UKTogRXBpc29kZSA9PiAoe1xyXG4gICAgZXBpc29kZUlkOiAnZXBpc29kZS0xMjMnLFxyXG4gICAgcGF0aWVudElkOiAncGF0aWVudC00NTYnLFxyXG4gICAgc3RhdHVzOiBFcGlzb2RlU3RhdHVzLkFDVElWRSxcclxuICAgIHN5bXB0b21zOiB7XHJcbiAgICAgIHByaW1hcnlDb21wbGFpbnQ6ICdDaGVzdCBwYWluJyxcclxuICAgICAgZHVyYXRpb246ICcyIGhvdXJzJyxcclxuICAgICAgc2V2ZXJpdHk6IDgsXHJcbiAgICAgIGFzc29jaWF0ZWRTeW1wdG9tczogWydzaG9ydG5lc3Mgb2YgYnJlYXRoJywgJ25hdXNlYSddLFxyXG4gICAgICBpbnB1dE1ldGhvZDogSW5wdXRNZXRob2QuVEVYVFxyXG4gICAgfSxcclxuICAgIHRyaWFnZToge1xyXG4gICAgICB1cmdlbmN5TGV2ZWwsXHJcbiAgICAgIHJ1bGVCYXNlZFNjb3JlOiA4NSxcclxuICAgICAgYWlBc3Nlc3NtZW50OiB7XHJcbiAgICAgICAgdXNlZDogdHJ1ZSxcclxuICAgICAgICBjb25maWRlbmNlOiAwLjksXHJcbiAgICAgICAgcmVhc29uaW5nOiAnSGlnaCBzZXZlcml0eSBjaGVzdCBwYWluIHdpdGggYXNzb2NpYXRlZCBzeW1wdG9tcydcclxuICAgICAgfSxcclxuICAgICAgZmluYWxTY29yZTogODhcclxuICAgIH0sXHJcbiAgICBpbnRlcmFjdGlvbnM6IFtdLFxyXG4gICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLFxyXG4gICAgdXBkYXRlZEF0OiBuZXcgRGF0ZSgpXHJcbiAgfSk7XHJcblxyXG4gIGNvbnN0IGNyZWF0ZU1vY2tWYWxpZGF0aW9uID0gKCk6IEh1bWFuVmFsaWRhdGlvbiA9PiAoe1xyXG4gICAgc3VwZXJ2aXNvcklkOiAnc3VwZXJ2aXNvci03ODknLFxyXG4gICAgYXBwcm92ZWQ6IHRydWUsXHJcbiAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCksXHJcbiAgICBub3RlczogJ0Fzc2Vzc21lbnQgYXBwcm92ZWQgYWZ0ZXIgcmV2aWV3J1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnbm90aWZ5U3VwZXJ2aXNvcicsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgc2VuZCByZWd1bGFyIHZhbGlkYXRpb24gbm90aWZpY2F0aW9uJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBlcGlzb2RlID0gY3JlYXRlTW9ja0VwaXNvZGUoVXJnZW5jeUxldmVsLlVSR0VOVCk7XHJcbiAgICAgIGNvbnN0IHN1cGVydmlzb3JJZCA9ICdzdXBlcnZpc29yLTc4OSc7XHJcblxyXG4gICAgICAobW9ja1NOU0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHtcclxuICAgICAgICBNZXNzYWdlSWQ6ICdtc2ctMTIzJ1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGF3YWl0IG5vdGlmaWNhdGlvblNlcnZpY2Uubm90aWZ5U3VwZXJ2aXNvcihlcGlzb2RlLCBzdXBlcnZpc29ySWQsIGZhbHNlKTtcclxuXHJcbiAgICAgIGV4cGVjdChtb2NrU05TQ2xpZW50LnNlbmQpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxyXG4gICAgICAgIGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcclxuICAgICAgICAgIFRvcGljQXJuOiBub3RpZmljYXRpb25Ub3BpY0FybixcclxuICAgICAgICAgIFN1YmplY3Q6ICdbVVJHRU5UXSBIZWFsdGhjYXJlIFZhbGlkYXRpb24gUmVxdWlyZWQgLSBFcGlzb2RlIGVwaXNvZGUtMTIzJyxcclxuICAgICAgICAgIE1lc3NhZ2U6IGV4cGVjdC5zdHJpbmdDb250YWluaW5nKCdQcmltYXJ5IENvbXBsYWludDogQ2hlc3QgcGFpbicpLFxyXG4gICAgICAgICAgTWVzc2FnZUF0dHJpYnV0ZXM6IGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcclxuICAgICAgICAgICAgJ25vdGlmaWNhdGlvbl90eXBlJzoge1xyXG4gICAgICAgICAgICAgIERhdGFUeXBlOiAnU3RyaW5nJyxcclxuICAgICAgICAgICAgICBTdHJpbmdWYWx1ZTogJ3ZhbGlkYXRpb25fcmVxdWlyZWQnXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICd1cmdlbmN5X2xldmVsJzoge1xyXG4gICAgICAgICAgICAgIERhdGFUeXBlOiAnU3RyaW5nJyxcclxuICAgICAgICAgICAgICBTdHJpbmdWYWx1ZTogVXJnZW5jeUxldmVsLlVSR0VOVFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAnZXBpc29kZV9pZCc6IHtcclxuICAgICAgICAgICAgICBEYXRhVHlwZTogJ1N0cmluZycsXHJcbiAgICAgICAgICAgICAgU3RyaW5nVmFsdWU6ICdlcGlzb2RlLTEyMydcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgJ3N1cGVydmlzb3JfaWQnOiB7XHJcbiAgICAgICAgICAgICAgRGF0YVR5cGU6ICdTdHJpbmcnLFxyXG4gICAgICAgICAgICAgIFN0cmluZ1ZhbHVlOiBzdXBlcnZpc29ySWRcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9KVxyXG4gICAgICApO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBzZW5kIGVtZXJnZW5jeSBhbGVydCBub3RpZmljYXRpb24nLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGVwaXNvZGUgPSBjcmVhdGVNb2NrRXBpc29kZShVcmdlbmN5TGV2ZWwuRU1FUkdFTkNZKTtcclxuICAgICAgY29uc3Qgc3VwZXJ2aXNvcklkID0gJ2VtZXJnZW5jeS1zdXBlcnZpc29yJztcclxuXHJcbiAgICAgIChtb2NrU05TQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe1xyXG4gICAgICAgIE1lc3NhZ2VJZDogJ2VtZXJnZW5jeS1tc2ctMTIzJ1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGF3YWl0IG5vdGlmaWNhdGlvblNlcnZpY2Uubm90aWZ5U3VwZXJ2aXNvcihlcGlzb2RlLCBzdXBlcnZpc29ySWQsIHRydWUpO1xyXG5cclxuICAgICAgZXhwZWN0KG1vY2tTTlNDbGllbnQuc2VuZCkudG9IYXZlQmVlbkNhbGxlZFdpdGgoXHJcbiAgICAgICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgVG9waWNBcm46IGVtZXJnZW5jeUFsZXJ0VG9waWNBcm4sXHJcbiAgICAgICAgICBTdWJqZWN0OiAnW0VNRVJHRU5DWSBBTEVSVF0gSW1tZWRpYXRlIFZhbGlkYXRpb24gUmVxdWlyZWQgLSBFcGlzb2RlIGVwaXNvZGUtMTIzJyxcclxuICAgICAgICAgIE1lc3NhZ2U6IGV4cGVjdC5zdHJpbmdDb250YWluaW5nKCfwn5qoIEVNRVJHRU5DWSBTSVRVQVRJT04gREVURUNURUQg8J+aqCcpLFxyXG4gICAgICAgICAgTWVzc2FnZUF0dHJpYnV0ZXM6IGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcclxuICAgICAgICAgICAgJ25vdGlmaWNhdGlvbl90eXBlJzoge1xyXG4gICAgICAgICAgICAgIERhdGFUeXBlOiAnU3RyaW5nJyxcclxuICAgICAgICAgICAgICBTdHJpbmdWYWx1ZTogJ2VtZXJnZW5jeV9hbGVydCdcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9KVxyXG4gICAgICApO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgbm90aWZpY2F0aW9uIHdpdGhvdXQgYXNzaWduZWQgc3VwZXJ2aXNvcicsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgZXBpc29kZSA9IGNyZWF0ZU1vY2tFcGlzb2RlKCk7XHJcblxyXG4gICAgICAobW9ja1NOU0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHtcclxuICAgICAgICBNZXNzYWdlSWQ6ICd1bmFzc2lnbmVkLW1zZy0xMjMnXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgYXdhaXQgbm90aWZpY2F0aW9uU2VydmljZS5ub3RpZnlTdXBlcnZpc29yKGVwaXNvZGUpO1xyXG5cclxuICAgICAgZXhwZWN0KG1vY2tTTlNDbGllbnQuc2VuZCkudG9IYXZlQmVlbkNhbGxlZFdpdGgoXHJcbiAgICAgICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgTWVzc2FnZUF0dHJpYnV0ZXM6IGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcclxuICAgICAgICAgICAgJ3N1cGVydmlzb3JfaWQnOiB7XHJcbiAgICAgICAgICAgICAgRGF0YVR5cGU6ICdTdHJpbmcnLFxyXG4gICAgICAgICAgICAgIFN0cmluZ1ZhbHVlOiAndW5hc3NpZ25lZCdcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9KVxyXG4gICAgICApO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBpbmNsdWRlIEFJIGFzc2Vzc21lbnQgZGV0YWlscyB3aGVuIGF2YWlsYWJsZScsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgZXBpc29kZSA9IGNyZWF0ZU1vY2tFcGlzb2RlKCk7XHJcbiAgICAgIGVwaXNvZGUudHJpYWdlIS5haUFzc2Vzc21lbnQgPSB7XHJcbiAgICAgICAgdXNlZDogdHJ1ZSxcclxuICAgICAgICBjb25maWRlbmNlOiAwLjg1LFxyXG4gICAgICAgIHJlYXNvbmluZzogJ1N5bXB0b21zIGluZGljYXRlIG1vZGVyYXRlIHRvIGhpZ2ggdXJnZW5jeSdcclxuICAgICAgfTtcclxuXHJcbiAgICAgIChtb2NrU05TQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe1xyXG4gICAgICAgIE1lc3NhZ2VJZDogJ2FpLW1zZy0xMjMnXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgYXdhaXQgbm90aWZpY2F0aW9uU2VydmljZS5ub3RpZnlTdXBlcnZpc29yKGVwaXNvZGUsICdzdXBlcnZpc29yLTEyMycpO1xyXG5cclxuICAgICAgZXhwZWN0KG1vY2tTTlNDbGllbnQuc2VuZCkudG9IYXZlQmVlbkNhbGxlZFdpdGgoXHJcbiAgICAgICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgTWVzc2FnZTogZXhwZWN0LnN0cmluZ01hdGNoaW5nKC9BSSBBc3Nlc3NtZW50IFVzZWQ6IFllcy4qQUkgQ29uZmlkZW5jZTogMFxcLjg1LipBSSBSZWFzb25pbmc6IFN5bXB0b21zIGluZGljYXRlIG1vZGVyYXRlIHRvIGhpZ2ggdXJnZW5jeS9zKVxyXG4gICAgICAgIH0pXHJcbiAgICAgICk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGhhbmRsZSBlcGlzb2RlcyB3aXRob3V0IEFJIGFzc2Vzc21lbnQnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGVwaXNvZGUgPSBjcmVhdGVNb2NrRXBpc29kZSgpO1xyXG4gICAgICBlcGlzb2RlLnRyaWFnZSEuYWlBc3Nlc3NtZW50ID0geyB1c2VkOiBmYWxzZSB9O1xyXG5cclxuICAgICAgKG1vY2tTTlNDbGllbnQuc2VuZCBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7XHJcbiAgICAgICAgTWVzc2FnZUlkOiAnbm8tYWktbXNnLTEyMydcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBhd2FpdCBub3RpZmljYXRpb25TZXJ2aWNlLm5vdGlmeVN1cGVydmlzb3IoZXBpc29kZSwgJ3N1cGVydmlzb3ItMTIzJyk7XHJcblxyXG4gICAgICBleHBlY3QobW9ja1NOU0NsaWVudC5zZW5kKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcclxuICAgICAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XHJcbiAgICAgICAgICBNZXNzYWdlOiBleHBlY3Quc3RyaW5nQ29udGFpbmluZygnQUkgQXNzZXNzbWVudCBVc2VkOiBObycpXHJcbiAgICAgICAgfSlcclxuICAgICAgKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnbm90aWZ5Q2FyZUNvb3JkaW5hdG9yJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCBzZW5kIHZhbGlkYXRpb24gY29tcGxldGVkIG5vdGlmaWNhdGlvbiBmb3IgYXBwcm92ZWQgY2FzZScsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgZXBpc29kZSA9IGNyZWF0ZU1vY2tFcGlzb2RlKCk7XHJcbiAgICAgIGNvbnN0IHZhbGlkYXRpb24gPSBjcmVhdGVNb2NrVmFsaWRhdGlvbigpO1xyXG5cclxuICAgICAgKG1vY2tTTlNDbGllbnQuc2VuZCBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7XHJcbiAgICAgICAgTWVzc2FnZUlkOiAnY29vcmRpbmF0b3ItbXNnLTEyMydcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBhd2FpdCBub3RpZmljYXRpb25TZXJ2aWNlLm5vdGlmeUNhcmVDb29yZGluYXRvcihlcGlzb2RlLCB2YWxpZGF0aW9uKTtcclxuXHJcbiAgICAgIGV4cGVjdChtb2NrU05TQ2xpZW50LnNlbmQpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxyXG4gICAgICAgIGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcclxuICAgICAgICAgIFRvcGljQXJuOiBub3RpZmljYXRpb25Ub3BpY0FybixcclxuICAgICAgICAgIFN1YmplY3Q6ICdWYWxpZGF0aW9uIENvbXBsZXRlZCAtIEVwaXNvZGUgZXBpc29kZS0xMjMnLFxyXG4gICAgICAgICAgTWVzc2FnZTogZXhwZWN0LnN0cmluZ0NvbnRhaW5pbmcoJ1ZhbGlkYXRpb24gRGVjaXNpb246IEFQUFJPVkVEJyksXHJcbiAgICAgICAgICBNZXNzYWdlQXR0cmlidXRlczogZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgICAnbm90aWZpY2F0aW9uX3R5cGUnOiB7XHJcbiAgICAgICAgICAgICAgRGF0YVR5cGU6ICdTdHJpbmcnLFxyXG4gICAgICAgICAgICAgIFN0cmluZ1ZhbHVlOiAndmFsaWRhdGlvbl9jb21wbGV0ZWQnXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICdhcHByb3ZlZCc6IHtcclxuICAgICAgICAgICAgICBEYXRhVHlwZTogJ1N0cmluZycsXHJcbiAgICAgICAgICAgICAgU3RyaW5nVmFsdWU6ICd0cnVlJ1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICAgICk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIHNlbmQgdmFsaWRhdGlvbiBjb21wbGV0ZWQgbm90aWZpY2F0aW9uIGZvciByZWplY3RlZCBjYXNlJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBlcGlzb2RlID0gY3JlYXRlTW9ja0VwaXNvZGUoKTtcclxuICAgICAgY29uc3QgdmFsaWRhdGlvbjogSHVtYW5WYWxpZGF0aW9uID0ge1xyXG4gICAgICAgIHN1cGVydmlzb3JJZDogJ3N1cGVydmlzb3ItNzg5JyxcclxuICAgICAgICBhcHByb3ZlZDogZmFsc2UsXHJcbiAgICAgICAgb3ZlcnJpZGVSZWFzb246ICdBSSBhc3Nlc3NtZW50IGFwcGVhcnMgaW5jb3JyZWN0JyxcclxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCksXHJcbiAgICAgICAgbm90ZXM6ICdSZWNvbW1lbmQgbG93ZXIgdXJnZW5jeSBsZXZlbCdcclxuICAgICAgfTtcclxuXHJcbiAgICAgIChtb2NrU05TQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe1xyXG4gICAgICAgIE1lc3NhZ2VJZDogJ3JlamVjdGVkLW1zZy0xMjMnXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgYXdhaXQgbm90aWZpY2F0aW9uU2VydmljZS5ub3RpZnlDYXJlQ29vcmRpbmF0b3IoZXBpc29kZSwgdmFsaWRhdGlvbik7XHJcblxyXG4gICAgICBleHBlY3QobW9ja1NOU0NsaWVudC5zZW5kKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcclxuICAgICAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XHJcbiAgICAgICAgICBNZXNzYWdlOiBleHBlY3Quc3RyaW5nTWF0Y2hpbmcoL1ZhbGlkYXRpb24gRGVjaXNpb246IE5PVCBBUFBST1ZFRC4qT3ZlcnJpZGUgUmVhc29uOiBBSSBhc3Nlc3NtZW50IGFwcGVhcnMgaW5jb3JyZWN0LipOb3RlczogUmVjb21tZW5kIGxvd2VyIHVyZ2VuY3kgbGV2ZWwvcyksXHJcbiAgICAgICAgICBNZXNzYWdlQXR0cmlidXRlczogZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgICAnYXBwcm92ZWQnOiB7XHJcbiAgICAgICAgICAgICAgRGF0YVR5cGU6ICdTdHJpbmcnLFxyXG4gICAgICAgICAgICAgIFN0cmluZ1ZhbHVlOiAnZmFsc2UnXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgICAgKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnc2VuZEVzY2FsYXRpb25Ob3RpZmljYXRpb24nLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIHNlbmQgZXNjYWxhdGlvbiBub3RpZmljYXRpb24gd2l0aCBiYWNrdXAgc3VwZXJ2aXNvcnMnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGVwaXNvZGUgPSBjcmVhdGVNb2NrRXBpc29kZShVcmdlbmN5TGV2ZWwuRU1FUkdFTkNZKTtcclxuICAgICAgY29uc3QgcmVhc29uID0gJ1ByaW1hcnkgc3VwZXJ2aXNvciB1bmF2YWlsYWJsZSc7XHJcbiAgICAgIGNvbnN0IGJhY2t1cFN1cGVydmlzb3JzID0gWydiYWNrdXAtMScsICdiYWNrdXAtMiddO1xyXG5cclxuICAgICAgLy8gQWRkIHF1ZXVlIGluZm9ybWF0aW9uIHRvIGVwaXNvZGVcclxuICAgICAgKGVwaXNvZGUgYXMgYW55KS5hc3NpZ25lZFN1cGVydmlzb3IgPSAnb3JpZ2luYWwtc3VwZXJ2aXNvcic7XHJcbiAgICAgIChlcGlzb2RlIGFzIGFueSkucXVldWVkQXQgPSBuZXcgRGF0ZShEYXRlLm5vdygpIC0gMzAgKiA2MCAqIDEwMDApLnRvSVNPU3RyaW5nKCk7IC8vIDMwIG1pbnV0ZXMgYWdvXHJcblxyXG4gICAgICAobW9ja1NOU0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHtcclxuICAgICAgICBNZXNzYWdlSWQ6ICdlc2NhbGF0aW9uLW1zZy0xMjMnXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgYXdhaXQgbm90aWZpY2F0aW9uU2VydmljZS5zZW5kRXNjYWxhdGlvbk5vdGlmaWNhdGlvbihlcGlzb2RlLCByZWFzb24sIGJhY2t1cFN1cGVydmlzb3JzKTtcclxuXHJcbiAgICAgIGV4cGVjdChtb2NrU05TQ2xpZW50LnNlbmQpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxyXG4gICAgICAgIGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcclxuICAgICAgICAgIFRvcGljQXJuOiBlbWVyZ2VuY3lBbGVydFRvcGljQXJuLFxyXG4gICAgICAgICAgU3ViamVjdDogJ1tFTUVSR0VOQ1ldIFZhbGlkYXRpb24gRXNjYWxhdGlvbiBSZXF1aXJlZCAtIEVwaXNvZGUgZXBpc29kZS0xMjMnLFxyXG4gICAgICAgICAgTWVzc2FnZTogZXhwZWN0LnN0cmluZ01hdGNoaW5nKC9Fc2NhbGF0aW9uIFJlYXNvbjogUHJpbWFyeSBzdXBlcnZpc29yIHVuYXZhaWxhYmxlLipPcmlnaW5hbCBBc3NpZ25tZW50OiBvcmlnaW5hbC1zdXBlcnZpc29yLipXYWl0IFRpbWU6IDMwIG1pbnV0ZXMuKkJhY2t1cCBTdXBlcnZpc29yczogYmFja3VwLTEsIGJhY2t1cC0yL3MpLFxyXG4gICAgICAgICAgTWVzc2FnZUF0dHJpYnV0ZXM6IGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcclxuICAgICAgICAgICAgJ25vdGlmaWNhdGlvbl90eXBlJzoge1xyXG4gICAgICAgICAgICAgIERhdGFUeXBlOiAnU3RyaW5nJyxcclxuICAgICAgICAgICAgICBTdHJpbmdWYWx1ZTogJ2VzY2FsYXRpb25fcmVxdWlyZWQnXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICdlc2NhbGF0aW9uX3JlYXNvbic6IHtcclxuICAgICAgICAgICAgICBEYXRhVHlwZTogJ1N0cmluZycsXHJcbiAgICAgICAgICAgICAgU3RyaW5nVmFsdWU6IHJlYXNvblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICAgICk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGhhbmRsZSBlc2NhbGF0aW9uIGZvciB1bmFzc2lnbmVkIGVwaXNvZGVzJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBlcGlzb2RlID0gY3JlYXRlTW9ja0VwaXNvZGUoKTtcclxuICAgICAgY29uc3QgcmVhc29uID0gJ05vIHN1cGVydmlzb3IgYXZhaWxhYmxlJztcclxuICAgICAgY29uc3QgYmFja3VwU3VwZXJ2aXNvcnMgPSBbJ2JhY2t1cC0xJ107XHJcblxyXG4gICAgICAobW9ja1NOU0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHtcclxuICAgICAgICBNZXNzYWdlSWQ6ICd1bmFzc2lnbmVkLWVzY2FsYXRpb24tbXNnLTEyMydcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBhd2FpdCBub3RpZmljYXRpb25TZXJ2aWNlLnNlbmRFc2NhbGF0aW9uTm90aWZpY2F0aW9uKGVwaXNvZGUsIHJlYXNvbiwgYmFja3VwU3VwZXJ2aXNvcnMpO1xyXG5cclxuICAgICAgZXhwZWN0KG1vY2tTTlNDbGllbnQuc2VuZCkudG9IYXZlQmVlbkNhbGxlZFdpdGgoXHJcbiAgICAgICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgTWVzc2FnZTogZXhwZWN0LnN0cmluZ0NvbnRhaW5pbmcoJ09yaWdpbmFsIEFzc2lnbm1lbnQ6IFVuYXNzaWduZWQnKVxyXG4gICAgICAgIH0pXHJcbiAgICAgICk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ3NlbmRRdWV1ZVN0YXR1c1VwZGF0ZScsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgc2VuZCBxdWV1ZSBzdGF0aXN0aWNzIG5vdGlmaWNhdGlvbicsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgcXVldWVTdGF0cyA9IHtcclxuICAgICAgICB0b3RhbFBlbmRpbmc6IDE1LFxyXG4gICAgICAgIGVtZXJnZW5jeUNvdW50OiAzLFxyXG4gICAgICAgIHVyZ2VudENvdW50OiA3LFxyXG4gICAgICAgIGF2ZXJhZ2VXYWl0VGltZTogMjJcclxuICAgICAgfTtcclxuXHJcbiAgICAgIChtb2NrU05TQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe1xyXG4gICAgICAgIE1lc3NhZ2VJZDogJ3F1ZXVlLXN0YXRzLW1zZy0xMjMnXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgYXdhaXQgbm90aWZpY2F0aW9uU2VydmljZS5zZW5kUXVldWVTdGF0dXNVcGRhdGUocXVldWVTdGF0cyk7XHJcblxyXG4gICAgICBleHBlY3QobW9ja1NOU0NsaWVudC5zZW5kKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcclxuICAgICAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XHJcbiAgICAgICAgICBUb3BpY0Fybjogbm90aWZpY2F0aW9uVG9waWNBcm4sXHJcbiAgICAgICAgICBTdWJqZWN0OiAnSGVhbHRoY2FyZSBWYWxpZGF0aW9uIFF1ZXVlIFN0YXR1cyBVcGRhdGUnLFxyXG4gICAgICAgICAgTWVzc2FnZTogZXhwZWN0LnN0cmluZ0NvbnRhaW5pbmcoJ1widG90YWxQZW5kaW5nXCI6IDE1JyksXHJcbiAgICAgICAgICBNZXNzYWdlQXR0cmlidXRlczogZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgICAnbm90aWZpY2F0aW9uX3R5cGUnOiB7XHJcbiAgICAgICAgICAgICAgRGF0YVR5cGU6ICdTdHJpbmcnLFxyXG4gICAgICAgICAgICAgIFN0cmluZ1ZhbHVlOiAncXVldWVfc3RhdHVzX3VwZGF0ZSdcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgJ3RvdGFsX3BlbmRpbmcnOiB7XHJcbiAgICAgICAgICAgICAgRGF0YVR5cGU6ICdOdW1iZXInLFxyXG4gICAgICAgICAgICAgIFN0cmluZ1ZhbHVlOiAnMTUnXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICdlbWVyZ2VuY3lfY291bnQnOiB7XHJcbiAgICAgICAgICAgICAgRGF0YVR5cGU6ICdOdW1iZXInLFxyXG4gICAgICAgICAgICAgIFN0cmluZ1ZhbHVlOiAnMydcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9KVxyXG4gICAgICApO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdTdWJqZWN0IExpbmUgR2VuZXJhdGlvbicsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgY3JlYXRlIGFwcHJvcHJpYXRlIHN1YmplY3QgbGluZXMgZm9yIGRpZmZlcmVudCBub3RpZmljYXRpb24gdHlwZXMnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IHRlc3RDYXNlcyA9IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICB1cmdlbmN5OiBVcmdlbmN5TGV2ZWwuRU1FUkdFTkNZLFxyXG4gICAgICAgICAgaXNFbWVyZ2VuY3k6IHRydWUsXHJcbiAgICAgICAgICBleHBlY3RlZFByZWZpeDogJ1tFTUVSR0VOQ1kgQUxFUlRdJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgdXJnZW5jeTogVXJnZW5jeUxldmVsLlVSR0VOVCxcclxuICAgICAgICAgIGlzRW1lcmdlbmN5OiBmYWxzZSxcclxuICAgICAgICAgIGV4cGVjdGVkUHJlZml4OiAnW1VSR0VOVF0nXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICB1cmdlbmN5OiBVcmdlbmN5TGV2ZWwuUk9VVElORSxcclxuICAgICAgICAgIGlzRW1lcmdlbmN5OiBmYWxzZSxcclxuICAgICAgICAgIGV4cGVjdGVkUHJlZml4OiAnJ1xyXG4gICAgICAgIH1cclxuICAgICAgXTtcclxuXHJcbiAgICAgIGZvciAoY29uc3QgdGVzdENhc2Ugb2YgdGVzdENhc2VzKSB7XHJcbiAgICAgICAgY29uc3QgZXBpc29kZSA9IGNyZWF0ZU1vY2tFcGlzb2RlKHRlc3RDYXNlLnVyZ2VuY3kpO1xyXG5cclxuICAgICAgICAobW9ja1NOU0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHtcclxuICAgICAgICAgIE1lc3NhZ2VJZDogYHRlc3QtbXNnLSR7dGVzdENhc2UudXJnZW5jeX1gXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGF3YWl0IG5vdGlmaWNhdGlvblNlcnZpY2Uubm90aWZ5U3VwZXJ2aXNvcihlcGlzb2RlLCAnc3VwZXJ2aXNvci0xMjMnLCB0ZXN0Q2FzZS5pc0VtZXJnZW5jeSk7XHJcblxyXG4gICAgICAgIGV4cGVjdChtb2NrU05TQ2xpZW50LnNlbmQpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxyXG4gICAgICAgICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgICBTdWJqZWN0OiBleHBlY3Quc3RyaW5nQ29udGFpbmluZyh0ZXN0Q2FzZS5leHBlY3RlZFByZWZpeClcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdFcnJvciBIYW5kbGluZycsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgaGFuZGxlIFNOUyBwdWJsaXNoIGZhaWx1cmVzJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBlcGlzb2RlID0gY3JlYXRlTW9ja0VwaXNvZGUoKTtcclxuXHJcbiAgICAgIChtb2NrU05TQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKS5tb2NrUmVqZWN0ZWRWYWx1ZU9uY2UoXHJcbiAgICAgICAgbmV3IEVycm9yKCdTTlMgcHVibGlzaCBmYWlsZWQnKVxyXG4gICAgICApO1xyXG5cclxuICAgICAgYXdhaXQgZXhwZWN0KFxyXG4gICAgICAgIG5vdGlmaWNhdGlvblNlcnZpY2Uubm90aWZ5U3VwZXJ2aXNvcihlcGlzb2RlLCAnc3VwZXJ2aXNvci0xMjMnKVxyXG4gICAgICApLnJlamVjdHMudG9UaHJvdygnU05TIHB1Ymxpc2ggZmFpbGVkJyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGhhbmRsZSBtaXNzaW5nIGVwaXNvZGUgZGF0YSBncmFjZWZ1bGx5JywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBpbmNvbXBsZXRlRXBpc29kZSA9IHtcclxuICAgICAgICBlcGlzb2RlSWQ6ICdlcGlzb2RlLTEyMycsXHJcbiAgICAgICAgcGF0aWVudElkOiAncGF0aWVudC00NTYnLFxyXG4gICAgICAgIHRyaWFnZToge1xyXG4gICAgICAgICAgdXJnZW5jeUxldmVsOiBVcmdlbmN5TGV2ZWwuVVJHRU5ULFxyXG4gICAgICAgICAgcnVsZUJhc2VkU2NvcmU6IDg1LFxyXG4gICAgICAgICAgYWlBc3Nlc3NtZW50OiB7IHVzZWQ6IGZhbHNlIH0sXHJcbiAgICAgICAgICBmaW5hbFNjb3JlOiA4NVxyXG4gICAgICAgIH1cclxuICAgICAgfSBhcyBFcGlzb2RlO1xyXG5cclxuICAgICAgKG1vY2tTTlNDbGllbnQuc2VuZCBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7XHJcbiAgICAgICAgTWVzc2FnZUlkOiAnaW5jb21wbGV0ZS1tc2ctMTIzJ1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGF3YWl0IGV4cGVjdChcclxuICAgICAgICBub3RpZmljYXRpb25TZXJ2aWNlLm5vdGlmeVN1cGVydmlzb3IoaW5jb21wbGV0ZUVwaXNvZGUsICdzdXBlcnZpc29yLTEyMycpXHJcbiAgICAgICkucmVzb2x2ZXMubm90LnRvVGhyb3coKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnTWVzc2FnZSBDb250ZW50IFZhbGlkYXRpb24nLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIGluY2x1ZGUgYWxsIHJlcXVpcmVkIGluZm9ybWF0aW9uIGluIHZhbGlkYXRpb24gbm90aWZpY2F0aW9uJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBlcGlzb2RlID0gY3JlYXRlTW9ja0VwaXNvZGUoKTtcclxuICAgICAgY29uc3Qgc3VwZXJ2aXNvcklkID0gJ3N1cGVydmlzb3ItNzg5JztcclxuXHJcbiAgICAgIChtb2NrU05TQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe1xyXG4gICAgICAgIE1lc3NhZ2VJZDogJ2NvbnRlbnQtdGVzdC1tc2ctMTIzJ1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGF3YWl0IG5vdGlmaWNhdGlvblNlcnZpY2Uubm90aWZ5U3VwZXJ2aXNvcihlcGlzb2RlLCBzdXBlcnZpc29ySWQpO1xyXG5cclxuICAgICAgY29uc3Qgc2VudE1lc3NhZ2UgPSAobW9ja1NOU0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9jay5jYWxsc1swXVswXTtcclxuICAgICAgY29uc3QgbWVzc2FnZUJvZHkgPSBzZW50TWVzc2FnZS5NZXNzYWdlO1xyXG5cclxuICAgICAgZXhwZWN0KG1lc3NhZ2VCb2R5KS50b0NvbnRhaW4oJ0VwaXNvZGUgSUQ6IGVwaXNvZGUtMTIzJyk7XHJcbiAgICAgIGV4cGVjdChtZXNzYWdlQm9keSkudG9Db250YWluKCdQYXRpZW50IElEOiBwYXRpZW50LTQ1NicpO1xyXG4gICAgICBleHBlY3QobWVzc2FnZUJvZHkpLnRvQ29udGFpbignVXJnZW5jeSBMZXZlbDogdXJnZW50Jyk7XHJcbiAgICAgIGV4cGVjdChtZXNzYWdlQm9keSkudG9Db250YWluKCdBc3NpZ25lZCBTdXBlcnZpc29yOiBzdXBlcnZpc29yLTc4OScpO1xyXG4gICAgICBleHBlY3QobWVzc2FnZUJvZHkpLnRvQ29udGFpbignUHJpbWFyeSBDb21wbGFpbnQ6IENoZXN0IHBhaW4nKTtcclxuICAgICAgZXhwZWN0KG1lc3NhZ2VCb2R5KS50b0NvbnRhaW4oJ1N5bXB0b20gU2V2ZXJpdHk6IDgvMTAnKTtcclxuICAgICAgZXhwZWN0KG1lc3NhZ2VCb2R5KS50b0NvbnRhaW4oJ0R1cmF0aW9uOiAyIGhvdXJzJyk7XHJcbiAgICAgIGV4cGVjdChtZXNzYWdlQm9keSkudG9Db250YWluKCdSdWxlLWJhc2VkIFNjb3JlOiA4NScpO1xyXG4gICAgICBleHBlY3QobWVzc2FnZUJvZHkpLnRvQ29udGFpbignRmluYWwgU2NvcmU6IDg4Jyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGZvcm1hdCBlbWVyZ2VuY3kgYWxlcnRzIHdpdGggcHJvcGVyIGVtcGhhc2lzJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBlcGlzb2RlID0gY3JlYXRlTW9ja0VwaXNvZGUoVXJnZW5jeUxldmVsLkVNRVJHRU5DWSk7XHJcblxyXG4gICAgICAobW9ja1NOU0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHtcclxuICAgICAgICBNZXNzYWdlSWQ6ICdlbWVyZ2VuY3ktZm9ybWF0LW1zZy0xMjMnXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgYXdhaXQgbm90aWZpY2F0aW9uU2VydmljZS5ub3RpZnlTdXBlcnZpc29yKGVwaXNvZGUsICdlbWVyZ2VuY3ktc3VwZXJ2aXNvcicsIHRydWUpO1xyXG5cclxuICAgICAgY29uc3Qgc2VudE1lc3NhZ2UgPSAobW9ja1NOU0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9jay5jYWxsc1swXVswXTtcclxuICAgICAgY29uc3QgbWVzc2FnZUJvZHkgPSBzZW50TWVzc2FnZS5NZXNzYWdlO1xyXG5cclxuICAgICAgZXhwZWN0KG1lc3NhZ2VCb2R5KS50b0NvbnRhaW4oJ/CfmqggRU1FUkdFTkNZIFNJVFVBVElPTiBERVRFQ1RFRCDwn5qoJyk7XHJcbiAgICAgIGV4cGVjdChtZXNzYWdlQm9keSkudG9Db250YWluKCdJTU1FRElBVEUgVkFMSURBVElPTiBSRVFVSVJFRCcpO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcbn0pOyJdfQ==