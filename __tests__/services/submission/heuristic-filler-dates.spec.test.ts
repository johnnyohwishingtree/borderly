// Spec: Heuristic filler must handle split Year/Month/Day date dropdowns.
//
// Many government portals (Japan, Korea, etc.) split dates into 3 separate
// selects: Year, Month, Day. The current filler only matches single date
// inputs. It needs to:
// 1. Detect groups of 3 selects near a date label
// 2. Parse ISO date (1985-06-15) into year/month/day parts
// 3. Set each dropdown individually
//
// Status: hypothesis
// Confirm: DOB and expiry fill on Visit Japan Web
// Invalidate: Too many portal variations to handle generically

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../../..');

test.skip('heuristic filler handles split year/month/day date selects', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/services/submission/heuristicFiller.ts'),
    'utf-8',
  );
  // Must have logic to detect and fill Year/Month/Day dropdown groups
  expect(content).toMatch(/year.*month.*day|splitDate|dateComponents/i);
});

test.skip('heuristic filler fills all select dropdowns, not just nationality', () => {
  const content = readFileSync(
    resolve(ROOT, 'src/services/submission/heuristicFiller.ts'),
    'utf-8',
  );
  // Must handle generic select elements, not just text inputs
  expect(content).toMatch(/select.*option|querySelector.*select/i);
});
