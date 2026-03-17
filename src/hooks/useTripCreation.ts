import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTripStore } from '../stores/useTripStore';
import { useProfileStore } from '../stores/useProfileStore';
import { TripLeg, Accommodation } from '../types/trip';
import { Address, FamilyMember } from '../types/profile';
import { ParsedBoardingPass } from '../types/boarding';
import type { SmartImportResult } from '../components/import';
import {
  isBoardingPassSupported,
  getUnsupportedDestinationMessage,
} from '../services/boarding/boardingPassParser';
import { getCountryName } from '../constants/countries';

interface LegFormData {
  destinationCountry: string;
  arrivalDate: string;
  departureDate: string;
  flightNumber: string;
  airlineCode: string;
  arrivalAirport: string;
  accommodation: {
    name: string;
    address: {
      line1: string;
      city: string;
      country: string;
      postalCode: string;
    };
    phone: string;
  };
  assignedTravelers: string[];
  autoFilledFields?: {
    destinationCountry?: 'auto';
    arrivalDate?: 'auto';
    flightNumber?: 'auto';
    airlineCode?: 'auto';
    arrivalAirport?: 'auto';
  };
}

interface TripFormData {
  name: string;
  status: 'upcoming' | 'active' | 'completed';
}

/**
 * Encapsulates trip creation business logic:
 * - Trip/leg form state management
 * - Boarding pass scan handling
 * - Family member loading and traveler assignment
 * - Validation and trip creation
 */
export function useTripCreation() {
  const navigation = useNavigation();
  const { createTrip, addTripLeg } = useTripStore();
  const { getAllProfiles, loadFamilyProfiles } = useProfileStore();

  const [tripData, setTripData] = useState<TripFormData>({
    name: '',
    status: 'upcoming',
  });
  const [legs, setLegs] = useState<LegFormData[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showScanner, setShowScanner] = useState(false);
  const [showSmartImport, setShowSmartImport] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);

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

  const addLeg = useCallback(() => {
    const newLeg: LegFormData = {
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
      assignedTravelers: familyMembers.length > 0 ? [familyMembers[0].id] : [],
    };
    setLegs(prev => [...prev, newLeg]);
  }, [familyMembers]);

  const removeLeg = useCallback((index: number) => {
    setLegs(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateLeg = useCallback((index: number, field: string, value: string) => {
    setLegs(prev => {
      const newLegs = [...prev];
      const keys = field.split('.');
      let current: any = newLegs[index];
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
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

  const handleTravelerToggle = useCallback((legIndex: number, travelerId: string) => {
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

  const generateTripName = useCallback((tripLegs: LegFormData[]): string => {
    if (tripLegs.length === 0) return '';
    const destinations = tripLegs
      .map(leg => getCountryName(leg.destinationCountry))
      .filter(Boolean);
    if (destinations.length === 0) return '';
    if (destinations.length === 1) return `Trip to ${destinations[0]}`;
    if (destinations.length === 2) return `${destinations[0]} & ${destinations[1]}`;
    return `Multi-Country Trip`;
  }, []);

  const handleScanSuccess = useCallback((parsedPass: ParsedBoardingPass) => {
    setShowScanner(false);

    if (!isBoardingPassSupported(parsedPass)) {
      const message = getUnsupportedDestinationMessage(parsedPass);
      Alert.alert(
        'Destination Not Supported',
        `${message}\n\nYou can still add this destination manually.`,
        [
          { text: 'Add Manually', onPress: () => addLeg() },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    const newLeg: LegFormData = {
      destinationCountry: parsedPass.destinationCountry || '',
      arrivalDate: parsedPass.flightDate,
      departureDate: '',
      flightNumber: parsedPass.flightNumber,
      airlineCode: parsedPass.airlineCode,
      arrivalAirport: parsedPass.arrivalAirport,
      accommodation: {
        name: '',
        address: { line1: '', city: '', country: parsedPass.destinationCountry || '', postalCode: '' },
        phone: '',
      },
      assignedTravelers: familyMembers.length > 0 ? [familyMembers[0].id] : [],
      autoFilledFields: {
        destinationCountry: 'auto',
        arrivalDate: 'auto',
        flightNumber: 'auto',
        airlineCode: 'auto',
        arrivalAirport: 'auto',
      },
    };

    setLegs(prev => [...prev, newLeg]);

    if (legs.length === 0 && !tripData.name) {
      const suggestedName = generateTripName([newLeg]);
      setTripData(prev => ({ ...prev, name: suggestedName }));
    }
  }, [familyMembers, legs.length, tripData.name, generateTripName, addLeg]);

  const validateTrip = useCallback((): Record<string, string> => {
    const newErrors: Record<string, string> = {};
    if (!tripData.name.trim()) {
      newErrors.tripName = 'Trip name is required';
    }
    if (legs.length === 0) {
      newErrors.legs = 'At least one destination is required';
    }
    legs.forEach((leg, index) => {
      if (!leg.destinationCountry) newErrors[`leg${index}.country`] = 'Country is required';
      if (!leg.arrivalDate) newErrors[`leg${index}.arrival`] = 'Arrival date is required';
      if (!leg.accommodation.name) newErrors[`leg${index}.accommodation`] = 'Accommodation name is required';
      if (leg.assignedTravelers.length === 0) newErrors[`leg${index}.travelers`] = 'At least one traveler must be selected';
    });
    setErrors(newErrors);
    return newErrors;
  }, [tripData.name, legs]);

  const handleCreateTrip = useCallback(async () => {
    const validationErrors = validateTrip();
    if (Object.keys(validationErrors).length > 0) {
      const errorList = Object.entries(validationErrors).map(([k, v]) => `${k}: ${v}`).join('\n');
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
            address: {
              line1: leg.accommodation.address.line1,
              line2: '',
              city: leg.accommodation.address.city,
              state: '',
              postalCode: leg.accommodation.address.postalCode,
              country: leg.accommodation.address.country,
            } as Address,
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
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to create trip. Please try again.');
    } finally {
      setIsCreating(false);
    }
  }, [validateTrip, createTrip, addTripLeg, tripData, legs, navigation]);

  const handleSmartImport = useCallback((result: SmartImportResult) => {
    setShowSmartImport(false);

    const newLegs: LegFormData[] = [];

    for (const flight of result.flights) {
      const newLeg: LegFormData = {
        destinationCountry: flight.destinationCountry || '',
        arrivalDate: flight.flightDate || '',
        departureDate: '',
        flightNumber: flight.flightNumber,
        airlineCode: flight.airlineCode,
        arrivalAirport: flight.arrivalAirport || '',
        accommodation: {
          name: '',
          address: { line1: '', city: '', country: flight.destinationCountry || '', postalCode: '' },
          phone: '',
        },
        assignedTravelers: familyMembers.length > 0 ? [familyMembers[0].id] : [],
        autoFilledFields: {
          ...(flight.destinationCountry ? { destinationCountry: 'auto' as const } : {}),
          ...(flight.flightDate ? { arrivalDate: 'auto' as const } : {}),
          flightNumber: 'auto',
          airlineCode: 'auto',
          ...(flight.arrivalAirport ? { arrivalAirport: 'auto' as const } : {}),
        },
      };

      const matchingHotel = result.hotels[0];
      if (matchingHotel && newLegs.length === 0) {
        newLeg.accommodation.name = matchingHotel.name;
        if (matchingHotel.address) newLeg.accommodation.address.line1 = matchingHotel.address;
        if (matchingHotel.phone) newLeg.accommodation.phone = matchingHotel.phone;
        if (matchingHotel.checkOutDate) newLeg.departureDate = matchingHotel.checkOutDate;
      }

      newLegs.push(newLeg);
    }

    if (result.flights.length === 0 && result.hotels.length > 0) {
      const hotel = result.hotels[0];
      newLegs.push({
        destinationCountry: '',
        arrivalDate: hotel.checkInDate || '',
        departureDate: hotel.checkOutDate || '',
        flightNumber: '',
        airlineCode: '',
        arrivalAirport: '',
        accommodation: {
          name: hotel.name,
          address: { line1: hotel.address || '', city: hotel.city || '', country: '', postalCode: hotel.postalCode || '' },
          phone: hotel.phone || '',
        },
        assignedTravelers: familyMembers.length > 0 ? [familyMembers[0].id] : [],
      });
    }

    if (newLegs.length > 0) {
      setLegs(prev => [...prev, ...newLegs]);

      if (legs.length === 0 && !tripData.name) {
        const suggestedName = generateTripName([...legs, ...newLegs]);
        setTripData(prev => ({ ...prev, name: suggestedName }));
      }
    }
  }, [familyMembers, legs, tripData.name, generateTripName]);

  return {
    tripData,
    setTripData,
    legs,
    isCreating,
    errors,
    showScanner,
    setShowScanner,
    familyMembers,
    addLeg,
    removeLeg,
    updateLeg,
    handleTravelerToggle,
    handleScanSuccess,
    handleScanCancel: useCallback(() => setShowScanner(false), []),
    handleManualEntry: useCallback(() => { setShowScanner(false); addLeg(); }, [addLeg]),
    handleCreateTrip,
    showSmartImport,
    setShowSmartImport,
    handleSmartImport,
  };
}

export type { LegFormData };
