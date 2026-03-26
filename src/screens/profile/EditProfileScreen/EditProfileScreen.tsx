import { View, Text, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Lock, TriangleAlert, Lightbulb } from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '@/app/navigation/types';
import { useEditProfile } from '@/hooks/useEditProfile';
import { Button, Card, Input, StatusBadge, Divider, AddressAutocomplete, SearchableSelect, ScreenContainer } from '@/components/ui';
import { OCCUPATIONS, MARITAL_STATUSES } from '@/constants/enums';

type EditProfileScreenNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'EditProfile'>;

export default function EditProfileScreen() {
  const navigation = useNavigation<EditProfileScreenNavigationProp>();
  const {
    formData,
    errors,
    hasUnsavedChanges,
    isLoading,
    profile,
    handleSave,
    updateFormData,
    updateAddress,
  } = useEditProfile();

  if (!profile) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-gray-900">
        <Text className="text-lg text-gray-600 dark:text-gray-400">No profile to edit</Text>
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
              <Text className="text-2xl font-bold text-gray-900 dark:text-white">Edit Profile</Text>
              <Text className="text-base text-gray-600 dark:text-gray-400">
                Update your contact information and preferences
              </Text>
            </View>
            {hasUnsavedChanges && (
              <StatusBadge
                status="warning"
                size="small"
                text="Unsaved Changes"
              />
            )}
          </View>
        </View>

        {/* Contact Information */}
        <Card>
          <View className="flex-row items-center mb-4">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white mr-3">
              Contact Information
            </Text>
            <StatusBadge
              status="info"
              size="small"
              text="Required for Travel"
            />
          </View>

          <View className="space-y-4">
            <View>
              <Input
                label="Email Address"
                value={formData.email}
                onChangeText={(value) => updateFormData('email', value)}
                placeholder="your.email@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
              />
              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Required for form confirmations and travel updates
              </Text>
            </View>

            <View>
              <Input
                label="Phone Number"
                value={formData.phoneNumber}
                onChangeText={(value) => updateFormData('phoneNumber', value)}
                placeholder="+1 (555) 123-4567"
                keyboardType="phone-pad"
                error={errors.phoneNumber}
              />
              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Include country code for international travel
              </Text>
            </View>

            <View>
              <SearchableSelect
                label="Occupation"
                options={OCCUPATIONS}
                value={formData.occupation}
                onValueChange={(value) => updateFormData('occupation', value)}
                placeholder="Select your occupation"
                error={errors.occupation}
                testID="occupation-select"
              />
              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Required for some immigration forms
              </Text>
            </View>

            <View>
              <SearchableSelect
                label="Marital Status"
                options={MARITAL_STATUSES}
                value={formData.maritalStatus}
                onValueChange={(value) => updateFormData('maritalStatus', value)}
                placeholder="Select your marital status"
                error={errors.maritalStatus}
                testID="marital-status-select"
              />
              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Required for some immigration forms
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
            <StatusBadge
              status="info"
              size="small"
              text="Helps Auto-Fill"
            />
          </View>

          <View className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-4">
            <View className="flex-row items-center">
              <Lightbulb size={14} color="#1e40af" />
              <Text className="text-xs font-medium text-blue-800 dark:text-blue-200 ml-1">Tip</Text>
            </View>
            <Text className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Adding your home address helps automatically fill similar fields in country forms
            </Text>
          </View>

          <AddressAutocomplete
            value={formData.homeAddress}
            onAddressChange={updateAddress}
            errors={{
              line1: errors.line1,
              city: errors.city,
              state: errors.state,
              postalCode: errors.postalCode,
              country: errors.country,
            }}
            testID="home-address"
          />
        </Card>

        {/* Passport Information Notice */}
        <Card>
          <View className="flex-row items-center mb-3">
            <Lock size={18} color="#374151" />
            <Text className="text-lg font-semibold text-gray-900 dark:text-white ml-2">
              Passport Information
            </Text>
            <View className="ml-auto">
              <StatusBadge status="neutral" size="small" text="Read-Only" />
            </View>
          </View>

          <Divider className="mb-3" />

          <Text className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Passport information cannot be edited here for security reasons. Your passport data is
            encrypted and stored securely on this device only.
          </Text>

          <View className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg">
            <View className="flex-row items-center">
              <TriangleAlert size={12} color="#d97706" style={{ marginRight: 4 }} />
              <Text className="text-xs font-medium text-amber-800 dark:text-amber-200">Need to update passport info?</Text>
            </View>
            <Text className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Contact support if your passport details have changed or if you need to rescan your passport.
            </Text>
          </View>
        </Card>

        {/* Action Buttons */}
        <View className="pt-6">
          {hasUnsavedChanges && (
            <View className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg mb-4">
              <View className="flex-row items-center">
                <TriangleAlert size={12} color="#d97706" style={{ marginRight: 4 }} />
                <Text className="text-xs font-medium text-yellow-800 dark:text-yellow-200">Unsaved Changes</Text>
              </View>
              <Text className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                You have unsaved changes. Make sure to save before leaving this screen.
              </Text>
            </View>
          )}

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Button
                title={hasUnsavedChanges ? "Discard" : "Cancel"}
                onPress={() => {
                  if (hasUnsavedChanges) {
                    Alert.alert(
                      'Discard Changes?',
                      'You have unsaved changes. Are you sure you want to discard them?',
                      [
                        { text: 'Keep Editing', style: 'cancel' },
                        { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() }
                      ]
                    );
                  } else {
                    navigation.goBack();
                  }
                }}
                variant="outline"
                fullWidth
              />
            </View>
            <View className="flex-1">
              <Button
                title={isLoading ? "Saving..." : "Save Changes"}
                onPress={() => handleSave(() => navigation.goBack())}
                variant="primary"
                loading={isLoading}
                disabled={!hasUnsavedChanges}
                fullWidth
              />
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
    </ScreenContainer>
  );
}
