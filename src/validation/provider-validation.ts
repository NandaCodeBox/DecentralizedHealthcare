// Provider validation schemas

import Joi from 'joi';
import { ProviderType, Language } from '../types/enums';
import { 
  locationSchema,
  qualityMetricsSchema,
  costStructureSchema,
  availabilitySchema,
  credentialsSchema,
  capacitySchema,
  providerCapabilitiesSchema,
  uuidSchema,
  baseEntitySchema
} from './common-validation';

/**
 * Complete provider validation schema
 */
export const providerSchema = Joi.object({
  providerId: uuidSchema.required(),
  type: Joi.string().valid(...Object.values(ProviderType)).required(),
  name: Joi.string().required().min(1).max(200),
  location: locationSchema.required(),
  capabilities: providerCapabilitiesSchema.required(),
  capacity: capacitySchema.required(),
  qualityMetrics: qualityMetricsSchema.required(),
  costStructure: costStructureSchema.required(),
  availability: availabilitySchema.required(),
  credentials: credentialsSchema.required(),
  isActive: Joi.boolean().required()
}).concat(baseEntitySchema);

/**
 * Provider creation input validation schema
 */
export const createProviderInputSchema = Joi.object({
  type: Joi.string().valid(...Object.values(ProviderType)).required(),
  name: Joi.string().required().min(1).max(200),
  location: locationSchema.required(),
  capabilities: providerCapabilitiesSchema.required(),
  capacity: capacitySchema.required(),
  qualityMetrics: qualityMetricsSchema.required(),
  costStructure: costStructureSchema.required(),
  availability: availabilitySchema.required(),
  credentials: credentialsSchema.required()
});

/**
 * Provider update input validation schema
 */
export const updateProviderInputSchema = Joi.object({
  name: Joi.string().optional().min(1).max(200),
  location: locationSchema.optional(),
  capabilities: providerCapabilitiesSchema.optional(),
  capacity: capacitySchema.optional(),
  qualityMetrics: qualityMetricsSchema.optional(),
  costStructure: costStructureSchema.optional(),
  availability: availabilitySchema.optional(),
  credentials: credentialsSchema.optional(),
  isActive: Joi.boolean().optional()
}).min(1); // At least one field must be provided for update

/**
 * Provider search criteria validation schema
 */
export const providerSearchCriteriaSchema = Joi.object({
  type: Joi.string().valid(...Object.values(ProviderType)).optional(),
  specialties: Joi.array().items(Joi.string().min(1).max(100)).optional(),
  location: Joi.object({
    coordinates: Joi.object({
      lat: Joi.number().required().min(-90).max(90),
      lng: Joi.number().required().min(-180).max(180)
    }).required(),
    maxDistance: Joi.number().required().min(0).max(1000)
  }).optional(),
  availableNow: Joi.boolean().optional(),
  maxCost: Joi.number().optional().min(0),
  minRating: Joi.number().optional().min(1).max(5),
  acceptsInsurance: Joi.array().items(Joi.string().min(1).max(100)).optional(),
  languages: Joi.array().items(Joi.string().valid(...Object.values(Language))).optional()
});

/**
 * Provider search result validation schema
 */
export const providerSearchResultSchema = Joi.object({
  provider: providerSchema.required(),
  distance: Joi.number().optional().min(0),
  matchScore: Joi.number().required().min(0).max(100),
  availabilityStatus: Joi.string().valid('available', 'busy', 'unavailable').required(),
  estimatedWaitTime: Joi.number().optional().min(0)
});

/**
 * Capacity update input validation schema
 */
export const updateCapacityInputSchema = Joi.object({
  providerId: uuidSchema.required(),
  availableBeds: Joi.number().optional().min(0),
  currentLoad: Joi.number().required().min(0).max(100)
});

/**
 * Validate provider object
 */
export function validateProvider(provider: any): { error?: any; value?: any } {
  return providerSchema.validate(provider);
}

/**
 * Validate create provider input
 */
export function validateCreateProviderInput(input: any): { error?: any; value?: any } {
  return createProviderInputSchema.validate(input);
}

/**
 * Validate update provider input
 */
export function validateUpdateProviderInput(input: any): { error?: any; value?: any } {
  return updateProviderInputSchema.validate(input);
}

/**
 * Validate provider search criteria
 */
export function validateProviderSearchCriteria(criteria: any): { error?: any; value?: any } {
  return providerSearchCriteriaSchema.validate(criteria);
}

/**
 * Validate update capacity input
 */
export function validateUpdateCapacityInput(input: any): { error?: any; value?: any } {
  return updateCapacityInputSchema.validate(input);
}