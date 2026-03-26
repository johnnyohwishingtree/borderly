/**
 * Tests for schemas/migration/pathUtils
 */

import {
  compareVersions,
  sortMigrationsByVersion,
  findMigrationPath,
  navigateToParent,
  getValueAtPath,
  setValueAtPath,
} from '@/services/schemas/migration/pathUtils';
import { SchemaMigration } from '@/types/schema';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeMigration(from: string, to: string): SchemaMigration {
  return {
    fromVersion: from,
    toVersion: to,
    transformations: [],
    description: `${from} → ${to}`,
    reversible: true,
  };
}

// ---------------------------------------------------------------------------
// compareVersions
// ---------------------------------------------------------------------------
describe('compareVersions', () => {
  it('returns 0 for equal versions', () => {
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
  });

  it('returns negative when first version is lower (major)', () => {
    expect(compareVersions('1.0.0', '2.0.0')).toBeLessThan(0);
  });

  it('returns positive when first version is higher (major)', () => {
    expect(compareVersions('3.0.0', '1.0.0')).toBeGreaterThan(0);
  });

  it('compares minor versions correctly', () => {
    expect(compareVersions('1.2.0', '1.3.0')).toBeLessThan(0);
    expect(compareVersions('1.5.0', '1.3.0')).toBeGreaterThan(0);
  });

  it('compares patch versions correctly', () => {
    expect(compareVersions('1.0.1', '1.0.2')).toBeLessThan(0);
    expect(compareVersions('1.0.5', '1.0.3')).toBeGreaterThan(0);
  });

  it('handles partial versions gracefully', () => {
    expect(compareVersions('1', '1.0.0')).toBe(0);
    expect(compareVersions('2.1', '2.1.0')).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// sortMigrationsByVersion
// ---------------------------------------------------------------------------
describe('sortMigrationsByVersion', () => {
  it('sorts migrations by fromVersion ascending', () => {
    const migrations = [
      makeMigration('2.0.0', '3.0.0'),
      makeMigration('1.0.0', '2.0.0'),
      makeMigration('3.0.0', '4.0.0'),
    ];
    const sorted = sortMigrationsByVersion(migrations);
    expect(sorted.map(m => m.fromVersion)).toEqual(['1.0.0', '2.0.0', '3.0.0']);
  });

  it('does not mutate the original array', () => {
    const migrations = [makeMigration('2.0.0', '3.0.0'), makeMigration('1.0.0', '2.0.0')];
    sortMigrationsByVersion(migrations);
    expect(migrations[0].fromVersion).toBe('2.0.0');
  });

  it('returns empty array for empty input', () => {
    expect(sortMigrationsByVersion([])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// findMigrationPath
// ---------------------------------------------------------------------------
describe('findMigrationPath', () => {
  const migrations = [
    makeMigration('1.0.0', '1.1.0'),
    makeMigration('1.1.0', '1.2.0'),
    makeMigration('1.2.0', '2.0.0'),
  ];

  it('returns empty array when source equals target', () => {
    expect(findMigrationPath('1.0.0', '1.0.0', migrations)).toEqual([]);
  });

  it('finds a single-step path', () => {
    const path = findMigrationPath('1.0.0', '1.1.0', migrations);
    expect(path).toHaveLength(1);
    expect(path[0].fromVersion).toBe('1.0.0');
    expect(path[0].toVersion).toBe('1.1.0');
  });

  it('finds a multi-step path', () => {
    const path = findMigrationPath('1.0.0', '2.0.0', migrations);
    expect(path).toHaveLength(3);
    expect(path.map(m => m.toVersion)).toEqual(['1.1.0', '1.2.0', '2.0.0']);
  });

  it('throws when no path exists', () => {
    expect(() => findMigrationPath('1.0.0', '5.0.0', migrations)).toThrow('No migration path found');
  });

  it('finds shortest path when multiple routes exist', () => {
    const multiPath = [
      ...migrations,
      makeMigration('1.0.0', '2.0.0'), // shortcut
    ];
    const path = findMigrationPath('1.0.0', '2.0.0', multiPath);
    expect(path).toHaveLength(1); // BFS finds shortest
  });
});

// ---------------------------------------------------------------------------
// navigateToParent
// ---------------------------------------------------------------------------
describe('navigateToParent', () => {
  it('navigates to parent of a nested path', () => {
    const obj = { a: { b: { c: 42 } } };
    expect(navigateToParent(obj, ['a', 'b', 'c'])).toBe(obj.a.b);
  });

  it('returns the root object for a single-part path', () => {
    const obj = { x: 1 };
    expect(navigateToParent(obj, ['x'])).toBe(obj);
  });

  it('returns null when path does not exist', () => {
    expect(navigateToParent({ a: 1 }, ['x', 'y', 'z'])).toBeNull();
  });

  it('handles array indices in the path', () => {
    const obj = { items: [{ name: 'first' }, { name: 'second' }] };
    expect(navigateToParent(obj, ['items', '1', 'name'])).toBe(obj.items[1]);
  });
});

// ---------------------------------------------------------------------------
// getValueAtPath
// ---------------------------------------------------------------------------
describe('getValueAtPath', () => {
  it('returns the value at a dot-separated path', () => {
    expect(getValueAtPath({ a: { b: 42 } }, 'a.b')).toBe(42);
  });

  it('returns undefined for a missing path', () => {
    expect(getValueAtPath({ a: 1 }, 'x.y')).toBeUndefined();
  });

  it('handles array access by index', () => {
    expect(getValueAtPath({ items: ['a', 'b', 'c'] }, 'items.1')).toBe('b');
  });

  it('returns the root value for a single-segment path', () => {
    expect(getValueAtPath({ name: 'test' }, 'name')).toBe('test');
  });
});

// ---------------------------------------------------------------------------
// setValueAtPath
// ---------------------------------------------------------------------------
describe('setValueAtPath', () => {
  it('sets a value at a dot-separated path', () => {
    const obj = { a: { b: 1 } };
    setValueAtPath(obj, 'a.b', 99);
    expect(obj.a.b).toBe(99);
  });

  it('sets a value at a top-level key', () => {
    const obj: Record<string, unknown> = { x: 'old' };
    setValueAtPath(obj, 'x', 'new');
    expect(obj.x).toBe('new');
  });

  it('sets a value in an array by index', () => {
    const obj = { items: [10, 20, 30] };
    setValueAtPath(obj, 'items.1', 99);
    expect(obj.items[1]).toBe(99);
  });

  it('does nothing when parent path does not exist', () => {
    const obj = { a: 1 };
    setValueAtPath(obj, 'x.y.z', 42);
    expect(obj).toEqual({ a: 1 }); // unchanged
  });
});
