export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Forms: undefined;
  Wallet: undefined;
  Profile: undefined;
  Settings: undefined;
};

export type FormsStackParamList = {
  SelectCountries: undefined;
  SelectTravelers: { countryCodes: string[] };
  SmartForm: { countryCodes: string[]; travelerIds: string[] };
  PortalLinks: { tripId: string; countryCodes: string[] };
  PortalSubmission: {
    url: string;
    countryCode: string;
    tripId: string;
    legId: string;
  };
  SubmissionGuide: { tripId: string; legId: string; countryCode: string; travelerId?: string };
};

export type OnboardingStackParamList = {
  Welcome: undefined;
  PassportScan: { familyMode?: boolean; relationship?: string; profileId?: string } | undefined;
  ConfirmProfile: undefined;
  RestoreBackup: undefined;
};

/** @deprecated Kept for LegFormScreen/PortalSubmission which still reference these routes */
export type TripStackParamList = {
  LegForm: { tripId: string; legId: string };
  SubmissionGuide: { tripId: string; legId: string; countryCode: string; travelerId?: string };
  PortalSubmission: {
    url: string;
    countryCode: string;
    tripId: string;
    legId: string;
  };
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
