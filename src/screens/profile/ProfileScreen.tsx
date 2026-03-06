import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '@/app/navigation/types';
import { useProfileStore } from '@/stores/useProfileStore';
import { useAppStore } from '@/stores/useAppStore';
import { Button, Card } from '@/components/ui';
import { TravelerProfile } from '@/types/profile';

type ProfileScreenNavigationProp = StackNavigationProp<ProfileStackParamList, 'Profile'>;

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { profile, loadProfile, isLoading, error } = useProfileStore();
  const { preferences, isBiometricAvailable } = useAppStore();
  const [secureProfile, setSecureProfile] = useState<TravelerProfile | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleUnlockProfile = async () => {
    if (!preferences.biometricEnabled) {
      setSecureProfile(profile);
      setIsUnlocked(true);
      return;
    }

    try {
      const biometricProfile = await useProfileStore.getState().loadProfile();
      if (profile) {
        setSecureProfile(profile);
        setIsUnlocked(true);
      }
    } catch (err) {
      Alert.alert(
        'Authentication Failed',
        'Could not authenticate. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const maskPassportNumber = (passportNumber: string) => {
    if (passportNumber.length <= 4) return passportNumber;
    const visiblePart = passportNumber.slice(-4);
    const maskedPart = '*'.repeat(passportNumber.length - 4);
    return `${maskedPart}${visiblePart}`;
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Text className="text-lg text-gray-600">Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 px-6">
        <Text className="text-lg text-red-600 text-center mb-4">{error}</Text>
        <Button title="Try Again" onPress={loadProfile} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 px-6">
        <Text className="text-2xl font-bold text-gray-900 mb-2">No Profile Found</Text>
        <Text className="text-base text-gray-600 text-center mb-6">
          You need to complete onboarding to create your travel profile.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4 space-y-4">
        {/* Header */}
        <View className="mb-4">
          <Text className="text-2xl font-bold text-gray-900">
            {profile.givenNames} {profile.surname}
          </Text>
          <Text className="text-base text-gray-600">Travel Profile</Text>
        </View>

        {/* Passport Information */}
        <Card>
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-semibold text-gray-900">
              Passport Information
            </Text>
            {preferences.biometricEnabled && !isUnlocked && (
              <View className="flex-row items-center">
                <Text className="text-xs text-orange-600 mr-2">Locked</Text>
                <Text className="text-lg">🔒</Text>
              </View>
            )}
          </View>

          {!isUnlocked && preferences.biometricEnabled ? (
            <View className="py-6">
              <Text className="text-center text-gray-600 mb-4">
                Passport data is protected by biometric authentication
              </Text>
              <Button
                title="Unlock with Biometrics"
                onPress={handleUnlockProfile}
                variant="primary"
                fullWidth
              />
            </View>
          ) : (
            <View className="space-y-3">
              <View className="flex-row justify-between">
                <Text className="text-sm font-medium text-gray-700">Passport Number</Text>
                <Text className="text-sm text-gray-900">
                  {isUnlocked ? secureProfile?.passportNumber : maskPassportNumber(profile.passportNumber)}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm font-medium text-gray-700">Nationality</Text>
                <Text className="text-sm text-gray-900">{profile.nationality}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm font-medium text-gray-700">Date of Birth</Text>
                <Text className="text-sm text-gray-900">{formatDate(profile.dateOfBirth)}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm font-medium text-gray-700">Gender</Text>
                <Text className="text-sm text-gray-900">{profile.gender}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm font-medium text-gray-700">Passport Expires</Text>
                <Text className="text-sm text-gray-900">{formatDate(profile.passportExpiry)}</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-sm font-medium text-gray-700">Issued by</Text>
                <Text className="text-sm text-gray-900">{profile.issuingCountry}</Text>
              </View>
            </View>
          )}
        </Card>

        {/* Contact Information */}
        <Card>
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-semibold text-gray-900">
              Contact Information
            </Text>
            <Button
              title="Edit"
              onPress={() => navigation.navigate('EditProfile')}
              variant="outline"
              size="small"
            />
          </View>

          <View className="space-y-3">
            <View className="flex-row justify-between">
              <Text className="text-sm font-medium text-gray-700">Email</Text>
              <Text className="text-sm text-gray-900">
                {profile.email || 'Not provided'}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm font-medium text-gray-700">Phone</Text>
              <Text className="text-sm text-gray-900">
                {profile.phoneNumber || 'Not provided'}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm font-medium text-gray-700">Occupation</Text>
              <Text className="text-sm text-gray-900">
                {profile.occupation || 'Not provided'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Home Address */}
        <Card>
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Home Address
          </Text>

          {profile.homeAddress ? (
            <View className="space-y-2">
              <Text className="text-sm text-gray-900">{profile.homeAddress.line1}</Text>
              {profile.homeAddress.line2 && (
                <Text className="text-sm text-gray-900">{profile.homeAddress.line2}</Text>
              )}
              <Text className="text-sm text-gray-900">
                {profile.homeAddress.city}
                {profile.homeAddress.state && `, ${profile.homeAddress.state}`}
                {` ${profile.homeAddress.postalCode}`}
              </Text>
              <Text className="text-sm text-gray-900">{profile.homeAddress.country}</Text>
            </View>
          ) : (
            <Text className="text-sm text-gray-600">No address provided</Text>
          )}
        </Card>

        {/* Profile Metadata */}
        <Card>
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Profile Information
          </Text>

          <View className="space-y-3">
            <View className="flex-row justify-between">
              <Text className="text-sm font-medium text-gray-700">Created</Text>
              <Text className="text-sm text-gray-900">{formatDate(profile.createdAt)}</Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-sm font-medium text-gray-700">Last Updated</Text>
              <Text className="text-sm text-gray-900">{formatDate(profile.updatedAt)}</Text>
            </View>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}
