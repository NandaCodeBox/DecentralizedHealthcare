// Test Response Format Adapter
// Provides backward compatibility for tests during transition to new response format

import { APIGatewayProxyResult } from 'aws-lambda';

/**
 * Legacy response format expected by existing tests
 */
export interface LegacyResponse {
  error?: string;
  message?: string;
  [key: string]: any;
}

/**
 * New structured response format
 */
export interface StructuredResponse {
  success: boolean;
  data?: any;
  error?: {
    message: string;
    statusCode: number;
    timestamp: string;
  };
  message?: string;
}

/**
 * Adapter to convert new structured responses back to legacy format for tests
 */
export class ResponseFormatAdapter {
  /**
   * Convert APIGatewayProxyResult to legacy format for test compatibility
   */
  static toLegacyFormat(result: APIGatewayProxyResult): LegacyResponse {
    const body = JSON.parse(result.body);
    
    // If it's already in legacy format, return as-is
    if (typeof body.error === 'string' || (typeof body.message === 'string' && !body.success)) {
      return body;
    }
    
    // Convert structured format to legacy format
    const legacyResponse: LegacyResponse = {};
    
    if (body.error && typeof body.error === 'object') {
      legacyResponse.error = body.error.message;
      
      // Handle validation error details
      if (body.error.details && body.error.details.validationErrors) {
        legacyResponse.details = body.error.details.validationErrors;
      } else if (body.error.details) {
        legacyResponse.details = body.error.details;
      }
    }
    
    if (body.message) {
      legacyResponse.message = body.message;
    }
    
    // If there's a data property, flatten its contents to the root level
    if (body.data && typeof body.data === 'object') {
      Object.keys(body.data).forEach(key => {
        legacyResponse[key] = body.data[key];
      });
    }
    
    // Copy other properties (excluding success, error, message, data)
    Object.keys(body).forEach(key => {
      if (key !== 'error' && key !== 'success' && key !== 'message' && key !== 'data') {
        legacyResponse[key] = body[key];
      }
    });
    
    return legacyResponse;
  }
  
  /**
   * Extract error message from either format
   */
  static getErrorMessage(result: APIGatewayProxyResult): string | undefined {
    const body = JSON.parse(result.body);
    
    if (typeof body.error === 'string') {
      return body.error;
    }
    
    if (body.error && typeof body.error === 'object') {
      return body.error.message;
    }
    
    return undefined;
  }
  
  /**
   * Extract success message from either format
   */
  static getSuccessMessage(result: APIGatewayProxyResult): string | undefined {
    const body = JSON.parse(result.body);
    
    // Check for message in structured format (inside data)
    if (body.data && body.data.message) {
      return body.data.message;
    }
    
    // Check for message at root level (legacy format)
    return body.message;
  }
  
  /**
   * Check if response indicates success
   */
  static isSuccess(result: APIGatewayProxyResult): boolean {
    return result.statusCode >= 200 && result.statusCode < 300;
  }
  
  /**
   * Get data from response (handles both formats)
   */
  static getData(result: APIGatewayProxyResult): any {
    const body = JSON.parse(result.body);
    
    // If structured format, return data property
    if (body.success !== undefined) {
      return body.data || body;
    }
    
    // Legacy format - return entire body except error/message
    const data = { ...body };
    delete data.error;
    delete data.message;
    
    return Object.keys(data).length > 0 ? data : body;
  }
}

/**
 * Test helper functions for backward compatibility
 */
export const testHelpers = {
  /**
   * Assert error message matches expected value
   */
  expectError: (result: APIGatewayProxyResult, expectedError: string) => {
    const legacy = ResponseFormatAdapter.toLegacyFormat(result);
    expect(legacy.error).toBe(expectedError);
  },
  
  /**
   * Assert success message matches expected value
   */
  expectMessage: (result: APIGatewayProxyResult, expectedMessage: string) => {
    const legacy = ResponseFormatAdapter.toLegacyFormat(result);
    expect(legacy.message).toBe(expectedMessage);
  },
  
  /**
   * Assert response contains expected data
   */
  expectData: (result: APIGatewayProxyResult, expectedData: any) => {
    const data = ResponseFormatAdapter.getData(result);
    expect(data).toEqual(expect.objectContaining(expectedData));
  },
  
  /**
   * Get response body in legacy format
   */
  getLegacyBody: (result: APIGatewayProxyResult): LegacyResponse => {
    return ResponseFormatAdapter.toLegacyFormat(result);
  }
};