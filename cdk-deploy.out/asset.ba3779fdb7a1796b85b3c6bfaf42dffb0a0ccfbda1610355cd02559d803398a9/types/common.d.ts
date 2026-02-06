/**
 * Geographic location information
 */
export interface Location {
    state: string;
    district: string;
    pincode: string;
    coordinates: {
        lat: number;
        lng: number;
    };
}
/**
 * Insurance information
 */
export interface InsuranceInfo {
    provider: string;
    policyNumber: string;
    coverage: {
        maxAmount: number;
        deductible: number;
        copayPercentage: number;
        coveredServices: string[];
    };
}
/**
 * Medical history information
 */
export interface MedicalHistory {
    conditions: string[];
    medications: string[];
    allergies: string[];
    lastVisit?: Date;
}
/**
 * Patient preferences
 */
export interface PatientPreferences {
    providerGender?: string;
    maxTravelDistance: number;
    costSensitivity: string;
    preferredLanguage: string;
}
/**
 * Quality metrics for providers
 */
export interface QualityMetrics {
    rating: number;
    patientReviews: number;
    successRate: number;
    averageWaitTime: number;
}
/**
 * Cost structure information
 */
export interface CostStructure {
    consultationFee: number;
    insuranceAccepted: string[];
    paymentMethods: string[];
}
/**
 * Availability information
 */
export interface Availability {
    hours: {
        [day: string]: {
            open: string;
            close: string;
        };
    };
    emergencyAvailable: boolean;
    lastUpdated: Date;
}
/**
 * Credentials information
 */
export interface Credentials {
    licenses: string[];
    certifications: string[];
    verified: boolean;
}
/**
 * Capacity information for providers
 */
export interface Capacity {
    totalBeds?: number;
    availableBeds?: number;
    dailyPatientCapacity: number;
    currentLoad: number;
}
/**
 * Provider capabilities
 */
export interface ProviderCapabilities {
    specialties: string[];
    services: string[];
    equipment: string[];
    languages: string[];
}
/**
 * Interaction record for episode tracking
 */
export interface Interaction {
    timestamp: Date;
    type: string;
    actor: string;
    details: Record<string, any>;
}
/**
 * Outcome information
 */
export interface Outcome {
    resolution: string;
    followUpRequired: boolean;
    patientSatisfaction?: number;
    costActual?: number;
}
/**
 * Base entity interface with common fields
 */
export interface BaseEntity {
    createdAt: Date;
    updatedAt: Date;
}
