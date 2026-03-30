export const CONFIRM_PROFILE_IDS = {
  confirmGoBackButton: { id: 'confirm-go-back-button', type: 'button' as const },
  continueToSecurityButton: { id: 'continue-to-security-button', type: 'button' as const, zone: 'footer' as const },
  editInformationButton: { id: 'edit-information-button', type: 'button' as const, zone: 'footer' as const },
  confirmProfileTitle: { id: 'confirm-profile-title', type: 'text' as const },
  profileField: { id: 'profile-field', type: 'text' as const, dynamic: 'profile-field-{label}' },
};
