import { Provider, ProviderSearchCriteria, ProviderSearchResult } from '../../types/provider';
export declare class ProviderRankingService {
    /**
     * Rank providers based on distance, availability, and preferences
     */
    rankProviders(providers: Provider[], criteria: ProviderSearchCriteria): Promise<ProviderSearchResult[]>;
    /**
     * Calculate match score based on multiple factors
     */
    private calculateMatchScore;
    /**
     * Calculate availability score based on current load and capacity
     */
    private calculateAvailabilityScore;
    /**
     * Calculate specialty match score
     */
    private calculateSpecialtyMatchScore;
    /**
     * Calculate cost score - lower cost gets higher score
     */
    private calculateCostScore;
    /**
     * Calculate insurance compatibility score
     */
    private calculateInsuranceScore;
    /**
     * Calculate language compatibility score
     */
    private calculateLanguageScore;
    /**
     * Determine availability status based on current load
     */
    private determineAvailabilityStatus;
    /**
     * Calculate estimated wait time based on current load and capacity
     */
    private calculateEstimatedWaitTime;
}
