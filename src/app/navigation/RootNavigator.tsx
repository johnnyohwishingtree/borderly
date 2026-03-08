import { useEffect, lazy, Suspense } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import { RootStackParamList, OnboardingStackParamList } from './types';
import { useProfileStore } from '@/stores/useProfileStore';
import { CONTEXT_TRANSITIONS, STANDARD_TRANSITIONS } from '@/navigation/transitions';

// Lazy load navigators for better code splitting
const MainTabNavigator = lazy(() => import('./MainTabNavigator').then(m => ({ default: m.default })));

// Lazy load onboarding screens
const WelcomeScreen = lazy(() => import('@/screens/onboarding').then(m => ({ default: m.WelcomeScreen })));
const TutorialScreen = lazy(() => import('@/screens/onboarding').then(m => ({ default: m.TutorialScreen })));
const PassportScanScreen = lazy(() => import('@/screens/onboarding').then(m => ({ default: m.PassportScanScreen })));
const ConfirmProfileScreen = lazy(() => import('@/screens/onboarding').then(m => ({ default: m.ConfirmProfileScreen })));
const BiometricSetupScreen = lazy(() => import('@/screens/onboarding').then(m => ({ default: m.BiometricSetupScreen })));

// Loading component for lazy-loaded screens
const ScreenLoader = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <ActivityIndicator size="large" color="#3b82f6" />
  </View>
);

const RootStack = createNativeStackNavigator<RootStackParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();

function OnboardingNavigator() {
  return (
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
  );
}

export default function RootNavigator() {
  const { isOnboardingComplete, loadProfile } = useProfileStore();

  useEffect(() => {
    // Load profile and onboarding state on app start
    loadProfile();
  }, [loadProfile]);

  return (
    <NavigationContainer>
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
            }}
          />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
