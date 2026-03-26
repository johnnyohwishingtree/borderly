/**
 * Tests for PII pattern helpers — regex matching, false positive filtering,
 * confidence scoring, value redaction, and string scanning.
 */

import {
  PII_PATTERNS,
  isFalsePositive,
  calculateConfidence,
  redactValue,
  scanStringForLeaks,
} from '../../../src/services/security/dataLeakDetector/piiPatterns';
import type { DataLeak } from '../../../src/services/security/dataLeakDetector/dataLeakDetectorTypes';

// ---------------------------------------------------------------------------
// PII_PATTERNS — each pattern detects its target format
// ---------------------------------------------------------------------------

describe('PII_PATTERNS', () => {
  it('detects passport-like numbers', () => {
    const match = 'AB1234567'.match(PII_PATTERNS.passportNumber.pattern);
    expect(match).not.toBeNull();
  });

  it('detects full names (Title Case)', () => {
    const match = 'My name is Yuki Tanaka and I travel.'.match(PII_PATTERNS.fullName.pattern);
    expect(match).not.toBeNull();
    expect(match![0]).toBe('Yuki Tanaka');
  });

  it('detects dates of birth (YYYY-MM-DD)', () => {
    const match = 'DOB: 1990-03-15 here'.match(PII_PATTERNS.dateOfBirth.pattern);
    expect(match).not.toBeNull();
    expect(match![0]).toBe('1990-03-15');
  });

  it('detects dates of birth (DD/MM/YYYY)', () => {
    const match = 'DOB: 15/03/1990 here'.match(PII_PATTERNS.dateOfBirth.pattern);
    expect(match).not.toBeNull();
  });

  it('detects email addresses', () => {
    const match = 'contact user@example.com for info'.match(PII_PATTERNS.emailAddress.pattern);
    expect(match).not.toBeNull();
    expect(match![0]).toBe('user@example.com');
  });

  it('detects phone numbers', () => {
    const match = 'call (555) 123-4567 now'.match(PII_PATTERNS.phoneNumber.pattern);
    expect(match).not.toBeNull();
  });

  it('detects government IDs', () => {
    const match = 'SSN: 123-45-6789'.match(PII_PATTERNS.governmentId.pattern);
    expect(match).not.toBeNull();
  });

  it('detects physical addresses', () => {
    const match = 'Lives at 123 Main Street area'.match(PII_PATTERNS.address.pattern);
    expect(match).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isFalsePositive
// ---------------------------------------------------------------------------

describe('isFalsePositive', () => {
  it('returns true for known false positive names', () => {
    expect(isFalsePositive('John Doe', 'fullName')).toBe(true);
    expect(isFalsePositive('Jane Smith', 'fullName')).toBe(true);
    expect(isFalsePositive('Test User', 'fullName')).toBe(true);
  });

  it('returns true for framework names', () => {
    expect(isFalsePositive('React Native', 'fullName')).toBe(true);
    expect(isFalsePositive('App Store', 'fullName')).toBe(true);
  });

  it('returns false for real names', () => {
    expect(isFalsePositive('Yuki Tanaka', 'fullName')).toBe(false);
  });

  it('returns true for known test passport numbers', () => {
    expect(isFalsePositive('ABCD1234', 'passportNumber')).toBe(true);
    expect(isFalsePositive('123456789', 'passportNumber')).toBe(true);
  });

  it('returns false for real passport numbers', () => {
    expect(isFalsePositive('AB7654321', 'passportNumber')).toBe(false);
  });

  it('returns true for known test phone numbers', () => {
    expect(isFalsePositive('555-555-5555', 'phoneNumber')).toBe(true);
  });

  it('returns false for unknown pattern names', () => {
    expect(isFalsePositive('anything', 'unknownPattern')).toBe(false);
  });

  it('is case insensitive', () => {
    expect(isFalsePositive('john doe', 'fullName')).toBe(true);
    expect(isFalsePositive('JOHN DOE', 'fullName')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// calculateConfidence
// ---------------------------------------------------------------------------

describe('calculateConfidence', () => {
  it('returns 0.95 for passport numbers matching alpha+digit pattern', () => {
    expect(calculateConfidence('AB1234567', 'passportNumber')).toBe(0.95);
  });

  it('returns 0.85 for all-digit passport numbers', () => {
    expect(calculateConfidence('12345678', 'passportNumber')).toBe(0.85);
  });

  it('returns 0.7 for normal full names', () => {
    expect(calculateConfidence('Yuki Tanaka', 'fullName')).toBe(0.7);
  });

  it('returns 0.3 for names containing "Test"', () => {
    expect(calculateConfidence('Test User', 'fullName')).toBe(0.3);
  });

  it('returns 0.3 for names containing "Demo"', () => {
    expect(calculateConfidence('Demo User', 'fullName')).toBe(0.3);
  });

  it('returns default 0.8 for other pattern types', () => {
    expect(calculateConfidence('user@test.com', 'emailAddress')).toBe(0.8);
    expect(calculateConfidence('1990-01-15', 'dateOfBirth')).toBe(0.8);
  });
});

// ---------------------------------------------------------------------------
// redactValue
// ---------------------------------------------------------------------------

describe('redactValue', () => {
  it('redacts middle characters of a long string', () => {
    expect(redactValue('AB1234567')).toBe('AB*****67');
  });

  it('returns "***" for strings of 4 or fewer characters', () => {
    expect(redactValue('ABC')).toBe('***');
    expect(redactValue('ABCD')).toBe('***');
  });

  it('handles 5-character strings', () => {
    expect(redactValue('ABCDE')).toBe('AB*DE');
  });
});

// ---------------------------------------------------------------------------
// scanStringForLeaks
// ---------------------------------------------------------------------------

describe('scanStringForLeaks', () => {
  it('detects PII in a string and adds leaks to the array', () => {
    const leaks: DataLeak[] = [];
    scanStringForLeaks('Passport: AB7654321', 'mmkv:profile', leaks);

    expect(leaks.length).toBeGreaterThan(0);
    const passportLeak = leaks.find(l => l.type === 'passport');
    expect(passportLeak).toBeDefined();
    expect(passportLeak!.location).toBe('mmkv:profile');
  });

  it('skips false positives', () => {
    const leaks: DataLeak[] = [];
    scanStringForLeaks('Contact John Doe at 555-555-5555', 'test', leaks);

    // John Doe is a false positive, 555-555-5555 is a false positive
    const nameLeak = leaks.find(l => l.description.includes('Full name') && l.detectedValue.includes('Jo'));
    expect(nameLeak).toBeUndefined();
  });

  it('skips matches below confidence threshold', () => {
    const leaks: DataLeak[] = [];
    // "Test User" is a name with confidence 0.3, below 0.7 threshold
    scanStringForLeaks('Hello Test User welcome', 'mmkv:test', leaks);

    const testNameLeak = leaks.find(
      l => l.type === 'pii' && l.description.includes('Full name'),
    );
    expect(testNameLeak).toBeUndefined();
  });

  it('adds remediation advice based on storage location', () => {
    const leaks: DataLeak[] = [];
    scanStringForLeaks('Passport: AB7654321', 'mmkv:config', leaks);

    const passportLeak = leaks.find(l => l.type === 'passport');
    expect(passportLeak).toBeDefined();
    expect(passportLeak!.remediation).toContain('MMKV');
  });

  it('detects multiple PII types in one string', () => {
    const leaks: DataLeak[] = [];
    scanStringForLeaks(
      'Name: Yuki Tanaka, Passport: JP1234567, DOB: 1990-03-15',
      'asyncstorage:cache',
      leaks,
    );

    const types = new Set(leaks.map(l => l.type));
    expect(types.size).toBeGreaterThanOrEqual(2);
  });

  it('does not add leaks for clean strings', () => {
    const leaks: DataLeak[] = [];
    scanStringForLeaks('theme=dark&language=en', 'mmkv:settings', leaks);

    expect(leaks).toHaveLength(0);
  });

  it('redacts detected values in leak entries', () => {
    const leaks: DataLeak[] = [];
    scanStringForLeaks('ID: AB7654321', 'mmkv:data', leaks);

    const passportLeak = leaks.find(l => l.type === 'passport');
    expect(passportLeak).toBeDefined();
    expect(passportLeak!.detectedValue).toContain('*');
    expect(passportLeak!.detectedValue).not.toBe('AB7654321');
  });
});
