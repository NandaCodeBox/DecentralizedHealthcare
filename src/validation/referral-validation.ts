// Referral validation schemas

import Joi from 'joi';
import { ReferralStatus, UrgencyLevel } from '../types/enums';
import { 
  outcomeSchema,
  uuidSchema,
  baseEntitySchema
} from './common-validation';

/**
 * Patient context validation schema
 */
export const patientContextSchema = Joi.object({
  symptoms: Joi.object().required(),
  assessments: Joi.object().required(),
  treatments: Joi.object().required(),
  notes: Joi.string().required().min(1).max(2000),
  vitalSigns: Joi.object().optional(),
  labResults: Joi.object().optional()
});

/**
 * Referral timeline validation schema
 */
export const referralTimelineSchema = Joi.object({
  requestedAt: Joi.date().required(),
  acceptedAt: Joi.date().optional(),
  completedAt: Joi.date().optional(),
  rejectedAt: Joi.date().optional()
});

/**
 * Complete referral validation schema
 */
export const referralSchema = Joi.object({
  referralId: uuidSchema.required(),
  episodeId: uuidSchema.required(),
  fromProvider: uuidSchema.required(),
  toProvider: uuidSchema.required(),
  urgency: Joi.string().valid(...Object.values(UrgencyLevel)).required(),
  reason: Joi.string().required().min(1).max(1000),
  patientContext: patientContextSchema.required(),
  status: Joi.string().valid(...Object.values(ReferralStatus)).required(),
  timeline: referralTimelineSchema.required(),
  outcome: outcomeSchema.optional(),
  rejectionReason: Joi.string().optional().min(1).max(500),
  followUpInstructions: Joi.string().optional().min(1).max(1000)
}).concat(baseEntitySchema);

/**
 * Referral creation input validation schema
 */
export const createReferralInputSchema = Joi.object({
  episodeId: uuidSchema.required(),
  fromProvider: uuidSchema.required(),
  toProvider: uuidSchema.required(),
  urgency: Joi.string().valid(...Object.values(UrgencyLevel)).required(),
  reason: Joi.string().required().min(1).max(1000),
  patientContext: patientContextSchema.required(),
  followUpInstructions: Joi.string().optional().min(1).max(1000)
});

/**
 * Referral update input validation schema
 */
export const updateReferralInputSchema = Joi.object({
  status: Joi.string().valid(...Object.values(ReferralStatus)).optional(),
  outcome: outcomeSchema.optional(),
  rejectionReason: Joi.string().optional().min(1).max(500),
  followUpInstructions: Joi.string().optional().min(1).max(1000)
}).min(1); // At least one field must be provided for update

/**
 * Referral acceptance input validation schema
 */
export const acceptReferralInputSchema = Joi.object({
  referralId: uuidSchema.required(),
  acceptingProviderId: uuidSchema.required(),
  estimatedAppointmentTime: Joi.date().optional(),
  preparationInstructions: Joi.string().optional().min(1).max(1000)
});

/**
 * Referral rejection input validation schema
 */
export const rejectReferralInputSchema = Joi.object({
  referralId: uuidSchema.required(),
  rejectingProviderId: uuidSchema.required(),
  rejectionReason: Joi.string().required().min(1).max(500),
  alternativeRecommendations: Joi.array().items(Joi.string().min(1).max(200)).optional()
});

/**
 * Referral completion input validation schema
 */
export const completeReferralInputSchema = Joi.object({
  referralId: uuidSchema.required(),
  outcome: outcomeSchema.required(),
  followUpRequired: Joi.boolean().required(),
  nextSteps: Joi.string().optional().min(1).max(1000)
});