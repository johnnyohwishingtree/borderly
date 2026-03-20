/**
 * CAN — Canada eTA portal validation (archived).
 *
 * The ArriveCAN digital pre-arrival app was discontinued by the Canada Border
 * Services Agency on October 1, 2023.  Portal automation is therefore disabled
 * for this country (CAN.json: automation.enabled = false,
 * metadata.implementationStatus = "archived").
 *
 * This spec does NOT attempt to load the canada.ca portal URL for automated
 * selector validation.  Instead it:
 *   1. Asserts that the CAN schema is correctly marked as archived.
 *   2. Asserts that automation is disabled so the submission guide shows the
 *      manual-only fallback message to the traveller.
 *   3. Records a graceful "skipped — archived portal" entry in report.json.
 *
 * When a replacement digital portal is introduced by IRCC, update CAN.json to
 * set automation.enabled = true and implementationStatus = "active", then
 * rewrite this spec to follow the pattern in jpn.spec.ts / gbr.spec.ts.
 */

import { test, expect } from '@playwright/test';
import { buildReport, writeReport, printSummary } from './helpers';
import * as path from 'path';
import * as fs from 'fs';

const COUNTRY_CODE = 'CAN';
const ARCHIVED_PORTAL_URL =
  'https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/eta.html';

// Resolve path to the CAN schema JSON relative to this spec file.
// e2e/portal-validation/ → ../../src/schemas/CAN.json
const SCHEMA_PATH = path.resolve(__dirname, '../../src/schemas/CAN.json');

interface CanSchema {
  countryCode: string;
  metadata: {
    implementationStatus: string;
    archiveReason?: string;
  };
  automation: {
    enabled: boolean;
    disabledReason?: string;
  };
}

test.describe(`${COUNTRY_CODE} — portal validation (archived portal — graceful skip)`, () => {
  let schema: CanSchema;

  test.beforeAll(() => {
    const raw = fs.readFileSync(SCHEMA_PATH, 'utf8');
    schema = JSON.parse(raw) as CanSchema;
  });

  test('CAN schema is marked as archived', () => {
    expect(schema.countryCode).toBe('CAN');
    expect(schema.metadata.implementationStatus).toBe('archived');
  });

  test('CAN schema has a non-empty archiveReason explaining the discontinuation', () => {
    const reason = schema.metadata.archiveReason ?? '';
    expect(reason.trim().length).toBeGreaterThan(0);
    // The reason should mention ArriveCAN or "discontinued"
    const lower = reason.toLowerCase();
    expect(lower.includes('arrivecan') || lower.includes('discontinued')).toBe(true);
  });

  test('CAN automation is explicitly disabled', () => {
    expect(schema.automation.enabled).toBe(false);
  });

  test('CAN automation has a disabledReason that communicates the fallback', () => {
    const reason = schema.automation.disabledReason ?? '';
    expect(reason.trim().length).toBeGreaterThan(0);
  });

  test('portal validation skipped — archived portal writes graceful report entry', () => {
    // Build a report entry that records the archived status without attempting
    // to load the live portal.  This is the "fallback messaging" assertion:
    // the pipeline acknowledges CAN is archived and does not block CI.
    const report = buildReport(
      COUNTRY_CODE,
      ARCHIVED_PORTAL_URL,
      /* pageLoaded */ false,
      /* httpStatus */ undefined,
      /* results */ [],
    );

    // The report summary should reflect 0 selectors validated (correct for
    // an archived portal — there are no selectors to check).
    expect(report.summary.total).toBe(0);
    expect(report.pageLoaded).toBe(false);
    expect(report.brokenSelectors).toHaveLength(0);

    writeReport(report);
    printSummary(report);
  });
});
