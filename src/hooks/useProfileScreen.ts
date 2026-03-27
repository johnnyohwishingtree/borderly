import { useState, useCallback, useMemo, useEffect } from 'react';
import { Alert } from 'react-native';
import { useProfileStore } from '@/stores/useProfileStore';
import { useAppStore } from '@/stores/useAppStore';
import { TravelerProfile } from '@/types/profile';
import { FamilyProfileCollection } from '@/types/family';

export interface ProfileCompleteness {
  percentage: number;
  missing: string[];
}

export interface UseProfileScreenReturn {
  data: {
    profile: TravelerProfile | null;
    secureProfile: TravelerProfile | null;
    familyProfiles: FamilyProfileCollection;
    completeness: ProfileCompleteness;
  };
  state: {
    isUnlocked: boolean;
    isLoading: boolean;
    error: string | null;
    biometricEnabled: boolean;
  };
  actions: {
    handleUnlockProfile: () => Promise<void>;
    maskPassportNumber: (passportNumber: string) => string;
    loadProfile: () => void;
  };
}

const REQUIRED_FIELDS = [
  { field: 'email', label: 'Email' },
  { field: 'phoneNumber', label: 'Phone Number' },
  { field: 'occupation', label: 'Occupation' },
  { field: 'homeAddress', label: 'Home Address' },
] as const;

function computeCompleteness(profile: TravelerProfile | null): ProfileCompleteness {
  if (!profile) return { percentage: 0, missing: [] };

  const isFieldComplete = (field: string): boolean => {
    if (field === 'homeAddress') {
      const addr = profile.homeAddress;
      return addr ? !!(addr.line1 && addr.city && addr.country) : false;
    }
    return !!profile[field as keyof typeof profile];
  };

  const missing = REQUIRED_FIELDS.filter(({ field }) => !isFieldComplete(field)).map(m => m.label);
  const completed = REQUIRED_FIELDS.length - missing.length;

  return {
    percentage: Math.round((completed / REQUIRED_FIELDS.length) * 100),
    missing,
  };
}

export function formatDate(dateString: string): string {
  // Parse as local date to avoid UTC timezone shift
  // '2026-01-15' → Jan 15 (not Jan 14 in west of UTC)
  const [year, month, day] = dateString.split('T')[0].split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function isPassportExpiringSoon(expiryDate: string): boolean {
  const expiry = new Date(expiryDate);
  const now = new Date();
  const sixMonths = new Date();
  sixMonths.setMonth(now.getMonth() + 6);
  return expiry <= sixMonths;
}

export function maskPassportNumber(passportNumber: string): string {
  if (passportNumber.length <= 4) return passportNumber;
  const visiblePart = passportNumber.slice(-4);
  const maskedPart = '*'.repeat(passportNumber.length - 4);
  return `${maskedPart}${visiblePart}`;
}

export function useProfileScreen(): UseProfileScreenReturn {
  const { profile, familyProfiles, loadProfile, isLoading, error } = useProfileStore();
  const { preferences } = useAppStore();
  const [secureProfile, setSecureProfile] = useState<TravelerProfile | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const completeness = useMemo(() => computeCompleteness(profile), [profile]);

  const handleUnlockProfile = useCallback(async () => {
    if (!preferences.biometricEnabled) {
      setSecureProfile(profile);
      setIsUnlocked(true);
      return;
    }

    try {
      await useProfileStore.getState().loadProfile();
      const freshProfile = useProfileStore.getState().profile;
      if (freshProfile) {
        setSecureProfile(freshProfile);
        setIsUnlocked(true);
      }
    } catch {
      Alert.alert(
        'Authentication Failed',
        'Could not authenticate. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }, [preferences.biometricEnabled, profile]);

  return {
    data: {
      profile,
      secureProfile,
      familyProfiles,
      completeness,
    },
    state: {
      isUnlocked,
      isLoading,
      error,
      biometricEnabled: preferences.biometricEnabled,
    },
    actions: {
      handleUnlockProfile,
      maskPassportNumber,
      loadProfile,
    },
  };
}

export default useProfileScreen;
