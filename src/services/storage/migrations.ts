import { schemaMigrations, createTable } from '@nozbe/watermelondb/Schema/migrations';

export const migrations = schemaMigrations({
  migrations: [
    // Version 1 - Initial schema
    {
      toVersion: 1,
      steps: [
        createTable({
          name: 'trips',
          columns: [
            { name: 'name', type: 'string' },
            { name: 'status', type: 'string' },
            { name: 'created_at', type: 'number' },
            { name: 'updated_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'trip_legs',
          columns: [
            { name: 'trip_id', type: 'string', isIndexed: true },
            { name: 'destination_country', type: 'string' },
            { name: 'arrival_date', type: 'number' },
            { name: 'departure_date', type: 'number', isOptional: true },
            { name: 'flight_number', type: 'string', isOptional: true },
            { name: 'airline_code', type: 'string', isOptional: true },
            { name: 'arrival_airport', type: 'string', isOptional: true },
            { name: 'accommodation', type: 'string' },
            { name: 'form_status', type: 'string' },
            { name: 'form_data', type: 'string', isOptional: true },
            { name: 'order', type: 'number' },
          ],
        }),
        createTable({
          name: 'saved_qr_codes',
          columns: [
            { name: 'leg_id', type: 'string', isIndexed: true },
            { name: 'type', type: 'string' },
            { name: 'image_base64', type: 'string' },
            { name: 'saved_at', type: 'number' },
            { name: 'label', type: 'string' },
          ],
        }),
      ],
    },
  ],
});
