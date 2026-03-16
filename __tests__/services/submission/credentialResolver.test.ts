/**
 * Unit tests for the family-aware portal credential resolver.
 *
 * The resolver uses the portal's familyPolicy.type to decide which profile's
 * credential to look up:
 *   - 'companion'  → always use primary profile's credential
 *   - 'individual' → use the specific profile's credential
 *   - 'none'       → return null (no login needed)
 */

import { resolvePortalCredential, hasResolvedCredential } from '@/services/submission/credentialResolver';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetPortalCredential = jest.fn();

jest.mock('@/services/storage/keychain', () => ({
  keychainService: {
    getPortalCredential: (...args: unknown[]) => mockGetPortalCredential(...args),
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIMARY_PROFILE_ID = 'primary-profile';
const FAMILY_MEMBER_ID = 'family-member-profile';
const PORTAL_CODE = 'JPN';

const MOCK_CREDENTIAL = { username: 'primary@example.com', password: 'secret' };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('resolvePortalCredential', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── 'none' policy ────────────────────────────────────────────────────────────

  describe("family policy: 'none'", () => {
    it('returns null without touching the Keychain', async () => {
      const result = await resolvePortalCredential(
        FAMILY_MEMBER_ID,
        PRIMARY_PROFILE_ID,
        PORTAL_CODE,
        'none',
      );

      expect(result).toBeNull();
      expect(mockGetPortalCredential).not.toHaveBeenCalled();
    });
  });

  // ── 'companion' policy ───────────────────────────────────────────────────────

  describe("family policy: 'companion'", () => {
    it('resolves to the primary profile credential regardless of the submitting profile', async () => {
      mockGetPortalCredential.mockResolvedValue(MOCK_CREDENTIAL);

      const result = await resolvePortalCredential(
        FAMILY_MEMBER_ID,
        PRIMARY_PROFILE_ID,
        PORTAL_CODE,
        'companion',
      );

      expect(result).toEqual(MOCK_CREDENTIAL);
      // Must look up the PRIMARY profile's credential, not the family member's
      expect(mockGetPortalCredential).toHaveBeenCalledWith(PRIMARY_PROFILE_ID, PORTAL_CODE);
      expect(mockGetPortalCredential).not.toHaveBeenCalledWith(FAMILY_MEMBER_ID, PORTAL_CODE);
    });

    it('returns null when primary profile has no credential stored', async () => {
      mockGetPortalCredential.mockResolvedValue(null);

      const result = await resolvePortalCredential(
        FAMILY_MEMBER_ID,
        PRIMARY_PROFILE_ID,
        PORTAL_CODE,
        'companion',
      );

      expect(result).toBeNull();
    });

    it('works when profileId === primaryProfileId (primary submitting themselves)', async () => {
      mockGetPortalCredential.mockResolvedValue(MOCK_CREDENTIAL);

      const result = await resolvePortalCredential(
        PRIMARY_PROFILE_ID,
        PRIMARY_PROFILE_ID,
        PORTAL_CODE,
        'companion',
      );

      expect(result).toEqual(MOCK_CREDENTIAL);
      expect(mockGetPortalCredential).toHaveBeenCalledWith(PRIMARY_PROFILE_ID, PORTAL_CODE);
    });
  });

  // ── 'individual' policy ──────────────────────────────────────────────────────

  describe("family policy: 'individual'", () => {
    it("resolves to the submitting profile's own credential", async () => {
      mockGetPortalCredential.mockResolvedValue(MOCK_CREDENTIAL);

      const result = await resolvePortalCredential(
        FAMILY_MEMBER_ID,
        PRIMARY_PROFILE_ID,
        PORTAL_CODE,
        'individual',
      );

      expect(result).toEqual(MOCK_CREDENTIAL);
      // Must look up the specific profile's credential
      expect(mockGetPortalCredential).toHaveBeenCalledWith(FAMILY_MEMBER_ID, PORTAL_CODE);
      expect(mockGetPortalCredential).not.toHaveBeenCalledWith(PRIMARY_PROFILE_ID, PORTAL_CODE);
    });

    it('returns null when the profile has no credential stored', async () => {
      mockGetPortalCredential.mockResolvedValue(null);

      const result = await resolvePortalCredential(
        FAMILY_MEMBER_ID,
        PRIMARY_PROFILE_ID,
        PORTAL_CODE,
        'individual',
      );

      expect(result).toBeNull();
    });
  });

  // ── Unknown policy ───────────────────────────────────────────────────────────

  describe('unknown / unexpected policy type', () => {
    it('returns null and does not throw', async () => {
      const result = await resolvePortalCredential(
        FAMILY_MEMBER_ID,
        PRIMARY_PROFILE_ID,
        PORTAL_CODE,
        // @ts-expect-error — intentionally passing an unknown policy type
        'unknown_policy',
      );

      expect(result).toBeNull();
      expect(mockGetPortalCredential).not.toHaveBeenCalled();
    });
  });

  // ── Different portal codes ───────────────────────────────────────────────────

  it('passes the correct portalCode through to the Keychain lookup', async () => {
    mockGetPortalCredential.mockResolvedValue(null);

    await resolvePortalCredential(
      PRIMARY_PROFILE_ID,
      PRIMARY_PROFILE_ID,
      'SGP',
      'individual',
    );

    expect(mockGetPortalCredential).toHaveBeenCalledWith(PRIMARY_PROFILE_ID, 'SGP');
  });
});

// ── hasResolvedCredential ─────────────────────────────────────────────────────

describe('hasResolvedCredential', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when a credential can be resolved', async () => {
    mockGetPortalCredential.mockResolvedValue(MOCK_CREDENTIAL);

    const result = await hasResolvedCredential(
      PRIMARY_PROFILE_ID,
      PRIMARY_PROFILE_ID,
      PORTAL_CODE,
      'individual',
    );

    expect(result).toBe(true);
  });

  it('returns false when no credential is stored', async () => {
    mockGetPortalCredential.mockResolvedValue(null);

    const result = await hasResolvedCredential(
      FAMILY_MEMBER_ID,
      PRIMARY_PROFILE_ID,
      PORTAL_CODE,
      'individual',
    );

    expect(result).toBe(false);
  });

  it('returns false for none policy without calling Keychain', async () => {
    const result = await hasResolvedCredential(
      FAMILY_MEMBER_ID,
      PRIMARY_PROFILE_ID,
      PORTAL_CODE,
      'none',
    );

    expect(result).toBe(false);
    expect(mockGetPortalCredential).not.toHaveBeenCalled();
  });
});

// ── Family credential resolution — realistic multi-profile scenarios ───────────
//
// These tests mirror real-world family travel: a primary account holder with
// spouse and children, each potentially visiting portals with different policies.

describe('Family credential resolution — multi-profile scenarios', () => {
  const PRIMARY = 'dad-profile-id';
  const SPOUSE = 'mum-profile-id';
  const CHILD = 'kid-profile-id';

  const JPN_CRED = { username: 'dad@example.com', password: 'jpnPass' };
  const USA_CRED_DAD = { username: 'dad@esta.gov', password: 'dadsEstaPass' };
  const USA_CRED_KID = { username: 'kid@esta.gov', password: 'kidsEstaPass' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── JPN companion: entire family shares the primary's account ───────────────

  describe('Visit Japan Web — companion policy', () => {
    it('primary has JPN credential; child resolves to primary credential', async () => {
      mockGetPortalCredential.mockResolvedValue(JPN_CRED);

      const result = await resolvePortalCredential(CHILD, PRIMARY, 'JPN', 'companion');

      expect(result).toEqual(JPN_CRED);
      expect(mockGetPortalCredential).toHaveBeenCalledWith(PRIMARY, 'JPN');
      expect(mockGetPortalCredential).not.toHaveBeenCalledWith(CHILD, 'JPN');
    });

    it('primary has JPN credential; spouse resolves to primary credential', async () => {
      mockGetPortalCredential.mockResolvedValue(JPN_CRED);

      const result = await resolvePortalCredential(SPOUSE, PRIMARY, 'JPN', 'companion');

      expect(result).toEqual(JPN_CRED);
      expect(mockGetPortalCredential).toHaveBeenCalledWith(PRIMARY, 'JPN');
    });

    it('primary has NO JPN credential; child resolves to null', async () => {
      mockGetPortalCredential.mockResolvedValue(null);

      const result = await resolvePortalCredential(CHILD, PRIMARY, 'JPN', 'companion');

      expect(result).toBeNull();
      // Still looks up PRIMARY, not child
      expect(mockGetPortalCredential).toHaveBeenCalledWith(PRIMARY, 'JPN');
    });
  });

  // ── USA individual: every traveler needs their own ESTA account ─────────────

  describe('USA ESTA — individual policy', () => {
    it('primary has USA credential; child has no credential → child returns null', async () => {
      mockGetPortalCredential.mockImplementation(
        (profileId: string) => (profileId === PRIMARY ? Promise.resolve(USA_CRED_DAD) : Promise.resolve(null)),
      );

      const childResult = await resolvePortalCredential(CHILD, PRIMARY, 'USA', 'individual');
      expect(childResult).toBeNull();
      expect(mockGetPortalCredential).toHaveBeenCalledWith(CHILD, 'USA');
      expect(mockGetPortalCredential).not.toHaveBeenCalledWith(PRIMARY, 'USA');
    });

    it('child has their own USA credential; resolves to child credential (not primary)', async () => {
      mockGetPortalCredential.mockImplementation(
        (profileId: string) =>
          profileId === CHILD
            ? Promise.resolve(USA_CRED_KID)
            : Promise.resolve(USA_CRED_DAD),
      );

      const childResult = await resolvePortalCredential(CHILD, PRIMARY, 'USA', 'individual');
      expect(childResult).toEqual(USA_CRED_KID);
      expect(mockGetPortalCredential).toHaveBeenCalledWith(CHILD, 'USA');
      expect(mockGetPortalCredential).not.toHaveBeenCalledWith(PRIMARY, 'USA');
    });

    it('primary resolves their own individual credential', async () => {
      mockGetPortalCredential.mockResolvedValue(USA_CRED_DAD);

      const result = await resolvePortalCredential(PRIMARY, PRIMARY, 'USA', 'individual');
      expect(result).toEqual(USA_CRED_DAD);
      expect(mockGetPortalCredential).toHaveBeenCalledWith(PRIMARY, 'USA');
    });
  });

  // ── SGP: no login required ──────────────────────────────────────────────────

  describe('Singapore SGAC — none policy (no login required)', () => {
    it('returns null for all family members without accessing the Keychain', async () => {
      const [primaryResult, childResult, spouseResult] = await Promise.all([
        resolvePortalCredential(PRIMARY, PRIMARY, 'SGP', 'none'),
        resolvePortalCredential(CHILD, PRIMARY, 'SGP', 'none'),
        resolvePortalCredential(SPOUSE, PRIMARY, 'SGP', 'none'),
      ]);

      expect(primaryResult).toBeNull();
      expect(childResult).toBeNull();
      expect(spouseResult).toBeNull();
      expect(mockGetPortalCredential).not.toHaveBeenCalled();
    });
  });

  // ── Multiple portals: different credentials per portal ──────────────────────

  describe('multiple portals — per-portal credential lookup', () => {
    it('JPN (companion) and MYS (companion) resolve correctly for different portal codes', async () => {
      const MYS_CRED = { username: 'dad@mdac.my', password: 'mysPass' };

      mockGetPortalCredential.mockImplementation(
        (_profileId: string, portalCode: string) => {
          if (portalCode === 'JPN') return Promise.resolve(JPN_CRED);
          if (portalCode === 'MYS') return Promise.resolve(MYS_CRED);
          return Promise.resolve(null);
        },
      );

      const jpnResult = await resolvePortalCredential(CHILD, PRIMARY, 'JPN', 'companion');
      const mysResult = await resolvePortalCredential(CHILD, PRIMARY, 'MYS', 'companion');

      expect(jpnResult).toEqual(JPN_CRED);
      expect(mysResult).toEqual(MYS_CRED);
    });

    it('passes the correct portalCode through for each lookup', async () => {
      mockGetPortalCredential.mockResolvedValue(null);

      await resolvePortalCredential(PRIMARY, PRIMARY, 'JPN', 'individual');
      await resolvePortalCredential(PRIMARY, PRIMARY, 'MYS', 'individual');
      await resolvePortalCredential(PRIMARY, PRIMARY, 'SGP', 'individual');

      expect(mockGetPortalCredential).toHaveBeenCalledWith(PRIMARY, 'JPN');
      expect(mockGetPortalCredential).toHaveBeenCalledWith(PRIMARY, 'MYS');
      expect(mockGetPortalCredential).toHaveBeenCalledWith(PRIMARY, 'SGP');
    });
  });
});
