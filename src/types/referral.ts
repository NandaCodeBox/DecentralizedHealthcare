// Referral-related types and interfaces

import { BaseEntity, Outcome } from './common';
import { ReferralStatus, UrgencyLevel } from './enums';

/**
 * Patient context for referral
 */
export interface PatientContext {
  symptoms: Record<string, any>;
  assessments: Record<string, any>;
  treatments: Record<string, any>;
  notes: string;
  vitalSigns?: Record<string, any>;
  labResults?: Record<string, any>;
}

/**
 * Referral timeline tracking
 */
export interface ReferralTimeline {
  requestedAt: Date;
  acceptedAt?: Date;
  completedAt?: Date;
  rejectedAt?: Date;
}

/**
 * Complete referral record
 */
export interface Referral extends BaseEntity {
  referralId: string; // UUID
  episodeId: string; // UUID
  fromProvider: string; // Provider UUID
  toProvider: string; // Provider UUID
  urgency: UrgencyLevel;
  reason: string;
  patientContext: PatientContext;
  status: ReferralStatus;
  timeline: ReferralTimeline;
  outcome?: Outcome;
  rejectionReason?: string;
  followUpInstructions?: string;
}

/**
 * Referral creation input
 */
export interface CreateReferralInput {
  episodeId: string;
  fromProvider: string;
  toProvider: string;
  urgency: UrgencyLevel;
  reason: string;
  patientContext: PatientContext;
  followUpInstructions?: string;
}

/**
 * Referral update input
 */
export interface UpdateReferralInput {
  status?: ReferralStatus;
  outcome?: Partial<Outcome>;
  rejectionReason?: string;
  followUpInstructions?: string;
}

/**
 * Referral acceptance input
 */
export interface AcceptReferralInput {
  referralId: string;
  acceptingProviderId: string;
  estimatedAppointmentTime?: Date;
  preparationInstructions?: string;
}

/**
 * Referral rejection input
 */
export interface RejectReferralInput {
  referralId: string;
  rejectingProviderId: string;
  rejectionReason: string;
  alternativeRecommendations?: string[];
}

/**
 * Referral completion input
 */
export interface CompleteReferralInput {
  referralId: string;
  outcome: Outcome;
  followUpRequired: boolean;
  nextSteps?: string;
}