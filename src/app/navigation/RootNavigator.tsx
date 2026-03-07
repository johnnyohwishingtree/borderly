import { useEffect, lazy, Suspense } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import { RootStackParamList, OnboardingStackParamList } from './types';
import { useProfileStore } from '../../stores/useProfileStore';

// Lazy load navigators for better code splitting
const MainTabNavigator = lazy(() => import('./MainTabNavigator'));

// Lazy load onboarding screens
const WelcomeScreen = lazy(() => import('../../screens/onboarding/WelcomeScreen'));
const PassportScanScreen = lazy(() => import('../../screens/onboarding/PassportScanScreen'));
const ConfirmProfileScreen = lazy(() => import('../../screens/onboarding/ConfirmProfileScreen'));
const BiometricSetupScreen = lazy(() => import('../../screens/onboarding/BiometricSetupScreen'));

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
        headerShown: false,
        animation: 'slide_from_right',
        animationTypeForReplace: 'push',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      <OnboardingStack.Screen 
        name="Welcome" 
        options={{
          animation: 'fade',
        }}
      >
        {(props) => (
          <Suspense fallback={<ScreenLoader />}>
            <WelcomeScreen {...props} />
          </Suspense>
        )}
      </OnboardingStack.Screen>
      <OnboardingStack.Screen 
        name="PassportScan" 
        options={{
          animation: 'slide_from_right',
        }}
      >
        {(props) => (
          <Suspense fallback={<ScreenLoader />}>
            <PassportScanScreen {...props} />
          </Suspense>
        )}
      </OnboardingStack.Screen>
      <OnboardingStack.Screen 
        name="ConfirmProfile" 
        options={{
          animation: 'slide_from_right',
        }}
      >
        {(props) => (
          <Suspense fallback={<ScreenLoader />}>
            <ConfirmProfileScreen {...props} />
          </Suspense>
        )}
      </OnboardingStack.Screen>
      <OnboardingStack.Screen 
        name="BiometricSetup" 
        options={{
          animation: 'slide_from_right',
        }}
      >
        {(props) => (
          <Suspense fallback={<ScreenLoader />}>
            <BiometricSetupScreen {...props} />
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
          headerShown: false,
          animation: 'fade',
        }}
      >
        {isOnboardingComplete ? (
          <RootStack.Screen 
            name="Main" 
            options={{
              animation: 'fade',
            }}
          >
            {(props) => (
              <Suspense fallback={<ScreenLoader />}>
                <MainTabNavigator {...props} />
              </Suspense>
            )}
          </RootStack.Screen>
        ) : (
          <RootStack.Screen 
            name="Onboarding" 
            component={OnboardingNavigator}
            options={{
              animation: 'fade',
            }}
          />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
