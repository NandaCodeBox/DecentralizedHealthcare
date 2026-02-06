import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
/**
 * Human Validation Workflow Lambda Handler
 * Manages validation queue, supervisor notifications, and approval tracking
 */
export declare const handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
