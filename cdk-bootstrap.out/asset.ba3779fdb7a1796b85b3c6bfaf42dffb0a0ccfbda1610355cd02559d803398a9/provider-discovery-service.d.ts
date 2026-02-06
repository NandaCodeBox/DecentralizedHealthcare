import { Provider, CreateProviderInput, UpdateProviderInput, ProviderSearchCriteria } from '../../types/provider';
export declare class ProviderDiscoveryService {
    private dynamoClient;
    private tableName;
    constructor();
    /**
     * Register a new provider in the network
     */
    registerProvider(input: CreateProviderInput): Promise<Provider>;
    /**
     * Get a provider by ID
     */
    getProvider(providerId: string): Promise<Provider | null>;
    /**
     * Update a provider's information
     */
    updateProvider(providerId: string, input: UpdateProviderInput): Promise<Provider | null>;
    /**
     * List providers with pagination
     */
    listProviders(limit?: number, lastKey?: string): Promise<{
        providers: Provider[];
        lastKey?: string;
    }>;
    /**
     * Search providers based on criteria
     */
    searchProviders(criteria: ProviderSearchCriteria): Promise<Provider[]>;
    private searchByType;
    private searchBySpecialty;
    private searchByLocation;
    private scanWithFilters;
    private applyAdditionalFilters;
    private isLocationFiltered;
}
