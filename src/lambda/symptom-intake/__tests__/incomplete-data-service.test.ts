// Unit tests for Incomplete Data Handling Service

import {
  analyzeDataCompleteness,
  generateStructuredPrompts,
  validateDataCompletenessOrThrow,
  SymptomData,
  DataCompletenessResult,
  StructuredPromptResponse
} from '../incomplete-data-service';
import { InputMethod } from '../../../types/enums';

describe('Incomplete Data Handling Service', () => {
  describe('analyzeDataCompleteness', () => {
    it('should identify complete data correctly', () => {
      const completeSymptoms: SymptomData = {
        primaryComplaint: 'Severe headache with nausea and sensitivity to light',
        duration: '2 hours',
        severity: 8,
        associatedSymptoms: ['nausea', 'sensitivity to light'],
        inputMethod: InputMethod.TEXT
      };

      const result = analyzeDataCompleteness(completeSymptoms);

      expect(result.isComplete).toBe(true);
      expect(result.missingFields).toHaveLength(0);
      expect(result.completenessScore).toBe(100);
      expect(result.criticalMissing).toBe(false);
      expect(result.suggestions).toContain('Great! You\'ve provided most of the essential information');
    });

    it('should identify missing critical fields', () => {
      const incompleteSymptoms: SymptomData = {
        associatedSymptoms: ['fever'],
        inputMethod: InputMethod.TEXT
      };

      const result = analyzeDataCompleteness(incompleteSymptoms);

      expect(result.isComplete).toBe(false);
      expect(result.criticalMissing).toBe(true);
      expect(result.completenessScore).toBeLessThan(50);
      
      const missingFieldNames = result.missingFields.map(f => f.field);
      expect(missingFieldNames).toContain('primaryComplaint');
      expect(missingFieldNames).toContain('duration');
      expect(missingFieldNames).toContain('severity');
    });

    it('should identify quality issues in existing fields', () => {
      const poorQualitySymptoms: SymptomData = {
        primaryComplaint: 'sick', // Too vague and brief
        duration: 'a while', // No specific timeframe
        severity: 15, // Out of range
        associatedSymptoms: ['a', 'b', 'c'], // Too brief
        inputMethod: InputMethod.TEXT
      };

      const result = analyzeDataCompleteness(poorQualitySymptoms);

      expect(result.isComplete).toBe(false);
      expect(result.missingFields.length).toBeGreaterThan(0);
      
      // Should identify quality issues
      const primaryComplaintIssue = result.missingFields.find(f => f.field === 'primaryComplaint');
      expect(primaryComplaintIssue?.prompt).toContain('Current value needs improvement');
    });

    it('should calculate completeness score correctly', () => {
      const partialSymptoms: SymptomData = {
        primaryComplaint: 'Persistent cough with yellow phlegm',
        duration: '5 days',
        inputMethod: InputMethod.TEXT
        // Missing severity and associatedSymptoms
      };

      const result = analyzeDataCompleteness(partialSymptoms);

      expect(result.completenessScore).toBe(60); // 3 out of 5 fields complete
      expect(result.isComplete).toBe(false);
      expect(result.criticalMissing).toBe(true); // severity is critical
    });

    it('should handle empty arrays correctly', () => {
      const symptomsWithEmptyArray: SymptomData = {
        primaryComplaint: 'Chest pain when breathing deeply',
        duration: '30 minutes',
        severity: 7,
        associatedSymptoms: [], // Empty array
        inputMethod: InputMethod.TEXT
      };

      const result = analyzeDataCompleteness(symptomsWithEmptyArray);

      expect(result.isComplete).toBe(false);
      const associatedSymptomsField = result.missingFields.find(f => f.field === 'associatedSymptoms');
      expect(associatedSymptomsField).toBeDefined();
    });

    it('should provide appropriate suggestions based on completeness level', () => {
      // Test different completeness levels
      const scenarios = [
        {
          symptoms: {},
          expectedSuggestion: 'start by describing'
        },
        {
          symptoms: { primaryComplaint: 'Headache' },
          expectedSuggestion: 'critical information'
        },
        {
          symptoms: {
            primaryComplaint: 'Severe headache with nausea',
            duration: '2 hours',
            severity: 8
          },
          expectedSuggestion: 'almost done'
        }
      ];

      scenarios.forEach((scenario, index) => {
        const result = analyzeDataCompleteness(scenario.symptoms);
        expect(result.suggestions.some(s => s.toLowerCase().includes(scenario.expectedSuggestion.toLowerCase()))).toBe(true);
      });
    });
  });

  describe('generateStructuredPrompts', () => {
    it('should generate prompts sorted by priority', () => {
      const incompleteSymptoms: SymptomData = {
        inputMethod: InputMethod.TEXT
        // Missing all other fields
      };

      const completenessResult = analyzeDataCompleteness(incompleteSymptoms);
      const prompts = generateStructuredPrompts(completenessResult.missingFields);

      expect(prompts.prompts.length).toBeGreaterThan(0);
      expect(prompts.priorityOrder.length).toBeGreaterThan(0);
      
      // Critical fields should come first
      const firstField = prompts.priorityOrder[0];
      const criticalFields = ['primaryComplaint', 'duration', 'severity'];
      expect(criticalFields).toContain(firstField);
    });

    it('should create appropriate input types for different fields', () => {
      const missingFields = [
        { field: 'primaryComplaint', displayName: 'Primary Complaint', description: 'Main symptom', required: true, priority: 'critical' as const, prompt: 'Describe symptoms', examples: [] },
        { field: 'severity', displayName: 'Severity', description: 'Pain level', required: true, priority: 'critical' as const, prompt: 'Rate severity', examples: [] },
        { field: 'associatedSymptoms', displayName: 'Associated Symptoms', description: 'Other symptoms', required: false, priority: 'high' as const, prompt: 'Other symptoms', examples: [] }
      ];

      const prompts = generateStructuredPrompts(missingFields);

      const primaryComplaintPrompt = prompts.prompts.find(p => p.field === 'primaryComplaint');
      expect(primaryComplaintPrompt?.inputType).toBe('textarea');
      expect(primaryComplaintPrompt?.validation.minLength).toBe(10);

      const severityPrompt = prompts.prompts.find(p => p.field === 'severity');
      expect(severityPrompt?.inputType).toBe('number');
      expect(severityPrompt?.validation.min).toBe(1);
      expect(severityPrompt?.validation.max).toBe(10);

      const associatedSymptomsPrompt = prompts.prompts.find(p => p.field === 'associatedSymptoms');
      expect(associatedSymptomsPrompt?.inputType).toBe('multiselect');
      expect(associatedSymptomsPrompt?.options).toContain('Fever');
    });

    it('should estimate completion time based on missing fields', () => {
      const manyMissingFields = [
        { field: 'primaryComplaint', priority: 'critical' as const },
        { field: 'duration', priority: 'critical' as const },
        { field: 'severity', priority: 'critical' as const },
        { field: 'associatedSymptoms', priority: 'high' as const }
      ].map(f => ({
        ...f,
        displayName: f.field,
        description: 'test',
        required: true,
        prompt: 'test',
        examples: []
      }));

      const prompts = generateStructuredPrompts(manyMissingFields);

      expect(prompts.estimatedCompletionTime).toMatch(/\d+-\d+ minutes/);
      
      // Should estimate more time for more critical fields
      const timeMatch = prompts.estimatedCompletionTime.match(/(\d+)-(\d+)/);
      expect(timeMatch).toBeTruthy();
      if (timeMatch) {
        const minTime = parseInt(timeMatch[1]);
        expect(minTime).toBeGreaterThan(5); // Should be more than 5 minutes for many critical fields
      }
    });

    it('should generate helpful context text', () => {
      const criticalMissingFields = [
        { field: 'primaryComplaint', priority: 'critical' as const },
        { field: 'severity', priority: 'critical' as const }
      ].map(f => ({
        ...f,
        displayName: f.field,
        description: 'test',
        required: true,
        prompt: 'test',
        examples: []
      }));

      const prompts = generateStructuredPrompts(criticalMissingFields);

      expect(prompts.helpText).toContain('2 additional pieces of information');
      expect(prompts.helpText).toContain('2 of these are critical');
      expect(prompts.helpText).toContain('medical emergency');
    });
  });

  describe('validateDataCompletenessOrThrow', () => {
    it('should not throw for complete data', () => {
      const completeSymptoms: SymptomData = {
        primaryComplaint: 'Severe headache with nausea and sensitivity to light',
        duration: '2 hours',
        severity: 8,
        associatedSymptoms: ['nausea', 'sensitivity to light'],
        inputMethod: InputMethod.TEXT
      };

      expect(() => {
        validateDataCompletenessOrThrow(completeSymptoms);
      }).not.toThrow();
    });

    it('should throw IncompleteDataError for incomplete data', () => {
      const incompleteSymptoms: SymptomData = {
        primaryComplaint: 'Headache'
        // Missing other required fields
      };

      expect(() => {
        validateDataCompletenessOrThrow(incompleteSymptoms);
      }).toThrow('Incomplete symptom data');
    });

    it('should include completeness result and structured prompts in error', () => {
      const incompleteSymptoms: SymptomData = {
        associatedSymptoms: ['fever']
        // Missing critical fields
      };

      try {
        validateDataCompletenessOrThrow(incompleteSymptoms);
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.name).toBe('IncompleteDataError');
        expect(error.statusCode).toBe(422);
        expect(error.completenessResult).toBeDefined();
        expect(error.structuredPrompts).toBeDefined();
        expect(error.completenessResult.criticalMissing).toBe(true);
        expect(error.structuredPrompts.prompts.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Edge cases and validation', () => {
    it('should handle null and undefined values correctly', () => {
      const symptomsWithNulls: SymptomData = {
        primaryComplaint: null as any,
        duration: undefined,
        severity: NaN,
        associatedSymptoms: null as any,
        inputMethod: InputMethod.TEXT
      };

      const result = analyzeDataCompleteness(symptomsWithNulls);

      expect(result.isComplete).toBe(false);
      expect(result.criticalMissing).toBe(true);
      expect(result.missingFields.length).toBeGreaterThan(3);
    });

    it('should handle whitespace-only strings as empty', () => {
      const symptomsWithWhitespace: SymptomData = {
        primaryComplaint: '   ',
        duration: '\t\n',
        severity: 5,
        associatedSymptoms: ['  ', '\t'],
        inputMethod: InputMethod.TEXT
      };

      const result = analyzeDataCompleteness(symptomsWithWhitespace);

      expect(result.isComplete).toBe(false);
      const missingFieldNames = result.missingFields.map(f => f.field);
      expect(missingFieldNames).toContain('primaryComplaint');
      expect(missingFieldNames).toContain('duration');
      expect(missingFieldNames).toContain('associatedSymptoms');
    });

    it('should validate severity range correctly', () => {
      const invalidSeverityScenarios = [
        { severity: 0, shouldBeInvalid: true },
        { severity: 11, shouldBeInvalid: true },
        { severity: -5, shouldBeInvalid: true },
        { severity: 5.5, shouldBeInvalid: false }, // Decimal should be ok
        { severity: 1, shouldBeInvalid: false },
        { severity: 10, shouldBeInvalid: false }
      ];

      invalidSeverityScenarios.forEach(scenario => {
        const symptoms: SymptomData = {
          primaryComplaint: 'Test complaint',
          duration: '1 hour',
          severity: scenario.severity,
          associatedSymptoms: ['test'],
          inputMethod: InputMethod.TEXT
        };

        const result = analyzeDataCompleteness(symptoms);
        const severityField = result.missingFields.find(f => f.field === 'severity');
        
        if (scenario.shouldBeInvalid) {
          expect(severityField).toBeDefined();
          expect(severityField?.prompt).toContain('Current value needs improvement');
        } else {
          expect(severityField).toBeUndefined();
        }
      });
    });

    it('should handle very long input appropriately', () => {
      const veryLongComplaint = 'a'.repeat(1500); // Exceeds 1000 char limit
      const symptoms: SymptomData = {
        primaryComplaint: veryLongComplaint,
        duration: '1 hour',
        severity: 5,
        associatedSymptoms: ['test'],
        inputMethod: InputMethod.TEXT
      };

      const result = analyzeDataCompleteness(symptoms);
      const primaryComplaintField = result.missingFields.find(f => f.field === 'primaryComplaint');
      
      expect(primaryComplaintField).toBeDefined();
      expect(primaryComplaintField?.prompt).toContain('too long');
    });
  });
});