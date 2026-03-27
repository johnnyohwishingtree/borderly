import { useState } from 'react';
import { View, Text, ScrollView, useWindowDimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Camera, Check, Globe, Shield } from 'lucide-react-native';

import { OnboardingStackParamList } from '@/app/navigation/types';
import { TUTORIAL_IDS } from './testIDs';
import { Button, ProgressIndicator, ScreenContainer } from '@/components/ui';

type TutorialScreenNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'Tutorial'>;

const tutorialSteps = [
  {
    id: 1,
    title: 'Fill Once, Travel Everywhere',
    subtitle: 'One profile. Every country.',
    content: 'Enter your passport details once and Borderly auto-fills customs and immigration forms for every destination — Japan, Malaysia, Singapore, and more.',
    icon: Globe,
    iconColor: '#2563eb',
    illustration: (
      <View className="items-center">
        <View className="flex-row items-center gap-3 mb-3">
          <View className="bg-blue-100 rounded-lg px-3 py-2">
            <Text className="text-blue-800 text-xs font-semibold">Your Profile</Text>
          </View>
          <Text className="text-gray-400 text-lg">→</Text>
          <View className="bg-green-100 rounded-lg px-3 py-2">
            <Text className="text-green-800 text-xs font-semibold">Japan Form</Text>
          </View>
        </View>
        <View className="flex-row items-center gap-3">
          <View className="bg-blue-100 rounded-lg px-3 py-2 opacity-0">
            <Text className="text-blue-800 text-xs font-semibold">Your Profile</Text>
          </View>
          <Text className="text-gray-400 text-lg">→</Text>
          <View className="bg-green-100 rounded-lg px-3 py-2">
            <Text className="text-green-800 text-xs font-semibold">Malaysia Form</Text>
          </View>
        </View>
      </View>
    ),
  },
  {
    id: 2,
    title: 'Your Data Stays on Your Phone',
    subtitle: 'Zero servers. Full privacy.',
    content: 'Your passport data is encrypted and stored only in your device\'s secure keychain. It never leaves your phone — not even to us.',
    icon: Shield,
    iconColor: '#16a34a',
    illustration: (
      <View className="items-center">
        <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-3">
          <Shield size={40} color="#16a34a" />
        </View>
        <View className="flex-row items-center gap-2">
          <Check size={14} color="#16a34a" />
          <Text className="text-xs text-gray-700">Encrypted on device</Text>
        </View>
        <View className="flex-row items-center gap-2 mt-1">
          <Check size={14} color="#16a34a" />
          <Text className="text-xs text-gray-700">Never uploaded to servers</Text>
        </View>
        <View className="flex-row items-center gap-2 mt-1">
          <Check size={14} color="#16a34a" />
          <Text className="text-xs text-gray-700">Works fully offline</Text>
        </View>
      </View>
    ),
  },
  {
    id: 3,
    title: "Let's Scan Your Passport",
    subtitle: 'Quick setup in seconds',
    content: 'Use your camera to scan the two-line code at the bottom of your passport photo page. We\'ll read your details instantly and securely.',
    icon: Camera,
    iconColor: '#9333ea',
    illustration: (
      <View className="w-48 h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 items-center justify-center">
        <View className="bg-white rounded p-3 shadow-sm">
          <Text className="text-xs text-gray-600 text-center">P&lt;USASMITH&lt;&lt;JOHN&lt;&lt;&lt;&lt;</Text>
          <Text className="text-xs text-gray-600 text-center">123456789&lt;1USA9501012M3010315</Text>
        </View>
        <Camera size={24} color="#9333ea" style={{ marginTop: 8 }} />
      </View>
    ),
  },
] as const;

export default function TutorialScreen() {
  const navigation = useNavigation<TutorialScreenNavigationProp>();
  const [currentStep, setCurrentStep] = useState(0);
  const { height } = useWindowDimensions();

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      navigation.navigate('PassportScan');
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    navigation.navigate('PassportScan');
  };

  const step = tutorialSteps[currentStep];

  return (
    <ScreenContainer className="bg-white">
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ minHeight: height * 0.9 }}
    >
      <View className="flex-1 px-6 pt-12 pb-8">
        {/* Header with progress and skip */}
        <View className="flex-row items-center justify-between mb-8">
          <ProgressIndicator
            currentStep={currentStep}
            totalSteps={tutorialSteps.length}
            variant="dots"
            size="medium"
          />
          <Button
            title="Skip"
            onPress={handleSkip}
            variant="outline"
            size="small"
            accessibilityLabel="Skip tutorial"
            accessibilityHint="Skip the tutorial and go directly to passport scanning"
            testID={TUTORIAL_IDS.tutorialSkipButton.id}
          />
        </View>

        {/* Main content */}
        <View className="flex-1 items-center justify-center">
          {/* Icon */}
          <View 
            className="w-20 h-20 rounded-full items-center justify-center mb-8"
            style={{ backgroundColor: step.iconColor + '20' }}
          >
            <step.icon size={40} color={step.iconColor} />
          </View>

          {/* Illustration */}
          <View className="mb-8">
            {step.illustration}
          </View>

          {/* Text content */}
          <View className="bg-white border border-gray-200 rounded-xl p-4">
            <View className="items-center text-center">
              <Text className="text-2xl font-bold text-gray-900 text-center mb-2" testID={TUTORIAL_IDS.tutorialSlideTitle.id}>
                {step.title}
              </Text>
              <Text className="text-lg text-gray-500 font-semibold text-center mb-4">
                {step.subtitle}
              </Text>
              <Text className="text-base text-gray-700 text-center leading-relaxed">
                {step.content}
              </Text>
            </View>
          </View>
        </View>

        {/* Navigation buttons */}
        <View className="mt-8 space-y-3">
          <Button
            title={currentStep === tutorialSteps.length - 1 ? 'Get Started' : 'Next'}
            onPress={handleNext}
            variant="primary"
            size="large"
            fullWidth
            testID={TUTORIAL_IDS.nextStepButton.id}
            accessibilityLabel={currentStep === tutorialSteps.length - 1 ? 'Get started' : 'Next step'}
            accessibilityHint={
              currentStep === tutorialSteps.length - 1
                ? 'Complete tutorial and start passport scanning'
                : 'Go to the next tutorial step'
            }
          />
          {currentStep > 0 && (
            <Button
              title="Previous"
              onPress={handlePrevious}
              variant="outline"
              size="large"
              fullWidth
              accessibilityLabel="Previous step"
              accessibilityHint="Go to the previous tutorial step"
              testID={TUTORIAL_IDS.previousStepButton.id}
            />
          )}
        </View>

        {/* Step indicator text */}
        <Text className="text-center text-sm text-gray-500 mt-4" testID={TUTORIAL_IDS.tutorialStepIndicator.id}>
          Step {currentStep + 1} of {tutorialSteps.length}
        </Text>
      </View>
    </ScrollView>
    </ScreenContainer>
  );
}