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
  PassportScan: { familyMode?: boolean; relationship?: string } | undefined;
  ConfirmProfile: undefined;
  BiometricSetup: undefined;
};

export type TripStackParamList = {
  TripList: undefined;
  CreateTrip: undefined;
  TripDetail: { tripId: string };
  LegForm: { tripId: string; legId: string };
  SubmissionGuide: { tripId: string; legId: string; countryCode: string };
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
  AddQR: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
  FamilyManagement: undefined;
  AddFamilyMember: { relationship?: string } | undefined;
  PassportScan: { familyMode?: boolean; relationship?: string } | undefined;
};

export type SettingsStackParamList = {
  Settings: undefined;
  Feedback: undefined;
  BugReport: undefined;
  Help: undefined;
  FAQ: { highlightId?: string } | undefined;
  Troubleshooting: { highlightId?: string } | undefined;
};
