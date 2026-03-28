/**
 * Screen registry — auto-generated from source files.
 *
 * DO NOT EDIT testIDs, fields, buttons, alerts, or navigatesTo manually.
 * These are parsed from screen source files by:
 *   npx tsx scripts/generate-screen-registry.ts --write
 *
 * Human-authored fields (waitFor, notes) are preserved across regenerations.
 * Edit those directly in this file.
 */

// ── Types ──

export interface FieldSpec {
  testID: string;
  label: string;
  componentType: string;
  required: boolean;
  dynamic?: boolean;
  /** Element is in a fixed position (outside ScrollView) — no scrolling needed */
  fixed?: boolean;
}

export interface AlertSpec {
  title: string;
  buttons: string[];
  happyPathButton?: string;
  trigger: string;
}

export interface ScreenSpec {
  name: string;
  sourceFile: string;
  waitFor: string | string[];
  fields: FieldSpec[];
  alerts: AlertSpec[];
  actionButtons: { testID: string; label: string; description: string; fixed?: boolean }[];
  navigatesTo: string[];
  notes: string[];
}

// ── Helper ──

export function getScreen(name: string): ScreenSpec | undefined {
  return SCREENS[name];
}

export function getRequiredFields(screenName: string): FieldSpec[] {
  const screen = getScreen(screenName);
  if (!screen) return [];
  return screen.fields.filter(f => f.required);
}

// ── Registry ──

export const SCREENS: Record<string, ScreenSpec> = {
  AddCompanions: {
    name: 'AddCompanions',
    sourceFile: 'src/screens/onboarding/AddCompanionsScreen/AddCompanionsScreen.tsx',
    waitFor: 'Traveling with family?',
    fields: [
      { testID: 'relationship-picker-modal', label: 'relationship picker modal', componentType: 'Modal', required: true },
      { testID: 'add-companions-title', label: 'add companions title', componentType: 'text', required: true },
      { testID: 'add-companions-subtitle', label: 'add companions subtitle', componentType: 'text', required: true },
      { testID: 'companion-item', label: 'companion item', componentType: 'view', required: true },
      { testID: 'benefits-section', label: 'benefits section', componentType: 'view', required: true },
      { testID: 'relationship-picker-title', label: 'relationship picker title', componentType: 'text', required: true },
    ],
    alerts: [
    ],
    actionButtons: [
      { testID: 'add-companion-button', label: 'add companion', description: 'add companion' },
      { testID: 'companions-continue-button', label: 'companions continue', description: 'companions continue' },
      { testID: 'relationship-picker-close-button', label: 'relationship picker close', description: 'relationship picker close' },
      { testID: 'relationship-picker-backdrop', label: 'relationship picker backdrop', description: 'relationship picker backdrop' },
      { testID: 'relationship-option', label: 'relationship option', description: 'relationship option' },
    ],
    navigatesTo: ['PassportScan', 'BiometricSetup'],
    notes: [
      'Optional step — can continue without adding anyone.',
      'Skip button text is ',
      ' when no companions added.',
      'Relationship picker modal has testIDs: relationship-option-{spouse|child|parent|sibling|other}.',
    ],
  },

  AddFamilyMember: {
    name: 'AddFamilyMember',
    sourceFile: 'src/screens/profile/AddFamilyMemberScreen/AddFamilyMemberScreen.tsx',
    waitFor: '',
    fields: [
      { testID: 'relationship-select', label: 'Family Relationship', componentType: 'Select', required: true },
    ],
    alerts: [
    ],
    actionButtons: [
      { testID: 'start-camera-scan-button', label: 'Start Camera Scan', description: 'Start Camera Scan' },
      { testID: 'enter-manually-family-button', label: 'Enter Manually', description: 'Enter Manually' },
    ],
    navigatesTo: ['PassportScan'],
    notes: [],
  },

  AddQR: {
    name: 'AddQR',
    sourceFile: 'src/screens/wallet/AddQRScreen/AddQRScreen.tsx',
    waitFor: '',
    fields: [
    ],
    alerts: [
    ],
    actionButtons: [
    ],
    navigatesTo: [],
    notes: [],
  },

  BiometricSetup: {
    name: 'BiometricSetup',
    sourceFile: 'src/screens/onboarding/BiometricSetupScreen/BiometricSetupScreen.tsx',
    waitFor: 'Secure Your Profile',
    fields: [
    ],
    alerts: [
      { title: 'Skip Biometric Setup?', buttons: ['Go Back', 'Skip'], happyPathButton: 'Skip', trigger: 'skip-biometric-button' },
    ],
    actionButtons: [
      { testID: 'enable-biometric-button', label: 'enable biometric', description: 'enable biometric' },
      { testID: 'skip-biometric-button', label: 'skip biometric', description: 'skip biometric' },
      { testID: 'biometric-back-button', label: 'biometric back', description: 'biometric back' },
    ],
    navigatesTo: ['NotificationPermission'],
    notes: [
      'On simulator, biometric always fails — use skip-biometric-button.',
      'Tapping ',
      ' shows a confirmation alert — must tap ',
      ' again on the alert.',
    ],
  },

  BugReport: {
    name: 'BugReport',
    sourceFile: 'src/screens/support/BugReportScreen/BugReportScreen.tsx',
    waitFor: '',
    fields: [
    ],
    alerts: [
    ],
    actionButtons: [
    ],
    navigatesTo: [],
    notes: [],
  },

  ConfirmProfile: {
    name: 'ConfirmProfile',
    sourceFile: 'src/screens/onboarding/ConfirmProfileScreen/ConfirmProfileScreen.tsx',
    waitFor: 'Confirm Your Profile',
    fields: [
      { testID: 'confirm-profile-title', label: 'confirm profile title', componentType: 'text', required: true },
      { testID: 'profile-field', label: 'profile', componentType: 'text', required: true },
    ],
    alerts: [
    ],
    actionButtons: [
      { testID: 'confirm-go-back-button', label: 'confirm go back', description: 'confirm go back' },
      { testID: 'continue-to-security-button', label: 'continue to security', description: 'continue to security' },
      { testID: 'edit-information-button', label: 'edit information', description: 'edit information' },
    ],
    navigatesTo: ['AddCompanions'],
    notes: [
      'Read-only display of passport data. No editable fields.',
    ],
  },

  CreateTrip: {
    name: 'CreateTrip',
    sourceFile: 'src/screens/trips/CreateTripScreen/CreateTripScreen.tsx',
    waitFor: 'Create New Trip',
    fields: [
      { testID: 'trip-name-field', label: 'trip name', componentType: 'Input', required: true },
      { testID: 'leg-${index}-arrival-date', label: 'leg ${index} arrival date', componentType: 'DatePickerField', required: true },
      { testID: 'leg-${index}-departure-date', label: 'leg ${index} departure date', componentType: 'DatePickerField', required: true },
      { testID: 'leg-${index}-flight-number', label: 'leg ${index} flight number', componentType: 'Input', required: true },
      { testID: 'leg-${index}-airline-code', label: 'leg ${index} airline code', componentType: 'Input', required: true },
      { testID: 'leg-${index}-arrival-airport', label: 'leg ${index} arrival airport', componentType: 'SearchableSelect', required: true },
      { testID: 'leg-${index}-accommodation-name', label: 'leg ${index} accommodation name', componentType: 'AccommodationAutocomplete', required: true },
      { testID: 'leg-${index}-accommodation-address', label: 'leg ${index} accommodation address', componentType: 'AddressAutocomplete', required: true },
      { testID: 'country-select-${index}', label: 'country select ${index}', componentType: 'SearchableSelect', required: true },
      { testID: 'apply-to-all-toggle-row', label: 'apply to all toggle row', componentType: 'View', required: true },
      { testID: 'apply-to-all-toggle', label: 'apply to all toggle', componentType: 'Toggle', required: true },
      { testID: 'family-empty-state-card', label: 'family empty state card', componentType: 'Card', required: true },
      { testID: 'create-trip-passport-validity-warning-${index}', label: 'create trip passport validity warning ${index}', componentType: 'View', required: true },
      { testID: 'leg-${index}-travelers-synced', label: 'leg ${index} travelers synced', componentType: 'View', required: true },
    ],
    alerts: [
    ],
    actionButtons: [
      { testID: 'create-trip-button', label: 'create trip', description: 'create trip' },
      { testID: 'add-companion-cta-button', label: 'add companion cta', description: 'add companion cta' },
      { testID: 'smart-import-button', label: 'smart import', description: 'smart import' },
      { testID: 'scan-destination-button', label: 'scan destination', description: 'scan destination' },
      { testID: 'add-destination-button', label: 'add destination', description: 'add destination' },
      { testID: 'empty-state-scan-button', label: 'empty state scan', description: 'empty state scan' },
      { testID: 'empty-state-add-button', label: 'empty state add', description: 'empty state add' },
      { testID: 'remove-leg-${index}-button', label: 'remove leg ${index}', description: 'remove leg ${index}' },
    ],
    navigatesTo: ['Profile'],
    notes: [
      'Required fields per leg: country, arrival date, accommodation name, ≥1 traveler.',
      'First leg is added automatically via add-destination-button tap.',
      'Country select uses SearchableSelect — see componentCatalog for interaction.',
      'Accommodation name uses AccommodationAutocomplete but treat as plain Input in Maestro.',
      'TravelerSelector auto-selects primary profile; no interaction needed for single-user.',
    ],
  },

  EditProfile: {
    name: 'EditProfile',
    sourceFile: 'src/screens/profile/EditProfileScreen/EditProfileScreen.tsx',
    waitFor: 'Edit Profile',
    fields: [
      { testID: 'occupation-select', label: 'Occupation', componentType: 'SearchableSelect', required: true },
      { testID: 'marital-status-select', label: 'Marital Status', componentType: 'SearchableSelect', required: true },
      { testID: 'home-address', label: 'home address', componentType: 'AddressAutocomplete', required: true },
    ],
    alerts: [
    ],
    actionButtons: [
    ],
    navigatesTo: [],
    notes: [
      'All fields are optional. Passport info is read-only on this screen.',
    ],
  },

  ExportBackupModal: {
    name: 'ExportBackupModal',
    sourceFile: 'src/screens/settings/ExportBackupModal/ExportBackupModal.tsx',
    waitFor: '',
    fields: [
      { testID: 'export-backup-modal', label: 'export backup modal', componentType: 'ScrollView', required: true },
      { testID: 'passphrase-strength-indicator', label: 'passphrase strength indicator', componentType: 'View', required: true },
      { testID: 'passphrase-field', label: 'passphrase', componentType: 'Input', required: true },
      { testID: 'confirm-passphrase-field', label: 'confirm passphrase', componentType: 'Input', required: true },
      { testID: 'export-error-message', label: 'export error message', componentType: 'View', required: true },
    ],
    alerts: [
    ],
    actionButtons: [
      { testID: 'export-backup-close-button', label: 'export backup close', description: 'export backup close' },
      { testID: 'export-backup-submit-button', label: 'export backup submit', description: 'export backup submit' },
      { testID: 'export-backup-cancel-button', label: 'export backup cancel', description: 'export backup cancel' },
    ],
    navigatesTo: [],
    notes: [],
  },

  FamilyManagement: {
    name: 'FamilyManagement',
    sourceFile: 'src/screens/profile/FamilyManagementScreen/FamilyManagementScreen.tsx',
    waitFor: 'Family Members',
    fields: [
    ],
    alerts: [
    ],
    actionButtons: [
      { testID: 'add-member-button', label: 'Add Member', description: 'Add Member' },
    ],
    navigatesTo: ['AddFamilyMember', 'EditProfile', 'PassportScan'],
    notes: [],
  },

  FAQ: {
    name: 'FAQ',
    sourceFile: 'src/screens/help/FAQScreen/FAQScreen.tsx',
    waitFor: '',
    fields: [
    ],
    alerts: [
    ],
    actionButtons: [
    ],
    navigatesTo: [],
    notes: [],
  },

  Feedback: {
    name: 'Feedback',
    sourceFile: 'src/screens/support/FeedbackScreen/FeedbackScreen.tsx',
    waitFor: '',
    fields: [
    ],
    alerts: [
    ],
    actionButtons: [
    ],
    navigatesTo: [],
    notes: [],
  },

  Help: {
    name: 'Help',
    sourceFile: 'src/screens/support/HelpScreen/HelpScreen.tsx',
    waitFor: '',
    fields: [
    ],
    alerts: [
    ],
    actionButtons: [
    ],
    navigatesTo: ['FAQ', 'Troubleshooting', 'Feedback', 'BugReport'],
    notes: [],
  },

  ImportTrip: {
    name: 'ImportTrip',
    sourceFile: 'src/screens/trips/ImportTripScreen/ImportTripScreen.tsx',
    waitFor: 'import-confirmation-field',
    fields: [
      { testID: 'import-confirmation-field', label: 'import confirmation', componentType: 'TextInput', required: true },
      { testID: 'import-error-message', label: 'import error message', componentType: 'View', required: true },
    ],
    alerts: [
    ],
    actionButtons: [
      { testID: 'import-tab-paste-button', label: 'import tab paste', description: 'import tab paste' },
      { testID: 'import-tab-scan-button', label: 'import tab scan', description: 'import tab scan' },
      { testID: 'import-parse-button', label: 'import parse', description: 'import parse' },
      { testID: 'import-try-again-button', label: 'import try again', description: 'import try again' },
    ],
    navigatesTo: [],
    notes: [],
  },

  LegForm: {
    name: 'LegForm',
    sourceFile: 'src/screens/trips/LegFormScreen/LegFormScreen.tsx',
    waitFor: [],
    fields: [
    ],
    alerts: [
      { title: 'Success', buttons: ['OK'], happyPathButton: 'OK', trigger: 'save-progress-button' },
      { title: 'Success', buttons: ['OK'], happyPathButton: 'OK', trigger: 'mark-ready-button' },
    ],
    actionButtons: [
      { testID: 'smart-delta-button', label: 'smart delta', description: 'smart delta' },
      { testID: 'mark-ready-button', label: 'Mark as Ready', description: 'Mark as Ready' , fixed: true},
      { testID: 'save-progress-button', label: 'Mark as Ready', description: 'Mark as Ready' , fixed: true},
      { testID: 'submit-in-app-button', label: 'submit in app', description: 'submit in app' , fixed: true},
      { testID: 'open-submission-guide-button', label: 'Guide', description: 'Guide' , fixed: true},
      { testID: 'save-progress-button', label: 'Save Progress', description: 'Save Progress' , fixed: true},
    ],
    navigatesTo: ['PortalSubmission', 'SubmissionGuide'],
    notes: [
      'Form fields are dynamically generated from country schema — not statically known.',
      'Use DynamicForm component which renders FormField, FormSection components.',
      'Smart Delta toggle filters to only show country-specific fields.',
      'waitFor is empty because the header shows dynamic country name, not static text.',
    ],
  },

  Lock: {
    name: 'Lock',
    sourceFile: 'src/screens/lock/LockScreen/LockScreen.tsx',
    waitFor: '',
    fields: [
    ],
    alerts: [
    ],
    actionButtons: [
      { testID: 'lock-screen-biometric-button', label: 'lock screen biometric', description: 'lock screen biometric' },
      { testID: 'lock-screen-pin-button', label: 'Use PIN Instead', description: 'Use PIN Instead' },
    ],
    navigatesTo: [],
    notes: [],
  },

  NotificationPermission: {
    name: 'NotificationPermission',
    sourceFile: 'src/screens/onboarding/NotificationPermissionScreen/NotificationPermissionScreen.tsx',
    waitFor: 'Stay on Top of Deadlines',
    fields: [
    ],
    alerts: [
    ],
    actionButtons: [
      { testID: 'allow-notifications-button', label: 'allow notifications', description: 'allow notifications' },
      { testID: 'skip-notifications-button', label: 'Skip for Now', description: 'Skip for Now' },
    ],
    navigatesTo: [],
    notes: [
      'Last onboarding screen — completing it sets onboardingComplete=true.',
      'On iOS simulator, notifications are often already authorized, causing auto-skip.',
      'Auto-skip has a 500ms delay to prevent navigator swap race condition.',
    ],
  },

  NotificationPreferences: {
    name: 'NotificationPreferences',
    sourceFile: 'src/screens/settings/NotificationPreferences/NotificationPreferences.tsx',
    waitFor: '',
    fields: [
    ],
    alerts: [
    ],
    actionButtons: [
      { testID: 'timing-${option.value}', label: 'timing ${option.value}', description: 'timing ${option.value}' },
    ],
    navigatesTo: [],
    notes: [],
  },

  PassportScan: {
    name: 'PassportScan',
    sourceFile: 'src/screens/onboarding/PassportScanScreen/PassportScanScreen.tsx',
    waitFor: 'Passport Information',
    fields: [
      { testID: 'passport-number-field', label: 'passport number', componentType: 'Input', required: true },
      { testID: 'surname-field', label: 'surname', componentType: 'Input', required: true },
      { testID: 'given-names-field', label: 'given names', componentType: 'Input', required: true },
      { testID: 'nationality-field', label: 'nationality', componentType: 'SearchableSelect', required: true },
      { testID: 'dob-field', label: 'dob', componentType: 'DatePickerField', required: true },
      { testID: 'passport-expiry-field', label: 'passport expiry', componentType: 'DatePickerField', required: true },
      { testID: 'issuing-country-field', label: 'issuing country', componentType: 'SearchableSelect', required: true },
    ],
    alerts: [
    ],
    actionButtons: [
      { testID: 'dismiss-performance-hint-button', label: 'dismiss performance hint', description: 'dismiss performance hint' },
      { testID: 'start-camera-scan-button', label: 'start camera scan', description: 'start camera scan' },
      { testID: 'enter-manually-button', label: 'enter manually', description: 'enter manually' },
      { testID: 'demo-scan-adult-button', label: 'demo scan adult', description: 'demo scan adult' },
      { testID: 'demo-scan-spouse-button', label: 'demo scan spouse', description: 'demo scan spouse' },
      { testID: 'demo-scan-child-button', label: 'demo scan child', description: 'demo scan child' },
      { testID: 'passport-continue-button', label: 'passport continue', description: 'passport continue' },
      { testID: 'passport-back-button', label: 'passport back', description: 'passport back' },
      { testID: 'gender-button', label: 'gender', description: 'gender' },
    ],
    navigatesTo: [],
    notes: [
      'Three entry modes: camera scan, demo data, manual entry.',
      'Demo scan fills all fields with sample data — tap confirm-scan-button to proceed.',
      'Manual entry shows the form fields listed above.',
      'Gender uses radio buttons: gender-Male-button, gender-Female-button, gender-Other-button.',
    ],
  },

  PortalSubmission: {
    name: 'PortalSubmission',
    sourceFile: 'src/screens/trips/PortalSubmissionScreen/PortalSubmissionScreen.tsx',
    waitFor: '',
    fields: [
    ],
    alerts: [
    ],
    actionButtons: [
      { testID: 'close-portal-button', label: 'close portal', description: 'close portal' },
      { testID: 'toolbar-back-button', label: 'toolbar back', description: 'toolbar back' },
      { testID: 'toolbar-forward-button', label: 'toolbar forward', description: 'toolbar forward' },
      { testID: 'toolbar-refresh-button', label: 'toolbar refresh', description: 'toolbar refresh' },
      { testID: 'manual-guide-button', label: 'manual guide', description: 'manual guide' },
      { testID: 'error-try-again-button', label: 'error try again', description: 'error try again' },
      { testID: 'error-continue-manually-button', label: 'error continue manually', description: 'error continue manually' },
      { testID: 'submit-in-app-button', label: 'submit in app', description: 'submit in app' },
      { testID: 'toggle-fields-panel', label: 'toggle fields panel', description: 'toggle fields panel' },
    ],
    navigatesTo: [],
    notes: [],
  },

  PrivacyPolicy: {
    name: 'PrivacyPolicy',
    sourceFile: 'src/screens/settings/PrivacyPolicyScreen/PrivacyPolicyScreen.tsx',
    waitFor: '',
    fields: [
    ],
    alerts: [
    ],
    actionButtons: [
    ],
    navigatesTo: [],
    notes: [],
  },

  Profile: {
    name: 'Profile',
    sourceFile: 'src/screens/profile/ProfileScreen/ProfileScreen.tsx',
    waitFor: 'Your Profile',
    fields: [
    ],
    alerts: [
    ],
    actionButtons: [
      { testID: 'unlock-biometrics-button', label: 'unlock biometrics', description: 'unlock biometrics' },
      { testID: 'edit-contact-button', label: 'edit contact', description: 'edit contact' },
      { testID: 'family-summary-row', label: 'family summary row', description: 'family summary row' },
    ],
    navigatesTo: ['EditProfile', 'FamilyManagement'],
    notes: [],
  },

  QRDetail: {
    name: 'QRDetail',
    sourceFile: 'src/screens/wallet/QRDetailScreen/QRDetailScreen.tsx',
    waitFor: '',
    fields: [
    ],
    alerts: [
    ],
    actionButtons: [
    ],
    navigatesTo: [],
    notes: [],
  },

  QRWallet: {
    name: 'QRWallet',
    sourceFile: 'src/screens/wallet/QRWalletScreen/QRWalletScreen.tsx',
    waitFor: '',
    fields: [
    ],
    alerts: [
    ],
    actionButtons: [
    ],
    navigatesTo: [],
    notes: [],
  },

  RestoreBackupModal: {
    name: 'RestoreBackupModal',
    sourceFile: 'src/screens/settings/RestoreBackupModal/RestoreBackupModal.tsx',
    waitFor: '',
    fields: [
      { testID: 'restore-backup-screen', label: 'restore backup screen', componentType: 'ScrollView', required: true },
      { testID: 'restore-backup-heading', label: 'restore backup heading', componentType: 'Text', required: true },
      { testID: 'restore-step-idle', label: 'restore step idle', componentType: 'View', required: true },
      { testID: 'restore-step-passphrase', label: 'restore step passphrase', componentType: 'View', required: true },
      { testID: 'passphrase-field', label: 'passphrase', componentType: 'TextInput', required: true },
      { testID: 'restore-step-loading', label: 'restore step loading', componentType: 'View', required: true },
      { testID: 'restore-step-conflict', label: 'restore step conflict', componentType: 'View', required: true },
      { testID: 'restore-step-success', label: 'restore step success', componentType: 'View', required: true },
      { testID: 'restore-step-error', label: 'restore step error', componentType: 'View', required: true },
      { testID: 'error-message', label: 'error message', componentType: 'Text', required: true },
    ],
    alerts: [
    ],
    actionButtons: [
      { testID: 'pick-file-button', label: 'pick file', description: 'pick file' },
      { testID: 'toggle-secure-entry', label: 'toggle secure entry', description: 'toggle secure entry' },
      { testID: 'submit-passphrase-button', label: 'submit passphrase', description: 'submit passphrase' },
      { testID: 'cancel-passphrase-button', label: 'cancel passphrase', description: 'cancel passphrase' },
      { testID: 'confirm-replace-button', label: 'confirm replace', description: 'confirm replace' },
      { testID: 'cancel-replace-button', label: 'cancel replace', description: 'cancel replace' },
      { testID: 'go-to-home-button', label: 'go to home', description: 'go to home' },
      { testID: 'try-again-button', label: 'try again', description: 'try again' },
    ],
    navigatesTo: [],
    notes: [],
  },

  ReviewImport: {
    name: 'ReviewImport',
    sourceFile: 'src/screens/trips/ReviewImportScreen/ReviewImportScreen.tsx',
    waitFor: 'review-trip-name',
    fields: [
    ],
    alerts: [
    ],
    actionButtons: [
      { testID: 'remove-leg-${index}', label: 'remove leg ${index}', description: 'remove leg ${index}' },
      { testID: 'review-create-trip-button', label: 'Create trip', description: 'Create trip' },
      { testID: 'review-cancel-button', label: 'Create trip', description: 'Create trip' },
    ],
    navigatesTo: [],
    notes: [],
  },

  Settings: {
    name: 'Settings',
    sourceFile: 'src/screens/settings/SettingsScreen/SettingsScreen.tsx',
    waitFor: 'Settings',
    fields: [
      { testID: 'app-lock-card', label: 'app lock card', componentType: 'Card', required: true },
      { testID: 'app-lock-unavailable', label: 'app lock unavailable', componentType: 'View', required: true },
      { testID: 'app-lock-toggle', label: 'app lock toggle', componentType: 'Toggle', required: true },
      { testID: 'app-lock-timeout-section', label: 'app lock timeout section', componentType: 'View', required: true },
      { testID: 'app-lock-timeout-select', label: 'app lock timeout select', componentType: 'Select', required: true },
      { testID: 'notification-settings-card', label: 'notification settings card', componentType: 'Card', required: true },
      { testID: 'notification-preferences-row', label: 'notification preferences row', componentType: 'Pressable', required: true },
      { testID: 'settings-theme-selector', label: 'settings theme selector', componentType: 'ThemeSelector', required: true },
      { testID: 'form-data-card', label: 'form data card', componentType: 'Card', required: true },
      { testID: 'schema-row', label: 'schema row', componentType: 'View', required: true },
    ],
    alerts: [
    ],
    actionButtons: [
      { testID: 'refresh-schemas-button', label: 'refresh schemas', description: 'refresh schemas' },
    ],
    navigatesTo: ['NotificationPreferences', 'RestoreBackup', 'Help', 'Feedback', 'BugReport', 'PrivacyPolicy'],
    notes: [
      'Delete All Data requires TWO confirmation alerts.',
    ],
  },

  SubmissionGuide: {
    name: 'SubmissionGuide',
    sourceFile: 'src/screens/trips/SubmissionGuideScreen/SubmissionGuideScreen.tsx',
    waitFor: '',
    fields: [
    ],
    alerts: [
    ],
    actionButtons: [
      { testID: 'submit-in-app-button', label: 'Submit in App', description: 'Submit in App' },
      { testID: 'open-in-browser-button', label: 'Open in Browser', description: 'Open in Browser' },
      { testID: 'mark-as-submitted-button', label: 'Mark as Submitted', description: 'Mark as Submitted' },
      { testID: 'save-qr-button', label: 'Save QR Code', description: 'Save QR Code' },
    ],
    navigatesTo: ['TripDetail', 'PortalSubmission', 'AddQR'],
    notes: [],
  },

  Templates: {
    name: 'Templates',
    sourceFile: 'src/screens/trips/TemplatesScreen/TemplatesScreen.tsx',
    waitFor: 'Trip Templates',
    fields: [
      { testID: 'rename-template-field', label: 'rename template', componentType: 'TextInput', required: true },
      { testID: 'rename-template-modal', label: 'rename template modal', componentType: 'Modal', required: true },
      { testID: 'templates-list', label: 'templates list', componentType: 'FlatList', required: true },
    ],
    alerts: [
    ],
    actionButtons: [
      { testID: 'rename-modal-cancel', label: 'rename modal cancel', description: 'rename modal cancel' },
      { testID: 'rename-modal-confirm', label: 'rename modal confirm', description: 'rename modal confirm' },
      { testID: 'rename-template-${id}', label: 'rename template ${id}', description: 'rename template ${id}' },
      { testID: 'delete-template-${id}', label: 'delete template ${id}', description: 'delete template ${id}' },
      { testID: 'use-template-${id}', label: 'use template ${id}', description: 'use template ${id}' },
    ],
    navigatesTo: [],
    notes: [],
  },

  TripChecklist: {
    name: 'TripChecklist',
    sourceFile: 'src/screens/trips/TripChecklistScreen/TripChecklistScreen.tsx',
    waitFor: 'checklist-progress',
    fields: [
    ],
    alerts: [
    ],
    actionButtons: [
      { testID: 'checklist-item-${item.id}', label: 'checklist item ${item.id}', description: 'checklist item ${item.id}' },
    ],
    navigatesTo: [],
    notes: [],
  },

  TripDetail: {
    name: 'TripDetail',
    sourceFile: 'src/screens/trips/TripDetailScreen/TripDetailScreen.tsx',
    waitFor: 'Itinerary',
    fields: [
    ],
    alerts: [
    ],
    actionButtons: [
      { testID: 'add-destination-button', label: 'add destination', description: 'add destination' },
      { testID: 'add-destination-empty-button', label: 'Add Destination', description: 'Add Destination' },
      { testID: 'trip-detail-go-back-button', label: 'trip detail go back', description: 'trip detail go back' },
      { testID: 'duplicate-trip-button', label: 'duplicate trip', description: 'duplicate trip' },
      { testID: 'edit-trip-button', label: 'edit trip', description: 'edit trip' },
      { testID: 'save-as-template-button', label: 'save as template', description: 'save as template' },
    ],
    navigatesTo: ['TripDetail', 'TripChecklist'],
    notes: [
      'Shows leg cards with testID leg-card-{COUNTRY_CODE} (e.g., leg-card-JPN).',
      'Tapping a leg card navigates to LegForm.',
      'Trip readiness summary shows ',
      '.',
    ],
  },

  TripList: {
    name: 'TripList',
    sourceFile: 'src/screens/trips/TripListScreen/TripListScreen.tsx',
    waitFor: 'Your Trips',
    fields: [
      { testID: 'trip-search-field', label: 'trip search', componentType: 'TextInput', required: true },
      { testID: 'first-run-welcome-banner', label: 'first run welcome banner', componentType: 'InfoBanner', required: true },
      { testID: 'schema-update-banner', label: 'schema update banner', componentType: 'InfoBanner', required: true },
      { testID: 'trip-list-deadline-summary', label: 'trip list deadline summary', componentType: 'View', required: true },
      { testID: 'trip-list-duplicate-trip-modal', label: 'trip list duplicate trip modal', componentType: 'Modal', required: true },
    ],
    alerts: [
    ],
    actionButtons: [
      { testID: 'import-trip-button', label: 'import trip', description: 'import trip' },
      { testID: 'templates-nav-button', label: 'templates nav', description: 'templates nav' },
      { testID: 'trip-search-clear', label: 'trip search clear', description: 'trip search clear' },
      { testID: 'fab-from-template-button', label: 'fab from template', description: 'fab from template' , fixed: true},
      { testID: 'trip-filter-${key}', label: 'trip filter ${key}', description: 'trip filter ${key}' },
      { testID: 'create-first-trip-button', label: 'create first trip', description: 'create first trip' },
      { testID: 'use-template-button', label: 'use template', description: 'use template' },
    ],
    navigatesTo: [],
    notes: [
      'Empty state shows create-first-trip-button.',
      'With existing trips, shows trip cards + FAB.',
    ],
  },

  Troubleshooting: {
    name: 'Troubleshooting',
    sourceFile: 'src/screens/help/TroubleshootingScreen/TroubleshootingScreen.tsx',
    waitFor: '',
    fields: [
    ],
    alerts: [
    ],
    actionButtons: [
    ],
    navigatesTo: [],
    notes: [],
  },

  Tutorial: {
    name: 'Tutorial',
    sourceFile: 'src/screens/onboarding/TutorialScreen/TutorialScreen.tsx',
    waitFor: 'Step 1 of 3',
    fields: [
      { testID: 'tutorial-slide-title', label: 'tutorial slide title', componentType: 'text', required: true },
      { testID: 'tutorial-step-indicator', label: 'tutorial step indicator', componentType: 'text', required: true },
    ],
    alerts: [
    ],
    actionButtons: [
      { testID: 'tutorial-skip-button', label: 'tutorial skip', description: 'tutorial skip' },
      { testID: 'next-step-button', label: 'next step', description: 'next step' },
      { testID: 'previous-step-button', label: 'previous step', description: 'previous step' },
    ],
    navigatesTo: ['PassportScan'],
    notes: [
      '3 tutorial pages — tap Next or Skip to advance.',
    ],
  },

  Welcome: {
    name: 'Welcome',
    sourceFile: 'src/screens/onboarding/WelcomeScreen/WelcomeScreen.tsx',
    waitFor: 'Borderly',
    fields: [
    ],
    alerts: [
    ],
    actionButtons: [
      { testID: 'take-tutorial-button', label: 'take tutorial', description: 'take tutorial' },
      { testID: 'skip-tutorial-button', label: 'skip tutorial', description: 'skip tutorial' },
      { testID: 'restore-backup-link-button', label: 'restore backup link', description: 'restore backup link' },
    ],
    navigatesTo: ['Tutorial', 'PassportScan', 'RestoreBackup'],
    notes: [],
  },

};
