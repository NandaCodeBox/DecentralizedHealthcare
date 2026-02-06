// Provider-related types and interfaces

import { 
  Location, 
  QualityMetrics, 
  CostStructure, 
  Availability, 
  Credentials, 
  Capacity, 
  ProviderCapabilities,
  BaseEntity 
} from './common';
import { ProviderType } from './enums';

/**
 * Complete provider record
 */
export interface Provider extends BaseEntity {
  providerId: string; // UUID
  type: ProviderType;
  name: string;
  location: Location;
  capabilities: ProviderCapabilities;
  capacity: Capacity;
  qualityMetrics: QualityMetrics;
  costStructure: CostStructure;
  availability: Availability;
  credentials: Credentials;
  isActive: boolean;
}

/**
 * Provider creation input
 */
export interface CreateProviderInput {
  type: ProviderType;
  name: string;
  location: Location;
  capabilities: ProviderCapabilities;
  capacity: Capacity;
  qualityMetrics: QualityMetrics;
  costStructure: CostStructure;
  availability: Availability;
  credentials: Credentials;
}

/**
 * Provider update input
 */
export interface UpdateProviderInput {
  name?: string;
  location?: Partial<Location>;
  capabilities?: Partial<ProviderCapabilities>;
  capacity?: Partial<Capacity>;
  qualityMetrics?: Partial<QualityMetrics>;
  costStructure?: Partial<CostStructure>;
  availability?: Partial<Availability>;
  credentials?: Partial<Credentials>;
  isActive?: boolean;
}

/**
 * Provider search criteria
 */
export interface ProviderSearchCriteria {
  type?: ProviderType;
  specialties?: string[];
  location?: {
    coordinates: {
      lat: number;
      lng: number;
    };
    maxDistance: number; // in kilometers
  };
  availableNow?: boolean;
  maxCost?: number;
  minRating?: number;
  acceptsInsurance?: string[];
  languages?: string[];
}

/**
 * Provider search result with ranking
 */
export interface ProviderSearchResult {
  provider: Provider;
  distance?: number; // in kilometers
  matchScore: number; // 0-100 scale
  availabilityStatus: 'available' | 'busy' | 'unavailable';
  estimatedWaitTime?: number; // in minutes
}

/**
 * Capacity update input
 */
export interface UpdateCapacityInput {
  providerId: string;
  availableBeds?: number;
  currentLoad: number;
}