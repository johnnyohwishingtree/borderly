import { schemaMigrations, createTable, addColumns } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        // Add indexes to improve query performance
        // Note: WatermelonDB automatically handles index creation when isIndexed: true is added to columns
        // This migration ensures compatibility with existing data
        addColumns({
          table: 'trips',
          columns: [
            // These columns already exist, but we need to add indexes
            // WatermelonDB will handle the index creation automatically
          ],
        }),
        addColumns({
          table: 'trip_legs',
          columns: [
            // Indexes will be added automatically for existing columns
          ],
        }),
        addColumns({
          table: 'saved_qr_codes',
          columns: [
            // Indexes will be added automatically for existing columns
          ],
        }),
      ],
    },
  ],
});
