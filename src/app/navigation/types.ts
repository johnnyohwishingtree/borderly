export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Trips: undefined;
  Wallet: undefined;
  Profile: undefined;
  Settings: undefined;
};

export type OnboardingStackParamList = {
  Welcome: undefined;
  Tutorial: undefined;
  PassportScan: { familyMode?: boolean; relationship?: string; profileId?: string; returnTo?: 'AddCompanions' } | undefined;
  ConfirmProfile: undefined;
  AddCompanions: undefined;
  BiometricSetup: undefined;
  NotificationPermission: undefined;
  RestoreBackup: undefined;
};

export type TripStackParamList = {
  TripList: undefined;
  CreateTrip: { templateId?: string } | undefined;
  TripDetail: { tripId: string };
  LegForm: { tripId: string; legId: string };
  SubmissionGuide: { tripId: string; legId: string; countryCode: string; travelerId?: string };
  PortalSubmission: {
    url: string;
    countryCode: string;
    tripId: string;
    legId: string;
  };
  Templates: undefined;
};

export type WalletStackParamList = {
  QRWallet: undefined;
  QRDetail: { qrId: string };
  AddQR: { tripId?: string; legId?: string; countryCode?: string; travelerId?: string } | undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
  FamilyManagement: undefined;
  AddFamilyMember: { relationship?: string } | undefined;
  PassportScan: { familyMode?: boolean; relationship?: string; profileId?: string } | undefined;
};

export type SettingsStackParamList = {
  Settings: undefined;
  NotificationPreferences: undefined;
  Feedback: undefined;
  BugReport: undefined;
  Help: undefined;
  FAQ: { highlightId?: string } | undefined;
  Troubleshooting: { highlightId?: string } | undefined;
  PrivacyPolicy: undefined;
  RestoreBackup: undefined;
};
