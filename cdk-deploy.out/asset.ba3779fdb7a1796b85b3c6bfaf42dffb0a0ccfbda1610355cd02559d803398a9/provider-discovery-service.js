"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderDiscoveryService = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const uuid_1 = require("uuid");
const provider_validation_1 = require("../../validation/provider-validation");
const geo_utils_1 = require("../../utils/geo-utils");
class ProviderDiscoveryService {
    constructor() {
        const client = new client_dynamodb_1.DynamoDBClient({});
        this.dynamoClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
        this.tableName = process.env.PROVIDER_TABLE_NAME || 'healthcare-providers';
    }
    /**
     * Register a new provider in the network
     */
    async registerProvider(input) {
        // Validate input
        const { error } = (0, provider_validation_1.validateCreateProviderInput)(input);
        if (error) {
            throw new Error(`Invalid provider data: ${error.message}`);
        }
        const provider = {
            providerId: (0, uuid_1.v4)(),
            ...input,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        // Validate complete provider object
        const { error: providerError } = (0, provider_validation_1.validateProvider)(provider);
        if (providerError) {
            throw new Error(`Invalid provider object: ${providerError.message}`);
        }
        try {
            await this.dynamoClient.send(new lib_dynamodb_1.PutCommand({
                TableName: this.tableName,
                Item: {
                    ...provider,
                    // Add GSI attributes for efficient querying
                    state: provider.location.state,
                    district: provider.location.district,
                    primarySpecialty: provider.capabilities.specialties[0] || 'general',
                    type: provider.type,
                    rating: provider.qualityMetrics.rating,
                    currentLoad: provider.capacity.currentLoad,
                    isActive: provider.isActive ? 'true' : 'false'
                }
            }));
            console.log(`Provider registered successfully: ${provider.providerId}`);
            return provider;
        }
        catch (error) {
            console.error('Error registering provider:', error);
            throw new Error('Failed to register provider');
        }
    }
    /**
     * Get a provider by ID
     */
    async getProvider(providerId) {
        try {
            const result = await this.dynamoClient.send(new lib_dynamodb_1.GetCommand({
                TableName: this.tableName,
                Key: { providerId }
            }));
            return result.Item || null;
        }
        catch (error) {
            console.error('Error getting provider:', error);
            throw new Error('Failed to get provider');
        }
    }
    /**
     * Update a provider's information
     */
    async updateProvider(providerId, input) {
        // Validate input
        const { error } = (0, provider_validation_1.validateUpdateProviderInput)(input);
        if (error) {
            throw new Error(`Invalid update data: ${error.message}`);
        }
        try {
            // First, get the existing provider
            const existingProvider = await this.getProvider(providerId);
            if (!existingProvider) {
                return null;
            }
            // Build update expression
            const updateExpressions = [];
            const expressionAttributeNames = {};
            const expressionAttributeValues = {};
            Object.entries(input).forEach(([key, value]) => {
                if (value !== undefined) {
                    updateExpressions.push(`#${key} = :${key}`);
                    expressionAttributeNames[`#${key}`] = key;
                    expressionAttributeValues[`:${key}`] = value;
                }
            });
            // Always update the updatedAt timestamp
            updateExpressions.push('#updatedAt = :updatedAt');
            expressionAttributeNames['#updatedAt'] = 'updatedAt';
            expressionAttributeValues[':updatedAt'] = new Date().toISOString();
            // Update GSI attributes if relevant fields are being updated
            if (input.location?.state) {
                updateExpressions.push('#state = :state');
                expressionAttributeNames['#state'] = 'state';
                expressionAttributeValues[':state'] = input.location.state;
            }
            if (input.location?.district) {
                updateExpressions.push('#district = :district');
                expressionAttributeNames['#district'] = 'district';
                expressionAttributeValues[':district'] = input.location.district;
            }
            if (input.capabilities?.specialties && input.capabilities.specialties.length > 0) {
                updateExpressions.push('#primarySpecialty = :primarySpecialty');
                expressionAttributeNames['#primarySpecialty'] = 'primarySpecialty';
                expressionAttributeValues[':primarySpecialty'] = input.capabilities.specialties[0];
            }
            if (input.qualityMetrics?.rating !== undefined) {
                updateExpressions.push('#rating = :rating');
                expressionAttributeNames['#rating'] = 'rating';
                expressionAttributeValues[':rating'] = input.qualityMetrics.rating;
            }
            if (input.capacity?.currentLoad !== undefined) {
                updateExpressions.push('#currentLoad = :currentLoad');
                expressionAttributeNames['#currentLoad'] = 'currentLoad';
                expressionAttributeValues[':currentLoad'] = input.capacity.currentLoad;
            }
            if (input.isActive !== undefined) {
                updateExpressions.push('#isActiveStr = :isActiveStr');
                expressionAttributeNames['#isActiveStr'] = 'isActive';
                expressionAttributeValues[':isActiveStr'] = input.isActive ? 'true' : 'false';
            }
            const result = await this.dynamoClient.send(new lib_dynamodb_1.UpdateCommand({
                TableName: this.tableName,
                Key: { providerId },
                UpdateExpression: `SET ${updateExpressions.join(', ')}`,
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues,
                ReturnValues: 'ALL_NEW'
            }));
            console.log(`Provider updated successfully: ${providerId}`);
            return result.Attributes;
        }
        catch (error) {
            console.error('Error updating provider:', error);
            throw new Error('Failed to update provider');
        }
    }
    /**
     * List providers with pagination
     */
    async listProviders(limit = 50, lastKey) {
        try {
            const params = {
                TableName: this.tableName,
                Limit: limit,
                FilterExpression: '#isActive = :isActive',
                ExpressionAttributeNames: {
                    '#isActive': 'isActive'
                },
                ExpressionAttributeValues: {
                    ':isActive': 'true'
                }
            };
            if (lastKey) {
                params.ExclusiveStartKey = { providerId: lastKey };
            }
            const result = await this.dynamoClient.send(new lib_dynamodb_1.ScanCommand(params));
            return {
                providers: result.Items || [],
                lastKey: result.LastEvaluatedKey?.providerId
            };
        }
        catch (error) {
            console.error('Error listing providers:', error);
            throw new Error('Failed to list providers');
        }
    }
    /**
     * Search providers based on criteria
     */
    async searchProviders(criteria) {
        try {
            let providers = [];
            // Use different query strategies based on available criteria
            if (criteria.type) {
                providers = await this.searchByType(criteria);
            }
            else if (criteria.specialties && criteria.specialties.length > 0) {
                providers = await this.searchBySpecialty(criteria);
            }
            else if (criteria.location) {
                providers = await this.searchByLocation(criteria);
            }
            else {
                // Fallback to scan with filters
                providers = await this.scanWithFilters(criteria);
            }
            // Apply additional filters
            providers = this.applyAdditionalFilters(providers, criteria);
            console.log(`Found ${providers.length} providers matching criteria`);
            return providers;
        }
        catch (error) {
            console.error('Error searching providers:', error);
            throw new Error('Failed to search providers');
        }
    }
    async searchByType(criteria) {
        const result = await this.dynamoClient.send(new lib_dynamodb_1.QueryCommand({
            TableName: this.tableName,
            IndexName: 'TypeAvailabilityIndex',
            KeyConditionExpression: '#type = :type AND #isActive = :isActive',
            ExpressionAttributeNames: {
                '#type': 'type',
                '#isActive': 'isActive'
            },
            ExpressionAttributeValues: {
                ':type': criteria.type,
                ':isActive': 'true'
            }
        }));
        return result.Items || [];
    }
    async searchBySpecialty(criteria) {
        const providers = [];
        // Search for each specialty (DynamoDB doesn't support OR conditions in KeyConditionExpression)
        for (const specialty of criteria.specialties) {
            const result = await this.dynamoClient.send(new lib_dynamodb_1.QueryCommand({
                TableName: this.tableName,
                IndexName: 'SpecialtyIndex',
                KeyConditionExpression: '#primarySpecialty = :specialty',
                FilterExpression: '#isActive = :isActive',
                ExpressionAttributeNames: {
                    '#primarySpecialty': 'primarySpecialty',
                    '#isActive': 'isActive'
                },
                ExpressionAttributeValues: {
                    ':specialty': specialty,
                    ':isActive': 'true'
                }
            }));
            providers.push(...(result.Items || []));
        }
        // Remove duplicates
        const uniqueProviders = providers.filter((provider, index, self) => index === self.findIndex(p => p.providerId === provider.providerId));
        return uniqueProviders;
    }
    async searchByLocation(criteria) {
        // For location-based search, we need to scan and filter by distance
        // In a production system, you might use a geospatial index or service
        const result = await this.dynamoClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: this.tableName,
            FilterExpression: '#isActive = :isActive',
            ExpressionAttributeNames: {
                '#isActive': 'isActive'
            },
            ExpressionAttributeValues: {
                ':isActive': 'true'
            }
        }));
        const providers = result.Items || [];
        const { coordinates, maxDistance } = criteria.location;
        return providers.filter(provider => {
            const distance = (0, geo_utils_1.calculateDistance)(coordinates.lat, coordinates.lng, provider.location.coordinates.lat, provider.location.coordinates.lng);
            return distance <= maxDistance;
        });
    }
    async scanWithFilters(criteria) {
        const result = await this.dynamoClient.send(new lib_dynamodb_1.ScanCommand({
            TableName: this.tableName,
            FilterExpression: '#isActive = :isActive',
            ExpressionAttributeNames: {
                '#isActive': 'isActive'
            },
            ExpressionAttributeValues: {
                ':isActive': 'true'
            }
        }));
        return result.Items || [];
    }
    applyAdditionalFilters(providers, criteria) {
        return providers.filter(provider => {
            // Filter by availability
            if (criteria.availableNow && provider.capacity.currentLoad >= 90) {
                return false;
            }
            // Filter by cost
            if (criteria.maxCost && provider.costStructure.consultationFee > criteria.maxCost) {
                return false;
            }
            // Filter by rating
            if (criteria.minRating && provider.qualityMetrics.rating < criteria.minRating) {
                return false;
            }
            // Filter by insurance
            if (criteria.acceptsInsurance && criteria.acceptsInsurance.length > 0) {
                const hasMatchingInsurance = criteria.acceptsInsurance.some(insurance => provider.costStructure.insuranceAccepted.includes(insurance));
                if (!hasMatchingInsurance) {
                    return false;
                }
            }
            // Filter by languages
            if (criteria.languages && criteria.languages.length > 0) {
                const hasMatchingLanguage = criteria.languages.some(language => provider.capabilities.languages.includes(language));
                if (!hasMatchingLanguage) {
                    return false;
                }
            }
            // Filter by location distance (if not already done)
            if (criteria.location && !this.isLocationFiltered(criteria)) {
                const distance = (0, geo_utils_1.calculateDistance)(criteria.location.coordinates.lat, criteria.location.coordinates.lng, provider.location.coordinates.lat, provider.location.coordinates.lng);
                if (distance > criteria.location.maxDistance) {
                    return false;
                }
            }
            return true;
        });
    }
    isLocationFiltered(criteria) {
        // Check if location filtering was already applied in the query phase
        return !criteria.type && (!criteria.specialties || criteria.specialties.length === 0);
    }
}
exports.ProviderDiscoveryService = ProviderDiscoveryService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvdmlkZXItZGlzY292ZXJ5LXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGFtYmRhL3Byb3ZpZGVyLWRpc2NvdmVyeS9wcm92aWRlci1kaXNjb3Zlcnktc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw4REFBMEQ7QUFDMUQsd0RBQWlJO0FBQ2pJLCtCQUFvQztBQUVwQyw4RUFBa0k7QUFDbEkscURBQTBEO0FBRTFELE1BQWEsd0JBQXdCO0lBSW5DO1FBQ0UsTUFBTSxNQUFNLEdBQUcsSUFBSSxnQ0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3RDLElBQUksQ0FBQyxZQUFZLEdBQUcscUNBQXNCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3hELElBQUksQ0FBQyxTQUFTLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsSUFBSSxzQkFBc0IsQ0FBQztJQUM3RSxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsZ0JBQWdCLENBQUMsS0FBMEI7UUFDL0MsaUJBQWlCO1FBQ2pCLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFBLGlEQUEyQixFQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3JELElBQUksS0FBSyxFQUFFLENBQUM7WUFDVixNQUFNLElBQUksS0FBSyxDQUFDLDBCQUEwQixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUM3RCxDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQWE7WUFDekIsVUFBVSxFQUFFLElBQUEsU0FBTSxHQUFFO1lBQ3BCLEdBQUcsS0FBSztZQUNSLFFBQVEsRUFBRSxJQUFJO1lBQ2QsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFO1lBQ3JCLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRTtTQUN0QixDQUFDO1FBRUYsb0NBQW9DO1FBQ3BDLE1BQU0sRUFBRSxLQUFLLEVBQUUsYUFBYSxFQUFFLEdBQUcsSUFBQSxzQ0FB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b0JBQ3pCLE9BQU8sS0FBSyxDQUFDO2dCQUNmLENBQUM7WUFDSCxDQUFDO1lBRUQsb0RBQW9EO1lBQ3BELElBQUksUUFBUSxDQUFDLFFBQVEsSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUM1RCxNQUFNLFFBQVEsR0FBRyxJQUFBLDZCQUFpQixFQUNoQyxRQUFRLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQ2pDLFFBQVEsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFDakMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUNqQyxRQUFRLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQ2xDLENBQUM7Z0JBQ0YsSUFBSSxRQUFRLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQztvQkFDN0MsT0FBTyxLQUFLLENBQUM7Z0JBQ2YsQ0FBQztZQUNILENBQUM7WUFFRCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVPLGtCQUFrQixDQUFDLFFBQWdDO1FBQ3pELHFFQUFxRTtRQUNyRSxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLFdBQVcsSUFBSSxRQUFRLENBQUMsV0FBVyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQztJQUN4RixDQUFDO0NBQ0Y7QUF6WEQsNERBeVhDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRHluYW1vREJDbGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LCBHZXRDb21tYW5kLCBQdXRDb21tYW5kLCBVcGRhdGVDb21tYW5kLCBTY2FuQ29tbWFuZCwgUXVlcnlDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcclxuaW1wb3J0IHsgdjQgYXMgdXVpZHY0IH0gZnJvbSAndXVpZCc7XHJcbmltcG9ydCB7IFByb3ZpZGVyLCBDcmVhdGVQcm92aWRlcklucHV0LCBVcGRhdGVQcm92aWRlcklucHV0LCBQcm92aWRlclNlYXJjaENyaXRlcmlhLCBQcm92aWRlclNlYXJjaFJlc3VsdCB9IGZyb20gJy4uLy4uL3R5cGVzL3Byb3ZpZGVyJztcclxuaW1wb3J0IHsgdmFsaWRhdGVQcm92aWRlciwgdmFsaWRhdGVDcmVhdGVQcm92aWRlcklucHV0LCB2YWxpZGF0ZVVwZGF0ZVByb3ZpZGVySW5wdXQgfSBmcm9tICcuLi8uLi92YWxpZGF0aW9uL3Byb3ZpZGVyLXZhbGlkYXRpb24nO1xyXG5pbXBvcnQgeyBjYWxjdWxhdGVEaXN0YW5jZSB9IGZyb20gJy4uLy4uL3V0aWxzL2dlby11dGlscyc7XHJcblxyXG5leHBvcnQgY2xhc3MgUHJvdmlkZXJEaXNjb3ZlcnlTZXJ2aWNlIHtcclxuICBwcml2YXRlIGR5bmFtb0NsaWVudDogRHluYW1vREJEb2N1bWVudENsaWVudDtcclxuICBwcml2YXRlIHRhYmxlTmFtZTogc3RyaW5nO1xyXG5cclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIGNvbnN0IGNsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7fSk7XHJcbiAgICB0aGlzLmR5bmFtb0NsaWVudCA9IER5bmFtb0RCRG9jdW1lbnRDbGllbnQuZnJvbShjbGllbnQpO1xyXG4gICAgdGhpcy50YWJsZU5hbWUgPSBwcm9jZXNzLmVudi5QUk9WSURFUl9UQUJMRV9OQU1FIHx8ICdoZWFsdGhjYXJlLXByb3ZpZGVycyc7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBSZWdpc3RlciBhIG5ldyBwcm92aWRlciBpbiB0aGUgbmV0d29ya1xyXG4gICAqL1xyXG4gIGFzeW5jIHJlZ2lzdGVyUHJvdmlkZXIoaW5wdXQ6IENyZWF0ZVByb3ZpZGVySW5wdXQpOiBQcm9taXNlPFByb3ZpZGVyPiB7XHJcbiAgICAvLyBWYWxpZGF0ZSBpbnB1dFxyXG4gICAgY29uc3QgeyBlcnJvciB9ID0gdmFsaWRhdGVDcmVhdGVQcm92aWRlcklucHV0KGlucHV0KTtcclxuICAgIGlmIChlcnJvcikge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgcHJvdmlkZXIgZGF0YTogJHtlcnJvci5tZXNzYWdlfWApO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHByb3ZpZGVyOiBQcm92aWRlciA9IHtcclxuICAgICAgcHJvdmlkZXJJZDogdXVpZHY0KCksXHJcbiAgICAgIC4uLmlucHV0LFxyXG4gICAgICBpc0FjdGl2ZTogdHJ1ZSxcclxuICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLFxyXG4gICAgICB1cGRhdGVkQXQ6IG5ldyBEYXRlKClcclxuICAgIH07XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgY29tcGxldGUgcHJvdmlkZXIgb2JqZWN0XHJcbiAgICBjb25zdCB7IGVycm9yOiBwcm92aWRlckVycm9yIH0gPSB2YWxpZGF0ZVByb3ZpZGVyKHByb3ZpZGVyKTtcclxuICAgIGlmIChwcm92aWRlckVycm9yKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBwcm92aWRlciBvYmplY3Q6ICR7cHJvdmlkZXJFcnJvci5tZXNzYWdlfWApO1xyXG4gICAgfVxyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGF3YWl0IHRoaXMuZHluYW1vQ2xpZW50LnNlbmQobmV3IFB1dENvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgICAgSXRlbToge1xyXG4gICAgICAgICAgLi4ucHJvdmlkZXIsXHJcbiAgICAgICAgICAvLyBBZGQgR1NJIGF0dHJpYnV0ZXMgZm9yIGVmZmljaWVudCBxdWVyeWluZ1xyXG4gICAgICAgICAgc3RhdGU6IHByb3ZpZGVyLmxvY2F0aW9uLnN0YXRlLFxyXG4gICAgICAgICAgZGlzdHJpY3Q6IHByb3ZpZGVyLmxvY2F0aW9uLmRpc3RyaWN0LFxyXG4gICAgICAgICAgcHJpbWFyeVNwZWNpYWx0eTogcHJvdmlkZXIuY2FwYWJpbGl0aWVzLnNwZWNpYWx0aWVzWzBdIHx8ICdnZW5lcmFsJyxcclxuICAgICAgICAgIHR5cGU6IHByb3ZpZGVyLnR5cGUsXHJcbiAgICAgICAgICByYXRpbmc6IHByb3ZpZGVyLnF1YWxpdHlNZXRyaWNzLnJhdGluZyxcclxuICAgICAgICAgIGN1cnJlbnRMb2FkOiBwcm92aWRlci5jYXBhY2l0eS5jdXJyZW50TG9hZCxcclxuICAgICAgICAgIGlzQWN0aXZlOiBwcm92aWRlci5pc0FjdGl2ZSA/ICd0cnVlJyA6ICdmYWxzZSdcclxuICAgICAgICB9XHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIGNvbnNvbGUubG9nKGBQcm92aWRlciByZWdpc3RlcmVkIHN1Y2Nlc3NmdWxseTogJHtwcm92aWRlci5wcm92aWRlcklkfWApO1xyXG4gICAgICByZXR1cm4gcHJvdmlkZXI7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciByZWdpc3RlcmluZyBwcm92aWRlcjonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIHJlZ2lzdGVyIHByb3ZpZGVyJyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgYSBwcm92aWRlciBieSBJRFxyXG4gICAqL1xyXG4gIGFzeW5jIGdldFByb3ZpZGVyKHByb3ZpZGVySWQ6IHN0cmluZyk6IFByb21pc2U8UHJvdmlkZXIgfCBudWxsPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmR5bmFtb0NsaWVudC5zZW5kKG5ldyBHZXRDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxyXG4gICAgICAgIEtleTogeyBwcm92aWRlcklkIH1cclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgcmV0dXJuIHJlc3VsdC5JdGVtIGFzIFByb3ZpZGVyIHx8IG51bGw7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBnZXR0aW5nIHByb3ZpZGVyOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gZ2V0IHByb3ZpZGVyJyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBVcGRhdGUgYSBwcm92aWRlcidzIGluZm9ybWF0aW9uXHJcbiAgICovXHJcbiAgYXN5bmMgdXBkYXRlUHJvdmlkZXIocHJvdmlkZXJJZDogc3RyaW5nLCBpbnB1dDogVXBkYXRlUHJvdmlkZXJJbnB1dCk6IFByb21pc2U8UHJvdmlkZXIgfCBudWxsPiB7XHJcbiAgICAvLyBWYWxpZGF0ZSBpbnB1dFxyXG4gICAgY29uc3QgeyBlcnJvciB9ID0gdmFsaWRhdGVVcGRhdGVQcm92aWRlcklucHV0KGlucHV0KTtcclxuICAgIGlmIChlcnJvcikge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgdXBkYXRlIGRhdGE6ICR7ZXJyb3IubWVzc2FnZX1gKTtcclxuICAgIH1cclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBGaXJzdCwgZ2V0IHRoZSBleGlzdGluZyBwcm92aWRlclxyXG4gICAgICBjb25zdCBleGlzdGluZ1Byb3ZpZGVyID0gYXdhaXQgdGhpcy5nZXRQcm92aWRlcihwcm92aWRlcklkKTtcclxuICAgICAgaWYgKCFleGlzdGluZ1Byb3ZpZGVyKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIEJ1aWxkIHVwZGF0ZSBleHByZXNzaW9uXHJcbiAgICAgIGNvbnN0IHVwZGF0ZUV4cHJlc3Npb25zOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgICBjb25zdCBleHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fTtcclxuICAgICAgY29uc3QgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9O1xyXG5cclxuICAgICAgT2JqZWN0LmVudHJpZXMoaW5wdXQpLmZvckVhY2goKFtrZXksIHZhbHVlXSkgPT4ge1xyXG4gICAgICAgIGlmICh2YWx1ZSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICB1cGRhdGVFeHByZXNzaW9ucy5wdXNoKGAjJHtrZXl9ID0gOiR7a2V5fWApO1xyXG4gICAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzW2AjJHtrZXl9YF0gPSBrZXk7XHJcbiAgICAgICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzW2A6JHtrZXl9YF0gPSB2YWx1ZTtcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gQWx3YXlzIHVwZGF0ZSB0aGUgdXBkYXRlZEF0IHRpbWVzdGFtcFxyXG4gICAgICB1cGRhdGVFeHByZXNzaW9ucy5wdXNoKCcjdXBkYXRlZEF0ID0gOnVwZGF0ZWRBdCcpO1xyXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlTmFtZXNbJyN1cGRhdGVkQXQnXSA9ICd1cGRhdGVkQXQnO1xyXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzWyc6dXBkYXRlZEF0J10gPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XHJcblxyXG4gICAgICAvLyBVcGRhdGUgR1NJIGF0dHJpYnV0ZXMgaWYgcmVsZXZhbnQgZmllbGRzIGFyZSBiZWluZyB1cGRhdGVkXHJcbiAgICAgIGlmIChpbnB1dC5sb2NhdGlvbj8uc3RhdGUpIHtcclxuICAgICAgICB1cGRhdGVFeHByZXNzaW9ucy5wdXNoKCcjc3RhdGUgPSA6c3RhdGUnKTtcclxuICAgICAgICBleHByZXNzaW9uQXR0cmlidXRlTmFtZXNbJyNzdGF0ZSddID0gJ3N0YXRlJztcclxuICAgICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzWyc6c3RhdGUnXSA9IGlucHV0LmxvY2F0aW9uLnN0YXRlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoaW5wdXQubG9jYXRpb24/LmRpc3RyaWN0KSB7XHJcbiAgICAgICAgdXBkYXRlRXhwcmVzc2lvbnMucHVzaCgnI2Rpc3RyaWN0ID0gOmRpc3RyaWN0Jyk7XHJcbiAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzWycjZGlzdHJpY3QnXSA9ICdkaXN0cmljdCc7XHJcbiAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOmRpc3RyaWN0J10gPSBpbnB1dC5sb2NhdGlvbi5kaXN0cmljdDtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKGlucHV0LmNhcGFiaWxpdGllcz8uc3BlY2lhbHRpZXMgJiYgaW5wdXQuY2FwYWJpbGl0aWVzLnNwZWNpYWx0aWVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICB1cGRhdGVFeHByZXNzaW9ucy5wdXNoKCcjcHJpbWFyeVNwZWNpYWx0eSA9IDpwcmltYXJ5U3BlY2lhbHR5Jyk7XHJcbiAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzWycjcHJpbWFyeVNwZWNpYWx0eSddID0gJ3ByaW1hcnlTcGVjaWFsdHknO1xyXG4gICAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzpwcmltYXJ5U3BlY2lhbHR5J10gPSBpbnB1dC5jYXBhYmlsaXRpZXMuc3BlY2lhbHRpZXNbMF07XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChpbnB1dC5xdWFsaXR5TWV0cmljcz8ucmF0aW5nICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICB1cGRhdGVFeHByZXNzaW9ucy5wdXNoKCcjcmF0aW5nID0gOnJhdGluZycpO1xyXG4gICAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lc1snI3JhdGluZyddID0gJ3JhdGluZyc7XHJcbiAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOnJhdGluZyddID0gaW5wdXQucXVhbGl0eU1ldHJpY3MucmF0aW5nO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoaW5wdXQuY2FwYWNpdHk/LmN1cnJlbnRMb2FkICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICB1cGRhdGVFeHByZXNzaW9ucy5wdXNoKCcjY3VycmVudExvYWQgPSA6Y3VycmVudExvYWQnKTtcclxuICAgICAgICBleHByZXNzaW9uQXR0cmlidXRlTmFtZXNbJyNjdXJyZW50TG9hZCddID0gJ2N1cnJlbnRMb2FkJztcclxuICAgICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzWyc6Y3VycmVudExvYWQnXSA9IGlucHV0LmNhcGFjaXR5LmN1cnJlbnRMb2FkO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoaW5wdXQuaXNBY3RpdmUgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIHVwZGF0ZUV4cHJlc3Npb25zLnB1c2goJyNpc0FjdGl2ZVN0ciA9IDppc0FjdGl2ZVN0cicpO1xyXG4gICAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lc1snI2lzQWN0aXZlU3RyJ10gPSAnaXNBY3RpdmUnO1xyXG4gICAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzppc0FjdGl2ZVN0ciddID0gaW5wdXQuaXNBY3RpdmUgPyAndHJ1ZScgOiAnZmFsc2UnO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmR5bmFtb0NsaWVudC5zZW5kKG5ldyBVcGRhdGVDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxyXG4gICAgICAgIEtleTogeyBwcm92aWRlcklkIH0sXHJcbiAgICAgICAgVXBkYXRlRXhwcmVzc2lvbjogYFNFVCAke3VwZGF0ZUV4cHJlc3Npb25zLmpvaW4oJywgJyl9YCxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IGV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lcyxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzLFxyXG4gICAgICAgIFJldHVyblZhbHVlczogJ0FMTF9ORVcnXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIGNvbnNvbGUubG9nKGBQcm92aWRlciB1cGRhdGVkIHN1Y2Nlc3NmdWxseTogJHtwcm92aWRlcklkfWApO1xyXG4gICAgICByZXR1cm4gcmVzdWx0LkF0dHJpYnV0ZXMgYXMgUHJvdmlkZXI7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciB1cGRhdGluZyBwcm92aWRlcjonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIHVwZGF0ZSBwcm92aWRlcicpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogTGlzdCBwcm92aWRlcnMgd2l0aCBwYWdpbmF0aW9uXHJcbiAgICovXHJcbiAgYXN5bmMgbGlzdFByb3ZpZGVycyhsaW1pdDogbnVtYmVyID0gNTAsIGxhc3RLZXk/OiBzdHJpbmcpOiBQcm9taXNlPHsgcHJvdmlkZXJzOiBQcm92aWRlcltdOyBsYXN0S2V5Pzogc3RyaW5nIH0+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHBhcmFtczogYW55ID0ge1xyXG4gICAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgICAgTGltaXQ6IGxpbWl0LFxyXG4gICAgICAgIEZpbHRlckV4cHJlc3Npb246ICcjaXNBY3RpdmUgPSA6aXNBY3RpdmUnLFxyXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lczoge1xyXG4gICAgICAgICAgJyNpc0FjdGl2ZSc6ICdpc0FjdGl2ZSdcclxuICAgICAgICB9LFxyXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAgICc6aXNBY3RpdmUnOiAndHJ1ZSdcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcblxyXG4gICAgICBpZiAobGFzdEtleSkge1xyXG4gICAgICAgIHBhcmFtcy5FeGNsdXNpdmVTdGFydEtleSA9IHsgcHJvdmlkZXJJZDogbGFzdEtleSB9O1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmR5bmFtb0NsaWVudC5zZW5kKG5ldyBTY2FuQ29tbWFuZChwYXJhbXMpKTtcclxuXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgcHJvdmlkZXJzOiByZXN1bHQuSXRlbXMgYXMgUHJvdmlkZXJbXSB8fCBbXSxcclxuICAgICAgICBsYXN0S2V5OiByZXN1bHQuTGFzdEV2YWx1YXRlZEtleT8ucHJvdmlkZXJJZFxyXG4gICAgICB9O1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgbGlzdGluZyBwcm92aWRlcnM6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBsaXN0IHByb3ZpZGVycycpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU2VhcmNoIHByb3ZpZGVycyBiYXNlZCBvbiBjcml0ZXJpYVxyXG4gICAqL1xyXG4gIGFzeW5jIHNlYXJjaFByb3ZpZGVycyhjcml0ZXJpYTogUHJvdmlkZXJTZWFyY2hDcml0ZXJpYSk6IFByb21pc2U8UHJvdmlkZXJbXT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgbGV0IHByb3ZpZGVyczogUHJvdmlkZXJbXSA9IFtdO1xyXG5cclxuICAgICAgLy8gVXNlIGRpZmZlcmVudCBxdWVyeSBzdHJhdGVnaWVzIGJhc2VkIG9uIGF2YWlsYWJsZSBjcml0ZXJpYVxyXG4gICAgICBpZiAoY3JpdGVyaWEudHlwZSkge1xyXG4gICAgICAgIHByb3ZpZGVycyA9IGF3YWl0IHRoaXMuc2VhcmNoQnlUeXBlKGNyaXRlcmlhKTtcclxuICAgICAgfSBlbHNlIGlmIChjcml0ZXJpYS5zcGVjaWFsdGllcyAmJiBjcml0ZXJpYS5zcGVjaWFsdGllcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgcHJvdmlkZXJzID0gYXdhaXQgdGhpcy5zZWFyY2hCeVNwZWNpYWx0eShjcml0ZXJpYSk7XHJcbiAgICAgIH0gZWxzZSBpZiAoY3JpdGVyaWEubG9jYXRpb24pIHtcclxuICAgICAgICBwcm92aWRlcnMgPSBhd2FpdCB0aGlzLnNlYXJjaEJ5TG9jYXRpb24oY3JpdGVyaWEpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vIEZhbGxiYWNrIHRvIHNjYW4gd2l0aCBmaWx0ZXJzXHJcbiAgICAgICAgcHJvdmlkZXJzID0gYXdhaXQgdGhpcy5zY2FuV2l0aEZpbHRlcnMoY3JpdGVyaWEpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBBcHBseSBhZGRpdGlvbmFsIGZpbHRlcnNcclxuICAgICAgcHJvdmlkZXJzID0gdGhpcy5hcHBseUFkZGl0aW9uYWxGaWx0ZXJzKHByb3ZpZGVycywgY3JpdGVyaWEpO1xyXG5cclxuICAgICAgY29uc29sZS5sb2coYEZvdW5kICR7cHJvdmlkZXJzLmxlbmd0aH0gcHJvdmlkZXJzIG1hdGNoaW5nIGNyaXRlcmlhYCk7XHJcbiAgICAgIHJldHVybiBwcm92aWRlcnM7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBzZWFyY2hpbmcgcHJvdmlkZXJzOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gc2VhcmNoIHByb3ZpZGVycycpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBzZWFyY2hCeVR5cGUoY3JpdGVyaWE6IFByb3ZpZGVyU2VhcmNoQ3JpdGVyaWEpOiBQcm9taXNlPFByb3ZpZGVyW10+IHtcclxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZHluYW1vQ2xpZW50LnNlbmQobmV3IFF1ZXJ5Q29tbWFuZCh7XHJcbiAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgIEluZGV4TmFtZTogJ1R5cGVBdmFpbGFiaWxpdHlJbmRleCcsXHJcbiAgICAgIEtleUNvbmRpdGlvbkV4cHJlc3Npb246ICcjdHlwZSA9IDp0eXBlIEFORCAjaXNBY3RpdmUgPSA6aXNBY3RpdmUnLFxyXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IHtcclxuICAgICAgICAnI3R5cGUnOiAndHlwZScsXHJcbiAgICAgICAgJyNpc0FjdGl2ZSc6ICdpc0FjdGl2ZSdcclxuICAgICAgfSxcclxuICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xyXG4gICAgICAgICc6dHlwZSc6IGNyaXRlcmlhLnR5cGUsXHJcbiAgICAgICAgJzppc0FjdGl2ZSc6ICd0cnVlJ1xyXG4gICAgICB9XHJcbiAgICB9KSk7XHJcblxyXG4gICAgcmV0dXJuIHJlc3VsdC5JdGVtcyBhcyBQcm92aWRlcltdIHx8IFtdO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhc3luYyBzZWFyY2hCeVNwZWNpYWx0eShjcml0ZXJpYTogUHJvdmlkZXJTZWFyY2hDcml0ZXJpYSk6IFByb21pc2U8UHJvdmlkZXJbXT4ge1xyXG4gICAgY29uc3QgcHJvdmlkZXJzOiBQcm92aWRlcltdID0gW107XHJcblxyXG4gICAgLy8gU2VhcmNoIGZvciBlYWNoIHNwZWNpYWx0eSAoRHluYW1vREIgZG9lc24ndCBzdXBwb3J0IE9SIGNvbmRpdGlvbnMgaW4gS2V5Q29uZGl0aW9uRXhwcmVzc2lvbilcclxuICAgIGZvciAoY29uc3Qgc3BlY2lhbHR5IG9mIGNyaXRlcmlhLnNwZWNpYWx0aWVzISkge1xyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmR5bmFtb0NsaWVudC5zZW5kKG5ldyBRdWVyeUNvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgICAgSW5kZXhOYW1lOiAnU3BlY2lhbHR5SW5kZXgnLFxyXG4gICAgICAgIEtleUNvbmRpdGlvbkV4cHJlc3Npb246ICcjcHJpbWFyeVNwZWNpYWx0eSA9IDpzcGVjaWFsdHknLFxyXG4gICAgICAgIEZpbHRlckV4cHJlc3Npb246ICcjaXNBY3RpdmUgPSA6aXNBY3RpdmUnLFxyXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lczoge1xyXG4gICAgICAgICAgJyNwcmltYXJ5U3BlY2lhbHR5JzogJ3ByaW1hcnlTcGVjaWFsdHknLFxyXG4gICAgICAgICAgJyNpc0FjdGl2ZSc6ICdpc0FjdGl2ZSdcclxuICAgICAgICB9LFxyXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAgICc6c3BlY2lhbHR5Jzogc3BlY2lhbHR5LFxyXG4gICAgICAgICAgJzppc0FjdGl2ZSc6ICd0cnVlJ1xyXG4gICAgICAgIH1cclxuICAgICAgfSkpO1xyXG5cclxuICAgICAgcHJvdmlkZXJzLnB1c2goLi4uKHJlc3VsdC5JdGVtcyBhcyBQcm92aWRlcltdIHx8IFtdKSk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gUmVtb3ZlIGR1cGxpY2F0ZXNcclxuICAgIGNvbnN0IHVuaXF1ZVByb3ZpZGVycyA9IHByb3ZpZGVycy5maWx0ZXIoKHByb3ZpZGVyLCBpbmRleCwgc2VsZikgPT4gXHJcbiAgICAgIGluZGV4ID09PSBzZWxmLmZpbmRJbmRleChwID0+IHAucHJvdmlkZXJJZCA9PT0gcHJvdmlkZXIucHJvdmlkZXJJZClcclxuICAgICk7XHJcblxyXG4gICAgcmV0dXJuIHVuaXF1ZVByb3ZpZGVycztcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgc2VhcmNoQnlMb2NhdGlvbihjcml0ZXJpYTogUHJvdmlkZXJTZWFyY2hDcml0ZXJpYSk6IFByb21pc2U8UHJvdmlkZXJbXT4ge1xyXG4gICAgLy8gRm9yIGxvY2F0aW9uLWJhc2VkIHNlYXJjaCwgd2UgbmVlZCB0byBzY2FuIGFuZCBmaWx0ZXIgYnkgZGlzdGFuY2VcclxuICAgIC8vIEluIGEgcHJvZHVjdGlvbiBzeXN0ZW0sIHlvdSBtaWdodCB1c2UgYSBnZW9zcGF0aWFsIGluZGV4IG9yIHNlcnZpY2VcclxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZHluYW1vQ2xpZW50LnNlbmQobmV3IFNjYW5Db21tYW5kKHtcclxuICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcclxuICAgICAgRmlsdGVyRXhwcmVzc2lvbjogJyNpc0FjdGl2ZSA9IDppc0FjdGl2ZScsXHJcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lczoge1xyXG4gICAgICAgICcjaXNBY3RpdmUnOiAnaXNBY3RpdmUnXHJcbiAgICAgIH0sXHJcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAnOmlzQWN0aXZlJzogJ3RydWUnXHJcbiAgICAgIH1cclxuICAgIH0pKTtcclxuXHJcbiAgICBjb25zdCBwcm92aWRlcnMgPSByZXN1bHQuSXRlbXMgYXMgUHJvdmlkZXJbXSB8fCBbXTtcclxuICAgIGNvbnN0IHsgY29vcmRpbmF0ZXMsIG1heERpc3RhbmNlIH0gPSBjcml0ZXJpYS5sb2NhdGlvbiE7XHJcblxyXG4gICAgcmV0dXJuIHByb3ZpZGVycy5maWx0ZXIocHJvdmlkZXIgPT4ge1xyXG4gICAgICBjb25zdCBkaXN0YW5jZSA9IGNhbGN1bGF0ZURpc3RhbmNlKFxyXG4gICAgICAgIGNvb3JkaW5hdGVzLmxhdCxcclxuICAgICAgICBjb29yZGluYXRlcy5sbmcsXHJcbiAgICAgICAgcHJvdmlkZXIubG9jYXRpb24uY29vcmRpbmF0ZXMubGF0LFxyXG4gICAgICAgIHByb3ZpZGVyLmxvY2F0aW9uLmNvb3JkaW5hdGVzLmxuZ1xyXG4gICAgICApO1xyXG4gICAgICByZXR1cm4gZGlzdGFuY2UgPD0gbWF4RGlzdGFuY2U7XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgYXN5bmMgc2NhbldpdGhGaWx0ZXJzKGNyaXRlcmlhOiBQcm92aWRlclNlYXJjaENyaXRlcmlhKTogUHJvbWlzZTxQcm92aWRlcltdPiB7XHJcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmR5bmFtb0NsaWVudC5zZW5kKG5ldyBTY2FuQ29tbWFuZCh7XHJcbiAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgIEZpbHRlckV4cHJlc3Npb246ICcjaXNBY3RpdmUgPSA6aXNBY3RpdmUnLFxyXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IHtcclxuICAgICAgICAnI2lzQWN0aXZlJzogJ2lzQWN0aXZlJ1xyXG4gICAgICB9LFxyXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgJzppc0FjdGl2ZSc6ICd0cnVlJ1xyXG4gICAgICB9XHJcbiAgICB9KSk7XHJcblxyXG4gICAgcmV0dXJuIHJlc3VsdC5JdGVtcyBhcyBQcm92aWRlcltdIHx8IFtdO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBhcHBseUFkZGl0aW9uYWxGaWx0ZXJzKHByb3ZpZGVyczogUHJvdmlkZXJbXSwgY3JpdGVyaWE6IFByb3ZpZGVyU2VhcmNoQ3JpdGVyaWEpOiBQcm92aWRlcltdIHtcclxuICAgIHJldHVybiBwcm92aWRlcnMuZmlsdGVyKHByb3ZpZGVyID0+IHtcclxuICAgICAgLy8gRmlsdGVyIGJ5IGF2YWlsYWJpbGl0eVxyXG4gICAgICBpZiAoY3JpdGVyaWEuYXZhaWxhYmxlTm93ICYmIHByb3ZpZGVyLmNhcGFjaXR5LmN1cnJlbnRMb2FkID49IDkwKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBGaWx0ZXIgYnkgY29zdFxyXG4gICAgICBpZiAoY3JpdGVyaWEubWF4Q29zdCAmJiBwcm92aWRlci5jb3N0U3RydWN0dXJlLmNvbnN1bHRhdGlvbkZlZSA+IGNyaXRlcmlhLm1heENvc3QpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIEZpbHRlciBieSByYXRpbmdcclxuICAgICAgaWYgKGNyaXRlcmlhLm1pblJhdGluZyAmJiBwcm92aWRlci5xdWFsaXR5TWV0cmljcy5yYXRpbmcgPCBjcml0ZXJpYS5taW5SYXRpbmcpIHtcclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIEZpbHRlciBieSBpbnN1cmFuY2VcclxuICAgICAgaWYgKGNyaXRlcmlhLmFjY2VwdHNJbnN1cmFuY2UgJiYgY3JpdGVyaWEuYWNjZXB0c0luc3VyYW5jZS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgY29uc3QgaGFzTWF0Y2hpbmdJbnN1cmFuY2UgPSBjcml0ZXJpYS5hY2NlcHRzSW5zdXJhbmNlLnNvbWUoaW5zdXJhbmNlID0+XHJcbiAgICAgICAgICBwcm92aWRlci5jb3N0U3RydWN0dXJlLmluc3VyYW5jZUFjY2VwdGVkLmluY2x1ZGVzKGluc3VyYW5jZSlcclxuICAgICAgICApO1xyXG4gICAgICAgIGlmICghaGFzTWF0Y2hpbmdJbnN1cmFuY2UpIHtcclxuICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIEZpbHRlciBieSBsYW5ndWFnZXNcclxuICAgICAgaWYgKGNyaXRlcmlhLmxhbmd1YWdlcyAmJiBjcml0ZXJpYS5sYW5ndWFnZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgIGNvbnN0IGhhc01hdGNoaW5nTGFuZ3VhZ2UgPSBjcml0ZXJpYS5sYW5ndWFnZXMuc29tZShsYW5ndWFnZSA9PlxyXG4gICAgICAgICAgcHJvdmlkZXIuY2FwYWJpbGl0aWVzLmxhbmd1YWdlcy5pbmNsdWRlcyhsYW5ndWFnZSlcclxuICAgICAgICApO1xyXG4gICAgICAgIGlmICghaGFzTWF0Y2hpbmdMYW5ndWFnZSkge1xyXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gRmlsdGVyIGJ5IGxvY2F0aW9uIGRpc3RhbmNlIChpZiBub3QgYWxyZWFkeSBkb25lKVxyXG4gICAgICBpZiAoY3JpdGVyaWEubG9jYXRpb24gJiYgIXRoaXMuaXNMb2NhdGlvbkZpbHRlcmVkKGNyaXRlcmlhKSkge1xyXG4gICAgICAgIGNvbnN0IGRpc3RhbmNlID0gY2FsY3VsYXRlRGlzdGFuY2UoXHJcbiAgICAgICAgICBjcml0ZXJpYS5sb2NhdGlvbi5jb29yZGluYXRlcy5sYXQsXHJcbiAgICAgICAgICBjcml0ZXJpYS5sb2NhdGlvbi5jb29yZGluYXRlcy5sbmcsXHJcbiAgICAgICAgICBwcm92aWRlci5sb2NhdGlvbi5jb29yZGluYXRlcy5sYXQsXHJcbiAgICAgICAgICBwcm92aWRlci5sb2NhdGlvbi5jb29yZGluYXRlcy5sbmdcclxuICAgICAgICApO1xyXG4gICAgICAgIGlmIChkaXN0YW5jZSA+IGNyaXRlcmlhLmxvY2F0aW9uLm1heERpc3RhbmNlKSB7XHJcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcblxyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBpc0xvY2F0aW9uRmlsdGVyZWQoY3JpdGVyaWE6IFByb3ZpZGVyU2VhcmNoQ3JpdGVyaWEpOiBib29sZWFuIHtcclxuICAgIC8vIENoZWNrIGlmIGxvY2F0aW9uIGZpbHRlcmluZyB3YXMgYWxyZWFkeSBhcHBsaWVkIGluIHRoZSBxdWVyeSBwaGFzZVxyXG4gICAgcmV0dXJuICFjcml0ZXJpYS50eXBlICYmICghY3JpdGVyaWEuc3BlY2lhbHRpZXMgfHwgY3JpdGVyaWEuc3BlY2lhbHRpZXMubGVuZ3RoID09PSAwKTtcclxuICB9XHJcbn0iXX0=