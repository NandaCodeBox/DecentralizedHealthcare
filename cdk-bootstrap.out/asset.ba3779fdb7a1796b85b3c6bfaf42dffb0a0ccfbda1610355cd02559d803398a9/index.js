"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const provider_discovery_service_1 = require("./provider-discovery-service");
const provider_ranking_service_1 = require("./provider-ranking-service");
const provider_capacity_service_1 = require("./provider-capacity-service");
const provider_validation_1 = require("../../validation/provider-validation");
const response_utils_1 = require("../../utils/response-utils");
const providerDiscoveryService = new provider_discovery_service_1.ProviderDiscoveryService();
const providerRankingService = new provider_ranking_service_1.ProviderRankingService();
const providerCapacityService = new provider_capacity_service_1.ProviderCapacityService();
const handler = async (event) => {
    console.log('Provider discovery function called', JSON.stringify(event, null, 2));
    try {
        const httpMethod = event.httpMethod;
        const path = event.path;
        const pathParameters = event.pathParameters;
        switch (httpMethod) {
            case 'GET':
                if (path.includes('/providers/search')) {
                    return await handleProviderSearch(event);
                }
                else if (path.includes('/providers/capacity')) {
                    return await handleCapacityCheck(event);
                }
                else if (pathParameters?.providerId) {
                    return await handleGetProvider(pathParameters.providerId);
                }
                else {
                    return await handleListProviders(event);
                }
            case 'POST':
                if (path.includes('/providers/register')) {
                    return await handleProviderRegistration(event);
                }
                else if (path.includes('/providers/capacity/update')) {
                    return await handleCapacityUpdate(event);
                }
                break;
            case 'PUT':
                if (pathParameters?.providerId) {
                    return await handleUpdateProvider(pathParameters.providerId, event);
                }
                break;
            default:
                return (0, response_utils_1.createErrorResponse)(405, 'Method not allowed');
        }
        return (0, response_utils_1.createErrorResponse)(404, 'Endpoint not found');
    }
    catch (error) {
        console.error('Error in provider discovery handler:', error);
        return (0, response_utils_1.createErrorResponse)(500, 'Internal server error', error);
    }
};
exports.handler = handler;
async function handleProviderSearch(event) {
    try {
        const queryParams = event.queryStringParameters || {};
        // Parse search criteria from query parameters
        const searchCriteria = {
            type: queryParams.type,
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
        const { error } = (0, provider_validation_1.validateProviderSearchCriteria)(searchCriteria);
        if (error) {
            return (0, response_utils_1.createErrorResponse)(400, 'Invalid search criteria', error.details);
        }
        // Search for providers
        const providers = await providerDiscoveryService.searchProviders(searchCriteria);
        // Rank providers based on criteria
        const rankedProviders = await providerRankingService.rankProviders(providers, searchCriteria);
        return (0, response_utils_1.createSuccessResponse)({
            providers: rankedProviders,
            total: rankedProviders.length,
            searchCriteria
        });
    }
    catch (error) {
        console.error('Error in provider search:', error);
        return (0, response_utils_1.createErrorResponse)(500, 'Failed to search providers', error);
    }
}
async function handleCapacityCheck(event) {
    try {
        const queryParams = event.queryStringParameters || {};
        const providerIds = queryParams.providerIds?.split(',') || [];
        if (providerIds.length === 0) {
            return (0, response_utils_1.createErrorResponse)(400, 'Provider IDs are required');
        }
        const capacityInfo = await providerCapacityService.checkCapacity(providerIds);
        return (0, response_utils_1.createSuccessResponse)({
            capacity: capacityInfo,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('Error checking provider capacity:', error);
        return (0, response_utils_1.createErrorResponse)(500, 'Failed to check provider capacity', error);
    }
}
async function handleGetProvider(providerId) {
    try {
        const provider = await providerDiscoveryService.getProvider(providerId);
        if (!provider) {
            return (0, response_utils_1.createErrorResponse)(404, 'Provider not found');
        }
        return (0, response_utils_1.createSuccessResponse)({ provider });
    }
    catch (error) {
        console.error('Error getting provider:', error);
        return (0, response_utils_1.createErrorResponse)(500, 'Failed to get provider', error);
    }
}
async function handleListProviders(event) {
    try {
        const queryParams = event.queryStringParameters || {};
        const limit = queryParams.limit ? parseInt(queryParams.limit) : 50;
        const lastKey = queryParams.lastKey || undefined;
        const result = await providerDiscoveryService.listProviders(limit, lastKey);
        return (0, response_utils_1.createSuccessResponse)({
            providers: result.providers,
            lastKey: result.lastKey,
            total: result.providers.length
        });
    }
    catch (error) {
        console.error('Error listing providers:', error);
        return (0, response_utils_1.createErrorResponse)(500, 'Failed to list providers', error);
    }
}
async function handleProviderRegistration(event) {
    try {
        if (!event.body) {
            return (0, response_utils_1.createErrorResponse)(400, 'Request body is required');
        }
        const providerData = JSON.parse(event.body);
        const provider = await providerDiscoveryService.registerProvider(providerData);
        return (0, response_utils_1.createSuccessResponse)({ provider }, 201);
    }
    catch (error) {
        console.error('Error registering provider:', error);
        return (0, response_utils_1.createErrorResponse)(500, 'Failed to register provider', error);
    }
}
async function handleCapacityUpdate(event) {
    try {
        if (!event.body) {
            return (0, response_utils_1.createErrorResponse)(400, 'Request body is required');
        }
        const updateData = JSON.parse(event.body);
        await providerCapacityService.updateCapacity(updateData);
        return (0, response_utils_1.createSuccessResponse)({ message: 'Capacity updated successfully' });
    }
    catch (error) {
        console.error('Error updating provider capacity:', error);
        return (0, response_utils_1.createErrorResponse)(500, 'Failed to update provider capacity', error);
    }
}
async function handleUpdateProvider(providerId, event) {
    try {
        if (!event.body) {
            return (0, response_utils_1.createErrorResponse)(400, 'Request body is required');
        }
        const updateData = JSON.parse(event.body);
        const provider = await providerDiscoveryService.updateProvider(providerId, updateData);
        if (!provider) {
            return (0, response_utils_1.createErrorResponse)(404, 'Provider not found');
        }
        return (0, response_utils_1.createSuccessResponse)({ provider });
    }
    catch (error) {
        console.error('Error updating provider:', error);
        return (0, response_utils_1.createErrorResponse)(500, 'Failed to update provider', error);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGFtYmRhL3Byb3ZpZGVyLWRpc2NvdmVyeS9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSw2RUFBd0U7QUFDeEUseUVBQW9FO0FBQ3BFLDJFQUFzRTtBQUV0RSw4RUFBc0Y7QUFDdEYsK0RBQXdGO0FBRXhGLE1BQU0sd0JBQXdCLEdBQUcsSUFBSSxxREFBd0IsRUFBRSxDQUFDO0FBQ2hFLE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxpREFBc0IsRUFBRSxDQUFDO0FBQzVELE1BQU0sdUJBQXVCLEdBQUcsSUFBSSxtREFBdUIsRUFBRSxDQUFDO0FBRXZELE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQzNGLE9BQU8sQ0FBQyxHQUFHLENBQUMsb0NBQW9DLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFbEYsSUFBSSxDQUFDO1FBQ0gsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLFVBQVUsQ0FBQztRQUNwQyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDO1FBQ3hCLE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUM7UUFFNUMsUUFBUSxVQUFVLEVBQUUsQ0FBQztZQUNuQixLQUFLLEtBQUs7Z0JBQ1IsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLG1CQUFtQixDQUFDLEVBQUUsQ0FBQztvQkFDdkMsT0FBTyxNQUFNLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUMzQyxDQUFDO3FCQUFNLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLENBQUM7b0JBQ2hELE9BQU8sTUFBTSxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDMUMsQ0FBQztxQkFBTSxJQUFJLGNBQWMsRUFBRSxVQUFVLEVBQUUsQ0FBQztvQkFDdEMsT0FBTyxNQUFNLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDNUQsQ0FBQztxQkFBTSxDQUFDO29CQUNOLE9BQU8sTUFBTSxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDMUMsQ0FBQztZQUVILEtBQUssTUFBTTtnQkFDVCxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDO29CQUN6QyxPQUFPLE1BQU0sMEJBQTBCLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ2pELENBQUM7cUJBQU0sSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLDRCQUE0QixDQUFDLEVBQUUsQ0FBQztvQkFDdkQsT0FBTyxNQUFNLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUMzQyxDQUFDO2dCQUNELE1BQU07WUFFUixLQUFLLEtBQUs7Z0JBQ1IsSUFBSSxjQUFjLEVBQUUsVUFBVSxFQUFFLENBQUM7b0JBQy9CLE9BQU8sTUFBTSxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUN0RSxDQUFDO2dCQUNELE1BQU07WUFFUjtnQkFDRSxPQUFPLElBQUEsb0NBQW1CLEVBQUMsR0FBRyxFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFDMUQsQ0FBQztRQUVELE9BQU8sSUFBQSxvQ0FBbUIsRUFBQyxHQUFHLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsc0NBQXNDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDN0QsT0FBTyxJQUFBLG9DQUFtQixFQUFDLEdBQUcsRUFBRSx1QkFBdUIsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNsRSxDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBM0NXLFFBQUEsT0FBTyxXQTJDbEI7QUFFRixLQUFLLFVBQVUsb0JBQW9CLENBQUMsS0FBMkI7SUFDN0QsSUFBSSxDQUFDO1FBQ0gsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLHFCQUFxQixJQUFJLEVBQUUsQ0FBQztRQUV0RCw4Q0FBOEM7UUFDOUMsTUFBTSxjQUFjLEdBQTJCO1lBQzdDLElBQUksRUFBRSxXQUFXLENBQUMsSUFBVztZQUM3QixXQUFXLEVBQUUsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7WUFDckYsUUFBUSxFQUFFLFdBQVcsQ0FBQyxHQUFHLElBQUksV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQzdDLFdBQVcsRUFBRTtvQkFDWCxHQUFHLEVBQUUsVUFBVSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUM7b0JBQ2hDLEdBQUcsRUFBRSxVQUFVLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQztpQkFDakM7Z0JBQ0QsV0FBVyxFQUFFLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7YUFDaEYsQ0FBQyxDQUFDLENBQUMsU0FBUztZQUNiLFlBQVksRUFBRSxXQUFXLENBQUMsWUFBWSxLQUFLLE1BQU07WUFDakQsT0FBTyxFQUFFLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7WUFDMUUsU0FBUyxFQUFFLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7WUFDaEYsZ0JBQWdCLEVBQUUsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7WUFDdEYsU0FBUyxFQUFFLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTO1NBQ2hGLENBQUM7UUFFRiwyQkFBMkI7UUFDM0IsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUEsb0RBQThCLEVBQUMsY0FBYyxDQUFDLENBQUM7UUFDakUsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNWLE9BQU8sSUFBQSxvQ0FBbUIsRUFBQyxHQUFHLEVBQUUseUJBQXlCLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzVFLENBQUM7UUFFRCx1QkFBdUI7UUFDdkIsTUFBTSxTQUFTLEdBQUcsTUFBTSx3QkFBd0IsQ0FBQyxlQUFlLENBQUMsY0FBYyxDQUFDLENBQUM7UUFFakYsbUNBQW1DO1FBQ25DLE1BQU0sZUFBZSxHQUFHLE1BQU0sc0JBQXNCLENBQUMsYUFBYSxDQUFDLFNBQVMsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUU5RixPQUFPLElBQUEsc0NBQXFCLEVBQUM7WUFDM0IsU0FBUyxFQUFFLGVBQWU7WUFDMUIsS0FBSyxFQUFFLGVBQWUsQ0FBQyxNQUFNO1lBQzdCLGNBQWM7U0FDZixDQUFDLENBQUM7SUFDTCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsMkJBQTJCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbEQsT0FBTyxJQUFBLG9DQUFtQixFQUFDLEdBQUcsRUFBRSw0QkFBNEIsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN2RSxDQUFDO0FBQ0gsQ0FBQztBQUVELEtBQUssVUFBVSxtQkFBbUIsQ0FBQyxLQUEyQjtJQUM1RCxJQUFJLENBQUM7UUFDSCxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMscUJBQXFCLElBQUksRUFBRSxDQUFDO1FBQ3RELE1BQU0sV0FBVyxHQUFHLFdBQVcsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUU5RCxJQUFJLFdBQVcsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDN0IsT0FBTyxJQUFBLG9DQUFtQixFQUFDLEdBQUcsRUFBRSwyQkFBMkIsQ0FBQyxDQUFDO1FBQy9ELENBQUM7UUFFRCxNQUFNLFlBQVksR0FBRyxNQUFNLHVCQUF1QixDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUU5RSxPQUFPLElBQUEsc0NBQXFCLEVBQUM7WUFDM0IsUUFBUSxFQUFFLFlBQVk7WUFDdEIsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO1NBQ3BDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxtQ0FBbUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUMxRCxPQUFPLElBQUEsb0NBQW1CLEVBQUMsR0FBRyxFQUFFLG1DQUFtQyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzlFLENBQUM7QUFDSCxDQUFDO0FBRUQsS0FBSyxVQUFVLGlCQUFpQixDQUFDLFVBQWtCO0lBQ2pELElBQUksQ0FBQztRQUNILE1BQU0sUUFBUSxHQUFHLE1BQU0sd0JBQXdCLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRXhFLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNkLE9BQU8sSUFBQSxvQ0FBbUIsRUFBQyxHQUFHLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUN4RCxDQUFDO1FBRUQsT0FBTyxJQUFBLHNDQUFxQixFQUFDLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMseUJBQXlCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDaEQsT0FBTyxJQUFBLG9DQUFtQixFQUFDLEdBQUcsRUFBRSx3QkFBd0IsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNuRSxDQUFDO0FBQ0gsQ0FBQztBQUVELEtBQUssVUFBVSxtQkFBbUIsQ0FBQyxLQUEyQjtJQUM1RCxJQUFJLENBQUM7UUFDSCxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMscUJBQXFCLElBQUksRUFBRSxDQUFDO1FBQ3RELE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNuRSxNQUFNLE9BQU8sR0FBRyxXQUFXLENBQUMsT0FBTyxJQUFJLFNBQVMsQ0FBQztRQUVqRCxNQUFNLE1BQU0sR0FBRyxNQUFNLHdCQUF3QixDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFNUUsT0FBTyxJQUFBLHNDQUFxQixFQUFDO1lBQzNCLFNBQVMsRUFBRSxNQUFNLENBQUMsU0FBUztZQUMzQixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU87WUFDdkIsS0FBSyxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsTUFBTTtTQUMvQixDQUFDLENBQUM7SUFDTCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsMEJBQTBCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDakQsT0FBTyxJQUFBLG9DQUFtQixFQUFDLEdBQUcsRUFBRSwwQkFBMEIsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUNyRSxDQUFDO0FBQ0gsQ0FBQztBQUVELEtBQUssVUFBVSwwQkFBMEIsQ0FBQyxLQUEyQjtJQUNuRSxJQUFJLENBQUM7UUFDSCxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hCLE9BQU8sSUFBQSxvQ0FBbUIsRUFBQyxHQUFHLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztRQUM5RCxDQUFDO1FBRUQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDNUMsTUFBTSxRQUFRLEdBQUcsTUFBTSx3QkFBd0IsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUUvRSxPQUFPLElBQUEsc0NBQXFCLEVBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNsRCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsNkJBQTZCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDcEQsT0FBTyxJQUFBLG9DQUFtQixFQUFDLEdBQUcsRUFBRSw2QkFBNkIsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN4RSxDQUFDO0FBQ0gsQ0FBQztBQUVELEtBQUssVUFBVSxvQkFBb0IsQ0FBQyxLQUEyQjtJQUM3RCxJQUFJLENBQUM7UUFDSCxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hCLE9BQU8sSUFBQSxvQ0FBbUIsRUFBQyxHQUFHLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztRQUM5RCxDQUFDO1FBRUQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDMUMsTUFBTSx1QkFBdUIsQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUM7UUFFekQsT0FBTyxJQUFBLHNDQUFxQixFQUFDLEVBQUUsT0FBTyxFQUFFLCtCQUErQixFQUFFLENBQUMsQ0FBQztJQUM3RSxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsbUNBQW1DLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDMUQsT0FBTyxJQUFBLG9DQUFtQixFQUFDLEdBQUcsRUFBRSxvQ0FBb0MsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUMvRSxDQUFDO0FBQ0gsQ0FBQztBQUVELEtBQUssVUFBVSxvQkFBb0IsQ0FBQyxVQUFrQixFQUFFLEtBQTJCO0lBQ2pGLElBQUksQ0FBQztRQUNILElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDaEIsT0FBTyxJQUFBLG9DQUFtQixFQUFDLEdBQUcsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDO1FBQzlELENBQUM7UUFFRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMxQyxNQUFNLFFBQVEsR0FBRyxNQUFNLHdCQUF3QixDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFFdkYsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2QsT0FBTyxJQUFBLG9DQUFtQixFQUFDLEdBQUcsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBQ3hELENBQUM7UUFFRCxPQUFPLElBQUEsc0NBQXFCLEVBQUMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO0lBQzdDLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQywwQkFBMEIsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNqRCxPQUFPLElBQUEsb0NBQW1CLEVBQUMsR0FBRyxFQUFFLDJCQUEyQixFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3RFLENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBQcm92aWRlckRpc2NvdmVyeVNlcnZpY2UgfSBmcm9tICcuL3Byb3ZpZGVyLWRpc2NvdmVyeS1zZXJ2aWNlJztcclxuaW1wb3J0IHsgUHJvdmlkZXJSYW5raW5nU2VydmljZSB9IGZyb20gJy4vcHJvdmlkZXItcmFua2luZy1zZXJ2aWNlJztcclxuaW1wb3J0IHsgUHJvdmlkZXJDYXBhY2l0eVNlcnZpY2UgfSBmcm9tICcuL3Byb3ZpZGVyLWNhcGFjaXR5LXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBQcm92aWRlclNlYXJjaENyaXRlcmlhIH0gZnJvbSAnLi4vLi4vdHlwZXMvcHJvdmlkZXInO1xyXG5pbXBvcnQgeyB2YWxpZGF0ZVByb3ZpZGVyU2VhcmNoQ3JpdGVyaWEgfSBmcm9tICcuLi8uLi92YWxpZGF0aW9uL3Byb3ZpZGVyLXZhbGlkYXRpb24nO1xyXG5pbXBvcnQgeyBjcmVhdGVFcnJvclJlc3BvbnNlLCBjcmVhdGVTdWNjZXNzUmVzcG9uc2UgfSBmcm9tICcuLi8uLi91dGlscy9yZXNwb25zZS11dGlscyc7XHJcblxyXG5jb25zdCBwcm92aWRlckRpc2NvdmVyeVNlcnZpY2UgPSBuZXcgUHJvdmlkZXJEaXNjb3ZlcnlTZXJ2aWNlKCk7XHJcbmNvbnN0IHByb3ZpZGVyUmFua2luZ1NlcnZpY2UgPSBuZXcgUHJvdmlkZXJSYW5raW5nU2VydmljZSgpO1xyXG5jb25zdCBwcm92aWRlckNhcGFjaXR5U2VydmljZSA9IG5ldyBQcm92aWRlckNhcGFjaXR5U2VydmljZSgpO1xyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICBjb25zb2xlLmxvZygnUHJvdmlkZXIgZGlzY292ZXJ5IGZ1bmN0aW9uIGNhbGxlZCcsIEpTT04uc3RyaW5naWZ5KGV2ZW50LCBudWxsLCAyKSk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBodHRwTWV0aG9kID0gZXZlbnQuaHR0cE1ldGhvZDtcclxuICAgIGNvbnN0IHBhdGggPSBldmVudC5wYXRoO1xyXG4gICAgY29uc3QgcGF0aFBhcmFtZXRlcnMgPSBldmVudC5wYXRoUGFyYW1ldGVycztcclxuXHJcbiAgICBzd2l0Y2ggKGh0dHBNZXRob2QpIHtcclxuICAgICAgY2FzZSAnR0VUJzpcclxuICAgICAgICBpZiAocGF0aC5pbmNsdWRlcygnL3Byb3ZpZGVycy9zZWFyY2gnKSkge1xyXG4gICAgICAgICAgcmV0dXJuIGF3YWl0IGhhbmRsZVByb3ZpZGVyU2VhcmNoKGV2ZW50KTtcclxuICAgICAgICB9IGVsc2UgaWYgKHBhdGguaW5jbHVkZXMoJy9wcm92aWRlcnMvY2FwYWNpdHknKSkge1xyXG4gICAgICAgICAgcmV0dXJuIGF3YWl0IGhhbmRsZUNhcGFjaXR5Q2hlY2soZXZlbnQpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAocGF0aFBhcmFtZXRlcnM/LnByb3ZpZGVySWQpIHtcclxuICAgICAgICAgIHJldHVybiBhd2FpdCBoYW5kbGVHZXRQcm92aWRlcihwYXRoUGFyYW1ldGVycy5wcm92aWRlcklkKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgcmV0dXJuIGF3YWl0IGhhbmRsZUxpc3RQcm92aWRlcnMoZXZlbnQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgIGNhc2UgJ1BPU1QnOlxyXG4gICAgICAgIGlmIChwYXRoLmluY2x1ZGVzKCcvcHJvdmlkZXJzL3JlZ2lzdGVyJykpIHtcclxuICAgICAgICAgIHJldHVybiBhd2FpdCBoYW5kbGVQcm92aWRlclJlZ2lzdHJhdGlvbihldmVudCk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChwYXRoLmluY2x1ZGVzKCcvcHJvdmlkZXJzL2NhcGFjaXR5L3VwZGF0ZScpKSB7XHJcbiAgICAgICAgICByZXR1cm4gYXdhaXQgaGFuZGxlQ2FwYWNpdHlVcGRhdGUoZXZlbnQpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGNhc2UgJ1BVVCc6XHJcbiAgICAgICAgaWYgKHBhdGhQYXJhbWV0ZXJzPy5wcm92aWRlcklkKSB7XHJcbiAgICAgICAgICByZXR1cm4gYXdhaXQgaGFuZGxlVXBkYXRlUHJvdmlkZXIocGF0aFBhcmFtZXRlcnMucHJvdmlkZXJJZCwgZXZlbnQpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBicmVhaztcclxuXHJcbiAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDA1LCAnTWV0aG9kIG5vdCBhbGxvd2VkJyk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDA0LCAnRW5kcG9pbnQgbm90IGZvdW5kJyk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGluIHByb3ZpZGVyIGRpc2NvdmVyeSBoYW5kbGVyOicsIGVycm9yKTtcclxuICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDUwMCwgJ0ludGVybmFsIHNlcnZlciBlcnJvcicsIGVycm9yKTtcclxuICB9XHJcbn07XHJcblxyXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVQcm92aWRlclNlYXJjaChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBxdWVyeVBhcmFtcyA9IGV2ZW50LnF1ZXJ5U3RyaW5nUGFyYW1ldGVycyB8fCB7fTtcclxuICAgIFxyXG4gICAgLy8gUGFyc2Ugc2VhcmNoIGNyaXRlcmlhIGZyb20gcXVlcnkgcGFyYW1ldGVyc1xyXG4gICAgY29uc3Qgc2VhcmNoQ3JpdGVyaWE6IFByb3ZpZGVyU2VhcmNoQ3JpdGVyaWEgPSB7XHJcbiAgICAgIHR5cGU6IHF1ZXJ5UGFyYW1zLnR5cGUgYXMgYW55LFxyXG4gICAgICBzcGVjaWFsdGllczogcXVlcnlQYXJhbXMuc3BlY2lhbHRpZXMgPyBxdWVyeVBhcmFtcy5zcGVjaWFsdGllcy5zcGxpdCgnLCcpIDogdW5kZWZpbmVkLFxyXG4gICAgICBsb2NhdGlvbjogcXVlcnlQYXJhbXMubGF0ICYmIHF1ZXJ5UGFyYW1zLmxuZyA/IHtcclxuICAgICAgICBjb29yZGluYXRlczoge1xyXG4gICAgICAgICAgbGF0OiBwYXJzZUZsb2F0KHF1ZXJ5UGFyYW1zLmxhdCksXHJcbiAgICAgICAgICBsbmc6IHBhcnNlRmxvYXQocXVlcnlQYXJhbXMubG5nKVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgbWF4RGlzdGFuY2U6IHF1ZXJ5UGFyYW1zLm1heERpc3RhbmNlID8gcGFyc2VGbG9hdChxdWVyeVBhcmFtcy5tYXhEaXN0YW5jZSkgOiA1MFxyXG4gICAgICB9IDogdW5kZWZpbmVkLFxyXG4gICAgICBhdmFpbGFibGVOb3c6IHF1ZXJ5UGFyYW1zLmF2YWlsYWJsZU5vdyA9PT0gJ3RydWUnLFxyXG4gICAgICBtYXhDb3N0OiBxdWVyeVBhcmFtcy5tYXhDb3N0ID8gcGFyc2VGbG9hdChxdWVyeVBhcmFtcy5tYXhDb3N0KSA6IHVuZGVmaW5lZCxcclxuICAgICAgbWluUmF0aW5nOiBxdWVyeVBhcmFtcy5taW5SYXRpbmcgPyBwYXJzZUZsb2F0KHF1ZXJ5UGFyYW1zLm1pblJhdGluZykgOiB1bmRlZmluZWQsXHJcbiAgICAgIGFjY2VwdHNJbnN1cmFuY2U6IHF1ZXJ5UGFyYW1zLmluc3VyYW5jZSA/IHF1ZXJ5UGFyYW1zLmluc3VyYW5jZS5zcGxpdCgnLCcpIDogdW5kZWZpbmVkLFxyXG4gICAgICBsYW5ndWFnZXM6IHF1ZXJ5UGFyYW1zLmxhbmd1YWdlcyA/IHF1ZXJ5UGFyYW1zLmxhbmd1YWdlcy5zcGxpdCgnLCcpIDogdW5kZWZpbmVkXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIFZhbGlkYXRlIHNlYXJjaCBjcml0ZXJpYVxyXG4gICAgY29uc3QgeyBlcnJvciB9ID0gdmFsaWRhdGVQcm92aWRlclNlYXJjaENyaXRlcmlhKHNlYXJjaENyaXRlcmlhKTtcclxuICAgIGlmIChlcnJvcikge1xyXG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdJbnZhbGlkIHNlYXJjaCBjcml0ZXJpYScsIGVycm9yLmRldGFpbHMpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFNlYXJjaCBmb3IgcHJvdmlkZXJzXHJcbiAgICBjb25zdCBwcm92aWRlcnMgPSBhd2FpdCBwcm92aWRlckRpc2NvdmVyeVNlcnZpY2Uuc2VhcmNoUHJvdmlkZXJzKHNlYXJjaENyaXRlcmlhKTtcclxuXHJcbiAgICAvLyBSYW5rIHByb3ZpZGVycyBiYXNlZCBvbiBjcml0ZXJpYVxyXG4gICAgY29uc3QgcmFua2VkUHJvdmlkZXJzID0gYXdhaXQgcHJvdmlkZXJSYW5raW5nU2VydmljZS5yYW5rUHJvdmlkZXJzKHByb3ZpZGVycywgc2VhcmNoQ3JpdGVyaWEpO1xyXG5cclxuICAgIHJldHVybiBjcmVhdGVTdWNjZXNzUmVzcG9uc2Uoe1xyXG4gICAgICBwcm92aWRlcnM6IHJhbmtlZFByb3ZpZGVycyxcclxuICAgICAgdG90YWw6IHJhbmtlZFByb3ZpZGVycy5sZW5ndGgsXHJcbiAgICAgIHNlYXJjaENyaXRlcmlhXHJcbiAgICB9KTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgaW4gcHJvdmlkZXIgc2VhcmNoOicsIGVycm9yKTtcclxuICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDUwMCwgJ0ZhaWxlZCB0byBzZWFyY2ggcHJvdmlkZXJzJywgZXJyb3IpO1xyXG4gIH1cclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlQ2FwYWNpdHlDaGVjayhldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBxdWVyeVBhcmFtcyA9IGV2ZW50LnF1ZXJ5U3RyaW5nUGFyYW1ldGVycyB8fCB7fTtcclxuICAgIGNvbnN0IHByb3ZpZGVySWRzID0gcXVlcnlQYXJhbXMucHJvdmlkZXJJZHM/LnNwbGl0KCcsJykgfHwgW107XHJcblxyXG4gICAgaWYgKHByb3ZpZGVySWRzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdQcm92aWRlciBJRHMgYXJlIHJlcXVpcmVkJyk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgY2FwYWNpdHlJbmZvID0gYXdhaXQgcHJvdmlkZXJDYXBhY2l0eVNlcnZpY2UuY2hlY2tDYXBhY2l0eShwcm92aWRlcklkcyk7XHJcblxyXG4gICAgcmV0dXJuIGNyZWF0ZVN1Y2Nlc3NSZXNwb25zZSh7XHJcbiAgICAgIGNhcGFjaXR5OiBjYXBhY2l0eUluZm8sXHJcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXHJcbiAgICB9KTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgY2hlY2tpbmcgcHJvdmlkZXIgY2FwYWNpdHk6JywgZXJyb3IpO1xyXG4gICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNTAwLCAnRmFpbGVkIHRvIGNoZWNrIHByb3ZpZGVyIGNhcGFjaXR5JywgZXJyb3IpO1xyXG4gIH1cclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlR2V0UHJvdmlkZXIocHJvdmlkZXJJZDogc3RyaW5nKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgcHJvdmlkZXIgPSBhd2FpdCBwcm92aWRlckRpc2NvdmVyeVNlcnZpY2UuZ2V0UHJvdmlkZXIocHJvdmlkZXJJZCk7XHJcbiAgICBcclxuICAgIGlmICghcHJvdmlkZXIpIHtcclxuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDA0LCAnUHJvdmlkZXIgbm90IGZvdW5kJyk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIGNyZWF0ZVN1Y2Nlc3NSZXNwb25zZSh7IHByb3ZpZGVyIH0pO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBnZXR0aW5nIHByb3ZpZGVyOicsIGVycm9yKTtcclxuICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDUwMCwgJ0ZhaWxlZCB0byBnZXQgcHJvdmlkZXInLCBlcnJvcik7XHJcbiAgfVxyXG59XHJcblxyXG5hc3luYyBmdW5jdGlvbiBoYW5kbGVMaXN0UHJvdmlkZXJzKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHF1ZXJ5UGFyYW1zID0gZXZlbnQucXVlcnlTdHJpbmdQYXJhbWV0ZXJzIHx8IHt9O1xyXG4gICAgY29uc3QgbGltaXQgPSBxdWVyeVBhcmFtcy5saW1pdCA/IHBhcnNlSW50KHF1ZXJ5UGFyYW1zLmxpbWl0KSA6IDUwO1xyXG4gICAgY29uc3QgbGFzdEtleSA9IHF1ZXJ5UGFyYW1zLmxhc3RLZXkgfHwgdW5kZWZpbmVkO1xyXG5cclxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHByb3ZpZGVyRGlzY292ZXJ5U2VydmljZS5saXN0UHJvdmlkZXJzKGxpbWl0LCBsYXN0S2V5KTtcclxuXHJcbiAgICByZXR1cm4gY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlKHtcclxuICAgICAgcHJvdmlkZXJzOiByZXN1bHQucHJvdmlkZXJzLFxyXG4gICAgICBsYXN0S2V5OiByZXN1bHQubGFzdEtleSxcclxuICAgICAgdG90YWw6IHJlc3VsdC5wcm92aWRlcnMubGVuZ3RoXHJcbiAgICB9KTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgbGlzdGluZyBwcm92aWRlcnM6JywgZXJyb3IpO1xyXG4gICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNTAwLCAnRmFpbGVkIHRvIGxpc3QgcHJvdmlkZXJzJywgZXJyb3IpO1xyXG4gIH1cclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlUHJvdmlkZXJSZWdpc3RyYXRpb24oZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+IHtcclxuICB0cnkge1xyXG4gICAgaWYgKCFldmVudC5ib2R5KSB7XHJcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMCwgJ1JlcXVlc3QgYm9keSBpcyByZXF1aXJlZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHByb3ZpZGVyRGF0YSA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XHJcbiAgICBjb25zdCBwcm92aWRlciA9IGF3YWl0IHByb3ZpZGVyRGlzY292ZXJ5U2VydmljZS5yZWdpc3RlclByb3ZpZGVyKHByb3ZpZGVyRGF0YSk7XHJcblxyXG4gICAgcmV0dXJuIGNyZWF0ZVN1Y2Nlc3NSZXNwb25zZSh7IHByb3ZpZGVyIH0sIDIwMSk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHJlZ2lzdGVyaW5nIHByb3ZpZGVyOicsIGVycm9yKTtcclxuICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDUwMCwgJ0ZhaWxlZCB0byByZWdpc3RlciBwcm92aWRlcicsIGVycm9yKTtcclxuICB9XHJcbn1cclxuXHJcbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZUNhcGFjaXR5VXBkYXRlKGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCk6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiB7XHJcbiAgdHJ5IHtcclxuICAgIGlmICghZXZlbnQuYm9keSkge1xyXG4gICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsICdSZXF1ZXN0IGJvZHkgaXMgcmVxdWlyZWQnKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCB1cGRhdGVEYXRhID0gSlNPTi5wYXJzZShldmVudC5ib2R5KTtcclxuICAgIGF3YWl0IHByb3ZpZGVyQ2FwYWNpdHlTZXJ2aWNlLnVwZGF0ZUNhcGFjaXR5KHVwZGF0ZURhdGEpO1xyXG5cclxuICAgIHJldHVybiBjcmVhdGVTdWNjZXNzUmVzcG9uc2UoeyBtZXNzYWdlOiAnQ2FwYWNpdHkgdXBkYXRlZCBzdWNjZXNzZnVsbHknIH0pO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciB1cGRhdGluZyBwcm92aWRlciBjYXBhY2l0eTonLCBlcnJvcik7XHJcbiAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg1MDAsICdGYWlsZWQgdG8gdXBkYXRlIHByb3ZpZGVyIGNhcGFjaXR5JywgZXJyb3IpO1xyXG4gIH1cclxufVxyXG5cclxuYXN5bmMgZnVuY3Rpb24gaGFuZGxlVXBkYXRlUHJvdmlkZXIocHJvdmlkZXJJZDogc3RyaW5nLCBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4ge1xyXG4gIHRyeSB7XHJcbiAgICBpZiAoIWV2ZW50LmJvZHkpIHtcclxuICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAnUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJyk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgdXBkYXRlRGF0YSA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSk7XHJcbiAgICBjb25zdCBwcm92aWRlciA9IGF3YWl0IHByb3ZpZGVyRGlzY292ZXJ5U2VydmljZS51cGRhdGVQcm92aWRlcihwcm92aWRlcklkLCB1cGRhdGVEYXRhKTtcclxuXHJcbiAgICBpZiAoIXByb3ZpZGVyKSB7XHJcbiAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwNCwgJ1Byb3ZpZGVyIG5vdCBmb3VuZCcpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBjcmVhdGVTdWNjZXNzUmVzcG9uc2UoeyBwcm92aWRlciB9KTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgdXBkYXRpbmcgcHJvdmlkZXI6JywgZXJyb3IpO1xyXG4gICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNTAwLCAnRmFpbGVkIHRvIHVwZGF0ZSBwcm92aWRlcicsIGVycm9yKTtcclxuICB9XHJcbn0iXX0=