/**
 * PII Sanitizer - Removes or redacts personally identifiable information
 * from logs, error reports, and analytics data to maintain privacy compliance.
 */

export interface SanitizationRule {
  pattern: RegExp;
  replacement: string;
}

// Common PII patterns to detect and redact
const PII_PATTERNS: SanitizationRule[] = [
  // Email addresses (first to avoid conflicts)
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, replacement: '[EMAIL]' },
  
  // Phone numbers (more specific patterns)
  { pattern: /(\+?1[-\s]?)?(\([0-9]{3}\)|[0-9]{3})[-\s]?[0-9]{3}[-\s]?[0-9]{4}\b/g, replacement: '[PHONE]' },
  
  // Credit card numbers
  { pattern: /\b[0-9]{4}[-\s]?[0-9]{4}[-\s]?[0-9]{4}[-\s]?[0-9]{4}\b/g, replacement: '[CARD]' },
  
  // Passport numbers (various formats)
  { pattern: /\b[A-Z]{1,2}[0-9]{6,9}\b/g, replacement: '[PASSPORT]' },
  
  // Dates of birth (various formats)
  { pattern: /\b(0[1-9]|1[0-2])[\/\-](0[1-9]|[12][0-9]|3[01])[\/\-](19|20)\d{2}\b/g, replacement: '[DOB]' },
  { pattern: /\b(19|20)\d{2}[\/\-](0[1-9]|1[0-2])[\/\-](0[1-9]|[12][0-9]|3[01])\b/g, replacement: '[DOB]' },
  
  // Addresses (basic patterns) - more specific
  { pattern: /\b\d+\s+[A-Z][a-z]+\s+(Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Drive|Dr|Boulevard|Blvd)\b/gi, replacement: '[ADDRESS]' },
  
  // Names (common patterns - conservative to avoid false positives, after other patterns)
  // Match first+last name patterns but avoid matching greetings like "Hello John"
  { pattern: /\b[A-Z][a-z]{2,} [A-Z][a-z]{2,}\b/g, replacement: '[NAME]' },
];

// Sensitive field names that should be redacted
const SENSITIVE_FIELDS = new Set([
  'password',
  'token',
  'key',
  'secret',
  'passport',
  'ssn',
  'social',
  'dob',
  'dateofbirth',
  'firstname',
  'lastname',
  'fullname',
  'name',
  'email',
  'phone',
  'address',
  'creditcard',
  'cardnumber',
  'cvv',
  'pin',
]);

export interface SanitizationOptions {
  preserveStructure?: boolean;
  customRules?: SanitizationRule[];
  whitelistedFields?: string[];
}

/**
 * Sanitizes a string by removing or redacting PII
 */
export function sanitizeString(
  input: string,
  options: SanitizationOptions = {}
): string {
  let sanitized = input;
  
  // Apply default PII patterns
  for (const rule of PII_PATTERNS) {
    sanitized = sanitized.replace(rule.pattern, rule.replacement);
  }
  
  // Apply custom rules if provided
  if (options.customRules) {
    for (const rule of options.customRules) {
      sanitized = sanitized.replace(rule.pattern, rule.replacement);
    }
  }
  
  return sanitized;
}

/**
 * Sanitizes an object recursively, redacting sensitive fields and PII
 */
export function sanitizeObject(
  obj: any,
  options: SanitizationOptions = {}
): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj, options);
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options));
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const lowercaseKey = key.toLowerCase();
      
      // Check if field is whitelisted
      if (options.whitelistedFields?.includes(key)) {
        sanitized[key] = value;
        continue;
      }
      
      // Check if field name contains sensitive information (case-insensitive)
      let isSensitiveField = SENSITIVE_FIELDS.has(lowercaseKey);
      if (!isSensitiveField) {
        // Check partial matches more efficiently
        for (const field of SENSITIVE_FIELDS) {
          if (lowercaseKey.includes(field)) {
            isSensitiveField = true;
            break;
          }
        }
      }
      
      if (isSensitiveField) {
        if (options.preserveStructure) {
          sanitized[key] = '[REDACTED]';
        }
        // If preserveStructure is false, omit the field entirely
      } else {
        sanitized[key] = sanitizeObject(value, options);
      }
    }
    
    return sanitized;
  }
  
  return obj;
}

/**
 * Sanitizes error objects for logging
 */
export function sanitizeError(error: Error, options: SanitizationOptions = {}): any {
  const result: any = {
    name: error.name,
    message: sanitizeString(error.message, options),
    stack: error.stack ? sanitizeString(error.stack, options) : undefined,
  };

  // Handle error.cause if it exists (ES2022 feature)
  if ('cause' in error && (error as any).cause) {
    result.cause = sanitizeObject((error as any).cause, options);
  }

  return result;
}

/**
 * Sanitizes URL by removing query parameters that might contain PII
 */
export function sanitizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // Remove query parameters and fragments, then sanitize the path
    return sanitizeString(`${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`);
  } catch {
    // If URL parsing fails, sanitize as string
    return sanitizeString(url);
  }
}

/**
 * Creates a sanitization function with preset options
 */
export function createSanitizer(options: SanitizationOptions) {
  return {
    string: (input: string) => sanitizeString(input, options),
    object: (obj: any) => sanitizeObject(obj, options),
    error: (error: Error) => sanitizeError(error, options),
    url: (url: string) => sanitizeUrl(url),
  };
}

/**
 * Default sanitization function for general PII removal
 */
export function sanitizePII(data: any): any {
  return sanitizeObject(data, { preserveStructure: true });
}