import {
  initializeKnownPortals,
  calculateSignatureMatch,
} from '../../../src/services/portal/knownPortals';
import type { PortalSignature } from '../../../src/services/portal/portalTypes';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makePageInfo(overrides?: Record<string, unknown>) {
  return {
    url: 'https://vjw-lp.digital.go.jp/vjw/login',
    domain: 'vjw-lp.digital.go.jp',
    pathname: '/vjw/login',
    title: 'Visit Japan Web',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// initializeKnownPortals
// ---------------------------------------------------------------------------
describe('initializeKnownPortals', () => {
  it('returns a Map with expected portal keys', () => {
    const portals = initializeKnownPortals();
    expect(portals).toBeInstanceOf(Map);
    expect(portals.has('japan_vjw')).toBe(true);
    expect(portals.has('malaysia_mdac')).toBe(true);
    expect(portals.has('singapore_ica')).toBe(true);
    expect(portals.size).toBe(3);
  });

  it('each entry has required PortalSignature fields', () => {
    const portals = initializeKnownPortals();
    const requiredKeys: (keyof PortalSignature)[] = [
      'name',
      'countryCode',
      'version',
      'domains',
      'urlPatterns',
      'titlePatterns',
      'bodyTextPatterns',
      'elementSelectors',
      'cssClasses',
      'metaTags',
    ];

    for (const [_key, signature] of portals.entries()) {
      for (const field of requiredKeys) {
        expect(signature).toHaveProperty(field);
      }
      expect(signature.name).not.toBe('');
      expect(signature.countryCode).toMatch(/^[A-Z]{2}$/);
      expect(signature.domains.length).toBeGreaterThan(0);
    }
  });

  it('Japan portal has correct metadata', () => {
    const portals = initializeKnownPortals();
    const japan = portals.get('japan_vjw')!;
    expect(japan.name).toBe('Visit Japan Web');
    expect(japan.countryCode).toBe('JP');
    expect(japan.domains).toContain('vjw-lp.digital.go.jp');
  });

  it('Malaysia portal has correct metadata', () => {
    const portals = initializeKnownPortals();
    const malaysia = portals.get('malaysia_mdac')!;
    expect(malaysia.name).toBe('Malaysia Digital Arrival Card');
    expect(malaysia.countryCode).toBe('MY');
    expect(malaysia.domains).toContain('mdac.gov.my');
  });

  it('Singapore portal has correct metadata', () => {
    const portals = initializeKnownPortals();
    const singapore = portals.get('singapore_ica')!;
    expect(singapore.name).toBe('Singapore ICA eServices');
    expect(singapore.countryCode).toBe('SG');
    expect(singapore.domains).toContain('eservices.ica.gov.sg');
  });
});

// ---------------------------------------------------------------------------
// calculateSignatureMatch
// ---------------------------------------------------------------------------
describe('calculateSignatureMatch', () => {
  let japanSignature: PortalSignature;

  beforeAll(() => {
    japanSignature = initializeKnownPortals().get('japan_vjw')!;
  });

  it('returns high score for fully matching page info', () => {
    const pageInfo = makePageInfo();
    const score = calculateSignatureMatch(pageInfo, japanSignature);
    expect(score).toBe(1);
  });

  it('returns partial score when only domain matches', () => {
    const pageInfo = makePageInfo({
      pathname: '/other',
      title: 'Some Other Page',
    });
    const score = calculateSignatureMatch(pageInfo, japanSignature);
    // domain = 30/70 = ~0.43
    expect(score).toBeCloseTo(30 / 70, 2);
  });

  it('returns partial score when only title matches', () => {
    const pageInfo = makePageInfo({
      domain: 'example.com',
      pathname: '/other',
    });
    const score = calculateSignatureMatch(pageInfo, japanSignature);
    // title = 20/70 = ~0.29
    expect(score).toBeCloseTo(20 / 70, 2);
  });

  it('returns zero for non-matching page info', () => {
    const pageInfo = makePageInfo({
      domain: 'example.com',
      pathname: '/unrelated',
      title: 'Unrelated Page',
    });
    const score = calculateSignatureMatch(pageInfo, japanSignature);
    expect(score).toBe(0);
  });

  it('returns domain + url score when title does not match', () => {
    const pageInfo = makePageInfo({
      title: 'Something Else',
    });
    const score = calculateSignatureMatch(pageInfo, japanSignature);
    // domain(30) + url(20) = 50/70
    expect(score).toBeCloseTo(50 / 70, 2);
  });

  it('handles empty strings in page info without crashing', () => {
    const pageInfo = { domain: '', pathname: '', title: '', url: '' };
    const score = calculateSignatureMatch(pageInfo, japanSignature);
    expect(score).toBe(0);
  });
});
