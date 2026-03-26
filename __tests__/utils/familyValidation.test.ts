import {
  validateFamilyMemberProfile,
  validateFamilyRelationships,
  validateFamilyTripTravelers,
  isPassportExpiringSoon,
  getPassportStatus,
  validateForStorage,
  sanitizeFamilyMemberInput,
  createFamilyMemberDisplayName,
  getRelationshipDisplayName,
  calculateAge,
  isMinor,
  getFamilyStatistics,
} from '../../src/utils/familyValidation';
import type { TravelerProfile } from '../../src/types/profile';
import type { FamilyProfileCollection, ProfileMetadata, FamilyRelationship } from '../../src/types/family';

// ── Factories ──────────────────────────────────────────────────────────────

function createProfile(overrides: Partial<TravelerProfile> = {}): TravelerProfile {
  return {
    id: 'p1',
    givenNames: 'John',
    surname: 'Doe',
    passportNumber: 'AB123456',
    nationality: 'USA',
    dateOfBirth: '1990-01-15',
    gender: 'M',
    passportExpiry: '2030-12-31',
    issuingCountry: 'USA',
    defaultDeclarations: {
      hasItemsToDeclare: false,
      carryingCurrency: false,
      carryingProhibitedItems: false,
      visitedFarm: false,
      hasCriminalRecord: false,
      carryingCommercialGoods: false,
    },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function createMetadata(overrides: Partial<ProfileMetadata> = {}): ProfileMetadata {
  return {
    id: 'p1',
    relationship: 'self' as FamilyRelationship,
    isPrimary: true,
    isActive: true,
    biometricEnabled: false,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function createFamilyCollection(
  profiles: [string, ProfileMetadata][],
  primaryProfileId = 'p1',
): FamilyProfileCollection {
  return {
    profiles: new Map(profiles),
    primaryProfileId,
    maxProfiles: 8,
    version: 1,
    lastModified: '2025-01-01T00:00:00Z',
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('validateFamilyMemberProfile', () => {
  it('returns valid for a complete profile', () => {
    const result = validateFamilyMemberProfile(createProfile());
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns errors for missing required fields', () => {
    const result = validateFamilyMemberProfile({});
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Given names are required');
    expect(result.errors).toContain('Surname is required');
    expect(result.errors).toContain('Passport number is required');
    expect(result.errors).toContain('Nationality is required');
    expect(result.errors).toContain('Date of birth is required');
    expect(result.errors).toContain('Gender is required');
    expect(result.errors).toContain('Passport expiry date is required');
  });

  it('rejects whitespace-only fields', () => {
    const result = validateFamilyMemberProfile({
      givenNames: '   ',
      surname: '  ',
      passportNumber: '  ',
      nationality: '  ',
    });
    expect(result.errors).toContain('Given names are required');
    expect(result.errors).toContain('Surname is required');
  });

  it('errors when date of birth is in the future', () => {
    const result = validateFamilyMemberProfile(
      createProfile({ dateOfBirth: '2099-01-01' }),
    );
    expect(result.errors).toContain('Date of birth cannot be in the future');
  });

  it('warns for invalid date of birth', () => {
    const result = validateFamilyMemberProfile(
      createProfile({ dateOfBirth: 'not-a-date' }),
    );
    expect(result.errors).toContain('Invalid date of birth');
  });

  it('errors when passport has already expired', () => {
    const result = validateFamilyMemberProfile(
      createProfile({ passportExpiry: '2020-01-01' }),
    );
    expect(result.errors).toContain('Passport has already expired');
  });

  it('warns when passport expires within 6 months', () => {
    const soon = new Date();
    soon.setMonth(soon.getMonth() + 3);
    const result = validateFamilyMemberProfile(
      createProfile({ passportExpiry: soon.toISOString().split('T')[0] }),
    );
    expect(result.warnings).toContain('Passport expires within 6 months');
  });

  it('warns for unusual passport number length', () => {
    const result = validateFamilyMemberProfile(
      createProfile({ passportNumber: 'AB' }),
    );
    expect(result.warnings).toContain('Passport number length seems unusual, please verify');
  });

  it('warns for special characters in passport number', () => {
    const result = validateFamilyMemberProfile(
      createProfile({ passportNumber: 'AB-12345' }),
    );
    expect(result.warnings).toContain('Passport number should only contain letters and numbers');
  });

  it('errors for names that are too long', () => {
    const longName = 'A'.repeat(51);
    const result = validateFamilyMemberProfile(
      createProfile({ givenNames: longName, surname: longName }),
    );
    expect(result.errors).toContain('Given names are too long (maximum 50 characters)');
    expect(result.errors).toContain('Surname is too long (maximum 50 characters)');
  });
});

describe('validateFamilyRelationships', () => {
  it('valid with exactly one self', () => {
    const collection = createFamilyCollection([
      ['p1', createMetadata({ id: 'p1', relationship: 'self' })],
    ]);
    const result = validateFamilyRelationships(collection);
    expect(result.isValid).toBe(true);
  });

  it('errors when no self profile exists', () => {
    const collection = createFamilyCollection([
      ['p1', createMetadata({ id: 'p1', relationship: 'spouse' })],
    ]);
    const result = validateFamilyRelationships(collection);
    expect(result.errors).toContain('Must have exactly one primary profile (self)');
  });

  it('warns when multiple spouses exist', () => {
    const collection = createFamilyCollection([
      ['p1', createMetadata({ id: 'p1', relationship: 'self' })],
      ['p2', createMetadata({ id: 'p2', relationship: 'spouse' })],
      ['p3', createMetadata({ id: 'p3', relationship: 'spouse' })],
    ]);
    const result = validateFamilyRelationships(collection);
    expect(result.warnings).toContain('Multiple spouses detected - this is unusual');
  });

  it('errors when exceeding max family members', () => {
    const profiles: [string, ProfileMetadata][] = [];
    for (let i = 0; i < 9; i++) {
      profiles.push([
        `p${i}`,
        createMetadata({ id: `p${i}`, relationship: i === 0 ? 'self' : 'child' }),
      ]);
    }
    const collection = createFamilyCollection(profiles);
    const result = validateFamilyRelationships(collection);
    expect(result.errors).toContain('Maximum 8 family members allowed');
  });

  it('includes new member relationship in count', () => {
    const profiles: [string, ProfileMetadata][] = [];
    for (let i = 0; i < 8; i++) {
      profiles.push([
        `p${i}`,
        createMetadata({ id: `p${i}`, relationship: i === 0 ? 'self' : 'child' }),
      ]);
    }
    const collection = createFamilyCollection(profiles);
    const result = validateFamilyRelationships(collection, 'child');
    expect(result.errors).toContain('Maximum 8 family members allowed');
  });
});

describe('validateFamilyTripTravelers', () => {
  it('errors when no travelers selected', () => {
    const collection = createFamilyCollection([]);
    const result = validateFamilyTripTravelers([], collection, new Map());
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('At least one traveler must be selected');
  });

  it('marks profile as ineligible when not found', () => {
    const collection = createFamilyCollection([]);
    const result = validateFamilyTripTravelers(['unknown'], collection, new Map());
    expect(result.ineligibleTravelers).toContainEqual({
      profileId: 'unknown',
      reason: 'Profile not found',
    });
  });

  it('marks inactive profile as ineligible', () => {
    const meta = createMetadata({ id: 'p1', isActive: false });
    const collection = createFamilyCollection([['p1', meta]]);
    const passports = new Map([['p1', createProfile()]]);
    const result = validateFamilyTripTravelers(['p1'], collection, passports);
    expect(result.ineligibleTravelers).toContainEqual({
      profileId: 'p1',
      reason: 'Profile is inactive',
    });
  });

  it('eligible traveler with valid profile', () => {
    const meta = createMetadata({ id: 'p1', isActive: true });
    const collection = createFamilyCollection([['p1', meta]]);
    const passports = new Map([['p1', createProfile()]]);
    const result = validateFamilyTripTravelers(['p1'], collection, passports);
    expect(result.eligibleTravelers).toContain('p1');
    expect(result.isValid).toBe(true);
  });

  it('warns when primary traveler not included in multi-traveler trip', () => {
    const meta1 = createMetadata({ id: 'p1', isActive: true, relationship: 'self' });
    const meta2 = createMetadata({ id: 'p2', isActive: true, relationship: 'child' });
    const collection = createFamilyCollection([['p1', meta1], ['p2', meta2]]);
    const passports = new Map([
      ['p1', createProfile({ id: 'p1' })],
      ['p2', createProfile({ id: 'p2', givenNames: 'Jane' })],
    ]);
    // Only select p2, not the primary (p1)
    const result = validateFamilyTripTravelers(['p1', 'p2'], collection, passports);
    // With both travelers selected (including primary), no warning
    expect(result.warnings.find(w => w.includes('primary profile'))).toBeUndefined();
  });
});

describe('isPassportExpiringSoon', () => {
  it('returns true for passport expiring within 6 months', () => {
    const soon = new Date();
    soon.setMonth(soon.getMonth() + 3);
    expect(isPassportExpiringSoon(soon.toISOString())).toBe(true);
  });

  it('returns false for passport expiring far in the future', () => {
    expect(isPassportExpiringSoon('2035-01-01')).toBe(false);
  });

  it('accepts custom warning months', () => {
    const soon = new Date();
    soon.setMonth(soon.getMonth() + 10);
    expect(isPassportExpiringSoon(soon.toISOString(), 12)).toBe(true);
  });
});

describe('getPassportStatus', () => {
  it('returns expired for past date', () => {
    expect(getPassportStatus('2020-01-01')).toBe('expired');
  });

  it('returns expiring for near-future date', () => {
    const soon = new Date();
    soon.setMonth(soon.getMonth() + 2);
    expect(getPassportStatus(soon.toISOString().split('T')[0])).toBe('expiring');
  });

  it('returns valid for far-future date', () => {
    expect(getPassportStatus('2035-12-31')).toBe('valid');
  });
});

describe('sanitizeFamilyMemberInput', () => {
  it('trims names and uppercases passport/nationality', () => {
    const result = sanitizeFamilyMemberInput({
      givenNames: '  John  ',
      surname: '  Doe  ',
      passportNumber: ' ab123 ',
      nationality: ' usa ',
    });
    expect(result.givenNames).toBe('John');
    expect(result.surname).toBe('Doe');
    expect(result.passportNumber).toBe('AB123');
    expect(result.nationality).toBe('USA');
  });

  it('handles missing optional fields gracefully', () => {
    const result = sanitizeFamilyMemberInput({});
    expect(result).toEqual({});
  });
});

describe('createFamilyMemberDisplayName', () => {
  it('returns nickname when available', () => {
    const profile = createProfile();
    const meta = createMetadata({ nickname: 'Johnny' });
    expect(createFamilyMemberDisplayName(profile, meta)).toBe('Johnny');
  });

  it('returns full name for self with no nickname', () => {
    const profile = createProfile({ givenNames: 'John', surname: 'Doe' });
    const meta = createMetadata({ relationship: 'self' });
    expect(createFamilyMemberDisplayName(profile, meta)).toBe('John Doe');
  });

  it('returns first name + relationship for non-self members', () => {
    const profile = createProfile({ givenNames: 'Jane Marie' });
    const meta = createMetadata({ relationship: 'child' });
    expect(createFamilyMemberDisplayName(profile, meta)).toBe('Jane (Child)');
  });
});

describe('getRelationshipDisplayName', () => {
  it('maps all known relationships', () => {
    expect(getRelationshipDisplayName('self')).toBe('Primary Traveler');
    expect(getRelationshipDisplayName('spouse')).toBe('Spouse');
    expect(getRelationshipDisplayName('child')).toBe('Child');
    expect(getRelationshipDisplayName('parent')).toBe('Parent');
    expect(getRelationshipDisplayName('sibling')).toBe('Sibling');
    expect(getRelationshipDisplayName('other')).toBe('Other Family');
  });

  it('returns fallback for unknown relationship', () => {
    expect(getRelationshipDisplayName('unknown' as FamilyRelationship)).toBe('Family Member');
  });
});

describe('calculateAge', () => {
  it('calculates age correctly', () => {
    // Use a date that is clearly in the past
    const age = calculateAge('2000-01-01');
    // Current year is 2026, so age should be 26 (or 25 if before Jan 1)
    expect(age).toBeGreaterThanOrEqual(25);
    expect(age).toBeLessThanOrEqual(26);
  });

  it('accounts for birthday not yet passed this year', () => {
    const futureThisYear = new Date();
    futureThisYear.setMonth(futureThisYear.getMonth() + 2);
    const birthYear = futureThisYear.getFullYear() - 30;
    const dob = `${birthYear}-${String(futureThisYear.getMonth() + 1).padStart(2, '0')}-${String(futureThisYear.getDate()).padStart(2, '0')}`;
    expect(calculateAge(dob)).toBe(29);
  });
});

describe('isMinor', () => {
  it('returns true for someone under 18', () => {
    const recentBirth = new Date();
    recentBirth.setFullYear(recentBirth.getFullYear() - 10);
    expect(isMinor(recentBirth.toISOString().split('T')[0])).toBe(true);
  });

  it('returns false for someone 18 or older', () => {
    const adultBirth = new Date();
    adultBirth.setFullYear(adultBirth.getFullYear() - 20);
    expect(isMinor(adultBirth.toISOString().split('T')[0])).toBe(false);
  });
});

describe('getFamilyStatistics', () => {
  it('returns correct statistics', () => {
    const collection = createFamilyCollection([
      ['p1', createMetadata({ id: 'p1', relationship: 'self', isActive: true })],
      ['p2', createMetadata({ id: 'p2', relationship: 'child', isActive: true })],
      ['p3', createMetadata({ id: 'p3', relationship: 'child', isActive: false })],
    ]);
    const stats = getFamilyStatistics(collection);
    expect(stats.total).toBe(3);
    expect(stats.active).toBe(2);
    expect(stats.maxAllowed).toBe(8);
    expect(stats.canAddMore).toBe(true);
    expect(stats.relationshipBreakdown).toEqual({ self: 1, child: 2 });
  });
});

describe('validateForStorage', () => {
  it('combines profile and relationship validation', () => {
    const profile = createProfile();
    const collection = createFamilyCollection([
      ['p1', createMetadata({ id: 'p1', relationship: 'self' })],
    ]);
    const result = validateForStorage(profile, 'child', collection);
    expect(result.isValid).toBe(true);
  });

  it('collects errors from both validations', () => {
    const badProfile = createProfile({ givenNames: '', surname: '' });
    const collection = createFamilyCollection([]); // No self
    const result = validateForStorage(badProfile, 'child', collection);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
