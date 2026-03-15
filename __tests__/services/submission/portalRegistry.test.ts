/**
 * Tests for the portal registry — single source of truth for government portal config.
 */

import {
  getPortalInfo,
  getAllPortals,
  getAllowedDomains,
  getPortalName,
  getPortalBaseUrl,
} from '../../../src/services/submission/portalRegistry';

// ---------------------------------------------------------------------------
// getPortalInfo
// ---------------------------------------------------------------------------

describe('getPortalInfo', () => {
  it('returns portal info for JPN', () => {
    const info = getPortalInfo('JPN');
    expect(info).not.toBeUndefined();
    expect(info!.countryCode).toBe('JPN');
  });

  it('returns portal info for MYS', () => {
    const info = getPortalInfo('MYS');
    expect(info).not.toBeUndefined();
    expect(info!.countryCode).toBe('MYS');
  });

  it('returns portal info for SGP', () => {
    const info = getPortalInfo('SGP');
    expect(info).not.toBeUndefined();
    expect(info!.countryCode).toBe('SGP');
  });

  it('returns undefined for an unknown country code', () => {
    expect(getPortalInfo('ZZZ')).toBeUndefined();
    expect(getPortalInfo('')).toBeUndefined();
  });

  it('JPN portal has correct portalName', () => {
    const info = getPortalInfo('JPN');
    expect(info!.portalName).toBe('Visit Japan Web');
  });

  it('JPN portal has correct portalUrl', () => {
    const info = getPortalInfo('JPN');
    expect(info!.portalUrl).toBe('https://vjw-lp.digital.go.jp/en/registration/');
  });

  it('JPN portal has correct allowedDomain derived from URL', () => {
    const info = getPortalInfo('JPN');
    expect(info!.allowedDomain).toBe('vjw-lp.digital.go.jp');
  });

  it('JPN portal has correct baseUrl (origin)', () => {
    const info = getPortalInfo('JPN');
    expect(info!.baseUrl).toBe('https://vjw-lp.digital.go.jp');
  });

  it('MYS portal has correct portalName', () => {
    const info = getPortalInfo('MYS');
    expect(info!.portalName).toBe('Malaysia Digital Arrival Card (MDAC)');
  });

  it('MYS portal has correct allowedDomain derived from URL', () => {
    const info = getPortalInfo('MYS');
    expect(info!.allowedDomain).toBe('imigresen-online.imi.gov.my');
  });

  it('SGP portal has correct portalName', () => {
    const info = getPortalInfo('SGP');
    expect(info!.portalName).toBe('SG Arrival Card');
  });

  it('SGP portal has correct portalUrl', () => {
    const info = getPortalInfo('SGP');
    expect(info!.portalUrl).toBe('https://eservices.ica.gov.sg/sgarrivalcard');
  });

  it('SGP portal has correct allowedDomain', () => {
    const info = getPortalInfo('SGP');
    expect(info!.allowedDomain).toBe('eservices.ica.gov.sg');
  });

  it('each portal has all required PortalInfo fields', () => {
    ['JPN', 'MYS', 'SGP'].forEach((code) => {
      const info = getPortalInfo(code)!;
      expect(typeof info.countryCode).toBe('string');
      expect(typeof info.portalName).toBe('string');
      expect(typeof info.portalUrl).toBe('string');
      expect(typeof info.allowedDomain).toBe('string');
      expect(typeof info.baseUrl).toBe('string');
      // All fields should be non-empty
      expect(info.countryCode.length).toBeGreaterThan(0);
      expect(info.portalName.length).toBeGreaterThan(0);
      expect(info.portalUrl.length).toBeGreaterThan(0);
      expect(info.allowedDomain.length).toBeGreaterThan(0);
      expect(info.baseUrl.length).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// getAllPortals
// ---------------------------------------------------------------------------

describe('getAllPortals', () => {
  it('returns an array of PortalInfo objects', () => {
    const portals = getAllPortals();
    expect(Array.isArray(portals)).toBe(true);
    expect(portals.length).toBeGreaterThanOrEqual(3);
  });

  it('includes JPN, MYS, and SGP portals', () => {
    const portals = getAllPortals();
    const codes = portals.map((p) => p.countryCode);
    expect(codes).toContain('JPN');
    expect(codes).toContain('MYS');
    expect(codes).toContain('SGP');
  });

  it('all portals have valid HTTPS URLs', () => {
    getAllPortals().forEach((portal) => {
      expect(portal.portalUrl).toMatch(/^https:\/\//);
    });
  });
});

// ---------------------------------------------------------------------------
// getAllowedDomains
// ---------------------------------------------------------------------------

describe('getAllowedDomains', () => {
  it('returns an array of domain strings', () => {
    const domains = getAllowedDomains();
    expect(Array.isArray(domains)).toBe(true);
    domains.forEach((d) => expect(typeof d).toBe('string'));
  });

  it('includes the JPN portal domain', () => {
    expect(getAllowedDomains()).toContain('vjw-lp.digital.go.jp');
  });

  it('includes the MYS portal domain', () => {
    expect(getAllowedDomains()).toContain('imigresen-online.imi.gov.my');
  });

  it('includes the SGP portal domain', () => {
    expect(getAllowedDomains()).toContain('eservices.ica.gov.sg');
  });

  it('always includes localhost for development', () => {
    expect(getAllowedDomains()).toContain('localhost');
  });

  it('always includes 127.0.0.1 for development', () => {
    expect(getAllowedDomains()).toContain('127.0.0.1');
  });

  it('includes at least 5 entries (3 portals + localhost + 127.0.0.1)', () => {
    expect(getAllowedDomains().length).toBeGreaterThanOrEqual(5);
  });
});

// ---------------------------------------------------------------------------
// getPortalName
// ---------------------------------------------------------------------------

describe('getPortalName', () => {
  it('returns "Visit Japan Web" for JPN', () => {
    expect(getPortalName('JPN')).toBe('Visit Japan Web');
  });

  it('returns the MYS portal name', () => {
    expect(getPortalName('MYS')).toBe('Malaysia Digital Arrival Card (MDAC)');
  });

  it('returns "SG Arrival Card" for SGP', () => {
    expect(getPortalName('SGP')).toBe('SG Arrival Card');
  });

  it('falls back to the raw country code for unknown codes', () => {
    expect(getPortalName('ZZZ')).toBe('ZZZ');
    expect(getPortalName('UNKNOWN')).toBe('UNKNOWN');
    expect(getPortalName('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// getPortalBaseUrl
// ---------------------------------------------------------------------------

describe('getPortalBaseUrl', () => {
  it('returns the JPN portal origin', () => {
    expect(getPortalBaseUrl('JPN')).toBe('https://vjw-lp.digital.go.jp');
  });

  it('returns the SGP portal origin', () => {
    expect(getPortalBaseUrl('SGP')).toBe('https://eservices.ica.gov.sg');
  });

  it('returns null for unknown country code', () => {
    expect(getPortalBaseUrl('ZZZ')).toBeNull();
    expect(getPortalBaseUrl('')).toBeNull();
  });
});
