"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const provider_capacity_service_1 = require("../provider-capacity-service");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');
const mockDynamoClient = {
    send: jest.fn()
};
jest.mocked(lib_dynamodb_1.DynamoDBDocumentClient.from).mockReturnValue(mockDynamoClient);
describe('ProviderCapacityService', () => {
    let service;
    beforeEach(() => {
        jest.clearAllMocks();
        service = new provider_capacity_service_1.ProviderCapacityService();
        process.env.PROVIDER_TABLE_NAME = 'test-providers-table';
    });
    describe('updateCapacity', () => {
        it('should update provider capacity successfully', async () => {
            const input = {
                providerId: 'provider-1',
                currentLoad: 75,
                availableBeds: 25
            };
            mockDynamoClient.send.mockResolvedValue({});
            await service.updateCapacity(input);
            expect(mockDynamoClient.send).toHaveBeenCalledWith(expect.objectContaining({
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
            }));
        });
        it('should throw error for invalid capacity data', async () => {
            const invalidInput = {
                providerId: '',
                currentLoad: -10
            };
            await expect(service.updateCapacity(invalidInput)).rejects.toThrow('Invalid capacity update data');
        });
        it('should throw error when provider does not exist', async () => {
            const input = {
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
            const updates = [
                { providerId: 'provider-1', currentLoad: 60 },
                { providerId: 'provider-2', currentLoad: 80 }
            ];
            mockDynamoClient.send.mockResolvedValue({});
            await service.batchUpdateCapacity(updates);
            expect(mockDynamoClient.send).toHaveBeenCalledTimes(2);
        });
        it('should handle batch processing with concurrency limit', async () => {
            // Create 25 updates to test concurrency limiting
            const updates = Array.from({ length: 25 }, (_, i) => ({
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
            expect(mockDynamoClient.send).toHaveBeenCalledWith(expect.objectContaining({
                input: expect.objectContaining({
                    TableName: 'test-providers-table',
                    IndexName: 'CapacityIndex',
                    FilterExpression: '#currentLoad >= :threshold',
                    ExpressionAttributeValues: expect.objectContaining({
                        ':threshold': 90
                    })
                })
            }));
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
            };
            await expect(service.updateCapacity(invalidInput)).rejects.toThrow('Invalid capacity update data');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvdmlkZXItY2FwYWNpdHktc2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc3JjL2xhbWJkYS9wcm92aWRlci1kaXNjb3ZlcnkvX190ZXN0c19fL3Byb3ZpZGVyLWNhcGFjaXR5LXNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDRFQUF1RTtBQUN2RSx3REFBK0Q7QUFHL0QsZUFBZTtBQUNmLElBQUksQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsQ0FBQztBQUN0QyxJQUFJLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUM7QUFFbkMsTUFBTSxnQkFBZ0IsR0FBRztJQUN2QixJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtDQUNoQixDQUFDO0FBRUYsSUFBSSxDQUFDLE1BQU0sQ0FBQyxxQ0FBc0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxlQUFlLENBQUMsZ0JBQXVCLENBQUMsQ0FBQztBQUVsRixRQUFRLENBQUMseUJBQXlCLEVBQUUsR0FBRyxFQUFFO0lBQ3ZDLElBQUksT0FBZ0MsQ0FBQztJQUVyQyxVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2QsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1FBQ3JCLE9BQU8sR0FBRyxJQUFJLG1EQUF1QixFQUFFLENBQUM7UUFDeEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsR0FBRyxzQkFBc0IsQ0FBQztJQUMzRCxDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxHQUFHLEVBQUU7UUFDOUIsRUFBRSxDQUFDLDhDQUE4QyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzVELE1BQU0sS0FBSyxHQUF3QjtnQkFDakMsVUFBVSxFQUFFLFlBQVk7Z0JBQ3hCLFdBQVcsRUFBRSxFQUFFO2dCQUNmLGFBQWEsRUFBRSxFQUFFO2FBQ2xCLENBQUM7WUFFRixnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsaUJB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RCxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO1lBRXJFLE1BQU0sTUFBTSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsaUNBQWlDLENBQUMsQ0FBQztRQUM3RyxDQUFDLENBQUMsQ0FBQztRQUVILEVBQUUsQ0FBQyxtREFBbUQsRUFBRSxLQUFLLElBQUksRUFBRTtZQUNqRSxNQUFNLFlBQVksR0FBRztnQkFDbkIsVUFBVSxFQUFFLEVBQUU7Z0JBQ2QsV0FBVyxFQUFFLEdBQUcsQ0FBQyxxQkFBcUI7YUFDaEIsQ0FBQztZQUV6QixNQUFNLE1BQU0sQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO1FBQ3JHLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFByb3ZpZGVyQ2FwYWNpdHlTZXJ2aWNlIH0gZnJvbSAnLi4vcHJvdmlkZXItY2FwYWNpdHktc2VydmljZSc7XHJcbmltcG9ydCB7IER5bmFtb0RCRG9jdW1lbnRDbGllbnQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xyXG5pbXBvcnQgeyBVcGRhdGVDYXBhY2l0eUlucHV0IH0gZnJvbSAnLi4vLi4vLi4vdHlwZXMvcHJvdmlkZXInO1xyXG5cclxuLy8gTW9jayBBV1MgU0RLXHJcbmplc3QubW9jaygnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJyk7XHJcbmplc3QubW9jaygnQGF3cy1zZGsvbGliLWR5bmFtb2RiJyk7XHJcblxyXG5jb25zdCBtb2NrRHluYW1vQ2xpZW50ID0ge1xyXG4gIHNlbmQ6IGplc3QuZm4oKVxyXG59O1xyXG5cclxuamVzdC5tb2NrZWQoRHluYW1vREJEb2N1bWVudENsaWVudC5mcm9tKS5tb2NrUmV0dXJuVmFsdWUobW9ja0R5bmFtb0NsaWVudCBhcyBhbnkpO1xyXG5cclxuZGVzY3JpYmUoJ1Byb3ZpZGVyQ2FwYWNpdHlTZXJ2aWNlJywgKCkgPT4ge1xyXG4gIGxldCBzZXJ2aWNlOiBQcm92aWRlckNhcGFjaXR5U2VydmljZTtcclxuXHJcbiAgYmVmb3JlRWFjaCgoKSA9PiB7XHJcbiAgICBqZXN0LmNsZWFyQWxsTW9ja3MoKTtcclxuICAgIHNlcnZpY2UgPSBuZXcgUHJvdmlkZXJDYXBhY2l0eVNlcnZpY2UoKTtcclxuICAgIHByb2Nlc3MuZW52LlBST1ZJREVSX1RBQkxFX05BTUUgPSAndGVzdC1wcm92aWRlcnMtdGFibGUnO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgndXBkYXRlQ2FwYWNpdHknLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIHVwZGF0ZSBwcm92aWRlciBjYXBhY2l0eSBzdWNjZXNzZnVsbHknLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGlucHV0OiBVcGRhdGVDYXBhY2l0eUlucHV0ID0ge1xyXG4gICAgICAgIHByb3ZpZGVySWQ6ICdwcm92aWRlci0xJyxcclxuICAgICAgICBjdXJyZW50TG9hZDogNzUsXHJcbiAgICAgICAgYXZhaWxhYmxlQmVkczogMjVcclxuICAgICAgfTtcclxuXHJcbiAgICAgIG1vY2tEeW5hbW9DbGllbnQuc2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZSh7fSk7XHJcblxyXG4gICAgICBhd2FpdCBzZXJ2aWNlLnVwZGF0ZUNhcGFjaXR5KGlucHV0KTtcclxuXHJcbiAgICAgIGV4cGVjdChtb2NrRHluYW1vQ2xpZW50LnNlbmQpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxyXG4gICAgICAgIGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcclxuICAgICAgICAgIGlucHV0OiBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XHJcbiAgICAgICAgICAgIFRhYmxlTmFtZTogJ3Rlc3QtcHJvdmlkZXJzLXRhYmxlJyxcclxuICAgICAgICAgICAgS2V5OiB7IHByb3ZpZGVySWQ6ICdwcm92aWRlci0xJyB9LFxyXG4gICAgICAgICAgICBVcGRhdGVFeHByZXNzaW9uOiBleHBlY3Quc3RyaW5nQ29udGFpbmluZygnI2N1cnJlbnRMb2FkID0gOmN1cnJlbnRMb2FkJyksXHJcbiAgICAgICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lczogZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgICAgICcjY3VycmVudExvYWQnOiAnY3VycmVudExvYWQnXHJcbiAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XHJcbiAgICAgICAgICAgICAgJzpjdXJyZW50TG9hZCc6IDc1LFxyXG4gICAgICAgICAgICAgICc6YXZhaWxhYmxlQmVkcyc6IDI1XHJcbiAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICBDb25kaXRpb25FeHByZXNzaW9uOiAnYXR0cmlidXRlX2V4aXN0cyhwcm92aWRlcklkKSdcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgICAgKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgdGhyb3cgZXJyb3IgZm9yIGludmFsaWQgY2FwYWNpdHkgZGF0YScsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgaW52YWxpZElucHV0ID0ge1xyXG4gICAgICAgIHByb3ZpZGVySWQ6ICcnLFxyXG4gICAgICAgIGN1cnJlbnRMb2FkOiAtMTBcclxuICAgICAgfSBhcyBVcGRhdGVDYXBhY2l0eUlucHV0O1xyXG5cclxuICAgICAgYXdhaXQgZXhwZWN0KHNlcnZpY2UudXBkYXRlQ2FwYWNpdHkoaW52YWxpZElucHV0KSkucmVqZWN0cy50b1Rocm93KCdJbnZhbGlkIGNhcGFjaXR5IHVwZGF0ZSBkYXRhJyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIHRocm93IGVycm9yIHdoZW4gcHJvdmlkZXIgZG9lcyBub3QgZXhpc3QnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGlucHV0OiBVcGRhdGVDYXBhY2l0eUlucHV0ID0ge1xyXG4gICAgICAgIHByb3ZpZGVySWQ6ICdub24tZXhpc3RlbnQnLFxyXG4gICAgICAgIGN1cnJlbnRMb2FkOiA1MFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgY29uc3QgZXJyb3IgPSBuZXcgRXJyb3IoJ0NvbmRpdGlvbmFsQ2hlY2tGYWlsZWRFeGNlcHRpb24nKTtcclxuICAgICAgZXJyb3IubmFtZSA9ICdDb25kaXRpb25hbENoZWNrRmFpbGVkRXhjZXB0aW9uJztcclxuICAgICAgbW9ja0R5bmFtb0NsaWVudC5zZW5kLm1vY2tSZWplY3RlZFZhbHVlKGVycm9yKTtcclxuXHJcbiAgICAgIGF3YWl0IGV4cGVjdChzZXJ2aWNlLnVwZGF0ZUNhcGFjaXR5KGlucHV0KSkucmVqZWN0cy50b1Rocm93KCdQcm92aWRlciBub3QgZm91bmQnKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnY2hlY2tDYXBhY2l0eScsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgY2hlY2sgY2FwYWNpdHkgZm9yIG11bHRpcGxlIHByb3ZpZGVycycsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgbW9ja1Byb3ZpZGVycyA9IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBwcm92aWRlcklkOiAncHJvdmlkZXItMScsXHJcbiAgICAgICAgICBjYXBhY2l0eToge1xyXG4gICAgICAgICAgICB0b3RhbEJlZHM6IDEwMCxcclxuICAgICAgICAgICAgYXZhaWxhYmxlQmVkczogNTAsXHJcbiAgICAgICAgICAgIGN1cnJlbnRMb2FkOiA1MCxcclxuICAgICAgICAgICAgZGFpbHlQYXRpZW50Q2FwYWNpdHk6IDIwMCxcclxuICAgICAgICAgICAgbGFzdFVwZGF0ZWQ6ICcyMDI0LTAxLTAxVDEwOjAwOjAwWidcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB1cGRhdGVkQXQ6ICcyMDI0LTAxLTAxVDEwOjAwOjAwWidcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIHByb3ZpZGVySWQ6ICdwcm92aWRlci0yJyxcclxuICAgICAgICAgIGNhcGFjaXR5OiB7XHJcbiAgICAgICAgICAgIHRvdGFsQmVkczogMjAwLFxyXG4gICAgICAgICAgICBhdmFpbGFibGVCZWRzOiAyMCxcclxuICAgICAgICAgICAgY3VycmVudExvYWQ6IDkwLFxyXG4gICAgICAgICAgICBkYWlseVBhdGllbnRDYXBhY2l0eTogNDAwLFxyXG4gICAgICAgICAgICBsYXN0VXBkYXRlZDogJzIwMjQtMDEtMDFUMTE6MDA6MDBaJ1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHVwZGF0ZWRBdDogJzIwMjQtMDEtMDFUMTE6MDA6MDBaJ1xyXG4gICAgICAgIH1cclxuICAgICAgXTtcclxuXHJcbiAgICAgIG1vY2tEeW5hbW9DbGllbnQuc2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcbiAgICAgICAgUmVzcG9uc2VzOiB7XHJcbiAgICAgICAgICAndGVzdC1wcm92aWRlcnMtdGFibGUnOiBtb2NrUHJvdmlkZXJzXHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHNlcnZpY2UuY2hlY2tDYXBhY2l0eShbJ3Byb3ZpZGVyLTEnLCAncHJvdmlkZXItMiddKTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvSGF2ZUxlbmd0aCgyKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdFswXSkudG9FcXVhbCh7XHJcbiAgICAgICAgcHJvdmlkZXJJZDogJ3Byb3ZpZGVyLTEnLFxyXG4gICAgICAgIHRvdGFsQmVkczogMTAwLFxyXG4gICAgICAgIGF2YWlsYWJsZUJlZHM6IDUwLFxyXG4gICAgICAgIGN1cnJlbnRMb2FkOiA1MCxcclxuICAgICAgICBkYWlseVBhdGllbnRDYXBhY2l0eTogMjAwLFxyXG4gICAgICAgIGF2YWlsYWJpbGl0eVN0YXR1czogJ2F2YWlsYWJsZScsXHJcbiAgICAgICAgbGFzdFVwZGF0ZWQ6ICcyMDI0LTAxLTAxVDEwOjAwOjAwWidcclxuICAgICAgfSk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHRbMV0pLnRvRXF1YWwoe1xyXG4gICAgICAgIHByb3ZpZGVySWQ6ICdwcm92aWRlci0yJyxcclxuICAgICAgICB0b3RhbEJlZHM6IDIwMCxcclxuICAgICAgICBhdmFpbGFibGVCZWRzOiAyMCxcclxuICAgICAgICBjdXJyZW50TG9hZDogOTAsXHJcbiAgICAgICAgZGFpbHlQYXRpZW50Q2FwYWNpdHk6IDQwMCxcclxuICAgICAgICBhdmFpbGFiaWxpdHlTdGF0dXM6ICd1bmF2YWlsYWJsZScsXHJcbiAgICAgICAgbGFzdFVwZGF0ZWQ6ICcyMDI0LTAxLTAxVDExOjAwOjAwWidcclxuICAgICAgfSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIHJldHVybiBlbXB0eSBhcnJheSBmb3IgZW1wdHkgcHJvdmlkZXIgbGlzdCcsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2VydmljZS5jaGVja0NhcGFjaXR5KFtdKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9FcXVhbChbXSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGhhbmRsZSBiYXRjaCBzaXplIGxpbWl0cyBjb3JyZWN0bHknLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIC8vIENyZWF0ZSAxNTAgcHJvdmlkZXIgSURzIHRvIHRlc3QgYmF0Y2ggcHJvY2Vzc2luZ1xyXG4gICAgICBjb25zdCBwcm92aWRlcklkcyA9IEFycmF5LmZyb20oeyBsZW5ndGg6IDE1MCB9LCAoXywgaSkgPT4gYHByb3ZpZGVyLSR7aX1gKTtcclxuICAgICAgXHJcbiAgICAgIG1vY2tEeW5hbW9DbGllbnQuc2VuZC5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcbiAgICAgICAgUmVzcG9uc2VzOiB7ICd0ZXN0LXByb3ZpZGVycy10YWJsZSc6IFtdIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICBhd2FpdCBzZXJ2aWNlLmNoZWNrQ2FwYWNpdHkocHJvdmlkZXJJZHMpO1xyXG5cclxuICAgICAgLy8gU2hvdWxkIG1ha2UgMiBiYXRjaCBjYWxscyAoMTAwICsgNTApXHJcbiAgICAgIGV4cGVjdChtb2NrRHluYW1vQ2xpZW50LnNlbmQpLnRvSGF2ZUJlZW5DYWxsZWRUaW1lcygyKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnZ2V0UHJvdmlkZXJDYXBhY2l0eScsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgZ2V0IGNhcGFjaXR5IGZvciBhIHNpbmdsZSBwcm92aWRlcicsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgbW9ja1Byb3ZpZGVyID0ge1xyXG4gICAgICAgIHByb3ZpZGVySWQ6ICdwcm92aWRlci0xJyxcclxuICAgICAgICBjYXBhY2l0eToge1xyXG4gICAgICAgICAgdG90YWxCZWRzOiAxMDAsXHJcbiAgICAgICAgICBhdmFpbGFibGVCZWRzOiA1MCxcclxuICAgICAgICAgIGN1cnJlbnRMb2FkOiA1MCxcclxuICAgICAgICAgIGRhaWx5UGF0aWVudENhcGFjaXR5OiAyMDAsXHJcbiAgICAgICAgICBsYXN0VXBkYXRlZDogJzIwMjQtMDEtMDFUMTA6MDA6MDBaJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgdXBkYXRlZEF0OiAnMjAyNC0wMS0wMVQxMDowMDowMFonXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBtb2NrRHluYW1vQ2xpZW50LnNlbmQubW9ja1Jlc29sdmVkVmFsdWUoeyBJdGVtOiBtb2NrUHJvdmlkZXIgfSk7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBzZXJ2aWNlLmdldFByb3ZpZGVyQ2FwYWNpdHkoJ3Byb3ZpZGVyLTEnKTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoe1xyXG4gICAgICAgIHByb3ZpZGVySWQ6ICdwcm92aWRlci0xJyxcclxuICAgICAgICB0b3RhbEJlZHM6IDEwMCxcclxuICAgICAgICBhdmFpbGFibGVCZWRzOiA1MCxcclxuICAgICAgICBjdXJyZW50TG9hZDogNTAsXHJcbiAgICAgICAgZGFpbHlQYXRpZW50Q2FwYWNpdHk6IDIwMCxcclxuICAgICAgICBhdmFpbGFiaWxpdHlTdGF0dXM6ICdhdmFpbGFibGUnLFxyXG4gICAgICAgIGxhc3RVcGRhdGVkOiAnMjAyNC0wMS0wMVQxMDowMDowMFonXHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gbnVsbCBmb3Igbm9uLWV4aXN0ZW50IHByb3ZpZGVyJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBtb2NrRHluYW1vQ2xpZW50LnNlbmQubW9ja1Jlc29sdmVkVmFsdWUoeyBJdGVtOiB1bmRlZmluZWQgfSk7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBzZXJ2aWNlLmdldFByb3ZpZGVyQ2FwYWNpdHkoJ25vbi1leGlzdGVudCcpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9CZU51bGwoKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnYmF0Y2hVcGRhdGVDYXBhY2l0eScsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgdXBkYXRlIGNhcGFjaXR5IGZvciBtdWx0aXBsZSBwcm92aWRlcnMnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IHVwZGF0ZXM6IFVwZGF0ZUNhcGFjaXR5SW5wdXRbXSA9IFtcclxuICAgICAgICB7IHByb3ZpZGVySWQ6ICdwcm92aWRlci0xJywgY3VycmVudExvYWQ6IDYwIH0sXHJcbiAgICAgICAgeyBwcm92aWRlcklkOiAncHJvdmlkZXItMicsIGN1cnJlbnRMb2FkOiA4MCB9XHJcbiAgICAgIF07XHJcblxyXG4gICAgICBtb2NrRHluYW1vQ2xpZW50LnNlbmQubW9ja1Jlc29sdmVkVmFsdWUoe30pO1xyXG5cclxuICAgICAgYXdhaXQgc2VydmljZS5iYXRjaFVwZGF0ZUNhcGFjaXR5KHVwZGF0ZXMpO1xyXG5cclxuICAgICAgZXhwZWN0KG1vY2tEeW5hbW9DbGllbnQuc2VuZCkudG9IYXZlQmVlbkNhbGxlZFRpbWVzKDIpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgYmF0Y2ggcHJvY2Vzc2luZyB3aXRoIGNvbmN1cnJlbmN5IGxpbWl0JywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAvLyBDcmVhdGUgMjUgdXBkYXRlcyB0byB0ZXN0IGNvbmN1cnJlbmN5IGxpbWl0aW5nXHJcbiAgICAgIGNvbnN0IHVwZGF0ZXM6IFVwZGF0ZUNhcGFjaXR5SW5wdXRbXSA9IEFycmF5LmZyb20oeyBsZW5ndGg6IDI1IH0sIChfLCBpKSA9PiAoe1xyXG4gICAgICAgIHByb3ZpZGVySWQ6IGBwcm92aWRlci0ke2l9YCxcclxuICAgICAgICBjdXJyZW50TG9hZDogNTBcclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgbW9ja0R5bmFtb0NsaWVudC5zZW5kLm1vY2tSZXNvbHZlZFZhbHVlKHt9KTtcclxuXHJcbiAgICAgIGF3YWl0IHNlcnZpY2UuYmF0Y2hVcGRhdGVDYXBhY2l0eSh1cGRhdGVzKTtcclxuXHJcbiAgICAgIGV4cGVjdChtb2NrRHluYW1vQ2xpZW50LnNlbmQpLnRvSGF2ZUJlZW5DYWxsZWRUaW1lcygyNSk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ2dldFByb3ZpZGVyc1dpdGhMb3dDYXBhY2l0eScsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgZ2V0IHByb3ZpZGVycyB3aXRoIGxvdyBjYXBhY2l0eScsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgbW9ja1Byb3ZpZGVycyA9IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBwcm92aWRlcklkOiAncHJvdmlkZXItMScsXHJcbiAgICAgICAgICBjYXBhY2l0eToge1xyXG4gICAgICAgICAgICB0b3RhbEJlZHM6IDEwMCxcclxuICAgICAgICAgICAgYXZhaWxhYmxlQmVkczogNSxcclxuICAgICAgICAgICAgY3VycmVudExvYWQ6IDk1LFxyXG4gICAgICAgICAgICBkYWlseVBhdGllbnRDYXBhY2l0eTogMjAwXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgdXBkYXRlZEF0OiAnMjAyNC0wMS0wMVQxMDowMDowMFonXHJcbiAgICAgICAgfVxyXG4gICAgICBdO1xyXG5cclxuICAgICAgbW9ja0R5bmFtb0NsaWVudC5zZW5kLm1vY2tSZXNvbHZlZFZhbHVlKHsgSXRlbXM6IG1vY2tQcm92aWRlcnMgfSk7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBzZXJ2aWNlLmdldFByb3ZpZGVyc1dpdGhMb3dDYXBhY2l0eSg5MCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0KS50b0hhdmVMZW5ndGgoMSk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHRbMF0uY3VycmVudExvYWQpLnRvQmUoOTUpO1xyXG4gICAgICBleHBlY3QocmVzdWx0WzBdLmF2YWlsYWJpbGl0eVN0YXR1cykudG9CZSgndW5hdmFpbGFibGUnKTtcclxuICAgICAgZXhwZWN0KG1vY2tEeW5hbW9DbGllbnQuc2VuZCkudG9IYXZlQmVlbkNhbGxlZFdpdGgoXHJcbiAgICAgICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgaW5wdXQ6IGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcclxuICAgICAgICAgICAgVGFibGVOYW1lOiAndGVzdC1wcm92aWRlcnMtdGFibGUnLFxyXG4gICAgICAgICAgICBJbmRleE5hbWU6ICdDYXBhY2l0eUluZGV4JyxcclxuICAgICAgICAgICAgRmlsdGVyRXhwcmVzc2lvbjogJyNjdXJyZW50TG9hZCA+PSA6dGhyZXNob2xkJyxcclxuICAgICAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczogZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgICAgICc6dGhyZXNob2xkJzogOTBcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgICAgKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnZ2V0Q2FwYWNpdHlTdGF0aXN0aWNzJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCBjYWxjdWxhdGUgY2FwYWNpdHkgc3RhdGlzdGljcyBjb3JyZWN0bHknLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IG1vY2tQcm92aWRlcnMgPSBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgcHJvdmlkZXJJZDogJ3Byb3ZpZGVyLTEnLFxyXG4gICAgICAgICAgY2FwYWNpdHk6IHsgY3VycmVudExvYWQ6IDMwIH0gLy8gYXZhaWxhYmxlXHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBwcm92aWRlcklkOiAncHJvdmlkZXItMicsXHJcbiAgICAgICAgICBjYXBhY2l0eTogeyBjdXJyZW50TG9hZDogODAgfSAvLyBidXN5XHJcbiAgICAgICAgfSxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBwcm92aWRlcklkOiAncHJvdmlkZXItMycsXHJcbiAgICAgICAgICBjYXBhY2l0eTogeyBjdXJyZW50TG9hZDogOTUgfSAvLyB1bmF2YWlsYWJsZVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgcHJvdmlkZXJJZDogJ3Byb3ZpZGVyLTQnLFxyXG4gICAgICAgICAgY2FwYWNpdHk6IHsgY3VycmVudExvYWQ6IDUwIH0gLy8gYXZhaWxhYmxlXHJcbiAgICAgICAgfVxyXG4gICAgICBdO1xyXG5cclxuICAgICAgbW9ja0R5bmFtb0NsaWVudC5zZW5kLm1vY2tSZXNvbHZlZFZhbHVlKHsgSXRlbXM6IG1vY2tQcm92aWRlcnMgfSk7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBzZXJ2aWNlLmdldENhcGFjaXR5U3RhdGlzdGljcygpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9FcXVhbCh7XHJcbiAgICAgICAgdG90YWxQcm92aWRlcnM6IDQsXHJcbiAgICAgICAgYXZhaWxhYmxlUHJvdmlkZXJzOiAyLCAvLyBsb2FkIDwgNzBcclxuICAgICAgICBidXN5UHJvdmlkZXJzOiAxLCAvLyA3MCA8PSBsb2FkIDwgOTVcclxuICAgICAgICB1bmF2YWlsYWJsZVByb3ZpZGVyczogMSwgLy8gbG9hZCA+PSA5NVxyXG4gICAgICAgIGF2ZXJhZ2VMb2FkOiA2NCAvLyAoMzAgKyA4MCArIDk1ICsgNTApIC8gNCA9IDYzLjc1LCByb3VuZGVkIHRvIDY0XHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgZW1wdHkgcHJvdmlkZXIgbGlzdCcsIGFzeW5jICgpID0+IHtcclxuICAgICAgbW9ja0R5bmFtb0NsaWVudC5zZW5kLm1vY2tSZXNvbHZlZFZhbHVlKHsgSXRlbXM6IFtdIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgc2VydmljZS5nZXRDYXBhY2l0eVN0YXRpc3RpY3MoKTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvRXF1YWwoe1xyXG4gICAgICAgIHRvdGFsUHJvdmlkZXJzOiAwLFxyXG4gICAgICAgIGF2YWlsYWJsZVByb3ZpZGVyczogMCxcclxuICAgICAgICBidXN5UHJvdmlkZXJzOiAwLFxyXG4gICAgICAgIHVuYXZhaWxhYmxlUHJvdmlkZXJzOiAwLFxyXG4gICAgICAgIGF2ZXJhZ2VMb2FkOiAwXHJcbiAgICAgIH0pO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdBdmFpbGFiaWxpdHkgU3RhdHVzIERldGVybWluYXRpb24nLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIGRldGVybWluZSBhdmFpbGFiaWxpdHkgc3RhdHVzIGNvcnJlY3RseScsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgdGVzdENhc2VzID0gW1xyXG4gICAgICAgIHsgY3VycmVudExvYWQ6IDMwLCBleHBlY3RlZDogJ2F2YWlsYWJsZScgfSxcclxuICAgICAgICB7IGN1cnJlbnRMb2FkOiA2OSwgZXhwZWN0ZWQ6ICdhdmFpbGFibGUnIH0sXHJcbiAgICAgICAgeyBjdXJyZW50TG9hZDogNzAsIGV4cGVjdGVkOiAnYnVzeScgfSxcclxuICAgICAgICB7IGN1cnJlbnRMb2FkOiA4NSwgZXhwZWN0ZWQ6ICdidXN5JyB9LFxyXG4gICAgICAgIHsgY3VycmVudExvYWQ6IDk0LCBleHBlY3RlZDogJ2J1c3knIH0sXHJcbiAgICAgICAgeyBjdXJyZW50TG9hZDogOTUsIGV4cGVjdGVkOiAndW5hdmFpbGFibGUnIH0sXHJcbiAgICAgICAgeyBjdXJyZW50TG9hZDogMTAwLCBleHBlY3RlZDogJ3VuYXZhaWxhYmxlJyB9XHJcbiAgICAgIF07XHJcblxyXG4gICAgICBmb3IgKGNvbnN0IHRlc3RDYXNlIG9mIHRlc3RDYXNlcykge1xyXG4gICAgICAgIGNvbnN0IG1vY2tQcm92aWRlciA9IHtcclxuICAgICAgICAgIHByb3ZpZGVySWQ6ICd0ZXN0LXByb3ZpZGVyJyxcclxuICAgICAgICAgIGNhcGFjaXR5OiB7XHJcbiAgICAgICAgICAgIHRvdGFsQmVkczogMTAwLFxyXG4gICAgICAgICAgICBhdmFpbGFibGVCZWRzOiAxMDAgLSB0ZXN0Q2FzZS5jdXJyZW50TG9hZCxcclxuICAgICAgICAgICAgY3VycmVudExvYWQ6IHRlc3RDYXNlLmN1cnJlbnRMb2FkLFxyXG4gICAgICAgICAgICBkYWlseVBhdGllbnRDYXBhY2l0eTogMjAwXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgdXBkYXRlZEF0OiAnMjAyNC0wMS0wMVQxMDowMDowMFonXHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgbW9ja0R5bmFtb0NsaWVudC5zZW5kLm1vY2tSZXNvbHZlZFZhbHVlKHsgSXRlbTogbW9ja1Byb3ZpZGVyIH0pO1xyXG5cclxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBzZXJ2aWNlLmdldFByb3ZpZGVyQ2FwYWNpdHkoJ3Rlc3QtcHJvdmlkZXInKTtcclxuXHJcbiAgICAgICAgZXhwZWN0KHJlc3VsdD8uYXZhaWxhYmlsaXR5U3RhdHVzKS50b0JlKHRlc3RDYXNlLmV4cGVjdGVkKTtcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdFcnJvciBIYW5kbGluZycsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgaGFuZGxlIER5bmFtb0RCIGVycm9ycyBncmFjZWZ1bGx5JywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBtb2NrRHluYW1vQ2xpZW50LnNlbmQubW9ja1JlamVjdGVkVmFsdWUobmV3IEVycm9yKCdEeW5hbW9EQiBlcnJvcicpKTtcclxuXHJcbiAgICAgIGF3YWl0IGV4cGVjdChzZXJ2aWNlLmdldFByb3ZpZGVyQ2FwYWNpdHkoJ3Byb3ZpZGVyLTEnKSkucmVqZWN0cy50b1Rocm93KCdGYWlsZWQgdG8gZ2V0IHByb3ZpZGVyIGNhcGFjaXR5Jyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGhhbmRsZSB2YWxpZGF0aW9uIGVycm9ycyBpbiB1cGRhdGVDYXBhY2l0eScsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgaW52YWxpZElucHV0ID0ge1xyXG4gICAgICAgIHByb3ZpZGVySWQ6ICcnLFxyXG4gICAgICAgIGN1cnJlbnRMb2FkOiAxNTAgLy8gSW52YWxpZCBsb2FkID4gMTAwXHJcbiAgICAgIH0gYXMgVXBkYXRlQ2FwYWNpdHlJbnB1dDtcclxuXHJcbiAgICAgIGF3YWl0IGV4cGVjdChzZXJ2aWNlLnVwZGF0ZUNhcGFjaXR5KGludmFsaWRJbnB1dCkpLnJlamVjdHMudG9UaHJvdygnSW52YWxpZCBjYXBhY2l0eSB1cGRhdGUgZGF0YScpO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcbn0pOyJdfQ==