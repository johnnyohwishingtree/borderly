import { portalMap, portalTimeEstimates } from '../../../src/services/portal/portalData';

// ---------------------------------------------------------------------------
// Valid ISO 3166-1 alpha-3 codes for countries in the portal map
// ---------------------------------------------------------------------------
const VALID_ALPHA3_CODES = new Set([
  'JPN', 'MYS', 'SGP', 'THA', 'VNM', 'GBR', 'USA', 'CAN',
]);

// ---------------------------------------------------------------------------
// portalMap
// ---------------------------------------------------------------------------
describe('portalMap', () => {
  const entries = Object.entries(portalMap);

  it('contains at least one entry', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it('has expected country keys', () => {
    expect(portalMap).toHaveProperty('JPN');
    expect(portalMap).toHaveProperty('MYS');
    expect(portalMap).toHaveProperty('SGP');
    expect(portalMap).toHaveProperty('THA');
    expect(portalMap).toHaveProperty('VNM');
    expect(portalMap).toHaveProperty('GBR');
    expect(portalMap).toHaveProperty('USA');
    expect(portalMap).toHaveProperty('CAN');
  });

  it.each(entries)('entry %s has required PortalInfo fields', (_key, info) => {
    expect(typeof info.name).toBe('string');
    expect(info.name.length).toBeGreaterThan(0);

    expect(typeof info.url).toBe('string');
    expect(info.url).toMatch(/^https?:\/\//);

    expect(typeof info.countryCode).toBe('string');
    expect(info.countryCode).toMatch(/^[A-Z]{3}$/);
  });

  it.each(entries)('entry %s has valid ISO 3166-1 alpha-3 country code', (key, info) => {
    expect(VALID_ALPHA3_CODES.has(info.countryCode)).toBe(true);
    // key should match countryCode
    expect(info.countryCode).toBe(key);
  });

  it.each(entries)('entry %s has features object with boolean fields', (_key, info) => {
    expect(typeof info.features.supportsDeepLinks).toBe('boolean');
    expect(typeof info.features.supportsAutoFill).toBe('boolean');
    expect(typeof info.features.requiresManualEntry).toBe('boolean');
  });

  it.each(entries)('entry %s has guidelines with non-empty arrays', (_key, info) => {
    expect(info.guidelines.recommendedBrowser.length).toBeGreaterThan(0);
    expect(info.guidelines.preparationTips.length).toBeGreaterThan(0);
    expect(info.guidelines.commonIssues.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// portalTimeEstimates
// ---------------------------------------------------------------------------
describe('portalTimeEstimates', () => {
  const entries = Object.entries(portalTimeEstimates);

  it('contains at least one entry', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it.each(entries)('entry %s has positive preparationMinutes', (_key, estimate) => {
    expect(estimate.preparationMinutes).toBeGreaterThan(0);
  });

  it.each(entries)('entry %s has positive submissionMinutes', (_key, estimate) => {
    expect(estimate.submissionMinutes).toBeGreaterThan(0);
  });

  it.each(entries)('entry %s has non-empty factors array', (_key, estimate) => {
    expect(estimate.factors.length).toBeGreaterThan(0);
    estimate.factors.forEach(factor => {
      expect(typeof factor).toBe('string');
      expect(factor.length).toBeGreaterThan(0);
    });
  });

  it('keys match portalMap keys', () => {
    const portalMapKeys = new Set(Object.keys(portalMap));
    const estimateKeys = new Set(Object.keys(portalTimeEstimates));

    // Every estimate key should exist in portalMap
    for (const key of estimateKeys) {
      expect(portalMapKeys.has(key)).toBe(true);
    }

    // Every portalMap key should have a time estimate
    for (const key of portalMapKeys) {
      expect(estimateKeys.has(key)).toBe(true);
    }
  });

  it('submissionMinutes is always greater than preparationMinutes', () => {
    for (const [_key, estimate] of entries) {
      expect(estimate.submissionMinutes).toBeGreaterThan(estimate.preparationMinutes);
    }
  });
});
