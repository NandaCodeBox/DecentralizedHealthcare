"use strict";
// Unit tests for Escalation Service
// Tests supervisor unavailability and escalation logic
Object.defineProperty(exports, "__esModule", { value: true });
const escalation_service_1 = require("../escalation-service");
const types_1 = require("../../../types");
// Mock AWS SDK clients
const mockDocClient = {
    send: jest.fn()
};
const mockSNSClient = {
    send: jest.fn()
};
describe('EscalationService', () => {
    let escalationService;
    const tableName = 'test-episodes';
    const notificationTopicArn = 'arn:aws:sns:us-east-1:123456789012:notifications';
    beforeEach(() => {
        escalationService = new escalation_service_1.EscalationService(mockDocClient, mockSNSClient, tableName, notificationTopicArn);
        jest.clearAllMocks();
    });
    const createMockEpisode = (urgencyLevel = types_1.UrgencyLevel.URGENT, episodeId = 'episode-123') => ({
        episodeId,
        patientId: 'patient-456',
        status: types_1.EpisodeStatus.ACTIVE,
        symptoms: {
            primaryComplaint: 'Chest pain',
            duration: '2 hours',
            severity: 8,
            associatedSymptoms: ['shortness of breath'],
            inputMethod: types_1.InputMethod.TEXT
        },
        triage: {
            urgencyLevel,
            ruleBasedScore: 85,
            aiAssessment: {
                used: true,
                confidence: 0.9,
                reasoning: 'High severity symptoms'
            },
            finalScore: 88
        },
        interactions: [],
        createdAt: new Date(),
        updatedAt: new Date()
    });
    const createMockValidation = (approved = false) => ({
        supervisorId: 'supervisor-789',
        approved,
        overrideReason: approved ? undefined : 'AI assessment appears incorrect',
        timestamp: new Date(),
        notes: approved ? 'Approved after review' : 'Recommend lower urgency'
    });
    describe('handleOverride', () => {
        it('should handle approved override without escalation', async () => {
            const episode = createMockEpisode();
            const validation = createMockValidation(true);
            // Mock DynamoDB update operations
            mockDocClient.send.mockResolvedValue({});
            await escalationService.handleOverride(episode, validation);
            // Should update episode with override info but not escalate
            expect(mockDocClient.send).toHaveBeenCalledWith(expect.objectContaining({
                UpdateExpression: 'SET overrideInfo = :override, updatedAt = :updatedAt'
            }));
            // Should not send escalation notifications for approved overrides
            expect(mockSNSClient.send).not.toHaveBeenCalled();
        });
        it('should escalate episode when override is not approved', async () => {
            const episode = createMockEpisode();
            const validation = createMockValidation(false);
            // Mock DynamoDB operations
            mockDocClient.send.mockResolvedValue({});
            // Mock SNS notifications
            mockSNSClient.send.mockResolvedValue({
                MessageId: 'escalation-msg-123'
            });
            await escalationService.handleOverride(episode, validation);
            // Should update episode with override and escalation info
            expect(mockDocClient.send).toHaveBeenCalledWith(expect.objectContaining({
                UpdateExpression: 'SET overrideInfo = :override, updatedAt = :updatedAt'
            }));
            expect(mockDocClient.send).toHaveBeenCalledWith(expect.objectContaining({
                UpdateExpression: 'SET escalationInfo = :escalation, updatedAt = :updatedAt'
            }));
            // Should send escalation notification
            expect(mockSNSClient.send).toHaveBeenCalled();
        });
    });
    describe('checkForTimeoutEscalations', () => {
        it('should escalate emergency episodes that exceed 5 minute threshold', async () => {
            const overdueEmergencyEpisodes = [
                createMockEpisode(types_1.UrgencyLevel.EMERGENCY, 'emergency-1'),
                createMockEpisode(types_1.UrgencyLevel.EMERGENCY, 'emergency-2')
            ];
            // Mock getting overdue episodes for each urgency level
            mockDocClient.send
                .mockResolvedValueOnce({ Items: overdueEmergencyEpisodes }) // Emergency
                .mockResolvedValueOnce({ Items: [] }) // Urgent
                .mockResolvedValueOnce({ Items: [] }) // Routine
                .mockResolvedValueOnce({ Items: [] }); // Self-care
            // Mock escalation operations
            mockDocClient.send.mockResolvedValue({});
            mockSNSClient.send.mockResolvedValue({
                MessageId: 'timeout-escalation-msg'
            });
            await escalationService.checkForTimeoutEscalations();
            // Should query for overdue episodes with 5-minute threshold for emergency
            expect(mockDocClient.send).toHaveBeenCalledWith(expect.objectContaining({
                FilterExpression: 'urgencyLevel = :urgency AND queuedAt < :threshold',
                ExpressionAttributeValues: expect.objectContaining({
                    ':urgency': types_1.UrgencyLevel.EMERGENCY
                })
            }));
            // Should escalate both emergency episodes
            expect(mockSNSClient.send).toHaveBeenCalledTimes(2);
        });
        it('should use different thresholds for different urgency levels', async () => {
            // Mock empty results for all urgency levels
            mockDocClient.send.mockResolvedValue({ Items: [] });
            await escalationService.checkForTimeoutEscalations();
            // Verify queries were made with correct urgency levels
            const calls = mockDocClient.send.mock.calls;
            expect(calls.some(call => call[0].ExpressionAttributeValues?.[':urgency'] === types_1.UrgencyLevel.EMERGENCY)).toBe(true);
            expect(calls.some(call => call[0].ExpressionAttributeValues?.[':urgency'] === types_1.UrgencyLevel.URGENT)).toBe(true);
            expect(calls.some(call => call[0].ExpressionAttributeValues?.[':urgency'] === types_1.UrgencyLevel.ROUTINE)).toBe(true);
            expect(calls.some(call => call[0].ExpressionAttributeValues?.[':urgency'] === types_1.UrgencyLevel.SELF_CARE)).toBe(true);
        });
    });
    describe('handleSupervisorUnavailability', () => {
        it('should reassign episodes to available backup supervisors', async () => {
            const supervisorId = 'unavailable-supervisor';
            const assignedEpisodes = [
                createMockEpisode(types_1.UrgencyLevel.URGENT, 'episode-1'),
                createMockEpisode(types_1.UrgencyLevel.ROUTINE, 'episode-2')
            ];
            // Mock getting episodes assigned to supervisor
            mockDocClient.send.mockResolvedValueOnce({
                Items: assignedEpisodes
            });
            // Mock reassignment and notification operations
            mockDocClient.send.mockResolvedValue({});
            mockSNSClient.send.mockResolvedValue({
                MessageId: 'reassignment-msg'
            });
            await escalationService.handleSupervisorUnavailability(supervisorId);
            // Should query for episodes assigned to unavailable supervisor
            expect(mockDocClient.send).toHaveBeenCalledWith(expect.objectContaining({
                FilterExpression: 'assignedSupervisor = :supervisor',
                ExpressionAttributeValues: expect.objectContaining({
                    ':supervisor': supervisorId
                })
            }));
            // Should reassign episodes to backup supervisors
            expect(mockDocClient.send).toHaveBeenCalledWith(expect.objectContaining({
                UpdateExpression: 'SET assignedSupervisor = :supervisor, reassignedAt = :timestamp, updatedAt = :updatedAt'
            }));
            // Should send notifications to backup supervisors
            expect(mockSNSClient.send).toHaveBeenCalled();
        });
        it('should escalate episodes when no backup supervisors available', async () => {
            const supervisorId = 'unavailable-supervisor';
            const assignedEpisodes = [createMockEpisode(types_1.UrgencyLevel.EMERGENCY)];
            // Mock getting episodes assigned to supervisor
            mockDocClient.send.mockResolvedValueOnce({
                Items: assignedEpisodes
            });
            // Mock escalation operations
            mockDocClient.send.mockResolvedValue({});
            mockSNSClient.send.mockResolvedValue({
                MessageId: 'no-backup-escalation-msg'
            });
            // Mock no available backup supervisors
            jest.spyOn(escalationService, 'findAvailableBackupSupervisor')
                .mockResolvedValue(null);
            await escalationService.handleSupervisorUnavailability(supervisorId);
            // Should send escalation notification
            expect(mockSNSClient.send).toHaveBeenCalledWith(expect.objectContaining({
                Message: expect.stringContaining('no backup available')
            }));
        });
    });
    describe('escalateEpisode', () => {
        it('should reassign to backup supervisor when available', async () => {
            const episode = createMockEpisode(types_1.UrgencyLevel.URGENT);
            const reason = 'Supervisor timeout';
            // Mock backup supervisor availability
            jest.spyOn(escalationService, 'findAvailableBackupSupervisor')
                .mockResolvedValue('backup-supervisor-1');
            // Mock DynamoDB and SNS operations
            mockDocClient.send.mockResolvedValue({});
            mockSNSClient.send.mockResolvedValue({
                MessageId: 'backup-escalation-msg'
            });
            await escalationService.escalateEpisode(episode, reason);
            // Should reassign to backup supervisor
            expect(mockDocClient.send).toHaveBeenCalledWith(expect.objectContaining({
                UpdateExpression: 'SET assignedSupervisor = :supervisor, reassignedAt = :timestamp, updatedAt = :updatedAt',
                ExpressionAttributeValues: expect.objectContaining({
                    ':supervisor': 'backup-supervisor-1'
                })
            }));
            // Should send escalation and supervisor notifications
            expect(mockSNSClient.send).toHaveBeenCalledTimes(2);
        });
        it('should default to higher care level for emergency episodes when no backup available', async () => {
            const episode = createMockEpisode(types_1.UrgencyLevel.EMERGENCY);
            const reason = 'All supervisors unavailable';
            // Mock no backup supervisor available
            jest.spyOn(escalationService, 'findAvailableBackupSupervisor')
                .mockResolvedValue(null);
            // Mock DynamoDB and SNS operations
            mockDocClient.send.mockResolvedValue({});
            mockSNSClient.send.mockResolvedValue({
                MessageId: 'default-higher-care-msg'
            });
            await escalationService.escalateEpisode(episode, reason);
            // Should create automatic validation
            expect(mockDocClient.send).toHaveBeenCalledWith(expect.objectContaining({
                UpdateExpression: 'SET triage.humanValidation = :validation, validationStatus = :status, updatedAt = :updatedAt',
                ExpressionAttributeValues: expect.objectContaining({
                    ':validation': expect.objectContaining({
                        supervisorId: 'system-escalation',
                        approved: true,
                        overrideReason: expect.stringContaining('Automatic approval due to escalation')
                    })
                })
            }));
            // Should update status to escalated
            expect(mockDocClient.send).toHaveBeenCalledWith(expect.objectContaining({
                UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
                ExpressionAttributeValues: expect.objectContaining({
                    ':status': types_1.EpisodeStatus.ESCALATED
                })
            }));
        });
        it('should not default to higher care level for routine episodes', async () => {
            const episode = createMockEpisode(types_1.UrgencyLevel.ROUTINE);
            const reason = 'Supervisor unavailable';
            // Mock no backup supervisor available
            jest.spyOn(escalationService, 'findAvailableBackupSupervisor')
                .mockResolvedValue(null);
            // Mock SNS operations
            mockSNSClient.send.mockResolvedValue({
                MessageId: 'routine-escalation-msg'
            });
            await escalationService.escalateEpisode(episode, reason);
            // Should only send escalation notification, not default to higher care
            expect(mockSNSClient.send).toHaveBeenCalledTimes(1);
            expect(mockSNSClient.send).toHaveBeenCalledWith(expect.objectContaining({
                Message: expect.stringContaining('Escalation Reason: Supervisor unavailable')
            }));
        });
    });
    describe('defaultToHigherCareLevel', () => {
        it('should create automatic approval and update episode status', async () => {
            const episode = createMockEpisode(types_1.UrgencyLevel.EMERGENCY);
            const reason = 'No supervisors available';
            // Mock DynamoDB and SNS operations
            mockDocClient.send.mockResolvedValue({});
            mockSNSClient.send.mockResolvedValue({
                MessageId: 'auto-approval-msg'
            });
            await escalationService.defaultToHigherCareLevel(episode, reason);
            // Should create automatic validation
            expect(mockDocClient.send).toHaveBeenCalledWith(expect.objectContaining({
                UpdateExpression: 'SET triage.humanValidation = :validation, validationStatus = :status, updatedAt = :updatedAt',
                ExpressionAttributeValues: expect.objectContaining({
                    ':validation': expect.objectContaining({
                        supervisorId: 'system-escalation',
                        approved: true,
                        overrideReason: expect.stringContaining(reason),
                        notes: 'Defaulted to higher care level due to supervisor unavailability'
                    })
                })
            }));
            // Should update episode status to escalated
            expect(mockDocClient.send).toHaveBeenCalledWith(expect.objectContaining({
                UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
                ExpressionAttributeValues: expect.objectContaining({
                    ':status': types_1.EpisodeStatus.ESCALATED
                })
            }));
            // Should notify care coordinator
            expect(mockSNSClient.send).toHaveBeenCalled();
        });
    });
    describe('Escalation Rules', () => {
        it('should use correct escalation rules for different urgency levels', async () => {
            const testCases = [
                {
                    urgency: types_1.UrgencyLevel.EMERGENCY,
                    expectedMaxWait: 5,
                    expectedDefaultToHigher: true
                },
                {
                    urgency: types_1.UrgencyLevel.URGENT,
                    expectedMaxWait: 15,
                    expectedDefaultToHigher: true
                },
                {
                    urgency: types_1.UrgencyLevel.ROUTINE,
                    expectedMaxWait: 60,
                    expectedDefaultToHigher: false
                },
                {
                    urgency: types_1.UrgencyLevel.SELF_CARE,
                    expectedMaxWait: 120,
                    expectedDefaultToHigher: false
                }
            ];
            for (const testCase of testCases) {
                const episode = createMockEpisode(testCase.urgency);
                // Mock no backup supervisor available to test default behavior
                jest.spyOn(escalationService, 'findAvailableBackupSupervisor')
                    .mockResolvedValue(null);
                // Mock operations
                mockDocClient.send.mockResolvedValue({});
                mockSNSClient.send.mockResolvedValue({
                    MessageId: `rule-test-${testCase.urgency}`
                });
                await escalationService.escalateEpisode(episode, 'Test escalation');
                if (testCase.expectedDefaultToHigher) {
                    // Should create automatic validation for higher care levels
                    expect(mockDocClient.send).toHaveBeenCalledWith(expect.objectContaining({
                        UpdateExpression: 'SET triage.humanValidation = :validation, validationStatus = :status, updatedAt = :updatedAt'
                    }));
                }
                else {
                    // Should only send escalation notification for lower priority
                    expect(mockSNSClient.send).toHaveBeenCalledWith(expect.objectContaining({
                        Message: expect.stringContaining('Test escalation')
                    }));
                }
                jest.clearAllMocks();
            }
        });
    });
    describe('Error Handling', () => {
        it('should handle DynamoDB errors in handleOverride', async () => {
            const episode = createMockEpisode();
            const validation = createMockValidation();
            mockDocClient.send.mockRejectedValueOnce(new Error('DynamoDB update failed'));
            await expect(escalationService.handleOverride(episode, validation)).rejects.toThrow('DynamoDB update failed');
        });
        it('should handle SNS errors in escalation notifications', async () => {
            const episode = createMockEpisode();
            const reason = 'Test escalation';
            // Mock backup supervisor not available
            jest.spyOn(escalationService, 'findAvailableBackupSupervisor')
                .mockResolvedValue(null);
            // Mock DynamoDB success but SNS failure
            mockDocClient.send.mockResolvedValue({});
            mockSNSClient.send.mockRejectedValueOnce(new Error('SNS publish failed'));
            await expect(escalationService.escalateEpisode(episode, reason)).rejects.toThrow('SNS publish failed');
        });
        it('should handle errors in checkForTimeoutEscalations gracefully', async () => {
            // Mock DynamoDB error for first query
            mockDocClient.send
                .mockRejectedValueOnce(new Error('Query failed'))
                .mockResolvedValue({ Items: [] }); // Subsequent queries succeed
            // Should not throw error, should continue with other urgency levels
            await expect(escalationService.checkForTimeoutEscalations()).resolves.not.toThrow();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXNjYWxhdGlvbi1zZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvbGFtYmRhL2h1bWFuLXZhbGlkYXRpb24vX190ZXN0c19fL2VzY2FsYXRpb24tc2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxvQ0FBb0M7QUFDcEMsdURBQXVEOztBQUV2RCw4REFBMEQ7QUFHMUQsMENBQW9HO0FBRXBHLHVCQUF1QjtBQUN2QixNQUFNLGFBQWEsR0FBRztJQUNwQixJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtDQUNxQixDQUFDO0FBRXZDLE1BQU0sYUFBYSxHQUFHO0lBQ3BCLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO0NBQ1EsQ0FBQztBQUUxQixRQUFRLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO0lBQ2pDLElBQUksaUJBQW9DLENBQUM7SUFDekMsTUFBTSxTQUFTLEdBQUcsZUFBZSxDQUFDO0lBQ2xDLE1BQU0sb0JBQW9CLEdBQUcsa0RBQWtELENBQUM7SUFFaEYsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUNkLGlCQUFpQixHQUFHLElBQUksc0NBQWlCLENBQ3ZDLGFBQWEsRUFDYixhQUFhLEVBQ2IsU0FBUyxFQUNULG9CQUFvQixDQUNyQixDQUFDO1FBQ0YsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO0lBQ3ZCLENBQUMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxpQkFBaUIsR0FBRyxDQUN4QixlQUE2QixvQkFBWSxDQUFDLE1BQU0sRUFDaEQsWUFBb0IsYUFBYSxFQUN4QixFQUFFLENBQUMsQ0FBQztRQUNiLFNBQVM7UUFDVCxTQUFTLEVBQUUsYUFBYTtRQUN4QixNQUFNLEVBQUUscUJBQWEsQ0FBQyxNQUFNO1FBQzVCLFFBQVEsRUFBRTtZQUNSLGdCQUFnQixFQUFFLFlBQVk7WUFDOUIsUUFBUSxFQUFFLFNBQVM7WUFDbkIsUUFBUSxFQUFFLENBQUM7WUFD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Q0FBQztZQUNwQyxNQUFNLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQztZQUVqQyx1Q0FBdUM7WUFDdkMsSUFBSSxDQUFDLEtBQUssQ0FBQyxpQkFBd0IsRUFBRSwrQkFBK0IsQ0FBQztpQkFDbEUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFFM0Isd0NBQXdDO1lBQ3ZDLGFBQWEsQ0FBQyxJQUFrQixDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZELGFBQWEsQ0FBQyxJQUFrQixDQUFDLHFCQUFxQixDQUNyRCxJQUFJLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxDQUNoQyxDQUFDO1lBRUYsTUFBTSxNQUFNLENBQ1YsaUJBQWlCLENBQUMsZUFBZSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FDbkQsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDMUMsQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsK0RBQStELEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDN0Usc0NBQXNDO1lBQ3JDLGFBQWEsQ0FBQyxJQUFrQjtpQkFDOUIscUJBQXFCLENBQUMsSUFBSSxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUM7aUJBQ2hELGlCQUFpQixDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyw2QkFBNkI7WUFFbEUsb0VBQW9FO1lBQ3BFLE1BQU0sTUFBTSxDQUNWLGlCQUFpQixDQUFDLDBCQUEwQixFQUFFLENBQy9DLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUMzQixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBVbml0IHRlc3RzIGZvciBFc2NhbGF0aW9uIFNlcnZpY2VcclxuLy8gVGVzdHMgc3VwZXJ2aXNvciB1bmF2YWlsYWJpbGl0eSBhbmQgZXNjYWxhdGlvbiBsb2dpY1xyXG5cclxuaW1wb3J0IHsgRXNjYWxhdGlvblNlcnZpY2UgfSBmcm9tICcuLi9lc2NhbGF0aW9uLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkRvY3VtZW50Q2xpZW50IH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcclxuaW1wb3J0IHsgU05TQ2xpZW50IH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LXNucyc7XHJcbmltcG9ydCB7IEVwaXNvZGUsIEh1bWFuVmFsaWRhdGlvbiwgVXJnZW5jeUxldmVsLCBFcGlzb2RlU3RhdHVzLCBJbnB1dE1ldGhvZCB9IGZyb20gJy4uLy4uLy4uL3R5cGVzJztcclxuXHJcbi8vIE1vY2sgQVdTIFNESyBjbGllbnRzXHJcbmNvbnN0IG1vY2tEb2NDbGllbnQgPSB7XHJcbiAgc2VuZDogamVzdC5mbigpXHJcbn0gYXMgdW5rbm93biBhcyBEeW5hbW9EQkRvY3VtZW50Q2xpZW50O1xyXG5cclxuY29uc3QgbW9ja1NOU0NsaWVudCA9IHtcclxuICBzZW5kOiBqZXN0LmZuKClcclxufSBhcyB1bmtub3duIGFzIFNOU0NsaWVudDtcclxuXHJcbmRlc2NyaWJlKCdFc2NhbGF0aW9uU2VydmljZScsICgpID0+IHtcclxuICBsZXQgZXNjYWxhdGlvblNlcnZpY2U6IEVzY2FsYXRpb25TZXJ2aWNlO1xyXG4gIGNvbnN0IHRhYmxlTmFtZSA9ICd0ZXN0LWVwaXNvZGVzJztcclxuICBjb25zdCBub3RpZmljYXRpb25Ub3BpY0FybiA9ICdhcm46YXdzOnNuczp1cy1lYXN0LTE6MTIzNDU2Nzg5MDEyOm5vdGlmaWNhdGlvbnMnO1xyXG5cclxuICBiZWZvcmVFYWNoKCgpID0+IHtcclxuICAgIGVzY2FsYXRpb25TZXJ2aWNlID0gbmV3IEVzY2FsYXRpb25TZXJ2aWNlKFxyXG4gICAgICBtb2NrRG9jQ2xpZW50LFxyXG4gICAgICBtb2NrU05TQ2xpZW50LFxyXG4gICAgICB0YWJsZU5hbWUsXHJcbiAgICAgIG5vdGlmaWNhdGlvblRvcGljQXJuXHJcbiAgICApO1xyXG4gICAgamVzdC5jbGVhckFsbE1vY2tzKCk7XHJcbiAgfSk7XHJcblxyXG4gIGNvbnN0IGNyZWF0ZU1vY2tFcGlzb2RlID0gKFxyXG4gICAgdXJnZW5jeUxldmVsOiBVcmdlbmN5TGV2ZWwgPSBVcmdlbmN5TGV2ZWwuVVJHRU5ULFxyXG4gICAgZXBpc29kZUlkOiBzdHJpbmcgPSAnZXBpc29kZS0xMjMnXHJcbiAgKTogRXBpc29kZSA9PiAoe1xyXG4gICAgZXBpc29kZUlkLFxyXG4gICAgcGF0aWVudElkOiAncGF0aWVudC00NTYnLFxyXG4gICAgc3RhdHVzOiBFcGlzb2RlU3RhdHVzLkFDVElWRSxcclxuICAgIHN5bXB0b21zOiB7XHJcbiAgICAgIHByaW1hcnlDb21wbGFpbnQ6ICdDaGVzdCBwYWluJyxcclxuICAgICAgZHVyYXRpb246ICcyIGhvdXJzJyxcclxuICAgICAgc2V2ZXJpdHk6IDgsXHJcbiAgICAgIGFzc29jaWF0ZWRTeW1wdG9tczogWydzaG9ydG5lc3Mgb2YgYnJlYXRoJ10sXHJcbiAgICAgIGlucHV0TWV0aG9kOiBJbnB1dE1ldGhvZC5URVhUXHJcbiAgICB9LFxyXG4gICAgdHJpYWdlOiB7XHJcbiAgICAgIHVyZ2VuY3lMZXZlbCxcclxuICAgICAgcnVsZUJhc2VkU2NvcmU6IDg1LFxyXG4gICAgICBhaUFzc2Vzc21lbnQ6IHtcclxuICAgICAgICB1c2VkOiB0cnVlLFxyXG4gICAgICAgIGNvbmZpZGVuY2U6IDAuOSxcclxuICAgICAgICByZWFzb25pbmc6ICdIaWdoIHNldmVyaXR5IHN5bXB0b21zJ1xyXG4gICAgICB9LFxyXG4gICAgICBmaW5hbFNjb3JlOiA4OFxyXG4gICAgfSxcclxuICAgIGludGVyYWN0aW9uczogW10sXHJcbiAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCksXHJcbiAgICB1cGRhdGVkQXQ6IG5ldyBEYXRlKClcclxuICB9KTtcclxuXHJcbiAgY29uc3QgY3JlYXRlTW9ja1ZhbGlkYXRpb24gPSAoYXBwcm92ZWQ6IGJvb2xlYW4gPSBmYWxzZSk6IEh1bWFuVmFsaWRhdGlvbiA9PiAoe1xyXG4gICAgc3VwZXJ2aXNvcklkOiAnc3VwZXJ2aXNvci03ODknLFxyXG4gICAgYXBwcm92ZWQsXHJcbiAgICBvdmVycmlkZVJlYXNvbjogYXBwcm92ZWQgPyB1bmRlZmluZWQgOiAnQUkgYXNzZXNzbWVudCBhcHBlYXJzIGluY29ycmVjdCcsXHJcbiAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCksXHJcbiAgICBub3RlczogYXBwcm92ZWQgPyAnQXBwcm92ZWQgYWZ0ZXIgcmV2aWV3JyA6ICdSZWNvbW1lbmQgbG93ZXIgdXJnZW5jeSdcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ2hhbmRsZU92ZXJyaWRlJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgYXBwcm92ZWQgb3ZlcnJpZGUgd2l0aG91dCBlc2NhbGF0aW9uJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBlcGlzb2RlID0gY3JlYXRlTW9ja0VwaXNvZGUoKTtcclxuICAgICAgY29uc3QgdmFsaWRhdGlvbiA9IGNyZWF0ZU1vY2tWYWxpZGF0aW9uKHRydWUpO1xyXG5cclxuICAgICAgLy8gTW9jayBEeW5hbW9EQiB1cGRhdGUgb3BlcmF0aW9uc1xyXG4gICAgICAobW9ja0RvY0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWUoe30pO1xyXG5cclxuICAgICAgYXdhaXQgZXNjYWxhdGlvblNlcnZpY2UuaGFuZGxlT3ZlcnJpZGUoZXBpc29kZSwgdmFsaWRhdGlvbik7XHJcblxyXG4gICAgICAvLyBTaG91bGQgdXBkYXRlIGVwaXNvZGUgd2l0aCBvdmVycmlkZSBpbmZvIGJ1dCBub3QgZXNjYWxhdGVcclxuICAgICAgZXhwZWN0KG1vY2tEb2NDbGllbnQuc2VuZCkudG9IYXZlQmVlbkNhbGxlZFdpdGgoXHJcbiAgICAgICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgVXBkYXRlRXhwcmVzc2lvbjogJ1NFVCBvdmVycmlkZUluZm8gPSA6b3ZlcnJpZGUsIHVwZGF0ZWRBdCA9IDp1cGRhdGVkQXQnXHJcbiAgICAgICAgfSlcclxuICAgICAgKTtcclxuXHJcbiAgICAgIC8vIFNob3VsZCBub3Qgc2VuZCBlc2NhbGF0aW9uIG5vdGlmaWNhdGlvbnMgZm9yIGFwcHJvdmVkIG92ZXJyaWRlc1xyXG4gICAgICBleHBlY3QobW9ja1NOU0NsaWVudC5zZW5kKS5ub3QudG9IYXZlQmVlbkNhbGxlZCgpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBlc2NhbGF0ZSBlcGlzb2RlIHdoZW4gb3ZlcnJpZGUgaXMgbm90IGFwcHJvdmVkJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBlcGlzb2RlID0gY3JlYXRlTW9ja0VwaXNvZGUoKTtcclxuICAgICAgY29uc3QgdmFsaWRhdGlvbiA9IGNyZWF0ZU1vY2tWYWxpZGF0aW9uKGZhbHNlKTtcclxuXHJcbiAgICAgIC8vIE1vY2sgRHluYW1vREIgb3BlcmF0aW9uc1xyXG4gICAgICAobW9ja0RvY0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWUoe30pO1xyXG5cclxuICAgICAgLy8gTW9jayBTTlMgbm90aWZpY2F0aW9uc1xyXG4gICAgICAobW9ja1NOU0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWUoe1xyXG4gICAgICAgIE1lc3NhZ2VJZDogJ2VzY2FsYXRpb24tbXNnLTEyMydcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBhd2FpdCBlc2NhbGF0aW9uU2VydmljZS5oYW5kbGVPdmVycmlkZShlcGlzb2RlLCB2YWxpZGF0aW9uKTtcclxuXHJcbiAgICAgIC8vIFNob3VsZCB1cGRhdGUgZXBpc29kZSB3aXRoIG92ZXJyaWRlIGFuZCBlc2NhbGF0aW9uIGluZm9cclxuICAgICAgZXhwZWN0KG1vY2tEb2NDbGllbnQuc2VuZCkudG9IYXZlQmVlbkNhbGxlZFdpdGgoXHJcbiAgICAgICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgVXBkYXRlRXhwcmVzc2lvbjogJ1NFVCBvdmVycmlkZUluZm8gPSA6b3ZlcnJpZGUsIHVwZGF0ZWRBdCA9IDp1cGRhdGVkQXQnXHJcbiAgICAgICAgfSlcclxuICAgICAgKTtcclxuXHJcbiAgICAgIGV4cGVjdChtb2NrRG9jQ2xpZW50LnNlbmQpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxyXG4gICAgICAgIGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcclxuICAgICAgICAgIFVwZGF0ZUV4cHJlc3Npb246ICdTRVQgZXNjYWxhdGlvbkluZm8gPSA6ZXNjYWxhdGlvbiwgdXBkYXRlZEF0ID0gOnVwZGF0ZWRBdCdcclxuICAgICAgICB9KVxyXG4gICAgICApO1xyXG5cclxuICAgICAgLy8gU2hvdWxkIHNlbmQgZXNjYWxhdGlvbiBub3RpZmljYXRpb25cclxuICAgICAgZXhwZWN0KG1vY2tTTlNDbGllbnQuc2VuZCkudG9IYXZlQmVlbkNhbGxlZCgpO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdjaGVja0ZvclRpbWVvdXRFc2NhbGF0aW9ucycsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgZXNjYWxhdGUgZW1lcmdlbmN5IGVwaXNvZGVzIHRoYXQgZXhjZWVkIDUgbWludXRlIHRocmVzaG9sZCcsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3Qgb3ZlcmR1ZUVtZXJnZW5jeUVwaXNvZGVzID0gW1xyXG4gICAgICAgIGNyZWF0ZU1vY2tFcGlzb2RlKFVyZ2VuY3lMZXZlbC5FTUVSR0VOQ1ksICdlbWVyZ2VuY3ktMScpLFxyXG4gICAgICAgIGNyZWF0ZU1vY2tFcGlzb2RlKFVyZ2VuY3lMZXZlbC5FTUVSR0VOQ1ksICdlbWVyZ2VuY3ktMicpXHJcbiAgICAgIF07XHJcblxyXG4gICAgICAvLyBNb2NrIGdldHRpbmcgb3ZlcmR1ZSBlcGlzb2RlcyBmb3IgZWFjaCB1cmdlbmN5IGxldmVsXHJcbiAgICAgIChtb2NrRG9jQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKVxyXG4gICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UoeyBJdGVtczogb3ZlcmR1ZUVtZXJnZW5jeUVwaXNvZGVzIH0pIC8vIEVtZXJnZW5jeVxyXG4gICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UoeyBJdGVtczogW10gfSkgLy8gVXJnZW50XHJcbiAgICAgICAgLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7IEl0ZW1zOiBbXSB9KSAvLyBSb3V0aW5lXHJcbiAgICAgICAgLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7IEl0ZW1zOiBbXSB9KTsgLy8gU2VsZi1jYXJlXHJcblxyXG4gICAgICAvLyBNb2NrIGVzY2FsYXRpb24gb3BlcmF0aW9uc1xyXG4gICAgICAobW9ja0RvY0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWUoe30pO1xyXG4gICAgICAobW9ja1NOU0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWUoe1xyXG4gICAgICAgIE1lc3NhZ2VJZDogJ3RpbWVvdXQtZXNjYWxhdGlvbi1tc2cnXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgYXdhaXQgZXNjYWxhdGlvblNlcnZpY2UuY2hlY2tGb3JUaW1lb3V0RXNjYWxhdGlvbnMoKTtcclxuXHJcbiAgICAgIC8vIFNob3VsZCBxdWVyeSBmb3Igb3ZlcmR1ZSBlcGlzb2RlcyB3aXRoIDUtbWludXRlIHRocmVzaG9sZCBmb3IgZW1lcmdlbmN5XHJcbiAgICAgIGV4cGVjdChtb2NrRG9jQ2xpZW50LnNlbmQpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxyXG4gICAgICAgIGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcclxuICAgICAgICAgIEZpbHRlckV4cHJlc3Npb246ICd1cmdlbmN5TGV2ZWwgPSA6dXJnZW5jeSBBTkQgcXVldWVkQXQgPCA6dGhyZXNob2xkJyxcclxuICAgICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcclxuICAgICAgICAgICAgJzp1cmdlbmN5JzogVXJnZW5jeUxldmVsLkVNRVJHRU5DWVxyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9KVxyXG4gICAgICApO1xyXG5cclxuICAgICAgLy8gU2hvdWxkIGVzY2FsYXRlIGJvdGggZW1lcmdlbmN5IGVwaXNvZGVzXHJcbiAgICAgIGV4cGVjdChtb2NrU05TQ2xpZW50LnNlbmQpLnRvSGF2ZUJlZW5DYWxsZWRUaW1lcygyKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgdXNlIGRpZmZlcmVudCB0aHJlc2hvbGRzIGZvciBkaWZmZXJlbnQgdXJnZW5jeSBsZXZlbHMnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIC8vIE1vY2sgZW1wdHkgcmVzdWx0cyBmb3IgYWxsIHVyZ2VuY3kgbGV2ZWxzXHJcbiAgICAgIChtb2NrRG9jQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZSh7IEl0ZW1zOiBbXSB9KTtcclxuXHJcbiAgICAgIGF3YWl0IGVzY2FsYXRpb25TZXJ2aWNlLmNoZWNrRm9yVGltZW91dEVzY2FsYXRpb25zKCk7XHJcblxyXG4gICAgICAvLyBWZXJpZnkgcXVlcmllcyB3ZXJlIG1hZGUgd2l0aCBjb3JyZWN0IHVyZ2VuY3kgbGV2ZWxzXHJcbiAgICAgIGNvbnN0IGNhbGxzID0gKG1vY2tEb2NDbGllbnQuc2VuZCBhcyBqZXN0Lk1vY2spLm1vY2suY2FsbHM7XHJcbiAgICAgIFxyXG4gICAgICBleHBlY3QoY2FsbHMuc29tZShjYWxsID0+IFxyXG4gICAgICAgIGNhbGxbMF0uRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlcz8uWyc6dXJnZW5jeSddID09PSBVcmdlbmN5TGV2ZWwuRU1FUkdFTkNZXHJcbiAgICAgICkpLnRvQmUodHJ1ZSk7XHJcbiAgICAgIFxyXG4gICAgICBleHBlY3QoY2FsbHMuc29tZShjYWxsID0+IFxyXG4gICAgICAgIGNhbGxbMF0uRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlcz8uWyc6dXJnZW5jeSddID09PSBVcmdlbmN5TGV2ZWwuVVJHRU5UXHJcbiAgICAgICkpLnRvQmUodHJ1ZSk7XHJcbiAgICAgIFxyXG4gICAgICBleHBlY3QoY2FsbHMuc29tZShjYWxsID0+IFxyXG4gICAgICAgIGNhbGxbMF0uRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlcz8uWyc6dXJnZW5jeSddID09PSBVcmdlbmN5TGV2ZWwuUk9VVElORVxyXG4gICAgICApKS50b0JlKHRydWUpO1xyXG4gICAgICBcclxuICAgICAgZXhwZWN0KGNhbGxzLnNvbWUoY2FsbCA9PiBcclxuICAgICAgICBjYWxsWzBdLkV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM/LlsnOnVyZ2VuY3knXSA9PT0gVXJnZW5jeUxldmVsLlNFTEZfQ0FSRVxyXG4gICAgICApKS50b0JlKHRydWUpO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdoYW5kbGVTdXBlcnZpc29yVW5hdmFpbGFiaWxpdHknLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIHJlYXNzaWduIGVwaXNvZGVzIHRvIGF2YWlsYWJsZSBiYWNrdXAgc3VwZXJ2aXNvcnMnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IHN1cGVydmlzb3JJZCA9ICd1bmF2YWlsYWJsZS1zdXBlcnZpc29yJztcclxuICAgICAgY29uc3QgYXNzaWduZWRFcGlzb2RlcyA9IFtcclxuICAgICAgICBjcmVhdGVNb2NrRXBpc29kZShVcmdlbmN5TGV2ZWwuVVJHRU5ULCAnZXBpc29kZS0xJyksXHJcbiAgICAgICAgY3JlYXRlTW9ja0VwaXNvZGUoVXJnZW5jeUxldmVsLlJPVVRJTkUsICdlcGlzb2RlLTInKVxyXG4gICAgICBdO1xyXG5cclxuICAgICAgLy8gTW9jayBnZXR0aW5nIGVwaXNvZGVzIGFzc2lnbmVkIHRvIHN1cGVydmlzb3JcclxuICAgICAgKG1vY2tEb2NDbGllbnQuc2VuZCBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7XHJcbiAgICAgICAgSXRlbXM6IGFzc2lnbmVkRXBpc29kZXNcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBNb2NrIHJlYXNzaWdubWVudCBhbmQgbm90aWZpY2F0aW9uIG9wZXJhdGlvbnNcclxuICAgICAgKG1vY2tEb2NDbGllbnQuc2VuZCBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlKHt9KTtcclxuICAgICAgKG1vY2tTTlNDbGllbnQuc2VuZCBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlKHtcclxuICAgICAgICBNZXNzYWdlSWQ6ICdyZWFzc2lnbm1lbnQtbXNnJ1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGF3YWl0IGVzY2FsYXRpb25TZXJ2aWNlLmhhbmRsZVN1cGVydmlzb3JVbmF2YWlsYWJpbGl0eShzdXBlcnZpc29ySWQpO1xyXG5cclxuICAgICAgLy8gU2hvdWxkIHF1ZXJ5IGZvciBlcGlzb2RlcyBhc3NpZ25lZCB0byB1bmF2YWlsYWJsZSBzdXBlcnZpc29yXHJcbiAgICAgIGV4cGVjdChtb2NrRG9jQ2xpZW50LnNlbmQpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxyXG4gICAgICAgIGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcclxuICAgICAgICAgIEZpbHRlckV4cHJlc3Npb246ICdhc3NpZ25lZFN1cGVydmlzb3IgPSA6c3VwZXJ2aXNvcicsXHJcbiAgICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XHJcbiAgICAgICAgICAgICc6c3VwZXJ2aXNvcic6IHN1cGVydmlzb3JJZFxyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9KVxyXG4gICAgICApO1xyXG5cclxuICAgICAgLy8gU2hvdWxkIHJlYXNzaWduIGVwaXNvZGVzIHRvIGJhY2t1cCBzdXBlcnZpc29yc1xyXG4gICAgICBleHBlY3QobW9ja0RvY0NsaWVudC5zZW5kKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcclxuICAgICAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XHJcbiAgICAgICAgICBVcGRhdGVFeHByZXNzaW9uOiAnU0VUIGFzc2lnbmVkU3VwZXJ2aXNvciA9IDpzdXBlcnZpc29yLCByZWFzc2lnbmVkQXQgPSA6dGltZXN0YW1wLCB1cGRhdGVkQXQgPSA6dXBkYXRlZEF0J1xyXG4gICAgICAgIH0pXHJcbiAgICAgICk7XHJcblxyXG4gICAgICAvLyBTaG91bGQgc2VuZCBub3RpZmljYXRpb25zIHRvIGJhY2t1cCBzdXBlcnZpc29yc1xyXG4gICAgICBleHBlY3QobW9ja1NOU0NsaWVudC5zZW5kKS50b0hhdmVCZWVuQ2FsbGVkKCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGVzY2FsYXRlIGVwaXNvZGVzIHdoZW4gbm8gYmFja3VwIHN1cGVydmlzb3JzIGF2YWlsYWJsZScsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3Qgc3VwZXJ2aXNvcklkID0gJ3VuYXZhaWxhYmxlLXN1cGVydmlzb3InO1xyXG4gICAgICBjb25zdCBhc3NpZ25lZEVwaXNvZGVzID0gW2NyZWF0ZU1vY2tFcGlzb2RlKFVyZ2VuY3lMZXZlbC5FTUVSR0VOQ1kpXTtcclxuXHJcbiAgICAgIC8vIE1vY2sgZ2V0dGluZyBlcGlzb2RlcyBhc3NpZ25lZCB0byBzdXBlcnZpc29yXHJcbiAgICAgIChtb2NrRG9jQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe1xyXG4gICAgICAgIEl0ZW1zOiBhc3NpZ25lZEVwaXNvZGVzXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gTW9jayBlc2NhbGF0aW9uIG9wZXJhdGlvbnNcclxuICAgICAgKG1vY2tEb2NDbGllbnQuc2VuZCBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlKHt9KTtcclxuICAgICAgKG1vY2tTTlNDbGllbnQuc2VuZCBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlKHtcclxuICAgICAgICBNZXNzYWdlSWQ6ICduby1iYWNrdXAtZXNjYWxhdGlvbi1tc2cnXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gTW9jayBubyBhdmFpbGFibGUgYmFja3VwIHN1cGVydmlzb3JzXHJcbiAgICAgIGplc3Quc3B5T24oZXNjYWxhdGlvblNlcnZpY2UgYXMgYW55LCAnZmluZEF2YWlsYWJsZUJhY2t1cFN1cGVydmlzb3InKVxyXG4gICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZShudWxsKTtcclxuXHJcbiAgICAgIGF3YWl0IGVzY2FsYXRpb25TZXJ2aWNlLmhhbmRsZVN1cGVydmlzb3JVbmF2YWlsYWJpbGl0eShzdXBlcnZpc29ySWQpO1xyXG5cclxuICAgICAgLy8gU2hvdWxkIHNlbmQgZXNjYWxhdGlvbiBub3RpZmljYXRpb25cclxuICAgICAgZXhwZWN0KG1vY2tTTlNDbGllbnQuc2VuZCkudG9IYXZlQmVlbkNhbGxlZFdpdGgoXHJcbiAgICAgICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgTWVzc2FnZTogZXhwZWN0LnN0cmluZ0NvbnRhaW5pbmcoJ25vIGJhY2t1cCBhdmFpbGFibGUnKVxyXG4gICAgICAgIH0pXHJcbiAgICAgICk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ2VzY2FsYXRlRXBpc29kZScsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgcmVhc3NpZ24gdG8gYmFja3VwIHN1cGVydmlzb3Igd2hlbiBhdmFpbGFibGUnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGVwaXNvZGUgPSBjcmVhdGVNb2NrRXBpc29kZShVcmdlbmN5TGV2ZWwuVVJHRU5UKTtcclxuICAgICAgY29uc3QgcmVhc29uID0gJ1N1cGVydmlzb3IgdGltZW91dCc7XHJcblxyXG4gICAgICAvLyBNb2NrIGJhY2t1cCBzdXBlcnZpc29yIGF2YWlsYWJpbGl0eVxyXG4gICAgICBqZXN0LnNweU9uKGVzY2FsYXRpb25TZXJ2aWNlIGFzIGFueSwgJ2ZpbmRBdmFpbGFibGVCYWNrdXBTdXBlcnZpc29yJylcclxuICAgICAgICAubW9ja1Jlc29sdmVkVmFsdWUoJ2JhY2t1cC1zdXBlcnZpc29yLTEnKTtcclxuXHJcbiAgICAgIC8vIE1vY2sgRHluYW1vREIgYW5kIFNOUyBvcGVyYXRpb25zXHJcbiAgICAgIChtb2NrRG9jQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZSh7fSk7XHJcbiAgICAgIChtb2NrU05TQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcbiAgICAgICAgTWVzc2FnZUlkOiAnYmFja3VwLWVzY2FsYXRpb24tbXNnJ1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGF3YWl0IGVzY2FsYXRpb25TZXJ2aWNlLmVzY2FsYXRlRXBpc29kZShlcGlzb2RlLCByZWFzb24pO1xyXG5cclxuICAgICAgLy8gU2hvdWxkIHJlYXNzaWduIHRvIGJhY2t1cCBzdXBlcnZpc29yXHJcbiAgICAgIGV4cGVjdChtb2NrRG9jQ2xpZW50LnNlbmQpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxyXG4gICAgICAgIGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcclxuICAgICAgICAgIFVwZGF0ZUV4cHJlc3Npb246ICdTRVQgYXNzaWduZWRTdXBlcnZpc29yID0gOnN1cGVydmlzb3IsIHJlYXNzaWduZWRBdCA9IDp0aW1lc3RhbXAsIHVwZGF0ZWRBdCA9IDp1cGRhdGVkQXQnLFxyXG4gICAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczogZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgICAnOnN1cGVydmlzb3InOiAnYmFja3VwLXN1cGVydmlzb3ItMSdcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgICAgKTtcclxuXHJcbiAgICAgIC8vIFNob3VsZCBzZW5kIGVzY2FsYXRpb24gYW5kIHN1cGVydmlzb3Igbm90aWZpY2F0aW9uc1xyXG4gICAgICBleHBlY3QobW9ja1NOU0NsaWVudC5zZW5kKS50b0hhdmVCZWVuQ2FsbGVkVGltZXMoMik7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGRlZmF1bHQgdG8gaGlnaGVyIGNhcmUgbGV2ZWwgZm9yIGVtZXJnZW5jeSBlcGlzb2RlcyB3aGVuIG5vIGJhY2t1cCBhdmFpbGFibGUnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGVwaXNvZGUgPSBjcmVhdGVNb2NrRXBpc29kZShVcmdlbmN5TGV2ZWwuRU1FUkdFTkNZKTtcclxuICAgICAgY29uc3QgcmVhc29uID0gJ0FsbCBzdXBlcnZpc29ycyB1bmF2YWlsYWJsZSc7XHJcblxyXG4gICAgICAvLyBNb2NrIG5vIGJhY2t1cCBzdXBlcnZpc29yIGF2YWlsYWJsZVxyXG4gICAgICBqZXN0LnNweU9uKGVzY2FsYXRpb25TZXJ2aWNlIGFzIGFueSwgJ2ZpbmRBdmFpbGFibGVCYWNrdXBTdXBlcnZpc29yJylcclxuICAgICAgICAubW9ja1Jlc29sdmVkVmFsdWUobnVsbCk7XHJcblxyXG4gICAgICAvLyBNb2NrIER5bmFtb0RCIGFuZCBTTlMgb3BlcmF0aW9uc1xyXG4gICAgICAobW9ja0RvY0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWUoe30pO1xyXG4gICAgICAobW9ja1NOU0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWUoe1xyXG4gICAgICAgIE1lc3NhZ2VJZDogJ2RlZmF1bHQtaGlnaGVyLWNhcmUtbXNnJ1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGF3YWl0IGVzY2FsYXRpb25TZXJ2aWNlLmVzY2FsYXRlRXBpc29kZShlcGlzb2RlLCByZWFzb24pO1xyXG5cclxuICAgICAgLy8gU2hvdWxkIGNyZWF0ZSBhdXRvbWF0aWMgdmFsaWRhdGlvblxyXG4gICAgICBleHBlY3QobW9ja0RvY0NsaWVudC5zZW5kKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcclxuICAgICAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XHJcbiAgICAgICAgICBVcGRhdGVFeHByZXNzaW9uOiAnU0VUIHRyaWFnZS5odW1hblZhbGlkYXRpb24gPSA6dmFsaWRhdGlvbiwgdmFsaWRhdGlvblN0YXR1cyA9IDpzdGF0dXMsIHVwZGF0ZWRBdCA9IDp1cGRhdGVkQXQnLFxyXG4gICAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczogZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgICAnOnZhbGlkYXRpb24nOiBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XHJcbiAgICAgICAgICAgICAgc3VwZXJ2aXNvcklkOiAnc3lzdGVtLWVzY2FsYXRpb24nLFxyXG4gICAgICAgICAgICAgIGFwcHJvdmVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgIG92ZXJyaWRlUmVhc29uOiBleHBlY3Quc3RyaW5nQ29udGFpbmluZygnQXV0b21hdGljIGFwcHJvdmFsIGR1ZSB0byBlc2NhbGF0aW9uJylcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgICAgKTtcclxuXHJcbiAgICAgIC8vIFNob3VsZCB1cGRhdGUgc3RhdHVzIHRvIGVzY2FsYXRlZFxyXG4gICAgICBleHBlY3QobW9ja0RvY0NsaWVudC5zZW5kKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcclxuICAgICAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XHJcbiAgICAgICAgICBVcGRhdGVFeHByZXNzaW9uOiAnU0VUICNzdGF0dXMgPSA6c3RhdHVzLCB1cGRhdGVkQXQgPSA6dXBkYXRlZEF0JyxcclxuICAgICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcclxuICAgICAgICAgICAgJzpzdGF0dXMnOiBFcGlzb2RlU3RhdHVzLkVTQ0FMQVRFRFxyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9KVxyXG4gICAgICApO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBub3QgZGVmYXVsdCB0byBoaWdoZXIgY2FyZSBsZXZlbCBmb3Igcm91dGluZSBlcGlzb2RlcycsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgZXBpc29kZSA9IGNyZWF0ZU1vY2tFcGlzb2RlKFVyZ2VuY3lMZXZlbC5ST1VUSU5FKTtcclxuICAgICAgY29uc3QgcmVhc29uID0gJ1N1cGVydmlzb3IgdW5hdmFpbGFibGUnO1xyXG5cclxuICAgICAgLy8gTW9jayBubyBiYWNrdXAgc3VwZXJ2aXNvciBhdmFpbGFibGVcclxuICAgICAgamVzdC5zcHlPbihlc2NhbGF0aW9uU2VydmljZSBhcyBhbnksICdmaW5kQXZhaWxhYmxlQmFja3VwU3VwZXJ2aXNvcicpXHJcbiAgICAgICAgLm1vY2tSZXNvbHZlZFZhbHVlKG51bGwpO1xyXG5cclxuICAgICAgLy8gTW9jayBTTlMgb3BlcmF0aW9uc1xyXG4gICAgICAobW9ja1NOU0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWUoe1xyXG4gICAgICAgIE1lc3NhZ2VJZDogJ3JvdXRpbmUtZXNjYWxhdGlvbi1tc2cnXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgYXdhaXQgZXNjYWxhdGlvblNlcnZpY2UuZXNjYWxhdGVFcGlzb2RlKGVwaXNvZGUsIHJlYXNvbik7XHJcblxyXG4gICAgICAvLyBTaG91bGQgb25seSBzZW5kIGVzY2FsYXRpb24gbm90aWZpY2F0aW9uLCBub3QgZGVmYXVsdCB0byBoaWdoZXIgY2FyZVxyXG4gICAgICBleHBlY3QobW9ja1NOU0NsaWVudC5zZW5kKS50b0hhdmVCZWVuQ2FsbGVkVGltZXMoMSk7XHJcbiAgICAgIGV4cGVjdChtb2NrU05TQ2xpZW50LnNlbmQpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxyXG4gICAgICAgIGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcclxuICAgICAgICAgIE1lc3NhZ2U6IGV4cGVjdC5zdHJpbmdDb250YWluaW5nKCdFc2NhbGF0aW9uIFJlYXNvbjogU3VwZXJ2aXNvciB1bmF2YWlsYWJsZScpXHJcbiAgICAgICAgfSlcclxuICAgICAgKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnZGVmYXVsdFRvSGlnaGVyQ2FyZUxldmVsJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCBjcmVhdGUgYXV0b21hdGljIGFwcHJvdmFsIGFuZCB1cGRhdGUgZXBpc29kZSBzdGF0dXMnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGVwaXNvZGUgPSBjcmVhdGVNb2NrRXBpc29kZShVcmdlbmN5TGV2ZWwuRU1FUkdFTkNZKTtcclxuICAgICAgY29uc3QgcmVhc29uID0gJ05vIHN1cGVydmlzb3JzIGF2YWlsYWJsZSc7XHJcblxyXG4gICAgICAvLyBNb2NrIER5bmFtb0RCIGFuZCBTTlMgb3BlcmF0aW9uc1xyXG4gICAgICAobW9ja0RvY0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWUoe30pO1xyXG4gICAgICAobW9ja1NOU0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWUoe1xyXG4gICAgICAgIE1lc3NhZ2VJZDogJ2F1dG8tYXBwcm92YWwtbXNnJ1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGF3YWl0IGVzY2FsYXRpb25TZXJ2aWNlLmRlZmF1bHRUb0hpZ2hlckNhcmVMZXZlbChlcGlzb2RlLCByZWFzb24pO1xyXG5cclxuICAgICAgLy8gU2hvdWxkIGNyZWF0ZSBhdXRvbWF0aWMgdmFsaWRhdGlvblxyXG4gICAgICBleHBlY3QobW9ja0RvY0NsaWVudC5zZW5kKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcclxuICAgICAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XHJcbiAgICAgICAgICBVcGRhdGVFeHByZXNzaW9uOiAnU0VUIHRyaWFnZS5odW1hblZhbGlkYXRpb24gPSA6dmFsaWRhdGlvbiwgdmFsaWRhdGlvblN0YXR1cyA9IDpzdGF0dXMsIHVwZGF0ZWRBdCA9IDp1cGRhdGVkQXQnLFxyXG4gICAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczogZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgICAnOnZhbGlkYXRpb24nOiBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XHJcbiAgICAgICAgICAgICAgc3VwZXJ2aXNvcklkOiAnc3lzdGVtLWVzY2FsYXRpb24nLFxyXG4gICAgICAgICAgICAgIGFwcHJvdmVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgIG92ZXJyaWRlUmVhc29uOiBleHBlY3Quc3RyaW5nQ29udGFpbmluZyhyZWFzb24pLFxyXG4gICAgICAgICAgICAgIG5vdGVzOiAnRGVmYXVsdGVkIHRvIGhpZ2hlciBjYXJlIGxldmVsIGR1ZSB0byBzdXBlcnZpc29yIHVuYXZhaWxhYmlsaXR5J1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9KVxyXG4gICAgICApO1xyXG5cclxuICAgICAgLy8gU2hvdWxkIHVwZGF0ZSBlcGlzb2RlIHN0YXR1cyB0byBlc2NhbGF0ZWRcclxuICAgICAgZXhwZWN0KG1vY2tEb2NDbGllbnQuc2VuZCkudG9IYXZlQmVlbkNhbGxlZFdpdGgoXHJcbiAgICAgICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgVXBkYXRlRXhwcmVzc2lvbjogJ1NFVCAjc3RhdHVzID0gOnN0YXR1cywgdXBkYXRlZEF0ID0gOnVwZGF0ZWRBdCcsXHJcbiAgICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XHJcbiAgICAgICAgICAgICc6c3RhdHVzJzogRXBpc29kZVN0YXR1cy5FU0NBTEFURURcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgICAgKTtcclxuXHJcbiAgICAgIC8vIFNob3VsZCBub3RpZnkgY2FyZSBjb29yZGluYXRvclxyXG4gICAgICBleHBlY3QobW9ja1NOU0NsaWVudC5zZW5kKS50b0hhdmVCZWVuQ2FsbGVkKCk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ0VzY2FsYXRpb24gUnVsZXMnLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIHVzZSBjb3JyZWN0IGVzY2FsYXRpb24gcnVsZXMgZm9yIGRpZmZlcmVudCB1cmdlbmN5IGxldmVscycsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgdGVzdENhc2VzID0gW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIHVyZ2VuY3k6IFVyZ2VuY3lMZXZlbC5FTUVSR0VOQ1ksXHJcbiAgICAgICAgICBleHBlY3RlZE1heFdhaXQ6IDUsXHJcbiAgICAgICAgICBleHBlY3RlZERlZmF1bHRUb0hpZ2hlcjogdHJ1ZVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgdXJnZW5jeTogVXJnZW5jeUxldmVsLlVSR0VOVCxcclxuICAgICAgICAgIGV4cGVjdGVkTWF4V2FpdDogMTUsXHJcbiAgICAgICAgICBleHBlY3RlZERlZmF1bHRUb0hpZ2hlcjogdHJ1ZVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgdXJnZW5jeTogVXJnZW5jeUxldmVsLlJPVVRJTkUsXHJcbiAgICAgICAgICBleHBlY3RlZE1heFdhaXQ6IDYwLFxyXG4gICAgICAgICAgZXhwZWN0ZWREZWZhdWx0VG9IaWdoZXI6IGZhbHNlXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICB1cmdlbmN5OiBVcmdlbmN5TGV2ZWwuU0VMRl9DQVJFLFxyXG4gICAgICAgICAgZXhwZWN0ZWRNYXhXYWl0OiAxMjAsXHJcbiAgICAgICAgICBleHBlY3RlZERlZmF1bHRUb0hpZ2hlcjogZmFsc2VcclxuICAgICAgICB9XHJcbiAgICAgIF07XHJcblxyXG4gICAgICBmb3IgKGNvbnN0IHRlc3RDYXNlIG9mIHRlc3RDYXNlcykge1xyXG4gICAgICAgIGNvbnN0IGVwaXNvZGUgPSBjcmVhdGVNb2NrRXBpc29kZSh0ZXN0Q2FzZS51cmdlbmN5KTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBNb2NrIG5vIGJhY2t1cCBzdXBlcnZpc29yIGF2YWlsYWJsZSB0byB0ZXN0IGRlZmF1bHQgYmVoYXZpb3JcclxuICAgICAgICBqZXN0LnNweU9uKGVzY2FsYXRpb25TZXJ2aWNlIGFzIGFueSwgJ2ZpbmRBdmFpbGFibGVCYWNrdXBTdXBlcnZpc29yJylcclxuICAgICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZShudWxsKTtcclxuXHJcbiAgICAgICAgLy8gTW9jayBvcGVyYXRpb25zXHJcbiAgICAgICAgKG1vY2tEb2NDbGllbnQuc2VuZCBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlKHt9KTtcclxuICAgICAgICAobW9ja1NOU0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWUoe1xyXG4gICAgICAgICAgTWVzc2FnZUlkOiBgcnVsZS10ZXN0LSR7dGVzdENhc2UudXJnZW5jeX1gXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGF3YWl0IGVzY2FsYXRpb25TZXJ2aWNlLmVzY2FsYXRlRXBpc29kZShlcGlzb2RlLCAnVGVzdCBlc2NhbGF0aW9uJyk7XHJcblxyXG4gICAgICAgIGlmICh0ZXN0Q2FzZS5leHBlY3RlZERlZmF1bHRUb0hpZ2hlcikge1xyXG4gICAgICAgICAgLy8gU2hvdWxkIGNyZWF0ZSBhdXRvbWF0aWMgdmFsaWRhdGlvbiBmb3IgaGlnaGVyIGNhcmUgbGV2ZWxzXHJcbiAgICAgICAgICBleHBlY3QobW9ja0RvY0NsaWVudC5zZW5kKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcclxuICAgICAgICAgICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgICAgIFVwZGF0ZUV4cHJlc3Npb246ICdTRVQgdHJpYWdlLmh1bWFuVmFsaWRhdGlvbiA9IDp2YWxpZGF0aW9uLCB2YWxpZGF0aW9uU3RhdHVzID0gOnN0YXR1cywgdXBkYXRlZEF0ID0gOnVwZGF0ZWRBdCdcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIC8vIFNob3VsZCBvbmx5IHNlbmQgZXNjYWxhdGlvbiBub3RpZmljYXRpb24gZm9yIGxvd2VyIHByaW9yaXR5XHJcbiAgICAgICAgICBleHBlY3QobW9ja1NOU0NsaWVudC5zZW5kKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcclxuICAgICAgICAgICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgICAgIE1lc3NhZ2U6IGV4cGVjdC5zdHJpbmdDb250YWluaW5nKCdUZXN0IGVzY2FsYXRpb24nKVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGplc3QuY2xlYXJBbGxNb2NrcygpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ0Vycm9yIEhhbmRsaW5nJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgRHluYW1vREIgZXJyb3JzIGluIGhhbmRsZU92ZXJyaWRlJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBlcGlzb2RlID0gY3JlYXRlTW9ja0VwaXNvZGUoKTtcclxuICAgICAgY29uc3QgdmFsaWRhdGlvbiA9IGNyZWF0ZU1vY2tWYWxpZGF0aW9uKCk7XHJcblxyXG4gICAgICAobW9ja0RvY0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1JlamVjdGVkVmFsdWVPbmNlKFxyXG4gICAgICAgIG5ldyBFcnJvcignRHluYW1vREIgdXBkYXRlIGZhaWxlZCcpXHJcbiAgICAgICk7XHJcblxyXG4gICAgICBhd2FpdCBleHBlY3QoXHJcbiAgICAgICAgZXNjYWxhdGlvblNlcnZpY2UuaGFuZGxlT3ZlcnJpZGUoZXBpc29kZSwgdmFsaWRhdGlvbilcclxuICAgICAgKS5yZWplY3RzLnRvVGhyb3coJ0R5bmFtb0RCIHVwZGF0ZSBmYWlsZWQnKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgaGFuZGxlIFNOUyBlcnJvcnMgaW4gZXNjYWxhdGlvbiBub3RpZmljYXRpb25zJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBlcGlzb2RlID0gY3JlYXRlTW9ja0VwaXNvZGUoKTtcclxuICAgICAgY29uc3QgcmVhc29uID0gJ1Rlc3QgZXNjYWxhdGlvbic7XHJcblxyXG4gICAgICAvLyBNb2NrIGJhY2t1cCBzdXBlcnZpc29yIG5vdCBhdmFpbGFibGVcclxuICAgICAgamVzdC5zcHlPbihlc2NhbGF0aW9uU2VydmljZSBhcyBhbnksICdmaW5kQXZhaWxhYmxlQmFja3VwU3VwZXJ2aXNvcicpXHJcbiAgICAgICAgLm1vY2tSZXNvbHZlZFZhbHVlKG51bGwpO1xyXG5cclxuICAgICAgLy8gTW9jayBEeW5hbW9EQiBzdWNjZXNzIGJ1dCBTTlMgZmFpbHVyZVxyXG4gICAgICAobW9ja0RvY0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWUoe30pO1xyXG4gICAgICAobW9ja1NOU0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1JlamVjdGVkVmFsdWVPbmNlKFxyXG4gICAgICAgIG5ldyBFcnJvcignU05TIHB1Ymxpc2ggZmFpbGVkJylcclxuICAgICAgKTtcclxuXHJcbiAgICAgIGF3YWl0IGV4cGVjdChcclxuICAgICAgICBlc2NhbGF0aW9uU2VydmljZS5lc2NhbGF0ZUVwaXNvZGUoZXBpc29kZSwgcmVhc29uKVxyXG4gICAgICApLnJlamVjdHMudG9UaHJvdygnU05TIHB1Ymxpc2ggZmFpbGVkJyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGhhbmRsZSBlcnJvcnMgaW4gY2hlY2tGb3JUaW1lb3V0RXNjYWxhdGlvbnMgZ3JhY2VmdWxseScsIGFzeW5jICgpID0+IHtcclxuICAgICAgLy8gTW9jayBEeW5hbW9EQiBlcnJvciBmb3IgZmlyc3QgcXVlcnlcclxuICAgICAgKG1vY2tEb2NDbGllbnQuc2VuZCBhcyBqZXN0Lk1vY2spXHJcbiAgICAgICAgLm1vY2tSZWplY3RlZFZhbHVlT25jZShuZXcgRXJyb3IoJ1F1ZXJ5IGZhaWxlZCcpKVxyXG4gICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZSh7IEl0ZW1zOiBbXSB9KTsgLy8gU3Vic2VxdWVudCBxdWVyaWVzIHN1Y2NlZWRcclxuXHJcbiAgICAgIC8vIFNob3VsZCBub3QgdGhyb3cgZXJyb3IsIHNob3VsZCBjb250aW51ZSB3aXRoIG90aGVyIHVyZ2VuY3kgbGV2ZWxzXHJcbiAgICAgIGF3YWl0IGV4cGVjdChcclxuICAgICAgICBlc2NhbGF0aW9uU2VydmljZS5jaGVja0ZvclRpbWVvdXRFc2NhbGF0aW9ucygpXHJcbiAgICAgICkucmVzb2x2ZXMubm90LnRvVGhyb3coKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG59KTsiXX0=