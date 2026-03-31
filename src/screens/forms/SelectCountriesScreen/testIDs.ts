import type { TestMeta } from '@/types/testMeta';

export const SELECT_COUNTRIES_IDS: Record<string, TestMeta> = {
  // Header (pinned — search + chips)
  searchField: { id: 'country-search-field', type: 'Input', zone: 'header' },
  chipRow: { id: 'country-chip-row', type: 'container', zone: 'header' },
  countryChip: { id: 'country-chip', type: 'button', zone: 'header' },
  scanBoardingPassButton: { id: 'scan-boarding-pass-button', type: 'button', zone: 'header' },

  // Scroll content (FlatList)
  countryList: { id: 'country-list', type: 'container', zone: 'scroll' },
  countryRow: { id: 'country-row', type: 'button', zone: 'scroll' },

  // Footer
  nextButton: { id: 'select-countries-next-button', type: 'button', zone: 'footer' },
};
