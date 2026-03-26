/**
 * Tests for profileStoreHelpers: constants, createEmptyFamilyCollection,
 * serializeFamilyCollection, deserializeFamilyCollection, createProfileMetadata,
 * buildFamilyMembers, computeFamilyStats
 */

import {
  FAMILY_PROFILES_KEY,
  CURRENT_PROFILE_ID_KEY,
  MAX_PROFILES,
  FAMILY_PROFILES_VERSION,
  createEmptyFamilyCollection,
  serializeFamilyCollection,
  deserializeFamilyCollection,
  createProfileMetadata,
  buildFamilyMembers,
  computeFamilyStats,
} from '../../src/stores/profileStoreHelpers';
import type { FamilyProfileCollection, ProfileMetadata } from '../../src/types/family';
import type { TravelerProfile } from '../../src/types/profile';

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function createMetadata(overrides: Partial<ProfileMetadata> = {}): ProfileMetadata {
  return {
    id: 'p1',
    relationship: 'self',
    isPrimary: false,
    isActive: true,
    biometricEnabled: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createProfile(overrides: Partial<TravelerProfile> = {}): TravelerProfile {
  return {
    id: 'p1',
    passportNumber: 'AB123456',
    surname: 'Doe',
    givenNames: 'John',
    nationality: 'USA',
    dateOfBirth: '1990-01-01',
    gender: 'M',
    passportExpiry: '2030-01-01',
    issuingCountry: 'USA',
    defaultDeclarations: {
      hasItemsToDeclare: false,
      carryingCurrency: false,
      carryingProhibitedItems: false,
      visitedFarm: false,
      hasCriminalRecord: false,
      carryingCommercialGoods: false,
    },
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function createCollection(
  entries: [string, ProfileMetadata][],
  primaryId = '',
): FamilyProfileCollection {
  return {
    profiles: new Map(entries),
    primaryProfileId: primaryId,
    maxProfiles: MAX_PROFILES,
    version: FAMILY_PROFILES_VERSION,
    lastModified: '2025-06-01T00:00:00.000Z',
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('constants', () => {
  it('exports expected constant values', () => {
    expect(FAMILY_PROFILES_KEY).toBe('family_profiles');
    expect(CURRENT_PROFILE_ID_KEY).toBe('current_profile_id');
    expect(MAX_PROFILES).toBe(8);
    expect(FAMILY_PROFILES_VERSION).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// createEmptyFamilyCollection
// ---------------------------------------------------------------------------

describe('createEmptyFamilyCollection', () => {
  it('returns a collection with empty profiles map', () => {
    const result = createEmptyFamilyCollection();
    expect(result.profiles).toBeInstanceOf(Map);
    expect(result.profiles.size).toBe(0);
  });

  it('has correct defaults', () => {
    const result = createEmptyFamilyCollection();
    expect(result.primaryProfileId).toBe('');
    expect(result.maxProfiles).toBe(MAX_PROFILES);
    expect(result.version).toBe(FAMILY_PROFILES_VERSION);
    expect(result.lastModified).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// serializeFamilyCollection / deserializeFamilyCollection
// ---------------------------------------------------------------------------

describe('serializeFamilyCollection', () => {
  it('converts Map to plain object', () => {
    const meta = createMetadata({ id: 'p1' });
    const collection = createCollection([['p1', meta]], 'p1');

    const serialized = serializeFamilyCollection(collection);
    expect(serialized.profiles).toEqual({ p1: meta });
    expect(serialized.primaryProfileId).toBe('p1');
  });
});

describe('deserializeFamilyCollection', () => {
  it('converts plain object back to Map', () => {
    const meta = createMetadata({ id: 'p1' });
    const serialized = {
      profiles: { p1: meta },
      primaryProfileId: 'p1',
      maxProfiles: MAX_PROFILES,
      version: FAMILY_PROFILES_VERSION,
      lastModified: '2025-06-01T00:00:00.000Z',
    };

    const result = deserializeFamilyCollection(serialized);
    expect(result.profiles).toBeInstanceOf(Map);
    expect(result.profiles.get('p1')).toEqual(meta);
  });

  it('round-trips correctly', () => {
    const meta = createMetadata({ id: 'x' });
    const original = createCollection([['x', meta]], 'x');

    const roundTripped = deserializeFamilyCollection(serializeFamilyCollection(original));
    expect(roundTripped.profiles.size).toBe(1);
    expect(roundTripped.profiles.get('x')).toEqual(meta);
    expect(roundTripped.primaryProfileId).toBe('x');
  });
});

// ---------------------------------------------------------------------------
// createProfileMetadata
// ---------------------------------------------------------------------------

describe('createProfileMetadata', () => {
  it('creates metadata with id and timestamps', () => {
    const result = createProfileMetadata('abc', {
      relationship: 'child',
      isPrimary: false,
      isActive: true,
      biometricEnabled: false,
    });

    expect(result.id).toBe('abc');
    expect(result.relationship).toBe('child');
    expect(result.isPrimary).toBe(false);
    expect(result.isActive).toBe(true);
    expect(result.biometricEnabled).toBe(false);
    expect(result.createdAt).toBeDefined();
    expect(result.updatedAt).toBeDefined();
  });

  it('preserves optional nickname', () => {
    const result = createProfileMetadata('abc', {
      relationship: 'spouse',
      isPrimary: false,
      isActive: true,
      biometricEnabled: true,
      nickname: 'Partner',
    });

    expect(result.nickname).toBe('Partner');
  });
});

// ---------------------------------------------------------------------------
// buildFamilyMembers
// ---------------------------------------------------------------------------

describe('buildFamilyMembers', () => {
  it('builds members from profiles and metadata', () => {
    const meta = createMetadata({ id: 'p1', relationship: 'self' });
    const collection = createCollection([['p1', meta]], 'p1');
    const profileMap = new Map([['p1', createProfile({ id: 'p1' })]]);

    const members = buildFamilyMembers(collection, profileMap);
    expect(members).toHaveLength(1);
    expect(members[0].id).toBe('p1');
    expect(members[0].relationship).toBe('self');
  });

  it('skips profiles not found in profileMap', () => {
    const meta = createMetadata({ id: 'missing' });
    const collection = createCollection([['missing', meta]], '');
    const profileMap = new Map<string, TravelerProfile>();

    const members = buildFamilyMembers(collection, profileMap);
    expect(members).toHaveLength(0);
  });

  it('sorts primary profile first', () => {
    const meta1 = createMetadata({ id: 'p1', relationship: 'child' });
    const meta2 = createMetadata({ id: 'p2', relationship: 'self' });
    const collection = createCollection([['p1', meta1], ['p2', meta2]], 'p2');
    const profileMap = new Map([
      ['p1', createProfile({ id: 'p1', givenNames: 'Child' })],
      ['p2', createProfile({ id: 'p2', givenNames: 'Parent' })],
    ]);

    const members = buildFamilyMembers(collection, profileMap);
    expect(members[0].id).toBe('p2');
    expect(members[1].id).toBe('p1');
  });

  it('returns empty array for empty collection', () => {
    const collection = createCollection([], '');
    const members = buildFamilyMembers(collection, new Map());
    expect(members).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// computeFamilyStats
// ---------------------------------------------------------------------------

describe('computeFamilyStats', () => {
  it('returns null for empty collection', () => {
    const collection = createCollection([], '');
    expect(computeFamilyStats(collection)).toBeNull();
  });

  it('returns null when no primary profile exists', () => {
    const meta = createMetadata({ id: 'p1', isPrimary: false, isActive: true });
    const collection = createCollection([['p1', meta]], 'p1');

    expect(computeFamilyStats(collection)).toBeNull();
  });

  it('computes correct stats for a single primary profile', () => {
    const meta = createMetadata({ id: 'p1', isPrimary: true, isActive: true, relationship: 'self' });
    const collection = createCollection([['p1', meta]], 'p1');

    const stats = computeFamilyStats(collection);
    expect(stats).not.toBeNull();
    expect(stats!.totalProfiles).toBe(1);
    expect(stats!.activeProfiles).toBe(1);
    expect(stats!.primaryProfile).toBe(meta);
    expect(stats!.profilesByRelationship.self).toBe(1);
  });

  it('counts relationships correctly across multiple profiles', () => {
    const meta1 = createMetadata({ id: 'p1', isPrimary: true, isActive: true, relationship: 'self' });
    const meta2 = createMetadata({ id: 'p2', isPrimary: false, isActive: true, relationship: 'spouse' });
    const meta3 = createMetadata({ id: 'p3', isPrimary: false, isActive: false, relationship: 'child' });
    const collection = createCollection([['p1', meta1], ['p2', meta2], ['p3', meta3]], 'p1');

    const stats = computeFamilyStats(collection)!;
    expect(stats.totalProfiles).toBe(3);
    expect(stats.activeProfiles).toBe(2);
    expect(stats.profilesByRelationship.self).toBe(1);
    expect(stats.profilesByRelationship.spouse).toBe(1);
    expect(stats.profilesByRelationship.child).toBe(1);
    expect(stats.profilesByRelationship.parent).toBe(0);
  });

  it('tracks last accessed profile', () => {
    const meta1 = createMetadata({ id: 'p1', isPrimary: true, isActive: true, lastAccessed: '2025-01-01T00:00:00Z' });
    const meta2 = createMetadata({ id: 'p2', isPrimary: false, isActive: true, lastAccessed: '2025-06-01T00:00:00Z' });
    const collection = createCollection([['p1', meta1], ['p2', meta2]], 'p1');

    const stats = computeFamilyStats(collection)!;
    expect(stats.lastAccessedProfile!.id).toBe('p2');
  });
});
