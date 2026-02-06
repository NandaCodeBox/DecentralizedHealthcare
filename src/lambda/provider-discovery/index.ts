import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ProviderDiscoveryService } from './provider-discovery-service';
import { ProviderRankingService } from './provider-ranking-service';
import { ProviderCapacityService } from './provider-capacity-service';
import { ProviderSearchCriteria } from '../../types/provider';
import { validateProviderSearchCriteria } from '../../validation/provider-validation';
import { createErrorResponse, createSuccessResponse } from '../../utils/response-utils';

const providerDiscoveryService = new ProviderDiscoveryService();
const providerRankingService = new ProviderRankingService();
const providerCapacityService = new ProviderCapacityService();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Provider discovery function called', JSON.stringify(event, null, 2));

  try {
    const httpMethod = event.httpMethod;
    const path = event.path;
    const pathParameters = event.pathParameters;

    switch (httpMethod) {
      case 'GET':
        if (path.includes('/providers/search')) {
          return await handleProviderSearch(event);
        } else if (path.includes('/providers/capacity')) {
          return await handleCapacityCheck(event);
        } else if (pathParameters?.providerId) {
          return await handleGetProvider(pathParameters.providerId);
        } else {
          return await handleListProviders(event);
        }

      case 'POST':
        if (path.includes('/providers/register')) {
          return await handleProviderRegistration(event);
        } else if (path.includes('/providers/capacity/update')) {
          return await handleCapacityUpdate(event);
        }
        break;

      case 'PUT':
        if (pathParameters?.providerId) {
          return await handleUpdateProvider(pathParameters.providerId, event);
        }
        break;

      default:
        return createErrorResponse(405, 'Method not allowed');
    }

    return createErrorResponse(404, 'Endpoint not found');
  } catch (error) {
    console.error('Error in provider discovery handler:', error);
    return createErrorResponse(500, 'Internal server error', error);
  }
};

async function handleProviderSearch(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const queryParams = event.queryStringParameters || {};
    
    // Parse search criteria from query parameters
    const searchCriteria: ProviderSearchCriteria = {
      type: queryParams.type as any,
      specialties: queryParams.specialties ? queryParams.specialties.split(',') : undefined,
      location: queryParams.lat && queryParams.lng ? {
        coordinates: {
          lat: parseFloat(queryParams.lat),
          lng: parseFloat(queryParams.lng)
        },
        maxDistance: queryParams.maxDistance ? parseFloat(queryParams.maxDistance) : 50
      } : undefined,
      availableNow: queryParams.availableNow === 'true',
      maxCost: queryParams.maxCost ? parseFloat(queryParams.maxCost) : undefined,
      minRating: queryParams.minRating ? parseFloat(queryParams.minRating) : undefined,
      acceptsInsurance: queryParams.insurance ? queryParams.insurance.split(',') : undefined,
      languages: queryParams.languages ? queryParams.languages.split(',') : undefined
    };

    // Validate search criteria
    const { error } = validateProviderSearchCriteria(searchCriteria);
    if (error) {
      return createErrorResponse(400, 'Invalid search criteria', error.details);
    }

    // Search for providers
    const providers = await providerDiscoveryService.searchProviders(searchCriteria);

    // Rank providers based on criteria
    const rankedProviders = await providerRankingService.rankProviders(providers, searchCriteria);

    return createSuccessResponse({
      providers: rankedProviders,
      total: rankedProviders.length,
      searchCriteria
    });
  } catch (error) {
    console.error('Error in provider search:', error);
    return createErrorResponse(500, 'Failed to search providers', error);
  }
}

async function handleCapacityCheck(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const queryParams = event.queryStringParameters || {};
    const providerIds = queryParams.providerIds?.split(',') || [];

    if (providerIds.length === 0) {
      return createErrorResponse(400, 'Provider IDs are required');
    }

    const capacityInfo = await providerCapacityService.checkCapacity(providerIds);

    return createSuccessResponse({
      capacity: capacityInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking provider capacity:', error);
    return createErrorResponse(500, 'Failed to check provider capacity', error);
  }
}

async function handleGetProvider(providerId: string): Promise<APIGatewayProxyResult> {
  try {
    const provider = await providerDiscoveryService.getProvider(providerId);
    
    if (!provider) {
      return createErrorResponse(404, 'Provider not found');
    }

    return createSuccessResponse({ provider });
  } catch (error) {
    console.error('Error getting provider:', error);
    return createErrorResponse(500, 'Failed to get provider', error);
  }
}

async function handleListProviders(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const queryParams = event.queryStringParameters || {};
    const limit = queryParams.limit ? parseInt(queryParams.limit) : 50;
    const lastKey = queryParams.lastKey || undefined;

    const result = await providerDiscoveryService.listProviders(limit, lastKey);

    return createSuccessResponse({
      providers: result.providers,
      lastKey: result.lastKey,
      total: result.providers.length
    });
  } catch (error) {
    console.error('Error listing providers:', error);
    return createErrorResponse(500, 'Failed to list providers', error);
  }
}

async function handleProviderRegistration(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const providerData = JSON.parse(event.body);
    const provider = await providerDiscoveryService.registerProvider(providerData);

    return createSuccessResponse({ provider }, 201);
  } catch (error) {
    console.error('Error registering provider:', error);
    return createErrorResponse(500, 'Failed to register provider', error);
  }
}

async function handleCapacityUpdate(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const updateData = JSON.parse(event.body);
    await providerCapacityService.updateCapacity(updateData);

    return createSuccessResponse({ message: 'Capacity updated successfully' });
  } catch (error) {
    console.error('Error updating provider capacity:', error);
    return createErrorResponse(500, 'Failed to update provider capacity', error);
  }
}

async function handleUpdateProvider(providerId: string, event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if (!event.body) {
      return createErrorResponse(400, 'Request body is required');
    }

    const updateData = JSON.parse(event.body);
    const provider = await providerDiscoveryService.updateProvider(providerId, updateData);

    if (!provider) {
      return createErrorResponse(404, 'Provider not found');
    }

    return createSuccessResponse({ provider });
  } catch (error) {
    console.error('Error updating provider:', error);
    return createErrorResponse(500, 'Failed to update provider', error);
  }
}