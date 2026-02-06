"use strict";
// Rule-based Triage Engine
// Implements clinical rules for symptom urgency assessment
// Requirements: 2.1, 2.3
Object.defineProperty(exports, "__esModule", { value: true });
exports.TriageRuleEngine = void 0;
const types_1 = require("../../types");
/**
 * Rule-based triage engine for symptom assessment
 */
class TriageRuleEngine {
    constructor() {
        this.clinicalRules = this.initializeClinicalRules();
    }
    /**
     * Assess symptoms using clinical rules
     */
    assessSymptoms(symptoms) {
        const triggeredRules = [];
        // Evaluate all rules against symptoms
        for (const rule of this.clinicalRules) {
            if (rule.condition(symptoms)) {
                triggeredRules.push(rule);
            }
        }
        // If no rules triggered, default to routine care
        if (triggeredRules.length === 0) {
            return {
                urgencyLevel: types_1.UrgencyLevel.ROUTINE,
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
    needsAIAssistance(ruleBasedResult, symptoms) {
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
    initializeClinicalRules() {
        return [
            // Emergency Rules (Score: 90-100)
            {
                id: 'EMERGENCY_CHEST_PAIN',
                name: 'Severe Chest Pain',
                condition: (symptoms) => this.containsKeywords(symptoms.primaryComplaint, ['chest pain', 'chest tightness']) &&
                    symptoms.severity >= 8,
                urgencyLevel: types_1.UrgencyLevel.EMERGENCY,
                score: 95,
                reasoning: 'Severe chest pain may indicate cardiac emergency requiring immediate attention'
            },
            {
                id: 'EMERGENCY_BREATHING',
                name: 'Severe Breathing Difficulty',
                condition: (symptoms) => this.containsKeywords(symptoms.primaryComplaint, ['shortness of breath', 'difficulty breathing', 'can\'t breathe']) &&
                    symptoms.severity >= 8,
                urgencyLevel: types_1.UrgencyLevel.EMERGENCY,
                score: 95,
                reasoning: 'Severe breathing difficulty requires immediate medical intervention'
            },
            {
                id: 'EMERGENCY_CONSCIOUSNESS',
                name: 'Altered Consciousness',
                condition: (symptoms) => this.containsKeywords(symptoms.primaryComplaint, ['unconscious', 'fainting', 'seizure', 'confusion']),
                urgencyLevel: types_1.UrgencyLevel.EMERGENCY,
                score: 98,
                reasoning: 'Altered consciousness indicates potential neurological emergency'
            },
            {
                id: 'EMERGENCY_SEVERE_BLEEDING',
                name: 'Severe Bleeding',
                condition: (symptoms) => this.containsKeywords(symptoms.primaryComplaint, ['heavy bleeding', 'blood loss', 'hemorrhage']) &&
                    symptoms.severity >= 7,
                urgencyLevel: types_1.UrgencyLevel.EMERGENCY,
                score: 92,
                reasoning: 'Severe bleeding requires immediate medical control'
            },
            {
                id: 'EMERGENCY_SEVERE_PAIN',
                name: 'Severe Pain',
                condition: (symptoms) => symptoms.severity >= 9 &&
                    this.containsKeywords(symptoms.primaryComplaint, ['severe pain', 'excruciating', 'unbearable']),
                urgencyLevel: types_1.UrgencyLevel.EMERGENCY,
                score: 90,
                reasoning: 'Severe pain (9-10/10) may indicate serious underlying condition'
            },
            // Urgent Rules (Score: 70-89)
            {
                id: 'URGENT_HIGH_FEVER',
                name: 'High Fever',
                condition: (symptoms) => this.containsKeywords(symptoms.primaryComplaint, ['fever', 'high temperature']) &&
                    (symptoms.severity >= 7 || this.containsKeywords(symptoms.associatedSymptoms.join(' '), ['chills', 'sweating'])),
                urgencyLevel: types_1.UrgencyLevel.URGENT,
                score: 80,
                reasoning: 'High fever may indicate serious infection requiring prompt treatment'
            },
            {
                id: 'URGENT_PERSISTENT_VOMITING',
                name: 'Persistent Vomiting',
                condition: (symptoms) => this.containsKeywords(symptoms.primaryComplaint, ['vomiting', 'throwing up']) &&
                    (symptoms.severity >= 6 || this.isDurationConcerning(symptoms.duration)),
                urgencyLevel: types_1.UrgencyLevel.URGENT,
                score: 75,
                reasoning: 'Persistent vomiting can lead to dehydration and requires medical attention'
            },
            {
                id: 'URGENT_ABDOMINAL_PAIN',
                name: 'Severe Abdominal Pain',
                condition: (symptoms) => this.containsKeywords(symptoms.primaryComplaint, ['abdominal pain', 'stomach pain', 'belly pain']) &&
                    symptoms.severity >= 7,
                urgencyLevel: types_1.UrgencyLevel.URGENT,
                score: 78,
                reasoning: 'Severe abdominal pain may indicate appendicitis or other serious conditions'
            },
            {
                id: 'URGENT_HEAD_INJURY',
                name: 'Head Injury',
                condition: (symptoms) => this.containsKeywords(symptoms.primaryComplaint, ['head injury', 'hit head', 'head trauma']) ||
                    this.containsKeywords(symptoms.associatedSymptoms.join(' '), ['headache', 'dizziness', 'nausea']),
                urgencyLevel: types_1.UrgencyLevel.URGENT,
                score: 85,
                reasoning: 'Head injuries require evaluation for potential brain injury'
            },
            {
                id: 'URGENT_INFECTION_SIGNS',
                name: 'Signs of Serious Infection',
                condition: (symptoms) => this.hasMultipleInfectionSigns(symptoms),
                urgencyLevel: types_1.UrgencyLevel.URGENT,
                score: 82,
                reasoning: 'Multiple signs of infection may indicate serious bacterial infection'
            },
            // Routine Rules (Score: 30-69)
            {
                id: 'ROUTINE_MILD_FEVER',
                name: 'Mild Fever',
                condition: (symptoms) => this.containsKeywords(symptoms.primaryComplaint, ['fever', 'temperature']) &&
                    symptoms.severity < 7,
                urgencyLevel: types_1.UrgencyLevel.ROUTINE,
                score: 60,
                reasoning: 'Mild fever can be managed with routine medical care'
            },
            {
                id: 'ROUTINE_COLD_SYMPTOMS',
                name: 'Cold/Flu Symptoms',
                condition: (symptoms) => this.containsKeywords(symptoms.primaryComplaint, ['cold', 'cough', 'runny nose', 'sore throat']) &&
                    symptoms.severity < 6,
                urgencyLevel: types_1.UrgencyLevel.ROUTINE,
                score: 40,
                reasoning: 'Common cold symptoms typically resolve with routine care'
            },
            {
                id: 'ROUTINE_MILD_PAIN',
                name: 'Mild to Moderate Pain',
                condition: (symptoms) => this.containsKeywords(symptoms.primaryComplaint, ['pain', 'ache', 'discomfort']) &&
                    symptoms.severity >= 3 && symptoms.severity < 7,
                urgencyLevel: types_1.UrgencyLevel.ROUTINE,
                score: 55,
                reasoning: 'Mild to moderate pain can be evaluated during routine medical visit'
            },
            {
                id: 'ROUTINE_SKIN_ISSUES',
                name: 'Skin Problems',
                condition: (symptoms) => this.containsKeywords(symptoms.primaryComplaint, ['rash', 'skin', 'itching', 'redness']) &&
                    symptoms.severity < 6,
                urgencyLevel: types_1.UrgencyLevel.ROUTINE,
                score: 45,
                reasoning: 'Most skin conditions can be managed with routine dermatological care'
            },
            // Self-Care Rules (Score: 10-29)
            {
                id: 'SELF_CARE_MINOR_SYMPTOMS',
                name: 'Minor Symptoms',
                condition: (symptoms) => symptoms.severity <= 3 &&
                    this.containsKeywords(symptoms.primaryComplaint, ['mild', 'slight', 'minor']),
                urgencyLevel: types_1.UrgencyLevel.SELF_CARE,
                score: 25,
                reasoning: 'Minor symptoms can often be managed with self-care and monitoring'
            },
            {
                id: 'SELF_CARE_WELLNESS',
                name: 'Wellness Check',
                condition: (symptoms) => this.containsKeywords(symptoms.primaryComplaint, ['check-up', 'wellness', 'prevention', 'screening']),
                urgencyLevel: types_1.UrgencyLevel.SELF_CARE,
                score: 20,
                reasoning: 'Wellness and prevention activities can be scheduled at convenience'
            }
        ];
    }
    /**
     * Find the rule with highest urgency level
     */
    findHighestUrgencyRule(rules) {
        const urgencyPriority = {
            [types_1.UrgencyLevel.EMERGENCY]: 4,
            [types_1.UrgencyLevel.URGENT]: 3,
            [types_1.UrgencyLevel.ROUTINE]: 2,
            [types_1.UrgencyLevel.SELF_CARE]: 1
        };
        return rules.reduce((highest, current) => urgencyPriority[current.urgencyLevel] > urgencyPriority[highest.urgencyLevel]
            ? current
            : highest);
    }
    /**
     * Generate reasoning text from triggered rules
     */
    generateReasoning(triggeredRules, primaryRule) {
        if (triggeredRules.length === 1) {
            return primaryRule.reasoning;
        }
        const ruleNames = triggeredRules.map(rule => rule.name).join(', ');
        return `Multiple clinical indicators detected: ${ruleNames}. Primary concern: ${primaryRule.reasoning}`;
    }
    /**
     * Check if triggered rules have conflicting urgency levels
     */
    hasConflictingUrgencyLevels(ruleIds) {
        const rules = this.clinicalRules.filter(rule => ruleIds.includes(rule.id));
        const urgencyLevels = new Set(rules.map(rule => rule.urgencyLevel));
        return urgencyLevels.size > 1;
    }
    /**
     * Check if complaint is vague or non-specific
     */
    isVagueComplaint(complaint) {
        const vagueTerms = [
            'not feeling well', 'feeling sick', 'something wrong', 'general discomfort',
            'tired', 'weak', 'unwell', 'off', 'strange feeling'
        ];
        return vagueTerms.some(term => complaint.toLowerCase().includes(term));
    }
    /**
     * Check if symptoms contain specific keywords
     */
    containsKeywords(text, keywords) {
        const lowerText = text.toLowerCase();
        return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
    }
    /**
     * Check if duration is concerning (persistent symptoms)
     */
    isDurationConcerning(duration) {
        const concerningDurations = ['days', 'weeks', 'persistent', 'ongoing', 'continuous'];
        return concerningDurations.some(term => duration.toLowerCase().includes(term));
    }
    /**
     * Check for multiple signs of serious infection
     */
    hasMultipleInfectionSigns(symptoms) {
        const infectionSigns = ['fever', 'chills', 'sweating', 'fatigue', 'weakness', 'swollen glands'];
        const allSymptoms = (symptoms.primaryComplaint + ' ' + symptoms.associatedSymptoms.join(' ')).toLowerCase();
        const presentSigns = infectionSigns.filter(sign => allSymptoms.includes(sign));
        return presentSigns.length >= 2 && symptoms.severity >= 6;
    }
}
exports.TriageRuleEngine = TriageRuleEngine;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJpYWdlLXJ1bGUtZW5naW5lLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc3JjL2xhbWJkYS90cmlhZ2UtZW5naW5lL3RyaWFnZS1ydWxlLWVuZ2luZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUEsMkJBQTJCO0FBQzNCLDJEQUEyRDtBQUMzRCx5QkFBeUI7OztBQUV6Qix1Q0FBcUQ7QUF3QnJEOztHQUVHO0FBQ0gsTUFBYSxnQkFBZ0I7SUFHM0I7UUFDRSxJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO0lBQ3RELENBQUM7SUFFRDs7T0FFRztJQUNILGNBQWMsQ0FBQyxRQUFrQjtRQUMvQixNQUFNLGNBQWMsR0FBbUIsRUFBRSxDQUFDO1FBRTFDLHNDQUFzQztRQUN0QyxLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN0QyxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFDN0IsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM1QixDQUFDO1FBQ0gsQ0FBQztRQUVELGlEQUFpRDtRQUNqRCxJQUFJLGNBQWMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDaEMsT0FBTztnQkFDTCxZQUFZLEVBQUUsb0JBQVksQ0FBQyxPQUFPO2dCQUNsQyxLQUFLLEVBQUUsRUFBRTtnQkFDVCxjQUFjLEVBQUUsRUFBRTtnQkFDbEIsU0FBUyxFQUFFLG9GQUFvRjthQUNoRyxDQUFDO1FBQ0osQ0FBQztRQUVELHVEQUF1RDtRQUN2RCxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUN2RSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRXJFLE9BQU87WUFDTCxZQUFZLEVBQUUsa0JBQWtCLENBQUMsWUFBWTtZQUM3QyxLQUFLLEVBQUUsUUFBUTtZQUNmLGNBQWMsRUFBRSxjQUFjLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNuRCxTQUFTLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGNBQWMsRUFBRSxrQkFBa0IsQ0FBQztTQUN0RSxDQUFDO0lBQ0osQ0FBQztJQUVEOztPQUVHO0lBQ0gsaUJBQWlCLENBQUMsZUFBc0MsRUFBRSxRQUFrQjtRQUMxRSxnQ0FBZ0M7UUFDaEMsOENBQThDO1FBQzlDLHVDQUF1QztRQUN2Qyw4REFBOEQ7UUFDOUQscURBQXFEO1FBRXJELE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLDJCQUEyQixDQUFDLGVBQWUsQ0FBQyxjQUFjLENBQUMsQ0FBQztRQUM3RixNQUFNLGdCQUFnQixHQUFHLGVBQWUsQ0FBQyxLQUFLLElBQUksRUFBRSxJQUFJLGVBQWUsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO1FBQ3BGLE1BQU0sa0JBQWtCLEdBQUcsUUFBUSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDbEUsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFFM0UsT0FBTyxtQkFBbUIsSUFBSSxnQkFBZ0IsSUFBSSxrQkFBa0IsSUFBSSxpQkFBaUIsQ0FBQztJQUM1RixDQUFDO0lBRUQ7O09BRUc7SUFDSyx1QkFBdUI7UUFDN0IsT0FBTztZQUNMLGtDQUFrQztZQUNsQztnQkFDRSxFQUFFLEVBQUUsc0JBQXNCO2dCQUMxQixJQUFJLEVBQUUsbUJBQW1CO2dCQUN6QixTQUFTLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUN0QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLENBQUMsWUFBWSxFQUFFLGlCQUFpQixDQUFDLENBQUM7b0JBQ25GLFFBQVEsQ0FBQyxRQUFRLElBQUksQ0FBQztnQkFDeEIsWUFBWSxFQUFFLG9CQUFZLENBQUMsU0FBUztnQkFDcEMsS0FBSyxFQUFFLEVBQUU7Z0JBQ1QsU0FBUyxFQUFFLGdGQUFnRjthQUM1RjtZQUNEO2dCQUNFLEVBQUUsRUFBRSxxQkFBcUI7Z0JBQ3pCLElBQUksRUFBRSw2QkFBNkI7Z0JBQ25DLFNBQVMsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQ3RCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxxQkFBcUIsRUFBRSxzQkFBc0IsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO29CQUNuSCxRQUFRLENBQUMsUUFBUSxJQUFJLENBQUM7Z0JBQ3hCLFlBQVksRUFBRSxvQkFBWSxDQUFDLFNBQVM7Z0JBQ3BDLEtBQUssRUFBRSxFQUFFO2dCQUNULFNBQVMsRUFBRSxxRUFBcUU7YUFDakY7WUFDRDtnQkFDRSxFQUFFLEVBQUUseUJBQXlCO2dCQUM3QixJQUFJLEVBQUUsdUJBQXVCO2dCQUM3QixTQUFTLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUN0QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLENBQUMsYUFBYSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUM7Z0JBQ3ZHLFlBQVksRUFBRSxvQkFBWSxDQUFDLFNBQVM7Z0JBQ3BDLEtBQUssRUFBRSxFQUFFO2dCQUNULFNBQVMsRUFBRSxrRUFBa0U7YUFDOUU7WUFDRDtnQkFDRSxFQUFFLEVBQUUsMkJBQTJCO2dCQUMvQixJQUFJLEVBQUUsaUJBQWlCO2dCQUN2QixTQUFTLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUN0QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLENBQUMsZ0JBQWdCLEVBQUUsWUFBWSxFQUFFLFlBQVksQ0FBQyxDQUFDO29CQUNoRyxRQUFRLENBQUMsUUFBUSxJQUFJLENBQUM7Z0JBQ3hCLFlBQVksRUFBRSxvQkFBWSxDQUFDLFNBQVM7Z0JBQ3BDLEtBQUssRUFBRSxFQUFFO2dCQUNULFNBQVMsRUFBRSxvREFBb0Q7YUFDaEU7WUFDRDtnQkFDRSxFQUFFLEVBQUUsdUJBQXVCO2dCQUMzQixJQUFJLEVBQUUsYUFBYTtnQkFDbkIsU0FBUyxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FDdEIsUUFBUSxDQUFDLFFBQVEsSUFBSSxDQUFDO29CQUN0QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLENBQUMsYUFBYSxFQUFFLGNBQWMsRUFBRSxZQUFZLENBQUMsQ0FBQztnQkFDakcsWUFBWSxFQUFFLG9CQUFZLENBQUMsU0FBUztnQkFDcEMsS0FBSyxFQUFFLEVBQUU7Z0JBQ1QsU0FBUyxFQUFFLGlFQUFpRTthQUM3RTtZQUVELDhCQUE4QjtZQUM5QjtnQkFDRSxFQUFFLEVBQUUsbUJBQW1CO2dCQUN2QixJQUFJLEVBQUUsWUFBWTtnQkFDbEIsU0FBUyxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FDdEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLE9BQU8sRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO29CQUMvRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xILFlBQVksRUFBRSxvQkFBWSxDQUFDLE1BQU07Z0JBQ2pDLEtBQUssRUFBRSxFQUFFO2dCQUNULFNBQVMsRUFBRSxzRUFBc0U7YUFDbEY7WUFDRDtnQkFDRSxFQUFFLEVBQUUsNEJBQTRCO2dCQUNoQyxJQUFJLEVBQUUscUJBQXFCO2dCQUMzQixTQUFTLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUN0QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLENBQUMsVUFBVSxFQUFFLGFBQWEsQ0FBQyxDQUFDO29CQUM3RSxDQUFDLFFBQVEsQ0FBQyxRQUFRLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQzFFLFlBQVksRUFBRSxvQkFBWSxDQUFDLE1BQU07Z0JBQ2pDLEtBQUssRUFBRSxFQUFFO2dCQUNULFNBQVMsRUFBRSw0RUFBNEU7YUFDeEY7WUFDRDtnQkFDRSxFQUFFLEVBQUUsdUJBQXVCO2dCQUMzQixJQUFJLEVBQUUsdUJBQXVCO2dCQUM3QixTQUFTLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUN0QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLENBQUMsZ0JBQWdCLEVBQUUsY0FBYyxFQUFFLFlBQVksQ0FBQyxDQUFDO29CQUNsRyxRQUFRLENBQUMsUUFBUSxJQUFJLENBQUM7Z0JBQ3hCLFlBQVksRUFBRSxvQkFBWSxDQUFDLE1BQU07Z0JBQ2pDLEtBQUssRUFBRSxFQUFFO2dCQUNULFNBQVMsRUFBRSw2RUFBNkU7YUFDekY7WUFDRDtnQkFDRSxFQUFFLEVBQUUsb0JBQW9CO2dCQUN4QixJQUFJLEVBQUUsYUFBYTtnQkFDbkIsU0FBUyxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FDdEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLGFBQWEsRUFBRSxVQUFVLEVBQUUsYUFBYSxDQUFDLENBQUM7b0JBQzVGLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsVUFBVSxFQUFFLFdBQVcsRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDbkcsWUFBWSxFQUFFLG9CQUFZLENBQUMsTUFBTTtnQkFDakMsS0FBSyxFQUFFLEVBQUU7Z0JBQ1QsU0FBUyxFQUFFLDZEQUE2RDthQUN6RTtZQUNEO2dCQUNFLEVBQUUsRUFBRSx3QkFBd0I7Z0JBQzVCLElBQUksRUFBRSw0QkFBNEI7Z0JBQ2xDLFNBQVMsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQ3RCLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxRQUFRLENBQUM7Z0JBQzFDLFlBQVksRUFBRSxvQkFBWSxDQUFDLE1BQU07Z0JBQ2pDLEtBQUssRUFBRSxFQUFFO2dCQUNULFNBQVMsRUFBRSxzRUFBc0U7YUFDbEY7WUFFRCwrQkFBK0I7WUFDL0I7Z0JBQ0UsRUFBRSxFQUFFLG9CQUFvQjtnQkFDeEIsSUFBSSxFQUFFLFlBQVk7Z0JBQ2xCLFNBQVMsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQ3RCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLENBQUM7b0JBQzFFLFFBQVEsQ0FBQyxRQUFRLEdBQUcsQ0FBQztnQkFDdkIsWUFBWSxFQUFFLG9CQUFZLENBQUMsT0FBTztnQkFDbEMsS0FBSyxFQUFFLEVBQUU7Z0JBQ1QsU0FBUyxFQUFFLHFEQUFxRDthQUNqRTtZQUNEO2dCQUNFLEVBQUUsRUFBRSx1QkFBdUI7Z0JBQzNCLElBQUksRUFBRSxtQkFBbUI7Z0JBQ3pCLFNBQVMsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQ3RCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxhQUFhLENBQUMsQ0FBQztvQkFDaEcsUUFBUSxDQUFDLFFBQVEsR0FBRyxDQUFDO2dCQUN2QixZQUFZLEVBQUUsb0JBQVksQ0FBQyxPQUFPO2dCQUNsQyxLQUFLLEVBQUUsRUFBRTtnQkFDVCxTQUFTLEVBQUUsMERBQTBEO2FBQ3RFO1lBQ0Q7Z0JBQ0UsRUFBRSxFQUFFLG1CQUFtQjtnQkFDdkIsSUFBSSxFQUFFLHVCQUF1QjtnQkFDN0IsU0FBUyxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FDdEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsWUFBWSxDQUFDLENBQUM7b0JBQ2hGLFFBQVEsQ0FBQyxRQUFRLElBQUksQ0FBQyxJQUFJLFFBQVEsQ0FBQyxRQUFRLEdBQUcsQ0FBQztnQkFDakQsWUFBWSxFQUFFLG9CQUFZLENBQUMsT0FBTztnQkFDbEMsS0FBSyxFQUFFLEVBQUU7Z0JBQ1QsU0FBUyxFQUFFLHFFQUFxRTthQUNqRjtZQUNEO2dCQUNFLEVBQUUsRUFBRSxxQkFBcUI7Z0JBQ3pCLElBQUksRUFBRSxlQUFlO2dCQUNyQixTQUFTLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUN0QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLGdCQUFnQixFQUFFLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUM7b0JBQ3hGLFFBQVEsQ0FBQyxRQUFRLEdBQUcsQ0FBQztnQkFDdkIsWUFBWSxFQUFFLG9CQUFZLENBQUMsT0FBTztnQkFDbEMsS0FBSyxFQUFFLEVBQUU7Z0JBQ1QsU0FBUyxFQUFFLHNFQUFzRTthQUNsRjtZQUVELGlDQUFpQztZQUNqQztnQkFDRSxFQUFFLEVBQUUsMEJBQTBCO2dCQUM5QixJQUFJLEVBQUUsZ0JBQWdCO2dCQUN0QixTQUFTLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUN0QixRQUFRLENBQUMsUUFBUSxJQUFJLENBQUM7b0JBQ3RCLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUMvRSxZQUFZLEVBQUUsb0JBQVksQ0FBQyxTQUFTO2dCQUNwQyxLQUFLLEVBQUUsRUFBRTtnQkFDVCxTQUFTLEVBQUUsbUVBQW1FO2FBQy9FO1lBQ0Q7Z0JBQ0UsRUFBRSxFQUFFLG9CQUFvQjtnQkFDeEIsSUFBSSxFQUFFLGdCQUFnQjtnQkFDdEIsU0FBUyxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FDdEIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLFVBQVUsRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLFdBQVcsQ0FBQyxDQUFDO2dCQUN2RyxZQUFZLEVBQUUsb0JBQVksQ0FBQyxTQUFTO2dCQUNwQyxLQUFLLEVBQUUsRUFBRTtnQkFDVCxTQUFTLEVBQUUsb0VBQW9FO2FBQ2hGO1NBQ0YsQ0FBQztJQUNKLENBQUM7SUFFRDs7T0FFRztJQUNLLHNCQUFzQixDQUFDLEtBQXFCO1FBQ2xELE1BQU0sZUFBZSxHQUFHO1lBQ3RCLENBQUMsb0JBQVksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQzNCLENBQUMsb0JBQVksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ3hCLENBQUMsb0JBQVksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ3pCLENBQUMsb0JBQVksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1NBQzVCLENBQUM7UUFFRixPQUFPLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLEVBQUUsQ0FDdkMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsR0FBRyxlQUFlLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQztZQUMzRSxDQUFDLENBQUMsT0FBTztZQUNULENBQUMsQ0FBQyxPQUFPLENBQ1osQ0FBQztJQUNKLENBQUM7SUFFRDs7T0FFRztJQUNLLGlCQUFpQixDQUFDLGNBQThCLEVBQUUsV0FBeUI7UUFDakYsSUFBSSxjQUFjLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2hDLE9BQU8sV0FBVyxDQUFDLFNBQVMsQ0FBQztRQUMvQixDQUFDO1FBRUQsTUFBTSxTQUFTLEdBQUcsY0FBYyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkUsT0FBTywwQ0FBMEMsU0FBUyxzQkFBc0IsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQzFHLENBQUM7SUFFRDs7T0FFRztJQUNLLDJCQUEyQixDQUFDLE9BQWlCO1FBQ25ELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMzRSxNQUFNLGFBQWEsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFDcEUsT0FBTyxhQUFhLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQztJQUNoQyxDQUFDO0lBRUQ7O09BRUc7SUFDSyxnQkFBZ0IsQ0FBQyxTQUFpQjtRQUN4QyxNQUFNLFVBQVUsR0FBRztZQUNqQixrQkFBa0IsRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsb0JBQW9CO1lBQzNFLE9BQU8sRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxpQkFBaUI7U0FDcEQsQ0FBQztRQUNGLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUN6RSxDQUFDO0lBRUQ7O09BRUc7SUFDSyxnQkFBZ0IsQ0FBQyxJQUFZLEVBQUUsUUFBa0I7UUFDdkQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ3JDLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUM3RSxDQUFDO0lBRUQ7O09BRUc7SUFDSyxvQkFBb0IsQ0FBQyxRQUFnQjtRQUMzQyxNQUFNLG1CQUFtQixHQUFHLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsU0FBUyxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ3JGLE9BQU8sbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ2pGLENBQUM7SUFFRDs7T0FFRztJQUNLLHlCQUF5QixDQUFDLFFBQWtCO1FBQ2xELE1BQU0sY0FBYyxHQUFHLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ2hHLE1BQU0sV0FBVyxHQUFHLENBQUMsUUFBUSxDQUFDLGdCQUFnQixHQUFHLEdBQUcsR0FBRyxRQUFRLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUM7UUFFNUcsTUFBTSxZQUFZLEdBQUcsY0FBYyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUMvRSxPQUFPLFlBQVksQ0FBQyxNQUFNLElBQUksQ0FBQyxJQUFJLFFBQVEsQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDO0lBQzVELENBQUM7Q0FDRjtBQXBURCw0Q0FvVEMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBSdWxlLWJhc2VkIFRyaWFnZSBFbmdpbmVcclxuLy8gSW1wbGVtZW50cyBjbGluaWNhbCBydWxlcyBmb3Igc3ltcHRvbSB1cmdlbmN5IGFzc2Vzc21lbnRcclxuLy8gUmVxdWlyZW1lbnRzOiAyLjEsIDIuM1xyXG5cclxuaW1wb3J0IHsgU3ltcHRvbXMsIFVyZ2VuY3lMZXZlbCB9IGZyb20gJy4uLy4uL3R5cGVzJztcclxuXHJcbi8qKlxyXG4gKiBSZXN1bHQgb2YgcnVsZS1iYXNlZCB0cmlhZ2UgYXNzZXNzbWVudFxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBSdWxlQmFzZWRUcmlhZ2VSZXN1bHQge1xyXG4gIHVyZ2VuY3lMZXZlbDogVXJnZW5jeUxldmVsO1xyXG4gIHNjb3JlOiBudW1iZXI7IC8vIDAtMTAwIHNjYWxlXHJcbiAgdHJpZ2dlcmVkUnVsZXM6IHN0cmluZ1tdO1xyXG4gIHJlYXNvbmluZzogc3RyaW5nO1xyXG59XHJcblxyXG4vKipcclxuICogQ2xpbmljYWwgcnVsZSBkZWZpbml0aW9uXHJcbiAqL1xyXG5pbnRlcmZhY2UgQ2xpbmljYWxSdWxlIHtcclxuICBpZDogc3RyaW5nO1xyXG4gIG5hbWU6IHN0cmluZztcclxuICBjb25kaXRpb246IChzeW1wdG9tczogU3ltcHRvbXMpID0+IGJvb2xlYW47XHJcbiAgdXJnZW5jeUxldmVsOiBVcmdlbmN5TGV2ZWw7XHJcbiAgc2NvcmU6IG51bWJlcjtcclxuICByZWFzb25pbmc6IHN0cmluZztcclxufVxyXG5cclxuLyoqXHJcbiAqIFJ1bGUtYmFzZWQgdHJpYWdlIGVuZ2luZSBmb3Igc3ltcHRvbSBhc3Nlc3NtZW50XHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgVHJpYWdlUnVsZUVuZ2luZSB7XHJcbiAgcHJpdmF0ZSByZWFkb25seSBjbGluaWNhbFJ1bGVzOiBDbGluaWNhbFJ1bGVbXTtcclxuXHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICB0aGlzLmNsaW5pY2FsUnVsZXMgPSB0aGlzLmluaXRpYWxpemVDbGluaWNhbFJ1bGVzKCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBBc3Nlc3Mgc3ltcHRvbXMgdXNpbmcgY2xpbmljYWwgcnVsZXNcclxuICAgKi9cclxuICBhc3Nlc3NTeW1wdG9tcyhzeW1wdG9tczogU3ltcHRvbXMpOiBSdWxlQmFzZWRUcmlhZ2VSZXN1bHQge1xyXG4gICAgY29uc3QgdHJpZ2dlcmVkUnVsZXM6IENsaW5pY2FsUnVsZVtdID0gW107XHJcbiAgICBcclxuICAgIC8vIEV2YWx1YXRlIGFsbCBydWxlcyBhZ2FpbnN0IHN5bXB0b21zXHJcbiAgICBmb3IgKGNvbnN0IHJ1bGUgb2YgdGhpcy5jbGluaWNhbFJ1bGVzKSB7XHJcbiAgICAgIGlmIChydWxlLmNvbmRpdGlvbihzeW1wdG9tcykpIHtcclxuICAgICAgICB0cmlnZ2VyZWRSdWxlcy5wdXNoKHJ1bGUpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gSWYgbm8gcnVsZXMgdHJpZ2dlcmVkLCBkZWZhdWx0IHRvIHJvdXRpbmUgY2FyZVxyXG4gICAgaWYgKHRyaWdnZXJlZFJ1bGVzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHVyZ2VuY3lMZXZlbDogVXJnZW5jeUxldmVsLlJPVVRJTkUsXHJcbiAgICAgICAgc2NvcmU6IDUwLFxyXG4gICAgICAgIHRyaWdnZXJlZFJ1bGVzOiBbXSxcclxuICAgICAgICByZWFzb25pbmc6ICdObyBzcGVjaWZpYyBjbGluaWNhbCBydWxlcyB0cmlnZ2VyZWQuIFN5bXB0b21zIHJlcXVpcmUgcm91dGluZSBtZWRpY2FsIGV2YWx1YXRpb24uJ1xyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEZpbmQgdGhlIGhpZ2hlc3QgdXJnZW5jeSBsZXZlbCBhbW9uZyB0cmlnZ2VyZWQgcnVsZXNcclxuICAgIGNvbnN0IGhpZ2hlc3RVcmdlbmN5UnVsZSA9IHRoaXMuZmluZEhpZ2hlc3RVcmdlbmN5UnVsZSh0cmlnZ2VyZWRSdWxlcyk7XHJcbiAgICBjb25zdCBtYXhTY29yZSA9IE1hdGgubWF4KC4uLnRyaWdnZXJlZFJ1bGVzLm1hcChydWxlID0+IHJ1bGUuc2NvcmUpKTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB1cmdlbmN5TGV2ZWw6IGhpZ2hlc3RVcmdlbmN5UnVsZS51cmdlbmN5TGV2ZWwsXHJcbiAgICAgIHNjb3JlOiBtYXhTY29yZSxcclxuICAgICAgdHJpZ2dlcmVkUnVsZXM6IHRyaWdnZXJlZFJ1bGVzLm1hcChydWxlID0+IHJ1bGUuaWQpLFxyXG4gICAgICByZWFzb25pbmc6IHRoaXMuZ2VuZXJhdGVSZWFzb25pbmcodHJpZ2dlcmVkUnVsZXMsIGhpZ2hlc3RVcmdlbmN5UnVsZSlcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBEZXRlcm1pbmUgaWYgQUkgYXNzaXN0YW5jZSBpcyBuZWVkZWQgZm9yIGNvbXBsZXggY2FzZXNcclxuICAgKi9cclxuICBuZWVkc0FJQXNzaXN0YW5jZShydWxlQmFzZWRSZXN1bHQ6IFJ1bGVCYXNlZFRyaWFnZVJlc3VsdCwgc3ltcHRvbXM6IFN5bXB0b21zKTogYm9vbGVhbiB7XHJcbiAgICAvLyBBSSBhc3Npc3RhbmNlIGlzIG5lZWRlZCB3aGVuOlxyXG4gICAgLy8gMS4gTXVsdGlwbGUgY29uZmxpY3RpbmcgcnVsZXMgYXJlIHRyaWdnZXJlZFxyXG4gICAgLy8gMi4gU3ltcHRvbXMgYXJlIGNvbXBsZXggb3IgYW1iaWd1b3VzXHJcbiAgICAvLyAzLiBSdWxlLWJhc2VkIGFzc2Vzc21lbnQgaXMgdW5jZXJ0YWluIChzY29yZSBiZXR3ZWVuIDQwLTYwKVxyXG4gICAgLy8gNC4gU3ltcHRvbXMgZG9uJ3QgY2xlYXJseSBmaXQgZXN0YWJsaXNoZWQgcGF0dGVybnNcclxuXHJcbiAgICBjb25zdCBoYXNDb25mbGljdGluZ1J1bGVzID0gdGhpcy5oYXNDb25mbGljdGluZ1VyZ2VuY3lMZXZlbHMocnVsZUJhc2VkUmVzdWx0LnRyaWdnZXJlZFJ1bGVzKTtcclxuICAgIGNvbnN0IGlzVW5jZXJ0YWluU2NvcmUgPSBydWxlQmFzZWRSZXN1bHQuc2NvcmUgPj0gNDAgJiYgcnVsZUJhc2VkUmVzdWx0LnNjb3JlIDw9IDYwO1xyXG4gICAgY29uc3QgaGFzQ29tcGxleFN5bXB0b21zID0gc3ltcHRvbXMuYXNzb2NpYXRlZFN5bXB0b21zLmxlbmd0aCA+IDM7XHJcbiAgICBjb25zdCBoYXNWYWd1ZUNvbXBsYWludCA9IHRoaXMuaXNWYWd1ZUNvbXBsYWludChzeW1wdG9tcy5wcmltYXJ5Q29tcGxhaW50KTtcclxuXHJcbiAgICByZXR1cm4gaGFzQ29uZmxpY3RpbmdSdWxlcyB8fCBpc1VuY2VydGFpblNjb3JlIHx8IGhhc0NvbXBsZXhTeW1wdG9tcyB8fCBoYXNWYWd1ZUNvbXBsYWludDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEluaXRpYWxpemUgY2xpbmljYWwgcnVsZXMgZm9yIHRyaWFnZSBhc3Nlc3NtZW50XHJcbiAgICovXHJcbiAgcHJpdmF0ZSBpbml0aWFsaXplQ2xpbmljYWxSdWxlcygpOiBDbGluaWNhbFJ1bGVbXSB7XHJcbiAgICByZXR1cm4gW1xyXG4gICAgICAvLyBFbWVyZ2VuY3kgUnVsZXMgKFNjb3JlOiA5MC0xMDApXHJcbiAgICAgIHtcclxuICAgICAgICBpZDogJ0VNRVJHRU5DWV9DSEVTVF9QQUlOJyxcclxuICAgICAgICBuYW1lOiAnU2V2ZXJlIENoZXN0IFBhaW4nLFxyXG4gICAgICAgIGNvbmRpdGlvbjogKHN5bXB0b21zKSA9PiBcclxuICAgICAgICAgIHRoaXMuY29udGFpbnNLZXl3b3JkcyhzeW1wdG9tcy5wcmltYXJ5Q29tcGxhaW50LCBbJ2NoZXN0IHBhaW4nLCAnY2hlc3QgdGlnaHRuZXNzJ10pICYmXHJcbiAgICAgICAgICBzeW1wdG9tcy5zZXZlcml0eSA+PSA4LFxyXG4gICAgICAgIHVyZ2VuY3lMZXZlbDogVXJnZW5jeUxldmVsLkVNRVJHRU5DWSxcclxuICAgICAgICBzY29yZTogOTUsXHJcbiAgICAgICAgcmVhc29uaW5nOiAnU2V2ZXJlIGNoZXN0IHBhaW4gbWF5IGluZGljYXRlIGNhcmRpYWMgZW1lcmdlbmN5IHJlcXVpcmluZyBpbW1lZGlhdGUgYXR0ZW50aW9uJ1xyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgaWQ6ICdFTUVSR0VOQ1lfQlJFQVRISU5HJyxcclxuICAgICAgICBuYW1lOiAnU2V2ZXJlIEJyZWF0aGluZyBEaWZmaWN1bHR5JyxcclxuICAgICAgICBjb25kaXRpb246IChzeW1wdG9tcykgPT4gXHJcbiAgICAgICAgICB0aGlzLmNvbnRhaW5zS2V5d29yZHMoc3ltcHRvbXMucHJpbWFyeUNvbXBsYWludCwgWydzaG9ydG5lc3Mgb2YgYnJlYXRoJywgJ2RpZmZpY3VsdHkgYnJlYXRoaW5nJywgJ2NhblxcJ3QgYnJlYXRoZSddKSAmJlxyXG4gICAgICAgICAgc3ltcHRvbXMuc2V2ZXJpdHkgPj0gOCxcclxuICAgICAgICB1cmdlbmN5TGV2ZWw6IFVyZ2VuY3lMZXZlbC5FTUVSR0VOQ1ksXHJcbiAgICAgICAgc2NvcmU6IDk1LFxyXG4gICAgICAgIHJlYXNvbmluZzogJ1NldmVyZSBicmVhdGhpbmcgZGlmZmljdWx0eSByZXF1aXJlcyBpbW1lZGlhdGUgbWVkaWNhbCBpbnRlcnZlbnRpb24nXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBpZDogJ0VNRVJHRU5DWV9DT05TQ0lPVVNORVNTJyxcclxuICAgICAgICBuYW1lOiAnQWx0ZXJlZCBDb25zY2lvdXNuZXNzJyxcclxuICAgICAgICBjb25kaXRpb246IChzeW1wdG9tcykgPT4gXHJcbiAgICAgICAgICB0aGlzLmNvbnRhaW5zS2V5d29yZHMoc3ltcHRvbXMucHJpbWFyeUNvbXBsYWludCwgWyd1bmNvbnNjaW91cycsICdmYWludGluZycsICdzZWl6dXJlJywgJ2NvbmZ1c2lvbiddKSxcclxuICAgICAgICB1cmdlbmN5TGV2ZWw6IFVyZ2VuY3lMZXZlbC5FTUVSR0VOQ1ksXHJcbiAgICAgICAgc2NvcmU6IDk4LFxyXG4gICAgICAgIHJlYXNvbmluZzogJ0FsdGVyZWQgY29uc2Npb3VzbmVzcyBpbmRpY2F0ZXMgcG90ZW50aWFsIG5ldXJvbG9naWNhbCBlbWVyZ2VuY3knXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBpZDogJ0VNRVJHRU5DWV9TRVZFUkVfQkxFRURJTkcnLFxyXG4gICAgICAgIG5hbWU6ICdTZXZlcmUgQmxlZWRpbmcnLFxyXG4gICAgICAgIGNvbmRpdGlvbjogKHN5bXB0b21zKSA9PiBcclxuICAgICAgICAgIHRoaXMuY29udGFpbnNLZXl3b3JkcyhzeW1wdG9tcy5wcmltYXJ5Q29tcGxhaW50LCBbJ2hlYXZ5IGJsZWVkaW5nJywgJ2Jsb29kIGxvc3MnLCAnaGVtb3JyaGFnZSddKSAmJlxyXG4gICAgICAgICAgc3ltcHRvbXMuc2V2ZXJpdHkgPj0gNyxcclxuICAgICAgICB1cmdlbmN5TGV2ZWw6IFVyZ2VuY3lMZXZlbC5FTUVSR0VOQ1ksXHJcbiAgICAgICAgc2NvcmU6IDkyLFxyXG4gICAgICAgIHJlYXNvbmluZzogJ1NldmVyZSBibGVlZGluZyByZXF1aXJlcyBpbW1lZGlhdGUgbWVkaWNhbCBjb250cm9sJ1xyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgaWQ6ICdFTUVSR0VOQ1lfU0VWRVJFX1BBSU4nLFxyXG4gICAgICAgIG5hbWU6ICdTZXZlcmUgUGFpbicsXHJcbiAgICAgICAgY29uZGl0aW9uOiAoc3ltcHRvbXMpID0+IFxyXG4gICAgICAgICAgc3ltcHRvbXMuc2V2ZXJpdHkgPj0gOSAmJlxyXG4gICAgICAgICAgdGhpcy5jb250YWluc0tleXdvcmRzKHN5bXB0b21zLnByaW1hcnlDb21wbGFpbnQsIFsnc2V2ZXJlIHBhaW4nLCAnZXhjcnVjaWF0aW5nJywgJ3VuYmVhcmFibGUnXSksXHJcbiAgICAgICAgdXJnZW5jeUxldmVsOiBVcmdlbmN5TGV2ZWwuRU1FUkdFTkNZLFxyXG4gICAgICAgIHNjb3JlOiA5MCxcclxuICAgICAgICByZWFzb25pbmc6ICdTZXZlcmUgcGFpbiAoOS0xMC8xMCkgbWF5IGluZGljYXRlIHNlcmlvdXMgdW5kZXJseWluZyBjb25kaXRpb24nXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBVcmdlbnQgUnVsZXMgKFNjb3JlOiA3MC04OSlcclxuICAgICAge1xyXG4gICAgICAgIGlkOiAnVVJHRU5UX0hJR0hfRkVWRVInLFxyXG4gICAgICAgIG5hbWU6ICdIaWdoIEZldmVyJyxcclxuICAgICAgICBjb25kaXRpb246IChzeW1wdG9tcykgPT4gXHJcbiAgICAgICAgICB0aGlzLmNvbnRhaW5zS2V5d29yZHMoc3ltcHRvbXMucHJpbWFyeUNvbXBsYWludCwgWydmZXZlcicsICdoaWdoIHRlbXBlcmF0dXJlJ10pICYmXHJcbiAgICAgICAgICAoc3ltcHRvbXMuc2V2ZXJpdHkgPj0gNyB8fCB0aGlzLmNvbnRhaW5zS2V5d29yZHMoc3ltcHRvbXMuYXNzb2NpYXRlZFN5bXB0b21zLmpvaW4oJyAnKSwgWydjaGlsbHMnLCAnc3dlYXRpbmcnXSkpLFxyXG4gICAgICAgIHVyZ2VuY3lMZXZlbDogVXJnZW5jeUxldmVsLlVSR0VOVCxcclxuICAgICAgICBzY29yZTogODAsXHJcbiAgICAgICAgcmVhc29uaW5nOiAnSGlnaCBmZXZlciBtYXkgaW5kaWNhdGUgc2VyaW91cyBpbmZlY3Rpb24gcmVxdWlyaW5nIHByb21wdCB0cmVhdG1lbnQnXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBpZDogJ1VSR0VOVF9QRVJTSVNURU5UX1ZPTUlUSU5HJyxcclxuICAgICAgICBuYW1lOiAnUGVyc2lzdGVudCBWb21pdGluZycsXHJcbiAgICAgICAgY29uZGl0aW9uOiAoc3ltcHRvbXMpID0+IFxyXG4gICAgICAgICAgdGhpcy5jb250YWluc0tleXdvcmRzKHN5bXB0b21zLnByaW1hcnlDb21wbGFpbnQsIFsndm9taXRpbmcnLCAndGhyb3dpbmcgdXAnXSkgJiZcclxuICAgICAgICAgIChzeW1wdG9tcy5zZXZlcml0eSA+PSA2IHx8IHRoaXMuaXNEdXJhdGlvbkNvbmNlcm5pbmcoc3ltcHRvbXMuZHVyYXRpb24pKSxcclxuICAgICAgICB1cmdlbmN5TGV2ZWw6IFVyZ2VuY3lMZXZlbC5VUkdFTlQsXHJcbiAgICAgICAgc2NvcmU6IDc1LFxyXG4gICAgICAgIHJlYXNvbmluZzogJ1BlcnNpc3RlbnQgdm9taXRpbmcgY2FuIGxlYWQgdG8gZGVoeWRyYXRpb24gYW5kIHJlcXVpcmVzIG1lZGljYWwgYXR0ZW50aW9uJ1xyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgaWQ6ICdVUkdFTlRfQUJET01JTkFMX1BBSU4nLFxyXG4gICAgICAgIG5hbWU6ICdTZXZlcmUgQWJkb21pbmFsIFBhaW4nLFxyXG4gICAgICAgIGNvbmRpdGlvbjogKHN5bXB0b21zKSA9PiBcclxuICAgICAgICAgIHRoaXMuY29udGFpbnNLZXl3b3JkcyhzeW1wdG9tcy5wcmltYXJ5Q29tcGxhaW50LCBbJ2FiZG9taW5hbCBwYWluJywgJ3N0b21hY2ggcGFpbicsICdiZWxseSBwYWluJ10pICYmXHJcbiAgICAgICAgICBzeW1wdG9tcy5zZXZlcml0eSA+PSA3LFxyXG4gICAgICAgIHVyZ2VuY3lMZXZlbDogVXJnZW5jeUxldmVsLlVSR0VOVCxcclxuICAgICAgICBzY29yZTogNzgsXHJcbiAgICAgICAgcmVhc29uaW5nOiAnU2V2ZXJlIGFiZG9taW5hbCBwYWluIG1heSBpbmRpY2F0ZSBhcHBlbmRpY2l0aXMgb3Igb3RoZXIgc2VyaW91cyBjb25kaXRpb25zJ1xyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgaWQ6ICdVUkdFTlRfSEVBRF9JTkpVUlknLFxyXG4gICAgICAgIG5hbWU6ICdIZWFkIEluanVyeScsXHJcbiAgICAgICAgY29uZGl0aW9uOiAoc3ltcHRvbXMpID0+IFxyXG4gICAgICAgICAgdGhpcy5jb250YWluc0tleXdvcmRzKHN5bXB0b21zLnByaW1hcnlDb21wbGFpbnQsIFsnaGVhZCBpbmp1cnknLCAnaGl0IGhlYWQnLCAnaGVhZCB0cmF1bWEnXSkgfHxcclxuICAgICAgICAgIHRoaXMuY29udGFpbnNLZXl3b3JkcyhzeW1wdG9tcy5hc3NvY2lhdGVkU3ltcHRvbXMuam9pbignICcpLCBbJ2hlYWRhY2hlJywgJ2RpenppbmVzcycsICduYXVzZWEnXSksXHJcbiAgICAgICAgdXJnZW5jeUxldmVsOiBVcmdlbmN5TGV2ZWwuVVJHRU5ULFxyXG4gICAgICAgIHNjb3JlOiA4NSxcclxuICAgICAgICByZWFzb25pbmc6ICdIZWFkIGluanVyaWVzIHJlcXVpcmUgZXZhbHVhdGlvbiBmb3IgcG90ZW50aWFsIGJyYWluIGluanVyeSdcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIGlkOiAnVVJHRU5UX0lORkVDVElPTl9TSUdOUycsXHJcbiAgICAgICAgbmFtZTogJ1NpZ25zIG9mIFNlcmlvdXMgSW5mZWN0aW9uJyxcclxuICAgICAgICBjb25kaXRpb246IChzeW1wdG9tcykgPT4gXHJcbiAgICAgICAgICB0aGlzLmhhc011bHRpcGxlSW5mZWN0aW9uU2lnbnMoc3ltcHRvbXMpLFxyXG4gICAgICAgIHVyZ2VuY3lMZXZlbDogVXJnZW5jeUxldmVsLlVSR0VOVCxcclxuICAgICAgICBzY29yZTogODIsXHJcbiAgICAgICAgcmVhc29uaW5nOiAnTXVsdGlwbGUgc2lnbnMgb2YgaW5mZWN0aW9uIG1heSBpbmRpY2F0ZSBzZXJpb3VzIGJhY3RlcmlhbCBpbmZlY3Rpb24nXHJcbiAgICAgIH0sXHJcblxyXG4gICAgICAvLyBSb3V0aW5lIFJ1bGVzIChTY29yZTogMzAtNjkpXHJcbiAgICAgIHtcclxuICAgICAgICBpZDogJ1JPVVRJTkVfTUlMRF9GRVZFUicsXHJcbiAgICAgICAgbmFtZTogJ01pbGQgRmV2ZXInLFxyXG4gICAgICAgIGNvbmRpdGlvbjogKHN5bXB0b21zKSA9PiBcclxuICAgICAgICAgIHRoaXMuY29udGFpbnNLZXl3b3JkcyhzeW1wdG9tcy5wcmltYXJ5Q29tcGxhaW50LCBbJ2ZldmVyJywgJ3RlbXBlcmF0dXJlJ10pICYmXHJcbiAgICAgICAgICBzeW1wdG9tcy5zZXZlcml0eSA8IDcsXHJcbiAgICAgICAgdXJnZW5jeUxldmVsOiBVcmdlbmN5TGV2ZWwuUk9VVElORSxcclxuICAgICAgICBzY29yZTogNjAsXHJcbiAgICAgICAgcmVhc29uaW5nOiAnTWlsZCBmZXZlciBjYW4gYmUgbWFuYWdlZCB3aXRoIHJvdXRpbmUgbWVkaWNhbCBjYXJlJ1xyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgaWQ6ICdST1VUSU5FX0NPTERfU1lNUFRPTVMnLFxyXG4gICAgICAgIG5hbWU6ICdDb2xkL0ZsdSBTeW1wdG9tcycsXHJcbiAgICAgICAgY29uZGl0aW9uOiAoc3ltcHRvbXMpID0+IFxyXG4gICAgICAgICAgdGhpcy5jb250YWluc0tleXdvcmRzKHN5bXB0b21zLnByaW1hcnlDb21wbGFpbnQsIFsnY29sZCcsICdjb3VnaCcsICdydW5ueSBub3NlJywgJ3NvcmUgdGhyb2F0J10pICYmXHJcbiAgICAgICAgICBzeW1wdG9tcy5zZXZlcml0eSA8IDYsXHJcbiAgICAgICAgdXJnZW5jeUxldmVsOiBVcmdlbmN5TGV2ZWwuUk9VVElORSxcclxuICAgICAgICBzY29yZTogNDAsXHJcbiAgICAgICAgcmVhc29uaW5nOiAnQ29tbW9uIGNvbGQgc3ltcHRvbXMgdHlwaWNhbGx5IHJlc29sdmUgd2l0aCByb3V0aW5lIGNhcmUnXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBpZDogJ1JPVVRJTkVfTUlMRF9QQUlOJyxcclxuICAgICAgICBuYW1lOiAnTWlsZCB0byBNb2RlcmF0ZSBQYWluJyxcclxuICAgICAgICBjb25kaXRpb246IChzeW1wdG9tcykgPT4gXHJcbiAgICAgICAgICB0aGlzLmNvbnRhaW5zS2V5d29yZHMoc3ltcHRvbXMucHJpbWFyeUNvbXBsYWludCwgWydwYWluJywgJ2FjaGUnLCAnZGlzY29tZm9ydCddKSAmJlxyXG4gICAgICAgICAgc3ltcHRvbXMuc2V2ZXJpdHkgPj0gMyAmJiBzeW1wdG9tcy5zZXZlcml0eSA8IDcsXHJcbiAgICAgICAgdXJnZW5jeUxldmVsOiBVcmdlbmN5TGV2ZWwuUk9VVElORSxcclxuICAgICAgICBzY29yZTogNTUsXHJcbiAgICAgICAgcmVhc29uaW5nOiAnTWlsZCB0byBtb2RlcmF0ZSBwYWluIGNhbiBiZSBldmFsdWF0ZWQgZHVyaW5nIHJvdXRpbmUgbWVkaWNhbCB2aXNpdCdcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIGlkOiAnUk9VVElORV9TS0lOX0lTU1VFUycsXHJcbiAgICAgICAgbmFtZTogJ1NraW4gUHJvYmxlbXMnLFxyXG4gICAgICAgIGNvbmRpdGlvbjogKHN5bXB0b21zKSA9PiBcclxuICAgICAgICAgIHRoaXMuY29udGFpbnNLZXl3b3JkcyhzeW1wdG9tcy5wcmltYXJ5Q29tcGxhaW50LCBbJ3Jhc2gnLCAnc2tpbicsICdpdGNoaW5nJywgJ3JlZG5lc3MnXSkgJiZcclxuICAgICAgICAgIHN5bXB0b21zLnNldmVyaXR5IDwgNixcclxuICAgICAgICB1cmdlbmN5TGV2ZWw6IFVyZ2VuY3lMZXZlbC5ST1VUSU5FLFxyXG4gICAgICAgIHNjb3JlOiA0NSxcclxuICAgICAgICByZWFzb25pbmc6ICdNb3N0IHNraW4gY29uZGl0aW9ucyBjYW4gYmUgbWFuYWdlZCB3aXRoIHJvdXRpbmUgZGVybWF0b2xvZ2ljYWwgY2FyZSdcclxuICAgICAgfSxcclxuXHJcbiAgICAgIC8vIFNlbGYtQ2FyZSBSdWxlcyAoU2NvcmU6IDEwLTI5KVxyXG4gICAgICB7XHJcbiAgICAgICAgaWQ6ICdTRUxGX0NBUkVfTUlOT1JfU1lNUFRPTVMnLFxyXG4gICAgICAgIG5hbWU6ICdNaW5vciBTeW1wdG9tcycsXHJcbiAgICAgICAgY29uZGl0aW9uOiAoc3ltcHRvbXMpID0+IFxyXG4gICAgICAgICAgc3ltcHRvbXMuc2V2ZXJpdHkgPD0gMyAmJlxyXG4gICAgICAgICAgdGhpcy5jb250YWluc0tleXdvcmRzKHN5bXB0b21zLnByaW1hcnlDb21wbGFpbnQsIFsnbWlsZCcsICdzbGlnaHQnLCAnbWlub3InXSksXHJcbiAgICAgICAgdXJnZW5jeUxldmVsOiBVcmdlbmN5TGV2ZWwuU0VMRl9DQVJFLFxyXG4gICAgICAgIHNjb3JlOiAyNSxcclxuICAgICAgICByZWFzb25pbmc6ICdNaW5vciBzeW1wdG9tcyBjYW4gb2Z0ZW4gYmUgbWFuYWdlZCB3aXRoIHNlbGYtY2FyZSBhbmQgbW9uaXRvcmluZydcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIGlkOiAnU0VMRl9DQVJFX1dFTExORVNTJyxcclxuICAgICAgICBuYW1lOiAnV2VsbG5lc3MgQ2hlY2snLFxyXG4gICAgICAgIGNvbmRpdGlvbjogKHN5bXB0b21zKSA9PiBcclxuICAgICAgICAgIHRoaXMuY29udGFpbnNLZXl3b3JkcyhzeW1wdG9tcy5wcmltYXJ5Q29tcGxhaW50LCBbJ2NoZWNrLXVwJywgJ3dlbGxuZXNzJywgJ3ByZXZlbnRpb24nLCAnc2NyZWVuaW5nJ10pLFxyXG4gICAgICAgIHVyZ2VuY3lMZXZlbDogVXJnZW5jeUxldmVsLlNFTEZfQ0FSRSxcclxuICAgICAgICBzY29yZTogMjAsXHJcbiAgICAgICAgcmVhc29uaW5nOiAnV2VsbG5lc3MgYW5kIHByZXZlbnRpb24gYWN0aXZpdGllcyBjYW4gYmUgc2NoZWR1bGVkIGF0IGNvbnZlbmllbmNlJ1xyXG4gICAgICB9XHJcbiAgICBdO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRmluZCB0aGUgcnVsZSB3aXRoIGhpZ2hlc3QgdXJnZW5jeSBsZXZlbFxyXG4gICAqL1xyXG4gIHByaXZhdGUgZmluZEhpZ2hlc3RVcmdlbmN5UnVsZShydWxlczogQ2xpbmljYWxSdWxlW10pOiBDbGluaWNhbFJ1bGUge1xyXG4gICAgY29uc3QgdXJnZW5jeVByaW9yaXR5ID0ge1xyXG4gICAgICBbVXJnZW5jeUxldmVsLkVNRVJHRU5DWV06IDQsXHJcbiAgICAgIFtVcmdlbmN5TGV2ZWwuVVJHRU5UXTogMyxcclxuICAgICAgW1VyZ2VuY3lMZXZlbC5ST1VUSU5FXTogMixcclxuICAgICAgW1VyZ2VuY3lMZXZlbC5TRUxGX0NBUkVdOiAxXHJcbiAgICB9O1xyXG5cclxuICAgIHJldHVybiBydWxlcy5yZWR1Y2UoKGhpZ2hlc3QsIGN1cnJlbnQpID0+IFxyXG4gICAgICB1cmdlbmN5UHJpb3JpdHlbY3VycmVudC51cmdlbmN5TGV2ZWxdID4gdXJnZW5jeVByaW9yaXR5W2hpZ2hlc3QudXJnZW5jeUxldmVsXSBcclxuICAgICAgICA/IGN1cnJlbnQgXHJcbiAgICAgICAgOiBoaWdoZXN0XHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2VuZXJhdGUgcmVhc29uaW5nIHRleHQgZnJvbSB0cmlnZ2VyZWQgcnVsZXNcclxuICAgKi9cclxuICBwcml2YXRlIGdlbmVyYXRlUmVhc29uaW5nKHRyaWdnZXJlZFJ1bGVzOiBDbGluaWNhbFJ1bGVbXSwgcHJpbWFyeVJ1bGU6IENsaW5pY2FsUnVsZSk6IHN0cmluZyB7XHJcbiAgICBpZiAodHJpZ2dlcmVkUnVsZXMubGVuZ3RoID09PSAxKSB7XHJcbiAgICAgIHJldHVybiBwcmltYXJ5UnVsZS5yZWFzb25pbmc7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgcnVsZU5hbWVzID0gdHJpZ2dlcmVkUnVsZXMubWFwKHJ1bGUgPT4gcnVsZS5uYW1lKS5qb2luKCcsICcpO1xyXG4gICAgcmV0dXJuIGBNdWx0aXBsZSBjbGluaWNhbCBpbmRpY2F0b3JzIGRldGVjdGVkOiAke3J1bGVOYW1lc30uIFByaW1hcnkgY29uY2VybjogJHtwcmltYXJ5UnVsZS5yZWFzb25pbmd9YDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrIGlmIHRyaWdnZXJlZCBydWxlcyBoYXZlIGNvbmZsaWN0aW5nIHVyZ2VuY3kgbGV2ZWxzXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBoYXNDb25mbGljdGluZ1VyZ2VuY3lMZXZlbHMocnVsZUlkczogc3RyaW5nW10pOiBib29sZWFuIHtcclxuICAgIGNvbnN0IHJ1bGVzID0gdGhpcy5jbGluaWNhbFJ1bGVzLmZpbHRlcihydWxlID0+IHJ1bGVJZHMuaW5jbHVkZXMocnVsZS5pZCkpO1xyXG4gICAgY29uc3QgdXJnZW5jeUxldmVscyA9IG5ldyBTZXQocnVsZXMubWFwKHJ1bGUgPT4gcnVsZS51cmdlbmN5TGV2ZWwpKTtcclxuICAgIHJldHVybiB1cmdlbmN5TGV2ZWxzLnNpemUgPiAxO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2hlY2sgaWYgY29tcGxhaW50IGlzIHZhZ3VlIG9yIG5vbi1zcGVjaWZpY1xyXG4gICAqL1xyXG4gIHByaXZhdGUgaXNWYWd1ZUNvbXBsYWludChjb21wbGFpbnQ6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgY29uc3QgdmFndWVUZXJtcyA9IFtcclxuICAgICAgJ25vdCBmZWVsaW5nIHdlbGwnLCAnZmVlbGluZyBzaWNrJywgJ3NvbWV0aGluZyB3cm9uZycsICdnZW5lcmFsIGRpc2NvbWZvcnQnLFxyXG4gICAgICAndGlyZWQnLCAnd2VhaycsICd1bndlbGwnLCAnb2ZmJywgJ3N0cmFuZ2UgZmVlbGluZydcclxuICAgIF07XHJcbiAgICByZXR1cm4gdmFndWVUZXJtcy5zb21lKHRlcm0gPT4gY29tcGxhaW50LnRvTG93ZXJDYXNlKCkuaW5jbHVkZXModGVybSkpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2hlY2sgaWYgc3ltcHRvbXMgY29udGFpbiBzcGVjaWZpYyBrZXl3b3Jkc1xyXG4gICAqL1xyXG4gIHByaXZhdGUgY29udGFpbnNLZXl3b3Jkcyh0ZXh0OiBzdHJpbmcsIGtleXdvcmRzOiBzdHJpbmdbXSk6IGJvb2xlYW4ge1xyXG4gICAgY29uc3QgbG93ZXJUZXh0ID0gdGV4dC50b0xvd2VyQ2FzZSgpO1xyXG4gICAgcmV0dXJuIGtleXdvcmRzLnNvbWUoa2V5d29yZCA9PiBsb3dlclRleHQuaW5jbHVkZXMoa2V5d29yZC50b0xvd2VyQ2FzZSgpKSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDaGVjayBpZiBkdXJhdGlvbiBpcyBjb25jZXJuaW5nIChwZXJzaXN0ZW50IHN5bXB0b21zKVxyXG4gICAqL1xyXG4gIHByaXZhdGUgaXNEdXJhdGlvbkNvbmNlcm5pbmcoZHVyYXRpb246IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgY29uc3QgY29uY2VybmluZ0R1cmF0aW9ucyA9IFsnZGF5cycsICd3ZWVrcycsICdwZXJzaXN0ZW50JywgJ29uZ29pbmcnLCAnY29udGludW91cyddO1xyXG4gICAgcmV0dXJuIGNvbmNlcm5pbmdEdXJhdGlvbnMuc29tZSh0ZXJtID0+IGR1cmF0aW9uLnRvTG93ZXJDYXNlKCkuaW5jbHVkZXModGVybSkpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2hlY2sgZm9yIG11bHRpcGxlIHNpZ25zIG9mIHNlcmlvdXMgaW5mZWN0aW9uXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBoYXNNdWx0aXBsZUluZmVjdGlvblNpZ25zKHN5bXB0b21zOiBTeW1wdG9tcyk6IGJvb2xlYW4ge1xyXG4gICAgY29uc3QgaW5mZWN0aW9uU2lnbnMgPSBbJ2ZldmVyJywgJ2NoaWxscycsICdzd2VhdGluZycsICdmYXRpZ3VlJywgJ3dlYWtuZXNzJywgJ3N3b2xsZW4gZ2xhbmRzJ107XHJcbiAgICBjb25zdCBhbGxTeW1wdG9tcyA9IChzeW1wdG9tcy5wcmltYXJ5Q29tcGxhaW50ICsgJyAnICsgc3ltcHRvbXMuYXNzb2NpYXRlZFN5bXB0b21zLmpvaW4oJyAnKSkudG9Mb3dlckNhc2UoKTtcclxuICAgIFxyXG4gICAgY29uc3QgcHJlc2VudFNpZ25zID0gaW5mZWN0aW9uU2lnbnMuZmlsdGVyKHNpZ24gPT4gYWxsU3ltcHRvbXMuaW5jbHVkZXMoc2lnbikpO1xyXG4gICAgcmV0dXJuIHByZXNlbnRTaWducy5sZW5ndGggPj0gMiAmJiBzeW1wdG9tcy5zZXZlcml0eSA+PSA2O1xyXG4gIH1cclxufSJdfQ==