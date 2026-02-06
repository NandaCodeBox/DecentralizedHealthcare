import { BaseEntity, Interaction, Outcome } from './common';
import { UrgencyLevel, EpisodeStatus, InputMethod } from './enums';
/**
 * Symptom information captured from patient
 */
export interface Symptoms {
    primaryComplaint: string;
    duration: string;
    severity: number;
    associatedSymptoms: string[];
    inputMethod: InputMethod;
}
/**
 * AI assessment information
 */
export interface AIAssessment {
    used: boolean;
    confidence?: number;
    reasoning?: string;
    modelUsed?: string;
    timestamp?: Date;
}
/**
 * Human validation information
 */
export interface HumanValidation {
    supervisorId: string;
    approved: boolean;
    overrideReason?: string;
    timestamp: Date;
    notes?: string;
}
/**
 * Triage assessment results
 */
export interface TriageAssessment {
    urgencyLevel: UrgencyLevel;
    ruleBasedScore: number;
    aiAssessment: AIAssessment;
    humanValidation?: HumanValidation;
    finalScore: number;
}
/**
 * Care pathway recommendation
 */
export interface CarePathway {
    recommendedLevel: string;
    assignedProvider?: string;
    alternativeProviders: string[];
    estimatedCost?: number;
    expectedDuration?: string;
    instructions?: string;
}
/**
 * Complete care episode record
 */
export interface Episode extends BaseEntity {
    episodeId: string;
    patientId: string;
    status: EpisodeStatus;
    symptoms: Symptoms;
    triage?: TriageAssessment;
    carePathway?: CarePathway;
    interactions: Interaction[];
    outcome?: Outcome;
}
/**
 * Episode creation input
 */
export interface CreateEpisodeInput {
    patientId: string;
    symptoms: Symptoms;
}
/**
 * Episode update input
 */
export interface UpdateEpisodeInput {
    status?: EpisodeStatus;
    triage?: Partial<TriageAssessment>;
    carePathway?: Partial<CarePathway>;
    outcome?: Partial<Outcome>;
}
/**
 * Add interaction input
 */
export interface AddInteractionInput {
    episodeId: string;
    type: string;
    actor: string;
    details: Record<string, any>;
}
