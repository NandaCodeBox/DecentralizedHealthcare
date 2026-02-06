import { ProviderDiscoveryService } from '../provider-discovery-service';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Provider, CreateProviderInput, ProviderSearchCriteria } from '../../../types/provider';
import { ProviderType } from '../../../types/enums';

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

const mockDynamoClient = {
  send: jest.fn()
};

jest.mocked(DynamoDBDocumentClient.from).mockReturnValue(mockDynamoClient as any);

describe('ProviderDiscoveryService', () => {
  let service: ProviderDiscoveryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProviderDiscoveryService();
    process.env.PROVIDER_TABLE_NAME = 'test-providers-table';
  });

  describe('registerProvider', () => {
    it('should register a new provider successfully', async () => {
      const input: CreateProviderInput = {
        type: ProviderType.HOSPITAL,
        name: 'Test Hospital',
        location: {
          
          state: 'Delhi',
          district: 'New Delhi',
          pincode: '110001',
          coordinates: { lat: 28.6139, lng: 77.2090 }
        },
        capabilities: {
          specialties: ['general', 'emergency'],
          services: ['consultation', 'surgery'],
          equipment: ['mri', 'ct-scan'],
          languages: ['english', 'hindi']
        },
        capacity: {
          totalBeds: 100,
          availableBeds: 50,
          dailyPatientCapacity: 200,
          currentLoad: 50
        },
        qualityMetrics: {
          rating: 4.5,
          patientReviews: 100,
          successRate: 95,
          averageWaitTime: 30
        },
        costStructure: {
          consultationFee: 500,
          insuranceAccepted: ['public', 'private'],
          paymentMethods: ['cash', 'card', 'insurance']
        },
        availability: {
          hours: { monday: '9-17', tuesday: '9-17' },
          emergencyAvailable: true,
          lastUpdated: new Date().toISOString()
        },
        credentials: {
          licenses: ['medical-license-123'],
          certifications: ['hospital-cert-456'],
          verified: true
        }
      };

      mockDynamoClient.send.mockResolvedValue({});

      const result = await service.registerProvider(input);

      expect(result).toMatchObject({
        ...input,
        isActive: true
      });
      expect(result.providerId).toBeDefined();
      expect(result.createdAt).toBeDefined();
      expect(result.updatedAt).toBeDefined();
      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-providers-table',
            Item: expect.objectContaining({
              providerId: expect.any(String),
              name: 'Test Hospital',
              type: ProviderType.HOSPITAL,
              isActive: true
            })
          })
        })
      );
    });

    it('should throw error for invalid provider data', async () => {
      const invalidInput = {
        type: 'invalid-type',
        name: ''
      } as any;

      await expect(service.registerProvider(invalidInput)).rejects.toThrow('Invalid provider data');
    });
  });

  describe('getProvider', () => {
    it('should return provider when found', async () => {
      const mockProvider: Provider = {
        providerId: 'provider-1',
        type: ProviderType.HOSPITAL,
        name: 'Test Hospital',
        location: {
          
          state: 'Delhi',
          district: 'New Delhi',
          pincode: '110001',
          coordinates: { lat: 28.6139, lng: 77.2090 }
        },
        capabilities: {
          specialties: ['general'],
          services: ['consultation'],
          equipment: ['basic'],
          languages: ['english']
        },
        capacity: {
          totalBeds: 100,
          availableBeds: 50,
          dailyPatientCapacity: 200,
          currentLoad: 50
        },
        qualityMetrics: {
          rating: 4.5,
          patientReviews: 100,
          successRate: 95,
          averageWaitTime: 30
        },
        costStructure: {
          consultationFee: 500,
          insuranceAccepted: ['public'],
          paymentMethods: ['cash']
        },
        availability: {
          hours: { monday: '9-17' },
          emergencyAvailable: true,
          lastUpdated: new Date().toISOString()
        },
        credentials: {
          licenses: ['license-123'],
          certifications: ['cert-456'],
          verified: true
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockDynamoClient.send.mockResolvedValue({ Item: mockProvider });

      const result = await service.getProvider('provider-1');

      expect(result).toEqual(mockProvider);
      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-providers-table',
            Key: { providerId: 'provider-1' }
          })
        })
      );
    });

    it('should return null when provider not found', async () => {
      mockDynamoClient.send.mockResolvedValue({ Item: undefined });

      const result = await service.getProvider('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('searchProviders', () => {
    it('should search providers by type', async () => {
      const mockProviders = [
        {
          providerId: 'provider-1',
          type: ProviderType.HOSPITAL,
          name: 'Hospital 1',
          isActive: true
        },
        {
          providerId: 'provider-2',
          type: ProviderType.HOSPITAL,
          name: 'Hospital 2',
          isActive: true
        }
      ];

      mockDynamoClient.send.mockResolvedValue({ Items: mockProviders });

      const criteria: ProviderSearchCriteria = {
        type: ProviderType.HOSPITAL
      };

      const result = await service.searchProviders(criteria);

      expect(result).toEqual(mockProviders);
      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-providers-table',
            IndexName: 'TypeAvailabilityIndex',
            KeyConditionExpression: '#type = :type AND #isActive = :isActive'
          })
        })
      );
    });

    it('should search providers by specialty', async () => {
      const mockProviders = [
        {
          providerId: 'provider-1',
          capabilities: { specialties: ['cardiology'] },
          isActive: true
        }
      ];

      mockDynamoClient.send.mockResolvedValue({ Items: mockProviders });

      const criteria: ProviderSearchCriteria = {
        specialties: ['cardiology']
      };

      const result = await service.searchProviders(criteria);

      expect(result).toEqual(mockProviders);
      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-providers-table',
            IndexName: 'SpecialtyIndex',
            KeyConditionExpression: '#primarySpecialty = :specialty'
          })
        })
      );
    });

    it('should filter providers by location distance', async () => {
      const mockProviders = [
        {
          providerId: 'provider-1',
          location: { coordinates: { lat: 28.6139, lng: 77.2090 } },
          isActive: true
        },
        {
          providerId: 'provider-2',
          location: { coordinates: { lat: 28.7041, lng: 77.1025 } }, // ~15km away
          isActive: true
        }
      ];

      mockDynamoClient.send.mockResolvedValue({ Items: mockProviders });

      const criteria: ProviderSearchCriteria = {
        location: {
          coordinates: { lat: 28.6139, lng: 77.2090 },
          maxDistance: 10 // 10km radius
        }
      };

      const result = await service.searchProviders(criteria);

      // Should only return the first provider (within 10km)
      expect(result).toHaveLength(1);
      expect(result[0].providerId).toBe('provider-1');
    });

    it('should apply additional filters correctly', async () => {
      const mockProviders = [
        {
          providerId: 'provider-1',
          capacity: { currentLoad: 50 },
          costStructure: { consultationFee: 300, insuranceAccepted: ['public'] },
          qualityMetrics: { rating: 4.5 },
          capabilities: { languages: ['english'] },
          isActive: true
        },
        {
          providerId: 'provider-2',
          capacity: { currentLoad: 95 }, // Too busy
          costStructure: { consultationFee: 300, insuranceAccepted: ['public'] },
          qualityMetrics: { rating: 4.5 },
          capabilities: { languages: ['english'] },
          isActive: true
        }
      ];

      mockDynamoClient.send.mockResolvedValue({ Items: mockProviders });

      const criteria: ProviderSearchCriteria = {
        availableNow: true,
        maxCost: 500,
        minRating: 4.0,
        acceptsInsurance: ['public'],
        languages: ['english']
      };

      const result = await service.searchProviders(criteria);

      // Should only return provider-1 (provider-2 is too busy)
      expect(result).toHaveLength(1);
      expect(result[0].providerId).toBe('provider-1');
    });
  });

  describe('updateProvider', () => {
    it('should update provider successfully', async () => {
      const existingProvider = {
        providerId: 'provider-1',
        name: 'Old Name',
        type: ProviderType.HOSPITAL
      };

      const updatedProvider = {
        ...existingProvider,
        name: 'New Name',
        updatedAt: expect.any(String)
      };

      // Mock getProvider call
      mockDynamoClient.send
        .mockResolvedValueOnce({ Item: existingProvider }) // getProvider
        .mockResolvedValueOnce({ Attributes: updatedProvider }); // updateProvider

      const result = await service.updateProvider('provider-1', { name: 'New Name' });

      expect(result).toMatchObject({ name: 'New Name' });
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(2);
    });

    it('should return null for non-existent provider', async () => {
      mockDynamoClient.send.mockResolvedValue({ Item: undefined });

      const result = await service.updateProvider('non-existent', { name: 'New Name' });

      expect(result).toBeNull();
    });
  });

  describe('listProviders', () => {
    it('should list providers with pagination', async () => {
      const mockProviders = [
        { providerId: 'provider-1', isActive: true },
        { providerId: 'provider-2', isActive: true }
      ];

      mockDynamoClient.send.mockResolvedValue({
        Items: mockProviders,
        LastEvaluatedKey: { providerId: 'provider-2' }
      });

      const result = await service.listProviders(10, 'provider-0');

      expect(result.providers).toEqual(mockProviders);
      expect(result.lastKey).toBe('provider-2');
      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-providers-table',
            Limit: 10,
            ExclusiveStartKey: { providerId: 'provider-0' }
          })
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle DynamoDB errors gracefully', async () => {
      mockDynamoClient.send.mockRejectedValue(new Error('DynamoDB error'));

      await expect(service.getProvider('provider-1')).rejects.toThrow('Failed to get provider');
    });

    it('should handle validation errors', async () => {
      const invalidInput = {} as CreateProviderInput;

      await expect(service.registerProvider(invalidInput)).rejects.toThrow('Invalid provider data');
    });
  });
});
