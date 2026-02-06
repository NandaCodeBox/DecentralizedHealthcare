# Healthcare Orchestration Data Models

This directory contains the core TypeScript interfaces and data models for the AI-enabled decentralized care orchestration system.

## Overview

The data models are designed to support India's healthcare ecosystem with comprehensive patient care tracking, provider management, and care coordination workflows. All models include built-in validation using Joi schemas to ensure data integrity and type safety.

## Core Models

### Patient Model (`patient.ts`)
Represents a patient in the healthcare system with demographics, medical history, and preferences.

**Key Features:**
- Comprehensive demographic information including location coordinates
- Medical history tracking (conditions, medications, allergies)
- Cultural preferences (provider gender, language, cost sensitivity)
- Insurance information support

### Episode Model (`episode.ts`)
Represents a complete healthcare interaction from symptom intake to resolution.

**Key Features:**
- Symptom capture with severity scoring (1-10 scale)
- AI-assisted triage with human validation workflow
- Care pathway recommendations
- Complete interaction history tracking
- Outcome measurement and patient satisfaction

### Provider Model (`provider.ts`)
Represents healthcare providers (hospitals, clinics, specialists, pharmacies) in the network.

**Key Features:**
- Comprehensive capability tracking (specialties, services, equipment)
- Real-time capacity management (beds, patient load)
- Quality metrics (ratings, success rates, wait times)
- Cost structure and payment method support
- Availability scheduling and emergency status

### Referral Model (`referral.ts`)
Represents referrals and escalations between care levels.

**Key Features:**
- Complete patient context transfer
- Urgency-based prioritization
- Timeline tracking (requested, accepted, completed)
- Outcome documentation
- Follow-up instruction management

## Enums (`enums.ts`)

### UrgencyLevel
- `EMERGENCY` - Immediate life-threatening conditions
- `URGENT` - Serious conditions requiring prompt attention
- `ROUTINE` - Standard care needs
- `SELF_CARE` - Conditions manageable with guidance

### EpisodeStatus
- `ACTIVE` - Episode in progress
- `COMPLETED` - Episode resolved
- `ESCALATED` - Referred to higher care level
- `CANCELLED` - Episode cancelled

### ProviderType
- `HOSPITAL` - Full-service hospitals
- `CLINIC` - Outpatient clinics
- `SPECIALIST` - Specialist practitioners
- `PHARMACY` - Pharmaceutical services

### Other Enums
- `ReferralStatus`, `InputMethod`, `Gender`, `Language`, `CostSensitivity`, `PaymentMethod`

## Validation (`../validation/`)

All data models include comprehensive Joi validation schemas that enforce:

- **Data Type Safety**: Ensures correct TypeScript types
- **Business Rules**: Enforces healthcare-specific constraints
- **Required Fields**: Validates essential information is present
- **Format Validation**: Ensures proper formats (UUIDs, dates, coordinates)
- **Range Validation**: Validates numeric ranges (age, severity, ratings)

### Usage Example

```typescript
import { validateOrThrow, ValidationError } from '../validation/validation-utils';
import { patientSchema, CreatePatientInput } from '../validation';

try {
  const validatedPatient = validateOrThrow<Patient>(patientSchema, patientData);
  // Use validated patient data
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.errors);
  }
}
```

## Common Types (`common.ts`)

Shared interfaces used across multiple models:

- `Location` - Geographic information with coordinates
- `InsuranceInfo` - Insurance coverage details
- `MedicalHistory` - Patient medical background
- `QualityMetrics` - Provider quality measurements
- `Interaction` - Episode interaction records
- `BaseEntity` - Common fields (createdAt, updatedAt)

## India-Specific Adaptations

The data models are specifically designed for the Indian healthcare context:

### Geographic Support
- State and district-based location tracking
- 6-digit pincode validation
- Coordinate support for distance calculations

### Language Support
- Hindi and English language options
- Extensible for regional languages

### Cultural Considerations
- Provider gender preferences
- Cost sensitivity levels (important for Indian market)
- Insurance and government scheme support

### Payment Methods
- Cash, card, UPI support
- Insurance integration
- Government scheme compatibility

## Testing

The data models include comprehensive testing:

### Unit Tests (`__tests__/data-models.test.ts`)
- Validation of complete records
- Edge case testing
- Error condition validation
- Enum value verification

### Property-Based Tests (`__tests__/data-models.property.test.ts`)
- **Property 1: Data model completeness and validation**
- Validates Requirements 4.1, 4.5
- Tests data integrity across all valid input variations
- Ensures type safety and validation consistency

## Usage Examples

See `../examples/data-model-usage.ts` for complete examples of:
- Creating and validating patients
- Episode management workflows
- Provider registration
- Referral processing
- Complete care coordination workflows

## Integration Points

These data models integrate with:
- **AWS DynamoDB** - Data persistence layer
- **API Gateway** - REST API validation
- **Lambda Functions** - Business logic processing
- **Amazon Bedrock** - AI assessment integration
- **Amazon SNS** - Notification workflows

## Best Practices

1. **Always Validate**: Use validation schemas before processing data
2. **Type Safety**: Leverage TypeScript interfaces for compile-time checking
3. **Error Handling**: Use ValidationError for consistent error reporting
4. **Immutability**: Treat validated data as immutable
5. **Documentation**: Keep interfaces well-documented with JSDoc comments

## Requirements Traceability

This implementation satisfies:
- **Requirement 4.1**: Provider network data management
- **Requirement 4.5**: Provider credentials and quality ratings
- **Requirement 6.1**: Episode lifecycle management
- **Requirement 6.2**: Interaction logging
- **Requirement 9.1**: Data encryption support
- **Requirement 9.4**: Audit trail capabilities