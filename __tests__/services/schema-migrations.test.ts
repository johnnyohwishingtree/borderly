/**
 * Tests that WatermelonDB schema and migrations are correctly configured.
 * These catch runtime errors like "Invalid migration to version X" that
 * unit tests with mocked WatermelonDB won't catch.
 */

// Unmock WatermelonDB so we test the real schema/migration validation
jest.unmock('@nozbe/watermelondb');
jest.unmock('@nozbe/watermelondb/Schema/migrations');

import { appSchema, tableSchema } from '@nozbe/watermelondb';
import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

describe('WatermelonDB Schema and Migrations', () => {
  it('schema should be valid and have version >= 1', () => {
    const { schema } = require('../../src/services/storage/schema');
    expect(schema).toBeDefined();
    expect(schema.version).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(schema.version)).toBe(true);
  });

  it('migrations should not contain a migration to version 1', () => {
    // WatermelonDB requires migrations to start from version 2.
    // Version 1 is always created from the schema definition, never via migration.
    const { migrations } = require('../../src/services/storage/migrations');
    expect(migrations).toBeDefined();
    const migrationList = migrations.migrations || [];
    const migrationVersions = migrationList.map((m: any) => m.toVersion);
    expect(migrationVersions).not.toContain(1);
  });

  it('migration versions should be sequential starting from 2', () => {
    const { migrations } = require('../../src/services/storage/migrations');
    const migrationList = migrations.migrations || [];
    const migrationVersions = migrationList
      .map((m: any) => m.toVersion)
      .sort((a: number, b: number) => a - b);

    for (let i = 0; i < migrationVersions.length; i++) {
      expect(migrationVersions[i]).toBe(i + 2);
    }
  });

  it('highest migration version should match schema version', () => {
    const { schema } = require('../../src/services/storage/schema');
    const { migrations } = require('../../src/services/storage/migrations');
    const migrationList = migrations.migrations || [];
    const migrationVersions = migrationList.map((m: any) => m.toVersion);

    if (migrationVersions.length === 0) {
      // No migrations means schema should be version 1
      expect(schema.version).toBe(1);
    } else {
      const maxMigrationVersion = Math.max(...migrationVersions);
      expect(schema.version).toBe(maxMigrationVersion);
    }
  });

  it('schema should define required tables', () => {
    const { schema } = require('../../src/services/storage/schema');
    expect(schema.tables).toBeDefined();
    const tableNames = Object.keys(schema.tables);
    expect(tableNames).toContain('trips');
    expect(tableNames).toContain('trip_legs');
    expect(tableNames).toContain('saved_qr_codes');
  });

  it('schemaMigrations should not throw with current config', () => {
    // This validates that the migration config is accepted by WatermelonDB
    expect(() => {
      require('../../src/services/storage/migrations');
    }).not.toThrow();
  });
});
