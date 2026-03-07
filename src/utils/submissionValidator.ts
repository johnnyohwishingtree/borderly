/**
 * Submission Validator - Security validation for automated submissions
 * 
 * Ensures no PII leaks during submission process and validates
 * security constraints for government portal interactions.
 */

import { SecurityValidationResult } from '@/types/submission';
import { FilledForm } from '@/services/forms/formEngine';

/**
 * Security validation configuration
 */
interface ValidationConfig {
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
const DEFAULT_CONFIG: ValidationConfig = {
  allowedDomains: [
    'vjw-lp.digital.go.jp',    // Japan - Visit Japan Web
    'mdac.gov.my',             // Malaysia - MDAC
    'eservices.ica.gov.sg',    // Singapore - ICA
    'localhost',               // Development
    '127.0.0.1'               // Development
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

/**
 * Main submission validator class
 */
export class SubmissionValidator {
  private config: ValidationConfig;

  constructor(config?: Partial<ValidationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Validate a submission for security compliance
   */
  async validateSubmission(
    filledForm: FilledForm,
    countryCode: string
  ): Promise<SecurityValidationResult> {
    const result: SecurityValidationResult = {
      isValid: true,
      warnings: [],
      errors: [],
      checks: {
        noPIILeakage: true,
        validDomain: true,
        secureConnection: true,
        dataWithinLimits: true
      }
    };

    // Validate form data doesn't contain blocked PII
    const piiValidation = this.validatePIICompliance(filledForm);
    this.mergeValidationResult(result, piiValidation);

    // Validate target domain
    const domainValidation = this.validateTargetDomain(filledForm.portalUrl);
    this.mergeValidationResult(result, domainValidation);

    // Validate data size
    const sizeValidation = this.validateDataSize(filledForm);
    this.mergeValidationResult(result, sizeValidation);

    // Country-specific validation
    const countryValidation = await this.validateCountrySpecific(countryCode, filledForm);
    this.mergeValidationResult(result, countryValidation);

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Validate JavaScript code for security risks
   */
  validateJavaScript(code: string): SecurityValidationResult {
    const result: SecurityValidationResult = {
      isValid: true,
      warnings: [],
      errors: [],
      checks: {
        noPIILeakage: true,
        validDomain: true,
        secureConnection: true,
        dataWithinLimits: code.length <= this.config.maxScriptSize
      }
    };

    // Check script size
    if (!result.checks.dataWithinLimits) {
      result.errors.push(`JavaScript code exceeds maximum size limit (${this.config.maxScriptSize} bytes)`);
    }

    // Check for dangerous patterns
    const dangerousPatterns = [
      { pattern: /eval\s*\(/gi, risk: 'Code injection via eval()' },
      { pattern: /Function\s*\(/gi, risk: 'Code injection via Function()' },
      { pattern: /document\.write\s*\(/gi, risk: 'Document manipulation via write()' },
      { pattern: /innerHTML\s*=.*<script/gi, risk: 'Script injection via innerHTML' },
      { pattern: /fetch\s*\(/gi, risk: 'Unauthorized network request via fetch()' },
      { pattern: /XMLHttpRequest/gi, risk: 'Unauthorized network request via XMLHttpRequest' },
      { pattern: /window\.open\s*\(/gi, risk: 'Unauthorized popup/redirect via window.open()' },
      { pattern: /(window\.)?location(\.(href|replace|assign)|\s*=)/gi, risk: 'Unauthorized navigation' },
      { pattern: /document\.domain\s*=/gi, risk: 'Domain manipulation' },
      { pattern: /localStorage|sessionStorage/gi, risk: 'Persistent data storage' },
      { pattern: /indexedDB|webSQL/gi, risk: 'Database access' },
      { pattern: /navigator\.(camera|microphone|geolocation)/gi, risk: 'Sensitive device access' }
    ];

    for (const { pattern, risk } of dangerousPatterns) {
      if (pattern.test(code)) {
        result.errors.push(`Security risk detected: ${risk}`);
        result.checks.noPIILeakage = false;
      }
    }

    // Check for PII patterns in code
    const piiPatterns = [
      /passport.*number/gi,
      /social.*security/gi,
      /credit.*card/gi,
      /driver.*license/gi,
      /bank.*account/gi,
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN pattern
      /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g // Credit card pattern
    ];

    for (const pattern of piiPatterns) {
      if (pattern.test(code)) {
        result.warnings.push('Potential PII pattern detected in JavaScript code');
        break;
      }
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Validate URL for security compliance
   */
  validateURL(url: string): SecurityValidationResult {
    const result: SecurityValidationResult = {
      isValid: true,
      warnings: [],
      errors: [],
      checks: {
        noPIILeakage: true,
        validDomain: false,
        secureConnection: false,
        dataWithinLimits: true
      }
    };

    try {
      const urlObj = new URL(url);

      // Check protocol
      if (urlObj.protocol === 'https:') {
        result.checks.secureConnection = true;
      } else if (urlObj.protocol === 'http:' && 
                 (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1')) {
        result.checks.secureConnection = true;
        result.warnings.push('Using HTTP on localhost (development only)');
      } else {
        result.errors.push('Only HTTPS URLs are allowed for government portals');
      }

      // Check domain allowlist
      const isAllowedDomain = this.config.allowedDomains.some(domain => 
        urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
      );

      if (isAllowedDomain) {
        result.checks.validDomain = true;
      } else {
        result.errors.push(`Domain not in allowlist: ${urlObj.hostname}`);
      }

      // Check for PII in URL parameters
      const searchParams = urlObj.searchParams;
      for (const [key, value] of searchParams.entries()) {
        if (this.containsPII(key) || this.containsPII(value)) {
          result.errors.push('PII detected in URL parameters');
          result.checks.noPIILeakage = false;
          break;
        }
      }

    } catch (error) {
      result.errors.push(`Invalid URL: ${(error as Error).message}`);
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Validate form data for PII compliance
   */
  private validatePIICompliance(filledForm: FilledForm): SecurityValidationResult {
    const result: SecurityValidationResult = {
      isValid: true,
      warnings: [],
      errors: [],
      checks: {
        noPIILeakage: true,
        validDomain: true,
        secureConnection: true,
        dataWithinLimits: true
      }
    };

    // Check all form fields
    for (const section of filledForm.sections) {
      for (const field of section.fields) {
        // Only allowed PII fields should contain sensitive data
        if (!this.config.allowedPIIFields.includes(field.id)) {
          if (this.containsPII(String(field.currentValue))) {
            result.errors.push(`Unauthorized PII detected in field: ${field.id}`);
            result.checks.noPIILeakage = false;
          }
        }

        // Check for blocked patterns
        for (const pattern of this.config.blockedPatterns) {
          if (pattern.test(String(field.currentValue))) {
            result.errors.push(`Blocked pattern detected in field ${field.id}: ${pattern}`);
            result.checks.noPIILeakage = false;
          }
        }
      }
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Validate target domain
   */
  private validateTargetDomain(portalUrl: string): SecurityValidationResult {
    return this.validateURL(portalUrl);
  }

  /**
   * Validate data size constraints
   */
  private validateDataSize(filledForm: FilledForm): SecurityValidationResult {
    const result: SecurityValidationResult = {
      isValid: true,
      warnings: [],
      errors: [],
      checks: {
        noPIILeakage: true,
        validDomain: true,
        secureConnection: true,
        dataWithinLimits: true
      }
    };

    // Calculate total data size
    const formDataString = JSON.stringify(filledForm);
    const dataSize = formDataString.length;

    if (dataSize > this.config.maxDataSize) {
      result.errors.push(`Form data exceeds maximum size limit: ${dataSize} > ${this.config.maxDataSize} bytes`);
      result.checks.dataWithinLimits = false;
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Country-specific validation
   */
  private async validateCountrySpecific(
    countryCode: string,
    filledForm: FilledForm
  ): Promise<SecurityValidationResult> {
    const result: SecurityValidationResult = {
      isValid: true,
      warnings: [],
      errors: [],
      checks: {
        noPIILeakage: true,
        validDomain: true,
        secureConnection: true,
        dataWithinLimits: true
      }
    };

    switch (countryCode) {
      case 'JPN':
        return this.validateJapanSpecific(filledForm);
      
      case 'MYS':
        return this.validateMalaysiaSpecific(filledForm);
      
      case 'SGP':
        return this.validateSingaporeSpecific(filledForm);
      
      default:
        result.warnings.push(`No country-specific validation available for: ${countryCode}`);
    }

    return result;
  }

  /**
   * Japan-specific validation
   */
  private validateJapanSpecific(filledForm: FilledForm): SecurityValidationResult {
    const result: SecurityValidationResult = {
      isValid: true,
      warnings: [],
      errors: [],
      checks: {
        noPIILeakage: true,
        validDomain: true,
        secureConnection: true,
        dataWithinLimits: true
      }
    };

    // Validate Visit Japan Web specific requirements
    if (!filledForm.portalUrl.includes('vjw-lp.digital.go.jp')) {
      result.errors.push('Invalid portal URL for Japan submission');
      result.checks.validDomain = false;
    }

    // Check for Japan-specific field requirements (basic validation)
    const requiredFields = ['surname', 'passportNumber'];
    const formData = this.extractFormData(filledForm);
    
    for (const fieldId of requiredFields) {
      if (!formData[fieldId] || formData[fieldId] === '') {
        result.errors.push(`Missing required field for Japan: ${fieldId}`);
      }
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Malaysia-specific validation
   */
  private validateMalaysiaSpecific(filledForm: FilledForm): SecurityValidationResult {
    const result: SecurityValidationResult = {
      isValid: true,
      warnings: [],
      errors: [],
      checks: {
        noPIILeakage: true,
        validDomain: true,
        secureConnection: true,
        dataWithinLimits: true
      }
    };

    // Validate MDAC specific requirements
    if (!filledForm.portalUrl.includes('mdac.gov.my')) {
      result.errors.push('Invalid portal URL for Malaysia submission');
      result.checks.validDomain = false;
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Singapore-specific validation
   */
  private validateSingaporeSpecific(filledForm: FilledForm): SecurityValidationResult {
    const result: SecurityValidationResult = {
      isValid: true,
      warnings: [],
      errors: [],
      checks: {
        noPIILeakage: true,
        validDomain: true,
        secureConnection: true,
        dataWithinLimits: true
      }
    };

    // Validate ICA specific requirements
    if (!filledForm.portalUrl.includes('eservices.ica.gov.sg')) {
      result.errors.push('Invalid portal URL for Singapore submission');
      result.checks.validDomain = false;
    }

    result.isValid = result.errors.length === 0;
    return result;
  }

  /**
   * Helper methods
   */
  private containsPII(text: string): boolean {
    if (!text || typeof text !== 'string') return false;

    const piiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN pattern
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card pattern
      /\b[A-Z0-9]{9}\b/g, // Passport number pattern (simplified)
      /\b\d{3}-\d{3}-\d{4}\b/g, // Phone number pattern
      /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g // Email pattern
    ];

    return piiPatterns.some(pattern => pattern.test(text));
  }

  private extractFormData(filledForm: FilledForm): Record<string, any> {
    const data: Record<string, any> = {};
    
    filledForm.sections.forEach(section => {
      section.fields.forEach(field => {
        if (field.currentValue !== undefined && field.currentValue !== '') {
          data[field.id] = field.currentValue;
        }
      });
    });
    
    return data;
  }

  private mergeValidationResult(
    target: SecurityValidationResult,
    source: SecurityValidationResult
  ): void {
    target.warnings.push(...source.warnings);
    target.errors.push(...source.errors);
    
    // Combine checks (AND logic - all must pass)
    target.checks.noPIILeakage = target.checks.noPIILeakage && source.checks.noPIILeakage;
    target.checks.validDomain = target.checks.validDomain && source.checks.validDomain;
    target.checks.secureConnection = target.checks.secureConnection && source.checks.secureConnection;
    target.checks.dataWithinLimits = target.checks.dataWithinLimits && source.checks.dataWithinLimits;
  }

  /**
   * Public utility methods
   */

  /**
   * Get allowed domains for a specific country
   */
  getAllowedDomains(countryCode?: string): string[] {
    if (!countryCode) {
      return [...this.config.allowedDomains];
    }

    const countryDomains: Record<string, string[]> = {
      'JPN': ['vjw-lp.digital.go.jp'],
      'MYS': ['mdac.gov.my'], 
      'SGP': ['eservices.ica.gov.sg']
    };

    return countryDomains[countryCode] || [];
  }

  /**
   * Check if a field ID is allowed to contain PII
   */
  isAllowedPIIField(fieldId: string): boolean {
    return this.config.allowedPIIFields.includes(fieldId);
  }

  /**
   * Get validation configuration
   */
  getConfig(): ValidationConfig {
    return { ...this.config };
  }

  /**
   * Update validation configuration
   */
  updateConfig(updates: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Validate submission session data
   */
  validateSessionData(sessionData: Record<string, any>): SecurityValidationResult {
    const result: SecurityValidationResult = {
      isValid: true,
      warnings: [],
      errors: [],
      checks: {
        noPIILeakage: true,
        validDomain: true,
        secureConnection: true,
        dataWithinLimits: JSON.stringify(sessionData).length <= this.config.maxDataSize
      }
    };

    // Check for PII in session data
    for (const [key, value] of Object.entries(sessionData)) {
      if (!this.isAllowedPIIField(key) && this.containsPII(String(value))) {
        result.errors.push(`Unauthorized PII in session data: ${key}`);
        result.checks.noPIILeakage = false;
      }
    }

    // Check data size
    if (!result.checks.dataWithinLimits) {
      result.errors.push('Session data exceeds maximum size limit');
    }

    result.isValid = result.errors.length === 0;
    return result;
  }
}