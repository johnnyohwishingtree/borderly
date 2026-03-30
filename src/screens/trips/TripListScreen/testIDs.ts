import type { TestMeta } from '@/types/testMeta';

export const TRIP_LIST_IDS: Record<string, TestMeta> = {
  // Header area
  importTripButton: { id: 'import-trip-button', type: 'button', zone: 'header' },
  tripSearchField: { id: 'trip-search-field', type: 'Input', zone: 'header' },
  tripSearchClear: { id: 'trip-search-clear', type: 'button', zone: 'header' },

  // Scroll content
  createFirstTripButton: { id: 'create-first-trip-button', type: 'button', zone: 'scroll' },
  tripListDeadlineSummary: { id: 'trip-list-deadline-summary', type: 'container', zone: 'scroll' },
  firstRunWelcomeBanner: { id: 'first-run-welcome-banner', type: 'container', zone: 'scroll' },
  schemaUpdateBanner: { id: 'schema-update-banner', type: 'container', zone: 'scroll' },
  tripFilterTab: { id: 'trip-filter-${key}', type: 'button', zone: 'header', dynamic: true },

  // Modal (overlay)
  tripListDuplicateTripModal: { id: 'trip-list-duplicate-trip-modal', type: 'container' },
};
