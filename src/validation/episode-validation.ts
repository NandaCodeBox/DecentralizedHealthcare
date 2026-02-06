// Episode validation schemas

import Joi from 'joi';
import { UrgencyLevel, EpisodeStatus, InputMethod } from '../types/enums';
import { 
  interactionSchema, 
  outcomeSchema,
  uuidSchema,
  baseEntitySchema
} from './common-validation';

/**
 * Symptoms validation schema
 */
export const symptomsSchema = Joi.object({
  primaryComplaint: Joi.string().required().min(1).max(1000),
  duration: Joi.string().required().min(1).max(100),
  severity: Joi.number().required().min(1).max(10),
  associatedSymptoms: Joi.array().items(Joi.string().min(1).max(200)).required(),
  inputMethod: Joi.string().valid(...Object.values(InputMethod)).required()
});

/**
 * AI assessment validation schema
 */
export const aiAssessmentSchema = Joi.object({
  used: Joi.boolean().required(),
  confidence: Joi.number().optional().min(0).max(1),
  reasoning: Joi.string().optional().min(1).max(2000),
  modelUsed: Joi.string().optional().min(1).max(100),
  timestamp: Joi.date().optional()
});

/**
 * Human validation validation schema
 */
export const humanValidationSchema = Joi.object({
  supervisorId: uuidSchema.required(),
  approved: Joi.boolean().required(),
  overrideReason: Joi.string().optional().min(1).max(500),
  timestamp: Joi.date().required(),
  notes: Joi.string().optional().min(1).max(1000)
});

/**
 * Triage assessment validation schema
 */
export const triageAssessmentSchema = Joi.object({
  urgencyLevel: Joi.string().valid(...Object.values(UrgencyLevel)).required(),
  ruleBasedScore: Joi.number().required().min(0).max(100),
  aiAssessment: aiAssessmentSchema.required(),
  humanValidation: humanValidationSchema.optional(),
  finalScore: Joi.number().required().min(0).max(100)
});

/**
 * Care pathway validation schema
 */
export const carePathwaySchema = Joi.object({
  recommendedLevel: Joi.string().required().min(1).max(100),
  assignedProvider: uuidSchema.optional(),
  alternativeProviders: Joi.array().items(uuidSchema).required(),
  estimatedCost: Joi.number().optional().min(0),
  expectedDuration: Joi.string().optional().min(1).max(100),
  instructions: Joi.string().optional().min(1).max(2000)
});

/**
 * Complete episode validation schema
 */
export const episodeSchema = Joi.object({
  episodeId: uuidSchema.required(),
  patientId: uuidSchema.required(),
  status: Joi.string().valid(...Object.values(EpisodeStatus)).required(),
  symptoms: symptomsSchema.required(),
  triage: triageAssessmentSchema.optional(),
  carePathway: carePathwaySchema.optional(),
  interactions: Joi.array().items(interactionSchema).required(),
  outcome: outcomeSchema.optional()
}).concat(baseEntitySchema);

/**
 * Episode creation input validation schema
 */
export const createEpisodeInputSchema = Joi.object({
  patientId: uuidSchema.required(),
  symptoms: symptomsSchema.required()
});

/**
 * Episode update input validation schema
 */
export const updateEpisodeInputSchema = Joi.object({
  status: Joi.string().valid(...Object.values(EpisodeStatus)).optional(),
  triage: triageAssessmentSchema.optional(),
  carePathway: carePathwaySchema.optional(),
  outcome: outcomeSchema.optional()
}).min(1); // At least one field must be provided for update

/**
 * Add interaction input validation schema
 */
export const addInteractionInputSchema = Joi.object({
  episodeId: uuidSchema.required(),
  type: Joi.string().required().min(1).max(50),
  actor: Joi.string().required().min(1).max(100),
  details: Joi.object().required()
});