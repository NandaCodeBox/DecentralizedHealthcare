import { APIGatewayProxyResult } from 'aws-lambda';

/**
 * Create a successful API Gateway response
 */
export function createSuccessResponse(data: any, statusCode: number = 200): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'POST,OPTIONS'
    },
    body: JSON.stringify({
      success: true,
      data,
      timestamp: new Date().toISOString()
    })
  };
}

/**
 * Create an error API Gateway response
 */
export function createErrorResponse(statusCode: number, message: string, details?: any): APIGatewayProxyResult {
  const errorResponse = {
    success: false,
    error: {
      message,
      statusCode,
      timestamp: new Date().toISOString()
    }
  };

  if (details) {
    (errorResponse.error as any).details = details;
  }

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'POST,OPTIONS'
    },
    body: JSON.stringify(errorResponse)
  };
}

/**
 * Create a validation error response
 */
export function createValidationErrorResponse(validationErrors: any[]): APIGatewayProxyResult {
  return createErrorResponse(400, 'Validation failed', {
    validationErrors
  });
}

/**
 * Create a not found response
 */
export function createNotFoundResponse(resource: string): APIGatewayProxyResult {
  return createErrorResponse(404, `${resource} not found`);
}

/**
 * Create an unauthorized response
 */
export function createUnauthorizedResponse(message: string = 'Unauthorized'): APIGatewayProxyResult {
  return createErrorResponse(401, message);
}

/**
 * Create a forbidden response
 */
export function createForbiddenResponse(message: string = 'Forbidden'): APIGatewayProxyResult {
  return createErrorResponse(403, message);
}

/**
 * Create a rate limit exceeded response
 */
export function createRateLimitResponse(message: string = 'Rate limit exceeded'): APIGatewayProxyResult {
  return createErrorResponse(429, message);
}

/**
 * Parse and validate JSON body from API Gateway event
 */
export function parseJsonBody<T>(body: string | null): T {
  if (!body) {
    throw new Error('Request body is required');
  }

  try {
    return JSON.parse(body) as T;
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }
}

/**
 * Extract user information from API Gateway event context
 */
export function extractUserInfo(event: any): {
  userId?: string;
  email?: string;
  role?: string;
  organization?: string;
} {
  const claims = event.requestContext?.authorizer?.claims;
  
  if (!claims) {
    return {};
  }

  return {
    userId: claims.sub,
    email: claims.email,
    role: claims['custom:role'],
    organization: claims['custom:organization']
  };
}

/**
 * Create a paginated response
 */
export function createPaginatedResponse(
  items: any[],
  totalCount: number,
  page: number,
  limit: number,
  lastKey?: string
): APIGatewayProxyResult {
  const totalPages = Math.ceil(totalCount / limit);
  
  return createSuccessResponse({
    items,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      lastKey
    }
  });
}

/**
 * Validate required query parameters
 */
export function validateRequiredParams(
  queryParams: Record<string, string | undefined>,
  requiredParams: string[]
): string[] {
  const missingParams: string[] = [];
  
  requiredParams.forEach(param => {
    if (!queryParams[param]) {
      missingParams.push(param);
    }
  });
  
  return missingParams;
}

/**
 * Sanitize and parse query parameters
 */
export function parseQueryParams(queryParams: Record<string, string | undefined>): Record<string, any> {
  const parsed: Record<string, any> = {};
  
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    
    // Try to parse as number
    if (!isNaN(Number(value))) {
      parsed[key] = Number(value);
      return;
    }
    
    // Try to parse as boolean
    if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
      parsed[key] = value.toLowerCase() === 'true';
      return;
    }
    
    // Keep as string
    parsed[key] = value;
  });
  
  return parsed;
}