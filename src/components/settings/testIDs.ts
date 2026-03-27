export const DATA_MANAGEMENT_CARD_IDS = {
  restoreBackupButton: { id: 'restore-backup-button', type: 'button' as const },
};

export const PORTAL_ACCOUNTS_CARD_IDS = {
  container: { id: 'portal-accounts-card', type: 'container' as const },
  credentialRow: (portalCode: string) => ({ id: `portal-credential-row-${portalCode}`, type: 'container' as const }),
};
