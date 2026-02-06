"use strict";
// Incomplete Data Handling Service
// Detects missing essential symptom information and provides structured prompting
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeDataCompleteness = analyzeDataCompleteness;
exports.generateStructuredPrompts = generateStructuredPrompts;
exports.validateDataCompletenessOrThrow = validateDataCompletenessOrThrow;
/**
 * Essential field definitions with metadata
 */
const ESSENTIAL_FIELDS = {
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
function analyzeDataCompleteness(symptoms) {
    const missingFields = [];
    let totalFields = 0;
    let completedFields = 0;
    let criticalMissing = false;
    // Check each essential field
    for (const [fieldName, fieldInfo] of Object.entries(ESSENTIAL_FIELDS)) {
        totalFields++;
        const fieldValue = symptoms[fieldName];
        const isEmpty = isFieldEmpty(fieldValue);
        if (isEmpty) {
            missingFields.push(fieldInfo);
            if (fieldInfo.priority === 'critical') {
                criticalMissing = true;
            }
        }
        else {
            // Validate field quality
            const qualityIssues = validateFieldQuality(fieldName, fieldValue);
            if (qualityIssues.length > 0) {
                // Add quality-based missing field info
                missingFields.push({
                    ...fieldInfo,
                    prompt: `${fieldInfo.prompt} (Current value needs improvement: ${qualityIssues.join(', ')})`,
                    priority: fieldInfo.priority === 'critical' ? 'high' : fieldInfo.priority
                });
            }
            else {
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
function generateStructuredPrompts(missingFields) {
    // Sort fields by priority
    const sortedFields = [...missingFields].sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    const prompts = sortedFields.map(field => createFieldPrompt(field));
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
function isFieldEmpty(value) {
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
        return value.length === 0 || value.every(item => typeof item === 'string' && item.trim().length === 0);
    }
    return false;
}
/**
 * Validate field quality and return issues
 */
function validateFieldQuality(fieldName, value) {
    const issues = [];
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
            }
            else {
                issues.push('must be a number');
            }
            break;
        case 'associatedSymptoms':
            if (Array.isArray(value)) {
                if (value.length > 10) {
                    issues.push('too many symptoms listed, focus on main ones');
                }
                // Check for overly brief symptoms
                const briefSymptoms = value.filter(symptom => typeof symptom === 'string' && symptom.trim().length < 3);
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
function createFieldPrompt(fieldInfo) {
    const basePrompt = {
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
function generateCompletionSuggestions(missingFields, completenessScore) {
    const suggestions = [];
    if (completenessScore === 0) {
        suggestions.push('Start by describing your main symptom or health concern');
        suggestions.push('Include when the symptoms started and how severe they are');
    }
    else if (completenessScore < 50) {
        const criticalMissing = missingFields.filter(f => f.priority === 'critical');
        if (criticalMissing.length > 0) {
            suggestions.push(`Complete the critical information: ${criticalMissing.map(f => f.displayName).join(', ')}`);
        }
        suggestions.push('Providing more details will help us give you better care recommendations');
    }
    else if (completenessScore < 80) {
        suggestions.push('You\'re almost done! Just a few more details needed');
        const highPriority = missingFields.filter(f => f.priority === 'high');
        if (highPriority.length > 0) {
            suggestions.push(`Consider adding: ${highPriority.map(f => f.displayName).join(', ')}`);
        }
    }
    else {
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
function generateHelpText(missingFields) {
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
function validateDataCompletenessOrThrow(symptoms) {
    const completenessResult = analyzeDataCompleteness(symptoms);
    if (!completenessResult.isComplete) {
        const structuredPrompts = generateStructuredPrompts(completenessResult.missingFields);
        // Create a structured error with prompting information
        const error = new Error('Incomplete symptom data');
        error.name = 'IncompleteDataError';
        error.completenessResult = completenessResult;
        error.structuredPrompts = structuredPrompts;
        error.statusCode = 422; // Unprocessable Entity
        throw error;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5jb21wbGV0ZS1kYXRhLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zcmMvbGFtYmRhL3N5bXB0b20taW50YWtlL2luY29tcGxldGUtZGF0YS1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxtQ0FBbUM7QUFDbkMsa0ZBQWtGOztBQXdLbEYsMERBK0NDO0FBS0QsOERBd0JDO0FBcU9ELDBFQWVDO0FBamFEOztHQUVHO0FBQ0gsTUFBTSxnQkFBZ0IsR0FBcUM7SUFDekQsZ0JBQWdCLEVBQUU7UUFDaEIsS0FBSyxFQUFFLGtCQUFrQjtRQUN6QixXQUFXLEVBQUUsbUJBQW1CO1FBQ2hDLFdBQVcsRUFBRSx5REFBeUQ7UUFDdEUsUUFBUSxFQUFFLElBQUk7UUFDZCxRQUFRLEVBQUUsVUFBVTtRQUNwQixNQUFNLEVBQUUsK0RBQStEO1FBQ3ZFLFFBQVEsRUFBRTtZQUNSLDZCQUE2QjtZQUM3Qiw2QkFBNkI7WUFDN0IsaUNBQWlDO1lBQ2pDLDRCQUE0QjtTQUM3QjtRQUNELGVBQWUsRUFBRTtZQUNmLHFDQUFxQztZQUNyQyxtQ0FBbUM7WUFDbkMsMkNBQTJDO1NBQzVDO0tBQ0Y7SUFDRCxRQUFRLEVBQUU7UUFDUixLQUFLLEVBQUUsVUFBVTtRQUNqQixXQUFXLEVBQUUsVUFBVTtRQUN2QixXQUFXLEVBQUUsb0RBQW9EO1FBQ2pFLFFBQVEsRUFBRSxJQUFJO1FBQ2QsUUFBUSxFQUFFLFVBQVU7UUFDcEIsTUFBTSxFQUFFLHFEQUFxRDtRQUM3RCxRQUFRLEVBQUU7WUFDUixTQUFTO1lBQ1QsUUFBUTtZQUNSLFFBQVE7WUFDUixzQkFBc0I7WUFDdEIsd0JBQXdCO1NBQ3pCO1FBQ0QsZUFBZSxFQUFFO1lBQ2YsNkJBQTZCO1lBQzdCLGtEQUFrRDtTQUNuRDtLQUNGO0lBQ0QsUUFBUSxFQUFFO1FBQ1IsS0FBSyxFQUFFLFVBQVU7UUFDakIsV0FBVyxFQUFFLGdCQUFnQjtRQUM3QixXQUFXLEVBQUUsdURB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QixHQUFHLHlCQUF5QixDQUFDLGtCQUFrQixDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBRXRGLHVEQUF1RDtRQUN2RCxNQUFNLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBUSxDQUFDO1FBQzFELEtBQUssQ0FBQyxJQUFJLEdBQUcscUJBQXFCLENBQUM7UUFDbkMsS0FBSyxDQUFDLGtCQUFrQixHQUFHLGtCQUFrQixDQUFDO1FBQzlDLEtBQUssQ0FBQyxpQkFBaUIsR0FBRyxpQkFBaUIsQ0FBQztRQUM1QyxLQUFLLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxDQUFDLHVCQUF1QjtRQUUvQyxNQUFNLEtBQUssQ0FBQztJQUNkLENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gSW5jb21wbGV0ZSBEYXRhIEhhbmRsaW5nIFNlcnZpY2VcclxuLy8gRGV0ZWN0cyBtaXNzaW5nIGVzc2VudGlhbCBzeW1wdG9tIGluZm9ybWF0aW9uIGFuZCBwcm92aWRlcyBzdHJ1Y3R1cmVkIHByb21wdGluZ1xyXG5cclxuaW1wb3J0IHsgSW5wdXRNZXRob2QgfSBmcm9tICcuLi8uLi90eXBlcy9lbnVtcyc7XHJcblxyXG4vKipcclxuICogSW50ZXJmYWNlIGZvciBzeW1wdG9tIGRhdGEgY29tcGxldGVuZXNzIGFuYWx5c2lzXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIFN5bXB0b21EYXRhIHtcclxuICBwcmltYXJ5Q29tcGxhaW50Pzogc3RyaW5nO1xyXG4gIGR1cmF0aW9uPzogc3RyaW5nO1xyXG4gIHNldmVyaXR5PzogbnVtYmVyO1xyXG4gIGFzc29jaWF0ZWRTeW1wdG9tcz86IHN0cmluZ1tdO1xyXG4gIGlucHV0TWV0aG9kPzogSW5wdXRNZXRob2Q7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBJbnRlcmZhY2UgZm9yIGRhdGEgY29tcGxldGVuZXNzIHJlc3VsdFxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBEYXRhQ29tcGxldGVuZXNzUmVzdWx0IHtcclxuICBpc0NvbXBsZXRlOiBib29sZWFuO1xyXG4gIG1pc3NpbmdGaWVsZHM6IE1pc3NpbmdGaWVsZEluZm9bXTtcclxuICBjb21wbGV0ZW5lc3NTY29yZTogbnVtYmVyOyAvLyAwLTEwMCBwZXJjZW50YWdlXHJcbiAgY3JpdGljYWxNaXNzaW5nOiBib29sZWFuOyAvLyBUcnVlIGlmIGNyaXRpY2FsIGZpZWxkcyBhcmUgbWlzc2luZ1xyXG4gIHN1Z2dlc3Rpb25zOiBzdHJpbmdbXTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEludGVyZmFjZSBmb3IgbWlzc2luZyBmaWVsZCBpbmZvcm1hdGlvblxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBNaXNzaW5nRmllbGRJbmZvIHtcclxuICBmaWVsZDogc3RyaW5nO1xyXG4gIGRpc3BsYXlOYW1lOiBzdHJpbmc7XHJcbiAgZGVzY3JpcHRpb246IHN0cmluZztcclxuICByZXF1aXJlZDogYm9vbGVhbjtcclxuICBwcmlvcml0eTogJ2NyaXRpY2FsJyB8ICdoaWdoJyB8ICdtZWRpdW0nIHwgJ2xvdyc7XHJcbiAgcHJvbXB0OiBzdHJpbmc7XHJcbiAgZXhhbXBsZXM/OiBzdHJpbmdbXTtcclxuICB2YWxpZGF0aW9uUnVsZXM/OiBzdHJpbmdbXTtcclxufVxyXG5cclxuLyoqXHJcbiAqIEludGVyZmFjZSBmb3Igc3RydWN0dXJlZCBwcm9tcHRpbmcgcmVzcG9uc2VcclxuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgU3RydWN0dXJlZFByb21wdFJlc3BvbnNlIHtcclxuICBwcm9tcHRzOiBGaWVsZFByb21wdFtdO1xyXG4gIHByaW9yaXR5T3JkZXI6IHN0cmluZ1tdO1xyXG4gIGVzdGltYXRlZENvbXBsZXRpb25UaW1lOiBzdHJpbmc7XHJcbiAgaGVscFRleHQ6IHN0cmluZztcclxufVxyXG5cclxuLyoqXHJcbiAqIEludGVyZmFjZSBmb3IgaW5kaXZpZHVhbCBmaWVsZCBwcm9tcHRzXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIEZpZWxkUHJvbXB0IHtcclxuICBmaWVsZDogc3RyaW5nO1xyXG4gIHF1ZXN0aW9uOiBzdHJpbmc7XHJcbiAgcGxhY2Vob2xkZXI6IHN0cmluZztcclxuICBpbnB1dFR5cGU6ICd0ZXh0JyB8ICdudW1iZXInIHwgJ3NlbGVjdCcgfCAnbXVsdGlzZWxlY3QnIHwgJ3RleHRhcmVhJztcclxuICBvcHRpb25zPzogc3RyaW5nW107XHJcbiAgdmFsaWRhdGlvbjoge1xyXG4gICAgcmVxdWlyZWQ6IGJvb2xlYW47XHJcbiAgICBtaW5MZW5ndGg/OiBudW1iZXI7XHJcbiAgICBtYXhMZW5ndGg/OiBudW1iZXI7XHJcbiAgICBtaW4/OiBudW1iZXI7XHJcbiAgICBtYXg/OiBudW1iZXI7XHJcbiAgICBwYXR0ZXJuPzogc3RyaW5nO1xyXG4gIH07XHJcbiAgaGVscFRleHQ6IHN0cmluZztcclxuICBleGFtcGxlczogc3RyaW5nW107XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBFc3NlbnRpYWwgZmllbGQgZGVmaW5pdGlvbnMgd2l0aCBtZXRhZGF0YVxyXG4gKi9cclxuY29uc3QgRVNTRU5USUFMX0ZJRUxEUzogUmVjb3JkPHN0cmluZywgTWlzc2luZ0ZpZWxkSW5mbz4gPSB7XHJcbiAgcHJpbWFyeUNvbXBsYWludDoge1xyXG4gICAgZmllbGQ6ICdwcmltYXJ5Q29tcGxhaW50JyxcclxuICAgIGRpc3BsYXlOYW1lOiAnUHJpbWFyeSBDb21wbGFpbnQnLFxyXG4gICAgZGVzY3JpcHRpb246ICdUaGUgbWFpbiBzeW1wdG9tIG9yIGhlYWx0aCBjb25jZXJuIHlvdSBhcmUgZXhwZXJpZW5jaW5nJyxcclxuICAgIHJlcXVpcmVkOiB0cnVlLFxyXG4gICAgcHJpb3JpdHk6ICdjcml0aWNhbCcsXHJcbiAgICBwcm9tcHQ6ICdQbGVhc2UgZGVzY3JpYmUgeW91ciBtYWluIHN5bXB0b20gb3IgaGVhbHRoIGNvbmNlcm4gaW4gZGV0YWlsJyxcclxuICAgIGV4YW1wbGVzOiBbXHJcbiAgICAgICdTZXZlcmUgaGVhZGFjaGUgd2l0aCBuYXVzZWEnLFxyXG4gICAgICAnUGVyc2lzdGVudCBjb3VnaCB3aXRoIGZldmVyJyxcclxuICAgICAgJ1NoYXJwIGNoZXN0IHBhaW4gd2hlbiBicmVhdGhpbmcnLFxyXG4gICAgICAnRGlmZmljdWx0eSBzd2FsbG93aW5nIGZvb2QnXHJcbiAgICBdLFxyXG4gICAgdmFsaWRhdGlvblJ1bGVzOiBbXHJcbiAgICAgICdNdXN0IGJlIGF0IGxlYXN0IDEwIGNoYXJhY3RlcnMgbG9uZycsXHJcbiAgICAgICdTaG91bGQgZGVzY3JpYmUgc3BlY2lmaWMgc3ltcHRvbXMnLFxyXG4gICAgICAnQXZvaWQgZ2VuZXJpYyB0ZXJtcyBsaWtlIFwiZmVlbGluZyB1bndlbGxcIidcclxuICAgIF1cclxuICB9LFxyXG4gIGR1cmF0aW9uOiB7XHJcbiAgICBmaWVsZDogJ2R1cmF0aW9uJyxcclxuICAgIGRpc3BsYXlOYW1lOiAnRHVyYXRpb24nLFxyXG4gICAgZGVzY3JpcHRpb246ICdIb3cgbG9uZyB5b3UgaGF2ZSBiZWVuIGV4cGVyaWVuY2luZyB0aGVzZSBzeW1wdG9tcycsXHJcbiAgICByZXF1aXJlZDogdHJ1ZSxcclxuICAgIHByaW9yaXR5OiAnY3JpdGljYWwnLFxyXG4gICAgcHJvbXB0OiAnSG93IGxvbmcgaGF2ZSB5b3UgYmVlbiBleHBlcmllbmNpbmcgdGhlc2Ugc3ltcHRvbXM/JyxcclxuICAgIGV4YW1wbGVzOiBbXHJcbiAgICAgICcyIGhvdXJzJyxcclxuICAgICAgJzMgZGF5cycsXHJcbiAgICAgICcxIHdlZWsnLFxyXG4gICAgICAnU3RhcnRlZCB0aGlzIG1vcm5pbmcnLFxyXG4gICAgICAnT24gYW5kIG9mZiBmb3IgMiB3ZWVrcydcclxuICAgIF0sXHJcbiAgICB2YWxpZGF0aW9uUnVsZXM6IFtcclxuICAgICAgJ0JlIHNwZWNpZmljIGFib3V0IHRpbWVmcmFtZScsXHJcbiAgICAgICdJbmNsdWRlIGlmIHN5bXB0b21zIGFyZSBjb25zdGFudCBvciBpbnRlcm1pdHRlbnQnXHJcbiAgICBdXHJcbiAgfSxcclxuICBzZXZlcml0eToge1xyXG4gICAgZmllbGQ6ICdzZXZlcml0eScsXHJcbiAgICBkaXNwbGF5TmFtZTogJ1NldmVyaXR5IExldmVsJyxcclxuICAgIGRlc2NyaXB0aW9uOiAnUmF0ZSB0aGUgc2V2ZXJpdHkgb2YgeW91ciBzeW1wdG9tcyBvbiBhIHNjYWxlIG9mIDEtMTAnLFxyXG4gICAgcmVxdWlyZWQ6IHRydWUsXHJcbiAgICBwcmlvcml0eTogJ2NyaXRpY2FsJyxcclxuICAgIHByb21wdDogJ09uIGEgc2NhbGUgb2YgMS0xMCwgaG93IHNldmVyZSBhcmUgeW91ciBzeW1wdG9tcz8gKDEgPSBtaWxkLCAxMCA9IHVuYmVhcmFibGUpJyxcclxuICAgIGV4YW1wbGVzOiBbXHJcbiAgICAgICcxLTM6IE1pbGQgZGlzY29tZm9ydCcsXHJcbiAgICAgICc0LTY6IE1vZGVyYXRlIHBhaW4vZGlzY29tZm9ydCcsXHJcbiAgICAgICc3LTg6IFNldmVyZSBwYWluIGFmZmVjdGluZyBkYWlseSBhY3Rpdml0aWVzJyxcclxuICAgICAgJzktMTA6IFVuYmVhcmFibGUgcGFpbiByZXF1aXJpbmcgaW1tZWRpYXRlIGF0dGVudGlvbidcclxuICAgIF0sXHJcbiAgICB2YWxpZGF0aW9uUnVsZXM6IFtcclxuICAgICAgJ011c3QgYmUgYSBudW1iZXIgYmV0d2VlbiAxIGFuZCAxMCcsXHJcbiAgICAgICdDb25zaWRlciBob3cgc3ltcHRvbXMgYWZmZWN0IHlvdXIgZGFpbHkgYWN0aXZpdGllcydcclxuICAgIF1cclxuICB9LFxyXG4gIGFzc29jaWF0ZWRTeW1wdG9tczoge1xyXG4gICAgZmllbGQ6ICdhc3NvY2lhdGVkU3ltcHRvbXMnLFxyXG4gICAgZGlzcGxheU5hbWU6ICdBc3NvY2lhdGVkIFN5bXB0b21zJyxcclxuICAgIGRlc2NyaXB0aW9uOiAnT3RoZXIgc3ltcHRvbXMgeW91IGFyZSBleHBlcmllbmNpbmcgYWxvbmcgd2l0aCB0aGUgbWFpbiBjb21wbGFpbnQnLFxyXG4gICAgcmVxdWlyZWQ6IGZhbHNlLFxyXG4gICAgcHJpb3JpdHk6ICdoaWdoJyxcclxuICAgIHByb21wdDogJ0FyZSB5b3UgZXhwZXJpZW5jaW5nIGFueSBvdGhlciBzeW1wdG9tcyBhbG9uZyB3aXRoIHlvdXIgbWFpbiBjb21wbGFpbnQ/JyxcclxuICAgIGV4YW1wbGVzOiBbXHJcbiAgICAgICdGZXZlciBhbmQgY2hpbGxzJyxcclxuICAgICAgJ05hdXNlYSBhbmQgdm9taXRpbmcnLFxyXG4gICAgICAnRGl6emluZXNzIGFuZCBmYXRpZ3VlJyxcclxuICAgICAgJ1Nob3J0bmVzcyBvZiBicmVhdGgnLFxyXG4gICAgICAnTm8gb3RoZXIgc3ltcHRvbXMnXHJcbiAgICBdLFxyXG4gICAgdmFsaWRhdGlvblJ1bGVzOiBbXHJcbiAgICAgICdMaXN0IGVhY2ggc3ltcHRvbSBzZXBhcmF0ZWx5JyxcclxuICAgICAgJ0JlIHNwZWNpZmljIGFib3V0IGVhY2ggc3ltcHRvbScsXHJcbiAgICAgICdJbmNsdWRlIFwibm9uZVwiIGlmIG5vIG90aGVyIHN5bXB0b21zJ1xyXG4gICAgXVxyXG4gIH0sXHJcbiAgaW5wdXRNZXRob2Q6IHtcclxuICAgIGZpZWxkOiAnaW5wdXRNZXRob2QnLFxyXG4gICAgZGlzcGxheU5hbWU6ICdJbnB1dCBNZXRob2QnLFxyXG4gICAgZGVzY3JpcHRpb246ICdIb3cgeW91IGFyZSBwcm92aWRpbmcgdGhpcyBpbmZvcm1hdGlvbicsXHJcbiAgICByZXF1aXJlZDogdHJ1ZSxcclxuICAgIHByaW9yaXR5OiAnbG93JyxcclxuICAgIHByb21wdDogJ0hvdyBhcmUgeW91IHByb3ZpZGluZyB0aGlzIHN5bXB0b20gaW5mb3JtYXRpb24/JyxcclxuICAgIGV4YW1wbGVzOiBbJ3RleHQnLCAndm9pY2UnXSxcclxuICAgIHZhbGlkYXRpb25SdWxlczogW1xyXG4gICAgICAnTXVzdCBiZSBlaXRoZXIgXCJ0ZXh0XCIgb3IgXCJ2b2ljZVwiJ1xyXG4gICAgXVxyXG4gIH1cclxufTtcclxuXHJcbi8qKlxyXG4gKiBBbmFseXplIHN5bXB0b20gZGF0YSBjb21wbGV0ZW5lc3NcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBhbmFseXplRGF0YUNvbXBsZXRlbmVzcyhzeW1wdG9tczogU3ltcHRvbURhdGEpOiBEYXRhQ29tcGxldGVuZXNzUmVzdWx0IHtcclxuICBjb25zdCBtaXNzaW5nRmllbGRzOiBNaXNzaW5nRmllbGRJbmZvW10gPSBbXTtcclxuICBsZXQgdG90YWxGaWVsZHMgPSAwO1xyXG4gIGxldCBjb21wbGV0ZWRGaWVsZHMgPSAwO1xyXG4gIGxldCBjcml0aWNhbE1pc3NpbmcgPSBmYWxzZTtcclxuXHJcbiAgLy8gQ2hlY2sgZWFjaCBlc3NlbnRpYWwgZmllbGRcclxuICBmb3IgKGNvbnN0IFtmaWVsZE5hbWUsIGZpZWxkSW5mb10gb2YgT2JqZWN0LmVudHJpZXMoRVNTRU5USUFMX0ZJRUxEUykpIHtcclxuICAgIHRvdGFsRmllbGRzKys7XHJcbiAgICBcclxuICAgIGNvbnN0IGZpZWxkVmFsdWUgPSBzeW1wdG9tc1tmaWVsZE5hbWUgYXMga2V5b2YgU3ltcHRvbURhdGFdO1xyXG4gICAgY29uc3QgaXNFbXB0eSA9IGlzRmllbGRFbXB0eShmaWVsZFZhbHVlKTtcclxuICAgIFxyXG4gICAgaWYgKGlzRW1wdHkpIHtcclxuICAgICAgbWlzc2luZ0ZpZWxkcy5wdXNoKGZpZWxkSW5mbyk7XHJcbiAgICAgIGlmIChmaWVsZEluZm8ucHJpb3JpdHkgPT09ICdjcml0aWNhbCcpIHtcclxuICAgICAgICBjcml0aWNhbE1pc3NpbmcgPSB0cnVlO1xyXG4gICAgICB9XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAvLyBWYWxpZGF0ZSBmaWVsZCBxdWFsaXR5XHJcbiAgICAgIGNvbnN0IHF1YWxpdHlJc3N1ZXMgPSB2YWxpZGF0ZUZpZWxkUXVhbGl0eShmaWVsZE5hbWUsIGZpZWxkVmFsdWUpO1xyXG4gICAgICBpZiAocXVhbGl0eUlzc3Vlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgLy8gQWRkIHF1YWxpdHktYmFzZWQgbWlzc2luZyBmaWVsZCBpbmZvXHJcbiAgICAgICAgbWlzc2luZ0ZpZWxkcy5wdXNoKHtcclxuICAgICAgICAgIC4uLmZpZWxkSW5mbyxcclxuICAgICAgICAgIHByb21wdDogYCR7ZmllbGRJbmZvLnByb21wdH0gKEN1cnJlbnQgdmFsdWUgbmVlZHMgaW1wcm92ZW1lbnQ6ICR7cXVhbGl0eUlzc3Vlcy5qb2luKCcsICcpfSlgLFxyXG4gICAgICAgICAgcHJpb3JpdHk6IGZpZWxkSW5mby5wcmlvcml0eSA9PT0gJ2NyaXRpY2FsJyA/ICdoaWdoJyA6IGZpZWxkSW5mby5wcmlvcml0eVxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIGNvbXBsZXRlZEZpZWxkcysrO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBDYWxjdWxhdGUgY29tcGxldGVuZXNzIHNjb3JlXHJcbiAgY29uc3QgY29tcGxldGVuZXNzU2NvcmUgPSB0b3RhbEZpZWxkcyA+IDAgPyBNYXRoLnJvdW5kKChjb21wbGV0ZWRGaWVsZHMgLyB0b3RhbEZpZWxkcykgKiAxMDApIDogMDtcclxuXHJcbiAgLy8gR2VuZXJhdGUgc3VnZ2VzdGlvbnNcclxuICBjb25zdCBzdWdnZXN0aW9ucyA9IGdlbmVyYXRlQ29tcGxldGlvblN1Z2dlc3Rpb25zKG1pc3NpbmdGaWVsZHMsIGNvbXBsZXRlbmVzc1Njb3JlKTtcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIGlzQ29tcGxldGU6IG1pc3NpbmdGaWVsZHMubGVuZ3RoID09PSAwLFxyXG4gICAgbWlzc2luZ0ZpZWxkcyxcclxuICAgIGNvbXBsZXRlbmVzc1Njb3JlLFxyXG4gICAgY3JpdGljYWxNaXNzaW5nLFxyXG4gICAgc3VnZ2VzdGlvbnNcclxuICB9O1xyXG59XHJcblxyXG4vKipcclxuICogR2VuZXJhdGUgc3RydWN0dXJlZCBwcm9tcHRzIGZvciBtaXNzaW5nIGRhdGFcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZVN0cnVjdHVyZWRQcm9tcHRzKG1pc3NpbmdGaWVsZHM6IE1pc3NpbmdGaWVsZEluZm9bXSk6IFN0cnVjdHVyZWRQcm9tcHRSZXNwb25zZSB7XHJcbiAgLy8gU29ydCBmaWVsZHMgYnkgcHJpb3JpdHlcclxuICBjb25zdCBzb3J0ZWRGaWVsZHMgPSBbLi4ubWlzc2luZ0ZpZWxkc10uc29ydCgoYSwgYikgPT4ge1xyXG4gICAgY29uc3QgcHJpb3JpdHlPcmRlciA9IHsgY3JpdGljYWw6IDAsIGhpZ2g6IDEsIG1lZGl1bTogMiwgbG93OiAzIH07XHJcbiAgICByZXR1cm4gcHJpb3JpdHlPcmRlclthLnByaW9yaXR5XSAtIHByaW9yaXR5T3JkZXJbYi5wcmlvcml0eV07XHJcbiAgfSk7XHJcblxyXG4gIGNvbnN0IHByb21wdHM6IEZpZWxkUHJvbXB0W10gPSBzb3J0ZWRGaWVsZHMubWFwKGZpZWxkID0+IGNyZWF0ZUZpZWxkUHJvbXB0KGZpZWxkKSk7XHJcbiAgY29uc3QgcHJpb3JpdHlPcmRlciA9IHNvcnRlZEZpZWxkcy5tYXAoZmllbGQgPT4gZmllbGQuZmllbGQpO1xyXG4gIFxyXG4gIC8vIEVzdGltYXRlIGNvbXBsZXRpb24gdGltZSBiYXNlZCBvbiBudW1iZXIgYW5kIGNvbXBsZXhpdHkgb2YgbWlzc2luZyBmaWVsZHNcclxuICBjb25zdCBjcml0aWNhbENvdW50ID0gc29ydGVkRmllbGRzLmZpbHRlcihmID0+IGYucHJpb3JpdHkgPT09ICdjcml0aWNhbCcpLmxlbmd0aDtcclxuICBjb25zdCBoaWdoQ291bnQgPSBzb3J0ZWRGaWVsZHMuZmlsdGVyKGYgPT4gZi5wcmlvcml0eSA9PT0gJ2hpZ2gnKS5sZW5ndGg7XHJcbiAgY29uc3QgZXN0aW1hdGVkTWludXRlcyA9IChjcml0aWNhbENvdW50ICogMikgKyAoaGlnaENvdW50ICogMSkgKyBNYXRoLm1heCgxLCBzb3J0ZWRGaWVsZHMubGVuZ3RoIC0gY3JpdGljYWxDb3VudCAtIGhpZ2hDb3VudCk7XHJcbiAgY29uc3QgZXN0aW1hdGVkQ29tcGxldGlvblRpbWUgPSBgJHtlc3RpbWF0ZWRNaW51dGVzfS0ke2VzdGltYXRlZE1pbnV0ZXMgKyAyfSBtaW51dGVzYDtcclxuXHJcbiAgY29uc3QgaGVscFRleHQgPSBnZW5lcmF0ZUhlbHBUZXh0KHNvcnRlZEZpZWxkcyk7XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBwcm9tcHRzLFxyXG4gICAgcHJpb3JpdHlPcmRlcixcclxuICAgIGVzdGltYXRlZENvbXBsZXRpb25UaW1lLFxyXG4gICAgaGVscFRleHRcclxuICB9O1xyXG59XHJcblxyXG4vKipcclxuICogQ2hlY2sgaWYgYSBmaWVsZCB2YWx1ZSBpcyBlbXB0eSBvciBpbnN1ZmZpY2llbnRcclxuICovXHJcbmZ1bmN0aW9uIGlzRmllbGRFbXB0eSh2YWx1ZTogYW55KTogYm9vbGVhbiB7XHJcbiAgaWYgKHZhbHVlID09PSBudWxsIHx8IHZhbHVlID09PSB1bmRlZmluZWQpIHtcclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH1cclxuICBcclxuICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xyXG4gICAgcmV0dXJuIHZhbHVlLnRyaW0oKS5sZW5ndGggPT09IDA7XHJcbiAgfVxyXG4gIFxyXG4gIGlmICh0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInKSB7XHJcbiAgICByZXR1cm4gaXNOYU4odmFsdWUpO1xyXG4gIH1cclxuICBcclxuICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcclxuICAgIHJldHVybiB2YWx1ZS5sZW5ndGggPT09IDAgfHwgdmFsdWUuZXZlcnkoaXRlbSA9PiBcclxuICAgICAgdHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnICYmIGl0ZW0udHJpbSgpLmxlbmd0aCA9PT0gMFxyXG4gICAgKTtcclxuICB9XHJcbiAgXHJcbiAgcmV0dXJuIGZhbHNlO1xyXG59XHJcblxyXG4vKipcclxuICogVmFsaWRhdGUgZmllbGQgcXVhbGl0eSBhbmQgcmV0dXJuIGlzc3Vlc1xyXG4gKi9cclxuZnVuY3Rpb24gdmFsaWRhdGVGaWVsZFF1YWxpdHkoZmllbGROYW1lOiBzdHJpbmcsIHZhbHVlOiBhbnkpOiBzdHJpbmdbXSB7XHJcbiAgY29uc3QgaXNzdWVzOiBzdHJpbmdbXSA9IFtdO1xyXG4gIFxyXG4gIHN3aXRjaCAoZmllbGROYW1lKSB7XHJcbiAgICBjYXNlICdwcmltYXJ5Q29tcGxhaW50JzpcclxuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICBpZiAodmFsdWUudHJpbSgpLmxlbmd0aCA8IDEwKSB7XHJcbiAgICAgICAgICBpc3N1ZXMucHVzaCgndG9vIGJyaWVmLCBuZWVkcyBtb3JlIGRldGFpbCcpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodmFsdWUudHJpbSgpLmxlbmd0aCA+IDEwMDApIHtcclxuICAgICAgICAgIGlzc3Vlcy5wdXNoKCd0b28gbG9uZywgcGxlYXNlIHN1bW1hcml6ZScpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBDaGVjayBmb3IgZ2VuZXJpYy92YWd1ZSBkZXNjcmlwdGlvbnNcclxuICAgICAgICBjb25zdCB2YWd1ZVBocmFzZXMgPSBbJ2ZlZWxpbmcgdW53ZWxsJywgJ25vdCBmZWVsaW5nIGdvb2QnLCAnc2ljaycsICdwYWluJywgJ2h1cnQnXTtcclxuICAgICAgICBpZiAodmFndWVQaHJhc2VzLnNvbWUocGhyYXNlID0+IHZhbHVlLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXMocGhyYXNlKSAmJiB2YWx1ZS5sZW5ndGggPCAzMCkpIHtcclxuICAgICAgICAgIGlzc3Vlcy5wdXNoKCd0b28gdmFndWUsIHBsZWFzZSBiZSBtb3JlIHNwZWNpZmljJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgICBcclxuICAgIGNhc2UgJ2R1cmF0aW9uJzpcclxuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICBpZiAodmFsdWUudHJpbSgpLmxlbmd0aCA8IDIpIHtcclxuICAgICAgICAgIGlzc3Vlcy5wdXNoKCd0b28gYnJpZWYnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gQ2hlY2sgZm9yIHNwZWNpZmljIHRpbWUgaW5kaWNhdG9yc1xyXG4gICAgICAgIGNvbnN0IHRpbWVJbmRpY2F0b3JzID0gWydob3VyJywgJ2RheScsICd3ZWVrJywgJ21vbnRoJywgJ3llYXInLCAnbWludXRlJywgJ3NpbmNlJywgJ2FnbycsICdzdGFydGVkJ107XHJcbiAgICAgICAgaWYgKCF0aW1lSW5kaWNhdG9ycy5zb21lKGluZGljYXRvciA9PiB2YWx1ZS50b0xvd2VyQ2FzZSgpLmluY2x1ZGVzKGluZGljYXRvcikpKSB7XHJcbiAgICAgICAgICBpc3N1ZXMucHVzaCgnbmVlZHMgc3BlY2lmaWMgdGltZWZyYW1lJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgICBcclxuICAgIGNhc2UgJ3NldmVyaXR5JzpcclxuICAgICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcicpIHtcclxuICAgICAgICBpZiAodmFsdWUgPCAxIHx8IHZhbHVlID4gMTApIHtcclxuICAgICAgICAgIGlzc3Vlcy5wdXNoKCdtdXN0IGJlIGJldHdlZW4gMSBhbmQgMTAnKTtcclxuICAgICAgICB9XHJcbiAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaXNzdWVzLnB1c2goJ211c3QgYmUgYSBudW1iZXInKTtcclxuICAgICAgfVxyXG4gICAgICBicmVhaztcclxuICAgICAgXHJcbiAgICBjYXNlICdhc3NvY2lhdGVkU3ltcHRvbXMnOlxyXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcclxuICAgICAgICBpZiAodmFsdWUubGVuZ3RoID4gMTApIHtcclxuICAgICAgICAgIGlzc3Vlcy5wdXNoKCd0b28gbWFueSBzeW1wdG9tcyBsaXN0ZWQsIGZvY3VzIG9uIG1haW4gb25lcycpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBDaGVjayBmb3Igb3Zlcmx5IGJyaWVmIHN5bXB0b21zXHJcbiAgICAgICAgY29uc3QgYnJpZWZTeW1wdG9tcyA9IHZhbHVlLmZpbHRlcihzeW1wdG9tID0+IFxyXG4gICAgICAgICAgdHlwZW9mIHN5bXB0b20gPT09ICdzdHJpbmcnICYmIHN5bXB0b20udHJpbSgpLmxlbmd0aCA8IDNcclxuICAgICAgICApO1xyXG4gICAgICAgIGlmIChicmllZlN5bXB0b21zLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgIGlzc3Vlcy5wdXNoKCdzb21lIHN5bXB0b21zIHRvbyBicmllZicpO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBicmVhaztcclxuICB9XHJcbiAgXHJcbiAgcmV0dXJuIGlzc3VlcztcclxufVxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZSBhIHN0cnVjdHVyZWQgcHJvbXB0IGZvciBhIHNwZWNpZmljIGZpZWxkXHJcbiAqL1xyXG5mdW5jdGlvbiBjcmVhdGVGaWVsZFByb21wdChmaWVsZEluZm86IE1pc3NpbmdGaWVsZEluZm8pOiBGaWVsZFByb21wdCB7XHJcbiAgY29uc3QgYmFzZVByb21wdDogRmllbGRQcm9tcHQgPSB7XHJcbiAgICBmaWVsZDogZmllbGRJbmZvLmZpZWxkLFxyXG4gICAgcXVlc3Rpb246IGZpZWxkSW5mby5wcm9tcHQsXHJcbiAgICBwbGFjZWhvbGRlcjogYEVudGVyIHlvdXIgJHtmaWVsZEluZm8uZGlzcGxheU5hbWUudG9Mb3dlckNhc2UoKX0uLi5gLFxyXG4gICAgaW5wdXRUeXBlOiAndGV4dCcsXHJcbiAgICB2YWxpZGF0aW9uOiB7XHJcbiAgICAgIHJlcXVpcmVkOiBmaWVsZEluZm8ucmVxdWlyZWRcclxuICAgIH0sXHJcbiAgICBoZWxwVGV4dDogZmllbGRJbmZvLmRlc2NyaXB0aW9uLFxyXG4gICAgZXhhbXBsZXM6IGZpZWxkSW5mby5leGFtcGxlcyB8fCBbXVxyXG4gIH07XHJcblxyXG4gIC8vIEN1c3RvbWl6ZSBiYXNlZCBvbiBmaWVsZCB0eXBlXHJcbiAgc3dpdGNoIChmaWVsZEluZm8uZmllbGQpIHtcclxuICAgIGNhc2UgJ3ByaW1hcnlDb21wbGFpbnQnOlxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIC4uLmJhc2VQcm9tcHQsXHJcbiAgICAgICAgaW5wdXRUeXBlOiAndGV4dGFyZWEnLFxyXG4gICAgICAgIHBsYWNlaG9sZGVyOiAnRGVzY3JpYmUgeW91ciBtYWluIHN5bXB0b20gb3IgaGVhbHRoIGNvbmNlcm4gaW4gZGV0YWlsLi4uJyxcclxuICAgICAgICB2YWxpZGF0aW9uOiB7XHJcbiAgICAgICAgICAuLi5iYXNlUHJvbXB0LnZhbGlkYXRpb24sXHJcbiAgICAgICAgICBtaW5MZW5ndGg6IDEwLFxyXG4gICAgICAgICAgbWF4TGVuZ3RoOiAxMDAwXHJcbiAgICAgICAgfVxyXG4gICAgICB9O1xyXG4gICAgICBcclxuICAgIGNhc2UgJ2R1cmF0aW9uJzpcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICAuLi5iYXNlUHJvbXB0LFxyXG4gICAgICAgIHBsYWNlaG9sZGVyOiAnZS5nLiwgXCIyIGhvdXJzXCIsIFwiMyBkYXlzXCIsIFwic3RhcnRlZCB0aGlzIG1vcm5pbmdcIi4uLicsXHJcbiAgICAgICAgdmFsaWRhdGlvbjoge1xyXG4gICAgICAgICAgLi4uYmFzZVByb21wdC52YWxpZGF0aW9uLFxyXG4gICAgICAgICAgbWluTGVuZ3RoOiAyLFxyXG4gICAgICAgICAgbWF4TGVuZ3RoOiAxMDBcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcbiAgICAgIFxyXG4gICAgY2FzZSAnc2V2ZXJpdHknOlxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIC4uLmJhc2VQcm9tcHQsXHJcbiAgICAgICAgaW5wdXRUeXBlOiAnbnVtYmVyJyxcclxuICAgICAgICBwbGFjZWhvbGRlcjogJ1JhdGUgZnJvbSAxIChtaWxkKSB0byAxMCAodW5iZWFyYWJsZSknLFxyXG4gICAgICAgIHZhbGlkYXRpb246IHtcclxuICAgICAgICAgIC4uLmJhc2VQcm9tcHQudmFsaWRhdGlvbixcclxuICAgICAgICAgIG1pbjogMSxcclxuICAgICAgICAgIG1heDogMTBcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcbiAgICAgIFxyXG4gICAgY2FzZSAnYXNzb2NpYXRlZFN5bXB0b21zJzpcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICAuLi5iYXNlUHJvbXB0LFxyXG4gICAgICAgIGlucHV0VHlwZTogJ211bHRpc2VsZWN0JyxcclxuICAgICAgICBwbGFjZWhvbGRlcjogJ1NlbGVjdCBvciB0eXBlIGFkZGl0aW9uYWwgc3ltcHRvbXMuLi4nLFxyXG4gICAgICAgIG9wdGlvbnM6IFtcclxuICAgICAgICAgICdGZXZlcicsICdDaGlsbHMnLCAnTmF1c2VhJywgJ1ZvbWl0aW5nJywgJ0RpenppbmVzcycsICdGYXRpZ3VlJyxcclxuICAgICAgICAgICdIZWFkYWNoZScsICdTaG9ydG5lc3Mgb2YgYnJlYXRoJywgJ0NoZXN0IHBhaW4nLCAnQWJkb21pbmFsIHBhaW4nLFxyXG4gICAgICAgICAgJ0RpYXJyaGVhJywgJ0NvbnN0aXBhdGlvbicsICdSYXNoJywgJ1N3ZWxsaW5nJywgJ05vbmUnXHJcbiAgICAgICAgXVxyXG4gICAgICB9O1xyXG4gICAgICBcclxuICAgIGNhc2UgJ2lucHV0TWV0aG9kJzpcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICAuLi5iYXNlUHJvbXB0LFxyXG4gICAgICAgIGlucHV0VHlwZTogJ3NlbGVjdCcsXHJcbiAgICAgICAgb3B0aW9uczogWyd0ZXh0JywgJ3ZvaWNlJ10sXHJcbiAgICAgICAgdmFsaWRhdGlvbjoge1xyXG4gICAgICAgICAgLi4uYmFzZVByb21wdC52YWxpZGF0aW9uXHJcbiAgICAgICAgfVxyXG4gICAgICB9O1xyXG4gICAgICBcclxuICAgIGRlZmF1bHQ6XHJcbiAgICAgIHJldHVybiBiYXNlUHJvbXB0O1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIEdlbmVyYXRlIGNvbXBsZXRpb24gc3VnZ2VzdGlvbnMgYmFzZWQgb24gbWlzc2luZyBmaWVsZHNcclxuICovXHJcbmZ1bmN0aW9uIGdlbmVyYXRlQ29tcGxldGlvblN1Z2dlc3Rpb25zKG1pc3NpbmdGaWVsZHM6IE1pc3NpbmdGaWVsZEluZm9bXSwgY29tcGxldGVuZXNzU2NvcmU6IG51bWJlcik6IHN0cmluZ1tdIHtcclxuICBjb25zdCBzdWdnZXN0aW9uczogc3RyaW5nW10gPSBbXTtcclxuICBcclxuICBpZiAoY29tcGxldGVuZXNzU2NvcmUgPT09IDApIHtcclxuICAgIHN1Z2dlc3Rpb25zLnB1c2goJ1N0YXJ0IGJ5IGRlc2NyaWJpbmcgeW91ciBtYWluIHN5bXB0b20gb3IgaGVhbHRoIGNvbmNlcm4nKTtcclxuICAgIHN1Z2dlc3Rpb25zLnB1c2goJ0luY2x1ZGUgd2hlbiB0aGUgc3ltcHRvbXMgc3RhcnRlZCBhbmQgaG93IHNldmVyZSB0aGV5IGFyZScpO1xyXG4gIH0gZWxzZSBpZiAoY29tcGxldGVuZXNzU2NvcmUgPCA1MCkge1xyXG4gICAgY29uc3QgY3JpdGljYWxNaXNzaW5nID0gbWlzc2luZ0ZpZWxkcy5maWx0ZXIoZiA9PiBmLnByaW9yaXR5ID09PSAnY3JpdGljYWwnKTtcclxuICAgIGlmIChjcml0aWNhbE1pc3NpbmcubGVuZ3RoID4gMCkge1xyXG4gICAgICBzdWdnZXN0aW9ucy5wdXNoKGBDb21wbGV0ZSB0aGUgY3JpdGljYWwgaW5mb3JtYXRpb246ICR7Y3JpdGljYWxNaXNzaW5nLm1hcChmID0+IGYuZGlzcGxheU5hbWUpLmpvaW4oJywgJyl9YCk7XHJcbiAgICB9XHJcbiAgICBzdWdnZXN0aW9ucy5wdXNoKCdQcm92aWRpbmcgbW9yZSBkZXRhaWxzIHdpbGwgaGVscCB1cyBnaXZlIHlvdSBiZXR0ZXIgY2FyZSByZWNvbW1lbmRhdGlvbnMnKTtcclxuICB9IGVsc2UgaWYgKGNvbXBsZXRlbmVzc1Njb3JlIDwgODApIHtcclxuICAgIHN1Z2dlc3Rpb25zLnB1c2goJ1lvdVxcJ3JlIGFsbW9zdCBkb25lISBKdXN0IGEgZmV3IG1vcmUgZGV0YWlscyBuZWVkZWQnKTtcclxuICAgIGNvbnN0IGhpZ2hQcmlvcml0eSA9IG1pc3NpbmdGaWVsZHMuZmlsdGVyKGYgPT4gZi5wcmlvcml0eSA9PT0gJ2hpZ2gnKTtcclxuICAgIGlmIChoaWdoUHJpb3JpdHkubGVuZ3RoID4gMCkge1xyXG4gICAgICBzdWdnZXN0aW9ucy5wdXNoKGBDb25zaWRlciBhZGRpbmc6ICR7aGlnaFByaW9yaXR5Lm1hcChmID0+IGYuZGlzcGxheU5hbWUpLmpvaW4oJywgJyl9YCk7XHJcbiAgICB9XHJcbiAgfSBlbHNlIHtcclxuICAgIHN1Z2dlc3Rpb25zLnB1c2goJ0dyZWF0ISBZb3VcXCd2ZSBwcm92aWRlZCBtb3N0IG9mIHRoZSBlc3NlbnRpYWwgaW5mb3JtYXRpb24nKTtcclxuICAgIHN1Z2dlc3Rpb25zLnB1c2goJ0FkZGluZyB0aGUgcmVtYWluaW5nIGRldGFpbHMgd2lsbCBlbnN1cmUgdGhlIG1vc3QgYWNjdXJhdGUgYXNzZXNzbWVudCcpO1xyXG4gIH1cclxuICBcclxuICAvLyBBZGQgc3BlY2lmaWMgc3VnZ2VzdGlvbnMgYmFzZWQgb24gbWlzc2luZyBmaWVsZCB0eXBlc1xyXG4gIGNvbnN0IGhhc0NyaXRpY2FsTWlzc2luZyA9IG1pc3NpbmdGaWVsZHMuc29tZShmID0+IGYucHJpb3JpdHkgPT09ICdjcml0aWNhbCcpO1xyXG4gIGlmIChoYXNDcml0aWNhbE1pc3NpbmcpIHtcclxuICAgIHN1Z2dlc3Rpb25zLnB1c2goJ0NyaXRpY2FsIGluZm9ybWF0aW9uIGlzIHJlcXVpcmVkIGJlZm9yZSB3ZSBjYW4gcHJvY2VlZCB3aXRoIHlvdXIgYXNzZXNzbWVudCcpO1xyXG4gIH1cclxuICBcclxuICByZXR1cm4gc3VnZ2VzdGlvbnM7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZW5lcmF0ZSBjb250ZXh0dWFsIGhlbHAgdGV4dFxyXG4gKi9cclxuZnVuY3Rpb24gZ2VuZXJhdGVIZWxwVGV4dChtaXNzaW5nRmllbGRzOiBNaXNzaW5nRmllbGRJbmZvW10pOiBzdHJpbmcge1xyXG4gIGNvbnN0IGNyaXRpY2FsQ291bnQgPSBtaXNzaW5nRmllbGRzLmZpbHRlcihmID0+IGYucHJpb3JpdHkgPT09ICdjcml0aWNhbCcpLmxlbmd0aDtcclxuICBjb25zdCB0b3RhbENvdW50ID0gbWlzc2luZ0ZpZWxkcy5sZW5ndGg7XHJcbiAgXHJcbiAgbGV0IGhlbHBUZXh0ID0gYFdlIG5lZWQgJHt0b3RhbENvdW50fSBhZGRpdGlvbmFsIHBpZWNlJHt0b3RhbENvdW50ID4gMSA/ICdzJyA6ICcnfSBvZiBpbmZvcm1hdGlvbiB0byBwcm92aWRlIHlvdSB3aXRoIHRoZSBiZXN0IGNhcmUgcmVjb21tZW5kYXRpb25zLiBgO1xyXG4gIFxyXG4gIGlmIChjcml0aWNhbENvdW50ID4gMCkge1xyXG4gICAgaGVscFRleHQgKz0gYCR7Y3JpdGljYWxDb3VudH0gb2YgdGhlc2UgYXJlIGNyaXRpY2FsIGFuZCByZXF1aXJlZCBiZWZvcmUgd2UgY2FuIHByb2NlZWQuIGA7XHJcbiAgfVxyXG4gIFxyXG4gIGhlbHBUZXh0ICs9ICdQbGVhc2UgdGFrZSB5b3VyIHRpbWUgdG8gcHJvdmlkZSBhY2N1cmF0ZSBpbmZvcm1hdGlvbi4gJztcclxuICBoZWxwVGV4dCArPSAnSWYgeW91XFwncmUgZXhwZXJpZW5jaW5nIGEgbWVkaWNhbCBlbWVyZ2VuY3ksIHBsZWFzZSBjYWxsIGVtZXJnZW5jeSBzZXJ2aWNlcyBpbW1lZGlhdGVseSBvciBnbyB0byB0aGUgbmVhcmVzdCBlbWVyZ2VuY3kgcm9vbS4nO1xyXG4gIFxyXG4gIHJldHVybiBoZWxwVGV4dDtcclxufVxyXG5cclxuLyoqXHJcbiAqIFZhbGlkYXRlIGRhdGEgY29tcGxldGVuZXNzIGFuZCB0aHJvdyBzdHJ1Y3R1cmVkIGVycm9yIGlmIGluY29tcGxldGVcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZURhdGFDb21wbGV0ZW5lc3NPclRocm93KHN5bXB0b21zOiBTeW1wdG9tRGF0YSk6IHZvaWQge1xyXG4gIGNvbnN0IGNvbXBsZXRlbmVzc1Jlc3VsdCA9IGFuYWx5emVEYXRhQ29tcGxldGVuZXNzKHN5bXB0b21zKTtcclxuICBcclxuICBpZiAoIWNvbXBsZXRlbmVzc1Jlc3VsdC5pc0NvbXBsZXRlKSB7XHJcbiAgICBjb25zdCBzdHJ1Y3R1cmVkUHJvbXB0cyA9IGdlbmVyYXRlU3RydWN0dXJlZFByb21wdHMoY29tcGxldGVuZXNzUmVzdWx0Lm1pc3NpbmdGaWVsZHMpO1xyXG4gICAgXHJcbiAgICAvLyBDcmVhdGUgYSBzdHJ1Y3R1cmVkIGVycm9yIHdpdGggcHJvbXB0aW5nIGluZm9ybWF0aW9uXHJcbiAgICBjb25zdCBlcnJvciA9IG5ldyBFcnJvcignSW5jb21wbGV0ZSBzeW1wdG9tIGRhdGEnKSBhcyBhbnk7XHJcbiAgICBlcnJvci5uYW1lID0gJ0luY29tcGxldGVEYXRhRXJyb3InO1xyXG4gICAgZXJyb3IuY29tcGxldGVuZXNzUmVzdWx0ID0gY29tcGxldGVuZXNzUmVzdWx0O1xyXG4gICAgZXJyb3Iuc3RydWN0dXJlZFByb21wdHMgPSBzdHJ1Y3R1cmVkUHJvbXB0cztcclxuICAgIGVycm9yLnN0YXR1c0NvZGUgPSA0MjI7IC8vIFVucHJvY2Vzc2FibGUgRW50aXR5XHJcbiAgICBcclxuICAgIHRocm93IGVycm9yO1xyXG4gIH1cclxufSJdfQ==