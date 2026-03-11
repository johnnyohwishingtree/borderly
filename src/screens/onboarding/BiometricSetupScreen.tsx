import { useState, useRef } from 'react';
import { View, Text, ScrollView, Alert, Platform, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Fingerprint, ShieldCheck, Zap, KeyRound, Lightbulb } from 'lucide-react-native';

import { OnboardingStackParamList } from '../../app/navigation/types';
import { Button, Card, ProgressBar } from '../../components/ui';
import { useProfileStore } from '../../stores/useProfileStore';

type BiometricSetupScreenNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'BiometricSetup'>;

export default function BiometricSetupScreen() {
  const navigation = useNavigation<BiometricSetupScreenNavigationProp>();
  const { setOnboardingComplete } = useProfileStore();
  const [isEnabling, setIsEnabling] = useState(false);
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  const biometricType = Platform.OS === 'ios' ? 'Touch ID / Face ID' : 'Fingerprint / Face Unlock';

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const handleEnableBiometric = async () => {
    setIsEnabling(true);
    startPulseAnimation();
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
    } catch {
      Alert.alert('Setup Failed', 'Could not enable biometric authentication. Please try again.');
    } finally {
      setIsEnabling(false);
      pulseAnimation.stopAnimation();
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
    <ScrollView className="flex-1 bg-gradient-to-b from-purple-50 to-white">
      <View className="px-6 py-8">
        {/* Progress indicator */}
        <ProgressBar progress={100} className="mb-6" />
        
        <View className="mb-8 items-center">
          <Animated.View
            style={{
              transform: [{ scale: isEnabling ? pulseAnimation : 1 }],
            }}
            className="w-24 h-24 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full items-center justify-center mb-6 shadow-lg"
          >
            <Fingerprint size={48} color="#ffffff" />
          </Animated.View>
          <Text className="text-3xl font-bold text-gray-900 mb-2 text-center">
            Secure Your Profile
          </Text>
          <Text className="text-base text-gray-600 text-center">
            Enable biometric authentication to protect your passport data with an extra layer of security.
          </Text>
        </View>

        <Card variant="elevated" className="mb-6 bg-white shadow-xl border-0">
          <View className="bg-gradient-to-r from-purple-500 to-purple-600 -m-6 mb-6 p-6 rounded-t-xl">
            <View className="flex-row items-center mb-2">
              <Fingerprint size={28} color="#ffffff" style={{ marginRight: 12 }} />
              <Text className="text-xl font-bold text-white">
                {biometricType}
              </Text>
            </View>
            <Text className="text-purple-100">
              Use your device's biometric authentication to quickly and securely access your travel profile.
            </Text>
          </View>

          <View className="space-y-4">
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-green-100 rounded-lg items-center justify-center mr-4">
                <Zap size={24} color="#16a34a" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-semibold">Quick Access</Text>
                <Text className="text-gray-600 text-sm">Instant access to your profile</Text>
              </View>
            </View>
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-purple-100 rounded-lg items-center justify-center mr-4">
                <ShieldCheck size={24} color="#8b5cf6" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-semibold">Additional Security</Text>
                <Text className="text-gray-600 text-sm">Extra protection for your data</Text>
              </View>
            </View>
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-blue-100 rounded-lg items-center justify-center mr-4">
                <KeyRound size={24} color="#3b82f6" />
              </View>
              <View className="flex-1">
                <Text className="text-gray-900 font-semibold">No Passwords</Text>
                <Text className="text-gray-600 text-sm">Nothing to remember or forget</Text>
              </View>
            </View>
          </View>
        </Card>

        <Card variant="outlined" className="mb-8 border-2 border-yellow-200 bg-yellow-50/50">
          <View className="flex-row items-start">
            <Lightbulb size={28} color="#eab308" style={{ marginRight: 12 }} />
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900 mb-2">
                Optional Setup
              </Text>
              <Text className="text-sm text-gray-700">
                You can skip this step and enable biometric authentication later in the app settings.
                Your profile will still be securely stored in your device's keychain.
              </Text>
            </View>
          </View>
        </Card>

        <View className="space-y-4">
          <Button
            title={isEnabling ? `Setting up ${biometricType}...` : `Enable ${biometricType}`}
            onPress={handleEnableBiometric}
            loading={isEnabling}
            size="large"
            fullWidth
            testID="enable-biometric-button"
          />

          <View className="border-2 border-gray-300 rounded-xl">
            <Button
              title="Skip for Now"
              onPress={handleSkip}
              variant="outline"
              size="large"
              fullWidth
              testID="skip-biometric-button"
            />
          </View>

          <View className="border-gray-200">
            <Button
              title="Back"
              onPress={handleBack}
              variant="outline"
              size="medium"
              fullWidth
              testID="biometric-back-button"
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
