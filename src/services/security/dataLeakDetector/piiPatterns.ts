/**
 * PII detection patterns, false positive filtering, and confidence scoring.
 */

import type { DataLeak, PIIPattern } from './dataLeakDetectorTypes';

export const PII_PATTERNS: Record<string, PIIPattern> = {
  passportNumber: {
    pattern: /\b[A-Z0-9]{6,9}\b/g,
    type: 'passport',
    severity: 'critical',
    description: 'Passport number detected',
  },
  fullName: {
    pattern: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
    type: 'pii',
    severity: 'high',
    description: 'Full name detected',
  },
  dateOfBirth: {
    pattern: /\b(?:\d{4}[-/]\d{2}[-/]\d{2}|\d{2}[-/]\d{2}[-/]\d{4})\b/g,
    type: 'pii',
    severity: 'medium',
    description: 'Date of birth detected',
  },
  emailAddress: {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    type: 'pii',
    severity: 'medium',
    description: 'Email address detected',
  },
  phoneNumber: {
    pattern: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
    type: 'pii',
    severity: 'medium',
    description: 'Phone number detected',
  },
  creditCard: {
    pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3[0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
    type: 'financial',
    severity: 'critical',
    description: 'Credit card number detected',
  },
  governmentId: {
    pattern: /\b(?:SSN|Social Security Number|Tax ID|National ID)[\s:]*[0-9-]+\b/gi,
    type: 'government_id',
    severity: 'critical',
    description: 'Government ID number detected',
  },
  address: {
    pattern: /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)\b/g,
    type: 'pii',
    severity: 'medium',
    description: 'Physical address detected',
  },
  coordinates: {
    pattern: /\b[-]?(?:180|1[0-7]\d|\d{1,2})\.?\d*[,\s]+[-]?(?:90|[1-8]\d|\d)\.?\d*\b/g,
    type: 'location',
    severity: 'high',
    description: 'GPS coordinates detected',
  },
};

export function isFalsePositive(match: string, patternName: string): boolean {
  const falsePositives: Record<string, string[]> = {
    fullName: [
      'John Doe', 'Jane Smith', 'Test User', 'Demo User',
      'React Native', 'App Store', 'Google Play',
    ],
    passportNumber: ['ABCD1234', '123456789', '000000000'],
    dateOfBirth: ['1900-01-01', '2000-01-01', '1970-01-01'],
    phoneNumber: ['555-555-5555', '123-456-7890', '000-000-0000'],
  };

  const patterns = falsePositives[patternName] || [];
  return patterns.some((fp: string) => match.toLowerCase().includes(fp.toLowerCase()));
}

export function calculateConfidence(match: string, patternName: string): number {
  let confidence = 0.8;

  if (patternName === 'passportNumber') {
    if (/^[A-Z]{1,2}[0-9]{6,8}$/.test(match)) confidence = 0.95;
    if (/^[0-9]{8,9}$/.test(match)) confidence = 0.85;
  } else if (patternName === 'fullName') {
    confidence = 0.7;
    if (match.includes('Test') || match.includes('Demo')) confidence = 0.3;
  } else if (patternName === 'creditCard') {
    confidence = passesLuhnCheck(match) ? 0.95 : 0.6;
  }

  return confidence;
}

function passesLuhnCheck(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '');
  let sum = 0;
  let alternate = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits.charAt(i));
    if (alternate) {
      n *= 2;
      if (n > 9) n = (n % 10) + 1;
    }
    sum += n;
    alternate = !alternate;
  }

  return sum % 10 === 0;
}

export function redactValue(value: string): string {
  if (value.length <= 4) return '***';
  return value.substring(0, 2) + '*'.repeat(value.length - 4) + value.substring(value.length - 2);
}

export function scanStringForLeaks(
  content: string,
  location: string,
  leaks: DataLeak[],
): void {
  for (const [patternName, pattern] of Object.entries(PII_PATTERNS)) {
    const matches = content.match(pattern.pattern);

    if (matches) {
      for (const match of matches) {
        if (isFalsePositive(match, patternName)) continue;

        const confidence = calculateConfidence(match, patternName);

        if (confidence >= 0.7) {
          leaks.push({
            id: `${location}:${patternName}:${Date.now()}:${Math.random()}`,
            type: pattern.type,
            severity: pattern.severity,
            location,
            description: `${pattern.description} found in ${location}`,
            detectedValue: redactValue(match),
            fullMatch: true,
            confidence,
            remediation: getRemediationForPattern(patternName, location),
          });
        }
      }
    }
  }
}

function getRemediationForPattern(patternName: string, location: string): string {
  const remediations: Record<string, string> = {
    passportNumber: 'Move to keychain with biometric protection',
    fullName: 'Store in keychain or remove if unnecessary',
    dateOfBirth: 'Store in keychain or anonymize',
    emailAddress: 'Remove if not needed for functionality',
    phoneNumber: 'Remove if not needed for functionality',
    creditCard: 'Never store credit card numbers in app',
    governmentId: 'Move to keychain with maximum security',
    address: 'Store in encrypted database or remove',
    coordinates: 'Anonymize or store with reduced precision',
  };

  const base = remediations[patternName] || 'Review and secure sensitive data';

  if (location.startsWith('mmkv:')) {
    return `${base}. MMKV should only store non-sensitive configuration data.`;
  } else if (location.startsWith('asyncstorage:')) {
    return `${base}. AsyncStorage is not encrypted and should never contain PII.`;
  } else if (location.startsWith('database:')) {
    return `${base}. Ensure database encryption is properly configured.`;
  }

  return base;
}
