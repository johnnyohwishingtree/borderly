/**
 * Constraint: Guided Submission, Not Automated
 *
 * Decision: The app pre-fills and validates form data, then guides the user through
 *   government portal submission. The user always opens the portal, authenticates with
 *   their own credentials, reviews the data, and submits manually. The app never
 *   submits on behalf of the user.
 * Rejected: Automated portal submission via headless browsers or scrapers — government
 *   portal ToS prohibit automated access, makes the app the legal actor of record
 *   (liability), and portal DOM changes would break scrapers creating support burden.
 *
 * DENY:    headless browser dependencies (puppeteer, playwright, selenium) in production
 * DENY:    automated submission endpoints or services in src/
 * REQUIRE: user is always the actor who submits to government portals
 *
 * Why: Portal ToS prohibit automation (.context/external/regulatory/portal-tos-prohibit-automation.md)
 *      Human must be actor of record (.context/external/regulatory/human-must-be-actor-of-record.md)
 *      Government portals have no third-party integrations (.context/external/market/government-portals-have-no-third-party-integrations.md)
 */

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { execSync } from 'child_process';

const ROOT = resolve(__dirname, '../..');

/** Headless browser / automation packages that must not be in production deps */
const BANNED_DEPS = [
  'puppeteer',
  'puppeteer-core',
  'playwright',
  'playwright-core',
  'selenium-webdriver',
  'webdriverio',
  'cypress',
  'nightwatch',
  'testcafe',
];

describe('Guided submission', () => {
  it('no headless browser packages in production dependencies', () => {
    const pkgPath = resolve(ROOT, 'package.json');
    expect(existsSync(pkgPath)).toBe(true);

    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const prodDeps = Object.keys(pkg.dependencies || {});

    const violations = prodDeps.filter(dep =>
      BANNED_DEPS.some(banned => dep === banned || dep.startsWith(`@${banned}/`)),
    );

    expect(violations).toEqual([]);
  });

  it('no automated submission services in src/', () => {
    // Look for files that suggest automated portal submission
    const patterns = [
      'autoSubmit',
      'portalScraper',
      'portalScrape',
      'headlessBrowser',
      'automatedSubmission',
      'submitToPortal',
      'portalBot',
    ];

    const violations: string[] = [];
    for (const pattern of patterns) {
      try {
        const output = execSync(
          `grep -rn "${pattern}" "${resolve(ROOT, 'src')}" --include="*.ts" --include="*.tsx" -l`,
          { encoding: 'utf-8' },
        );
        const files = output.trim().split('\n').filter(Boolean);
        violations.push(...files.map(f => `${f.replace(`${ROOT}/`, '')} (matches: ${pattern})`));
      } catch {
        // No matches — good
      }
    }

    expect(violations).toEqual([]);
  });
});
