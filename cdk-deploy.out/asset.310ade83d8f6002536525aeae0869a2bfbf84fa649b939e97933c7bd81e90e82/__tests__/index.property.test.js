"use strict";
// Property-based tests for Triage Engine
// Tests universal properties that should hold for all valid inputs
// Feature: decentralized-healthcare-orchestration, Property 2: Triage Assessment Completeness
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fc = __importStar(require("fast-check"));
const triage_rule_engine_1 = require("../triage-rule-engine");
const types_1 = require("../../../types");
describe('Triage Engine Property Tests', () => {
    const ruleEngine = new triage_rule_engine_1.TriageRuleEngine();
    // Generators for property-based testing
    const urgencyLevelGen = fc.constantFrom(...Object.values(types_1.UrgencyLevel));
    const inputMethodGen = fc.constantFrom(...Object.values(types_1.InputMethod));
    const symptomsGen = fc.record({
        primaryComplaint: fc.string({ minLength: 1, maxLength: 200 }),
        duration: fc.oneof(fc.constant('1 hour'), fc.constant('few hours'), fc.constant('1 day'), fc.constant('2 days'), fc.constant('1 week'), fc.constant('several days'), fc.constant('ongoing')),
        severity: fc.integer({ min: 1, max: 10 }),
        associatedSymptoms: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }),
        inputMethod: inputMethodGen
    });
    describe('Property 2: Triage Assessment Completeness', () => {
        /**
         * **Validates: Requirements 2.1, 2.3**
         * For any symptom data received, the Triage_Engine should produce a complete assessment
         * categorized as emergency, urgent, routine, or self-care using rules-first approach.
         */
        it('should always produce complete triage assessment for any valid symptoms', () => {
            fc.assert(fc.property(symptomsGen, (symptoms) => {
                const result = ruleEngine.assessSymptoms(symptoms);
                // Assessment must be complete
                expect(result).toBeDefined();
                expect(result.urgencyLevel).toBeDefined();
                expect(result.score).toBeDefined();
                expect(result.triggeredRules).toBeDefined();
                expect(result.reasoning).toBeDefined();
                // Urgency level must be one of the valid values
                expect(Object.values(types_1.UrgencyLevel)).toContain(result.urgencyLevel);
                // Score must be in valid range (0-100)
                expect(result.score).toBeGreaterThanOrEqual(0);
                expect(result.score).toBeLessThanOrEqual(100);
                // Triggered rules must be an array
                expect(Array.isArray(result.triggeredRules)).toBe(true);
                // Reasoning must be a non-empty string
                expect(typeof result.reasoning).toBe('string');
                expect(result.reasoning.length).toBeGreaterThan(0);
                return true;
            }), { numRuns: 100 });
        });
        it('should maintain consistency between urgency level and score ranges', () => {
            fc.assert(fc.property(symptomsGen, (symptoms) => {
                const result = ruleEngine.assessSymptoms(symptoms);
                // Score ranges should align with urgency levels
                switch (result.urgencyLevel) {
                    case types_1.UrgencyLevel.EMERGENCY:
                        expect(result.score).toBeGreaterThanOrEqual(90);
                        break;
                    case types_1.UrgencyLevel.URGENT:
                        expect(result.score).toBeGreaterThanOrEqual(70);
                        expect(result.score).toBeLessThan(90);
                        break;
                    case types_1.UrgencyLevel.ROUTINE:
                        expect(result.score).toBeGreaterThanOrEqual(30);
                        expect(result.score).toBeLessThan(70);
                        break;
                    case types_1.UrgencyLevel.SELF_CARE:
                        expect(result.score).toBeLessThan(30);
                        break;
                }
                return true;
            }), { numRuns: 100 });
        });
        it('should always use rules-first approach before considering AI assistance', () => {
            fc.assert(fc.property(symptomsGen, (symptoms) => {
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
            }), { numRuns: 100 });
        });
        it('should handle edge cases gracefully', () => {
            fc.assert(fc.property(fc.record({
                primaryComplaint: fc.oneof(fc.constant(''), fc.string({ maxLength: 1000 }), fc.constant('   '), fc.constant('!@#$%^&*()')),
                duration: fc.oneof(fc.constant(''), fc.string({ maxLength: 100 }), fc.constant('unknown')),
                severity: fc.integer({ min: 0, max: 15 }), // Include out-of-range values
                associatedSymptoms: fc.oneof(fc.constant([]), fc.array(fc.string(), { maxLength: 20 })),
                inputMethod: inputMethodGen
            }), (symptoms) => {
                // Should not throw errors even with edge case inputs
                expect(() => {
                    const result = ruleEngine.assessSymptoms(symptoms);
                    expect(result).toBeDefined();
                }).not.toThrow();
                return true;
            }), { numRuns: 50 });
        });
        it('should produce deterministic results for identical inputs', () => {
            fc.assert(fc.property(symptomsGen, (symptoms) => {
                const result1 = ruleEngine.assessSymptoms(symptoms);
                const result2 = ruleEngine.assessSymptoms(symptoms);
                // Results should be identical for same input
                expect(result1.urgencyLevel).toBe(result2.urgencyLevel);
                expect(result1.score).toBe(result2.score);
                expect(result1.triggeredRules).toEqual(result2.triggeredRules);
                expect(result1.reasoning).toBe(result2.reasoning);
                return true;
            }), { numRuns: 100 });
        });
        it('should prioritize higher urgency when multiple rules trigger', () => {
            fc.assert(fc.property(fc.record({
                primaryComplaint: fc.constantFrom('severe chest pain and fever', 'breathing difficulty with abdominal pain', 'head injury with vomiting', 'chest pain and high fever'),
                duration: fc.string(),
                severity: fc.integer({ min: 7, max: 10 }),
                associatedSymptoms: fc.array(fc.constantFrom('shortness of breath', 'chills', 'sweating', 'nausea', 'dizziness'), { minLength: 1, maxLength: 5 }),
                inputMethod: inputMethodGen
            }), (symptoms) => {
                const result = ruleEngine.assessSymptoms(symptoms);
                // When multiple rules trigger, should use highest urgency
                if (result.triggeredRules.length > 1) {
                    // Should have emergency or urgent level for complex symptoms
                    expect([types_1.UrgencyLevel.EMERGENCY, types_1.UrgencyLevel.URGENT]).toContain(result.urgencyLevel);
                    // Score should reflect the highest triggered rule
                    expect(result.score).toBeGreaterThanOrEqual(70);
                }
                return true;
            }), { numRuns: 50 });
        });
        it('should handle severity scaling appropriately', () => {
            fc.assert(fc.property(fc.record({
                primaryComplaint: fc.constant('chest pain'),
                duration: fc.constant('2 hours'),
                severity: fc.integer({ min: 1, max: 10 }),
                associatedSymptoms: fc.constant(['shortness of breath']),
                inputMethod: inputMethodGen
            }), (symptoms) => {
                const result = ruleEngine.assessSymptoms(symptoms);
                // Higher severity should generally lead to higher urgency
                if (symptoms.severity >= 8) {
                    // High severity chest pain should be emergency (per EMERGENCY_CHEST_PAIN rule)
                    expect(result.urgencyLevel).toBe(types_1.UrgencyLevel.EMERGENCY);
                }
                // Note: Severity < 8 chest pain may be routine/urgent depending on other factors
                // The rule engine requires severity >= 8 for emergency chest pain classification
                return true;
            }), { numRuns: 50 });
        });
        it('should maintain logical consistency in AI assistance decisions', () => {
            fc.assert(fc.property(symptomsGen, (symptoms) => {
                const result = ruleEngine.assessSymptoms(symptoms);
                const needsAI = ruleEngine.needsAIAssistance(result, symptoms);
                // Clear emergency cases should not need AI assistance
                if (result.urgencyLevel === types_1.UrgencyLevel.EMERGENCY && result.score >= 95) {
                    expect(needsAI).toBe(false);
                }
                // Clear self-care cases should not need AI assistance
                if (result.urgencyLevel === types_1.UrgencyLevel.SELF_CARE && result.score <= 25) {
                    expect(needsAI).toBe(false);
                }
                // Uncertain scores (40-60) should typically need AI assistance
                if (result.score >= 40 && result.score <= 60) {
                    expect(needsAI).toBe(true);
                }
                return true;
            }), { numRuns: 100 });
        });
    });
    describe('Robustness Properties', () => {
        it('should handle malformed or unusual symptom descriptions', () => {
            fc.assert(fc.property(fc.record({
                primaryComplaint: fc.oneof(fc.string({ minLength: 1, maxLength: 500 }), fc.constant('CHEST PAIN!!!'), fc.constant('chest pain chest pain chest pain'), fc.constant('ChEsT pAiN'), fc.constant('chest-pain'), fc.constant('chest_pain')),
                duration: fc.string(),
                severity: fc.integer({ min: 1, max: 10 }),
                associatedSymptoms: fc.array(fc.string()),
                inputMethod: inputMethodGen
            }), (symptoms) => {
                const result = ruleEngine.assessSymptoms(symptoms);
                // Should still produce valid assessment regardless of formatting
                expect(Object.values(types_1.UrgencyLevel)).toContain(result.urgencyLevel);
                expect(result.score).toBeGreaterThanOrEqual(0);
                expect(result.score).toBeLessThanOrEqual(100);
                return true;
            }), { numRuns: 50 });
        });
        it('should maintain assessment quality with varying associated symptoms', () => {
            fc.assert(fc.property(fc.record({
                primaryComplaint: fc.constant('chest pain'),
                duration: fc.constant('1 hour'),
                severity: fc.constant(8),
                associatedSymptoms: fc.array(fc.constantFrom('shortness of breath', 'sweating', 'nausea', 'dizziness', 'fatigue', 'weakness', 'palpitations', 'anxiety'), { maxLength: 8 }),
                inputMethod: inputMethodGen
            }), (symptoms) => {
                const result = ruleEngine.assessSymptoms(symptoms);
                // Chest pain with high severity should always be emergency
                expect(result.urgencyLevel).toBe(types_1.UrgencyLevel.EMERGENCY);
                // More associated symptoms should not decrease urgency
                expect(result.score).toBeGreaterThanOrEqual(90);
                return true;
            }), { numRuns: 50 });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXgucHJvcGVydHkudGVzdC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uL3NyYy9sYW1iZGEvdHJpYWdlLWVuZ2luZS9fX3Rlc3RzX18vaW5kZXgucHJvcGVydHkudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEseUNBQXlDO0FBQ3pDLG1FQUFtRTtBQUNuRSw4RkFBOEY7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRTlGLCtDQUFpQztBQUNqQyw4REFBeUQ7QUFDekQsMENBQXFFO0FBRXJFLFFBQVEsQ0FBQyw4QkFBOEIsRUFBRSxHQUFHLEVBQUU7SUFDNUMsTUFBTSxVQUFVLEdBQUcsSUFBSSxxQ0FBZ0IsRUFBRSxDQUFDO0lBRTFDLHdDQUF3QztJQUN4QyxNQUFNLGVBQWUsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxvQkFBWSxDQUFDLENBQUMsQ0FBQztJQUN4RSxNQUFNLGNBQWMsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxtQkFBVyxDQUFDLENBQUMsQ0FBQztJQUV0RSxNQUFNLFdBQVcsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDO1FBQzVCLGdCQUFnQixFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQztRQUM3RCxRQUFRLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FDaEIsRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFDckIsRUFBRSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsRUFDeEIsRUFBRSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFDcEIsRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFDckIsRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFDckIsRUFBRSxD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QTJEO2dCQUMzRCxNQUFNLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLElBQUksQ0FBQyxvQkFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUV6RCx1REFBdUQ7Z0JBQ3ZELE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsc0JBQXNCLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBRWhELE9BQU8sSUFBSSxDQUFDO1lBQ2QsQ0FBQyxDQUNGLEVBQ0QsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLENBQ2hCLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBQcm9wZXJ0eS1iYXNlZCB0ZXN0cyBmb3IgVHJpYWdlIEVuZ2luZVxyXG4vLyBUZXN0cyB1bml2ZXJzYWwgcHJvcGVydGllcyB0aGF0IHNob3VsZCBob2xkIGZvciBhbGwgdmFsaWQgaW5wdXRzXHJcbi8vIEZlYXR1cmU6IGRlY2VudHJhbGl6ZWQtaGVhbHRoY2FyZS1vcmNoZXN0cmF0aW9uLCBQcm9wZXJ0eSAyOiBUcmlhZ2UgQXNzZXNzbWVudCBDb21wbGV0ZW5lc3NcclxuXHJcbmltcG9ydCAqIGFzIGZjIGZyb20gJ2Zhc3QtY2hlY2snO1xyXG5pbXBvcnQgeyBUcmlhZ2VSdWxlRW5naW5lIH0gZnJvbSAnLi4vdHJpYWdlLXJ1bGUtZW5naW5lJztcclxuaW1wb3J0IHsgU3ltcHRvbXMsIFVyZ2VuY3lMZXZlbCwgSW5wdXRNZXRob2QgfSBmcm9tICcuLi8uLi8uLi90eXBlcyc7XHJcblxyXG5kZXNjcmliZSgnVHJpYWdlIEVuZ2luZSBQcm9wZXJ0eSBUZXN0cycsICgpID0+IHtcclxuICBjb25zdCBydWxlRW5naW5lID0gbmV3IFRyaWFnZVJ1bGVFbmdpbmUoKTtcclxuXHJcbiAgLy8gR2VuZXJhdG9ycyBmb3IgcHJvcGVydHktYmFzZWQgdGVzdGluZ1xyXG4gIGNvbnN0IHVyZ2VuY3lMZXZlbEdlbiA9IGZjLmNvbnN0YW50RnJvbSguLi5PYmplY3QudmFsdWVzKFVyZ2VuY3lMZXZlbCkpO1xyXG4gIGNvbnN0IGlucHV0TWV0aG9kR2VuID0gZmMuY29uc3RhbnRGcm9tKC4uLk9iamVjdC52YWx1ZXMoSW5wdXRNZXRob2QpKTtcclxuICBcclxuICBjb25zdCBzeW1wdG9tc0dlbiA9IGZjLnJlY29yZCh7XHJcbiAgICBwcmltYXJ5Q29tcGxhaW50OiBmYy5zdHJpbmcoeyBtaW5MZW5ndGg6IDEsIG1heExlbmd0aDogMjAwIH0pLFxyXG4gICAgZHVyYXRpb246IGZjLm9uZW9mKFxyXG4gICAgICBmYy5jb25zdGFudCgnMSBob3VyJyksXHJcbiAgICAgIGZjLmNvbnN0YW50KCdmZXcgaG91cnMnKSxcclxuICAgICAgZmMuY29uc3RhbnQoJzEgZGF5JyksXHJcbiAgICAgIGZjLmNvbnN0YW50KCcyIGRheXMnKSxcclxuICAgICAgZmMuY29uc3RhbnQoJzEgd2VlaycpLFxyXG4gICAgICBmYy5jb25zdGFudCgnc2V2ZXJhbCBkYXlzJyksXHJcbiAgICAgIGZjLmNvbnN0YW50KCdvbmdvaW5nJylcclxuICAgICksXHJcbiAgICBzZXZlcml0eTogZmMuaW50ZWdlcih7IG1pbjogMSwgbWF4OiAxMCB9KSxcclxuICAgIGFzc29jaWF0ZWRTeW1wdG9tczogZmMuYXJyYXkoXHJcbiAgICAgIGZjLnN0cmluZyh7IG1pbkxlbmd0aDogMSwgbWF4TGVuZ3RoOiA1MCB9KSxcclxuICAgICAgeyBtYXhMZW5ndGg6IDEwIH1cclxuICAgICksXHJcbiAgICBpbnB1dE1ldGhvZDogaW5wdXRNZXRob2RHZW5cclxuICB9KTtcclxuXHJcbiAgZGVzY3JpYmUoJ1Byb3BlcnR5IDI6IFRyaWFnZSBBc3Nlc3NtZW50IENvbXBsZXRlbmVzcycsICgpID0+IHtcclxuICAgIC8qKlxyXG4gICAgICogKipWYWxpZGF0ZXM6IFJlcXVpcmVtZW50cyAyLjEsIDIuMyoqXHJcbiAgICAgKiBGb3IgYW55IHN5bXB0b20gZGF0YSByZWNlaXZlZCwgdGhlIFRyaWFnZV9FbmdpbmUgc2hvdWxkIHByb2R1Y2UgYSBjb21wbGV0ZSBhc3Nlc3NtZW50IFxyXG4gICAgICogY2F0ZWdvcml6ZWQgYXMgZW1lcmdlbmN5LCB1cmdlbnQsIHJvdXRpbmUsIG9yIHNlbGYtY2FyZSB1c2luZyBydWxlcy1maXJzdCBhcHByb2FjaC5cclxuICAgICAqL1xyXG4gICAgaXQoJ3Nob3VsZCBhbHdheXMgcHJvZHVjZSBjb21wbGV0ZSB0cmlhZ2UgYXNzZXNzbWVudCBmb3IgYW55IHZhbGlkIHN5bXB0b21zJywgKCkgPT4ge1xyXG4gICAgICBmYy5hc3NlcnQoXHJcbiAgICAgICAgZmMucHJvcGVydHkoc3ltcHRvbXNHZW4sIChzeW1wdG9tczogU3ltcHRvbXMpID0+IHtcclxuICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHJ1bGVFbmdpbmUuYXNzZXNzU3ltcHRvbXMoc3ltcHRvbXMpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICAvLyBBc3Nlc3NtZW50IG11c3QgYmUgY29tcGxldGVcclxuICAgICAgICAgIGV4cGVjdChyZXN1bHQpLnRvQmVEZWZpbmVkKCk7XHJcbiAgICAgICAgICBleHBlY3QocmVzdWx0LnVyZ2VuY3lMZXZlbCkudG9CZURlZmluZWQoKTtcclxuICAgICAgICAgIGV4cGVjdChyZXN1bHQuc2NvcmUpLnRvQmVEZWZpbmVkKCk7XHJcbiAgICAgICAgICBleHBlY3QocmVzdWx0LnRyaWdnZXJlZFJ1bGVzKS50b0JlRGVmaW5lZCgpO1xyXG4gICAgICAgICAgZXhwZWN0KHJlc3VsdC5yZWFzb25pbmcpLnRvQmVEZWZpbmVkKCk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8vIFVyZ2VuY3kgbGV2ZWwgbXVzdCBiZSBvbmUgb2YgdGhlIHZhbGlkIHZhbHVlc1xyXG4gICAgICAgICAgZXhwZWN0KE9iamVjdC52YWx1ZXMoVXJnZW5jeUxldmVsKSkudG9Db250YWluKHJlc3VsdC51cmdlbmN5TGV2ZWwpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICAvLyBTY29yZSBtdXN0IGJlIGluIHZhbGlkIHJhbmdlICgwLTEwMClcclxuICAgICAgICAgIGV4cGVjdChyZXN1bHQuc2NvcmUpLnRvQmVHcmVhdGVyVGhhbk9yRXF1YWwoMCk7XHJcbiAgICAgICAgICBleHBlY3QocmVzdWx0LnNjb3JlKS50b0JlTGVzc1RoYW5PckVxdWFsKDEwMCk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8vIFRyaWdnZXJlZCBydWxlcyBtdXN0IGJlIGFuIGFycmF5XHJcbiAgICAgICAgICBleHBlY3QoQXJyYXkuaXNBcnJheShyZXN1bHQudHJpZ2dlcmVkUnVsZXMpKS50b0JlKHRydWUpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICAvLyBSZWFzb25pbmcgbXVzdCBiZSBhIG5vbi1lbXB0eSBzdHJpbmdcclxuICAgICAgICAgIGV4cGVjdCh0eXBlb2YgcmVzdWx0LnJlYXNvbmluZykudG9CZSgnc3RyaW5nJyk7XHJcbiAgICAgICAgICBleHBlY3QocmVzdWx0LnJlYXNvbmluZy5sZW5ndGgpLnRvQmVHcmVhdGVyVGhhbigwKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgeyBudW1SdW5zOiAxMDAgfVxyXG4gICAgICApO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBtYWludGFpbiBjb25zaXN0ZW5jeSBiZXR3ZWVuIHVyZ2VuY3kgbGV2ZWwgYW5kIHNjb3JlIHJhbmdlcycsICgpID0+IHtcclxuICAgICAgZmMuYXNzZXJ0KFxyXG4gICAgICAgIGZjLnByb3BlcnR5KHN5bXB0b21zR2VuLCAoc3ltcHRvbXM6IFN5bXB0b21zKSA9PiB7XHJcbiAgICAgICAgICBjb25zdCByZXN1bHQgPSBydWxlRW5naW5lLmFzc2Vzc1N5bXB0b21zKHN5bXB0b21zKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgLy8gU2NvcmUgcmFuZ2VzIHNob3VsZCBhbGlnbiB3aXRoIHVyZ2VuY3kgbGV2ZWxzXHJcbiAgICAgICAgICBzd2l0Y2ggKHJlc3VsdC51cmdlbmN5TGV2ZWwpIHtcclxuICAgICAgICAgICAgY2FzZSBVcmdlbmN5TGV2ZWwuRU1FUkdFTkNZOlxyXG4gICAgICAgICAgICAgIGV4cGVjdChyZXN1bHQuc2NvcmUpLnRvQmVHcmVhdGVyVGhhbk9yRXF1YWwoOTApO1xyXG4gICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFVyZ2VuY3lMZXZlbC5VUkdFTlQ6XHJcbiAgICAgICAgICAgICAgZXhwZWN0KHJlc3VsdC5zY29yZSkudG9CZUdyZWF0ZXJUaGFuT3JFcXVhbCg3MCk7XHJcbiAgICAgICAgICAgICAgZXhwZWN0KHJlc3VsdC5zY29yZSkudG9CZUxlc3NUaGFuKDkwKTtcclxuICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBVcmdlbmN5TGV2ZWwuUk9VVElORTpcclxuICAgICAgICAgICAgICBleHBlY3QocmVzdWx0LnNjb3JlKS50b0JlR3JlYXRlclRoYW5PckVxdWFsKDMwKTtcclxuICAgICAgICAgICAgICBleHBlY3QocmVzdWx0LnNjb3JlKS50b0JlTGVzc1RoYW4oNzApO1xyXG4gICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFVyZ2VuY3lMZXZlbC5TRUxGX0NBUkU6XHJcbiAgICAgICAgICAgICAgZXhwZWN0KHJlc3VsdC5zY29yZSkudG9CZUxlc3NUaGFuKDMwKTtcclxuICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgeyBudW1SdW5zOiAxMDAgfVxyXG4gICAgICApO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBhbHdheXMgdXNlIHJ1bGVzLWZpcnN0IGFwcHJvYWNoIGJlZm9yZSBjb25zaWRlcmluZyBBSSBhc3Npc3RhbmNlJywgKCkgPT4ge1xyXG4gICAgICBmYy5hc3NlcnQoXHJcbiAgICAgICAgZmMucHJvcGVydHkoc3ltcHRvbXNHZW4sIChzeW1wdG9tczogU3ltcHRvbXMpID0+IHtcclxuICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHJ1bGVFbmdpbmUuYXNzZXNzU3ltcHRvbXMoc3ltcHRvbXMpO1xyXG4gICAgICAgICAgY29uc3QgbmVlZHNBSSA9IHJ1bGVFbmdpbmUubmVlZHNBSUFzc2lzdGFuY2UocmVzdWx0LCBzeW1wdG9tcyk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8vIFJ1bGUtYmFzZWQgYXNzZXNzbWVudCBtdXN0IGFsd2F5cyBiZSBwZXJmb3JtZWQgZmlyc3RcclxuICAgICAgICAgIGV4cGVjdChyZXN1bHQuc2NvcmUpLnRvQmVEZWZpbmVkKCk7XHJcbiAgICAgICAgICBleHBlY3QocmVzdWx0LnNjb3JlKS50b0JlR3JlYXRlclRoYW5PckVxdWFsKDApO1xyXG4gICAgICAgICAgZXhwZWN0KHJlc3VsdC5zY29yZSkudG9CZUxlc3NUaGFuT3JFcXVhbCgxMDApO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICAvLyBBSSBhc3Npc3RhbmNlIGRlY2lzaW9uIG11c3QgYmUgZGV0ZXJtaW5pc3RpYyBiYXNlZCBvbiBydWxlIHJlc3VsdFxyXG4gICAgICAgICAgY29uc3QgbmVlZHNBSTIgPSBydWxlRW5naW5lLm5lZWRzQUlBc3Npc3RhbmNlKHJlc3VsdCwgc3ltcHRvbXMpO1xyXG4gICAgICAgICAgZXhwZWN0KG5lZWRzQUkpLnRvQmUobmVlZHNBSTIpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9KSxcclxuICAgICAgICB7IG51bVJ1bnM6IDEwMCB9XHJcbiAgICAgICk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIGhhbmRsZSBlZGdlIGNhc2VzIGdyYWNlZnVsbHknLCAoKSA9PiB7XHJcbiAgICAgIGZjLmFzc2VydChcclxuICAgICAgICBmYy5wcm9wZXJ0eShcclxuICAgICAgICAgIGZjLnJlY29yZCh7XHJcbiAgICAgICAgICAgIHByaW1hcnlDb21wbGFpbnQ6IGZjLm9uZW9mKFxyXG4gICAgICAgICAgICAgIGZjLmNvbnN0YW50KCcnKSxcclxuICAgICAgICAgICAgICBmYy5zdHJpbmcoeyBtYXhMZW5ndGg6IDEwMDAgfSksXHJcbiAgICAgICAgICAgICAgZmMuY29uc3RhbnQoJyAgICcpLFxyXG4gICAgICAgICAgICAgIGZjLmNvbnN0YW50KCchQCMkJV4mKigpJylcclxuICAgICAgICAgICAgKSxcclxuICAgICAgICAgICAgZHVyYXRpb246IGZjLm9uZW9mKFxyXG4gICAgICAgICAgICAgIGZjLmNvbnN0YW50KCcnKSxcclxuICAgICAgICAgICAgICBmYy5zdHJpbmcoeyBtYXhMZW5ndGg6IDEwMCB9KSxcclxuICAgICAgICAgICAgICBmYy5jb25zdGFudCgndW5rbm93bicpXHJcbiAgICAgICAgICAgICksXHJcbiAgICAgICAgICAgIHNldmVyaXR5OiBmYy5pbnRlZ2VyKHsgbWluOiAwLCBtYXg6IDE1IH0pLCAvLyBJbmNsdWRlIG91dC1vZi1yYW5nZSB2YWx1ZXNcclxuICAgICAgICAgICAgYXNzb2NpYXRlZFN5bXB0b21zOiBmYy5vbmVvZihcclxuICAgICAgICAgICAgICBmYy5jb25zdGFudChbXSksXHJcbiAgICAgICAgICAgICAgZmMuYXJyYXkoZmMuc3RyaW5nKCksIHsgbWF4TGVuZ3RoOiAyMCB9KVxyXG4gICAgICAgICAgICApLFxyXG4gICAgICAgICAgICBpbnB1dE1ldGhvZDogaW5wdXRNZXRob2RHZW5cclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgKHN5bXB0b21zOiBTeW1wdG9tcykgPT4ge1xyXG4gICAgICAgICAgICAvLyBTaG91bGQgbm90IHRocm93IGVycm9ycyBldmVuIHdpdGggZWRnZSBjYXNlIGlucHV0c1xyXG4gICAgICAgICAgICBleHBlY3QoKCkgPT4ge1xyXG4gICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHJ1bGVFbmdpbmUuYXNzZXNzU3ltcHRvbXMoc3ltcHRvbXMpO1xyXG4gICAgICAgICAgICAgIGV4cGVjdChyZXN1bHQpLnRvQmVEZWZpbmVkKCk7XHJcbiAgICAgICAgICAgIH0pLm5vdC50b1Rocm93KCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgIH1cclxuICAgICAgICApLFxyXG4gICAgICAgIHsgbnVtUnVuczogNTAgfVxyXG4gICAgICApO1xyXG4gICAgfSk7XHJcblxyXG4gICAgaXQoJ3Nob3VsZCBwcm9kdWNlIGRldGVybWluaXN0aWMgcmVzdWx0cyBmb3IgaWRlbnRpY2FsIGlucHV0cycsICgpID0+IHtcclxuICAgICAgZmMuYXNzZXJ0KFxyXG4gICAgICAgIGZjLnByb3BlcnR5KHN5bXB0b21zR2VuLCAoc3ltcHRvbXM6IFN5bXB0b21zKSA9PiB7XHJcbiAgICAgICAgICBjb25zdCByZXN1bHQxID0gcnVsZUVuZ2luZS5hc3Nlc3NTeW1wdG9tcyhzeW1wdG9tcyk7XHJcbiAgICAgICAgICBjb25zdCByZXN1bHQyID0gcnVsZUVuZ2luZS5hc3Nlc3NTeW1wdG9tcyhzeW1wdG9tcyk7XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8vIFJlc3VsdHMgc2hvdWxkIGJlIGlkZW50aWNhbCBmb3Igc2FtZSBpbnB1dFxyXG4gICAgICAgICAgZXhwZWN0KHJlc3VsdDEudXJnZW5jeUxldmVsKS50b0JlKHJlc3VsdDIudXJnZW5jeUxldmVsKTtcclxuICAgICAgICAgIGV4cGVjdChyZXN1bHQxLnNjb3JlKS50b0JlKHJlc3VsdDIuc2NvcmUpO1xyXG4gICAgICAgICAgZXhwZWN0KHJlc3VsdDEudHJpZ2dlcmVkUnVsZXMpLnRvRXF1YWwocmVzdWx0Mi50cmlnZ2VyZWRSdWxlcyk7XHJcbiAgICAgICAgICBleHBlY3QocmVzdWx0MS5yZWFzb25pbmcpLnRvQmUocmVzdWx0Mi5yZWFzb25pbmcpO1xyXG4gICAgICAgICAgXHJcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9KSxcclxuICAgICAgICB7IG51bVJ1bnM6IDEwMCB9XHJcbiAgICAgICk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIHByaW9yaXRpemUgaGlnaGVyIHVyZ2VuY3kgd2hlbiBtdWx0aXBsZSBydWxlcyB0cmlnZ2VyJywgKCkgPT4ge1xyXG4gICAgICBmYy5hc3NlcnQoXHJcbiAgICAgICAgZmMucHJvcGVydHkoXHJcbiAgICAgICAgICBmYy5yZWNvcmQoe1xyXG4gICAgICAgICAgICBwcmltYXJ5Q29tcGxhaW50OiBmYy5jb25zdGFudEZyb20oXHJcbiAgICAgICAgICAgICAgJ3NldmVyZSBjaGVzdCBwYWluIGFuZCBmZXZlcicsXHJcbiAgICAgICAgICAgICAgJ2JyZWF0aGluZyBkaWZmaWN1bHR5IHdpdGggYWJkb21pbmFsIHBhaW4nLFxyXG4gICAgICAgICAgICAgICdoZWFkIGluanVyeSB3aXRoIHZvbWl0aW5nJyxcclxuICAgICAgICAgICAgICAnY2hlc3QgcGFpbiBhbmQgaGlnaCBmZXZlcidcclxuICAgICAgICAgICAgKSxcclxuICAgICAgICAgICAgZHVyYXRpb246IGZjLnN0cmluZygpLFxyXG4gICAgICAgICAgICBzZXZlcml0eTogZmMuaW50ZWdlcih7IG1pbjogNywgbWF4OiAxMCB9KSxcclxuICAgICAgICAgICAgYXNzb2NpYXRlZFN5bXB0b21zOiBmYy5hcnJheShcclxuICAgICAgICAgICAgICBmYy5jb25zdGFudEZyb20oJ3Nob3J0bmVzcyBvZiBicmVhdGgnLCAnY2hpbGxzJywgJ3N3ZWF0aW5nJywgJ25hdXNlYScsICdkaXp6aW5lc3MnKSxcclxuICAgICAgICAgICAgICB7IG1pbkxlbmd0aDogMSwgbWF4TGVuZ3RoOiA1IH1cclxuICAgICAgICAgICAgKSxcclxuICAgICAgICAgICAgaW5wdXRNZXRob2Q6IGlucHV0TWV0aG9kR2VuXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICAgIChzeW1wdG9tczogU3ltcHRvbXMpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gcnVsZUVuZ2luZS5hc3Nlc3NTeW1wdG9tcyhzeW1wdG9tcyk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyBXaGVuIG11bHRpcGxlIHJ1bGVzIHRyaWdnZXIsIHNob3VsZCB1c2UgaGlnaGVzdCB1cmdlbmN5XHJcbiAgICAgICAgICAgIGlmIChyZXN1bHQudHJpZ2dlcmVkUnVsZXMubGVuZ3RoID4gMSkge1xyXG4gICAgICAgICAgICAgIC8vIFNob3VsZCBoYXZlIGVtZXJnZW5jeSBvciB1cmdlbnQgbGV2ZWwgZm9yIGNvbXBsZXggc3ltcHRvbXNcclxuICAgICAgICAgICAgICBleHBlY3QoW1VyZ2VuY3lMZXZlbC5FTUVSR0VOQ1ksIFVyZ2VuY3lMZXZlbC5VUkdFTlRdKS50b0NvbnRhaW4ocmVzdWx0LnVyZ2VuY3lMZXZlbCk7XHJcbiAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgLy8gU2NvcmUgc2hvdWxkIHJlZmxlY3QgdGhlIGhpZ2hlc3QgdHJpZ2dlcmVkIHJ1bGVcclxuICAgICAgICAgICAgICBleHBlY3QocmVzdWx0LnNjb3JlKS50b0JlR3JlYXRlclRoYW5PckVxdWFsKDcwKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgKSxcclxuICAgICAgICB7IG51bVJ1bnM6IDUwIH1cclxuICAgICAgKTtcclxuICAgIH0pO1xyXG5cclxuICAgIGl0KCdzaG91bGQgaGFuZGxlIHNldmVyaXR5IHNjYWxpbmcgYXBwcm9wcmlhdGVseScsICgpID0+IHtcclxuICAgICAgZmMuYXNzZXJ0KFxyXG4gICAgICAgIGZjLnByb3BlcnR5KFxyXG4gICAgICAgICAgZmMucmVjb3JkKHtcclxuICAgICAgICAgICAgcHJpbWFyeUNvbXBsYWludDogZmMuY29uc3RhbnQoJ2NoZXN0IHBhaW4nKSxcclxuICAgICAgICAgICAgZHVyYXRpb246IGZjLmNvbnN0YW50KCcyIGhvdXJzJyksXHJcbiAgICAgICAgICAgIHNldmVyaXR5OiBmYy5pbnRlZ2VyKHsgbWluOiAxLCBtYXg6IDEwIH0pLFxyXG4gICAgICAgICAgICBhc3NvY2lhdGVkU3ltcHRvbXM6IGZjLmNvbnN0YW50KFsnc2hvcnRuZXNzIG9mIGJyZWF0aCddKSxcclxuICAgICAgICAgICAgaW5wdXRNZXRob2Q6IGlucHV0TWV0aG9kR2VuXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICAgIChzeW1wdG9tczogU3ltcHRvbXMpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gcnVsZUVuZ2luZS5hc3Nlc3NTeW1wdG9tcyhzeW1wdG9tcyk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyBIaWdoZXIgc2V2ZXJpdHkgc2hvdWxkIGdlbmVyYWxseSBsZWFkIHRvIGhpZ2hlciB1cmdlbmN5XHJcbiAgICAgICAgICAgIGlmIChzeW1wdG9tcy5zZXZlcml0eSA+PSA4KSB7XHJcbiAgICAgICAgICAgICAgLy8gSGlnaCBzZXZlcml0eSBjaGVzdCBwYWluIHNob3VsZCBiZSBlbWVyZ2VuY3kgKHBlciBFTUVSR0VOQ1lfQ0hFU1RfUEFJTiBydWxlKVxyXG4gICAgICAgICAgICAgIGV4cGVjdChyZXN1bHQudXJnZW5jeUxldmVsKS50b0JlKFVyZ2VuY3lMZXZlbC5FTUVSR0VOQ1kpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIE5vdGU6IFNldmVyaXR5IDwgOCBjaGVzdCBwYWluIG1heSBiZSByb3V0aW5lL3VyZ2VudCBkZXBlbmRpbmcgb24gb3RoZXIgZmFjdG9yc1xyXG4gICAgICAgICAgICAvLyBUaGUgcnVsZSBlbmdpbmUgcmVxdWlyZXMgc2V2ZXJpdHkgPj0gOCBmb3IgZW1lcmdlbmN5IGNoZXN0IHBhaW4gY2xhc3NpZmljYXRpb25cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICksXHJcbiAgICAgICAgeyBudW1SdW5zOiA1MCB9XHJcbiAgICAgICk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIG1haW50YWluIGxvZ2ljYWwgY29uc2lzdGVuY3kgaW4gQUkgYXNzaXN0YW5jZSBkZWNpc2lvbnMnLCAoKSA9PiB7XHJcbiAgICAgIGZjLmFzc2VydChcclxuICAgICAgICBmYy5wcm9wZXJ0eShzeW1wdG9tc0dlbiwgKHN5bXB0b21zOiBTeW1wdG9tcykgPT4ge1xyXG4gICAgICAgICAgY29uc3QgcmVzdWx0ID0gcnVsZUVuZ2luZS5hc3Nlc3NTeW1wdG9tcyhzeW1wdG9tcyk7XHJcbiAgICAgICAgICBjb25zdCBuZWVkc0FJID0gcnVsZUVuZ2luZS5uZWVkc0FJQXNzaXN0YW5jZShyZXN1bHQsIHN5bXB0b21zKTtcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgLy8gQ2xlYXIgZW1lcmdlbmN5IGNhc2VzIHNob3VsZCBub3QgbmVlZCBBSSBhc3Npc3RhbmNlXHJcbiAgICAgICAgICBpZiAocmVzdWx0LnVyZ2VuY3lMZXZlbCA9PT0gVXJnZW5jeUxldmVsLkVNRVJHRU5DWSAmJiByZXN1bHQuc2NvcmUgPj0gOTUpIHtcclxuICAgICAgICAgICAgZXhwZWN0KG5lZWRzQUkpLnRvQmUoZmFsc2UpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICAvLyBDbGVhciBzZWxmLWNhcmUgY2FzZXMgc2hvdWxkIG5vdCBuZWVkIEFJIGFzc2lzdGFuY2VcclxuICAgICAgICAgIGlmIChyZXN1bHQudXJnZW5jeUxldmVsID09PSBVcmdlbmN5TGV2ZWwuU0VMRl9DQVJFICYmIHJlc3VsdC5zY29yZSA8PSAyNSkge1xyXG4gICAgICAgICAgICBleHBlY3QobmVlZHNBSSkudG9CZShmYWxzZSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIC8vIFVuY2VydGFpbiBzY29yZXMgKDQwLTYwKSBzaG91bGQgdHlwaWNhbGx5IG5lZWQgQUkgYXNzaXN0YW5jZVxyXG4gICAgICAgICAgaWYgKHJlc3VsdC5zY29yZSA+PSA0MCAmJiByZXN1bHQuc2NvcmUgPD0gNjApIHtcclxuICAgICAgICAgICAgZXhwZWN0KG5lZWRzQUkpLnRvQmUodHJ1ZSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH0pLFxyXG4gICAgICAgIHsgbnVtUnVuczogMTAwIH1cclxuICAgICAgKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBkZXNjcmliZSgnUm9idXN0bmVzcyBQcm9wZXJ0aWVzJywgKCkgPT4ge1xyXG4gICAgaXQoJ3Nob3VsZCBoYW5kbGUgbWFsZm9ybWVkIG9yIHVudXN1YWwgc3ltcHRvbSBkZXNjcmlwdGlvbnMnLCAoKSA9PiB7XHJcbiAgICAgIGZjLmFzc2VydChcclxuICAgICAgICBmYy5wcm9wZXJ0eShcclxuICAgICAgICAgIGZjLnJlY29yZCh7XHJcbiAgICAgICAgICAgIHByaW1hcnlDb21wbGFpbnQ6IGZjLm9uZW9mKFxyXG4gICAgICAgICAgICAgIGZjLnN0cmluZyh7IG1pbkxlbmd0aDogMSwgbWF4TGVuZ3RoOiA1MDAgfSksXHJcbiAgICAgICAgICAgICAgZmMuY29uc3RhbnQoJ0NIRVNUIFBBSU4hISEnKSxcclxuICAgICAgICAgICAgICBmYy5jb25zdGFudCgnY2hlc3QgcGFpbiBjaGVzdCBwYWluIGNoZXN0IHBhaW4nKSxcclxuICAgICAgICAgICAgICBmYy5jb25zdGFudCgnQ2hFc1QgcEFpTicpLFxyXG4gICAgICAgICAgICAgIGZjLmNvbnN0YW50KCdjaGVzdC1wYWluJyksXHJcbiAgICAgICAgICAgICAgZmMuY29uc3RhbnQoJ2NoZXN0X3BhaW4nKVxyXG4gICAgICAgICAgICApLFxyXG4gICAgICAgICAgICBkdXJhdGlvbjogZmMuc3RyaW5nKCksXHJcbiAgICAgICAgICAgIHNldmVyaXR5OiBmYy5pbnRlZ2VyKHsgbWluOiAxLCBtYXg6IDEwIH0pLFxyXG4gICAgICAgICAgICBhc3NvY2lhdGVkU3ltcHRvbXM6IGZjLmFycmF5KGZjLnN0cmluZygpKSxcclxuICAgICAgICAgICAgaW5wdXRNZXRob2Q6IGlucHV0TWV0aG9kR2VuXHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICAgIChzeW1wdG9tczogU3ltcHRvbXMpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgcmVzdWx0ID0gcnVsZUVuZ2luZS5hc3Nlc3NTeW1wdG9tcyhzeW1wdG9tcyk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyBTaG91bGQgc3RpbGwgcHJvZHVjZSB2YWxpZCBhc3Nlc3NtZW50IHJlZ2FyZGxlc3Mgb2YgZm9ybWF0dGluZ1xyXG4gICAgICAgICAgICBleHBlY3QoT2JqZWN0LnZhbHVlcyhVcmdlbmN5TGV2ZWwpKS50b0NvbnRhaW4ocmVzdWx0LnVyZ2VuY3lMZXZlbCk7XHJcbiAgICAgICAgICAgIGV4cGVjdChyZXN1bHQuc2NvcmUpLnRvQmVHcmVhdGVyVGhhbk9yRXF1YWwoMCk7XHJcbiAgICAgICAgICAgIGV4cGVjdChyZXN1bHQuc2NvcmUpLnRvQmVMZXNzVGhhbk9yRXF1YWwoMTAwKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICksXHJcbiAgICAgICAgeyBudW1SdW5zOiA1MCB9XHJcbiAgICAgICk7XHJcbiAgICB9KTtcclxuXHJcbiAgICBpdCgnc2hvdWxkIG1haW50YWluIGFzc2Vzc21lbnQgcXVhbGl0eSB3aXRoIHZhcnlpbmcgYXNzb2NpYXRlZCBzeW1wdG9tcycsICgpID0+IHtcclxuICAgICAgZmMuYXNzZXJ0KFxyXG4gICAgICAgIGZjLnByb3BlcnR5KFxyXG4gICAgICAgICAgZmMucmVjb3JkKHtcclxuICAgICAgICAgICAgcHJpbWFyeUNvbXBsYWludDogZmMuY29uc3RhbnQoJ2NoZXN0IHBhaW4nKSxcclxuICAgICAgICAgICAgZHVyYXRpb246IGZjLmNvbnN0YW50KCcxIGhvdXInKSxcclxuICAgICAgICAgICAgc2V2ZXJpdHk6IGZjLmNvbnN0YW50KDgpLFxyXG4gICAgICAgICAgICBhc3NvY2lhdGVkU3ltcHRvbXM6IGZjLmFycmF5KFxyXG4gICAgICAgICAgICAgIGZjLmNvbnN0YW50RnJvbShcclxuICAgICAgICAgICAgICAgICdzaG9ydG5lc3Mgb2YgYnJlYXRoJywgJ3N3ZWF0aW5nJywgJ25hdXNlYScsICdkaXp6aW5lc3MnLFxyXG4gICAgICAgICAgICAgICAgJ2ZhdGlndWUnLCAnd2Vha25lc3MnLCAncGFscGl0YXRpb25zJywgJ2FueGlldHknXHJcbiAgICAgICAgICAgICAgKSxcclxuICAgICAgICAgICAgICB7IG1heExlbmd0aDogOCB9XHJcbiAgICAgICAgICAgICksXHJcbiAgICAgICAgICAgIGlucHV0TWV0aG9kOiBpbnB1dE1ldGhvZEdlblxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICAoc3ltcHRvbXM6IFN5bXB0b21zKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IHJ1bGVFbmdpbmUuYXNzZXNzU3ltcHRvbXMoc3ltcHRvbXMpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8gQ2hlc3QgcGFpbiB3aXRoIGhpZ2ggc2V2ZXJpdHkgc2hvdWxkIGFsd2F5cyBiZSBlbWVyZ2VuY3lcclxuICAgICAgICAgICAgZXhwZWN0KHJlc3VsdC51cmdlbmN5TGV2ZWwpLnRvQmUoVXJnZW5jeUxldmVsLkVNRVJHRU5DWSk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyBNb3JlIGFzc29jaWF0ZWQgc3ltcHRvbXMgc2hvdWxkIG5vdCBkZWNyZWFzZSB1cmdlbmN5XHJcbiAgICAgICAgICAgIGV4cGVjdChyZXN1bHQuc2NvcmUpLnRvQmVHcmVhdGVyVGhhbk9yRXF1YWwoOTApO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgKSxcclxuICAgICAgICB7IG51bVJ1bnM6IDUwIH1cclxuICAgICAgKTtcclxuICAgIH0pO1xyXG4gIH0pO1xyXG59KTsiXX0=