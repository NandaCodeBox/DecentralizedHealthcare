// Common validation schemas

import Joi from 'joi';
import { Gender, Language, CostSensitivity, PaymentMethod } from '../types/enums';

/**
 * Location validation schema
 */
export const locationSchema = Joi.object({
  state: Joi.string().required().min(1).max(100),
  district: Joi.string().required().min(1).max(100),
  pincode: Joi.string().required().pattern(/^\d{6}$/),
  coordinates: Joi.object({
    lat: Joi.number().required().min(-90).max(90),
    lng: Joi.number().required().min(-180).max(180)
  }).required()
});

/**
 * Insurance info validation schema
 */
export const insuranceInfoSchema = Joi.object({
  provider: Joi.string().required().min(1).max(100),
  policyNumber: Joi.string().required().min(1).max(50),
  coverage: Joi.object({
    maxAmount: Joi.number().required().min(0),
    deductible: Joi.number().required().min(0),
    copayPercentage: Joi.number().required().min(0).max(100),
    coveredServices: Joi.array().items(Joi.string().min(1).max(100)).required()
  }).required()
});

/**
 * Medical history validation schema
 */
export const medicalHistorySchema = Joi.object({
  conditions: Joi.array().items(Joi.string().min(1).max(200)).required(),
  medications: Joi.array().items(Joi.string().min(1).max(200)).required(),
  allergies: Joi.array().items(Joi.string().min(1).max(200)).required(),
  lastVisit: Joi.date().optional()
});

/**
 * Patient preferences validation schema
 */
export const patientPreferencesSchema = Joi.object({
  providerGender: Joi.string().valid(...Object.values(Gender)).optional(),
  maxTravelDistance: Joi.number().required().min(0).max(1000),
  costSensitivity: Joi.string().valid(...Object.values(CostSensitivity)).required(),
  preferredLanguage: Joi.string().valid(...Object.values(Language)).required()
});

/**
 * Quality metrics validation schema
 */
export const qualityMetricsSchema = Joi.object({
  rating: Joi.number().required().min(1).max(5),
  patientReviews: Joi.number().required().min(0),
  successRate: Joi.number().required().min(0).max(100),
  averageWaitTime: Joi.number().required().min(0)
});

/**
 * Cost structure validation schema
 */
export const costStructureSchema = Joi.object({
  consultationFee: Joi.number().required().min(0),
  insuranceAccepted: Joi.array().items(Joi.string().min(1).max(100)).required(),
  paymentMethods: Joi.array().items(Joi.string().valid(...Object.values(PaymentMethod))).required()
});

/**
 * Availability validation schema
 */
export const availabilitySchema = Joi.object({
  hours: Joi.object().pattern(
    Joi.string(),
    Joi.object({
      open: Joi.string().required().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
      close: Joi.string().required().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    })
  ).required(),
  emergencyAvailable: Joi.boolean().required(),
  lastUpdated: Joi.date().required()
});

/**
 * Credentials validation schema
 */
export const credentialsSchema = Joi.object({
  licenses: Joi.array().items(Joi.string().min(1).max(100)).required(),
  certifications: Joi.array().items(Joi.string().min(1).max(100)).required(),
  verified: Joi.boolean().required()
});

/**
 * Capacity validation schema
 */
export const capacitySchema = Joi.object({
  totalBeds: Joi.number().optional().min(0),
  availableBeds: Joi.number().optional().min(0),
  dailyPatientCapacity: Joi.number().required().min(1),
  currentLoad: Joi.number().required().min(0).max(100)
});

/**
 * Provider capabilities validation schema
 */
export const providerCapabilitiesSchema = Joi.object({
  specialties: Joi.array().items(Joi.string().min(1).max(100)).required(),
  services: Joi.array().items(Joi.string().min(1).max(100)).required(),
  equipment: Joi.array().items(Joi.string().min(1).max(100)).required(),
  languages: Joi.array().items(Joi.string().valid(...Object.values(Language))).required()
});

/**
 * Interaction validation schema
 */
export const interactionSchema = Joi.object({
  timestamp: Joi.date().required(),
  type: Joi.string().required().min(1).max(50),
  actor: Joi.string().required().min(1).max(100),
  details: Joi.object().required()
});

/**
 * Outcome validation schema
 */
export const outcomeSchema = Joi.object({
  resolution: Joi.string().required().min(1).max(500),
  followUpRequired: Joi.boolean().required(),
  patientSatisfaction: Joi.number().optional().min(1).max(5),
  costActual: Joi.number().optional().min(0)
});

/**
 * UUID validation schema
 */
export const uuidSchema = Joi.string().uuid({ version: 'uuidv4' });

/**
 * Base entity validation schema
 */
export const baseEntitySchema = Joi.object({
  createdAt: Joi.date().required(),
  updatedAt: Joi.date().required()
});