/**
 * Types and configuration for SubmissionValidator
 */

/**
 * Security validation configuration
 */
export interface ValidationConfig {
  allowedDomains: string[];
  maxDataSize: number;
  requireSSL: boolean;
  allowedPIIFields: string[];
  blockedPatterns: RegExp[];
  maxScriptSize: number;
}

/**
 * Default security configuration
 */
export const DEFAULT_CONFIG: ValidationConfig = {
  allowedDomains: [
    'vjw-lp.digital.go.jp',  // Japan - Visit Japan Web
    'mdac.gov.my',           // Malaysia - MDAC
    'eservices.ica.gov.sg',  // Singapore - ICA
    'localhost',             // Development
    '127.0.0.1'             // Development
  ],
  maxDataSize: 1024 * 1024, // 1MB
  requireSSL: true,
  allowedPIIFields: [
    'surname',
    'givenNames',
    'passportNumber',
    'nationality',
    'dateOfBirth',
    'gender',
    'arrivalDate',
    'flightNumber',
    'hotelName',
    'hotelAddress'
  ],
  blockedPatterns: [
    /password/i,
    /credit.*card/i,
    /social.*security/i,
    /ssn/i,
    /bank.*account/i,
    /medical.*record/i
  ],
  maxScriptSize: 50000 // 50KB
};
