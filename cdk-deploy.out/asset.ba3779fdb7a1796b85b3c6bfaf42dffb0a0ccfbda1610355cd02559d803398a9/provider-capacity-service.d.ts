import { UpdateCapacityInput } from '../../types/provider';
export interface CapacityInfo {
    providerId: string;
    totalBeds: number;
    availableBeds: number;
    currentLoad: number;
    dailyPatientCapacity: number;
    availabilityStatus: 'available' | 'busy' | 'unavailable';
    lastUpdated: string;
}
export declare class ProviderCapacityService {
    private dynamoClient;
    private tableName;
    constructor();
    /**
     * Update provider capacity in real-time
     */
    updateCapacity(input: UpdateCapacityInput): Promise<void>;
    /**
     * Check capacity for multiple providers
     */
    checkCapacity(providerIds: string[]): Promise<CapacityInfo[]>;
    /**
     * Check capacity for a single batch of providers
     */
    private checkCapacityBatch;
    /**
     * Get real-time capacity for a single provider
     */
    getProviderCapacity(providerId: string): Promise<CapacityInfo | null>;
    /**
     * Update multiple providers' capacity in batch
     */
    batchUpdateCapacity(updates: UpdateCapacityInput[]): Promise<void>;
    /**
     * Get providers with low capacity (for alerting)
     */
    getProvidersWithLowCapacity(threshold?: number): Promise<CapacityInfo[]>;
    /**
     * Calculate availability status based on current load
     */
    private determineAvailabilityStatus;
    /**
     * Get capacity statistics for monitoring
     */
    getCapacityStatistics(): Promise<{
        totalProviders: number;
        availableProviders: number;
        busyProviders: number;
        unavailableProviders: number;
        averageLoad: number;
    }>;
}
