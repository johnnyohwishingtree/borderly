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

export type BoardingPassData = {
  countryCode: string;
  flightNumber?: string | undefined;
  airlineCode?: string | undefined;
  arrivalAirport?: string | undefined;
  departureAirport?: string | undefined;
  flightDate?: string | undefined;
};

export type FormsStackParamList = {
  SelectCountries: undefined;
  SelectTravelers: { countryCodes: string[]; boardingPassData?: BoardingPassData[] | undefined };
  SmartForm: { countryCodes: string[]; travelerIds: string[]; boardingPassData?: BoardingPassData[] | undefined };
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
