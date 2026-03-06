import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    // No migrations needed yet - version 1 is the initial schema
    // When upgrading to version 2, add a migration here:
    // { toVersion: 2, steps: [...] }
  ],
});
