import { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { RootStackParamList, OnboardingStackParamList } from './types';
import MainTabNavigator from './MainTabNavigator';

// Import onboarding screens
import WelcomeScreen from '../../screens/onboarding/WelcomeScreen';
import PassportScanScreen from '../../screens/onboarding/PassportScanScreen';
import ConfirmProfileScreen from '../../screens/onboarding/ConfirmProfileScreen';
import BiometricSetupScreen from '../../screens/onboarding/BiometricSetupScreen';

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
  // TODO: Replace with actual auth/onboarding state from store
  const [hasCompletedOnboarding] = useState(false);

  return (
    <NavigationContainer>
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {hasCompletedOnboarding ? (
          <RootStack.Screen name="Main" component={MainTabNavigator} />
        ) : (
          <RootStack.Screen name="Onboarding" component={OnboardingNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
