import { useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { AccessibilityInfo } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RootStackParamList, OnboardingStackParamList } from './types';
import { useProfileStore } from '@/stores/useProfileStore';
import { CONTEXT_TRANSITIONS, STANDARD_TRANSITIONS } from './transitions';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import LoadingStates from '@/components/ui/LoadingStates';

// Lazy load navigators for better code splitting
const MainTabNavigator = lazy(() => import('./MainTabNavigator').then(m => ({ default: m.default })));

// Lazy load onboarding screens
const WelcomeScreen = lazy(() => import('@/screens/onboarding').then(m => ({ default: m.WelcomeScreen })));
const TutorialScreen = lazy(() => import('@/screens/onboarding').then(m => ({ default: m.TutorialScreen })));
const PassportScanScreen = lazy(() => import('@/screens/onboarding').then(m => ({ default: m.PassportScanScreen })));
const ConfirmProfileScreen = lazy(() => import('@/screens/onboarding').then(m => ({ default: m.ConfirmProfileScreen })));
const AddCompanionsScreen = lazy(() => import('@/screens/onboarding').then(m => ({ default: m.AddCompanionsScreen })));
const BiometricSetupScreen = lazy(() => import('@/screens/onboarding').then(m => ({ default: m.BiometricSetupScreen })));

// Enhanced loading component for lazy-loaded screens
const ScreenLoader = () => (
  <LoadingStates
    state="loading"
    variant="spinner"
    size="medium"
    text="Loading screen..."
    fullScreen={true}
  />
);

const RootStack = createNativeStackNavigator<RootStackParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();

/** Maps navigator route names to human-readable screen titles for VoiceOver announcements. */
const SCREEN_TITLES: Record<string, string> = {
  // Onboarding
  Welcome: 'Welcome',
  Tutorial: 'Tutorial',
  PassportScan: 'Passport Scan',
  ConfirmProfile: 'Confirm Profile',
  AddCompanions: 'Add Companions',
  BiometricSetup: 'Biometric Setup',
  // Main tabs
  Trips: 'Trips',
  Wallet: 'QR Wallet',
  Profile: 'Profile',
  Settings: 'Settings',
  // Trip screens
  TripDetail: 'Trip Details',
  CreateTrip: 'Create Trip',
  LegForm: 'Destination Form',
  SubmissionGuide: 'Submission Guide',
  PortalSubmission: 'Portal Submission',
  // Profile screens
  FamilyManagement: 'Family Members',
  AddFamilyMember: 'Add Family Member',
  EditProfile: 'Edit Profile',
  // Wallet screens
  AddQR: 'Add QR Code',
  QRDetail: 'QR Code Detail',
  // Root
  Main: 'Home',
  Onboarding: 'Onboarding',
};

function getScreenTitle(routeName: string): string {
  return SCREEN_TITLES[routeName] ?? routeName;
}

// Expose navigation ref globally for E2E tests in web/browser environment.
// This allows Playwright tests to imperatively navigate without going through
// the full UI flow. Only exposed in non-production environments.
const navigationRef = createNavigationContainerRef<RootStackParamList>();
if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__navigationRef = navigationRef;
}

function OnboardingNavigator() {
  return (
    <ErrorBoundary
      fallback={({ resetError }) => (
        <LoadingStates
          state="error"
          fullScreen={true}
          errorMessage="Failed to load onboarding flow. Please restart the app or contact support."
          onRetry={resetError}
          showRetryButton={true}
        />
      )}
    >
      <OnboardingStack.Navigator
        screenOptions={{
          ...CONTEXT_TRANSITIONS.onboarding,
          animationTypeForReplace: 'push',
        }}
      >
      <OnboardingStack.Screen 
        name="Welcome" 
        options={{
          ...STANDARD_TRANSITIONS.fade,
        }}
      >
        {() => (
          <Suspense fallback={<ScreenLoader />}>
            <WelcomeScreen />
          </Suspense>
        )}
      </OnboardingStack.Screen>
      <OnboardingStack.Screen
        name="Tutorial"
        options={{
          ...STANDARD_TRANSITIONS.slideFromRight,
        }}
      >
        {() => (
          <Suspense fallback={<ScreenLoader />}>
            <TutorialScreen />
          </Suspense>
        )}
      </OnboardingStack.Screen>
      <OnboardingStack.Screen
        name="PassportScan"
        options={{
          ...CONTEXT_TRANSITIONS.camera,
        }}
      >
        {() => (
          <Suspense fallback={<ScreenLoader />}>
            <PassportScanScreen />
          </Suspense>
        )}
      </OnboardingStack.Screen>
      <OnboardingStack.Screen
        name="ConfirmProfile"
        options={{
          ...STANDARD_TRANSITIONS.slideFromRight,
        }}
      >
        {() => (
          <Suspense fallback={<ScreenLoader />}>
            <ConfirmProfileScreen />
          </Suspense>
        )}
      </OnboardingStack.Screen>
      <OnboardingStack.Screen
        name="AddCompanions"
        options={{
          ...STANDARD_TRANSITIONS.slideFromRight,
        }}
      >
        {() => (
          <Suspense fallback={<ScreenLoader />}>
            <AddCompanionsScreen />
          </Suspense>
        )}
      </OnboardingStack.Screen>
      <OnboardingStack.Screen
        name="BiometricSetup"
        options={{
          ...STANDARD_TRANSITIONS.slideFromRight,
        }}
      >
        {() => (
          <Suspense fallback={<ScreenLoader />}>
            <BiometricSetupScreen />
          </Suspense>
        )}
      </OnboardingStack.Screen>
    </OnboardingStack.Navigator>
    </ErrorBoundary>
  );
}

export default function RootNavigator() {
  const { isOnboardingComplete, loadProfile } = useProfileStore();
  const routeNameRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Load profile and onboarding state on app start
    loadProfile();
  }, [loadProfile]);

  /**
   * Called by NavigationContainer whenever navigation state changes.
   * Announces the new screen name via AccessibilityInfo so VoiceOver /
   * TalkBack users know which screen they have navigated to.
   */
  const handleNavigationStateChange = useCallback(() => {
    const currentRouteName = navigationRef.current?.getCurrentRoute()?.name;
    if (currentRouteName && currentRouteName !== routeNameRef.current) {
      routeNameRef.current = currentRouteName;
      const title = getScreenTitle(currentRouteName);
      AccessibilityInfo.announceForAccessibility(`${title} screen`);
    }
  }, []);

  return (
    <ErrorBoundary
      fallback={({ resetError }) => (
        <LoadingStates
          state="error"
          fullScreen={true}
          errorMessage="The app encountered an unexpected error. Please restart the app or contact support if the problem persists."
          onRetry={resetError}
          showRetryButton={true}
          retryButtonText="Restart"
        />
      )}
    >
      <NavigationContainer ref={navigationRef} onStateChange={handleNavigationStateChange}>
        <RootStack.Navigator
          screenOptions={{
            ...STANDARD_TRANSITIONS.fade,
          }}
        >
        {isOnboardingComplete ? (
          <RootStack.Screen
            name="Main"
            options={{
              ...STANDARD_TRANSITIONS.fade,
              headerShown: false,
            }}
          >
            {() => (
              <Suspense fallback={<ScreenLoader />}>
                <MainTabNavigator />
              </Suspense>
            )}
          </RootStack.Screen>
        ) : (
          <RootStack.Screen 
            name="Onboarding"
            component={OnboardingNavigator}
            options={{
              ...STANDARD_TRANSITIONS.fade,
              headerShown: false,
            }}
          />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
    </ErrorBoundary>
  );
}
