export const TRIP_LIST_IDS = {
  importTripButton: { id: 'import-trip-button', type: 'button' as const },
  templatesNavButton: { id: 'templates-nav-button', type: 'button' as const },
  tripSearchField: { id: 'trip-search-field', type: 'TextInput' as const },
  tripSearchClear: { id: 'trip-search-clear', type: 'button' as const },
  fabFromTemplateButton: { id: 'fab-from-template-button', type: 'button' as const, fixed: true as const },
  firstRunWelcomeBanner: { id: 'first-run-welcome-banner', type: 'InfoBanner' as const },
  schemaUpdateBanner: { id: 'schema-update-banner', type: 'InfoBanner' as const },
  tripFilterTab: { id: 'trip-filter-${key}', type: 'button' as const, dynamic: true as const },
  createFirstTripButton: { id: 'create-first-trip-button', type: 'button' as const },
  useTemplateButton: { id: 'use-template-button', type: 'button' as const },
  tripListDeadlineSummary: { id: 'trip-list-deadline-summary', type: 'View' as const },
  tripListDuplicateTripModal: { id: 'trip-list-duplicate-trip-modal', type: 'Modal' as const },
};
