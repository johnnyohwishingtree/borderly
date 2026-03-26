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

import { AppStoreComplianceValidator } from './appStoreComplianceValidator';
import { validateMetadata, generateCISummary } from './appStoreComplianceUtils';

/**
 * Convenience object matching the original `complianceUtils` export shape.
 */
export const complianceUtils = {
  validateMetadata,
  generateCISummary,
};

/**
 * Default validator instance.
 */
export const defaultComplianceValidator = new AppStoreComplianceValidator();
