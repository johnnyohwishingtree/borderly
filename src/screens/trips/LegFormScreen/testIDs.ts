export const LEG_FORM_IDS = {
  // Scrollable area
  smartDeltaButton: { id: 'smart-delta-button', type: 'button' as const },
  dynamicForm: { id: 'dynamic-form', type: 'container' as const },

  // Fixed bottom bar (outside ScrollView — never needs scrolling)
  actionButtonsBar: { id: 'action-buttons-bar', type: 'container' as const, fixed: true as const },
  markReadyButton: { id: 'mark-ready-button', type: 'button' as const, fixed: true as const },
  saveProgressButton: { id: 'save-progress-button', type: 'button' as const, fixed: true as const },
  submitInAppButton: { id: 'submit-in-app-button', type: 'button' as const, fixed: true as const },
  openSubmissionGuideButton: { id: 'open-submission-guide-button', type: 'button' as const, fixed: true as const },
};
