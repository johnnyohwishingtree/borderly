import type { TestMeta } from '@/types/testMeta';

export const SMART_FORM_IDS: Record<string, TestMeta> = {
  // Scroll content
  countrySection: { id: 'country-section', type: 'container', zone: 'scroll' },
  dynamicForm: { id: 'smart-form-dynamic', type: 'container', zone: 'scroll' },

  // Footer
  doneButton: { id: 'smart-form-done-button', type: 'button', zone: 'footer' },
};
