import { ProviderCapacityService } from '../provider-capacity-service';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { UpdateCapacityInput } from '../../../types/provider';

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

const mockDynamoClient = {
  send: jest.fn()
};

jest.mocked(DynamoDBDocumentClient.from).mockReturnValue(mockDynamoClient as any);

describe('ProviderCapacityService', () => {
  let service: ProviderCapacityService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProviderCapacityService();
    process.env.PROVIDER_TABLE_NAME = 'test-providers-table';
  });

  describe('updateCapacity', () => {
    it('should update provider capacity successfully', async () => {
      const input: UpdateCapacityInput = {
        providerId: 'provider-1',
        currentLoad: 75,
        availableBeds: 25
      };

      mockDynamoClient.send.mockResolvedValue({});

      await service.updateCapacity(input);

      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-providers-table',
            Key: { providerId: 'provider-1' },
            UpdateExpression: expect.stringContaining('#currentLoad = :currentLoad'),
            ExpressionAttributeNames: expect.objectContaining({
              '#currentLoad': 'currentLoad'
            }),
            ExpressionAttributeValues: expect.objectContaining({
              ':currentLoad': 75,
              ':availableBeds': 25
            }),
            ConditionExpression: 'attribute_exists(providerId)'
          })
        })
      );
    });

    it('should throw error for invalid capacity data', async () => {
      const invalidInput = {
        providerId: '',
        currentLoad: -10
      } as UpdateCapacityInput;

      await expect(service.updateCapacity(invalidInput)).rejects.toThrow('Invalid capacity update data');
    });

    it('should throw error when provider does not exist', async () => {
      const input: UpdateCapacityInput = {
        providerId: 'non-existent',
        currentLoad: 50
      };

      const error = new Error('ConditionalCheckFailedException');
      error.name = 'ConditionalCheckFailedException';
      mockDynamoClient.send.mockRejectedValue(error);

      await expect(service.updateCapacity(input)).rejects.toThrow('Provider not found');
    });
  });

  describe('checkCapacity', () => {
    it('should check capacity for multiple providers', async () => {
      const mockProviders = [
        {
          providerId: 'provider-1',
          capacity: {
            totalBeds: 100,
            availableBeds: 50,
            currentLoad: 50,
            dailyPatientCapacity: 200,
            lastUpdated: '2024-01-01T10:00:00Z'
          },
          updatedAt: '2024-01-01T10:00:00Z'
        },
        {
          providerId: 'provider-2',
          capacity: {
            totalBeds: 200,
            availableBeds: 20,
            currentLoad: 90,
            dailyPatientCapacity: 400,
            lastUpdated: '2024-01-01T11:00:00Z'
          },
          updatedAt: '2024-01-01T11:00:00Z'
        }
      ];

      mockDynamoClient.send.mockResolvedValue({
        Responses: {
          'test-providers-table': mockProviders
        }
      });

      const result = await service.checkCapacity(['provider-1', 'provider-2']);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        providerId: 'provider-1',
        totalBeds: 100,
        availableBeds: 50,
        currentLoad: 50,
        dailyPatientCapacity: 200,
        availabilityStatus: 'available',
        lastUpdated: '2024-01-01T10:00:00Z'
      });
      expect(result[1]).toEqual({
        providerId: 'provider-2',
        totalBeds: 200,
        availableBeds: 20,
        currentLoad: 90,
        dailyPatientCapacity: 400,
        availabilityStatus: 'unavailable',
        lastUpdated: '2024-01-01T11:00:00Z'
      });
    });

    it('should return empty array for empty provider list', async () => {
      const result = await service.checkCapacity([]);
      expect(result).toEqual([]);
    });

    it('should handle batch size limits correctly', async () => {
      // Create 150 provider IDs to test batch processing
      const providerIds = Array.from({ length: 150 }, (_, i) => `provider-${i}`);
      
      mockDynamoClient.send.mockResolvedValue({
        Responses: { 'test-providers-table': [] }
      });

      await service.checkCapacity(providerIds);

      // Should make 2 batch calls (100 + 50)
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(2);
    });
  });

  describe('getProviderCapacity', () => {
    it('should get capacity for a single provider', async () => {
      const mockProvider = {
        providerId: 'provider-1',
        capacity: {
          totalBeds: 100,
          availableBeds: 50,
          currentLoad: 50,
          dailyPatientCapacity: 200,
          lastUpdated: '2024-01-01T10:00:00Z'
        },
        updatedAt: '2024-01-01T10:00:00Z'
      };

      mockDynamoClient.send.mockResolvedValue({ Item: mockProvider });

      const result = await service.getProviderCapacity('provider-1');

      expect(result).toEqual({
        providerId: 'provider-1',
        totalBeds: 100,
        availableBeds: 50,
        currentLoad: 50,
        dailyPatientCapacity: 200,
        availabilityStatus: 'available',
        lastUpdated: '2024-01-01T10:00:00Z'
      });
    });

    it('should return null for non-existent provider', async () => {
      mockDynamoClient.send.mockResolvedValue({ Item: undefined });

      const result = await service.getProviderCapacity('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('batchUpdateCapacity', () => {
    it('should update capacity for multiple providers', async () => {
      const updates: UpdateCapacityInput[] = [
        { providerId: 'provider-1', currentLoad: 60 },
        { providerId: 'provider-2', currentLoad: 80 }
      ];

      mockDynamoClient.send.mockResolvedValue({});

      await service.batchUpdateCapacity(updates);

      expect(mockDynamoClient.send).toHaveBeenCalledTimes(2);
    });

    it('should handle batch processing with concurrency limit', async () => {
      // Create 25 updates to test concurrency limiting
      const updates: UpdateCapacityInput[] = Array.from({ length: 25 }, (_, i) => ({
        providerId: `provider-${i}`,
        currentLoad: 50
      }));

      mockDynamoClient.send.mockResolvedValue({});

      await service.batchUpdateCapacity(updates);

      expect(mockDynamoClient.send).toHaveBeenCalledTimes(25);
    });
  });

  describe('getProvidersWithLowCapacity', () => {
    it('should get providers with low capacity', async () => {
      const mockProviders = [
        {
          providerId: 'provider-1',
          capacity: {
            totalBeds: 100,
            availableBeds: 5,
            currentLoad: 95,
            dailyPatientCapacity: 200
          },
          updatedAt: '2024-01-01T10:00:00Z'
        }
      ];

      mockDynamoClient.send.mockResolvedValue({ Items: mockProviders });

      const result = await service.getProvidersWithLowCapacity(90);

      expect(result).toHaveLength(1);
      expect(result[0].currentLoad).toBe(95);
      expect(result[0].availabilityStatus).toBe('unavailable');
      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-providers-table',
            IndexName: 'CapacityIndex',
            FilterExpression: '#currentLoad >= :threshold',
            ExpressionAttributeValues: expect.objectContaining({
              ':threshold': 90
            })
          })
        })
      );
    });
  });

  describe('getCapacityStatistics', () => {
    it('should calculate capacity statistics correctly', async () => {
      const mockProviders = [
        {
          providerId: 'provider-1',
          capacity: { currentLoad: 30 } // available
        },
        {
          providerId: 'provider-2',
          capacity: { currentLoad: 80 } // busy
        },
        {
          providerId: 'provider-3',
          capacity: { currentLoad: 95 } // unavailable
        },
        {
          providerId: 'provider-4',
          capacity: { currentLoad: 50 } // available
        }
      ];

      mockDynamoClient.send.mockResolvedValue({ Items: mockProviders });

      const result = await service.getCapacityStatistics();

      expect(result).toEqual({
        totalProviders: 4,
        availableProviders: 2, // load < 70
        busyProviders: 1, // 70 <= load < 95
        unavailableProviders: 1, // load >= 95
        averageLoad: 64 // (30 + 80 + 95 + 50) / 4 = 63.75, rounded to 64
      });
    });

    it('should handle empty provider list', async () => {
      mockDynamoClient.send.mockResolvedValue({ Items: [] });

      const result = await service.getCapacityStatistics();

      expect(result).toEqual({
        totalProviders: 0,
        availableProviders: 0,
        busyProviders: 0,
        unavailableProviders: 0,
        averageLoad: 0
      });
    });
  });

  describe('Availability Status Determination', () => {
    it('should determine availability status correctly', async () => {
      const testCases = [
        { currentLoad: 30, expected: 'available' },
        { currentLoad: 69, expected: 'available' },
        { currentLoad: 70, expected: 'busy' },
        { currentLoad: 85, expected: 'busy' },
        { currentLoad: 94, expected: 'busy' },
        { currentLoad: 95, expected: 'unavailable' },
        { currentLoad: 100, expected: 'unavailable' }
      ];

      for (const testCase of testCases) {
        const mockProvider = {
          providerId: 'test-provider',
          capacity: {
            totalBeds: 100,
            availableBeds: 100 - testCase.currentLoad,
            currentLoad: testCase.currentLoad,
            dailyPatientCapacity: 200
          },
          updatedAt: '2024-01-01T10:00:00Z'
        };

        mockDynamoClient.send.mockResolvedValue({ Item: mockProvider });

        const result = await service.getProviderCapacity('test-provider');

        expect(result?.availabilityStatus).toBe(testCase.expected);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle DynamoDB errors gracefully', async () => {
      mockDynamoClient.send.mockRejectedValue(new Error('DynamoDB error'));

      await expect(service.getProviderCapacity('provider-1')).rejects.toThrow('Failed to get provider capacity');
    });

    it('should handle validation errors in updateCapacity', async () => {
      const invalidInput = {
        providerId: '',
        currentLoad: 150 // Invalid load > 100
      } as UpdateCapacityInput;

      await expect(service.updateCapacity(invalidInput)).rejects.toThrow('Invalid capacity update data');
    });
  });
});