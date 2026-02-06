import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, BatchGetCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { UpdateCapacityInput } from '../../types/provider';
import { validateUpdateCapacityInput } from '../../validation/provider-validation';

export interface CapacityInfo {
  providerId: string;
  totalBeds: number;
  availableBeds: number;
  currentLoad: number;
  dailyPatientCapacity: number;
  availabilityStatus: 'available' | 'busy' | 'unavailable';
  lastUpdated: string;
}

export class ProviderCapacityService {
  private dynamoClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const client = new DynamoDBClient({});
    this.dynamoClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.PROVIDER_TABLE_NAME || 'healthcare-providers';
  }

  /**
   * Update provider capacity in real-time
   */
  async updateCapacity(input: UpdateCapacityInput): Promise<void> {
    // Validate input
    const { error } = validateUpdateCapacityInput(input);
    if (error) {
      throw new Error(`Invalid capacity update data: ${error.message}`);
    }

    try {
      const updateExpressions: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

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

      await this.dynamoClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: { providerId: input.providerId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ConditionExpression: 'attribute_exists(providerId)' // Ensure provider exists
      }));

      console.log(`Capacity updated for provider: ${input.providerId}`);
    } catch (error: any) {
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
  async checkCapacity(providerIds: string[]): Promise<CapacityInfo[]> {
    try {
      if (providerIds.length === 0) {
        return [];
      }

      // Batch get providers (DynamoDB limits batch size to 100)
      const batchSize = 100;
      const capacityInfos: CapacityInfo[] = [];

      for (let i = 0; i < providerIds.length; i += batchSize) {
        const batch = providerIds.slice(i, i + batchSize);
        const batchCapacityInfos = await this.checkCapacityBatch(batch);
        capacityInfos.push(...batchCapacityInfos);
      }

      return capacityInfos;
    } catch (error) {
      console.error('Error checking provider capacity:', error);
      throw new Error('Failed to check provider capacity');
    }
  }

  /**
   * Check capacity for a single batch of providers
   */
  private async checkCapacityBatch(providerIds: string[]): Promise<CapacityInfo[]> {
    const keys = providerIds.map(id => ({ providerId: id }));

    const result = await this.dynamoClient.send(new BatchGetCommand({
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
  async getProviderCapacity(providerId: string): Promise<CapacityInfo | null> {
    try {
      const result = await this.dynamoClient.send(new GetCommand({
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
    } catch (error) {
      console.error('Error getting provider capacity:', error);
      throw new Error('Failed to get provider capacity');
    }
  }

  /**
   * Update multiple providers' capacity in batch
   */
  async batchUpdateCapacity(updates: UpdateCapacityInput[]): Promise<void> {
    try {
      // Process updates in parallel with concurrency limit
      const concurrencyLimit = 10;
      const promises: Promise<void>[] = [];

      for (let i = 0; i < updates.length; i += concurrencyLimit) {
        const batch = updates.slice(i, i + concurrencyLimit);
        const batchPromises = batch.map(update => this.updateCapacity(update));
        promises.push(...batchPromises);
      }

      await Promise.all(promises);
      console.log(`Batch updated capacity for ${updates.length} providers`);
    } catch (error) {
      console.error('Error in batch capacity update:', error);
      throw new Error('Failed to batch update provider capacity');
    }
  }

  /**
   * Get providers with low capacity (for alerting)
   */
  async getProvidersWithLowCapacity(threshold: number = 90): Promise<CapacityInfo[]> {
    try {
      // Use the CapacityIndex GSI to find providers with high load
      const result = await this.dynamoClient.send(new QueryCommand({
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
    } catch (error) {
      console.error('Error getting providers with low capacity:', error);
      throw new Error('Failed to get providers with low capacity');
    }
  }

  /**
   * Calculate availability status based on current load
   */
  private determineAvailabilityStatus(currentLoad: number): 'available' | 'busy' | 'unavailable' {
    if (currentLoad < 70) {
      return 'available';
    } else if (currentLoad < 95) {
      return 'busy';
    } else {
      return 'unavailable';
    }
  }

  /**
   * Get capacity statistics for monitoring
   */
  async getCapacityStatistics(): Promise<{
    totalProviders: number;
    availableProviders: number;
    busyProviders: number;
    unavailableProviders: number;
    averageLoad: number;
  }> {
    try {
      // This would be more efficient with aggregation, but DynamoDB doesn't support it natively
      // In production, consider using DynamoDB Streams with Lambda for real-time aggregation
      const result = await this.dynamoClient.send(new ScanCommand({
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
    } catch (error) {
      console.error('Error getting capacity statistics:', error);
      throw new Error('Failed to get capacity statistics');
    }
  }
}