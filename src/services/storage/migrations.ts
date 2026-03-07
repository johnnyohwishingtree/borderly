import { schemaMigrations } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    // Note: WatermelonDB v2 indexes are handled automatically when isIndexed: true is set in the schema
    // No explicit migration steps are required for adding indexes to existing columns
    // The database adapter will create indexes automatically on schema upgrade
    {
      toVersion: 2,
      steps: [
        // No explicit steps needed - WatermelonDB handles index creation automatically
        // when the schema is updated with isIndexed: true
      ],
    },
  ],
});
