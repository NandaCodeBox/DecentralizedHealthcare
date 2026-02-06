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
export declare function validateData<T>(schema: Joi.Schema, data: any): ValidationResult<T>;
/**
 * Validate data and throw error if invalid
 * @param schema - Joi schema to validate against
 * @param data - Data to validate
 * @returns Validated and typed data
 * @throws Error if validation fails
 */
export declare function validateAndThrow<T>(schema: Joi.Schema, data: any): T;
/**
 * Create a validation middleware for Lambda functions
 * @param schema - Joi schema to validate against
 * @returns Validation function that can be used in Lambda handlers
 */
export declare function createValidationMiddleware<T>(schema: Joi.Schema): (data: any) => T;
/**
 * Validation error class for better error handling
 */
export declare class ValidationError extends Error {
    readonly errors: string[];
    constructor(errors: string[]);
}
/**
 * Validate data and throw ValidationError if invalid
 * @param schema - Joi schema to validate against
 * @param data - Data to validate
 * @returns Validated and typed data
 * @throws ValidationError if validation fails
 */
export declare function validateOrThrow<T>(schema: Joi.Schema, data: any): T;
