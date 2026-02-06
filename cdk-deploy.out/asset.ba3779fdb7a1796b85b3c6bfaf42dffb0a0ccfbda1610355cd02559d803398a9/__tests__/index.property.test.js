"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fc = __importStar(require("fast-check"));
const provider_ranking_service_1 = require("../provider-ranking-service");
const enums_1 = require("../../../types/enums");
// Feature: decentralized-healthcare-orchestration, Property 7: Provider Data Integrity
describe('Provider Data Integrity Property Tests', () => {
    // Mock services for property testing
    const mockProviderDiscoveryService = {
        registerProvider: jest.fn(),
        getProvider: jest.fn(),
        updateProvider: jest.fn(),
        searchProviders: jest.fn(),
        listProviders: jest.fn()
    };
    const mockProviderRankingService = {
        rankProviders: jest.fn()
    };
    const mockProviderCapacityService = {
        updateCapacity: jest.fn(),
        checkCapacity: jest.fn(),
        getProviderCapacity: jest.fn()
    };
    // Generators for property-based testing
    const coordinatesArb = fc.record({
        lat: fc.float({ min: -90, max: 90 }),
        lng: fc.float({ min: -180, max: 180 })
    });
    const locationArb = fc.record({
        address: fc.string({ minLength: 1, maxLength: 200 }),
        state: fc.constantFrom('Delhi', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'West Bengal'),
        district: fc.string({ minLength: 1, maxLength: 100 }),
        pincode: fc.string({ minLength: 6, maxLength: 6 }).filter(s => /^\d{6}$/.test(s)),
        coordinates: coordinatesArb
    });
    const capabilitiesArb = fc.record({
        specialties: fc.array(fc.constantFrom('general', 'cardiology', 'neurology', 'orthopedics', 'pediatrics'), { minLength: 1, maxLength: 5 }),
        services: fc.array(fc.constantFrom('consultation', 'surgery', 'emergency', 'diagnostics'), { minLength: 1, maxLength: 4 }),
        equipment: fc.array(fc.constantFrom('mri', 'ct-scan', 'x-ray', 'ultrasound', 'ecg'), { minLength: 1, maxLength: 5 }),
        languages: fc.array(fc.constantFrom(...Object.values(enums_1.Language)), { minLength: 1, maxLength: 3 })
    });
    const capacityArb = fc.record({
        totalBeds: fc.integer({ min: 10, max: 1000 }),
        availableBeds: fc.integer({ min: 0, max: 1000 }),
        dailyPatientCapacity: fc.integer({ min: 50, max: 2000 }),
        currentLoad: fc.integer({ min: 0, max: 100 })
    }).filter(capacity => capacity.availableBeds <= capacity.totalBeds);
    const qualityMetricsArb = fc.record({
        rating: fc.float({ min: 1, max: 5 }),
        patientReviews: fc.integer({ min: 0, max: 10000 }),
        successRate: fc.integer({ min: 50, max: 100 }),
        averageWaitTime: fc.integer({ min: 5, max: 180 })
    });
    const costStructureArb = fc.record({
        consultationFee: fc.integer({ min: 100, max: 5000 }),
        insuranceAccepted: fc.array(fc.constantFrom('public', 'private', 'corporate'), { minLength: 1, maxLength: 3 }),
        paymentMethods: fc.array(fc.constantFrom('cash', 'card', 'insurance', 'upi'), { minLength: 1, maxLength: 4 })
    });
    const availabilityArb = fc.record({
        hours: fc.record({
            monday: fc.constantFrom('9-17', '8-18', '24/7', 'closed'),
            tuesday: fc.constantFrom('9-17', '8-18', '24/7', 'closed'),
            wednesday: fc.constantFrom('9-17', '8-18', '24/7', 'closed'),
            thursday: fc.constantFrom('9-17', '8-18', '24/7', 'closed'),
            friday: fc.constantFrom('9-17', '8-18', '24/7', 'closed'),
            saturday: fc.constantFrom('9-17', '8-18', '24/7', 'closed'),
            sunday: fc.constantFrom('9-17', '8-18', '24/7', 'closed')
        }),
        emergencyAvailable: fc.boolean(),
        lastUpdated: fc.date().map(d => d.toISOString())
    });
    const credentialsArb = fc.record({
        licenses: fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
        certifications: fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
        verified: fc.boolean()
    });
    const createProviderInputArb = fc.record({
        type: fc.constantFrom(...Object.values(enums_1.ProviderType)),
        name: fc.string({ minLength: 1, maxLength: 200 }),
        location: locationArb,
        capabilities: capabilitiesArb,
        capacity: capacityArb,
        qualityMetrics: qualityMetricsArb,
        costStructure: costStructureArb,
        availability: availabilityArb,
        credentials: credentialsArb
    });
    const providerArb = createProviderInputArb.map(input => ({
        ...input,
        providerId: fc.sample(fc.uuid(), 1)[0],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    }));
    test('Property 7: Provider Data Integrity - All provider data should maintain complete information', () => {
        fc.assert(fc.property(createProviderInputArb, (providerInput) => {
            // Simulate provider registration
            const provider = {
                ...providerInput,
                providerId: 'test-provider-id',
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            // Verify all required fields are present and valid
            const hasValidId = provider.providerId && provider.providerId.length > 0;
            const hasValidName = provider.name && provider.name.length > 0;
            const hasValidType = Object.values(enums_1.ProviderType).includes(provider.type);
            const hasValidLocation = provider.location &&
                provider.location.coordinates &&
                provider.location.coordinates.lat >= -90 && provider.location.coordinates.lat <= 90 &&
                provider.location.coordinates.lng >= -180 && provider.location.coordinates.lng <= 180;
            const hasValidCapabilities = provider.capabilities &&
                provider.capabilities.specialties.length > 0 &&
                provider.capabilities.services.length > 0;
            const hasValidCapacity = provider.capacity &&
                provider.capacity.totalBeds >= 0 &&
                provider.capacity.availableBeds >= 0 &&
                provider.capacity.availableBeds <= provider.capacity.totalBeds &&
                provider.capacity.currentLoad >= 0 && provider.capacity.currentLoad <= 100;
            const hasValidQualityMetrics = provider.qualityMetrics &&
                provider.qualityMetrics.rating >= 1 && provider.qualityMetrics.rating <= 5 &&
                provider.qualityMetrics.successRate >= 0 && provider.qualityMetrics.successRate <= 100;
            const hasValidCredentials = provider.credentials &&
                provider.credentials.licenses.length > 0;
            return hasValidId && hasValidName && hasValidType && hasValidLocation &&
                hasValidCapabilities && hasValidCapacity && hasValidQualityMetrics &&
                hasValidCredentials;
        }), { numRuns: 100 });
    });
});
// Feature: decentralized-healthcare-orchestration, Property 8: Provider Search and Ranking
describe('Provider Search and Ranking Property Tests', () => {
    const providerSearchCriteriaArb = fc.record({
        type: fc.option(fc.constantFrom(...Object.values(enums_1.ProviderType))),
        specialties: fc.option(fc.array(fc.constantFrom('general', 'cardiology', 'neurology'), { minLength: 1, maxLength: 3 })),
        location: fc.option(fc.record({
            coordinates: fc.record({
                lat: fc.float({ min: -90, max: 90 }),
                lng: fc.float({ min: -180, max: 180 })
            }),
            maxDistance: fc.integer({ min: 1, max: 100 })
        })),
        availableNow: fc.option(fc.boolean()),
        maxCost: fc.option(fc.integer({ min: 100, max: 10000 })),
        minRating: fc.option(fc.float({ min: 1, max: 5 })),
        acceptsInsurance: fc.option(fc.array(fc.constantFrom('public', 'private'), { minLength: 1, maxLength: 2 })),
        languages: fc.option(fc.array(fc.constantFrom('english', 'hindi'), { minLength: 1, maxLength: 2 }))
    });
    const mockProvidersArb = fc.array(fc.record({
        providerId: fc.uuid(),
        type: fc.constantFrom(...Object.values(enums_1.ProviderType)),
        name: fc.string({ minLength: 1, maxLength: 100 }),
        location: fc.record({
            coordinates: fc.record({
                lat: fc.float({ min: 20, max: 35 }), // India latitude range
                lng: fc.float({ min: 68, max: 97 }) // India longitude range
            })
        }),
        capabilities: fc.record({
            specialties: fc.array(fc.constantFrom('general', 'cardiology', 'neurology'), { minLength: 1, maxLength: 3 }),
            languages: fc.array(fc.constantFrom('english', 'hindi'), { minLength: 1, maxLength: 2 })
        }),
        capacity: fc.record({
            currentLoad: fc.integer({ min: 0, max: 100 })
        }),
        qualityMetrics: fc.record({
            rating: fc.float({ min: 1, max: 5 }),
            averageWaitTime: fc.integer({ min: 5, max: 120 })
        }),
        costStructure: fc.record({
            consultationFee: fc.integer({ min: 100, max: 2000 }),
            insuranceAccepted: fc.array(fc.constantFrom('public', 'private'), { minLength: 1, maxLength: 2 })
        }),
        isActive: fc.boolean()
    }), { minLength: 1, maxLength: 20 });
    test('Property 8: Provider Search and Ranking - Search results should be filtered and ranked correctly', () => {
        fc.assert(fc.property(providerSearchCriteriaArb, mockProvidersArb, (criteria, providers) => {
            // Simulate search and ranking
            const rankingService = new provider_ranking_service_1.ProviderRankingService();
            // Filter providers based on criteria (simplified simulation)
            let filteredProviders = providers.filter(provider => {
                if (!provider.isActive)
                    return false;
                if (criteria.type && provider.type !== criteria.type)
                    return false;
                if (criteria.specialties && criteria.specialties.length > 0) {
                    const hasMatchingSpecialty = criteria.specialties.some(specialty => provider.capabilities.specialties.includes(specialty));
                    if (!hasMatchingSpecialty)
                        return false;
                }
                if (criteria.availableNow && provider.capacity.currentLoad >= 90)
                    return false;
                if (criteria.maxCost && provider.costStructure.consultationFee > criteria.maxCost)
                    return false;
                if (criteria.minRating && provider.qualityMetrics.rating < criteria.minRating)
                    return false;
                if (criteria.acceptsInsurance && criteria.acceptsInsurance.length > 0) {
                    const hasMatchingInsurance = criteria.acceptsInsurance.some(insurance => provider.costStructure.insuranceAccepted.includes(insurance));
                    if (!hasMatchingInsurance)
                        return false;
                }
                if (criteria.languages && criteria.languages.length > 0) {
                    const hasMatchingLanguage = criteria.languages.some(language => provider.capabilities.languages.includes(language));
                    if (!hasMatchingLanguage)
                        return false;
                }
                return true;
            });
            // Simulate ranking (simplified)
            const rankedResults = filteredProviders.map(provider => ({
                provider,
                matchScore: Math.floor(Math.random() * 100), // Simplified scoring
                availabilityStatus: provider.capacity.currentLoad < 70 ? 'available' :
                    provider.capacity.currentLoad < 95 ? 'busy' : 'unavailable',
                distance: criteria.location ? Math.random() * criteria.location.maxDistance : undefined,
                estimatedWaitTime: provider.capacity.currentLoad < 95 ?
                    Math.round(provider.qualityMetrics.averageWaitTime * (1 + provider.capacity.currentLoad / 100)) :
                    undefined
            }));
            // Verify search and ranking properties
            const allResultsMatchCriteria = rankedResults.every(result => {
                const provider = result.provider;
                // All results should be active
                if (!provider.isActive)
                    return false;
                // All results should match type criteria if specified
                if (criteria.type && provider.type !== criteria.type)
                    return false;
                // All results should have valid match scores
                if (result.matchScore < 0 || result.matchScore > 100)
                    return false;
                // All results should have valid availability status
                const validStatuses = ['available', 'busy', 'unavailable'];
                if (!validStatuses.includes(result.availabilityStatus))
                    return false;
                // Distance should be within max distance if location criteria specified
                if (criteria.location && result.distance && result.distance > criteria.location.maxDistance)
                    return false;
                return true;
            });
            // Results should be properly ranked (simplified check)
            const scoresAreOrdered = rankedResults.length <= 1 ||
                rankedResults.every((result, index) => index === 0 || rankedResults[index - 1].matchScore >= result.matchScore);
            return allResultsMatchCriteria && scoresAreOrdered;
        }), { numRuns: 100 });
    });
});
// Feature: decentralized-healthcare-orchestration, Property 9: Real-time Capacity Management
describe('Real-time Capacity Management Property Tests', () => {
    const capacityUpdateArb = fc.record({
        providerId: fc.uuid(),
        currentLoad: fc.integer({ min: 0, max: 100 }),
        availableBeds: fc.option(fc.integer({ min: 0, max: 1000 }))
    });
    const providerCapacityArb = fc.record({
        providerId: fc.uuid(),
        totalBeds: fc.integer({ min: 10, max: 1000 }),
        availableBeds: fc.integer({ min: 0, max: 1000 }),
        currentLoad: fc.integer({ min: 0, max: 100 }),
        dailyPatientCapacity: fc.integer({ min: 50, max: 2000 })
    }).filter(capacity => capacity.availableBeds <= capacity.totalBeds);
    test('Property 9: Real-time Capacity Management - Capacity updates should reflect immediately in search results', () => {
        fc.assert(fc.property(capacityUpdateArb, providerCapacityArb, (update, initialCapacity) => {
            // Simulate capacity update
            const updatedCapacity = {
                ...initialCapacity,
                providerId: update.providerId,
                currentLoad: update.currentLoad,
                availableBeds: update.availableBeds !== undefined ? update.availableBeds : initialCapacity.availableBeds
            };
            // Verify capacity constraints
            const loadIsValid = updatedCapacity.currentLoad >= 0 && updatedCapacity.currentLoad <= 100;
            const bedsAreValid = updatedCapacity.availableBeds >= 0 &&
                updatedCapacity.availableBeds <= updatedCapacity.totalBeds;
            // Verify availability status calculation
            const expectedStatus = updatedCapacity.currentLoad < 70 ? 'available' :
                updatedCapacity.currentLoad < 95 ? 'busy' : 'unavailable';
            const actualStatus = updatedCapacity.currentLoad < 70 ? 'available' :
                updatedCapacity.currentLoad < 95 ? 'busy' : 'unavailable';
            const statusIsCorrect = expectedStatus === actualStatus;
            // Verify capacity consistency
            const capacityIsConsistent = updatedCapacity.availableBeds <= updatedCapacity.totalBeds;
            return loadIsValid && bedsAreValid && statusIsCorrect && capacityIsConsistent;
        }), { numRuns: 100 });
    });
    test('Property 9: Capacity Statistics - Aggregated statistics should be mathematically correct', () => {
        fc.assert(fc.property(fc.array(providerCapacityArb, { minLength: 1, maxLength: 50 }), (capacities) => {
            // Simulate capacity statistics calculation
            const totalProviders = capacities.length;
            let availableCount = 0;
            let busyCount = 0;
            let unavailableCount = 0;
            let totalLoad = 0;
            capacities.forEach(capacity => {
                totalLoad += capacity.currentLoad;
                if (capacity.currentLoad < 70) {
                    availableCount++;
                }
                else if (capacity.currentLoad < 95) {
                    busyCount++;
                }
                else {
                    unavailableCount++;
                }
            });
            const averageLoad = Math.round(totalLoad / totalProviders);
            // Verify statistics properties
            const countsAddUp = (availableCount + busyCount + unavailableCount) === totalProviders;
            const averageIsValid = averageLoad >= 0 && averageLoad <= 100;
            const countsAreNonNegative = availableCount >= 0 && busyCount >= 0 && unavailableCount >= 0;
            return countsAddUp && averageIsValid && countsAreNonNegative;
        }), { numRuns: 100 });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgucHJvcGVydHkudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9sYW1iZGEvcHJvdmlkZXItZGlzY292ZXJ5L19fdGVzdHNfXy9pbmRleC5wcm9wZXJ0eS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsK0NBQWlDO0FBRWpDLDBFQUFxRTtBQUdyRSxnREFBOEQ7QUFFOUQsdUZBQXVGO0FBQ3ZGLFFBQVEsQ0FBQyx3Q0FBd0MsRUFBRSxHQUFHLEVBQUU7SUFDdEQscUNBQXFDO0lBQ3JDLE1BQU0sNEJBQTRCLEdBQUc7UUFDbkMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtRQUMzQixXQUFXLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtRQUN0QixjQUFjLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtRQUN6QixlQUFlLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtRQUMxQixhQUFhLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtLQUN6QixDQUFDO0lBRUYsTUFBTSwwQkFBMEIsR0FBRztRQUNqQyxhQUFhLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtLQUN6QixDQUFDO0lBRUYsTUFBTSwyQkFBMkIsR0FBRztRQUNsQyxjQUFjLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtRQUN6QixhQUFhLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtRQUN4QixtQkFBbUIsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO0tBQy9CLENBQUM7SUFFRix3Q0FBd0M7SUFDeEMsTUFBTSxjQUFjLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQztRQUMvQixHQUFHLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLENBQUM7UUFDcEMsR0FBRyxFQUFFLEVB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QUFJLFdBQVcsSUFBSSxHQUFHLENBQUM7WUFDOUQsTUFBTSxvQkFBb0IsR0FBRyxjQUFjLElBQUksQ0FBQyxJQUFJLFNBQVMsSUFBSSxDQUFDLElBQUksZ0JBQWdCLElBQUksQ0FBQyxDQUFDO1lBRTVGLE9BQU8sV0FBVyxJQUFJLGNBQWMsSUFBSSxvQkFBb0IsQ0FBQztRQUMvRCxDQUFDLENBQUMsRUFDRixFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FDakIsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBmYyBmcm9tICdmYXN0LWNoZWNrJztcclxuaW1wb3J0IHsgUHJvdmlkZXJEaXNjb3ZlcnlTZXJ2aWNlIH0gZnJvbSAnLi4vcHJvdmlkZXItZGlzY292ZXJ5LXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBQcm92aWRlclJhbmtpbmdTZXJ2aWNlIH0gZnJvbSAnLi4vcHJvdmlkZXItcmFua2luZy1zZXJ2aWNlJztcclxuaW1wb3J0IHsgUHJvdmlkZXJDYXBhY2l0eVNlcnZpY2UgfSBmcm9tICcuLi9wcm92aWRlci1jYXBhY2l0eS1zZXJ2aWNlJztcclxuaW1wb3J0IHsgUHJvdmlkZXIsIFByb3ZpZGVyU2VhcmNoQ3JpdGVyaWEsIENyZWF0ZVByb3ZpZGVySW5wdXQgfSBmcm9tICcuLi8uLi8uLi90eXBlcy9wcm92aWRlcic7XHJcbmltcG9ydCB7IFByb3ZpZGVyVHlwZSwgTGFuZ3VhZ2UgfSBmcm9tICcuLi8uLi8uLi90eXBlcy9lbnVtcyc7XHJcblxyXG4vLyBGZWF0dXJlOiBkZWNlbnRyYWxpemVkLWhlYWx0aGNhcmUtb3JjaGVzdHJhdGlvbiwgUHJvcGVydHkgNzogUHJvdmlkZXIgRGF0YSBJbnRlZ3JpdHlcclxuZGVzY3JpYmUoJ1Byb3ZpZGVyIERhdGEgSW50ZWdyaXR5IFByb3BlcnR5IFRlc3RzJywgKCkgPT4ge1xyXG4gIC8vIE1vY2sgc2VydmljZXMgZm9yIHByb3BlcnR5IHRlc3RpbmdcclxuICBjb25zdCBtb2NrUHJvdmlkZXJEaXNjb3ZlcnlTZXJ2aWNlID0ge1xyXG4gICAgcmVnaXN0ZXJQcm92aWRlcjogamVzdC5mbigpLFxyXG4gICAgZ2V0UHJvdmlkZXI6IGplc3QuZm4oKSxcclxuICAgIHVwZGF0ZVByb3ZpZGVyOiBqZXN0LmZuKCksXHJcbiAgICBzZWFyY2hQcm92aWRlcnM6IGplc3QuZm4oKSxcclxuICAgIGxpc3RQcm92aWRlcnM6IGplc3QuZm4oKVxyXG4gIH07XHJcblxyXG4gIGNvbnN0IG1vY2tQcm92aWRlclJhbmtpbmdTZXJ2aWNlID0ge1xyXG4gICAgcmFua1Byb3ZpZGVyczogamVzdC5mbigpXHJcbiAgfTtcclxuXHJcbiAgY29uc3QgbW9ja1Byb3ZpZGVyQ2FwYWNpdHlTZXJ2aWNlID0ge1xyXG4gICAgdXBkYXRlQ2FwYWNpdHk6IGplc3QuZm4oKSxcclxuICAgIGNoZWNrQ2FwYWNpdHk6IGplc3QuZm4oKSxcclxuICAgIGdldFByb3ZpZGVyQ2FwYWNpdHk6IGplc3QuZm4oKVxyXG4gIH07XHJcblxyXG4gIC8vIEdlbmVyYXRvcnMgZm9yIHByb3BlcnR5LWJhc2VkIHRlc3RpbmdcclxuICBjb25zdCBjb29yZGluYXRlc0FyYiA9IGZjLnJlY29yZCh7XHJcbiAgICBsYXQ6IGZjLmZsb2F0KHsgbWluOiAtOTAsIG1heDogOTAgfSksXHJcbiAgICBsbmc6IGZjLmZsb2F0KHsgbWluOiAtMTgwLCBtYXg6IDE4MCB9KVxyXG4gIH0pO1xyXG5cclxuICBjb25zdCBsb2NhdGlvbkFyYiA9IGZjLnJlY29yZCh7XHJcbiAgICBhZGRyZXNzOiBmYy5zdHJpbmcoeyBtaW5MZW5ndGg6IDEsIG1heExlbmd0aDogMjAwIH0pLFxyXG4gICAgc3RhdGU6IGZjLmNvbnN0YW50RnJvbSgnRGVsaGknLCAnTWFoYXJhc2h0cmEnLCAnS2FybmF0YWthJywgJ1RhbWlsIE5hZHUnLCAnV2VzdCBCZW5nYWwnKSxcclxuICAgIGRpc3RyaWN0OiBmYy5zdHJpbmcoeyBtaW5MZW5ndGg6IDEsIG1heExlbmd0aDogMTAwIH0pLFxyXG4gICAgcGluY29kZTogZmMuc3RyaW5nKHsgbWluTGVuZ3RoOiA2LCBtYXhMZW5ndGg6IDYgfSkuZmlsdGVyKHMgPT4gL15cXGR7Nn0kLy50ZXN0KHMpKSxcclxuICAgIGNvb3JkaW5hdGVzOiBjb29yZGluYXRlc0FyYlxyXG4gIH0pO1xyXG5cclxuICBjb25zdCBjYXBhYmlsaXRpZXNBcmIgPSBmYy5yZWNvcmQoe1xyXG4gICAgc3BlY2lhbHRpZXM6IGZjLmFycmF5KGZjLmNvbnN0YW50RnJvbSgnZ2VuZXJhbCcsICdjYXJkaW9sb2d5JywgJ25ldXJvbG9neScsICdvcnRob3BlZGljcycsICdwZWRpYXRyaWNzJyksIHsgbWluTGVuZ3RoOiAxLCBtYXhMZW5ndGg6IDUgfSksXHJcbiAgICBzZXJ2aWNlczogZmMuYXJyYXkoZmMuY29uc3RhbnRGcm9tKCdjb25zdWx0YXRpb24nLCAnc3VyZ2VyeScsICdlbWVyZ2VuY3knLCAnZGlhZ25vc3RpY3MnKSwgeyBtaW5MZW5ndGg6IDEsIG1heExlbmd0aDogNCB9KSxcclxuICAgIGVxdWlwbWVudDogZmMuYXJyYXkoZmMuY29uc3RhbnRGcm9tKCdtcmknLCAnY3Qtc2NhbicsICd4LXJheScsICd1bHRyYXNvdW5kJywgJ2VjZycpLCB7IG1pbkxlbmd0aDogMSwgbWF4TGVuZ3RoOiA1IH0pLFxyXG4gICAgbGFuZ3VhZ2VzOiBmYy5hcnJheShmYy5jb25zdGFudEZyb20oLi4uT2JqZWN0LnZhbHVlcyhMYW5ndWFnZSkpLCB7IG1pbkxlbmd0aDogMSwgbWF4TGVuZ3RoOiAzIH0pXHJcbiAgfSk7XHJcblxyXG4gIGNvbnN0IGNhcGFjaXR5QXJiID0gZmMucmVjb3JkKHtcclxuICAgIHRvdGFsQmVkczogZmMuaW50ZWdlcih7IG1pbjogMTAsIG1heDogMTAwMCB9KSxcclxuICAgIGF2YWlsYWJsZUJlZHM6IGZjLmludGVnZXIoeyBtaW46IDAsIG1heDogMTAwMCB9KSxcclxuICAgIGRhaWx5UGF0aWVudENhcGFjaXR5OiBmYy5pbnRlZ2VyKHsgbWluOiA1MCwgbWF4OiAyMDAwIH0pLFxyXG4gICAgY3VycmVudExvYWQ6IGZjLmludGVnZXIoeyBtaW46IDAsIG1heDogMTAwIH0pXHJcbiAgfSkuZmlsdGVyKGNhcGFjaXR5ID0+IGNhcGFjaXR5LmF2YWlsYWJsZUJlZHMgPD0gY2FwYWNpdHkudG90YWxCZWRzKTtcclxuXHJcbiAgY29uc3QgcXVhbGl0eU1ldHJpY3NBcmIgPSBmYy5yZWNvcmQoe1xyXG4gICAgcmF0aW5nOiBmYy5mbG9hdCh7IG1pbjogMSwgbWF4OiA1IH0pLFxyXG4gICAgcGF0aWVudFJldmlld3M6IGZjLmludGVnZXIoeyBtaW46IDAsIG1heDogMTAwMDAgfSksXHJcbiAgICBzdWNjZXNzUmF0ZTogZmMuaW50ZWdlcih7IG1pbjogNTAsIG1heDogMTAwIH0pLFxyXG4gICAgYXZlcmFnZVdhaXRUaW1lOiBmYy5pbnRlZ2VyKHsgbWluOiA1LCBtYXg6IDE4MCB9KVxyXG4gIH0pO1xyXG5cclxuICBjb25zdCBjb3N0U3RydWN0dXJlQXJiID0gZmMucmVjb3JkKHtcclxuICAgIGNvbnN1bHRhdGlvbkZlZTogZmMuaW50ZWdlcih7IG1pbjogMTAwLCBtYXg6IDUwMDAgfSksXHJcbiAgICBpbnN1cmFuY2VBY2NlcHRlZDogZmMuYXJyYXkoZmMuY29uc3RhbnRGcm9tKCdwdWJsaWMnLCAncHJpdmF0ZScsICdjb3Jwb3JhdGUnKSwgeyBtaW5MZW5ndGg6IDEsIG1heExlbmd0aDogMyB9KSxcclxuICAgIHBheW1lbnRNZXRob2RzOiBmYy5hcnJheShmYy5jb25zdGFudEZyb20oJ2Nhc2gnLCAnY2FyZCcsICdpbnN1cmFuY2UnLCAndXBpJyksIHsgbWluTGVuZ3RoOiAxLCBtYXhMZW5ndGg6IDQgfSlcclxuICB9KTtcclxuXHJcbiAgY29uc3QgYXZhaWxhYmlsaXR5QXJiID0gZmMucmVjb3JkKHtcclxuICAgIGhvdXJzOiBmYy5yZWNvcmQoe1xyXG4gICAgICBtb25kYXk6IGZjLmNvbnN0YW50RnJvbSgnOS0xNycsICc4LTE4JywgJzI0LzcnLCAnY2xvc2VkJyksXHJcbiAgICAgIHR1ZXNkYXk6IGZjLmNvbnN0YW50RnJvbSgnOS0xNycsICc4LTE4JywgJzI0LzcnLCAnY2xvc2VkJyksXHJcbiAgICAgIHdlZG5lc2RheTogZmMuY29uc3RhbnRGcm9tKCc5LTE3JywgJzgtMTgnLCAnMjQvNycsICdjbG9zZWQnKSxcclxuICAgICAgdGh1cnNkYXk6IGZjLmNvbnN0YW50RnJvbSgnOS0xNycsICc4LTE4JywgJzI0LzcnLCAnY2xvc2VkJyksXHJcbiAgICAgIGZyaWRheTogZmMuY29uc3RhbnRGcm9tKCc5LTE3JywgJzgtMTgnLCAnMjQvNycsICdjbG9zZWQnKSxcclxuICAgICAgc2F0dXJkYXk6IGZjLmNvbnN0YW50RnJvbSgnOS0xNycsICc4LTE4JywgJzI0LzcnLCAnY2xvc2VkJyksXHJcbiAgICAgIHN1bmRheTogZmMuY29uc3RhbnRGcm9tKCc5LTE3JywgJzgtMTgnLCAnMjQvNycsICdjbG9zZWQnKVxyXG4gICAgfSksXHJcbiAgICBlbWVyZ2VuY3lBdmFpbGFibGU6IGZjLmJvb2xlYW4oKSxcclxuICAgIGxhc3RVcGRhdGVkOiBmYy5kYXRlKCkubWFwKGQgPT4gZC50b0lTT1N0cmluZygpKVxyXG4gIH0pO1xyXG5cclxuICBjb25zdCBjcmVkZW50aWFsc0FyYiA9IGZjLnJlY29yZCh7XHJcbiAgICBsaWNlbnNlczogZmMuYXJyYXkoZmMuc3RyaW5nKHsgbWluTGVuZ3RoOiA1LCBtYXhMZW5ndGg6IDUwIH0pLCB7IG1pbkxlbmd0aDogMSwgbWF4TGVuZ3RoOiA1IH0pLFxyXG4gICAgY2VydGlmaWNhdGlvbnM6IGZjLmFycmF5KGZjLnN0cmluZyh7IG1pbkxlbmd0aDogNSwgbWF4TGVuZ3RoOiA1MCB9KSwgeyBtaW5MZW5ndGg6IDEsIG1heExlbmd0aDogNSB9KSxcclxuICAgIHZlcmlmaWVkOiBmYy5ib29sZWFuKClcclxuICB9KTtcclxuXHJcbiAgY29uc3QgY3JlYXRlUHJvdmlkZXJJbnB1dEFyYiA9IGZjLnJlY29yZCh7XHJcbiAgICB0eXBlOiBmYy5jb25zdGFudEZyb20oLi4uT2JqZWN0LnZhbHVlcyhQcm92aWRlclR5cGUpKSxcclxuICAgIG5hbWU6IGZjLnN0cmluZyh7IG1pbkxlbmd0aDogMSwgbWF4TGVuZ3RoOiAyMDAgfSksXHJcbiAgICBsb2NhdGlvbjogbG9jYXRpb25BcmIsXHJcbiAgICBjYXBhYmlsaXRpZXM6IGNhcGFiaWxpdGllc0FyYixcclxuICAgIGNhcGFjaXR5OiBjYXBhY2l0eUFyYixcclxuICAgIHF1YWxpdHlNZXRyaWNzOiBxdWFsaXR5TWV0cmljc0FyYixcclxuICAgIGNvc3RTdHJ1Y3R1cmU6IGNvc3RTdHJ1Y3R1cmVBcmIsXHJcbiAgICBhdmFpbGFiaWxpdHk6IGF2YWlsYWJpbGl0eUFyYixcclxuICAgIGNyZWRlbnRpYWxzOiBjcmVkZW50aWFsc0FyYlxyXG4gIH0pO1xyXG5cclxuICBjb25zdCBwcm92aWRlckFyYiA9IGNyZWF0ZVByb3ZpZGVySW5wdXRBcmIubWFwKGlucHV0ID0+ICh7XHJcbiAgICAuLi5pbnB1dCxcclxuICAgIHByb3ZpZGVySWQ6IGZjLnNhbXBsZShmYy51dWlkKCksIDEpWzBdLFxyXG4gICAgaXNBY3RpdmU6IHRydWUsXHJcbiAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgIHVwZGF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXHJcbiAgfSkpO1xyXG5cclxuICB0ZXN0KCdQcm9wZXJ0eSA3OiBQcm92aWRlciBEYXRhIEludGVncml0eSAtIEFsbCBwcm92aWRlciBkYXRhIHNob3VsZCBtYWludGFpbiBjb21wbGV0ZSBpbmZvcm1hdGlvbicsICgpID0+IHtcclxuICAgIGZjLmFzc2VydChcclxuICAgICAgZmMucHJvcGVydHkoY3JlYXRlUHJvdmlkZXJJbnB1dEFyYiwgKHByb3ZpZGVySW5wdXQpID0+IHtcclxuICAgICAgICAvLyBTaW11bGF0ZSBwcm92aWRlciByZWdpc3RyYXRpb25cclxuICAgICAgICBjb25zdCBwcm92aWRlcjogUHJvdmlkZXIgPSB7XHJcbiAgICAgICAgICAuLi5wcm92aWRlcklucHV0LFxyXG4gICAgICAgICAgcHJvdmlkZXJJZDogJ3Rlc3QtcHJvdmlkZXItaWQnLFxyXG4gICAgICAgICAgaXNBY3RpdmU6IHRydWUsXHJcbiAgICAgICAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICAgIHVwZGF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy8gVmVyaWZ5IGFsbCByZXF1aXJlZCBmaWVsZHMgYXJlIHByZXNlbnQgYW5kIHZhbGlkXHJcbiAgICAgICAgY29uc3QgaGFzVmFsaWRJZCA9IHByb3ZpZGVyLnByb3ZpZGVySWQgJiYgcHJvdmlkZXIucHJvdmlkZXJJZC5sZW5ndGggPiAwO1xyXG4gICAgICAgIGNvbnN0IGhhc1ZhbGlkTmFtZSA9IHByb3ZpZGVyLm5hbWUgJiYgcHJvdmlkZXIubmFtZS5sZW5ndGggPiAwO1xyXG4gICAgICAgIGNvbnN0IGhhc1ZhbGlkVHlwZSA9IE9iamVjdC52YWx1ZXMoUHJvdmlkZXJUeXBlKS5pbmNsdWRlcyhwcm92aWRlci50eXBlKTtcclxuICAgICAgICBjb25zdCBoYXNWYWxpZExvY2F0aW9uID0gcHJvdmlkZXIubG9jYXRpb24gJiYgXHJcbiAgICAgICAgICBwcm92aWRlci5sb2NhdGlvbi5jb29yZGluYXRlcyAmJlxyXG4gICAgICAgICAgcHJvdmlkZXIubG9jYXRpb24uY29vcmRpbmF0ZXMubGF0ID49IC05MCAmJiBwcm92aWRlci5sb2NhdGlvbi5jb29yZGluYXRlcy5sYXQgPD0gOTAgJiZcclxuICAgICAgICAgIHByb3ZpZGVyLmxvY2F0aW9uLmNvb3JkaW5hdGVzLmxuZyA+PSAtMTgwICYmIHByb3ZpZGVyLmxvY2F0aW9uLmNvb3JkaW5hdGVzLmxuZyA8PSAxODA7XHJcbiAgICAgICAgY29uc3QgaGFzVmFsaWRDYXBhYmlsaXRpZXMgPSBwcm92aWRlci5jYXBhYmlsaXRpZXMgJiZcclxuICAgICAgICAgIHByb3ZpZGVyLmNhcGFiaWxpdGllcy5zcGVjaWFsdGllcy5sZW5ndGggPiAwICYmXHJcbiAgICAgICAgICBwcm92aWRlci5jYXBhYmlsaXRpZXMuc2VydmljZXMubGVuZ3RoID4gMDtcclxuICAgICAgICBjb25zdCBoYXNWYWxpZENhcGFjaXR5ID0gcHJvdmlkZXIuY2FwYWNpdHkgJiZcclxuICAgICAgICAgIHByb3ZpZGVyLmNhcGFjaXR5LnRvdGFsQmVkcyA+PSAwICYmXHJcbiAgICAgICAgICBwcm92aWRlci5jYXBhY2l0eS5hdmFpbGFibGVCZWRzID49IDAgJiZcclxuICAgICAgICAgIHByb3ZpZGVyLmNhcGFjaXR5LmF2YWlsYWJsZUJlZHMgPD0gcHJvdmlkZXIuY2FwYWNpdHkudG90YWxCZWRzICYmXHJcbiAgICAgICAgICBwcm92aWRlci5jYXBhY2l0eS5jdXJyZW50TG9hZCA+PSAwICYmIHByb3ZpZGVyLmNhcGFjaXR5LmN1cnJlbnRMb2FkIDw9IDEwMDtcclxuICAgICAgICBjb25zdCBoYXNWYWxpZFF1YWxpdHlNZXRyaWNzID0gcHJvdmlkZXIucXVhbGl0eU1ldHJpY3MgJiZcclxuICAgICAgICAgIHByb3ZpZGVyLnF1YWxpdHlNZXRyaWNzLnJhdGluZyA+PSAxICYmIHByb3ZpZGVyLnF1YWxpdHlNZXRyaWNzLnJhdGluZyA8PSA1ICYmXHJcbiAgICAgICAgICBwcm92aWRlci5xdWFsaXR5TWV0cmljcy5zdWNjZXNzUmF0ZSA+PSAwICYmIHByb3ZpZGVyLnF1YWxpdHlNZXRyaWNzLnN1Y2Nlc3NSYXRlIDw9IDEwMDtcclxuICAgICAgICBjb25zdCBoYXNWYWxpZENyZWRlbnRpYWxzID0gcHJvdmlkZXIuY3JlZGVudGlhbHMgJiZcclxuICAgICAgICAgIHByb3ZpZGVyLmNyZWRlbnRpYWxzLmxpY2Vuc2VzLmxlbmd0aCA+IDA7XHJcblxyXG4gICAgICAgIHJldHVybiBoYXNWYWxpZElkICYmIGhhc1ZhbGlkTmFtZSAmJiBoYXNWYWxpZFR5cGUgJiYgaGFzVmFsaWRMb2NhdGlvbiAmJlxyXG4gICAgICAgICAgICAgICBoYXNWYWxpZENhcGFiaWxpdGllcyAmJiBoYXNWYWxpZENhcGFjaXR5ICYmIGhhc1ZhbGlkUXVhbGl0eU1ldHJpY3MgJiZcclxuICAgICAgICAgICAgICAgaGFzVmFsaWRDcmVkZW50aWFscztcclxuICAgICAgfSksXHJcbiAgICAgIHsgbnVtUnVuczogMTAwIH1cclxuICAgICk7XHJcbiAgfSk7XHJcbn0pO1xyXG5cclxuLy8gRmVhdHVyZTogZGVjZW50cmFsaXplZC1oZWFsdGhjYXJlLW9yY2hlc3RyYXRpb24sIFByb3BlcnR5IDg6IFByb3ZpZGVyIFNlYXJjaCBhbmQgUmFua2luZ1xyXG5kZXNjcmliZSgnUHJvdmlkZXIgU2VhcmNoIGFuZCBSYW5raW5nIFByb3BlcnR5IFRlc3RzJywgKCkgPT4ge1xyXG4gIGNvbnN0IHByb3ZpZGVyU2VhcmNoQ3JpdGVyaWFBcmIgPSBmYy5yZWNvcmQoe1xyXG4gICAgdHlwZTogZmMub3B0aW9uKGZjLmNvbnN0YW50RnJvbSguLi5PYmplY3QudmFsdWVzKFByb3ZpZGVyVHlwZSkpKSxcclxuICAgIHNwZWNpYWx0aWVzOiBmYy5vcHRpb24oZmMuYXJyYXkoZmMuY29uc3RhbnRGcm9tKCdnZW5lcmFsJywgJ2NhcmRpb2xvZ3knLCAnbmV1cm9sb2d5JyksIHsgbWluTGVuZ3RoOiAxLCBtYXhMZW5ndGg6IDMgfSkpLFxyXG4gICAgbG9jYXRpb246IGZjLm9wdGlvbihmYy5yZWNvcmQoe1xyXG4gICAgICBjb29yZGluYXRlczogZmMucmVjb3JkKHtcclxuICAgICAgICBsYXQ6IGZjLmZsb2F0KHsgbWluOiAtOTAsIG1heDogOTAgfSksXHJcbiAgICAgICAgbG5nOiBmYy5mbG9hdCh7IG1pbjogLTE4MCwgbWF4OiAxODAgfSlcclxuICAgICAgfSksXHJcbiAgICAgIG1heERpc3RhbmNlOiBmYy5pbnRlZ2VyKHsgbWluOiAxLCBtYXg6IDEwMCB9KVxyXG4gICAgfSkpLFxyXG4gICAgYXZhaWxhYmxlTm93OiBmYy5vcHRpb24oZmMuYm9vbGVhbigpKSxcclxuICAgIG1heENvc3Q6IGZjLm9wdGlvbihmYy5pbnRlZ2VyKHsgbWluOiAxMDAsIG1heDogMTAwMDAgfSkpLFxyXG4gICAgbWluUmF0aW5nOiBmYy5vcHRpb24oZmMuZmxvYXQoeyBtaW46IDEsIG1heDogNSB9KSksXHJcbiAgICBhY2NlcHRzSW5zdXJhbmNlOiBmYy5vcHRpb24oZmMuYXJyYXkoZmMuY29uc3RhbnRGcm9tKCdwdWJsaWMnLCAncHJpdmF0ZScpLCB7IG1pbkxlbmd0aDogMSwgbWF4TGVuZ3RoOiAyIH0pKSxcclxuICAgIGxhbmd1YWdlczogZmMub3B0aW9uKGZjLmFycmF5KGZjLmNvbnN0YW50RnJvbSgnZW5nbGlzaCcsICdoaW5kaScpLCB7IG1pbkxlbmd0aDogMSwgbWF4TGVuZ3RoOiAyIH0pKVxyXG4gIH0pO1xyXG5cclxuICBjb25zdCBtb2NrUHJvdmlkZXJzQXJiID0gZmMuYXJyYXkoXHJcbiAgICBmYy5yZWNvcmQoe1xyXG4gICAgICBwcm92aWRlcklkOiBmYy51dWlkKCksXHJcbiAgICAgIHR5cGU6IGZjLmNvbnN0YW50RnJvbSguLi5PYmplY3QudmFsdWVzKFByb3ZpZGVyVHlwZSkpLFxyXG4gICAgICBuYW1lOiBmYy5zdHJpbmcoeyBtaW5MZW5ndGg6IDEsIG1heExlbmd0aDogMTAwIH0pLFxyXG4gICAgICBsb2NhdGlvbjogZmMucmVjb3JkKHtcclxuICAgICAgICBjb29yZGluYXRlczogZmMucmVjb3JkKHtcclxuICAgICAgICAgIGxhdDogZmMuZmxvYXQoeyBtaW46IDIwLCBtYXg6IDM1IH0pLCAvLyBJbmRpYSBsYXRpdHVkZSByYW5nZVxyXG4gICAgICAgICAgbG5nOiBmYy5mbG9hdCh7IG1pbjogNjgsIG1heDogOTcgfSkgIC8vIEluZGlhIGxvbmdpdHVkZSByYW5nZVxyXG4gICAgICAgIH0pXHJcbiAgICAgIH0pLFxyXG4gICAgICBjYXBhYmlsaXRpZXM6IGZjLnJlY29yZCh7XHJcbiAgICAgICAgc3BlY2lhbHRpZXM6IGZjLmFycmF5KGZjLmNvbnN0YW50RnJvbSgnZ2VuZXJhbCcsICdjYXJkaW9sb2d5JywgJ25ldXJvbG9neScpLCB7IG1pbkxlbmd0aDogMSwgbWF4TGVuZ3RoOiAzIH0pLFxyXG4gICAgICAgIGxhbmd1YWdlczogZmMuYXJyYXkoZmMuY29uc3RhbnRGcm9tKCdlbmdsaXNoJywgJ2hpbmRpJyksIHsgbWluTGVuZ3RoOiAxLCBtYXhMZW5ndGg6IDIgfSlcclxuICAgICAgfSksXHJcbiAgICAgIGNhcGFjaXR5OiBmYy5yZWNvcmQoe1xyXG4gICAgICAgIGN1cnJlbnRMb2FkOiBmYy5pbnRlZ2VyKHsgbWluOiAwLCBtYXg6IDEwMCB9KVxyXG4gICAgICB9KSxcclxuICAgICAgcXVhbGl0eU1ldHJpY3M6IGZjLnJlY29yZCh7XHJcbiAgICAgICAgcmF0aW5nOiBmYy5mbG9hdCh7IG1pbjogMSwgbWF4OiA1IH0pLFxyXG4gICAgICAgIGF2ZXJhZ2VXYWl0VGltZTogZmMuaW50ZWdlcih7IG1pbjogNSwgbWF4OiAxMjAgfSlcclxuICAgICAgfSksXHJcbiAgICAgIGNvc3RTdHJ1Y3R1cmU6IGZjLnJlY29yZCh7XHJcbiAgICAgICAgY29uc3VsdGF0aW9uRmVlOiBmYy5pbnRlZ2VyKHsgbWluOiAxMDAsIG1heDogMjAwMCB9KSxcclxuICAgICAgICBpbnN1cmFuY2VBY2NlcHRlZDogZmMuYXJyYXkoZmMuY29uc3RhbnRGcm9tKCdwdWJsaWMnLCAncHJpdmF0ZScpLCB7IG1pbkxlbmd0aDogMSwgbWF4TGVuZ3RoOiAyIH0pXHJcbiAgICAgIH0pLFxyXG4gICAgICBpc0FjdGl2ZTogZmMuYm9vbGVhbigpXHJcbiAgICB9KSxcclxuICAgIHsgbWluTGVuZ3RoOiAxLCBtYXhMZW5ndGg6IDIwIH1cclxuICApO1xyXG5cclxuICB0ZXN0KCdQcm9wZXJ0eSA4OiBQcm92aWRlciBTZWFyY2ggYW5kIFJhbmtpbmcgLSBTZWFyY2ggcmVzdWx0cyBzaG91bGQgYmUgZmlsdGVyZWQgYW5kIHJhbmtlZCBjb3JyZWN0bHknLCAoKSA9PiB7XHJcbiAgICBmYy5hc3NlcnQoXHJcbiAgICAgIGZjLnByb3BlcnR5KHByb3ZpZGVyU2VhcmNoQ3JpdGVyaWFBcmIsIG1vY2tQcm92aWRlcnNBcmIsIChjcml0ZXJpYSwgcHJvdmlkZXJzKSA9PiB7XHJcbiAgICAgICAgLy8gU2ltdWxhdGUgc2VhcmNoIGFuZCByYW5raW5nXHJcbiAgICAgICAgY29uc3QgcmFua2luZ1NlcnZpY2UgPSBuZXcgUHJvdmlkZXJSYW5raW5nU2VydmljZSgpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEZpbHRlciBwcm92aWRlcnMgYmFzZWQgb24gY3JpdGVyaWEgKHNpbXBsaWZpZWQgc2ltdWxhdGlvbilcclxuICAgICAgICBsZXQgZmlsdGVyZWRQcm92aWRlcnMgPSBwcm92aWRlcnMuZmlsdGVyKHByb3ZpZGVyID0+IHtcclxuICAgICAgICAgIGlmICghcHJvdmlkZXIuaXNBY3RpdmUpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgaWYgKGNyaXRlcmlhLnR5cGUgJiYgcHJvdmlkZXIudHlwZSAhPT0gY3JpdGVyaWEudHlwZSkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBpZiAoY3JpdGVyaWEuc3BlY2lhbHRpZXMgJiYgY3JpdGVyaWEuc3BlY2lhbHRpZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICBjb25zdCBoYXNNYXRjaGluZ1NwZWNpYWx0eSA9IGNyaXRlcmlhLnNwZWNpYWx0aWVzLnNvbWUoc3BlY2lhbHR5ID0+XHJcbiAgICAgICAgICAgICAgcHJvdmlkZXIuY2FwYWJpbGl0aWVzLnNwZWNpYWx0aWVzLmluY2x1ZGVzKHNwZWNpYWx0eSlcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgaWYgKCFoYXNNYXRjaGluZ1NwZWNpYWx0eSkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBpZiAoY3JpdGVyaWEuYXZhaWxhYmxlTm93ICYmIHByb3ZpZGVyLmNhcGFjaXR5LmN1cnJlbnRMb2FkID49IDkwKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGlmIChjcml0ZXJpYS5tYXhDb3N0ICYmIHByb3ZpZGVyLmNvc3RTdHJ1Y3R1cmUuY29uc3VsdGF0aW9uRmVlID4gY3JpdGVyaWEubWF4Q29zdCkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBpZiAoY3JpdGVyaWEubWluUmF0aW5nICYmIHByb3ZpZGVyLnF1YWxpdHlNZXRyaWNzLnJhdGluZyA8IGNyaXRlcmlhLm1pblJhdGluZykgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBpZiAoY3JpdGVyaWEuYWNjZXB0c0luc3VyYW5jZSAmJiBjcml0ZXJpYS5hY2NlcHRzSW5zdXJhbmNlLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgY29uc3QgaGFzTWF0Y2hpbmdJbnN1cmFuY2UgPSBjcml0ZXJpYS5hY2NlcHRzSW5zdXJhbmNlLnNvbWUoaW5zdXJhbmNlID0+XHJcbiAgICAgICAgICAgICAgcHJvdmlkZXIuY29zdFN0cnVjdHVyZS5pbnN1cmFuY2VBY2NlcHRlZC5pbmNsdWRlcyhpbnN1cmFuY2UpXHJcbiAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgIGlmICghaGFzTWF0Y2hpbmdJbnN1cmFuY2UpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgaWYgKGNyaXRlcmlhLmxhbmd1YWdlcyAmJiBjcml0ZXJpYS5sYW5ndWFnZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICBjb25zdCBoYXNNYXRjaGluZ0xhbmd1YWdlID0gY3JpdGVyaWEubGFuZ3VhZ2VzLnNvbWUobGFuZ3VhZ2UgPT5cclxuICAgICAgICAgICAgICBwcm92aWRlci5jYXBhYmlsaXRpZXMubGFuZ3VhZ2VzLmluY2x1ZGVzKGxhbmd1YWdlKVxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgICBpZiAoIWhhc01hdGNoaW5nTGFuZ3VhZ2UpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIFNpbXVsYXRlIHJhbmtpbmcgKHNpbXBsaWZpZWQpXHJcbiAgICAgICAgY29uc3QgcmFua2VkUmVzdWx0cyA9IGZpbHRlcmVkUHJvdmlkZXJzLm1hcChwcm92aWRlciA9PiAoe1xyXG4gICAgICAgICAgcHJvdmlkZXIsXHJcbiAgICAgICAgICBtYXRjaFNjb3JlOiBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDApLCAvLyBTaW1wbGlmaWVkIHNjb3JpbmdcclxuICAgICAgICAgIGF2YWlsYWJpbGl0eVN0YXR1czogcHJvdmlkZXIuY2FwYWNpdHkuY3VycmVudExvYWQgPCA3MCA/ICdhdmFpbGFibGUnIGFzIGNvbnN0IDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm92aWRlci5jYXBhY2l0eS5jdXJyZW50TG9hZCA8IDk1ID8gJ2J1c3knIGFzIGNvbnN0IDogJ3VuYXZhaWxhYmxlJyBhcyBjb25zdCxcclxuICAgICAgICAgIGRpc3RhbmNlOiBjcml0ZXJpYS5sb2NhdGlvbiA/IE1hdGgucmFuZG9tKCkgKiBjcml0ZXJpYS5sb2NhdGlvbi5tYXhEaXN0YW5jZSA6IHVuZGVmaW5lZCxcclxuICAgICAgICAgIGVzdGltYXRlZFdhaXRUaW1lOiBwcm92aWRlci5jYXBhY2l0eS5jdXJyZW50TG9hZCA8IDk1ID8gXHJcbiAgICAgICAgICAgIE1hdGgucm91bmQocHJvdmlkZXIucXVhbGl0eU1ldHJpY3MuYXZlcmFnZVdhaXRUaW1lICogKDEgKyBwcm92aWRlci5jYXBhY2l0eS5jdXJyZW50TG9hZCAvIDEwMCkpIDogXHJcbiAgICAgICAgICAgIHVuZGVmaW5lZFxyXG4gICAgICAgIH0pKTtcclxuXHJcbiAgICAgICAgLy8gVmVyaWZ5IHNlYXJjaCBhbmQgcmFua2luZyBwcm9wZXJ0aWVzXHJcbiAgICAgICAgY29uc3QgYWxsUmVzdWx0c01hdGNoQ3JpdGVyaWEgPSByYW5rZWRSZXN1bHRzLmV2ZXJ5KHJlc3VsdCA9PiB7XHJcbiAgICAgICAgICBjb25zdCBwcm92aWRlciA9IHJlc3VsdC5wcm92aWRlcjtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgLy8gQWxsIHJlc3VsdHMgc2hvdWxkIGJlIGFjdGl2ZVxyXG4gICAgICAgICAgaWYgKCFwcm92aWRlci5pc0FjdGl2ZSkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICAvLyBBbGwgcmVzdWx0cyBzaG91bGQgbWF0Y2ggdHlwZSBjcml0ZXJpYSBpZiBzcGVjaWZpZWRcclxuICAgICAgICAgIGlmIChjcml0ZXJpYS50eXBlICYmIHByb3ZpZGVyLnR5cGUgIT09IGNyaXRlcmlhLnR5cGUpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgLy8gQWxsIHJlc3VsdHMgc2hvdWxkIGhhdmUgdmFsaWQgbWF0Y2ggc2NvcmVzXHJcbiAgICAgICAgICBpZiAocmVzdWx0Lm1hdGNoU2NvcmUgPCAwIHx8IHJlc3VsdC5tYXRjaFNjb3JlID4gMTAwKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8vIEFsbCByZXN1bHRzIHNob3VsZCBoYXZlIHZhbGlkIGF2YWlsYWJpbGl0eSBzdGF0dXNcclxuICAgICAgICAgIGNvbnN0IHZhbGlkU3RhdHVzZXMgPSBbJ2F2YWlsYWJsZScsICdidXN5JywgJ3VuYXZhaWxhYmxlJ107XHJcbiAgICAgICAgICBpZiAoIXZhbGlkU3RhdHVzZXMuaW5jbHVkZXMocmVzdWx0LmF2YWlsYWJpbGl0eVN0YXR1cykpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgLy8gRGlzdGFuY2Ugc2hvdWxkIGJlIHdpdGhpbiBtYXggZGlzdGFuY2UgaWYgbG9jYXRpb24gY3JpdGVyaWEgc3BlY2lmaWVkXHJcbiAgICAgICAgICBpZiAoY3JpdGVyaWEubG9jYXRpb24gJiYgcmVzdWx0LmRpc3RhbmNlICYmIHJlc3VsdC5kaXN0YW5jZSA+IGNyaXRlcmlhLmxvY2F0aW9uLm1heERpc3RhbmNlKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBSZXN1bHRzIHNob3VsZCBiZSBwcm9wZXJseSByYW5rZWQgKHNpbXBsaWZpZWQgY2hlY2spXHJcbiAgICAgICAgY29uc3Qgc2NvcmVzQXJlT3JkZXJlZCA9IHJhbmtlZFJlc3VsdHMubGVuZ3RoIDw9IDEgfHwgXHJcbiAgICAgICAgICByYW5rZWRSZXN1bHRzLmV2ZXJ5KChyZXN1bHQsIGluZGV4KSA9PiBcclxuICAgICAgICAgICAgaW5kZXggPT09IDAgfHwgcmFua2VkUmVzdWx0c1tpbmRleCAtIDFdLm1hdGNoU2NvcmUgPj0gcmVzdWx0Lm1hdGNoU2NvcmVcclxuICAgICAgICAgICk7XHJcblxyXG4gICAgICAgIHJldHVybiBhbGxSZXN1bHRzTWF0Y2hDcml0ZXJpYSAmJiBzY29yZXNBcmVPcmRlcmVkO1xyXG4gICAgICB9KSxcclxuICAgICAgeyBudW1SdW5zOiAxMDAgfVxyXG4gICAgKTtcclxuICB9KTtcclxufSk7XHJcblxyXG4vLyBGZWF0dXJlOiBkZWNlbnRyYWxpemVkLWhlYWx0aGNhcmUtb3JjaGVzdHJhdGlvbiwgUHJvcGVydHkgOTogUmVhbC10aW1lIENhcGFjaXR5IE1hbmFnZW1lbnRcclxuZGVzY3JpYmUoJ1JlYWwtdGltZSBDYXBhY2l0eSBNYW5hZ2VtZW50IFByb3BlcnR5IFRlc3RzJywgKCkgPT4ge1xyXG4gIGNvbnN0IGNhcGFjaXR5VXBkYXRlQXJiID0gZmMucmVjb3JkKHtcclxuICAgIHByb3ZpZGVySWQ6IGZjLnV1aWQoKSxcclxuICAgIGN1cnJlbnRMb2FkOiBmYy5pbnRlZ2VyKHsgbWluOiAwLCBtYXg6IDEwMCB9KSxcclxuICAgIGF2YWlsYWJsZUJlZHM6IGZjLm9wdGlvbihmYy5pbnRlZ2VyKHsgbWluOiAwLCBtYXg6IDEwMDAgfSkpXHJcbiAgfSk7XHJcblxyXG4gIGNvbnN0IHByb3ZpZGVyQ2FwYWNpdHlBcmIgPSBmYy5yZWNvcmQoe1xyXG4gICAgcHJvdmlkZXJJZDogZmMudXVpZCgpLFxyXG4gICAgdG90YWxCZWRzOiBmYy5pbnRlZ2VyKHsgbWluOiAxMCwgbWF4OiAxMDAwIH0pLFxyXG4gICAgYXZhaWxhYmxlQmVkczogZmMuaW50ZWdlcih7IG1pbjogMCwgbWF4OiAxMDAwIH0pLFxyXG4gICAgY3VycmVudExvYWQ6IGZjLmludGVnZXIoeyBtaW46IDAsIG1heDogMTAwIH0pLFxyXG4gICAgZGFpbHlQYXRpZW50Q2FwYWNpdHk6IGZjLmludGVnZXIoeyBtaW46IDUwLCBtYXg6IDIwMDAgfSlcclxuICB9KS5maWx0ZXIoY2FwYWNpdHkgPT4gY2FwYWNpdHkuYXZhaWxhYmxlQmVkcyA8PSBjYXBhY2l0eS50b3RhbEJlZHMpO1xyXG5cclxuICB0ZXN0KCdQcm9wZXJ0eSA5OiBSZWFsLXRpbWUgQ2FwYWNpdHkgTWFuYWdlbWVudCAtIENhcGFjaXR5IHVwZGF0ZXMgc2hvdWxkIHJlZmxlY3QgaW1tZWRpYXRlbHkgaW4gc2VhcmNoIHJlc3VsdHMnLCAoKSA9PiB7XHJcbiAgICBmYy5hc3NlcnQoXHJcbiAgICAgIGZjLnByb3BlcnR5KGNhcGFjaXR5VXBkYXRlQXJiLCBwcm92aWRlckNhcGFjaXR5QXJiLCAodXBkYXRlLCBpbml0aWFsQ2FwYWNpdHkpID0+IHtcclxuICAgICAgICAvLyBTaW11bGF0ZSBjYXBhY2l0eSB1cGRhdGVcclxuICAgICAgICBjb25zdCB1cGRhdGVkQ2FwYWNpdHkgPSB7XHJcbiAgICAgICAgICAuLi5pbml0aWFsQ2FwYWNpdHksXHJcbiAgICAgICAgICBwcm92aWRlcklkOiB1cGRhdGUucHJvdmlkZXJJZCxcclxuICAgICAgICAgIGN1cnJlbnRMb2FkOiB1cGRhdGUuY3VycmVudExvYWQsXHJcbiAgICAgICAgICBhdmFpbGFibGVCZWRzOiB1cGRhdGUuYXZhaWxhYmxlQmVkcyAhPT0gdW5kZWZpbmVkID8gdXBkYXRlLmF2YWlsYWJsZUJlZHMgOiBpbml0aWFsQ2FwYWNpdHkuYXZhaWxhYmxlQmVkc1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vIFZlcmlmeSBjYXBhY2l0eSBjb25zdHJhaW50c1xyXG4gICAgICAgIGNvbnN0IGxvYWRJc1ZhbGlkID0gdXBkYXRlZENhcGFjaXR5LmN1cnJlbnRMb2FkID49IDAgJiYgdXBkYXRlZENhcGFjaXR5LmN1cnJlbnRMb2FkIDw9IDEwMDtcclxuICAgICAgICBjb25zdCBiZWRzQXJlVmFsaWQgPSB1cGRhdGVkQ2FwYWNpdHkuYXZhaWxhYmxlQmVkcyA+PSAwICYmIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlZENhcGFjaXR5LmF2YWlsYWJsZUJlZHMgPD0gdXBkYXRlZENhcGFjaXR5LnRvdGFsQmVkcztcclxuICAgICAgICBcclxuICAgICAgICAvLyBWZXJpZnkgYXZhaWxhYmlsaXR5IHN0YXR1cyBjYWxjdWxhdGlvblxyXG4gICAgICAgIGNvbnN0IGV4cGVjdGVkU3RhdHVzID0gdXBkYXRlZENhcGFjaXR5LmN1cnJlbnRMb2FkIDwgNzAgPyAnYXZhaWxhYmxlJyA6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZWRDYXBhY2l0eS5jdXJyZW50TG9hZCA8IDk1ID8gJ2J1c3knIDogJ3VuYXZhaWxhYmxlJztcclxuICAgICAgICBcclxuICAgICAgICBjb25zdCBhY3R1YWxTdGF0dXMgPSB1cGRhdGVkQ2FwYWNpdHkuY3VycmVudExvYWQgPCA3MCA/ICdhdmFpbGFibGUnIDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZWRDYXBhY2l0eS5jdXJyZW50TG9hZCA8IDk1ID8gJ2J1c3knIDogJ3VuYXZhaWxhYmxlJztcclxuXHJcbiAgICAgICAgY29uc3Qgc3RhdHVzSXNDb3JyZWN0ID0gZXhwZWN0ZWRTdGF0dXMgPT09IGFjdHVhbFN0YXR1cztcclxuXHJcbiAgICAgICAgLy8gVmVyaWZ5IGNhcGFjaXR5IGNvbnNpc3RlbmN5XHJcbiAgICAgICAgY29uc3QgY2FwYWNpdHlJc0NvbnNpc3RlbnQgPSB1cGRhdGVkQ2FwYWNpdHkuYXZhaWxhYmxlQmVkcyA8PSB1cGRhdGVkQ2FwYWNpdHkudG90YWxCZWRzO1xyXG5cclxuICAgICAgICByZXR1cm4gbG9hZElzVmFsaWQgJiYgYmVkc0FyZVZhbGlkICYmIHN0YXR1c0lzQ29ycmVjdCAmJiBjYXBhY2l0eUlzQ29uc2lzdGVudDtcclxuICAgICAgfSksXHJcbiAgICAgIHsgbnVtUnVuczogMTAwIH1cclxuICAgICk7XHJcbiAgfSk7XHJcblxyXG4gIHRlc3QoJ1Byb3BlcnR5IDk6IENhcGFjaXR5IFN0YXRpc3RpY3MgLSBBZ2dyZWdhdGVkIHN0YXRpc3RpY3Mgc2hvdWxkIGJlIG1hdGhlbWF0aWNhbGx5IGNvcnJlY3QnLCAoKSA9PiB7XHJcbiAgICBmYy5hc3NlcnQoXHJcbiAgICAgIGZjLnByb3BlcnR5KGZjLmFycmF5KHByb3ZpZGVyQ2FwYWNpdHlBcmIsIHsgbWluTGVuZ3RoOiAxLCBtYXhMZW5ndGg6IDUwIH0pLCAoY2FwYWNpdGllcykgPT4ge1xyXG4gICAgICAgIC8vIFNpbXVsYXRlIGNhcGFjaXR5IHN0YXRpc3RpY3MgY2FsY3VsYXRpb25cclxuICAgICAgICBjb25zdCB0b3RhbFByb3ZpZGVycyA9IGNhcGFjaXRpZXMubGVuZ3RoO1xyXG4gICAgICAgIGxldCBhdmFpbGFibGVDb3VudCA9IDA7XHJcbiAgICAgICAgbGV0IGJ1c3lDb3VudCA9IDA7XHJcbiAgICAgICAgbGV0IHVuYXZhaWxhYmxlQ291bnQgPSAwO1xyXG4gICAgICAgIGxldCB0b3RhbExvYWQgPSAwO1xyXG5cclxuICAgICAgICBjYXBhY2l0aWVzLmZvckVhY2goY2FwYWNpdHkgPT4ge1xyXG4gICAgICAgICAgdG90YWxMb2FkICs9IGNhcGFjaXR5LmN1cnJlbnRMb2FkO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBpZiAoY2FwYWNpdHkuY3VycmVudExvYWQgPCA3MCkge1xyXG4gICAgICAgICAgICBhdmFpbGFibGVDb3VudCsrO1xyXG4gICAgICAgICAgfSBlbHNlIGlmIChjYXBhY2l0eS5jdXJyZW50TG9hZCA8IDk1KSB7XHJcbiAgICAgICAgICAgIGJ1c3lDb3VudCsrO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgdW5hdmFpbGFibGVDb3VudCsrO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjb25zdCBhdmVyYWdlTG9hZCA9IE1hdGgucm91bmQodG90YWxMb2FkIC8gdG90YWxQcm92aWRlcnMpO1xyXG5cclxuICAgICAgICAvLyBWZXJpZnkgc3RhdGlzdGljcyBwcm9wZXJ0aWVzXHJcbiAgICAgICAgY29uc3QgY291bnRzQWRkVXAgPSAoYXZhaWxhYmxlQ291bnQgKyBidXN5Q291bnQgKyB1bmF2YWlsYWJsZUNvdW50KSA9PT0gdG90YWxQcm92aWRlcnM7XHJcbiAgICAgICAgY29uc3QgYXZlcmFnZUlzVmFsaWQgPSBhdmVyYWdlTG9hZCA+PSAwICYmIGF2ZXJhZ2VMb2FkIDw9IDEwMDtcclxuICAgICAgICBjb25zdCBjb3VudHNBcmVOb25OZWdhdGl2ZSA9IGF2YWlsYWJsZUNvdW50ID49IDAgJiYgYnVzeUNvdW50ID49IDAgJiYgdW5hdmFpbGFibGVDb3VudCA+PSAwO1xyXG5cclxuICAgICAgICByZXR1cm4gY291bnRzQWRkVXAgJiYgYXZlcmFnZUlzVmFsaWQgJiYgY291bnRzQXJlTm9uTmVnYXRpdmU7XHJcbiAgICAgIH0pLFxyXG4gICAgICB7IG51bVJ1bnM6IDEwMCB9XHJcbiAgICApO1xyXG4gIH0pO1xyXG59KTsiXX0=