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
  actionButtons: { testID: string; label: string; description: string }[];
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
    ],
    alerts: [
    ],
    actionButtons: [
      { testID: 'add-companion-button', label: 'add companion', description: 'add companion' },
      { testID: 'companions-continue-button', label: 'companions continue', description: 'companions continue' },
      { testID: 'relationship-picker-modal', label: 'relationship picker modal', description: 'relationship picker modal' },
      { testID: 'relationship-picker-backdrop', label: 'relationship picker backdrop', description: 'relationship picker backdrop' },
      { testID: 'relationship-picker-title', label: 'relationship picker title', description: 'relationship picker title' },
      { testID: 'relationship-picker-close', label: 'relationship picker close', description: 'relationship picker close' },
      { testID: 'relationship-option-${value}', label: 'relationship option ${value}', description: 'relationship option ${value}' },
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
      { testID: 'skip-biometric-button', label: 'Skip for Now', description: 'Skip for Now' },
      { testID: 'biometric-back-button', label: 'Skip for Now', description: 'Skip for Now' },
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
    ],
    alerts: [
    ],
    actionButtons: [
      { testID: 'confirm-go-back-button', label: 'Go Back', description: 'Go Back' },
      { testID: 'continue-to-security-button', label: 'Continue', description: 'Continue' },
      { testID: 'edit-information-button', label: 'Continue', description: 'Continue' },
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
      { testID: 'trip-name-input', label: 'e.g., Asia Summer 2025', componentType: 'Input', required: true },
      { testID: 'country-select-${index}', label: 'Country', componentType: 'SearchableSelect', required: true, dynamic: true },
      { testID: 'leg-${index}-arrival-date', label: 'Arrival Date', componentType: 'DatePickerField', required: true, dynamic: true },
      { testID: 'leg-${index}-departure-date', label: 'leg ${index} departure', componentType: 'DatePickerField', required: true, dynamic: true },
      { testID: 'leg-${index}-flight-number', label: 'Flight Number', componentType: 'Input', required: true, dynamic: true },
      { testID: 'leg-${index}-airline-code', label: 'Airline Code', componentType: 'Input', required: true, dynamic: true },
      { testID: 'leg-${index}-arrival-airport', label: 'Arrival Airport', componentType: 'SearchableSelect', required: true, dynamic: true },
      { testID: 'leg-${index}-travelers-synced', label: 'leg travelers synced', componentType: 'SearchableSelect', required: true, dynamic: true },
      { testID: 'leg-${index}-accommodation-address', label: 'leg accommodation address', componentType: 'AddressAutocomplete', required: true, dynamic: true },
    ],
    alerts: [
    ],
    actionButtons: [
      { testID: 'add-companion-cta-button', label: 'add companion', description: 'add companion' },
      { testID: 'create-trip-button', label: 'create trip', description: 'create trip' },
      { testID: 'smart-import-button', label: 'Import', description: 'Import' },
      { testID: 'scan-destination-button', label: 'Import', description: 'Import' },
      { testID: 'add-destination-button', label: 'Import', description: 'Import' },
      { testID: 'empty-state-scan-button', label: 'Scan Boarding Pass', description: 'Scan Boarding Pass' },
      { testID: 'empty-state-add-button', label: 'Scan Boarding Pass', description: 'Scan Boarding Pass' },
      { testID: 'remove-leg-${index}-button', label: 'Remove', description: 'Remove' },
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
      { testID: 'passphrase-input', label: 'Passphrase', componentType: 'Input', required: true },
      { testID: 'confirm-passphrase-input', label: 'Confirm Passphrase', componentType: 'Input', required: true },
    ],
    alerts: [
    ],
    actionButtons: [
      { testID: 'export-backup-close-button', label: 'export backup close', description: 'export backup close' },
      { testID: 'export-backup-submit-button', label: 'Export Backup', description: 'Export Backup' },
      { testID: 'export-backup-cancel-button', label: 'Cancel', description: 'Cancel' },
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
    waitFor: 'import-confirmation-input',
    fields: [
      { testID: 'import-confirmation-input', label: 'Paste your booking confirmation here...', componentType: 'Input', required: true },
    ],
    alerts: [
    ],
    actionButtons: [
      { testID: 'import-tab-paste', label: 'import tab paste', description: 'import tab paste' },
      { testID: 'import-tab-scan', label: 'import tab scan', description: 'import tab scan' },
      { testID: 'import-try-again-button', label: 'import try again', description: 'import try again' },
      { testID: 'import-parse-button', label: 'Import trip', description: 'Import trip' },
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
      { testID: 'mark-ready-button', label: 'Mark as Ready', description: 'Mark as Ready' },
      { testID: 'save-progress-button', label: 'Mark as Ready', description: 'Mark as Ready' },
      { testID: 'submit-in-app-button', label: 'submit in app', description: 'submit in app' },
      { testID: 'open-submission-guide-button', label: 'Guide', description: 'Guide' },
      { testID: 'save-progress-button', label: 'Save Progress', description: 'Save Progress' },
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
      { testID: 'passport-number-input', label: 'Passport Number', componentType: 'Input', required: true },
      { testID: 'surname-input', label: 'Surname (Family Name)', componentType: 'Input', required: true },
      { testID: 'given-names-input', label: 'Given Names', componentType: 'Input', required: true },
      { testID: 'nationality-input', label: 'Nationality', componentType: 'SearchableSelect', required: true },
      { testID: 'dob-input', label: 'Date of Birth', componentType: 'DatePickerField', required: true },
      { testID: 'passport-expiry-input', label: 'Passport Expiry Date', componentType: 'DatePickerField', required: true },
      { testID: 'issuing-country-input', label: 'Issuing Country', componentType: 'SearchableSelect', required: true },
    ],
    alerts: [
    ],
    actionButtons: [
      { testID: 'dismiss-performance-hint-button', label: 'Dismiss', description: 'Dismiss' },
      { testID: 'start-camera-scan-button', label: 'Start Camera Scan', description: 'Start Camera Scan' },
      { testID: 'enter-manually-button', label: 'Start Camera Scan', description: 'Start Camera Scan' },
      { testID: 'demo-scan-adult', label: 'Demo: Adult', description: 'Demo: Adult' },
      { testID: 'demo-scan-spouse', label: 'Demo: Adult', description: 'Demo: Adult' },
      { testID: 'demo-scan-child', label: 'Demo: Spouse', description: 'Demo: Spouse' },
      { testID: 'gender-${option.label}-button', label: 'gender ${option.label}', description: 'gender ${option.label}' },
      { testID: 'passport-continue-button', label: 'Continue', description: 'Continue' },
      { testID: 'passport-back-button', label: 'Continue', description: 'Continue' },
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
      { testID: 'unlock-biometrics-button', label: 'Unlock with Biometrics', description: 'Unlock with Biometrics' },
      { testID: 'edit-contact-button', label: 'Edit', description: 'Edit' },
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
      { testID: 'passphrase-input', label: 'Enter passphrase…', componentType: 'Input', required: true },
    ],
    alerts: [
    ],
    actionButtons: [
      { testID: 'pick-file-button', label: 'Pick a Backup File', description: 'Pick a Backup File' },
      { testID: 'toggle-secure-entry', label: 'toggle secure entry', description: 'toggle secure entry' },
      { testID: 'submit-passphrase-button', label: 'Decrypt & Restore', description: 'Decrypt & Restore' },
      { testID: 'cancel-passphrase-button', label: 'Decrypt & Restore', description: 'Decrypt & Restore' },
      { testID: 'confirm-replace-button', label: 'Replace all data', description: 'Replace all data' },
      { testID: 'cancel-replace-button', label: 'Replace all data', description: 'Replace all data' },
      { testID: 'go-to-home-button', label: 'Go to Home', description: 'Go to Home' },
      { testID: 'restore-step-error', label: 'Go to Home', description: 'Go to Home' },
      { testID: 'try-again-button', label: 'Try again', description: 'Try again' },
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
      { testID: 'app-lock-timeout-select', label: 'Lock After', componentType: 'Select', required: true },
    ],
    alerts: [
    ],
    actionButtons: [
      { testID: 'notification-preferences-row', label: 'notification preferences row', description: 'notification preferences row' },
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
      { testID: 'rename-template-input', label: 'rename template', componentType: 'Input', required: true },
    ],
    alerts: [
    ],
    actionButtons: [
      { testID: 'rename-modal-cancel', label: 'rename modal cancel', description: 'rename modal cancel' },
      { testID: 'rename-modal-confirm', label: 'rename modal confirm', description: 'rename modal confirm' },
      { testID: 'rename-template-${template.id}', label: 'rename template ${template.id}', description: 'rename template ${template.id}' },
      { testID: 'delete-template-${template.id}', label: 'delete template ${template.id}', description: 'delete template ${template.id}' },
      { testID: 'use-template-${template.id}', label: 'use template ${template.id}', description: 'use template ${template.id}' },
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
      { testID: 'trip-detail-go-back-button', label: 'Go Back', description: 'Go Back' },
      { testID: 'duplicate-trip-button', label: 'duplicate trip', description: 'duplicate trip' },
      { testID: 'edit-trip-button', label: 'edit trip', description: 'edit trip' },
      { testID: 'save-as-template-button', label: 'save as template', description: 'save as template' },
      { testID: 'add-destination-button', label: 'add destination', description: 'add destination' },
      { testID: 'add-destination-empty-button', label: 'Add Destination', description: 'Add Destination' },
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
      { testID: 'trip-search-input', label: 'Search trips...', componentType: 'Input', required: true },
    ],
    alerts: [
    ],
    actionButtons: [
      { testID: 'create-first-trip-button', label: 'No trips yet', description: 'No trips yet' },
      { testID: 'use-template-button', label: 'No trips yet', description: 'No trips yet' },
      { testID: 'import-trip-button', label: 'import trip', description: 'import trip' },
      { testID: 'templates-nav-button', label: 'templates nav', description: 'templates nav' },
      { testID: 'trip-search-clear', label: 'trip search clear', description: 'trip search clear' },
      { testID: 'trip-filter-${tab.key}', label: 'trip filter ${tab.key}', description: 'trip filter ${tab.key}' },
      { testID: 'fab-from-template-button', label: 'fab from template', description: 'fab from template' },
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
    ],
    alerts: [
    ],
    actionButtons: [
      { testID: 'tutorial-skip-button', label: 'Skip', description: 'Skip' },
      { testID: 'next-step-button', label: 'next step', description: 'next step' },
      { testID: 'previous-step-button', label: 'Previous', description: 'Previous' },
      { testID: 'tutorial-step-indicator', label: 'Previous', description: 'Previous' },
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
      { testID: 'take-tutorial-button', label: 'Take Quick Tutorial', description: 'Take Quick Tutorial' },
      { testID: 'skip-tutorial-button', label: 'Take Quick Tutorial', description: 'Take Quick Tutorial' },
      { testID: 'restore-backup-link', label: 'Skip Tutorial', description: 'Skip Tutorial' },
    ],
    navigatesTo: ['Tutorial', 'PassportScan', 'RestoreBackup'],
    notes: [],
  },

};
