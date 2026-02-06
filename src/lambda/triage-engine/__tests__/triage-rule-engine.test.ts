// Unit tests for Triage Rule Engine
// Tests clinical rules and decision logic

import { TriageRuleEngine } from '../triage-rule-engine';
import { Symptoms, UrgencyLevel, InputMethod } from '../../../types';

describe('TriageRuleEngine', () => {
  let ruleEngine: TriageRuleEngine;

  beforeEach(() => {
    ruleEngine = new TriageRuleEngine();
  });

  const createSymptoms = (overrides: Partial<Symptoms> = {}): Symptoms => ({
    primaryComplaint: 'general discomfort',
    duration: '1 day',
    severity: 5,
    associatedSymptoms: [],
    inputMethod: InputMethod.TEXT,
    ...overrides
  });

  describe('Emergency Rules', () => {
    it('should classify severe chest pain as emergency', () => {
      const symptoms = createSymptoms({
        primaryComplaint: 'severe chest pain',
        severity: 9,
        associatedSymptoms: ['shortness of breath']
      });

      const result = ruleEngine.assessSymptoms(symptoms);

      expect(result.urgencyLevel).toBe(UrgencyLevel.EMERGENCY);
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.triggeredRules).toContain('EMERGENCY_CHEST_PAIN');
      expect(result.reasoning).toContain('cardiac emergency');
    });

    it('should classify severe breathing difficulty as emergency', () => {
      const symptoms = createSymptoms({
        primaryComplaint: 'can\'t breathe properly',
        severity: 8,
        associatedSymptoms: ['chest tightness']
      });

      const result = ruleEngine.assessSymptoms(symptoms);

      expect(result.urgencyLevel).toBe(UrgencyLevel.EMERGENCY);
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.triggeredRules).toContain('EMERGENCY_BREATHING');
    });

    it('should classify altered consciousness as emergency', () => {
      const symptoms = createSymptoms({
        primaryComplaint: 'patient had a seizure',
        severity: 7
      });

      const result = ruleEngine.assessSymptoms(symptoms);

      expect(result.urgencyLevel).toBe(UrgencyLevel.EMERGENCY);
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.triggeredRules).toContain('EMERGENCY_CONSCIOUSNESS');
    });

    it('should classify severe bleeding as emergency', () => {
      const symptoms = createSymptoms({
        primaryComplaint: 'heavy bleeding from wound',
        severity: 8
      });

      const result = ruleEngine.assessSymptoms(symptoms);

      expect(result.urgencyLevel).toBe(UrgencyLevel.EMERGENCY);
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.triggeredRules).toContain('EMERGENCY_SEVERE_BLEEDING');
    });

    it('should classify severe pain (9-10) as emergency', () => {
      const symptoms = createSymptoms({
        primaryComplaint: 'excruciating pain in abdomen',
        severity: 10
      });

      const result = ruleEngine.assessSymptoms(symptoms);

      expect(result.urgencyLevel).toBe(UrgencyLevel.EMERGENCY);
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.triggeredRules).toContain('EMERGENCY_SEVERE_PAIN');
    });
  });

  describe('Urgent Rules', () => {
    it('should classify high fever as urgent', () => {
      const symptoms = createSymptoms({
        primaryComplaint: 'high fever',
        severity: 8,
        associatedSymptoms: ['chills', 'sweating']
      });

      const result = ruleEngine.assessSymptoms(symptoms);

      expect(result.urgencyLevel).toBe(UrgencyLevel.URGENT);
      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.score).toBeLessThan(90);
      expect(result.triggeredRules).toContain('URGENT_HIGH_FEVER');
    });

    it('should classify persistent vomiting as urgent', () => {
      const symptoms = createSymptoms({
        primaryComplaint: 'vomiting for 2 days',
        severity: 7,
        duration: '2 days'
      });

      const result = ruleEngine.assessSymptoms(symptoms);

      expect(result.urgencyLevel).toBe(UrgencyLevel.URGENT);
      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.triggeredRules).toContain('URGENT_PERSISTENT_VOMITING');
    });

    it('should classify severe abdominal pain as urgent', () => {
      const symptoms = createSymptoms({
        primaryComplaint: 'severe stomach pain',
        severity: 8
      });

      const result = ruleEngine.assessSymptoms(symptoms);

      expect(result.urgencyLevel).toBe(UrgencyLevel.URGENT);
      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.triggeredRules).toContain('URGENT_ABDOMINAL_PAIN');
    });

    it('should classify head injury as urgent', () => {
      const symptoms = createSymptoms({
        primaryComplaint: 'hit my head',
        severity: 6,
        associatedSymptoms: ['headache', 'dizziness']
      });

      const result = ruleEngine.assessSymptoms(symptoms);

      expect(result.urgencyLevel).toBe(UrgencyLevel.URGENT);
      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.triggeredRules).toContain('URGENT_HEAD_INJURY');
    });

    it('should classify multiple infection signs as urgent', () => {
      const symptoms = createSymptoms({
        primaryComplaint: 'fever and weakness',
        severity: 7,
        associatedSymptoms: ['chills', 'fatigue', 'swollen glands']
      });

      const result = ruleEngine.assessSymptoms(symptoms);

      expect(result.urgencyLevel).toBe(UrgencyLevel.URGENT);
      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.triggeredRules).toContain('URGENT_INFECTION_SIGNS');
    });
  });

  describe('Routine Rules', () => {
    it('should classify mild fever as routine', () => {
      const symptoms = createSymptoms({
        primaryComplaint: 'low grade fever',
        severity: 5
      });

      const result = ruleEngine.assessSymptoms(symptoms);

      expect(result.urgencyLevel).toBe(UrgencyLevel.ROUTINE);
      expect(result.score).toBeGreaterThanOrEqual(30);
      expect(result.score).toBeLessThan(70);
      expect(result.triggeredRules).toContain('ROUTINE_MILD_FEVER');
    });

    it('should classify cold symptoms as routine', () => {
      const symptoms = createSymptoms({
        primaryComplaint: 'runny nose and cough',
        severity: 4,
        associatedSymptoms: ['sore throat']
      });

      const result = ruleEngine.assessSymptoms(symptoms);

      expect(result.urgencyLevel).toBe(UrgencyLevel.ROUTINE);
      expect(result.score).toBeGreaterThanOrEqual(30);
      expect(result.triggeredRules).toContain('ROUTINE_COLD_SYMPTOMS');
    });

    it('should classify mild to moderate pain as routine', () => {
      const symptoms = createSymptoms({
        primaryComplaint: 'back pain',
        severity: 5
      });

      const result = ruleEngine.assessSymptoms(symptoms);

      expect(result.urgencyLevel).toBe(UrgencyLevel.ROUTINE);
      expect(result.score).toBeGreaterThanOrEqual(30);
      expect(result.triggeredRules).toContain('ROUTINE_MILD_PAIN');
    });

    it('should classify skin issues as routine', () => {
      const symptoms = createSymptoms({
        primaryComplaint: 'skin rash',
        severity: 4,
        associatedSymptoms: ['itching']
      });

      const result = ruleEngine.assessSymptoms(symptoms);

      expect(result.urgencyLevel).toBe(UrgencyLevel.ROUTINE);
      expect(result.score).toBeGreaterThanOrEqual(30);
      expect(result.triggeredRules).toContain('ROUTINE_SKIN_ISSUES');
    });
  });

  describe('Self-Care Rules', () => {
    it('should classify minor symptoms as self-care', () => {
      const symptoms = createSymptoms({
        primaryComplaint: 'mild discomfort',
        severity: 2
      });

      const result = ruleEngine.assessSymptoms(symptoms);

      expect(result.urgencyLevel).toBe(UrgencyLevel.SELF_CARE);
      expect(result.score).toBeLessThan(30);
      expect(result.triggeredRules).toContain('SELF_CARE_MINOR_SYMPTOMS');
    });

    it('should classify wellness check as self-care', () => {
      const symptoms = createSymptoms({
        primaryComplaint: 'routine check-up',
        severity: 1
      });

      const result = ruleEngine.assessSymptoms(symptoms);

      expect(result.urgencyLevel).toBe(UrgencyLevel.SELF_CARE);
      expect(result.score).toBeLessThan(30);
      expect(result.triggeredRules).toContain('SELF_CARE_WELLNESS');
    });
  });

  describe('Default Behavior', () => {
    it('should default to routine care when no rules are triggered', () => {
      const symptoms = createSymptoms({
        primaryComplaint: 'unusual symptoms',
        severity: 5
      });

      const result = ruleEngine.assessSymptoms(symptoms);

      expect(result.urgencyLevel).toBe(UrgencyLevel.ROUTINE);
      expect(result.score).toBe(50);
      expect(result.triggeredRules).toHaveLength(0);
      expect(result.reasoning).toContain('No specific clinical rules triggered');
    });
  });

  describe('AI Assistance Decision Logic', () => {
    it('should recommend AI assistance for uncertain scores (40-60)', () => {
      const symptoms = createSymptoms({
        primaryComplaint: 'moderate pain',
        severity: 5
      });

      const ruleResult = ruleEngine.assessSymptoms(symptoms);
      const needsAI = ruleEngine.needsAIAssistance(ruleResult, symptoms);

      expect(needsAI).toBe(true);
    });

    it('should recommend AI assistance for complex symptoms (>3 associated)', () => {
      const symptoms = createSymptoms({
        primaryComplaint: 'feeling unwell',
        severity: 6,
        associatedSymptoms: ['headache', 'nausea', 'fatigue', 'dizziness']
      });

      const ruleResult = ruleEngine.assessSymptoms(symptoms);
      const needsAI = ruleEngine.needsAIAssistance(ruleResult, symptoms);

      expect(needsAI).toBe(true);
    });

    it('should recommend AI assistance for vague complaints', () => {
      const symptoms = createSymptoms({
        primaryComplaint: 'not feeling well',
        severity: 5
      });

      const ruleResult = ruleEngine.assessSymptoms(symptoms);
      const needsAI = ruleEngine.needsAIAssistance(ruleResult, symptoms);

      expect(needsAI).toBe(true);
    });

    it('should not recommend AI assistance for clear emergency cases', () => {
      const symptoms = createSymptoms({
        primaryComplaint: 'severe chest pain',
        severity: 9
      });

      const ruleResult = ruleEngine.assessSymptoms(symptoms);
      const needsAI = ruleEngine.needsAIAssistance(ruleResult, symptoms);

      expect(needsAI).toBe(false);
    });

    it('should not recommend AI assistance for clear self-care cases', () => {
      const symptoms = createSymptoms({
        primaryComplaint: 'minor scratch',
        severity: 1
      });

      const ruleResult = ruleEngine.assessSymptoms(symptoms);
      const needsAI = ruleEngine.needsAIAssistance(ruleResult, symptoms);

      expect(needsAI).toBe(false);
    });
  });

  describe('Multiple Rules Triggered', () => {
    it('should choose highest urgency when multiple rules are triggered', () => {
      const symptoms = createSymptoms({
        primaryComplaint: 'chest pain and fever',
        severity: 8,
        associatedSymptoms: ['shortness of breath', 'chills']
      });

      const result = ruleEngine.assessSymptoms(symptoms);

      expect(result.urgencyLevel).toBe(UrgencyLevel.EMERGENCY);
      expect(result.triggeredRules.length).toBeGreaterThan(1);
      expect(result.reasoning).toContain('Multiple clinical indicators');
    });

    it('should use highest score when multiple rules are triggered', () => {
      const symptoms = createSymptoms({
        primaryComplaint: 'abdominal pain and vomiting',
        severity: 7,
        duration: '2 days'
      });

      const result = ruleEngine.assessSymptoms(symptoms);

      expect(result.triggeredRules.length).toBeGreaterThan(1);
      expect(result.score).toBeGreaterThanOrEqual(75); // Should use the higher score
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty associated symptoms', () => {
      const symptoms = createSymptoms({
        primaryComplaint: 'headache',
        severity: 6,
        associatedSymptoms: []
      });

      const result = ruleEngine.assessSymptoms(symptoms);

      expect(result).toBeDefined();
      expect(result.urgencyLevel).toBeDefined();
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it('should handle very low severity scores', () => {
      const symptoms = createSymptoms({
        primaryComplaint: 'minor issue',
        severity: 0
      });

      const result = ruleEngine.assessSymptoms(symptoms);

      expect(result).toBeDefined();
      expect(result.urgencyLevel).toBeDefined();
    });

    it('should handle very high severity scores', () => {
      const symptoms = createSymptoms({
        primaryComplaint: 'extreme pain',
        severity: 10
      });

      const result = ruleEngine.assessSymptoms(symptoms);

      expect(result).toBeDefined();
      expect(result.urgencyLevel).toBeDefined();
    });
  });
});