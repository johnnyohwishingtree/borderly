import { useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  BookOpen, User, Globe, CalendarDays, Users,
  CalendarClock, Building2, ShieldCheck, Lock,
  CircleAlert,
} from 'lucide-react-native';

import { OnboardingStackParamList } from '@/app/navigation/types';
import { CONFIRM_PROFILE_IDS } from './testIDs';
import { Button, Card, ProgressBar, ScreenContainer } from '@/components/ui';
import { useProfileStore } from '@/stores/useProfileStore';
import { formatDateForDisplay } from '@/utils/dateUtils';

type ConfirmProfileScreenNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'ConfirmProfile'>;

export default function ConfirmProfileScreen() {
  const navigation = useNavigation<ConfirmProfileScreenNavigationProp>();
  const { profile, loadProfile, isLoading, setOnboardingComplete } = useProfileStore();

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleContinue = () => {
    setOnboardingComplete(true);
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleEdit = () => {
    navigation.goBack();
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gradient-to-b from-blue-50 to-white dark:bg-gray-900">
        <View className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <Text className="text-lg text-gray-700 dark:text-gray-300 font-medium">Loading profile...</Text>
        <Text className="text-sm text-gray-500 dark:text-gray-500">Retrieving your secure data</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View className="flex-1 justify-center items-center bg-gradient-to-b from-red-50 to-white dark:bg-gray-900 px-6">
        <View className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full items-center justify-center mb-4">
          <CircleAlert size={40} color="#dc2626" />
        </View>
        <Text className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Profile Found</Text>
        <Text className="text-base text-gray-600 dark:text-gray-400 text-center mb-6">
          We couldn't find your profile data. Please go back and enter your passport information again.
        </Text>
        <Button
          title="Go Back"
          onPress={handleBack}
          variant="primary"
          size="large"
          fullWidth
          testID={CONFIRM_PROFILE_IDS.confirmGoBackButton.id}
        />
      </View>
    );
  }

  const fields = [
    { icon: BookOpen, color: '#3b82f6', bg: 'bg-blue-100', label: 'Passport Number', value: profile.passportNumber },
    { icon: User, color: '#8b5cf6', bg: 'bg-purple-100', label: 'Full Name', value: `${profile.givenNames} ${profile.surname}` },
    { icon: Globe, color: '#ef4444', bg: 'bg-red-100', label: 'Nationality', value: profile.nationality },
    { icon: CalendarDays, color: '#eab308', bg: 'bg-yellow-100', label: 'Date of Birth', value: formatDateForDisplay(profile.dateOfBirth) },
    { icon: Users, color: '#ec4899', bg: 'bg-pink-100', label: 'Gender', value: profile.gender === 'M' ? 'Male' : profile.gender === 'F' ? 'Female' : 'Other' },
    { icon: CalendarClock, color: '#f97316', bg: 'bg-orange-100', label: 'Passport Expiry', value: formatDateForDisplay(profile.passportExpiry) },
    { icon: Building2, color: '#14b8a6', bg: 'bg-teal-100', label: 'Issuing Country', value: profile.issuingCountry },
  ];

  return (
    <ScreenContainer className="bg-gradient-to-b from-green-50 to-white dark:bg-gray-900">
    <ScrollView className="flex-1">
      <View className="px-6 py-8">
        {/* Progress indicator */}
        <ProgressBar progress={75} className="mb-6" />

        <View className="mb-8 items-center">
          <View className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full items-center justify-center mb-4">
            <ShieldCheck size={40} color="#16a34a" />
          </View>
          <Text
            className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center"
            testID={CONFIRM_PROFILE_IDS.confirmProfileTitle.id}
          >
            Confirm Your Profile
          </Text>
          <Text className="text-base text-gray-600 dark:text-gray-400 text-center">
            Review your passport information before proceeding. Everything looks good!
          </Text>
        </View>

        <Card variant="elevated" className="mb-6 bg-white shadow-xl border-0">
          <View className="bg-gradient-to-r from-green-500 to-green-600 -m-6 mb-6 p-6 rounded-t-xl">
            <Text className="text-xl font-bold text-white mb-1">
              Passport Information
            </Text>
            <Text className="text-green-100 text-sm">
              Securely stored on your device
            </Text>
          </View>

          <View className="space-y-5">
            {fields.map((field) => (
              <View key={field.label} className="flex-row items-center">
                <View className={`w-12 h-12 ${field.bg} rounded-lg items-center justify-center mr-4`}>
                  <field.icon size={24} color={field.color} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{field.label}</Text>
                  <Text
                    className="text-lg font-semibold text-gray-900 dark:text-white"
                    testID={CONFIRM_PROFILE_IDS.profileField.dynamic.replace('{label}', field.label.toLowerCase().replace(/ /g, '-'))}
                  >
                    {field.value}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Card>

        <Card variant="outlined" className="mb-8 border-2 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10">
          <View className="flex-row items-start">
            <View className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg items-center justify-center mr-4 mt-1">
              <Lock size={24} color="#16a34a" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center mb-2">
                <ShieldCheck size={20} color="#374151" />
                <Text className="text-lg font-semibold text-gray-900 dark:text-white ml-2">
                  Security Notice
                </Text>
              </View>
              <Text className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                This information is stored securely on your device using your device's keychain.
                It will never be transmitted to our servers and remains under your control.
              </Text>
              <View className="flex-row items-center">
                <Text className="text-green-600 dark:text-green-400 font-medium text-sm">Encrypted</Text>
                <Text className="text-green-600 dark:text-green-400 font-medium text-sm ml-4">Local Storage</Text>
                <Text className="text-green-600 dark:text-green-400 font-medium text-sm ml-4">No Server</Text>
              </View>
            </View>
          </View>
        </Card>

      </View>
    </ScrollView>

    {/* Fixed footer CTA */}
    <View className="bg-gradient-to-b from-green-50 to-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 pb-8">
      <Button
        title="Continue"
        onPress={handleContinue}
        size="large"
        fullWidth
        testID={CONFIRM_PROFILE_IDS.continueToSecurityButton.id}
      />
      <View className="mt-3">
        <Button
          title="Edit Information"
          onPress={handleEdit}
          variant="outline"
          size="large"
          fullWidth
          testID={CONFIRM_PROFILE_IDS.editInformationButton.id}
        />
      </View>
    </View>
    </ScreenContainer>
  );
}
