/**
 * Urgency levels for triage assessment
 */
export declare enum UrgencyLevel {
    EMERGENCY = "emergency",
    URGENT = "urgent",
    ROUTINE = "routine",
    SELF_CARE = "self-care"
}
/**
 * Care types available in the system
 */
export declare enum CareType {
    HOSPITAL = "hospital",
    CLINIC = "clinic",
    SPECIALIST = "specialist",
    PHARMACY = "pharmacy",
    TELEMEDICINE = "telemedicine",
    HOME_CARE = "home-care"
}
/**
 * Episode status values
 */
export declare enum EpisodeStatus {
    ACTIVE = "active",
    COMPLETED = "completed",
    ESCALATED = "escalated",
    CANCELLED = "cancelled"
}
/**
 * Referral status values
 */
export declare enum ReferralStatus {
    PENDING = "pending",
    ACCEPTED = "accepted",
    COMPLETED = "completed",
    REJECTED = "rejected"
}
/**
 * Provider types
 */
export declare enum ProviderType {
    HOSPITAL = "hospital",
    CLINIC = "clinic",
    SPECIALIST = "specialist",
    PHARMACY = "pharmacy"
}
/**
 * Input methods for symptom capture
 */
export declare enum InputMethod {
    TEXT = "text",
    VOICE = "voice"
}
/**
 * Gender options for cultural preferences
 */
export declare enum Gender {
    MALE = "male",
    FEMALE = "female",
    OTHER = "other",
    PREFER_NOT_TO_SAY = "prefer-not-to-say"
}
/**
 * Cost sensitivity levels
 */
export declare enum CostSensitivity {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high"
}
/**
 * Languages supported by the system
 */
export declare enum Language {
    ENGLISH = "en",
    HINDI = "hi"
}
/**
 * Payment methods
 */
export declare enum PaymentMethod {
    CASH = "cash",
    CARD = "card",
    UPI = "upi",
    INSURANCE = "insurance",
    GOVERNMENT_SCHEME = "government-scheme"
}
