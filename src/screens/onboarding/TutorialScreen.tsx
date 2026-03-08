import React, { useState } from 'react';
import { View, Text, ScrollView, Image, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import { OnboardingStackParamList } from '../../app/navigation/types';
import { Button, ProgressIndicator, Card } from '../../components/ui';
import CountryFlag from '../../components/trips/CountryFlag';

type TutorialScreenNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'Tutorial'>;

interface TutorialStep {
  id: number;
  title: string;
  subtitle: string;
  content: string;
  icon: string;
  iconColor: string;
  bgGradient: string;
  illustration?: React.ReactNode;
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 1,
    title: 'Scan Your Passport',
    subtitle: 'Quick & Secure Setup',
    content: 'Use your phone camera to scan the Machine Readable Zone (MRZ) on your passport. This automatically fills in all your travel information securely.',
    icon: 'camera-alt',
    iconColor: '#2563eb',
    bgGradient: 'from-blue-50 to-indigo-50',
    illustration: (
      <View className="w-48 h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 items-center justify-center">
        <View className="bg-white rounded p-3 shadow-sm">
          <Text className="text-xs text-gray-600 text-center">P&lt;USASMITH&lt;&lt;JOHN&lt;&lt;&lt;&lt;</Text>
          <Text className="text-xs text-gray-600 text-center">123456789&lt;1USA9501012M3010315</Text>
        </View>
        <MaterialIcons name="camera-alt" size={24} color="#2563eb" style={{ marginTop: 8 }} />
      </View>
    ),
  },
  {
    id: 2,
    title: 'Create Your Trips',
    subtitle: 'Multi-Country Itineraries',
    content: 'Add destinations to your trip itinerary. Borderly supports Japan, Malaysia, and Singapore with more countries coming soon.',
    icon: 'flight-takeoff',
    iconColor: '#16a34a',
    bgGradient: 'from-green-50 to-emerald-50',
    illustration: (
      <View className="flex-row items-center justify-center space-x-4">
        <CountryFlag countryCode="JPN" size="large" />
        <MaterialIcons name="arrow-forward" size={20} color="#6b7280" />
        <CountryFlag countryCode="MYS" size="large" />
        <MaterialIcons name="arrow-forward" size={20} color="#6b7280" />
        <CountryFlag countryCode="SGP" size="large" />
      </View>
    ),
  },
  {
    id: 3,
    title: 'Auto-Fill Forms',
    subtitle: 'Smart Data Mapping',
    content: 'Your profile information automatically fills country-specific declaration forms. Only answer unique questions for each destination.',
    icon: 'auto-awesome',
    iconColor: '#9333ea',
    bgGradient: 'from-purple-50 to-violet-50',
    illustration: (
      <View className="space-y-2">
        <View className="flex-row items-center bg-green-100 rounded p-2">
          <MaterialIcons name="check" size={16} color="#16a34a" />
          <Text className="ml-2 text-xs text-green-800">Name: John Smith ✓</Text>
        </View>
        <View className="flex-row items-center bg-green-100 rounded p-2">
          <MaterialIcons name="check" size={16} color="#16a34a" />
          <Text className="ml-2 text-xs text-green-800">Passport: 123456789 ✓</Text>
        </View>
        <View className="flex-row items-center bg-blue-100 rounded p-2">
          <MaterialIcons name="edit" size={16} color="#2563eb" />
          <Text className="ml-2 text-xs text-blue-800">Purpose of visit: ?</Text>
        </View>
      </View>
    ),
  },
  {
    id: 4,
    title: 'Guided Submission',
    subtitle: 'Step-by-Step Help',
    content: 'Follow our step-by-step guides to submit forms on government portals. Copy pre-filled data and get QR codes for entry.',
    icon: 'assignment-turned-in',
    iconColor: '#ea580c',
    bgGradient: 'from-orange-50 to-amber-50',
    illustration: (
      <View className="space-y-3">
        <View className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
          <Text className="text-xs text-gray-600 mb-2">Visit Japan Web</Text>
          <View className="flex-row items-center">
            <View className="w-16 h-16 bg-gray-900 rounded items-center justify-center">
              <Text className="text-white text-xs">QR</Text>
              <Text className="text-white text-xs">CODE</Text>
            </View>
            <Text className="ml-3 text-xs text-green-600">✓ Submitted</Text>
          </View>
        </View>
      </View>
    ),
  },
  {
    id: 5,
    title: 'Your QR Wallet',
    subtitle: 'Offline Access',
    content: 'Store all your submission QR codes in your digital wallet. Access them offline at immigration checkpoints.',
    icon: 'account-balance-wallet',
    iconColor: '#dc2626',
    bgGradient: 'from-red-50 to-pink-50',
    illustration: (
      <View className="flex-row space-x-2">
        <View className="w-12 h-12 bg-gray-900 rounded items-center justify-center">
          <Text className="text-white text-xs">QR</Text>
        </View>
        <View className="w-12 h-12 bg-gray-900 rounded items-center justify-center">
          <Text className="text-white text-xs">QR</Text>
        </View>
        <View className="w-12 h-12 bg-gray-900 rounded items-center justify-center">
          <Text className="text-white text-xs">QR</Text>
        </View>
      </View>
    ),
  },
];

export default function TutorialScreen() {
  const navigation = useNavigation<TutorialScreenNavigationProp>();
  const [currentStep, setCurrentStep] = useState(0);
  const { height } = Dimensions.get('window');

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
    <ScrollView 
      className={`flex-1 bg-gradient-to-b ${step.bgGradient}`}
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
            variant="ghost"
            size="small"
            accessibilityLabel="Skip tutorial"
            accessibilityHint="Skip the tutorial and go directly to passport scanning"
          />
        </View>

        {/* Main content */}
        <View className="flex-1 items-center justify-center">
          {/* Icon */}
          <View 
            className="w-20 h-20 rounded-full items-center justify-center mb-8"
            style={{ backgroundColor: step.iconColor + '20' }}
          >
            <MaterialIcons name={step.icon as any} size={40} color={step.iconColor} />
          </View>

          {/* Illustration */}
          <View className="mb-8">
            {step.illustration}
          </View>

          {/* Text content */}
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-lg">
            <View className="items-center text-center">
              <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
                {step.title}
              </Text>
              <Text className="text-lg text-blue-600 font-semibold text-center mb-4">
                {step.subtitle}
              </Text>
              <Text className="text-base text-gray-700 text-center leading-relaxed">
                {step.content}
              </Text>
            </View>
          </Card>
        </View>

        {/* Navigation buttons */}
        <View className="flex-row items-center justify-between mt-8 space-x-4">
          <Button
            title="Previous"
            onPress={handlePrevious}
            variant="outline"
            size="large"
            className="flex-1"
            disabled={currentStep === 0}
            accessibilityLabel="Previous step"
            accessibilityHint="Go to the previous tutorial step"
          />
          <Button
            title={currentStep === tutorialSteps.length - 1 ? 'Get Started' : 'Next'}
            onPress={handleNext}
            variant="primary"
            size="large"
            className="flex-1"
            accessibilityLabel={currentStep === tutorialSteps.length - 1 ? 'Get started' : 'Next step'}
            accessibilityHint={
              currentStep === tutorialSteps.length - 1 
                ? 'Complete tutorial and start passport scanning' 
                : 'Go to the next tutorial step'
            }
          />
        </View>

        {/* Step indicator text */}
        <Text className="text-center text-sm text-gray-500 mt-4">
          Step {currentStep + 1} of {tutorialSteps.length}
        </Text>
      </View>
    </ScrollView>
  );
}