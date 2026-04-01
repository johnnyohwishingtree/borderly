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
      <View className="flex-1 bg-surface-secondary">
        <LoadingSpinner size="large" text="Loading your profile..." variant="spinner" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-surface-secondary">
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
      <View className="flex-1 bg-surface-secondary">
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
    <ScreenContainer className="bg-surface-secondary">
    <ScrollView className="flex-1">
      <View className="p-4 space-y-4">
        {/* Header */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-1">
              <Text className="text-2xl font-bold text-primary">
                {profile.givenNames} {profile.surname}
              </Text>
              <Text className="text-base text-secondary">Travel Profile</Text>
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
              <Text className="text-sm font-semibold text-primary">Profile Completeness</Text>
              <Text className="text-sm text-secondary">{completeness.percentage}%</Text>
            </View>
            <ProgressBar progress={completeness.percentage} size="small" className="mb-2" />
            {completeness.missing.length > 0 && (
              <Text className="text-xs text-tertiary">
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
              <Text className="text-lg font-semibold text-primary mr-3">
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
              <Text className="text-center text-secondary mb-4">
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
                <View className="bg-surface-secondary p-3 rounded-lg">
                  <Text className="text-xs font-medium text-tertiary uppercase tracking-wide">Passport Number</Text>
                  <Text className="text-base font-mono text-primary mt-1">
                    {isUnlocked ? secureProfile?.passportNumber : maskPassportNumber(profile.passportNumber)}
                  </Text>
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1 bg-surface-secondary p-3 rounded-lg">
                    <Text className="text-xs font-medium text-tertiary uppercase tracking-wide">Nationality</Text>
                    <Text className="text-sm text-primary mt-1">{profile.nationality}</Text>
                  </View>
                  <View className="flex-1 bg-surface-secondary p-3 rounded-lg">
                    <Text className="text-xs font-medium text-tertiary uppercase tracking-wide">Gender</Text>
                    <Text className="text-sm text-primary mt-1">{profile.gender}</Text>
                  </View>
                </View>

                <View className="bg-surface-secondary p-3 rounded-lg">
                  <Text className="text-xs font-medium text-tertiary uppercase tracking-wide">Date of Birth</Text>
                  <Text className="text-sm text-primary mt-1">{formatDate(profile.dateOfBirth)}</Text>
                </View>

                <View className="bg-surface-secondary p-3 rounded-lg">
                  <Text className="text-xs font-medium text-tertiary uppercase tracking-wide">Passport Expires</Text>
                  <View className="flex-row items-center justify-between mt-1">
                    <Text className={`text-sm ${isPassportExpiringSoon(profile.passportExpiry) ? 'text-orange-600 font-medium' : 'text-primary'}`}>
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

                <View className="bg-surface-secondary p-3 rounded-lg">
                  <Text className="text-xs font-medium text-tertiary uppercase tracking-wide">Issued by</Text>
                  <Text className="text-sm text-primary mt-1">{profile.issuingCountry}</Text>
                </View>
              </View>
            </View>
          )}
        </Card>

        {/* Contact Information */}
        <Card>
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center">
              <Text className="text-lg font-semibold text-primary mr-3">
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
            <View className="bg-surface-secondary p-3 rounded-lg">
              <Text className="text-xs font-medium text-tertiary uppercase tracking-wide">Email</Text>
              <Text className={`text-sm mt-1 ${!profile.email ? 'text-muted italic' : 'text-primary'}`}>
                {profile.email || 'Not provided'}
              </Text>
            </View>
            <View className="bg-surface-secondary p-3 rounded-lg">
              <Text className="text-xs font-medium text-tertiary uppercase tracking-wide">Phone</Text>
              <Text className={`text-sm mt-1 ${!profile.phoneNumber ? 'text-muted italic' : 'text-primary'}`}>
                {profile.phoneNumber || 'Not provided'}
              </Text>
            </View>
            <View className="bg-surface-secondary p-3 rounded-lg">
              <Text className="text-xs font-medium text-tertiary uppercase tracking-wide">Occupation</Text>
              <Text className={`text-sm mt-1 ${!profile.occupation ? 'text-muted italic' : 'text-primary'}`}>
                {profile.occupation || 'Not provided'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Home Address */}
        <Card>
          <View className="flex-row items-center mb-4">
            <Text className="text-lg font-semibold text-primary mr-3">
              Home Address
            </Text>
            {!profile.homeAddress && (
              <StatusBadge status="warning" size="small" text="Missing" />
            )}
          </View>

          {profile.homeAddress ? (
            <View className="bg-surface-secondary p-4 rounded-lg">
              <Text className="text-sm text-primary font-medium">{profile.homeAddress.line1}</Text>
              {profile.homeAddress.line2 && (
                <Text className="text-sm text-secondary">{profile.homeAddress.line2}</Text>
              )}
              <Text className="text-sm text-secondary mt-1">
                {profile.homeAddress.city}
                {profile.homeAddress.state && `, ${profile.homeAddress.state}`}
                {` ${profile.homeAddress.postalCode}`}
              </Text>
              <Text className="text-sm text-secondary mt-1">{profile.homeAddress.country}</Text>
            </View>
          ) : (
            <View className="bg-surface-secondary p-4 rounded-lg border-2 border-dashed border-border-default">
              <Text className="text-sm text-tertiary text-center">No address provided</Text>
              <Text className="text-xs text-muted text-center mt-1">
                Add your home address to improve form auto-fill
              </Text>
            </View>
          )}
        </Card>

        {/* Family Management */}
        <Card>
          <Text className="text-lg font-semibold text-primary mb-4">
            Family Members
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('FamilyManagement')}
            testID={PROFILE_SCREEN_IDS.familySummaryRow.id}
            activeOpacity={0.7}
          >
            <View className="flex-row items-center justify-between bg-surface-secondary p-4 rounded-lg">
              <Text className="text-sm text-secondary">
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
          <Text className="text-lg font-semibold text-primary mb-4">
            Profile Information
          </Text>

          <View className="space-y-3">
            <View className="bg-surface-secondary p-3 rounded-lg">
              <Text className="text-xs font-medium text-tertiary uppercase tracking-wide">Created</Text>
              <Text className="text-sm text-primary mt-1">{formatDate(profile.createdAt)}</Text>
            </View>
            <View className="bg-surface-secondary p-3 rounded-lg">
              <Text className="text-xs font-medium text-tertiary uppercase tracking-wide">Last Updated</Text>
              <Text className="text-sm text-primary mt-1">{formatDate(profile.updatedAt)}</Text>
            </View>
          </View>

          <Divider className="my-4" />

          {/* Security Notice */}
          <View className="flex-row items-start">
            <View className="mr-2"><Lock size={18} color="#374151" /></View>
            <View className="flex-1">
              <Text className="text-sm font-medium text-primary">Local-First Security</Text>
              <Text className="text-xs text-secondary mt-1">
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
