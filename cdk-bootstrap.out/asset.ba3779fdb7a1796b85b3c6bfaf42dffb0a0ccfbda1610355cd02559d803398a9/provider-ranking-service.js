"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderRankingService = void 0;
const geo_utils_1 = require("../../utils/geo-utils");
class ProviderRankingService {
    /**
     * Rank providers based on distance, availability, and preferences
     */
    async rankProviders(providers, criteria) {
        const rankedProviders = providers.map(provider => {
            const result = {
                provider,
                matchScore: this.calculateMatchScore(provider, criteria),
                availabilityStatus: this.determineAvailabilityStatus(provider),
                estimatedWaitTime: this.calculateEstimatedWaitTime(provider)
            };
            // Calculate distance if location criteria is provided
            if (criteria.location) {
                result.distance = (0, geo_utils_1.calculateDistance)(criteria.location.coordinates.lat, criteria.location.coordinates.lng, provider.location.coordinates.lat, provider.location.coordinates.lng);
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
    calculateMatchScore(provider, criteria) {
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
        }
        else {
            score += 15; // Full points if no specialty preference
        }
        maxScore += 15;
        // Cost preference score (0-10 points)
        if (criteria.maxCost) {
            const costScore = this.calculateCostScore(provider, criteria.maxCost);
            score += costScore;
        }
        else {
            score += 10; // Full points if no cost preference
        }
        maxScore += 10;
        // Insurance compatibility score (0-10 points)
        if (criteria.acceptsInsurance && criteria.acceptsInsurance.length > 0) {
            const insuranceScore = this.calculateInsuranceScore(provider, criteria.acceptsInsurance);
            score += insuranceScore;
        }
        else {
            score += 10; // Full points if no insurance preference
        }
        maxScore += 10;
        // Language compatibility score (0-5 points)
        if (criteria.languages && criteria.languages.length > 0) {
            const languageScore = this.calculateLanguageScore(provider, criteria.languages);
            score += languageScore;
        }
        else {
            score += 5; // Full points if no language preference
        }
        maxScore += 5;
        // Distance bonus (0-5 points) - closer providers get higher scores
        if (criteria.location) {
            const distance = (0, geo_utils_1.calculateDistance)(criteria.location.coordinates.lat, criteria.location.coordinates.lng, provider.location.coordinates.lat, provider.location.coordinates.lng);
            const distanceScore = Math.max(0, 5 - (distance / criteria.location.maxDistance) * 5);
            score += distanceScore;
        }
        else {
            score += 5; // Full points if no location preference
        }
        maxScore += 5;
        // Convert to 0-100 scale
        return Math.round((score / maxScore) * 100);
    }
    /**
     * Calculate availability score based on current load and capacity
     */
    calculateAvailabilityScore(provider) {
        const currentLoad = provider.capacity.currentLoad;
        if (currentLoad < 50) {
            return 20; // Excellent availability
        }
        else if (currentLoad < 70) {
            return 15; // Good availability
        }
        else if (currentLoad < 85) {
            return 10; // Moderate availability
        }
        else if (currentLoad < 95) {
            return 5; // Limited availability
        }
        else {
            return 0; // No availability
        }
    }
    /**
     * Calculate specialty match score
     */
    calculateSpecialtyMatchScore(provider, requiredSpecialties) {
        const providerSpecialties = provider.capabilities.specialties.map(s => s.toLowerCase());
        const matchingSpecialties = requiredSpecialties.filter(specialty => providerSpecialties.includes(specialty.toLowerCase()));
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
    calculateCostScore(provider, maxCost) {
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
    calculateInsuranceScore(provider, acceptedInsurance) {
        const providerInsurance = provider.costStructure.insuranceAccepted.map(i => i.toLowerCase());
        const matchingInsurance = acceptedInsurance.filter(insurance => providerInsurance.includes(insurance.toLowerCase()));
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
    calculateLanguageScore(provider, requiredLanguages) {
        const providerLanguages = provider.capabilities.languages.map(l => l.toLowerCase());
        const matchingLanguages = requiredLanguages.filter(language => providerLanguages.includes(language.toLowerCase()));
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
    determineAvailabilityStatus(provider) {
        const currentLoad = provider.capacity.currentLoad;
        if (!provider.isActive) {
            return 'unavailable';
        }
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
     * Calculate estimated wait time based on current load and capacity
     */
    calculateEstimatedWaitTime(provider) {
        const currentLoad = provider.capacity.currentLoad;
        const averageWaitTime = provider.qualityMetrics.averageWaitTime;
        if (!provider.isActive || currentLoad >= 95) {
            return undefined; // No wait time if unavailable
        }
        // Adjust wait time based on current load
        let waitTimeMultiplier = 1;
        if (currentLoad >= 85) {
            waitTimeMultiplier = 2.0; // Double wait time when very busy
        }
        else if (currentLoad >= 70) {
            waitTimeMultiplier = 1.5; // 50% longer wait time when busy
        }
        else if (currentLoad >= 50) {
            waitTimeMultiplier = 1.2; // 20% longer wait time when moderately busy
        }
        return Math.round(averageWaitTime * waitTimeMultiplier);
    }
}
exports.ProviderRankingService = ProviderRankingService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvdmlkZXItcmFua2luZy1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xhbWJkYS9wcm92aWRlci1kaXNjb3ZlcnkvcHJvdmlkZXItcmFua2luZy1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLHFEQUEwRDtBQUUxRCxNQUFhLHNCQUFzQjtJQUNqQzs7T0FFRztJQUNILEtBQUssQ0FBQyxhQUFhLENBQUMsU0FBcUIsRUFBRSxRQUFnQztRQUN6RSxNQUFNLGVBQWUsR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFO1lBQy9DLE1BQU0sTUFBTSxHQUF5QjtnQkFDbkMsUUFBUTtnQkFDUixVQUFVLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUM7Z0JBQ3hELGtCQUFrQixFQUFFLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxRQUFRLENBQUM7Z0JBQzlELGlCQUFpQixFQUFFLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxRQUFRLENBQUM7YUFDN0QsQ0FBQztZQUVGLHNEQUFzRDtZQUN0RCxJQUFJLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDdEIsTUFBTSxDQUFDLFFBQVEsR0FBRyxJQUFBLDZCQUFpQixFQUNqQyxRQUFRLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQ2pDLFFBQVEsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFDakMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUNqQyxRQUFRLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQ2xDLENBQUM7WUFDSixDQUFDO1lBRUQsT0FBTyxNQUFNLENBQUM7UUFDaEIsQ0FBQyxDQUFDLENBQUM7UUFFSCxvRUFBb0U7UUFDcEUsZUFBZSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZ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U0FBUyxDQUFDLENBQUMsOEJBQThCO1FBQ2xELENBQUM7UUFFRCx5Q0FBeUM7UUFDekMsSUFBSSxrQkFBa0IsR0FBRyxDQUFDLENBQUM7UUFFM0IsSUFBSSxXQUFXLElBQUksRUFBRSxFQUFFLENBQUM7WUFDdEIsa0JBQWtCLEdBQUcsR0FBRyxDQUFDLENBQUMsa0NBQWtDO1FBQzlELENBQUM7YUFBTSxJQUFJLFdBQVcsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUM3QixrQkFBa0IsR0FBRyxHQUFHLENBQUMsQ0FBQyxpQ0FBaUM7UUFDN0QsQ0FBQzthQUFNLElBQUksV0FBVyxJQUFJLEVBQUUsRUFBRSxDQUFDO1lBQzdCLGtCQUFrQixHQUFHLEdBQUcsQ0FBQyxDQUFDLDRDQUE0QztRQUN4RSxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsR0FBRyxrQkFBa0IsQ0FBQyxDQUFDO0lBQzFELENBQUM7Q0FDRjtBQTNQRCx3REEyUEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBQcm92aWRlciwgUHJvdmlkZXJTZWFyY2hDcml0ZXJpYSwgUHJvdmlkZXJTZWFyY2hSZXN1bHQgfSBmcm9tICcuLi8uLi90eXBlcy9wcm92aWRlcic7XHJcbmltcG9ydCB7IGNhbGN1bGF0ZURpc3RhbmNlIH0gZnJvbSAnLi4vLi4vdXRpbHMvZ2VvLXV0aWxzJztcclxuXHJcbmV4cG9ydCBjbGFzcyBQcm92aWRlclJhbmtpbmdTZXJ2aWNlIHtcclxuICAvKipcclxuICAgKiBSYW5rIHByb3ZpZGVycyBiYXNlZCBvbiBkaXN0YW5jZSwgYXZhaWxhYmlsaXR5LCBhbmQgcHJlZmVyZW5jZXNcclxuICAgKi9cclxuICBhc3luYyByYW5rUHJvdmlkZXJzKHByb3ZpZGVyczogUHJvdmlkZXJbXSwgY3JpdGVyaWE6IFByb3ZpZGVyU2VhcmNoQ3JpdGVyaWEpOiBQcm9taXNlPFByb3ZpZGVyU2VhcmNoUmVzdWx0W10+IHtcclxuICAgIGNvbnN0IHJhbmtlZFByb3ZpZGVycyA9IHByb3ZpZGVycy5tYXAocHJvdmlkZXIgPT4ge1xyXG4gICAgICBjb25zdCByZXN1bHQ6IFByb3ZpZGVyU2VhcmNoUmVzdWx0ID0ge1xyXG4gICAgICAgIHByb3ZpZGVyLFxyXG4gICAgICAgIG1hdGNoU2NvcmU6IHRoaXMuY2FsY3VsYXRlTWF0Y2hTY29yZShwcm92aWRlciwgY3JpdGVyaWEpLFxyXG4gICAgICAgIGF2YWlsYWJpbGl0eVN0YXR1czogdGhpcy5kZXRlcm1pbmVBdmFpbGFiaWxpdHlTdGF0dXMocHJvdmlkZXIpLFxyXG4gICAgICAgIGVzdGltYXRlZFdhaXRUaW1lOiB0aGlzLmNhbGN1bGF0ZUVzdGltYXRlZFdhaXRUaW1lKHByb3ZpZGVyKVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8gQ2FsY3VsYXRlIGRpc3RhbmNlIGlmIGxvY2F0aW9uIGNyaXRlcmlhIGlzIHByb3ZpZGVkXHJcbiAgICAgIGlmIChjcml0ZXJpYS5sb2NhdGlvbikge1xyXG4gICAgICAgIHJlc3VsdC5kaXN0YW5jZSA9IGNhbGN1bGF0ZURpc3RhbmNlKFxyXG4gICAgICAgICAgY3JpdGVyaWEubG9jYXRpb24uY29vcmRpbmF0ZXMubGF0LFxyXG4gICAgICAgICAgY3JpdGVyaWEubG9jYXRpb24uY29vcmRpbmF0ZXMubG5nLFxyXG4gICAgICAgICAgcHJvdmlkZXIubG9jYXRpb24uY29vcmRpbmF0ZXMubGF0LFxyXG4gICAgICAgICAgcHJvdmlkZXIubG9jYXRpb24uY29vcmRpbmF0ZXMubG5nXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFNvcnQgYnkgbWF0Y2ggc2NvcmUgKGRlc2NlbmRpbmcpIGFuZCB0aGVuIGJ5IGRpc3RhbmNlIChhc2NlbmRpbmcpXHJcbiAgICByYW5rZWRQcm92aWRlcnMuc29ydCgoYSwgYikgPT4ge1xyXG4gICAgICBpZiAoYS5tYXRjaFNjb3JlICE9PSBiLm1hdGNoU2NvcmUpIHtcclxuICAgICAgICByZXR1cm4gYi5tYXRjaFNjb3JlIC0gYS5tYXRjaFNjb3JlO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICBpZiAoYS5kaXN0YW5jZSAhPT0gdW5kZWZpbmVkICYmIGIuZGlzdGFuY2UgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIHJldHVybiBhLmRpc3RhbmNlIC0gYi5kaXN0YW5jZTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgcmV0dXJuIDA7XHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zb2xlLmxvZyhgUmFua2VkICR7cmFua2VkUHJvdmlkZXJzLmxlbmd0aH0gcHJvdmlkZXJzYCk7XHJcbiAgICByZXR1cm4gcmFua2VkUHJvdmlkZXJzO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2FsY3VsYXRlIG1hdGNoIHNjb3JlIGJhc2VkIG9uIG11bHRpcGxlIGZhY3RvcnNcclxuICAgKi9cclxuICBwcml2YXRlIGNhbGN1bGF0ZU1hdGNoU2NvcmUocHJvdmlkZXI6IFByb3ZpZGVyLCBjcml0ZXJpYTogUHJvdmlkZXJTZWFyY2hDcml0ZXJpYSk6IG51bWJlciB7XHJcbiAgICBsZXQgc2NvcmUgPSAwO1xyXG4gICAgbGV0IG1heFNjb3JlID0gMDtcclxuXHJcbiAgICAvLyBCYXNlIHNjb3JlIGZvciBiZWluZyBhY3RpdmVcclxuICAgIGlmIChwcm92aWRlci5pc0FjdGl2ZSkge1xyXG4gICAgICBzY29yZSArPSAxMDtcclxuICAgIH1cclxuICAgIG1heFNjb3JlICs9IDEwO1xyXG5cclxuICAgIC8vIFF1YWxpdHkgcmF0aW5nIHNjb3JlICgwLTI1IHBvaW50cylcclxuICAgIHNjb3JlICs9IChwcm92aWRlci5xdWFsaXR5TWV0cmljcy5yYXRpbmcgLyA1KSAqIDI1O1xyXG4gICAgbWF4U2NvcmUgKz0gMjU7XHJcblxyXG4gICAgLy8gQXZhaWxhYmlsaXR5IHNjb3JlICgwLTIwIHBvaW50cylcclxuICAgIGNvbnN0IGF2YWlsYWJpbGl0eVNjb3JlID0gdGhpcy5jYWxjdWxhdGVBdmFpbGFiaWxpdHlTY29yZShwcm92aWRlcik7XHJcbiAgICBzY29yZSArPSBhdmFpbGFiaWxpdHlTY29yZTtcclxuICAgIG1heFNjb3JlICs9IDIwO1xyXG5cclxuICAgIC8vIFNwZWNpYWx0eSBtYXRjaCBzY29yZSAoMC0xNSBwb2ludHMpXHJcbiAgICBpZiAoY3JpdGVyaWEuc3BlY2lhbHRpZXMgJiYgY3JpdGVyaWEuc3BlY2lhbHRpZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICBjb25zdCBzcGVjaWFsdHlTY29yZSA9IHRoaXMuY2FsY3VsYXRlU3BlY2lhbHR5TWF0Y2hTY29yZShwcm92aWRlciwgY3JpdGVyaWEuc3BlY2lhbHRpZXMpO1xyXG4gICAgICBzY29yZSArPSBzcGVjaWFsdHlTY29yZTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHNjb3JlICs9IDE1OyAvLyBGdWxsIHBvaW50cyBpZiBubyBzcGVjaWFsdHkgcHJlZmVyZW5jZVxyXG4gICAgfVxyXG4gICAgbWF4U2NvcmUgKz0gMTU7XHJcblxyXG4gICAgLy8gQ29zdCBwcmVmZXJlbmNlIHNjb3JlICgwLTEwIHBvaW50cylcclxuICAgIGlmIChjcml0ZXJpYS5tYXhDb3N0KSB7XHJcbiAgICAgIGNvbnN0IGNvc3RTY29yZSA9IHRoaXMuY2FsY3VsYXRlQ29zdFNjb3JlKHByb3ZpZGVyLCBjcml0ZXJpYS5tYXhDb3N0KTtcclxuICAgICAgc2NvcmUgKz0gY29zdFNjb3JlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgc2NvcmUgKz0gMTA7IC8vIEZ1bGwgcG9pbnRzIGlmIG5vIGNvc3QgcHJlZmVyZW5jZVxyXG4gICAgfVxyXG4gICAgbWF4U2NvcmUgKz0gMTA7XHJcblxyXG4gICAgLy8gSW5zdXJhbmNlIGNvbXBhdGliaWxpdHkgc2NvcmUgKDAtMTAgcG9pbnRzKVxyXG4gICAgaWYgKGNyaXRlcmlhLmFjY2VwdHNJbnN1cmFuY2UgJiYgY3JpdGVyaWEuYWNjZXB0c0luc3VyYW5jZS5sZW5ndGggPiAwKSB7XHJcbiAgICAgIGNvbnN0IGluc3VyYW5jZVNjb3JlID0gdGhpcy5jYWxjdWxhdGVJbnN1cmFuY2VTY29yZShwcm92aWRlciwgY3JpdGVyaWEuYWNjZXB0c0luc3VyYW5jZSk7XHJcbiAgICAgIHNjb3JlICs9IGluc3VyYW5jZVNjb3JlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgc2NvcmUgKz0gMTA7IC8vIEZ1bGwgcG9pbnRzIGlmIG5vIGluc3VyYW5jZSBwcmVmZXJlbmNlXHJcbiAgICB9XHJcbiAgICBtYXhTY29yZSArPSAxMDtcclxuXHJcbiAgICAvLyBMYW5ndWFnZSBjb21wYXRpYmlsaXR5IHNjb3JlICgwLTUgcG9pbnRzKVxyXG4gICAgaWYgKGNyaXRlcmlhLmxhbmd1YWdlcyAmJiBjcml0ZXJpYS5sYW5ndWFnZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICBjb25zdCBsYW5ndWFnZVNjb3JlID0gdGhpcy5jYWxjdWxhdGVMYW5ndWFnZVNjb3JlKHByb3ZpZGVyLCBjcml0ZXJpYS5sYW5ndWFnZXMpO1xyXG4gICAgICBzY29yZSArPSBsYW5ndWFnZVNjb3JlO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgc2NvcmUgKz0gNTsgLy8gRnVsbCBwb2ludHMgaWYgbm8gbGFuZ3VhZ2UgcHJlZmVyZW5jZVxyXG4gICAgfVxyXG4gICAgbWF4U2NvcmUgKz0gNTtcclxuXHJcbiAgICAvLyBEaXN0YW5jZSBib251cyAoMC01IHBvaW50cykgLSBjbG9zZXIgcHJvdmlkZXJzIGdldCBoaWdoZXIgc2NvcmVzXHJcbiAgICBpZiAoY3JpdGVyaWEubG9jYXRpb24pIHtcclxuICAgICAgY29uc3QgZGlzdGFuY2UgPSBjYWxjdWxhdGVEaXN0YW5jZShcclxuICAgICAgICBjcml0ZXJpYS5sb2NhdGlvbi5jb29yZGluYXRlcy5sYXQsXHJcbiAgICAgICAgY3JpdGVyaWEubG9jYXRpb24uY29vcmRpbmF0ZXMubG5nLFxyXG4gICAgICAgIHByb3ZpZGVyLmxvY2F0aW9uLmNvb3JkaW5hdGVzLmxhdCxcclxuICAgICAgICBwcm92aWRlci5sb2NhdGlvbi5jb29yZGluYXRlcy5sbmdcclxuICAgICAgKTtcclxuICAgICAgY29uc3QgZGlzdGFuY2VTY29yZSA9IE1hdGgubWF4KDAsIDUgLSAoZGlzdGFuY2UgLyBjcml0ZXJpYS5sb2NhdGlvbi5tYXhEaXN0YW5jZSkgKiA1KTtcclxuICAgICAgc2NvcmUgKz0gZGlzdGFuY2VTY29yZTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHNjb3JlICs9IDU7IC8vIEZ1bGwgcG9pbnRzIGlmIG5vIGxvY2F0aW9uIHByZWZlcmVuY2VcclxuICAgIH1cclxuICAgIG1heFNjb3JlICs9IDU7XHJcblxyXG4gICAgLy8gQ29udmVydCB0byAwLTEwMCBzY2FsZVxyXG4gICAgcmV0dXJuIE1hdGgucm91bmQoKHNjb3JlIC8gbWF4U2NvcmUpICogMTAwKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENhbGN1bGF0ZSBhdmFpbGFiaWxpdHkgc2NvcmUgYmFzZWQgb24gY3VycmVudCBsb2FkIGFuZCBjYXBhY2l0eVxyXG4gICAqL1xyXG4gIHByaXZhdGUgY2FsY3VsYXRlQXZhaWxhYmlsaXR5U2NvcmUocHJvdmlkZXI6IFByb3ZpZGVyKTogbnVtYmVyIHtcclxuICAgIGNvbnN0IGN1cnJlbnRMb2FkID0gcHJvdmlkZXIuY2FwYWNpdHkuY3VycmVudExvYWQ7XHJcbiAgICBcclxuICAgIGlmIChjdXJyZW50TG9hZCA8IDUwKSB7XHJcbiAgICAgIHJldHVybiAyMDsgLy8gRXhjZWxsZW50IGF2YWlsYWJpbGl0eVxyXG4gICAgfSBlbHNlIGlmIChjdXJyZW50TG9hZCA8IDcwKSB7XHJcbiAgICAgIHJldHVybiAxNTsgLy8gR29vZCBhdmFpbGFiaWxpdHlcclxuICAgIH0gZWxzZSBpZiAoY3VycmVudExvYWQgPCA4NSkge1xyXG4gICAgICByZXR1cm4gMTA7IC8vIE1vZGVyYXRlIGF2YWlsYWJpbGl0eVxyXG4gICAgfSBlbHNlIGlmIChjdXJyZW50TG9hZCA8IDk1KSB7XHJcbiAgICAgIHJldHVybiA1OyAvLyBMaW1pdGVkIGF2YWlsYWJpbGl0eVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIDA7IC8vIE5vIGF2YWlsYWJpbGl0eVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2FsY3VsYXRlIHNwZWNpYWx0eSBtYXRjaCBzY29yZVxyXG4gICAqL1xyXG4gIHByaXZhdGUgY2FsY3VsYXRlU3BlY2lhbHR5TWF0Y2hTY29yZShwcm92aWRlcjogUHJvdmlkZXIsIHJlcXVpcmVkU3BlY2lhbHRpZXM6IHN0cmluZ1tdKTogbnVtYmVyIHtcclxuICAgIGNvbnN0IHByb3ZpZGVyU3BlY2lhbHRpZXMgPSBwcm92aWRlci5jYXBhYmlsaXRpZXMuc3BlY2lhbHRpZXMubWFwKHMgPT4gcy50b0xvd2VyQ2FzZSgpKTtcclxuICAgIGNvbnN0IG1hdGNoaW5nU3BlY2lhbHRpZXMgPSByZXF1aXJlZFNwZWNpYWx0aWVzLmZpbHRlcihzcGVjaWFsdHkgPT5cclxuICAgICAgcHJvdmlkZXJTcGVjaWFsdGllcy5pbmNsdWRlcyhzcGVjaWFsdHkudG9Mb3dlckNhc2UoKSlcclxuICAgICk7XHJcblxyXG4gICAgaWYgKG1hdGNoaW5nU3BlY2lhbHRpZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIHJldHVybiAwO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFNjb3JlIGJhc2VkIG9uIHBlcmNlbnRhZ2Ugb2YgbWF0Y2hpbmcgc3BlY2lhbHRpZXNcclxuICAgIGNvbnN0IG1hdGNoUGVyY2VudGFnZSA9IG1hdGNoaW5nU3BlY2lhbHRpZXMubGVuZ3RoIC8gcmVxdWlyZWRTcGVjaWFsdGllcy5sZW5ndGg7XHJcbiAgICByZXR1cm4gTWF0aC5yb3VuZChtYXRjaFBlcmNlbnRhZ2UgKiAxNSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDYWxjdWxhdGUgY29zdCBzY29yZSAtIGxvd2VyIGNvc3QgZ2V0cyBoaWdoZXIgc2NvcmVcclxuICAgKi9cclxuICBwcml2YXRlIGNhbGN1bGF0ZUNvc3RTY29yZShwcm92aWRlcjogUHJvdmlkZXIsIG1heENvc3Q6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICBjb25zdCBwcm92aWRlckNvc3QgPSBwcm92aWRlci5jb3N0U3RydWN0dXJlLmNvbnN1bHRhdGlvbkZlZTtcclxuICAgIFxyXG4gICAgaWYgKHByb3ZpZGVyQ29zdCA+IG1heENvc3QpIHtcclxuICAgICAgcmV0dXJuIDA7IC8vIE92ZXIgYnVkZ2V0XHJcbiAgICB9XHJcblxyXG4gICAgLy8gSGlnaGVyIHNjb3JlIGZvciBsb3dlciBjb3N0IHJlbGF0aXZlIHRvIG1heCBidWRnZXRcclxuICAgIGNvbnN0IGNvc3RSYXRpbyA9IHByb3ZpZGVyQ29zdCAvIG1heENvc3Q7XHJcbiAgICByZXR1cm4gTWF0aC5yb3VuZCgoMSAtIGNvc3RSYXRpbykgKiAxMCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDYWxjdWxhdGUgaW5zdXJhbmNlIGNvbXBhdGliaWxpdHkgc2NvcmVcclxuICAgKi9cclxuICBwcml2YXRlIGNhbGN1bGF0ZUluc3VyYW5jZVNjb3JlKHByb3ZpZGVyOiBQcm92aWRlciwgYWNjZXB0ZWRJbnN1cmFuY2U6IHN0cmluZ1tdKTogbnVtYmVyIHtcclxuICAgIGNvbnN0IHByb3ZpZGVySW5zdXJhbmNlID0gcHJvdmlkZXIuY29zdFN0cnVjdHVyZS5pbnN1cmFuY2VBY2NlcHRlZC5tYXAoaSA9PiBpLnRvTG93ZXJDYXNlKCkpO1xyXG4gICAgY29uc3QgbWF0Y2hpbmdJbnN1cmFuY2UgPSBhY2NlcHRlZEluc3VyYW5jZS5maWx0ZXIoaW5zdXJhbmNlID0+XHJcbiAgICAgIHByb3ZpZGVySW5zdXJhbmNlLmluY2x1ZGVzKGluc3VyYW5jZS50b0xvd2VyQ2FzZSgpKVxyXG4gICAgKTtcclxuXHJcbiAgICBpZiAobWF0Y2hpbmdJbnN1cmFuY2UubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIHJldHVybiAwO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFNjb3JlIGJhc2VkIG9uIHBlcmNlbnRhZ2Ugb2YgbWF0Y2hpbmcgaW5zdXJhbmNlIHByb3ZpZGVyc1xyXG4gICAgY29uc3QgbWF0Y2hQZXJjZW50YWdlID0gbWF0Y2hpbmdJbnN1cmFuY2UubGVuZ3RoIC8gYWNjZXB0ZWRJbnN1cmFuY2UubGVuZ3RoO1xyXG4gICAgcmV0dXJuIE1hdGgucm91bmQobWF0Y2hQZXJjZW50YWdlICogMTApO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2FsY3VsYXRlIGxhbmd1YWdlIGNvbXBhdGliaWxpdHkgc2NvcmVcclxuICAgKi9cclxuICBwcml2YXRlIGNhbGN1bGF0ZUxhbmd1YWdlU2NvcmUocHJvdmlkZXI6IFByb3ZpZGVyLCByZXF1aXJlZExhbmd1YWdlczogc3RyaW5nW10pOiBudW1iZXIge1xyXG4gICAgY29uc3QgcHJvdmlkZXJMYW5ndWFnZXMgPSBwcm92aWRlci5jYXBhYmlsaXRpZXMubGFuZ3VhZ2VzLm1hcChsID0+IGwudG9Mb3dlckNhc2UoKSk7XHJcbiAgICBjb25zdCBtYXRjaGluZ0xhbmd1YWdlcyA9IHJlcXVpcmVkTGFuZ3VhZ2VzLmZpbHRlcihsYW5ndWFnZSA9PlxyXG4gICAgICBwcm92aWRlckxhbmd1YWdlcy5pbmNsdWRlcyhsYW5ndWFnZS50b0xvd2VyQ2FzZSgpKVxyXG4gICAgKTtcclxuXHJcbiAgICBpZiAobWF0Y2hpbmdMYW5ndWFnZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgIHJldHVybiAwO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFNjb3JlIGJhc2VkIG9uIHBlcmNlbnRhZ2Ugb2YgbWF0Y2hpbmcgbGFuZ3VhZ2VzXHJcbiAgICBjb25zdCBtYXRjaFBlcmNlbnRhZ2UgPSBtYXRjaGluZ0xhbmd1YWdlcy5sZW5ndGggLyByZXF1aXJlZExhbmd1YWdlcy5sZW5ndGg7XHJcbiAgICByZXR1cm4gTWF0aC5yb3VuZChtYXRjaFBlcmNlbnRhZ2UgKiA1KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIERldGVybWluZSBhdmFpbGFiaWxpdHkgc3RhdHVzIGJhc2VkIG9uIGN1cnJlbnQgbG9hZFxyXG4gICAqL1xyXG4gIHByaXZhdGUgZGV0ZXJtaW5lQXZhaWxhYmlsaXR5U3RhdHVzKHByb3ZpZGVyOiBQcm92aWRlcik6ICdhdmFpbGFibGUnIHwgJ2J1c3knIHwgJ3VuYXZhaWxhYmxlJyB7XHJcbiAgICBjb25zdCBjdXJyZW50TG9hZCA9IHByb3ZpZGVyLmNhcGFjaXR5LmN1cnJlbnRMb2FkO1xyXG4gICAgXHJcbiAgICBpZiAoIXByb3ZpZGVyLmlzQWN0aXZlKSB7XHJcbiAgICAgIHJldHVybiAndW5hdmFpbGFibGUnO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChjdXJyZW50TG9hZCA8IDcwKSB7XHJcbiAgICAgIHJldHVybiAnYXZhaWxhYmxlJztcclxuICAgIH0gZWxzZSBpZiAoY3VycmVudExvYWQgPCA5NSkge1xyXG4gICAgICByZXR1cm4gJ2J1c3knO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuICd1bmF2YWlsYWJsZSc7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDYWxjdWxhdGUgZXN0aW1hdGVkIHdhaXQgdGltZSBiYXNlZCBvbiBjdXJyZW50IGxvYWQgYW5kIGNhcGFjaXR5XHJcbiAgICovXHJcbiAgcHJpdmF0ZSBjYWxjdWxhdGVFc3RpbWF0ZWRXYWl0VGltZShwcm92aWRlcjogUHJvdmlkZXIpOiBudW1iZXIgfCB1bmRlZmluZWQge1xyXG4gICAgY29uc3QgY3VycmVudExvYWQgPSBwcm92aWRlci5jYXBhY2l0eS5jdXJyZW50TG9hZDtcclxuICAgIGNvbnN0IGF2ZXJhZ2VXYWl0VGltZSA9IHByb3ZpZGVyLnF1YWxpdHlNZXRyaWNzLmF2ZXJhZ2VXYWl0VGltZTtcclxuXHJcbiAgICBpZiAoIXByb3ZpZGVyLmlzQWN0aXZlIHx8IGN1cnJlbnRMb2FkID49IDk1KSB7XHJcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7IC8vIE5vIHdhaXQgdGltZSBpZiB1bmF2YWlsYWJsZVxyXG4gICAgfVxyXG5cclxuICAgIC8vIEFkanVzdCB3YWl0IHRpbWUgYmFzZWQgb24gY3VycmVudCBsb2FkXHJcbiAgICBsZXQgd2FpdFRpbWVNdWx0aXBsaWVyID0gMTtcclxuICAgIFxyXG4gICAgaWYgKGN1cnJlbnRMb2FkID49IDg1KSB7XHJcbiAgICAgIHdhaXRUaW1lTXVsdGlwbGllciA9IDIuMDsgLy8gRG91YmxlIHdhaXQgdGltZSB3aGVuIHZlcnkgYnVzeVxyXG4gICAgfSBlbHNlIGlmIChjdXJyZW50TG9hZCA+PSA3MCkge1xyXG4gICAgICB3YWl0VGltZU11bHRpcGxpZXIgPSAxLjU7IC8vIDUwJSBsb25nZXIgd2FpdCB0aW1lIHdoZW4gYnVzeVxyXG4gICAgfSBlbHNlIGlmIChjdXJyZW50TG9hZCA+PSA1MCkge1xyXG4gICAgICB3YWl0VGltZU11bHRpcGxpZXIgPSAxLjI7IC8vIDIwJSBsb25nZXIgd2FpdCB0aW1lIHdoZW4gbW9kZXJhdGVseSBidXN5XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIE1hdGgucm91bmQoYXZlcmFnZVdhaXRUaW1lICogd2FpdFRpbWVNdWx0aXBsaWVyKTtcclxuICB9XHJcbn0iXX0=