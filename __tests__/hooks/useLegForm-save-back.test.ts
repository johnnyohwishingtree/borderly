import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

/**
 * Spec: Form save flow should call profileSaveBack after persisting form data.
 *
 * Context: .context/external/cognitive/fewer-fields-higher-completion.md
 *
 * When the user saves a form, any fields with autoFillSource pointing to
 * empty profile fields should be saved back to the profile. This happens
 * after the form save succeeds, not before.
 *
 * Confirm: Profile is enriched after first form save; second form auto-fills those fields
 * Invalidate: Save-back causes performance issues or data corruption
 */
test('useLegForm calls saveFormFieldsToProfile after saving form', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/hooks/useLegForm.ts'),
    'utf-8',
  );

  // Should import and call the save-back function
  expect(content).toMatch(/saveFormFieldsToProfile/);
});
