// Enums for urgency levels, care types, and status values

/**
 * Urgency levels for triage assessment
 */
export enum UrgencyLevel {
  EMERGENCY = 'emergency',
  URGENT = 'urgent',
  ROUTINE = 'routine',
  SELF_CARE = 'self-care'
}

/**
 * Care types available in the system
 */
export enum CareType {
  HOSPITAL = 'hospital',
  CLINIC = 'clinic',
  SPECIALIST = 'specialist',
  PHARMACY = 'pharmacy',
  TELEMEDICINE = 'telemedicine',
  HOME_CARE = 'home-care'
}

/**
 * Episode status values
 */
export enum EpisodeStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ESCALATED = 'escalated',
  CANCELLED = 'cancelled'
}

/**
 * Referral status values
 */
export enum ReferralStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  COMPLETED = 'completed',
  REJECTED = 'rejected'
}

/**
 * Provider types
 */
export enum ProviderType {
  HOSPITAL = 'hospital',
  CLINIC = 'clinic',
  SPECIALIST = 'specialist',
  PHARMACY = 'pharmacy'
}

/**
 * Input methods for symptom capture
 */
export enum InputMethod {
  TEXT = 'text',
  VOICE = 'voice'
}

/**
 * Gender options for cultural preferences
 */
export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
  PREFER_NOT_TO_SAY = 'prefer-not-to-say'
}

/**
 * Cost sensitivity levels
 */
export enum CostSensitivity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

/**
 * Languages supported by the system
 */
export enum Language {
  ENGLISH = 'en',
  HINDI = 'hi'
}

/**
 * Payment methods
 */
export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  UPI = 'upi',
  INSURANCE = 'insurance',
  GOVERNMENT_SCHEME = 'government-scheme'
}