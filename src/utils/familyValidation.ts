/**
 * Family Profile Validation Utilities
 * 
 * Provides validation functions for family profile data, relationship management,
 * and multi-traveler trip validation to ensure data integrity and security.
 */

import { TravelerProfile } from '@/types/profile';
import { FamilyProfileCollection, ProfileMetadata, FamilyRelationship } from '@/types/family';

// Constants
const MAX_FAMILY_MEMBERS = 8;
const PASSPORT_EXPIRY_WARNING_MONTHS = 6;
const MIN_CHILD_AGE = 0;
const MAX_ADULT_AGE = 120;

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FamilyTripValidationResult extends ValidationResult {
  eligibleTravelers: string[]; // Profile IDs of travelers eligible for the trip
  ineligibleTravelers: { profileId: string; reason: string }[];
}

/**
 * Validates a family member profile for completeness and correctness
 */
export function validateFamilyMemberProfile(profile: Partial<TravelerProfile>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields validation
  if (!profile.givenNames?.trim()) {
    errors.push('Given names are required');
  }

  if (!profile.surname?.trim()) {
    errors.push('Surname is required');
  }

  if (!profile.passportNumber?.trim()) {
    errors.push('Passport number is required');
  }

  if (!profile.nationality?.trim()) {
    errors.push('Nationality is required');
  }

  if (!profile.dateOfBirth) {
    errors.push('Date of birth is required');
  }

  if (!profile.gender) {
    errors.push('Gender is required');
  }

  if (!profile.passportExpiry) {
    errors.push('Passport expiry date is required');
  }

  // Date validations
  if (profile.dateOfBirth) {
    const birthDate = new Date(profile.dateOfBirth);
    const now = new Date();
    
    if (isNaN(birthDate.getTime())) {
      errors.push('Invalid date of birth');
    } else {
      // Check if birth date is in the future
      if (birthDate > now) {
        errors.push('Date of birth cannot be in the future');
      }

      // Calculate age and validate reasonableness
      const age = now.getFullYear() - birthDate.getFullYear();
      if (age < MIN_CHILD_AGE || age > MAX_ADULT_AGE) {
        warnings.push(`Age of ${age} seems unusual, please verify date of birth`);
      }
    }
  }

  if (profile.passportExpiry) {
    const expiryDate = new Date(profile.passportExpiry);
    const now = new Date();
    
    if (isNaN(expiryDate.getTime())) {
      errors.push('Invalid passport expiry date');
    } else {
      // Check if passport has already expired
      if (expiryDate < now) {
        errors.push('Passport has already expired');
      } else {
        // Check if passport expires within warning period
        const warningDate = new Date();
        warningDate.setMonth(warningDate.getMonth() + PASSPORT_EXPIRY_WARNING_MONTHS);
        
        if (expiryDate < warningDate) {
          warnings.push(`Passport expires within ${PASSPORT_EXPIRY_WARNING_MONTHS} months`);
        }
      }
    }
  }

  // Passport number format validation (basic)
  if (profile.passportNumber) {
    const passportNumber = profile.passportNumber.trim().toUpperCase();
    
    // Basic format check - most passports are 6-9 alphanumeric characters
    if (passportNumber.length < 6 || passportNumber.length > 9) {
      warnings.push('Passport number length seems unusual, please verify');
    }

    // Check for common invalid characters
    if (!/^[A-Z0-9]+$/.test(passportNumber)) {
      warnings.push('Passport number should only contain letters and numbers');
    }
  }

  // Name validation
  if (profile.givenNames && profile.givenNames.length > 50) {
    errors.push('Given names are too long (maximum 50 characters)');
  }

  if (profile.surname && profile.surname.length > 50) {
    errors.push('Surname is too long (maximum 50 characters)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates family member relationships and constraints
 */
export function validateFamilyRelationships(
  familyCollection: FamilyProfileCollection,
  newMemberRelationship?: FamilyRelationship
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const relationshipCounts = new Map<FamilyRelationship, number>();
  
  // Count existing relationships
  for (const profile of familyCollection.profiles.values()) {
    const count = relationshipCounts.get(profile.relationship) || 0;
    relationshipCounts.set(profile.relationship, count + 1);
  }
  
  // Include new member if provided
  if (newMemberRelationship) {
    const count = relationshipCounts.get(newMemberRelationship) || 0;
    relationshipCounts.set(newMemberRelationship, count + 1);
  }

  // Validation rules
  const selfCount = relationshipCounts.get('self') || 0;
  const spouseCount = relationshipCounts.get('spouse') || 0;

  // Must have exactly one primary profile
  if (selfCount !== 1) {
    errors.push('Must have exactly one primary profile (self)');
  }

  // Practical limit on spouses (typically 0-1)
  if (spouseCount > 1) {
    warnings.push('Multiple spouses detected - this is unusual');
  }

  // Check total family member count
  const totalMembers = Array.from(relationshipCounts.values()).reduce((sum, count) => sum + count, 0);
  if (totalMembers > MAX_FAMILY_MEMBERS) {
    errors.push(`Maximum ${MAX_FAMILY_MEMBERS} family members allowed`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates travelers for a family trip
 */
export function validateFamilyTripTravelers(
  travelerIds: string[],
  familyCollection: FamilyProfileCollection,
  passportProfiles: Map<string, TravelerProfile>
): FamilyTripValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const eligibleTravelers: string[] = [];
  const ineligibleTravelers: { profileId: string; reason: string }[] = [];

  if (travelerIds.length === 0) {
    errors.push('At least one traveler must be selected');
    return { isValid: false, errors, warnings, eligibleTravelers, ineligibleTravelers };
  }

  for (const profileId of travelerIds) {
    const metadata = familyCollection.profiles.get(profileId);
    const profile = passportProfiles.get(profileId);

    // Check if profile exists
    if (!metadata || !profile) {
      ineligibleTravelers.push({
        profileId,
        reason: 'Profile not found'
      });
      continue;
    }

    // Check if profile is active
    if (!metadata.isActive) {
      ineligibleTravelers.push({
        profileId,
        reason: 'Profile is inactive'
      });
      continue;
    }

    // Validate passport data
    const profileValidation = validateFamilyMemberProfile(profile);
    if (!profileValidation.isValid) {
      ineligibleTravelers.push({
        profileId,
        reason: `Profile validation failed: ${profileValidation.errors.join(', ')}`
      });
      continue;
    }

    // Check passport expiry for travel
    const expiryDate = new Date(profile.passportExpiry);
    const now = new Date();
    
    if (expiryDate < now) {
      ineligibleTravelers.push({
        profileId,
        reason: 'Passport has expired'
      });
      continue;
    }

    // Warn about passports expiring soon
    const warningDate = new Date();
    warningDate.setMonth(warningDate.getMonth() + PASSPORT_EXPIRY_WARNING_MONTHS);
    
    if (expiryDate < warningDate) {
      warnings.push(`${profile.givenNames} ${profile.surname}'s passport expires within ${PASSPORT_EXPIRY_WARNING_MONTHS} months`);
    }

    // If we get here, the traveler is eligible
    eligibleTravelers.push(profileId);
  }

  // Additional validations
  if (eligibleTravelers.length === 0 && travelerIds.length > 0) {
    errors.push('No eligible travelers selected for this trip');
  }

  // Check for primary traveler inclusion in family trips
  const primaryProfileId = familyCollection.primaryProfileId;
  if (travelerIds.length > 1 && !travelerIds.includes(primaryProfileId)) {
    warnings.push('Consider including the primary profile holder in family trips for easier management');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    eligibleTravelers,
    ineligibleTravelers
  };
}

/**
 * Checks if a passport is expiring soon
 */
export function isPassportExpiringSoon(expiryDate: string, warningMonths: number = PASSPORT_EXPIRY_WARNING_MONTHS): boolean {
  const expiry = new Date(expiryDate);
  const warningDate = new Date();
  warningDate.setMonth(warningDate.getMonth() + warningMonths);
  
  return expiry <= warningDate;
}

/**
 * Gets the status of a passport (valid, expiring, expired)
 */
export function getPassportStatus(expiryDate: string): 'valid' | 'expiring' | 'expired' {
  const expiry = new Date(expiryDate);
  const now = new Date();
  
  if (expiry < now) {
    return 'expired';
  }
  
  if (isPassportExpiringSoon(expiryDate)) {
    return 'expiring';
  }
  
  return 'valid';
}

/**
 * Validates family member data before storage
 */
export function validateForStorage(
  profile: TravelerProfile,
  relationship: FamilyRelationship,
  existingCollection: FamilyProfileCollection
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic profile validation
  const profileValidation = validateFamilyMemberProfile(profile);
  errors.push(...profileValidation.errors);
  warnings.push(...profileValidation.warnings);

  // Relationship validation
  const relationshipValidation = validateFamilyRelationships(existingCollection, relationship);
  errors.push(...relationshipValidation.errors);
  warnings.push(...relationshipValidation.warnings);

  // Check for duplicate passport numbers within family
  // This would require checking against actual stored profiles
  // For now, we'll skip this validation as it requires async profile fetching

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Sanitizes family member input data
 */
export function sanitizeFamilyMemberInput(profile: Partial<TravelerProfile>): Partial<TravelerProfile> {
  const sanitized: Partial<TravelerProfile> = { ...profile };
  
  if (sanitized.givenNames) {
    sanitized.givenNames = sanitized.givenNames.trim();
  }
  if (sanitized.surname) {
    sanitized.surname = sanitized.surname.trim();
  }
  if (sanitized.passportNumber) {
    sanitized.passportNumber = sanitized.passportNumber.trim().toUpperCase();
  }
  if (sanitized.nationality) {
    sanitized.nationality = sanitized.nationality.trim().toUpperCase();
  }
  
  return sanitized;
}

/**
 * Creates display name for family member
 */
export function createFamilyMemberDisplayName(
  profile: TravelerProfile,
  metadata: ProfileMetadata
): string {
  if (metadata.nickname) {
    return metadata.nickname;
  }
  
  if (metadata.relationship === 'self') {
    return `${profile.givenNames} ${profile.surname}`;
  }
  
  // For family members, use first name + relationship if no nickname
  const firstName = profile.givenNames.split(' ')[0];
  return `${firstName} (${getRelationshipDisplayName(metadata.relationship)})`;
}

/**
 * Gets human-readable relationship name
 */
export function getRelationshipDisplayName(relationship: FamilyRelationship): string {
  switch (relationship) {
    case 'self':
      return 'Primary Traveler';
    case 'spouse':
      return 'Spouse';
    case 'child':
      return 'Child';
    case 'parent':
      return 'Parent';
    case 'other':
      return 'Other Family';
    default:
      return 'Family Member';
  }
}

/**
 * Calculates age from date of birth
 */
export function calculateAge(dateOfBirth: string): number {
  const birth = new Date(dateOfBirth);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Determines if a family member is a minor (under 18)
 */
export function isMinor(dateOfBirth: string): boolean {
  return calculateAge(dateOfBirth) < 18;
}

/**
 * Gets family statistics for display
 */
export function getFamilyStatistics(familyCollection: FamilyProfileCollection) {
  const profiles = Array.from(familyCollection.profiles.values());
  const active = profiles.filter(p => p.isActive);
  
  const relationshipCounts: Record<string, number> = {};
  profiles.forEach(profile => {
    const relationship = profile.relationship;
    relationshipCounts[relationship] = (relationshipCounts[relationship] || 0) + 1;
  });

  return {
    total: profiles.length,
    active: active.length,
    maxAllowed: familyCollection.maxProfiles,
    canAddMore: profiles.length < familyCollection.maxProfiles,
    relationshipBreakdown: relationshipCounts,
    lastModified: familyCollection.lastModified
  };
}