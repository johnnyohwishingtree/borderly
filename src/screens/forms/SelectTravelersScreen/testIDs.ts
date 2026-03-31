import type { TestMeta } from '@/types/testMeta';

export const SELECT_TRAVELERS_IDS: Record<string, TestMeta> = {
  // Scroll content
  travelerCard: { id: 'traveler-card', type: 'button', zone: 'scroll' },
  addTravelerButton: { id: 'add-traveler-button', type: 'button', zone: 'scroll' },
  passportWarningBadge: { id: 'passport-warning-badge', type: 'container', zone: 'scroll' },

  // Footer
  nextButton: { id: 'select-travelers-next-button', type: 'button', zone: 'footer' },
};
