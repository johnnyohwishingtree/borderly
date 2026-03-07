import { useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { OnboardingStackParamList } from '../../app/navigation/types';
import { Button, Card, ProgressBar } from '../../components/ui';
import { useProfileStore } from '../../stores/useProfileStore';

type ConfirmProfileScreenNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'ConfirmProfile'>;

export default function ConfirmProfileScreen() {
  const navigation = useNavigation<ConfirmProfileScreenNavigationProp>();
  const { profile, loadProfile, isLoading } = useProfileStore();

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleContinue = () => {
    navigation.navigate('BiometricSetup');
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleEdit = () => {
    navigation.goBack();
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gradient-to-b from-blue-50 to-white">
        <View className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
        <Text className="text-lg text-gray-700 font-medium">Loading profile...</Text>
        <Text className="text-sm text-gray-500">Retrieving your secure data</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View className="flex-1 justify-center items-center bg-gradient-to-b from-red-50 to-white px-6">
        <View className="w-20 h-20 bg-red-100 rounded-full items-center justify-center mb-4">
          <Text className="text-3xl">❌</Text>
        </View>
        <Text className="text-xl font-bold text-gray-900 mb-2">No Profile Found</Text>
        <Text className="text-base text-gray-600 text-center mb-6">
          We couldn't find your profile data. Please go back and enter your passport information again.
        </Text>
        <Button 
          title="🔙 Go Back" 
          onPress={handleBack}
          variant="primary"
          size="large"
          fullWidth
        />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gradient-to-b from-green-50 to-white">
      <View className="px-6 py-8">
        {/* Progress indicator */}
        <ProgressBar progress={75} className="mb-6" />
        
        <View className="mb-8 items-center">
          <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-4">
            <Text className="text-3xl">✅</Text>
          </View>
          <Text className="text-2xl font-bold text-gray-900 mb-2 text-center">
            Confirm Your Profile
          </Text>
          <Text className="text-base text-gray-600 text-center">
            Review your passport information before proceeding. Everything looks good!
          </Text>
        </View>

        <Card variant="elevated" className="mb-6 bg-white shadow-xl border-0">
          <View className="bg-gradient-to-r from-green-500 to-green-600 -m-6 mb-6 p-6 rounded-t-xl">
            <Text className="text-xl font-bold text-white mb-1">
              🛂 Passport Information
            </Text>
            <Text className="text-green-100 text-sm">
              Securely stored on your device
            </Text>
          </View>

          <View className="space-y-5">
            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-blue-100 rounded-lg items-center justify-center mr-4">
                <Text className="text-xl">🛂</Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-500 mb-1">Passport Number</Text>
                <Text className="text-lg font-semibold text-gray-900">{profile.passportNumber}</Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-purple-100 rounded-lg items-center justify-center mr-4">
                <Text className="text-xl">👤</Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-500 mb-1">Full Name</Text>
                <Text className="text-lg font-semibold text-gray-900">{profile.givenNames} {profile.surname}</Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-red-100 rounded-lg items-center justify-center mr-4">
                <Text className="text-xl">🌍</Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-500 mb-1">Nationality</Text>
                <Text className="text-lg font-semibold text-gray-900">{profile.nationality}</Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-yellow-100 rounded-lg items-center justify-center mr-4">
                <Text className="text-xl">🎂</Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-500 mb-1">Date of Birth</Text>
                <Text className="text-lg font-semibold text-gray-900">{profile.dateOfBirth}</Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-pink-100 rounded-lg items-center justify-center mr-4">
                <Text className="text-xl">
                  {profile.gender === 'M' ? '♂️' : profile.gender === 'F' ? '♀️' : '⚧️'}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-500 mb-1">Gender</Text>
                <Text className="text-lg font-semibold text-gray-900">
                  {profile.gender === 'M' ? 'Male' : profile.gender === 'F' ? 'Female' : 'Other'}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-orange-100 rounded-lg items-center justify-center mr-4">
                <Text className="text-xl">📅</Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-500 mb-1">Passport Expiry</Text>
                <Text className="text-lg font-semibold text-gray-900">{profile.passportExpiry}</Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <View className="w-12 h-12 bg-teal-100 rounded-lg items-center justify-center mr-4">
                <Text className="text-xl">🏛️</Text>
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-500 mb-1">Issuing Country</Text>
                <Text className="text-lg font-semibold text-gray-900">{profile.issuingCountry}</Text>
              </View>
            </View>
          </View>
        </Card>

        <Card variant="outlined" className="mb-8 border-2 border-green-200 bg-green-50/50">
          <View className="flex-row items-start">
            <View className="w-12 h-12 bg-green-100 rounded-lg items-center justify-center mr-4 mt-1">
              <Text className="text-xl">🔒</Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-semibold text-gray-900 mb-2">
                🛡️ Security Notice
              </Text>
              <Text className="text-sm text-gray-700 mb-3">
                This information is stored securely on your device using your device's keychain.
                It will never be transmitted to our servers and remains under your control.
              </Text>
              <View className="flex-row items-center">
                <Text className="text-green-600 font-medium text-sm">✓ Encrypted</Text>
                <Text className="text-green-600 font-medium text-sm ml-4">✓ Local Storage</Text>
                <Text className="text-green-600 font-medium text-sm ml-4">✓ No Server</Text>
              </View>
            </View>
          </View>
        </Card>

        <View className="space-y-4">
          <Button
            title="🔐 Continue to Security Setup"
            onPress={handleContinue}
            size="large"
            fullWidth
          />

          <Button
            title="✏️ Edit Information"
            onPress={handleEdit}
            variant="outline"
            size="large"
            fullWidth
          />
        </View>
      </View>
    </ScrollView>
  );
}
