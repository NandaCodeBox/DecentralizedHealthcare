// Unit tests for Escalation Service
// Tests supervisor unavailability and escalation logic

import { EscalationService } from '../escalation-service';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { SNSClient } from '@aws-sdk/client-sns';
import { Episode, HumanValidation, UrgencyLevel, EpisodeStatus, InputMethod } from '../../../types';

// Mock AWS SDK clients
const mockDocClient = {
  send: jest.fn()
} as unknown as DynamoDBDocumentClient;

const mockSNSClient = {
  send: jest.fn()
} as unknown as SNSClient;

describe('EscalationService', () => {
  let escalationService: EscalationService;
  const tableName = 'test-episodes';
  const notificationTopicArn = 'arn:aws:sns:us-east-1:123456789012:notifications';

  beforeEach(() => {
    escalationService = new EscalationService(
      mockDocClient,
      mockSNSClient,
      tableName,
      notificationTopicArn
    );
    jest.clearAllMocks();
  });

  const createMockEpisode = (
    urgencyLevel: UrgencyLevel = UrgencyLevel.URGENT,
    episodeId: string = 'episode-123'
  ): Episode => ({
    episodeId,
    patientId: 'patient-456',
    status: EpisodeStatus.ACTIVE,
    symptoms: {
      primaryComplaint: 'Chest pain',
      duration: '2 hours',
      severity: 8,
      associatedSymptoms: ['shortness of breath'],
      inputMethod: InputMethod.TEXT
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

  const createMockValidation = (approved: boolean = false): HumanValidation => ({
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
      (mockDocClient.send as jest.Mock).mockResolvedValue({});

      await escalationService.handleOverride(episode, validation);

      // Should update episode with override info but not escalate
      expect(mockDocClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          UpdateExpression: 'SET overrideInfo = :override, updatedAt = :updatedAt'
        })
      );

      // Should not send escalation notifications for approved overrides
      expect(mockSNSClient.send).not.toHaveBeenCalled();
    });

    it('should escalate episode when override is not approved', async () => {
      const episode = createMockEpisode();
      const validation = createMockValidation(false);

      // Mock DynamoDB operations
      (mockDocClient.send as jest.Mock).mockResolvedValue({});

      // Mock SNS notifications
      (mockSNSClient.send as jest.Mock).mockResolvedValue({
        MessageId: 'escalation-msg-123'
      });

      await escalationService.handleOverride(episode, validation);

      // Should update episode with override and escalation info
      expect(mockDocClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          UpdateExpression: 'SET overrideInfo = :override, updatedAt = :updatedAt'
        })
      );

      expect(mockDocClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          UpdateExpression: 'SET escalationInfo = :escalation, updatedAt = :updatedAt'
        })
      );

      // Should send escalation notification
      expect(mockSNSClient.send).toHaveBeenCalled();
    });
  });

  describe('checkForTimeoutEscalations', () => {
    it('should escalate emergency episodes that exceed 5 minute threshold', async () => {
      const overdueEmergencyEpisodes = [
        createMockEpisode(UrgencyLevel.EMERGENCY, 'emergency-1'),
        createMockEpisode(UrgencyLevel.EMERGENCY, 'emergency-2')
      ];

      // Mock getting overdue episodes for each urgency level
      (mockDocClient.send as jest.Mock)
        .mockResolvedValueOnce({ Items: overdueEmergencyEpisodes }) // Emergency
        .mockResolvedValueOnce({ Items: [] }) // Urgent
        .mockResolvedValueOnce({ Items: [] }) // Routine
        .mockResolvedValueOnce({ Items: [] }); // Self-care

      // Mock escalation operations
      (mockDocClient.send as jest.Mock).mockResolvedValue({});
      (mockSNSClient.send as jest.Mock).mockResolvedValue({
        MessageId: 'timeout-escalation-msg'
      });

      await escalationService.checkForTimeoutEscalations();

      // Should query for overdue episodes with 5-minute threshold for emergency
      expect(mockDocClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          FilterExpression: 'urgencyLevel = :urgency AND queuedAt < :threshold',
          ExpressionAttributeValues: expect.objectContaining({
            ':urgency': UrgencyLevel.EMERGENCY
          })
        })
      );

      // Should escalate both emergency episodes
      expect(mockSNSClient.send).toHaveBeenCalledTimes(2);
    });

    it('should use different thresholds for different urgency levels', async () => {
      // Mock empty results for all urgency levels
      (mockDocClient.send as jest.Mock).mockResolvedValue({ Items: [] });

      await escalationService.checkForTimeoutEscalations();

      // Verify queries were made with correct urgency levels
      const calls = (mockDocClient.send as jest.Mock).mock.calls;
      
      expect(calls.some(call => 
        call[0].ExpressionAttributeValues?.[':urgency'] === UrgencyLevel.EMERGENCY
      )).toBe(true);
      
      expect(calls.some(call => 
        call[0].ExpressionAttributeValues?.[':urgency'] === UrgencyLevel.URGENT
      )).toBe(true);
      
      expect(calls.some(call => 
        call[0].ExpressionAttributeValues?.[':urgency'] === UrgencyLevel.ROUTINE
      )).toBe(true);
      
      expect(calls.some(call => 
        call[0].ExpressionAttributeValues?.[':urgency'] === UrgencyLevel.SELF_CARE
      )).toBe(true);
    });
  });

  describe('handleSupervisorUnavailability', () => {
    it('should reassign episodes to available backup supervisors', async () => {
      const supervisorId = 'unavailable-supervisor';
      const assignedEpisodes = [
        createMockEpisode(UrgencyLevel.URGENT, 'episode-1'),
        createMockEpisode(UrgencyLevel.ROUTINE, 'episode-2')
      ];

      // Mock getting episodes assigned to supervisor
      (mockDocClient.send as jest.Mock).mockResolvedValueOnce({
        Items: assignedEpisodes
      });

      // Mock reassignment and notification operations
      (mockDocClient.send as jest.Mock).mockResolvedValue({});
      (mockSNSClient.send as jest.Mock).mockResolvedValue({
        MessageId: 'reassignment-msg'
      });

      await escalationService.handleSupervisorUnavailability(supervisorId);

      // Should query for episodes assigned to unavailable supervisor
      expect(mockDocClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          FilterExpression: 'assignedSupervisor = :supervisor',
          ExpressionAttributeValues: expect.objectContaining({
            ':supervisor': supervisorId
          })
        })
      );

      // Should reassign episodes to backup supervisors
      expect(mockDocClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          UpdateExpression: 'SET assignedSupervisor = :supervisor, reassignedAt = :timestamp, updatedAt = :updatedAt'
        })
      );

      // Should send notifications to backup supervisors
      expect(mockSNSClient.send).toHaveBeenCalled();
    });

    it('should escalate episodes when no backup supervisors available', async () => {
      const supervisorId = 'unavailable-supervisor';
      const assignedEpisodes = [createMockEpisode(UrgencyLevel.EMERGENCY)];

      // Mock getting episodes assigned to supervisor
      (mockDocClient.send as jest.Mock).mockResolvedValueOnce({
        Items: assignedEpisodes
      });

      // Mock escalation operations
      (mockDocClient.send as jest.Mock).mockResolvedValue({});
      (mockSNSClient.send as jest.Mock).mockResolvedValue({
        MessageId: 'no-backup-escalation-msg'
      });

      // Mock no available backup supervisors
      jest.spyOn(escalationService as any, 'findAvailableBackupSupervisor')
        .mockResolvedValue(null);

      await escalationService.handleSupervisorUnavailability(supervisorId);

      // Should send escalation notification
      expect(mockSNSClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          Message: expect.stringContaining('no backup available')
        })
      );
    });
  });

  describe('escalateEpisode', () => {
    it('should reassign to backup supervisor when available', async () => {
      const episode = createMockEpisode(UrgencyLevel.URGENT);
      const reason = 'Supervisor timeout';

      // Mock backup supervisor availability
      jest.spyOn(escalationService as any, 'findAvailableBackupSupervisor')
        .mockResolvedValue('backup-supervisor-1');

      // Mock DynamoDB and SNS operations
      (mockDocClient.send as jest.Mock).mockResolvedValue({});
      (mockSNSClient.send as jest.Mock).mockResolvedValue({
        MessageId: 'backup-escalation-msg'
      });

      await escalationService.escalateEpisode(episode, reason);

      // Should reassign to backup supervisor
      expect(mockDocClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          UpdateExpression: 'SET assignedSupervisor = :supervisor, reassignedAt = :timestamp, updatedAt = :updatedAt',
          ExpressionAttributeValues: expect.objectContaining({
            ':supervisor': 'backup-supervisor-1'
          })
        })
      );

      // Should send escalation and supervisor notifications
      expect(mockSNSClient.send).toHaveBeenCalledTimes(2);
    });

    it('should default to higher care level for emergency episodes when no backup available', async () => {
      const episode = createMockEpisode(UrgencyLevel.EMERGENCY);
      const reason = 'All supervisors unavailable';

      // Mock no backup supervisor available
      jest.spyOn(escalationService as any, 'findAvailableBackupSupervisor')
        .mockResolvedValue(null);

      // Mock DynamoDB and SNS operations
      (mockDocClient.send as jest.Mock).mockResolvedValue({});
      (mockSNSClient.send as jest.Mock).mockResolvedValue({
        MessageId: 'default-higher-care-msg'
      });

      await escalationService.escalateEpisode(episode, reason);

      // Should create automatic validation
      expect(mockDocClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          UpdateExpression: 'SET triage.humanValidation = :validation, validationStatus = :status, updatedAt = :updatedAt',
          ExpressionAttributeValues: expect.objectContaining({
            ':validation': expect.objectContaining({
              supervisorId: 'system-escalation',
              approved: true,
              overrideReason: expect.stringContaining('Automatic approval due to escalation')
            })
          })
        })
      );

      // Should update status to escalated
      expect(mockDocClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
          ExpressionAttributeValues: expect.objectContaining({
            ':status': EpisodeStatus.ESCALATED
          })
        })
      );
    });

    it('should not default to higher care level for routine episodes', async () => {
      const episode = createMockEpisode(UrgencyLevel.ROUTINE);
      const reason = 'Supervisor unavailable';

      // Mock no backup supervisor available
      jest.spyOn(escalationService as any, 'findAvailableBackupSupervisor')
        .mockResolvedValue(null);

      // Mock SNS operations
      (mockSNSClient.send as jest.Mock).mockResolvedValue({
        MessageId: 'routine-escalation-msg'
      });

      await escalationService.escalateEpisode(episode, reason);

      // Should only send escalation notification, not default to higher care
      expect(mockSNSClient.send).toHaveBeenCalledTimes(1);
      expect(mockSNSClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          Message: expect.stringContaining('Escalation Reason: Supervisor unavailable')
        })
      );
    });
  });

  describe('defaultToHigherCareLevel', () => {
    it('should create automatic approval and update episode status', async () => {
      const episode = createMockEpisode(UrgencyLevel.EMERGENCY);
      const reason = 'No supervisors available';

      // Mock DynamoDB and SNS operations
      (mockDocClient.send as jest.Mock).mockResolvedValue({});
      (mockSNSClient.send as jest.Mock).mockResolvedValue({
        MessageId: 'auto-approval-msg'
      });

      await escalationService.defaultToHigherCareLevel(episode, reason);

      // Should create automatic validation
      expect(mockDocClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          UpdateExpression: 'SET triage.humanValidation = :validation, validationStatus = :status, updatedAt = :updatedAt',
          ExpressionAttributeValues: expect.objectContaining({
            ':validation': expect.objectContaining({
              supervisorId: 'system-escalation',
              approved: true,
              overrideReason: expect.stringContaining(reason),
              notes: 'Defaulted to higher care level due to supervisor unavailability'
            })
          })
        })
      );

      // Should update episode status to escalated
      expect(mockDocClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
          ExpressionAttributeValues: expect.objectContaining({
            ':status': EpisodeStatus.ESCALATED
          })
        })
      );

      // Should notify care coordinator
      expect(mockSNSClient.send).toHaveBeenCalled();
    });
  });

  describe('Escalation Rules', () => {
    it('should use correct escalation rules for different urgency levels', async () => {
      const testCases = [
        {
          urgency: UrgencyLevel.EMERGENCY,
          expectedMaxWait: 5,
          expectedDefaultToHigher: true
        },
        {
          urgency: UrgencyLevel.URGENT,
          expectedMaxWait: 15,
          expectedDefaultToHigher: true
        },
        {
          urgency: UrgencyLevel.ROUTINE,
          expectedMaxWait: 60,
          expectedDefaultToHigher: false
        },
        {
          urgency: UrgencyLevel.SELF_CARE,
          expectedMaxWait: 120,
          expectedDefaultToHigher: false
        }
      ];

      for (const testCase of testCases) {
        const episode = createMockEpisode(testCase.urgency);
        
        // Mock no backup supervisor available to test default behavior
        jest.spyOn(escalationService as any, 'findAvailableBackupSupervisor')
          .mockResolvedValue(null);

        // Mock operations
        (mockDocClient.send as jest.Mock).mockResolvedValue({});
        (mockSNSClient.send as jest.Mock).mockResolvedValue({
          MessageId: `rule-test-${testCase.urgency}`
        });

        await escalationService.escalateEpisode(episode, 'Test escalation');

        if (testCase.expectedDefaultToHigher) {
          // Should create automatic validation for higher care levels
          expect(mockDocClient.send).toHaveBeenCalledWith(
            expect.objectContaining({
              UpdateExpression: 'SET triage.humanValidation = :validation, validationStatus = :status, updatedAt = :updatedAt'
            })
          );
        } else {
          // Should only send escalation notification for lower priority
          expect(mockSNSClient.send).toHaveBeenCalledWith(
            expect.objectContaining({
              Message: expect.stringContaining('Test escalation')
            })
          );
        }

        jest.clearAllMocks();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle DynamoDB errors in handleOverride', async () => {
      const episode = createMockEpisode();
      const validation = createMockValidation();

      (mockDocClient.send as jest.Mock).mockRejectedValueOnce(
        new Error('DynamoDB update failed')
      );

      await expect(
        escalationService.handleOverride(episode, validation)
      ).rejects.toThrow('DynamoDB update failed');
    });

    it('should handle SNS errors in escalation notifications', async () => {
      const episode = createMockEpisode();
      const reason = 'Test escalation';

      // Mock backup supervisor not available
      jest.spyOn(escalationService as any, 'findAvailableBackupSupervisor')
        .mockResolvedValue(null);

      // Mock DynamoDB success but SNS failure
      (mockDocClient.send as jest.Mock).mockResolvedValue({});
      (mockSNSClient.send as jest.Mock).mockRejectedValueOnce(
        new Error('SNS publish failed')
      );

      await expect(
        escalationService.escalateEpisode(episode, reason)
      ).rejects.toThrow('SNS publish failed');
    });

    it('should handle errors in checkForTimeoutEscalations gracefully', async () => {
      // Mock DynamoDB error for first query
      (mockDocClient.send as jest.Mock)
        .mockRejectedValueOnce(new Error('Query failed'))
        .mockResolvedValue({ Items: [] }); // Subsequent queries succeed

      // Should not throw error, should continue with other urgency levels
      await expect(
        escalationService.checkForTimeoutEscalations()
      ).resolves.not.toThrow();
    });
  });
});