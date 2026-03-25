/**
 * Compliance Rules and Constants
 *
 * Constants and rule definitions used by the compliance validator
 * for privacy law checks and data protection validation.
 */

/** EU countries subject to GDPR */
export const EU_COUNTRIES = [
  'GBR', 'DEU', 'FRA', 'ITA', 'ESP', 'NLD', 'BEL', 'AUT', 'DNK', 'SWE', 'FIN', 'PRT', 'GRC'
];

/** Fields considered sensitive personal data */
export const SENSITIVE_FIELDS = [
  'passportNumber', 'nationalId', 'ssn', 'healthInfo',
  'biometricData', 'financialInfo', 'criminalHistory'
];

/** Fields that indicate unnecessary data collection */
export const UNNECESSARY_FIELDS = [
  'socialMedia', 'preferences', 'marketing', 'analytics'
];

/** PII detection patterns */
export const PII_PATTERNS = [
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/, type: 'SSN' },
  { pattern: /\b\d{16}\b/, type: 'Credit Card' },
  { pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, type: 'Email in wrong field' }
];
