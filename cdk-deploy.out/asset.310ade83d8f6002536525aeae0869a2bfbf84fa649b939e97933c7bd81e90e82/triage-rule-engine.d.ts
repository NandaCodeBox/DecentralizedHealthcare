import { Symptoms, UrgencyLevel } from '../../types';
/**
 * Result of rule-based triage assessment
 */
export interface RuleBasedTriageResult {
    urgencyLevel: UrgencyLevel;
    score: number;
    triggeredRules: string[];
    reasoning: string;
}
/**
 * Rule-based triage engine for symptom assessment
 */
export declare class TriageRuleEngine {
    private readonly clinicalRules;
    constructor();
    /**
     * Assess symptoms using clinical rules
     */
    assessSymptoms(symptoms: Symptoms): RuleBasedTriageResult;
    /**
     * Determine if AI assistance is needed for complex cases
     */
    needsAIAssistance(ruleBasedResult: RuleBasedTriageResult, symptoms: Symptoms): boolean;
    /**
     * Initialize clinical rules for triage assessment
     */
    private initializeClinicalRules;
    /**
     * Find the rule with highest urgency level
     */
    private findHighestUrgencyRule;
    /**
     * Generate reasoning text from triggered rules
     */
    private generateReasoning;
    /**
     * Check if triggered rules have conflicting urgency levels
     */
    private hasConflictingUrgencyLevels;
    /**
     * Check if complaint is vague or non-specific
     */
    private isVagueComplaint;
    /**
     * Check if symptoms contain specific keywords
     */
    private containsKeywords;
    /**
     * Check if duration is concerning (persistent symptoms)
     */
    private isDurationConcerning;
    /**
     * Check for multiple signs of serious infection
     */
    private hasMultipleInfectionSigns;
}
