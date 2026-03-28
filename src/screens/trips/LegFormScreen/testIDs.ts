import type { TestMeta } from '@/types/testMeta';

export const LEG_FORM_IDS: Record<string, TestMeta> = {
  // Header area
  smartDeltaButton: { id: 'smart-delta-button', type: 'button', zone: 'header' },

  // Scroll content (dynamic form fields — no static testIDs here)
  dynamicForm: { id: 'dynamic-form', type: 'container', zone: 'scroll' },

  // Footer bar (always visible, outside ScrollView)
  actionButtonsBar: { id: 'action-buttons-bar', type: 'container', zone: 'footer' },
  markReadyButton: { id: 'mark-ready-button', type: 'button', zone: 'footer' },
  saveProgressButton: { id: 'save-progress-button', type: 'button', zone: 'footer' },
  submitInAppButton: { id: 'submit-in-app-button', type: 'button', zone: 'footer' },
  openSubmissionGuideButton: { id: 'open-submission-guide-button', type: 'button', zone: 'footer' },
};
