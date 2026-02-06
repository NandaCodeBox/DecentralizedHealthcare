import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { Provider, CreateProviderInput, UpdateProviderInput, ProviderSearchCriteria, ProviderSearchResult } from '../../types/provider';
import { validateProvider, validateCreateProviderInput, validateUpdateProviderInput } from '../../validation/provider-validation';
import { calculateDistance } from '../../utils/geo-utils';

export class ProviderDiscoveryService {
  private dynamoClient: DynamoDBDocumentClient;
  private tableName: string;

  constructor() {
    const client = new DynamoDBClient({});
    this.dynamoClient = DynamoDBDocumentClient.from(client);
    this.tableName = process.env.PROVIDER_TABLE_NAME || 'healthcare-providers';
  }

  /**
   * Register a new provider in the network
   */
  async registerProvider(input: CreateProviderInput): Promise<Provider> {
    // Validate input
    const { error } = validateCreateProviderInput(input);
    if (error) {
      throw new Error(`Invalid provider data: ${error.message}`);
    }

    const provider: Provider = {
      providerId: uuidv4(),
      ...input,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Validate complete provider object
    const { error: providerError } = validateProvider(provider);
    if (providerError) {
      throw new Error(`Invalid provider object: ${providerError.message}`);
    }

    try {
      await this.dynamoClient.send(new PutCommand({
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
    } catch (error) {
      console.error('Error registering provider:', error);
      throw new Error('Failed to register provider');
    }
  }

  /**
   * Get a provider by ID
   */
  async getProvider(providerId: string): Promise<Provider | null> {
    try {
      const result = await this.dynamoClient.send(new GetCommand({
        TableName: this.tableName,
        Key: { providerId }
      }));

      return result.Item as Provider || null;
    } catch (error) {
      console.error('Error getting provider:', error);
      throw new Error('Failed to get provider');
    }
  }

  /**
   * Update a provider's information
   */
  async updateProvider(providerId: string, input: UpdateProviderInput): Promise<Provider | null> {
    // Validate input
    const { error } = validateUpdateProviderInput(input);
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
      const updateExpressions: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

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

      const result = await this.dynamoClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: { providerId },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW'
      }));

      console.log(`Provider updated successfully: ${providerId}`);
      return result.Attributes as Provider;
    } catch (error) {
      console.error('Error updating provider:', error);
      throw new Error('Failed to update provider');
    }
  }

  /**
   * List providers with pagination
   */
  async listProviders(limit: number = 50, lastKey?: string): Promise<{ providers: Provider[]; lastKey?: string }> {
    try {
      const params: any = {
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

      const result = await this.dynamoClient.send(new ScanCommand(params));

      return {
        providers: result.Items as Provider[] || [],
        lastKey: result.LastEvaluatedKey?.providerId
      };
    } catch (error) {
      console.error('Error listing providers:', error);
      throw new Error('Failed to list providers');
    }
  }

  /**
   * Search providers based on criteria
   */
  async searchProviders(criteria: ProviderSearchCriteria): Promise<Provider[]> {
    try {
      let providers: Provider[] = [];

      // Use different query strategies based on available criteria
      if (criteria.type) {
        providers = await this.searchByType(criteria);
      } else if (criteria.specialties && criteria.specialties.length > 0) {
        providers = await this.searchBySpecialty(criteria);
      } else if (criteria.location) {
        providers = await this.searchByLocation(criteria);
      } else {
        // Fallback to scan with filters
        providers = await this.scanWithFilters(criteria);
      }

      // Apply additional filters
      providers = this.applyAdditionalFilters(providers, criteria);

      console.log(`Found ${providers.length} providers matching criteria`);
      return providers;
    } catch (error) {
      console.error('Error searching providers:', error);
      throw new Error('Failed to search providers');
    }
  }

  private async searchByType(criteria: ProviderSearchCriteria): Promise<Provider[]> {
    const result = await this.dynamoClient.send(new QueryCommand({
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

    return result.Items as Provider[] || [];
  }

  private async searchBySpecialty(criteria: ProviderSearchCriteria): Promise<Provider[]> {
    const providers: Provider[] = [];

    // Search for each specialty (DynamoDB doesn't support OR conditions in KeyConditionExpression)
    for (const specialty of criteria.specialties!) {
      const result = await this.dynamoClient.send(new QueryCommand({
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

      providers.push(...(result.Items as Provider[] || []));
    }

    // Remove duplicates
    const uniqueProviders = providers.filter((provider, index, self) => 
      index === self.findIndex(p => p.providerId === provider.providerId)
    );

    return uniqueProviders;
  }

  private async searchByLocation(criteria: ProviderSearchCriteria): Promise<Provider[]> {
    // For location-based search, we need to scan and filter by distance
    // In a production system, you might use a geospatial index or service
    const result = await this.dynamoClient.send(new ScanCommand({
      TableName: this.tableName,
      FilterExpression: '#isActive = :isActive',
      ExpressionAttributeNames: {
        '#isActive': 'isActive'
      },
      ExpressionAttributeValues: {
        ':isActive': 'true'
      }
    }));

    const providers = result.Items as Provider[] || [];
    const { coordinates, maxDistance } = criteria.location!;

    return providers.filter(provider => {
      const distance = calculateDistance(
        coordinates.lat,
        coordinates.lng,
        provider.location.coordinates.lat,
        provider.location.coordinates.lng
      );
      return distance <= maxDistance;
    });
  }

  private async scanWithFilters(criteria: ProviderSearchCriteria): Promise<Provider[]> {
    const result = await this.dynamoClient.send(new ScanCommand({
      TableName: this.tableName,
      FilterExpression: '#isActive = :isActive',
      ExpressionAttributeNames: {
        '#isActive': 'isActive'
      },
      ExpressionAttributeValues: {
        ':isActive': 'true'
      }
    }));

    return result.Items as Provider[] || [];
  }

  private applyAdditionalFilters(providers: Provider[], criteria: ProviderSearchCriteria): Provider[] {
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
        const hasMatchingInsurance = criteria.acceptsInsurance.some(insurance =>
          provider.costStructure.insuranceAccepted.includes(insurance)
        );
        if (!hasMatchingInsurance) {
          return false;
        }
      }

      // Filter by languages
      if (criteria.languages && criteria.languages.length > 0) {
        const hasMatchingLanguage = criteria.languages.some(language =>
          provider.capabilities.languages.includes(language)
        );
        if (!hasMatchingLanguage) {
          return false;
        }
      }

      // Filter by location distance (if not already done)
      if (criteria.location && !this.isLocationFiltered(criteria)) {
        const distance = calculateDistance(
          criteria.location.coordinates.lat,
          criteria.location.coordinates.lng,
          provider.location.coordinates.lat,
          provider.location.coordinates.lng
        );
        if (distance > criteria.location.maxDistance) {
          return false;
        }
      }

      return true;
    });
  }

  private isLocationFiltered(criteria: ProviderSearchCriteria): boolean {
    // Check if location filtering was already applied in the query phase
    return !criteria.type && (!criteria.specialties || criteria.specialties.length === 0);
  }
}