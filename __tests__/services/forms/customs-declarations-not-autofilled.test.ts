// Test: Customs declaration boolean fields must NOT be auto-filled.
//
// Customs questions like "Are you carrying commercial goods?", "Are you
// carrying meat products?", "Do you have items exceeding duty-free?" change
// every trip. Auto-filling them as "No" is dangerous — a traveler could
// unknowingly submit a false declaration to customs.
//
// These fields must always require explicit user input, even if the profile
// has defaultDeclarations set.

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

test('autoFillLogic does NOT auto-fill customs declaration fields', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/services/forms/autoFillLogic/autoFillLogic.ts'),
    'utf-8',
  );

  // The section that matches declare/carrying/bringing field IDs
  // must NOT return a source of 'smart' or 'auto' — it should be removed
  // or return null so those fields always need user input.
  const declarationBlock = content.match(
    /if\s*\(fieldId\.includes\('declare'\).*?carrying.*?bringing.*?\{([\s\S]*?)\}/,
  );

  // If the block exists, it must NOT return a value with source 'smart'
  if (declarationBlock) {
    expect(declarationBlock[1]).not.toMatch(/source:\s*['"]smart['"]/);
    expect(declarationBlock[1]).not.toMatch(/source:\s*['"]auto['"]/);
  }
});

test('formEngine does not count declaration booleans with default=false as auto-filled', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/services/forms/formEngine/formEngine.ts'),
    'utf-8',
  );

  // The comment "Fields with usable defaults (e.g., boolean toggle = false)"
  // should NOT blindly count all !needsUserInput as autoFilled.
  // Declaration booleans must be excluded from this shortcut.
  const statsBlock = content.match(
    /else if \(!field\.needsUserInput\)[\s\S]*?autoFilled\+\+/,
  );

  // If this block exists, it must check that the field is NOT a declaration
  if (statsBlock) {
    expect(statsBlock[0]).toMatch(/declaration|customs|carrying|declare/i);
  }
});
