"use strict";
// Property-based tests for Symptom Intake Lambda Function
// Feature: decentralized-healthcare-orchestration, Property 1: Symptom Data Capture and Validation
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
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const aws_sdk_client_mock_1 = require("aws-sdk-client-mock");
const enums_1 = require("../../../types/enums");
// Mock AWS SDK
const ddbMock = (0, aws_sdk_client_mock_1.mockClient)(lib_dynamodb_1.DynamoDBDocumentClient);
// Mock environment variables
process.env.PATIENT_TABLE_NAME = 'test-patients';
process.env.EPISODE_TABLE_NAME = 'test-episodes';
// Mock UUID generation
jest.mock('uuid', () => ({
    v4: () => '550e8400-e29b-41d4-a716-446655440001'
}));
describe('Symptom Intake Lambda Function - Property Tests', () => {
    const mockContext = {
        callbackWaitsForEmptyEventLoop: false,
        functionName: 'test-function',
        functionVersion: '1',
        invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
        memoryLimitInMB: '256',
        awsRequestId: 'test-request-id',
        logGroupName: '/aws/lambda/test-function',
        logStreamName: '2023/01/01/[$LATEST]test-stream',
        getRemainingTimeInMillis: () => 30000,
        done: jest.fn(),
        fail: jest.fn(),
        succeed: jest.fn()
    };
    const mockPatient = {
        patientId: '550e8400-e29b-41d4-a716-446655440000',
        demographics: {
            age: 35,
            gender: enums_1.Gender.FEMALE,
            location: {
                state: 'Maharashtra',
                district: 'Mumbai',
                pincode: '400001',
                coordinates: { lat: 19.0760, lng: 72.8777 }
            },
            preferredLanguage: enums_1.Language.ENGLISH
        },
        medicalHistory: {
            conditions: [],
            medications: [],
            allergies: [],
            lastVisit: new Date('2023-01-01')
        },
        preferences: {
            providerGender: enums_1.Gender.FEMALE,
            maxTravelDistance: 10,
            costSensitivity: 'medium'
        },
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01')
    };
    beforeEach(() => {
        ddbMock.reset();
        jest.clearAllMocks();
        (0, index_1.setDynamoClient)(ddbMock);
    });
    // Custom arbitraries for generating test data
    const validUuidArbitrary = fc.constant('550e8400-e29b-41d4-a716-446655440000');
    const symptomComplaintArbitrary = fc.string({ minLength: 1, maxLength: 500 })
        .filter(s => s.trim().length > 0);
    const durationArbitrary = fc.oneof(fc.constant('1 hour'), fc.constant('2 days'), fc.constant('1 week'), fc.constant('sudden onset'), fc.constant('3 months'), fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0));
    const severityArbitrary = fc.integer({ min: 1, max: 10 });
    const associatedSymptomsArbitrary = fc.array(fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), { minLength: 0, maxLength: 10 });
    const inputMethodArbitrary = fc.constantFrom(enums_1.InputMethod.TEXT, enums_1.InputMethod.VOICE);
    const validSymptomInputArbitrary = fc.record({
        patientId: validUuidArbitrary,
        symptoms: fc.record({
            primaryComplaint: symptomComplaintArbitrary,
            duration: durationArbitrary,
            severity: severityArbitrary,
            associatedSymptoms: associatedSymptomsArbitrary,
            inputMethod: inputMethodArbitrary
        })
    });
    const createApiGatewayEvent = (body) => ({
        body: JSON.stringify(body),
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: '/symptoms',
        pathParameters: null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {},
        resource: ''
    });
    /**
     * Property 1: Symptom Data Capture and Validation
     * **Validates: Requirements 1.2, 1.4, 1.5**
     *
     * For any valid patient symptom input (text or voice), the Care_Orchestrator should
     * successfully capture, validate, and store the data with appropriate prompting for
     * missing essential information.
     */
    it('Property 1: should successfully capture, validate, and store any valid symptom data', async () => {
        await fc.assert(fc.asyncProperty(validSymptomInputArbitrary, async (symptomInput) => {
            // Setup mocks for successful case
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({ Item: mockPatient });
            ddbMock.on(lib_dynamodb_1.PutCommand).resolves({});
            const event = createApiGatewayEvent(symptomInput);
            const result = await (0, index_1.handler)(event, mockContext);
            // Property assertions
            expect(result.statusCode).toBe(200);
            const responseBody = JSON.parse(result.body);
            expect(responseBody.episodeId).toBeDefined();
            expect(responseBody.status).toBe(enums_1.EpisodeStatus.ACTIVE);
            expect(responseBody.message).toBe('Symptom intake completed successfully');
            // Verify data was captured and stored
            expect(ddbMock.commandCalls(lib_dynamodb_1.GetCommand)).toHaveLength(1);
            expect(ddbMock.commandCalls(lib_dynamodb_1.PutCommand)).toHaveLength(1);
            const putCall = ddbMock.commandCalls(lib_dynamodb_1.PutCommand)[0];
            const episodeData = putCall.args[0].input.Item;
            expect(episodeData).toBeDefined();
            expect(episodeData.patientId).toBe(symptomInput.patientId);
            expect(episodeData.symptoms.primaryComplaint).toBeDefined();
            expect(episodeData.symptoms.severity).toBe(symptomInput.symptoms.severity);
            expect(episodeData.symptoms.inputMethod).toBe(symptomInput.symptoms.inputMethod);
            expect(episodeData.interactions).toHaveLength(1);
            expect(episodeData.interactions[0].type).toBe('symptom_intake');
            // Reset mocks for next iteration
            ddbMock.reset();
        }), { numRuns: 100 });
    });
    /**
     * Property 2: Input Sanitization and Security
     * **Validates: Requirements 9.1**
     *
     * For any symptom input containing potentially malicious content, the system should
     * sanitize the input while preserving the essential medical information.
     */
    it('Property 2: should sanitize all symptom text input while preserving medical information', async () => {
        const maliciousInputArbitrary = fc.record({
            patientId: validUuidArbitrary,
            symptoms: fc.record({
                primaryComplaint: fc.string({ minLength: 1, maxLength: 200 })
                    .map(s => `<script>${s}</script>headache`),
                duration: fc.string({ minLength: 1, maxLength: 50 })
                    .map(s => `${s}<img src=x>`),
                severity: severityArbitrary,
                associatedSymptoms: fc.array(fc.string({ minLength: 1, maxLength: 50 })
                    .map(s => `<b>${s}</b>`), { minLength: 0, maxLength: 5 }),
                inputMethod: inputMethodArbitrary
            })
        });
        await fc.assert(fc.asyncProperty(maliciousInputArbitrary, async (symptomInput) => {
            // Setup mocks
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({ Item: mockPatient });
            ddbMock.on(lib_dynamodb_1.PutCommand).resolves({});
            const event = createApiGatewayEvent(symptomInput);
            const result = await (0, index_1.handler)(event, mockContext);
            expect(result.statusCode).toBe(200);
            const putCall = ddbMock.commandCalls(lib_dynamodb_1.PutCommand)[0];
            const episodeData = putCall.args[0].input.Item;
            // Verify sanitization occurred
            expect(episodeData.symptoms.primaryComplaint).not.toContain('<script>');
            expect(episodeData.symptoms.primaryComplaint).not.toContain('</script>');
            expect(episodeData.symptoms.duration).not.toContain('<img');
            // Verify essential information is preserved
            expect(episodeData.symptoms.primaryComplaint).toContain('headache');
            expect(episodeData.symptoms.severity).toBe(symptomInput.symptoms.severity);
            // Reset mocks
            ddbMock.reset();
        }), { numRuns: 50 });
    });
    /**
     * Property 3: Urgency Indicator Analysis
     * **Validates: Requirements 2.1**
     *
     * For any symptom input with high severity or emergency keywords, the system should
     * identify and log appropriate urgency indicators.
     */
    it('Property 3: should identify urgency indicators for high-severity or emergency symptoms', async () => {
        const highUrgencyInputArbitrary = fc.record({
            patientId: validUuidArbitrary,
            symptoms: fc.record({
                primaryComplaint: fc.oneof(fc.constant('severe chest pain'), fc.constant('difficulty breathing'), fc.constant('heart attack symptoms'), fc.constant('stroke symptoms'), fc.string({ minLength: 10, maxLength: 100 })),
                duration: durationArbitrary,
                severity: fc.integer({ min: 8, max: 10 }), // High severity
                associatedSymptoms: associatedSymptomsArbitrary,
                inputMethod: inputMethodArbitrary
            })
        });
        await fc.assert(fc.asyncProperty(highUrgencyInputArbitrary, async (symptomInput) => {
            // Setup mocks
            ddbMock.on(lib_dynamodb_1.GetCommand).resolves({ Item: mockPatient });
            ddbMock.on(lib_dynamodb_1.PutCommand).resolves({});
            const event = createApiGatewayEvent(symptomInput);
            const result = await (0, index_1.handler)(event, mockContext);
            expect(result.statusCode).toBe(200);
            const responseBody = JSON.parse(result.body);
            // For high severity symptoms, urgency indicators should be present
            if (symptomInput.symptoms.severity >= 8) {
                expect(responseBody.urgencyIndicators).toBeDefined();
                expect(Array.isArray(responseBody.urgencyIndicators)).toBe(true);
                expect(responseBody.urgencyIndicators.length).toBeGreaterThan(0);
            }
            // Reset mocks
            ddbMock.reset();
        }), { numRuns: 50 });
    });
    /**
     * Property 4: Error Handling for Invalid Data
     * **Validates: Requirements 1.4**
     *
     * For any symptom input with missing essential information, the system should
     * return appropriate validation errors without storing incomplete data.
     */
    it('Property 4: should handle invalid symptom data with appropriate error responses', async () => {
        const invalidInputArbitrary = fc.oneof(
        // Missing primary complaint
        fc.record({
            patientId: validUuidArbitrary,
            symptoms: fc.record({
                duration: durationArbitrary,
                severity: severityArbitrary,
                associatedSymptoms: associatedSymptomsArbitrary,
                inputMethod: inputMethodArbitrary
            })
        }), 
        // Invalid severity
        fc.record({
            patientId: validUuidArbitrary,
            symptoms: fc.record({
                primaryComplaint: symptomComplaintArbitrary,
                duration: durationArbitrary,
                severity: fc.integer({ min: 11, max: 20 }), // Invalid range
                associatedSymptoms: associatedSymptomsArbitrary,
                inputMethod: inputMethodArbitrary
            })
        }), 
        // Invalid input method
        fc.record({
            patientId: validUuidArbitrary,
            symptoms: fc.record({
                primaryComplaint: symptomComplaintArbitrary,
                duration: durationArbitrary,
                severity: severityArbitrary,
                associatedSymptoms: associatedSymptomsArbitrary,
                inputMethod: fc.constant('invalid-method')
            })
        }));
        await fc.assert(fc.asyncProperty(invalidInputArbitrary, async (symptomInput) => {
            const event = createApiGatewayEvent(symptomInput);
            const result = await (0, index_1.handler)(event, mockContext);
            // Should return validation error
            expect(result.statusCode).toBe(400);
            const responseBody = JSON.parse(result.body);
            expect(responseBody.error).toBe('Validation failed');
            expect(responseBody.details).toBeDefined();
            expect(Array.isArray(responseBody.details)).toBe(true);
            expect(responseBody.details.length).toBeGreaterThan(0);
            // Should not store invalid data
            expect(ddbMock.commandCalls(lib_dynamodb_1.PutCommand)).toHaveLength(0);
            // Reset mocks
            ddbMock.reset();
        }), { numRuns: 50 });
    });
    /**
     * Property 5: CORS Headers Consistency
     * **Validates: Requirements 9.2**
     *
     * For any request (valid or invalid), the system should always return proper
     * CORS headers for secure cross-origin communication.
     */
    it('Property 5: should always include proper CORS headers in all responses', async () => {
        const anyInputArbitrary = fc.oneof(validSymptomInputArbitrary, fc.record({ invalid: fc.string() }), // Invalid structure
        fc.constant(null) // No body
        );
        await fc.assert(fc.asyncProperty(anyInputArbitrary, async (input) => {
            const event = {
                body: input ? JSON.stringify(input) : null,
                headers: {},
                multiValueHeaders: {},
                httpMethod: 'POST',
                isBase64Encoded: false,
                path: '/symptoms',
                pathParameters: null,
                queryStringParameters: null,
                multiValueQueryStringParameters: null,
                stageVariables: null,
                requestContext: {},
                resource: ''
            };
            // Setup mocks for valid cases
            if (input && 'patientId' in input) {
                ddbMock.on(lib_dynamodb_1.GetCommand).resolves({ Item: mockPatient });
                ddbMock.on(lib_dynamodb_1.PutCommand).resolves({});
            }
            const result = await (0, index_1.handler)(event, mockContext);
            // CORS headers should always be present
            expect(result.headers).toBeDefined();
            expect(result.headers['Content-Type']).toBe('application/json');
            expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
            expect(result.headers['Access-Control-Allow-Headers']).toContain('Content-Type');
            expect(result.headers['Access-Control-Allow-Methods']).toContain('POST');
            // Reset mocks
            ddbMock.reset();
        }), { numRuns: 30 });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgucHJvcGVydHkudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9sYW1iZGEvc3ltcHRvbS1pbnRha2UvX190ZXN0c19fL2luZGV4LnByb3BlcnR5LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLDBEQUEwRDtBQUMxRCxtR0FBbUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRW5HLCtDQUFpQztBQUVqQyxvQ0FBb0Q7QUFDcEQsd0RBQXVGO0FBQ3ZGLDZEQUFpRDtBQUNqRCxnREFBb0Y7QUFFcEYsZUFBZTtBQUNmLE1BQU0sT0FBTyxHQUFHLElBQUEsZ0NBQVUsRUFBQyxxQ0FBc0IsQ0FBQyxDQUFDO0FBRW5ELDZCQUE2QjtBQUM3QixPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixHQUFHLGVBQWUsQ0FBQztBQUNqRCxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixHQUFHLGVBQWUsQ0FBQztBQUVqRCx1QkFBdUI7QUFDdkIsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztJQUN2QixFQUFFLEVBQUUsR0FBRyxFQUFFLENBQUMsc0NBQXNDO0NBQ2pELENBQUMsQ0FBQyxDQUFDO0FBRUosUUFBUSxDQUFDLGlEQUFpRCxFQUFFLEdBQUcsRUFBRTtJQUMvRCxNQUFNLFdBQVcsR0FBWTtRQUMzQiw4QkFBOEIsRUFBRSxLQUFLO1FBQ3JDLFlBQVksRUFBRSxlQUFlO1FBQzdCLGVBQWUsRUFBRSxHQUFHO1FBQ3BCLGtCQUFrQixFQUFFLDhEQUE4RDtRQUNsRixlQUFlLEVBQUUsS0FBSztRQUN0QixZQUFZLEVBQUUsaUJBQWlCO1FBQy9CLFlBQVksRUFBRSwyQkFBMkI7UUFDekMsYUFBYSxFQUFFLGlDQUFpQztRQUNoRCx3QkFBd0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxLQUFLO1FBQ3JDLElBQUksRUFBRSxJQUFJLENBQUMsRUFB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QU0sQ0FBQyxNQUFNLENBQUMsT0FBUSxDQUFDLDhCQUE4QixDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFMUUsY0FBYztZQUNkLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNsQixDQUFDLENBQUMsRUFDRixFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsQ0FDaEIsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBQcm9wZXJ0eS1iYXNlZCB0ZXN0cyBmb3IgU3ltcHRvbSBJbnRha2UgTGFtYmRhIEZ1bmN0aW9uXHJcbi8vIEZlYXR1cmU6IGRlY2VudHJhbGl6ZWQtaGVhbHRoY2FyZS1vcmNoZXN0cmF0aW9uLCBQcm9wZXJ0eSAxOiBTeW1wdG9tIERhdGEgQ2FwdHVyZSBhbmQgVmFsaWRhdGlvblxyXG5cclxuaW1wb3J0ICogYXMgZmMgZnJvbSAnZmFzdC1jaGVjayc7XHJcbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBDb250ZXh0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IGhhbmRsZXIsIHNldER5bmFtb0NsaWVudCB9IGZyb20gJy4uL2luZGV4JztcclxuaW1wb3J0IHsgRHluYW1vREJEb2N1bWVudENsaWVudCwgUHV0Q29tbWFuZCwgR2V0Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XHJcbmltcG9ydCB7IG1vY2tDbGllbnQgfSBmcm9tICdhd3Mtc2RrLWNsaWVudC1tb2NrJztcclxuaW1wb3J0IHsgRXBpc29kZVN0YXR1cywgSW5wdXRNZXRob2QsIEdlbmRlciwgTGFuZ3VhZ2UgfSBmcm9tICcuLi8uLi8uLi90eXBlcy9lbnVtcyc7XHJcblxyXG4vLyBNb2NrIEFXUyBTREtcclxuY29uc3QgZGRiTW9jayA9IG1vY2tDbGllbnQoRHluYW1vREJEb2N1bWVudENsaWVudCk7XHJcblxyXG4vLyBNb2NrIGVudmlyb25tZW50IHZhcmlhYmxlc1xyXG5wcm9jZXNzLmVudi5QQVRJRU5UX1RBQkxFX05BTUUgPSAndGVzdC1wYXRpZW50cyc7XHJcbnByb2Nlc3MuZW52LkVQSVNPREVfVEFCTEVfTkFNRSA9ICd0ZXN0LWVwaXNvZGVzJztcclxuXHJcbi8vIE1vY2sgVVVJRCBnZW5lcmF0aW9uXHJcbmplc3QubW9jaygndXVpZCcsICgpID0+ICh7XHJcbiAgdjQ6ICgpID0+ICc1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDEnXHJcbn0pKTtcclxuXHJcbmRlc2NyaWJlKCdTeW1wdG9tIEludGFrZSBMYW1iZGEgRnVuY3Rpb24gLSBQcm9wZXJ0eSBUZXN0cycsICgpID0+IHtcclxuICBjb25zdCBtb2NrQ29udGV4dDogQ29udGV4dCA9IHtcclxuICAgIGNhbGxiYWNrV2FpdHNGb3JFbXB0eUV2ZW50TG9vcDogZmFsc2UsXHJcbiAgICBmdW5jdGlvbk5hbWU6ICd0ZXN0LWZ1bmN0aW9uJyxcclxuICAgIGZ1bmN0aW9uVmVyc2lvbjogJzEnLFxyXG4gICAgaW52b2tlZEZ1bmN0aW9uQXJuOiAnYXJuOmF3czpsYW1iZGE6dXMtZWFzdC0xOjEyMzQ1Njc4OTAxMjpmdW5jdGlvbjp0ZXN0LWZ1bmN0aW9uJyxcclxuICAgIG1lbW9yeUxpbWl0SW5NQjogJzI1NicsXHJcbiAgICBhd3NSZXF1ZXN0SWQ6ICd0ZXN0LXJlcXVlc3QtaWQnLFxyXG4gICAgbG9nR3JvdXBOYW1lOiAnL2F3cy9sYW1iZGEvdGVzdC1mdW5jdGlvbicsXHJcbiAgICBsb2dTdHJlYW1OYW1lOiAnMjAyMy8wMS8wMS9bJExBVEVTVF10ZXN0LXN0cmVhbScsXHJcbiAgICBnZXRSZW1haW5pbmdUaW1lSW5NaWxsaXM6ICgpID0+IDMwMDAwLFxyXG4gICAgZG9uZTogamVzdC5mbigpLFxyXG4gICAgZmFpbDogamVzdC5mbigpLFxyXG4gICAgc3VjY2VlZDogamVzdC5mbigpXHJcbiAgfTtcclxuXHJcbiAgY29uc3QgbW9ja1BhdGllbnQgPSB7XHJcbiAgICBwYXRpZW50SWQ6ICc1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAnLFxyXG4gICAgZGVtb2dyYXBoaWNzOiB7XHJcbiAgICAgIGFnZTogMzUsXHJcbiAgICAgIGdlbmRlcjogR2VuZGVyLkZFTUFMRSxcclxuICAgICAgbG9jYXRpb246IHtcclxuICAgICAgICBzdGF0ZTogJ01haGFyYXNodHJhJyxcclxuICAgICAgICBkaXN0cmljdDogJ011bWJhaScsXHJcbiAgICAgICAgcGluY29kZTogJzQwMDAwMScsXHJcbiAgICAgICAgY29vcmRpbmF0ZXM6IHsgbGF0OiAxOS4wNzYwLCBsbmc6IDcyLjg3NzcgfVxyXG4gICAgICB9LFxyXG4gICAgICBwcmVmZXJyZWRMYW5ndWFnZTogTGFuZ3VhZ2UuRU5HTElTSFxyXG4gICAgfSxcclxuICAgIG1lZGljYWxIaXN0b3J5OiB7XHJcbiAgICAgIGNvbmRpdGlvbnM6IFtdLFxyXG4gICAgICBtZWRpY2F0aW9uczogW10sXHJcbiAgICAgIGFsbGVyZ2llczogW10sXHJcbiAgICAgIGxhc3RWaXNpdDogbmV3IERhdGUoJzIwMjMtMDEtMDEnKVxyXG4gICAgfSxcclxuICAgIHByZWZlcmVuY2VzOiB7XHJcbiAgICAgIHByb3ZpZGVyR2VuZGVyOiBHZW5kZXIuRkVNQUxFLFxyXG4gICAgICBtYXhUcmF2ZWxEaXN0YW5jZTogMTAsXHJcbiAgICAgIGNvc3RTZW5zaXRpdml0eTogJ21lZGl1bSdcclxuICAgIH0sXHJcbiAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCcyMDIzLTAxLTAxJyksXHJcbiAgICB1cGRhdGVkQXQ6IG5ldyBEYXRlKCcyMDIzLTAxLTAxJylcclxuICB9O1xyXG5cclxuICBiZWZvcmVFYWNoKCgpID0+IHtcclxuICAgIGRkYk1vY2sucmVzZXQoKTtcclxuICAgIGplc3QuY2xlYXJBbGxNb2NrcygpO1xyXG4gICAgc2V0RHluYW1vQ2xpZW50KGRkYk1vY2sgYXMgYW55KTtcclxuICB9KTtcclxuXHJcbiAgLy8gQ3VzdG9tIGFyYml0cmFyaWVzIGZvciBnZW5lcmF0aW5nIHRlc3QgZGF0YVxyXG4gIGNvbnN0IHZhbGlkVXVpZEFyYml0cmFyeSA9IGZjLmNvbnN0YW50KCc1NTBlODQwMC1lMjliLTQxZDQtYTcxNi00NDY2NTU0NDAwMDAnKTtcclxuICBcclxuICBjb25zdCBzeW1wdG9tQ29tcGxhaW50QXJiaXRyYXJ5ID0gZmMuc3RyaW5nKHsgbWluTGVuZ3RoOiAxLCBtYXhMZW5ndGg6IDUwMCB9KVxyXG4gICAgLmZpbHRlcihzID0+IHMudHJpbSgpLmxlbmd0aCA+IDApO1xyXG4gIFxyXG4gIGNvbnN0IGR1cmF0aW9uQXJiaXRyYXJ5ID0gZmMub25lb2YoXHJcbiAgICBmYy5jb25zdGFudCgnMSBob3VyJyksXHJcbiAgICBmYy5jb25zdGFudCgnMiBkYXlzJyksXHJcbiAgICBmYy5jb25zdGFudCgnMSB3ZWVrJyksXHJcbiAgICBmYy5jb25zdGFudCgnc3VkZGVuIG9uc2V0JyksXHJcbiAgICBmYy5jb25zdGFudCgnMyBtb250aHMnKSxcclxuICAgIGZjLnN0cmluZyh7IG1pbkxlbmd0aDogMSwgbWF4TGVuZ3RoOiA1MCB9KS5maWx0ZXIocyA9PiBzLnRyaW0oKS5sZW5ndGggPiAwKVxyXG4gICk7XHJcbiAgXHJcbiAgY29uc3Qgc2V2ZXJpdHlBcmJpdHJhcnkgPSBmYy5pbnRlZ2VyKHsgbWluOiAxLCBtYXg6IDEwIH0pO1xyXG4gIFxyXG4gIGNvbnN0IGFzc29jaWF0ZWRTeW1wdG9tc0FyYml0cmFyeSA9IGZjLmFycmF5KFxyXG4gICAgZmMuc3RyaW5nKHsgbWluTGVuZ3RoOiAxLCBtYXhMZW5ndGg6IDEwMCB9KS5maWx0ZXIocyA9PiBzLnRyaW0oKS5sZW5ndGggPiAwKSxcclxuICAgIHsgbWluTGVuZ3RoOiAwLCBtYXhMZW5ndGg6IDEwIH1cclxuICApO1xyXG4gIFxyXG4gIGNvbnN0IGlucHV0TWV0aG9kQXJiaXRyYXJ5ID0gZmMuY29uc3RhbnRGcm9tKElucHV0TWV0aG9kLlRFWFQsIElucHV0TWV0aG9kLlZPSUNFKTtcclxuXHJcbiAgY29uc3QgdmFsaWRTeW1wdG9tSW5wdXRBcmJpdHJhcnkgPSBmYy5yZWNvcmQoe1xyXG4gICAgcGF0aWVudElkOiB2YWxpZFV1aWRBcmJpdHJhcnksXHJcbiAgICBzeW1wdG9tczogZmMucmVjb3JkKHtcclxuICAgICAgcHJpbWFyeUNvbXBsYWludDogc3ltcHRvbUNvbXBsYWludEFyYml0cmFyeSxcclxuICAgICAgZHVyYXRpb246IGR1cmF0aW9uQXJiaXRyYXJ5LFxyXG4gICAgICBzZXZlcml0eTogc2V2ZXJpdHlBcmJpdHJhcnksXHJcbiAgICAgIGFzc29jaWF0ZWRTeW1wdG9tczogYXNzb2NpYXRlZFN5bXB0b21zQXJiaXRyYXJ5LFxyXG4gICAgICBpbnB1dE1ldGhvZDogaW5wdXRNZXRob2RBcmJpdHJhcnlcclxuICAgIH0pXHJcbiAgfSk7XHJcblxyXG4gIGNvbnN0IGNyZWF0ZUFwaUdhdGV3YXlFdmVudCA9IChib2R5OiBhbnkpOiBBUElHYXRld2F5UHJveHlFdmVudCA9PiAoe1xyXG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkoYm9keSksXHJcbiAgICBoZWFkZXJzOiB7fSxcclxuICAgIG11bHRpVmFsdWVIZWFkZXJzOiB7fSxcclxuICAgIGh0dHBNZXRob2Q6ICdQT1NUJyxcclxuICAgIGlzQmFzZTY0RW5jb2RlZDogZmFsc2UsXHJcbiAgICBwYXRoOiAnL3N5bXB0b21zJyxcclxuICAgIHBhdGhQYXJhbWV0ZXJzOiBudWxsLFxyXG4gICAgcXVlcnlTdHJpbmdQYXJhbWV0ZXJzOiBudWxsLFxyXG4gICAgbXVsdGlWYWx1ZVF1ZXJ5U3RyaW5nUGFyYW1ldGVyczogbnVsbCxcclxuICAgIHN0YWdlVmFyaWFibGVzOiBudWxsLFxyXG4gICAgcmVxdWVzdENvbnRleHQ6IHt9IGFzIGFueSxcclxuICAgIHJlc291cmNlOiAnJ1xyXG4gIH0pO1xyXG5cclxuICAvKipcclxuICAgKiBQcm9wZXJ0eSAxOiBTeW1wdG9tIERhdGEgQ2FwdHVyZSBhbmQgVmFsaWRhdGlvblxyXG4gICAqICoqVmFsaWRhdGVzOiBSZXF1aXJlbWVudHMgMS4yLCAxLjQsIDEuNSoqXHJcbiAgICogXHJcbiAgICogRm9yIGFueSB2YWxpZCBwYXRpZW50IHN5bXB0b20gaW5wdXQgKHRleHQgb3Igdm9pY2UpLCB0aGUgQ2FyZV9PcmNoZXN0cmF0b3Igc2hvdWxkIFxyXG4gICAqIHN1Y2Nlc3NmdWxseSBjYXB0dXJlLCB2YWxpZGF0ZSwgYW5kIHN0b3JlIHRoZSBkYXRhIHdpdGggYXBwcm9wcmlhdGUgcHJvbXB0aW5nIGZvciBcclxuICAgKiBtaXNzaW5nIGVzc2VudGlhbCBpbmZvcm1hdGlvbi5cclxuICAgKi9cclxuICBpdCgnUHJvcGVydHkgMTogc2hvdWxkIHN1Y2Nlc3NmdWxseSBjYXB0dXJlLCB2YWxpZGF0ZSwgYW5kIHN0b3JlIGFueSB2YWxpZCBzeW1wdG9tIGRhdGEnLCBhc3luYyAoKSA9PiB7XHJcbiAgICBhd2FpdCBmYy5hc3NlcnQoXHJcbiAgICAgIGZjLmFzeW5jUHJvcGVydHkodmFsaWRTeW1wdG9tSW5wdXRBcmJpdHJhcnksIGFzeW5jIChzeW1wdG9tSW5wdXQpID0+IHtcclxuICAgICAgICAvLyBTZXR1cCBtb2NrcyBmb3Igc3VjY2Vzc2Z1bCBjYXNlXHJcbiAgICAgICAgZGRiTW9jay5vbihHZXRDb21tYW5kKS5yZXNvbHZlcyh7IEl0ZW06IG1vY2tQYXRpZW50IH0pO1xyXG4gICAgICAgIGRkYk1vY2sub24oUHV0Q29tbWFuZCkucmVzb2x2ZXMoe30pO1xyXG5cclxuICAgICAgICBjb25zdCBldmVudCA9IGNyZWF0ZUFwaUdhdGV3YXlFdmVudChzeW1wdG9tSW5wdXQpO1xyXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQsIG1vY2tDb250ZXh0KTtcclxuXHJcbiAgICAgICAgLy8gUHJvcGVydHkgYXNzZXJ0aW9uc1xyXG4gICAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSgyMDApO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0IHJlc3BvbnNlQm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xyXG4gICAgICAgIGV4cGVjdChyZXNwb25zZUJvZHkuZXBpc29kZUlkKS50b0JlRGVmaW5lZCgpO1xyXG4gICAgICAgIGV4cGVjdChyZXNwb25zZUJvZHkuc3RhdHVzKS50b0JlKEVwaXNvZGVTdGF0dXMuQUNUSVZFKTtcclxuICAgICAgICBleHBlY3QocmVzcG9uc2VCb2R5Lm1lc3NhZ2UpLnRvQmUoJ1N5bXB0b20gaW50YWtlIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHknKTtcclxuXHJcbiAgICAgICAgLy8gVmVyaWZ5IGRhdGEgd2FzIGNhcHR1cmVkIGFuZCBzdG9yZWRcclxuICAgICAgICBleHBlY3QoZGRiTW9jay5jb21tYW5kQ2FsbHMoR2V0Q29tbWFuZCkpLnRvSGF2ZUxlbmd0aCgxKTtcclxuICAgICAgICBleHBlY3QoZGRiTW9jay5jb21tYW5kQ2FsbHMoUHV0Q29tbWFuZCkpLnRvSGF2ZUxlbmd0aCgxKTtcclxuXHJcbiAgICAgICAgY29uc3QgcHV0Q2FsbCA9IGRkYk1vY2suY29tbWFuZENhbGxzKFB1dENvbW1hbmQpWzBdO1xyXG4gICAgICAgIGNvbnN0IGVwaXNvZGVEYXRhID0gcHV0Q2FsbC5hcmdzWzBdLmlucHV0Lkl0ZW07XHJcbiAgICAgICAgXHJcbiAgICAgICAgZXhwZWN0KGVwaXNvZGVEYXRhKS50b0JlRGVmaW5lZCgpO1xyXG4gICAgICAgIGV4cGVjdChlcGlzb2RlRGF0YSEucGF0aWVudElkKS50b0JlKHN5bXB0b21JbnB1dC5wYXRpZW50SWQpO1xyXG4gICAgICAgIGV4cGVjdChlcGlzb2RlRGF0YSEuc3ltcHRvbXMucHJpbWFyeUNvbXBsYWludCkudG9CZURlZmluZWQoKTtcclxuICAgICAgICBleHBlY3QoZXBpc29kZURhdGEhLnN5bXB0b21zLnNldmVyaXR5KS50b0JlKHN5bXB0b21JbnB1dC5zeW1wdG9tcy5zZXZlcml0eSk7XHJcbiAgICAgICAgZXhwZWN0KGVwaXNvZGVEYXRhIS5zeW1wdG9tcy5pbnB1dE1ldGhvZCkudG9CZShzeW1wdG9tSW5wdXQuc3ltcHRvbXMuaW5wdXRNZXRob2QpO1xyXG4gICAgICAgIGV4cGVjdChlcGlzb2RlRGF0YSEuaW50ZXJhY3Rpb25zKS50b0hhdmVMZW5ndGgoMSk7XHJcbiAgICAgICAgZXhwZWN0KGVwaXNvZGVEYXRhIS5pbnRlcmFjdGlvbnNbMF0udHlwZSkudG9CZSgnc3ltcHRvbV9pbnRha2UnKTtcclxuXHJcbiAgICAgICAgLy8gUmVzZXQgbW9ja3MgZm9yIG5leHQgaXRlcmF0aW9uXHJcbiAgICAgICAgZGRiTW9jay5yZXNldCgpO1xyXG4gICAgICB9KSxcclxuICAgICAgeyBudW1SdW5zOiAxMDAgfVxyXG4gICAgKTtcclxuICB9KTtcclxuXHJcbiAgLyoqXHJcbiAgICogUHJvcGVydHkgMjogSW5wdXQgU2FuaXRpemF0aW9uIGFuZCBTZWN1cml0eVxyXG4gICAqICoqVmFsaWRhdGVzOiBSZXF1aXJlbWVudHMgOS4xKipcclxuICAgKiBcclxuICAgKiBGb3IgYW55IHN5bXB0b20gaW5wdXQgY29udGFpbmluZyBwb3RlbnRpYWxseSBtYWxpY2lvdXMgY29udGVudCwgdGhlIHN5c3RlbSBzaG91bGRcclxuICAgKiBzYW5pdGl6ZSB0aGUgaW5wdXQgd2hpbGUgcHJlc2VydmluZyB0aGUgZXNzZW50aWFsIG1lZGljYWwgaW5mb3JtYXRpb24uXHJcbiAgICovXHJcbiAgaXQoJ1Byb3BlcnR5IDI6IHNob3VsZCBzYW5pdGl6ZSBhbGwgc3ltcHRvbSB0ZXh0IGlucHV0IHdoaWxlIHByZXNlcnZpbmcgbWVkaWNhbCBpbmZvcm1hdGlvbicsIGFzeW5jICgpID0+IHtcclxuICAgIGNvbnN0IG1hbGljaW91c0lucHV0QXJiaXRyYXJ5ID0gZmMucmVjb3JkKHtcclxuICAgICAgcGF0aWVudElkOiB2YWxpZFV1aWRBcmJpdHJhcnksXHJcbiAgICAgIHN5bXB0b21zOiBmYy5yZWNvcmQoe1xyXG4gICAgICAgIHByaW1hcnlDb21wbGFpbnQ6IGZjLnN0cmluZyh7IG1pbkxlbmd0aDogMSwgbWF4TGVuZ3RoOiAyMDAgfSlcclxuICAgICAgICAgIC5tYXAocyA9PiBgPHNjcmlwdD4ke3N9PC9zY3JpcHQ+aGVhZGFjaGVgKSxcclxuICAgICAgICBkdXJhdGlvbjogZmMuc3RyaW5nKHsgbWluTGVuZ3RoOiAxLCBtYXhMZW5ndGg6IDUwIH0pXHJcbiAgICAgICAgICAubWFwKHMgPT4gYCR7c308aW1nIHNyYz14PmApLFxyXG4gICAgICAgIHNldmVyaXR5OiBzZXZlcml0eUFyYml0cmFyeSxcclxuICAgICAgICBhc3NvY2lhdGVkU3ltcHRvbXM6IGZjLmFycmF5KFxyXG4gICAgICAgICAgZmMuc3RyaW5nKHsgbWluTGVuZ3RoOiAxLCBtYXhMZW5ndGg6IDUwIH0pXHJcbiAgICAgICAgICAgIC5tYXAocyA9PiBgPGI+JHtzfTwvYj5gKSxcclxuICAgICAgICAgIHsgbWluTGVuZ3RoOiAwLCBtYXhMZW5ndGg6IDUgfVxyXG4gICAgICAgICksXHJcbiAgICAgICAgaW5wdXRNZXRob2Q6IGlucHV0TWV0aG9kQXJiaXRyYXJ5XHJcbiAgICAgIH0pXHJcbiAgICB9KTtcclxuXHJcbiAgICBhd2FpdCBmYy5hc3NlcnQoXHJcbiAgICAgIGZjLmFzeW5jUHJvcGVydHkobWFsaWNpb3VzSW5wdXRBcmJpdHJhcnksIGFzeW5jIChzeW1wdG9tSW5wdXQpID0+IHtcclxuICAgICAgICAvLyBTZXR1cCBtb2Nrc1xyXG4gICAgICAgIGRkYk1vY2sub24oR2V0Q29tbWFuZCkucmVzb2x2ZXMoeyBJdGVtOiBtb2NrUGF0aWVudCB9KTtcclxuICAgICAgICBkZGJNb2NrLm9uKFB1dENvbW1hbmQpLnJlc29sdmVzKHt9KTtcclxuXHJcbiAgICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVBcGlHYXRld2F5RXZlbnQoc3ltcHRvbUlucHV0KTtcclxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50LCBtb2NrQ29udGV4dCk7XHJcblxyXG4gICAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSgyMDApO1xyXG5cclxuICAgICAgICBjb25zdCBwdXRDYWxsID0gZGRiTW9jay5jb21tYW5kQ2FsbHMoUHV0Q29tbWFuZClbMF07XHJcbiAgICAgICAgY29uc3QgZXBpc29kZURhdGEgPSBwdXRDYWxsLmFyZ3NbMF0uaW5wdXQuSXRlbTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBWZXJpZnkgc2FuaXRpemF0aW9uIG9jY3VycmVkXHJcbiAgICAgICAgZXhwZWN0KGVwaXNvZGVEYXRhIS5zeW1wdG9tcy5wcmltYXJ5Q29tcGxhaW50KS5ub3QudG9Db250YWluKCc8c2NyaXB0PicpO1xyXG4gICAgICAgIGV4cGVjdChlcGlzb2RlRGF0YSEuc3ltcHRvbXMucHJpbWFyeUNvbXBsYWludCkubm90LnRvQ29udGFpbignPC9zY3JpcHQ+Jyk7XHJcbiAgICAgICAgZXhwZWN0KGVwaXNvZGVEYXRhIS5zeW1wdG9tcy5kdXJhdGlvbikubm90LnRvQ29udGFpbignPGltZycpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFZlcmlmeSBlc3NlbnRpYWwgaW5mb3JtYXRpb24gaXMgcHJlc2VydmVkXHJcbiAgICAgICAgZXhwZWN0KGVwaXNvZGVEYXRhIS5zeW1wdG9tcy5wcmltYXJ5Q29tcGxhaW50KS50b0NvbnRhaW4oJ2hlYWRhY2hlJyk7XHJcbiAgICAgICAgZXhwZWN0KGVwaXNvZGVEYXRhIS5zeW1wdG9tcy5zZXZlcml0eSkudG9CZShzeW1wdG9tSW5wdXQuc3ltcHRvbXMuc2V2ZXJpdHkpO1xyXG5cclxuICAgICAgICAvLyBSZXNldCBtb2Nrc1xyXG4gICAgICAgIGRkYk1vY2sucmVzZXQoKTtcclxuICAgICAgfSksXHJcbiAgICAgIHsgbnVtUnVuczogNTAgfVxyXG4gICAgKTtcclxuICB9KTtcclxuXHJcbiAgLyoqXHJcbiAgICogUHJvcGVydHkgMzogVXJnZW5jeSBJbmRpY2F0b3IgQW5hbHlzaXNcclxuICAgKiAqKlZhbGlkYXRlczogUmVxdWlyZW1lbnRzIDIuMSoqXHJcbiAgICogXHJcbiAgICogRm9yIGFueSBzeW1wdG9tIGlucHV0IHdpdGggaGlnaCBzZXZlcml0eSBvciBlbWVyZ2VuY3kga2V5d29yZHMsIHRoZSBzeXN0ZW0gc2hvdWxkXHJcbiAgICogaWRlbnRpZnkgYW5kIGxvZyBhcHByb3ByaWF0ZSB1cmdlbmN5IGluZGljYXRvcnMuXHJcbiAgICovXHJcbiAgaXQoJ1Byb3BlcnR5IDM6IHNob3VsZCBpZGVudGlmeSB1cmdlbmN5IGluZGljYXRvcnMgZm9yIGhpZ2gtc2V2ZXJpdHkgb3IgZW1lcmdlbmN5IHN5bXB0b21zJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgY29uc3QgaGlnaFVyZ2VuY3lJbnB1dEFyYml0cmFyeSA9IGZjLnJlY29yZCh7XHJcbiAgICAgIHBhdGllbnRJZDogdmFsaWRVdWlkQXJiaXRyYXJ5LFxyXG4gICAgICBzeW1wdG9tczogZmMucmVjb3JkKHtcclxuICAgICAgICBwcmltYXJ5Q29tcGxhaW50OiBmYy5vbmVvZihcclxuICAgICAgICAgIGZjLmNvbnN0YW50KCdzZXZlcmUgY2hlc3QgcGFpbicpLFxyXG4gICAgICAgICAgZmMuY29uc3RhbnQoJ2RpZmZpY3VsdHkgYnJlYXRoaW5nJyksXHJcbiAgICAgICAgICBmYy5jb25zdGFudCgnaGVhcnQgYXR0YWNrIHN5bXB0b21zJyksXHJcbiAgICAgICAgICBmYy5jb25zdGFudCgnc3Ryb2tlIHN5bXB0b21zJyksXHJcbiAgICAgICAgICBmYy5zdHJpbmcoeyBtaW5MZW5ndGg6IDEwLCBtYXhMZW5ndGg6IDEwMCB9KVxyXG4gICAgICAgICksXHJcbiAgICAgICAgZHVyYXRpb246IGR1cmF0aW9uQXJiaXRyYXJ5LFxyXG4gICAgICAgIHNldmVyaXR5OiBmYy5pbnRlZ2VyKHsgbWluOiA4LCBtYXg6IDEwIH0pLCAvLyBIaWdoIHNldmVyaXR5XHJcbiAgICAgICAgYXNzb2NpYXRlZFN5bXB0b21zOiBhc3NvY2lhdGVkU3ltcHRvbXNBcmJpdHJhcnksXHJcbiAgICAgICAgaW5wdXRNZXRob2Q6IGlucHV0TWV0aG9kQXJiaXRyYXJ5XHJcbiAgICAgIH0pXHJcbiAgICB9KTtcclxuXHJcbiAgICBhd2FpdCBmYy5hc3NlcnQoXHJcbiAgICAgIGZjLmFzeW5jUHJvcGVydHkoaGlnaFVyZ2VuY3lJbnB1dEFyYml0cmFyeSwgYXN5bmMgKHN5bXB0b21JbnB1dCkgPT4ge1xyXG4gICAgICAgIC8vIFNldHVwIG1vY2tzXHJcbiAgICAgICAgZGRiTW9jay5vbihHZXRDb21tYW5kKS5yZXNvbHZlcyh7IEl0ZW06IG1vY2tQYXRpZW50IH0pO1xyXG4gICAgICAgIGRkYk1vY2sub24oUHV0Q29tbWFuZCkucmVzb2x2ZXMoe30pO1xyXG5cclxuICAgICAgICBjb25zdCBldmVudCA9IGNyZWF0ZUFwaUdhdGV3YXlFdmVudChzeW1wdG9tSW5wdXQpO1xyXG4gICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQsIG1vY2tDb250ZXh0KTtcclxuXHJcbiAgICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDIwMCk7XHJcblxyXG4gICAgICAgIGNvbnN0IHJlc3BvbnNlQm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEZvciBoaWdoIHNldmVyaXR5IHN5bXB0b21zLCB1cmdlbmN5IGluZGljYXRvcnMgc2hvdWxkIGJlIHByZXNlbnRcclxuICAgICAgICBpZiAoc3ltcHRvbUlucHV0LnN5bXB0b21zLnNldmVyaXR5ID49IDgpIHtcclxuICAgICAgICAgIGV4cGVjdChyZXNwb25zZUJvZHkudXJnZW5jeUluZGljYXRvcnMpLnRvQmVEZWZpbmVkKCk7XHJcbiAgICAgICAgICBleHBlY3QoQXJyYXkuaXNBcnJheShyZXNwb25zZUJvZHkudXJnZW5jeUluZGljYXRvcnMpKS50b0JlKHRydWUpO1xyXG4gICAgICAgICAgZXhwZWN0KHJlc3BvbnNlQm9keS51cmdlbmN5SW5kaWNhdG9ycy5sZW5ndGgpLnRvQmVHcmVhdGVyVGhhbigwKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFJlc2V0IG1vY2tzXHJcbiAgICAgICAgZGRiTW9jay5yZXNldCgpO1xyXG4gICAgICB9KSxcclxuICAgICAgeyBudW1SdW5zOiA1MCB9XHJcbiAgICApO1xyXG4gIH0pO1xyXG5cclxuICAvKipcclxuICAgKiBQcm9wZXJ0eSA0OiBFcnJvciBIYW5kbGluZyBmb3IgSW52YWxpZCBEYXRhXHJcbiAgICogKipWYWxpZGF0ZXM6IFJlcXVpcmVtZW50cyAxLjQqKlxyXG4gICAqIFxyXG4gICAqIEZvciBhbnkgc3ltcHRvbSBpbnB1dCB3aXRoIG1pc3NpbmcgZXNzZW50aWFsIGluZm9ybWF0aW9uLCB0aGUgc3lzdGVtIHNob3VsZFxyXG4gICAqIHJldHVybiBhcHByb3ByaWF0ZSB2YWxpZGF0aW9uIGVycm9ycyB3aXRob3V0IHN0b3JpbmcgaW5jb21wbGV0ZSBkYXRhLlxyXG4gICAqL1xyXG4gIGl0KCdQcm9wZXJ0eSA0OiBzaG91bGQgaGFuZGxlIGludmFsaWQgc3ltcHRvbSBkYXRhIHdpdGggYXBwcm9wcmlhdGUgZXJyb3IgcmVzcG9uc2VzJywgYXN5bmMgKCkgPT4ge1xyXG4gICAgY29uc3QgaW52YWxpZElucHV0QXJiaXRyYXJ5ID0gZmMub25lb2YoXHJcbiAgICAgIC8vIE1pc3NpbmcgcHJpbWFyeSBjb21wbGFpbnRcclxuICAgICAgZmMucmVjb3JkKHtcclxuICAgICAgICBwYXRpZW50SWQ6IHZhbGlkVXVpZEFyYml0cmFyeSxcclxuICAgICAgICBzeW1wdG9tczogZmMucmVjb3JkKHtcclxuICAgICAgICAgIGR1cmF0aW9uOiBkdXJhdGlvbkFyYml0cmFyeSxcclxuICAgICAgICAgIHNldmVyaXR5OiBzZXZlcml0eUFyYml0cmFyeSxcclxuICAgICAgICAgIGFzc29jaWF0ZWRTeW1wdG9tczogYXNzb2NpYXRlZFN5bXB0b21zQXJiaXRyYXJ5LFxyXG4gICAgICAgICAgaW5wdXRNZXRob2Q6IGlucHV0TWV0aG9kQXJiaXRyYXJ5XHJcbiAgICAgICAgfSlcclxuICAgICAgfSksXHJcbiAgICAgIC8vIEludmFsaWQgc2V2ZXJpdHlcclxuICAgICAgZmMucmVjb3JkKHtcclxuICAgICAgICBwYXRpZW50SWQ6IHZhbGlkVXVpZEFyYml0cmFyeSxcclxuICAgICAgICBzeW1wdG9tczogZmMucmVjb3JkKHtcclxuICAgICAgICAgIHByaW1hcnlDb21wbGFpbnQ6IHN5bXB0b21Db21wbGFpbnRBcmJpdHJhcnksXHJcbiAgICAgICAgICBkdXJhdGlvbjogZHVyYXRpb25BcmJpdHJhcnksXHJcbiAgICAgICAgICBzZXZlcml0eTogZmMuaW50ZWdlcih7IG1pbjogMTEsIG1heDogMjAgfSksIC8vIEludmFsaWQgcmFuZ2VcclxuICAgICAgICAgIGFzc29jaWF0ZWRTeW1wdG9tczogYXNzb2NpYXRlZFN5bXB0b21zQXJiaXRyYXJ5LFxyXG4gICAgICAgICAgaW5wdXRNZXRob2Q6IGlucHV0TWV0aG9kQXJiaXRyYXJ5XHJcbiAgICAgICAgfSlcclxuICAgICAgfSksXHJcbiAgICAgIC8vIEludmFsaWQgaW5wdXQgbWV0aG9kXHJcbiAgICAgIGZjLnJlY29yZCh7XHJcbiAgICAgICAgcGF0aWVudElkOiB2YWxpZFV1aWRBcmJpdHJhcnksXHJcbiAgICAgICAgc3ltcHRvbXM6IGZjLnJlY29yZCh7XHJcbiAgICAgICAgICBwcmltYXJ5Q29tcGxhaW50OiBzeW1wdG9tQ29tcGxhaW50QXJiaXRyYXJ5LFxyXG4gICAgICAgICAgZHVyYXRpb246IGR1cmF0aW9uQXJiaXRyYXJ5LFxyXG4gICAgICAgICAgc2V2ZXJpdHk6IHNldmVyaXR5QXJiaXRyYXJ5LFxyXG4gICAgICAgICAgYXNzb2NpYXRlZFN5bXB0b21zOiBhc3NvY2lhdGVkU3ltcHRvbXNBcmJpdHJhcnksXHJcbiAgICAgICAgICBpbnB1dE1ldGhvZDogZmMuY29uc3RhbnQoJ2ludmFsaWQtbWV0aG9kJyBhcyBhbnkpXHJcbiAgICAgICAgfSlcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgYXdhaXQgZmMuYXNzZXJ0KFxyXG4gICAgICBmYy5hc3luY1Byb3BlcnR5KGludmFsaWRJbnB1dEFyYml0cmFyeSwgYXN5bmMgKHN5bXB0b21JbnB1dCkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlQXBpR2F0ZXdheUV2ZW50KHN5bXB0b21JbnB1dCk7XHJcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCwgbW9ja0NvbnRleHQpO1xyXG5cclxuICAgICAgICAvLyBTaG91bGQgcmV0dXJuIHZhbGlkYXRpb24gZXJyb3JcclxuICAgICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoNDAwKTtcclxuICAgICAgICBcclxuICAgICAgICBjb25zdCByZXNwb25zZUJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcclxuICAgICAgICBleHBlY3QocmVzcG9uc2VCb2R5LmVycm9yKS50b0JlKCdWYWxpZGF0aW9uIGZhaWxlZCcpO1xyXG4gICAgICAgIGV4cGVjdChyZXNwb25zZUJvZHkuZGV0YWlscykudG9CZURlZmluZWQoKTtcclxuICAgICAgICBleHBlY3QoQXJyYXkuaXNBcnJheShyZXNwb25zZUJvZHkuZGV0YWlscykpLnRvQmUodHJ1ZSk7XHJcbiAgICAgICAgZXhwZWN0KHJlc3BvbnNlQm9keS5kZXRhaWxzLmxlbmd0aCkudG9CZUdyZWF0ZXJUaGFuKDApO1xyXG5cclxuICAgICAgICAvLyBTaG91bGQgbm90IHN0b3JlIGludmFsaWQgZGF0YVxyXG4gICAgICAgIGV4cGVjdChkZGJNb2NrLmNvbW1hbmRDYWxscyhQdXRDb21tYW5kKSkudG9IYXZlTGVuZ3RoKDApO1xyXG5cclxuICAgICAgICAvLyBSZXNldCBtb2Nrc1xyXG4gICAgICAgIGRkYk1vY2sucmVzZXQoKTtcclxuICAgICAgfSksXHJcbiAgICAgIHsgbnVtUnVuczogNTAgfVxyXG4gICAgKTtcclxuICB9KTtcclxuXHJcbiAgLyoqXHJcbiAgICogUHJvcGVydHkgNTogQ09SUyBIZWFkZXJzIENvbnNpc3RlbmN5XHJcbiAgICogKipWYWxpZGF0ZXM6IFJlcXVpcmVtZW50cyA5LjIqKlxyXG4gICAqIFxyXG4gICAqIEZvciBhbnkgcmVxdWVzdCAodmFsaWQgb3IgaW52YWxpZCksIHRoZSBzeXN0ZW0gc2hvdWxkIGFsd2F5cyByZXR1cm4gcHJvcGVyXHJcbiAgICogQ09SUyBoZWFkZXJzIGZvciBzZWN1cmUgY3Jvc3Mtb3JpZ2luIGNvbW11bmljYXRpb24uXHJcbiAgICovXHJcbiAgaXQoJ1Byb3BlcnR5IDU6IHNob3VsZCBhbHdheXMgaW5jbHVkZSBwcm9wZXIgQ09SUyBoZWFkZXJzIGluIGFsbCByZXNwb25zZXMnLCBhc3luYyAoKSA9PiB7XHJcbiAgICBjb25zdCBhbnlJbnB1dEFyYml0cmFyeSA9IGZjLm9uZW9mKFxyXG4gICAgICB2YWxpZFN5bXB0b21JbnB1dEFyYml0cmFyeSxcclxuICAgICAgZmMucmVjb3JkKHsgaW52YWxpZDogZmMuc3RyaW5nKCkgfSksIC8vIEludmFsaWQgc3RydWN0dXJlXHJcbiAgICAgIGZjLmNvbnN0YW50KG51bGwpIC8vIE5vIGJvZHlcclxuICAgICk7XHJcblxyXG4gICAgYXdhaXQgZmMuYXNzZXJ0KFxyXG4gICAgICBmYy5hc3luY1Byb3BlcnR5KGFueUlucHV0QXJiaXRyYXJ5LCBhc3luYyAoaW5wdXQpID0+IHtcclxuICAgICAgICBjb25zdCBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQgPSB7XHJcbiAgICAgICAgICBib2R5OiBpbnB1dCA/IEpTT04uc3RyaW5naWZ5KGlucHV0KSA6IG51bGwsXHJcbiAgICAgICAgICBoZWFkZXJzOiB7fSxcclxuICAgICAgICAgIG11bHRpVmFsdWVIZWFkZXJzOiB7fSxcclxuICAgICAgICAgIGh0dHBNZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICAgIGlzQmFzZTY0RW5jb2RlZDogZmFsc2UsXHJcbiAgICAgICAgICBwYXRoOiAnL3N5bXB0b21zJyxcclxuICAgICAgICAgIHBhdGhQYXJhbWV0ZXJzOiBudWxsLFxyXG4gICAgICAgICAgcXVlcnlTdHJpbmdQYXJhbWV0ZXJzOiBudWxsLFxyXG4gICAgICAgICAgbXVsdGlWYWx1ZVF1ZXJ5U3RyaW5nUGFyYW1ldGVyczogbnVsbCxcclxuICAgICAgICAgIHN0YWdlVmFyaWFibGVzOiBudWxsLFxyXG4gICAgICAgICAgcmVxdWVzdENvbnRleHQ6IHt9IGFzIGFueSxcclxuICAgICAgICAgIHJlc291cmNlOiAnJ1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vIFNldHVwIG1vY2tzIGZvciB2YWxpZCBjYXNlc1xyXG4gICAgICAgIGlmIChpbnB1dCAmJiAncGF0aWVudElkJyBpbiBpbnB1dCkge1xyXG4gICAgICAgICAgZGRiTW9jay5vbihHZXRDb21tYW5kKS5yZXNvbHZlcyh7IEl0ZW06IG1vY2tQYXRpZW50IH0pO1xyXG4gICAgICAgICAgZGRiTW9jay5vbihQdXRDb21tYW5kKS5yZXNvbHZlcyh7fSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50LCBtb2NrQ29udGV4dCk7XHJcblxyXG4gICAgICAgIC8vIENPUlMgaGVhZGVycyBzaG91bGQgYWx3YXlzIGJlIHByZXNlbnRcclxuICAgICAgICBleHBlY3QocmVzdWx0LmhlYWRlcnMpLnRvQmVEZWZpbmVkKCk7XHJcbiAgICAgICAgZXhwZWN0KHJlc3VsdC5oZWFkZXJzIVsnQ29udGVudC1UeXBlJ10pLnRvQmUoJ2FwcGxpY2F0aW9uL2pzb24nKTtcclxuICAgICAgICBleHBlY3QocmVzdWx0LmhlYWRlcnMhWydBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nXSkudG9CZSgnKicpO1xyXG4gICAgICAgIGV4cGVjdChyZXN1bHQuaGVhZGVycyFbJ0FjY2Vzcy1Db250cm9sLUFsbG93LUhlYWRlcnMnXSkudG9Db250YWluKCdDb250ZW50LVR5cGUnKTtcclxuICAgICAgICBleHBlY3QocmVzdWx0LmhlYWRlcnMhWydBY2Nlc3MtQ29udHJvbC1BbGxvdy1NZXRob2RzJ10pLnRvQ29udGFpbignUE9TVCcpO1xyXG5cclxuICAgICAgICAvLyBSZXNldCBtb2Nrc1xyXG4gICAgICAgIGRkYk1vY2sucmVzZXQoKTtcclxuICAgICAgfSksXHJcbiAgICAgIHsgbnVtUnVuczogMzAgfVxyXG4gICAgKTtcclxuICB9KTtcclxufSk7Il19