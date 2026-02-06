"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderCapacityService = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const provider_validation_1 = require("../../validation/provider-validation");
class ProviderCapacityService {
    constructor() {
        const client = new client_dynamodb_1.DynamoDBClient({});
        this.dynamoClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
        this.tableName = process.env.PROVIDER_TABLE_NAME || 'healthcare-providers';
    }
    /**
     * Update provider capacity in real-time
     */
    async updateCapacity(input) {
        // Validate input
        const { error } = (0, provider_validation_1.validateUpdateCapacityInput)(input);
        if (error) {
            throw new Error(`Invalid capacity update data: ${error.message}`);
        }
        try {
            const updateExpressions = [];
            const expressionAttributeNames = {};
            const expressionAttributeValues = {};
            // Update current load
            updateExpressions.push('#currentLoad = :currentLoad');
            expressionAttributeNames['#currentLoad'] = 'currentLoad';
            expressionAttributeValues[':currentLoad'] = input.currentLoad;
            // Update available beds if provided
            if (input.availableBeds !== undefined) {
                updateExpressions.push('#capacity.#availableBeds = :availableBeds');
                expressionAttributeNames['#capacity'] = 'capacity';
                expressionAttributeNames['#availableBeds'] = 'availableBeds';
                expressionAttributeValues[':availableBeds'] = input.availableBeds;
            }
            // Update timestamp
            updateExpressions.push('#updatedAt = :updatedAt');
            expressionAttributeNames['#updatedAt'] = 'updatedAt';
            expressionAttributeValues[':updatedAt'] = new Date().toISOString();
            // Update capacity last updated timestamp
            updateExpressions.push('#capacity.#lastUpdated = :lastUpdated');
            expressionAttributeNames['#lastUpdated'] = 'lastUpdated';
            expressionAttributeValues[':lastUpdated'] = new Date().toISOString();
            await this.dynamoClient.send(new lib_dynamodb_1.UpdateCommand({
                TableName: this.tableName,
                Key: { providerId: input.providerId },
                UpdateExpression: `SET ${updateExpressions.join(', ')}`,
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues,
                ConditionExpression: 'attribute_exists(providerId)' // Ensure provider exists
            }));
            console.log(`Capacity updated for provider: ${input.providerId}`);
        }
        catch (error) {
            console.error('Error updating provider capacity:', error);
            if (error.name === 'ConditionalCheckFailedException') {
                throw new Error('Provider not found');
            }
            throw new Error('Failed to update provider capacity');
        }
    }
    /**
     * Check capacity for multiple providers
     */
    async checkCapacity(providerIds) {
        try {
            if (providerIds.length === 0) {
                return [];
            }
            // Batch get providers (DynamoDB limits batch size to 100)
            const batchSize = 100;
            const capacityInfos = [];
            for (let i = 0; i < providerIds.length; i += batchSize) {
                const batch = providerIds.slice(i, i + batchSize);
                const batchCapacityInfos = await this.checkCapacityBatch(batch);
                capacityInfos.push(...batchCapacityInfos);
            }
            return capacityInfos;
        }
        catch (error) {
            console.error('Error checking provider capacity:', error);
            throw new Error('Failed to check provider capacity');
        }
    }
    /**
     * Check capacity for a single batch of providers
     */
    async checkCapacityBatch(providerIds) {
        const keys = providerIds.map(id => ({ providerId: id }));
        const result = await this.dynamoClient.send(new lib_dynamodb_1.BatchGetCommand({
            RequestItems: {
                [this.tableName]: {
                    Keys: keys,
                    ProjectionExpression: 'providerId, capacity, #updatedAt',
                    ExpressionAttributeNames: {
                        '#updatedAt': 'updatedAt'
                    }
                }
            }
        }));
        const providers = result.Responses?.[this.tableName] || [];
        return providers.map(provider => ({
            providerId: provider.providerId,
            totalBeds: provider.capacity.totalBeds,
            availableBeds: provider.capacity.availableBeds,
            currentLoad: provider.capacity.currentLoad,
            dailyPatientCapacity: provider.capacity.dailyPatientCapacity,
            availabilityStatus: this.determineAvailabilityStatus(provider.capacity.currentLoad),
            lastUpdated: provider.capacity.lastUpdated || provider.updatedAt
        }));
    }
    /**
     * Get real-time capacity for a single provider
     */
    async getProviderCapacity(providerId) {
        try {
            const result = await this.dynamoClient.send(new lib_dynamodb_1.GetCommand({
                TableName: this.tableName,
                Key: { providerId },
                ProjectionExpression: 'providerId, capacity, #updatedAt',
                ExpressionAttributeNames: {
                    '#updatedAt': 'updatedAt'
                }
            }));
            if (!result.Item) {
                return null;
            }
            const provider = result.Item;
            return {
                providerId: provider.providerId,
                totalBeds: provider.capacity.totalBeds,
                availableBeds: provider.capacity.availableBeds,
                currentLoad: provider.capacity.currentLoad,
                dailyPatientCapacity: provider.capacity.dailyPatientCapacity,
                availabilityStatus: this.determineAvailabilityStatus(provider.capacity.currentLoad),
                lastUpdated: provider.capacity.lastUpdated || provider.updatedAt
            };
        }
        catch (error) {
            console.error('Error getting provider capacity:', error);
            throw new Error('Failed to get provider capacity');
        }
    }
    /**
     * Update multiple providers' capacity in batch
     */
    async batchUpdateCapacity(updates) {
        try {
            // Process updates in parallel with concurrency limit
            const concurrencyLimit = 10;
            const promises = [];
            for (let i = 0; i < updates.length; i += concurrencyLimit) {
                const batch = updates.slice(i, i + concurrencyLimit);
                const batchPromises = batch.map(update => this.updateCapacity(update));
                promises.push(...batchPromises);
            }
            await Promise.all(promises);
            console.log(`Batch updated capacity for ${updates.length} providers`);
        }
        catch (error) {
            console.error('Error in batch capacity update:', error);
            throw new Error('Failed to batch update provider capacity');
        }
    }
    /**
     * Get providers with low capacity (for alerting)
     */
    async getProvidersWithLowCapacity(threshold = 90) {
        try {
            // Use the CapacityIndex GSI to find providers with high load
            const result = await this.dynamoClient.send(new lib_dynamodb_1.QueryCommand({
                TableName: this.tableName,
                IndexName: 'CapacityIndex',
                KeyConditionExpression: '#type = :type',
                FilterExpression: '#currentLoad >= :threshold',
                ExpressionAttributeNames: {
                    '#type': 'type',
                    '#currentLoad': 'currentLoad'
                },
                ExpressionAttributeValues: {
                    ':type': 'hospital', // Start with hospitals, can be extended
                    ':threshold': threshold
                },
                ProjectionExpression: 'providerId, capacity, #updatedAt'
            }));
            const providers = result.Items || [];
            return providers.map(provider => ({
                providerId: provider.providerId,
                totalBeds: provider.capacity.totalBeds,
                availableBeds: provider.capacity.availableBeds,
                currentLoad: provider.capacity.currentLoad,
                dailyPatientCapacity: provider.capacity.dailyPatientCapacity,
                availabilityStatus: this.determineAvailabilityStatus(provider.capacity.currentLoad),
                lastUpdated: provider.capacity.lastUpdated || provider.updatedAt
            }));
        }
        catch (error) {
            console.error('Error getting providers with low capacity:', error);
            throw new Error('Failed to get providers with low capacity');
        }
    }
    /**
     * Calculate availability status based on current load
     */
    determineAvailabilityStatus(currentLoad) {
        if (currentLoad < 70) {
            return 'available';
        }
        else if (currentLoad < 95) {
            return 'busy';
        }
        else {
            return 'unavailable';
        }
    }
    /**
     * Get capacity statistics for monitoring
     */
    async getCapacityStatistics() {
        try {
            // This would be more efficient with aggregation, but DynamoDB doesn't support it natively
            // In production, consider using DynamoDB Streams with Lambda for real-time aggregation
            const result = await this.dynamoClient.send(new lib_dynamodb_1.ScanCommand({
                TableName: this.tableName,
                FilterExpression: '#isActive = :isActive',
                ProjectionExpression: 'providerId, capacity',
                ExpressionAttributeNames: {
                    '#isActive': 'isActive'
                },
                ExpressionAttributeValues: {
                    ':isActive': 'true'
                }
            }));
            const providers = result.Items || [];
            const totalProviders = providers.length;
            let availableCount = 0;
            let busyCount = 0;
            let unavailableCount = 0;
            let totalLoad = 0;
            providers.forEach(provider => {
                const load = provider.capacity.currentLoad;
                totalLoad += load;
                const status = this.determineAvailabilityStatus(load);
                switch (status) {
                    case 'available':
                        availableCount++;
                        break;
                    case 'busy':
                        busyCount++;
                        break;
                    case 'unavailable':
                        unavailableCount++;
                        break;
                }
            });
            return {
                totalProviders,
                availableProviders: availableCount,
                busyProviders: busyCount,
                unavailableProviders: unavailableCount,
                averageLoad: totalProviders > 0 ? Math.round(totalLoad / totalProviders) : 0
            };
        }
        catch (error) {
            console.error('Error getting capacity statistics:', error);
            throw new Error('Failed to get capacity statistics');
        }
    }
}
exports.ProviderCapacityService = ProviderCapacityService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvdmlkZXItY2FwYWNpdHktc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NyYy9sYW1iZGEvcHJvdmlkZXItZGlzY292ZXJ5L3Byb3ZpZGVyLWNhcGFjaXR5LXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsOERBQTBEO0FBQzFELHdEQUFzSTtBQUV0SSw4RUFBbUY7QUFZbkYsTUFBYSx1QkFBdUI7SUFJbEM7UUFDRSxNQUFNLE1BQU0sR0FBRyxJQUFJLGdDQUFjLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdEMsSUFBSSxDQUFDLFlBQVksR0FBRyxxQ0FBc0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDeEQsSUFBSSxDQUFDLFNBQVMsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixJQUFJLHNCQUFzQixDQUFDO0lBQzdFLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxjQUFjLENBQUMsS0FBMEI7UUFDN0MsaUJBQWlCO1FBQ2pCLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxJQUFBLGlEQUEyQixFQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3JELElBQUksS0FBSyxFQUFFLENBQUM7WUFDVixNQUFNLElBQUksS0FBSyxDQUFDLGlDQUFpQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQztRQUNwRSxDQUFDO1FBRUQsSUFBSSxDQUFDO1lBQ0gsTUFBTSxpQkFBaUIsR0FBYSxFQUFFLENBQUM7WUFDdkMsTUFBTSx3QkFBd0IsR0FBMkIsRUFBRSxDQUFDO1lBQzVELE1BQU0seUJBQXlCLEdBQXdCLEVBQUUsQ0FBQztZQUUxRCxzQkFBc0I7WUFDdEIsaUJBQWlCLENBQUMsSUFBSSxDQUFDLDZCQUE2QixDQUFDLENBQUM7WUFDdEQsd0JBQXdCLENBQUMsY0FBYyxDQUFDLEdBQUcsYUFBYSxDQUFDO1lBQ3pELHlCQUF5QixDQUFDLGNBQWMsQ0FBQyxHQUFHLEtB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Q0FBQztZQUVsQixTQUFTLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUMzQixNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQztnQkFDM0MsU0FBUyxJQUFJLElBQUksQ0FBQztnQkFFbEIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLDJCQUEyQixDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN0RCxRQUFRLE1BQU0sRUFBRSxDQUFDO29CQUNmLEtBQUssV0FBVzt3QkFDZCxjQUFjLEVBQUUsQ0FBQzt3QkFDakIsTUFBTTtvQkFDUixLQUFLLE1BQU07d0JBQ1QsU0FBUyxFQUFFLENBQUM7d0JBQ1osTUFBTTtvQkFDUixLQUFLLGFBQWE7d0JBQ2hCLGdCQUFnQixFQUFFLENBQUM7d0JBQ25CLE1BQU07Z0JBQ1YsQ0FBQztZQUNILENBQUMsQ0FBQyxDQUFDO1lBRUgsT0FBTztnQkFDTCxjQUFjO2dCQUNkLGtCQUFrQixFQUFFLGNBQWM7Z0JBQ2xDLGFBQWEsRUFBRSxTQUFTO2dCQUN4QixvQkFBb0IsRUFBRSxnQkFBZ0I7Z0JBQ3RDLFdBQVcsRUFBRSxjQUFjLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUM3RSxDQUFDO1FBQ0osQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLG9DQUFvQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzNELE1BQU0sSUFBSSxLQUFLLENBQUMsbUNBQW1DLENBQUMsQ0FBQztRQUN2RCxDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBeFNELDBEQXdTQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IER5bmFtb0RCQ2xpZW50IH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcclxuaW1wb3J0IHsgRHluYW1vREJEb2N1bWVudENsaWVudCwgR2V0Q29tbWFuZCwgVXBkYXRlQ29tbWFuZCwgQmF0Y2hHZXRDb21tYW5kLCBRdWVyeUNvbW1hbmQsIFNjYW5Db21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcclxuaW1wb3J0IHsgVXBkYXRlQ2FwYWNpdHlJbnB1dCB9IGZyb20gJy4uLy4uL3R5cGVzL3Byb3ZpZGVyJztcclxuaW1wb3J0IHsgdmFsaWRhdGVVcGRhdGVDYXBhY2l0eUlucHV0IH0gZnJvbSAnLi4vLi4vdmFsaWRhdGlvbi9wcm92aWRlci12YWxpZGF0aW9uJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ2FwYWNpdHlJbmZvIHtcclxuICBwcm92aWRlcklkOiBzdHJpbmc7XHJcbiAgdG90YWxCZWRzOiBudW1iZXI7XHJcbiAgYXZhaWxhYmxlQmVkczogbnVtYmVyO1xyXG4gIGN1cnJlbnRMb2FkOiBudW1iZXI7XHJcbiAgZGFpbHlQYXRpZW50Q2FwYWNpdHk6IG51bWJlcjtcclxuICBhdmFpbGFiaWxpdHlTdGF0dXM6ICdhdmFpbGFibGUnIHwgJ2J1c3knIHwgJ3VuYXZhaWxhYmxlJztcclxuICBsYXN0VXBkYXRlZDogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgUHJvdmlkZXJDYXBhY2l0eVNlcnZpY2Uge1xyXG4gIHByaXZhdGUgZHluYW1vQ2xpZW50OiBEeW5hbW9EQkRvY3VtZW50Q2xpZW50O1xyXG4gIHByaXZhdGUgdGFibGVOYW1lOiBzdHJpbmc7XHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgY29uc3QgY2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHt9KTtcclxuICAgIHRoaXMuZHluYW1vQ2xpZW50ID0gRHluYW1vREJEb2N1bWVudENsaWVudC5mcm9tKGNsaWVudCk7XHJcbiAgICB0aGlzLnRhYmxlTmFtZSA9IHByb2Nlc3MuZW52LlBST1ZJREVSX1RBQkxFX05BTUUgfHwgJ2hlYWx0aGNhcmUtcHJvdmlkZXJzJztcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFVwZGF0ZSBwcm92aWRlciBjYXBhY2l0eSBpbiByZWFsLXRpbWVcclxuICAgKi9cclxuICBhc3luYyB1cGRhdGVDYXBhY2l0eShpbnB1dDogVXBkYXRlQ2FwYWNpdHlJbnB1dCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgLy8gVmFsaWRhdGUgaW5wdXRcclxuICAgIGNvbnN0IHsgZXJyb3IgfSA9IHZhbGlkYXRlVXBkYXRlQ2FwYWNpdHlJbnB1dChpbnB1dCk7XHJcbiAgICBpZiAoZXJyb3IpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIGNhcGFjaXR5IHVwZGF0ZSBkYXRhOiAke2Vycm9yLm1lc3NhZ2V9YCk7XHJcbiAgICB9XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgdXBkYXRlRXhwcmVzc2lvbnM6IHN0cmluZ1tdID0gW107XHJcbiAgICAgIGNvbnN0IGV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9O1xyXG4gICAgICBjb25zdCBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge307XHJcblxyXG4gICAgICAvLyBVcGRhdGUgY3VycmVudCBsb2FkXHJcbiAgICAgIHVwZGF0ZUV4cHJlc3Npb25zLnB1c2goJyNjdXJyZW50TG9hZCA9IDpjdXJyZW50TG9hZCcpO1xyXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlTmFtZXNbJyNjdXJyZW50TG9hZCddID0gJ2N1cnJlbnRMb2FkJztcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOmN1cnJlbnRMb2FkJ10gPSBpbnB1dC5jdXJyZW50TG9hZDtcclxuXHJcbiAgICAgIC8vIFVwZGF0ZSBhdmFpbGFibGUgYmVkcyBpZiBwcm92aWRlZFxyXG4gICAgICBpZiAoaW5wdXQuYXZhaWxhYmxlQmVkcyAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgdXBkYXRlRXhwcmVzc2lvbnMucHVzaCgnI2NhcGFjaXR5LiNhdmFpbGFibGVCZWRzID0gOmF2YWlsYWJsZUJlZHMnKTtcclxuICAgICAgICBleHByZXNzaW9uQXR0cmlidXRlTmFtZXNbJyNjYXBhY2l0eSddID0gJ2NhcGFjaXR5JztcclxuICAgICAgICBleHByZXNzaW9uQXR0cmlidXRlTmFtZXNbJyNhdmFpbGFibGVCZWRzJ10gPSAnYXZhaWxhYmxlQmVkcyc7XHJcbiAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOmF2YWlsYWJsZUJlZHMnXSA9IGlucHV0LmF2YWlsYWJsZUJlZHM7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFVwZGF0ZSB0aW1lc3RhbXBcclxuICAgICAgdXBkYXRlRXhwcmVzc2lvbnMucHVzaCgnI3VwZGF0ZWRBdCA9IDp1cGRhdGVkQXQnKTtcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzWycjdXBkYXRlZEF0J10gPSAndXBkYXRlZEF0JztcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOnVwZGF0ZWRBdCddID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xyXG5cclxuICAgICAgLy8gVXBkYXRlIGNhcGFjaXR5IGxhc3QgdXBkYXRlZCB0aW1lc3RhbXBcclxuICAgICAgdXBkYXRlRXhwcmVzc2lvbnMucHVzaCgnI2NhcGFjaXR5LiNsYXN0VXBkYXRlZCA9IDpsYXN0VXBkYXRlZCcpO1xyXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlTmFtZXNbJyNsYXN0VXBkYXRlZCddID0gJ2xhc3RVcGRhdGVkJztcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOmxhc3RVcGRhdGVkJ10gPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XHJcblxyXG4gICAgICBhd2FpdCB0aGlzLmR5bmFtb0NsaWVudC5zZW5kKG5ldyBVcGRhdGVDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMudGFibGVOYW1lLFxyXG4gICAgICAgIEtleTogeyBwcm92aWRlcklkOiBpbnB1dC5wcm92aWRlcklkIH0sXHJcbiAgICAgICAgVXBkYXRlRXhwcmVzc2lvbjogYFNFVCAke3VwZGF0ZUV4cHJlc3Npb25zLmpvaW4oJywgJyl9YCxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IGV4cHJlc3Npb25BdHRyaWJ1dGVOYW1lcyxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzLFxyXG4gICAgICAgIENvbmRpdGlvbkV4cHJlc3Npb246ICdhdHRyaWJ1dGVfZXhpc3RzKHByb3ZpZGVySWQpJyAvLyBFbnN1cmUgcHJvdmlkZXIgZXhpc3RzXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIGNvbnNvbGUubG9nKGBDYXBhY2l0eSB1cGRhdGVkIGZvciBwcm92aWRlcjogJHtpbnB1dC5wcm92aWRlcklkfWApO1xyXG4gICAgfSBjYXRjaCAoZXJyb3I6IGFueSkge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciB1cGRhdGluZyBwcm92aWRlciBjYXBhY2l0eTonLCBlcnJvcik7XHJcbiAgICAgIGlmIChlcnJvci5uYW1lID09PSAnQ29uZGl0aW9uYWxDaGVja0ZhaWxlZEV4Y2VwdGlvbicpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Byb3ZpZGVyIG5vdCBmb3VuZCcpO1xyXG4gICAgICB9XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIHVwZGF0ZSBwcm92aWRlciBjYXBhY2l0eScpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2hlY2sgY2FwYWNpdHkgZm9yIG11bHRpcGxlIHByb3ZpZGVyc1xyXG4gICAqL1xyXG4gIGFzeW5jIGNoZWNrQ2FwYWNpdHkocHJvdmlkZXJJZHM6IHN0cmluZ1tdKTogUHJvbWlzZTxDYXBhY2l0eUluZm9bXT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgaWYgKHByb3ZpZGVySWRzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgIHJldHVybiBbXTtcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gQmF0Y2ggZ2V0IHByb3ZpZGVycyAoRHluYW1vREIgbGltaXRzIGJhdGNoIHNpemUgdG8gMTAwKVxyXG4gICAgICBjb25zdCBiYXRjaFNpemUgPSAxMDA7XHJcbiAgICAgIGNvbnN0IGNhcGFjaXR5SW5mb3M6IENhcGFjaXR5SW5mb1tdID0gW107XHJcblxyXG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHByb3ZpZGVySWRzLmxlbmd0aDsgaSArPSBiYXRjaFNpemUpIHtcclxuICAgICAgICBjb25zdCBiYXRjaCA9IHByb3ZpZGVySWRzLnNsaWNlKGksIGkgKyBiYXRjaFNpemUpO1xyXG4gICAgICAgIGNvbnN0IGJhdGNoQ2FwYWNpdHlJbmZvcyA9IGF3YWl0IHRoaXMuY2hlY2tDYXBhY2l0eUJhdGNoKGJhdGNoKTtcclxuICAgICAgICBjYXBhY2l0eUluZm9zLnB1c2goLi4uYmF0Y2hDYXBhY2l0eUluZm9zKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIGNhcGFjaXR5SW5mb3M7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBjaGVja2luZyBwcm92aWRlciBjYXBhY2l0eTonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGNoZWNrIHByb3ZpZGVyIGNhcGFjaXR5Jyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDaGVjayBjYXBhY2l0eSBmb3IgYSBzaW5nbGUgYmF0Y2ggb2YgcHJvdmlkZXJzXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyBjaGVja0NhcGFjaXR5QmF0Y2gocHJvdmlkZXJJZHM6IHN0cmluZ1tdKTogUHJvbWlzZTxDYXBhY2l0eUluZm9bXT4ge1xyXG4gICAgY29uc3Qga2V5cyA9IHByb3ZpZGVySWRzLm1hcChpZCA9PiAoeyBwcm92aWRlcklkOiBpZCB9KSk7XHJcblxyXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5keW5hbW9DbGllbnQuc2VuZChuZXcgQmF0Y2hHZXRDb21tYW5kKHtcclxuICAgICAgUmVxdWVzdEl0ZW1zOiB7XHJcbiAgICAgICAgW3RoaXMudGFibGVOYW1lXToge1xyXG4gICAgICAgICAgS2V5czoga2V5cyxcclxuICAgICAgICAgIFByb2plY3Rpb25FeHByZXNzaW9uOiAncHJvdmlkZXJJZCwgY2FwYWNpdHksICN1cGRhdGVkQXQnLFxyXG4gICAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzOiB7XHJcbiAgICAgICAgICAgICcjdXBkYXRlZEF0JzogJ3VwZGF0ZWRBdCdcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH0pKTtcclxuXHJcbiAgICBjb25zdCBwcm92aWRlcnMgPSByZXN1bHQuUmVzcG9uc2VzPy5bdGhpcy50YWJsZU5hbWVdIHx8IFtdO1xyXG5cclxuICAgIHJldHVybiBwcm92aWRlcnMubWFwKHByb3ZpZGVyID0+ICh7XHJcbiAgICAgIHByb3ZpZGVySWQ6IHByb3ZpZGVyLnByb3ZpZGVySWQsXHJcbiAgICAgIHRvdGFsQmVkczogcHJvdmlkZXIuY2FwYWNpdHkudG90YWxCZWRzLFxyXG4gICAgICBhdmFpbGFibGVCZWRzOiBwcm92aWRlci5jYXBhY2l0eS5hdmFpbGFibGVCZWRzLFxyXG4gICAgICBjdXJyZW50TG9hZDogcHJvdmlkZXIuY2FwYWNpdHkuY3VycmVudExvYWQsXHJcbiAgICAgIGRhaWx5UGF0aWVudENhcGFjaXR5OiBwcm92aWRlci5jYXBhY2l0eS5kYWlseVBhdGllbnRDYXBhY2l0eSxcclxuICAgICAgYXZhaWxhYmlsaXR5U3RhdHVzOiB0aGlzLmRldGVybWluZUF2YWlsYWJpbGl0eVN0YXR1cyhwcm92aWRlci5jYXBhY2l0eS5jdXJyZW50TG9hZCksXHJcbiAgICAgIGxhc3RVcGRhdGVkOiBwcm92aWRlci5jYXBhY2l0eS5sYXN0VXBkYXRlZCB8fCBwcm92aWRlci51cGRhdGVkQXRcclxuICAgIH0pKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCByZWFsLXRpbWUgY2FwYWNpdHkgZm9yIGEgc2luZ2xlIHByb3ZpZGVyXHJcbiAgICovXHJcbiAgYXN5bmMgZ2V0UHJvdmlkZXJDYXBhY2l0eShwcm92aWRlcklkOiBzdHJpbmcpOiBQcm9taXNlPENhcGFjaXR5SW5mbyB8IG51bGw+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuZHluYW1vQ2xpZW50LnNlbmQobmV3IEdldENvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgICAgS2V5OiB7IHByb3ZpZGVySWQgfSxcclxuICAgICAgICBQcm9qZWN0aW9uRXhwcmVzc2lvbjogJ3Byb3ZpZGVySWQsIGNhcGFjaXR5LCAjdXBkYXRlZEF0JyxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IHtcclxuICAgICAgICAgICcjdXBkYXRlZEF0JzogJ3VwZGF0ZWRBdCdcclxuICAgICAgICB9XHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIGlmICghcmVzdWx0Lkl0ZW0pIHtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgcHJvdmlkZXIgPSByZXN1bHQuSXRlbTtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBwcm92aWRlcklkOiBwcm92aWRlci5wcm92aWRlcklkLFxyXG4gICAgICAgIHRvdGFsQmVkczogcHJvdmlkZXIuY2FwYWNpdHkudG90YWxCZWRzLFxyXG4gICAgICAgIGF2YWlsYWJsZUJlZHM6IHByb3ZpZGVyLmNhcGFjaXR5LmF2YWlsYWJsZUJlZHMsXHJcbiAgICAgICAgY3VycmVudExvYWQ6IHByb3ZpZGVyLmNhcGFjaXR5LmN1cnJlbnRMb2FkLFxyXG4gICAgICAgIGRhaWx5UGF0aWVudENhcGFjaXR5OiBwcm92aWRlci5jYXBhY2l0eS5kYWlseVBhdGllbnRDYXBhY2l0eSxcclxuICAgICAgICBhdmFpbGFiaWxpdHlTdGF0dXM6IHRoaXMuZGV0ZXJtaW5lQXZhaWxhYmlsaXR5U3RhdHVzKHByb3ZpZGVyLmNhcGFjaXR5LmN1cnJlbnRMb2FkKSxcclxuICAgICAgICBsYXN0VXBkYXRlZDogcHJvdmlkZXIuY2FwYWNpdHkubGFzdFVwZGF0ZWQgfHwgcHJvdmlkZXIudXBkYXRlZEF0XHJcbiAgICAgIH07XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBnZXR0aW5nIHByb3ZpZGVyIGNhcGFjaXR5OicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gZ2V0IHByb3ZpZGVyIGNhcGFjaXR5Jyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBVcGRhdGUgbXVsdGlwbGUgcHJvdmlkZXJzJyBjYXBhY2l0eSBpbiBiYXRjaFxyXG4gICAqL1xyXG4gIGFzeW5jIGJhdGNoVXBkYXRlQ2FwYWNpdHkodXBkYXRlczogVXBkYXRlQ2FwYWNpdHlJbnB1dFtdKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBQcm9jZXNzIHVwZGF0ZXMgaW4gcGFyYWxsZWwgd2l0aCBjb25jdXJyZW5jeSBsaW1pdFxyXG4gICAgICBjb25zdCBjb25jdXJyZW5jeUxpbWl0ID0gMTA7XHJcbiAgICAgIGNvbnN0IHByb21pc2VzOiBQcm9taXNlPHZvaWQ+W10gPSBbXTtcclxuXHJcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdXBkYXRlcy5sZW5ndGg7IGkgKz0gY29uY3VycmVuY3lMaW1pdCkge1xyXG4gICAgICAgIGNvbnN0IGJhdGNoID0gdXBkYXRlcy5zbGljZShpLCBpICsgY29uY3VycmVuY3lMaW1pdCk7XHJcbiAgICAgICAgY29uc3QgYmF0Y2hQcm9taXNlcyA9IGJhdGNoLm1hcCh1cGRhdGUgPT4gdGhpcy51cGRhdGVDYXBhY2l0eSh1cGRhdGUpKTtcclxuICAgICAgICBwcm9taXNlcy5wdXNoKC4uLmJhdGNoUHJvbWlzZXMpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBhd2FpdCBQcm9taXNlLmFsbChwcm9taXNlcyk7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBCYXRjaCB1cGRhdGVkIGNhcGFjaXR5IGZvciAke3VwZGF0ZXMubGVuZ3RofSBwcm92aWRlcnNgKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGluIGJhdGNoIGNhcGFjaXR5IHVwZGF0ZTonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGJhdGNoIHVwZGF0ZSBwcm92aWRlciBjYXBhY2l0eScpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IHByb3ZpZGVycyB3aXRoIGxvdyBjYXBhY2l0eSAoZm9yIGFsZXJ0aW5nKVxyXG4gICAqL1xyXG4gIGFzeW5jIGdldFByb3ZpZGVyc1dpdGhMb3dDYXBhY2l0eSh0aHJlc2hvbGQ6IG51bWJlciA9IDkwKTogUHJvbWlzZTxDYXBhY2l0eUluZm9bXT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gVXNlIHRoZSBDYXBhY2l0eUluZGV4IEdTSSB0byBmaW5kIHByb3ZpZGVycyB3aXRoIGhpZ2ggbG9hZFxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmR5bmFtb0NsaWVudC5zZW5kKG5ldyBRdWVyeUNvbW1hbmQoe1xyXG4gICAgICAgIFRhYmxlTmFtZTogdGhpcy50YWJsZU5hbWUsXHJcbiAgICAgICAgSW5kZXhOYW1lOiAnQ2FwYWNpdHlJbmRleCcsXHJcbiAgICAgICAgS2V5Q29uZGl0aW9uRXhwcmVzc2lvbjogJyN0eXBlID0gOnR5cGUnLFxyXG4gICAgICAgIEZpbHRlckV4cHJlc3Npb246ICcjY3VycmVudExvYWQgPj0gOnRocmVzaG9sZCcsXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZU5hbWVzOiB7XHJcbiAgICAgICAgICAnI3R5cGUnOiAndHlwZScsXHJcbiAgICAgICAgICAnI2N1cnJlbnRMb2FkJzogJ2N1cnJlbnRMb2FkJ1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xyXG4gICAgICAgICAgJzp0eXBlJzogJ2hvc3BpdGFsJywgLy8gU3RhcnQgd2l0aCBob3NwaXRhbHMsIGNhbiBiZSBleHRlbmRlZFxyXG4gICAgICAgICAgJzp0aHJlc2hvbGQnOiB0aHJlc2hvbGRcclxuICAgICAgICB9LFxyXG4gICAgICAgIFByb2plY3Rpb25FeHByZXNzaW9uOiAncHJvdmlkZXJJZCwgY2FwYWNpdHksICN1cGRhdGVkQXQnXHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIGNvbnN0IHByb3ZpZGVycyA9IHJlc3VsdC5JdGVtcyB8fCBbXTtcclxuXHJcbiAgICAgIHJldHVybiBwcm92aWRlcnMubWFwKHByb3ZpZGVyID0+ICh7XHJcbiAgICAgICAgcHJvdmlkZXJJZDogcHJvdmlkZXIucHJvdmlkZXJJZCxcclxuICAgICAgICB0b3RhbEJlZHM6IHByb3ZpZGVyLmNhcGFjaXR5LnRvdGFsQmVkcyxcclxuICAgICAgICBhdmFpbGFibGVCZWRzOiBwcm92aWRlci5jYXBhY2l0eS5hdmFpbGFibGVCZWRzLFxyXG4gICAgICAgIGN1cnJlbnRMb2FkOiBwcm92aWRlci5jYXBhY2l0eS5jdXJyZW50TG9hZCxcclxuICAgICAgICBkYWlseVBhdGllbnRDYXBhY2l0eTogcHJvdmlkZXIuY2FwYWNpdHkuZGFpbHlQYXRpZW50Q2FwYWNpdHksXHJcbiAgICAgICAgYXZhaWxhYmlsaXR5U3RhdHVzOiB0aGlzLmRldGVybWluZUF2YWlsYWJpbGl0eVN0YXR1cyhwcm92aWRlci5jYXBhY2l0eS5jdXJyZW50TG9hZCksXHJcbiAgICAgICAgbGFzdFVwZGF0ZWQ6IHByb3ZpZGVyLmNhcGFjaXR5Lmxhc3RVcGRhdGVkIHx8IHByb3ZpZGVyLnVwZGF0ZWRBdFxyXG4gICAgICB9KSk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBnZXR0aW5nIHByb3ZpZGVycyB3aXRoIGxvdyBjYXBhY2l0eTonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGdldCBwcm92aWRlcnMgd2l0aCBsb3cgY2FwYWNpdHknKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENhbGN1bGF0ZSBhdmFpbGFiaWxpdHkgc3RhdHVzIGJhc2VkIG9uIGN1cnJlbnQgbG9hZFxyXG4gICAqL1xyXG4gIHByaXZhdGUgZGV0ZXJtaW5lQXZhaWxhYmlsaXR5U3RhdHVzKGN1cnJlbnRMb2FkOiBudW1iZXIpOiAnYXZhaWxhYmxlJyB8ICdidXN5JyB8ICd1bmF2YWlsYWJsZScge1xyXG4gICAgaWYgKGN1cnJlbnRMb2FkIDwgNzApIHtcclxuICAgICAgcmV0dXJuICdhdmFpbGFibGUnO1xyXG4gICAgfSBlbHNlIGlmIChjdXJyZW50TG9hZCA8IDk1KSB7XHJcbiAgICAgIHJldHVybiAnYnVzeSc7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gJ3VuYXZhaWxhYmxlJztcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBjYXBhY2l0eSBzdGF0aXN0aWNzIGZvciBtb25pdG9yaW5nXHJcbiAgICovXHJcbiAgYXN5bmMgZ2V0Q2FwYWNpdHlTdGF0aXN0aWNzKCk6IFByb21pc2U8e1xyXG4gICAgdG90YWxQcm92aWRlcnM6IG51bWJlcjtcclxuICAgIGF2YWlsYWJsZVByb3ZpZGVyczogbnVtYmVyO1xyXG4gICAgYnVzeVByb3ZpZGVyczogbnVtYmVyO1xyXG4gICAgdW5hdmFpbGFibGVQcm92aWRlcnM6IG51bWJlcjtcclxuICAgIGF2ZXJhZ2VMb2FkOiBudW1iZXI7XHJcbiAgfT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gVGhpcyB3b3VsZCBiZSBtb3JlIGVmZmljaWVudCB3aXRoIGFnZ3JlZ2F0aW9uLCBidXQgRHluYW1vREIgZG9lc24ndCBzdXBwb3J0IGl0IG5hdGl2ZWx5XHJcbiAgICAgIC8vIEluIHByb2R1Y3Rpb24sIGNvbnNpZGVyIHVzaW5nIER5bmFtb0RCIFN0cmVhbXMgd2l0aCBMYW1iZGEgZm9yIHJlYWwtdGltZSBhZ2dyZWdhdGlvblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmR5bmFtb0NsaWVudC5zZW5kKG5ldyBTY2FuQ29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0aGlzLnRhYmxlTmFtZSxcclxuICAgICAgICBGaWx0ZXJFeHByZXNzaW9uOiAnI2lzQWN0aXZlID0gOmlzQWN0aXZlJyxcclxuICAgICAgICBQcm9qZWN0aW9uRXhwcmVzc2lvbjogJ3Byb3ZpZGVySWQsIGNhcGFjaXR5JyxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IHtcclxuICAgICAgICAgICcjaXNBY3RpdmUnOiAnaXNBY3RpdmUnXHJcbiAgICAgICAgfSxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XHJcbiAgICAgICAgICAnOmlzQWN0aXZlJzogJ3RydWUnXHJcbiAgICAgICAgfVxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICBjb25zdCBwcm92aWRlcnMgPSByZXN1bHQuSXRlbXMgfHwgW107XHJcbiAgICAgIGNvbnN0IHRvdGFsUHJvdmlkZXJzID0gcHJvdmlkZXJzLmxlbmd0aDtcclxuXHJcbiAgICAgIGxldCBhdmFpbGFibGVDb3VudCA9IDA7XHJcbiAgICAgIGxldCBidXN5Q291bnQgPSAwO1xyXG4gICAgICBsZXQgdW5hdmFpbGFibGVDb3VudCA9IDA7XHJcbiAgICAgIGxldCB0b3RhbExvYWQgPSAwO1xyXG5cclxuICAgICAgcHJvdmlkZXJzLmZvckVhY2gocHJvdmlkZXIgPT4ge1xyXG4gICAgICAgIGNvbnN0IGxvYWQgPSBwcm92aWRlci5jYXBhY2l0eS5jdXJyZW50TG9hZDtcclxuICAgICAgICB0b3RhbExvYWQgKz0gbG9hZDtcclxuXHJcbiAgICAgICAgY29uc3Qgc3RhdHVzID0gdGhpcy5kZXRlcm1pbmVBdmFpbGFiaWxpdHlTdGF0dXMobG9hZCk7XHJcbiAgICAgICAgc3dpdGNoIChzdGF0dXMpIHtcclxuICAgICAgICAgIGNhc2UgJ2F2YWlsYWJsZSc6XHJcbiAgICAgICAgICAgIGF2YWlsYWJsZUNvdW50Kys7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgY2FzZSAnYnVzeSc6XHJcbiAgICAgICAgICAgIGJ1c3lDb3VudCsrO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIGNhc2UgJ3VuYXZhaWxhYmxlJzpcclxuICAgICAgICAgICAgdW5hdmFpbGFibGVDb3VudCsrO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICB0b3RhbFByb3ZpZGVycyxcclxuICAgICAgICBhdmFpbGFibGVQcm92aWRlcnM6IGF2YWlsYWJsZUNvdW50LFxyXG4gICAgICAgIGJ1c3lQcm92aWRlcnM6IGJ1c3lDb3VudCxcclxuICAgICAgICB1bmF2YWlsYWJsZVByb3ZpZGVyczogdW5hdmFpbGFibGVDb3VudCxcclxuICAgICAgICBhdmVyYWdlTG9hZDogdG90YWxQcm92aWRlcnMgPiAwID8gTWF0aC5yb3VuZCh0b3RhbExvYWQgLyB0b3RhbFByb3ZpZGVycykgOiAwXHJcbiAgICAgIH07XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBnZXR0aW5nIGNhcGFjaXR5IHN0YXRpc3RpY3M6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBnZXQgY2FwYWNpdHkgc3RhdGlzdGljcycpO1xyXG4gICAgfVxyXG4gIH1cclxufSJdfQ==