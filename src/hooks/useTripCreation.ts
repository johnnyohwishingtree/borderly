import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { TripStackParamList } from '../app/navigation/types';
import { useTripStore } from '../stores/useTripStore';
import { useProfileStore } from '../stores/useProfileStore';
import { TripLeg, Accommodation } from '../types/trip';
import { FamilyMember } from '../types/profile';
import { deepCopy } from '../utils/deepCopy';
import { getCountryName } from '../constants/countries';
import type { LegFormData } from './useTripCreationTypes';
import { useTripCreationImport } from './useTripCreationImport';

// Re-export types for backward compatibility
export type { LegFormData } from './useTripCreationTypes';

/**
 * Returns the ID of the primary traveler (relationship === 'self'),
 * falling back to the first family member.
 */
function getPrimaryTravelerId(members: FamilyMember[]): string | undefined {
  return (members.find(m => m.relationship === 'self') ?? members[0])?.id;
}

/**
 * Encapsulates trip creation business logic:
 * - Trip/leg form state management
 * - Boarding pass scan handling (delegated to useTripCreationImport)
 * - Family member loading and traveler assignment
 * - Trip-level traveler selection with propagation to legs
 * - Validation and trip creation
 */
export function useTripCreation() {
  const navigation = useNavigation<NativeStackNavigationProp<TripStackParamList>>();
  const { createTrip, addTripLeg } = useTripStore();
  const { getAllProfiles, loadFamilyProfiles } = useProfileStore();

  const [tripData, setTripData] = useState<import('./useTripCreationTypes').TripFormData>({
    name: '',
    status: 'upcoming',
  });
  const [legs, setLegs] = useState<LegFormData[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);

  /**
   * Trip-level selected traveler IDs. These are propagated to all legs
   * that have not been manually overridden.
   */
  const [tripTravelers, setTripTravelers] = useState<string[]>([]);

  /**
   * Set of leg indices that have been manually overridden by the user.
   * Trip-level changes do NOT propagate to overridden legs.
   */
  const [legOverrides, setLegOverrides] = useState<Set<number>>(new Set());

  /**
   * When true, trip-level travelers sync to all legs (overrides are ignored).
   * Default: true for new trips.
   */
  const [applyToAllLegs, setApplyToAllLegsRaw] = useState(true);

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        await loadFamilyProfiles();
        const profiles = await getAllProfiles();
        const members: FamilyMember[] = Array.from(profiles.values()).map(profile => ({
          ...profile,
          relationship: profile.relationship || 'self',
        }));
        setFamilyMembers(members);
      } catch (error) {
        console.error('Failed to load family profiles:', error);
      }
    };
    loadProfiles();
  }, [getAllProfiles, loadFamilyProfiles]);

  // Initialize tripTravelers with the primary traveler once family members are loaded.
  useEffect(() => {
    if (familyMembers.length > 0 && tripTravelers.length === 0) {
      const primaryId = getPrimaryTravelerId(familyMembers);
      if (primaryId) {
        setTripTravelers([primaryId]);
      }
    }
  }, [familyMembers, tripTravelers.length]);

  // Back-fill assignedTravelers on any leg that has none (e.g., loaded before profiles).
  useEffect(() => {
    if (familyMembers.length > 0 && legs.length > 0) {
      const needsUpdate = legs.some(leg => leg.assignedTravelers.length === 0);
      if (needsUpdate) {
        setLegs(legs.map(leg => {
          if (leg.assignedTravelers.length === 0) {
            return { ...leg, assignedTravelers: [familyMembers[0].id] };
          }
          return leg;
        }));
      }
    }
  }, [familyMembers, legs]);

  /**
   * Toggle "apply to all legs". When turning on, syncs trip-level travelers
   * to all legs and clears overrides. Shows confirmation if per-leg
   * customization exists.
   */
  const setApplyToAllLegs = useCallback((value: boolean) => {
    if (value) {
      const hasCustomization = legOverrides.size > 0;
      const doApply = () => {
        setApplyToAllLegsRaw(true);
        setLegOverrides(new Set());
        setLegs(prev => prev.map(leg => ({ ...leg, assignedTravelers: tripTravelers })));
      };

      if (hasCustomization) {
        Alert.alert(
          'Apply to all destinations?',
          'This will overwrite per-destination traveler selections with the trip-level selection.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Apply', onPress: doApply },
          ],
        );
      } else {
        doApply();
      }
    } else {
      setApplyToAllLegsRaw(false);
    }
  }, [legOverrides, tripTravelers]);

  /**
   * Returns the default traveler list for a new leg:
   * - the current trip-level selection if non-empty, or
   * - the primary traveler (relationship === 'self'), or
   * - empty if no profiles are loaded yet.
   */
  const getDefaultTravelers = useCallback((): string[] => {
    if (tripTravelers.length > 0) return tripTravelers;
    const primaryId = getPrimaryTravelerId(familyMembers);
    return primaryId ? [primaryId] : [];
  }, [tripTravelers, familyMembers]);

  const addLeg = useCallback(() => {
    const defaultTravelers = getDefaultTravelers();

    const newLeg: LegFormData = {
      destinationCountry: '',
      arrivalDate: '',
      departureDate: '',
      flightNumber: '',
      airlineCode: '',
      arrivalAirport: '',
      accommodation: {
        name: '',
        address: { line1: '', line2: '', city: '', state: '', country: '', postalCode: '' },
        phone: '',
      },
      assignedTravelers: defaultTravelers,
    };
    setLegs(prev => [...prev, newLeg]);
  }, [getDefaultTravelers]);

  const removeLeg = useCallback((index: number) => {
    setLegs(prev => prev.filter((_, i) => i !== index));
    setLegOverrides(prev => {
      const next = new Set<number>();
      prev.forEach(i => {
        if (i < index) next.add(i);
        else if (i > index) next.add(i - 1);
      });
      return next;
    });
  }, []);

  const updateLeg = useCallback((index: number, field: string, value: unknown) => {
    setLegs(prev => {
      const newLegs = [...prev];
      newLegs[index] = deepCopy(newLegs[index]);
      const keys = field.split('.');
      let current: Record<string, unknown> = newLegs[index] as unknown as Record<string, unknown>;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]] as Record<string, unknown>;
      }
      current[keys[keys.length - 1]] = value;

      const autoFilledFields = newLegs[index].autoFilledFields;
      if (autoFilledFields) {
        const fieldKey = field as keyof typeof autoFilledFields;
        if (fieldKey in autoFilledFields) {
          delete autoFilledFields[fieldKey];
        }
      }
      return newLegs;
    });
  }, []);

  /**
   * Toggle a traveler at the trip level.
   * - The primary traveler (relationship === 'self') can never be deselected.
   * - Changes propagate to all legs that have NOT been manually overridden.
   */
  const handleTripTravelerToggle = useCallback((travelerId: string) => {
    const primaryId = getPrimaryTravelerId(familyMembers);
    if (travelerId === primaryId && tripTravelers.includes(travelerId)) return;

    const newTravelers = tripTravelers.includes(travelerId)
      ? tripTravelers.filter(id => id !== travelerId)
      : [...tripTravelers, travelerId];

    setTripTravelers(newTravelers);

    setLegs(prev =>
      prev.map((leg, index) => {
        // When applyToAllLegs is on, sync ALL legs regardless of overrides
        if (applyToAllLegs || !legOverrides.has(index)) {
          return { ...leg, assignedTravelers: newTravelers };
        }
        return leg;
      }),
    );
  }, [familyMembers, tripTravelers, legOverrides, applyToAllLegs]);

  /**
   * Toggle a traveler on a specific leg.
   * Marks that leg as manually overridden so trip-level changes no longer
   * propagate to it automatically.
   */
  const handleTravelerToggle = useCallback((legIndex: number, travelerId: string) => {
    setLegOverrides(prev => new Set([...prev, legIndex]));
    // Per-leg customization implies "apply to all" is no longer in effect
    setApplyToAllLegsRaw(false);

    setLegs(prev => {
      const newLegs = [...prev];
      const leg = newLegs[legIndex];
      const isSelected = leg.assignedTravelers.includes(travelerId);
      newLegs[legIndex] = {
        ...leg,
        assignedTravelers: isSelected
          ? leg.assignedTravelers.filter(id => id !== travelerId)
          : [...leg.assignedTravelers, travelerId],
      };
      return newLegs;
    });
  }, []);

  const validateTrip = useCallback((): Record<string, string> => {
    const newErrors: Record<string, string> = {};
    if (!tripData.name.trim()) {
      newErrors.tripName = 'Trip name is required';
    }
    if (legs.length === 0) {
      newErrors.legs = 'At least one destination is required';
    }
    legs.forEach((leg, index) => {
      const dest = getCountryName(leg.destinationCountry) || `Destination ${index + 1}`;
      if (!leg.destinationCountry) newErrors[`leg${index}.country`] = `${dest}: Country is required`;
      if (!leg.arrivalDate) newErrors[`leg${index}.arrival`] = `${dest}: Arrival date is required`;
      if (leg.assignedTravelers.length === 0) newErrors[`leg${index}.travelers`] = `${dest}: Select at least one traveler`;
    });
    setErrors(newErrors);
    return newErrors;
  }, [tripData.name, legs]);

  const handleCreateTrip = useCallback(async () => {
    const validationErrors = validateTrip();
    if (Object.keys(validationErrors).length > 0) {
      const errorList = Object.values(validationErrors).join('\n');
      Alert.alert('Validation Error', errorList || 'Please fix the errors below');
      return;
    }

    setIsCreating(true);
    try {
      const trip = await createTrip({
        name: tripData.name,
        status: tripData.status,
        legs: [],
      });

      for (let i = 0; i < legs.length; i++) {
        const leg = legs[i];
        await addTripLeg(trip.id, {
          destinationCountry: leg.destinationCountry,
          arrivalDate: leg.arrivalDate,
          departureDate: leg.departureDate,
          flightNumber: leg.flightNumber,
          airlineCode: leg.airlineCode,
          arrivalAirport: leg.arrivalAirport,
          accommodation: {
            name: leg.accommodation.name,
            address: leg.accommodation.address,
            phone: leg.accommodation.phone,
          } as Accommodation,
          formStatus: 'not_started',
          order: i,
          assignedTravelers: leg.assignedTravelers,
          travelerFormsData: leg.assignedTravelers.map(travelerId => ({
            travelerId,
            formData: {},
            formStatus: 'not_started' as const,
          })),
        } as Omit<TripLeg, 'id' | 'tripId'>);
      }

      Alert.alert('Success', 'Trip created successfully!', [
        { text: 'OK', onPress: () => navigation.replace('TripDetail', { tripId: trip.id }) },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to create trip. Please try again.');
    } finally {
      setIsCreating(false);
    }
  }, [validateTrip, createTrip, addTripLeg, tripData, legs, navigation]);

  // Delegate import/scan logic to extracted hook
  const importHook = useTripCreationImport({
    legs,
    tripData,
    setLegs,
    setTripData,
    getDefaultTravelers,
    addLeg,
  });

  return {
    tripData: { data: tripData, setTripData },
    legs: { items: legs, addLeg, removeLeg, updateLeg },
    travelers: { familyMembers, tripTravelers, legOverrides, applyToAllLegs, setApplyToAllLegs, handleTripTravelerToggle, handleTravelerToggle },
    creation: { isCreating, errors, handleCreateTrip },
    import: importHook,
  };
}
