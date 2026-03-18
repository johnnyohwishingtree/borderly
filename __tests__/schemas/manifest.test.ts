/**
 * Validates the structure and integrity of src/schemas/manifest.json.
 *
 * Checks:
 *  - Top-level manifest fields (version, updatedAt, schemas)
 *  - Each schema entry has required fields: version, checksum, url
 *  - Checksum format is sha256:<64 hex chars>
 *  - All SUPPORTED_COUNTRY_CODES are covered by the manifest
 *  - Every bundled schema JSON file has the required schemaVersion field
 *  - Bundled schema versions match their corresponding manifest entries
 */

import manifest from '../../src/schemas/manifest.json';
import { SUPPORTED_COUNTRY_CODES } from '../../src/constants/countries';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ManifestEntry {
  version: string;
  checksum: string;
  url: string;
}

interface ManifestShape {
  version: string;
  updatedAt: string;
  schemas: Record<string, ManifestEntry>;
}

const m = manifest as ManifestShape;

// ---------------------------------------------------------------------------
// Top-level manifest structure
// ---------------------------------------------------------------------------

describe('manifest.json — top-level structure', () => {
  it('has a version field that is a semantic version string', () => {
    expect(typeof m.version).toBe('string');
    // Must follow semver: MAJOR.MINOR.PATCH
    expect(m.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('has an updatedAt field that is an ISO 8601 timestamp', () => {
    expect(typeof m.updatedAt).toBe('string');
    // Accept YYYY-MM-DDTHH:MM:SS with optional timezone (Z or ±HH:MM)
    expect(m.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('has a schemas object with at least one entry', () => {
    expect(typeof m.schemas).toBe('object');
    expect(m.schemas).not.toBeNull();
    const codes = Object.keys(m.schemas);
    expect(codes.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Schema entry structure (per country)
// ---------------------------------------------------------------------------

describe('manifest.json — schema entry structure', () => {
  const countryCodes = Object.keys(m.schemas);

  it('all country codes are uppercase ISO 3166-1 alpha-3 strings', () => {
    for (const code of countryCodes) {
      // Must be 3 uppercase letters (ISO 3166-1 alpha-3)
      expect(code).toMatch(/^[A-Z]{3}$/);
    }
  });

  it.each(countryCodes)(
    '%s entry has a valid semantic version',
    (code) => {
      const entry = m.schemas[code];
      expect(typeof entry.version).toBe('string');
      // Must follow semver: MAJOR.MINOR.PATCH
      expect(entry.version).toMatch(/^\d+\.\d+\.\d+$/);
    },
  );

  it.each(countryCodes)(
    '%s entry has a valid sha256 checksum',
    (code) => {
      const entry = m.schemas[code];
      expect(typeof entry.checksum).toBe('string');
      // Must be sha256:<64 lowercase hex chars>
      expect(entry.checksum).toMatch(/^sha256:[0-9a-f]{64}$/);
    },
  );

  it.each(countryCodes)(
    '%s entry has a valid HTTPS URL',
    (code) => {
      const entry = m.schemas[code];
      expect(typeof entry.url).toBe('string');
      expect(entry.url).toMatch(/^https:\/\//);
    },
  );

  it.each(countryCodes)(
    '%s entry URL references the correct country file',
    (code) => {
      const entry = m.schemas[code];
      expect(entry.url).toContain(`${code}.json`);
    },
  );
});

// ---------------------------------------------------------------------------
// Coverage — all supported countries appear in the manifest
// ---------------------------------------------------------------------------

describe('manifest.json — coverage of supported countries', () => {
  const manifestCodes = Object.keys(m.schemas);

  it('every SUPPORTED_COUNTRY_CODE has an entry in the manifest', () => {
    for (const code of SUPPORTED_COUNTRY_CODES) {
      expect(manifestCodes).toContain(code);
    }
  });
});

// ---------------------------------------------------------------------------
// Bundled schema files — required fields and version consistency
// ---------------------------------------------------------------------------

describe('bundled schema files — required version fields', () => {
  const countryCodes = Object.keys(m.schemas);

  it.each(countryCodes)(
    '%s.json has a schemaVersion field matching the manifest entry',
    (code) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const schema = require(`../../src/schemas/${code}.json`);
      expect(typeof schema.schemaVersion).toBe('string');
      // Must follow semver: MAJOR.MINOR.PATCH
      expect(schema.schemaVersion).toMatch(/^\d+\.\d+\.\d+$/);
      // Bundled schema version must match manifest
      expect(schema.schemaVersion).toBe(m.schemas[code].version);
    },
  );

  it.each(countryCodes)(
    '%s.json has all required top-level fields',
    (code) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const schema = require(`../../src/schemas/${code}.json`);

      expect(typeof schema.countryCode).toBe('string');
      expect(schema.countryCode).toBe(code);

      expect(typeof schema.countryName).toBe('string');
      expect(schema.countryName.length).toBeGreaterThan(0);

      expect(typeof schema.schemaVersion).toBe('string');

      expect(typeof schema.lastUpdated).toBe('string');
      expect(schema.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}/);

      expect(typeof schema.portalUrl).toBe('string');
      expect(schema.portalUrl).toMatch(/^https?:\/\//);

      expect(Array.isArray(schema.sections)).toBe(true);
      expect(Array.isArray(schema.submissionGuide)).toBe(true);
    },
  );
});
