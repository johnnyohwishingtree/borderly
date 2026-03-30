import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Constraint: Onboarding Minimal Fields
 *
 * Scope: src/screens/onboarding/
 *
 * REQUIRE: Onboarding only collects passport fields (universally required by all country forms)
 * DENY: Collecting optional profile fields (email, phone, address, occupation, maritalStatus,
 *       purposeOfVisit) during onboarding — these are collected just-in-time during form fill
 *
 * Context: .context/external/cognitive/fewer-fields-higher-completion.md
 * Context: .context/external/customer/travelers-fill-forms-at-borders.md
 *
 * Decision: Just-in-time profile enrichment over upfront collection.
 * Rejected: Collecting all profile fields during onboarding — adds cognitive load,
 *   user can't answer context-dependent questions (purpose of visit) without a trip.
 */
test('onboarding screens do not collect optional profile fields', () => {
  const passportScreen = readFileSync(
    resolve(ROOT, 'src/screens/onboarding/PassportScanScreen/PassportScanScreen.tsx'),
    'utf-8',
  );

  // Optional profile fields should NOT appear in onboarding
  const optionalFields = ['email', 'phoneNumber', 'homeAddress', 'occupation', 'maritalStatus', 'purposeOfVisit'];
  for (const field of optionalFields) {
    expect(passportScreen).not.toMatch(new RegExp(`${field}.*field|${field}.*input|${field}.*Field`, 'i'));
  }
});
