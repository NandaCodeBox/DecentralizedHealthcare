"use strict";
// Unit tests for Validation Queue Manager
// Tests queue management functionality
Object.defineProperty(exports, "__esModule", { value: true });
const validation_queue_manager_1 = require("../validation-queue-manager");
const types_1 = require("../../../types");
// Mock DynamoDB Document Client
const mockDocClient = {
    send: jest.fn()
};
describe('ValidationQueueManager', () => {
    let queueManager;
    const tableName = 'test-episodes';
    beforeEach(() => {
        queueManager = new validation_queue_manager_1.ValidationQueueManager(mockDocClient, tableName);
        jest.clearAllMocks();
    });
    const createMockEpisode = (urgencyLevel = types_1.UrgencyLevel.URGENT, episodeId = 'episode-123') => ({
        episodeId,
        patientId: 'patient-456',
        status: types_1.EpisodeStatus.ACTIVE,
        symptoms: {
            primaryComplaint: 'Chest pain',
            duration: '2 hours',
            severity: 8,
            associatedSymptoms: ['shortness of breath'],
            inputMethod: types_1.InputMethod.TEXT
        },
        triage: {
            urgencyLevel,
            ruleBasedScore: 85,
            aiAssessment: {
                used: true,
                confidence: 0.9,
                reasoning: 'High severity symptoms'
            },
            finalScore: 88
        },
        interactions: [],
        createdAt: new Date(),
        updatedAt: new Date()
    });
    describe('addToQueue', () => {
        it('should add episode to validation queue with correct priority', async () => {
            const episode = createMockEpisode(types_1.UrgencyLevel.EMERGENCY);
            const supervisorId = 'supervisor-789';
            mockDocClient.send.mockResolvedValueOnce({});
            await queueManager.addToQueue(episode, supervisorId);
            expect(mockDocClient.send).toHaveBeenCalledWith(expect.objectContaining({
                TableName: tableName,
                Key: { episodeId: episode.episodeId },
                UpdateExpression: expect.stringContaining('validationStatus = :status'),
                ExpressionAttributeValues: expect.objectContaining({
                    ':status': 'pending',
                    ':supervisor': supervisorId,
                    ':priority': 100 // Emergency priority
                })
            }));
        });
        it('should calculate correct priority for different urgency levels', async () => {
            const testCases = [
                { urgency: types_1.UrgencyLevel.EMERGENCY, expectedPriority: 100 },
                { urgency: types_1.UrgencyLevel.URGENT, expectedPriority: 75 },
                { urgency: types_1.UrgencyLevel.ROUTINE, expectedPriority: 50 },
                { urgency: types_1.UrgencyLevel.SELF_CARE, expectedPriority: 25 }
            ];
            for (const testCase of testCases) {
                const episode = createMockEpisode(testCase.urgency);
                mockDocClient.send.mockResolvedValueOnce({});
                await queueManager.addToQueue(episode);
                expect(mockDocClient.send).toHaveBeenCalledWith(expect.objectContaining({
                    ExpressionAttributeValues: expect.objectContaining({
                        ':priority': testCase.expectedPriority
                    })
                }));
            }
        });
        it('should handle episodes without assigned supervisor', async () => {
            const episode = createMockEpisode();
            mockDocClient.send.mockResolvedValueOnce({});
            await queueManager.addToQueue(episode);
            expect(mockDocClient.send).toHaveBeenCalledWith(expect.objectContaining({
                ExpressionAttributeValues: expect.objectContaining({
                    ':supervisor': null
                })
            }));
        });
    });
    describe('removeFromQueue', () => {
        it('should remove episode from validation queue', async () => {
            const episodeId = 'episode-123';
            mockDocClient.send.mockResolvedValueOnce({});
            await queueManager.removeFromQueue(episodeId);
            expect(mockDocClient.send).toHaveBeenCalledWith(expect.objectContaining({
                TableName: tableName,
                Key: { episodeId },
                UpdateExpression: expect.stringContaining('REMOVE queuedAt, queuePriority, assignedSupervisor'),
                ExpressionAttributeValues: expect.objectContaining({
                    ':status': 'completed'
                })
            }));
        });
    });
    describe('getQueue', () => {
        it('should return queue items for specific supervisor', async () => {
            const supervisorId = 'supervisor-789';
            const mockEpisodes = [
                createMockEpisode(types_1.UrgencyLevel.EMERGENCY, 'episode-1'),
                createMockEpisode(types_1.UrgencyLevel.URGENT, 'episode-2')
            ];
            mockDocClient.send.mockResolvedValueOnce({
                Items: mockEpisodes
            });
            const result = await queueManager.getQueue(supervisorId, undefined, 10);
            expect(mockDocClient.send).toHaveBeenCalledWith(expect.objectContaining({
                TableName: tableName,
                IndexName: 'ValidationStatusIndex',
                KeyConditionExpression: 'validationStatus = :status',
                FilterExpression: 'assignedSupervisor = :supervisor',
                ExpressionAttributeValues: {
                    ':status': 'pending',
                    ':supervisor': supervisorId
                },
                Limit: 10
            }));
            expect(result).toHaveLength(2);
            expect(result[0].episodeId).toBe('episode-1');
            expect(result[0].urgencyLevel).toBe(types_1.UrgencyLevel.EMERGENCY);
        });
        it('should return all pending episodes when no supervisor specified', async () => {
            const mockEpisodes = [createMockEpisode()];
            mockDocClient.send.mockResolvedValueOnce({
                Items: mockEpisodes
            });
            const result = await queueManager.getQueue();
            expect(mockDocClient.send).toHaveBeenCalledWith(expect.objectContaining({
                KeyConditionExpression: 'validationStatus = :status',
                ExpressionAttributeValues: {
                    ':status': 'pending'
                }
            }));
            expect(result).toHaveLength(1);
        });
        it('should filter queue by urgency level', async () => {
            const mockEpisodes = [
                createMockEpisode(types_1.UrgencyLevel.EMERGENCY, 'episode-1'),
                createMockEpisode(types_1.UrgencyLevel.URGENT, 'episode-2')
            ];
            mockDocClient.send.mockResolvedValueOnce({
                Items: mockEpisodes
            });
            const result = await queueManager.getQueue(undefined, types_1.UrgencyLevel.EMERGENCY);
            expect(result).toHaveLength(1);
            expect(result[0].urgencyLevel).toBe(types_1.UrgencyLevel.EMERGENCY);
        });
        it('should sort queue items by priority and queue time', async () => {
            const now = new Date();
            const earlier = new Date(now.getTime() - 60000); // 1 minute earlier
            const mockEpisodes = [
                { ...createMockEpisode(types_1.UrgencyLevel.URGENT, 'episode-1'), createdAt: now },
                { ...createMockEpisode(types_1.UrgencyLevel.EMERGENCY, 'episode-2'), createdAt: earlier },
                { ...createMockEpisode(types_1.UrgencyLevel.URGENT, 'episode-3'), createdAt: earlier }
            ];
            mockDocClient.send.mockResolvedValueOnce({
                Items: mockEpisodes
            });
            const result = await queueManager.getQueue();
            // Emergency should be first (highest priority)
            expect(result[0].episodeId).toBe('episode-2');
            expect(result[0].urgencyLevel).toBe(types_1.UrgencyLevel.EMERGENCY);
            // Among same priority, earlier queued should be first
            expect(result[1].episodeId).toBe('episode-3');
            expect(result[2].episodeId).toBe('episode-1');
        });
    });
    describe('getQueuePosition', () => {
        it('should return correct queue position for episode', async () => {
            const episodeId = 'episode-2';
            const mockEpisode = createMockEpisode(types_1.UrgencyLevel.URGENT, episodeId);
            // Mock getting the specific episode
            mockDocClient.send.mockResolvedValueOnce({
                Items: [mockEpisode]
            });
            // Mock getting all queue items
            const mockQueueEpisodes = [
                createMockEpisode(types_1.UrgencyLevel.EMERGENCY, 'episode-1'),
                createMockEpisode(types_1.UrgencyLevel.URGENT, 'episode-2'),
                createMockEpisode(types_1.UrgencyLevel.ROUTINE, 'episode-3')
            ];
            mockDocClient.send.mockResolvedValueOnce({
                Items: mockQueueEpisodes
            });
            const position = await queueManager.getQueuePosition(episodeId);
            expect(position).toBe(2); // Second in queue (emergency first)
        });
        it('should return -1 for episode not in queue', async () => {
            // Mock episode not found in queue
            mockDocClient.send.mockResolvedValueOnce({
                Items: []
            });
            const position = await queueManager.getQueuePosition('non-existent-episode');
            expect(position).toBe(-1);
        });
    });
    describe('getEstimatedWaitTime', () => {
        it('should calculate estimated wait time based on queue position', async () => {
            const episodeId = 'episode-123';
            // Mock queue position
            jest.spyOn(queueManager, 'getQueuePosition').mockResolvedValueOnce(3);
            const waitTime = await queueManager.getEstimatedWaitTime(episodeId);
            // Position 3 means 2 episodes ahead, 2 * 15 minutes = 30 minutes
            expect(waitTime).toBe(30);
        });
        it('should return 0 for episode not in queue', async () => {
            const episodeId = 'episode-123';
            // Mock episode not in queue
            jest.spyOn(queueManager, 'getQueuePosition').mockResolvedValueOnce(-1);
            const waitTime = await queueManager.getEstimatedWaitTime(episodeId);
            expect(waitTime).toBe(0);
        });
        it('should return 0 for episode at front of queue', async () => {
            const episodeId = 'episode-123';
            // Mock episode at front of queue
            jest.spyOn(queueManager, 'getQueuePosition').mockResolvedValueOnce(1);
            const waitTime = await queueManager.getEstimatedWaitTime(episodeId);
            expect(waitTime).toBe(0);
        });
    });
    describe('getOverdueEpisodes', () => {
        it('should return episodes that have been in queue too long', async () => {
            const thresholdMinutes = 30;
            const mockOverdueEpisodes = [
                createMockEpisode(types_1.UrgencyLevel.URGENT, 'overdue-1'),
                createMockEpisode(types_1.UrgencyLevel.ROUTINE, 'overdue-2')
            ];
            mockDocClient.send.mockResolvedValueOnce({
                Items: mockOverdueEpisodes
            });
            const result = await queueManager.getOverdueEpisodes(thresholdMinutes);
            expect(mockDocClient.send).toHaveBeenCalledWith(expect.objectContaining({
                KeyConditionExpression: 'validationStatus = :status',
                FilterExpression: 'queuedAt < :threshold',
                ExpressionAttributeValues: expect.objectContaining({
                    ':status': 'pending',
                    ':threshold': expect.any(String)
                })
            }));
            expect(result).toHaveLength(2);
        });
    });
    describe('reassignEpisode', () => {
        it('should reassign episode to new supervisor', async () => {
            const episodeId = 'episode-123';
            const newSupervisorId = 'new-supervisor-456';
            mockDocClient.send.mockResolvedValueOnce({});
            await queueManager.reassignEpisode(episodeId, newSupervisorId);
            expect(mockDocClient.send).toHaveBeenCalledWith(expect.objectContaining({
                TableName: tableName,
                Key: { episodeId },
                UpdateExpression: 'SET assignedSupervisor = :supervisor, updatedAt = :updatedAt',
                ExpressionAttributeValues: expect.objectContaining({
                    ':supervisor': newSupervisorId
                })
            }));
        });
    });
    describe('getQueueStatistics', () => {
        it('should return comprehensive queue statistics', async () => {
            const mockQueueEpisodes = [
                createMockEpisode(types_1.UrgencyLevel.EMERGENCY, 'episode-1'),
                createMockEpisode(types_1.UrgencyLevel.EMERGENCY, 'episode-2'),
                createMockEpisode(types_1.UrgencyLevel.URGENT, 'episode-3'),
                createMockEpisode(types_1.UrgencyLevel.ROUTINE, 'episode-4')
            ];
            mockDocClient.send.mockResolvedValueOnce({
                Items: mockQueueEpisodes
            });
            const stats = await queueManager.getQueueStatistics();
            expect(stats.totalPending).toBe(4);
            expect(stats.emergencyCount).toBe(2);
            expect(stats.urgentCount).toBe(1);
            expect(stats.routineCount).toBe(1);
            expect(stats.averageWaitTime).toBe(15); // Default average
        });
    });
    describe('Error Handling', () => {
        it('should handle DynamoDB errors in addToQueue', async () => {
            const episode = createMockEpisode();
            mockDocClient.send.mockRejectedValueOnce(new Error('DynamoDB error'));
            await expect(queueManager.addToQueue(episode)).rejects.toThrow('DynamoDB error');
        });
        it('should handle DynamoDB errors in getQueue', async () => {
            mockDocClient.send.mockRejectedValueOnce(new Error('Query failed'));
            await expect(queueManager.getQueue()).rejects.toThrow('Query failed');
        });
        it('should return empty array for getOverdueEpisodes on error', async () => {
            mockDocClient.send.mockRejectedValueOnce(new Error('Query failed'));
            const result = await queueManager.getOverdueEpisodes();
            expect(result).toEqual([]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFsaWRhdGlvbi1xdWV1ZS1tYW5hZ2VyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9zcmMvbGFtYmRhL2h1bWFuLXZhbGlkYXRpb24vX190ZXN0c19fL3ZhbGlkYXRpb24tcXVldWUtbWFuYWdlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSwwQ0FBMEM7QUFDMUMsdUNBQXVDOztBQUV2QywwRUFBcUU7QUFFckUsMENBQW1GO0FBRW5GLGdDQUFnQztBQUNoQyxNQUFNLGFBQWEsR0FBRztJQUNwQixJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtDQUNxQixDQUFDO0FBRXZDLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7SUFDdEMsSUFBSSxZQUFvQyxDQUFDO0lBQ3pDLE1BQU0sU0FBUyxHQUFHLGVBQWUsQ0FBQztJQUVsQyxVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2QsWUFBWSxHQUFHLElBQUksaURBQXNCLENBQUMsYUFBYSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3BFLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztJQUN2QixDQUFDLENBQUMsQ0FBQztJQUVILE1BQU0saUJBQWlCLEdBQUcsQ0FDeEIsZUFBNkIsb0JBQVksQ0FBQyxNQUFNLEVBQ2hELFlBQW9CLGFBQWEsRUFDeEIsRUFBRSxDQUFDLENBQUM7UUFDYixTQUFTO1FBQ1QsU0FBUyxFQUFFLGFBQWE7UUFDeEIsTUFBTSxFQUFFLHFCQUFhLENBQUMsTUFBTTtRQUM1QixRQUFRLEVBQUU7WUFDUixnQkFBZ0IsRUFBRSxZQUFZO1lBQzlCLFFBQVEsRUFBRSxTQUFTO1lBQ25CLFFBQVEsRUFBRSxDQUFDO1lBQ1gsa0JBQWtCLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQztZQUMzQyxXQUFXLEVBQUUsbUJBQVcsQ0FBQyxJQUFJO1NBQzlCO1FBQ0QsTUFBTSxFQUFFO1lBQ04sWUFBWTtZQUNaLGNBQWMsRUFBRSxFQUFFO1lB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QUFhLENBQUMsSUFBa0IsQ0FBQyxxQkFBcUIsQ0FDckQsSUFBSSxLQUFLLENBQUMsY0FBYyxDQUFDLENBQzFCLENBQUM7WUFFRixNQUFNLE1BQU0sQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBQ3hFLENBQUMsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLDJEQUEyRCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3hFLGFBQWEsQ0FBQyxJQUFrQixDQUFDLHFCQUFxQixDQUNyRCxJQUFJLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FDMUIsQ0FBQztZQUVGLE1BQU0sTUFBTSxHQUFHLE1BQU0sWUFBWSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFFdkQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM3QixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBVbml0IHRlc3RzIGZvciBWYWxpZGF0aW9uIFF1ZXVlIE1hbmFnZXJcclxuLy8gVGVzdHMgcXVldWUgbWFuYWdlbWVudCBmdW5jdGlvbmFsaXR5XHJcblxyXG5pbXBvcnQgeyBWYWxpZGF0aW9uUXVldWVNYW5hZ2VyIH0gZnJvbSAnLi4vdmFsaWRhdGlvbi1xdWV1ZS1tYW5hZ2VyJztcclxuaW1wb3J0IHsgRHluYW1vREJEb2N1bWVudENsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XHJcbmltcG9ydCB7IEVwaXNvZGUsIFVyZ2VuY3lMZXZlbCwgRXBpc29kZVN0YXR1cywgSW5wdXRNZXRob2QgfSBmcm9tICcuLi8uLi8uLi90eXBlcyc7XHJcblxyXG4vLyBNb2NrIER5bmFtb0RCIERvY3VtZW50IENsaWVudFxyXG5jb25zdCBtb2NrRG9jQ2xpZW50ID0ge1xyXG4gIHNlbmQ6IGplc3QuZm4oKVxyXG59IGFzIHVua25vd24gYXMgRHluYW1vREJEb2N1bWVudENsaWVudDtcclxuXHJcbmRlc2NyaWJlKCdWYWxpZGF0aW9uUXVldWVNYW5hZ2VyJywgKCkgPT4ge1xyXG4gIGxldCBxdWV1ZU1hbmFnZXI6IFZhbGlkYXRpb25RdWV1ZU1hbmFnZXI7XHJcbiAgY29uc3QgdGFibGVOYW1lID0gJ3Rlc3QtZXBpc29kZXMnO1xyXG5cclxuICBiZWZvcmVFYWNoKCgpID0+IHtcclxuICAgIHF1ZXVlTWFuYWdlciA9IG5ldyBWYWxpZGF0aW9uUXVldWVNYW5hZ2VyKG1vY2tEb2NDbGllbnQsIHRhYmxlTmFtZSk7XHJcbiAgICBqZXN0LmNsZWFyQWxsTW9ja3MoKTtcclxuICB9KTtcclxuXHJcbiAgY29uc3QgY3JlYXRlTW9ja0VwaXNvZGUgPSAoXHJcbiAgICB1cmdlbmN5TGV2ZWw6IFVyZ2VuY3lMZXZlbCA9IFVyZ2VuY3lMZXZlbC5VUkdFTlQsXHJcbiAgICBlcGlzb2RlSWQ6IHN0cmluZyA9ICdlcGlzb2RlLTEyMydcclxuICApOiBFcGlzb2RlID0+ICh7XHJcbiAgICBlcGlzb2RlSWQsXHJcbiAgICBwYXRpZW50SWQ6ICdwYXRpZW50LTQ1NicsXHJcbiAgICBzdGF0dXM6IEVwaXNvZGVTdGF0dXMuQUNUSVZFLFxyXG4gICAgc3ltcHRvbXM6IHtcclxuICAgICAgcHJpbWFyeUNvbXBsYWludDogJ0NoZXN0IHBhaW4nLFxyXG4gICAgICBkdXJhdGlvbjogJzIgaG91cnMnLFxyXG4gICAgICBzZXZlcml0eTogOCxcclxuICAgICAgYXNzb2NpYXRlZFN5bXB0b21zOiBbJ3Nob3J0bmVzcyBvZiBicmVhdGgnXSxcclxuICAgICAgaW5wdXRNZXRob2Q6IElucHV0TWV0aG9kLlRFWFRcclxuICAgIH0sXHJcbiAgICB0cmlhZ2U6IHtcclxuICAgICAgdXJnZW5jeUxldmVsLFxyXG4gICAgICBydWxlQmFzZWRTY29yZTogODUsXHJcbiAgICAgIGFpQXNzZXNzbWVudDoge1xyXG4gICAgICAgIHVzZWQ6IHRydWUsXHJcbiAgICAgICAgY29uZmlkZW5jZTogMC45LFxyXG4gICAgICAgIHJlYXNvbmluZzogJ0hpZ2ggc2V2ZXJpdHkgc3ltcHRvbXMnXHJcbiAgICAgIH0sXHJcbiAgICAgIGZpbmFsU2NvcmU6IDg4XHJcbiAgICB9LFxyXG4gICAgaW50ZXJhY3Rpb25zOiBbXSxcclxuICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKSxcclxuICAgIHVwZGF0ZWRBdDogbmV3IERhdGUoKVxyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnYWRkVG9RdWV1ZScsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgYWRkIGVwaXNvZGUgdG8gdmFsaWRhdGlvbiBxdWV1ZSB3aXRoIGNvcnJlY3QgcHJpb3JpdHknLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGVwaXNvZGUgPSBjcmVhdGVNb2NrRXBpc29kZShVcmdlbmN5TGV2ZWwuRU1FUkdFTkNZKTtcclxuICAgICAgY29uc3Qgc3VwZXJ2aXNvcklkID0gJ3N1cGVydmlzb3ItNzg5JztcclxuXHJcbiAgICAgIChtb2NrRG9jQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe30pO1xyXG5cclxuICAgICAgYXdhaXQgcXVldWVNYW5hZ2VyLmFkZFRvUXVldWUoZXBpc29kZSwgc3VwZXJ2aXNvcklkKTtcclxuXHJcbiAgICAgIGV4cGVjdChtb2NrRG9jQ2xpZW50LnNlbmQpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxyXG4gICAgICAgIGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcclxuICAgICAgICAgIFRhYmxlTmFtZTogdGFibGVOYW1lLFxyXG4gICAgICAgICAgS2V5OiB7IGVwaXNvZGVJZDogZXBpc29kZS5lcGlzb2RlSWQgfSxcclxuICAgICAgICAgIFVwZGF0ZUV4cHJlc3Npb246IGV4cGVjdC5zdHJpbmdDb250YWluaW5nKCd2YWxpZGF0aW9uU3RhdHVzID0gOnN0YXR1cycpLFxyXG4gICAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczogZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgICAnOnN0YXR1cyc6ICdwZW5kaW5nJyxcclxuICAgICAgICAgICAgJzpzdXBlcnZpc29yJzogc3VwZXJ2aXNvcklkLFxyXG4gICAgICAgICAgICAnOnByaW9yaXR5JzogMTAwIC8vIEVtZXJnZW5jeSBwcmlvcml0eVxyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9KVxyXG4gICAgICApO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBjYWxjdWxhdGUgY29ycmVjdCBwcmlvcml0eSBmb3IgZGlmZmVyZW50IHVyZ2VuY3kgbGV2ZWxzJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCB0ZXN0Q2FzZXMgPSBbXHJcbiAgICAgICAgeyB1cmdlbmN5OiBVcmdlbmN5TGV2ZWwuRU1FUkdFTkNZLCBleHBlY3RlZFByaW9yaXR5OiAxMDAgfSxcclxuICAgICAgICB7IHVyZ2VuY3k6IFVyZ2VuY3lMZXZlbC5VUkdFTlQsIGV4cGVjdGVkUHJpb3JpdHk6IDc1IH0sXHJcbiAgICAgICAgeyB1cmdlbmN5OiBVcmdlbmN5TGV2ZWwuUk9VVElORSwgZXhwZWN0ZWRQcmlvcml0eTogNTAgfSxcclxuICAgICAgICB7IHVyZ2VuY3k6IFVyZ2VuY3lMZXZlbC5TRUxGX0NBUkUsIGV4cGVjdGVkUHJpb3JpdHk6IDI1IH1cclxuICAgICAgXTtcclxuXHJcbiAgICAgIGZvciAoY29uc3QgdGVzdENhc2Ugb2YgdGVzdENhc2VzKSB7XHJcbiAgICAgICAgY29uc3QgZXBpc29kZSA9IGNyZWF0ZU1vY2tFcGlzb2RlKHRlc3RDYXNlLnVyZ2VuY3kpO1xyXG4gICAgICAgIChtb2NrRG9jQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe30pO1xyXG5cclxuICAgICAgICBhd2FpdCBxdWV1ZU1hbmFnZXIuYWRkVG9RdWV1ZShlcGlzb2RlKTtcclxuXHJcbiAgICAgICAgZXhwZWN0KG1vY2tEb2NDbGllbnQuc2VuZCkudG9IYXZlQmVlbkNhbGxlZFdpdGgoXHJcbiAgICAgICAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XHJcbiAgICAgICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcclxuICAgICAgICAgICAgICAnOnByaW9yaXR5JzogdGVzdENhc2UuZXhwZWN0ZWRQcmlvcml0eVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgfSlcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGhhbmRsZSBlcGlzb2RlcyB3aXRob3V0IGFzc2lnbmVkIHN1cGVydmlzb3InLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGVwaXNvZGUgPSBjcmVhdGVNb2NrRXBpc29kZSgpO1xyXG5cclxuICAgICAgKG1vY2tEb2NDbGllbnQuc2VuZCBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7fSk7XHJcblxyXG4gICAgICBhd2FpdCBxdWV1ZU1hbmFnZXIuYWRkVG9RdWV1ZShlcGlzb2RlKTtcclxuXHJcbiAgICAgIGV4cGVjdChtb2NrRG9jQ2xpZW50LnNlbmQpLnRvSGF2ZUJlZW5DYWxsZWRXaXRoKFxyXG4gICAgICAgIGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcclxuICAgICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcclxuICAgICAgICAgICAgJzpzdXBlcnZpc29yJzogbnVsbFxyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9KVxyXG4gICAgICApO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdyZW1vdmVGcm9tUXVldWUnLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIHJlbW92ZSBlcGlzb2RlIGZyb20gdmFsaWRhdGlvbiBxdWV1ZScsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgZXBpc29kZUlkID0gJ2VwaXNvZGUtMTIzJztcclxuXHJcbiAgICAgIChtb2NrRG9jQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe30pO1xyXG5cclxuICAgICAgYXdhaXQgcXVldWVNYW5hZ2VyLnJlbW92ZUZyb21RdWV1ZShlcGlzb2RlSWQpO1xyXG5cclxuICAgICAgZXhwZWN0KG1vY2tEb2NDbGllbnQuc2VuZCkudG9IYXZlQmVlbkNhbGxlZFdpdGgoXHJcbiAgICAgICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgVGFibGVOYW1lOiB0YWJsZU5hbWUsXHJcbiAgICAgICAgICBLZXk6IHsgZXBpc29kZUlkIH0sXHJcbiAgICAgICAgICBVcGRhdGVFeHByZXNzaW9uOiBleHBlY3Quc3RyaW5nQ29udGFpbmluZygnUkVNT1ZFIHF1ZXVlZEF0LCBxdWV1ZVByaW9yaXR5LCBhc3NpZ25lZFN1cGVydmlzb3InKSxcclxuICAgICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IGV4cGVjdC5vYmplY3RDb250YWluaW5nKHtcclxuICAgICAgICAgICAgJzpzdGF0dXMnOiAnY29tcGxldGVkJ1xyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9KVxyXG4gICAgICApO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdnZXRRdWV1ZScsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgcmV0dXJuIHF1ZXVlIGl0ZW1zIGZvciBzcGVjaWZpYyBzdXBlcnZpc29yJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBzdXBlcnZpc29ySWQgPSAnc3VwZXJ2aXNvci03ODknO1xyXG4gICAgICBjb25zdCBtb2NrRXBpc29kZXMgPSBbXHJcbiAgICAgICAgY3JlYXRlTW9ja0VwaXNvZGUoVXJnZW5jeUxldmVsLkVNRVJHRU5DWSwgJ2VwaXNvZGUtMScpLFxyXG4gICAgICAgIGNyZWF0ZU1vY2tFcGlzb2RlKFVyZ2VuY3lMZXZlbC5VUkdFTlQsICdlcGlzb2RlLTInKVxyXG4gICAgICBdO1xyXG5cclxuICAgICAgKG1vY2tEb2NDbGllbnQuc2VuZCBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7XHJcbiAgICAgICAgSXRlbXM6IG1vY2tFcGlzb2Rlc1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHF1ZXVlTWFuYWdlci5nZXRRdWV1ZShzdXBlcnZpc29ySWQsIHVuZGVmaW5lZCwgMTApO1xyXG5cclxuICAgICAgZXhwZWN0KG1vY2tEb2NDbGllbnQuc2VuZCkudG9IYXZlQmVlbkNhbGxlZFdpdGgoXHJcbiAgICAgICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgVGFibGVOYW1lOiB0YWJsZU5hbWUsXHJcbiAgICAgICAgICBJbmRleE5hbWU6ICdWYWxpZGF0aW9uU3RhdHVzSW5kZXgnLFxyXG4gICAgICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJ3ZhbGlkYXRpb25TdGF0dXMgPSA6c3RhdHVzJyxcclxuICAgICAgICAgIEZpbHRlckV4cHJlc3Npb246ICdhc3NpZ25lZFN1cGVydmlzb3IgPSA6c3VwZXJ2aXNvcicsXHJcbiAgICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgICAgICc6c3RhdHVzJzogJ3BlbmRpbmcnLFxyXG4gICAgICAgICAgICAnOnN1cGVydmlzb3InOiBzdXBlcnZpc29ySWRcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBMaW1pdDogMTBcclxuICAgICAgICB9KVxyXG4gICAgICApO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9IYXZlTGVuZ3RoKDIpO1xyXG4gICAgICBleHBlY3QocmVzdWx0WzBdLmVwaXNvZGVJZCkudG9CZSgnZXBpc29kZS0xJyk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHRbMF0udXJnZW5jeUxldmVsKS50b0JlKFVyZ2VuY3lMZXZlbC5FTUVSR0VOQ1kpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gYWxsIHBlbmRpbmcgZXBpc29kZXMgd2hlbiBubyBzdXBlcnZpc29yIHNwZWNpZmllZCcsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgbW9ja0VwaXNvZGVzID0gW2NyZWF0ZU1vY2tFcGlzb2RlKCldO1xyXG5cclxuICAgICAgKG1vY2tEb2NDbGllbnQuc2VuZCBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7XHJcbiAgICAgICAgSXRlbXM6IG1vY2tFcGlzb2Rlc1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHF1ZXVlTWFuYWdlci5nZXRRdWV1ZSgpO1xyXG5cclxuICAgICAgZXhwZWN0KG1vY2tEb2NDbGllbnQuc2VuZCkudG9IYXZlQmVlbkNhbGxlZFdpdGgoXHJcbiAgICAgICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJ3ZhbGlkYXRpb25TdGF0dXMgPSA6c3RhdHVzJyxcclxuICAgICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAgICAgJzpzdGF0dXMnOiAncGVuZGluZydcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KVxyXG4gICAgICApO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9IYXZlTGVuZ3RoKDEpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBmaWx0ZXIgcXVldWUgYnkgdXJnZW5jeSBsZXZlbCcsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgbW9ja0VwaXNvZGVzID0gW1xyXG4gICAgICAgIGNyZWF0ZU1vY2tFcGlzb2RlKFVyZ2VuY3lMZXZlbC5FTUVSR0VOQ1ksICdlcGlzb2RlLTEnKSxcclxuICAgICAgICBjcmVhdGVNb2NrRXBpc29kZShVcmdlbmN5TGV2ZWwuVVJHRU5ULCAnZXBpc29kZS0yJylcclxuICAgICAgXTtcclxuXHJcbiAgICAgIChtb2NrRG9jQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe1xyXG4gICAgICAgIEl0ZW1zOiBtb2NrRXBpc29kZXNcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBxdWV1ZU1hbmFnZXIuZ2V0UXVldWUodW5kZWZpbmVkLCBVcmdlbmN5TGV2ZWwuRU1FUkdFTkNZKTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvSGF2ZUxlbmd0aCgxKTtcclxuICAgICAgZXhwZWN0KHJlc3VsdFswXS51cmdlbmN5TGV2ZWwpLnRvQmUoVXJnZW5jeUxldmVsLkVNRVJHRU5DWSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIHNvcnQgcXVldWUgaXRlbXMgYnkgcHJpb3JpdHkgYW5kIHF1ZXVlIHRpbWUnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XHJcbiAgICAgIGNvbnN0IGVhcmxpZXIgPSBuZXcgRGF0ZShub3cuZ2V0VGltZSgpIC0gNjAwMDApOyAvLyAxIG1pbnV0ZSBlYXJsaWVyXHJcblxyXG4gICAgICBjb25zdCBtb2NrRXBpc29kZXMgPSBbXHJcbiAgICAgICAgeyAuLi5jcmVhdGVNb2NrRXBpc29kZShVcmdlbmN5TGV2ZWwuVVJHRU5ULCAnZXBpc29kZS0xJyksIGNyZWF0ZWRBdDogbm93IH0sXHJcbiAgICAgICAgeyAuLi5jcmVhdGVNb2NrRXBpc29kZShVcmdlbmN5TGV2ZWwuRU1FUkdFTkNZLCAnZXBpc29kZS0yJyksIGNyZWF0ZWRBdDogZWFybGllciB9LFxyXG4gICAgICAgIHsgLi4uY3JlYXRlTW9ja0VwaXNvZGUoVXJnZW5jeUxldmVsLlVSR0VOVCwgJ2VwaXNvZGUtMycpLCBjcmVhdGVkQXQ6IGVhcmxpZXIgfVxyXG4gICAgICBdO1xyXG5cclxuICAgICAgKG1vY2tEb2NDbGllbnQuc2VuZCBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7XHJcbiAgICAgICAgSXRlbXM6IG1vY2tFcGlzb2Rlc1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHF1ZXVlTWFuYWdlci5nZXRRdWV1ZSgpO1xyXG5cclxuICAgICAgLy8gRW1lcmdlbmN5IHNob3VsZCBiZSBmaXJzdCAoaGlnaGVzdCBwcmlvcml0eSlcclxuICAgICAgZXhwZWN0KHJlc3VsdFswXS5lcGlzb2RlSWQpLnRvQmUoJ2VwaXNvZGUtMicpO1xyXG4gICAgICBleHBlY3QocmVzdWx0WzBdLnVyZ2VuY3lMZXZlbCkudG9CZShVcmdlbmN5TGV2ZWwuRU1FUkdFTkNZKTtcclxuXHJcbiAgICAgIC8vIEFtb25nIHNhbWUgcHJpb3JpdHksIGVhcmxpZXIgcXVldWVkIHNob3VsZCBiZSBmaXJzdFxyXG4gICAgICBleHBlY3QocmVzdWx0WzFdLmVwaXNvZGVJZCkudG9CZSgnZXBpc29kZS0zJyk7XHJcbiAgICAgIGV4cGVjdChyZXN1bHRbMl0uZXBpc29kZUlkKS50b0JlKCdlcGlzb2RlLTEnKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnZ2V0UXVldWVQb3NpdGlvbicsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgcmV0dXJuIGNvcnJlY3QgcXVldWUgcG9zaXRpb24gZm9yIGVwaXNvZGUnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGVwaXNvZGVJZCA9ICdlcGlzb2RlLTInO1xyXG4gICAgICBjb25zdCBtb2NrRXBpc29kZSA9IGNyZWF0ZU1vY2tFcGlzb2RlKFVyZ2VuY3lMZXZlbC5VUkdFTlQsIGVwaXNvZGVJZCk7XHJcblxyXG4gICAgICAvLyBNb2NrIGdldHRpbmcgdGhlIHNwZWNpZmljIGVwaXNvZGVcclxuICAgICAgKG1vY2tEb2NDbGllbnQuc2VuZCBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7XHJcbiAgICAgICAgSXRlbXM6IFttb2NrRXBpc29kZV1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBNb2NrIGdldHRpbmcgYWxsIHF1ZXVlIGl0ZW1zXHJcbiAgICAgIGNvbnN0IG1vY2tRdWV1ZUVwaXNvZGVzID0gW1xyXG4gICAgICAgIGNyZWF0ZU1vY2tFcGlzb2RlKFVyZ2VuY3lMZXZlbC5FTUVSR0VOQ1ksICdlcGlzb2RlLTEnKSxcclxuICAgICAgICBjcmVhdGVNb2NrRXBpc29kZShVcmdlbmN5TGV2ZWwuVVJHRU5ULCAnZXBpc29kZS0yJyksXHJcbiAgICAgICAgY3JlYXRlTW9ja0VwaXNvZGUoVXJnZW5jeUxldmVsLlJPVVRJTkUsICdlcGlzb2RlLTMnKVxyXG4gICAgICBdO1xyXG5cclxuICAgICAgKG1vY2tEb2NDbGllbnQuc2VuZCBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7XHJcbiAgICAgICAgSXRlbXM6IG1vY2tRdWV1ZUVwaXNvZGVzXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcG9zaXRpb24gPSBhd2FpdCBxdWV1ZU1hbmFnZXIuZ2V0UXVldWVQb3NpdGlvbihlcGlzb2RlSWQpO1xyXG5cclxuICAgICAgZXhwZWN0KHBvc2l0aW9uKS50b0JlKDIpOyAvLyBTZWNvbmQgaW4gcXVldWUgKGVtZXJnZW5jeSBmaXJzdClcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgcmV0dXJuIC0xIGZvciBlcGlzb2RlIG5vdCBpbiBxdWV1ZScsIGFzeW5jICgpID0+IHtcclxuICAgICAgLy8gTW9jayBlcGlzb2RlIG5vdCBmb3VuZCBpbiBxdWV1ZVxyXG4gICAgICAobW9ja0RvY0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHtcclxuICAgICAgICBJdGVtczogW11cclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCBwb3NpdGlvbiA9IGF3YWl0IHF1ZXVlTWFuYWdlci5nZXRRdWV1ZVBvc2l0aW9uKCdub24tZXhpc3RlbnQtZXBpc29kZScpO1xyXG5cclxuICAgICAgZXhwZWN0KHBvc2l0aW9uKS50b0JlKC0xKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnZ2V0RXN0aW1hdGVkV2FpdFRpbWUnLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIGNhbGN1bGF0ZSBlc3RpbWF0ZWQgd2FpdCB0aW1lIGJhc2VkIG9uIHF1ZXVlIHBvc2l0aW9uJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBlcGlzb2RlSWQgPSAnZXBpc29kZS0xMjMnO1xyXG5cclxuICAgICAgLy8gTW9jayBxdWV1ZSBwb3NpdGlvblxyXG4gICAgICBqZXN0LnNweU9uKHF1ZXVlTWFuYWdlciwgJ2dldFF1ZXVlUG9zaXRpb24nKS5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UoMyk7XHJcblxyXG4gICAgICBjb25zdCB3YWl0VGltZSA9IGF3YWl0IHF1ZXVlTWFuYWdlci5nZXRFc3RpbWF0ZWRXYWl0VGltZShlcGlzb2RlSWQpO1xyXG5cclxuICAgICAgLy8gUG9zaXRpb24gMyBtZWFucyAyIGVwaXNvZGVzIGFoZWFkLCAyICogMTUgbWludXRlcyA9IDMwIG1pbnV0ZXNcclxuICAgICAgZXhwZWN0KHdhaXRUaW1lKS50b0JlKDMwKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgcmV0dXJuIDAgZm9yIGVwaXNvZGUgbm90IGluIHF1ZXVlJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBlcGlzb2RlSWQgPSAnZXBpc29kZS0xMjMnO1xyXG5cclxuICAgICAgLy8gTW9jayBlcGlzb2RlIG5vdCBpbiBxdWV1ZVxyXG4gICAgICBqZXN0LnNweU9uKHF1ZXVlTWFuYWdlciwgJ2dldFF1ZXVlUG9zaXRpb24nKS5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UoLTEpO1xyXG5cclxuICAgICAgY29uc3Qgd2FpdFRpbWUgPSBhd2FpdCBxdWV1ZU1hbmFnZXIuZ2V0RXN0aW1hdGVkV2FpdFRpbWUoZXBpc29kZUlkKTtcclxuXHJcbiAgICAgIGV4cGVjdCh3YWl0VGltZSkudG9CZSgwKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgcmV0dXJuIDAgZm9yIGVwaXNvZGUgYXQgZnJvbnQgb2YgcXVldWUnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGVwaXNvZGVJZCA9ICdlcGlzb2RlLTEyMyc7XHJcblxyXG4gICAgICAvLyBNb2NrIGVwaXNvZGUgYXQgZnJvbnQgb2YgcXVldWVcclxuICAgICAgamVzdC5zcHlPbihxdWV1ZU1hbmFnZXIsICdnZXRRdWV1ZVBvc2l0aW9uJykubW9ja1Jlc29sdmVkVmFsdWVPbmNlKDEpO1xyXG5cclxuICAgICAgY29uc3Qgd2FpdFRpbWUgPSBhd2FpdCBxdWV1ZU1hbmFnZXIuZ2V0RXN0aW1hdGVkV2FpdFRpbWUoZXBpc29kZUlkKTtcclxuXHJcbiAgICAgIGV4cGVjdCh3YWl0VGltZSkudG9CZSgwKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnZ2V0T3ZlcmR1ZUVwaXNvZGVzJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gZXBpc29kZXMgdGhhdCBoYXZlIGJlZW4gaW4gcXVldWUgdG9vIGxvbmcnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IHRocmVzaG9sZE1pbnV0ZXMgPSAzMDtcclxuICAgICAgY29uc3QgbW9ja092ZXJkdWVFcGlzb2RlcyA9IFtcclxuICAgICAgICBjcmVhdGVNb2NrRXBpc29kZShVcmdlbmN5TGV2ZWwuVVJHRU5ULCAnb3ZlcmR1ZS0xJyksXHJcbiAgICAgICAgY3JlYXRlTW9ja0VwaXNvZGUoVXJnZW5jeUxldmVsLlJPVVRJTkUsICdvdmVyZHVlLTInKVxyXG4gICAgICBdO1xyXG5cclxuICAgICAgKG1vY2tEb2NDbGllbnQuc2VuZCBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7XHJcbiAgICAgICAgSXRlbXM6IG1vY2tPdmVyZHVlRXBpc29kZXNcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBxdWV1ZU1hbmFnZXIuZ2V0T3ZlcmR1ZUVwaXNvZGVzKHRocmVzaG9sZE1pbnV0ZXMpO1xyXG5cclxuICAgICAgZXhwZWN0KG1vY2tEb2NDbGllbnQuc2VuZCkudG9IYXZlQmVlbkNhbGxlZFdpdGgoXHJcbiAgICAgICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJ3ZhbGlkYXRpb25TdGF0dXMgPSA6c3RhdHVzJyxcclxuICAgICAgICAgIEZpbHRlckV4cHJlc3Npb246ICdxdWV1ZWRBdCA8IDp0aHJlc2hvbGQnLFxyXG4gICAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczogZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgICAnOnN0YXR1cyc6ICdwZW5kaW5nJyxcclxuICAgICAgICAgICAgJzp0aHJlc2hvbGQnOiBleHBlY3QuYW55KFN0cmluZylcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgICAgKTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQpLnRvSGF2ZUxlbmd0aCgyKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgncmVhc3NpZ25FcGlzb2RlJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCByZWFzc2lnbiBlcGlzb2RlIHRvIG5ldyBzdXBlcnZpc29yJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBlcGlzb2RlSWQgPSAnZXBpc29kZS0xMjMnO1xyXG4gICAgICBjb25zdCBuZXdTdXBlcnZpc29ySWQgPSAnbmV3LXN1cGVydmlzb3ItNDU2JztcclxuXHJcbiAgICAgIChtb2NrRG9jQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe30pO1xyXG5cclxuICAgICAgYXdhaXQgcXVldWVNYW5hZ2VyLnJlYXNzaWduRXBpc29kZShlcGlzb2RlSWQsIG5ld1N1cGVydmlzb3JJZCk7XHJcblxyXG4gICAgICBleHBlY3QobW9ja0RvY0NsaWVudC5zZW5kKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcclxuICAgICAgICBleHBlY3Qub2JqZWN0Q29udGFpbmluZyh7XHJcbiAgICAgICAgICBUYWJsZU5hbWU6IHRhYmxlTmFtZSxcclxuICAgICAgICAgIEtleTogeyBlcGlzb2RlSWQgfSxcclxuICAgICAgICAgIFVwZGF0ZUV4cHJlc3Npb246ICdTRVQgYXNzaWduZWRTdXBlcnZpc29yID0gOnN1cGVydmlzb3IsIHVwZGF0ZWRBdCA9IDp1cGRhdGVkQXQnLFxyXG4gICAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczogZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgICAnOnN1cGVydmlzb3InOiBuZXdTdXBlcnZpc29ySWRcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgfSlcclxuICAgICAgKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnZ2V0UXVldWVTdGF0aXN0aWNzJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gY29tcHJlaGVuc2l2ZSBxdWV1ZSBzdGF0aXN0aWNzJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBtb2NrUXVldWVFcGlzb2RlcyA9IFtcclxuICAgICAgICBjcmVhdGVNb2NrRXBpc29kZShVcmdlbmN5TGV2ZWwuRU1FUkdFTkNZLCAnZXBpc29kZS0xJyksXHJcbiAgICAgICAgY3JlYXRlTW9ja0VwaXNvZGUoVXJnZW5jeUxldmVsLkVNRVJHRU5DWSwgJ2VwaXNvZGUtMicpLFxyXG4gICAgICAgIGNyZWF0ZU1vY2tFcGlzb2RlKFVyZ2VuY3lMZXZlbC5VUkdFTlQsICdlcGlzb2RlLTMnKSxcclxuICAgICAgICBjcmVhdGVNb2NrRXBpc29kZShVcmdlbmN5TGV2ZWwuUk9VVElORSwgJ2VwaXNvZGUtNCcpXHJcbiAgICAgIF07XHJcblxyXG4gICAgICAobW9ja0RvY0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHtcclxuICAgICAgICBJdGVtczogbW9ja1F1ZXVlRXBpc29kZXNcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCBzdGF0cyA9IGF3YWl0IHF1ZXVlTWFuYWdlci5nZXRRdWV1ZVN0YXRpc3RpY3MoKTtcclxuXHJcbiAgICAgIGV4cGVjdChzdGF0cy50b3RhbFBlbmRpbmcpLnRvQmUoNCk7XHJcbiAgICAgIGV4cGVjdChzdGF0cy5lbWVyZ2VuY3lDb3VudCkudG9CZSgyKTtcclxuICAgICAgZXhwZWN0KHN0YXRzLnVyZ2VudENvdW50KS50b0JlKDEpO1xyXG4gICAgICBleHBlY3Qoc3RhdHMucm91dGluZUNvdW50KS50b0JlKDEpO1xyXG4gICAgICBleHBlY3Qoc3RhdHMuYXZlcmFnZVdhaXRUaW1lKS50b0JlKDE1KTsgLy8gRGVmYXVsdCBhdmVyYWdlXHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ0Vycm9yIEhhbmRsaW5nJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgRHluYW1vREIgZXJyb3JzIGluIGFkZFRvUXVldWUnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGVwaXNvZGUgPSBjcmVhdGVNb2NrRXBpc29kZSgpO1xyXG5cclxuICAgICAgKG1vY2tEb2NDbGllbnQuc2VuZCBhcyBqZXN0Lk1vY2spLm1vY2tSZWplY3RlZFZhbHVlT25jZShcclxuICAgICAgICBuZXcgRXJyb3IoJ0R5bmFtb0RCIGVycm9yJylcclxuICAgICAgKTtcclxuXHJcbiAgICAgIGF3YWl0IGV4cGVjdChxdWV1ZU1hbmFnZXIuYWRkVG9RdWV1ZShlcGlzb2RlKSkucmVqZWN0cy50b1Rocm93KCdEeW5hbW9EQiBlcnJvcicpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgRHluYW1vREIgZXJyb3JzIGluIGdldFF1ZXVlJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICAobW9ja0RvY0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1JlamVjdGVkVmFsdWVPbmNlKFxyXG4gICAgICAgIG5ldyBFcnJvcignUXVlcnkgZmFpbGVkJylcclxuICAgICAgKTtcclxuXHJcbiAgICAgIGF3YWl0IGV4cGVjdChxdWV1ZU1hbmFnZXIuZ2V0UXVldWUoKSkucmVqZWN0cy50b1Rocm93KCdRdWVyeSBmYWlsZWQnKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgcmV0dXJuIGVtcHR5IGFycmF5IGZvciBnZXRPdmVyZHVlRXBpc29kZXMgb24gZXJyb3InLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIChtb2NrRG9jQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKS5tb2NrUmVqZWN0ZWRWYWx1ZU9uY2UoXHJcbiAgICAgICAgbmV3IEVycm9yKCdRdWVyeSBmYWlsZWQnKVxyXG4gICAgICApO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgcXVldWVNYW5hZ2VyLmdldE92ZXJkdWVFcGlzb2RlcygpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdCkudG9FcXVhbChbXSk7XHJcbiAgICB9KTtcclxuICB9KTtcclxufSk7Il19