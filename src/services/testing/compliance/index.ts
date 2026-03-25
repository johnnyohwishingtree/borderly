/**
 * Compliance Validation Module
 *
 * Barrel export for compliance validation types, rules, and service.
 */

export {
  ComplianceValidator,
  complianceValidator,
} from './complianceValidator';

export type {
  ComplianceCheckResult,
  ComplianceCheck,
  ComplianceViolation,
  PrivacyComplianceConfig,
} from './types';

export {
  EU_COUNTRIES,
  SENSITIVE_FIELDS,
  UNNECESSARY_FIELDS,
  PII_PATTERNS,
} from './complianceRules';
