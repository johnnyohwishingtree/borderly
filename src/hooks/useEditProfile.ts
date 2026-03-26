import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useProfileStore } from '@/stores/useProfileStore';
import { Address, TravelerProfile } from '@/types/profile';

export interface EditProfileFormData {
  email: string;
  phoneNumber: string;
  occupation: string;
  maritalStatus: string;
  homeAddress: Address;
}

export interface UseEditProfileReturn {
  formData: EditProfileFormData;
  errors: Record<string, string>;
  hasUnsavedChanges: boolean;
  isLoading: boolean;
  profile: TravelerProfile | null;
  validateForm: () => boolean;
  handleSave: (onSuccess: () => void) => Promise<void>;
  updateFormData: (field: string, value: string) => void;
  updateAddress: (address: Address) => void;
}

const EMPTY_ADDRESS: Address = {
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
};

export function validateEmail(email: string): string {
  if (!email) return '';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) ? '' : 'Please enter a valid email address';
}

export function validatePhoneNumber(phone: string): string {
  if (!phone) return '';
  const phoneRegex = /^\+?[\d\s\-()]+$/;
  return phoneRegex.test(phone) ? '' : 'Please enter a valid phone number';
}

export function useEditProfile(): UseEditProfileReturn {
  const { profile, updateProfile, isLoading } = useProfileStore();
  const [formData, setFormData] = useState<EditProfileFormData>({
    email: '',
    phoneNumber: '',
    occupation: '',
    maritalStatus: '',
    homeAddress: EMPTY_ADDRESS,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        email: profile.email || '',
        phoneNumber: profile.phoneNumber || '',
        occupation: profile.occupation || '',
        maritalStatus: profile.maritalStatus || '',
        homeAddress: profile.homeAddress || EMPTY_ADDRESS,
      });
    }
  }, [profile]);

  const validateForm = useCallback((): boolean => {
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
  }, [formData]);

  const handleSave = useCallback(async (onSuccess: () => void) => {
    if (!profile) return;

    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please correct the errors and try again.');
      return;
    }

    try {
      const updates: Partial<TravelerProfile> = {};
      if (formData.email) updates.email = formData.email;
      if (formData.phoneNumber) updates.phoneNumber = formData.phoneNumber;
      if (formData.occupation) updates.occupation = formData.occupation;
      if (formData.maritalStatus) updates.maritalStatus = formData.maritalStatus;

      if (formData.homeAddress.line1 || formData.homeAddress.city) {
        updates.homeAddress = formData.homeAddress;
      }

      await updateProfile(updates);
      setHasUnsavedChanges(false);
      Alert.alert('Success', 'Profile updated successfully.', [
        { text: 'OK', onPress: onSuccess },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  }, [profile, validateForm, formData, updateProfile]);

  const updateFormData = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  const updateAddress = useCallback((address: Address) => {
    setFormData(prev => ({ ...prev, homeAddress: address }));
    setHasUnsavedChanges(true);
    setErrors(prev => {
      const next = { ...prev };
      delete next.line1;
      delete next.city;
      delete next.state;
      delete next.postalCode;
      delete next.country;
      return next;
    });
  }, []);

  return {
    formData,
    errors,
    hasUnsavedChanges,
    isLoading,
    profile,
    validateForm,
    handleSave,
    updateFormData,
    updateAddress,
  };
}

export default useEditProfile;
