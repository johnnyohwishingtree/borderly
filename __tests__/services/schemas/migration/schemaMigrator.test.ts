/**
 * Tests for schemas/migration/schemaMigrator
 */

import { schemaMigrator } from '@/services/schemas/migration/schemaMigrator';
import { SchemaMigration } from '@/types/schema';

// Mock the schema validator to avoid pulling in full schema validation
jest.mock('@/services/schemas/validation', () => ({
  schemaValidator: {
    validateSchema: jest.fn().mockResolvedValue({ valid: true, errors: [], warnings: [] }),
  },
}));

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeMigration(overrides?: Partial<SchemaMigration>): SchemaMigration {
  return {
    fromVersion: '1.0.0',
    toVersion: '1.1.0',
    transformations: [],
    description: 'Test migration',
    reversible: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// createReverseMigration
// ---------------------------------------------------------------------------
describe('createReverseMigration', () => {
  it('returns null for non-reversible migrations', () => {
    const migration = makeMigration({ reversible: false });
    expect(schemaMigrator.createReverseMigration(migration)).toBeNull();
  });

  it('swaps fromVersion and toVersion', () => {
    const migration = makeMigration({ fromVersion: '1.0.0', toVersion: '2.0.0' });
    const reverse = schemaMigrator.createReverseMigration(migration);
    expect(reverse?.fromVersion).toBe('2.0.0');
    expect(reverse?.toVersion).toBe('1.0.0');
  });

  it('reverses an add operation to remove', () => {
    const migration = makeMigration({
      transformations: [{ operation: 'add', path: 'newField', defaultValue: 'x' }],
    });
    const reverse = schemaMigrator.createReverseMigration(migration);
    expect(reverse?.transformations[0].operation).toBe('remove');
    expect(reverse?.transformations[0].path).toBe('newField');
  });

  it('reverses a remove operation to add', () => {
    const migration = makeMigration({
      transformations: [{ operation: 'remove', path: 'oldField', defaultValue: 'fallback' }],
    });
    const reverse = schemaMigrator.createReverseMigration(migration);
    expect(reverse?.transformations[0].operation).toBe('add');
  });

  it('reverses a rename operation by swapping paths', () => {
    const migration = makeMigration({
      transformations: [{ operation: 'rename', path: 'old', newPath: 'new' }],
    });
    const reverse = schemaMigrator.createReverseMigration(migration);
    expect(reverse?.transformations[0].path).toBe('new');
    expect(reverse?.transformations[0].newPath).toBe('old');
  });

  it('throws for transform operations (not auto-reversible)', () => {
    const migration = makeMigration({
      transformations: [{ operation: 'transform', path: 'field', transformer: 'toUpperCase' }],
    });
    expect(() => schemaMigrator.createReverseMigration(migration)).toThrow('cannot be automatically reversed');
  });

  it('reverses transformation order', () => {
    const migration = makeMigration({
      transformations: [
        { operation: 'add', path: 'first', defaultValue: 1 },
        { operation: 'add', path: 'second', defaultValue: 2 },
      ],
    });
    const reverse = schemaMigrator.createReverseMigration(migration);
    expect(reverse?.transformations[0].path).toBe('second');
    expect(reverse?.transformations[1].path).toBe('first');
  });
});

// ---------------------------------------------------------------------------
// validateMigration
// ---------------------------------------------------------------------------
describe('validateMigration', () => {
  it('passes for a valid migration', async () => {
    const migration = makeMigration({
      transformations: [{ operation: 'add', path: 'newField', defaultValue: 'x' }],
    });
    const result = await schemaMigrator.validateMigration(migration);
    expect(result.valid).toBe(true);
  });

  it('errors on invalid fromVersion format', async () => {
    const migration = makeMigration({ fromVersion: 'bad' });
    const result = await schemaMigrator.validateMigration(migration);
    expect(result.errors.some(e => e.message.includes('semantic versioning'))).toBe(true);
  });

  it('errors on invalid toVersion format', async () => {
    const migration = makeMigration({ toVersion: 'x.y' });
    const result = await schemaMigrator.validateMigration(migration);
    expect(result.errors.some(e => e.message.includes('semantic versioning'))).toBe(true);
  });

  it('errors on invalid operation', async () => {
    const migration = makeMigration({
      transformations: [{ operation: 'delete' as never, path: 'x' }],
    });
    const result = await schemaMigrator.validateMigration(migration);
    expect(result.errors.some(e => e.message.includes('Invalid operation'))).toBe(true);
  });

  it('errors when rename has no newPath', async () => {
    const migration = makeMigration({
      transformations: [{ operation: 'rename', path: 'x' }],
    });
    const result = await schemaMigrator.validateMigration(migration);
    expect(result.errors.some(e => e.message.includes('newPath is required'))).toBe(true);
  });

  it('errors when transform has no transformer', async () => {
    const migration = makeMigration({
      transformations: [{ operation: 'transform', path: 'x' }],
    });
    const result = await schemaMigrator.validateMigration(migration);
    expect(result.errors.some(e => e.message.includes('transformer is required'))).toBe(true);
  });

  it('errors when transformation has no path', async () => {
    const migration = makeMigration({
      transformations: [{ operation: 'add', path: '' }],
    });
    const result = await schemaMigrator.validateMigration(migration);
    expect(result.errors.some(e => e.message.includes('Path is required'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isMigrationNeeded
// ---------------------------------------------------------------------------
describe('isMigrationNeeded', () => {
  it('returns false for same versions', () => {
    expect(schemaMigrator.isMigrationNeeded('1.0.0', '1.0.0')).toBe(false);
  });

  it('returns true for different versions', () => {
    expect(schemaMigrator.isMigrationNeeded('1.0.0', '2.0.0')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// generateMigration
// ---------------------------------------------------------------------------
describe('generateMigration', () => {
  it('generates a migration between two schema versions', () => {
    const from = { schemaVersion: '1.0.0' } as never;
    const to = { schemaVersion: '2.0.0' } as never;
    const migration = schemaMigrator.generateMigration(from, to);
    expect(migration.fromVersion).toBe('1.0.0');
    expect(migration.toVersion).toBe('2.0.0');
    expect(migration.reversible).toBe(true);
  });

  it('uses custom description when provided', () => {
    const from = { schemaVersion: '1.0.0' } as never;
    const to = { schemaVersion: '2.0.0' } as never;
    const migration = schemaMigrator.generateMigration(from, to, 'Custom desc');
    expect(migration.description).toBe('Custom desc');
  });

  it('generates a default description when none provided', () => {
    const from = { schemaVersion: '1.0.0' } as never;
    const to = { schemaVersion: '1.1.0' } as never;
    const migration = schemaMigrator.generateMigration(from, to);
    expect(migration.description).toContain('1.0.0');
    expect(migration.description).toContain('1.1.0');
  });
});

// ---------------------------------------------------------------------------
// applyMigration (single migration)
// ---------------------------------------------------------------------------
describe('applyMigration', () => {
  it('applies an add transformation', async () => {
    const schema = { schemaVersion: '1.0.0', lastUpdated: '' } as never;
    const migration = makeMigration({
      transformations: [{ operation: 'add', path: 'newField', defaultValue: 'hello' }],
    });
    const result = await schemaMigrator.applyMigration(schema, migration);
    expect((result as unknown as Record<string, unknown>).newField).toBe('hello');
    expect(result.schemaVersion).toBe('1.1.0');
  });

  it('applies a remove transformation', async () => {
    const schema = { schemaVersion: '1.0.0', lastUpdated: '', toRemove: 'bye' } as never;
    const migration = makeMigration({
      transformations: [{ operation: 'remove', path: 'toRemove' }],
    });
    const result = await schemaMigrator.applyMigration(schema, migration);
    expect((result as unknown as Record<string, unknown>).toRemove).toBeUndefined();
  });

  it('applies a rename transformation', async () => {
    const schema = { schemaVersion: '1.0.0', lastUpdated: '', oldName: 'value' } as never;
    const migration = makeMigration({
      transformations: [{ operation: 'rename', path: 'oldName', newPath: 'newName' }],
    });
    const result = await schemaMigrator.applyMigration(schema, migration);
    expect((result as unknown as Record<string, unknown>).oldName).toBeUndefined();
    expect((result as unknown as Record<string, unknown>).newName).toBe('value');
  });

  it('applies a built-in transformer (toUpperCase)', async () => {
    const schema = { schemaVersion: '1.0.0', lastUpdated: '', name: 'hello' } as never;
    const migration = makeMigration({
      transformations: [{ operation: 'transform', path: 'name', transformer: 'toUpperCase' }],
    });
    const result = await schemaMigrator.applyMigration(schema, migration);
    expect((result as unknown as Record<string, unknown>).name).toBe('HELLO');
  });

  it('throws on unknown transformer name', async () => {
    const schema = { schemaVersion: '1.0.0', lastUpdated: '', x: 1 } as never;
    const migration = makeMigration({
      transformations: [{ operation: 'transform', path: 'x', transformer: 'nonexistent' }],
    });
    await expect(schemaMigrator.applyMigration(schema, migration)).rejects.toThrow('Unknown transformer');
  });
});
