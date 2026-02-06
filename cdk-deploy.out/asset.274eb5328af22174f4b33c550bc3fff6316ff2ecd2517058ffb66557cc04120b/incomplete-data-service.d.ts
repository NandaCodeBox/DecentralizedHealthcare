import { InputMethod } from '../../types/enums';
/**
 * Interface for symptom data completeness analysis
 */
export interface SymptomData {
    primaryComplaint?: string;
    duration?: string;
    severity?: number;
    associatedSymptoms?: string[];
    inputMethod?: InputMethod;
}
/**
 * Interface for data completeness result
 */
export interface DataCompletenessResult {
    isComplete: boolean;
    missingFields: MissingFieldInfo[];
    completenessScore: number;
    criticalMissing: boolean;
    suggestions: string[];
}
/**
 * Interface for missing field information
 */
export interface MissingFieldInfo {
    field: string;
    displayName: string;
    description: string;
    required: boolean;
    priority: 'critical' | 'high' | 'medium' | 'low';
    prompt: string;
    examples?: string[];
    validationRules?: string[];
}
/**
 * Interface for structured prompting response
 */
export interface StructuredPromptResponse {
    prompts: FieldPrompt[];
    priorityOrder: string[];
    estimatedCompletionTime: string;
    helpText: string;
}
/**
 * Interface for individual field prompts
 */
export interface FieldPrompt {
    field: string;
    question: string;
    placeholder: string;
    inputType: 'text' | 'number' | 'select' | 'multiselect' | 'textarea';
    options?: string[];
    validation: {
        required: boolean;
        minLength?: number;
        maxLength?: number;
        min?: number;
        max?: number;
        pattern?: string;
    };
    helpText: string;
    examples: string[];
}
/**
 * Analyze symptom data completeness
 */
export declare function analyzeDataCompleteness(symptoms: SymptomData): DataCompletenessResult;
/**
 * Generate structured prompts for missing data
 */
export declare function generateStructuredPrompts(missingFields: MissingFieldInfo[]): StructuredPromptResponse;
/**
 * Validate data completeness and throw structured error if incomplete
 */
export declare function validateDataCompletenessOrThrow(symptoms: SymptomData): void;
