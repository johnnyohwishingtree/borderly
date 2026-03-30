/**
 * useTripList — Business logic for TripListScreen.
 *
 * Manages trip loading, family member resolution, schema banner state,
 * duplicate trip flow, and navigation callbacks.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTripStore } from '@/stores/useTripStore';
import { useAppStore } from '@/stores/useAppStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { useTripListDeadlines } from '@/hooks/useTripListDeadlines';
import { useDeadlineSummary } from '@/hooks/useDeadlineSummary';
import { useLoadingState } from '@/components/ui/LoadingStates';
import { HapticFeedback } from '@/components/ui/HapticFeedback';
import type { Trip } from '@/types/trip';
import type { FamilyMember } from '@/types/profile';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export interface UseTripListReturn {
  /** All trips from the store */
  trips: Trip[];
  /** Loading state group */
  loading: {
    state: 'idle' | 'loading' | 'error' | 'success' | 'timeout';
    storeError: string | null;
    isLoading: boolean;
    isLoadingMore: boolean;
    hasMoreTrips: boolean;
    loadMoreTrips: () => void;
    resetLoading: () => void;
    handleRefresh: () => Promise<void>;
  };
  /** Family members resolved per trip */
  travelers: {
    travelersByTripId: Record<string, FamilyMember[]>;
  };
  /** Deadline data */
  deadlines: {
    urgencyByTripId: Record<string, import('@/hooks/useTripListDeadlines').TripUrgency>;
    deadlineSummary: import('@/hooks/useDeadlineSummary').UseDeadlineSummaryReturn;
  };
  /** Schema banner */
  schemaBanner: {
    showSchemaBanner: boolean;
    schemaBannerMessage: string;
    dismissSchemaBanner: () => void;
  };
  /** First run prompt */
  firstRun: {
    hasSeenFirstRunPrompt: boolean;
    dismissFirstRunPrompt: () => void;
  };
  /** Duplicate trip flow */
  duplicate: {
    duplicateTargetId: string | null;
    isDuplicating: boolean;
    duplicateError: string | null;
    handleOpenDuplicateModal: (trip: Trip) => void;
    handleCloseDuplicateModal: () => void;
    handleConfirmDuplicate: (newDepartureDate: string) => Promise<void>;
  };
  /** Navigation handlers */
  navigation: {
    handleTripPress: (trip: Trip) => void;
    handleCreateTrip: () => void;
    handleImportTrip: () => void;
    handleGoToForm: (tripId: string, legId: string) => void;
    handleDeleteTrip: (trip: Trip) => void;
  };
}

export function useTripList(): UseTripListReturn {
  const navigation = useNavigation();
  const {
    trips,
    isLoading,
    isLoadingMore,
    error: storeError,
    hasMoreTrips,
    loadTrips,
    loadMoreTrips,
    deleteTrip,
    duplicateTrip,
  } = useTripStore();

  const { getAllProfiles, loadFamilyProfiles } = useProfileStore();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const { urgencyByTripId, schemas: deadlineSchemas } = useTripListDeadlines(trips);
  const deadlineSummary = useDeadlineSummary(trips, deadlineSchemas);

  const [duplicateTargetId, setDuplicateTargetId] = useState<string | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  const {
    lastSchemaRefreshTime,
    schemaRefreshCountries,
    schemaBannerDismissedAt,
    dismissSchemaBanner,
    loadPersistedAppState,
    hasSeenFirstRunPrompt,
    dismissFirstRunPrompt,
  } = useAppStore();

  const {
    state: loadingState,
    setLoading,
    setLoadingError,
    setLoadingSuccess,
    reset: resetLoading,
  } = useLoadingState();

  // Initial fetch
  const fetchTrips = useCallback(async () => {
    setLoading();
    try {
      await loadTrips({ refresh: true });
      setLoadingSuccess();
    } catch (err) {
      setLoadingError(err instanceof Error ? err.message : 'Failed to load trips');
    }
  }, [setLoading, loadTrips, setLoadingSuccess, setLoadingError]);

  useEffect(() => {
    fetchTrips();
    loadPersistedAppState();
  }, [fetchTrips, loadPersistedAppState]);

  // Load family members for traveler avatars
  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        try {
          await loadFamilyProfiles();
          const profiles = await getAllProfiles();
          const members: FamilyMember[] = Array.from(profiles.values()).map(p => ({
            ...p,
            relationship: p.relationship ?? 'self',
          }));
          setFamilyMembers(members);
        } catch {
          // Non-critical — avatars just won't show
        }
      };
      load();
    }, [loadFamilyProfiles, getAllProfiles]),
  );

  // Resolve travelers for a given trip
  const travelersByTripId = useMemo(() => {
    if (familyMembers.length <= 1) return {};
    const memberMap = new Map(familyMembers.map(m => [m.id, m]));
    const result: Record<string, FamilyMember[]> = {};
    for (const trip of trips) {
      const ids = new Set<string>();
      for (const leg of trip.legs) {
        if (leg.assignedTravelers) {
          for (const id of leg.assignedTravelers) {
            ids.add(id);
          }
        }
      }
      if (ids.size > 1) {
        result[trip.id] = Array.from(ids)
          .map(id => memberMap.get(id))
          .filter((m): m is FamilyMember => m !== undefined);
      }
    }
    return result;
  }, [trips, familyMembers]);

  // Schema banner
  const showSchemaBanner =
    lastSchemaRefreshTime !== null &&
    Date.now() - lastSchemaRefreshTime < TWENTY_FOUR_HOURS_MS &&
    (schemaBannerDismissedAt === null || schemaBannerDismissedAt < lastSchemaRefreshTime);

  const schemaBannerMessage = useMemo(() => {
    if (schemaRefreshCountries.length === 0) {
      return 'Form data updated — country entry forms have new fields.';
    }
    if (schemaRefreshCountries.length === 1) {
      return `Form data updated — ${schemaRefreshCountries[0]} entry form has new fields.`;
    }
    const listed = schemaRefreshCountries.slice(0, 2).join(' & ');
    const extra = schemaRefreshCountries.length > 2 ? ` and ${schemaRefreshCountries.length - 2} more` : '';
    return `Form data updated — ${listed}${extra} entry forms have new fields.`;
  }, [schemaRefreshCountries]);

  // Handlers
  const handleRefresh = useCallback(async () => {
    HapticFeedback.refresh();
    await fetchTrips();
  }, [fetchTrips]);

  const handleTripPress = useCallback((trip: Trip) => {
    HapticFeedback.navigation();
    (navigation as any).navigate('TripDetail', { tripId: trip.id });
  }, [navigation]);

  const handleCreateTrip = useCallback(() => {
    HapticFeedback.button('large');
    (navigation as any).navigate('CreateTrip');
  }, [navigation]);

  const handleImportTrip = useCallback(() => {
    HapticFeedback.button('medium');
    (navigation as any).navigate('ImportTrip');
  }, [navigation]);

  const handleGoToForm = useCallback((tripId: string, legId: string) => {
    (navigation as any).navigate('LegForm', { tripId, legId });
  }, [navigation]);

  const handleDeleteTrip = useCallback((trip: Trip) => {
    Alert.alert(
      'Delete Trip',
      `Are you sure you want to delete "${trip.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTrip(trip.id);
            } catch {
              Alert.alert('Error', 'Failed to delete trip');
            }
          },
        },
      ],
    );
  }, [deleteTrip]);

  const handleOpenDuplicateModal = useCallback((trip: Trip) => {
    setDuplicateError(null);
    setDuplicateTargetId(trip.id);
  }, []);

  const handleCloseDuplicateModal = useCallback(() => {
    setDuplicateTargetId(null);
    setDuplicateError(null);
  }, []);

  const handleConfirmDuplicate = useCallback(async (newDepartureDate: string) => {
    if (!duplicateTargetId) return;
    setIsDuplicating(true);
    setDuplicateError(null);
    try {
      const newTrip = await duplicateTrip(duplicateTargetId, newDepartureDate);
      setDuplicateTargetId(null);
      (navigation as any).navigate('TripDetail', { tripId: newTrip.id });
    } catch {
      setDuplicateError('Failed to duplicate trip. Please try again.');
    } finally {
      setIsDuplicating(false);
    }
  }, [duplicateTargetId, duplicateTrip, navigation]);

  return {
    trips,
    loading: {
      state: loadingState,
      storeError,
      isLoading,
      isLoadingMore,
      hasMoreTrips,
      loadMoreTrips,
      resetLoading,
      handleRefresh,
    },
    travelers: { travelersByTripId },
    deadlines: { urgencyByTripId, deadlineSummary },
    schemaBanner: { showSchemaBanner, schemaBannerMessage, dismissSchemaBanner },
    firstRun: { hasSeenFirstRunPrompt, dismissFirstRunPrompt },
    duplicate: {
      duplicateTargetId,
      isDuplicating,
      duplicateError,
      handleOpenDuplicateModal,
      handleCloseDuplicateModal,
      handleConfirmDuplicate,
    },
    navigation: {
      handleTripPress,
      handleCreateTrip,
      handleImportTrip,
      handleGoToForm,
      handleDeleteTrip,
    },
  };
}
