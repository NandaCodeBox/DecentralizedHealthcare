// Test Helper Utilities
// Provides consistent test utilities for the new response format

import { APIGatewayProxyResult, APIGatewayProxyEvent, Context } from 'aws-lambda';
import { ResponseFormatAdapter, testHelpers } from './test-response-adapter';

/**
 * Enhanced test helpers for Lambda function testing
 */
export class TestHelpers {
  /**
   * Create mock API Gateway event
   */
  static createMockEvent(
    httpMethod: string = 'POST',
    path: string = '/test',
    body: any = {},
    pathParameters: any = {},
    queryStringParameters: any = {}
  ): APIGatewayProxyEvent {
    return {
      httpMethod,
      path,
      body: typeof body === 'string' ? body : JSON.stringify(body),
      pathParameters,
      queryStringParameters,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'test-agent'
      },
      multiValueHeaders: {},
      isBase64Encoded: false,
      requestContext: {
        requestId: 'test-request-id',
        stage: 'test',
        resourceId: 'test-resource',
        httpMethod,
        resourcePath: path,
        path,
        accountId: '123456789012',
        apiId: 'test-api',
        protocol: 'HTTP/1.1',
        requestTime: '01/Jan/2024:00:00:00 +0000',
        requestTimeEpoch: Date.now(),
        identity: {
          sourceIp: '127.0.0.1',
          userAgent: 'test-agent',
          accessKey: null,
          accountId: null,
          apiKey: null,
          apiKeyId: null,
          caller: null,
          cognitoAuthenticationProvider: null,
          cognitoAuthenticationType: null,
          cognitoIdentityId: null,
          cognitoIdentityPoolId: null,
          principalOrgId: null,
          user: null,
          userArn: null,
          clientCert: null
        },
        authorizer: null
      },
      resource: path,
      stageVariables: null,
      multiValueQueryStringParameters: null
    };
  }

  /**
   * Create mock Lambda context
   */
  static createMockContext(): Context {
    return {
      callbackWaitsForEmptyEventLoop: false,
      functionName: 'test-function',
      functionVersion: '1',
      invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
      memoryLimitInMB: '128',
      awsRequestId: 'test-request-id',
      logGroupName: '/aws/lambda/test-function',
      logStreamName: '2024/01/01/[$LATEST]test-stream',
      getRemainingTimeInMillis: () => 30000,
      done: () => {},
      fail: () => {},
      succeed: () => {}
    };
  }

  /**
   * Assert response has expected status code
   */
  static expectStatusCode(result: APIGatewayProxyResult, expectedCode: number): void {
    expect(result.statusCode).toBe(expectedCode);
  }

  /**
   * Assert response has CORS headers
   */
  static expectCorsHeaders(result: APIGatewayProxyResult): void {
    expect(result.headers).toEqual(expect.objectContaining({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }));
  }

  /**
   * Assert error response with backward compatibility
   */
  static expectError(result: APIGatewayProxyResult, expectedError: string): void {
    const errorMessage = ResponseFormatAdapter.getErrorMessage(result);
    expect(errorMessage).toBe(expectedError);
  }

  /**
   * Assert success response with backward compatibility
   */
  static expectSuccess(result: APIGatewayProxyResult, expectedMessage?: string): void {
    expect(ResponseFormatAdapter.isSuccess(result)).toBe(true);
    if (expectedMessage) {
      const message = ResponseFormatAdapter.getSuccessMessage(result);
      expect(message).toBe(expectedMessage);
    }
  }

  /**
   * Get response data with format compatibility
   */
  static getResponseData(result: APIGatewayProxyResult): any {
    return ResponseFormatAdapter.getData(result);
  }

  /**
   * Get legacy formatted response body
   */
  static getLegacyResponseBody(result: APIGatewayProxyResult): any {
    return ResponseFormatAdapter.toLegacyFormat(result);
  }

  /**
   * Assert response contains expected data
   */
  static expectResponseData(result: APIGatewayProxyResult, expectedData: any): void {
    const data = this.getResponseData(result);
    expect(data).toEqual(expect.objectContaining(expectedData));
  }

  /**
   * Create test episode data
   */
  static createTestEpisode(overrides: any = {}): any {
    return {
      episodeId: 'test-episode-123',
      patientId: 'test-patient-123',
      status: 'active',
      symptoms: {
        primaryComplaint: 'Test symptoms',
        duration: '2 days',
        severity: 5,
        associatedSymptoms: [],
        inputMethod: 'text'
      },
      triage: {
        urgencyLevel: 'routine',
        ruleBasedScore: 50,
        aiAssessment: { used: false },
        finalScore: 50
      },
      interactions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  /**
   * Create test patient data
   */
  static createTestPatient(overrides: any = {}): any {
    return {
      patientId: 'test-patient-123',
      demographics: {
        age: 30,
        gender: 'other',
        location: {
          state: 'Test State',
          district: 'Test District',
          pincode: '12345',
          coordinates: { lat: 19.0596, lng: 72.8295 }
        },
        preferredLanguage: 'en',
        insuranceInfo: {
          provider: 'Test Insurance',
          policyNumber: 'TEST123456',
          coverage: {}
        }
      },
      medicalHistory: {
        conditions: [],
        medications: [],
        allergies: []
      },
      preferences: {
        providerGender: 'any',
        maxTravelDistance: 25,
        costSensitivity: 'moderate'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Wait for async operations (useful for testing)
   */
  static async wait(ms: number = 100): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create mock DynamoDB response
   */
  static createMockDynamoResponse(item: any = null): any {
    return {
      Item: item,
      $metadata: {
        httpStatusCode: 200,
        requestId: 'test-request-id'
      }
    };
  }

  /**
   * Create mock SNS response
   */
  static createMockSNSResponse(): any {
    return {
      MessageId: 'test-message-id',
      $metadata: {
        httpStatusCode: 200,
        requestId: 'test-request-id'
      }
    };
  }
}

// Export individual test helpers for backward compatibility
export const {
  expectError,
  expectMessage,
  expectData,
  getLegacyBody
} = testHelpers;