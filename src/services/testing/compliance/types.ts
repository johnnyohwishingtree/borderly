/**
 * Compliance Validation Types
 *
 * Interfaces and types for data privacy compliance, legal requirements,
 * and regional regulations validation.
 */

export interface ComplianceCheckResult {
  isCompliant: boolean;
  checks: ComplianceCheck[];
  violations: ComplianceViolation[];
  recommendations: string[];
  lastChecked: string;
}

export interface ComplianceCheck {
  category: 'privacy' | 'data_protection' | 'terms_compliance' | 'regional_law';
  checkName: string;
  status: 'passed' | 'failed' | 'warning';
  description: string;
  details?: string;
}

export interface ComplianceViolation {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'privacy' | 'data_protection' | 'terms_compliance' | 'regional_law';
  message: string;
  fieldId?: string;
  remediation: string;
  legalBasis?: string;
}

export interface PrivacyComplianceConfig {
  enableGDPRChecks: boolean;
  enableCCPAChecks: boolean;
  enablePIPEDAChecks: boolean;
  enableCountrySpecificChecks: boolean;
  maxDataRetentionDays: number;
  requireDataMinimization: boolean;
}
