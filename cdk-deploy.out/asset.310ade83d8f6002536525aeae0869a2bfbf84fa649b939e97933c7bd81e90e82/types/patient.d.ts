import { Location, InsuranceInfo, MedicalHistory, PatientPreferences, BaseEntity } from './common';
import { Gender, Language } from './enums';
/**
 * Patient demographics information
 */
export interface PatientDemographics {
    age: number;
    gender: Gender;
    location: Location;
    preferredLanguage: Language;
    insuranceInfo?: InsuranceInfo;
}
/**
 * Complete patient record
 */
export interface Patient extends BaseEntity {
    patientId: string;
    demographics: PatientDemographics;
    medicalHistory: MedicalHistory;
    preferences: PatientPreferences;
}
/**
 * Patient creation input (without system-generated fields)
 */
export interface CreatePatientInput {
    demographics: PatientDemographics;
    medicalHistory: MedicalHistory;
    preferences: PatientPreferences;
}
/**
 * Patient update input (partial update)
 */
export interface UpdatePatientInput {
    demographics?: Partial<PatientDemographics>;
    medicalHistory?: Partial<MedicalHistory>;
    preferences?: Partial<PatientPreferences>;
}
