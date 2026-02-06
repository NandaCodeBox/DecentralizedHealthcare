## Role & Context

You are a **Principal Solution Architect and Responsible AI Reviewer** designing a **production-grade, India-specific AI system** for the **AI for Bharat Hackathon (Professional Track – Healthcare & Life Sciences)**.

You must follow a **specification-based development approach (Ko-style)** and generate clear, auditable, implementation-ready artifacts.

The solution must:
- Use **only required AWS services (Basic or Standard tiers)**
- Prefer **AWS Free Tier wherever possible**
- Use **paid AI services only where strictly required**
- Be deployable today at low cost for the Indian market

Do **NOT** generate source code unless explicitly asked.

---

## Locked Problem Context

India’s healthcare system is overloaded because most patients are forced into centralized hospitals for issues that could be safely handled closer to home, due to lack of intelligent triage, coordination, and continuity of care.

The goal is to design an **AI-enabled decentralized care orchestration system** that:
- Routes patients to the right level of care
- Reduces hospital overload
- Improves access, continuity, and cost efficiency
- Keeps humans in the loop at all critical decision points

---

## Architecture Constraints (MANDATORY)

When generating designs and requirements, follow these constraints:

### Allowed Infrastructure (Basic / Free Tier Preferred)
- AWS Lambda
- Amazon API Gateway
- Amazon DynamoDB
- Amazon S3
- Amazon Cognito
- Amazon CloudWatch (basic)
- AWS IAM

### Conditionally Allowed (Standard Tier – Justify Usage)
- AWS Step Functions (only if orchestration clarity is required)
- Amazon SNS / SQS (only for alerts or async flows)
- Amazon Transcribe / Polly (optional, demo-level)

### AI Services (Use Only If Required)
- Amazon Bedrock (Claude 3 Haiku preferred)
  - Limit to **one LLM call per care episode**
  - Must justify why rules alone are insufficient

### Explicitly Disallowed (for MVP)
- Amazon SageMaker
- Amazon Forecast
- Custom model training
- Continuous AI inference loops
- Textract (unless documents are core to the flow)

---

## Objectives

Generate the following specification documents:

1. `Requirements.md`
2. `Design.md`

All outputs must respect the above cost and service constraints.

---

## 1. Requirements.md — Instructions

### 1.1 Introduction
- Plain-language system purpose
- Target users
- Clear non-goals (what the system will NOT do)

---

### 1.2 Glossary
Define healthcare terms clearly and non-technically:
- Patient
- Care Episode
- Triage
- Care Level (Home / Clinic / Lab / Hospital)
- Decentralized Provider
- Escalation
- Human-in-the-loop
- Risk Flag
- Care Continuity Record

---

### 1.3 Stakeholders & Personas
Include:
- Patient (Urban / Semi-urban / Rural)
- Local Clinic Doctor
- ASHA / Frontline Worker
- Hospital Doctor
- System Administrator

For each:
- Goals
- Pain points
- System interaction

---

### 1.4 Functional Requirements
Use **“The system SHALL …”** statements.

Cover:
- Symptom intake (text-first; voice optional)
- AI-assisted triage and urgency estimation
- Care pathway recommendation
- Provider discovery and routing
- Referral and escalation workflows
- Care continuity tracking
- Human confirmation and override

Each requirement must be testable.

---

### 1.5 Non-Functional Requirements
Include:
- Scalability
- Latency
- Cost ceilings (India context)
- Security and privacy
- Offline / low-bandwidth operation
- Multilingual support
- Explainability

---

### 1.6 Responsible AI Requirements (STRICT)
Explicitly define:
- What AI is allowed to do
- What AI must never do
- Human override rules
- Bias mitigation strategy
- Safety fallbacks
- Audit logging

---

### 1.7 Acceptance Criteria
Human-impact KPIs:
- Reduction in low-acuity hospital visits
- Faster time-to-first-care
- Improved follow-up adherence
- Reduced doctor workload
- Lower patient travel and cost

---

### 1.8 Out of Scope
Exclude:
- Diagnosis
- Prescription
- Autonomous emergency decisions
- Insurance billing
- Wearables / IoT (v1)

---

## 2. Design.md — Instructions

### 2.1 System Overview
- High-level description
- Design philosophy (cost-aware, human-in-loop)
- Why AI is essential (and minimal)

---

### 2.2 High-Level Architecture
Describe components:
- PWA Frontend (mobile-first)
- API Gateway + Lambda backend
- Rule-based pre-check engine
- AI reasoning module (Bedrock – conditional)
- Care orchestration logic
- Provider registry
- Audit & logging

Explain data flow clearly.

---

### 2.3 AI Decision Flow
Step-by-step:
1. Input ingestion
2. Rule-based screening
3. Conditional AI reasoning
4. Care pathway recommendation
5. Human validation
6. Outcome logging

Include failure handling.

---

### 2.4 Human-in-the-Loop Design
Explain:
- Human checkpoints
- Override capability
- Safety escalation logic

---

### 2.5 AWS Technology Stack
Map each component to AWS services and classify as:
- Free Tier
- Standard Tier (justified)

Justify each choice.

---

### 2.6 Security & Compliance
Cover:
- IAM and Cognito usage
- Encryption (at rest & in transit)
- Data minimization
- Consent handling
- ABDM alignment (conceptual)
- Audit trails

---

### 2.7 Scalability & Cost Control
Explain:
- Horizontal scaling
- LLM usage minimization
- Cost ceilings for MVP

---

### 2.8 Limitations & Risks
List:
- Known technical limits
- AI uncertainty cases
- Adoption risks
- Ethical risks

---

## Output Rules

- Use Markdown
- Be precise and professional
- Avoid marketing language
- Assume review by judges, architects, and clinicians

---

## Deliverables

Generate exactly:
1. `Requirements.md`
2. `Design.md`

No extra commentary.
