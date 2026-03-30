import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { TriangleAlert, Lock, User, ChevronRight } from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '@/app/navigation/types';
import { Button, Card, StatusBadge, Divider, ProgressBar, LoadingSpinner, EmptyState, ScreenContainer } from '@/components/ui';
import { DocumentValidityCard } from '@/components/profile';
import { useProfileScreen, formatDate, isPassportExpiringSoon } from '@/hooks/useProfileScreen';
import { PROFILE_SCREEN_IDS } from './testIDs';

type ProfileScreenNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'Profile'>;

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const {
    data: { profile, secureProfile, familyProfiles, completeness },
    state: { isUnlocked, isLoading, error, biometricEnabled },
    actions: { handleUnlockProfile, maskPassportNumber, loadProfile },
  } = useProfileScreen();

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="large" text="Loading your profile..." variant="spinner" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <EmptyState
          icon={<TriangleAlert size={32} color="#dc2626" />}
          title="Unable to load profile"
          description={error}
          buttonProps={{ title: "Try Again", onPress: loadProfile, variant: "primary" }}
          variant="default"
        />
      </View>
    );
  }

  if (!profile) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900">
        <EmptyState
          icon={<User size={40} color="#6b7280" />}
          title="No Profile Found"
          description="You need to complete onboarding to create your travel profile."
          variant="illustration"
        />
      </View>
    );
  }

  return (
    <ScreenContainer className="bg-gray-50 dark:bg-gray-900">
    <ScrollView className="flex-1">
      <View className="p-4 space-y-4">
        {/* Header */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-900 dark:text-white">
                {profile.givenNames} {profile.surname}
              </Text>
              <Text className="text-base text-gray-600 dark:text-gray-400">Travel Profile</Text>
            </View>
            <View className="items-end">
              {isPassportExpiringSoon(profile.passportExpiry) ? (
                <StatusBadge status="warning" size="small" text="Passport Expiring" className="mb-1" />
              ) : (
                <StatusBadge status="success" size="small" text="Valid" className="mb-1" />
              )}
            </View>
          </View>

          {/* Profile Completeness */}
          <Card className="mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-sm font-semibold text-gray-900 dark:text-white">Profile Completeness</Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400">{completeness.percentage}%</Text>
            </View>
            <ProgressBar progress={completeness.percentage} size="small" className="mb-2" />
            {completeness.missing.length > 0 && (
              <Text className="text-xs text-gray-500 dark:text-gray-500">
                Missing: {completeness.missing.join(', ')}
              </Text>
            )}
          </Card>
        </View>

        {/* Document Validity */}
        <DocumentValidityCard passportExpiry={profile.passportExpiry} />

        {/* Passport Information */}
        <Card>
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white mr-3">
                Passport Information
              </Text>
              {biometricEnabled ? (
                <StatusBadge
                  status={isUnlocked ? "success" : "warning"}
                  size="small"
                  text={isUnlocked ? "Unlocked" : "Locked"}
                />
              ) : (
                <StatusBadge status="warning" size="small" text="Biometric Off" />
              )}
            </View>
            {isPassportExpiringSoon(profile.passportExpiry) && (
              <View className="flex-row items-center">
                <View className="mr-1"><TriangleAlert size={12} color="#ea580c" /></View>
                <Text className="text-xs text-orange-600">Expiring Soon</Text>
              </View>
            )}
          </View>

          {!isUnlocked && biometricEnabled ? (
            <View className="py-6">
              <Text className="text-center text-gray-600 dark:text-gray-400 mb-4">
                Passport data is protected by biometric authentication
              </Text>
              <Button
                title="Unlock with Biometrics"
                onPress={handleUnlockProfile}
                variant="primary"
                fullWidth
                testID={PROFILE_SCREEN_IDS.unlockBiometricsButton.id}
              />
            </View>
          ) : (
            <View className="space-y-4">
              <View className="grid grid-cols-1 gap-3">
                <View className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Passport Number</Text>
                  <Text className="text-base font-mono text-gray-900 dark:text-white mt-1">
                    {isUnlocked ? secureProfile?.passportNumber : maskPassportNumber(profile.passportNumber)}
                  </Text>
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Nationality</Text>
                    <Text className="text-sm text-gray-900 dark:text-white mt-1">{profile.nationality}</Text>
                  </View>
                  <View className="flex-1 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Gender</Text>
                    <Text className="text-sm text-gray-900 dark:text-white mt-1">{profile.gender}</Text>
                  </View>
                </View>

                <View className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date of Birth</Text>
                  <Text className="text-sm text-gray-900 dark:text-white mt-1">{formatDate(profile.dateOfBirth)}</Text>
                </View>

                <View className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Passport Expires</Text>
                  <View className="flex-row items-center justify-between mt-1">
                    <Text className={`text-sm ${isPassportExpiringSoon(profile.passportExpiry) ? 'text-orange-600 font-medium' : 'text-gray-900 dark:text-white'}`}>
                      {formatDate(profile.passportExpiry)}
                    </Text>
                    {isPassportExpiringSoon(profile.passportExpiry) && (
                      <View className="flex-row items-center">
                        <View className="mr-1"><TriangleAlert size={12} color="#ea580c" /></View>
                        <Text className="text-xs text-orange-600">Expiring Soon</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Issued by</Text>
                  <Text className="text-sm text-gray-900 dark:text-white mt-1">{profile.issuingCountry}</Text>
                </View>
              </View>
            </View>
          )}
        </Card>

        {/* Contact Information */}
        <Card>
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white mr-3">
                Contact Information
              </Text>
              {(!profile.email || !profile.phoneNumber || !profile.occupation) && (
                <StatusBadge status="warning" size="small" text="Incomplete" />
              )}
            </View>
            <Button
              title="Edit"
              onPress={() => navigation.navigate('EditProfile')}
              variant="secondary"
              size="small"
              testID={PROFILE_SCREEN_IDS.editContactButton.id}
            />
          </View>

          <View className="space-y-3">
            <View className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email</Text>
              <Text className={`text-sm mt-1 ${!profile.email ? 'text-gray-400 dark:text-gray-600 italic' : 'text-gray-900 dark:text-white'}`}>
                {profile.email || 'Not provided'}
              </Text>
            </View>
            <View className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Phone</Text>
              <Text className={`text-sm mt-1 ${!profile.phoneNumber ? 'text-gray-400 dark:text-gray-600 italic' : 'text-gray-900 dark:text-white'}`}>
                {profile.phoneNumber || 'Not provided'}
              </Text>
            </View>
            <View className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Occupation</Text>
              <Text className={`text-sm mt-1 ${!profile.occupation ? 'text-gray-400 dark:text-gray-600 italic' : 'text-gray-900 dark:text-white'}`}>
                {profile.occupation || 'Not provided'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Home Address */}
        <Card>
          <View className="flex-row items-center mb-4">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mr-3">
              Home Address
            </Text>
            {!profile.homeAddress && (
              <StatusBadge status="warning" size="small" text="Missing" />
            )}
          </View>

          {profile.homeAddress ? (
            <View className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <Text className="text-sm text-gray-900 dark:text-white font-medium">{profile.homeAddress.line1}</Text>
              {profile.homeAddress.line2 && (
                <Text className="text-sm text-gray-700 dark:text-gray-300">{profile.homeAddress.line2}</Text>
              )}
              <Text className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                {profile.homeAddress.city}
                {profile.homeAddress.state && `, ${profile.homeAddress.state}`}
                {` ${profile.homeAddress.postalCode}`}
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">{profile.homeAddress.country}</Text>
            </View>
          ) : (
            <View className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
              <Text className="text-sm text-gray-500 dark:text-gray-400 text-center">No address provided</Text>
              <Text className="text-xs text-gray-400 dark:text-gray-600 text-center mt-1">
                Add your home address to improve form auto-fill
              </Text>
            </View>
          )}
        </Card>

        {/* Family Management */}
        <Card>
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Family Members
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('FamilyManagement')}
            testID={PROFILE_SCREEN_IDS.familySummaryRow.id}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center justify-between bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <Text className="text-sm text-gray-700 dark:text-gray-300">
                {familyProfiles.profiles.size === 1
                  ? '1 family member'
                  : `${familyProfiles.profiles.size} family members`}
              </Text>
              <ChevronRight size={16} color="#6b7280" />
            </View>
          </TouchableOpacity>
        </Card>

        {/* Profile Metadata */}
        <Card>
          <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Profile Information
          </Text>

          <View className="space-y-3">
            <View className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Created</Text>
              <Text className="text-sm text-gray-900 dark:text-white mt-1">{formatDate(profile.createdAt)}</Text>
            </View>
            <View className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
              <Text className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Last Updated</Text>
              <Text className="text-sm text-gray-900 dark:text-white mt-1">{formatDate(profile.updatedAt)}</Text>
            </View>
          </View>

          <Divider className="my-4" />

          {/* Security Notice */}
          <View className="flex-row items-start">
            <View className="mr-2"><Lock size={18} color="#374151" /></View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-900 dark:text-white">Local-First Security</Text>
              <Text className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Your passport data is encrypted and stored securely on this device only.
                It never leaves your phone unless you explicitly share it.
              </Text>
            </View>
          </View>
        </Card>
      </View>
    </ScrollView>
    </ScreenContainer>
  );
}
