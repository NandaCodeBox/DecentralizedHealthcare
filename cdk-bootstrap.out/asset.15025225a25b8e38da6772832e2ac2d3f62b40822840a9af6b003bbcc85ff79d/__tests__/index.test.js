"use strict";
// Unit tests for Human Validation Lambda Function
// Tests specific examples and integration points
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index");
const types_1 = require("../../../types");
// Mock AWS SDK clients
jest.mock('@aws-sdk/lib-dynamodb');
jest.mock('@aws-sdk/client-sns');
const mockDocClient = {
    send: jest.fn()
};
const mockSNSClient = {
    send: jest.fn()
};
// Mock environment variables
process.env.EPISODE_TABLE_NAME = 'test-episodes';
process.env.NOTIFICATION_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789012:test-notifications';
process.env.EMERGENCY_ALERT_TOPIC_ARN = 'arn:aws:sns:us-east-1:123456789012:test-emergency-alerts';
describe('Human Validation Lambda Handler', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    const createMockEvent = (httpMethod, body, pathParameters, queryStringParameters) => ({
        httpMethod,
        body: body ? JSON.stringify(body) : null,
        pathParameters: pathParameters || null,
        queryStringParameters: queryStringParameters || null,
        headers: {},
        multiValueHeaders: {},
        isBase64Encoded: false,
        path: '/validation',
        resource: '/validation',
        requestContext: {},
        stageVariables: null,
        multiValueQueryStringParameters: null
    });
    const createMockEpisode = (urgencyLevel = types_1.UrgencyLevel.URGENT) => ({
        episodeId: 'episode-123',
        patientId: 'patient-456',
        status: types_1.EpisodeStatus.ACTIVE,
        symptoms: {
            primaryComplaint: 'Chest pain',
            duration: '2 hours',
            severity: 8,
            associatedSymptoms: ['shortness of breath', 'nausea'],
            inputMethod: types_1.InputMethod.TEXT
        },
        triage: {
            urgencyLevel,
            ruleBasedScore: 85,
            aiAssessment: {
                used: true,
                confidence: 0.9,
                reasoning: 'High severity chest pain with associated symptoms'
            },
            finalScore: 88
        },
        interactions: [],
        createdAt: new Date(),
        updatedAt: new Date()
    });
    describe('POST /validation - Handle Validation Request', () => {
        it('should successfully submit validation request for episode with triage', async () => {
            const mockEpisode = createMockEpisode();
            // Mock DynamoDB get episode
            mockDocClient.send.mockResolvedValueOnce({
                Item: mockEpisode
            });
            // Mock DynamoDB update operations
            mockDocClient.send.mockResolvedValue({});
            // Mock SNS publish
            mockSNSClient.send.mockResolvedValue({
                MessageId: 'msg-123'
            });
            const event = createMockEvent('POST', {
                episodeId: 'episode-123',
                supervisorId: 'supervisor-789'
            });
            const result = await (0, index_1.handler)(event);
            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.message).toBe('Validation request submitted successfully');
            expect(body.episodeId).toBe('episode-123');
            expect(body.supervisorId).toBe('supervisor-789');
            expect(body.urgencyLevel).toBe(types_1.UrgencyLevel.URGENT);
        });
        it('should return 400 for missing episodeId', async () => {
            const event = createMockEvent('POST', {
                supervisorId: 'supervisor-789'
            });
            const result = await (0, index_1.handler)(event);
            expect(result.statusCode).toBe(400);
            const body = JSON.parse(result.body);
            expect(body.error).toBe('Missing required field: episodeId');
        });
        it('should return 404 for non-existent episode', async () => {
            // Mock DynamoDB get episode - not found
            mockDocClient.send.mockResolvedValueOnce({
                Item: null
            });
            const event = createMockEvent('POST', {
                episodeId: 'non-existent-episode'
            });
            const result = await (0, index_1.handler)(event);
            expect(result.statusCode).toBe(404);
            const body = JSON.parse(result.body);
            expect(body.error).toBe('Episode not found');
        });
        it('should return 400 for episode without triage assessment', async () => {
            const mockEpisode = createMockEpisode();
            delete mockEpisode.triage;
            // Mock DynamoDB get episode
            mockDocClient.send.mockResolvedValueOnce({
                Item: mockEpisode
            });
            const event = createMockEvent('POST', {
                episodeId: 'episode-123'
            });
            const result = await (0, index_1.handler)(event);
            expect(result.statusCode).toBe(400);
            const body = JSON.parse(result.body);
            expect(body.error).toBe('Episode does not have triage assessment');
        });
        it('should handle emergency episodes with immediate notification', async () => {
            const mockEpisode = createMockEpisode(types_1.UrgencyLevel.EMERGENCY);
            // Mock DynamoDB get episode
            mockDocClient.send.mockResolvedValueOnce({
                Item: mockEpisode
            });
            // Mock DynamoDB update operations
            mockDocClient.send.mockResolvedValue({});
            // Mock SNS publish
            mockSNSClient.send.mockResolvedValue({
                MessageId: 'emergency-msg-123'
            });
            const event = createMockEvent('POST', {
                episodeId: 'episode-123',
                supervisorId: 'emergency-supervisor'
            });
            const result = await (0, index_1.handler)(event);
            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.urgencyLevel).toBe(types_1.UrgencyLevel.EMERGENCY);
            // Verify emergency notification was sent
            expect(mockSNSClient.send).toHaveBeenCalled();
        });
    });
    describe('GET /validation/{episodeId} - Get Validation Status', () => {
        it('should return validation status for existing episode', async () => {
            const mockEpisode = createMockEpisode();
            mockEpisode.triage.humanValidation = {
                supervisorId: 'supervisor-789',
                approved: true,
                timestamp: new Date(),
                notes: 'Approved after review'
            };
            // Mock DynamoDB get episode
            mockDocClient.send.mockResolvedValueOnce({
                Item: mockEpisode
            });
            const event = createMockEvent('GET', null, { episodeId: 'episode-123' });
            const result = await (0, index_1.handler)(event);
            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.episodeId).toBe('episode-123');
            expect(body.validationStatus).toBe('completed');
            expect(body.validation).toBeDefined();
            expect(body.validation.approved).toBe(true);
        });
        it('should return pending status for episode without validation', async () => {
            const mockEpisode = createMockEpisode();
            // Mock DynamoDB get episode
            mockDocClient.send.mockResolvedValueOnce({
                Item: mockEpisode
            });
            const event = createMockEvent('GET', null, { episodeId: 'episode-123' });
            const result = await (0, index_1.handler)(event);
            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.validationStatus).toBe('pending');
            expect(body.validation).toBeUndefined();
        });
    });
    describe('GET /validation - Get Validation Queue', () => {
        it('should return validation queue for supervisor', async () => {
            const mockEpisodes = [
                createMockEpisode(types_1.UrgencyLevel.EMERGENCY),
                createMockEpisode(types_1.UrgencyLevel.URGENT)
            ];
            // Mock DynamoDB query for queue
            mockDocClient.send.mockResolvedValueOnce({
                Items: mockEpisodes
            });
            const event = createMockEvent('GET', null, null, {
                supervisorId: 'supervisor-789',
                limit: '10'
            });
            const result = await (0, index_1.handler)(event);
            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.queue).toBeDefined();
            expect(body.supervisorId).toBe('supervisor-789');
            expect(Array.isArray(body.queue)).toBe(true);
        });
        it('should filter queue by urgency level', async () => {
            const mockEpisodes = [createMockEpisode(types_1.UrgencyLevel.EMERGENCY)];
            // Mock DynamoDB query for queue
            mockDocClient.send.mockResolvedValueOnce({
                Items: mockEpisodes
            });
            const event = createMockEvent('GET', null, null, {
                urgency: types_1.UrgencyLevel.EMERGENCY,
                limit: '5'
            });
            const result = await (0, index_1.handler)(event);
            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.queue).toBeDefined();
        });
    });
    describe('PUT /validation - Handle Validation Decision', () => {
        it('should successfully record approval decision', async () => {
            const mockEpisode = createMockEpisode();
            // Mock DynamoDB get episode
            mockDocClient.send.mockResolvedValueOnce({
                Item: mockEpisode
            });
            // Mock DynamoDB update operations
            mockDocClient.send.mockResolvedValue({});
            // Mock SNS publish for care coordinator notification
            mockSNSClient.send.mockResolvedValue({
                MessageId: 'approval-msg-123'
            });
            const event = createMockEvent('PUT', {
                episodeId: 'episode-123',
                supervisorId: 'supervisor-789',
                approved: true,
                notes: 'Assessment looks correct, approved for care coordination'
            });
            const result = await (0, index_1.handler)(event);
            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.message).toBe('Validation decision recorded successfully');
            expect(body.approved).toBe(true);
            expect(body.newStatus).toBe(types_1.EpisodeStatus.ACTIVE);
        });
        it('should handle override decision with escalation', async () => {
            const mockEpisode = createMockEpisode();
            // Mock DynamoDB get episode
            mockDocClient.send.mockResolvedValueOnce({
                Item: mockEpisode
            });
            // Mock DynamoDB update operations
            mockDocClient.send.mockResolvedValue({});
            // Mock SNS publish for escalation notification
            mockSNSClient.send.mockResolvedValue({
                MessageId: 'override-msg-123'
            });
            const event = createMockEvent('PUT', {
                episodeId: 'episode-123',
                supervisorId: 'supervisor-789',
                approved: false,
                overrideReason: 'AI assessment appears incorrect, symptoms suggest lower urgency',
                notes: 'Recommend routine care instead of urgent'
            });
            const result = await (0, index_1.handler)(event);
            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.approved).toBe(false);
            expect(body.newStatus).toBe(types_1.EpisodeStatus.ESCALATED);
        });
        it('should return 400 for missing required fields', async () => {
            const event = createMockEvent('PUT', {
                episodeId: 'episode-123',
                supervisorId: 'supervisor-789'
                // Missing 'approved' field
            });
            const result = await (0, index_1.handler)(event);
            expect(result.statusCode).toBe(400);
            const body = JSON.parse(result.body);
            expect(body.error).toBe('Missing required fields: episodeId, supervisorId, approved');
        });
        it('should validate human validation data', async () => {
            const mockEpisode = createMockEpisode();
            // Mock DynamoDB get episode
            mockDocClient.send.mockResolvedValueOnce({
                Item: mockEpisode
            });
            const event = createMockEvent('PUT', {
                episodeId: 'episode-123',
                supervisorId: 'invalid-supervisor-id', // Invalid UUID format
                approved: true
            });
            const result = await (0, index_1.handler)(event);
            expect(result.statusCode).toBe(400);
            const body = JSON.parse(result.body);
            expect(body.error).toContain('Invalid validation data');
        });
    });
    describe('Error Handling', () => {
        it('should return 405 for unsupported HTTP methods', async () => {
            const event = createMockEvent('DELETE');
            const result = await (0, index_1.handler)(event);
            expect(result.statusCode).toBe(405);
            const body = JSON.parse(result.body);
            expect(body.error).toBe('Method not allowed');
        });
        it('should handle DynamoDB errors gracefully', async () => {
            // Mock DynamoDB error
            mockDocClient.send.mockRejectedValueOnce(new Error('DynamoDB connection failed'));
            const event = createMockEvent('POST', {
                episodeId: 'episode-123'
            });
            const result = await (0, index_1.handler)(event);
            expect(result.statusCode).toBe(500);
            const body = JSON.parse(result.body);
            expect(body.error).toBe('Internal server error during validation workflow');
        });
        it('should handle SNS notification failures gracefully', async () => {
            const mockEpisode = createMockEpisode();
            // Mock DynamoDB get episode
            mockDocClient.send.mockResolvedValueOnce({
                Item: mockEpisode
            });
            // Mock DynamoDB update operations
            mockDocClient.send.mockResolvedValue({});
            // Mock SNS error
            mockSNSClient.send.mockRejectedValueOnce(new Error('SNS publish failed'));
            const event = createMockEvent('POST', {
                episodeId: 'episode-123',
                supervisorId: 'supervisor-789'
            });
            const result = await (0, index_1.handler)(event);
            expect(result.statusCode).toBe(500);
            const body = JSON.parse(result.body);
            expect(body.error).toBe('Internal server error during validation workflow');
        });
    });
    describe('Integration with Services', () => {
        it('should properly integrate with ValidationQueueManager', async () => {
            const mockEpisode = createMockEpisode();
            // Mock DynamoDB operations for queue management
            mockDocClient.send
                .mockResolvedValueOnce({ Item: mockEpisode }) // Get episode
                .mockResolvedValueOnce({}) // Add to queue
                .mockResolvedValueOnce({}) // Update validation status
                .mockResolvedValueOnce({ Items: [] }); // Get queue position
            // Mock SNS publish
            mockSNSClient.send.mockResolvedValue({
                MessageId: 'integration-msg-123'
            });
            const event = createMockEvent('POST', {
                episodeId: 'episode-123',
                supervisorId: 'supervisor-789'
            });
            const result = await (0, index_1.handler)(event);
            expect(result.statusCode).toBe(200);
            expect(mockDocClient.send).toHaveBeenCalledTimes(4);
            expect(mockSNSClient.send).toHaveBeenCalledTimes(1);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9sYW1iZGEvaHVtYW4tdmFsaWRhdGlvbi9fX3Rlc3RzX18vaW5kZXgudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsa0RBQWtEO0FBQ2xELGlEQUFpRDs7QUFFakQsb0NBQW1DO0FBSW5DLDBDQUFtRjtBQUVuRix1QkFBdUI7QUFDdkIsSUFBSSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO0FBQ25DLElBQUksQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUVqQyxNQUFNLGFBQWEsR0FBRztJQUNwQixJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtDQUNxQixDQUFDO0FBRXZDLE1BQU0sYUFBYSxHQUFHO0lBQ3BCLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFO0NBQ1EsQ0FBQztBQUUxQiw2QkFBNkI7QUFDN0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsR0FBRyxlQUFlLENBQUM7QUFDakQsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsR0FBRyx1REFBdUQsQ0FBQztBQUM3RixPQUFPLENBQUMsR0FBRyxDQUFDLHlCQUF5QixHQUFHLDBEQUEwRCxDQUFDO0FBRW5HLFFBQVEsQ0FBQyxpQ0FBaUMsRUFBRSxHQUFHLEVBQUU7SUFDL0MsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUNkLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztJQUN2QixDQUFDLENBQUMsQ0FBQztJQUVILE1BQU0sZUFBZSxHQUFHLENBQ3RCLFVBQWtCLEVBQ2xCLElBQVUsRUFDVixjQUFvQixFQUNwQixxQkFBMkIsRUFDTCxFQUFFLENBQUMsQ0FBQztRQUMxQixVQUFVO1FBQ1YsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSTtR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QUFFLENBQUMsQ0FBQywyQkFBMkI7aUJBQ3JELHFCQUFxQixDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxxQkFBcUI7WUFFOUQsbUJBQW1CO1lBQ2xCLGFBQWEsQ0FBQyxJQUFrQixDQUFDLGlCQUFpQixDQUFDO2dCQUNsRCxTQUFTLEVBQUUscUJBQXFCO2FBQ2pDLENBQUMsQ0FBQztZQUVILE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQyxNQUFNLEVBQUU7Z0JBQ3BDLFNBQVMsRUFBRSxhQUFhO2dCQUN4QixZQUFZLEVBQUUsZ0JBQWdCO2FBQy9CLENBQUMsQ0FBQztZQUVILE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBQSxlQUFPLEVBQUMsS0FBSyxDQUFDLENBQUM7WUFFcEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDcEMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNwRCxNQUFNLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3RELENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIFVuaXQgdGVzdHMgZm9yIEh1bWFuIFZhbGlkYXRpb24gTGFtYmRhIEZ1bmN0aW9uXHJcbi8vIFRlc3RzIHNwZWNpZmljIGV4YW1wbGVzIGFuZCBpbnRlZ3JhdGlvbiBwb2ludHNcclxuXHJcbmltcG9ydCB7IGhhbmRsZXIgfSBmcm9tICcuLi9pbmRleCc7XHJcbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IER5bmFtb0RCRG9jdW1lbnRDbGllbnQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xyXG5pbXBvcnQgeyBTTlNDbGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtc25zJztcclxuaW1wb3J0IHsgRXBpc29kZSwgVXJnZW5jeUxldmVsLCBFcGlzb2RlU3RhdHVzLCBJbnB1dE1ldGhvZCB9IGZyb20gJy4uLy4uLy4uL3R5cGVzJztcclxuXHJcbi8vIE1vY2sgQVdTIFNESyBjbGllbnRzXHJcbmplc3QubW9jaygnQGF3cy1zZGsvbGliLWR5bmFtb2RiJyk7XHJcbmplc3QubW9jaygnQGF3cy1zZGsvY2xpZW50LXNucycpO1xyXG5cclxuY29uc3QgbW9ja0RvY0NsaWVudCA9IHtcclxuICBzZW5kOiBqZXN0LmZuKClcclxufSBhcyB1bmtub3duIGFzIER5bmFtb0RCRG9jdW1lbnRDbGllbnQ7XHJcblxyXG5jb25zdCBtb2NrU05TQ2xpZW50ID0ge1xyXG4gIHNlbmQ6IGplc3QuZm4oKVxyXG59IGFzIHVua25vd24gYXMgU05TQ2xpZW50O1xyXG5cclxuLy8gTW9jayBlbnZpcm9ubWVudCB2YXJpYWJsZXNcclxucHJvY2Vzcy5lbnYuRVBJU09ERV9UQUJMRV9OQU1FID0gJ3Rlc3QtZXBpc29kZXMnO1xyXG5wcm9jZXNzLmVudi5OT1RJRklDQVRJT05fVE9QSUNfQVJOID0gJ2Fybjphd3M6c25zOnVzLWVhc3QtMToxMjM0NTY3ODkwMTI6dGVzdC1ub3RpZmljYXRpb25zJztcclxucHJvY2Vzcy5lbnYuRU1FUkdFTkNZX0FMRVJUX1RPUElDX0FSTiA9ICdhcm46YXdzOnNuczp1cy1lYXN0LTE6MTIzNDU2Nzg5MDEyOnRlc3QtZW1lcmdlbmN5LWFsZXJ0cyc7XHJcblxyXG5kZXNjcmliZSgnSHVtYW4gVmFsaWRhdGlvbiBMYW1iZGEgSGFuZGxlcicsICgpID0+IHtcclxuICBiZWZvcmVFYWNoKCgpID0+IHtcclxuICAgIGplc3QuY2xlYXJBbGxNb2NrcygpO1xyXG4gIH0pO1xyXG5cclxuICBjb25zdCBjcmVhdGVNb2NrRXZlbnQgPSAoXHJcbiAgICBodHRwTWV0aG9kOiBzdHJpbmcsXHJcbiAgICBib2R5PzogYW55LFxyXG4gICAgcGF0aFBhcmFtZXRlcnM/OiBhbnksXHJcbiAgICBxdWVyeVN0cmluZ1BhcmFtZXRlcnM/OiBhbnlcclxuICApOiBBUElHYXRld2F5UHJveHlFdmVudCA9PiAoe1xyXG4gICAgaHR0cE1ldGhvZCxcclxuICAgIGJvZHk6IGJvZHkgPyBKU09OLnN0cmluZ2lmeShib2R5KSA6IG51bGwsXHJcbiAgICBwYXRoUGFyYW1ldGVyczogcGF0aFBhcmFtZXRlcnMgfHwgbnVsbCxcclxuICAgIHF1ZXJ5U3RyaW5nUGFyYW1ldGVyczogcXVlcnlTdHJpbmdQYXJhbWV0ZXJzIHx8IG51bGwsXHJcbiAgICBoZWFkZXJzOiB7fSxcclxuICAgIG11bHRpVmFsdWVIZWFkZXJzOiB7fSxcclxuICAgIGlzQmFzZTY0RW5jb2RlZDogZmFsc2UsXHJcbiAgICBwYXRoOiAnL3ZhbGlkYXRpb24nLFxyXG4gICAgcmVzb3VyY2U6ICcvdmFsaWRhdGlvbicsXHJcbiAgICByZXF1ZXN0Q29udGV4dDoge30gYXMgYW55LFxyXG4gICAgc3RhZ2VWYXJpYWJsZXM6IG51bGwsXHJcbiAgICBtdWx0aVZhbHVlUXVlcnlTdHJpbmdQYXJhbWV0ZXJzOiBudWxsXHJcbiAgfSk7XHJcblxyXG4gIGNvbnN0IGNyZWF0ZU1vY2tFcGlzb2RlID0gKHVyZ2VuY3lMZXZlbDogVXJnZW5jeUxldmVsID0gVXJnZW5jeUxldmVsLlVSR0VOVCk6IEVwaXNvZGUgPT4gKHtcclxuICAgIGVwaXNvZGVJZDogJ2VwaXNvZGUtMTIzJyxcclxuICAgIHBhdGllbnRJZDogJ3BhdGllbnQtNDU2JyxcclxuICAgIHN0YXR1czogRXBpc29kZVN0YXR1cy5BQ1RJVkUsXHJcbiAgICBzeW1wdG9tczoge1xyXG4gICAgICBwcmltYXJ5Q29tcGxhaW50OiAnQ2hlc3QgcGFpbicsXHJcbiAgICAgIGR1cmF0aW9uOiAnMiBob3VycycsXHJcbiAgICAgIHNldmVyaXR5OiA4LFxyXG4gICAgICBhc3NvY2lhdGVkU3ltcHRvbXM6IFsnc2hvcnRuZXNzIG9mIGJyZWF0aCcsICduYXVzZWEnXSxcclxuICAgICAgaW5wdXRNZXRob2Q6IElucHV0TWV0aG9kLlRFWFRcclxuICAgIH0sXHJcbiAgICB0cmlhZ2U6IHtcclxuICAgICAgdXJnZW5jeUxldmVsLFxyXG4gICAgICBydWxlQmFzZWRTY29yZTogODUsXHJcbiAgICAgIGFpQXNzZXNzbWVudDoge1xyXG4gICAgICAgIHVzZWQ6IHRydWUsXHJcbiAgICAgICAgY29uZmlkZW5jZTogMC45LFxyXG4gICAgICAgIHJlYXNvbmluZzogJ0hpZ2ggc2V2ZXJpdHkgY2hlc3QgcGFpbiB3aXRoIGFzc29jaWF0ZWQgc3ltcHRvbXMnXHJcbiAgICAgIH0sXHJcbiAgICAgIGZpbmFsU2NvcmU6IDg4XHJcbiAgICB9LFxyXG4gICAgaW50ZXJhY3Rpb25zOiBbXSxcclxuICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKSxcclxuICAgIHVwZGF0ZWRBdDogbmV3IERhdGUoKVxyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnUE9TVCAvdmFsaWRhdGlvbiAtIEhhbmRsZSBWYWxpZGF0aW9uIFJlcXVlc3QnLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIHN1Y2Nlc3NmdWxseSBzdWJtaXQgdmFsaWRhdGlvbiByZXF1ZXN0IGZvciBlcGlzb2RlIHdpdGggdHJpYWdlJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBtb2NrRXBpc29kZSA9IGNyZWF0ZU1vY2tFcGlzb2RlKCk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBNb2NrIER5bmFtb0RCIGdldCBlcGlzb2RlXHJcbiAgICAgIChtb2NrRG9jQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe1xyXG4gICAgICAgIEl0ZW06IG1vY2tFcGlzb2RlXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gTW9jayBEeW5hbW9EQiB1cGRhdGUgb3BlcmF0aW9uc1xyXG4gICAgICAobW9ja0RvY0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWUoe30pO1xyXG5cclxuICAgICAgLy8gTW9jayBTTlMgcHVibGlzaFxyXG4gICAgICAobW9ja1NOU0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWUoe1xyXG4gICAgICAgIE1lc3NhZ2VJZDogJ21zZy0xMjMnXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVNb2NrRXZlbnQoJ1BPU1QnLCB7XHJcbiAgICAgICAgZXBpc29kZUlkOiAnZXBpc29kZS0xMjMnLFxyXG4gICAgICAgIHN1cGVydmlzb3JJZDogJ3N1cGVydmlzb3ItNzg5J1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDIwMCk7XHJcbiAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcclxuICAgICAgZXhwZWN0KGJvZHkubWVzc2FnZSkudG9CZSgnVmFsaWRhdGlvbiByZXF1ZXN0IHN1Ym1pdHRlZCBzdWNjZXNzZnVsbHknKTtcclxuICAgICAgZXhwZWN0KGJvZHkuZXBpc29kZUlkKS50b0JlKCdlcGlzb2RlLTEyMycpO1xyXG4gICAgICBleHBlY3QoYm9keS5zdXBlcnZpc29ySWQpLnRvQmUoJ3N1cGVydmlzb3ItNzg5Jyk7XHJcbiAgICAgIGV4cGVjdChib2R5LnVyZ2VuY3lMZXZlbCkudG9CZShVcmdlbmN5TGV2ZWwuVVJHRU5UKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgcmV0dXJuIDQwMCBmb3IgbWlzc2luZyBlcGlzb2RlSWQnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KCdQT1NUJywge1xyXG4gICAgICAgIHN1cGVydmlzb3JJZDogJ3N1cGVydmlzb3ItNzg5J1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDQwMCk7XHJcbiAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcclxuICAgICAgZXhwZWN0KGJvZHkuZXJyb3IpLnRvQmUoJ01pc3NpbmcgcmVxdWlyZWQgZmllbGQ6IGVwaXNvZGVJZCcpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gNDA0IGZvciBub24tZXhpc3RlbnQgZXBpc29kZScsIGFzeW5jICgpID0+IHtcclxuICAgICAgLy8gTW9jayBEeW5hbW9EQiBnZXQgZXBpc29kZSAtIG5vdCBmb3VuZFxyXG4gICAgICAobW9ja0RvY0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHtcclxuICAgICAgICBJdGVtOiBudWxsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVNb2NrRXZlbnQoJ1BPU1QnLCB7XHJcbiAgICAgICAgZXBpc29kZUlkOiAnbm9uLWV4aXN0ZW50LWVwaXNvZGUnXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNDA0KTtcclxuICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xyXG4gICAgICBleHBlY3QoYm9keS5lcnJvcikudG9CZSgnRXBpc29kZSBub3QgZm91bmQnKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgcmV0dXJuIDQwMCBmb3IgZXBpc29kZSB3aXRob3V0IHRyaWFnZSBhc3Nlc3NtZW50JywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBtb2NrRXBpc29kZSA9IGNyZWF0ZU1vY2tFcGlzb2RlKCk7XHJcbiAgICAgIGRlbGV0ZSBtb2NrRXBpc29kZS50cmlhZ2U7XHJcblxyXG4gICAgICAvLyBNb2NrIER5bmFtb0RCIGdldCBlcGlzb2RlXHJcbiAgICAgIChtb2NrRG9jQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe1xyXG4gICAgICAgIEl0ZW06IG1vY2tFcGlzb2RlXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVNb2NrRXZlbnQoJ1BPU1QnLCB7XHJcbiAgICAgICAgZXBpc29kZUlkOiAnZXBpc29kZS0xMjMnXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNDAwKTtcclxuICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xyXG4gICAgICBleHBlY3QoYm9keS5lcnJvcikudG9CZSgnRXBpc29kZSBkb2VzIG5vdCBoYXZlIHRyaWFnZSBhc3Nlc3NtZW50Jyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGhhbmRsZSBlbWVyZ2VuY3kgZXBpc29kZXMgd2l0aCBpbW1lZGlhdGUgbm90aWZpY2F0aW9uJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBtb2NrRXBpc29kZSA9IGNyZWF0ZU1vY2tFcGlzb2RlKFVyZ2VuY3lMZXZlbC5FTUVSR0VOQ1kpO1xyXG4gICAgICBcclxuICAgICAgLy8gTW9jayBEeW5hbW9EQiBnZXQgZXBpc29kZVxyXG4gICAgICAobW9ja0RvY0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHtcclxuICAgICAgICBJdGVtOiBtb2NrRXBpc29kZVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIE1vY2sgRHluYW1vREIgdXBkYXRlIG9wZXJhdGlvbnNcclxuICAgICAgKG1vY2tEb2NDbGllbnQuc2VuZCBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlKHt9KTtcclxuXHJcbiAgICAgIC8vIE1vY2sgU05TIHB1Ymxpc2hcclxuICAgICAgKG1vY2tTTlNDbGllbnQuc2VuZCBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlKHtcclxuICAgICAgICBNZXNzYWdlSWQ6ICdlbWVyZ2VuY3ktbXNnLTEyMydcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCBldmVudCA9IGNyZWF0ZU1vY2tFdmVudCgnUE9TVCcsIHtcclxuICAgICAgICBlcGlzb2RlSWQ6ICdlcGlzb2RlLTEyMycsXHJcbiAgICAgICAgc3VwZXJ2aXNvcklkOiAnZW1lcmdlbmN5LXN1cGVydmlzb3InXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcclxuICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xyXG4gICAgICBleHBlY3QoYm9keS51cmdlbmN5TGV2ZWwpLnRvQmUoVXJnZW5jeUxldmVsLkVNRVJHRU5DWSk7XHJcbiAgICAgIFxyXG4gICAgICAvLyBWZXJpZnkgZW1lcmdlbmN5IG5vdGlmaWNhdGlvbiB3YXMgc2VudFxyXG4gICAgICBleHBlY3QobW9ja1NOU0NsaWVudC5zZW5kKS50b0hhdmVCZWVuQ2FsbGVkKCk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ0dFVCAvdmFsaWRhdGlvbi97ZXBpc29kZUlkfSAtIEdldCBWYWxpZGF0aW9uIFN0YXR1cycsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgcmV0dXJuIHZhbGlkYXRpb24gc3RhdHVzIGZvciBleGlzdGluZyBlcGlzb2RlJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBtb2NrRXBpc29kZSA9IGNyZWF0ZU1vY2tFcGlzb2RlKCk7XHJcbiAgICAgIG1vY2tFcGlzb2RlLnRyaWFnZSEuaHVtYW5WYWxpZGF0aW9uID0ge1xyXG4gICAgICAgIHN1cGVydmlzb3JJZDogJ3N1cGVydmlzb3ItNzg5JyxcclxuICAgICAgICBhcHByb3ZlZDogdHJ1ZSxcclxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCksXHJcbiAgICAgICAgbm90ZXM6ICdBcHByb3ZlZCBhZnRlciByZXZpZXcnXHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBNb2NrIER5bmFtb0RCIGdldCBlcGlzb2RlXHJcbiAgICAgIChtb2NrRG9jQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe1xyXG4gICAgICAgIEl0ZW06IG1vY2tFcGlzb2RlXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVNb2NrRXZlbnQoJ0dFVCcsIG51bGwsIHsgZXBpc29kZUlkOiAnZXBpc29kZS0xMjMnIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcclxuICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xyXG4gICAgICBleHBlY3QoYm9keS5lcGlzb2RlSWQpLnRvQmUoJ2VwaXNvZGUtMTIzJyk7XHJcbiAgICAgIGV4cGVjdChib2R5LnZhbGlkYXRpb25TdGF0dXMpLnRvQmUoJ2NvbXBsZXRlZCcpO1xyXG4gICAgICBleHBlY3QoYm9keS52YWxpZGF0aW9uKS50b0JlRGVmaW5lZCgpO1xyXG4gICAgICBleHBlY3QoYm9keS52YWxpZGF0aW9uLmFwcHJvdmVkKS50b0JlKHRydWUpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCByZXR1cm4gcGVuZGluZyBzdGF0dXMgZm9yIGVwaXNvZGUgd2l0aG91dCB2YWxpZGF0aW9uJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBtb2NrRXBpc29kZSA9IGNyZWF0ZU1vY2tFcGlzb2RlKCk7XHJcblxyXG4gICAgICAvLyBNb2NrIER5bmFtb0RCIGdldCBlcGlzb2RlXHJcbiAgICAgIChtb2NrRG9jQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe1xyXG4gICAgICAgIEl0ZW06IG1vY2tFcGlzb2RlXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVNb2NrRXZlbnQoJ0dFVCcsIG51bGwsIHsgZXBpc29kZUlkOiAnZXBpc29kZS0xMjMnIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcclxuICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xyXG4gICAgICBleHBlY3QoYm9keS52YWxpZGF0aW9uU3RhdHVzKS50b0JlKCdwZW5kaW5nJyk7XHJcbiAgICAgIGV4cGVjdChib2R5LnZhbGlkYXRpb24pLnRvQmVVbmRlZmluZWQoKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnR0VUIC92YWxpZGF0aW9uIC0gR2V0IFZhbGlkYXRpb24gUXVldWUnLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIHJldHVybiB2YWxpZGF0aW9uIHF1ZXVlIGZvciBzdXBlcnZpc29yJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBtb2NrRXBpc29kZXMgPSBbXHJcbiAgICAgICAgY3JlYXRlTW9ja0VwaXNvZGUoVXJnZW5jeUxldmVsLkVNRVJHRU5DWSksXHJcbiAgICAgICAgY3JlYXRlTW9ja0VwaXNvZGUoVXJnZW5jeUxldmVsLlVSR0VOVClcclxuICAgICAgXTtcclxuXHJcbiAgICAgIC8vIE1vY2sgRHluYW1vREIgcXVlcnkgZm9yIHF1ZXVlXHJcbiAgICAgIChtb2NrRG9jQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe1xyXG4gICAgICAgIEl0ZW1zOiBtb2NrRXBpc29kZXNcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCBldmVudCA9IGNyZWF0ZU1vY2tFdmVudCgnR0VUJywgbnVsbCwgbnVsbCwge1xyXG4gICAgICAgIHN1cGVydmlzb3JJZDogJ3N1cGVydmlzb3ItNzg5JyxcclxuICAgICAgICBsaW1pdDogJzEwJ1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDIwMCk7XHJcbiAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcclxuICAgICAgZXhwZWN0KGJvZHkucXVldWUpLnRvQmVEZWZpbmVkKCk7XHJcbiAgICAgIGV4cGVjdChib2R5LnN1cGVydmlzb3JJZCkudG9CZSgnc3VwZXJ2aXNvci03ODknKTtcclxuICAgICAgZXhwZWN0KEFycmF5LmlzQXJyYXkoYm9keS5xdWV1ZSkpLnRvQmUodHJ1ZSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGZpbHRlciBxdWV1ZSBieSB1cmdlbmN5IGxldmVsJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBtb2NrRXBpc29kZXMgPSBbY3JlYXRlTW9ja0VwaXNvZGUoVXJnZW5jeUxldmVsLkVNRVJHRU5DWSldO1xyXG5cclxuICAgICAgLy8gTW9jayBEeW5hbW9EQiBxdWVyeSBmb3IgcXVldWVcclxuICAgICAgKG1vY2tEb2NDbGllbnQuc2VuZCBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7XHJcbiAgICAgICAgSXRlbXM6IG1vY2tFcGlzb2Rlc1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KCdHRVQnLCBudWxsLCBudWxsLCB7XHJcbiAgICAgICAgdXJnZW5jeTogVXJnZW5jeUxldmVsLkVNRVJHRU5DWSxcclxuICAgICAgICBsaW1pdDogJzUnXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcclxuICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xyXG4gICAgICBleHBlY3QoYm9keS5xdWV1ZSkudG9CZURlZmluZWQoKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnUFVUIC92YWxpZGF0aW9uIC0gSGFuZGxlIFZhbGlkYXRpb24gRGVjaXNpb24nLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIHN1Y2Nlc3NmdWxseSByZWNvcmQgYXBwcm92YWwgZGVjaXNpb24nLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IG1vY2tFcGlzb2RlID0gY3JlYXRlTW9ja0VwaXNvZGUoKTtcclxuXHJcbiAgICAgIC8vIE1vY2sgRHluYW1vREIgZ2V0IGVwaXNvZGVcclxuICAgICAgKG1vY2tEb2NDbGllbnQuc2VuZCBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7XHJcbiAgICAgICAgSXRlbTogbW9ja0VwaXNvZGVcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBNb2NrIER5bmFtb0RCIHVwZGF0ZSBvcGVyYXRpb25zXHJcbiAgICAgIChtb2NrRG9jQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZSh7fSk7XHJcblxyXG4gICAgICAvLyBNb2NrIFNOUyBwdWJsaXNoIGZvciBjYXJlIGNvb3JkaW5hdG9yIG5vdGlmaWNhdGlvblxyXG4gICAgICAobW9ja1NOU0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWUoe1xyXG4gICAgICAgIE1lc3NhZ2VJZDogJ2FwcHJvdmFsLW1zZy0xMjMnXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVNb2NrRXZlbnQoJ1BVVCcsIHtcclxuICAgICAgICBlcGlzb2RlSWQ6ICdlcGlzb2RlLTEyMycsXHJcbiAgICAgICAgc3VwZXJ2aXNvcklkOiAnc3VwZXJ2aXNvci03ODknLFxyXG4gICAgICAgIGFwcHJvdmVkOiB0cnVlLFxyXG4gICAgICAgIG5vdGVzOiAnQXNzZXNzbWVudCBsb29rcyBjb3JyZWN0LCBhcHByb3ZlZCBmb3IgY2FyZSBjb29yZGluYXRpb24nXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcclxuICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xyXG4gICAgICBleHBlY3QoYm9keS5tZXNzYWdlKS50b0JlKCdWYWxpZGF0aW9uIGRlY2lzaW9uIHJlY29yZGVkIHN1Y2Nlc3NmdWxseScpO1xyXG4gICAgICBleHBlY3QoYm9keS5hcHByb3ZlZCkudG9CZSh0cnVlKTtcclxuICAgICAgZXhwZWN0KGJvZHkubmV3U3RhdHVzKS50b0JlKEVwaXNvZGVTdGF0dXMuQUNUSVZFKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgaGFuZGxlIG92ZXJyaWRlIGRlY2lzaW9uIHdpdGggZXNjYWxhdGlvbicsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgbW9ja0VwaXNvZGUgPSBjcmVhdGVNb2NrRXBpc29kZSgpO1xyXG5cclxuICAgICAgLy8gTW9jayBEeW5hbW9EQiBnZXQgZXBpc29kZVxyXG4gICAgICAobW9ja0RvY0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHtcclxuICAgICAgICBJdGVtOiBtb2NrRXBpc29kZVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIE1vY2sgRHluYW1vREIgdXBkYXRlIG9wZXJhdGlvbnNcclxuICAgICAgKG1vY2tEb2NDbGllbnQuc2VuZCBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlKHt9KTtcclxuXHJcbiAgICAgIC8vIE1vY2sgU05TIHB1Ymxpc2ggZm9yIGVzY2FsYXRpb24gbm90aWZpY2F0aW9uXHJcbiAgICAgIChtb2NrU05TQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcbiAgICAgICAgTWVzc2FnZUlkOiAnb3ZlcnJpZGUtbXNnLTEyMydcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCBldmVudCA9IGNyZWF0ZU1vY2tFdmVudCgnUFVUJywge1xyXG4gICAgICAgIGVwaXNvZGVJZDogJ2VwaXNvZGUtMTIzJyxcclxuICAgICAgICBzdXBlcnZpc29ySWQ6ICdzdXBlcnZpc29yLTc4OScsXHJcbiAgICAgICAgYXBwcm92ZWQ6IGZhbHNlLFxyXG4gICAgICAgIG92ZXJyaWRlUmVhc29uOiAnQUkgYXNzZXNzbWVudCBhcHBlYXJzIGluY29ycmVjdCwgc3ltcHRvbXMgc3VnZ2VzdCBsb3dlciB1cmdlbmN5JyxcclxuICAgICAgICBub3RlczogJ1JlY29tbWVuZCByb3V0aW5lIGNhcmUgaW5zdGVhZCBvZiB1cmdlbnQnXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcclxuICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xyXG4gICAgICBleHBlY3QoYm9keS5hcHByb3ZlZCkudG9CZShmYWxzZSk7XHJcbiAgICAgIGV4cGVjdChib2R5Lm5ld1N0YXR1cykudG9CZShFcGlzb2RlU3RhdHVzLkVTQ0FMQVRFRCk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIHJldHVybiA0MDAgZm9yIG1pc3NpbmcgcmVxdWlyZWQgZmllbGRzJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBjb25zdCBldmVudCA9IGNyZWF0ZU1vY2tFdmVudCgnUFVUJywge1xyXG4gICAgICAgIGVwaXNvZGVJZDogJ2VwaXNvZGUtMTIzJyxcclxuICAgICAgICBzdXBlcnZpc29ySWQ6ICdzdXBlcnZpc29yLTc4OSdcclxuICAgICAgICAvLyBNaXNzaW5nICdhcHByb3ZlZCcgZmllbGRcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50KTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSg0MDApO1xyXG4gICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShyZXN1bHQuYm9keSk7XHJcbiAgICAgIGV4cGVjdChib2R5LmVycm9yKS50b0JlKCdNaXNzaW5nIHJlcXVpcmVkIGZpZWxkczogZXBpc29kZUlkLCBzdXBlcnZpc29ySWQsIGFwcHJvdmVkJyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIHZhbGlkYXRlIGh1bWFuIHZhbGlkYXRpb24gZGF0YScsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgbW9ja0VwaXNvZGUgPSBjcmVhdGVNb2NrRXBpc29kZSgpO1xyXG5cclxuICAgICAgLy8gTW9jayBEeW5hbW9EQiBnZXQgZXBpc29kZVxyXG4gICAgICAobW9ja0RvY0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHtcclxuICAgICAgICBJdGVtOiBtb2NrRXBpc29kZVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KCdQVVQnLCB7XHJcbiAgICAgICAgZXBpc29kZUlkOiAnZXBpc29kZS0xMjMnLFxyXG4gICAgICAgIHN1cGVydmlzb3JJZDogJ2ludmFsaWQtc3VwZXJ2aXNvci1pZCcsIC8vIEludmFsaWQgVVVJRCBmb3JtYXRcclxuICAgICAgICBhcHByb3ZlZDogdHJ1ZVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDQwMCk7XHJcbiAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcclxuICAgICAgZXhwZWN0KGJvZHkuZXJyb3IpLnRvQ29udGFpbignSW52YWxpZCB2YWxpZGF0aW9uIGRhdGEnKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnRXJyb3IgSGFuZGxpbmcnLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIHJldHVybiA0MDUgZm9yIHVuc3VwcG9ydGVkIEhUVFAgbWV0aG9kcycsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVNb2NrRXZlbnQoJ0RFTEVURScpO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNDA1KTtcclxuICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xyXG4gICAgICBleHBlY3QoYm9keS5lcnJvcikudG9CZSgnTWV0aG9kIG5vdCBhbGxvd2VkJyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGhhbmRsZSBEeW5hbW9EQiBlcnJvcnMgZ3JhY2VmdWxseScsIGFzeW5jICgpID0+IHtcclxuICAgICAgLy8gTW9jayBEeW5hbW9EQiBlcnJvclxyXG4gICAgICAobW9ja0RvY0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1JlamVjdGVkVmFsdWVPbmNlKFxyXG4gICAgICAgIG5ldyBFcnJvcignRHluYW1vREIgY29ubmVjdGlvbiBmYWlsZWQnKVxyXG4gICAgICApO1xyXG5cclxuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVNb2NrRXZlbnQoJ1BPU1QnLCB7XHJcbiAgICAgICAgZXBpc29kZUlkOiAnZXBpc29kZS0xMjMnXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCk7XHJcblxyXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNTAwKTtcclxuICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xyXG4gICAgICBleHBlY3QoYm9keS5lcnJvcikudG9CZSgnSW50ZXJuYWwgc2VydmVyIGVycm9yIGR1cmluZyB2YWxpZGF0aW9uIHdvcmtmbG93Jyk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGhhbmRsZSBTTlMgbm90aWZpY2F0aW9uIGZhaWx1cmVzIGdyYWNlZnVsbHknLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IG1vY2tFcGlzb2RlID0gY3JlYXRlTW9ja0VwaXNvZGUoKTtcclxuXHJcbiAgICAgIC8vIE1vY2sgRHluYW1vREIgZ2V0IGVwaXNvZGVcclxuICAgICAgKG1vY2tEb2NDbGllbnQuc2VuZCBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7XHJcbiAgICAgICAgSXRlbTogbW9ja0VwaXNvZGVcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBNb2NrIER5bmFtb0RCIHVwZGF0ZSBvcGVyYXRpb25zXHJcbiAgICAgIChtb2NrRG9jQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZSh7fSk7XHJcblxyXG4gICAgICAvLyBNb2NrIFNOUyBlcnJvclxyXG4gICAgICAobW9ja1NOU0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1JlamVjdGVkVmFsdWVPbmNlKFxyXG4gICAgICAgIG5ldyBFcnJvcignU05TIHB1Ymxpc2ggZmFpbGVkJylcclxuICAgICAgKTtcclxuXHJcbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KCdQT1NUJywge1xyXG4gICAgICAgIGVwaXNvZGVJZDogJ2VwaXNvZGUtMTIzJyxcclxuICAgICAgICBzdXBlcnZpc29ySWQ6ICdzdXBlcnZpc29yLTc4OSdcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50KTtcclxuXHJcbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSg1MDApO1xyXG4gICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShyZXN1bHQuYm9keSk7XHJcbiAgICAgIGV4cGVjdChib2R5LmVycm9yKS50b0JlKCdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3IgZHVyaW5nIHZhbGlkYXRpb24gd29ya2Zsb3cnKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnSW50ZWdyYXRpb24gd2l0aCBTZXJ2aWNlcycsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgcHJvcGVybHkgaW50ZWdyYXRlIHdpdGggVmFsaWRhdGlvblF1ZXVlTWFuYWdlcicsIGFzeW5jICgpID0+IHtcclxuICAgICAgY29uc3QgbW9ja0VwaXNvZGUgPSBjcmVhdGVNb2NrRXBpc29kZSgpO1xyXG5cclxuICAgICAgLy8gTW9jayBEeW5hbW9EQiBvcGVyYXRpb25zIGZvciBxdWV1ZSBtYW5hZ2VtZW50XHJcbiAgICAgIChtb2NrRG9jQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKVxyXG4gICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UoeyBJdGVtOiBtb2NrRXBpc29kZSB9KSAvLyBHZXQgZXBpc29kZVxyXG4gICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe30pIC8vIEFkZCB0byBxdWV1ZVxyXG4gICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe30pIC8vIFVwZGF0ZSB2YWxpZGF0aW9uIHN0YXR1c1xyXG4gICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UoeyBJdGVtczogW10gfSk7IC8vIEdldCBxdWV1ZSBwb3NpdGlvblxyXG5cclxuICAgICAgLy8gTW9jayBTTlMgcHVibGlzaFxyXG4gICAgICAobW9ja1NOU0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWUoe1xyXG4gICAgICAgIE1lc3NhZ2VJZDogJ2ludGVncmF0aW9uLW1zZy0xMjMnXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVNb2NrRXZlbnQoJ1BPU1QnLCB7XHJcbiAgICAgICAgZXBpc29kZUlkOiAnZXBpc29kZS0xMjMnLFxyXG4gICAgICAgIHN1cGVydmlzb3JJZDogJ3N1cGVydmlzb3ItNzg5J1xyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xyXG5cclxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDIwMCk7XHJcbiAgICAgIGV4cGVjdChtb2NrRG9jQ2xpZW50LnNlbmQpLnRvSGF2ZUJlZW5DYWxsZWRUaW1lcyg0KTtcclxuICAgICAgZXhwZWN0KG1vY2tTTlNDbGllbnQuc2VuZCkudG9IYXZlQmVlbkNhbGxlZFRpbWVzKDEpO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcbn0pOyJdfQ==