import { View, Text, ScrollView, Dimensions } from 'react-native';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { OnboardingStackParamList } from '../../app/navigation/types';
import { Button, Card } from '../../components/ui';
import { ProgressIndicator } from '../../components/onboarding';
import HelpHint from '../../components/ui/HelpHint';
import Tooltip from '../../components/ui/Tooltip';

type TutorialScreenNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'Tutorial'>;

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  tips: string[];
  demonstration?: {
    type: 'image' | 'animation' | 'interactive';
    content: string;
  };
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Borderly',
    description: 'Your universal travel companion that stores your travel profile securely and auto-generates customs forms for any destination.',
    icon: 'public',
    tips: [
      'Fill out your information once',
      'Works offline - no internet required',
      'Your data never leaves your device'
    ],
  },
  {
    id: 'passport-scan',
    title: 'Passport Scanning',
    description: 'Use your camera to scan the MRZ (Machine Readable Zone) at the bottom of your passport for instant data entry.',
    icon: 'camera-alt',
    tips: [
      'Hold your passport flat and steady',
      'Ensure good lighting for best results',
      'The MRZ is the 2-line code at the bottom',
      'Manual entry is always available as backup'
    ],
    demonstration: {
      type: 'image',
      content: 'Show passport with MRZ highlighted'
    }
  },
  {
    id: 'profile-setup',
    title: 'Profile Setup',
    description: 'Review and complete your travel profile with additional information needed for customs declarations.',
    icon: 'person',
    tips: [
      'Review scanned information for accuracy',
      'Add contact details and preferences',
      'Set up default declaration answers'
    ],
  },
  {
    id: 'security',
    title: 'Security & Privacy',
    description: 'Enable biometric security to protect your sensitive travel information stored in your device\'s secure keychain.',
    icon: 'security',
    tips: [
      'Biometric authentication for extra security',
      'Data encrypted at rest on your device',
      'No data transmitted to servers',
      'iCloud/Google backup excluded for sensitive data'
    ],
  },
  {
    id: 'forms',
    title: 'Smart Form Generation',
    description: 'Create trips and let Borderly auto-fill customs forms for each destination country.',
    icon: 'description',
    tips: [
      'Only answer country-specific questions',
      'Most data auto-filled from your profile',
      'Copy/paste into government portals',
      'Store QR codes from submissions'
    ],
  }
];

export default function TutorialScreen() {
  const navigation = useNavigation<TutorialScreenNavigationProp>();
  const [currentStep, setCurrentStep] = useState(0);
  const [showSkipHint, setShowSkipHint] = useState(true);
  const { width: screenWidth } = Dimensions.get('window');

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
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

  const handleComplete = () => {
    navigation.navigate('PassportScan');
  };

  const currentTutorialStep = tutorialSteps[currentStep];

  return (
    <ScrollView className="flex-1 bg-gradient-to-b from-blue-50 to-white">
      <View className="px-6 py-8">
        {/* Progress indicator */}
        <ProgressIndicator
          steps={tutorialSteps.map(step => ({
            key: step.id,
            title: step.title,
          }))}
          currentStep={currentStep}
          className="mb-8"
          variant="horizontal"
        />

        {/* Skip hint for advanced users */}
        {showSkipHint && currentStep === 0 && (
          <HelpHint
            title="Already familiar with Borderly?"
            content="You can skip this tutorial and jump straight to setup if you've used the app before."
            variant="tip"
            dismissible
            onDismiss={() => setShowSkipHint(false)}
            className="mb-6"
          />
        )}

        {/* Main tutorial content */}
        <Card variant="elevated" className="mb-8 bg-white shadow-xl">
          <View className="items-center py-8">
            {/* Icon */}
            <View className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full items-center justify-center mb-6 shadow-lg">
              <MaterialIcons name={currentTutorialStep.icon} size={40} color="white" />
            </View>

            {/* Title */}
            <Text className="text-2xl font-bold text-gray-900 text-center mb-4">
              {currentTutorialStep.title}
            </Text>

            {/* Description */}
            <Text className="text-base text-gray-600 text-center leading-6 mb-6 max-w-sm">
              {currentTutorialStep.description}
            </Text>

            {/* Demonstration area */}
            {currentTutorialStep.demonstration && (
              <View className="w-full max-w-sm mb-6">
                <Card variant="outlined" className="border-2 border-dashed border-blue-200 bg-blue-50 py-8">
                  <View className="items-center">
                    <MaterialIcons name="image" size={48} color="#93c5fd" />
                    <Text className="text-sm text-blue-600 mt-2 text-center">
                      {currentTutorialStep.demonstration.content}
                    </Text>
                  </View>
                </Card>
              </View>
            )}
          </View>
        </Card>

        {/* Tips section */}
        <Card variant="outlined" className="mb-8 border-green-200 bg-green-50">
          <View className="flex-row items-start mb-4">
            <MaterialIcons name="lightbulb" size={20} color="#16a34a" style={{ marginRight: 8 }} />
            <Text className="text-base font-semibold text-green-800 flex-1">
              Pro Tips
            </Text>
            <Tooltip 
              content="These tips will help you get the most out of Borderly"
              trigger="tap"
            >
              <MaterialIcons name="help-outline" size={16} color="#16a34a" />
            </Tooltip>
          </View>
          <View className="space-y-2">
            {currentTutorialStep.tips.map((tip, index) => (
              <View key={index} className="flex-row items-start">
                <Text className="text-green-600 mr-2 mt-0.5">•</Text>
                <Text className="text-sm text-green-700 flex-1 leading-5">
                  {tip}
                </Text>
              </View>
            ))}
          </View>
        </Card>

        {/* Navigation buttons */}
        <View className="space-y-4">
          <Button
            title={currentStep === tutorialSteps.length - 1 ? 'Get Started' : 'Next'}
            onPress={handleNext}
            size="large"
            fullWidth
            accessibilityLabel={`${currentStep === tutorialSteps.length - 1 ? 'Complete tutorial and get started' : 'Continue to next tutorial step'}`}
          />
          
          <View className="flex-row space-x-4">
            {currentStep > 0 && (
              <Button
                title="Previous"
                onPress={handlePrevious}
                variant="outline"
                size="medium"
                className="flex-1"
              />
            )}
            
            <Button
              title="Skip Tutorial"
              onPress={handleSkip}
              variant="ghost"
              size="medium"
              className="flex-1"
              accessibilityLabel="Skip tutorial and go to passport scanning"
            />
          </View>
          
          {/* Progress dots for mobile */}
          <View className="items-center pt-4">
            <ProgressIndicator
              steps={tutorialSteps.map(step => ({
                key: step.id,
                title: step.title,
              }))}
              currentStep={currentStep}
              variant="dots"
              showLabels={false}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}