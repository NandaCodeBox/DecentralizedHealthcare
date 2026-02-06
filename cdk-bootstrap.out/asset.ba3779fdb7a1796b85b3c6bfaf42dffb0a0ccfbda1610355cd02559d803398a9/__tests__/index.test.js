"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
const provider_discovery_service_1 = require("../provider-discovery-service");
const provider_ranking_service_1 = require("../provider-ranking-service");
const provider_capacity_service_1 = require("../provider-capacity-service");
// Mock the services
jest.mock('../provider-discovery-service');
jest.mock('../provider-ranking-service');
jest.mock('../provider-capacity-service');
const mockProviderDiscoveryService = provider_discovery_service_1.ProviderDiscoveryService;
const mockProviderRankingService = provider_ranking_service_1.ProviderRankingService;
const mockProviderCapacityService = provider_capacity_service_1.ProviderCapacityService;
describe('Provider Discovery Lambda Handler', () => {
    let mockEvent;
    let mockContext;
    beforeEach(() => {
        jest.clearAllMocks();
        mockEvent = {
            httpMethod: 'GET',
            path: '/providers',
            pathParameters: null,
            queryStringParameters: null,
            body: null,
            headers: {},
            requestContext: {}
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
                    availabilityStatus: 'available',
                    distance: 5.2
                }
            ];
            mockProviderDiscoveryService.prototype.searchProviders.mockResolvedValue(mockProviders);
            mockProviderRankingService.prototype.rankProviders.mockResolvedValue(mockRankedProviders);
            mockEvent.path = '/providers/search';
            mockEvent.queryStringParameters = {
                type: 'hospital',
                lat: '28.6139',
                lng: '77.2090',
                maxDistance: '10'
            };
            const result = await (0, index_1.handler)(mockEvent);
            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body).success).toBe(true);
            expect(JSON.parse(result.body).data.providers).toHaveLength(1);
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
            const result = await (0, index_1.handler)(mockEvent);
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).success).toBe(false);
        });
    });
    describe('Provider Registration', () => {
        it('should handle provider registration with valid data', async () => {
            const mockProvider = {
                providerId: 'new-provider-id',
                name: 'New Hospital',
                type: 'hospital'
            };
            mockProviderDiscoveryService.prototype.registerProvider.mockResolvedValue(mockProvider);
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
            const result = await (0, index_1.handler)(mockEvent);
            expect(result.statusCode).toBe(201);
            expect(JSON.parse(result.body).success).toBe(true);
            expect(mockProviderDiscoveryService.prototype.registerProvider).toHaveBeenCalled();
        });
        it('should return error for missing request body', async () => {
            mockEvent.httpMethod = 'POST';
            mockEvent.path = '/providers/register';
            mockEvent.body = null;
            const result = await (0, index_1.handler)(mockEvent);
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body).success).toBe(false);
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
                    availabilityStatus: 'available',
                    lastUpdated: new Date().toISOString()
                }
            ];
            mockProviderCapacityService.prototype.checkCapacity.mockResolvedValue(mockCapacityInfo);
            mockEvent.path = '/providers/capacity';
            mockEvent.queryStringParameters = {
                providerIds: 'provider-1,provider-2'
            };
            const result = await (0, index_1.handler)(mockEvent);
            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body).success).toBe(true);
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
            const result = await (0, index_1.handler)(mockEvent);
            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body).success).toBe(true);
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
            mockProviderDiscoveryService.prototype.getProvider.mockResolvedValue(mockProvider);
            mockEvent.pathParameters = { providerId: 'provider-1' };
            const result = await (0, index_1.handler)(mockEvent);
            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body).success).toBe(true);
            expect(mockProviderDiscoveryService.prototype.getProvider).toHaveBeenCalledWith('provider-1');
        });
        it('should return 404 for non-existent provider', async () => {
            mockProviderDiscoveryService.prototype.getProvider.mockResolvedValue(null);
            mockEvent.pathParameters = { providerId: 'non-existent' };
            const result = await (0, index_1.handler)(mockEvent);
            expect(result.statusCode).toBe(404);
            expect(JSON.parse(result.body).success).toBe(false);
        });
        it('should update provider', async () => {
            const mockUpdatedProvider = {
                providerId: 'provider-1',
                name: 'Updated Hospital',
                type: 'hospital'
            };
            mockProviderDiscoveryService.prototype.updateProvider.mockResolvedValue(mockUpdatedProvider);
            mockEvent.httpMethod = 'PUT';
            mockEvent.pathParameters = { providerId: 'provider-1' };
            mockEvent.body = JSON.stringify({
                name: 'Updated Hospital'
            });
            const result = await (0, index_1.handler)(mockEvent);
            expect(result.statusCode).toBe(200);
            expect(JSON.parse(result.body).success).toBe(true);
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
            const result = await (0, index_1.handler)(mockEvent);
            expect(result.statusCode).toBe(500);
            expect(JSON.parse(result.body).success).toBe(false);
        });
        it('should return 405 for unsupported methods', async () => {
            mockEvent.httpMethod = 'DELETE';
            const result = await (0, index_1.handler)(mockEvent);
            expect(result.statusCode).toBe(405);
            expect(JSON.parse(result.body).success).toBe(false);
        });
        it('should return 404 for unknown endpoints', async () => {
            mockEvent.path = '/providers/unknown';
            const result = await (0, index_1.handler)(mockEvent);
            expect(result.statusCode).toBe(404);
            expect(JSON.parse(result.body).success).toBe(false);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9sYW1iZGEvcHJvdmlkZXItZGlzY292ZXJ5L19fdGVzdHNfXy9pbmRleC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQ0Esb0NBQW1DO0FBQ25DLDhFQUF5RTtBQUN6RSwwRUFBcUU7QUFDckUsNEVBQXVFO0FBRXZFLG9CQUFvQjtBQUNwQixJQUFJLENBQUMsSUFBSSxDQUFDLCtCQUErQixDQUFDLENBQUM7QUFDM0MsSUFBSSxDQUFDLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0FBQ3pDLElBQUksQ0FBQyxJQUFJLENBQUMsOEJBQThCLENBQUMsQ0FBQztBQUUxQyxNQUFNLDRCQUE0QixHQUFHLHFEQUE2RSxDQUFDO0FBQ25ILE1BQU0sMEJBQTBCLEdBQUcsaURBQXlFLENBQUM7QUFDN0csTUFBTSwyQkFBMkIsR0FBRyxtREFBMkUsQ0FBQztBQUVoSCxRQUFRLENBQUMsbUNBQW1DLEVBQUUsR0FBRyxFQUFFO0lBQ2pELElBQUksU0FBd0MsQ0FBQztJQUM3QyxJQUFJLFdBQWdCLENBQUM7SUFFckIsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUNkLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztRQUVyQixTQUFTLEdBQUc7WUFDVixVQUFVLEVBQUUsS0FBSztZQUNqQixJQUFJLEVBQUUsWUFBWTtZQUNsQixjQUFjLEVBQUUsSUFBSTtZQUNwQixxQkFBcUIsRUFBRSxJQUFJO1lBQzNCLElBQUksRUFBRSxJQUFJO1lBQ1YsT0FBTyxFQUFFLEVBQUU7WUFDWCxjQUFjLEVBQUUsRUFBUztTQUMxQixDQUFDO1FBRUYsV0FBVyxHQUFHO1lBQ1osWUFBWSxFQUFFLHFCQUFxQjtZQUNuQyxZQUFZLEVBQUUsZUFBZTtTQUM5QixDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO1FBQy9CLEVB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QU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdEQsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgaGFuZGxlciB9IGZyb20gJy4uL2luZGV4JztcclxuaW1wb3J0IHsgUHJvdmlkZXJEaXNjb3ZlcnlTZXJ2aWNlIH0gZnJvbSAnLi4vcHJvdmlkZXItZGlzY292ZXJ5LXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBQcm92aWRlclJhbmtpbmdTZXJ2aWNlIH0gZnJvbSAnLi4vcHJvdmlkZXItcmFua2luZy1zZXJ2aWNlJztcclxuaW1wb3J0IHsgUHJvdmlkZXJDYXBhY2l0eVNlcnZpY2UgfSBmcm9tICcuLi9wcm92aWRlci1jYXBhY2l0eS1zZXJ2aWNlJztcclxuXHJcbi8vIE1vY2sgdGhlIHNlcnZpY2VzXHJcbmplc3QubW9jaygnLi4vcHJvdmlkZXItZGlzY292ZXJ5LXNlcnZpY2UnKTtcclxuamVzdC5tb2NrKCcuLi9wcm92aWRlci1yYW5raW5nLXNlcnZpY2UnKTtcclxuamVzdC5tb2NrKCcuLi9wcm92aWRlci1jYXBhY2l0eS1zZXJ2aWNlJyk7XHJcblxyXG5jb25zdCBtb2NrUHJvdmlkZXJEaXNjb3ZlcnlTZXJ2aWNlID0gUHJvdmlkZXJEaXNjb3ZlcnlTZXJ2aWNlIGFzIGplc3QuTW9ja2VkQ2xhc3M8dHlwZW9mIFByb3ZpZGVyRGlzY292ZXJ5U2VydmljZT47XHJcbmNvbnN0IG1vY2tQcm92aWRlclJhbmtpbmdTZXJ2aWNlID0gUHJvdmlkZXJSYW5raW5nU2VydmljZSBhcyBqZXN0Lk1vY2tlZENsYXNzPHR5cGVvZiBQcm92aWRlclJhbmtpbmdTZXJ2aWNlPjtcclxuY29uc3QgbW9ja1Byb3ZpZGVyQ2FwYWNpdHlTZXJ2aWNlID0gUHJvdmlkZXJDYXBhY2l0eVNlcnZpY2UgYXMgamVzdC5Nb2NrZWRDbGFzczx0eXBlb2YgUHJvdmlkZXJDYXBhY2l0eVNlcnZpY2U+O1xyXG5cclxuZGVzY3JpYmUoJ1Byb3ZpZGVyIERpc2NvdmVyeSBMYW1iZGEgSGFuZGxlcicsICgpID0+IHtcclxuICBsZXQgbW9ja0V2ZW50OiBQYXJ0aWFsPEFQSUdhdGV3YXlQcm94eUV2ZW50PjtcclxuICBsZXQgbW9ja0NvbnRleHQ6IGFueTtcclxuXHJcbiAgYmVmb3JlRWFjaCgoKSA9PiB7XHJcbiAgICBqZXN0LmNsZWFyQWxsTW9ja3MoKTtcclxuICAgIFxyXG4gICAgbW9ja0V2ZW50ID0ge1xyXG4gICAgICBodHRwTWV0aG9kOiAnR0VUJyxcclxuICAgICAgcGF0aDogJy9wcm92aWRlcnMnLFxyXG4gICAgICBwYXRoUGFyYW1ldGVyczogbnVsbCxcclxuICAgICAgcXVlcnlTdHJpbmdQYXJhbWV0ZXJzOiBudWxsLFxyXG4gICAgICBib2R5OiBudWxsLFxyXG4gICAgICBoZWFkZXJzOiB7fSxcclxuICAgICAgcmVxdWVzdENvbnRleHQ6IHt9IGFzIGFueVxyXG4gICAgfTtcclxuXHJcbiAgICBtb2NrQ29udGV4dCA9IHtcclxuICAgICAgYXdzUmVxdWVzdElkOiAndGVzdC1hd3MtcmVxdWVzdC1pZCcsXHJcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ3Rlc3QtZnVuY3Rpb24nXHJcbiAgICB9O1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnUHJvdmlkZXIgU2VhcmNoJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgcHJvdmlkZXIgc2VhcmNoIHdpdGggdmFsaWQgY3JpdGVyaWEnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IG1vY2tQcm92aWRlcnMgPSBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgcHJvdmlkZXJJZDogJ3Byb3ZpZGVyLTEnLFxyXG4gICAgICAgICAgbmFtZTogJ1Rlc3QgSG9zcGl0YWwnLFxyXG4gICAgICAgICAgdHlwZTogJ2hvc3BpdGFsJyxcclxuICAgICAgICAgIGxvY2F0aW9uOiB7XHJcbiAgICAgICAgICAgIHN0YXRlOiAnRGVsaGknLFxyXG4gICAgICAgICAgICBkaXN0cmljdDogJ05ldyBEZWxoaScsXHJcbiAgICAgICAgICAgIHBpbmNvZGU6ICcxMTAwMDEnLFxyXG4gICAgICAgICAgICBjb29yZGluYXRlczogeyBsYXQ6IDI4LjYxMzksIGxuZzogNzcuMjA5MCB9XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgY2FwYWJpbGl0aWVzOiB7XHJcbiAgICAgICAgICAgIHNwZWNpYWx0aWVzOiBbJ2dlbmVyYWwnXSxcclxuICAgICAgICAgICAgc2VydmljZXM6IFsnY29uc3VsdGF0aW9uJ10sXHJcbiAgICAgICAgICAgIGVxdWlwbWVudDogWydiYXNpYyddLFxyXG4gICAgICAgICAgICBsYW5ndWFnZXM6IFsnZW5nbGlzaCddXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgY2FwYWNpdHk6IHtcclxuICAgICAgICAgICAgdG90YWxCZWRzOiAxMDAsXHJcbiAgICAgICAgICAgIGF2YWlsYWJsZUJlZHM6IDUwLFxyXG4gICAgICAgICAgICBkYWlseVBhdGllbnRDYXBhY2l0eTogMjAwLFxyXG4gICAgICAgICAgICBjdXJyZW50TG9hZDogNTBcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBxdWFsaXR5TWV0cmljczoge1xyXG4gICAgICAgICAgICByYXRpbmc6IDQuNSxcclxuICAgICAgICAgICAgcGF0aWVudFJldmlld3M6IDEwMCxcclxuICAgICAgICAgICAgc3VjY2Vzc1JhdGU6IDk1LFxyXG4gICAgICAgICAgICBhdmVyYWdlV2FpdFRpbWU6IDMwXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgY29zdFN0cnVjdHVyZToge1xyXG4gICAgICAgICAgICBjb25zdWx0YXRpb25GZWU6IDUwMCxcclxuICAgICAgICAgICAgaW5zdXJhbmNlQWNjZXB0ZWQ6IFsncHVibGljJ10sXHJcbiAgICAgICAgICAgIHBheW1lbnRNZXRob2RzOiBbJ2Nhc2gnXVxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGF2YWlsYWJpbGl0eToge1xyXG4gICAgICAgICAgICBob3VyczogeyBtb25kYXk6IHsgb3BlbjogJzk6MDAnLCBjbG9zZTogJzE3OjAwJyB9IH0sXHJcbiAgICAgICAgICAgIGVtZXJnZW5jeUF2YWlsYWJsZTogdHJ1ZSxcclxuICAgICAgICAgICAgbGFzdFVwZGF0ZWQ6IG5ldyBEYXRlKClcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBjcmVkZW50aWFsczoge1xyXG4gICAgICAgICAgICBsaWNlbnNlczogWydsaWNlbnNlLTEyMyddLFxyXG4gICAgICAgICAgICBjZXJ0aWZpY2F0aW9uczogWydjZXJ0LTQ1NiddLFxyXG4gICAgICAgICAgICB2ZXJpZmllZDogdHJ1ZVxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIGlzQWN0aXZlOiB0cnVlLFxyXG4gICAgICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLFxyXG4gICAgICAgICAgdXBkYXRlZEF0OiBuZXcgRGF0ZSgpXHJcbiAgICAgICAgfVxyXG4gICAgICBdO1xyXG5cclxuICAgICAgY29uc3QgbW9ja1JhbmtlZFByb3ZpZGVycyA9IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBwcm92aWRlcjogbW9ja1Byb3ZpZGVyc1swXSxcclxuICAgICAgICAgIG1hdGNoU2NvcmU6IDg1LFxyXG4gICAgICAgICAgYXZhaWxhYmlsaXR5U3RhdHVzOiAnYXZhaWxhYmxlJyBhcyBjb25zdCxcclxuICAgICAgICAgIGRpc3RhbmNlOiA1LjJcclxuICAgICAgICB9XHJcbiAgICAgIF07XHJcblxyXG4gICAgICBtb2NrUHJvdmlkZXJEaXNjb3ZlcnlTZXJ2aWNlLnByb3RvdHlwZS5zZWFyY2hQcm92aWRlcnMubW9ja1Jlc29sdmVkVmFsdWUobW9ja1Byb3ZpZGVycyBhcyBhbnkpO1xyXG4gICAgICBtb2NrUHJvdmlkZXJSYW5raW5nU2VydmljZS5wcm90b3R5cGUucmFua1Byb3ZpZGVycy5tb2NrUmVzb2x2ZWRWYWx1ZShtb2NrUmFua2VkUHJvdmlkZXJzKTtcclxuXHJcbiAgICAgIG1vY2tFdmVudC5wYXRoID0gJy9wcm92aWRlcnMvc2VhcmNoJztcclxuICAgICAgbW9ja0V2ZW50LnF1ZXJ5U3RyaW5nUGFyYW1ldGVycyA9IHtcclxuICAgICAgICB0eXBlOiAnaG9zcGl0YWwnLFxyXG4gICAgICAgIGxhdDogJzI4LjYxMzknLFxyXG4gICAgICAgIGxuZzogJzc3LjIwOTAnLFxyXG4gICAgICAgIG1heERpc3RhbmNlOiAnMTAnXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKG1vY2tFdmVudCBhcyBBUElHYXRld2F5UHJveHlFdmVudCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcclxuICAgICAgZXhwZWN0KEpTT04ucGFyc2UocmVzdWx0LmJvZHkpLnN1Y2Nlc3MpLnRvQmUodHJ1ZSk7XHJcbiAgICAgIGV4cGVjdChKU09OLnBhcnNlKHJlc3VsdC5ib2R5KS5kYXRhLnByb3ZpZGVycykudG9IYXZlTGVuZ3RoKDEpO1xyXG4gICAgICBleHBlY3QobW9ja1Byb3ZpZGVyRGlzY292ZXJ5U2VydmljZS5wcm90b3R5cGUuc2VhcmNoUHJvdmlkZXJzKS50b0hhdmVCZWVuQ2FsbGVkV2l0aCh7XHJcbiAgICAgICAgdHlwZTogJ2hvc3BpdGFsJyxcclxuICAgICAgICBsb2NhdGlvbjoge1xyXG4gICAgICAgICAgY29vcmRpbmF0ZXM6IHsgbGF0OiAyOC42MTM5LCBsbmc6IDc3LjIwOTAgfSxcclxuICAgICAgICAgIG1heERpc3RhbmNlOiAxMFxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIHJldHVybiB2YWxpZGF0aW9uIGVycm9yIGZvciBpbnZhbGlkIHNlYXJjaCBjcml0ZXJpYScsIGFzeW5jICgpID0+IHtcclxuICAgICAgbW9ja0V2ZW50LnBhdGggPSAnL3Byb3ZpZGVycy9zZWFyY2gnO1xyXG4gICAgICBtb2NrRXZlbnQucXVlcnlTdHJpbmdQYXJhbWV0ZXJzID0ge1xyXG4gICAgICAgIGxhdDogJ2ludmFsaWQtbGF0JyxcclxuICAgICAgICBsbmc6ICc3Ny4yMDkwJ1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihtb2NrRXZlbnQgYXMgQVBJR2F0ZXdheVByb3h5RXZlbnQpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDQwMCk7XHJcbiAgICAgIGV4cGVjdChKU09OLnBhcnNlKHJlc3VsdC5ib2R5KS5zdWNjZXNzKS50b0JlKGZhbHNlKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnUHJvdmlkZXIgUmVnaXN0cmF0aW9uJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgcHJvdmlkZXIgcmVnaXN0cmF0aW9uIHdpdGggdmFsaWQgZGF0YScsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgbW9ja1Byb3ZpZGVyID0ge1xyXG4gICAgICAgIHByb3ZpZGVySWQ6ICduZXctcHJvdmlkZXItaWQnLFxyXG4gICAgICAgIG5hbWU6ICdOZXcgSG9zcGl0YWwnLFxyXG4gICAgICAgIHR5cGU6ICdob3NwaXRhbCdcclxuICAgICAgfTtcclxuXHJcbiAgICAgIG1vY2tQcm92aWRlckRpc2NvdmVyeVNlcnZpY2UucHJvdG90eXBlLnJlZ2lzdGVyUHJvdmlkZXIubW9ja1Jlc29sdmVkVmFsdWUobW9ja1Byb3ZpZGVyIGFzIGFueSk7XHJcblxyXG4gICAgICBtb2NrRXZlbnQuaHR0cE1ldGhvZCA9ICdQT1NUJztcclxuICAgICAgbW9ja0V2ZW50LnBhdGggPSAnL3Byb3ZpZGVycy9yZWdpc3Rlcic7XHJcbiAgICAgIG1vY2tFdmVudC5ib2R5ID0gSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIG5hbWU6ICdOZXcgSG9zcGl0YWwnLFxyXG4gICAgICAgIHR5cGU6ICdob3NwaXRhbCcsXHJcbiAgICAgICAgbG9jYXRpb246IHtcclxuICAgICAgICAgIGFkZHJlc3M6ICcxMjMgVGVzdCBTdCcsXHJcbiAgICAgICAgICBzdGF0ZTogJ0RlbGhpJyxcclxuICAgICAgICAgIGRpc3RyaWN0OiAnTmV3IERlbGhpJyxcclxuICAgICAgICAgIHBpbmNvZGU6ICcxMTAwMDEnLFxyXG4gICAgICAgICAgY29vcmRpbmF0ZXM6IHsgbGF0OiAyOC42MTM5LCBsbmc6IDc3LjIwOTAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY2FwYWJpbGl0aWVzOiB7XHJcbiAgICAgICAgICBzcGVjaWFsdGllczogWydnZW5lcmFsJ10sXHJcbiAgICAgICAgICBzZXJ2aWNlczogWydjb25zdWx0YXRpb24nXSxcclxuICAgICAgICAgIGVxdWlwbWVudDogWydiYXNpYyddLFxyXG4gICAgICAgICAgbGFuZ3VhZ2VzOiBbJ2VuZ2xpc2gnLCAnaGluZGknXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY2FwYWNpdHk6IHtcclxuICAgICAgICAgIHRvdGFsQmVkczogMTAwLFxyXG4gICAgICAgICAgYXZhaWxhYmxlQmVkczogNTAsXHJcbiAgICAgICAgICBkYWlseVBhdGllbnRDYXBhY2l0eTogMjAwLFxyXG4gICAgICAgICAgY3VycmVudExvYWQ6IDUwXHJcbiAgICAgICAgfSxcclxuICAgICAgICBxdWFsaXR5TWV0cmljczoge1xyXG4gICAgICAgICAgcmF0aW5nOiA0LjUsXHJcbiAgICAgICAgICBwYXRpZW50UmV2aWV3czogMTAwLFxyXG4gICAgICAgICAgc3VjY2Vzc1JhdGU6IDk1LFxyXG4gICAgICAgICAgYXZlcmFnZVdhaXRUaW1lOiAzMFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgY29zdFN0cnVjdHVyZToge1xyXG4gICAgICAgICAgY29uc3VsdGF0aW9uRmVlOiA1MDAsXHJcbiAgICAgICAgICBpbnN1cmFuY2VBY2NlcHRlZDogWydwdWJsaWMnXSxcclxuICAgICAgICAgIHBheW1lbnRNZXRob2RzOiBbJ2Nhc2gnLCAnY2FyZCddXHJcbiAgICAgICAgfSxcclxuICAgICAgICBhdmFpbGFiaWxpdHk6IHtcclxuICAgICAgICAgIGhvdXJzOiB7IG1vbmRheTogJzktMTcnIH0sXHJcbiAgICAgICAgICBlbWVyZ2VuY3lBdmFpbGFibGU6IHRydWUsXHJcbiAgICAgICAgICBsYXN0VXBkYXRlZDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVkZW50aWFsczoge1xyXG4gICAgICAgICAgbGljZW5zZXM6IFsnbWVkaWNhbC1saWNlbnNlLTEyMyddLFxyXG4gICAgICAgICAgY2VydGlmaWNhdGlvbnM6IFsnaG9zcGl0YWwtY2VydC00NTYnXSxcclxuICAgICAgICAgIHZlcmlmaWVkOiB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIobW9ja0V2ZW50IGFzIEFQSUdhdGV3YXlQcm94eUV2ZW50KTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSgyMDEpO1xyXG4gICAgICBleHBlY3QoSlNPTi5wYXJzZShyZXN1bHQuYm9keSkuc3VjY2VzcykudG9CZSh0cnVlKTtcclxuICAgICAgZXhwZWN0KG1vY2tQcm92aWRlckRpc2NvdmVyeVNlcnZpY2UucHJvdG90eXBlLnJlZ2lzdGVyUHJvdmlkZXIpLnRvSGF2ZUJlZW5DYWxsZWQoKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgcmV0dXJuIGVycm9yIGZvciBtaXNzaW5nIHJlcXVlc3QgYm9keScsIGFzeW5jICgpID0+IHtcclxuICAgICAgbW9ja0V2ZW50Lmh0dHBNZXRob2QgPSAnUE9TVCc7XHJcbiAgICAgIG1vY2tFdmVudC5wYXRoID0gJy9wcm92aWRlcnMvcmVnaXN0ZXInO1xyXG4gICAgICBtb2NrRXZlbnQuYm9keSA9IG51bGw7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKG1vY2tFdmVudCBhcyBBUElHYXRld2F5UHJveHlFdmVudCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNDAwKTtcclxuICAgICAgZXhwZWN0KEpTT04ucGFyc2UocmVzdWx0LmJvZHkpLnN1Y2Nlc3MpLnRvQmUoZmFsc2UpO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdDYXBhY2l0eSBNYW5hZ2VtZW50JywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgY2FwYWNpdHkgY2hlY2sgZm9yIG11bHRpcGxlIHByb3ZpZGVycycsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgbW9ja0NhcGFjaXR5SW5mbyA9IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBwcm92aWRlcklkOiAncHJvdmlkZXItMScsXHJcbiAgICAgICAgICB0b3RhbEJlZHM6IDEwMCxcclxuICAgICAgICAgIGF2YWlsYWJsZUJlZHM6IDUwLFxyXG4gICAgICAgICAgY3VycmVudExvYWQ6IDUwLFxyXG4gICAgICAgICAgZGFpbHlQYXRpZW50Q2FwYWNpdHk6IDIwMCxcclxuICAgICAgICAgIGF2YWlsYWJpbGl0eVN0YXR1czogJ2F2YWlsYWJsZScgYXMgY29uc3QsXHJcbiAgICAgICAgICBsYXN0VXBkYXRlZDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXHJcbiAgICAgICAgfVxyXG4gICAgICBdO1xyXG5cclxuICAgICAgbW9ja1Byb3ZpZGVyQ2FwYWNpdHlTZXJ2aWNlLnByb3RvdHlwZS5jaGVja0NhcGFjaXR5Lm1vY2tSZXNvbHZlZFZhbHVlKG1vY2tDYXBhY2l0eUluZm8pO1xyXG5cclxuICAgICAgbW9ja0V2ZW50LnBhdGggPSAnL3Byb3ZpZGVycy9jYXBhY2l0eSc7XHJcbiAgICAgIG1vY2tFdmVudC5xdWVyeVN0cmluZ1BhcmFtZXRlcnMgPSB7XHJcbiAgICAgICAgcHJvdmlkZXJJZHM6ICdwcm92aWRlci0xLHByb3ZpZGVyLTInXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKG1vY2tFdmVudCBhcyBBUElHYXRld2F5UHJveHlFdmVudCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcclxuICAgICAgZXhwZWN0KEpTT04ucGFyc2UocmVzdWx0LmJvZHkpLnN1Y2Nlc3MpLnRvQmUodHJ1ZSk7XHJcbiAgICAgIGV4cGVjdChtb2NrUHJvdmlkZXJDYXBhY2l0eVNlcnZpY2UucHJvdG90eXBlLmNoZWNrQ2FwYWNpdHkpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFsncHJvdmlkZXItMScsICdwcm92aWRlci0yJ10pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgY2FwYWNpdHkgdXBkYXRlJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBtb2NrUHJvdmlkZXJDYXBhY2l0eVNlcnZpY2UucHJvdG90eXBlLnVwZGF0ZUNhcGFjaXR5Lm1vY2tSZXNvbHZlZFZhbHVlKCk7XHJcblxyXG4gICAgICBtb2NrRXZlbnQuaHR0cE1ldGhvZCA9ICdQT1NUJztcclxuICAgICAgbW9ja0V2ZW50LnBhdGggPSAnL3Byb3ZpZGVycy9jYXBhY2l0eS91cGRhdGUnO1xyXG4gICAgICBtb2NrRXZlbnQuYm9keSA9IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBwcm92aWRlcklkOiAncHJvdmlkZXItMScsXHJcbiAgICAgICAgY3VycmVudExvYWQ6IDc1LFxyXG4gICAgICAgIGF2YWlsYWJsZUJlZHM6IDI1XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihtb2NrRXZlbnQgYXMgQVBJR2F0ZXdheVByb3h5RXZlbnQpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDIwMCk7XHJcbiAgICAgIGV4cGVjdChKU09OLnBhcnNlKHJlc3VsdC5ib2R5KS5zdWNjZXNzKS50b0JlKHRydWUpO1xyXG4gICAgICBleHBlY3QobW9ja1Byb3ZpZGVyQ2FwYWNpdHlTZXJ2aWNlLnByb3RvdHlwZS51cGRhdGVDYXBhY2l0eSkudG9IYXZlQmVlbkNhbGxlZFdpdGgoe1xyXG4gICAgICAgIHByb3ZpZGVySWQ6ICdwcm92aWRlci0xJyxcclxuICAgICAgICBjdXJyZW50TG9hZDogNzUsXHJcbiAgICAgICAgYXZhaWxhYmxlQmVkczogMjVcclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ0luZGl2aWR1YWwgUHJvdmlkZXIgT3BlcmF0aW9ucycsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgZ2V0IHByb3ZpZGVyIGJ5IElEJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBtb2NrUHJvdmlkZXIgPSB7XHJcbiAgICAgICAgcHJvdmlkZXJJZDogJ3Byb3ZpZGVyLTEnLFxyXG4gICAgICAgIG5hbWU6ICdUZXN0IEhvc3BpdGFsJyxcclxuICAgICAgICB0eXBlOiAnaG9zcGl0YWwnXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBtb2NrUHJvdmlkZXJEaXNjb3ZlcnlTZXJ2aWNlLnByb3RvdHlwZS5nZXRQcm92aWRlci5tb2NrUmVzb2x2ZWRWYWx1ZShtb2NrUHJvdmlkZXIgYXMgYW55KTtcclxuXHJcbiAgICAgIG1vY2tFdmVudC5wYXRoUGFyYW1ldGVycyA9IHsgcHJvdmlkZXJJZDogJ3Byb3ZpZGVyLTEnIH07XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKG1vY2tFdmVudCBhcyBBUElHYXRld2F5UHJveHlFdmVudCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcclxuICAgICAgZXhwZWN0KEpTT04ucGFyc2UocmVzdWx0LmJvZHkpLnN1Y2Nlc3MpLnRvQmUodHJ1ZSk7XHJcbiAgICAgIGV4cGVjdChtb2NrUHJvdmlkZXJEaXNjb3ZlcnlTZXJ2aWNlLnByb3RvdHlwZS5nZXRQcm92aWRlcikudG9IYXZlQmVlbkNhbGxlZFdpdGgoJ3Byb3ZpZGVyLTEnKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgcmV0dXJuIDQwNCBmb3Igbm9uLWV4aXN0ZW50IHByb3ZpZGVyJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBtb2NrUHJvdmlkZXJEaXNjb3ZlcnlTZXJ2aWNlLnByb3RvdHlwZS5nZXRQcm92aWRlci5tb2NrUmVzb2x2ZWRWYWx1ZShudWxsKTtcclxuXHJcbiAgICAgIG1vY2tFdmVudC5wYXRoUGFyYW1ldGVycyA9IHsgcHJvdmlkZXJJZDogJ25vbi1leGlzdGVudCcgfTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIobW9ja0V2ZW50IGFzIEFQSUdhdGV3YXlQcm94eUV2ZW50KTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSg0MDQpO1xyXG4gICAgICBleHBlY3QoSlNPTi5wYXJzZShyZXN1bHQuYm9keSkuc3VjY2VzcykudG9CZShmYWxzZSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIHVwZGF0ZSBwcm92aWRlcicsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgbW9ja1VwZGF0ZWRQcm92aWRlciA9IHtcclxuICAgICAgICBwcm92aWRlcklkOiAncHJvdmlkZXItMScsXHJcbiAgICAgICAgbmFtZTogJ1VwZGF0ZWQgSG9zcGl0YWwnLFxyXG4gICAgICAgIHR5cGU6ICdob3NwaXRhbCdcclxuICAgICAgfTtcclxuXHJcbiAgICAgIG1vY2tQcm92aWRlckRpc2NvdmVyeVNlcnZpY2UucHJvdG90eXBlLnVwZGF0ZVByb3ZpZGVyLm1vY2tSZXNvbHZlZFZhbHVlKG1vY2tVcGRhdGVkUHJvdmlkZXIgYXMgYW55KTtcclxuXHJcbiAgICAgIG1vY2tFdmVudC5odHRwTWV0aG9kID0gJ1BVVCc7XHJcbiAgICAgIG1vY2tFdmVudC5wYXRoUGFyYW1ldGVycyA9IHsgcHJvdmlkZXJJZDogJ3Byb3ZpZGVyLTEnIH07XHJcbiAgICAgIG1vY2tFdmVudC5ib2R5ID0gSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIG5hbWU6ICdVcGRhdGVkIEhvc3BpdGFsJ1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIobW9ja0V2ZW50IGFzIEFQSUdhdGV3YXlQcm94eUV2ZW50KTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSgyMDApO1xyXG4gICAgICBleHBlY3QoSlNPTi5wYXJzZShyZXN1bHQuYm9keSkuc3VjY2VzcykudG9CZSh0cnVlKTtcclxuICAgICAgZXhwZWN0KG1vY2tQcm92aWRlckRpc2NvdmVyeVNlcnZpY2UucHJvdG90eXBlLnVwZGF0ZVByb3ZpZGVyKS50b0hhdmVCZWVuQ2FsbGVkV2l0aCgncHJvdmlkZXItMScsIHtcclxuICAgICAgICBuYW1lOiAnVXBkYXRlZCBIb3NwaXRhbCdcclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ0Vycm9yIEhhbmRsaW5nJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgc2VydmljZSBlcnJvcnMgZ3JhY2VmdWxseScsIGFzeW5jICgpID0+IHtcclxuICAgICAgbW9ja1Byb3ZpZGVyRGlzY292ZXJ5U2VydmljZS5wcm90b3R5cGUuc2VhcmNoUHJvdmlkZXJzLm1vY2tSZWplY3RlZFZhbHVlKG5ldyBFcnJvcignRGF0YWJhc2UgZXJyb3InKSk7XHJcblxyXG4gICAgICBtb2NrRXZlbnQucGF0aCA9ICcvcHJvdmlkZXJzL3NlYXJjaCc7XHJcbiAgICAgIG1vY2tFdmVudC5xdWVyeVN0cmluZ1BhcmFtZXRlcnMgPSB7IHR5cGU6ICdob3NwaXRhbCcgfTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIobW9ja0V2ZW50IGFzIEFQSUdhdGV3YXlQcm94eUV2ZW50KTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSg1MDApO1xyXG4gICAgICBleHBlY3QoSlNPTi5wYXJzZShyZXN1bHQuYm9keSkuc3VjY2VzcykudG9CZShmYWxzZSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIHJldHVybiA0MDUgZm9yIHVuc3VwcG9ydGVkIG1ldGhvZHMnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIG1vY2tFdmVudC5odHRwTWV0aG9kID0gJ0RFTEVURSc7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKG1vY2tFdmVudCBhcyBBUElHYXRld2F5UHJveHlFdmVudCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNDA1KTtcclxuICAgICAgZXhwZWN0KEpTT04ucGFyc2UocmVzdWx0LmJvZHkpLnN1Y2Nlc3MpLnRvQmUoZmFsc2UpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gNDA0IGZvciB1bmtub3duIGVuZHBvaW50cycsIGFzeW5jICgpID0+IHtcclxuICAgICAgbW9ja0V2ZW50LnBhdGggPSAnL3Byb3ZpZGVycy91bmtub3duJztcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIobW9ja0V2ZW50IGFzIEFQSUdhdGV3YXlQcm94eUV2ZW50KTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSg0MDQpO1xyXG4gICAgICBleHBlY3QoSlNPTi5wYXJzZShyZXN1bHQuYm9keSkuc3VjY2VzcykudG9CZShmYWxzZSk7XHJcbiAgICB9KTtcclxuICB9KTtcclxufSk7XHJcbiJdfQ==