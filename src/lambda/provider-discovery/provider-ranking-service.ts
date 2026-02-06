import { Provider, ProviderSearchCriteria, ProviderSearchResult } from '../../types/provider';
import { calculateDistance } from '../../utils/geo-utils';

export class ProviderRankingService {
  /**
   * Rank providers based on distance, availability, and preferences
   */
  async rankProviders(providers: Provider[], criteria: ProviderSearchCriteria): Promise<ProviderSearchResult[]> {
    const rankedProviders = providers.map(provider => {
      const result: ProviderSearchResult = {
        provider,
        matchScore: this.calculateMatchScore(provider, criteria),
        availabilityStatus: this.determineAvailabilityStatus(provider),
        estimatedWaitTime: this.calculateEstimatedWaitTime(provider)
      };

      // Calculate distance if location criteria is provided
      if (criteria.location) {
        result.distance = calculateDistance(
          criteria.location.coordinates.lat,
          criteria.location.coordinates.lng,
          provider.location.coordinates.lat,
          provider.location.coordinates.lng
        );
      }

      return result;
    });

    // Sort by match score (descending) and then by distance (ascending)
    rankedProviders.sort((a, b) => {
      if (a.matchScore !== b.matchScore) {
        return b.matchScore - a.matchScore;
      }
      
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      
      return 0;
    });

    console.log(`Ranked ${rankedProviders.length} providers`);
    return rankedProviders;
  }

  /**
   * Calculate match score based on multiple factors
   */
  private calculateMatchScore(provider: Provider, criteria: ProviderSearchCriteria): number {
    let score = 0;
    let maxScore = 0;

    // Base score for being active
    if (provider.isActive) {
      score += 10;
    }
    maxScore += 10;

    // Quality rating score (0-25 points)
    score += (provider.qualityMetrics.rating / 5) * 25;
    maxScore += 25;

    // Availability score (0-20 points)
    const availabilityScore = this.calculateAvailabilityScore(provider);
    score += availabilityScore;
    maxScore += 20;

    // Specialty match score (0-15 points)
    if (criteria.specialties && criteria.specialties.length > 0) {
      const specialtyScore = this.calculateSpecialtyMatchScore(provider, criteria.specialties);
      score += specialtyScore;
    } else {
      score += 15; // Full points if no specialty preference
    }
    maxScore += 15;

    // Cost preference score (0-10 points)
    if (criteria.maxCost) {
      const costScore = this.calculateCostScore(provider, criteria.maxCost);
      score += costScore;
    } else {
      score += 10; // Full points if no cost preference
    }
    maxScore += 10;

    // Insurance compatibility score (0-10 points)
    if (criteria.acceptsInsurance && criteria.acceptsInsurance.length > 0) {
      const insuranceScore = this.calculateInsuranceScore(provider, criteria.acceptsInsurance);
      score += insuranceScore;
    } else {
      score += 10; // Full points if no insurance preference
    }
    maxScore += 10;

    // Language compatibility score (0-5 points)
    if (criteria.languages && criteria.languages.length > 0) {
      const languageScore = this.calculateLanguageScore(provider, criteria.languages);
      score += languageScore;
    } else {
      score += 5; // Full points if no language preference
    }
    maxScore += 5;

    // Distance bonus (0-5 points) - closer providers get higher scores
    if (criteria.location) {
      const distance = calculateDistance(
        criteria.location.coordinates.lat,
        criteria.location.coordinates.lng,
        provider.location.coordinates.lat,
        provider.location.coordinates.lng
      );
      const distanceScore = Math.max(0, 5 - (distance / criteria.location.maxDistance) * 5);
      score += distanceScore;
    } else {
      score += 5; // Full points if no location preference
    }
    maxScore += 5;

    // Convert to 0-100 scale
    return Math.round((score / maxScore) * 100);
  }

  /**
   * Calculate availability score based on current load and capacity
   */
  private calculateAvailabilityScore(provider: Provider): number {
    const currentLoad = provider.capacity.currentLoad;
    
    if (currentLoad < 50) {
      return 20; // Excellent availability
    } else if (currentLoad < 70) {
      return 15; // Good availability
    } else if (currentLoad < 85) {
      return 10; // Moderate availability
    } else if (currentLoad < 95) {
      return 5; // Limited availability
    } else {
      return 0; // No availability
    }
  }

  /**
   * Calculate specialty match score
   */
  private calculateSpecialtyMatchScore(provider: Provider, requiredSpecialties: string[]): number {
    const providerSpecialties = provider.capabilities.specialties.map(s => s.toLowerCase());
    const matchingSpecialties = requiredSpecialties.filter(specialty =>
      providerSpecialties.includes(specialty.toLowerCase())
    );

    if (matchingSpecialties.length === 0) {
      return 0;
    }

    // Score based on percentage of matching specialties
    const matchPercentage = matchingSpecialties.length / requiredSpecialties.length;
    return Math.round(matchPercentage * 15);
  }

  /**
   * Calculate cost score - lower cost gets higher score
   */
  private calculateCostScore(provider: Provider, maxCost: number): number {
    const providerCost = provider.costStructure.consultationFee;
    
    if (providerCost > maxCost) {
      return 0; // Over budget
    }

    // Higher score for lower cost relative to max budget
    const costRatio = providerCost / maxCost;
    return Math.round((1 - costRatio) * 10);
  }

  /**
   * Calculate insurance compatibility score
   */
  private calculateInsuranceScore(provider: Provider, acceptedInsurance: string[]): number {
    const providerInsurance = provider.costStructure.insuranceAccepted.map(i => i.toLowerCase());
    const matchingInsurance = acceptedInsurance.filter(insurance =>
      providerInsurance.includes(insurance.toLowerCase())
    );

    if (matchingInsurance.length === 0) {
      return 0;
    }

    // Score based on percentage of matching insurance providers
    const matchPercentage = matchingInsurance.length / acceptedInsurance.length;
    return Math.round(matchPercentage * 10);
  }

  /**
   * Calculate language compatibility score
   */
  private calculateLanguageScore(provider: Provider, requiredLanguages: string[]): number {
    const providerLanguages = provider.capabilities.languages.map(l => l.toLowerCase());
    const matchingLanguages = requiredLanguages.filter(language =>
      providerLanguages.includes(language.toLowerCase())
    );

    if (matchingLanguages.length === 0) {
      return 0;
    }

    // Score based on percentage of matching languages
    const matchPercentage = matchingLanguages.length / requiredLanguages.length;
    return Math.round(matchPercentage * 5);
  }

  /**
   * Determine availability status based on current load
   */
  private determineAvailabilityStatus(provider: Provider): 'available' | 'busy' | 'unavailable' {
    const currentLoad = provider.capacity.currentLoad;
    
    if (!provider.isActive) {
      return 'unavailable';
    }

    if (currentLoad < 70) {
      return 'available';
    } else if (currentLoad < 95) {
      return 'busy';
    } else {
      return 'unavailable';
    }
  }

  /**
   * Calculate estimated wait time based on current load and capacity
   */
  private calculateEstimatedWaitTime(provider: Provider): number | undefined {
    const currentLoad = provider.capacity.currentLoad;
    const averageWaitTime = provider.qualityMetrics.averageWaitTime;

    if (!provider.isActive || currentLoad >= 95) {
      return undefined; // No wait time if unavailable
    }

    // Adjust wait time based on current load
    let waitTimeMultiplier = 1;
    
    if (currentLoad >= 85) {
      waitTimeMultiplier = 2.0; // Double wait time when very busy
    } else if (currentLoad >= 70) {
      waitTimeMultiplier = 1.5; // 50% longer wait time when busy
    } else if (currentLoad >= 50) {
      waitTimeMultiplier = 1.2; // 20% longer wait time when moderately busy
    }

    return Math.round(averageWaitTime * waitTimeMultiplier);
  }
}