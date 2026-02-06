// Unit tests for Emergency Alert Service
// Tests specific examples and edge cases

import { EmergencyAlertService } from '../emergency-alert-service';
import { Episode, UrgencyLevel, EpisodeStatus, InputMethod } from '../../../types';

// Mock AWS SDK clients
const mockDocClient = {
  send: jest.fn()
};

const mockSNSClient = {
  send: jest.fn()
};

describe('EmergencyAlertService', () => {
  let service: EmergencyAlertService;

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
    service = new EmergencyAlertService(
      mockDocClient as any,
      mockSNSClient as any,
      'test-episodes',
      'arn:aws:sns:us-east-1:123456789012:test-emergency-alerts'
    );
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

      const result = await service.processEmergencyAlert(
        'episode-123',
        'cardiac_emergency',
        'critical',
        { source: 'triage_engine' }
      );

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

      const result = await service.processEmergencyAlert(
        'episode-123',
        'emergency_case',
        'high'
      );

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

      const result = await service.processEmergencyAlert(
        'episode-123',
        'emergency_case',
        'medium'
      );

      expect(result.alertDetails.severity).toBe('medium');
      expect(result.alertDetails.assignedSupervisors).toHaveLength(1); // First supervisor for medium
      expect(result.estimatedResponseTime).toBe(10); // Medium response time
    });

    it('should throw error for non-existent episode', async () => {
      mockDocClient.send.mockResolvedValueOnce({
        Item: null
      });

      await expect(
        service.processEmergencyAlert('non-existent-episode', 'emergency_case', 'high')
      ).rejects.toThrow('Episode non-existent-episode not found');
    });

    it('should handle database errors gracefully', async () => {
      mockDocClient.send.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(
        service.processEmergencyAlert('episode-123', 'emergency_case', 'high')
      ).rejects.toThrow('Database connection failed');
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
          ...mockEpisode.triage!,
          urgencyLevel: UrgencyLevel.ROUTINE
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

      const result = await service.updateEmergencyResponse(
        'episode-123',
        'supervisor-1',
        'acknowledge',
        'Responding to emergency'
      );

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

      const result = await service.updateEmergencyResponse(
        'episode-123',
        'supervisor-1',
        'resolve',
        'Emergency resolved'
      );

      expect(result.responseDetails.responseAction).toBe('resolve');
    });

    it('should throw error for non-existent episode', async () => {
      mockDocClient.send.mockResolvedValueOnce({
        Item: null
      });

      await expect(
        service.updateEmergencyResponse('non-existent', 'supervisor-1', 'acknowledge')
      ).rejects.toThrow('Episode non-existent not found');
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

      await expect(
        service.processEmergencyAlert('episode-123', 'emergency_case', 'high')
      ).rejects.toThrow('Connection timeout');
    });

    it('should handle malformed episode data', async () => {
      const malformedEpisode = {
        episodeId: 'episode-123',
        // Missing required fields
      };

      mockDocClient.send.mockResolvedValueOnce({
        Item: malformedEpisode
      });

      await expect(
        service.processEmergencyAlert('episode-123', 'emergency_case', 'high')
      ).rejects.toThrow();
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