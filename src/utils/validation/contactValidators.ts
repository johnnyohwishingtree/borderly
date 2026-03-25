/**
 * Contact information validators: email, phone.
 */

import { VALIDATION_PATTERNS } from './patterns';

/**
 * Validates email addresses.
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' };
  }

  const cleanEmail = email.trim().toLowerCase();

  if (cleanEmail.length > 254) {
    return { isValid: false, error: 'Email address is too long' };
  }

  if (!VALIDATION_PATTERNS.email.test(cleanEmail)) {
    return { isValid: false, error: 'Invalid email address format' };
  }

  // Additional checks for common invalid patterns
  if (cleanEmail.includes('..')) {
    return { isValid: false, error: 'Email cannot contain consecutive dots' };
  }

  if (cleanEmail.startsWith('.') || cleanEmail.includes('@.')) {
    return { isValid: false, error: 'Invalid email address format' };
  }

  return { isValid: true };
}

/**
 * Validates phone numbers with optional country-specific formatting.
 */
export function validatePhoneNumber(
  phone: string,
  country?: string
): { isValid: boolean; error?: string } {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, error: 'Phone number is required' };
  }

  const cleanPhone = phone.trim().replace(/\s/g, '');

  let pattern = VALIDATION_PATTERNS.phone.general;

  switch (country) {
    case 'USA':
    case 'CAN':
      pattern = VALIDATION_PATTERNS.phone.us;
      break;
    default:
      if (cleanPhone.startsWith('+')) {
        pattern = VALIDATION_PATTERNS.phone.international;
      }
      break;
  }

  if (!pattern.test(cleanPhone)) {
    return { isValid: false, error: 'Invalid phone number format' };
  }

  return { isValid: true };
}
