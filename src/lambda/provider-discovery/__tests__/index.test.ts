import { APIGatewayProxyEvent } from 'aws-lambda';
import { TestHelpers } from '../../../utils/test-helpers';
import { handler } from '../index';
import { ProviderDiscoveryService } from '../provider-discovery-service';
import { ProviderRankingService } from '../provider-ranking-service';
import { ProviderCapacityService } from '../provider-capacity-service';

// Mock the services
jest.mock('../provider-discovery-service');
jest.mock('../provider-ranking-service');
jest.mock('../provider-capacity-service');

const mockProviderDiscoveryService = ProviderDiscoveryService as jest.MockedClass<typeof ProviderDiscoveryService>;
const mockProviderRankingService = ProviderRankingService as jest.MockedClass<typeof ProviderRankingService>;
const mockProviderCapacityService = ProviderCapacityService as jest.MockedClass<typeof ProviderCapacityService>;

describe('Provider Discovery Lambda Handler', () => {
  let mockEvent: Partial<APIGatewayProxyEvent>;
  let mockContext: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockEvent = {
      httpMethod: 'GET',
      path: '/providers',
      pathParameters: null,
      queryStringParameters: null,
      body: null,
      headers: {},
      requestContext: {} as any
    };

    mockContext = {
      awsRequestId: 'test-aws-request-id',
      functionName: 'test-function'
    };
  });

  describe('Provider Search', () => {
    it('should handle provider search with valid criteria', async () => {
      const mockProviders = [
        {
          providerId: 'provider-1',
          name: 'Test Hospital',
          type: 'hospital',
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
            hours: { monday: { open: '9:00', close: '17:00' } },
            emergencyAvailable: true,
            lastUpdated: new Date()
          },
          credentials: {
            licenses: ['license-123'],
            certifications: ['cert-456'],
            verified: true
          },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const mockRankedProviders = [
        {
          provider: mockProviders[0],
          matchScore: 85,
          availabilityStatus: 'available' as const,
          distance: 5.2
        }
      ];

      mockProviderDiscoveryService.prototype.searchProviders.mockResolvedValue(mockProviders as any);
      mockProviderRankingService.prototype.rankProviders.mockResolvedValue(mockRankedProviders);

      mockEvent.path = '/providers/search';
      mockEvent.queryStringParameters = {
        type: 'hospital',
        lat: '28.6139',
        lng: '77.2090',
        maxDistance: '10'
      };

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      expect(TestHelpers.getLegacyResponseBody(result).success).toBe(true);
      expect(TestHelpers.getLegacyResponseBody(result).data.providers).toHaveLength(1);
      expect(mockProviderDiscoveryService.prototype.searchProviders).toHaveBeenCalledWith({
        type: 'hospital',
        location: {
          coordinates: { lat: 28.6139, lng: 77.2090 },
          maxDistance: 10
        }
      });
    });

    it('should return validation error for invalid search criteria', async () => {
      mockEvent.path = '/providers/search';
      mockEvent.queryStringParameters = {
        lat: 'invalid-lat',
        lng: '77.2090'
      };

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      expect(TestHelpers.getLegacyResponseBody(result).success).toBe(false);
    });
  });

  describe('Provider Registration', () => {
    it('should handle provider registration with valid data', async () => {
      const mockProvider = {
        providerId: 'new-provider-id',
        name: 'New Hospital',
        type: 'hospital'
      };

      mockProviderDiscoveryService.prototype.registerProvider.mockResolvedValue(mockProvider as any);

      mockEvent.httpMethod = 'POST';
      mockEvent.path = '/providers/register';
      mockEvent.body = JSON.stringify({
        name: 'New Hospital',
        type: 'hospital',
        location: {
          address: '123 Test St',
          state: 'Delhi',
          district: 'New Delhi',
          pincode: '110001',
          coordinates: { lat: 28.6139, lng: 77.2090 }
        },
        capabilities: {
          specialties: ['general'],
          services: ['consultation'],
          equipment: ['basic'],
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
          insuranceAccepted: ['public'],
          paymentMethods: ['cash', 'card']
        },
        availability: {
          hours: { monday: '9-17' },
          emergencyAvailable: true,
          lastUpdated: new Date().toISOString()
        },
        credentials: {
          licenses: ['medical-license-123'],
          certifications: ['hospital-cert-456'],
          verified: true
        }
      });

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(201);
      expect(TestHelpers.getLegacyResponseBody(result).success).toBe(true);
      expect(mockProviderDiscoveryService.prototype.registerProvider).toHaveBeenCalled();
    });

    it('should return error for missing request body', async () => {
      mockEvent.httpMethod = 'POST';
      mockEvent.path = '/providers/register';
      mockEvent.body = null;

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(400);
      expect(TestHelpers.getLegacyResponseBody(result).success).toBe(false);
    });
  });

  describe('Capacity Management', () => {
    it('should handle capacity check for multiple providers', async () => {
      const mockCapacityInfo = [
        {
          providerId: 'provider-1',
          totalBeds: 100,
          availableBeds: 50,
          currentLoad: 50,
          dailyPatientCapacity: 200,
          availabilityStatus: 'available' as const,
          lastUpdated: new Date().toISOString()
        }
      ];

      mockProviderCapacityService.prototype.checkCapacity.mockResolvedValue(mockCapacityInfo);

      mockEvent.path = '/providers/capacity';
      mockEvent.queryStringParameters = {
        providerIds: 'provider-1,provider-2'
      };

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      expect(TestHelpers.getLegacyResponseBody(result).success).toBe(true);
      expect(mockProviderCapacityService.prototype.checkCapacity).toHaveBeenCalledWith(['provider-1', 'provider-2']);
    });

    it('should handle capacity update', async () => {
      mockProviderCapacityService.prototype.updateCapacity.mockResolvedValue();

      mockEvent.httpMethod = 'POST';
      mockEvent.path = '/providers/capacity/update';
      mockEvent.body = JSON.stringify({
        providerId: 'provider-1',
        currentLoad: 75,
        availableBeds: 25
      });

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      expect(TestHelpers.getLegacyResponseBody(result).success).toBe(true);
      expect(mockProviderCapacityService.prototype.updateCapacity).toHaveBeenCalledWith({
        providerId: 'provider-1',
        currentLoad: 75,
        availableBeds: 25
      });
    });
  });

  describe('Individual Provider Operations', () => {
    it('should get provider by ID', async () => {
      const mockProvider = {
        providerId: 'provider-1',
        name: 'Test Hospital',
        type: 'hospital'
      };

      mockProviderDiscoveryService.prototype.getProvider.mockResolvedValue(mockProvider as any);

      mockEvent.pathParameters = { providerId: 'provider-1' };

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      expect(TestHelpers.getLegacyResponseBody(result).success).toBe(true);
      expect(mockProviderDiscoveryService.prototype.getProvider).toHaveBeenCalledWith('provider-1');
    });

    it('should return 404 for non-existent provider', async () => {
      mockProviderDiscoveryService.prototype.getProvider.mockResolvedValue(null);

      mockEvent.pathParameters = { providerId: 'non-existent' };

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(404);
      expect(TestHelpers.getLegacyResponseBody(result).success).toBe(false);
    });

    it('should update provider', async () => {
      const mockUpdatedProvider = {
        providerId: 'provider-1',
        name: 'Updated Hospital',
        type: 'hospital'
      };

      mockProviderDiscoveryService.prototype.updateProvider.mockResolvedValue(mockUpdatedProvider as any);

      mockEvent.httpMethod = 'PUT';
      mockEvent.pathParameters = { providerId: 'provider-1' };
      mockEvent.body = JSON.stringify({
        name: 'Updated Hospital'
      });

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(200);
      expect(TestHelpers.getLegacyResponseBody(result).success).toBe(true);
      expect(mockProviderDiscoveryService.prototype.updateProvider).toHaveBeenCalledWith('provider-1', {
        name: 'Updated Hospital'
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockProviderDiscoveryService.prototype.searchProviders.mockRejectedValue(new Error('Database error'));

      mockEvent.path = '/providers/search';
      mockEvent.queryStringParameters = { type: 'hospital' };

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(500);
      expect(TestHelpers.getLegacyResponseBody(result).success).toBe(false);
    });

    it('should return 405 for unsupported methods', async () => {
      mockEvent.httpMethod = 'DELETE';

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(405);
      expect(TestHelpers.getLegacyResponseBody(result).success).toBe(false);
    });

    it('should return 404 for unknown endpoints', async () => {
      mockEvent.path = '/providers/unknown';

      const result = await handler(mockEvent as APIGatewayProxyEvent);

      expect(result.statusCode).toBe(404);
      expect(TestHelpers.getLegacyResponseBody(result).success).toBe(false);
    });
  });
});
