import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
export declare function setDynamoClient(client: DynamoDBDocumentClient): void;
/**
 * Lambda handler for symptom intake
 */
export declare const handler: (event: APIGatewayProxyEvent, context: Context) => Promise<APIGatewayProxyResult>;
