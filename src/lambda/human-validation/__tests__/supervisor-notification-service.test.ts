// Unit tests for Supervisor Notification Service
// Tests SNS notification functionality

import { SupervisorNotificationService } from '../supervisor-notification-service';
import { SNSClient } from '@aws-sdk/client-sns';
import { Episode, HumanValidation, UrgencyLevel, EpisodeStatus, InputMethod } from '../../../types';

// Mock SNS Client
const mockSNSClient = {
  send: jest.fn()
} as unknown as SNSClient;

describe('SupervisorNotificationService', () => {
  let notificationService: SupervisorNotificationService;
  const notificationTopicArn = 'arn:aws:sns:us-east-1:123456789012:notifications';
  const emergencyAlertTopicArn = 'arn:aws:sns:us-east-1:123456789012:emergency-alerts';

  beforeEach(() => {
    notificationService = new SupervisorNotificationService(
      mockSNSClient,
      notificationTopicArn,
      emergencyAlertTopicArn
    );
    jest.clearAllMocks();
  });

  const createMockEpisode = (urgencyLevel: UrgencyLevel = UrgencyLevel.URGENT): Episode => ({
    episodeId: 'episode-123',
    patientId: 'patient-456',
    status: EpisodeStatus.ACTIVE,
    symptoms: {
      primaryComplaint: 'Chest pain',
      duration: '2 hours',
      severity: 8,
      associatedSymptoms: ['shortness of breath', 'nausea'],
      inputMethod: InputMethod.TEXT
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

  const createMockValidation = (): HumanValidation => ({
    supervisorId: 'supervisor-789',
    approved: true,
    timestamp: new Date(),
    notes: 'Assessment approved after review'
  });

  describe('notifySupervisor', () => {
    it('should send regular validation notification', async () => {
      const episode = createMockEpisode(UrgencyLevel.URGENT);
      const supervisorId = 'supervisor-789';

      (mockSNSClient.send as jest.Mock).mockResolvedValueOnce({
        MessageId: 'msg-123'
      });

      await notificationService.notifySupervisor(episode, supervisorId, false);

      expect(mockSNSClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
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
              StringValue: UrgencyLevel.URGENT
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
        })
      );
    });

    it('should send emergency alert notification', async () => {
      const episode = createMockEpisode(UrgencyLevel.EMERGENCY);
      const supervisorId = 'emergency-supervisor';

      (mockSNSClient.send as jest.Mock).mockResolvedValueOnce({
        MessageId: 'emergency-msg-123'
      });

      await notificationService.notifySupervisor(episode, supervisorId, true);

      expect(mockSNSClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          TopicArn: emergencyAlertTopicArn,
          Subject: '[EMERGENCY ALERT] Immediate Validation Required - Episode episode-123',
          Message: expect.stringContaining('🚨 EMERGENCY SITUATION DETECTED 🚨'),
          MessageAttributes: expect.objectContaining({
            'notification_type': {
              DataType: 'String',
              StringValue: 'emergency_alert'
            }
          })
        })
      );
    });

    it('should handle notification without assigned supervisor', async () => {
      const episode = createMockEpisode();

      (mockSNSClient.send as jest.Mock).mockResolvedValueOnce({
        MessageId: 'unassigned-msg-123'
      });

      await notificationService.notifySupervisor(episode);

      expect(mockSNSClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          MessageAttributes: expect.objectContaining({
            'supervisor_id': {
              DataType: 'String',
              StringValue: 'unassigned'
            }
          })
        })
      );
    });

    it('should include AI assessment details when available', async () => {
      const episode = createMockEpisode();
      episode.triage!.aiAssessment = {
        used: true,
        confidence: 0.85,
        reasoning: 'Symptoms indicate moderate to high urgency'
      };

      (mockSNSClient.send as jest.Mock).mockResolvedValueOnce({
        MessageId: 'ai-msg-123'
      });

      await notificationService.notifySupervisor(episode, 'supervisor-123');

      expect(mockSNSClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          Message: expect.stringMatching(/AI Assessment Used: Yes.*AI Confidence: 0\.85.*AI Reasoning: Symptoms indicate moderate to high urgency/s)
        })
      );
    });

    it('should handle episodes without AI assessment', async () => {
      const episode = createMockEpisode();
      episode.triage!.aiAssessment = { used: false };

      (mockSNSClient.send as jest.Mock).mockResolvedValueOnce({
        MessageId: 'no-ai-msg-123'
      });

      await notificationService.notifySupervisor(episode, 'supervisor-123');

      expect(mockSNSClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          Message: expect.stringContaining('AI Assessment Used: No')
        })
      );
    });
  });

  describe('notifyCareCoordinator', () => {
    it('should send validation completed notification for approved case', async () => {
      const episode = createMockEpisode();
      const validation = createMockValidation();

      (mockSNSClient.send as jest.Mock).mockResolvedValueOnce({
        MessageId: 'coordinator-msg-123'
      });

      await notificationService.notifyCareCoordinator(episode, validation);

      expect(mockSNSClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
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
        })
      );
    });

    it('should send validation completed notification for rejected case', async () => {
      const episode = createMockEpisode();
      const validation: HumanValidation = {
        supervisorId: 'supervisor-789',
        approved: false,
        overrideReason: 'AI assessment appears incorrect',
        timestamp: new Date(),
        notes: 'Recommend lower urgency level'
      };

      (mockSNSClient.send as jest.Mock).mockResolvedValueOnce({
        MessageId: 'rejected-msg-123'
      });

      await notificationService.notifyCareCoordinator(episode, validation);

      expect(mockSNSClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          Message: expect.stringMatching(/Validation Decision: NOT APPROVED.*Override Reason: AI assessment appears incorrect.*Notes: Recommend lower urgency level/s),
          MessageAttributes: expect.objectContaining({
            'approved': {
              DataType: 'String',
              StringValue: 'false'
            }
          })
        })
      );
    });
  });

  describe('sendEscalationNotification', () => {
    it('should send escalation notification with backup supervisors', async () => {
      const episode = createMockEpisode(UrgencyLevel.EMERGENCY);
      const reason = 'Primary supervisor unavailable';
      const backupSupervisors = ['backup-1', 'backup-2'];

      // Add queue information to episode
      (episode as any).assignedSupervisor = 'original-supervisor';
      (episode as any).queuedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // 30 minutes ago

      (mockSNSClient.send as jest.Mock).mockResolvedValueOnce({
        MessageId: 'escalation-msg-123'
      });

      await notificationService.sendEscalationNotification(episode, reason, backupSupervisors);

      expect(mockSNSClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
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
        })
      );
    });

    it('should handle escalation for unassigned episodes', async () => {
      const episode = createMockEpisode();
      const reason = 'No supervisor available';
      const backupSupervisors = ['backup-1'];

      (mockSNSClient.send as jest.Mock).mockResolvedValueOnce({
        MessageId: 'unassigned-escalation-msg-123'
      });

      await notificationService.sendEscalationNotification(episode, reason, backupSupervisors);

      expect(mockSNSClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          Message: expect.stringContaining('Original Assignment: Unassigned')
        })
      );
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

      (mockSNSClient.send as jest.Mock).mockResolvedValueOnce({
        MessageId: 'queue-stats-msg-123'
      });

      await notificationService.sendQueueStatusUpdate(queueStats);

      expect(mockSNSClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
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
        })
      );
    });
  });

  describe('Subject Line Generation', () => {
    it('should create appropriate subject lines for different notification types', async () => {
      const testCases = [
        {
          urgency: UrgencyLevel.EMERGENCY,
          isEmergency: true,
          expectedPrefix: '[EMERGENCY ALERT]'
        },
        {
          urgency: UrgencyLevel.URGENT,
          isEmergency: false,
          expectedPrefix: '[URGENT]'
        },
        {
          urgency: UrgencyLevel.ROUTINE,
          isEmergency: false,
          expectedPrefix: ''
        }
      ];

      for (const testCase of testCases) {
        const episode = createMockEpisode(testCase.urgency);

        (mockSNSClient.send as jest.Mock).mockResolvedValueOnce({
          MessageId: `test-msg-${testCase.urgency}`
        });

        await notificationService.notifySupervisor(episode, 'supervisor-123', testCase.isEmergency);

        expect(mockSNSClient.send).toHaveBeenCalledWith(
          expect.objectContaining({
            Subject: expect.stringContaining(testCase.expectedPrefix)
          })
        );
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle SNS publish failures', async () => {
      const episode = createMockEpisode();

      (mockSNSClient.send as jest.Mock).mockRejectedValueOnce(
        new Error('SNS publish failed')
      );

      await expect(
        notificationService.notifySupervisor(episode, 'supervisor-123')
      ).rejects.toThrow('SNS publish failed');
    });

    it('should handle missing episode data gracefully', async () => {
      const incompleteEpisode = {
        episodeId: 'episode-123',
        patientId: 'patient-456',
        triage: {
          urgencyLevel: UrgencyLevel.URGENT,
          ruleBasedScore: 85,
          aiAssessment: { used: false },
          finalScore: 85
        }
      } as Episode;

      (mockSNSClient.send as jest.Mock).mockResolvedValueOnce({
        MessageId: 'incomplete-msg-123'
      });

      await expect(
        notificationService.notifySupervisor(incompleteEpisode, 'supervisor-123')
      ).resolves.not.toThrow();
    });
  });

  describe('Message Content Validation', () => {
    it('should include all required information in validation notification', async () => {
      const episode = createMockEpisode();
      const supervisorId = 'supervisor-789';

      (mockSNSClient.send as jest.Mock).mockResolvedValueOnce({
        MessageId: 'content-test-msg-123'
      });

      await notificationService.notifySupervisor(episode, supervisorId);

      const sentMessage = (mockSNSClient.send as jest.Mock).mock.calls[0][0];
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
      const episode = createMockEpisode(UrgencyLevel.EMERGENCY);

      (mockSNSClient.send as jest.Mock).mockResolvedValueOnce({
        MessageId: 'emergency-format-msg-123'
      });

      await notificationService.notifySupervisor(episode, 'emergency-supervisor', true);

      const sentMessage = (mockSNSClient.send as jest.Mock).mock.calls[0][0];
      const messageBody = sentMessage.Message;

      expect(messageBody).toContain('🚨 EMERGENCY SITUATION DETECTED 🚨');
      expect(messageBody).toContain('IMMEDIATE VALIDATION REQUIRED');
    });
  });
});