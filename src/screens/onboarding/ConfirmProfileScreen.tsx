import { useEffect } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { OnboardingStackParamList } from '../../app/navigation/types';
import { Button, Card } from '../../components/ui';
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
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Text className="text-lg text-gray-600">Loading profile...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 px-6">
        <Text className="text-lg text-gray-900 mb-2">No Profile Found</Text>
        <Text className="text-base text-gray-600 text-center mb-6">
          We couldn't find your profile data. Please go back and enter your passport information again.
        </Text>
        <Button title="Go Back" onPress={handleBack} />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-6 py-8">
        <View className="mb-6">
          <Text className="text-2xl font-bold text-gray-900 mb-2">
            Confirm Profile
          </Text>
          <Text className="text-base text-gray-600">
            Review your passport information before proceeding. You can edit any details if needed.
          </Text>
        </View>

        <Card variant="elevated" className="mb-6">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Passport Information
          </Text>

          <View className="space-y-4">
            <View>
              <Text className="text-sm font-medium text-gray-500 mb-1">Passport Number</Text>
              <Text className="text-base text-gray-900">{profile.passportNumber}</Text>
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-500 mb-1">Full Name</Text>
              <Text className="text-base text-gray-900">{profile.givenNames} {profile.surname}</Text>
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-500 mb-1">Nationality</Text>
              <Text className="text-base text-gray-900">{profile.nationality}</Text>
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-500 mb-1">Date of Birth</Text>
              <Text className="text-base text-gray-900">{profile.dateOfBirth}</Text>
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-500 mb-1">Gender</Text>
              <Text className="text-base text-gray-900">
                {profile.gender === 'M' ? 'Male' : profile.gender === 'F' ? 'Female' : 'Other'}
              </Text>
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-500 mb-1">Passport Expiry</Text>
              <Text className="text-base text-gray-900">{profile.passportExpiry}</Text>
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-500 mb-1">Issuing Country</Text>
              <Text className="text-base text-gray-900">{profile.issuingCountry}</Text>
            </View>
          </View>
        </Card>

        <Card variant="outlined" className="mb-6">
          <Text className="text-base font-medium text-gray-900 mb-2">
            Security Notice
          </Text>
          <Text className="text-sm text-gray-600">
            This information is stored securely on your device using your device's keychain. 
            It will never be transmitted to our servers and remains under your control.
          </Text>
        </Card>

        <View className="space-y-4">
          <Button
            title="Continue to Security Setup"
            onPress={handleContinue}
            size="large"
            fullWidth
          />
          
          <Button
            title="Edit Information"
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
