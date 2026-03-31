import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');
const HOOKS_DIR = resolve(ROOT, 'src/hooks');

/**
 * Constraint: Hooks that read store state inside useEffect must use getState().
 *
 * When a hook runs a useEffect that reads Zustand store data (getTripById,
 * currentForm, etc.), it must use useXStore.getState() — not a variable
 * bound to the hook call. The hook call returns a React render snapshot
 * that's stale inside async effects, especially after cross-screen
 * navigation where the store was mutated by a different component.
 *
 * Scope: src/hooks/*.ts — variables assigned from useXStore() calls
 * Rules:
 *   - DENY: storeVar.getterMethod() inside useEffect body
 *   - REQUIRE: useXStore.getState().getterMethod() pattern instead
 * Exceptions:
 *   - Store methods that WRITE (createTrip, updateField, addTripLeg) are fine
 *   - Reactive values in deps arrays or outside useEffect are fine
 *   - Destructured individual functions (not via a variable) are fine since
 *     they close over the store's internal dispatch, not a snapshot
 * Anti-patterns:
 *   - const tripStore = useTripStore(); useEffect(() => { tripStore.getTripById(id) })
 */

// Store getter methods — reads that return data and are sensitive to staleness
const STORE_GETTERS = [
  'getTripById',
  'getLegById',
  'getTravelerFormData',
  'getQRCodesForLeg',
  'getProfile',
  'getAllProfiles',
  'getAllFamilyProfiles',
  'getProfileMetadata',
  'currentForm',
  'getFormData',
  'getFieldValue',
  'getFormProgress',
];

test('hooks do not read store getters inside useEffect from hook snapshots', () => {
  const hookFiles = readdirSync(HOOKS_DIR)
    .filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts') && !f.endsWith('.d.ts') && f !== 'index.ts');

  const violations: string[] = [];

  for (const file of hookFiles) {
    const content = readFileSync(resolve(HOOKS_DIR, file), 'utf-8');
    if (!content.includes('useEffect')) continue;

    const lines = content.split('\n');

    // Find variables assigned directly from useXStore() — e.g. "const tripStore = useTripStore()"
    // Only match whole-store assignment, NOT destructured: { fn1, fn2 } = useXStore()
    const storeVarNames: string[] = [];
    for (const line of lines) {
      const match = line.match(/const\s+(\w+)\s*=\s*use(?:Trip|Form|Profile)Store\(\)/);
      if (match) storeVarNames.push(match[1]);
    }

    if (storeVarNames.length === 0) continue;

    // Track useEffect bodies and look for storeVar.getter calls
    let insideEffect = false;
    let effectBraceDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.includes('useEffect(')) {
        insideEffect = true;
        effectBraceDepth = 0;
      }

      if (insideEffect) {
        effectBraceDepth += (line.match(/\{/g) || []).length;
        effectBraceDepth -= (line.match(/\}/g) || []).length;

        for (const varName of storeVarNames) {
          for (const getter of STORE_GETTERS) {
            if (line.includes(`${varName}.${getter}`)) {
              violations.push(
                `${file}:${i + 1} — ${varName}.${getter} inside useEffect reads stale snapshot. ` +
                `Use use*Store.getState().${getter}() instead.`,
              );
            }
          }
        }

        if (effectBraceDepth <= 0 && i > 0) {
          insideEffect = false;
        }
      }
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `Found ${violations.length} stale Zustand read(s) inside useEffect:\n\n` +
      violations.join('\n') +
      '\n\nUse useXStore.getState().method() inside effects, not the hook variable.',
    );
  }
});
