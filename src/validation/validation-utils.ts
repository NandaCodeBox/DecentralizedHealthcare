// Validation utility functions

import Joi from 'joi';

/**
 * Validation result interface
 */
export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors?: string[];
}

/**
 * Validate data against a Joi schema
 * @param schema - Joi schema to validate against
 * @param data - Data to validate
 * @returns Validation result with typed data or errors
 */
export function validateData<T>(schema: Joi.Schema, data: any): ValidationResult<T> {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });

  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message)
    };
  }

  return {
    isValid: true,
    data: value as T
  };
}

/**
 * Validate data and throw error if invalid
 * @param schema - Joi schema to validate against
 * @param data - Data to validate
 * @returns Validated and typed data
 * @throws Error if validation fails
 */
export function validateAndThrow<T>(schema: Joi.Schema, data: any): T {
  const result = validateData<T>(schema, data);
  
  if (!result.isValid) {
    throw new Error(`Validation failed: ${result.errors?.join(', ')}`);
  }
  
  return result.data!;
}

/**
 * Create a validation middleware for Lambda functions
 * @param schema - Joi schema to validate against
 * @returns Validation function that can be used in Lambda handlers
 */
export function createValidationMiddleware<T>(schema: Joi.Schema) {
  return (data: any): T => {
    return validateAndThrow<T>(schema, data);
  };
}

/**
 * Validation error class for better error handling
 */
export class ValidationError extends Error {
  public readonly errors: string[];

  constructor(errors: string[]) {
    super(`Validation failed: ${errors.join(', ')}`);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * Validate data and throw ValidationError if invalid
 * @param schema - Joi schema to validate against
 * @param data - Data to validate
 * @returns Validated and typed data
 * @throws ValidationError if validation fails
 */
export function validateOrThrow<T>(schema: Joi.Schema, data: any): T {
  const result = validateData<T>(schema, data);
  
  if (!result.isValid) {
    throw new ValidationError(result.errors!);
  }
  
  return result.data!;
}