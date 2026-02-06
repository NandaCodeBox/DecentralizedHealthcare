"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const provider_discovery_service_1 = require("../provider-discovery-service");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const enums_1 = require("../../../types/enums");
// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');
const mockDynamoClient = {
    send: jest.fn()
};
jest.mocked(lib_dynamodb_1.DynamoDBDocumentClient.from).mockReturnValue(mockDynamoClient);
describe('ProviderDiscoveryService', () => {
    let service;
    beforeEach(() => {
        jest.clearAllMocks();
        service = new provider_discovery_service_1.ProviderDiscoveryService();
        process.env.PROVIDER_TABLE_NAME = 'test-providers-table';
    });
    describe('registerProvider', () => {
        it('should register a new provider successfully', async () => {
            const input = {
                type: enums_1.ProviderType.HOSPITAL,
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
            expect(mockDynamoClient.send).toHaveBeenCalledWith(expect.objectContaining({
                input: expect.objectContaining({
                    TableName: 'test-providers-table',
                    Item: expect.objectContaining({
                        providerId: expect.any(String),
                        name: 'Test Hospital',
                        type: enums_1.ProviderType.HOSPITAL,
                        isActive: true
                    })
                })
            }));
        });
        it('should throw error for invalid provider data', async () => {
            const invalidInput = {
                type: 'invalid-type',
                name: ''
            };
            await expect(service.registerProvider(invalidInput)).rejects.toThrow('Invalid provider data');
        });
    });
    describe('getProvider', () => {
        it('should return provider when found', async () => {
            const mockProvider = {
                providerId: 'provider-1',
                type: enums_1.ProviderType.HOSPITAL,
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
            expect(mockDynamoClient.send).toHaveBeenCalledWith(expect.objectContaining({
                input: expect.objectContaining({
                    TableName: 'test-providers-table',
                    Key: { providerId: 'provider-1' }
                })
            }));
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
                    type: enums_1.ProviderType.HOSPITAL,
                    name: 'Hospital 1',
                    isActive: true
                },
                {
                    providerId: 'provider-2',
                    type: enums_1.ProviderType.HOSPITAL,
                    name: 'Hospital 2',
                    isActive: true
                }
            ];
            mockDynamoClient.send.mockResolvedValue({ Items: mockProviders });
            const criteria = {
                type: enums_1.ProviderType.HOSPITAL
            };
            const result = await service.searchProviders(criteria);
            expect(result).toEqual(mockProviders);
            expect(mockDynamoClient.send).toHaveBeenCalledWith(expect.objectContaining({
                input: expect.objectContaining({
                    TableName: 'test-providers-table',
                    IndexName: 'TypeAvailabilityIndex',
                    KeyConditionExpression: '#type = :type AND #isActive = :isActive'
                })
            }));
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
            const criteria = {
                specialties: ['cardiology']
            };
            const result = await service.searchProviders(criteria);
            expect(result).toEqual(mockProviders);
            expect(mockDynamoClient.send).toHaveBeenCalledWith(expect.objectContaining({
                input: expect.objectContaining({
                    TableName: 'test-providers-table',
                    IndexName: 'SpecialtyIndex',
                    KeyConditionExpression: '#primarySpecialty = :specialty'
                })
            }));
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
            const criteria = {
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
            const criteria = {
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
                type: enums_1.ProviderType.HOSPITAL
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
            expect(mockDynamoClient.send).toHaveBeenCalledWith(expect.objectContaining({
                input: expect.objectContaining({
                    TableName: 'test-providers-table',
                    Limit: 10,
                    ExclusiveStartKey: { providerId: 'provider-0' }
                })
            }));
        });
    });
    describe('Error Handling', () => {
        it('should handle DynamoDB errors gracefully', async () => {
            mockDynamoClient.send.mockRejectedValue(new Error('DynamoDB error'));
            await expect(service.getProvider('provider-1')).rejects.toThrow('Failed to get provider');
        });
        it('should handle validation errors', async () => {
            const invalidInput = {};
            await expect(service.registerProvider(invalidInput)).rejects.toThrow('Invalid provider data');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvdmlkZXItZGlzY292ZXJ5LXNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9sYW1iZGEvcHJvdmlkZXItZGlzY292ZXJ5L19fdGVzdHNfXy9wcm92aWRlci1kaXNjb3Zlcnktc2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsOEVBQXlFO0FBQ3pFLHdEQUErRDtBQUUvRCxnREFBb0Q7QUFFcEQsZUFBZTtBQUNmLElBQUksQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsQ0FBQztBQUN0QyxJQUFJLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUM7QUFFbkMsTUFBTSxnQkFBZ0IsR0FBRztJQUN2QixJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtDQUNoQixDQUFDO0FBRUYsSUFBSSxDQUFDLE1BQU0sQ0FBQyxxQ0FBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsZ0JBQXVCLENBQUMsQ0FBQztBQUVsRixRQUFRLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFO0lBQ3hDLElBQUksT0FBaUMsQ0FBQztJQUV0QyxVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2QsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3JCLE9BQU8sR0FBRyxJQUFJLHFEQUF3QixFQUFFLENBQUM7UUFDekMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsR0FBRyxzQkFBc0IsQ0FBQztJQUMzRCxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7UUFDaEMsRUFBRSxDQUFDLDZDQUE2QyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzNELE1BQU0sS0FBSyxHQUF3QjtnQkFDakMsSUFBSSxFQUFFLG9CQUFZLENBQUMsUUFBUTtnQkFDM0IsSUFBSSxFQUFFLGVBQWU7Z0JBQ3JCLFFBQVEsRUFBRTtvQkFFUixLQUFLLEVBQUUsT0FBTztvQkFDZCxRQUFRLEVBQUUsV0FBVztvQkFDckIsT0FBTyxFQUFFLFFBQVE7b0JBQ2pCLFdBQVcsRUFBRSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRTtpQkFDNUM7Z0JBQ0QsWUFBWSxFQUFFO29CQUNaLFdBQVcsRUFBRSxDQUFDLFNBQVMsRUFBRSxXQUFXLENBQUM7b0JBQ3JDLFFBQVEsRUFBRSxDQUFDLGNBQWMsRUFBRSxTQUFTLENBQUM7b0JBQ3JDLFNBQVMsRUFBRSxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUM7b0JBQzdCLFNBQVMsRUFBRSxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUM7aUJBQ2hDO2dCQUNELFFBQVEsRUFBRTtvQkFDUixTQUFTLEVBQUUsR0FBRztvQkFDZCxhQUFhLEVBQUUsRUFBRTtvQkFDakIsb0JBQW9CLEVBQUUsR0FBRztvQkFDekIsV0FBVyxFQUFFLEVBQUU7aUJBQ2hCO2dCQUNELGNBQWMsRUFBRTtvQkFDZCxNQUFNLEVBQUUsR0FBRztvQkFDWCxjQUFjLEVBQUUsR0FBRztvQkFDbkIsV0FBVyxFQUFFLEVBQUU7b0JBQ2YsZUFBZSxFQUFFLEVBQUU7aUJBQ3BCO2dCQUNELGFBQWEsRUFBRTtvQkFDYixlQUFlLEVBQUUsR0FBRztvQkFDcEIsaUJBQWlCLEVBQUUsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDO29CQUN4QyxjQUFjLEVBQUUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLFdBQVcsQ0FBQztpQkFDOUM7Z0JBQ0QsWUFBWSxFQUFFO29CQUNaLEtBQUssRUFBRSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRTtvQkFDMUMsa0JBQWtCLEVBQUUsSUFBSTtvQkFDeEIsV0FBVyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2lCQUN0QztnQkFDRCxXQUFXLEVBQUU7b0JBQ1gsUUFBUSxFQUFFLENBQUMscUJBQXFCLENBQUM7b0JBQ2pDLGNBQWMsRUFBRSxDQUFDLG1CQUFtQixDQUFDO29CQUNyQyxRQUFRLEVBQUUsSUFBSTtpQkFDZjthQUNGLENBQUM7WUFFRixnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDLENBQUM7WUFFNUMsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFckQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLGFBQWEsQ0FBQztnQkFDM0IsR0FBRyxLQUFLO2dCQUNSLFFBQVEsRUFBRSxJQUFJO2FBQ2YsQ0FBQyxDQUFDO1lBQ0gsTUFBTSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN4QyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3ZDLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdkMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLG9CQUFvQixDQUNoRCxNQUFNLENBQUMsZ0JBQWdCLENBQUM7Z0JBQ3RCLEtBQUssRUFBRSxNQUFNLENBQUMsZ0JBQWdCLENBQUM7b0JBQzdCLFNBQVMsRUFBRSxzQkFBc0I7b0JBQ2pDLElBQUksRUFBRSxNQUFNLENBQUMsZ0JBQWdCLENBQUM7d0JBQzVCLFVBQVUsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQzt3QkFDOUIsSUFBSSxFQUFFLGVBQWU7d0JBQ3JCLElBQUksRUFBRSxvQkFBWSxDQUFDLFFBQVE7d0JBQzNCLFFBQVEsRUFBRSxJQUFJO3FCQUNmLENBQUM7aUJBQ0gsQ0FBQzthQUNILENBQUMsQ0FDSCxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsOENBQThDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDNUQsTUFBTSxZQUFZLEdBQUc7Z0JBQ25CLElBQUksRUFBRSxjQUFjO2dCQUNwQixJQUFJLEVBQUUsRUFBRTthQUNGLENBQUM7WUFFVCxNQUFNLE1BQU0sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLHVCQUF1QixDQUFDLENBQUM7UUFDaEcsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO1FBQzNCLEVBQUUsQ0FBQyxtQ0FBbUMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUNqRCxNQUFNLFlBQVksR0FBYTtnQkFDN0IsVUFBVSxFQUFFLFlBQVk7Z0JBQ3hCLElBQUksRUFBRSxvQkFBWSxDQUFDLFFBQVE7Z0JBQzNCLElBQUksRUFBRSxlQUFlO2dCQUNyQixRQUFRLEVBQUU7b0JBRVIsS0FBSyxFQUFFLE9BQU87b0JBQ2QsUUFBUSxFQUFFLFdBQVc7b0JBQ3JCLE9BQU8sRUFBRSxRQUFRO29CQUNqQixXQUFXLEVBQUUsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUU7aUJBQzVDO2dCQUNELFlBQVksRUFBRTtvQkFDWixXQUFXLEVBQUUsQ0FBQyxTQUFTLENBQUM7b0JBQ3hCLFFBQVEsRUFBRSxDQUFDLGNBQWMsQ0FBQztvQkFDMUIsU0FBUyxFQUFFLENBQUMsT0FBTyxDQUFDO29CQUNwQixTQUFTLEVBQUUsQ0FBQyxTQUFTLENBQUM7aUJBQ3ZCO2dCQUNELFFBQVEsRUFBRTtvQkFDUixTQUFTLEVBQUUsR0FBRztvQkFDZCxhQUFhLEVBQUUsRUFBRTtvQkFDakIsb0JBQW9CLEVBQUUsR0FBRztvQkFDekIsV0FBVyxFQUFFLEVBQUU7aUJBQ2hCO2dCQUNELGNBQWMsRUFBRTtvQkFDZCxNQUFNLEVBQUUsR0FBRztvQkFDWCxjQUFjLEVBQUUsR0FBRztvQkFDbkIsV0FBVyxFQUFFLEVBQUU7b0JBQ2YsZUFBZSxFQUFFLEVBQUU7aUJBQ3BCO2dCQUNELGFBQWEsRUFBRTtvQkFDYixlQUFlLEVBQUUsR0FBRztvQkFDcEIsaUJBQWlCLEVBQUUsQ0FBQyxRQUFRLENBQUM7b0JBQzdCLGNBQWMsRUFBRSxDQUFDLE1BQU0sQ0FBQztpQkFDekI7Z0JBQ0QsWUFBWSxFQUFFO29CQUNaLEtBQUssRUFBRSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUU7b0JBQ3pCLGtCQUFrQixFQUFFLElBQUk7b0JBQ3hCLFdBQVcsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtpQkFDdEM7Z0JBQ0QsV0FBVyxFQUFFO29CQUNYLFFBQVEsRUFBRSxDQUFDLGFBQWEsQ0FBQztvQkFDekIsY0FBYyxFQUFFLENBQUMsVUFBVSxDQUFDO29CQUM1QixRQUFRLEVBQUUsSUFBSTtpQkFDZjtnQkFDRCxRQUFRLEVBQUUsSUFBSTtnQkFDZCxTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7Z0JBQ25DLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTthQUNwQyxDQUFDO1lBRUYsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxDQUFDLENBQUM7WUFFaEUsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBRXZELE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDckMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLG9CQUFvQixDQUNoRCxNQUFNLENBQUMsZ0JBQWdCLENBQUM7Z0JBQ3RCLEtBQUssRUFBRSxNQUFNLENBQUMsZ0JBQWdCLENBQUM7b0JBQzdCLFNBQVMsRUFBRSxzQkFBc0I7b0JBQ2pDLEdBQUcsRUFBRSxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUU7aUJBQ2xDLENBQUM7YUFDSCxDQUFDLENBQ0gsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLDRDQUE0QyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzFELGdCQUFnQixDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDO1lBRTdELE1BQU0sTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLFdBQVcsQ0FBQyxjQUFjLENBQUMsQ0FBQztZQUV6RCxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDNUIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7UUFDL0IsRUFBRSxDQUFDLGlDQUFpQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQy9DLE1BQU0sYUFBYSxHQUFHO2dCQUNwQjtvQkFDRSxVQUFVLEVBQUUsWUFBWTtvQkFDeEIsSUFBSSxFQUFFLG9CQUFZLENBQUMsUUFBUTtvQkFDM0IsSUFBSSxFQUFFLFlBQVk7b0JBQ2xCLFFBQVEsRUFBRSxJQUFJO2lCQUNmO2dCQUNEO29CQUNFLFVBQVUsRUFBRSxZQUFZO29CQUN4QixJQUFJLEVBQUUsb0JBQVksQ0FBQyxRQUFRO29CQUMzQixJQUFJLEVBQUUsWUFBWTtvQkFDbEIsUUFBUSxFQUFFLElBQUk7aUJBQ2Y7YUFDRixDQUFDO1lBRUYsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsS0FBSyxFQUFFLGFBQWEsRUFBRSxDQUFDLENBQUM7WUFFbEUsTUFBTSxRQUFRLEdBQTJCO2dCQUN2QyxJQUFJLEVBQUUsb0JBQVksQ0FBQyxRQUFRO2FBQzVCLENBQUM7WUFFRixNQUFNLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUM7WUFFdkQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUN0QyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsb0JBQW9CLENBQ2hELE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQztnQkFDdEIsS0FBSyxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQztvQkFDN0IsU0FBUyxFQUFFLHNCQUFzQjtvQkFDakMsU0FBUyxFQUFFLHVCQUF1QjtvQkFDbEMsc0JBQXNCLEVBQUUseUNBQXlDO2lCQUNsRSxDQUFDO2FBQ0gsQ0FBQyxDQUNILENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQyxzQ0FBc0MsRUFBRSxLQUFLLElBQUksRUFBRTtZQUNwRCxNQUFNLGFBQWEsR0FBRztnQkFDcEI7b0JBQ0UsVUFBVSxFQUFFLFlBQVk7b0JBQ3hCLFlBQVksRUFBRSxFQUFFLFdBQVcsRUFBRSxDQUFDLFlBQVksQ0FBQyxFQUFFO29CQUM3QyxRQUFRLEVBQUUsSUFBSTtpQkFDZjthQUNGLENBQUM7WUFFRixnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQztZQUVsRSxNQUFNLFFBQVEsR0FBMkI7Z0JBQ3ZDLFdBQVcsRUFBRSxDQUFDLFlBQVksQ0FBQzthQUM1QixDQUFDO1lBRUYsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRXZELE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDdEMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLG9CQUFvQixDQUNoRCxNQUFNLENBQUMsZ0JBQWdCLENBQUM7Z0JBQ3RCLEtBQUssRUFBRSxNQUFNLENBQUMsZ0JBQWdCLENBQUM7b0JBQzdCLFNBQVMsRUFBRSxzQkFBc0I7b0JBQ2pDLFNBQVMsRUFBRSxnQkFBZ0I7b0JBQzNCLHNCQUFzQixFQUFFLGdDQUFnQztpQkFDekQsQ0FBQzthQUNILENBQUMsQ0FDSCxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsOENBQThDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDNUQsTUFBTSxhQUFhLEdBQUc7Z0JBQ3BCO29CQUNFLFVBQVUsRUFBRSxZQUFZO29CQUN4QixRQUFRLEVBQUUsRUFBRSxXQUFXLEVBQUUsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsRUFBRTtvQkFDekQsUUFBUSxFQUFFLElBQUk7aUJBQ2Y7Z0JBQ0Q7b0JBQ0UsVUFBVSxFQUFFLFlBQVk7b0JBQ3hCLFFBQVEsRUFBRSxFQUFFLFdBQVcsRUFBRSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsYUFBYTtvQkFDeEUsUUFBUSxFQUFFLElBQUk7aUJBQ2Y7YUFDRixDQUFDO1lBRUYsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsS0FBSyxFQUFFLGFBQWEsRUFBRSxDQUFDLENBQUM7WUFFbEUsTUFBTSxRQUFRLEdBQTJCO2dCQUN2QyxRQUFRLEVBQUU7b0JBQ1IsV0FBVyxFQUFFLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFO29CQUMzQyxXQUFXLEVBQUUsRUFBRSxDQUFDLGNBQWM7aUJBQy9CO2FBQ0YsQ0FBQztZQUVGLE1BQU0sTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUV2RCxzREFBc0Q7WUFDdEQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMvQixNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNsRCxDQUFDLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQywyQ0FBMkMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUN6RCxNQUFNLGFBQWEsR0FBRztnQkFDcEI7b0JBQ0UsVUFBVSxFQUFFLFlBQVk7b0JBQ3hCLFFBQVEsRUFBRSxFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQUU7b0JBQzdCLGFBQWEsRUFBRSxFQUFFLGVBQWUsRUFBRSxHQUFHLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRTtvQkFDdEUsY0FBYyxFQUFFLEVBQUUsTUFBTSxFQUFFLEdBQUcsRUFBRTtvQkFDL0IsWUFBWSxFQUFFLEVBQUUsU0FBUyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUU7b0JBQ3hDLFFBQVEsRUFBRSxJQUFJO2lCQUNmO2dCQUNEO29CQUNFLFVBQVUsRUFBRSxZQUFZO29CQUN4QixRQUFRLEVBQUUsRUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFFLEVBQUUsV0FBVztvQkFDMUMsYUFBYSxFQUFFLEVBQUUsZUFBZSxFQUFFLEdBQUcsRUFBRSxpQkFBaUIsRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFO29CQUN0RSxjQUFjLEVBQUUsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFO29CQUMvQixZQUFZLEVBQUUsRUFBRSxTQUFTLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRTtvQkFDeEMsUUFBUSxFQUFFLElBQUk7aUJBQ2Y7YUFDRixDQUFDO1lBRUYsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsS0FBSyxFQUFFLGFBQWEsRUFBRSxDQUFDLENBQUM7WUFFbEUsTUFBTSxRQUFRLEdBQTJCO2dCQUN2QyxZQUFZLEVBQUUsSUFBSTtnQkFDbEIsT0FBTyxFQUFFLEdBQUc7Z0JBQ1osU0FBUyxFQUFFLEdBQUc7Z0JBQ2QsZ0JBQWdCLEVBQUUsQ0FBQyxRQUFRLENBQUM7Z0JBQzVCLFNBQVMsRUFBRSxDQUFDLFNBQVMsQ0FBQzthQUN2QixDQUFDO1lBRUYsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRXZELHlEQUF5RDtZQUN6RCxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQy9CLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ2xELENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO1FBQzlCLEVBQUUsQ0FBQyxxQ0FBcUMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUNuRCxNQUFNLGdCQUFnQixHQUFHO2dCQUN2QixVQUFVLEVBQUUsWUFBWTtnQkFDeEIsSUFBSSxFQUFFLFVBQVU7Z0JBQ2hCLElBQUksRUFBRSxvQkFBWSxDQUFDLFFBQVE7YUFDNUIsQ0FBQztZQUVGLE1BQU0sZUFBZSxHQUFHO2dCQUN0QixHQUFHLGdCQUFnQjtnQkFDbkIsSUFBSSxFQUFFLFVBQVU7Z0JBQ2hCLFNBQVMsRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQzthQUM5QixDQUFDO1lBRUYsd0JBQXdCO1lBQ3hCLGdCQUFnQixDQUFDLElBQUk7aUJBQ2xCLHFCQUFxQixDQUFDLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLENBQUMsQ0FBQyxjQUFjO2lCQUNoRSxxQkFBcUIsQ0FBQyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsQ0FBQyxDQUFDLENBQUMsaUJBQWlCO1lBRTVFLE1BQU0sTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLGNBQWMsQ0FBQyxZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQztZQUVoRixNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsYUFBYSxDQUFDLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUM7WUFDbkQsTUFBTSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pELENBQUMsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLDhDQUE4QyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzVELGdCQUFnQixDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDO1lBRTdELE1BQU0sTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLGNBQWMsQ0FBQyxjQUFjLEVBQUUsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQztZQUVsRixNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDNUIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO1FBQzdCLEVBQUUsQ0FBQyx1Q0FBdUMsRUFBRSxLQUFLLElBQUksRUFBRTtZQUNyRCxNQUFNLGFBQWEsR0FBRztnQkFDcEIsRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUU7Z0JBQzVDLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFO2FBQzdDLENBQUM7WUFFRixnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUM7Z0JBQ3RDLEtBQUssRUFBRSxhQUFhO2dCQUNwQixnQkFBZ0IsRUFBRSxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUU7YUFDL0MsQ0FBQyxDQUFDO1lBRUgsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsYUFBYSxDQUFDLEVBQUUsRUFBRSxZQUFZLENBQUMsQ0FBQztZQUU3RCxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUNoRCxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUMxQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUMsb0JBQW9CLENBQ2hELE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQztnQkFDdEIsS0FBSyxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQztvQkFDN0IsU0FBUyxFQUFFLHNCQUFzQjtvQkFDakMsS0FBSyxFQUFFLEVBQUU7b0JBQ1QsaUJBQWlCLEVBQUUsRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFO2lCQUNoRCxDQUFDO2FBQ0gsQ0FBQyxDQUNILENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBRUgsUUFBUSxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtRQUM5QixFQUFFLENBQUMsMENBQTBDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDeEQsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQztZQUVyRSxNQUFNLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO1FBQzVGLENBQUMsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLGlDQUFpQyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQy9DLE1BQU0sWUFBWSxHQUFHLEVBQXlCLENBQUM7WUFFL0MsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1FBQ2hHLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFByb3ZpZGVyRGlzY292ZXJ5U2VydmljZSB9IGZyb20gJy4uL3Byb3ZpZGVyLWRpc2NvdmVyeS1zZXJ2aWNlJztcclxuaW1wb3J0IHsgRHluYW1vREJEb2N1bWVudENsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XHJcbmltcG9ydCB7IFByb3ZpZGVyLCBDcmVhdGVQcm92aWRlcklucHV0LCBQcm92aWRlclNlYXJjaENyaXRlcmlhIH0gZnJvbSAnLi4vLi4vLi4vdHlwZXMvcHJvdmlkZXInO1xyXG5pbXBvcnQgeyBQcm92aWRlclR5cGUgfSBmcm9tICcuLi8uLi8uLi90eXBlcy9lbnVtcyc7XHJcblxyXG4vLyBNb2NrIEFXUyBTREtcclxuamVzdC5tb2NrKCdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInKTtcclxuamVzdC5tb2NrKCdAYXdzLXNkay9saWItZHluYW1vZGInKTtcclxuXHJcbmNvbnN0IG1vY2tEeW5hbW9DbGllbnQgPSB7XHJcbiAgc2VuZDogamVzdC5mbigpXHJcbn07XHJcblxyXG5qZXN0Lm1vY2tlZChEeW5hbW9EQkRvY3VtZW50Q2xpZW50LmZyb20pLm1vY2tSZXR1cm5WYWx1ZShtb2NrRHluYW1vQ2xpZW50IGFzIGFueSk7XHJcblxyXG5kZXNjcmliZSgnUHJvdmlkZXJEaXNjb3ZlcnlTZXJ2aWNlJywgKCkgPT4ge1xyXG4gIGxldCBzZXJ2aWNlOiBQcm92aWRlckRpc2NvdmVyeVNlcnZpY2U7XHJcblxyXG4gIGJlZm9yZUVhY2goKCkgPT4ge1xyXG4gICAgamVzdC5jbGVhckFsbE1vY2tzKCk7XHJcbiAgICBzZXJ2aWNlID0gbmV3IFByb3ZpZGVyRGlzY292ZXJ5U2VydmljZSgpO1xyXG4gICAgcHJvY2Vzcy5lbnYuUFJPVklERVJfVEFCTEVfTkFNRSA9ICd0ZXN0LXByb3ZpZGVycy10YWJsZSc7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdyZWdpc3RlclByb3ZpZGVyJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCByZWdpc3RlciBhIG5ldyBwcm92aWRlciBzdWNjZXNzZnVsbHknLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGlucHV0OiBDcmVhdGVQcm92aWRlcklucHV0ID0ge1xyXG4gICAgICAgIHR5cGU6IFByb3ZpZGVyVHlwZS5IT1NQSVRBTCxcclxuICAgICAgICBuYW1lOiAnVGVzdCBIb3NwaXRhbCcsXHJcbiAgICAgICAgbG9jYXRpb246IHtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgc3RhdGU6ICdEZWxoaScsXHJcbiAgICAgICAgICBkaXN0cmljdDogJ05ldyBEZWxoaScsXHJcbiAgICAgICAgICBwaW5jb2RlOiAnMTEwMDAxJyxcclxuICAgICAgICAgIGNvb3JkaW5hdGVzOiB7IGxhdDogMjguNjEzOSwgbG5nOiA3Ny4yMDkwIH1cclxuICAgICAgICB9LFxyXG4gICAgICAgIGNhcGFiaWxpdGllczoge1xyXG4gICAgICAgICAgc3BlY2lhbHRpZXM6IFsnZ2VuZXJhbCcsICdlbWVyZ2VuY3knXSxcclxuICAgICAgICAgIHNlcnZpY2VzOiBbJ2NvbnN1bHRhdGlvbicsICdzdXJnZXJ5J10sXHJcbiAgICAgICAgICBlcXVpcG1lbnQ6IFsnbXJpJywgJ2N0LXNjYW4nXSxcclxuICAgICAgICAgIGxhbmd1YWdlczogWydlbmdsaXNoJywgJ2hpbmRpJ11cclxuICAgICAgICB9LFxyXG4gICAgICAgIGNhcGFjaXR5OiB7XHJcbiAgICAgICAgICB0b3RhbEJlZHM6IDEwMCxcclxuICAgICAgICAgIGF2YWlsYWJsZUJlZHM6IDUwLFxyXG4gICAgICAgICAgZGFpbHlQYXRpZW50Q2FwYWNpdHk6IDIwMCxcclxuICAgICAgICAgIGN1cnJlbnRMb2FkOiA1MFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgcXVhbGl0eU1ldHJpY3M6IHtcclxuICAgICAgICAgIHJhdGluZzogNC41LFxyXG4gICAgICAgICAgcGF0aWVudFJldmlld3M6IDEwMCxcclxuICAgICAgICAgIHN1Y2Nlc3NSYXRlOiA5NSxcclxuICAgICAgICAgIGF2ZXJhZ2VXYWl0VGltZTogMzBcclxuICAgICAgICB9LFxyXG4gICAgICAgIGNvc3RTdHJ1Y3R1cmU6IHtcclxuICAgICAgICAgIGNvbnN1bHRhdGlvbkZlZTogNTAwLFxyXG4gICAgICAgICAgaW5zdXJhbmNlQWNjZXB0ZWQ6IFsncHVibGljJywgJ3ByaXZhdGUnXSxcclxuICAgICAgICAgIHBheW1lbnRNZXRob2RzOiBbJ2Nhc2gnLCAnY2FyZCcsICdpbnN1cmFuY2UnXVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYXZhaWxhYmlsaXR5OiB7XHJcbiAgICAgICAgICBob3VyczogeyBtb25kYXk6ICc5LTE3JywgdHVlc2RheTogJzktMTcnIH0sXHJcbiAgICAgICAgICBlbWVyZ2VuY3lBdmFpbGFibGU6IHRydWUsXHJcbiAgICAgICAgICBsYXN0VXBkYXRlZDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVkZW50aWFsczoge1xyXG4gICAgICAgICAgbGljZW5zZXM6IFsnbWVkaWNhbC1saWNlbnNlLTEyMyddLFxyXG4gICAgICAgICAgY2VydGlmaWNhdGlvbnM6IFsnaG9zcGl0YWwtY2VydC00NTYnXSxcclxuICAgICAgICAgIHZlcmlmaWVkOiB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgbW9ja0R5bmFtb0NsaWVudC5zZW5kLm1vY2tSZXNvbHZlZFZhbHVlKHt9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNlcnZpY2UucmVnaXN0ZXJQcm92aWRlcihpbnB1dCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0KS50b01hdGNoT2JqZWN0KHtcclxuICAgICAgICAuLi5pbnB1dCxcclxuICAgICAgICBpc0FjdGl2ZTogdHJ1ZVxyXG4gICAgICB9KTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC5wcm92aWRlcklkKS50b0JlRGVmaW5lZCgpO1xyXG4gICAgICBleHBlY3QocmVzdWx0LmNyZWF0ZWRBdCkudG9CZURlZmluZWQoKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC51cGRhdGVkQXQpLnRvQmVEZWZpbmVkKCk7XHJcbiAgICAgIGV4cGVjdChtb2NrRHluYW1vQ2xpZW50LnNlbmQpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxyXG4gICAgICAgIGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcclxuICAgICAgICAgIGlucHV0OiBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XHJcbiAgICAgICAgICAgIFRhYmxlTmFtZTogJ3Rlc3QtcHJvdmlkZXJzLXRhYmxlJyxcclxuICAgICAgICAgICAgSXRlbTogZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgICAgIHByb3ZpZGVySWQ6IGV4cGVjdC5hbnkoU3RyaW5nKSxcclxuICAgICAgICAgICAgICBuYW1lOiAnVGVzdCBIb3NwaXRhbCcsXHJcbiAgICAgICAgICAgICAgdHlwZTogUHJvdmlkZXJUeXBlLkhPU1BJVEFMLFxyXG4gICAgICAgICAgICAgIGlzQWN0aXZlOiB0cnVlXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICAgICk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIHRocm93IGVycm9yIGZvciBpbnZhbGlkIHByb3ZpZGVyIGRhdGEnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGludmFsaWRJbnB1dCA9IHtcclxuICAgICAgICB0eXBlOiAnaW52YWxpZC10eXBlJyxcclxuICAgICAgICBuYW1lOiAnJ1xyXG4gICAgICB9IGFzIGFueTtcclxuXHJcbiAgICAgIGF3YWl0IGV4cGVjdChzZXJ2aWNlLnJlZ2lzdGVyUHJvdmlkZXIoaW52YWxpZElucHV0KSkucmVqZWN0cy50b1Rocm93KCdJbnZhbGlkIHByb3ZpZGVyIGRhdGEnKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnZ2V0UHJvdmlkZXInLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIHJldHVybiBwcm92aWRlciB3aGVuIGZvdW5kJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBtb2NrUHJvdmlkZXI6IFByb3ZpZGVyID0ge1xyXG4gICAgICAgIHByb3ZpZGVySWQ6ICdwcm92aWRlci0xJyxcclxuICAgICAgICB0eXBlOiBQcm92aWRlclR5cGUuSE9TUElUQUwsXHJcbiAgICAgICAgbmFtZTogJ1Rlc3QgSG9zcGl0YWwnLFxyXG4gICAgICAgIGxvY2F0aW9uOiB7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHN0YXRlOiAnRGVsaGknLFxyXG4gICAgICAgICAgZGlzdHJpY3Q6ICdOZXcgRGVsaGknLFxyXG4gICAgICAgICAgcGluY29kZTogJzExMDAwMScsXHJcbiAgICAgICAgICBjb29yZGluYXRlczogeyBsYXQ6IDI4LjYxMzksIGxuZzogNzcuMjA5MCB9XHJcbiAgICAgICAgfSxcclxuICAgICAgICBjYXBhYmlsaXRpZXM6IHtcclxuICAgICAgICAgIHNwZWNpYWx0aWVzOiBbJ2dlbmVyYWwnXSxcclxuICAgICAgICAgIHNlcnZpY2VzOiBbJ2NvbnN1bHRhdGlvbiddLFxyXG4gICAgICAgICAgZXF1aXBtZW50OiBbJ2Jhc2ljJ10sXHJcbiAgICAgICAgICBsYW5ndWFnZXM6IFsnZW5nbGlzaCddXHJcbiAgICAgICAgfSxcclxuICAgICAgICBjYXBhY2l0eToge1xyXG4gICAgICAgICAgdG90YWxCZWRzOiAxMDAsXHJcbiAgICAgICAgICBhdmFpbGFibGVCZWRzOiA1MCxcclxuICAgICAgICAgIGRhaWx5UGF0aWVudENhcGFjaXR5OiAyMDAsXHJcbiAgICAgICAgICBjdXJyZW50TG9hZDogNTBcclxuICAgICAgICB9LFxyXG4gICAgICAgIHF1YWxpdHlNZXRyaWNzOiB7XHJcbiAgICAgICAgICByYXRpbmc6IDQuNSxcclxuICAgICAgICAgIHBhdGllbnRSZXZpZXdzOiAxMDAsXHJcbiAgICAgICAgICBzdWNjZXNzUmF0ZTogOTUsXHJcbiAgICAgICAgICBhdmVyYWdlV2FpdFRpbWU6IDMwXHJcbiAgICAgICAgfSxcclxuICAgICAgICBjb3N0U3RydWN0dXJlOiB7XHJcbiAgICAgICAgICBjb25zdWx0YXRpb25GZWU6IDUwMCxcclxuICAgICAgICAgIGluc3VyYW5jZUFjY2VwdGVkOiBbJ3B1YmxpYyddLFxyXG4gICAgICAgICAgcGF5bWVudE1ldGhvZHM6IFsnY2FzaCddXHJcbiAgICAgICAgfSxcclxuICAgICAgICBhdmFpbGFiaWxpdHk6IHtcclxuICAgICAgICAgIGhvdXJzOiB7IG1vbmRheTogJzktMTcnIH0sXHJcbiAgICAgICAgICBlbWVyZ2VuY3lBdmFpbGFibGU6IHRydWUsXHJcbiAgICAgICAgICBsYXN0VXBkYXRlZDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXHJcbiAgICAgICAgfSxcclxuICAgICAgICBjcmVkZW50aWFsczoge1xyXG4gICAgICAgICAgbGljZW5zZXM6IFsnbGljZW5zZS0xMjMnXSxcclxuICAgICAgICAgIGNlcnRpZmljYXRpb25zOiBbJ2NlcnQtNDU2J10sXHJcbiAgICAgICAgICB2ZXJpZmllZDogdHJ1ZVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgaXNBY3RpdmU6IHRydWUsXHJcbiAgICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgdXBkYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgICAgfTtcclxuXHJcbiAgICAgIG1vY2tEeW5hbW9DbGllbnQuc2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZSh7IEl0ZW06IG1vY2tQcm92aWRlciB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNlcnZpY2UuZ2V0UHJvdmlkZXIoJ3Byb3ZpZGVyLTEnKTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvRXF1YWwobW9ja1Byb3ZpZGVyKTtcclxuICAgICAgZXhwZWN0KG1vY2tEeW5hbW9DbGllbnQuc2VuZCkudG9IYXZlQmVlbkNhbGxlZFdpdGgoXHJcbiAgICAgICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgaW5wdXQ6IGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcclxuICAgICAgICAgICAgVGFibGVOYW1lOiAndGVzdC1wcm92aWRlcnMtdGFibGUnLFxyXG4gICAgICAgICAgICBLZXk6IHsgcHJvdmlkZXJJZDogJ3Byb3ZpZGVyLTEnIH1cclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgICAgKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgcmV0dXJuIG51bGwgd2hlbiBwcm92aWRlciBub3QgZm91bmQnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIG1vY2tEeW5hbW9DbGllbnQuc2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZSh7IEl0ZW06IHVuZGVmaW5lZCB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNlcnZpY2UuZ2V0UHJvdmlkZXIoJ25vbi1leGlzdGVudCcpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9CZU51bGwoKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnc2VhcmNoUHJvdmlkZXJzJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCBzZWFyY2ggcHJvdmlkZXJzIGJ5IHR5cGUnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IG1vY2tQcm92aWRlcnMgPSBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgcHJvdmlkZXJJZDogJ3Byb3ZpZGVyLTEnLFxyXG4gICAgICAgICAgdHlwZTogUHJvdmlkZXJUeXBlLkhPU1BJVEFMLFxyXG4gICAgICAgICAgbmFtZTogJ0hvc3BpdGFsIDEnLFxyXG4gICAgICAgICAgaXNBY3RpdmU6IHRydWVcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIHByb3ZpZGVySWQ6ICdwcm92aWRlci0yJyxcclxuICAgICAgICAgIHR5cGU6IFByb3ZpZGVyVHlwZS5IT1NQSVRBTCxcclxuICAgICAgICAgIG5hbWU6ICdIb3NwaXRhbCAyJyxcclxuICAgICAgICAgIGlzQWN0aXZlOiB0cnVlXHJcbiAgICAgICAgfVxyXG4gICAgICBdO1xyXG5cclxuICAgICAgbW9ja0R5bmFtb0NsaWVudC5zZW5kLm1vY2tSZXNvbHZlZFZhbHVlKHsgSXRlbXM6IG1vY2tQcm92aWRlcnMgfSk7XHJcblxyXG4gICAgICBjb25zdCBjcml0ZXJpYTogUHJvdmlkZXJTZWFyY2hDcml0ZXJpYSA9IHtcclxuICAgICAgICB0eXBlOiBQcm92aWRlclR5cGUuSE9TUElUQUxcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNlcnZpY2Uuc2VhcmNoUHJvdmlkZXJzKGNyaXRlcmlhKTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvRXF1YWwobW9ja1Byb3ZpZGVycyk7XHJcbiAgICAgIGV4cGVjdChtb2NrRHluYW1vQ2xpZW50LnNlbmQpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxyXG4gICAgICAgIGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcclxuICAgICAgICAgIGlucHV0OiBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XHJcbiAgICAgICAgICAgIFRhYmxlTmFtZTogJ3Rlc3QtcHJvdmlkZXJzLXRhYmxlJyxcclxuICAgICAgICAgICAgSW5kZXhOYW1lOiAnVHlwZUF2YWlsYWJpbGl0eUluZGV4JyxcclxuICAgICAgICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJyN0eXBlID0gOnR5cGUgQU5EICNpc0FjdGl2ZSA9IDppc0FjdGl2ZSdcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgICAgKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgc2VhcmNoIHByb3ZpZGVycyBieSBzcGVjaWFsdHknLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IG1vY2tQcm92aWRlcnMgPSBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgcHJvdmlkZXJJZDogJ3Byb3ZpZGVyLTEnLFxyXG4gICAgICAgICAgY2FwYWJpbGl0aWVzOiB7IHNwZWNpYWx0aWVzOiBbJ2NhcmRpb2xvZ3knXSB9LFxyXG4gICAgICAgICAgaXNBY3RpdmU6IHRydWVcclxuICAgICAgICB9XHJcbiAgICAgIF07XHJcblxyXG4gICAgICBtb2NrRHluYW1vQ2xpZW50LnNlbmQubW9ja1Jlc29sdmVkVmFsdWUoeyBJdGVtczogbW9ja1Byb3ZpZGVycyB9KTtcclxuXHJcbiAgICAgIGNvbnN0IGNyaXRlcmlhOiBQcm92aWRlclNlYXJjaENyaXRlcmlhID0ge1xyXG4gICAgICAgIHNwZWNpYWx0aWVzOiBbJ2NhcmRpb2xvZ3knXVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2VydmljZS5zZWFyY2hQcm92aWRlcnMoY3JpdGVyaWEpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9FcXVhbChtb2NrUHJvdmlkZXJzKTtcclxuICAgICAgZXhwZWN0KG1vY2tEeW5hbW9DbGllbnQuc2VuZCkudG9IYXZlQmVlbkNhbGxlZFdpdGgoXHJcbiAgICAgICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgaW5wdXQ6IGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcclxuICAgICAgICAgICAgVGFibGVOYW1lOiAndGVzdC1wcm92aWRlcnMtdGFibGUnLFxyXG4gICAgICAgICAgICBJbmRleE5hbWU6ICdTcGVjaWFsdHlJbmRleCcsXHJcbiAgICAgICAgICAgIEtleUNvbmRpdGlvbkV4cHJlc3Npb246ICcjcHJpbWFyeVNwZWNpYWx0eSA9IDpzcGVjaWFsdHknXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICAgICk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGZpbHRlciBwcm92aWRlcnMgYnkgbG9jYXRpb24gZGlzdGFuY2UnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IG1vY2tQcm92aWRlcnMgPSBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgcHJvdmlkZXJJZDogJ3Byb3ZpZGVyLTEnLFxyXG4gICAgICAgICAgbG9jYXRpb246IHsgY29vcmRpbmF0ZXM6IHsgbGF0OiAyOC42MTM5LCBsbmc6IDc3LjIwOTAgfSB9LFxyXG4gICAgICAgICAgaXNBY3RpdmU6IHRydWVcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIHByb3ZpZGVySWQ6ICdwcm92aWRlci0yJyxcclxuICAgICAgICAgIGxvY2F0aW9uOiB7IGNvb3JkaW5hdGVzOiB7IGxhdDogMjguNzA0MSwgbG5nOiA3Ny4xMDI1IH0gfSwgLy8gfjE1a20gYXdheVxyXG4gICAgICAgICAgaXNBY3RpdmU6IHRydWVcclxuICAgICAgICB9XHJcbiAgICAgIF07XHJcblxyXG4gICAgICBtb2NrRHluYW1vQ2xpZW50LnNlbmQubW9ja1Jlc29sdmVkVmFsdWUoeyBJdGVtczogbW9ja1Byb3ZpZGVycyB9KTtcclxuXHJcbiAgICAgIGNvbnN0IGNyaXRlcmlhOiBQcm92aWRlclNlYXJjaENyaXRlcmlhID0ge1xyXG4gICAgICAgIGxvY2F0aW9uOiB7XHJcbiAgICAgICAgICBjb29yZGluYXRlczogeyBsYXQ6IDI4LjYxMzksIGxuZzogNzcuMjA5MCB9LFxyXG4gICAgICAgICAgbWF4RGlzdGFuY2U6IDEwIC8vIDEwa20gcmFkaXVzXHJcbiAgICAgICAgfVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2VydmljZS5zZWFyY2hQcm92aWRlcnMoY3JpdGVyaWEpO1xyXG5cclxuICAgICAgLy8gU2hvdWxkIG9ubHkgcmV0dXJuIHRoZSBmaXJzdCBwcm92aWRlciAod2l0aGluIDEwa20pXHJcbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvSGF2ZUxlbmd0aCgxKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdFswXS5wcm92aWRlcklkKS50b0JlKCdwcm92aWRlci0xJyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGFwcGx5IGFkZGl0aW9uYWwgZmlsdGVycyBjb3JyZWN0bHknLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IG1vY2tQcm92aWRlcnMgPSBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgcHJvdmlkZXJJZDogJ3Byb3ZpZGVyLTEnLFxyXG4gICAgICAgICAgY2FwYWNpdHk6IHsgY3VycmVudExvYWQ6IDUwIH0sXHJcbiAgICAgICAgICBjb3N0U3RydWN0dXJlOiB7IGNvbnN1bHRhdGlvbkZlZTogMzAwLCBpbnN1cmFuY2VBY2NlcHRlZDogWydwdWJsaWMnXSB9LFxyXG4gICAgICAgICAgcXVhbGl0eU1ldHJpY3M6IHsgcmF0aW5nOiA0LjUgfSxcclxuICAgICAgICAgIGNhcGFiaWxpdGllczogeyBsYW5ndWFnZXM6IFsnZW5nbGlzaCddIH0sXHJcbiAgICAgICAgICBpc0FjdGl2ZTogdHJ1ZVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgcHJvdmlkZXJJZDogJ3Byb3ZpZGVyLTInLFxyXG4gICAgICAgICAgY2FwYWNpdHk6IHsgY3VycmVudExvYWQ6IDk1IH0sIC8vIFRvbyBidXN5XHJcbiAgICAgICAgICBjb3N0U3RydWN0dXJlOiB7IGNvbnN1bHRhdGlvbkZlZTogMzAwLCBpbnN1cmFuY2VBY2NlcHRlZDogWydwdWJsaWMnXSB9LFxyXG4gICAgICAgICAgcXVhbGl0eU1ldHJpY3M6IHsgcmF0aW5nOiA0LjUgfSxcclxuICAgICAgICAgIGNhcGFiaWxpdGllczogeyBsYW5ndWFnZXM6IFsnZW5nbGlzaCddIH0sXHJcbiAgICAgICAgICBpc0FjdGl2ZTogdHJ1ZVxyXG4gICAgICAgIH1cclxuICAgICAgXTtcclxuXHJcbiAgICAgIG1vY2tEeW5hbW9DbGllbnQuc2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZSh7IEl0ZW1zOiBtb2NrUHJvdmlkZXJzIH0pO1xyXG5cclxuICAgICAgY29uc3QgY3JpdGVyaWE6IFByb3ZpZGVyU2VhcmNoQ3JpdGVyaWEgPSB7XHJcbiAgICAgICAgYXZhaWxhYmxlTm93OiB0cnVlLFxyXG4gICAgICAgIG1heENvc3Q6IDUwMCxcclxuICAgICAgICBtaW5SYXRpbmc6IDQuMCxcclxuICAgICAgICBhY2NlcHRzSW5zdXJhbmNlOiBbJ3B1YmxpYyddLFxyXG4gICAgICAgIGxhbmd1YWdlczogWydlbmdsaXNoJ11cclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNlcnZpY2Uuc2VhcmNoUHJvdmlkZXJzKGNyaXRlcmlhKTtcclxuXHJcbiAgICAgIC8vIFNob3VsZCBvbmx5IHJldHVybiBwcm92aWRlci0xIChwcm92aWRlci0yIGlzIHRvbyBidXN5KVxyXG4gICAgICBleHBlY3QocmVzdWx0KS50b0hhdmVMZW5ndGgoMSk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHRbMF0ucHJvdmlkZXJJZCkudG9CZSgncHJvdmlkZXItMScpO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCd1cGRhdGVQcm92aWRlcicsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgdXBkYXRlIHByb3ZpZGVyIHN1Y2Nlc3NmdWxseScsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgZXhpc3RpbmdQcm92aWRlciA9IHtcclxuICAgICAgICBwcm92aWRlcklkOiAncHJvdmlkZXItMScsXHJcbiAgICAgICAgbmFtZTogJ09sZCBOYW1lJyxcclxuICAgICAgICB0eXBlOiBQcm92aWRlclR5cGUuSE9TUElUQUxcclxuICAgICAgfTtcclxuXHJcbiAgICAgIGNvbnN0IHVwZGF0ZWRQcm92aWRlciA9IHtcclxuICAgICAgICAuLi5leGlzdGluZ1Byb3ZpZGVyLFxyXG4gICAgICAgIG5hbWU6ICdOZXcgTmFtZScsXHJcbiAgICAgICAgdXBkYXRlZEF0OiBleHBlY3QuYW55KFN0cmluZylcclxuICAgICAgfTtcclxuXHJcbiAgICAgIC8vIE1vY2sgZ2V0UHJvdmlkZXIgY2FsbFxyXG4gICAgICBtb2NrRHluYW1vQ2xpZW50LnNlbmRcclxuICAgICAgICAubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHsgSXRlbTogZXhpc3RpbmdQcm92aWRlciB9KSAvLyBnZXRQcm92aWRlclxyXG4gICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UoeyBBdHRyaWJ1dGVzOiB1cGRhdGVkUHJvdmlkZXIgfSk7IC8vIHVwZGF0ZVByb3ZpZGVyXHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBzZXJ2aWNlLnVwZGF0ZVByb3ZpZGVyKCdwcm92aWRlci0xJywgeyBuYW1lOiAnTmV3IE5hbWUnIH0pO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9NYXRjaE9iamVjdCh7IG5hbWU6ICdOZXcgTmFtZScgfSk7XHJcbiAgICAgIGV4cGVjdChtb2NrRHluYW1vQ2xpZW50LnNlbmQpLnRvSGF2ZUJlZW5DYWxsZWRUaW1lcygyKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgcmV0dXJuIG51bGwgZm9yIG5vbi1leGlzdGVudCBwcm92aWRlcicsIGFzeW5jICgpID0+IHtcclxuICAgICAgbW9ja0R5bmFtb0NsaWVudC5zZW5kLm1vY2tSZXNvbHZlZFZhbHVlKHsgSXRlbTogdW5kZWZpbmVkIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2VydmljZS51cGRhdGVQcm92aWRlcignbm9uLWV4aXN0ZW50JywgeyBuYW1lOiAnTmV3IE5hbWUnIH0pO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9CZU51bGwoKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnbGlzdFByb3ZpZGVycycsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgbGlzdCBwcm92aWRlcnMgd2l0aCBwYWdpbmF0aW9uJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBtb2NrUHJvdmlkZXJzID0gW1xyXG4gICAgICAgIHsgcHJvdmlkZXJJZDogJ3Byb3ZpZGVyLTEnLCBpc0FjdGl2ZTogdHJ1ZSB9LFxyXG4gICAgICAgIHsgcHJvdmlkZXJJZDogJ3Byb3ZpZGVyLTInLCBpc0FjdGl2ZTogdHJ1ZSB9XHJcbiAgICAgIF07XHJcblxyXG4gICAgICBtb2NrRHluYW1vQ2xpZW50LnNlbmQubW9ja1Jlc29sdmVkVmFsdWUoe1xyXG4gICAgICAgIEl0ZW1zOiBtb2NrUHJvdmlkZXJzLFxyXG4gICAgICAgIExhc3RFdmFsdWF0ZWRLZXk6IHsgcHJvdmlkZXJJZDogJ3Byb3ZpZGVyLTInIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBzZXJ2aWNlLmxpc3RQcm92aWRlcnMoMTAsICdwcm92aWRlci0wJyk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnByb3ZpZGVycykudG9FcXVhbChtb2NrUHJvdmlkZXJzKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdC5sYXN0S2V5KS50b0JlKCdwcm92aWRlci0yJyk7XHJcbiAgICAgIGV4cGVjdChtb2NrRHluYW1vQ2xpZW50LnNlbmQpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxyXG4gICAgICAgIGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcclxuICAgICAgICAgIGlucHV0OiBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XHJcbiAgICAgICAgICAgIFRhYmxlTmFtZTogJ3Rlc3QtcHJvdmlkZXJzLXRhYmxlJyxcclxuICAgICAgICAgICAgTGltaXQ6IDEwLFxyXG4gICAgICAgICAgICBFeGNsdXNpdmVTdGFydEtleTogeyBwcm92aWRlcklkOiAncHJvdmlkZXItMCcgfVxyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9KVxyXG4gICAgICApO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdFcnJvciBIYW5kbGluZycsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgaGFuZGxlIER5bmFtb0RCIGVycm9ycyBncmFjZWZ1bGx5JywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBtb2NrRHluYW1vQ2xpZW50LnNlbmQubW9ja1JlamVjdGVkVmFsdWUobmV3IEVycm9yKCdEeW5hbW9EQiBlcnJvcicpKTtcclxuXHJcbiAgICAgIGF3YWl0IGV4cGVjdChzZXJ2aWNlLmdldFByb3ZpZGVyKCdwcm92aWRlci0xJykpLnJlamVjdHMudG9UaHJvdygnRmFpbGVkIHRvIGdldCBwcm92aWRlcicpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgdmFsaWRhdGlvbiBlcnJvcnMnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGludmFsaWRJbnB1dCA9IHt9IGFzIENyZWF0ZVByb3ZpZGVySW5wdXQ7XHJcblxyXG4gICAgICBhd2FpdCBleHBlY3Qoc2VydmljZS5yZWdpc3RlclByb3ZpZGVyKGludmFsaWRJbnB1dCkpLnJlamVjdHMudG9UaHJvdygnSW52YWxpZCBwcm92aWRlciBkYXRhJyk7XHJcbiAgICB9KTtcclxuICB9KTtcclxufSk7XHJcbiJdfQ==