import { useState, useMemo, useEffect } from 'react';
import { useProfileStore } from '@/stores/useProfileStore';
import type { TravelerProfile } from '@/types/profile';

export function useSelectTravelers() {
  const currentProfile = useProfileStore(s => s.currentProfile);
  const getAllFamilyProfiles = useProfileStore(s => s.getAllFamilyProfiles);

  const [profiles, setProfiles] = useState<TravelerProfile[]>(() =>
    currentProfile ? [currentProfile] : [],
  );

  useEffect(() => {
    async function loadProfiles() {
      if (!currentProfile) return;
      const family = await getAllFamilyProfiles();
      const others = family.filter(p => p.id !== currentProfile.id);
      setProfiles([currentProfile, ...others]);
    }
    loadProfiles();
  }, [currentProfile, getAllFamilyProfiles]);

  // Primary is always selected
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    currentProfile ? [currentProfile.id] : [],
  );

  const isSoloTraveler = profiles.length <= 1;

  const toggleProfile = (profileId: string) => {
    // Can't deselect primary profile
    if (profileId === currentProfile?.id) return;
    setSelectedIds(prev =>
      prev.includes(profileId)
        ? prev.filter(id => id !== profileId)
        : [...prev, profileId],
    );
  };

  // Check passport expiry (warn if expires within 6 months)
  const passportWarnings = useMemo(() => {
    const warnings = new Map<string, string>();
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

    for (const profile of profiles) {
      if (profile.passportExpiry) {
        const parts = profile.passportExpiry.split('-');
        const expiry = new Date(
          parseInt(parts[0], 10),
          parseInt(parts[1], 10) - 1,
          parseInt(parts[2], 10),
        );
        if (expiry <= sixMonthsFromNow) {
          warnings.set(
            profile.id,
            expiry <= new Date()
              ? 'Passport expired'
              : 'Passport expires within 6 months — some countries may reject entry',
          );
        }
      }
    }
    return warnings;
  }, [profiles]);

  return {
    profiles,
    selectedIds,
    toggleProfile,
    passportWarnings,
    isSoloTraveler,
  };
}
