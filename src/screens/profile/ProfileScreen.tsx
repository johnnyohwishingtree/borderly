import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '@/app/navigation/types';
import { useProfileStore } from '@/stores/useProfileStore';
import { useAppStore } from '@/stores/useAppStore';
import { Button, Card, StatusBadge, Divider, ProgressBar } from '@/components/ui';
import { TravelerProfile } from '@/types/profile';

type ProfileScreenNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'Profile'>;

export default function ProfileScreen() {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { profile, loadProfile, isLoading, error } = useProfileStore();
  const { preferences } = useAppStore();
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
      await useProfileStore.getState().loadProfile();
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

  const isPassportExpiringSoon = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const sixMonths = new Date();
    sixMonths.setMonth(now.getMonth() + 6);
    return expiry <= sixMonths;
  };

  const getProfileCompleteness = () => {
    if (!profile) return { percentage: 0, missing: [] };
    
    const requiredFields = [
      { field: 'email', label: 'Email' },
      { field: 'phoneNumber', label: 'Phone Number' },
      { field: 'occupation', label: 'Occupation' },
      { field: 'homeAddress', label: 'Home Address' },
    ];
    
    const completed = requiredFields.filter(({ field }) => {
      const value = profile[field as keyof typeof profile];
      return value && (field === 'homeAddress' ? value.line1 && value.city && value.country : true);
    });
    
    const missing = requiredFields.filter(({ field }) => {
      const value = profile[field as keyof typeof profile];
      return !value || (field === 'homeAddress' && (!value.line1 || !value.city || !value.country));
    });
    
    return {
      percentage: Math.round((completed.length / requiredFields.length) * 100),
      missing: missing.map(m => m.label)
    };
  };

  const maskPassportNumber = (passportNumber: string) => {
    if (passportNumber.length <= 4) {return passportNumber;}
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
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-900">
                {profile.givenNames} {profile.surname}
              </Text>
              <Text className="text-base text-gray-600">Travel Profile</Text>
            </View>
            <View className="items-end">
              {isPassportExpiringSoon(profile.passportExpiry) ? (
                <StatusBadge 
                  status="warning" 
                  size="small" 
                  text="Passport Expiring" 
                  className="mb-1"
                />
              ) : (
                <StatusBadge 
                  status="success" 
                  size="small" 
                  text="Valid" 
                  className="mb-1"
                />
              )}
            </View>
          </View>
          
          {/* Profile Completeness */}
          <Card className="mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-sm font-semibold text-gray-900">Profile Completeness</Text>
              <Text className="text-sm text-gray-600">{getProfileCompleteness().percentage}%</Text>
            </View>
            <ProgressBar 
              progress={getProfileCompleteness().percentage} 
              height="small"
              className="mb-2"
            />
            {getProfileCompleteness().missing.length > 0 && (
              <Text className="text-xs text-gray-500">
                Missing: {getProfileCompleteness().missing.join(', ')}
              </Text>
            )}
          </Card>
        </View>

        {/* Passport Information */}
        <Card>
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center">
              <Text className="text-lg font-semibold text-gray-900 mr-3">
                Passport Information
              </Text>
              {preferences.biometricEnabled ? (
                <StatusBadge 
                  status={isUnlocked ? "success" : "warning"} 
                  size="small" 
                  text={isUnlocked ? "Unlocked" : "Locked"} 
                />
              ) : (
                <StatusBadge 
                  status="neutral" 
                  size="small" 
                  text="Biometric Off" 
                />
              )}
            </View>
            {isPassportExpiringSoon(profile.passportExpiry) && (
              <View className="flex-row items-center">
                <Text className="text-xs text-orange-600 mr-1">⚠️</Text>
                <Text className="text-xs text-orange-600">Expiring Soon</Text>
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
            <View className="space-y-4">
              <View className="grid grid-cols-1 gap-3">
                <View className="bg-gray-50 p-3 rounded-lg">
                  <Text className="text-xs font-medium text-gray-500 uppercase tracking-wide">Passport Number</Text>
                  <Text className="text-base font-mono text-gray-900 mt-1">
                    {isUnlocked ? secureProfile?.passportNumber : maskPassportNumber(profile.passportNumber)}
                  </Text>
                </View>
                
                <View className="flex-row space-x-3">
                  <View className="flex-1 bg-gray-50 p-3 rounded-lg">
                    <Text className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nationality</Text>
                    <Text className="text-sm text-gray-900 mt-1">{profile.nationality}</Text>
                  </View>
                  <View className="flex-1 bg-gray-50 p-3 rounded-lg">
                    <Text className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gender</Text>
                    <Text className="text-sm text-gray-900 mt-1">{profile.gender}</Text>
                  </View>
                </View>
                
                <View className="bg-gray-50 p-3 rounded-lg">
                  <Text className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date of Birth</Text>
                  <Text className="text-sm text-gray-900 mt-1">{formatDate(profile.dateOfBirth)}</Text>
                </View>
                
                <View className="bg-gray-50 p-3 rounded-lg">
                  <Text className="text-xs font-medium text-gray-500 uppercase tracking-wide">Passport Expires</Text>
                  <View className="flex-row items-center justify-between mt-1">
                    <Text className={`text-sm ${isPassportExpiringSoon(profile.passportExpiry) ? 'text-orange-600 font-medium' : 'text-gray-900'}`}>
                      {formatDate(profile.passportExpiry)}
                    </Text>
                    {isPassportExpiringSoon(profile.passportExpiry) && (
                      <Text className="text-xs text-orange-600">⚠️ Expiring Soon</Text>
                    )}
                  </View>
                </View>
                
                <View className="bg-gray-50 p-3 rounded-lg">
                  <Text className="text-xs font-medium text-gray-500 uppercase tracking-wide">Issued by</Text>
                  <Text className="text-sm text-gray-900 mt-1">{profile.issuingCountry}</Text>
                </View>
              </View>
            </View>
          )}
        </Card>

        {/* Contact Information */}
        <Card>
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center">
              <Text className="text-lg font-semibold text-gray-900 mr-3">
                Contact Information
              </Text>
              {(!profile.email || !profile.phoneNumber || !profile.occupation) && (
                <StatusBadge status="warning" size="small" text="Incomplete" />
              )}
            </View>
            <Button
              title="Edit"
              onPress={() => navigation.navigate('EditProfile')}
              variant="outline"
              size="small"
            />
          </View>

          <View className="space-y-3">
            <View className="bg-gray-50 p-3 rounded-lg">
              <Text className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</Text>
              <Text className={`text-sm mt-1 ${!profile.email ? 'text-gray-400 italic' : 'text-gray-900'}`}>
                {profile.email || 'Not provided'}
              </Text>
            </View>
            <View className="bg-gray-50 p-3 rounded-lg">
              <Text className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone</Text>
              <Text className={`text-sm mt-1 ${!profile.phoneNumber ? 'text-gray-400 italic' : 'text-gray-900'}`}>
                {profile.phoneNumber || 'Not provided'}
              </Text>
            </View>
            <View className="bg-gray-50 p-3 rounded-lg">
              <Text className="text-xs font-medium text-gray-500 uppercase tracking-wide">Occupation</Text>
              <Text className={`text-sm mt-1 ${!profile.occupation ? 'text-gray-400 italic' : 'text-gray-900'}`}>
                {profile.occupation || 'Not provided'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Home Address */}
        <Card>
          <View className="flex-row items-center mb-4">
            <Text className="text-lg font-semibold text-gray-900 mr-3">
              Home Address
            </Text>
            {!profile.homeAddress && (
              <StatusBadge status="warning" size="small" text="Missing" />
            )}
          </View>

          {profile.homeAddress ? (
            <View className="bg-gray-50 p-4 rounded-lg">
              <Text className="text-sm text-gray-900 font-medium">{profile.homeAddress.line1}</Text>
              {profile.homeAddress.line2 && (
                <Text className="text-sm text-gray-700">{profile.homeAddress.line2}</Text>
              )}
              <Text className="text-sm text-gray-700 mt-1">
                {profile.homeAddress.city}
                {profile.homeAddress.state && `, ${profile.homeAddress.state}`}
                {` ${profile.homeAddress.postalCode}`}
              </Text>
              <Text className="text-sm text-gray-600 mt-1">{profile.homeAddress.country}</Text>
            </View>
          ) : (
            <View className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-200">
              <Text className="text-sm text-gray-500 text-center">No address provided</Text>
              <Text className="text-xs text-gray-400 text-center mt-1">
                Add your home address to improve form auto-fill
              </Text>
            </View>
          )}
        </Card>

        {/* Profile Metadata */}
        <Card>
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Profile Information
          </Text>

          <View className="space-y-3">
            <View className="bg-gray-50 p-3 rounded-lg">
              <Text className="text-xs font-medium text-gray-500 uppercase tracking-wide">Created</Text>
              <Text className="text-sm text-gray-900 mt-1">{formatDate(profile.createdAt)}</Text>
            </View>
            <View className="bg-gray-50 p-3 rounded-lg">
              <Text className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last Updated</Text>
              <Text className="text-sm text-gray-900 mt-1">{formatDate(profile.updatedAt)}</Text>
            </View>
          </View>
          
          <Divider className="my-4" />
          
          {/* Security Notice */}
          <View className="flex-row items-start">
            <Text className="text-lg mr-2">🔒</Text>
            <View className="flex-1">
              <Text className="text-sm font-medium text-gray-900">Local-First Security</Text>
              <Text className="text-xs text-gray-600 mt-1">
                Your passport data is encrypted and stored securely on this device only. 
                It never leaves your phone unless you explicitly share it.
              </Text>
            </View>
          </View>
        </Card>
      </View>
    </ScrollView>
  );
}
