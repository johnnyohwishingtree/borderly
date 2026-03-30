/**
 * useTripDetail — Business logic for TripDetailScreen.
 *
 * Manages trip data derivation, family member loading, deadline computation,
 * duplicate trip flow, submission progress, and navigation callbacks.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTripStore } from '@/stores/useTripStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { useEditTrip } from '@/hooks/useEditTrip';
import { useTripReadiness } from '@/hooks/useTripReadiness';
import {
  computeTripDeadlines,
  LegDeadline,
} from '@/services/deadline/deadlineService';
import { getSchemaByCountryCode } from '@/schemas';
import type { CountryFormSchema } from '@/types/schema';
import type { Trip, TripLeg } from '@/types/trip';
import type { FamilyMember } from '@/types/profile';

interface UseTripDetailOptions {
  tripId: string;
}

export function useTripDetail({ tripId }: UseTripDetailOptions) {
  const navigation = useNavigation();

  const trips = useTripStore(state => state.trips);
  const { deleteTrip, updateLegSubmissionStatus, duplicateTrip } = useTripStore();
  const { getAllProfiles, loadFamilyProfiles, currentProfileId } = useProfileStore();

  // Reactively derive the trip from the store so UI updates immediately after edits
  const trip: Trip | null = useMemo(
    () => trips.find(t => t.id === tripId) ?? null,
    [trips, tripId],
  );

  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [deadlineMap, setDeadlineMap] = useState<Record<string, LegDeadline>>({});
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  // Compute deadlines whenever the trip changes
  useEffect(() => {
    if (!trip || trip.legs.length === 0) {
      setDeadlineMap({});
      return;
    }
    let cancelled = false;
    const load = async () => {
      const uniqueCodes = Array.from(new Set(trip.legs.map(l => l.destinationCountry)));
      const schemaEntries = await Promise.all(
        uniqueCodes.map(async code => {
          const schema = await getSchemaByCountryCode(code);
          return [code, schema] as [string, CountryFormSchema | null];
        }),
      );
      const schemas: Record<string, CountryFormSchema> = Object.fromEntries(
        schemaEntries.filter((entry): entry is [string, CountryFormSchema] => entry[1] !== null)
      );
      const deadlines = computeTripDeadlines(trip, schemas);
      if (!cancelled) {
        const record: Record<string, LegDeadline> = {};
        for (const d of deadlines) {
          record[d.legId] = d;
        }
        setDeadlineMap(record);
      }
    };
    load().catch(err =>
      console.error('useTripDetail: failed to compute deadlines', err),
    );
    return () => {
      cancelled = true;
    };
  }, [trip]);

  // Load family members — re-run on focus so newly added members appear
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
        } catch (err) {
          console.error('useTripDetail: failed to load profiles', err);
        }
      };
      load();
    }, [loadFamilyProfiles, getAllProfiles]),
  );

  const editHook = useEditTrip({ trip });
  const { tripReadiness, isLoading: isReadinessLoading } = useTripReadiness(trip);

  // ── Derived data ─────────────────────────────────────────────────────────────

  const submissionProgress = useMemo(() => {
    if (!trip || trip.legs.length === 0) return { submitted: 0, total: 0 };
    const submitted = trip.legs.filter(l => l.submissionStatus === 'submitted').length;
    return { submitted, total: trip.legs.length };
  }, [trip]);

  const progress = useMemo(() => {
    if (!trip || trip.legs.length === 0) return { completed: 0, total: 0, percentage: 0, readyCount: 0 };
    const completed = trip.legs.filter(
      leg => leg.formStatus === 'submitted' || leg.formStatus === 'ready'
    ).length;
    return { completed, total: trip.legs.length, percentage: (completed / trip.legs.length) * 100, readyCount: completed };
  }, [trip]);

  // ── Callbacks ────────────────────────────────────────────────────────────────

  const handleReadinessNavigate = useCallback(
    (screenName: string) => {
      switch (screenName) {
        case 'LegForm': {
          const firstNonReadyLeg = trip?.legs.find(
            l => l.formStatus !== 'ready' && l.formStatus !== 'submitted',
          );
          if (firstNonReadyLeg) {
            (navigation as any).navigate('LegForm', {
              tripId,
              legId: firstNonReadyLeg.id,
            });
          }
          break;
        }
        case 'QRWallet':
          (navigation as any).navigate('Wallet');
          break;
        case 'Profile':
          (navigation as any).navigate('Profile');
          break;
        default:
          break;
      }
    },
    [navigation, trip, tripId],
  );

  const handleLegPress = useCallback(
    (leg: TripLeg) => {
      (navigation as any).navigate('LegForm', { tripId, legId: leg.id });
    },
    [navigation, tripId],
  );

  const handleDeleteTrip = useCallback(() => {
    Alert.alert(
      'Delete Trip',
      'Are you sure you want to delete this trip? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTrip(tripId);
              navigation.goBack();
            } catch {
              Alert.alert('Error', 'Failed to delete trip');
            }
          },
        },
      ]
    );
  }, [deleteTrip, tripId, navigation]);


  const handleConfirmDuplicate = useCallback(
    async (newDepartureDate: string) => {
      setIsDuplicating(true);
      setDuplicateError(null);
      try {
        const newTrip = await duplicateTrip(tripId, newDepartureDate);
        return newTrip;
      } catch {
        setDuplicateError('Failed to duplicate trip. Please try again.');
        return null;
      } finally {
        setIsDuplicating(false);
      }
    },
    [duplicateTrip, tripId],
  );

  const resetDuplicateError = useCallback(() => {
    setDuplicateError(null);
  }, []);

  const handleMarkAsSubmitted = useCallback(
    async (legId: string) => {
      try {
        await updateLegSubmissionStatus(legId, 'submitted');
      } catch {
        Alert.alert('Error', 'Failed to mark leg as submitted');
      }
    },
    [updateLegSubmissionStatus],
  );

  const getStatusColor = useCallback((status: Trip['status']) => {
    switch (status) {
      case 'upcoming': return 'info';
      case 'active': return 'success';
      case 'completed': return 'neutral';
      default: return 'neutral';
    }
  }, []);

  const getStatusText = useCallback((status: Trip['status']) => {
    switch (status) {
      case 'upcoming': return 'Upcoming';
      case 'active': return 'Active';
      case 'completed': return 'Completed';
      default: return 'Unknown';
    }
  }, []);

  return {
    trip,
    state: { familyMembers, deadlineMap, isDuplicating, duplicateError, currentProfileId },
    derived: { submissionProgress, progress, tripReadiness, isReadinessLoading },
    editHook,
    actions: {
      handleReadinessNavigate,
      handleLegPress,
      handleDeleteTrip,
      handleConfirmDuplicate,
      handleMarkAsSubmitted,
      resetDuplicateError,
    },
    ui: { getStatusColor, getStatusText },
  };
}
