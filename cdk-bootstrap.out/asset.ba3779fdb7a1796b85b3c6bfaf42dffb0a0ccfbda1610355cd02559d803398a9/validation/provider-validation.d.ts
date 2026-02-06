import Joi from 'joi';
/**
 * Complete provider validation schema
 */
export declare const providerSchema: Joi.ObjectSchema<any>;
/**
 * Provider creation input validation schema
 */
export declare const createProviderInputSchema: Joi.ObjectSchema<any>;
/**
 * Provider update input validation schema
 */
export declare const updateProviderInputSchema: Joi.ObjectSchema<any>;
/**
 * Provider search criteria validation schema
 */
export declare const providerSearchCriteriaSchema: Joi.ObjectSchema<any>;
/**
 * Provider search result validation schema
 */
export declare const providerSearchResultSchema: Joi.ObjectSchema<any>;
/**
 * Capacity update input validation schema
 */
export declare const updateCapacityInputSchema: Joi.ObjectSchema<any>;
/**
 * Validate provider object
 */
export declare function validateProvider(provider: any): {
    error?: any;
    value?: any;
};
/**
 * Validate create provider input
 */
export declare function validateCreateProviderInput(input: any): {
    error?: any;
    value?: any;
};
/**
 * Validate update provider input
 */
export declare function validateUpdateProviderInput(input: any): {
    error?: any;
    value?: any;
};
/**
 * Validate provider search criteria
 */
export declare function validateProviderSearchCriteria(criteria: any): {
    error?: any;
    value?: any;
};
/**
 * Validate update capacity input
 */
export declare function validateUpdateCapacityInput(input: any): {
    error?: any;
    value?: any;
};
