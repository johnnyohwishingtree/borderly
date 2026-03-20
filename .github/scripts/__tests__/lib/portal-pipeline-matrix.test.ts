/**
 * Portal Pipeline Matrix Validation Tests
 *
 * Validates that the CI portal pipeline test matrix covers all 8 country
 * schemas and that each country is handled appropriately:
 *   - Active portals: spec file exists in both playwright.config.ts
 *     (country-submissions project) and e2e/portal-validation/
 *   - Archived portals (CAN): spec exists in e2e/portal-validation/ with
 *     graceful-skip handling; in-app submission tests still run in CI
 *
 * The 8 country schemas shipped in the app: CAN, GBR, JPN, MYS, SGP, THA,
 * USA, VNM.  All must be present in the CI matrix — archived countries via a
 * graceful-degradation spec rather than a live portal validation.
 *
 * If this test fails after adding a new country schema, add the country to
 * the relevant lists below and create the corresponding spec files.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// Paths (relative to this file: .github/scripts/__tests__/lib/)
// ---------------------------------------------------------------------------

// Root of the repository
const REPO_ROOT = join(__dirname, '../../../../');

const PLAYWRIGHT_CONFIG_PATH = join(REPO_ROOT, 'playwright.config.ts');
const PORTAL_VALIDATION_DIR = join(REPO_ROOT, 'e2e/portal-validation');
const SCHEMAS_DIR = join(REPO_ROOT, 'src/schemas');

// ---------------------------------------------------------------------------
// Expected country matrix
// ---------------------------------------------------------------------------

/** All 8 country codes whose schemas are bundled in the app. */
const ALL_COUNTRY_CODES = ['CAN', 'GBR', 'JPN', 'MYS', 'SGP', 'THA', 'USA', 'VNM'] as const;
type CountryCode = (typeof ALL_COUNTRY_CODES)[number];

/**
 * Countries whose portal automation is disabled (archived).
 * These countries skip live portal validation but must have a graceful-
 * degradation spec in e2e/portal-validation/ and continue to be covered by
 * in-app submission tests (playwright.config.ts country-submissions project).
 */
const ARCHIVED_COUNTRIES = new Set<CountryCode>(['CAN']);

/**
 * Expected spec file names in the playwright.config.ts country-submissions
 * project for each country.  Multiple entries are allowed per country
 * (e.g. a dedicated leg spec plus a submission spec).
 */
const COUNTRY_SUBMISSIONS_SPECS: Record<CountryCode, string[]> = {
  CAN: ['canadaSubmission.spec.ts', 'can-gbr-usa-leg.spec.ts'],
  GBR: ['ukSubmission.spec.ts', 'can-gbr-usa-leg.spec.ts'],
  JPN: [],  // JPN in-app submission uses portalSubmission.spec.ts flow
  MYS: ['malaysiaSubmission.spec.ts'],
  SGP: ['singaporeSubmission.spec.ts'],
  THA: ['thailandSubmission.spec.ts', 'tha-leg.spec.ts'],
  USA: ['usaSubmission.spec.ts', 'can-gbr-usa-leg.spec.ts'],
  VNM: ['vietnamSubmission.spec.ts', 'vnm-leg.spec.ts'],
};

/** Expected spec file names in e2e/portal-validation/ for each country. */
const PORTAL_VALIDATION_SPECS: Record<CountryCode, string> = {
  CAN: 'can.spec.ts',
  GBR: 'gbr.spec.ts',
  JPN: 'jpn.spec.ts',
  MYS: 'mys.spec.ts',
  SGP: 'sgp.spec.ts',
  THA: 'tha.spec.ts',   // created when THA portal validation is added
  USA: 'usa.spec.ts',
  VNM: 'vnm.spec.ts',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readPlaywrightConfig(): string {
  return readFileSync(PLAYWRIGHT_CONFIG_PATH, 'utf-8');
}

function listPortalValidationSpecs(): string[] {
  return readdirSync(PORTAL_VALIDATION_DIR).filter(
    (f) => f.endsWith('.spec.ts'),
  );
}

function readSchemaJson(countryCode: CountryCode): Record<string, unknown> {
  const schemaPath = join(SCHEMAS_DIR, `${countryCode}.json`);
  return JSON.parse(readFileSync(schemaPath, 'utf-8')) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('portal pipeline matrix — all 8 country schemas covered in CI', () => {
  const playwrightConfig = readPlaywrightConfig();
  const portalValidationSpecs = listPortalValidationSpecs();

  // ── 1. playwright.config.ts country-submissions project ─────────────────

  describe('playwright.config.ts country-submissions project', () => {
    it('country-submissions project exists in playwright.config.ts', () => {
      expect(playwrightConfig).toContain("name: 'country-submissions'");
    });

    it('country-submissions testMatch covers CAN, GBR, and USA', () => {
      // These are the three countries added by this story (issue #450).
      // Verify each has at least one spec in the testMatch array.
      const mustContain = [
        'canadaSubmission.spec.ts',
        'ukSubmission.spec.ts',
        'usaSubmission.spec.ts',
        'can-gbr-usa-leg.spec.ts',
      ];
      for (const spec of mustContain) {
        expect(playwrightConfig, `country-submissions must include ${spec}`).toContain(spec);
      }
    });

    it('country-submissions testMatch covers all 8 country submissions (at least one spec per non-JPN country)', () => {
      const failures: string[] = [];
      for (const code of ALL_COUNTRY_CODES) {
        const specs = COUNTRY_SUBMISSIONS_SPECS[code];
        if (specs.length === 0) continue; // JPN handled via portalSubmission flow
        const covered = specs.some((spec) => playwrightConfig.includes(spec));
        if (!covered) {
          failures.push(
            `${code}: none of [${specs.join(', ')}] found in playwright.config.ts country-submissions testMatch`,
          );
        }
      }
      expect(failures, failures.join('\n')).toHaveLength(0);
    });

    it('e2e-smoke.yml runs the country-submissions project in CI', () => {
      const smokeYmlPath = join(REPO_ROOT, '.github/workflows/e2e-smoke.yml');
      const smokeContent = readFileSync(smokeYmlPath, 'utf-8');
      expect(smokeContent).toContain('country-submissions');
    });
  });

  // ── 2. e2e/portal-validation/ coverage ──────────────────────────────────

  describe('e2e/portal-validation/ coverage', () => {
    it('portal-validation directory exists', () => {
      expect(existsSync(PORTAL_VALIDATION_DIR)).toBe(true);
    });

    it('CAN archived-status portal validation spec exists', () => {
      expect(
        portalValidationSpecs,
        'can.spec.ts must exist in e2e/portal-validation/',
      ).toContain(PORTAL_VALIDATION_SPECS.CAN);
    });

    it('GBR portal validation spec exists', () => {
      expect(
        portalValidationSpecs,
        'gbr.spec.ts must exist in e2e/portal-validation/',
      ).toContain(PORTAL_VALIDATION_SPECS.GBR);
    });

    it('USA portal validation spec exists', () => {
      expect(
        portalValidationSpecs,
        'usa.spec.ts must exist in e2e/portal-validation/',
      ).toContain(PORTAL_VALIDATION_SPECS.USA);
    });

    it('all 7 portal-validation specs are present (THA deferred, CAN uses graceful-degradation spec)', () => {
      // THA portal validation is deferred (no published automation portal yet).
      // CAN is archived — its spec uses graceful degradation instead of live validation.
      const activeCountries = ALL_COUNTRY_CODES.filter(code => code !== 'THA');
      const missing: string[] = [];
      for (const code of activeCountries) {
        const spec = PORTAL_VALIDATION_SPECS[code];
        if (!portalValidationSpecs.includes(spec)) {
          missing.push(`${code}: ${spec} not found in e2e/portal-validation/`);
        }
      }
      expect(missing, missing.join('\n')).toHaveLength(0);
    });
  });

  // ── 3. CAN archived-status schema assertions ─────────────────────────────

  describe('CAN archived-status graceful degradation', () => {
    let canSchema: Record<string, unknown>;

    beforeAll(() => {
      try {
        canSchema = readSchemaJson('CAN');
      } catch {
        canSchema = {};
      }
    });

    it('CAN schema countryCode is CAN', () => {
      expect(canSchema.countryCode).toBe('CAN');
    });

    it('CAN metadata.implementationStatus is archived', () => {
      const metadata = canSchema.metadata as Record<string, unknown>;
      expect(metadata?.implementationStatus).toBe('archived');
    });

    it('CAN metadata.archiveReason is non-empty and mentions ArriveCAN or discontinued', () => {
      const metadata = canSchema.metadata as Record<string, unknown>;
      const reason = (metadata?.archiveReason as string) ?? '';
      expect(reason.trim().length).toBeGreaterThan(0);
      const lower = reason.toLowerCase();
      expect(
        lower.includes('arrivecan') || lower.includes('discontinued'),
        `archiveReason should mention ArriveCAN or discontinued, got: "${reason}"`,
      ).toBe(true);
    });

    it('CAN automation.enabled is false (portal automation disabled)', () => {
      const automation = canSchema.automation as Record<string, unknown>;
      expect(automation?.enabled).toBe(false);
    });

    it('CAN automation.disabledReason is non-empty (communicates fallback to user)', () => {
      const automation = canSchema.automation as Record<string, unknown>;
      const reason = (automation?.disabledReason as string) ?? '';
      expect(
        reason.trim().length,
        'automation.disabledReason must explain why automation is disabled for the fallback UI',
      ).toBeGreaterThan(0);
    });
  });

  // ── 4. All 8 schema files exist ──────────────────────────────────────────

  describe('all 8 country schema files exist', () => {
    it.each(ALL_COUNTRY_CODES)('%s schema JSON file exists', (code) => {
      const schemaPath = join(SCHEMAS_DIR, `${code}.json`);
      expect(existsSync(schemaPath), `${code}.json not found in src/schemas/`).toBe(true);
    });
  });
});
