export const PROFILE_SELECTOR_IDS = {
  container: { id: 'profile-selector', type: 'container' as const },
  trigger: { id: 'profile-selector-trigger', type: 'button' as const },
  label: { id: 'profile-selector-label', type: 'text' as const },
  dropdown: { id: 'profile-selector-dropdown', type: 'container' as const },
  option: (profileId: string) => ({ id: `profile-option-${profileId}`, type: 'button' as const }),
  selectedDot: (profileId: string) => ({ id: `profile-selected-dot-${profileId}`, type: 'container' as const }),
};

export const AUTOFILL_BANNER_IDS = {
  container: { id: 'autofill-banner', type: 'container' as const },
  message: { id: 'autofill-banner-message', type: 'text' as const },
  expandToggle: { id: 'autofill-banner-expand-toggle', type: 'button' as const },
  dismiss: { id: 'autofill-banner-dismiss', type: 'button' as const },
  details: { id: 'autofill-banner-details', type: 'container' as const },
  result: (fieldId: string) => ({ id: `autofill-result-${fieldId}`, type: 'container' as const }),
};

export const AUTOFILL_PILL_IDS = {
  container: { id: 'autofill-pill', type: 'container' as const },
  dismiss: { id: 'autofill-pill-dismiss', type: 'button' as const },
  profileSelector: { id: 'autofill-pill-profile-selector', type: 'container' as const },
  singleProfile: { id: 'autofill-pill-single-profile', type: 'text' as const },
  fillButton: { id: 'autofill-pill-fill-button', type: 'button' as const },
};

export const CREDENTIAL_PROMPT_IDS = {
  modal: { id: 'credential-prompt-modal', type: 'container' as const },
  backdrop: { id: 'credential-prompt-backdrop', type: 'button' as const },
  sheet: { id: 'credential-prompt-sheet', type: 'container' as const },
  title: { id: 'credential-prompt-title', type: 'text' as const },
  subtitle: { id: 'credential-prompt-subtitle', type: 'text' as const },
  username: { id: 'credential-prompt-username', type: 'Input' as const },
  password: { id: 'credential-prompt-password', type: 'Input' as const },
  togglePassword: { id: 'credential-prompt-toggle-password', type: 'button' as const },
  skip: { id: 'credential-prompt-skip', type: 'button' as const },
  save: { id: 'credential-prompt-save', type: 'button' as const },
};

export const QR_SAVE_OVERLAY_IDS = {
  container: { id: 'qr-save-overlay', type: 'container' as const },
  title: { id: 'qr-overlay-title', type: 'text' as const },
  subtitle: { id: 'qr-overlay-subtitle', type: 'text' as const },
  dismissButton: { id: 'qr-overlay-dismiss', type: 'button' as const },
  preview: { id: 'qr-overlay-preview', type: 'container' as const },
  image: { id: 'qr-overlay-image', type: 'image' as const },
  confirmation: { id: 'qr-overlay-confirmation', type: 'container' as const },
  refNumber: { id: 'qr-overlay-ref-number', type: 'text' as const },
  error: { id: 'qr-overlay-error', type: 'container' as const },
  openWalletButton: { id: 'qr-overlay-open-wallet', type: 'button' as const },
  backToTripButton: { id: 'qr-overlay-back-to-trip', type: 'button' as const },
  saveButton: { id: 'qr-overlay-save-button', type: 'button' as const },
  skipButton: { id: 'qr-overlay-skip-button', type: 'button' as const },
};
