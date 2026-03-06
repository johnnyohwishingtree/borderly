import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ProfileStackParamList } from '@/app/navigation/types';
import { useProfileStore } from '@/stores/useProfileStore';
import { Button, Card, Input, Select, SelectOption } from '@/components/ui';
import { Address } from '@/types/profile';

type EditProfileScreenNavigationProp = StackNavigationProp<ProfileStackParamList, 'EditProfile'>;

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
    if (!email) return '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? '' : 'Please enter a valid email address';
  };

  const validatePhoneNumber = (phone: string) => {
    if (!phone) return '';
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    return phoneRegex.test(phone) ? '' : 'Please enter a valid phone number';
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (formData.email) {
      const emailError = validateEmail(formData.email);
      if (emailError) newErrors.email = emailError;
    }

    if (formData.phoneNumber) {
      const phoneError = validatePhoneNumber(formData.phoneNumber);
      if (phoneError) newErrors.phoneNumber = phoneError;
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
    if (!profile) return;

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
      navigation.goBack();
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

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
        <View className="mb-4">
          <Text className="text-2xl font-bold text-gray-900">Edit Profile</Text>
          <Text className="text-base text-gray-600">
            Update your contact information and preferences
          </Text>
        </View>

        {/* Contact Information */}
        <Card>
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Contact Information
          </Text>

          <View className="space-y-4">
            <Input
              label="Email"
              value={formData.email}
              onChangeText={(value) => updateFormData('email', value)}
              placeholder="your.email@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />

            <Input
              label="Phone Number"
              value={formData.phoneNumber}
              onChangeText={(value) => updateFormData('phoneNumber', value)}
              placeholder="+1 (555) 123-4567"
              keyboardType="phone-pad"
              error={errors.phoneNumber}
            />

            <Input
              label="Occupation"
              value={formData.occupation}
              onChangeText={(value) => updateFormData('occupation', value)}
              placeholder="Software Engineer"
              error={errors.occupation}
            />
          </View>
        </Card>

        {/* Home Address */}
        <Card>
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            Home Address
          </Text>

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
          <View className="flex-row items-center mb-2">
            <Text className="text-lg">🔒</Text>
            <Text className="text-lg font-semibold text-gray-900 ml-2">
              Passport Information
            </Text>
          </View>
          <Text className="text-sm text-gray-600">
            Passport information cannot be edited here. Your passport data is securely stored
            and can only be updated by rescanning your passport during onboarding.
          </Text>
        </Card>

        {/* Action Buttons */}
        <View className="flex-row space-x-3 pt-4">
          <View className="flex-1">
            <Button
              title="Cancel"
              onPress={() => navigation.goBack()}
              variant="outline"
              fullWidth
            />
          </View>
          <View className="flex-1">
            <Button
              title="Save Changes"
              onPress={handleSave}
              variant="primary"
              loading={isLoading}
              fullWidth
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
