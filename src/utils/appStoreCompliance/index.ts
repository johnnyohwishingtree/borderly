/**
 * App Store Compliance Utilities
 *
 * Barrel re-exports all public API so existing imports
 * (`from '@/utils/appStoreCompliance'`) continue to work.
 */

export type { AppStoreComplianceCheck, ComplianceReport } from './appStoreComplianceTypes';
export { AppStoreComplianceValidator } from './appStoreComplianceValidator';
export { initializeChecks } from './appStoreComplianceChecks';
export { validateMetadata, generateCISummary } from './appStoreComplianceUtils';

