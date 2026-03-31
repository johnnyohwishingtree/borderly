import type { TestMeta } from '@/types/testMeta';

export const SELECT_COUNTRIES_IDS: Record<string, TestMeta> = {
  // Header
  screenTitle: { id: 'select-countries-title', type: 'container', zone: 'header' },

  // Scroll content
  countryList: { id: 'country-list', type: 'container', zone: 'scroll' },
  countryChip: { id: 'country-chip', type: 'button', zone: 'scroll' },
  scanBoardingPassButton: { id: 'scan-boarding-pass-button', type: 'button', zone: 'scroll' },

  // Footer
  nextButton: { id: 'select-countries-next-button', type: 'button', zone: 'footer' },
};
