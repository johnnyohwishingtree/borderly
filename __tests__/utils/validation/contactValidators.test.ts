import {
  validateEmail,
  validatePhoneNumber,
} from '../../../src/utils/validation/contactValidators';

// ---------------------------------------------------------------------------
// validateEmail
// ---------------------------------------------------------------------------
describe('validateEmail', () => {
  it('accepts valid simple email', () => {
    const result = validateEmail('user@example.com');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('accepts email with dots in local part', () => {
    const result = validateEmail('first.last@example.com');
    expect(result.isValid).toBe(true);
  });

  it('accepts email with plus tag', () => {
    const result = validateEmail('user+tag@example.com');
    expect(result.isValid).toBe(true);
  });

  it('accepts email with subdomain', () => {
    const result = validateEmail('user@mail.example.co.uk');
    expect(result.isValid).toBe(true);
  });

  it('rejects empty input', () => {
    const result = validateEmail('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Email is required');
  });

  it('rejects missing @ symbol', () => {
    const result = validateEmail('userexample.com');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid email address format');
  });

  it('rejects missing domain', () => {
    const result = validateEmail('user@');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid email address format');
  });

  it('rejects missing local part', () => {
    const result = validateEmail('@example.com');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid email address format');
  });

  it('rejects consecutive dots', () => {
    const result = validateEmail('user..name@example.com');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Email cannot contain consecutive dots');
  });

  it('rejects email starting with dot', () => {
    const result = validateEmail('.user@example.com');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid email address format');
  });

  it('rejects email over 254 characters', () => {
    const longLocal = 'a'.repeat(245);
    const result = validateEmail(`${longLocal}@example.com`);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Email address is too long');
  });

  it('trims input', () => {
    const result = validateEmail('  user@example.com  ');
    expect(result.isValid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validatePhoneNumber
// ---------------------------------------------------------------------------
describe('validatePhoneNumber', () => {
  // International format
  it('accepts valid international number', () => {
    const result = validatePhoneNumber('+81901234567');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('accepts valid international with country code', () => {
    const result = validatePhoneNumber('+44207123456');
    expect(result.isValid).toBe(true);
  });

  // USA/CAN format
  it('accepts US number with +1', () => {
    const result = validatePhoneNumber('+12025551234', 'USA');
    expect(result.isValid).toBe(true);
  });

  it('accepts US number with parentheses', () => {
    const result = validatePhoneNumber('(202)555-1234', 'USA');
    expect(result.isValid).toBe(true);
  });

  it('accepts US number plain digits', () => {
    const result = validatePhoneNumber('2025551234', 'USA');
    expect(result.isValid).toBe(true);
  });

  it('accepts Canadian number', () => {
    const result = validatePhoneNumber('+16135551234', 'CAN');
    expect(result.isValid).toBe(true);
  });

  // General format
  it('accepts general format without +', () => {
    const result = validatePhoneNumber('0901234567');
    expect(result.isValid).toBe(true);
  });

  it('accepts general format with dashes', () => {
    const result = validatePhoneNumber('090-1234-567');
    expect(result.isValid).toBe(true);
  });

  // Invalid
  it('rejects empty input', () => {
    const result = validatePhoneNumber('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Phone number is required');
  });

  it('rejects too short number', () => {
    const result = validatePhoneNumber('12345');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid phone number format');
  });

  it('rejects letters in phone number', () => {
    const result = validatePhoneNumber('abcdefghij');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Invalid phone number format');
  });

  it('rejects international with leading zero after +', () => {
    const result = validatePhoneNumber('+0123456789');
    expect(result.isValid).toBe(false);
  });

  it('trims spaces from input', () => {
    const result = validatePhoneNumber('  +81901234567  ');
    expect(result.isValid).toBe(true);
  });
});
