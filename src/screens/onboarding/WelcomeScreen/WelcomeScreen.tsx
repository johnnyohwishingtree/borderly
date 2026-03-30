import { useState } from 'react';
import { ScrollView, View, Text, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Globe,
  Plane,
  Lock,
  Smartphone,
  Zap,
  ShieldCheck,
  UploadCloud,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';

import { OnboardingStackParamList } from '@/app/navigation/types';
import { WELCOME_IDS } from './testIDs';
import { Button, Card, ProgressBar, ScreenContainer } from '@/components/ui';
import CountryFlag from '@/components/trips/CountryFlag';
import { SUPPORTED_COUNTRIES } from '@/constants/countries';
import { useTheme } from '@/utils/theme';

type WelcomeScreenNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'Welcome'>;

export default function WelcomeScreen() {
  const navigation = useNavigation<WelcomeScreenNavigationProp>();
  const { colors } = useTheme();
  const [showCountries, setShowCountries] = useState(false);

  const handleGetStarted = () => {
    navigation.navigate('PassportScan');
  };

  return (
    <ScreenContainer className="bg-gray-50 dark:bg-gray-900">
    <ScrollView
      className="flex-1"
      accessibilityLabel="Welcome to Borderly screen"
      accessibilityHint="Swipe up to read about features"
    >
      <View className="flex-1 px-6 pt-12 pb-4">
        {/* Progress indicator */}
        <ProgressBar
          progress={25}
          className="mb-6"
          accessibilityLabel="Setup progress: Step 1 of 4"
        />

        {/* Hero section */}
        <View className="items-center mb-6" accessibilityRole="header">
          <View
            className="w-24 h-24 bg-primary-600 rounded-3xl items-center justify-center mb-6 shadow-lg"
            accessibilityLabel="Borderly app icon"
            accessibilityRole="image"
          >
            <Globe size={40} color="white" />
          </View>

          <Text className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-1" accessibilityRole="header">
            Welcome to
          </Text>
          <Text className="text-3xl font-bold text-primary-600 text-center mb-3" accessibilityRole="header">
            Borderly
          </Text>
          <Text className="text-lg text-gray-600 dark:text-gray-400 text-center max-w-sm">
            Your universal travel declaration companion. Fill once, travel everywhere.
          </Text>
        </View>

        {/* Features section */}
        <Card variant="elevated" className="mb-4 p-0 overflow-hidden">
          <View className="bg-primary-600 p-6">
            <View className="flex-row items-center mb-2">
              <Plane size={20} color="white" style={{ marginRight: 8 }} />
              <Text className="text-xl font-bold text-white">
                Fill Once, Travel Everywhere
              </Text>
            </View>
            <Text className="text-blue-100">
              Store your travel profile securely and auto-generate customs forms for any destination.
            </Text>
          </View>

          <View className="p-6 space-y-6">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full items-center justify-center mr-4">
                <Lock size={20} color={colors.success} />
              </View>
              <View>
                <Text className="text-gray-900 dark:text-white font-semibold">Private & Secure</Text>
                <Text className="text-gray-600 dark:text-gray-400 text-sm">Data stays on your device</Text>
              </View>
            </View>
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full items-center justify-center mr-4">
                <Smartphone size={20} color={colors.accent} />
              </View>
              <View>
                <Text className="text-gray-900 dark:text-white font-semibold">Works Offline</Text>
                <Text className="text-gray-600 dark:text-gray-400 text-sm">No internet required</Text>
              </View>
            </View>
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full items-center justify-center mr-4">
                <Zap size={20} color={colors.accent} />
              </View>
              <View>
                <Text className="text-gray-900 dark:text-white font-semibold">Lightning Fast</Text>
                <Text className="text-gray-600 dark:text-gray-400 text-sm">Fill forms in seconds</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Countries supported — collapsed by default */}
        <Pressable
          onPress={() => setShowCountries(!showCountries)}
          className="mb-4"
          accessibilityRole="button"
          accessibilityLabel={`${SUPPORTED_COUNTRIES.length} countries supported. Tap to ${showCountries ? 'collapse' : 'expand'}`}
        >
          <Card variant="outlined" className="bg-blue-50/30 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Globe size={20} color={colors.textPrimary} className="mr-2" />
                <Text className="text-base font-semibold text-gray-900 dark:text-white">
                  {SUPPORTED_COUNTRIES.length} Countries Supported
                </Text>
              </View>
              {showCountries ? <ChevronUp size={20} color={colors.textSecondary} /> : <ChevronDown size={20} color={colors.textSecondary} />}
            </View>
            {showCountries && (
              <View className="flex-row flex-wrap justify-around mt-4">
                {SUPPORTED_COUNTRIES.map((country) => (
                  <View key={country.code} className="items-center mb-3 w-1/4">
                    <CountryFlag countryCode={country.code} size="medium" className="mb-2" />
                    <Text className="text-xs text-gray-600 dark:text-gray-400">{country.name}</Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        </Pressable>

        {/* Privacy notice */}
        <Card variant="outlined" className="mb-4 border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-900/10">
          <View className="flex-row items-start">
            <ShieldCheck size={24} color={colors.success} className="mr-3" />
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900 dark:text-white mb-1">
                Privacy First
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400 leading-5">
                Your passport data is encrypted and stored only in your device's secure keychain.
              </Text>
            </View>
          </View>
        </Card>
      </View>
    </ScrollView>

    {/* Fixed footer CTA — always visible without scrolling */}
    <View className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 pb-8">
      <Button
        title="Get Started"
        onPress={handleGetStarted}
        size="large"
        fullWidth
        testID={WELCOME_IDS.takeTutorialButton.id}
      />
      <Pressable
        onPress={() => navigation.navigate('RestoreBackup')}
        testID={WELCOME_IDS.restoreBackupLinkButton.id}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Restore from backup"
        accessibilityHint="If you have a .borderly backup file, tap here to restore your data"
        className="flex-row items-center justify-center py-2"
      >
        <UploadCloud size={16} color="#6b7280" />
        <Text className="text-sm text-gray-500 dark:text-gray-400 ml-2">
          Already have a backup?{' '}
          <Text className="text-primary-600 font-medium">Restore</Text>
        </Text>
      </Pressable>
    </View>
    </ScreenContainer>
  );
}
