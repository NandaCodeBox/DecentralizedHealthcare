// Patient validation schemas

import Joi from 'joi';
import { Gender, Language } from '../types/enums';
import { 
  locationSchema, 
  insuranceInfoSchema, 
  medicalHistorySchema, 
  patientPreferencesSchema,
  uuidSchema,
  baseEntitySchema
} from './common-validation';

/**
 * Patient demographics validation schema
 */
export const patientDemographicsSchema = Joi.object({
  age: Joi.number().required().min(0).max(150),
  gender: Joi.string().valid(...Object.values(Gender)).required(),
  location: locationSchema.required(),
  preferredLanguage: Joi.string().valid(...Object.values(Language)).required(),
  insuranceInfo: insuranceInfoSchema.optional()
});

/**
 * Complete patient validation schema
 */
export const patientSchema = Joi.object({
  patientId: uuidSchema.required(),
  demographics: patientDemographicsSchema.required(),
  medicalHistory: medicalHistorySchema.required(),
  preferences: patientPreferencesSchema.required()
}).concat(baseEntitySchema);

/**
 * Patient creation input validation schema
 */
export const createPatientInputSchema = Joi.object({
  demographics: patientDemographicsSchema.required(),
  medicalHistory: medicalHistorySchema.required(),
  preferences: patientPreferencesSchema.required()
});

/**
 * Patient update input validation schema
 */
export const updatePatientInputSchema = Joi.object({
  demographics: patientDemographicsSchema.optional(),
  medicalHistory: medicalHistorySchema.optional(),
  preferences: patientPreferencesSchema.optional()
}).min(1); // At least one field must be provided for update