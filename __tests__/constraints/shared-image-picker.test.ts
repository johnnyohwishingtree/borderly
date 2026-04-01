/**
 * Constraint: All image picker usage must go through the shared imagePickerService.
 *
 * Scope: src/screens/, src/services/ (except imagePickerService.ts itself)
 *
 * Rules:
 *   - DENY: Direct import of launchImageLibrary from react-native-image-picker
 *     in any file except imagePickerService.ts
 *   - All photo import flows must use selectImageFromLibrary from imagePickerService
 *
 * Why: Duplicate image picker code leads to inconsistent behavior and makes
 * it harder to fix platform-specific issues (like ph:// URI handling) in one place.
 */

import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

function getAllTsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) results.push(...getAllTsFiles(fullPath));
    else if ((entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) && !entry.name.includes('.test.')) {
      results.push(fullPath);
    }
  }
  return results;
}

test('only imagePickerService.ts imports launchImageLibrary', () => {
  const dirs = [resolve(ROOT, 'src/screens'), resolve(ROOT, 'src/services'), resolve(ROOT, 'src/hooks'), resolve(ROOT, 'src/components')];
  const violations: string[] = [];

  for (const dir of dirs) {
    for (const file of getAllTsFiles(dir)) {
      const name = file.replace(ROOT + '/', '');
      if (name.includes('imagePickerService')) continue;

      const content = readFileSync(file, 'utf-8');
      // Only flag launchImageLibrary — launchCamera is OK for camera capture
      if (content.includes('launchImageLibrary') && content.match(/from\s+['"]react-native-image-picker['"]/)) {
        violations.push(`${name}: imports launchImageLibrary directly (use imagePickerService)`);
      }
    }
  }

  expect(violations).toEqual([]);
});
