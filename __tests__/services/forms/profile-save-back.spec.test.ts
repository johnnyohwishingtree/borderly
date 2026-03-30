import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

/**
 * Spec: Form engine should save user-entered values back to profile when the
 * field has an autoFillSource pointing to an empty profile field.
 *
 * Context: .context/external/cognitive/fewer-fields-higher-completion.md
 * Context: .context/external/customer/users-wont-verify-auto-filled-values-carefully.md
 *
 * When a user fills in email/phone/address/occupation on their first form,
 * the value should be saved to their profile so future forms auto-fill it.
 * This is "progressive profile enrichment" — collect just-in-time, save forever.
 *
 * Confirm: Fields entered on first form auto-fill on second form for different country
 * Invalidate: Some form field values are country-specific and shouldn't save to profile
 */
test.skip('profileSaveBack service exists and exports saveFormFieldsToProfile', () => {
  const servicePath = resolve(ROOT, 'src/services/forms/profileSaveBack.ts');
  expect(existsSync(servicePath)).toBe(true);

  const content = readFileSync(servicePath, 'utf-8');
  expect(content).toMatch(/export.*saveFormFieldsToProfile/);
});

test.skip('profileSaveBack only saves fields with profile.* autoFillSource', () => {
  const servicePath = resolve(ROOT, 'src/services/forms/profileSaveBack.ts');
  const content = readFileSync(servicePath, 'utf-8');

  // Should filter to only fields whose autoFillSource starts with "profile."
  expect(content).toMatch(/autoFillSource.*startsWith.*profile\./);
});
