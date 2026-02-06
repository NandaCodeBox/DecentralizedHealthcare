"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const provider_ranking_service_1 = require("../provider-ranking-service");
const enums_1 = require("../../../types/enums");
describe('ProviderRankingService', () => {
    let service;
    beforeEach(() => {
        service = new provider_ranking_service_1.ProviderRankingService();
    });
    const createMockProvider = (overrides = {}) => ({
        providerId: 'provider-1',
        type: enums_1.ProviderType.HOSPITAL,
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
            const criteria = {};
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
            const criteria = {
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
            const criteria = {
                location: {
                    coordinates: { lat: 28.6139, lng: 77.2090 },
                    maxDistance: 50
                }
            };
            const result = await service.rankProviders(providers, criteria);
            expect(result[0].provider.providerId).toBe('provider-near');
            expect(result[0].distance).toBeLessThan(result[1].distance);
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
            const criteria = {};
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
            const criteria = {};
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
            const criteria = {
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
            const criteria = {
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
            const criteria = {
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
            const criteria = {
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
            const criteria = {};
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
            const criteria = {};
            const lowLoadResult = await service.rankProviders([lowLoadProvider], criteria);
            const highLoadResult = await service.rankProviders([highLoadProvider], criteria);
            expect(lowLoadResult[0].estimatedWaitTime).toBeLessThan(highLoadResult[0].estimatedWaitTime);
        });
        it('should return undefined wait time for unavailable providers', async () => {
            const unavailableProvider = createMockProvider({
                capacity: { totalBeds: 100, availableBeds: 0, dailyPatientCapacity: 200, currentLoad: 100 }
            });
            const criteria = {};
            const result = await service.rankProviders([unavailableProvider], criteria);
            expect(result[0].estimatedWaitTime).toBeUndefined();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvdmlkZXItcmFua2luZy1zZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvbGFtYmRhL3Byb3ZpZGVyLWRpc2NvdmVyeS9fX3Rlc3RzX18vcHJvdmlkZXItcmFua2luZy1zZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSwwRUFBcUU7QUFFckUsZ0RBQW9EO0FBRXBELFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7SUFDdEMsSUFBSSxPQUErQixDQUFDO0lBRXBDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7UUFDZCxPQUFPLEdBQUcsSUFBSSxpREFBc0IsRUFBRSxDQUFDO0lBQ3pDLENBQUMsQ0FBQyxDQUFDO0lBRUgsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLFlBQStCLEVBQUUsRUFBWSxFQUFFLENBQUMsQ0FBQztRQUMzRSxVQUFVLEVBQUUsWUFBWTtRQUN4QixJQUFJLEVBQUUsb0JBQVksQ0FBQyxRQUFRO1FBQzNCLElBQUksRUFBRSxlQUFlO1FBQ3JCLFFBQVEsRUFBRTtZQUNSLE9BQU8sRUFBRSxhQUFhO1lBQ3RCLEtBQUssRUFBRSxPQUFPO1lBQ2QsUUFBUSxFQUFFLFdBQVc7WUFDckIsT0FBTyxFQUFFLFFBQVE7WUFDakIsV0FBVyxFQUFFLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFO1NBQzVDO1FBQ0QsWUFBWSxFQUFFO1lBQ1osV0FBVyxFQUFFLENBQUMsU0FBUyxDQUFDO1lBQ3hCLFFBQVEsRUFBRSxDQUFDLGNBQWMsQ0FBQztZQUMxQixTQUFTLEVBQUUsQ0FBQyxPQUFPLENBQUM7WUFDcEIsU0FBUyxFQUFFLENBQUMsU0FBUyxFQUFFLE9BQU8sQ0FBQztTQUNoQztRQUNELFFBQVEsRUFBRTtZQUNSLFNBQVMsRUFBRSxHQUFHO1lBQ2QsYUFBYSxFQUFFLEVBQUU7WUFDakIsb0JBQW9CLEVBQUUsR0FBRztZQUN6QixX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LEVBQUUsRUFBRSxFQUFFO2FBQzNGLENBQUMsQ0FBQztZQUVILE1BQU0sUUFBUSxHQUEyQixFQUFFLENBQUM7WUFFNUMsTUFBTSxhQUFhLEdBQUcsTUFBTSxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsZUFBZSxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDL0UsTUFBTSxjQUFjLEdBQUcsTUFBTSxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQztZQUVqRixNQUFNLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBa0IsQ0FBQyxDQUFDO1FBQ2hHLENBQUMsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLDZEQUE2RCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzNFLE1BQU0sbUJBQW1CLEdBQUcsa0JBQWtCLENBQUM7Z0JBQzdDLFFBQVEsRUFBRSxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsYUFBYSxFQUFFLENBQUMsRUFBRSxvQkFBb0IsRUFBRSxHQUFHLEVBQUUsV0FBVyxFQUFFLEdBQUcsRUFBRTthQUM1RixDQUFDLENBQUM7WUFFSCxNQUFNLFFBQVEsR0FBMkIsRUFBRSxDQUFDO1lBRTVDLE1BQU0sTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFFNUUsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3RELENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFByb3ZpZGVyUmFua2luZ1NlcnZpY2UgfSBmcm9tICcuLi9wcm92aWRlci1yYW5raW5nLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBQcm92aWRlciwgUHJvdmlkZXJTZWFyY2hDcml0ZXJpYSB9IGZyb20gJy4uLy4uLy4uL3R5cGVzL3Byb3ZpZGVyJztcclxuaW1wb3J0IHsgUHJvdmlkZXJUeXBlIH0gZnJvbSAnLi4vLi4vLi4vdHlwZXMvZW51bXMnO1xyXG5cclxuZGVzY3JpYmUoJ1Byb3ZpZGVyUmFua2luZ1NlcnZpY2UnLCAoKSA9PiB7XHJcbiAgbGV0IHNlcnZpY2U6IFByb3ZpZGVyUmFua2luZ1NlcnZpY2U7XHJcblxyXG4gIGJlZm9yZUVhY2goKCkgPT4ge1xyXG4gICAgc2VydmljZSA9IG5ldyBQcm92aWRlclJhbmtpbmdTZXJ2aWNlKCk7XHJcbiAgfSk7XHJcblxyXG4gIGNvbnN0IGNyZWF0ZU1vY2tQcm92aWRlciA9IChvdmVycmlkZXM6IFBhcnRpYWw8UHJvdmlkZXI+ID0ge30pOiBQcm92aWRlciA9PiAoe1xyXG4gICAgcHJvdmlkZXJJZDogJ3Byb3ZpZGVyLTEnLFxyXG4gICAgdHlwZTogUHJvdmlkZXJUeXBlLkhPU1BJVEFMLFxyXG4gICAgbmFtZTogJ1Rlc3QgSG9zcGl0YWwnLFxyXG4gICAgbG9jYXRpb246IHtcclxuICAgICAgYWRkcmVzczogJzEyMyBUZXN0IFN0JyxcclxuICAgICAgc3RhdGU6ICdEZWxoaScsXHJcbiAgICAgIGRpc3RyaWN0OiAnTmV3IERlbGhpJyxcclxuICAgICAgcGluY29kZTogJzExMDAwMScsXHJcbiAgICAgIGNvb3JkaW5hdGVzOiB7IGxhdDogMjguNjEzOSwgbG5nOiA3Ny4yMDkwIH1cclxuICAgIH0sXHJcbiAgICBjYXBhYmlsaXRpZXM6IHtcclxuICAgICAgc3BlY2lhbHRpZXM6IFsnZ2VuZXJhbCddLFxyXG4gICAgICBzZXJ2aWNlczogWydjb25zdWx0YXRpb24nXSxcclxuICAgICAgZXF1aXBtZW50OiBbJ2Jhc2ljJ10sXHJcbiAgICAgIGxhbmd1YWdlczogWydlbmdsaXNoJywgJ2hpbmRpJ11cclxuICAgIH0sXHJcbiAgICBjYXBhY2l0eToge1xyXG4gICAgICB0b3RhbEJlZHM6IDEwMCxcclxuICAgICAgYXZhaWxhYmxlQmVkczogNTAsXHJcbiAgICAgIGRhaWx5UGF0aWVudENhcGFjaXR5OiAyMDAsXHJcbiAgICAgIGN1cnJlbnRMb2FkOiA1MFxyXG4gICAgfSxcclxuICAgIHF1YWxpdHlNZXRyaWNzOiB7XHJcbiAgICAgIHJhdGluZzogNC4wLFxyXG4gICAgICBwYXRpZW50UmV2aWV3czogMTAwLFxyXG4gICAgICBzdWNjZXNzUmF0ZTogOTUsXHJcbiAgICAgIGF2ZXJhZ2VXYWl0VGltZTogMzBcclxuICAgIH0sXHJcbiAgICBjb3N0U3RydWN0dXJlOiB7XHJcbiAgICAgIGNvbnN1bHRhdGlvbkZlZTogNTAwLFxyXG4gICAgICBpbnN1cmFuY2VBY2NlcHRlZDogWydwdWJsaWMnXSxcclxuICAgICAgcGF5bWVudE1ldGhvZHM6IFsnY2FzaCddXHJcbiAgICB9LFxyXG4gICAgYXZhaWxhYmlsaXR5OiB7XHJcbiAgICAgIGhvdXJzOiB7IG1vbmRheTogJzktMTcnIH0sXHJcbiAgICAgIGVtZXJnZW5jeUF2YWlsYWJsZTogdHJ1ZSxcclxuICAgICAgbGFzdFVwZGF0ZWQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxyXG4gICAgfSxcclxuICAgIGNyZWRlbnRpYWxzOiB7XHJcbiAgICAgIGxpY2Vuc2VzOiBbJ2xpY2Vuc2UtMTIzJ10sXHJcbiAgICAgIGNlcnRpZmljYXRpb25zOiBbJ2NlcnQtNDU2J10sXHJcbiAgICAgIHZlcmlmaWVkOiB0cnVlXHJcbiAgICB9LFxyXG4gICAgaXNBY3RpdmU6IHRydWUsXHJcbiAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgIHVwZGF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgLi4ub3ZlcnJpZGVzXHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdyYW5rUHJvdmlkZXJzJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCByYW5rIHByb3ZpZGVycyBieSBtYXRjaCBzY29yZScsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgcHJvdmlkZXJzID0gW1xyXG4gICAgICAgIGNyZWF0ZU1vY2tQcm92aWRlcih7XHJcbiAgICAgICAgICBwcm92aWRlcklkOiAncHJvdmlkZXItMScsXHJcbiAgICAgICAgICBxdWFsaXR5TWV0cmljczogeyByYXRpbmc6IDMuMCwgcGF0aWVudFJldmlld3M6IDUwLCBzdWNjZXNzUmF0ZTogODUsIGF2ZXJhZ2VXYWl0VGltZTogNDUgfSxcclxuICAgICAgICAgIGNhcGFjaXR5OiB7IHRvdGFsQmVkczogMTAwLCBhdmFpbGFibGVCZWRzOiAzMCwgZGFpbHlQYXRpZW50Q2FwYWNpdHk6IDE1MCwgY3VycmVudExvYWQ6IDcwIH1cclxuICAgICAgICB9KSxcclxuICAgICAgICBjcmVhdGVNb2NrUHJvdmlkZXIoe1xyXG4gICAgICAgICAgcHJvdmlkZXJJZDogJ3Byb3ZpZGVyLTInLFxyXG4gICAgICAgICAgcXVhbGl0eU1ldHJpY3M6IHsgcmF0aW5nOiA1LjAsIHBhdGllbnRSZXZpZXdzOiAyMDAsIHN1Y2Nlc3NSYXRlOiA5OCwgYXZlcmFnZVdhaXRUaW1lOiAxNSB9LFxyXG4gICAgICAgICAgY2FwYWNpdHk6IHsgdG90YWxCZWRzOiAyMDAsIGF2YWlsYWJsZUJlZHM6IDEwMCwgZGFpbHlQYXRpZW50Q2FwYWNpdHk6IDMwMCwgY3VycmVudExvYWQ6IDMwIH1cclxuICAgICAgICB9KVxyXG4gICAgICBdO1xyXG5cclxuICAgICAgY29uc3QgY3JpdGVyaWE6IFByb3ZpZGVyU2VhcmNoQ3JpdGVyaWEgPSB7fTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNlcnZpY2UucmFua1Byb3ZpZGVycyhwcm92aWRlcnMsIGNyaXRlcmlhKTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvSGF2ZUxlbmd0aCgyKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdFswXS5wcm92aWRlci5wcm92aWRlcklkKS50b0JlKCdwcm92aWRlci0yJyk7IC8vIEhpZ2hlciByYXRpbmcsIGJldHRlciBhdmFpbGFiaWxpdHlcclxuICAgICAgZXhwZWN0KHJlc3VsdFsxXS5wcm92aWRlci5wcm92aWRlcklkKS50b0JlKCdwcm92aWRlci0xJyk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHRbMF0ubWF0Y2hTY29yZSkudG9CZUdyZWF0ZXJUaGFuKHJlc3VsdFsxXS5tYXRjaFNjb3JlKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgY2FsY3VsYXRlIGRpc3RhbmNlIHdoZW4gbG9jYXRpb24gY3JpdGVyaWEgaXMgcHJvdmlkZWQnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IHByb3ZpZGVycyA9IFtcclxuICAgICAgICBjcmVhdGVNb2NrUHJvdmlkZXIoe1xyXG4gICAgICAgICAgbG9jYXRpb246IHtcclxuICAgICAgICAgICAgYWRkcmVzczogJzEyMyBUZXN0IFN0JyxcclxuICAgICAgICAgICAgc3RhdGU6ICdEZWxoaScsXHJcbiAgICAgICAgICAgIGRpc3RyaWN0OiAnTmV3IERlbGhpJyxcclxuICAgICAgICAgICAgcGluY29kZTogJzExMDAwMScsXHJcbiAgICAgICAgICAgIGNvb3JkaW5hdGVzOiB7IGxhdDogMjguNjEzOSwgbG5nOiA3Ny4yMDkwIH0gLy8gTmV3IERlbGhpXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgICAgXTtcclxuXHJcbiAgICAgIGNvbnN0IGNyaXRlcmlhOiBQcm92aWRlclNlYXJjaENyaXRlcmlhID0ge1xyXG4gICAgICAgIGxvY2F0aW9uOiB7XHJcbiAgICAgICAgICBjb29yZGluYXRlczogeyBsYXQ6IDI4LjcwNDEsIGxuZzogNzcuMTAyNSB9LCAvLyBEaWZmZXJlbnQgbG9jYXRpb24gaW4gRGVsaGlcclxuICAgICAgICAgIG1heERpc3RhbmNlOiA1MFxyXG4gICAgICAgIH1cclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNlcnZpY2UucmFua1Byb3ZpZGVycyhwcm92aWRlcnMsIGNyaXRlcmlhKTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHRbMF0uZGlzdGFuY2UpLnRvQmVEZWZpbmVkKCk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHRbMF0uZGlzdGFuY2UpLnRvQmVHcmVhdGVyVGhhbigwKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgc29ydCBieSBkaXN0YW5jZSB3aGVuIG1hdGNoIHNjb3JlcyBhcmUgZXF1YWwnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IHByb3ZpZGVycyA9IFtcclxuICAgICAgICBjcmVhdGVNb2NrUHJvdmlkZXIoe1xyXG4gICAgICAgICAgcHJvdmlkZXJJZDogJ3Byb3ZpZGVyLWZhcicsXHJcbiAgICAgICAgICBsb2NhdGlvbjoge1xyXG4gICAgICAgICAgICBhZGRyZXNzOiAnNDU2IEZhciBTdCcsXHJcbiAgICAgICAgICAgIHN0YXRlOiAnRGVsaGknLFxyXG4gICAgICAgICAgICBkaXN0cmljdDogJ1NvdXRoIERlbGhpJyxcclxuICAgICAgICAgICAgcGluY29kZTogJzExMDAyMCcsXHJcbiAgICAgICAgICAgIGNvb3JkaW5hdGVzOiB7IGxhdDogMjguNTM1NSwgbG5nOiA3Ny4zOTEwIH0gLy8gRmFydGhlciBsb2NhdGlvblxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0pLFxyXG4gICAgICAgIGNyZWF0ZU1vY2tQcm92aWRlcih7XHJcbiAgICAgICAgICBwcm92aWRlcklkOiAncHJvdmlkZXItbmVhcicsXHJcbiAgICAgICAgICBsb2NhdGlvbjoge1xyXG4gICAgICAgICAgICBhZGRyZXNzOiAnNzg5IE5lYXIgU3QnLFxyXG4gICAgICAgICAgICBzdGF0ZTogJ0RlbGhpJyxcclxuICAgICAgICAgICAgZGlzdHJpY3Q6ICdDZW50cmFsIERlbGhpJyxcclxuICAgICAgICAgICAgcGluY29kZTogJzExMDAwMScsXHJcbiAgICAgICAgICAgIGNvb3JkaW5hdGVzOiB7IGxhdDogMjguNjMwMCwgbG5nOiA3Ny4yMjAwIH0gLy8gQ2xvc2VyIGxvY2F0aW9uXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgICAgXTtcclxuXHJcbiAgICAgIGNvbnN0IGNyaXRlcmlhOiBQcm92aWRlclNlYXJjaENyaXRlcmlhID0ge1xyXG4gICAgICAgIGxvY2F0aW9uOiB7XHJcbiAgICAgICAgICBjb29yZGluYXRlczogeyBsYXQ6IDI4LjYxMzksIGxuZzogNzcuMjA5MCB9LFxyXG4gICAgICAgICAgbWF4RGlzdGFuY2U6IDUwXHJcbiAgICAgICAgfVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2VydmljZS5yYW5rUHJvdmlkZXJzKHByb3ZpZGVycywgY3JpdGVyaWEpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdFswXS5wcm92aWRlci5wcm92aWRlcklkKS50b0JlKCdwcm92aWRlci1uZWFyJyk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHRbMF0uZGlzdGFuY2UpLnRvQmVMZXNzVGhhbihyZXN1bHRbMV0uZGlzdGFuY2UhKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnTWF0Y2ggU2NvcmUgQ2FsY3VsYXRpb24nLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIGdpdmUgaGlnaGVyIHNjb3JlcyB0byBwcm92aWRlcnMgd2l0aCBiZXR0ZXIgcmF0aW5ncycsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgaGlnaFJhdGVkUHJvdmlkZXIgPSBjcmVhdGVNb2NrUHJvdmlkZXIoe1xyXG4gICAgICAgIHF1YWxpdHlNZXRyaWNzOiB7IHJhdGluZzogNS4wLCBwYXRpZW50UmV2aWV3czogMjAwLCBzdWNjZXNzUmF0ZTogOTgsIGF2ZXJhZ2VXYWl0VGltZTogMTUgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IGxvd1JhdGVkUHJvdmlkZXIgPSBjcmVhdGVNb2NrUHJvdmlkZXIoe1xyXG4gICAgICAgIHF1YWxpdHlNZXRyaWNzOiB7IHJhdGluZzogMi4wLCBwYXRpZW50UmV2aWV3czogNTAsIHN1Y2Nlc3NSYXRlOiA4MCwgYXZlcmFnZVdhaXRUaW1lOiA2MCB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgY3JpdGVyaWE6IFByb3ZpZGVyU2VhcmNoQ3JpdGVyaWEgPSB7fTtcclxuXHJcbiAgICAgIGNvbnN0IGhpZ2hSYXRlZFJlc3VsdCA9IGF3YWl0IHNlcnZpY2UucmFua1Byb3ZpZGVycyhbaGlnaFJhdGVkUHJvdmlkZXJdLCBjcml0ZXJpYSk7XHJcbiAgICAgIGNvbnN0IGxvd1JhdGVkUmVzdWx0ID0gYXdhaXQgc2VydmljZS5yYW5rUHJvdmlkZXJzKFtsb3dSYXRlZFByb3ZpZGVyXSwgY3JpdGVyaWEpO1xyXG5cclxuICAgICAgZXhwZWN0KGhpZ2hSYXRlZFJlc3VsdFswXS5tYXRjaFNjb3JlKS50b0JlR3JlYXRlclRoYW4obG93UmF0ZWRSZXN1bHRbMF0ubWF0Y2hTY29yZSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGdpdmUgaGlnaGVyIHNjb3JlcyB0byBwcm92aWRlcnMgd2l0aCBiZXR0ZXIgYXZhaWxhYmlsaXR5JywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBhdmFpbGFibGVQcm92aWRlciA9IGNyZWF0ZU1vY2tQcm92aWRlcih7XHJcbiAgICAgICAgY2FwYWNpdHk6IHsgdG90YWxCZWRzOiAxMDAsIGF2YWlsYWJsZUJlZHM6IDgwLCBkYWlseVBhdGllbnRDYXBhY2l0eTogMjAwLCBjdXJyZW50TG9hZDogMjAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IGJ1c3lQcm92aWRlciA9IGNyZWF0ZU1vY2tQcm92aWRlcih7XHJcbiAgICAgICAgY2FwYWNpdHk6IHsgdG90YWxCZWRzOiAxMDAsIGF2YWlsYWJsZUJlZHM6IDUsIGRhaWx5UGF0aWVudENhcGFjaXR5OiAyMDAsIGN1cnJlbnRMb2FkOiA5NSB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgY3JpdGVyaWE6IFByb3ZpZGVyU2VhcmNoQ3JpdGVyaWEgPSB7fTtcclxuXHJcbiAgICAgIGNvbnN0IGF2YWlsYWJsZVJlc3VsdCA9IGF3YWl0IHNlcnZpY2UucmFua1Byb3ZpZGVycyhbYXZhaWxhYmxlUHJvdmlkZXJdLCBjcml0ZXJpYSk7XHJcbiAgICAgIGNvbnN0IGJ1c3lSZXN1bHQgPSBhd2FpdCBzZXJ2aWNlLnJhbmtQcm92aWRlcnMoW2J1c3lQcm92aWRlcl0sIGNyaXRlcmlhKTtcclxuXHJcbiAgICAgIGV4cGVjdChhdmFpbGFibGVSZXN1bHRbMF0ubWF0Y2hTY29yZSkudG9CZUdyZWF0ZXJUaGFuKGJ1c3lSZXN1bHRbMF0ubWF0Y2hTY29yZSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGdpdmUgaGlnaGVyIHNjb3JlcyBmb3Igc3BlY2lhbHR5IG1hdGNoZXMnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IHNwZWNpYWxpc3RQcm92aWRlciA9IGNyZWF0ZU1vY2tQcm92aWRlcih7XHJcbiAgICAgICAgY2FwYWJpbGl0aWVzOiB7XHJcbiAgICAgICAgICBzcGVjaWFsdGllczogWydjYXJkaW9sb2d5JywgJ2dlbmVyYWwnXSxcclxuICAgICAgICAgIHNlcnZpY2VzOiBbJ2NvbnN1bHRhdGlvbiddLFxyXG4gICAgICAgICAgZXF1aXBtZW50OiBbJ2VjZyddLFxyXG4gICAgICAgICAgbGFuZ3VhZ2VzOiBbJ2VuZ2xpc2gnXVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCBnZW5lcmFsUHJvdmlkZXIgPSBjcmVhdGVNb2NrUHJvdmlkZXIoe1xyXG4gICAgICAgIGNhcGFiaWxpdGllczoge1xyXG4gICAgICAgICAgc3BlY2lhbHRpZXM6IFsnZ2VuZXJhbCddLFxyXG4gICAgICAgICAgc2VydmljZXM6IFsnY29uc3VsdGF0aW9uJ10sXHJcbiAgICAgICAgICBlcXVpcG1lbnQ6IFsnYmFzaWMnXSxcclxuICAgICAgICAgIGxhbmd1YWdlczogWydlbmdsaXNoJ11cclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgY3JpdGVyaWE6IFByb3ZpZGVyU2VhcmNoQ3JpdGVyaWEgPSB7XHJcbiAgICAgICAgc3BlY2lhbHRpZXM6IFsnY2FyZGlvbG9neSddXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCBzcGVjaWFsaXN0UmVzdWx0ID0gYXdhaXQgc2VydmljZS5yYW5rUHJvdmlkZXJzKFtzcGVjaWFsaXN0UHJvdmlkZXJdLCBjcml0ZXJpYSk7XHJcbiAgICAgIGNvbnN0IGdlbmVyYWxSZXN1bHQgPSBhd2FpdCBzZXJ2aWNlLnJhbmtQcm92aWRlcnMoW2dlbmVyYWxQcm92aWRlcl0sIGNyaXRlcmlhKTtcclxuXHJcbiAgICAgIGV4cGVjdChzcGVjaWFsaXN0UmVzdWx0WzBdLm1hdGNoU2NvcmUpLnRvQmVHcmVhdGVyVGhhbihnZW5lcmFsUmVzdWx0WzBdLm1hdGNoU2NvcmUpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBnaXZlIGhpZ2hlciBzY29yZXMgZm9yIGxvd2VyIGNvc3RzJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBjaGVhcFByb3ZpZGVyID0gY3JlYXRlTW9ja1Byb3ZpZGVyKHtcclxuICAgICAgICBjb3N0U3RydWN0dXJlOiB7IGNvbnN1bHRhdGlvbkZlZTogMjAwLCBpbnN1cmFuY2VBY2NlcHRlZDogWydwdWJsaWMnXSwgcGF5bWVudE1ldGhvZHM6IFsnY2FzaCddIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCBleHBlbnNpdmVQcm92aWRlciA9IGNyZWF0ZU1vY2tQcm92aWRlcih7XHJcbiAgICAgICAgY29zdFN0cnVjdHVyZTogeyBjb25zdWx0YXRpb25GZWU6IDgwMCwgaW5zdXJhbmNlQWNjZXB0ZWQ6IFsncHVibGljJ10sIHBheW1lbnRNZXRob2RzOiBbJ2Nhc2gnXSB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgY3JpdGVyaWE6IFByb3ZpZGVyU2VhcmNoQ3JpdGVyaWEgPSB7XHJcbiAgICAgICAgbWF4Q29zdDogMTAwMFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgY2hlYXBSZXN1bHQgPSBhd2FpdCBzZXJ2aWNlLnJhbmtQcm92aWRlcnMoW2NoZWFwUHJvdmlkZXJdLCBjcml0ZXJpYSk7XHJcbiAgICAgIGNvbnN0IGV4cGVuc2l2ZVJlc3VsdCA9IGF3YWl0IHNlcnZpY2UucmFua1Byb3ZpZGVycyhbZXhwZW5zaXZlUHJvdmlkZXJdLCBjcml0ZXJpYSk7XHJcblxyXG4gICAgICBleHBlY3QoY2hlYXBSZXN1bHRbMF0ubWF0Y2hTY29yZSkudG9CZUdyZWF0ZXJUaGFuKGV4cGVuc2l2ZVJlc3VsdFswXS5tYXRjaFNjb3JlKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgZ2l2ZSBoaWdoZXIgc2NvcmVzIGZvciBpbnN1cmFuY2UgY29tcGF0aWJpbGl0eScsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgaW5zdXJhbmNlQ29tcGF0aWJsZVByb3ZpZGVyID0gY3JlYXRlTW9ja1Byb3ZpZGVyKHtcclxuICAgICAgICBjb3N0U3RydWN0dXJlOiB7XHJcbiAgICAgICAgICBjb25zdWx0YXRpb25GZWU6IDUwMCxcclxuICAgICAgICAgIGluc3VyYW5jZUFjY2VwdGVkOiBbJ3B1YmxpYycsICdwcml2YXRlJywgJ2NvcnBvcmF0ZSddLFxyXG4gICAgICAgICAgcGF5bWVudE1ldGhvZHM6IFsnY2FzaCcsICdjYXJkJywgJ2luc3VyYW5jZSddXHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IGxpbWl0ZWRJbnN1cmFuY2VQcm92aWRlciA9IGNyZWF0ZU1vY2tQcm92aWRlcih7XHJcbiAgICAgICAgY29zdFN0cnVjdHVyZToge1xyXG4gICAgICAgICAgY29uc3VsdGF0aW9uRmVlOiA1MDAsXHJcbiAgICAgICAgICBpbnN1cmFuY2VBY2NlcHRlZDogWydwdWJsaWMnXSxcclxuICAgICAgICAgIHBheW1lbnRNZXRob2RzOiBbJ2Nhc2gnXVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCBjcml0ZXJpYTogUHJvdmlkZXJTZWFyY2hDcml0ZXJpYSA9IHtcclxuICAgICAgICBhY2NlcHRzSW5zdXJhbmNlOiBbJ3ByaXZhdGUnLCAnY29ycG9yYXRlJ11cclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnN0IGNvbXBhdGlibGVSZXN1bHQgPSBhd2FpdCBzZXJ2aWNlLnJhbmtQcm92aWRlcnMoW2luc3VyYW5jZUNvbXBhdGlibGVQcm92aWRlcl0sIGNyaXRlcmlhKTtcclxuICAgICAgY29uc3QgbGltaXRlZFJlc3VsdCA9IGF3YWl0IHNlcnZpY2UucmFua1Byb3ZpZGVycyhbbGltaXRlZEluc3VyYW5jZVByb3ZpZGVyXSwgY3JpdGVyaWEpO1xyXG5cclxuICAgICAgZXhwZWN0KGNvbXBhdGlibGVSZXN1bHRbMF0ubWF0Y2hTY29yZSkudG9CZUdyZWF0ZXJUaGFuKGxpbWl0ZWRSZXN1bHRbMF0ubWF0Y2hTY29yZSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGdpdmUgaGlnaGVyIHNjb3JlcyBmb3IgbGFuZ3VhZ2UgY29tcGF0aWJpbGl0eScsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgbXVsdGlsaW5ndWFsUHJvdmlkZXIgPSBjcmVhdGVNb2NrUHJvdmlkZXIoe1xyXG4gICAgICAgIGNhcGFiaWxpdGllczoge1xyXG4gICAgICAgICAgc3BlY2lhbHRpZXM6IFsnZ2VuZXJhbCddLFxyXG4gICAgICAgICAgc2VydmljZXM6IFsnY29uc3VsdGF0aW9uJ10sXHJcbiAgICAgICAgICBlcXVpcG1lbnQ6IFsnYmFzaWMnXSxcclxuICAgICAgICAgIGxhbmd1YWdlczogWydlbmdsaXNoJywgJ2hpbmRpJywgJ3RhbWlsJ11cclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgZW5nbGlzaE9ubHlQcm92aWRlciA9IGNyZWF0ZU1vY2tQcm92aWRlcih7XHJcbiAgICAgICAgY2FwYWJpbGl0aWVzOiB7XHJcbiAgICAgICAgICBzcGVjaWFsdGllczogWydnZW5lcmFsJ10sXHJcbiAgICAgICAgICBzZXJ2aWNlczogWydjb25zdWx0YXRpb24nXSxcclxuICAgICAgICAgIGVxdWlwbWVudDogWydiYXNpYyddLFxyXG4gICAgICAgICAgbGFuZ3VhZ2VzOiBbJ2VuZ2xpc2gnXVxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCBjcml0ZXJpYTogUHJvdmlkZXJTZWFyY2hDcml0ZXJpYSA9IHtcclxuICAgICAgICBsYW5ndWFnZXM6IFsnaGluZGknLCAndGFtaWwnXVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgbXVsdGlsaW5ndWFsUmVzdWx0ID0gYXdhaXQgc2VydmljZS5yYW5rUHJvdmlkZXJzKFttdWx0aWxpbmd1YWxQcm92aWRlcl0sIGNyaXRlcmlhKTtcclxuICAgICAgY29uc3QgZW5nbGlzaE9ubHlSZXN1bHQgPSBhd2FpdCBzZXJ2aWNlLnJhbmtQcm92aWRlcnMoW2VuZ2xpc2hPbmx5UHJvdmlkZXJdLCBjcml0ZXJpYSk7XHJcblxyXG4gICAgICBleHBlY3QobXVsdGlsaW5ndWFsUmVzdWx0WzBdLm1hdGNoU2NvcmUpLnRvQmVHcmVhdGVyVGhhbihlbmdsaXNoT25seVJlc3VsdFswXS5tYXRjaFNjb3JlKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnQXZhaWxhYmlsaXR5IFN0YXR1cycsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgZGV0ZXJtaW5lIGF2YWlsYWJpbGl0eSBzdGF0dXMgY29ycmVjdGx5JywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBhdmFpbGFibGVQcm92aWRlciA9IGNyZWF0ZU1vY2tQcm92aWRlcih7XHJcbiAgICAgICAgY2FwYWNpdHk6IHsgdG90YWxCZWRzOiAxMDAsIGF2YWlsYWJsZUJlZHM6IDYwLCBkYWlseVBhdGllbnRDYXBhY2l0eTogMjAwLCBjdXJyZW50TG9hZDogNDAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IGJ1c3lQcm92aWRlciA9IGNyZWF0ZU1vY2tQcm92aWRlcih7XHJcbiAgICAgICAgY2FwYWNpdHk6IHsgdG90YWxCZWRzOiAxMDAsIGF2YWlsYWJsZUJlZHM6IDIwLCBkYWlseVBhdGllbnRDYXBhY2l0eTogMjAwLCBjdXJyZW50TG9hZDogODAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHVuYXZhaWxhYmxlUHJvdmlkZXIgPSBjcmVhdGVNb2NrUHJvdmlkZXIoe1xyXG4gICAgICAgIGNhcGFjaXR5OiB7IHRvdGFsQmVkczogMTAwLCBhdmFpbGFibGVCZWRzOiAwLCBkYWlseVBhdGllbnRDYXBhY2l0eTogMjAwLCBjdXJyZW50TG9hZDogMTAwIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCBpbmFjdGl2ZVByb3ZpZGVyID0gY3JlYXRlTW9ja1Byb3ZpZGVyKHtcclxuICAgICAgICBpc0FjdGl2ZTogZmFsc2UsXHJcbiAgICAgICAgY2FwYWNpdHk6IHsgdG90YWxCZWRzOiAxMDAsIGF2YWlsYWJsZUJlZHM6IDUwLCBkYWlseVBhdGllbnRDYXBhY2l0eTogMjAwLCBjdXJyZW50TG9hZDogNTAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IGNyaXRlcmlhOiBQcm92aWRlclNlYXJjaENyaXRlcmlhID0ge307XHJcblxyXG4gICAgICBjb25zdCBhdmFpbGFibGVSZXN1bHQgPSBhd2FpdCBzZXJ2aWNlLnJhbmtQcm92aWRlcnMoW2F2YWlsYWJsZVByb3ZpZGVyXSwgY3JpdGVyaWEpO1xyXG4gICAgICBjb25zdCBidXN5UmVzdWx0ID0gYXdhaXQgc2VydmljZS5yYW5rUHJvdmlkZXJzKFtidXN5UHJvdmlkZXJdLCBjcml0ZXJpYSk7XHJcbiAgICAgIGNvbnN0IHVuYXZhaWxhYmxlUmVzdWx0ID0gYXdhaXQgc2VydmljZS5yYW5rUHJvdmlkZXJzKFt1bmF2YWlsYWJsZVByb3ZpZGVyXSwgY3JpdGVyaWEpO1xyXG4gICAgICBjb25zdCBpbmFjdGl2ZVJlc3VsdCA9IGF3YWl0IHNlcnZpY2UucmFua1Byb3ZpZGVycyhbaW5hY3RpdmVQcm92aWRlcl0sIGNyaXRlcmlhKTtcclxuXHJcbiAgICAgIGV4cGVjdChhdmFpbGFibGVSZXN1bHRbMF0uYXZhaWxhYmlsaXR5U3RhdHVzKS50b0JlKCdhdmFpbGFibGUnKTtcclxuICAgICAgZXhwZWN0KGJ1c3lSZXN1bHRbMF0uYXZhaWxhYmlsaXR5U3RhdHVzKS50b0JlKCdidXN5Jyk7XHJcbiAgICAgIGV4cGVjdCh1bmF2YWlsYWJsZVJlc3VsdFswXS5hdmFpbGFiaWxpdHlTdGF0dXMpLnRvQmUoJ3VuYXZhaWxhYmxlJyk7XHJcbiAgICAgIGV4cGVjdChpbmFjdGl2ZVJlc3VsdFswXS5hdmFpbGFiaWxpdHlTdGF0dXMpLnRvQmUoJ3VuYXZhaWxhYmxlJyk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ0VzdGltYXRlZCBXYWl0IFRpbWUnLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIGNhbGN1bGF0ZSBlc3RpbWF0ZWQgd2FpdCB0aW1lIGJhc2VkIG9uIGxvYWQnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGxvd0xvYWRQcm92aWRlciA9IGNyZWF0ZU1vY2tQcm92aWRlcih7XHJcbiAgICAgICAgY2FwYWNpdHk6IHsgdG90YWxCZWRzOiAxMDAsIGF2YWlsYWJsZUJlZHM6IDgwLCBkYWlseVBhdGllbnRDYXBhY2l0eTogMjAwLCBjdXJyZW50TG9hZDogMjAgfSxcclxuICAgICAgICBxdWFsaXR5TWV0cmljczogeyByYXRpbmc6IDQuMCwgcGF0aWVudFJldmlld3M6IDEwMCwgc3VjY2Vzc1JhdGU6IDk1LCBhdmVyYWdlV2FpdFRpbWU6IDMwIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCBoaWdoTG9hZFByb3ZpZGVyID0gY3JlYXRlTW9ja1Byb3ZpZGVyKHtcclxuICAgICAgICBjYXBhY2l0eTogeyB0b3RhbEJlZHM6IDEwMCwgYXZhaWxhYmxlQmVkczogMTAsIGRhaWx5UGF0aWVudENhcGFjaXR5OiAyMDAsIGN1cnJlbnRMb2FkOiA5MCB9LFxyXG4gICAgICAgIHF1YWxpdHlNZXRyaWNzOiB7IHJhdGluZzogNC4wLCBwYXRpZW50UmV2aWV3czogMTAwLCBzdWNjZXNzUmF0ZTogOTUsIGF2ZXJhZ2VXYWl0VGltZTogMzAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IGNyaXRlcmlhOiBQcm92aWRlclNlYXJjaENyaXRlcmlhID0ge307XHJcblxyXG4gICAgICBjb25zdCBsb3dMb2FkUmVzdWx0ID0gYXdhaXQgc2VydmljZS5yYW5rUHJvdmlkZXJzKFtsb3dMb2FkUHJvdmlkZXJdLCBjcml0ZXJpYSk7XHJcbiAgICAgIGNvbnN0IGhpZ2hMb2FkUmVzdWx0ID0gYXdhaXQgc2VydmljZS5yYW5rUHJvdmlkZXJzKFtoaWdoTG9hZFByb3ZpZGVyXSwgY3JpdGVyaWEpO1xyXG5cclxuICAgICAgZXhwZWN0KGxvd0xvYWRSZXN1bHRbMF0uZXN0aW1hdGVkV2FpdFRpbWUpLnRvQmVMZXNzVGhhbihoaWdoTG9hZFJlc3VsdFswXS5lc3RpbWF0ZWRXYWl0VGltZSEpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gdW5kZWZpbmVkIHdhaXQgdGltZSBmb3IgdW5hdmFpbGFibGUgcHJvdmlkZXJzJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCB1bmF2YWlsYWJsZVByb3ZpZGVyID0gY3JlYXRlTW9ja1Byb3ZpZGVyKHtcclxuICAgICAgICBjYXBhY2l0eTogeyB0b3RhbEJlZHM6IDEwMCwgYXZhaWxhYmxlQmVkczogMCwgZGFpbHlQYXRpZW50Q2FwYWNpdHk6IDIwMCwgY3VycmVudExvYWQ6IDEwMCB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgY3JpdGVyaWE6IFByb3ZpZGVyU2VhcmNoQ3JpdGVyaWEgPSB7fTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNlcnZpY2UucmFua1Byb3ZpZGVycyhbdW5hdmFpbGFibGVQcm92aWRlcl0sIGNyaXRlcmlhKTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHRbMF0uZXN0aW1hdGVkV2FpdFRpbWUpLnRvQmVVbmRlZmluZWQoKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG59KTsiXX0=