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
        animation: 'slide_from_right',
        animationTypeForReplace: 'push',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      <OnboardingStack.Screen 
        name="Welcome" 
        component={WelcomeScreen}
        options={{
          animation: 'fade',
        }}
      />
      <OnboardingStack.Screen 
        name="PassportScan" 
        component={PassportScanScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <OnboardingStack.Screen 
        name="ConfirmProfile" 
        component={ConfirmProfileScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
      <OnboardingStack.Screen 
        name="BiometricSetup" 
        component={BiometricSetupScreen}
        options={{
          animation: 'slide_from_right',
        }}
      />
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
            component={MainTabNavigator}
            options={{
              animation: 'fade',
            }}
          />
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
