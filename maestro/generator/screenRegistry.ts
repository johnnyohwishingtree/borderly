/**
 * Screen registry — declarative metadata for every screen.
 *
 * This is the source of truth for what each screen contains, how to
 * interact with it, and what to expect. Manually maintained alongside
 * journey definitions. Used by:
 *
 * - **Maestro generator** — journey authors look up fields, alerts, waitFor
 * - **UI/UX skills** — /visual-audit, /ux-review reference this for context
 * - **QA skill** — /qa uses this to know what to test on each screen
 *
 * When you modify a screen, update its entry here. Run `pnpm maestro:generate`
 * to validate testIDs still exist in source code.
 */

// ── Types ──

export interface FieldSpec {
  /** testID of the field (use ${index} for dynamic testIDs) */
  testID: string;
  /** Human-readable label */
  label: string;
  /** Component type (must match a key in COMPONENT_CATALOG) */
  componentType: keyof typeof import('./componentCatalog').COMPONENT_CATALOG | 'other';
  /** Whether the field is required for form submission */
  required: boolean;
  /** Whether the testID contains dynamic segments like ${index} */
  dynamic?: boolean;
  /** Placeholder text shown in the field */
  placeholder?: string;
  /** Example value for test data */
  exampleValue?: string;
}

export interface AlertSpec {
  /** Alert title (used for waitFor + assertVisible) */
  title: string;
  /** Button labels on the alert */
  buttons: string[];
  /** Which button to tap to proceed (for happy path) */
  happyPathButton?: string;
  /** What triggers this alert */
  trigger: string;
  /** What happens after tapping the happy path button */
  outcome?: string;
}

export interface ScreenSpec {
  /** Screen name as registered in the navigator */
  name: string;
  /** Path to the screen source file */
  sourceFile: string;
  /** Text to wait for when this screen appears (for Maestro waitFor) */
  waitFor: string | string[];
  /** Ordered list of interactive fields (top to bottom as rendered) */
  fields: FieldSpec[];
  /** Alerts that can appear on this screen */
  alerts: AlertSpec[];
  /** testIDs of action buttons (not form fields) */
  actionButtons: { testID: string; label: string; description: string }[];
  /** Screens this screen navigates to */
  navigatesTo: string[];
  /** Notes for test authors */
  notes?: string[];
}

// ── Screen Definitions ──

export const SCREENS: Record<string, ScreenSpec> = {
  Welcome: {
    name: 'Welcome',
    sourceFile: 'src/screens/onboarding/WelcomeScreen/WelcomeScreen.tsx',
    waitFor: 'Borderly',
    fields: [],
    alerts: [],
    actionButtons: [
      { testID: 'take-tutorial-button', label: 'Take Quick Tutorial', description: 'Begin tutorial then onboarding' },
      { testID: 'skip-tutorial-button', label: 'Skip Tutorial', description: 'Skip tutorial, go to PassportScan' },
      { testID: 'restore-backup-link', label: 'Restore from Backup', description: 'Open restore flow' },
    ],
    navigatesTo: ['Tutorial'],
  },

  Tutorial: {
    name: 'Tutorial',
    sourceFile: 'src/screens/onboarding/TutorialScreen/TutorialScreen.tsx',
    waitFor: 'Step 1 of 3',
    fields: [],
    alerts: [],
    actionButtons: [
      { testID: 'next-step-button', label: 'Next', description: 'Next tutorial step' },
      { testID: 'tutorial-skip-button', label: 'Skip', description: 'Skip tutorial' },
      { testID: 'previous-step-button', label: 'Previous', description: 'Previous tutorial step' },
    ],
    navigatesTo: ['PassportScan'],
    notes: ['3 tutorial pages — tap Next or Skip to advance.'],
  },

  PassportScan: {
    name: 'PassportScan',
    sourceFile: 'src/screens/onboarding/PassportScanScreen/PassportScanScreen.tsx',
    waitFor: 'Passport Information',
    fields: [
      { testID: 'passport-number-input', label: 'Passport Number', componentType: 'Input', required: true, exampleValue: 'L12345678' },
      { testID: 'surname-input', label: 'Surname', componentType: 'Input', required: true, exampleValue: 'SMITH' },
      { testID: 'given-names-input', label: 'Given Names', componentType: 'Input', required: true, exampleValue: 'JOHN MICHAEL' },
      { testID: 'nationality-input', label: 'Nationality', componentType: 'SearchableSelect', required: true, exampleValue: 'USA' },
      { testID: 'dob-input', label: 'Date of Birth', componentType: 'DatePickerField', required: true },
      { testID: 'gender-${value}-button', label: 'Gender', componentType: 'other', required: true, dynamic: true, exampleValue: 'Male' },
      { testID: 'passport-expiry-input', label: 'Passport Expiry', componentType: 'DatePickerField', required: true },
      { testID: 'issuing-country-input', label: 'Issuing Country', componentType: 'SearchableSelect', required: true, exampleValue: 'USA' },
    ],
    alerts: [
      { title: 'Profile Saved', buttons: ['Continue'], happyPathButton: 'Continue', trigger: 'passport-continue-button', outcome: 'Navigate to ConfirmProfile' },
    ],
    actionButtons: [
      { testID: 'start-camera-scan-button', label: 'Scan Passport', description: 'Open camera for MRZ scan' },
      { testID: 'enter-manually-button', label: 'Enter Manually', description: 'Show manual entry form' },
      { testID: 'demo-scan-adult', label: 'Demo Scan (Adult)', description: 'Fill with sample adult passport data' },
      { testID: 'demo-scan-spouse', label: 'Demo Scan (Spouse)', description: 'Fill with sample spouse passport data' },
      { testID: 'demo-scan-child', label: 'Demo Scan (Child)', description: 'Fill with sample child passport data' },
      { testID: 'confirm-scan-button', label: 'Confirm Scan', description: 'Confirm scanned/demo passport data' },
      { testID: 'passport-continue-button', label: 'Save & Continue', description: 'Save manual entry and proceed' },
      { testID: 'passport-back-button', label: 'Back', description: 'Go back to previous screen' },
    ],
    navigatesTo: ['ConfirmProfile'],
    notes: [
      'Three entry modes: camera scan, demo data, manual entry.',
      'Demo scan fills all fields with sample data — tap confirm-scan-button to proceed.',
      'Manual entry shows the form fields listed above.',
      'Gender uses radio buttons: gender-Male-button, gender-Female-button, gender-Other-button.',
    ],
  },

  ConfirmProfile: {
    name: 'ConfirmProfile',
    sourceFile: 'src/screens/onboarding/ConfirmProfileScreen/ConfirmProfileScreen.tsx',
    waitFor: 'Confirm Your Profile',
    fields: [],
    alerts: [],
    actionButtons: [
      { testID: 'continue-to-security-button', label: 'Continue', description: 'Proceed to AddCompanions' },
      { testID: 'edit-information-button', label: 'Edit Information', description: 'Go back to PassportScan' },
    ],
    navigatesTo: ['AddCompanions'],
    notes: ['Read-only display of passport data. No editable fields.'],
  },

  AddCompanions: {
    name: 'AddCompanions',
    sourceFile: 'src/screens/onboarding/AddCompanionsScreen/AddCompanionsScreen.tsx',
    waitFor: 'Traveling with family?',
    fields: [],
    alerts: [],
    actionButtons: [
      { testID: 'add-companion-button', label: 'Add Companion', description: 'Open relationship picker to add a family member' },
      { testID: 'companions-continue-button', label: 'Continue', description: 'Proceed to BiometricSetup (text varies: "Continue — just me" or "Continue")' },
    ],
    navigatesTo: ['BiometricSetup'],
    notes: [
      'Optional step — can continue without adding anyone.',
      'Continue button text is "Continue — just me" when no companions added.',
      'Relationship picker modal has testIDs: relationship-option-{spouse|child|parent|sibling|other}.',
    ],
  },

  BiometricSetup: {
    name: 'BiometricSetup',
    sourceFile: 'src/screens/onboarding/BiometricSetupScreen/BiometricSetupScreen.tsx',
    waitFor: 'Secure Your Profile',
    fields: [],
    alerts: [
      {
        title: 'Setup Complete!',
        buttons: ['Get Started'],
        happyPathButton: 'Get Started',
        trigger: 'enable-biometric-button',
        outcome: 'Navigate to NotificationPermission',
      },
      {
        title: 'Skip Biometric Setup?',
        buttons: ['Go Back', 'Skip'],
        happyPathButton: 'Skip',
        trigger: 'skip-biometric-button',
        outcome: 'Navigate to NotificationPermission',
      },
      {
        title: 'Setup Failed',
        buttons: ['OK'],
        happyPathButton: 'OK',
        trigger: 'enable-biometric-button (error)',
        outcome: 'Stay on screen',
      },
    ],
    actionButtons: [
      { testID: 'enable-biometric-button', label: 'Enable Biometrics', description: 'Enable Face ID / Touch ID' },
      { testID: 'skip-biometric-button', label: 'Skip', description: 'Skip biometric setup' },
    ],
    navigatesTo: ['NotificationPermission'],
    notes: [
      'On simulator, biometric always fails — use skip-biometric-button.',
      'Tapping "Skip" shows a confirmation alert — must tap "Skip" again on the alert.',
    ],
  },

  NotificationPermission: {
    name: 'NotificationPermission',
    sourceFile: 'src/screens/onboarding/NotificationPermissionScreen/NotificationPermissionScreen.tsx',
    waitFor: 'Stay on Top of Deadlines',
    fields: [],
    alerts: [],
    actionButtons: [
      { testID: 'allow-notifications-button', label: 'Allow Notifications', description: 'Request notification permission' },
      { testID: 'skip-notifications-button', label: 'Skip for Now', description: 'Skip notification setup' },
    ],
    navigatesTo: [],
    notes: [
      'Last onboarding screen — completing it sets onboardingComplete=true.',
      'On iOS simulator, notifications are often already authorized, causing auto-skip.',
      'Auto-skip has a 500ms delay to prevent navigator swap race condition.',
    ],
  },

  TripList: {
    name: 'TripList',
    sourceFile: 'src/screens/trips/TripListScreen/TripListScreen.tsx',
    waitFor: 'Your Trips',
    fields: [],
    alerts: [],
    actionButtons: [
      { testID: 'create-first-trip-button', label: 'Create Your First Trip', description: 'Shown when no trips exist' },
    ],
    navigatesTo: ['CreateTrip', 'TripDetail'],
    notes: [
      'Empty state shows create-first-trip-button.',
      'With existing trips, shows trip cards + FAB.',
    ],
  },

  CreateTrip: {
    name: 'CreateTrip',
    sourceFile: 'src/screens/trips/CreateTripScreen/CreateTripScreen.tsx',
    waitFor: 'Create New Trip',
    fields: [
      // Trip-level fields
      { testID: 'trip-name-input', label: 'Trip Name', componentType: 'Input', required: true, placeholder: 'e.g., Asia Summer 2025', exampleValue: 'Japan Trip 2026' },
      // Per-leg fields (index starts at 0)
      { testID: 'country-select-${index}', label: 'Country', componentType: 'SearchableSelect', required: true, dynamic: true, exampleValue: 'JPN' },
      { testID: 'leg-${index}-arrival-date', label: 'Arrival Date', componentType: 'DatePickerField', required: true, dynamic: true },
      { testID: 'leg-${index}-departure-date', label: 'Departure Date', componentType: 'DatePickerField', required: false, dynamic: true },
      { testID: 'leg-${index}-flight-number', label: 'Flight Number', componentType: 'Input', required: false, dynamic: true },
      { testID: 'leg-${index}-airline-code', label: 'Airline Code', componentType: 'Input', required: false, dynamic: true },
      { testID: 'leg-${index}-arrival-airport', label: 'Arrival Airport', componentType: 'SearchableSelect', required: false, dynamic: true },
      { testID: 'leg-${index}-accommodation-name', label: 'Accommodation Name', componentType: 'Input', required: true, dynamic: true, placeholder: 'e.g., Park Hyatt Tokyo', exampleValue: 'Park Hyatt Tokyo' },
      { testID: 'leg-${index}-accommodation-address', label: 'Accommodation Address', componentType: 'AddressAutocomplete', required: false, dynamic: true },
    ],
    alerts: [
      { title: 'Validation Error', buttons: ['OK'], happyPathButton: 'OK', trigger: 'create-trip-button (validation fails)', outcome: 'Stay on screen, fix errors' },
      { title: 'Success', buttons: ['OK'], happyPathButton: 'OK', trigger: 'create-trip-button (success)', outcome: 'Navigate to TripDetail' },
      { title: 'Error', buttons: ['OK'], happyPathButton: 'OK', trigger: 'create-trip-button (error)', outcome: 'Stay on screen' },
      { title: 'Destination Not Supported', buttons: ['Add Manually', 'Cancel'], happyPathButton: 'Add Manually', trigger: 'Boarding pass scan with unsupported country', outcome: 'Add leg anyway' },
    ],
    actionButtons: [
      { testID: 'add-destination-button', label: 'Add Destination', description: 'Add a new leg to the trip' },
      { testID: 'scan-destination-button', label: 'Scan Boarding Pass', description: 'Scan boarding pass to auto-fill leg' },
      { testID: 'smart-import-button', label: 'Smart Import', description: 'Import trip data from text/flight' },
      { testID: 'create-trip-button', label: 'Create Trip', description: 'Submit the trip form' },
      { testID: 'remove-leg-${index}-button', label: 'Remove', description: 'Remove a leg from the trip' },
    ],
    navigatesTo: ['TripDetail'],
    notes: [
      'Required fields per leg: country, arrival date, accommodation name, ≥1 traveler.',
      'First leg is added automatically via add-destination-button tap.',
      'Country select uses SearchableSelect — see componentCatalog for interaction.',
      'Accommodation name uses AccommodationAutocomplete but treat as plain Input in Maestro.',
      'TravelerSelector auto-selects primary profile; no interaction needed for single-user.',
    ],
  },

  TripDetail: {
    name: 'TripDetail',
    sourceFile: 'src/screens/trips/TripDetailScreen/TripDetailScreen.tsx',
    waitFor: 'Itinerary',
    fields: [],
    alerts: [
      { title: 'Delete Trip', buttons: ['Cancel', 'Delete'], happyPathButton: 'Cancel', trigger: 'delete-trip-button', outcome: 'Delete → navigate to TripList' },
      { title: 'Error', buttons: ['OK'], happyPathButton: 'OK', trigger: 'Mark as submitted (error)', outcome: 'Stay on screen' },
    ],
    actionButtons: [
      { testID: 'delete-trip-button', label: 'Delete Trip', description: 'Delete the entire trip' },
      { testID: 'edit-trip-name-button', label: 'Edit', description: 'Edit trip name' },
      { testID: 'add-destination-button', label: 'Add Destination', description: 'Add another leg' },
    ],
    navigatesTo: ['LegForm', 'SubmissionGuide', 'PortalSubmission'],
    notes: [
      'Shows leg cards with testID leg-card-{COUNTRY_CODE} (e.g., leg-card-JPN).',
      'Tapping a leg card navigates to LegForm.',
      'Trip readiness summary shows "X of N legs ready".',
    ],
  },

  LegForm: {
    name: 'LegForm',
    sourceFile: 'src/screens/trips/LegFormScreen/LegFormScreen.tsx',
    waitFor: [],
    fields: [],
    alerts: [
      { title: 'Success', buttons: ['OK'], happyPathButton: 'OK', trigger: 'save-progress-button', outcome: 'Stay on screen' },
      { title: 'Success', buttons: ['OK'], happyPathButton: 'OK', trigger: 'mark-ready-button', outcome: 'Navigate back to TripDetail' },
      { title: 'Error', buttons: ['OK'], happyPathButton: 'OK', trigger: 'Portal URL error', outcome: 'Stay on screen' },
    ],
    actionButtons: [
      { testID: 'save-progress-button', label: 'Save Progress', description: 'Save form data' },
      { testID: 'mark-ready-button', label: 'Mark as Ready', description: 'Mark form as ready for submission' },
      { testID: 'submit-in-app-button', label: 'Submit in App', description: 'Navigate to PortalSubmission' },
      { testID: 'open-submission-guide-button', label: 'Guide', description: 'Navigate to SubmissionGuide' },
      { testID: 'smart-delta-button', label: 'Smart Delta', description: 'Toggle showing only country-specific fields' },
    ],
    navigatesTo: ['PortalSubmission', 'SubmissionGuide'],
    notes: [
      'Form fields are dynamically generated from country schema — not statically known.',
      'Use DynamicForm component which renders FormField, FormSection components.',
      'Smart Delta toggle filters to only show country-specific fields.',
      'waitFor is empty because the header shows dynamic country name, not static text.',
    ],
  },

  Profile: {
    name: 'Profile',
    sourceFile: 'src/screens/profile/ProfileScreen/ProfileScreen.tsx',
    waitFor: 'Your Profile',
    fields: [],
    alerts: [
      { title: 'Authentication Failed', buttons: ['OK'], happyPathButton: 'OK', trigger: 'Biometric auth fails', outcome: 'Stay on screen' },
    ],
    actionButtons: [
      { testID: 'edit-profile-button', label: 'Edit Profile', description: 'Navigate to EditProfile' },
      { testID: 'family-management-button', label: 'Family', description: 'Navigate to FamilyManagement' },
    ],
    navigatesTo: ['EditProfile', 'FamilyManagement'],
  },

  EditProfile: {
    name: 'EditProfile',
    sourceFile: 'src/screens/profile/EditProfileScreen/EditProfileScreen.tsx',
    waitFor: 'Edit Profile',
    fields: [
      { testID: 'email-input', label: 'Email Address', componentType: 'Input', required: false, placeholder: 'your.email@example.com' },
      { testID: 'phone-input', label: 'Phone Number', componentType: 'Input', required: false, placeholder: '+1 (555) 123-4567' },
      { testID: 'occupation-input', label: 'Occupation', componentType: 'Input', required: false, placeholder: 'Software Engineer' },
      { testID: 'home-address', label: 'Home Address', componentType: 'AddressAutocomplete', required: false },
    ],
    alerts: [
      { title: 'Validation Error', buttons: ['OK'], happyPathButton: 'OK', trigger: 'Save with invalid data', outcome: 'Stay on screen' },
      { title: 'Success', buttons: ['OK'], happyPathButton: 'OK', trigger: 'save-profile-button (success)', outcome: 'Navigate back' },
      { title: 'Error', buttons: ['OK'], happyPathButton: 'OK', trigger: 'save-profile-button (error)', outcome: 'Stay on screen' },
    ],
    actionButtons: [
      { testID: 'save-profile-button', label: 'Save Changes', description: 'Save profile edits' },
      { testID: 'discard-button', label: 'Discard', description: 'Discard unsaved changes' },
    ],
    navigatesTo: [],
    notes: ['All fields are optional. Passport info is read-only on this screen.'],
  },

  FamilyManagement: {
    name: 'FamilyManagement',
    sourceFile: 'src/screens/profile/FamilyManagementScreen/FamilyManagementScreen.tsx',
    waitFor: 'Family Members',
    fields: [],
    alerts: [
      { title: 'Delete Family Member', buttons: ['Cancel', 'Delete'], happyPathButton: 'Cancel', trigger: 'Delete button on member card', outcome: 'Delete → remove member' },
    ],
    actionButtons: [
      { testID: 'add-family-member-button', label: 'Add Member', description: 'Navigate to AddFamilyMember' },
    ],
    navigatesTo: ['AddFamilyMember'],
  },

  Settings: {
    name: 'Settings',
    sourceFile: 'src/screens/settings/SettingsScreen/SettingsScreen.tsx',
    waitFor: 'Settings',
    fields: [],
    alerts: [
      { title: 'Delete All Data', buttons: ['Cancel', 'Delete All'], happyPathButton: 'Cancel', trigger: 'delete-all-data-button', outcome: 'Shows second confirmation' },
      { title: 'Are you sure?', buttons: ['Cancel', 'Delete All Data'], happyPathButton: 'Cancel', trigger: 'Second delete confirmation', outcome: 'Delete all data, return to onboarding' },
      { title: 'Clear Cache', buttons: ['Cancel', 'Clear'], happyPathButton: 'Cancel', trigger: 'clear-cache-button', outcome: 'Clear cache' },
      { title: 'Enable Biometric Authentication', buttons: ['Cancel', 'Enable'], happyPathButton: 'Enable', trigger: 'Biometric toggle ON', outcome: 'Enable biometric' },
      { title: 'Disable Biometric Authentication', buttons: ['Cancel', 'Disable'], happyPathButton: 'Cancel', trigger: 'Biometric toggle OFF', outcome: 'Disable biometric' },
    ],
    actionButtons: [
      { testID: 'export-data-button', label: 'Export Data', description: 'Open ExportBackupModal' },
      { testID: 'restore-data-button', label: 'Restore Data', description: 'Open RestoreBackupModal' },
      { testID: 'clear-cache-button', label: 'Clear Cache', description: 'Clear app cache' },
      { testID: 'delete-all-data-button', label: 'Delete All Data', description: 'Delete everything (double confirm)' },
    ],
    navigatesTo: ['PrivacyPolicy', 'Help', 'Feedback', 'BugReport'],
    notes: ['Delete All Data requires TWO confirmation alerts.'],
  },
};

// ── Lookup helpers ──

/** Get a screen spec by name. Returns undefined if not registered. */
export function getScreen(name: string): ScreenSpec | undefined {
  return SCREENS[name];
}

/** Get all required fields for a screen. */
export function getRequiredFields(name: string): FieldSpec[] {
  return SCREENS[name]?.fields.filter(f => f.required) ?? [];
}

/** Get the happy-path alert sequence for a screen action. */
export function getAlertForTrigger(screenName: string, trigger: string): AlertSpec | undefined {
  return SCREENS[screenName]?.alerts.find(a => a.trigger.includes(trigger));
}

/** List all registered screen names. */
export function listScreens(): string[] {
  return Object.keys(SCREENS);
}
