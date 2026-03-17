/**
 * Shared error tracking for E2E tests.
 *
 * Collects JS errors during test execution and filters out known
 * non-critical React Native Web warnings. Use in beforeEach/afterEach.
 */
import { expect, type Page } from '@playwright/test';

const KNOWN_WARNINGS = [
  'Warning:',
  'React does not recognize',
  'cannot be a child of',
  'cannot contain a nested',
  'NativeWind',
  'shadow',
  'In HTML,',
];

export function createErrorTracker() {
  let jsErrors: string[] = [];

  return {
    /** Call in test.beforeEach to start collecting errors */
    setup(page: Page) {
      jsErrors = [];
      page.on('pageerror', (err) => jsErrors.push(err.message));
      page.on('dialog', (dialog) => dialog.accept());
    },

    /** Call in test.afterEach to assert no critical errors occurred */
    assertNoCriticalErrors() {
      const criticalErrors = jsErrors.filter(
        (e) => !KNOWN_WARNINGS.some((w) => e.includes(w)),
      );
      expect(criticalErrors).toEqual([]);
    },
  };
}
