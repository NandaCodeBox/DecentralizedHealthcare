"use strict";
// Property-based tests for Human Validation Lambda Function
// Tests universal properties across all valid inputs
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
describe('Human Validation Lambda - Property-Based Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    // Generators for test data
    const urgencyLevelArb = fc.constantFrom(...Object.values(types_1.UrgencyLevel));
    const episodeStatusArb = fc.constantFrom(...Object.values(types_1.EpisodeStatus));
    const inputMethodArb = fc.constantFrom(...Object.values(types_1.InputMethod));
    const uuidArb = fc.string({ minLength: 36, maxLength: 36 }).map(s => s.replace(/[^a-f0-9-]/g, 'a').substring(0, 36));
    const episodeArb = fc.record({
        episodeId: uuidArb,
        patientId: uuidArb,
        status: episodeStatusArb,
        symptoms: fc.record({
            primaryComplaint: fc.string({ minLength: 1, maxLength: 100 }),
            duration: fc.string({ minLength: 1, maxLength: 50 }),
            severity: fc.integer({ min: 1, max: 10 }),
            associatedSymptoms: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 5 }),
            inputMethod: inputMethodArb
        }),
        triage: fc.record({
            urgencyLevel: urgencyLevelArb,
            ruleBasedScore: fc.integer({ min: 0, max: 100 }),
            aiAssessment: fc.record({
                used: fc.boolean(),
                confidence: fc.option(fc.float({ min: 0, max: 1 })),
                reasoning: fc.option(fc.string({ maxLength: 200 }))
            }),
            finalScore: fc.integer({ min: 0, max: 100 })
        }),
        interactions: fc.array(fc.record({
            timestamp: fc.date(),
            type: fc.string({ minLength: 1, maxLength: 20 }),
            actor: fc.string({ minLength: 1, maxLength: 50 }),
            details: fc.object()
        }), { maxLength: 3 }),
        createdAt: fc.date(),
        updatedAt: fc.date()
    });
    const humanValidationArb = fc.record({
        supervisorId: uuidArb,
        approved: fc.boolean(),
        overrideReason: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
        timestamp: fc.date(),
        notes: fc.option(fc.string({ minLength: 1, maxLength: 200 }))
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
    /**
     * Property 4: Human Validation Requirement
     * For any AI-generated assessment, the Care_Orchestrator should require and wait for
     * Human_Supervisor validation before proceeding with patient routing.
     * Validates: Requirements 2.4, 7.1, 7.4
     */
    describe('Property 4: Human Validation Requirement', () => {
        it('should require human validation for all episodes with AI assessments', async () => {
            await fc.assert(fc.asyncProperty(episodeArb.filter(episode => episode.triage.aiAssessment.used), uuidArb, async (episode, supervisorId) => {
                // Mock DynamoDB get episode
                mockDocClient.send.mockResolvedValueOnce({
                    Item: episode
                });
                // Mock DynamoDB update operations
                mockDocClient.send.mockResolvedValue({});
                // Mock SNS publish
                mockSNSClient.send.mockResolvedValue({
                    MessageId: 'test-msg-123'
                });
                const event = createMockEvent('POST', {
                    episodeId: episode.episodeId,
                    supervisorId
                });
                const result = await (0, index_1.handler)(event);
                // Should successfully submit validation request
                expect(result.statusCode).toBe(200);
                const body = JSON.parse(result.body);
                expect(body.message).toBe('Validation request submitted successfully');
                expect(body.episodeId).toBe(episode.episodeId);
                expect(body.supervisorId).toBe(supervisorId);
                // Should update episode validation status
                expect(mockDocClient.send).toHaveBeenCalledWith(expect.objectContaining({
                    UpdateExpression: expect.stringContaining('validationStatus = :status')
                }));
                // Should send supervisor notification
                expect(mockSNSClient.send).toHaveBeenCalled();
            }), { numRuns: 50 });
        });
        it('should handle validation requests for episodes without AI assessment', async () => {
            await fc.assert(fc.asyncProperty(episodeArb.filter(episode => !episode.triage.aiAssessment.used), uuidArb, async (episode, supervisorId) => {
                // Mock DynamoDB get episode
                mockDocClient.send.mockResolvedValueOnce({
                    Item: episode
                });
                // Mock DynamoDB update operations
                mockDocClient.send.mockResolvedValue({});
                // Mock SNS publish
                mockSNSClient.send.mockResolvedValue({
                    MessageId: 'test-msg-123'
                });
                const event = createMockEvent('POST', {
                    episodeId: episode.episodeId,
                    supervisorId
                });
                const result = await (0, index_1.handler)(event);
                // Should still require validation even without AI assessment
                expect(result.statusCode).toBe(200);
                const body = JSON.parse(result.body);
                expect(body.message).toBe('Validation request submitted successfully');
            }), { numRuns: 30 });
        });
    });
    /**
     * Property 14: Human Override Authority
     * For any disagreement between Human_Supervisor and AI assessment, the system should
     * use human judgment as the final decision.
     * Validates: Requirements 7.3
     */
    describe('Property 14: Human Override Authority', () => {
        it('should accept human supervisor decisions regardless of AI assessment', async () => {
            await fc.assert(fc.asyncProperty(episodeArb, humanValidationArb, async (episode, validation) => {
                // Mock DynamoDB get episode
                mockDocClient.send.mockResolvedValueOnce({
                    Item: episode
                });
                // Mock DynamoDB update operations
                mockDocClient.send.mockResolvedValue({});
                // Mock SNS publish
                mockSNSClient.send.mockResolvedValue({
                    MessageId: 'validation-msg-123'
                });
                const event = createMockEvent('PUT', {
                    episodeId: episode.episodeId,
                    supervisorId: validation.supervisorId,
                    approved: validation.approved,
                    overrideReason: validation.overrideReason,
                    notes: validation.notes
                });
                const result = await (0, index_1.handler)(event);
                // Should accept supervisor decision
                expect(result.statusCode).toBe(200);
                const body = JSON.parse(result.body);
                expect(body.message).toBe('Validation decision recorded successfully');
                expect(body.approved).toBe(validation.approved);
                // Should update episode with human validation
                expect(mockDocClient.send).toHaveBeenCalledWith(expect.objectContaining({
                    UpdateExpression: expect.stringContaining('triage.humanValidation = :validation')
                }));
                // Should update episode status based on approval
                const expectedStatus = validation.approved ? types_1.EpisodeStatus.ACTIVE : types_1.EpisodeStatus.ESCALATED;
                expect(body.newStatus).toBe(expectedStatus);
            }), { numRuns: 50 });
        });
        it('should handle override decisions with proper escalation', async () => {
            await fc.assert(fc.asyncProperty(episodeArb, humanValidationArb.filter(v => !v.approved && !!v.overrideReason), async (episode, validation) => {
                // Mock DynamoDB operations
                mockDocClient.send.mockResolvedValueOnce({
                    Item: episode
                });
                mockDocClient.send.mockResolvedValue({});
                // Mock SNS operations
                mockSNSClient.send.mockResolvedValue({
                    MessageId: 'override-msg-123'
                });
                const event = createMockEvent('PUT', {
                    episodeId: episode.episodeId,
                    supervisorId: validation.supervisorId,
                    approved: validation.approved,
                    overrideReason: validation.overrideReason,
                    notes: validation.notes
                });
                const result = await (0, index_1.handler)(event);
                // Should handle override with escalation
                expect(result.statusCode).toBe(200);
                expect(JSON.parse(result.body).newStatus).toBe(types_1.EpisodeStatus.ESCALATED);
                // Should trigger escalation process
                expect(mockSNSClient.send).toHaveBeenCalled();
            }), { numRuns: 30 });
        });
    });
    /**
     * Property 5: Emergency Response Protocol
     * For any emergency situation detected, the system should immediately alert
     * Human_Supervisor and provide hospital routing with complete contact details.
     * Validates: Requirements 3.2, 7.2
     */
    describe('Property 5: Emergency Response Protocol', () => {
        it('should immediately alert supervisors for emergency episodes', async () => {
            await fc.assert(fc.asyncProperty(episodeArb.filter(episode => episode.triage.urgencyLevel === types_1.UrgencyLevel.EMERGENCY), uuidArb, async (episode, supervisorId) => {
                // Mock DynamoDB operations
                mockDocClient.send.mockResolvedValueOnce({
                    Item: episode
                });
                mockDocClient.send.mockResolvedValue({});
                // Mock SNS publish
                mockSNSClient.send.mockResolvedValue({
                    MessageId: 'emergency-msg-123'
                });
                const event = createMockEvent('POST', {
                    episodeId: episode.episodeId,
                    supervisorId
                });
                const result = await (0, index_1.handler)(event);
                // Should successfully handle emergency episode
                expect(result.statusCode).toBe(200);
                const body = JSON.parse(result.body);
                expect(body.urgencyLevel).toBe(types_1.UrgencyLevel.EMERGENCY);
                // Should send emergency notification
                expect(mockSNSClient.send).toHaveBeenCalled();
                // Verify emergency alert was sent to correct topic
                const snsCall = mockSNSClient.send.mock.calls[0][0];
                expect(snsCall.TopicArn).toBe(process.env.EMERGENCY_ALERT_TOPIC_ARN);
            }), { numRuns: 30 });
        });
        it('should use regular notifications for non-emergency episodes', async () => {
            await fc.assert(fc.asyncProperty(episodeArb.filter(episode => episode.triage.urgencyLevel !== types_1.UrgencyLevel.EMERGENCY), uuidArb, async (episode, supervisorId) => {
                // Mock DynamoDB operations
                mockDocClient.send.mockResolvedValueOnce({
                    Item: episode
                });
                mockDocClient.send.mockResolvedValue({});
                // Mock SNS publish
                mockSNSClient.send.mockResolvedValue({
                    MessageId: 'regular-msg-123'
                });
                const event = createMockEvent('POST', {
                    episodeId: episode.episodeId,
                    supervisorId
                });
                const result = await (0, index_1.handler)(event);
                // Should successfully handle non-emergency episode
                expect(result.statusCode).toBe(200);
                // Should send regular notification
                expect(mockSNSClient.send).toHaveBeenCalled();
                // Verify regular notification was sent to correct topic
                const snsCall = mockSNSClient.send.mock.calls[0][0];
                expect(snsCall.TopicArn).toBe(process.env.NOTIFICATION_TOPIC_ARN);
            }), { numRuns: 30 });
        });
    });
    describe('Input Validation Properties', () => {
        it('should reject requests with missing required fields', async () => {
            await fc.assert(fc.asyncProperty(fc.record({
                episodeId: fc.option(uuidArb),
                supervisorId: fc.option(uuidArb)
            }), async (requestBody) => {
                // Only test cases where required fields are missing
                if (requestBody.episodeId)
                    return;
                const event = createMockEvent('POST', requestBody);
                const result = await (0, index_1.handler)(event);
                // Should return 400 for missing required fields
                expect(result.statusCode).toBe(400);
                const body = JSON.parse(result.body);
                expect(body.error).toContain('Missing required field');
            }), { numRuns: 20 });
        });
        it('should handle malformed request bodies gracefully', async () => {
            await fc.assert(fc.asyncProperty(fc.string(), async (malformedBody) => {
                const event = {
                    ...createMockEvent('POST'),
                    body: malformedBody
                };
                const result = await (0, index_1.handler)(event);
                // Should handle malformed JSON gracefully
                expect([200, 400, 500]).toContain(result.statusCode);
                expect(result.body).toBeDefined();
                // Should return valid JSON response
                expect(() => JSON.parse(result.body)).not.toThrow();
            }), { numRuns: 20 });
        });
    });
    describe('Queue Management Properties', () => {
        it('should maintain queue ordering based on urgency and time', async () => {
            await fc.assert(fc.asyncProperty(fc.array(episodeArb, { minLength: 2, maxLength: 5 }), async (episodes) => {
                // Mock DynamoDB query for queue
                mockDocClient.send.mockResolvedValueOnce({
                    Items: episodes
                });
                const event = createMockEvent('GET', null, null, {
                    limit: '10'
                });
                const result = await (0, index_1.handler)(event);
                // Should return queue successfully
                expect(result.statusCode).toBe(200);
                const body = JSON.parse(result.body);
                expect(body.queue).toBeDefined();
                expect(Array.isArray(body.queue)).toBe(true);
                // Queue should be properly formatted
                body.queue.forEach((item) => {
                    expect(item.episodeId).toBeDefined();
                    expect(item.urgencyLevel).toBeDefined();
                    expect(item.queuedAt).toBeDefined();
                });
            }), { numRuns: 20 });
        });
    });
    describe('Error Handling Properties', () => {
        it('should return appropriate HTTP status codes for all operations', async () => {
            await fc.assert(fc.asyncProperty(fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH'), fc.option(fc.object()), async (httpMethod, body) => {
                const event = createMockEvent(httpMethod, body);
                const result = await (0, index_1.handler)(event);
                // Should always return a valid HTTP status code
                expect(result.statusCode).toBeGreaterThanOrEqual(200);
                expect(result.statusCode).toBeLessThan(600);
                // Should always return valid JSON
                expect(() => JSON.parse(result.body)).not.toThrow();
                // Should include CORS headers
                expect(result.headers).toHaveProperty('Access-Control-Allow-Origin');
                expect(result.headers).toHaveProperty('Content-Type');
            }), { numRuns: 30 });
        });
        it('should handle database errors gracefully', async () => {
            await fc.assert(fc.asyncProperty(episodeArb, async (episode) => {
                // Mock DynamoDB error
                mockDocClient.send.mockRejectedValueOnce(new Error('Database connection failed'));
                const event = createMockEvent('POST', {
                    episodeId: episode.episodeId
                });
                const result = await (0, index_1.handler)(event);
                // Should handle database errors gracefully
                expect(result.statusCode).toBe(500);
                const body = JSON.parse(result.body);
                expect(body.error).toBe('Internal server error during validation workflow');
            }), { numRuns: 20 });
        });
    });
    describe('Data Consistency Properties', () => {
        it('should maintain data consistency across validation operations', async () => {
            await fc.assert(fc.asyncProperty(episodeArb, humanValidationArb, async (episode, validation) => {
                // Mock successful DynamoDB operations
                mockDocClient.send
                    .mockResolvedValueOnce({ Item: episode }) // Get episode
                    .mockResolvedValue({}); // Update operations
                // Mock SNS operations
                mockSNSClient.send.mockResolvedValue({
                    MessageId: 'consistency-test-msg'
                });
                const event = createMockEvent('PUT', {
                    episodeId: episode.episodeId,
                    supervisorId: validation.supervisorId,
                    approved: validation.approved,
                    overrideReason: validation.overrideReason,
                    notes: validation.notes
                });
                const result = await (0, index_1.handler)(event);
                if (result.statusCode === 200) {
                    const body = JSON.parse(result.body);
                    // Response should be consistent with input
                    expect(body.episodeId).toBe(episode.episodeId);
                    expect(body.approved).toBe(validation.approved);
                    // Status should be consistent with approval
                    const expectedStatus = validation.approved ? types_1.EpisodeStatus.ACTIVE : types_1.EpisodeStatus.ESCALATED;
                    expect(body.newStatus).toBe(expectedStatus);
                }
            }), { numRuns: 30 });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgucHJvcGVydHkudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9sYW1iZGEvaHVtYW4tdmFsaWRhdGlvbi9fX3Rlc3RzX18vaW5kZXgucHJvcGVydHkudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsNERBQTREO0FBQzVELHFEQUFxRDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFckQsK0NBQWlDO0FBQ2pDLG9DQUFtQztBQUluQywwQ0FBb0c7QUFFcEcsdUJBQXVCO0FBQ3ZCLElBQUksQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQztBQUNuQyxJQUFJLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUM7QUFFakMsTUFBTSxhQUFhLEdBQUc7SUFDcEIsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLEVBQUU7Q0FDcUIsQ0FBQztBQUV2QyxNQUFNLGFBQWEsR0FBRztJQUNwQixJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTtDQUNRLENBQUM7QUFFMUIsNkJBQTZCO0FBQzdCLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEdBQUcsZUFBZSxDQUFDO0FBQ2pELE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLEdBQUcsdURBQXVELENBQUM7QUFDN0YsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsR0FBRywwREFBMEQsQ0FBQztBQUVuRyxRQUFRLENBQUMsZ0RBQWdELEVBQUUsR0FBRyxFQUFFO0lBQzlELFVBQVUsQ0FBQyxHQUFHLEVBQUU7UUFDZCxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7SUFDdkIsQ0FBQyxDQUFDLENBQUM7SUFFSCwyQkFBMkI7SUFDM0IsTUFBTSxlQUFlLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsb0JBQVksQ0FBQyxDQUFDLENBQUM7SUFDeEUsTUFBTSxnQkFBZ0IsR0FB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QUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDdEIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gUHJvcGVydHktYmFzZWQgdGVzdHMgZm9yIEh1bWFuIFZhbGlkYXRpb24gTGFtYmRhIEZ1bmN0aW9uXHJcbi8vIFRlc3RzIHVuaXZlcnNhbCBwcm9wZXJ0aWVzIGFjcm9zcyBhbGwgdmFsaWQgaW5wdXRzXHJcblxyXG5pbXBvcnQgKiBhcyBmYyBmcm9tICdmYXN0LWNoZWNrJztcclxuaW1wb3J0IHsgaGFuZGxlciB9IGZyb20gJy4uL2luZGV4JztcclxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgRHluYW1vREJEb2N1bWVudENsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XHJcbmltcG9ydCB7IFNOU0NsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zbnMnO1xyXG5pbXBvcnQgeyBFcGlzb2RlLCBVcmdlbmN5TGV2ZWwsIEVwaXNvZGVTdGF0dXMsIElucHV0TWV0aG9kLCBIdW1hblZhbGlkYXRpb24gfSBmcm9tICcuLi8uLi8uLi90eXBlcyc7XHJcblxyXG4vLyBNb2NrIEFXUyBTREsgY2xpZW50c1xyXG5qZXN0Lm1vY2soJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYicpO1xyXG5qZXN0Lm1vY2soJ0Bhd3Mtc2RrL2NsaWVudC1zbnMnKTtcclxuXHJcbmNvbnN0IG1vY2tEb2NDbGllbnQgPSB7XHJcbiAgc2VuZDogamVzdC5mbigpXHJcbn0gYXMgdW5rbm93biBhcyBEeW5hbW9EQkRvY3VtZW50Q2xpZW50O1xyXG5cclxuY29uc3QgbW9ja1NOU0NsaWVudCA9IHtcclxuICBzZW5kOiBqZXN0LmZuKClcclxufSBhcyB1bmtub3duIGFzIFNOU0NsaWVudDtcclxuXHJcbi8vIE1vY2sgZW52aXJvbm1lbnQgdmFyaWFibGVzXHJcbnByb2Nlc3MuZW52LkVQSVNPREVfVEFCTEVfTkFNRSA9ICd0ZXN0LWVwaXNvZGVzJztcclxucHJvY2Vzcy5lbnYuTk9USUZJQ0FUSU9OX1RPUElDX0FSTiA9ICdhcm46YXdzOnNuczp1cy1lYXN0LTE6MTIzNDU2Nzg5MDEyOnRlc3Qtbm90aWZpY2F0aW9ucyc7XHJcbnByb2Nlc3MuZW52LkVNRVJHRU5DWV9BTEVSVF9UT1BJQ19BUk4gPSAnYXJuOmF3czpzbnM6dXMtZWFzdC0xOjEyMzQ1Njc4OTAxMjp0ZXN0LWVtZXJnZW5jeS1hbGVydHMnO1xyXG5cclxuZGVzY3JpYmUoJ0h1bWFuIFZhbGlkYXRpb24gTGFtYmRhIC0gUHJvcGVydHktQmFzZWQgVGVzdHMnLCAoKSA9PiB7XHJcbiAgYmVmb3JlRWFjaCgoKSA9PiB7XHJcbiAgICBqZXN0LmNsZWFyQWxsTW9ja3MoKTtcclxuICB9KTtcclxuXHJcbiAgLy8gR2VuZXJhdG9ycyBmb3IgdGVzdCBkYXRhXHJcbiAgY29uc3QgdXJnZW5jeUxldmVsQXJiID0gZmMuY29uc3RhbnRGcm9tKC4uLk9iamVjdC52YWx1ZXMoVXJnZW5jeUxldmVsKSk7XHJcbiAgY29uc3QgZXBpc29kZVN0YXR1c0FyYiA9IGZjLmNvbnN0YW50RnJvbSguLi5PYmplY3QudmFsdWVzKEVwaXNvZGVTdGF0dXMpKTtcclxuICBjb25zdCBpbnB1dE1ldGhvZEFyYiA9IGZjLmNvbnN0YW50RnJvbSguLi5PYmplY3QudmFsdWVzKElucHV0TWV0aG9kKSk7XHJcblxyXG4gIGNvbnN0IHV1aWRBcmIgPSBmYy5zdHJpbmcoeyBtaW5MZW5ndGg6IDM2LCBtYXhMZW5ndGg6IDM2IH0pLm1hcChzID0+IFxyXG4gICAgcy5yZXBsYWNlKC9bXmEtZjAtOS1dL2csICdhJykuc3Vic3RyaW5nKDAsIDM2KVxyXG4gICk7XHJcblxyXG4gIGNvbnN0IGVwaXNvZGVBcmIgPSBmYy5yZWNvcmQoe1xyXG4gICAgZXBpc29kZUlkOiB1dWlkQXJiLFxyXG4gICAgcGF0aWVudElkOiB1dWlkQXJiLFxyXG4gICAgc3RhdHVzOiBlcGlzb2RlU3RhdHVzQXJiLFxyXG4gICAgc3ltcHRvbXM6IGZjLnJlY29yZCh7XHJcbiAgICAgIHByaW1hcnlDb21wbGFpbnQ6IGZjLnN0cmluZyh7IG1pbkxlbmd0aDogMSwgbWF4TGVuZ3RoOiAxMDAgfSksXHJcbiAgICAgIGR1cmF0aW9uOiBmYy5zdHJpbmcoeyBtaW5MZW5ndGg6IDEsIG1heExlbmd0aDogNTAgfSksXHJcbiAgICAgIHNldmVyaXR5OiBmYy5pbnRlZ2VyKHsgbWluOiAxLCBtYXg6IDEwIH0pLFxyXG4gICAgICBhc3NvY2lhdGVkU3ltcHRvbXM6IGZjLmFycmF5KGZjLnN0cmluZyh7IG1pbkxlbmd0aDogMSwgbWF4TGVuZ3RoOiA1MCB9KSwgeyBtYXhMZW5ndGg6IDUgfSksXHJcbiAgICAgIGlucHV0TWV0aG9kOiBpbnB1dE1ldGhvZEFyYlxyXG4gICAgfSksXHJcbiAgICB0cmlhZ2U6IGZjLnJlY29yZCh7XHJcbiAgICAgIHVyZ2VuY3lMZXZlbDogdXJnZW5jeUxldmVsQXJiLFxyXG4gICAgICBydWxlQmFzZWRTY29yZTogZmMuaW50ZWdlcih7IG1pbjogMCwgbWF4OiAxMDAgfSksXHJcbiAgICAgIGFpQXNzZXNzbWVudDogZmMucmVjb3JkKHtcclxuICAgICAgICB1c2VkOiBmYy5ib29sZWFuKCksXHJcbiAgICAgICAgY29uZmlkZW5jZTogZmMub3B0aW9uKGZjLmZsb2F0KHsgbWluOiAwLCBtYXg6IDEgfSkpLFxyXG4gICAgICAgIHJlYXNvbmluZzogZmMub3B0aW9uKGZjLnN0cmluZyh7IG1heExlbmd0aDogMjAwIH0pKVxyXG4gICAgICB9KSxcclxuICAgICAgZmluYWxTY29yZTogZmMuaW50ZWdlcih7IG1pbjogMCwgbWF4OiAxMDAgfSlcclxuICAgIH0pLFxyXG4gICAgaW50ZXJhY3Rpb25zOiBmYy5hcnJheShmYy5yZWNvcmQoe1xyXG4gICAgICB0aW1lc3RhbXA6IGZjLmRhdGUoKSxcclxuICAgICAgdHlwZTogZmMuc3RyaW5nKHsgbWluTGVuZ3RoOiAxLCBtYXhMZW5ndGg6IDIwIH0pLFxyXG4gICAgICBhY3RvcjogZmMuc3RyaW5nKHsgbWluTGVuZ3RoOiAxLCBtYXhMZW5ndGg6IDUwIH0pLFxyXG4gICAgICBkZXRhaWxzOiBmYy5vYmplY3QoKVxyXG4gICAgfSksIHsgbWF4TGVuZ3RoOiAzIH0pLFxyXG4gICAgY3JlYXRlZEF0OiBmYy5kYXRlKCksXHJcbiAgICB1cGRhdGVkQXQ6IGZjLmRhdGUoKVxyXG4gIH0pO1xyXG5cclxuICBjb25zdCBodW1hblZhbGlkYXRpb25BcmIgPSBmYy5yZWNvcmQoe1xyXG4gICAgc3VwZXJ2aXNvcklkOiB1dWlkQXJiLFxyXG4gICAgYXBwcm92ZWQ6IGZjLmJvb2xlYW4oKSxcclxuICAgIG92ZXJyaWRlUmVhc29uOiBmYy5vcHRpb24oZmMuc3RyaW5nKHsgbWluTGVuZ3RoOiAxLCBtYXhMZW5ndGg6IDEwMCB9KSksXHJcbiAgICB0aW1lc3RhbXA6IGZjLmRhdGUoKSxcclxuICAgIG5vdGVzOiBmYy5vcHRpb24oZmMuc3RyaW5nKHsgbWluTGVuZ3RoOiAxLCBtYXhMZW5ndGg6IDIwMCB9KSlcclxuICB9KTtcclxuXHJcbiAgY29uc3QgY3JlYXRlTW9ja0V2ZW50ID0gKFxyXG4gICAgaHR0cE1ldGhvZDogc3RyaW5nLFxyXG4gICAgYm9keT86IGFueSxcclxuICAgIHBhdGhQYXJhbWV0ZXJzPzogYW55LFxyXG4gICAgcXVlcnlTdHJpbmdQYXJhbWV0ZXJzPzogYW55XHJcbiAgKTogQVBJR2F0ZXdheVByb3h5RXZlbnQgPT4gKHtcclxuICAgIGh0dHBNZXRob2QsXHJcbiAgICBib2R5OiBib2R5ID8gSlNPTi5zdHJpbmdpZnkoYm9keSkgOiBudWxsLFxyXG4gICAgcGF0aFBhcmFtZXRlcnM6IHBhdGhQYXJhbWV0ZXJzIHx8IG51bGwsXHJcbiAgICBxdWVyeVN0cmluZ1BhcmFtZXRlcnM6IHF1ZXJ5U3RyaW5nUGFyYW1ldGVycyB8fCBudWxsLFxyXG4gICAgaGVhZGVyczoge30sXHJcbiAgICBtdWx0aVZhbHVlSGVhZGVyczoge30sXHJcbiAgICBpc0Jhc2U2NEVuY29kZWQ6IGZhbHNlLFxyXG4gICAgcGF0aDogJy92YWxpZGF0aW9uJyxcclxuICAgIHJlc291cmNlOiAnL3ZhbGlkYXRpb24nLFxyXG4gICAgcmVxdWVzdENvbnRleHQ6IHt9IGFzIGFueSxcclxuICAgIHN0YWdlVmFyaWFibGVzOiBudWxsLFxyXG4gICAgbXVsdGlWYWx1ZVF1ZXJ5U3RyaW5nUGFyYW1ldGVyczogbnVsbFxyXG4gIH0pO1xyXG5cclxuICAvKipcclxuICAgKiBQcm9wZXJ0eSA0OiBIdW1hbiBWYWxpZGF0aW9uIFJlcXVpcmVtZW50XHJcbiAgICogRm9yIGFueSBBSS1nZW5lcmF0ZWQgYXNzZXNzbWVudCwgdGhlIENhcmVfT3JjaGVzdHJhdG9yIHNob3VsZCByZXF1aXJlIGFuZCB3YWl0IGZvciBcclxuICAgKiBIdW1hbl9TdXBlcnZpc29yIHZhbGlkYXRpb24gYmVmb3JlIHByb2NlZWRpbmcgd2l0aCBwYXRpZW50IHJvdXRpbmcuXHJcbiAgICogVmFsaWRhdGVzOiBSZXF1aXJlbWVudHMgMi40LCA3LjEsIDcuNFxyXG4gICAqL1xyXG4gIGRlc2NyaWJlKCdQcm9wZXJ0eSA0OiBIdW1hbiBWYWxpZGF0aW9uIFJlcXVpcmVtZW50JywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCByZXF1aXJlIGh1bWFuIHZhbGlkYXRpb24gZm9yIGFsbCBlcGlzb2RlcyB3aXRoIEFJIGFzc2Vzc21lbnRzJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBhd2FpdCBmYy5hc3NlcnQoZmMuYXN5bmNQcm9wZXJ0eShcclxuICAgICAgICBlcGlzb2RlQXJiLmZpbHRlcihlcGlzb2RlID0+IGVwaXNvZGUudHJpYWdlLmFpQXNzZXNzbWVudC51c2VkKSxcclxuICAgICAgICB1dWlkQXJiLFxyXG4gICAgICAgIGFzeW5jIChlcGlzb2RlLCBzdXBlcnZpc29ySWQpID0+IHtcclxuICAgICAgICAgIC8vIE1vY2sgRHluYW1vREIgZ2V0IGVwaXNvZGVcclxuICAgICAgICAgIChtb2NrRG9jQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe1xyXG4gICAgICAgICAgICBJdGVtOiBlcGlzb2RlXHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAvLyBNb2NrIER5bmFtb0RCIHVwZGF0ZSBvcGVyYXRpb25zXHJcbiAgICAgICAgICAobW9ja0RvY0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWUoe30pO1xyXG5cclxuICAgICAgICAgIC8vIE1vY2sgU05TIHB1Ymxpc2hcclxuICAgICAgICAgIChtb2NrU05TQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcbiAgICAgICAgICAgIE1lc3NhZ2VJZDogJ3Rlc3QtbXNnLTEyMydcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KCdQT1NUJywge1xyXG4gICAgICAgICAgICBlcGlzb2RlSWQ6IGVwaXNvZGUuZXBpc29kZUlkLFxyXG4gICAgICAgICAgICBzdXBlcnZpc29ySWRcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xyXG5cclxuICAgICAgICAgIC8vIFNob3VsZCBzdWNjZXNzZnVsbHkgc3VibWl0IHZhbGlkYXRpb24gcmVxdWVzdFxyXG4gICAgICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDIwMCk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcclxuICAgICAgICAgIGV4cGVjdChib2R5Lm1lc3NhZ2UpLnRvQmUoJ1ZhbGlkYXRpb24gcmVxdWVzdCBzdWJtaXR0ZWQgc3VjY2Vzc2Z1bGx5Jyk7XHJcbiAgICAgICAgICBleHBlY3QoYm9keS5lcGlzb2RlSWQpLnRvQmUoZXBpc29kZS5lcGlzb2RlSWQpO1xyXG4gICAgICAgICAgZXhwZWN0KGJvZHkuc3VwZXJ2aXNvcklkKS50b0JlKHN1cGVydmlzb3JJZCk7XHJcblxyXG4gICAgICAgICAgLy8gU2hvdWxkIHVwZGF0ZSBlcGlzb2RlIHZhbGlkYXRpb24gc3RhdHVzXHJcbiAgICAgICAgICBleHBlY3QobW9ja0RvY0NsaWVudC5zZW5kKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcclxuICAgICAgICAgICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgICAgIFVwZGF0ZUV4cHJlc3Npb246IGV4cGVjdC5zdHJpbmdDb250YWluaW5nKCd2YWxpZGF0aW9uU3RhdHVzID0gOnN0YXR1cycpXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgIC8vIFNob3VsZCBzZW5kIHN1cGVydmlzb3Igbm90aWZpY2F0aW9uXHJcbiAgICAgICAgICBleHBlY3QobW9ja1NOU0NsaWVudC5zZW5kKS50b0hhdmVCZWVuQ2FsbGVkKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICApLCB7IG51bVJ1bnM6IDUwIH0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgdmFsaWRhdGlvbiByZXF1ZXN0cyBmb3IgZXBpc29kZXMgd2l0aG91dCBBSSBhc3Nlc3NtZW50JywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBhd2FpdCBmYy5hc3NlcnQoZmMuYXN5bmNQcm9wZXJ0eShcclxuICAgICAgICBlcGlzb2RlQXJiLmZpbHRlcihlcGlzb2RlID0+ICFlcGlzb2RlLnRyaWFnZS5haUFzc2Vzc21lbnQudXNlZCksXHJcbiAgICAgICAgdXVpZEFyYixcclxuICAgICAgICBhc3luYyAoZXBpc29kZSwgc3VwZXJ2aXNvcklkKSA9PiB7XHJcbiAgICAgICAgICAvLyBNb2NrIER5bmFtb0RCIGdldCBlcGlzb2RlXHJcbiAgICAgICAgICAobW9ja0RvY0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHtcclxuICAgICAgICAgICAgSXRlbTogZXBpc29kZVxyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgLy8gTW9jayBEeW5hbW9EQiB1cGRhdGUgb3BlcmF0aW9uc1xyXG4gICAgICAgICAgKG1vY2tEb2NDbGllbnQuc2VuZCBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlKHt9KTtcclxuXHJcbiAgICAgICAgICAvLyBNb2NrIFNOUyBwdWJsaXNoXHJcbiAgICAgICAgICAobW9ja1NOU0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWUoe1xyXG4gICAgICAgICAgICBNZXNzYWdlSWQ6ICd0ZXN0LW1zZy0xMjMnXHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICBjb25zdCBldmVudCA9IGNyZWF0ZU1vY2tFdmVudCgnUE9TVCcsIHtcclxuICAgICAgICAgICAgZXBpc29kZUlkOiBlcGlzb2RlLmVwaXNvZGVJZCxcclxuICAgICAgICAgICAgc3VwZXJ2aXNvcklkXHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50KTtcclxuXHJcbiAgICAgICAgICAvLyBTaG91bGQgc3RpbGwgcmVxdWlyZSB2YWxpZGF0aW9uIGV2ZW4gd2l0aG91dCBBSSBhc3Nlc3NtZW50XHJcbiAgICAgICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xyXG4gICAgICAgICAgZXhwZWN0KGJvZHkubWVzc2FnZSkudG9CZSgnVmFsaWRhdGlvbiByZXF1ZXN0IHN1Ym1pdHRlZCBzdWNjZXNzZnVsbHknKTtcclxuICAgICAgICB9XHJcbiAgICAgICksIHsgbnVtUnVuczogMzAgfSk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgLyoqXHJcbiAgICogUHJvcGVydHkgMTQ6IEh1bWFuIE92ZXJyaWRlIEF1dGhvcml0eVxyXG4gICAqIEZvciBhbnkgZGlzYWdyZWVtZW50IGJldHdlZW4gSHVtYW5fU3VwZXJ2aXNvciBhbmQgQUkgYXNzZXNzbWVudCwgdGhlIHN5c3RlbSBzaG91bGQgXHJcbiAgICogdXNlIGh1bWFuIGp1ZGdtZW50IGFzIHRoZSBmaW5hbCBkZWNpc2lvbi5cclxuICAgKiBWYWxpZGF0ZXM6IFJlcXVpcmVtZW50cyA3LjNcclxuICAgKi9cclxuICBkZXNjcmliZSgnUHJvcGVydHkgMTQ6IEh1bWFuIE92ZXJyaWRlIEF1dGhvcml0eScsICgpID0+IHtcclxuICAgIGl0KCdzaG91bGQgYWNjZXB0IGh1bWFuIHN1cGVydmlzb3IgZGVjaXNpb25zIHJlZ2FyZGxlc3Mgb2YgQUkgYXNzZXNzbWVudCcsIGFzeW5jICgpID0+IHtcclxuICAgICAgYXdhaXQgZmMuYXNzZXJ0KGZjLmFzeW5jUHJvcGVydHkoXHJcbiAgICAgICAgZXBpc29kZUFyYixcclxuICAgICAgICBodW1hblZhbGlkYXRpb25BcmIsXHJcbiAgICAgICAgYXN5bmMgKGVwaXNvZGUsIHZhbGlkYXRpb24pID0+IHtcclxuICAgICAgICAgIC8vIE1vY2sgRHluYW1vREIgZ2V0IGVwaXNvZGVcclxuICAgICAgICAgIChtb2NrRG9jQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe1xyXG4gICAgICAgICAgICBJdGVtOiBlcGlzb2RlXHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAvLyBNb2NrIER5bmFtb0RCIHVwZGF0ZSBvcGVyYXRpb25zXHJcbiAgICAgICAgICAobW9ja0RvY0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWUoe30pO1xyXG5cclxuICAgICAgICAgIC8vIE1vY2sgU05TIHB1Ymxpc2hcclxuICAgICAgICAgIChtb2NrU05TQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcbiAgICAgICAgICAgIE1lc3NhZ2VJZDogJ3ZhbGlkYXRpb24tbXNnLTEyMydcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KCdQVVQnLCB7XHJcbiAgICAgICAgICAgIGVwaXNvZGVJZDogZXBpc29kZS5lcGlzb2RlSWQsXHJcbiAgICAgICAgICAgIHN1cGVydmlzb3JJZDogdmFsaWRhdGlvbi5zdXBlcnZpc29ySWQsXHJcbiAgICAgICAgICAgIGFwcHJvdmVkOiB2YWxpZGF0aW9uLmFwcHJvdmVkLFxyXG4gICAgICAgICAgICBvdmVycmlkZVJlYXNvbjogdmFsaWRhdGlvbi5vdmVycmlkZVJlYXNvbixcclxuICAgICAgICAgICAgbm90ZXM6IHZhbGlkYXRpb24ubm90ZXNcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xyXG5cclxuICAgICAgICAgIC8vIFNob3VsZCBhY2NlcHQgc3VwZXJ2aXNvciBkZWNpc2lvblxyXG4gICAgICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDIwMCk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcclxuICAgICAgICAgIGV4cGVjdChib2R5Lm1lc3NhZ2UpLnRvQmUoJ1ZhbGlkYXRpb24gZGVjaXNpb24gcmVjb3JkZWQgc3VjY2Vzc2Z1bGx5Jyk7XHJcbiAgICAgICAgICBleHBlY3QoYm9keS5hcHByb3ZlZCkudG9CZSh2YWxpZGF0aW9uLmFwcHJvdmVkKTtcclxuXHJcbiAgICAgICAgICAvLyBTaG91bGQgdXBkYXRlIGVwaXNvZGUgd2l0aCBodW1hbiB2YWxpZGF0aW9uXHJcbiAgICAgICAgICBleHBlY3QobW9ja0RvY0NsaWVudC5zZW5kKS50b0hhdmVCZWVuQ2FsbGVkV2l0aChcclxuICAgICAgICAgICAgZXhwZWN0Lm9iamVjdENvbnRhaW5pbmcoe1xyXG4gICAgICAgICAgICAgIFVwZGF0ZUV4cHJlc3Npb246IGV4cGVjdC5zdHJpbmdDb250YWluaW5nKCd0cmlhZ2UuaHVtYW5WYWxpZGF0aW9uID0gOnZhbGlkYXRpb24nKVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgKTtcclxuXHJcbiAgICAgICAgICAvLyBTaG91bGQgdXBkYXRlIGVwaXNvZGUgc3RhdHVzIGJhc2VkIG9uIGFwcHJvdmFsXHJcbiAgICAgICAgICBjb25zdCBleHBlY3RlZFN0YXR1cyA9IHZhbGlkYXRpb24uYXBwcm92ZWQgPyBFcGlzb2RlU3RhdHVzLkFDVElWRSA6IEVwaXNvZGVTdGF0dXMuRVNDQUxBVEVEO1xyXG4gICAgICAgICAgZXhwZWN0KGJvZHkubmV3U3RhdHVzKS50b0JlKGV4cGVjdGVkU3RhdHVzKTtcclxuICAgICAgICB9XHJcbiAgICAgICksIHsgbnVtUnVuczogNTAgfSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGhhbmRsZSBvdmVycmlkZSBkZWNpc2lvbnMgd2l0aCBwcm9wZXIgZXNjYWxhdGlvbicsIGFzeW5jICgpID0+IHtcclxuICAgICAgYXdhaXQgZmMuYXNzZXJ0KGZjLmFzeW5jUHJvcGVydHkoXHJcbiAgICAgICAgZXBpc29kZUFyYixcclxuICAgICAgICBodW1hblZhbGlkYXRpb25BcmIuZmlsdGVyKHYgPT4gIXYuYXBwcm92ZWQgJiYgISF2Lm92ZXJyaWRlUmVhc29uKSxcclxuICAgICAgICBhc3luYyAoZXBpc29kZSwgdmFsaWRhdGlvbikgPT4ge1xyXG4gICAgICAgICAgLy8gTW9jayBEeW5hbW9EQiBvcGVyYXRpb25zXHJcbiAgICAgICAgICAobW9ja0RvY0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWVPbmNlKHtcclxuICAgICAgICAgICAgSXRlbTogZXBpc29kZVxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgICAobW9ja0RvY0NsaWVudC5zZW5kIGFzIGplc3QuTW9jaykubW9ja1Jlc29sdmVkVmFsdWUoe30pO1xyXG5cclxuICAgICAgICAgIC8vIE1vY2sgU05TIG9wZXJhdGlvbnNcclxuICAgICAgICAgIChtb2NrU05TQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZSh7XHJcbiAgICAgICAgICAgIE1lc3NhZ2VJZDogJ292ZXJyaWRlLW1zZy0xMjMnXHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICBjb25zdCBldmVudCA9IGNyZWF0ZU1vY2tFdmVudCgnUFVUJywge1xyXG4gICAgICAgICAgICBlcGlzb2RlSWQ6IGVwaXNvZGUuZXBpc29kZUlkLFxyXG4gICAgICAgICAgICBzdXBlcnZpc29ySWQ6IHZhbGlkYXRpb24uc3VwZXJ2aXNvcklkLFxyXG4gICAgICAgICAgICBhcHByb3ZlZDogdmFsaWRhdGlvbi5hcHByb3ZlZCxcclxuICAgICAgICAgICAgb3ZlcnJpZGVSZWFzb246IHZhbGlkYXRpb24ub3ZlcnJpZGVSZWFzb24sXHJcbiAgICAgICAgICAgIG5vdGVzOiB2YWxpZGF0aW9uLm5vdGVzXHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50KTtcclxuXHJcbiAgICAgICAgICAvLyBTaG91bGQgaGFuZGxlIG92ZXJyaWRlIHdpdGggZXNjYWxhdGlvblxyXG4gICAgICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDIwMCk7XHJcbiAgICAgICAgICBleHBlY3QoSlNPTi5wYXJzZShyZXN1bHQuYm9keSkubmV3U3RhdHVzKS50b0JlKEVwaXNvZGVTdGF0dXMuRVNDQUxBVEVEKTtcclxuXHJcbiAgICAgICAgICAvLyBTaG91bGQgdHJpZ2dlciBlc2NhbGF0aW9uIHByb2Nlc3NcclxuICAgICAgICAgIGV4cGVjdChtb2NrU05TQ2xpZW50LnNlbmQpLnRvSGF2ZUJlZW5DYWxsZWQoKTtcclxuICAgICAgICB9XHJcbiAgICAgICksIHsgbnVtUnVuczogMzAgfSk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgLyoqXHJcbiAgICogUHJvcGVydHkgNTogRW1lcmdlbmN5IFJlc3BvbnNlIFByb3RvY29sXHJcbiAgICogRm9yIGFueSBlbWVyZ2VuY3kgc2l0dWF0aW9uIGRldGVjdGVkLCB0aGUgc3lzdGVtIHNob3VsZCBpbW1lZGlhdGVseSBhbGVydCBcclxuICAgKiBIdW1hbl9TdXBlcnZpc29yIGFuZCBwcm92aWRlIGhvc3BpdGFsIHJvdXRpbmcgd2l0aCBjb21wbGV0ZSBjb250YWN0IGRldGFpbHMuXHJcbiAgICogVmFsaWRhdGVzOiBSZXF1aXJlbWVudHMgMy4yLCA3LjJcclxuICAgKi9cclxuICBkZXNjcmliZSgnUHJvcGVydHkgNTogRW1lcmdlbmN5IFJlc3BvbnNlIFByb3RvY29sJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCBpbW1lZGlhdGVseSBhbGVydCBzdXBlcnZpc29ycyBmb3IgZW1lcmdlbmN5IGVwaXNvZGVzJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBhd2FpdCBmYy5hc3NlcnQoZmMuYXN5bmNQcm9wZXJ0eShcclxuICAgICAgICBlcGlzb2RlQXJiLmZpbHRlcihlcGlzb2RlID0+IGVwaXNvZGUudHJpYWdlLnVyZ2VuY3lMZXZlbCA9PT0gVXJnZW5jeUxldmVsLkVNRVJHRU5DWSksXHJcbiAgICAgICAgdXVpZEFyYixcclxuICAgICAgICBhc3luYyAoZXBpc29kZSwgc3VwZXJ2aXNvcklkKSA9PiB7XHJcbiAgICAgICAgICAvLyBNb2NrIER5bmFtb0RCIG9wZXJhdGlvbnNcclxuICAgICAgICAgIChtb2NrRG9jQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe1xyXG4gICAgICAgICAgICBJdGVtOiBlcGlzb2RlXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICAgIChtb2NrRG9jQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZSh7fSk7XHJcblxyXG4gICAgICAgICAgLy8gTW9jayBTTlMgcHVibGlzaFxyXG4gICAgICAgICAgKG1vY2tTTlNDbGllbnQuc2VuZCBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlKHtcclxuICAgICAgICAgICAgTWVzc2FnZUlkOiAnZW1lcmdlbmN5LW1zZy0xMjMnXHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICBjb25zdCBldmVudCA9IGNyZWF0ZU1vY2tFdmVudCgnUE9TVCcsIHtcclxuICAgICAgICAgICAgZXBpc29kZUlkOiBlcGlzb2RlLmVwaXNvZGVJZCxcclxuICAgICAgICAgICAgc3VwZXJ2aXNvcklkXHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50KTtcclxuXHJcbiAgICAgICAgICAvLyBTaG91bGQgc3VjY2Vzc2Z1bGx5IGhhbmRsZSBlbWVyZ2VuY3kgZXBpc29kZVxyXG4gICAgICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDIwMCk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcclxuICAgICAgICAgIGV4cGVjdChib2R5LnVyZ2VuY3lMZXZlbCkudG9CZShVcmdlbmN5TGV2ZWwuRU1FUkdFTkNZKTtcclxuXHJcbiAgICAgICAgICAvLyBTaG91bGQgc2VuZCBlbWVyZ2VuY3kgbm90aWZpY2F0aW9uXHJcbiAgICAgICAgICBleHBlY3QobW9ja1NOU0NsaWVudC5zZW5kKS50b0hhdmVCZWVuQ2FsbGVkKCk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8vIFZlcmlmeSBlbWVyZ2VuY3kgYWxlcnQgd2FzIHNlbnQgdG8gY29ycmVjdCB0b3BpY1xyXG4gICAgICAgICAgY29uc3Qgc25zQ2FsbCA9IChtb2NrU05TQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKS5tb2NrLmNhbGxzWzBdWzBdO1xyXG4gICAgICAgICAgZXhwZWN0KHNuc0NhbGwuVG9waWNBcm4pLnRvQmUocHJvY2Vzcy5lbnYuRU1FUkdFTkNZX0FMRVJUX1RPUElDX0FSTik7XHJcbiAgICAgICAgfVxyXG4gICAgICApLCB7IG51bVJ1bnM6IDMwIH0pO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCB1c2UgcmVndWxhciBub3RpZmljYXRpb25zIGZvciBub24tZW1lcmdlbmN5IGVwaXNvZGVzJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBhd2FpdCBmYy5hc3NlcnQoZmMuYXN5bmNQcm9wZXJ0eShcclxuICAgICAgICBlcGlzb2RlQXJiLmZpbHRlcihlcGlzb2RlID0+IGVwaXNvZGUudHJpYWdlLnVyZ2VuY3lMZXZlbCAhPT0gVXJnZW5jeUxldmVsLkVNRVJHRU5DWSksXHJcbiAgICAgICAgdXVpZEFyYixcclxuICAgICAgICBhc3luYyAoZXBpc29kZSwgc3VwZXJ2aXNvcklkKSA9PiB7XHJcbiAgICAgICAgICAvLyBNb2NrIER5bmFtb0RCIG9wZXJhdGlvbnNcclxuICAgICAgICAgIChtb2NrRG9jQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2Uoe1xyXG4gICAgICAgICAgICBJdGVtOiBlcGlzb2RlXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICAgIChtb2NrRG9jQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKS5tb2NrUmVzb2x2ZWRWYWx1ZSh7fSk7XHJcblxyXG4gICAgICAgICAgLy8gTW9jayBTTlMgcHVibGlzaFxyXG4gICAgICAgICAgKG1vY2tTTlNDbGllbnQuc2VuZCBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlKHtcclxuICAgICAgICAgICAgTWVzc2FnZUlkOiAncmVndWxhci1tc2ctMTIzJ1xyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVNb2NrRXZlbnQoJ1BPU1QnLCB7XHJcbiAgICAgICAgICAgIGVwaXNvZGVJZDogZXBpc29kZS5lcGlzb2RlSWQsXHJcbiAgICAgICAgICAgIHN1cGVydmlzb3JJZFxyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCk7XHJcblxyXG4gICAgICAgICAgLy8gU2hvdWxkIHN1Y2Nlc3NmdWxseSBoYW5kbGUgbm9uLWVtZXJnZW5jeSBlcGlzb2RlXHJcbiAgICAgICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcclxuXHJcbiAgICAgICAgICAvLyBTaG91bGQgc2VuZCByZWd1bGFyIG5vdGlmaWNhdGlvblxyXG4gICAgICAgICAgZXhwZWN0KG1vY2tTTlNDbGllbnQuc2VuZCkudG9IYXZlQmVlbkNhbGxlZCgpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICAvLyBWZXJpZnkgcmVndWxhciBub3RpZmljYXRpb24gd2FzIHNlbnQgdG8gY29ycmVjdCB0b3BpY1xyXG4gICAgICAgICAgY29uc3Qgc25zQ2FsbCA9IChtb2NrU05TQ2xpZW50LnNlbmQgYXMgamVzdC5Nb2NrKS5tb2NrLmNhbGxzWzBdWzBdO1xyXG4gICAgICAgICAgZXhwZWN0KHNuc0NhbGwuVG9waWNBcm4pLnRvQmUocHJvY2Vzcy5lbnYuTk9USUZJQ0FUSU9OX1RPUElDX0FSTik7XHJcbiAgICAgICAgfVxyXG4gICAgICApLCB7IG51bVJ1bnM6IDMwIH0pO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdJbnB1dCBWYWxpZGF0aW9uIFByb3BlcnRpZXMnLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIHJlamVjdCByZXF1ZXN0cyB3aXRoIG1pc3NpbmcgcmVxdWlyZWQgZmllbGRzJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBhd2FpdCBmYy5hc3NlcnQoZmMuYXN5bmNQcm9wZXJ0eShcclxuICAgICAgICBmYy5yZWNvcmQoe1xyXG4gICAgICAgICAgZXBpc29kZUlkOiBmYy5vcHRpb24odXVpZEFyYiksXHJcbiAgICAgICAgICBzdXBlcnZpc29ySWQ6IGZjLm9wdGlvbih1dWlkQXJiKVxyXG4gICAgICAgIH0pLFxyXG4gICAgICAgIGFzeW5jIChyZXF1ZXN0Qm9keSkgPT4ge1xyXG4gICAgICAgICAgLy8gT25seSB0ZXN0IGNhc2VzIHdoZXJlIHJlcXVpcmVkIGZpZWxkcyBhcmUgbWlzc2luZ1xyXG4gICAgICAgICAgaWYgKHJlcXVlc3RCb2R5LmVwaXNvZGVJZCkgcmV0dXJuO1xyXG5cclxuICAgICAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KCdQT1NUJywgcmVxdWVzdEJvZHkpO1xyXG4gICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCk7XHJcblxyXG4gICAgICAgICAgLy8gU2hvdWxkIHJldHVybiA0MDAgZm9yIG1pc3NpbmcgcmVxdWlyZWQgZmllbGRzXHJcbiAgICAgICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNDAwKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xyXG4gICAgICAgICAgZXhwZWN0KGJvZHkuZXJyb3IpLnRvQ29udGFpbignTWlzc2luZyByZXF1aXJlZCBmaWVsZCcpO1xyXG4gICAgICAgIH1cclxuICAgICAgKSwgeyBudW1SdW5zOiAyMCB9KTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgaGFuZGxlIG1hbGZvcm1lZCByZXF1ZXN0IGJvZGllcyBncmFjZWZ1bGx5JywgYXN5bmMgKCkgPT4ge1xyXG4gICAgICBhd2FpdCBmYy5hc3NlcnQoZmMuYXN5bmNQcm9wZXJ0eShcclxuICAgICAgICBmYy5zdHJpbmcoKSxcclxuICAgICAgICBhc3luYyAobWFsZm9ybWVkQm9keSkgPT4ge1xyXG4gICAgICAgICAgY29uc3QgZXZlbnQgPSB7XHJcbiAgICAgICAgICAgIC4uLmNyZWF0ZU1vY2tFdmVudCgnUE9TVCcpLFxyXG4gICAgICAgICAgICBib2R5OiBtYWxmb3JtZWRCb2R5XHJcbiAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xyXG5cclxuICAgICAgICAgIC8vIFNob3VsZCBoYW5kbGUgbWFsZm9ybWVkIEpTT04gZ3JhY2VmdWxseVxyXG4gICAgICAgICAgZXhwZWN0KFsyMDAsIDQwMCwgNTAwXSkudG9Db250YWluKHJlc3VsdC5zdGF0dXNDb2RlKTtcclxuICAgICAgICAgIGV4cGVjdChyZXN1bHQuYm9keSkudG9CZURlZmluZWQoKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgLy8gU2hvdWxkIHJldHVybiB2YWxpZCBKU09OIHJlc3BvbnNlXHJcbiAgICAgICAgICBleHBlY3QoKCkgPT4gSlNPTi5wYXJzZShyZXN1bHQuYm9keSkpLm5vdC50b1Rocm93KCk7XHJcbiAgICAgICAgfVxyXG4gICAgICApLCB7IG51bVJ1bnM6IDIwIH0pO1xyXG4gICAgfSk7XHJcbiAgfSk7XHJcblxyXG4gIGRlc2NyaWJlKCdRdWV1ZSBNYW5hZ2VtZW50IFByb3BlcnRpZXMnLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIG1haW50YWluIHF1ZXVlIG9yZGVyaW5nIGJhc2VkIG9uIHVyZ2VuY3kgYW5kIHRpbWUnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGF3YWl0IGZjLmFzc2VydChmYy5hc3luY1Byb3BlcnR5KFxyXG4gICAgICAgIGZjLmFycmF5KGVwaXNvZGVBcmIsIHsgbWluTGVuZ3RoOiAyLCBtYXhMZW5ndGg6IDUgfSksXHJcbiAgICAgICAgYXN5bmMgKGVwaXNvZGVzKSA9PiB7XHJcbiAgICAgICAgICAvLyBNb2NrIER5bmFtb0RCIHF1ZXJ5IGZvciBxdWV1ZVxyXG4gICAgICAgICAgKG1vY2tEb2NDbGllbnQuc2VuZCBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlT25jZSh7XHJcbiAgICAgICAgICAgIEl0ZW1zOiBlcGlzb2Rlc1xyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVNb2NrRXZlbnQoJ0dFVCcsIG51bGwsIG51bGwsIHtcclxuICAgICAgICAgICAgbGltaXQ6ICcxMCdcclxuICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xyXG5cclxuICAgICAgICAgIC8vIFNob3VsZCByZXR1cm4gcXVldWUgc3VjY2Vzc2Z1bGx5XHJcbiAgICAgICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xyXG4gICAgICAgICAgZXhwZWN0KGJvZHkucXVldWUpLnRvQmVEZWZpbmVkKCk7XHJcbiAgICAgICAgICBleHBlY3QoQXJyYXkuaXNBcnJheShib2R5LnF1ZXVlKSkudG9CZSh0cnVlKTtcclxuXHJcbiAgICAgICAgICAvLyBRdWV1ZSBzaG91bGQgYmUgcHJvcGVybHkgZm9ybWF0dGVkXHJcbiAgICAgICAgICBib2R5LnF1ZXVlLmZvckVhY2goKGl0ZW06IGFueSkgPT4ge1xyXG4gICAgICAgICAgICBleHBlY3QoaXRlbS5lcGlzb2RlSWQpLnRvQmVEZWZpbmVkKCk7XHJcbiAgICAgICAgICAgIGV4cGVjdChpdGVtLnVyZ2VuY3lMZXZlbCkudG9CZURlZmluZWQoKTtcclxuICAgICAgICAgICAgZXhwZWN0KGl0ZW0ucXVldWVkQXQpLnRvQmVEZWZpbmVkKCk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICksIHsgbnVtUnVuczogMjAgfSk7XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ0Vycm9yIEhhbmRsaW5nIFByb3BlcnRpZXMnLCAoKSA9PiB7XHJcbiAgICBpdCgnc2hvdWxkIHJldHVybiBhcHByb3ByaWF0ZSBIVFRQIHN0YXR1cyBjb2RlcyBmb3IgYWxsIG9wZXJhdGlvbnMnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGF3YWl0IGZjLmFzc2VydChmYy5hc3luY1Byb3BlcnR5KFxyXG4gICAgICAgIGZjLmNvbnN0YW50RnJvbSgnR0VUJywgJ1BPU1QnLCAnUFVUJywgJ0RFTEVURScsICdQQVRDSCcpLFxyXG4gICAgICAgIGZjLm9wdGlvbihmYy5vYmplY3QoKSksXHJcbiAgICAgICAgYXN5bmMgKGh0dHBNZXRob2QsIGJvZHkpID0+IHtcclxuICAgICAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KGh0dHBNZXRob2QsIGJvZHkpO1xyXG4gICAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCk7XHJcblxyXG4gICAgICAgICAgLy8gU2hvdWxkIGFsd2F5cyByZXR1cm4gYSB2YWxpZCBIVFRQIHN0YXR1cyBjb2RlXHJcbiAgICAgICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmVHcmVhdGVyVGhhbk9yRXF1YWwoMjAwKTtcclxuICAgICAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZUxlc3NUaGFuKDYwMCk7XHJcblxyXG4gICAgICAgICAgLy8gU2hvdWxkIGFsd2F5cyByZXR1cm4gdmFsaWQgSlNPTlxyXG4gICAgICAgICAgZXhwZWN0KCgpID0+IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpKS5ub3QudG9UaHJvdygpO1xyXG5cclxuICAgICAgICAgIC8vIFNob3VsZCBpbmNsdWRlIENPUlMgaGVhZGVyc1xyXG4gICAgICAgICAgZXhwZWN0KHJlc3VsdC5oZWFkZXJzKS50b0hhdmVQcm9wZXJ0eSgnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJyk7XHJcbiAgICAgICAgICBleHBlY3QocmVzdWx0LmhlYWRlcnMpLnRvSGF2ZVByb3BlcnR5KCdDb250ZW50LVR5cGUnKTtcclxuICAgICAgICB9XHJcbiAgICAgICksIHsgbnVtUnVuczogMzAgfSk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGhhbmRsZSBkYXRhYmFzZSBlcnJvcnMgZ3JhY2VmdWxseScsIGFzeW5jICgpID0+IHtcclxuICAgICAgYXdhaXQgZmMuYXNzZXJ0KGZjLmFzeW5jUHJvcGVydHkoXHJcbiAgICAgICAgZXBpc29kZUFyYixcclxuICAgICAgICBhc3luYyAoZXBpc29kZSkgPT4ge1xyXG4gICAgICAgICAgLy8gTW9jayBEeW5hbW9EQiBlcnJvclxyXG4gICAgICAgICAgKG1vY2tEb2NDbGllbnQuc2VuZCBhcyBqZXN0Lk1vY2spLm1vY2tSZWplY3RlZFZhbHVlT25jZShcclxuICAgICAgICAgICAgbmV3IEVycm9yKCdEYXRhYmFzZSBjb25uZWN0aW9uIGZhaWxlZCcpXHJcbiAgICAgICAgICApO1xyXG5cclxuICAgICAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlTW9ja0V2ZW50KCdQT1NUJywge1xyXG4gICAgICAgICAgICBlcGlzb2RlSWQ6IGVwaXNvZGUuZXBpc29kZUlkXHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50KTtcclxuXHJcbiAgICAgICAgICAvLyBTaG91bGQgaGFuZGxlIGRhdGFiYXNlIGVycm9ycyBncmFjZWZ1bGx5XHJcbiAgICAgICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNTAwKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xyXG4gICAgICAgICAgZXhwZWN0KGJvZHkuZXJyb3IpLnRvQmUoJ0ludGVybmFsIHNlcnZlciBlcnJvciBkdXJpbmcgdmFsaWRhdGlvbiB3b3JrZmxvdycpO1xyXG4gICAgICAgIH1cclxuICAgICAgKSwgeyBudW1SdW5zOiAyMCB9KTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnRGF0YSBDb25zaXN0ZW5jeSBQcm9wZXJ0aWVzJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCBtYWludGFpbiBkYXRhIGNvbnNpc3RlbmN5IGFjcm9zcyB2YWxpZGF0aW9uIG9wZXJhdGlvbnMnLCBhc3luYyAoKSA9PiB7XHJcbiAgICAgIGF3YWl0IGZjLmFzc2VydChmYy5hc3luY1Byb3BlcnR5KFxyXG4gICAgICAgIGVwaXNvZGVBcmIsXHJcbiAgICAgICAgaHVtYW5WYWxpZGF0aW9uQXJiLFxyXG4gICAgICAgIGFzeW5jIChlcGlzb2RlLCB2YWxpZGF0aW9uKSA9PiB7XHJcbiAgICAgICAgICAvLyBNb2NrIHN1Y2Nlc3NmdWwgRHluYW1vREIgb3BlcmF0aW9uc1xyXG4gICAgICAgICAgKG1vY2tEb2NDbGllbnQuc2VuZCBhcyBqZXN0Lk1vY2spXHJcbiAgICAgICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZU9uY2UoeyBJdGVtOiBlcGlzb2RlIH0pIC8vIEdldCBlcGlzb2RlXHJcbiAgICAgICAgICAgIC5tb2NrUmVzb2x2ZWRWYWx1ZSh7fSk7IC8vIFVwZGF0ZSBvcGVyYXRpb25zXHJcblxyXG4gICAgICAgICAgLy8gTW9jayBTTlMgb3BlcmF0aW9uc1xyXG4gICAgICAgICAgKG1vY2tTTlNDbGllbnQuc2VuZCBhcyBqZXN0Lk1vY2spLm1vY2tSZXNvbHZlZFZhbHVlKHtcclxuICAgICAgICAgICAgTWVzc2FnZUlkOiAnY29uc2lzdGVuY3ktdGVzdC1tc2cnXHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICBjb25zdCBldmVudCA9IGNyZWF0ZU1vY2tFdmVudCgnUFVUJywge1xyXG4gICAgICAgICAgICBlcGlzb2RlSWQ6IGVwaXNvZGUuZXBpc29kZUlkLFxyXG4gICAgICAgICAgICBzdXBlcnZpc29ySWQ6IHZhbGlkYXRpb24uc3VwZXJ2aXNvcklkLFxyXG4gICAgICAgICAgICBhcHByb3ZlZDogdmFsaWRhdGlvbi5hcHByb3ZlZCxcclxuICAgICAgICAgICAgb3ZlcnJpZGVSZWFzb246IHZhbGlkYXRpb24ub3ZlcnJpZGVSZWFzb24sXHJcbiAgICAgICAgICAgIG5vdGVzOiB2YWxpZGF0aW9uLm5vdGVzXHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50KTtcclxuXHJcbiAgICAgICAgICBpZiAocmVzdWx0LnN0YXR1c0NvZGUgPT09IDIwMCkge1xyXG4gICAgICAgICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShyZXN1bHQuYm9keSk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyBSZXNwb25zZSBzaG91bGQgYmUgY29uc2lzdGVudCB3aXRoIGlucHV0XHJcbiAgICAgICAgICAgIGV4cGVjdChib2R5LmVwaXNvZGVJZCkudG9CZShlcGlzb2RlLmVwaXNvZGVJZCk7XHJcbiAgICAgICAgICAgIGV4cGVjdChib2R5LmFwcHJvdmVkKS50b0JlKHZhbGlkYXRpb24uYXBwcm92ZWQpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8gU3RhdHVzIHNob3VsZCBiZSBjb25zaXN0ZW50IHdpdGggYXBwcm92YWxcclxuICAgICAgICAgICAgY29uc3QgZXhwZWN0ZWRTdGF0dXMgPSB2YWxpZGF0aW9uLmFwcHJvdmVkID8gRXBpc29kZVN0YXR1cy5BQ1RJVkUgOiBFcGlzb2RlU3RhdHVzLkVTQ0FMQVRFRDtcclxuICAgICAgICAgICAgZXhwZWN0KGJvZHkubmV3U3RhdHVzKS50b0JlKGV4cGVjdGVkU3RhdHVzKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICksIHsgbnVtUnVuczogMzAgfSk7XHJcbiAgICB9KTtcclxuICB9KTtcclxufSk7Il19