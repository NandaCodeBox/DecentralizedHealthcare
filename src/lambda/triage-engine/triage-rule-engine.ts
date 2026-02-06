// Rule-based Triage Engine
// Implements clinical rules for symptom urgency assessment
// Requirements: 2.1, 2.3

import { Symptoms, UrgencyLevel } from '../../types';

/**
 * Result of rule-based triage assessment
 */
export interface RuleBasedTriageResult {
  urgencyLevel: UrgencyLevel;
  score: number; // 0-100 scale
  triggeredRules: string[];
  reasoning: string;
}

/**
 * Clinical rule definition
 */
interface ClinicalRule {
  id: string;
  name: string;
  condition: (symptoms: Symptoms) => boolean;
  urgencyLevel: UrgencyLevel;
  score: number;
  reasoning: string;
}

/**
 * Rule-based triage engine for symptom assessment
 */
export class TriageRuleEngine {
  private readonly clinicalRules: ClinicalRule[];

  constructor() {
    this.clinicalRules = this.initializeClinicalRules();
  }

  /**
   * Assess symptoms using clinical rules
   */
  assessSymptoms(symptoms: Symptoms): RuleBasedTriageResult {
    const triggeredRules: ClinicalRule[] = [];
    
    // Evaluate all rules against symptoms
    for (const rule of this.clinicalRules) {
      if (rule.condition(symptoms)) {
        triggeredRules.push(rule);
      }
    }

    // If no rules triggered, default to routine care
    if (triggeredRules.length === 0) {
      return {
        urgencyLevel: UrgencyLevel.ROUTINE,
        score: 50,
        triggeredRules: [],
        reasoning: 'No specific clinical rules triggered. Symptoms require routine medical evaluation.'
      };
    }

    // Find the highest urgency level among triggered rules
    const highestUrgencyRule = this.findHighestUrgencyRule(triggeredRules);
    const maxScore = Math.max(...triggeredRules.map(rule => rule.score));

    return {
      urgencyLevel: highestUrgencyRule.urgencyLevel,
      score: maxScore,
      triggeredRules: triggeredRules.map(rule => rule.id),
      reasoning: this.generateReasoning(triggeredRules, highestUrgencyRule)
    };
  }

  /**
   * Determine if AI assistance is needed for complex cases
   */
  needsAIAssistance(ruleBasedResult: RuleBasedTriageResult, symptoms: Symptoms): boolean {
    // AI assistance is needed when:
    // 1. Multiple conflicting rules are triggered
    // 2. Symptoms are complex or ambiguous
    // 3. Rule-based assessment is uncertain (score between 40-60)
    // 4. Symptoms don't clearly fit established patterns

    const hasConflictingRules = this.hasConflictingUrgencyLevels(ruleBasedResult.triggeredRules);
    const isUncertainScore = ruleBasedResult.score >= 40 && ruleBasedResult.score <= 60;
    const hasComplexSymptoms = symptoms.associatedSymptoms.length > 3;
    const hasVagueComplaint = this.isVagueComplaint(symptoms.primaryComplaint);

    return hasConflictingRules || isUncertainScore || hasComplexSymptoms || hasVagueComplaint;
  }

  /**
   * Initialize clinical rules for triage assessment
   */
  private initializeClinicalRules(): ClinicalRule[] {
    return [
      // Emergency Rules (Score: 90-100)
      {
        id: 'EMERGENCY_CHEST_PAIN',
        name: 'Severe Chest Pain',
        condition: (symptoms) => 
          this.containsKeywords(symptoms.primaryComplaint, ['chest pain', 'chest tightness']) &&
          symptoms.severity >= 8,
        urgencyLevel: UrgencyLevel.EMERGENCY,
        score: 95,
        reasoning: 'Severe chest pain may indicate cardiac emergency requiring immediate attention'
      },
      {
        id: 'EMERGENCY_BREATHING',
        name: 'Severe Breathing Difficulty',
        condition: (symptoms) => 
          this.containsKeywords(symptoms.primaryComplaint, ['shortness of breath', 'difficulty breathing', 'can\'t breathe']) &&
          symptoms.severity >= 8,
        urgencyLevel: UrgencyLevel.EMERGENCY,
        score: 95,
        reasoning: 'Severe breathing difficulty requires immediate medical intervention'
      },
      {
        id: 'EMERGENCY_CONSCIOUSNESS',
        name: 'Altered Consciousness',
        condition: (symptoms) => 
          this.containsKeywords(symptoms.primaryComplaint, ['unconscious', 'fainting', 'seizure', 'confusion']),
        urgencyLevel: UrgencyLevel.EMERGENCY,
        score: 98,
        reasoning: 'Altered consciousness indicates potential neurological emergency'
      },
      {
        id: 'EMERGENCY_SEVERE_BLEEDING',
        name: 'Severe Bleeding',
        condition: (symptoms) => 
          this.containsKeywords(symptoms.primaryComplaint, ['heavy bleeding', 'blood loss', 'hemorrhage']) &&
          symptoms.severity >= 7,
        urgencyLevel: UrgencyLevel.EMERGENCY,
        score: 92,
        reasoning: 'Severe bleeding requires immediate medical control'
      },
      {
        id: 'EMERGENCY_SEVERE_PAIN',
        name: 'Severe Pain',
        condition: (symptoms) => 
          symptoms.severity >= 9 &&
          this.containsKeywords(symptoms.primaryComplaint, ['severe pain', 'excruciating', 'unbearable']),
        urgencyLevel: UrgencyLevel.EMERGENCY,
        score: 90,
        reasoning: 'Severe pain (9-10/10) may indicate serious underlying condition'
      },

      // Urgent Rules (Score: 70-89)
      {
        id: 'URGENT_HIGH_FEVER',
        name: 'High Fever',
        condition: (symptoms) => 
          this.containsKeywords(symptoms.primaryComplaint, ['fever', 'high temperature']) &&
          (symptoms.severity >= 7 || this.containsKeywords(symptoms.associatedSymptoms.join(' '), ['chills', 'sweating'])),
        urgencyLevel: UrgencyLevel.URGENT,
        score: 80,
        reasoning: 'High fever may indicate serious infection requiring prompt treatment'
      },
      {
        id: 'URGENT_PERSISTENT_VOMITING',
        name: 'Persistent Vomiting',
        condition: (symptoms) => 
          this.containsKeywords(symptoms.primaryComplaint, ['vomiting', 'throwing up']) &&
          (symptoms.severity >= 6 || this.isDurationConcerning(symptoms.duration)),
        urgencyLevel: UrgencyLevel.URGENT,
        score: 75,
        reasoning: 'Persistent vomiting can lead to dehydration and requires medical attention'
      },
      {
        id: 'URGENT_ABDOMINAL_PAIN',
        name: 'Severe Abdominal Pain',
        condition: (symptoms) => 
          this.containsKeywords(symptoms.primaryComplaint, ['abdominal pain', 'stomach pain', 'belly pain']) &&
          symptoms.severity >= 7,
        urgencyLevel: UrgencyLevel.URGENT,
        score: 78,
        reasoning: 'Severe abdominal pain may indicate appendicitis or other serious conditions'
      },
      {
        id: 'URGENT_HEAD_INJURY',
        name: 'Head Injury',
        condition: (symptoms) => 
          this.containsKeywords(symptoms.primaryComplaint, ['head injury', 'hit head', 'head trauma']) ||
          this.containsKeywords(symptoms.associatedSymptoms.join(' '), ['headache', 'dizziness', 'nausea']),
        urgencyLevel: UrgencyLevel.URGENT,
        score: 85,
        reasoning: 'Head injuries require evaluation for potential brain injury'
      },
      {
        id: 'URGENT_INFECTION_SIGNS',
        name: 'Signs of Serious Infection',
        condition: (symptoms) => 
          this.hasMultipleInfectionSigns(symptoms),
        urgencyLevel: UrgencyLevel.URGENT,
        score: 82,
        reasoning: 'Multiple signs of infection may indicate serious bacterial infection'
      },

      // Routine Rules (Score: 30-69)
      {
        id: 'ROUTINE_MILD_FEVER',
        name: 'Mild Fever',
        condition: (symptoms) => 
          this.containsKeywords(symptoms.primaryComplaint, ['fever', 'temperature']) &&
          symptoms.severity < 7,
        urgencyLevel: UrgencyLevel.ROUTINE,
        score: 60,
        reasoning: 'Mild fever can be managed with routine medical care'
      },
      {
        id: 'ROUTINE_COLD_SYMPTOMS',
        name: 'Cold/Flu Symptoms',
        condition: (symptoms) => 
          this.containsKeywords(symptoms.primaryComplaint, ['cold', 'cough', 'runny nose', 'sore throat']) &&
          symptoms.severity < 6,
        urgencyLevel: UrgencyLevel.ROUTINE,
        score: 40,
        reasoning: 'Common cold symptoms typically resolve with routine care'
      },
      {
        id: 'ROUTINE_MILD_PAIN',
        name: 'Mild to Moderate Pain',
        condition: (symptoms) => 
          this.containsKeywords(symptoms.primaryComplaint, ['pain', 'ache', 'discomfort']) &&
          symptoms.severity >= 3 && symptoms.severity < 7,
        urgencyLevel: UrgencyLevel.ROUTINE,
        score: 55,
        reasoning: 'Mild to moderate pain can be evaluated during routine medical visit'
      },
      {
        id: 'ROUTINE_SKIN_ISSUES',
        name: 'Skin Problems',
        condition: (symptoms) => 
          this.containsKeywords(symptoms.primaryComplaint, ['rash', 'skin', 'itching', 'redness']) &&
          symptoms.severity < 6,
        urgencyLevel: UrgencyLevel.ROUTINE,
        score: 45,
        reasoning: 'Most skin conditions can be managed with routine dermatological care'
      },

      // Self-Care Rules (Score: 10-29)
      {
        id: 'SELF_CARE_MINOR_SYMPTOMS',
        name: 'Minor Symptoms',
        condition: (symptoms) => 
          symptoms.severity <= 3 &&
          this.containsKeywords(symptoms.primaryComplaint, ['mild', 'slight', 'minor']),
        urgencyLevel: UrgencyLevel.SELF_CARE,
        score: 25,
        reasoning: 'Minor symptoms can often be managed with self-care and monitoring'
      },
      {
        id: 'SELF_CARE_WELLNESS',
        name: 'Wellness Check',
        condition: (symptoms) => 
          this.containsKeywords(symptoms.primaryComplaint, ['check-up', 'wellness', 'prevention', 'screening']),
        urgencyLevel: UrgencyLevel.SELF_CARE,
        score: 20,
        reasoning: 'Wellness and prevention activities can be scheduled at convenience'
      }
    ];
  }

  /**
   * Find the rule with highest urgency level
   */
  private findHighestUrgencyRule(rules: ClinicalRule[]): ClinicalRule {
    const urgencyPriority = {
      [UrgencyLevel.EMERGENCY]: 4,
      [UrgencyLevel.URGENT]: 3,
      [UrgencyLevel.ROUTINE]: 2,
      [UrgencyLevel.SELF_CARE]: 1
    };

    return rules.reduce((highest, current) => 
      urgencyPriority[current.urgencyLevel] > urgencyPriority[highest.urgencyLevel] 
        ? current 
        : highest
    );
  }

  /**
   * Generate reasoning text from triggered rules
   */
  private generateReasoning(triggeredRules: ClinicalRule[], primaryRule: ClinicalRule): string {
    if (triggeredRules.length === 1) {
      return primaryRule.reasoning;
    }

    const ruleNames = triggeredRules.map(rule => rule.name).join(', ');
    return `Multiple clinical indicators detected: ${ruleNames}. Primary concern: ${primaryRule.reasoning}`;
  }

  /**
   * Check if triggered rules have conflicting urgency levels
   */
  private hasConflictingUrgencyLevels(ruleIds: string[]): boolean {
    const rules = this.clinicalRules.filter(rule => ruleIds.includes(rule.id));
    const urgencyLevels = new Set(rules.map(rule => rule.urgencyLevel));
    return urgencyLevels.size > 1;
  }

  /**
   * Check if complaint is vague or non-specific
   */
  private isVagueComplaint(complaint: string): boolean {
    const vagueTerms = [
      'not feeling well', 'feeling sick', 'something wrong', 'general discomfort',
      'tired', 'weak', 'unwell', 'off', 'strange feeling'
    ];
    return vagueTerms.some(term => complaint.toLowerCase().includes(term));
  }

  /**
   * Check if symptoms contain specific keywords
   */
  private containsKeywords(text: string, keywords: string[]): boolean {
    const lowerText = text.toLowerCase();
    return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
  }

  /**
   * Check if duration is concerning (persistent symptoms)
   */
  private isDurationConcerning(duration: string): boolean {
    const concerningDurations = ['days', 'weeks', 'persistent', 'ongoing', 'continuous'];
    return concerningDurations.some(term => duration.toLowerCase().includes(term));
  }

  /**
   * Check for multiple signs of serious infection
   */
  private hasMultipleInfectionSigns(symptoms: Symptoms): boolean {
    const infectionSigns = ['fever', 'chills', 'sweating', 'fatigue', 'weakness', 'swollen glands'];
    const allSymptoms = (symptoms.primaryComplaint + ' ' + symptoms.associatedSymptoms.join(' ')).toLowerCase();
    
    const presentSigns = infectionSigns.filter(sign => allSymptoms.includes(sign));
    return presentSigns.length >= 2 && symptoms.severity >= 6;
  }
}