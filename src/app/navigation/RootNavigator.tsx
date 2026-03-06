import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RootStackParamList, OnboardingStackParamList } from './types';
import MainTabNavigator from './MainTabNavigator';
import { useProfileStore } from '../../stores/useProfileStore';

// Import onboarding screens
import {
  WelcomeScreen,
  PassportScanScreen,
  ConfirmProfileScreen,
  BiometricSetupScreen,
} from '../../screens/onboarding';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();

function OnboardingNavigator() {
  return (
    <OnboardingStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <OnboardingStack.Screen name="Welcome" component={WelcomeScreen} />
      <OnboardingStack.Screen name="PassportScan" component={PassportScanScreen} />
      <OnboardingStack.Screen name="ConfirmProfile" component={ConfirmProfileScreen} />
      <OnboardingStack.Screen name="BiometricSetup" component={BiometricSetupScreen} />
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
        }}
      >
        {isOnboardingComplete ? (
          <RootStack.Screen name="Main" component={MainTabNavigator} />
        ) : (
          <RootStack.Screen name="Onboarding" component={OnboardingNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
