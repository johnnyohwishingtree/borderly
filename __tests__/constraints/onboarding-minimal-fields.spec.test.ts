import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Spec: Onboarding should only collect fields required by ALL supported country forms.
 * Constraint candidate — applies to all onboarding screens.
 *
 * Context: .context/external/cognitive/fewer-fields-higher-completion.md
 * Context: .context/external/customer/travelers-fill-forms-at-borders.md
 *
 * Optional profile fields (email, phone, address, occupation, maritalStatus,
 * purposeOfVisit) should be collected just-in-time during form fill, not upfront.
 * Only passport fields are universally required across all country forms.
 *
 * Confirm: Form completion rate improves with fewer onboarding fields
 * Invalidate: A field is required by every single supported country
 */
test.skip('onboarding screens do not collect optional profile fields', () => {
  const passportScreen = readFileSync(
    resolve(ROOT, 'src/screens/onboarding/PassportScanScreen/PassportScanScreen.tsx'),
    'utf-8',
  );

  // Optional profile fields should NOT appear in onboarding
  const optionalFields = ['email', 'phoneNumber', 'homeAddress', 'occupation', 'maritalStatus', 'purposeOfVisit'];
  for (const field of optionalFields) {
    // Check for form inputs collecting these fields (not just references)
    expect(passportScreen).not.toMatch(new RegExp(`${field}.*field|${field}.*input|${field}.*Field`, 'i'));
  }
});
