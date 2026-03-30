import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

/**
 * Spec: Confirm profile screen should display dates in human-readable format.
 * Context: .context/external/customer/users-dont-understand-portal-jargon.md
 * Found by ux-audit: confirm-profile screenshot shows raw ISO dates
 * "1985-06-15" and "2032-03-20" instead of "June 15, 1985" and "March 20, 2032".
 *
 * Current state: Dates displayed as YYYY-MM-DD
 * Gap: Dates should be formatted as "Month Day, Year"
 */
test('ConfirmProfileScreen formats dates in human-readable form', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/screens/onboarding/ConfirmProfileScreen/ConfirmProfileScreen.tsx'),
    'utf-8',
  );

  // Should use a date formatter, not display raw ISO strings
  expect(content).toMatch(/formatDate|toLocaleDateString|format\(.*date/i);
});
