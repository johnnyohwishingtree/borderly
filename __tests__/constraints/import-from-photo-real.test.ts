/**
 * Constraint: Every "Import from Photo" action must call selectImageFromLibrary.
 *
 * Scope: src/screens/ — all screen files
 *
 * Rules:
 *   - Any screen containing "Import from Photo" text must also import
 *     selectImageFromLibrary from imagePickerService
 *   - The handler must NOT just call handleManualEntry or be a stub
 *
 * Why: "Import from Photo" that doesn't open the photo library is a broken UX.
 * Users expect to pick a photo when they tap this button.
 */

import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

function getScreenFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) results.push(...getScreenFiles(fullPath));
    else if (entry.name.endsWith('.tsx') && !entry.name.includes('.test.')) results.push(fullPath);
  }
  return results;
}

test('screens with "Import from Photo" must use selectImageFromLibrary', () => {
  const files = getScreenFiles(resolve(ROOT, 'src/screens'));
  const violations: string[] = [];

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const name = file.replace(ROOT + '/', '');

    if (content.includes('Import from Photo') &&
        !content.includes('selectImageFromLibrary') &&
        !content.includes('importBoardingPassFromImage')) {
      violations.push(`${name}: has "Import from Photo" but doesn't use selectImageFromLibrary or importBoardingPassFromImage`);
    }
  }

  expect(violations).toEqual([]);
});
