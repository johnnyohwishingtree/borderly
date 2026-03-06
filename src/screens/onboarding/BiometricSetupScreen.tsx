import { useState } from 'react';
import { View, Text, ScrollView, Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { OnboardingStackParamList } from '../../app/navigation/types';
import { Button, Card } from '../../components/ui';
import { useProfileStore } from '../../stores/useProfileStore';

type BiometricSetupScreenNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'BiometricSetup'>;

export default function BiometricSetupScreen() {
  const navigation = useNavigation<BiometricSetupScreenNavigationProp>();
  const { setOnboardingComplete } = useProfileStore();
  const [isEnabling, setIsEnabling] = useState(false);

  const biometricType = Platform.OS === 'ios' ? 'Touch ID / Face ID' : 'Fingerprint / Face Unlock';

  const handleEnableBiometric = async () => {
    setIsEnabling(true);
    try {
      // In a real app, you would:
      // 1. Check if biometric authentication is available
      // 2. Request biometric permission
      // 3. Set up biometric authentication
      
      // For now, simulate the process
      await new Promise<void>(resolve => setTimeout(() => resolve(), 2000));
      
      // Complete onboarding
      setOnboardingComplete(true);
      
      Alert.alert(
        'Setup Complete!',
        'Your profile has been created and secured with biometric authentication.',
        [
          {
            text: 'Get Started',
            onPress: handleComplete,
          },
        ]
      );
    } catch (error) {
      Alert.alert('Setup Failed', 'Could not enable biometric authentication. Please try again.');
    } finally {
      setIsEnabling(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Biometric Setup?',
      'Your profile will be saved, but without biometric protection. You can enable this later in settings.',
      [
        {
          text: 'Go Back',
          style: 'cancel',
        },
        {
          text: 'Skip',
          onPress: () => {
            setOnboardingComplete(true);
            handleComplete();
          },
        },
      ]
    );
  };

  const handleComplete = () => {
    // This would normally navigate to the main app
    // For now, we'll show an alert since the main app navigation is controlled by RootNavigator
    Alert.alert(
      'Welcome to Borderly!',
      'You can now start creating trips and filling out travel declarations.',
      [
        {
          text: 'OK',
          onPress: () => {
            // The RootNavigator will handle the transition to the main app
            // based on the onboarding completion state
          },
        },
      ]
    );
  };

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-6 py-8">
        <View className="mb-8">
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            Secure Your Profile
          </Text>
          <Text className="text-base text-gray-600">
            Enable biometric authentication to protect your passport data with an extra layer of security.
          </Text>
        </View>

        <Card variant="elevated" className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-3">
            {biometricType}
          </Text>
          <Text className="text-base text-gray-700 mb-4">
            Use your device's biometric authentication to quickly and securely access your travel profile.
          </Text>
          
          <View className="space-y-3">
            <View className="flex-row items-center">
              <View className="w-2 h-2 bg-green-600 rounded-full mr-3" />
              <Text className="text-gray-700">Quick access to your profile</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-2 h-2 bg-green-600 rounded-full mr-3" />
              <Text className="text-gray-700">Additional security layer</Text>
            </View>
            <View className="flex-row items-center">
              <View className="w-2 h-2 bg-green-600 rounded-full mr-3" />
              <Text className="text-gray-700">No passwords to remember</Text>
            </View>
          </View>
        </Card>

        <Card variant="outlined" className="mb-8">
          <Text className="text-base font-medium text-gray-900 mb-2">
            Optional Setup
          </Text>
          <Text className="text-sm text-gray-600">
            You can skip this step and enable biometric authentication later in the app settings. 
            Your profile will still be securely stored in your device's keychain.
          </Text>
        </Card>

        <View className="space-y-4">
          <Button
            title={`Enable ${biometricType}`}
            onPress={handleEnableBiometric}
            loading={isEnabling}
            size="large"
            fullWidth
          />
          
          <Button
            title="Skip for Now"
            onPress={handleSkip}
            variant="outline"
            size="large"
            fullWidth
          />

          <Button
            title="Back"
            onPress={handleBack}
            variant="outline"
            size="medium"
            fullWidth
          />
        </View>
      </View>
    </ScrollView>
  );
}
