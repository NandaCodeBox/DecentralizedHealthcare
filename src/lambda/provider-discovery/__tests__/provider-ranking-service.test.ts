import { ProviderRankingService } from '../provider-ranking-service';
import { Provider, ProviderSearchCriteria } from '../../../types/provider';
import { ProviderType } from '../../../types/enums';

describe('ProviderRankingService', () => {
  let service: ProviderRankingService;

  beforeEach(() => {
    service = new ProviderRankingService();
  });

  const createMockProvider = (overrides: Partial<Provider> = {}): Provider => ({
    providerId: 'provider-1',
    type: ProviderType.HOSPITAL,
    name: 'Test Hospital',
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
      rating: 4.0,
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
    updatedAt: new Date().toISOString(),
    ...overrides
  });

  describe('rankProviders', () => {
    it('should rank providers by match score', async () => {
      const providers = [
        createMockProvider({
          providerId: 'provider-1',
          qualityMetrics: { rating: 3.0, patientReviews: 50, successRate: 85, averageWaitTime: 45 },
          capacity: { totalBeds: 100, availableBeds: 30, dailyPatientCapacity: 150, currentLoad: 70 }
        }),
        createMockProvider({
          providerId: 'provider-2',
          qualityMetrics: { rating: 5.0, patientReviews: 200, successRate: 98, averageWaitTime: 15 },
          capacity: { totalBeds: 200, availableBeds: 100, dailyPatientCapacity: 300, currentLoad: 30 }
        })
      ];

      const criteria: ProviderSearchCriteria = {};

      const result = await service.rankProviders(providers, criteria);

      expect(result).toHaveLength(2);
      expect(result[0].provider.providerId).toBe('provider-2'); // Higher rating, better availability
      expect(result[1].provider.providerId).toBe('provider-1');
      expect(result[0].matchScore).toBeGreaterThan(result[1].matchScore);
    });

    it('should calculate distance when location criteria is provided', async () => {
      const providers = [
        createMockProvider({
          location: {
            address: '123 Test St',
            state: 'Delhi',
            district: 'New Delhi',
            pincode: '110001',
            coordinates: { lat: 28.6139, lng: 77.2090 } // New Delhi
          }
        })
      ];

      const criteria: ProviderSearchCriteria = {
        location: {
          coordinates: { lat: 28.7041, lng: 77.1025 }, // Different location in Delhi
          maxDistance: 50
        }
      };

      const result = await service.rankProviders(providers, criteria);

      expect(result[0].distance).toBeDefined();
      expect(result[0].distance).toBeGreaterThan(0);
    });

    it('should sort by distance when match scores are equal', async () => {
      const providers = [
        createMockProvider({
          providerId: 'provider-far',
          location: {
            address: '456 Far St',
            state: 'Delhi',
            district: 'South Delhi',
            pincode: '110020',
            coordinates: { lat: 28.5355, lng: 77.3910 } // Farther location
          }
        }),
        createMockProvider({
          providerId: 'provider-near',
          location: {
            address: '789 Near St',
            state: 'Delhi',
            district: 'Central Delhi',
            pincode: '110001',
            coordinates: { lat: 28.6300, lng: 77.2200 } // Closer location
          }
        })
      ];

      const criteria: ProviderSearchCriteria = {
        location: {
          coordinates: { lat: 28.6139, lng: 77.2090 },
          maxDistance: 50
        }
      };

      const result = await service.rankProviders(providers, criteria);

      expect(result[0].provider.providerId).toBe('provider-near');
      expect(result[0].distance).toBeLessThan(result[1].distance!);
    });
  });

  describe('Match Score Calculation', () => {
    it('should give higher scores to providers with better ratings', async () => {
      const highRatedProvider = createMockProvider({
        qualityMetrics: { rating: 5.0, patientReviews: 200, successRate: 98, averageWaitTime: 15 }
      });

      const lowRatedProvider = createMockProvider({
        qualityMetrics: { rating: 2.0, patientReviews: 50, successRate: 80, averageWaitTime: 60 }
      });

      const criteria: ProviderSearchCriteria = {};

      const highRatedResult = await service.rankProviders([highRatedProvider], criteria);
      const lowRatedResult = await service.rankProviders([lowRatedProvider], criteria);

      expect(highRatedResult[0].matchScore).toBeGreaterThan(lowRatedResult[0].matchScore);
    });

    it('should give higher scores to providers with better availability', async () => {
      const availableProvider = createMockProvider({
        capacity: { totalBeds: 100, availableBeds: 80, dailyPatientCapacity: 200, currentLoad: 20 }
      });

      const busyProvider = createMockProvider({
        capacity: { totalBeds: 100, availableBeds: 5, dailyPatientCapacity: 200, currentLoad: 95 }
      });

      const criteria: ProviderSearchCriteria = {};

      const availableResult = await service.rankProviders([availableProvider], criteria);
      const busyResult = await service.rankProviders([busyProvider], criteria);

      expect(availableResult[0].matchScore).toBeGreaterThan(busyResult[0].matchScore);
    });

    it('should give higher scores for specialty matches', async () => {
      const specialistProvider = createMockProvider({
        capabilities: {
          specialties: ['cardiology', 'general'],
          services: ['consultation'],
          equipment: ['ecg'],
          languages: ['english']
        }
      });

      const generalProvider = createMockProvider({
        capabilities: {
          specialties: ['general'],
          services: ['consultation'],
          equipment: ['basic'],
          languages: ['english']
        }
      });

      const criteria: ProviderSearchCriteria = {
        specialties: ['cardiology']
      };

      const specialistResult = await service.rankProviders([specialistProvider], criteria);
      const generalResult = await service.rankProviders([generalProvider], criteria);

      expect(specialistResult[0].matchScore).toBeGreaterThan(generalResult[0].matchScore);
    });

    it('should give higher scores for lower costs', async () => {
      const cheapProvider = createMockProvider({
        costStructure: { consultationFee: 200, insuranceAccepted: ['public'], paymentMethods: ['cash'] }
      });

      const expensiveProvider = createMockProvider({
        costStructure: { consultationFee: 800, insuranceAccepted: ['public'], paymentMethods: ['cash'] }
      });

      const criteria: ProviderSearchCriteria = {
        maxCost: 1000
      };

      const cheapResult = await service.rankProviders([cheapProvider], criteria);
      const expensiveResult = await service.rankProviders([expensiveProvider], criteria);

      expect(cheapResult[0].matchScore).toBeGreaterThan(expensiveResult[0].matchScore);
    });

    it('should give higher scores for insurance compatibility', async () => {
      const insuranceCompatibleProvider = createMockProvider({
        costStructure: {
          consultationFee: 500,
          insuranceAccepted: ['public', 'private', 'corporate'],
          paymentMethods: ['cash', 'card', 'insurance']
        }
      });

      const limitedInsuranceProvider = createMockProvider({
        costStructure: {
          consultationFee: 500,
          insuranceAccepted: ['public'],
          paymentMethods: ['cash']
        }
      });

      const criteria: ProviderSearchCriteria = {
        acceptsInsurance: ['private', 'corporate']
      };

      const compatibleResult = await service.rankProviders([insuranceCompatibleProvider], criteria);
      const limitedResult = await service.rankProviders([limitedInsuranceProvider], criteria);

      expect(compatibleResult[0].matchScore).toBeGreaterThan(limitedResult[0].matchScore);
    });

    it('should give higher scores for language compatibility', async () => {
      const multilingualProvider = createMockProvider({
        capabilities: {
          specialties: ['general'],
          services: ['consultation'],
          equipment: ['basic'],
          languages: ['english', 'hindi', 'tamil']
        }
      });

      const englishOnlyProvider = createMockProvider({
        capabilities: {
          specialties: ['general'],
          services: ['consultation'],
          equipment: ['basic'],
          languages: ['english']
        }
      });

      const criteria: ProviderSearchCriteria = {
        languages: ['hindi', 'tamil']
      };

      const multilingualResult = await service.rankProviders([multilingualProvider], criteria);
      const englishOnlyResult = await service.rankProviders([englishOnlyProvider], criteria);

      expect(multilingualResult[0].matchScore).toBeGreaterThan(englishOnlyResult[0].matchScore);
    });
  });

  describe('Availability Status', () => {
    it('should determine availability status correctly', async () => {
      const availableProvider = createMockProvider({
        capacity: { totalBeds: 100, availableBeds: 60, dailyPatientCapacity: 200, currentLoad: 40 }
      });

      const busyProvider = createMockProvider({
        capacity: { totalBeds: 100, availableBeds: 20, dailyPatientCapacity: 200, currentLoad: 80 }
      });

      const unavailableProvider = createMockProvider({
        capacity: { totalBeds: 100, availableBeds: 0, dailyPatientCapacity: 200, currentLoad: 100 }
      });

      const inactiveProvider = createMockProvider({
        isActive: false,
        capacity: { totalBeds: 100, availableBeds: 50, dailyPatientCapacity: 200, currentLoad: 50 }
      });

      const criteria: ProviderSearchCriteria = {};

      const availableResult = await service.rankProviders([availableProvider], criteria);
      const busyResult = await service.rankProviders([busyProvider], criteria);
      const unavailableResult = await service.rankProviders([unavailableProvider], criteria);
      const inactiveResult = await service.rankProviders([inactiveProvider], criteria);

      expect(availableResult[0].availabilityStatus).toBe('available');
      expect(busyResult[0].availabilityStatus).toBe('busy');
      expect(unavailableResult[0].availabilityStatus).toBe('unavailable');
      expect(inactiveResult[0].availabilityStatus).toBe('unavailable');
    });
  });

  describe('Estimated Wait Time', () => {
    it('should calculate estimated wait time based on load', async () => {
      const lowLoadProvider = createMockProvider({
        capacity: { totalBeds: 100, availableBeds: 80, dailyPatientCapacity: 200, currentLoad: 20 },
        qualityMetrics: { rating: 4.0, patientReviews: 100, successRate: 95, averageWaitTime: 30 }
      });

      const highLoadProvider = createMockProvider({
        capacity: { totalBeds: 100, availableBeds: 10, dailyPatientCapacity: 200, currentLoad: 90 },
        qualityMetrics: { rating: 4.0, patientReviews: 100, successRate: 95, averageWaitTime: 30 }
      });

      const criteria: ProviderSearchCriteria = {};

      const lowLoadResult = await service.rankProviders([lowLoadProvider], criteria);
      const highLoadResult = await service.rankProviders([highLoadProvider], criteria);

      expect(lowLoadResult[0].estimatedWaitTime).toBeLessThan(highLoadResult[0].estimatedWaitTime!);
    });

    it('should return undefined wait time for unavailable providers', async () => {
      const unavailableProvider = createMockProvider({
        capacity: { totalBeds: 100, availableBeds: 0, dailyPatientCapacity: 200, currentLoad: 100 }
      });

      const criteria: ProviderSearchCriteria = {};

      const result = await service.rankProviders([unavailableProvider], criteria);

      expect(result[0].estimatedWaitTime).toBeUndefined();
    });
  });
});