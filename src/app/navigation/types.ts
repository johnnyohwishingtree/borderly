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
  PassportScan: undefined;
  ConfirmProfile: undefined;
  BiometricSetup: undefined;
};

export type TripStackParamList = {
  TripList: undefined;
  CreateTrip: undefined;
  TripDetail: { tripId: string };
  LegForm: { tripId: string; legId: string };
  SubmissionGuide: { tripId: string; legId: string };
};

export type WalletStackParamList = {
  QRWallet: undefined;
  QRDetail: { qrId: string };
  AddQR: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
  EditProfile: undefined;
};

export type SettingsStackParamList = {
  Settings: undefined;
};
