// Incomplete Data Handling Service
// Detects missing essential symptom information and provides structured prompting

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
  completenessScore: number; // 0-100 percentage
  criticalMissing: boolean; // True if critical fields are missing
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
 * Essential field definitions with metadata
 */
const ESSENTIAL_FIELDS: Record<string, MissingFieldInfo> = {
  primaryComplaint: {
    field: 'primaryComplaint',
    displayName: 'Primary Complaint',
    description: 'The main symptom or health concern you are experiencing',
    required: true,
    priority: 'critical',
    prompt: 'Please describe your main symptom or health concern in detail',
    examples: [
      'Severe headache with nausea',
      'Persistent cough with fever',
      'Sharp chest pain when breathing',
      'Difficulty swallowing food'
    ],
    validationRules: [
      'Must be at least 10 characters long',
      'Should describe specific symptoms',
      'Avoid generic terms like "feeling unwell"'
    ]
  },
  duration: {
    field: 'duration',
    displayName: 'Duration',
    description: 'How long you have been experiencing these symptoms',
    required: true,
    priority: 'critical',
    prompt: 'How long have you been experiencing these symptoms?',
    examples: [
      '2 hours',
      '3 days',
      '1 week',
      'Started this morning',
      'On and off for 2 weeks'
    ],
    validationRules: [
      'Be specific about timeframe',
      'Include if symptoms are constant or intermittent'
    ]
  },
  severity: {
    field: 'severity',
    displayName: 'Severity Level',
    description: 'Rate the severity of your symptoms on a scale of 1-10',
    required: true,
    priority: 'critical',
    prompt: 'On a scale of 1-10, how severe are your symptoms? (1 = mild, 10 = unbearable)',
    examples: [
      '1-3: Mild discomfort',
      '4-6: Moderate pain/discomfort',
      '7-8: Severe pain affecting daily activities',
      '9-10: Unbearable pain requiring immediate attention'
    ],
    validationRules: [
      'Must be a number between 1 and 10',
      'Consider how symptoms affect your daily activities'
    ]
  },
  associatedSymptoms: {
    field: 'associatedSymptoms',
    displayName: 'Associated Symptoms',
    description: 'Other symptoms you are experiencing along with the main complaint',
    required: false,
    priority: 'high',
    prompt: 'Are you experiencing any other symptoms along with your main complaint?',
    examples: [
      'Fever and chills',
      'Nausea and vomiting',
      'Dizziness and fatigue',
      'Shortness of breath',
      'No other symptoms'
    ],
    validationRules: [
      'List each symptom separately',
      'Be specific about each symptom',
      'Include "none" if no other symptoms'
    ]
  },
  inputMethod: {
    field: 'inputMethod',
    displayName: 'Input Method',
    description: 'How you are providing this information',
    required: true,
    priority: 'low',
    prompt: 'How are you providing this symptom information?',
    examples: ['text', 'voice'],
    validationRules: [
      'Must be either "text" or "voice"'
    ]
  }
};

/**
 * Analyze symptom data completeness
 */
export function analyzeDataCompleteness(symptoms: SymptomData): DataCompletenessResult {
  const missingFields: MissingFieldInfo[] = [];
  let totalFields = 0;
  let completedFields = 0;
  let criticalMissing = false;

  // Check each essential field
  for (const [fieldName, fieldInfo] of Object.entries(ESSENTIAL_FIELDS)) {
    totalFields++;
    
    const fieldValue = symptoms[fieldName as keyof SymptomData];
    const isEmpty = isFieldEmpty(fieldValue);
    
    if (isEmpty) {
      missingFields.push(fieldInfo);
      if (fieldInfo.priority === 'critical') {
        criticalMissing = true;
      }
    } else {
      // Validate field quality
      const qualityIssues = validateFieldQuality(fieldName, fieldValue);
      if (qualityIssues.length > 0) {
        // Add quality-based missing field info
        missingFields.push({
          ...fieldInfo,
          prompt: `${fieldInfo.prompt} (Current value needs improvement: ${qualityIssues.join(', ')})`,
          priority: fieldInfo.priority === 'critical' ? 'high' : fieldInfo.priority
        });
      } else {
        completedFields++;
      }
    }
  }

  // Calculate completeness score
  const completenessScore = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;

  // Generate suggestions
  const suggestions = generateCompletionSuggestions(missingFields, completenessScore);

  return {
    isComplete: missingFields.length === 0,
    missingFields,
    completenessScore,
    criticalMissing,
    suggestions
  };
}

/**
 * Generate structured prompts for missing data
 */
export function generateStructuredPrompts(missingFields: MissingFieldInfo[]): StructuredPromptResponse {
  // Sort fields by priority
  const sortedFields = [...missingFields].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const prompts: FieldPrompt[] = sortedFields.map(field => createFieldPrompt(field));
  const priorityOrder = sortedFields.map(field => field.field);
  
  // Estimate completion time based on number and complexity of missing fields
  const criticalCount = sortedFields.filter(f => f.priority === 'critical').length;
  const highCount = sortedFields.filter(f => f.priority === 'high').length;
  const estimatedMinutes = (criticalCount * 2) + (highCount * 1) + Math.max(1, sortedFields.length - criticalCount - highCount);
  const estimatedCompletionTime = `${estimatedMinutes}-${estimatedMinutes + 2} minutes`;

  const helpText = generateHelpText(sortedFields);

  return {
    prompts,
    priorityOrder,
    estimatedCompletionTime,
    helpText
  };
}

/**
 * Check if a field value is empty or insufficient
 */
function isFieldEmpty(value: any): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  
  if (typeof value === 'string') {
    return value.trim().length === 0;
  }
  
  if (typeof value === 'number') {
    return isNaN(value);
  }
  
  if (Array.isArray(value)) {
    return value.length === 0 || value.every(item => 
      typeof item === 'string' && item.trim().length === 0
    );
  }
  
  return false;
}

/**
 * Validate field quality and return issues
 */
function validateFieldQuality(fieldName: string, value: any): string[] {
  const issues: string[] = [];
  
  switch (fieldName) {
    case 'primaryComplaint':
      if (typeof value === 'string') {
        if (value.trim().length < 10) {
          issues.push('too brief, needs more detail');
        }
        if (value.trim().length > 1000) {
          issues.push('too long, please summarize');
        }
        // Check for generic/vague descriptions
        const vaguePhrases = ['feeling unwell', 'not feeling good', 'sick', 'pain', 'hurt'];
        if (vaguePhrases.some(phrase => value.toLowerCase().includes(phrase) && value.length < 30)) {
          issues.push('too vague, please be more specific');
        }
      }
      break;
      
    case 'duration':
      if (typeof value === 'string') {
        if (value.trim().length < 2) {
          issues.push('too brief');
        }
        // Check for specific time indicators
        const timeIndicators = ['hour', 'day', 'week', 'month', 'year', 'minute', 'since', 'ago', 'started'];
        if (!timeIndicators.some(indicator => value.toLowerCase().includes(indicator))) {
          issues.push('needs specific timeframe');
        }
      }
      break;
      
    case 'severity':
      if (typeof value === 'number') {
        if (value < 1 || value > 10) {
          issues.push('must be between 1 and 10');
        }
      } else {
        issues.push('must be a number');
      }
      break;
      
    case 'associatedSymptoms':
      if (Array.isArray(value)) {
        if (value.length > 10) {
          issues.push('too many symptoms listed, focus on main ones');
        }
        // Check for overly brief symptoms
        const briefSymptoms = value.filter(symptom => 
          typeof symptom === 'string' && symptom.trim().length < 3
        );
        if (briefSymptoms.length > 0) {
          issues.push('some symptoms too brief');
        }
      }
      break;
  }
  
  return issues;
}

/**
 * Create a structured prompt for a specific field
 */
function createFieldPrompt(fieldInfo: MissingFieldInfo): FieldPrompt {
  const basePrompt: FieldPrompt = {
    field: fieldInfo.field,
    question: fieldInfo.prompt,
    placeholder: `Enter your ${fieldInfo.displayName.toLowerCase()}...`,
    inputType: 'text',
    validation: {
      required: fieldInfo.required
    },
    helpText: fieldInfo.description,
    examples: fieldInfo.examples || []
  };

  // Customize based on field type
  switch (fieldInfo.field) {
    case 'primaryComplaint':
      return {
        ...basePrompt,
        inputType: 'textarea',
        placeholder: 'Describe your main symptom or health concern in detail...',
        validation: {
          ...basePrompt.validation,
          minLength: 10,
          maxLength: 1000
        }
      };
      
    case 'duration':
      return {
        ...basePrompt,
        placeholder: 'e.g., "2 hours", "3 days", "started this morning"...',
        validation: {
          ...basePrompt.validation,
          minLength: 2,
          maxLength: 100
        }
      };
      
    case 'severity':
      return {
        ...basePrompt,
        inputType: 'number',
        placeholder: 'Rate from 1 (mild) to 10 (unbearable)',
        validation: {
          ...basePrompt.validation,
          min: 1,
          max: 10
        }
      };
      
    case 'associatedSymptoms':
      return {
        ...basePrompt,
        inputType: 'multiselect',
        placeholder: 'Select or type additional symptoms...',
        options: [
          'Fever', 'Chills', 'Nausea', 'Vomiting', 'Dizziness', 'Fatigue',
          'Headache', 'Shortness of breath', 'Chest pain', 'Abdominal pain',
          'Diarrhea', 'Constipation', 'Rash', 'Swelling', 'None'
        ]
      };
      
    case 'inputMethod':
      return {
        ...basePrompt,
        inputType: 'select',
        options: ['text', 'voice'],
        validation: {
          ...basePrompt.validation
        }
      };
      
    default:
      return basePrompt;
  }
}

/**
 * Generate completion suggestions based on missing fields
 */
function generateCompletionSuggestions(missingFields: MissingFieldInfo[], completenessScore: number): string[] {
  const suggestions: string[] = [];
  
  if (completenessScore === 0) {
    suggestions.push('Start by describing your main symptom or health concern');
    suggestions.push('Include when the symptoms started and how severe they are');
  } else if (completenessScore < 50) {
    const criticalMissing = missingFields.filter(f => f.priority === 'critical');
    if (criticalMissing.length > 0) {
      suggestions.push(`Complete the critical information: ${criticalMissing.map(f => f.displayName).join(', ')}`);
    }
    suggestions.push('Providing more details will help us give you better care recommendations');
  } else if (completenessScore < 80) {
    suggestions.push('You\'re almost done! Just a few more details needed');
    const highPriority = missingFields.filter(f => f.priority === 'high');
    if (highPriority.length > 0) {
      suggestions.push(`Consider adding: ${highPriority.map(f => f.displayName).join(', ')}`);
    }
  } else {
    suggestions.push('Great! You\'ve provided most of the essential information');
    suggestions.push('Adding the remaining details will ensure the most accurate assessment');
  }
  
  // Add specific suggestions based on missing field types
  const hasCriticalMissing = missingFields.some(f => f.priority === 'critical');
  if (hasCriticalMissing) {
    suggestions.push('Critical information is required before we can proceed with your assessment');
  }
  
  return suggestions;
}

/**
 * Generate contextual help text
 */
function generateHelpText(missingFields: MissingFieldInfo[]): string {
  const criticalCount = missingFields.filter(f => f.priority === 'critical').length;
  const totalCount = missingFields.length;
  
  let helpText = `We need ${totalCount} additional piece${totalCount > 1 ? 's' : ''} of information to provide you with the best care recommendations. `;
  
  if (criticalCount > 0) {
    helpText += `${criticalCount} of these are critical and required before we can proceed. `;
  }
  
  helpText += 'Please take your time to provide accurate information. ';
  helpText += 'If you\'re experiencing a medical emergency, please call emergency services immediately or go to the nearest emergency room.';
  
  return helpText;
}

/**
 * Validate data completeness and throw structured error if incomplete
 */
export function validateDataCompletenessOrThrow(symptoms: SymptomData): void {
  const completenessResult = analyzeDataCompleteness(symptoms);
  
  if (!completenessResult.isComplete) {
    const structuredPrompts = generateStructuredPrompts(completenessResult.missingFields);
    
    // Create a structured error with prompting information
    const error = new Error('Incomplete symptom data') as any;
    error.name = 'IncompleteDataError';
    error.completenessResult = completenessResult;
    error.structuredPrompts = structuredPrompts;
    error.statusCode = 422; // Unprocessable Entity
    
    throw error;
  }
}