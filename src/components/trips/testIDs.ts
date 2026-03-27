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
