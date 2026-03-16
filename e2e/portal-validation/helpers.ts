/**
 * Shared utilities for portal selector validation tests.
 *
 * Each test loads a government portal page, then checks whether each
 * CSS selector in the country's field mapping resolves to a DOM element.
 * Results are collected and written as a JSON report.
 */

import { Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SelectorStatus = 'found' | 'not_found' | 'page_not_loaded';

export interface SelectorResult {
  fieldId: string;
  selector: string;
  /** The individual sub-selector (from a comma-separated list) that matched. */
  matchedSelector?: string;
  status: SelectorStatus;
}

export interface CountryReport {
  countryCode: string;
  portalUrl: string;
  /** ISO timestamp of when validation ran */
  testedAt: string;
  pageLoaded: boolean;
  /** HTTP status code when loading the portal, if deterministic */
  httpStatus?: number;
  results: SelectorResult[];
  summary: {
    total: number;
    found: number;
    not_found: number;
    matchRate: number;
  };
  brokenSelectors: string[];
}

// ---------------------------------------------------------------------------
// Page load helper
// ---------------------------------------------------------------------------

/**
 * Navigate to `url` and return whether the page loaded successfully.
 *
 * Returns `false` (without throwing) when the portal is unreachable so
 * that tests can skip gracefully instead of failing.
 */
export async function tryLoadPage(
  page: Page,
  url: string
): Promise<{ loaded: boolean; status?: number }> {
  try {
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 45000,
    });
    if (!response) {
      return { loaded: false };
    }
    const status = response.status();
    // Treat 2xx and 3xx (redirect chains) as "loaded"
    const loaded = status < 400;
    return { loaded, status };
  } catch {
    // Network error, DNS failure, timeout, etc.
    return { loaded: false };
  }
}

// ---------------------------------------------------------------------------
// Selector validation
// ---------------------------------------------------------------------------

/**
 * Parse a CSS selector string that may contain comma-separated fallbacks
 * into individual candidate selectors.
 */
export function parseSelectorChain(selector: string): string[] {
  return selector
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * Check each candidate in a (possibly comma-separated) selector string.
 * Returns the first one that matches a DOM element, or `undefined` if none
 * match.
 */
export async function findFirstMatchingSelector(
  page: Page,
  selector: string
): Promise<string | undefined> {
  const candidates = parseSelectorChain(selector);
  for (const candidate of candidates) {
    try {
      // Use page.evaluate so we test document.querySelector exactly as the
      // automation scripts do, rather than Playwright's own locator engine.
      const found = await page.evaluate((sel: string) => {
        return document.querySelector(sel) !== null;
      }, candidate);
      if (found) {
        return candidate;
      }
    } catch {
      // Malformed selector — skip this candidate
    }
  }
  return undefined;
}

/**
 * Validate all selectors from a fieldMappings record against the current
 * page DOM.  Returns a list of `SelectorResult` objects.
 */
export async function validateSelectors(
  page: Page,
  fieldMappings: Record<string, { fieldId: string; selector: string }>
): Promise<SelectorResult[]> {
  const results: SelectorResult[] = [];
  for (const [, mapping] of Object.entries(fieldMappings)) {
    const matchedSelector = await findFirstMatchingSelector(page, mapping.selector);
    results.push({
      fieldId: mapping.fieldId,
      selector: mapping.selector,
      matchedSelector,
      status: matchedSelector !== undefined ? 'found' : 'not_found',
    });
  }
  return results;
}

/**
 * Build a `CountryReport` from raw selector results.
 */
export function buildReport(
  countryCode: string,
  portalUrl: string,
  pageLoaded: boolean,
  httpStatus: number | undefined,
  results: SelectorResult[]
): CountryReport {
  const total = results.length;
  const found = results.filter(r => r.status === 'found').length;
  const not_found = results.filter(r => r.status === 'not_found').length;
  const matchRate = total > 0 ? Math.round((found / total) * 100) : 0;
  const brokenSelectors = results
    .filter(r => r.status === 'not_found')
    .map(r => r.fieldId);

  return {
    countryCode,
    portalUrl,
    testedAt: new Date().toISOString(),
    pageLoaded,
    httpStatus,
    results,
    summary: { total, found, not_found, matchRate },
    brokenSelectors,
  };
}

// ---------------------------------------------------------------------------
// Report persistence
// ---------------------------------------------------------------------------

const REPORT_PATH = path.resolve(
  __dirname,
  'report.json'
);

/**
 * Merge a `CountryReport` into the persisted `report.json` file (creating it
 * if it doesn't exist yet).  Each country's latest result overwrites the
 * previous entry for that country.
 */
export function writeReport(countryReport: CountryReport): void {
  let existing: Record<string, CountryReport> = {};
  if (fs.existsSync(REPORT_PATH)) {
    try {
      existing = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
    } catch {
      existing = {};
    }
  }
  existing[countryReport.countryCode] = countryReport;
  fs.writeFileSync(REPORT_PATH, JSON.stringify(existing, null, 2), 'utf8');
}

// ---------------------------------------------------------------------------
// Console summary helper (used inside test files via test.afterAll)
// ---------------------------------------------------------------------------

export function printSummary(report: CountryReport): void {
  const icon = report.pageLoaded ? '🌐' : '⚠️ ';
  const rate = report.pageLoaded
    ? `${report.summary.matchRate}% (${report.summary.found}/${report.summary.total})`
    : 'page not loaded';
  // eslint-disable-next-line no-console
  console.log(`${icon} ${report.countryCode} — ${report.portalUrl} — ${rate}`);
  if (report.brokenSelectors.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(`   Broken selectors: ${report.brokenSelectors.join(', ')}`);
  }
}
