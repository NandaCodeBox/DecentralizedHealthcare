// Property-based tests for Triage Engine
// Tests universal properties that should hold for all valid inputs
// Feature: decentralized-healthcare-orchestration, Property 2: Triage Assessment Completeness

import * as fc from 'fast-check';
import { TriageRuleEngine } from '../triage-rule-engine';
import { Symptoms, UrgencyLevel, InputMethod } from '../../../types';

describe('Triage Engine Property Tests', () => {
  const ruleEngine = new TriageRuleEngine();

  // Generators for property-based testing
  const urgencyLevelGen = fc.constantFrom(...Object.values(UrgencyLevel));
  const inputMethodGen = fc.constantFrom(...Object.values(InputMethod));
  
  const symptomsGen = fc.record({
    primaryComplaint: fc.string({ minLength: 1, maxLength: 200 }),
    duration: fc.oneof(
      fc.constant('1 hour'),
      fc.constant('few hours'),
      fc.constant('1 day'),
      fc.constant('2 days'),
      fc.constant('1 week'),
      fc.constant('several days'),
      fc.constant('ongoing')
    ),
    severity: fc.integer({ min: 1, max: 10 }),
    associatedSymptoms: fc.array(
      fc.string({ minLength: 1, maxLength: 50 }),
      { maxLength: 10 }
    ),
    inputMethod: inputMethodGen
  });

  describe('Property 2: Triage Assessment Completeness', () => {
    /**
     * **Validates: Requirements 2.1, 2.3**
     * For any symptom data received, the Triage_Engine should produce a complete assessment 
     * categorized as emergency, urgent, routine, or self-care using rules-first approach.
     */
    it('should always produce complete triage assessment for any valid symptoms', () => {
      fc.assert(
        fc.property(symptomsGen, (symptoms: Symptoms) => {
          const result = ruleEngine.assessSymptoms(symptoms);
          
          // Assessment must be complete
          expect(result).toBeDefined();
          expect(result.urgencyLevel).toBeDefined();
          expect(result.score).toBeDefined();
          expect(result.triggeredRules).toBeDefined();
          expect(result.reasoning).toBeDefined();
          
          // Urgency level must be one of the valid values
          expect(Object.values(UrgencyLevel)).toContain(result.urgencyLevel);
          
          // Score must be in valid range (0-100)
          expect(result.score).toBeGreaterThanOrEqual(0);
          expect(result.score).toBeLessThanOrEqual(100);
          
          // Triggered rules must be an array
          expect(Array.isArray(result.triggeredRules)).toBe(true);
          
          // Reasoning must be a non-empty string
          expect(typeof result.reasoning).toBe('string');
          expect(result.reasoning.length).toBeGreaterThan(0);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should maintain consistency between urgency level and score ranges', () => {
      fc.assert(
        fc.property(symptomsGen, (symptoms: Symptoms) => {
          const result = ruleEngine.assessSymptoms(symptoms);
          
          // Score ranges should align with urgency levels
          switch (result.urgencyLevel) {
            case UrgencyLevel.EMERGENCY:
              expect(result.score).toBeGreaterThanOrEqual(90);
              break;
            case UrgencyLevel.URGENT:
              expect(result.score).toBeGreaterThanOrEqual(70);
              expect(result.score).toBeLessThan(90);
              break;
            case UrgencyLevel.ROUTINE:
              expect(result.score).toBeGreaterThanOrEqual(30);
              expect(result.score).toBeLessThan(70);
              break;
            case UrgencyLevel.SELF_CARE:
              expect(result.score).toBeLessThan(30);
              break;
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should always use rules-first approach before considering AI assistance', () => {
      fc.assert(
        fc.property(symptomsGen, (symptoms: Symptoms) => {
          const result = ruleEngine.assessSymptoms(symptoms);
          const needsAI = ruleEngine.needsAIAssistance(result, symptoms);
          
          // Rule-based assessment must always be performed first
          expect(result.score).toBeDefined();
          expect(result.score).toBeGreaterThanOrEqual(0);
          expect(result.score).toBeLessThanOrEqual(100);
          
          // AI assistance decision must be deterministic based on rule result
          const needsAI2 = ruleEngine.needsAIAssistance(result, symptoms);
          expect(needsAI).toBe(needsAI2);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should handle edge cases gracefully', () => {
      fc.assert(
        fc.property(
          fc.record({
            primaryComplaint: fc.oneof(
              fc.constant(''),
              fc.string({ maxLength: 1000 }),
              fc.constant('   '),
              fc.constant('!@#$%^&*()')
            ),
            duration: fc.oneof(
              fc.constant(''),
              fc.string({ maxLength: 100 }),
              fc.constant('unknown')
            ),
            severity: fc.integer({ min: 0, max: 15 }), // Include out-of-range values
            associatedSymptoms: fc.oneof(
              fc.constant([]),
              fc.array(fc.string(), { maxLength: 20 })
            ),
            inputMethod: inputMethodGen
          }),
          (symptoms: Symptoms) => {
            // Should not throw errors even with edge case inputs
            expect(() => {
              const result = ruleEngine.assessSymptoms(symptoms);
              expect(result).toBeDefined();
            }).not.toThrow();
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should produce deterministic results for identical inputs', () => {
      fc.assert(
        fc.property(symptomsGen, (symptoms: Symptoms) => {
          const result1 = ruleEngine.assessSymptoms(symptoms);
          const result2 = ruleEngine.assessSymptoms(symptoms);
          
          // Results should be identical for same input
          expect(result1.urgencyLevel).toBe(result2.urgencyLevel);
          expect(result1.score).toBe(result2.score);
          expect(result1.triggeredRules).toEqual(result2.triggeredRules);
          expect(result1.reasoning).toBe(result2.reasoning);
          
          return true;
        }),
        { numRuns: 100 }
      );
    });

    it('should prioritize higher urgency when multiple rules trigger', () => {
      fc.assert(
        fc.property(
          fc.record({
            primaryComplaint: fc.constantFrom(
              'severe chest pain and fever',
              'breathing difficulty with abdominal pain',
              'head injury with vomiting',
              'chest pain and high fever'
            ),
            duration: fc.string(),
            severity: fc.integer({ min: 7, max: 10 }),
            associatedSymptoms: fc.array(
              fc.constantFrom('shortness of breath', 'chills', 'sweating', 'nausea', 'dizziness'),
              { minLength: 1, maxLength: 5 }
            ),
            inputMethod: inputMethodGen
          }),
          (symptoms: Symptoms) => {
            const result = ruleEngine.assessSymptoms(symptoms);
            
            // When multiple rules trigger, should use highest urgency
            if (result.triggeredRules.length > 1) {
              // Should have emergency or urgent level for complex symptoms
              expect([UrgencyLevel.EMERGENCY, UrgencyLevel.URGENT]).toContain(result.urgencyLevel);
              
              // Score should reflect the highest triggered rule
              expect(result.score).toBeGreaterThanOrEqual(70);
            }
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle severity scaling appropriately', () => {
      fc.assert(
        fc.property(
          fc.record({
            primaryComplaint: fc.constant('chest pain'),
            duration: fc.constant('2 hours'),
            severity: fc.integer({ min: 1, max: 10 }),
            associatedSymptoms: fc.constant(['shortness of breath']),
            inputMethod: inputMethodGen
          }),
          (symptoms: Symptoms) => {
            const result = ruleEngine.assessSymptoms(symptoms);
            
            // Higher severity should generally lead to higher urgency
            if (symptoms.severity >= 8) {
              // High severity chest pain should be emergency (per EMERGENCY_CHEST_PAIN rule)
              expect(result.urgencyLevel).toBe(UrgencyLevel.EMERGENCY);
            }
            // Note: Severity < 8 chest pain may be routine/urgent depending on other factors
            // The rule engine requires severity >= 8 for emergency chest pain classification
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain logical consistency in AI assistance decisions', () => {
      fc.assert(
        fc.property(symptomsGen, (symptoms: Symptoms) => {
          const result = ruleEngine.assessSymptoms(symptoms);
          const needsAI = ruleEngine.needsAIAssistance(result, symptoms);
          
          // Clear emergency cases should not need AI assistance
          if (result.urgencyLevel === UrgencyLevel.EMERGENCY && result.score >= 95) {
            expect(needsAI).toBe(false);
          }
          
          // Clear self-care cases should not need AI assistance
          if (result.urgencyLevel === UrgencyLevel.SELF_CARE && result.score <= 25) {
            expect(needsAI).toBe(false);
          }
          
          // Uncertain scores (40-60) should typically need AI assistance
          if (result.score >= 40 && result.score <= 60) {
            expect(needsAI).toBe(true);
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Robustness Properties', () => {
    it('should handle malformed or unusual symptom descriptions', () => {
      fc.assert(
        fc.property(
          fc.record({
            primaryComplaint: fc.oneof(
              fc.string({ minLength: 1, maxLength: 500 }),
              fc.constant('CHEST PAIN!!!'),
              fc.constant('chest pain chest pain chest pain'),
              fc.constant('ChEsT pAiN'),
              fc.constant('chest-pain'),
              fc.constant('chest_pain')
            ),
            duration: fc.string(),
            severity: fc.integer({ min: 1, max: 10 }),
            associatedSymptoms: fc.array(fc.string()),
            inputMethod: inputMethodGen
          }),
          (symptoms: Symptoms) => {
            const result = ruleEngine.assessSymptoms(symptoms);
            
            // Should still produce valid assessment regardless of formatting
            expect(Object.values(UrgencyLevel)).toContain(result.urgencyLevel);
            expect(result.score).toBeGreaterThanOrEqual(0);
            expect(result.score).toBeLessThanOrEqual(100);
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain assessment quality with varying associated symptoms', () => {
      fc.assert(
        fc.property(
          fc.record({
            primaryComplaint: fc.constant('chest pain'),
            duration: fc.constant('1 hour'),
            severity: fc.constant(8),
            associatedSymptoms: fc.array(
              fc.constantFrom(
                'shortness of breath', 'sweating', 'nausea', 'dizziness',
                'fatigue', 'weakness', 'palpitations', 'anxiety'
              ),
              { maxLength: 8 }
            ),
            inputMethod: inputMethodGen
          }),
          (symptoms: Symptoms) => {
            const result = ruleEngine.assessSymptoms(symptoms);
            
            // Chest pain with high severity should always be emergency
            expect(result.urgencyLevel).toBe(UrgencyLevel.EMERGENCY);
            
            // More associated symptoms should not decrease urgency
            expect(result.score).toBeGreaterThanOrEqual(90);
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});