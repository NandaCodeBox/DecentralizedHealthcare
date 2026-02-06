// Unit tests for Validation Queue Manager
// Tests queue management functionality

import { ValidationQueueManager } from '../validation-queue-manager';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Episode, UrgencyLevel, EpisodeStatus, InputMethod } from '../../../types';

// Mock DynamoDB Document Client
const mockDocClient = {
  send: jest.fn()
} as unknown as DynamoDBDocumentClient;

describe('ValidationQueueManager', () => {
  let queueManager: ValidationQueueManager;
  const tableName = 'test-episodes';

  beforeEach(() => {
    queueManager = new ValidationQueueManager(mockDocClient, tableName);
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

  describe('addToQueue', () => {
    it('should add episode to validation queue with correct priority', async () => {
      const episode = createMockEpisode(UrgencyLevel.EMERGENCY);
      const supervisorId = 'supervisor-789';

      (mockDocClient.send as jest.Mock).mockResolvedValueOnce({});

      await queueManager.addToQueue(episode, supervisorId);

      expect(mockDocClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: tableName,
          Key: { episodeId: episode.episodeId },
          UpdateExpression: expect.stringContaining('validationStatus = :status'),
          ExpressionAttributeValues: expect.objectContaining({
            ':status': 'pending',
            ':supervisor': supervisorId,
            ':priority': 100 // Emergency priority
          })
        })
      );
    });

    it('should calculate correct priority for different urgency levels', async () => {
      const testCases = [
        { urgency: UrgencyLevel.EMERGENCY, expectedPriority: 100 },
        { urgency: UrgencyLevel.URGENT, expectedPriority: 75 },
        { urgency: UrgencyLevel.ROUTINE, expectedPriority: 50 },
        { urgency: UrgencyLevel.SELF_CARE, expectedPriority: 25 }
      ];

      for (const testCase of testCases) {
        const episode = createMockEpisode(testCase.urgency);
        (mockDocClient.send as jest.Mock).mockResolvedValueOnce({});

        await queueManager.addToQueue(episode);

        expect(mockDocClient.send).toHaveBeenCalledWith(
          expect.objectContaining({
            ExpressionAttributeValues: expect.objectContaining({
              ':priority': testCase.expectedPriority
            })
          })
        );
      }
    });

    it('should handle episodes without assigned supervisor', async () => {
      const episode = createMockEpisode();

      (mockDocClient.send as jest.Mock).mockResolvedValueOnce({});

      await queueManager.addToQueue(episode);

      expect(mockDocClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          ExpressionAttributeValues: expect.objectContaining({
            ':supervisor': null
          })
        })
      );
    });
  });

  describe('removeFromQueue', () => {
    it('should remove episode from validation queue', async () => {
      const episodeId = 'episode-123';

      (mockDocClient.send as jest.Mock).mockResolvedValueOnce({});

      await queueManager.removeFromQueue(episodeId);

      expect(mockDocClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: tableName,
          Key: { episodeId },
          UpdateExpression: expect.stringContaining('REMOVE queuedAt, queuePriority, assignedSupervisor'),
          ExpressionAttributeValues: expect.objectContaining({
            ':status': 'completed'
          })
        })
      );
    });
  });

  describe('getQueue', () => {
    it('should return queue items for specific supervisor', async () => {
      const supervisorId = 'supervisor-789';
      const mockEpisodes = [
        createMockEpisode(UrgencyLevel.EMERGENCY, 'episode-1'),
        createMockEpisode(UrgencyLevel.URGENT, 'episode-2')
      ];

      (mockDocClient.send as jest.Mock).mockResolvedValueOnce({
        Items: mockEpisodes
      });

      const result = await queueManager.getQueue(supervisorId, undefined, 10);

      expect(mockDocClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: tableName,
          IndexName: 'ValidationStatusIndex',
          KeyConditionExpression: 'validationStatus = :status',
          FilterExpression: 'assignedSupervisor = :supervisor',
          ExpressionAttributeValues: {
            ':status': 'pending',
            ':supervisor': supervisorId
          },
          Limit: 10
        })
      );

      expect(result).toHaveLength(2);
      expect(result[0].episodeId).toBe('episode-1');
      expect(result[0].urgencyLevel).toBe(UrgencyLevel.EMERGENCY);
    });

    it('should return all pending episodes when no supervisor specified', async () => {
      const mockEpisodes = [createMockEpisode()];

      (mockDocClient.send as jest.Mock).mockResolvedValueOnce({
        Items: mockEpisodes
      });

      const result = await queueManager.getQueue();

      expect(mockDocClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          KeyConditionExpression: 'validationStatus = :status',
          ExpressionAttributeValues: {
            ':status': 'pending'
          }
        })
      );

      expect(result).toHaveLength(1);
    });

    it('should filter queue by urgency level', async () => {
      const mockEpisodes = [
        createMockEpisode(UrgencyLevel.EMERGENCY, 'episode-1'),
        createMockEpisode(UrgencyLevel.URGENT, 'episode-2')
      ];

      (mockDocClient.send as jest.Mock).mockResolvedValueOnce({
        Items: mockEpisodes
      });

      const result = await queueManager.getQueue(undefined, UrgencyLevel.EMERGENCY);

      expect(result).toHaveLength(1);
      expect(result[0].urgencyLevel).toBe(UrgencyLevel.EMERGENCY);
    });

    it('should sort queue items by priority and queue time', async () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 60000); // 1 minute earlier

      const mockEpisodes = [
        { ...createMockEpisode(UrgencyLevel.URGENT, 'episode-1'), createdAt: now },
        { ...createMockEpisode(UrgencyLevel.EMERGENCY, 'episode-2'), createdAt: earlier },
        { ...createMockEpisode(UrgencyLevel.URGENT, 'episode-3'), createdAt: earlier }
      ];

      (mockDocClient.send as jest.Mock).mockResolvedValueOnce({
        Items: mockEpisodes
      });

      const result = await queueManager.getQueue();

      // Emergency should be first (highest priority)
      expect(result[0].episodeId).toBe('episode-2');
      expect(result[0].urgencyLevel).toBe(UrgencyLevel.EMERGENCY);

      // Among same priority, earlier queued should be first
      expect(result[1].episodeId).toBe('episode-3');
      expect(result[2].episodeId).toBe('episode-1');
    });
  });

  describe('getQueuePosition', () => {
    it('should return correct queue position for episode', async () => {
      const episodeId = 'episode-2';
      const mockEpisode = createMockEpisode(UrgencyLevel.URGENT, episodeId);

      // Mock getting the specific episode
      (mockDocClient.send as jest.Mock).mockResolvedValueOnce({
        Items: [mockEpisode]
      });

      // Mock getting all queue items
      const mockQueueEpisodes = [
        createMockEpisode(UrgencyLevel.EMERGENCY, 'episode-1'),
        createMockEpisode(UrgencyLevel.URGENT, 'episode-2'),
        createMockEpisode(UrgencyLevel.ROUTINE, 'episode-3')
      ];

      (mockDocClient.send as jest.Mock).mockResolvedValueOnce({
        Items: mockQueueEpisodes
      });

      const position = await queueManager.getQueuePosition(episodeId);

      expect(position).toBe(2); // Second in queue (emergency first)
    });

    it('should return -1 for episode not in queue', async () => {
      // Mock episode not found in queue
      (mockDocClient.send as jest.Mock).mockResolvedValueOnce({
        Items: []
      });

      const position = await queueManager.getQueuePosition('non-existent-episode');

      expect(position).toBe(-1);
    });
  });

  describe('getEstimatedWaitTime', () => {
    it('should calculate estimated wait time based on queue position', async () => {
      const episodeId = 'episode-123';

      // Mock queue position
      jest.spyOn(queueManager, 'getQueuePosition').mockResolvedValueOnce(3);

      const waitTime = await queueManager.getEstimatedWaitTime(episodeId);

      // Position 3 means 2 episodes ahead, 2 * 15 minutes = 30 minutes
      expect(waitTime).toBe(30);
    });

    it('should return 0 for episode not in queue', async () => {
      const episodeId = 'episode-123';

      // Mock episode not in queue
      jest.spyOn(queueManager, 'getQueuePosition').mockResolvedValueOnce(-1);

      const waitTime = await queueManager.getEstimatedWaitTime(episodeId);

      expect(waitTime).toBe(0);
    });

    it('should return 0 for episode at front of queue', async () => {
      const episodeId = 'episode-123';

      // Mock episode at front of queue
      jest.spyOn(queueManager, 'getQueuePosition').mockResolvedValueOnce(1);

      const waitTime = await queueManager.getEstimatedWaitTime(episodeId);

      expect(waitTime).toBe(0);
    });
  });

  describe('getOverdueEpisodes', () => {
    it('should return episodes that have been in queue too long', async () => {
      const thresholdMinutes = 30;
      const mockOverdueEpisodes = [
        createMockEpisode(UrgencyLevel.URGENT, 'overdue-1'),
        createMockEpisode(UrgencyLevel.ROUTINE, 'overdue-2')
      ];

      (mockDocClient.send as jest.Mock).mockResolvedValueOnce({
        Items: mockOverdueEpisodes
      });

      const result = await queueManager.getOverdueEpisodes(thresholdMinutes);

      expect(mockDocClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          KeyConditionExpression: 'validationStatus = :status',
          FilterExpression: 'queuedAt < :threshold',
          ExpressionAttributeValues: expect.objectContaining({
            ':status': 'pending',
            ':threshold': expect.any(String)
          })
        })
      );

      expect(result).toHaveLength(2);
    });
  });

  describe('reassignEpisode', () => {
    it('should reassign episode to new supervisor', async () => {
      const episodeId = 'episode-123';
      const newSupervisorId = 'new-supervisor-456';

      (mockDocClient.send as jest.Mock).mockResolvedValueOnce({});

      await queueManager.reassignEpisode(episodeId, newSupervisorId);

      expect(mockDocClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          TableName: tableName,
          Key: { episodeId },
          UpdateExpression: 'SET assignedSupervisor = :supervisor, updatedAt = :updatedAt',
          ExpressionAttributeValues: expect.objectContaining({
            ':supervisor': newSupervisorId
          })
        })
      );
    });
  });

  describe('getQueueStatistics', () => {
    it('should return comprehensive queue statistics', async () => {
      const mockQueueEpisodes = [
        createMockEpisode(UrgencyLevel.EMERGENCY, 'episode-1'),
        createMockEpisode(UrgencyLevel.EMERGENCY, 'episode-2'),
        createMockEpisode(UrgencyLevel.URGENT, 'episode-3'),
        createMockEpisode(UrgencyLevel.ROUTINE, 'episode-4')
      ];

      (mockDocClient.send as jest.Mock).mockResolvedValueOnce({
        Items: mockQueueEpisodes
      });

      const stats = await queueManager.getQueueStatistics();

      expect(stats.totalPending).toBe(4);
      expect(stats.emergencyCount).toBe(2);
      expect(stats.urgentCount).toBe(1);
      expect(stats.routineCount).toBe(1);
      expect(stats.averageWaitTime).toBe(15); // Default average
    });
  });

  describe('Error Handling', () => {
    it('should handle DynamoDB errors in addToQueue', async () => {
      const episode = createMockEpisode();

      (mockDocClient.send as jest.Mock).mockRejectedValueOnce(
        new Error('DynamoDB error')
      );

      await expect(queueManager.addToQueue(episode)).rejects.toThrow('DynamoDB error');
    });

    it('should handle DynamoDB errors in getQueue', async () => {
      (mockDocClient.send as jest.Mock).mockRejectedValueOnce(
        new Error('Query failed')
      );

      await expect(queueManager.getQueue()).rejects.toThrow('Query failed');
    });

    it('should return empty array for getOverdueEpisodes on error', async () => {
      (mockDocClient.send as jest.Mock).mockRejectedValueOnce(
        new Error('Query failed')
      );

      const result = await queueManager.getOverdueEpisodes();

      expect(result).toEqual([]);
    });
  });
});