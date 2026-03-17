import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useProfileStore } from '../stores/useProfileStore';
import type { TravelerProfile } from '../types/profile';
import type { ProfileOption } from '../components/submission/AutoFillPill';

/**
 * Manages profile loading and selection for portal submission.
 * Loads all family profiles, builds a selectable list, and tracks
 * which profile is currently selected for auto-fill.
 */
export function usePortalProfiles() {
  const { profile, getAllProfiles, familyProfiles } = useProfileStore();

  const [loadedProfiles, setLoadedProfiles] = useState<Map<string, TravelerProfile>>(new Map());
  const [availableProfiles, setAvailableProfiles] = useState<ProfileOption[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const lastUsedProfileRef = useRef<string>('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const allProfiles = await getAllProfiles();
        if (cancelled) return;

        const options: ProfileOption[] = [];
        for (const [profileId, travelerProfile] of allProfiles) {
          const metadata = familyProfiles.profiles.get(profileId);
          options.push({
            id: profileId,
            name: `${travelerProfile.givenNames} ${travelerProfile.surname}`,
            relationship: metadata?.relationship ?? 'other',
          });
        }

        setAvailableProfiles(options);
        setLoadedProfiles(allProfiles);

        const primaryId = familyProfiles.primaryProfileId;
        const defaultId =
          primaryId && allProfiles.has(primaryId)
            ? primaryId
            : options[0]?.id ?? '';
        const resolvedId = lastUsedProfileRef.current || defaultId;
        setSelectedProfileId(resolvedId);
      } catch {
        if (cancelled) return;
        if (profile) {
          const fallbackOption: ProfileOption = {
            id: profile.id,
            name: `${profile.givenNames} ${profile.surname}`,
            relationship: 'self',
          };
          setAvailableProfiles([fallbackOption]);
          setLoadedProfiles(new Map([[profile.id, profile]]));
          setSelectedProfileId(profile.id);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [getAllProfiles, familyProfiles, profile]);

  const effectiveProfile = useMemo<TravelerProfile | null>(() => {
    if (selectedProfileId && loadedProfiles.has(selectedProfileId)) {
      return loadedProfiles.get(selectedProfileId) ?? null;
    }
    return profile ?? null;
  }, [selectedProfileId, loadedProfiles, profile]);

  const handleProfileChange = useCallback((profileId: string) => {
    setSelectedProfileId(profileId);
    lastUsedProfileRef.current = profileId;
  }, []);

  return {
    availableProfiles,
    selectedProfileId,
    effectiveProfile,
    lastUsedProfileRef,
    handleProfileChange,
  };
}
