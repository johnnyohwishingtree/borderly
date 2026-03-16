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
