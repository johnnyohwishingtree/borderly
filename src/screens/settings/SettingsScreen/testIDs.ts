export const SETTINGS_IDS = {
  appLockCard: { id: 'app-lock-card', type: 'Card' as const },
  appLockUnavailable: { id: 'app-lock-unavailable', type: 'View' as const },
  appLockToggle: { id: 'app-lock-toggle', type: 'Toggle' as const },
  appLockTimeoutSection: { id: 'app-lock-timeout-section', type: 'View' as const },
  appLockTimeoutSelect: { id: 'app-lock-timeout-select', type: 'Select' as const },
  notificationSettingsCard: { id: 'notification-settings-card', type: 'Card' as const },
  notificationPreferencesRow: { id: 'notification-preferences-row', type: 'Pressable' as const },
  settingsThemeSelector: { id: 'settings-theme-selector', type: 'ThemeSelector' as const },
  formDataCard: { id: 'form-data-card', type: 'Card' as const },
  schemaRow: { id: 'schema-row', type: 'View' as const, dynamic: true },
  refreshSchemasButton: { id: 'refresh-schemas-button', type: 'button' as const },
};
