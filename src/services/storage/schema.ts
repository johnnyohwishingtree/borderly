import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'trips',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'status', type: 'string' }, // 'upcoming' | 'active' | 'completed'
        { name: 'created_at', type: 'number' },
        { name: 'updated_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'trip_legs',
      columns: [
        { name: 'trip_id', type: 'string', isIndexed: true },
        { name: 'destination_country', type: 'string' }, // ISO 3166-1 alpha-3
        { name: 'arrival_date', type: 'number' }, // Timestamp
        { name: 'departure_date', type: 'number', isOptional: true }, // Timestamp
        { name: 'flight_number', type: 'string', isOptional: true },
        { name: 'airline_code', type: 'string', isOptional: true }, // IATA 2-letter
        { name: 'arrival_airport', type: 'string', isOptional: true }, // IATA 3-letter
        { name: 'accommodation', type: 'string' }, // JSON string
        { name: 'form_status', type: 'string' }, // 'not_started' | 'in_progress' | 'ready' | 'submitted'
        { name: 'form_data', type: 'string', isOptional: true }, // JSON string
        { name: 'order', type: 'number' }, // Leg ordering within trip
      ],
    }),
    tableSchema({
      name: 'saved_qr_codes',
      columns: [
        { name: 'leg_id', type: 'string', isIndexed: true },
        { name: 'type', type: 'string' }, // 'immigration' | 'customs' | 'health' | 'combined'
        { name: 'image_base64', type: 'string' }, // Base64 encoded image
        { name: 'saved_at', type: 'number' }, // Timestamp
        { name: 'label', type: 'string' }, // User-friendly label
      ],
    }),
  ],
});