# Security Fixes Required - URGENT

## Critical Vulnerabilities Found

### 1. CORS Wildcard (CRITICAL)
**File**: `src/infrastructure/healthcare-orchestration-stack.ts:377`
**Current**: `allowOrigins: apigateway.Cors.ALL_ORIGINS`
**Fix**: Replace with specific domains
```typescript
allowOrigins: ['https://yourdomain.com']
```

### 2. S3 CORS Wildcard (HIGH)
**File**: `src/infrastructure/healthcare-orchestration-stack.ts:362`
**Current**: `allowedOrigins: ['*']`
**Fix**: Restrict to your domain

### 3. No Role-Based Access Control (CRITICAL)
**Issue**: All authenticated users can access all endpoints
**Fix**: Implement Lambda authorizer to check Cognito user roles
- Patients: Can only access their own data
- Supervisors: Can validate triage
- Admins: Can manage providers

### 4. Overly Permissive IAM (HIGH)
**File**: `src/infrastructure/healthcare-orchestration-stack.ts:481,505`
**Current**: `resources: ['*']`
**Fix**: Scope to specific resources

### 5. No MFA (MEDIUM)
**File**: `src/infrastructure/healthcare-orchestration-stack.ts:313`
**Fix**: Enable MFA for all users

### 6. Public Demo Endpoints (MEDIUM)
**Issue**: `/health`, `/test`, `/demo/symptoms` have no authentication
**Fix**: Remove in production or add API key

### 7. S3 Deletion Policy (DATA LOSS)
**File**: `src/infrastructure/healthcare-orchestration-stack.ts:368`
**Fix**: Change to `RETAIN`

### 8. Short Log Retention (COMPLIANCE)
**File**: `src/infrastructure/healthcare-orchestration-stack.ts:1001`
**Fix**: Increase to 1 year minimum

### 9. No WAF (HIGH)
**Missing**: AWS WAF on API Gateway
**Fix**: Add WAF with OWASP rules

### 10. No SNS Encryption (COMPLIANCE)
**Missing**: KMS encryption for SNS topics
**Fix**: Add KMS key to SNS topics

## Compliance Concerns

For healthcare data (HIPAA/Indian DPDP Act):
- ❌ No audit logging of data access
- ❌ No data retention policies
- ❌ No encryption key rotation
- ❌ No backup encryption verification
- ❌ No network isolation (VPC)

## Estimated Fix Time
- Critical fixes: 4-6 hours
- High priority: 2-3 hours
- Medium priority: 1-2 hours
- Compliance: 8-12 hours

## Priority Order
1. Fix CORS wildcards (30 min)
2. Implement RBAC (3 hours)
3. Scope IAM policies (1 hour)
4. Enable MFA (30 min)
5. Add WAF (1 hour)
6. Fix S3 deletion policy (5 min)
7. Increase log retention (5 min)
8. Add SNS encryption (30 min)
9. Remove/secure demo endpoints (30 min)
10. Full compliance audit (8+ hours)

## Next Steps
1. Review this document with security team
2. Create tickets for each fix
3. Test fixes in dev environment
4. Deploy to production with monitoring
5. Conduct penetration testing
6. Get compliance certification
