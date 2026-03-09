import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Lock, TriangleAlert, Lightbulb } from 'lucide-react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ProfileStackParamList } from '@/app/navigation/types';
import { useProfileStore } from '@/stores/useProfileStore';
import { Button, Card, Input, Select, SelectOption, StatusBadge, Divider } from '@/components/ui';
import { Address } from '@/types/profile';

type EditProfileScreenNavigationProp = NativeStackNavigationProp<ProfileStackParamList, 'EditProfile'>;

export default function EditProfileScreen() {
  const navigation = useNavigation<EditProfileScreenNavigationProp>();
  const { profile, updateProfile, isLoading } = useProfileStore();
  const [formData, setFormData] = useState({
    email: '',
    phoneNumber: '',
    occupation: '',
    homeAddress: {
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    } as Address,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const countryOptions: SelectOption[] = [
    { label: 'Select Country', value: '' },
    { label: 'United States', value: 'USA' },
    { label: 'Canada', value: 'CAN' },
    { label: 'United Kingdom', value: 'GBR' },
    { label: 'Australia', value: 'AUS' },
    { label: 'Japan', value: 'JPN' },
    { label: 'Singapore', value: 'SGP' },
    { label: 'Malaysia', value: 'MYS' },
    { label: 'Germany', value: 'DEU' },
    { label: 'France', value: 'FRA' },
    { label: 'Italy', value: 'ITA' },
  ];

  useEffect(() => {
    if (profile) {
      setFormData({
        email: profile.email || '',
        phoneNumber: profile.phoneNumber || '',
        occupation: profile.occupation || '',
        homeAddress: profile.homeAddress || {
          line1: '',
          line2: '',
          city: '',
          state: '',
          postalCode: '',
          country: '',
        },
      });
    }
  }, [profile]);

  const validateEmail = (email: string) => {
    if (!email) {return '';}
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? '' : 'Please enter a valid email address';
  };

  const validatePhoneNumber = (phone: string) => {
    if (!phone) {return '';}
    const phoneRegex = /^\+?[\d\s\-()]+$/;
    return phoneRegex.test(phone) ? '' : 'Please enter a valid phone number';
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (formData.email) {
      const emailError = validateEmail(formData.email);
      if (emailError) {newErrors.email = emailError;}
    }

    if (formData.phoneNumber) {
      const phoneError = validatePhoneNumber(formData.phoneNumber);
      if (phoneError) {newErrors.phoneNumber = phoneError;}
    }

    if (formData.homeAddress.line1 && !formData.homeAddress.city) {
      newErrors.city = 'City is required when address is provided';
    }

    if (formData.homeAddress.line1 && !formData.homeAddress.country) {
      newErrors.country = 'Country is required when address is provided';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!profile) {return;}

    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please correct the errors and try again.');
      return;
    }

    try {
      const updates: any = {
        email: formData.email || undefined,
        phoneNumber: formData.phoneNumber || undefined,
        occupation: formData.occupation || undefined,
      };

      if (formData.homeAddress.line1 || formData.homeAddress.city) {
        updates.homeAddress = formData.homeAddress;
      } else {
        updates.homeAddress = undefined;
      }

      await updateProfile(updates);
      setHasUnsavedChanges(false);
      navigation.goBack();
      Alert.alert('Success', 'Profile updated successfully.');
    } catch {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
    setHasUnsavedChanges(true);

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const updateAddressData = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      homeAddress: {
        ...prev.homeAddress,
        [field]: value,
      },
    }));
    setHasUnsavedChanges(true);

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  if (!profile) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Text className="text-lg text-gray-600">No profile to edit</Text>
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
              <Text className="text-2xl font-bold text-gray-900">Edit Profile</Text>
              <Text className="text-base text-gray-600">
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
            <Text className="text-lg font-semibold text-gray-900 mr-3">
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
              <Text className="text-xs text-gray-500 mt-1">
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
              <Text className="text-xs text-gray-500 mt-1">
                Include country code for international travel
              </Text>
            </View>

            <View>
              <Input
                label="Occupation"
                value={formData.occupation}
                onChangeText={(value) => updateFormData('occupation', value)}
                placeholder="Software Engineer"
                error={errors.occupation}
              />
              <Text className="text-xs text-gray-500 mt-1">
                Required for some immigration forms
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
            <StatusBadge 
              status="info" 
              size="small" 
              text="Helps Auto-Fill" 
            />
          </View>
          
          <View className="bg-blue-50 p-3 rounded-lg mb-4">
            <View className="flex-row items-center">
              <Lightbulb size={14} color="#1e40af" />
              <Text className="text-xs font-medium text-blue-800 ml-1">Tip</Text>
            </View>
            <Text className="text-xs text-blue-700 mt-1">
              Adding your home address helps automatically fill similar fields in country forms
            </Text>
          </View>

          <View className="space-y-4">
            <Input
              label="Address Line 1"
              value={formData.homeAddress.line1}
              onChangeText={(value) => updateAddressData('line1', value)}
              placeholder="123 Main Street"
              error={errors.line1}
            />

            <Input
              label="Address Line 2 (Optional)"
              value={formData.homeAddress.line2}
              onChangeText={(value) => updateAddressData('line2', value)}
              placeholder="Apt 4B"
              error={errors.line2}
            />

            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Input
                  label="City"
                  value={formData.homeAddress.city}
                  onChangeText={(value) => updateAddressData('city', value)}
                  placeholder="New York"
                  error={errors.city}
                />
              </View>
              <View className="flex-1">
                <Input
                  label="State/Province"
                  value={formData.homeAddress.state}
                  onChangeText={(value) => updateAddressData('state', value)}
                  placeholder="NY"
                  error={errors.state}
                />
              </View>
            </View>

            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Input
                  label="Postal Code"
                  value={formData.homeAddress.postalCode}
                  onChangeText={(value) => updateAddressData('postalCode', value)}
                  placeholder="10001"
                  error={errors.postalCode}
                />
              </View>
              <View className="flex-1">
                <Select
                  label="Country"
                  options={countryOptions}
                  value={formData.homeAddress.country}
                  onValueChange={(value) => updateAddressData('country', value)}
                  placeholder="Select Country"
                  error={errors.country}
                />
              </View>
            </View>
          </View>
        </Card>

        {/* Passport Information Notice */}
        <Card>
          <View className="flex-row items-center mb-3">
            <Lock size={18} color="#374151" />
            <Text className="text-lg font-semibold text-gray-900 ml-2">
              Passport Information
            </Text>
            <View className="ml-auto">
              <StatusBadge status="neutral" size="small" text="Read-Only" />
            </View>
          </View>
          
          <Divider className="mb-3" />
          
          <Text className="text-sm text-gray-600 mb-3">
            Passport information cannot be edited here for security reasons. Your passport data is 
            encrypted and stored securely on this device only.
          </Text>
          
          <View className="bg-amber-50 p-3 rounded-lg">
            <View className="flex-row items-center">
              <TriangleAlert size={12} color="#d97706" style={{ marginRight: 4 }} />
              <Text className="text-xs font-medium text-amber-800">Need to update passport info?</Text>
            </View>
            <Text className="text-xs text-amber-700 mt-1">
              Contact support if your passport details have changed or if you need to rescan your passport.
            </Text>
          </View>
        </Card>

        {/* Action Buttons */}
        <View className="pt-6">
          {hasUnsavedChanges && (
            <View className="bg-yellow-50 p-3 rounded-lg mb-4">
              <View className="flex-row items-center">
                <TriangleAlert size={12} color="#d97706" style={{ marginRight: 4 }} />
                <Text className="text-xs font-medium text-yellow-800">Unsaved Changes</Text>
              </View>
              <Text className="text-xs text-yellow-700 mt-1">
                You have unsaved changes. Make sure to save before leaving this screen.
              </Text>
            </View>
          )}
          
          <View className="flex-row space-x-3">
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
                onPress={handleSave}
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
  );
}
