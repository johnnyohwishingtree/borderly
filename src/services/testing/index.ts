/**
 * Testing Services Index
 * 
 * Exports all testing and validation services for the
 * Government Portal Testing & Validation Framework
 */

export { 
  PortalHealthChecker,
  portalHealthChecker,
  type PortalHealthStatus,
  type PortalHealthIssue,
  type PortalHealthConfig
} from './portalHealthChecker';

export {
  SubmissionTester,
  submissionTester,
  type MockSubmissionResult,
  type SubmissionError,
  type SubmissionTestConfig
} from './submission';

export {
  ComplianceValidator,
  complianceValidator,
  type ComplianceCheckResult,
  type ComplianceCheck,
  type ComplianceViolation,
  type PrivacyComplianceConfig
} from './compliance';