import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const schema = appSchema({
  version: 2,
  tables: [
    tableSchema({
      name: 'trips',
      columns: [
        { name: 'name', type: 'string' },
        { name: 'status', type: 'string', isIndexed: true }, // 'upcoming' | 'active' | 'completed' - indexed for filtering
        { name: 'created_at', type: 'number', isIndexed: true }, // Indexed for sorting by creation date
        { name: 'updated_at', type: 'number', isIndexed: true }, // Indexed for sorting by update date
      ],
    }),
    tableSchema({
      name: 'trip_legs',
      columns: [
        { name: 'trip_id', type: 'string', isIndexed: true },
        { name: 'destination_country', type: 'string', isIndexed: true }, // ISO 3166-1 alpha-3 - indexed for country filtering
        { name: 'arrival_date', type: 'number', isIndexed: true }, // Timestamp - indexed for date range queries
        { name: 'departure_date', type: 'number', isOptional: true, isIndexed: true }, // Timestamp - indexed for date range queries
        { name: 'flight_number', type: 'string', isOptional: true },
        { name: 'airline_code', type: 'string', isOptional: true }, // IATA 2-letter
        { name: 'arrival_airport', type: 'string', isOptional: true }, // IATA 3-letter
        { name: 'accommodation', type: 'string' }, // JSON string
        { name: 'form_status', type: 'string', isIndexed: true }, // 'not_started' | 'in_progress' | 'ready' | 'submitted' - indexed for form status filtering
        { name: 'form_data', type: 'string', isOptional: true }, // JSON string
        { name: 'order', type: 'number', isIndexed: true }, // Leg ordering within trip - indexed for sorting
      ],
    }),
    tableSchema({
      name: 'saved_qr_codes',
      columns: [
        { name: 'leg_id', type: 'string', isIndexed: true },
        { name: 'type', type: 'string', isIndexed: true }, // 'immigration' | 'customs' | 'health' | 'combined' - indexed for type filtering
        { name: 'image_base64', type: 'string' }, // Base64 encoded image
        { name: 'saved_at', type: 'number', isIndexed: true }, // Timestamp - indexed for date sorting
        { name: 'label', type: 'string' }, // User-friendly label
      ],
    }),
  ],
});
