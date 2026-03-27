export const ACCOUNT_SETUP_CHECKLIST_IDS = {
  container: { id: 'account-setup-checklist', type: 'container' as const },
  loading: { id: 'account-setup-loading', type: 'container' as const },
  accountRow: (countryCode: string) => ({ id: `account-row-${countryCode}`, type: 'container' as const }),
  saveCredentialsHint: (countryCode: string) => ({ id: `save-credentials-hint-${countryCode}`, type: 'text' as const }),
  resetAccount: (countryCode: string) => ({ id: `reset-account-${countryCode}`, type: 'button' as const }),
  signupWebviewModal: { id: 'signup-webview-modal', type: 'container' as const },
  signupModalClose: { id: 'signup-modal-close', type: 'button' as const },
  signupModalMarkReady: { id: 'signup-modal-mark-ready', type: 'button' as const },
  signupWebviewLoading: { id: 'signup-webview-loading', type: 'container' as const },
  signupWebview: { id: 'signup-webview', type: 'container' as const },
  credentialPrompt: { id: 'account-setup-credential-prompt', type: 'container' as const },
};

export const EDIT_TRIP_MODAL_IDS = {
  modal: { id: 'edit-trip-modal', type: 'container' as const },
  cancelButton: { id: 'edit-modal-cancel', type: 'button' as const },
  saveLegButton: { id: 'save-leg-button', type: 'button' as const },
  tripNameField: { id: 'edit-trip-name-field', type: 'field' as const },
  saveTripNameButton: { id: 'save-trip-name-button', type: 'button' as const },
  editLegButton: (legId: string) => ({ id: `edit-leg-${legId}-button`, type: 'button' as const }),
  addDestinationButton: { id: 'edit-modal-add-destination', type: 'button' as const },
};

export const ADD_DESTINATION_MODAL_IDS = {
  modal: { id: 'add-destination-modal', type: 'container' as const },
  cancelButton: { id: 'add-modal-cancel', type: 'button' as const },
  confirmButton: { id: 'confirm-add-destination-button', type: 'button' as const },
};

export const READINESS_CHECKLIST_IDS = {
  container: { id: 'readiness-checklist', type: 'container' as const },
  header: { id: 'readiness-checklist-header', type: 'button' as const },
  body: { id: 'readiness-checklist-body', type: 'container' as const },
  item: (itemId: string) => ({ id: `readiness-item-${itemId}`, type: 'container' as const }),
  category: (category: string) => ({ id: `readiness-category-${category}`, type: 'container' as const }),
};

export const TRIP_CARD_IDS = {
  card: (tripName: string) => ({ id: `trip-card-${tripName}`, type: 'button' as const }),
  urgency: (tripName: string) => ({ id: `trip-card-urgency-${tripName}`, type: 'container' as const }),
  travelers: (tripName: string) => ({ id: `trip-card-travelers-${tripName}`, type: 'container' as const }),
  submissionIndicator: { id: 'trip-card-submission-indicator', type: 'container' as const },
};

export const DUPLICATE_TRIP_MODAL_IDS = {
  modal: { id: 'duplicate-trip-modal', type: 'container' as const },
  cancelButton: { id: 'duplicate-trip-modal-cancel', type: 'button' as const },
  title: { id: 'duplicate-trip-modal-title', type: 'text' as const },
  confirmButton: { id: 'duplicate-trip-modal-confirm', type: 'button' as const },
  loadingIndicator: { id: 'duplicate-trip-loading-indicator', type: 'container' as const },
  departureDate: { id: 'duplicate-trip-departure-date', type: 'field' as const },
  error: { id: 'duplicate-trip-modal-error', type: 'container' as const },
};

export const TRAVELER_AVATARS_IDS = {
  container: { id: 'traveler-avatars', type: 'container' as const },
  avatar: (memberId: string) => ({ id: `traveler-avatar-${memberId}`, type: 'container' as const }),
  overflow: { id: 'traveler-avatar-overflow', type: 'container' as const },
  count: { id: 'traveler-count', type: 'text' as const },
};

export const TRAVELER_TABS_IDS = {
  container: { id: 'traveler-tabs', type: 'container' as const },
  tab: (tabId: string) => ({ id: `traveler-tab-${tabId}`, type: 'button' as const }),
  tabIndicator: (tabId: string) => ({ id: `traveler-tab-indicator-${tabId}`, type: 'container' as const }),
};

export const LEG_CARD_IDS = {
  card: (countryCode: string) => ({ id: `leg-card-${countryCode}`, type: 'button' as const }),
  travelerIndicators: (countryCode: string) => ({ id: `leg-card-traveler-indicators-${countryCode}`, type: 'container' as const }),
  travelerDot: (memberId: string) => ({ id: `leg-traveler-dot-${memberId}`, type: 'container' as const }),
  submissionStatusBadge: (countryCode: string) => ({ id: `submission-status-badge-${countryCode}`, type: 'container' as const }),
  markSubmitted: (countryCode: string) => ({ id: `mark-submitted-${countryCode}`, type: 'button' as const }),
};

export const TRAVELER_PROGRESS_LIST_IDS = {
  container: { id: 'traveler-progress-list', type: 'container' as const },
  travelerRow: (profileId: string) => ({ id: `traveler-progress-${profileId}`, type: 'container' as const }),
};
