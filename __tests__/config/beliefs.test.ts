/**
 * Validates the beliefs configuration file.
 *
 * Beliefs are product assumptions that shape the codebase.
 * This test ensures they're properly typed and that every belief
 * has a status and note explaining the reasoning.
 */

import { BELIEFS } from '@/config/beliefs';
import type { BeliefStatus } from '@/config/beliefs';

const VALID_STATUSES: BeliefStatus[] = ['confirmed', 'working', 'hypothesis'];

describe('Product beliefs', () => {
  const beliefEntries = Object.entries(BELIEFS);

  it('exports at least 10 beliefs', () => {
    expect(beliefEntries.length).toBeGreaterThanOrEqual(10);
  });

  it.each(beliefEntries)('%s has a valid status', (_name, belief) => {
    expect(VALID_STATUSES).toContain(belief.status);
  });

  it.each(beliefEntries)('%s has a non-empty note', (_name, belief) => {
    expect(belief.note.length).toBeGreaterThan(0);
  });

  it('has no duplicate belief names', () => {
    const names = beliefEntries.map(([name]) => name);
    expect(new Set(names).size).toBe(names.length);
  });
});
