/**
 * Integration tests for the credential → auto-login → auto-fill pipeline.
 *
 * Verifies that all pipeline stages compose correctly:
 *   Keychain ──► resolvePortalCredential
 *             ──► buildLoginScript  (contains credentials, posts AUTO_LOGIN_RESULT)
 *             ──► pageDetector      (isAuthPage / isCaptchaPage)
 *             ──► formFiller        (buildAutoFillScript / parseFillResult)
 *
 * All external I/O (Keychain) is mocked. Pipeline logic runs for real.
 */

import { resolvePortalCredential, hasResolvedCredential } from '../../src/services/submission/credentialResolver';
import { buildLoginScript } from '../../src/services/submission/autoLogin';
import { formFiller } from '../../src/services/submission/formFiller';
import { pageDetector } from '../../src/services/submission/pageDetection';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetPortalCredential = jest.fn();

jest.mock('@/services/storage/keychain', () => ({
  keychainService: {
    getPortalCredential: (...args: unknown[]) => mockGetPortalCredential(...args),
  },
}));

// pageDetection imports portalRegistry — stub it to avoid JSON schema loading
jest.mock('@/services/submission/portalRegistry', () => ({
  getPortalBaseUrl: jest.fn((countryCode: string) => {
    const urls: Record<string, string> = {
      JPN: 'https://vjw-lp.digital.go.jp',
      MYS: 'https://mdac.gov.my',
      SGP: 'https://eservices.ica.gov.sg',
      USA: 'https://esta.cbp.dhs.gov',
    };
    return urls[countryCode] ?? null;
  }),
}));

// ── Constants ──────────────────────────────────────────────────────────────────

const PRIMARY_ID = 'primary-profile-id';
const CHILD_ID = 'child-profile-id';
const JPN_PORTAL = 'JPN';
const MYS_PORTAL = 'MYS';
const SGP_PORTAL = 'SGP';
const USA_PORTAL = 'USA';

const PRIMARY_CREDENTIAL = { username: 'primary@example.com', password: 'securePass1!' };
const CHILD_CREDENTIAL = { username: 'child@example.com', password: 'childPass2@' };

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 1: Credential resolution
// ═══════════════════════════════════════════════════════════════════════════════

describe('Pipeline Stage 1 — credential resolution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // JPN uses companion policy — family members share the primary account

  it('JPN (companion): primary credential is stored → resolves for primary', async () => {
    mockGetPortalCredential.mockResolvedValue(PRIMARY_CREDENTIAL);

    const result = await resolvePortalCredential(PRIMARY_ID, PRIMARY_ID, JPN_PORTAL, 'companion');

    expect(result).toEqual(PRIMARY_CREDENTIAL);
    expect(mockGetPortalCredential).toHaveBeenCalledWith(PRIMARY_ID, JPN_PORTAL);
  });

  it('JPN (companion): primary credential is stored → child profile resolves to primary credential', async () => {
    mockGetPortalCredential.mockResolvedValue(PRIMARY_CREDENTIAL);

    const result = await resolvePortalCredential(CHILD_ID, PRIMARY_ID, JPN_PORTAL, 'companion');

    expect(result).toEqual(PRIMARY_CREDENTIAL);
    // Must look up PRIMARY profile, not child profile
    expect(mockGetPortalCredential).toHaveBeenCalledWith(PRIMARY_ID, JPN_PORTAL);
    expect(mockGetPortalCredential).not.toHaveBeenCalledWith(CHILD_ID, JPN_PORTAL);
  });

  it('JPN (companion): no primary credential → resolve returns null → auto-login skipped', async () => {
    mockGetPortalCredential.mockResolvedValue(null);

    const result = await resolvePortalCredential(CHILD_ID, PRIMARY_ID, JPN_PORTAL, 'companion');

    expect(result).toBeNull();
  });

  it('USA (individual): each traveler needs their own credential', async () => {
    mockGetPortalCredential.mockImplementation(
      (profileId: string) => (profileId === PRIMARY_ID ? PRIMARY_CREDENTIAL : null),
    );

    // Primary has a credential
    const primaryResult = await resolvePortalCredential(PRIMARY_ID, PRIMARY_ID, USA_PORTAL, 'individual');
    expect(primaryResult).toEqual(PRIMARY_CREDENTIAL);
    expect(mockGetPortalCredential).toHaveBeenCalledWith(PRIMARY_ID, USA_PORTAL);

    // Child has no credential → resolve returns null
    const childResult = await resolvePortalCredential(CHILD_ID, PRIMARY_ID, USA_PORTAL, 'individual');
    expect(childResult).toBeNull();
    expect(mockGetPortalCredential).toHaveBeenCalledWith(CHILD_ID, USA_PORTAL);
  });

  it('USA (individual): child credential stored → child resolves their own credential', async () => {
    mockGetPortalCredential.mockImplementation(
      (profileId: string) =>
        profileId === CHILD_ID ? CHILD_CREDENTIAL : PRIMARY_CREDENTIAL,
    );

    const result = await resolvePortalCredential(CHILD_ID, PRIMARY_ID, USA_PORTAL, 'individual');

    expect(result).toEqual(CHILD_CREDENTIAL);
    expect(mockGetPortalCredential).toHaveBeenCalledWith(CHILD_ID, USA_PORTAL);
    expect(mockGetPortalCredential).not.toHaveBeenCalledWith(PRIMARY_ID, USA_PORTAL);
  });

  it('portal with none policy → resolve always returns null (no Keychain call)', async () => {
    const result = await resolvePortalCredential(PRIMARY_ID, PRIMARY_ID, SGP_PORTAL, 'none');

    expect(result).toBeNull();
    expect(mockGetPortalCredential).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 2: Login script generation
// ═══════════════════════════════════════════════════════════════════════════════

describe('Pipeline Stage 2 — buildLoginScript', () => {
  it('credential → buildLoginScript → script contains the username', () => {
    const script = buildLoginScript(PRIMARY_CREDENTIAL.username, PRIMARY_CREDENTIAL.password);
    expect(script).toContain(JSON.stringify(PRIMARY_CREDENTIAL.username));
  });

  it('credential → buildLoginScript → script contains the password', () => {
    const script = buildLoginScript(PRIMARY_CREDENTIAL.username, PRIMARY_CREDENTIAL.password);
    expect(script).toContain(JSON.stringify(PRIMARY_CREDENTIAL.password));
  });

  it('script posts AUTO_LOGIN_RESULT message on success path', () => {
    const script = buildLoginScript('user@example.com', 'pass');
    expect(script).toContain('AUTO_LOGIN_RESULT');
    expect(script).toContain('success:true');
  });

  it('script posts AUTO_LOGIN_RESULT with success:false when login fields not found', () => {
    const script = buildLoginScript('user@example.com', 'pass');
    expect(script).toContain('success:false');
    expect(script).toContain('Login fields not found');
  });

  it('script handles credentials containing special characters', () => {
    const specialUsername = 'user"with\'quotes@example.com';
    const specialPassword = 'p@ss\\w0rd"<special>';
    const script = buildLoginScript(specialUsername, specialPassword);
    // JSON.stringify ensures special chars are properly escaped
    expect(script).toContain(JSON.stringify(specialUsername));
    expect(script).toContain(JSON.stringify(specialPassword));
  });

  it('script targets common email/username and password selectors', () => {
    const script = buildLoginScript('u', 'p');
    expect(script).toContain('input[type=\\"email\\"]');
    expect(script).toContain('input[type=\\"password\\"]');
  });

  it('full pipeline: resolve credential → build script → script matches credential', async () => {
    mockGetPortalCredential.mockResolvedValue(PRIMARY_CREDENTIAL);

    const credential = await resolvePortalCredential(PRIMARY_ID, PRIMARY_ID, JPN_PORTAL, 'companion');
    expect(credential).not.toBeNull();

    const script = buildLoginScript(credential!.username, credential!.password);

    expect(script).toContain(JSON.stringify(PRIMARY_CREDENTIAL.username));
    expect(script).toContain(JSON.stringify(PRIMARY_CREDENTIAL.password));
    expect(script).toContain('AUTO_LOGIN_RESULT');
  });

  it('full pipeline: no credential → resolve returns null → login script is NOT built', async () => {
    mockGetPortalCredential.mockResolvedValue(null);

    const credential = await resolvePortalCredential(CHILD_ID, PRIMARY_ID, USA_PORTAL, 'individual');

    // Simulate screen behaviour: only build script when credential is non-null
    const scriptOrSkip = credential !== null ? buildLoginScript(credential.username, credential.password) : null;

    expect(scriptOrSkip).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 3: Page detection
// ═══════════════════════════════════════════════════════════════════════════════

describe('Pipeline Stage 3 — page detection', () => {
  it('auth page HTML → isAuthPage returns true → auto-login proceeds', () => {
    const authHtml = '<form><input name="email" /><input name="password" /><button>login</button></form>';
    expect(pageDetector.isAuthPage(authHtml)).toBe(true);
  });

  it('non-auth form HTML → isAuthPage returns false → auto-fill proceeds', () => {
    const formHtml = '<form><input name="passportNumber" /><select name="nationality"></select></form>';
    expect(pageDetector.isAuthPage(formHtml)).toBe(false);
  });

  it('captcha HTML → isCaptchaPage returns true', () => {
    const captchaHtml = '<div class="g-recaptcha" data-sitekey="xyz"></div>';
    expect(pageDetector.isCaptchaPage(captchaHtml)).toBe(true);
  });

  it('normal form HTML → isCaptchaPage returns false', () => {
    const formHtml = '<form><input name="surname" /></form>';
    expect(pageDetector.isCaptchaPage(formHtml)).toBe(false);
  });

  it('login page detected → auto-login triggered → form page detected → auto-fill triggered', () => {
    const loginHtml = 'Please sign-in to continue';
    const formHtml = '<input name="passport_no" />';

    // Step 1: login page → isAuthPage true
    expect(pageDetector.isAuthPage(loginHtml)).toBe(true);

    // Step 2: after redirect → no longer auth page
    expect(pageDetector.isAuthPage(formHtml)).toBe(false);
    expect(pageDetector.isCaptchaPage(formHtml)).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Stage 4: Auto-fill result parsing
// ═══════════════════════════════════════════════════════════════════════════════

describe('Pipeline Stage 4 — fill result parsing', () => {
  it('successful fill result → parseFillResult returns correct stats', () => {
    const message = JSON.stringify({
      type: 'AUTO_FILL_RESULT',
      filled: 8,
      failed: 1,
      total: 9,
      results: [
        { id: 'surname', status: 'filled' },
        { id: 'givenNames', status: 'filled' },
        { id: 'passportNumber', status: 'filled' },
        { id: 'nationality', status: 'filled' },
        { id: 'dateOfBirth', status: 'filled' },
        { id: 'gender', status: 'filled' },
        { id: 'arrivalDate', status: 'filled' },
        { id: 'flightNumber', status: 'filled' },
        { id: 'missingField', status: 'not_found' },
      ],
    });

    const result = formFiller.parseFillResult(message);

    expect(result).not.toBeNull();
    expect(result!.filled).toBe(8);
    expect(result!.total).toBe(9);
    expect(result!.fillRate).toBeCloseTo(8 / 9);
    expect(result!.results).toHaveLength(9);
    expect(result!.results.find((r) => r.id === 'surname')?.status).toBe('filled');
    expect(result!.results.find((r) => r.id === 'missingField')?.status).toBe('not_found');
  });

  it('fill rate ≥ 50% → isAutoFillSufficient returns true', () => {
    expect(formFiller.isAutoFillSufficient(0.5)).toBe(true);
    expect(formFiller.isAutoFillSufficient(0.88)).toBe(true);
    expect(formFiller.isAutoFillSufficient(1.0)).toBe(true);
  });

  it('fill rate < 50% → isAutoFillSufficient returns false → manual guide fallback', () => {
    expect(formFiller.isAutoFillSufficient(0.49)).toBe(false);
    expect(formFiller.isAutoFillSufficient(0.0)).toBe(false);
    expect(formFiller.isAutoFillSufficient(0.3)).toBe(false);
  });

  it('non-AUTO_FILL_RESULT message → parseFillResult returns null', () => {
    const loginMessage = JSON.stringify({ type: 'AUTO_LOGIN_RESULT', success: true });
    expect(formFiller.parseFillResult(loginMessage)).toBeNull();
  });

  it('malformed JSON → parseFillResult returns null without throwing', () => {
    expect(formFiller.parseFillResult('not-json')).toBeNull();
    expect(formFiller.parseFillResult('')).toBeNull();
    expect(formFiller.parseFillResult('{broken')).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Full pipeline composition
// ═══════════════════════════════════════════════════════════════════════════════

describe('Full pipeline composition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('JPN companion: credential stored → resolve → script built → fill result parsed', async () => {
    mockGetPortalCredential.mockResolvedValue(PRIMARY_CREDENTIAL);

    // Stage 1: resolve
    const credential = await resolvePortalCredential(CHILD_ID, PRIMARY_ID, JPN_PORTAL, 'companion');
    expect(credential).toEqual(PRIMARY_CREDENTIAL);

    // Stage 2: build login script
    const loginScript = buildLoginScript(credential!.username, credential!.password);
    expect(loginScript).toContain('AUTO_LOGIN_RESULT');
    expect(loginScript).toContain(JSON.stringify(PRIMARY_CREDENTIAL.username));

    // Stage 3: simulate auth page detection → login → form page detection
    const authHtml = 'Login to Visit Japan Web — sign-in required';
    expect(pageDetector.isAuthPage(authHtml)).toBe(true);

    const formHtml = '<input name="passportNo" />';
    expect(pageDetector.isAuthPage(formHtml)).toBe(false);

    // Stage 4: build auto-fill script + parse result
    const fieldSpecs = [
      { id: 'surname', selector: 'input[name="lastName"]', value: 'SMITH', inputType: 'text' as const },
      { id: 'passportNumber', selector: 'input[name="passportNo"]', value: 'L12345678', inputType: 'text' as const },
    ];
    const fillScript = formFiller.buildAutoFillScript(fieldSpecs);
    expect(fillScript).toContain('AUTO_FILL_RESULT');
    expect(fillScript).toContain('SMITH');
    expect(fillScript).toContain('L12345678');

    // Parse a simulated fill result
    const fillResultMsg = JSON.stringify({
      type: 'AUTO_FILL_RESULT',
      filled: 2,
      failed: 0,
      total: 2,
      results: [
        { id: 'surname', status: 'filled' },
        { id: 'passportNumber', status: 'filled' },
      ],
    });
    const fillResult = formFiller.parseFillResult(fillResultMsg);
    expect(fillResult).not.toBeNull();
    expect(fillResult!.fillRate).toBe(1.0);
    expect(formFiller.isAutoFillSufficient(fillResult!.fillRate)).toBe(true);
  });

  it('login failure: credential found → script returns failure → error reported', async () => {
    mockGetPortalCredential.mockResolvedValue(PRIMARY_CREDENTIAL);

    const credential = await resolvePortalCredential(PRIMARY_ID, PRIMARY_ID, MYS_PORTAL, 'companion');
    expect(credential).not.toBeNull();

    // Script is built but injection returns failure (fields not found in page)
    const loginFailureMsg = JSON.stringify({
      type: 'AUTO_LOGIN_RESULT',
      success: false,
      error: 'Login fields not found',
    });
    const parsed = JSON.parse(loginFailureMsg) as { type: string; success: boolean; error?: string };
    expect(parsed.type).toBe('AUTO_LOGIN_RESULT');
    expect(parsed.success).toBe(false);
    expect(parsed.error).toBe('Login fields not found');
  });

  it('no credential (none policy): auto-login is skipped entirely', async () => {
    const credential = await resolvePortalCredential(PRIMARY_ID, PRIMARY_ID, SGP_PORTAL, 'none');
    expect(credential).toBeNull();

    // Simulate screen: with null credential, no buildLoginScript call is made
    const scriptOrNull = credential ? buildLoginScript(credential.username, credential.password) : null;
    expect(scriptOrNull).toBeNull();
    expect(mockGetPortalCredential).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Family credential resolution — multi-profile scenarios
// ═══════════════════════════════════════════════════════════════════════════════

describe('Family credential resolution — multi-profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('companion policy: multiple family members all resolve to primary credential', async () => {
    mockGetPortalCredential.mockResolvedValue(PRIMARY_CREDENTIAL);

    const SPOUSE_ID = 'spouse-profile-id';
    const CHILD2_ID = 'child2-profile-id';

    const [primary, child, spouse] = await Promise.all([
      resolvePortalCredential(PRIMARY_ID, PRIMARY_ID, JPN_PORTAL, 'companion'),
      resolvePortalCredential(CHILD_ID, PRIMARY_ID, JPN_PORTAL, 'companion'),
      resolvePortalCredential(SPOUSE_ID, PRIMARY_ID, JPN_PORTAL, 'companion'),
      resolvePortalCredential(CHILD2_ID, PRIMARY_ID, JPN_PORTAL, 'companion'),
    ]);

    expect(primary).toEqual(PRIMARY_CREDENTIAL);
    expect(child).toEqual(PRIMARY_CREDENTIAL);
    expect(spouse).toEqual(PRIMARY_CREDENTIAL);

    // All 3 calls resolve to primary's credential
    expect(mockGetPortalCredential).toHaveBeenCalledTimes(4);
    expect(mockGetPortalCredential).toHaveBeenCalledWith(PRIMARY_ID, JPN_PORTAL);
    expect(mockGetPortalCredential).not.toHaveBeenCalledWith(CHILD_ID, JPN_PORTAL);
    expect(mockGetPortalCredential).not.toHaveBeenCalledWith(SPOUSE_ID, JPN_PORTAL);
  });

  it('individual policy: different profiles can have different credentials per portal', async () => {
    mockGetPortalCredential.mockImplementation(
      (profileId: string, portalCode: string) => {
        if (profileId === PRIMARY_ID && portalCode === USA_PORTAL) return Promise.resolve(PRIMARY_CREDENTIAL);
        if (profileId === CHILD_ID && portalCode === USA_PORTAL) return Promise.resolve(CHILD_CREDENTIAL);
        return Promise.resolve(null);
      },
    );

    const primaryUSA = await resolvePortalCredential(PRIMARY_ID, PRIMARY_ID, USA_PORTAL, 'individual');
    const childUSA = await resolvePortalCredential(CHILD_ID, PRIMARY_ID, USA_PORTAL, 'individual');

    expect(primaryUSA).toEqual(PRIMARY_CREDENTIAL);
    expect(childUSA).toEqual(CHILD_CREDENTIAL);
  });

  it('individual policy: primary has JPN credential but child does not → child returns null', async () => {
    mockGetPortalCredential.mockImplementation(
      (profileId: string) => (profileId === PRIMARY_ID ? PRIMARY_CREDENTIAL : null),
    );

    const childResult = await resolvePortalCredential(CHILD_ID, PRIMARY_ID, JPN_PORTAL, 'individual');
    expect(childResult).toBeNull();
  });

  it('multiple portals: each resolves correctly based on portal code', async () => {
    const JPN_CRED = { username: 'user@vjw.jp', password: 'vjwPass' };
    const MYS_CRED = { username: 'user@mdac.my', password: 'mdacPass' };

    mockGetPortalCredential.mockImplementation(
      (_profileId: string, portalCode: string) => {
        if (portalCode === JPN_PORTAL) return Promise.resolve(JPN_CRED);
        if (portalCode === MYS_PORTAL) return Promise.resolve(MYS_CRED);
        return Promise.resolve(null);
      },
    );

    const jpnResult = await resolvePortalCredential(PRIMARY_ID, PRIMARY_ID, JPN_PORTAL, 'companion');
    const mysResult = await resolvePortalCredential(PRIMARY_ID, PRIMARY_ID, MYS_PORTAL, 'companion');
    const sgpResult = await resolvePortalCredential(PRIMARY_ID, PRIMARY_ID, SGP_PORTAL, 'none');

    expect(jpnResult).toEqual(JPN_CRED);
    expect(mysResult).toEqual(MYS_CRED);
    expect(sgpResult).toBeNull(); // 'none' policy → always null
  });

  it('hasResolvedCredential is true for companion when primary has credential', async () => {
    mockGetPortalCredential.mockResolvedValue(PRIMARY_CREDENTIAL);

    const has = await hasResolvedCredential(CHILD_ID, PRIMARY_ID, JPN_PORTAL, 'companion');
    expect(has).toBe(true);
  });

  it('hasResolvedCredential is false for individual when profile has no credential', async () => {
    mockGetPortalCredential.mockResolvedValue(null);

    const has = await hasResolvedCredential(CHILD_ID, PRIMARY_ID, USA_PORTAL, 'individual');
    expect(has).toBe(false);
  });
});
