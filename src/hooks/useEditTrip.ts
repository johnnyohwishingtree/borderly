import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useTripStore } from '../stores/useTripStore';
import { useProfileStore } from '../stores/useProfileStore';
import { Trip, TripLeg, Accommodation } from '../types/trip';
import { Address, FamilyMember } from '../types/profile';
import type { LegFormData } from './useTripCreation';
import { deepCopy } from '../utils/deepCopy';

interface UseEditTripOptions {
  trip: Trip | null;
  onTripUpdated?: () => void;
}

/** Convert a stored TripLeg into LegFormData for use in the edit form. */
function legToFormData(leg: TripLeg): LegFormData {
  return {
    destinationCountry: leg.destinationCountry,
    arrivalDate: leg.arrivalDate,
    departureDate: leg.departureDate ?? '',
    flightNumber: leg.flightNumber ?? '',
    airlineCode: leg.airlineCode ?? '',
    arrivalAirport: leg.arrivalAirport ?? '',
    accommodation: {
      name: leg.accommodation.name,
      address: {
        line1: leg.accommodation.address.line1,
        city: leg.accommodation.address.city,
        country: leg.accommodation.address.country,
        postalCode: leg.accommodation.address.postalCode ?? '',
      },
      phone: leg.accommodation.phone ?? '',
    },
    assignedTravelers: leg.assignedTravelers ?? [],
  };
}

/**
 * Returns the primary traveler ID (relationship === 'self') or the first member.
 */
function getPrimaryTravelerId(members: FamilyMember[]): string | undefined {
  return (members.find(m => m.relationship === 'self') ?? members[0])?.id;
}

/**
 * Validates a single leg form — returns a map of field → error message.
 */
function validateLeg(leg: LegFormData): Record<string, string> {
  const errs: Record<string, string> = {};
  if (!leg.destinationCountry) errs.country = 'Country is required';
  if (!leg.arrivalDate) errs.arrivalDate = 'Arrival date is required';
  if (!leg.accommodation.name) errs.accommodationName = 'Accommodation name is required';
  return errs;
}

/**
 * Applies a dot-notation field update (e.g. "accommodation.address.city") to a
 * LegFormData object and returns the updated copy.
 */
function applyFieldUpdate(data: LegFormData, field: string, value: string): LegFormData {
  const updated = deepCopy(data);
  const keys = field.split('.');
  let current: Record<string, unknown> = updated as unknown as Record<string, unknown>;
  for (let i = 0; i < keys.length - 1; i++) {
    current = current[keys[i]] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = value;
  return updated;
}

/**
 * useEditTrip — business logic for editing an existing trip:
 *   - Trip name editing
 *   - Existing leg detail editing
 *   - Adding a new destination leg
 *
 * Follows the hook-extraction pattern: the screen stays thin and only renders.
 */
export function useEditTrip({ trip, onTripUpdated }: UseEditTripOptions) {
  const { updateTrip, updateTripLeg, addTripLeg } = useTripStore();
  const { getAllProfiles, loadFamilyProfiles } = useProfileStore();

  // ── Trip name editing ────────────────────────────────────────────────────────
  const [editName, setEditName] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  // ── Leg editing ──────────────────────────────────────────────────────────────
  const [editingLegId, setEditingLegId] = useState<string | null>(null);
  const [editLegData, setEditLegData] = useState<LegFormData | null>(null);
  const [isUpdatingLeg, setIsUpdatingLeg] = useState(false);

  // ── Add destination ──────────────────────────────────────────────────────────
  const [newLegData, setNewLegData] = useState<LegFormData | null>(null);
  const [isAddingDestination, setIsAddingDestination] = useState(false);

  // ── Family members ───────────────────────────────────────────────────────────
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);

  // ── Validation errors ────────────────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load family profiles once
  useEffect(() => {
    const load = async () => {
      try {
        await loadFamilyProfiles();
        const profiles = await getAllProfiles();
        const members: FamilyMember[] = Array.from(profiles.values()).map(profile => ({
          ...profile,
          relationship: profile.relationship ?? 'self',
        }));
        setFamilyMembers(members);
      } catch (err) {
        console.error('useEditTrip: failed to load family profiles', err);
      }
    };
    load();
  }, [getAllProfiles, loadFamilyProfiles]);

  // Sync trip name when the trip changes
  useEffect(() => {
    if (trip) {
      setEditName(trip.name);
    }
  }, [trip?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Trip name handlers ───────────────────────────────────────────────────────

  const handleUpdateTripName = useCallback(async (): Promise<boolean> => {
    if (!trip) return false;
    const trimmed = editName.trim();
    if (!trimmed) {
      setErrors(prev => ({ ...prev, name: 'Trip name is required' }));
      return false;
    }
    setIsUpdatingName(true);
    try {
      await updateTrip(trip.id, { name: trimmed });
      setErrors(prev => { const next = { ...prev }; delete next.name; return next; });
      onTripUpdated?.();
      return true;
    } catch {
      Alert.alert('Error', 'Failed to update trip name. Please try again.');
      return false;
    } finally {
      setIsUpdatingName(false);
    }
  }, [trip, editName, updateTrip, onTripUpdated]);

  // ── Leg edit handlers ────────────────────────────────────────────────────────

  const startEditLeg = useCallback((leg: TripLeg) => {
    setEditingLegId(leg.id);
    setEditLegData(legToFormData(leg));
    setErrors({});
  }, []);

  const cancelEditLeg = useCallback(() => {
    setEditingLegId(null);
    setEditLegData(null);
    setErrors({});
  }, []);

  const updateEditLegField = useCallback((field: string, value: string) => {
    setEditLegData(prev => (prev ? applyFieldUpdate(prev, field, value) : prev));
  }, []);

  const handleEditLegTravelerToggle = useCallback((travelerId: string) => {
    setEditLegData(prev => {
      if (!prev) return prev;
      const isSelected = prev.assignedTravelers.includes(travelerId);
      return {
        ...prev,
        assignedTravelers: isSelected
          ? prev.assignedTravelers.filter(id => id !== travelerId)
          : [...prev.assignedTravelers, travelerId],
      };
    });
  }, []);

  const handleSaveLeg = useCallback(async (): Promise<boolean> => {
    if (!editingLegId || !editLegData) return false;
    const errs = validateLeg(editLegData);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return false;
    }
    setIsUpdatingLeg(true);
    try {
      const legUpdates: Partial<TripLeg> = {
        destinationCountry: editLegData.destinationCountry,
        arrivalDate: editLegData.arrivalDate,
        accommodation: {
          name: editLegData.accommodation.name,
          address: {
            line1: editLegData.accommodation.address.line1,
            line2: '',
            city: editLegData.accommodation.address.city,
            state: '',
            postalCode: editLegData.accommodation.address.postalCode,
            country: editLegData.accommodation.address.country,
          } as Address,
        } as Accommodation,
      };
      if (editLegData.departureDate) legUpdates.departureDate = editLegData.departureDate;
      if (editLegData.flightNumber) legUpdates.flightNumber = editLegData.flightNumber;
      if (editLegData.airlineCode) legUpdates.airlineCode = editLegData.airlineCode;
      if (editLegData.arrivalAirport) legUpdates.arrivalAirport = editLegData.arrivalAirport;
      if (editLegData.accommodation.phone) {
        (legUpdates.accommodation as Accommodation).phone = editLegData.accommodation.phone;
      }
      await updateTripLeg(editingLegId, legUpdates);
      setEditingLegId(null);
      setEditLegData(null);
      setErrors({});
      onTripUpdated?.();
      return true;
    } catch {
      Alert.alert('Error', 'Failed to update destination. Please try again.');
      return false;
    } finally {
      setIsUpdatingLeg(false);
    }
  }, [editingLegId, editLegData, updateTripLeg, onTripUpdated]);

  // ── Add destination handlers ─────────────────────────────────────────────────

  const startAddDestination = useCallback(() => {
    const primaryId = getPrimaryTravelerId(familyMembers);
    setNewLegData({
      destinationCountry: '',
      arrivalDate: '',
      departureDate: '',
      flightNumber: '',
      airlineCode: '',
      arrivalAirport: '',
      accommodation: {
        name: '',
        address: { line1: '', city: '', country: '', postalCode: '' },
        phone: '',
      },
      assignedTravelers: primaryId ? [primaryId] : [],
    });
    setErrors({});
  }, [familyMembers]);

  const cancelAddDestination = useCallback(() => {
    setNewLegData(null);
    setErrors({});
  }, []);

  const updateNewLegField = useCallback((field: string, value: string) => {
    setNewLegData(prev => (prev ? applyFieldUpdate(prev, field, value) : prev));
  }, []);

  const handleNewLegTravelerToggle = useCallback((travelerId: string) => {
    setNewLegData(prev => {
      if (!prev) return prev;
      const isSelected = prev.assignedTravelers.includes(travelerId);
      return {
        ...prev,
        assignedTravelers: isSelected
          ? prev.assignedTravelers.filter(id => id !== travelerId)
          : [...prev.assignedTravelers, travelerId],
      };
    });
  }, []);

  const handleAddDestination = useCallback(async (): Promise<boolean> => {
    if (!trip || !newLegData) return false;
    const errs = validateLeg(newLegData);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return false;
    }
    setIsAddingDestination(true);
    try {
      const nextOrder = trip.legs.length;
      await addTripLeg(trip.id, {
        destinationCountry: newLegData.destinationCountry,
        arrivalDate: newLegData.arrivalDate,
        departureDate: newLegData.departureDate || undefined,
        flightNumber: newLegData.flightNumber || undefined,
        airlineCode: newLegData.airlineCode || undefined,
        arrivalAirport: newLegData.arrivalAirport || undefined,
        accommodation: {
          name: newLegData.accommodation.name,
          address: {
            line1: newLegData.accommodation.address.line1,
            line2: '',
            city: newLegData.accommodation.address.city,
            state: '',
            postalCode: newLegData.accommodation.address.postalCode,
            country: newLegData.accommodation.address.country,
          } as Address,
          phone: newLegData.accommodation.phone || undefined,
        } as Accommodation,
        formStatus: 'not_started',
        order: nextOrder,
        assignedTravelers: newLegData.assignedTravelers,
        travelerFormsData: newLegData.assignedTravelers.map(travelerId => ({
          travelerId,
          formData: {},
          formStatus: 'not_started' as const,
          completionPercentage: 0,
        })),
      } as Omit<TripLeg, 'id' | 'tripId'>);
      setNewLegData(null);
      setErrors({});
      onTripUpdated?.();
      return true;
    } catch {
      Alert.alert('Error', 'Failed to add destination. Please try again.');
      return false;
    } finally {
      setIsAddingDestination(false);
    }
  }, [trip, newLegData, addTripLeg, onTripUpdated]);

  return {
    // Trip name
    editName,
    setEditName,
    isUpdatingName,
    handleUpdateTripName,

    // Leg editing
    editingLegId,
    editLegData,
    isUpdatingLeg,
    startEditLeg,
    cancelEditLeg,
    updateEditLegField,
    handleEditLegTravelerToggle,
    handleSaveLeg,

    // Add destination
    newLegData,
    isAddingDestination,
    startAddDestination,
    cancelAddDestination,
    updateNewLegField,
    handleNewLegTravelerToggle,
    handleAddDestination,

    // Shared
    errors,
    familyMembers,
  };
}
