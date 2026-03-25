import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { ParsedBoardingPass } from '../types/boarding';
import type { SmartImportResult } from '../components/import';
import {
  isBoardingPassSupported,
  getUnsupportedDestinationMessage,
} from '../services/boarding/boardingPassParser';
import { getCountryName } from '../constants/countries';
import type { LegFormData, TripFormData } from './useTripCreationTypes';

interface UseTripCreationImportOptions {
  legs: LegFormData[];
  tripData: TripFormData;
  setLegs: React.Dispatch<React.SetStateAction<LegFormData[]>>;
  setTripData: React.Dispatch<React.SetStateAction<TripFormData>>;
  getDefaultTravelers: () => string[];
  addLeg: () => void;
}

/**
 * Generates a trip name from leg destinations.
 */
function generateTripName(tripLegs: LegFormData[]): string {
  if (tripLegs.length === 0) return '';
  const destinations = tripLegs
    .map(leg => getCountryName(leg.destinationCountry))
    .filter(Boolean);
  if (destinations.length === 0) return '';
  if (destinations.length === 1) return `Trip to ${destinations[0]}`;
  if (destinations.length === 2) return `${destinations[0]} & ${destinations[1]}`;
  return 'Multi-Country Trip';
}

/**
 * Encapsulates import/scan logic extracted from useTripCreation:
 * - Boarding pass scan handling
 * - Smart import (email/text parsing) handling
 * - Scanner and import modal visibility
 */
export function useTripCreationImport(options: UseTripCreationImportOptions) {
  const { legs, tripData, setLegs, setTripData, getDefaultTravelers, addLeg } = options;

  const [showScanner, setShowScanner] = useState(false);
  const [showSmartImport, setShowSmartImport] = useState(false);

  const handleScanSuccess = useCallback((parsedPass: ParsedBoardingPass) => {
    setShowScanner(false);

    if (!isBoardingPassSupported(parsedPass)) {
      const message = getUnsupportedDestinationMessage(parsedPass);
      Alert.alert(
        'Destination Not Supported',
        `${message}\n\nYou can still add this destination manually.`,
        [
          { text: 'Add Manually', onPress: () => addLeg() },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
      return;
    }

    const defaultTravelers = getDefaultTravelers();

    const newLeg: LegFormData = {
      destinationCountry: parsedPass.destinationCountry || '',
      arrivalDate: parsedPass.flightDate,
      departureDate: '',
      flightNumber: parsedPass.flightNumber,
      airlineCode: parsedPass.airlineCode,
      arrivalAirport: parsedPass.arrivalAirport,
      accommodation: {
        name: '',
        address: { line1: '', line2: '', city: '', state: '', country: parsedPass.destinationCountry || '', postalCode: '' },
        phone: '',
      },
      assignedTravelers: defaultTravelers,
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
  }, [getDefaultTravelers, legs.length, tripData.name, setLegs, setTripData, addLeg]);

  const handleSmartImport = useCallback((result: SmartImportResult) => {
    setShowSmartImport(false);

    const defaultTravelers = getDefaultTravelers();

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
          address: { line1: '', line2: '', city: '', state: '', country: flight.destinationCountry || '', postalCode: '' },
          phone: '',
        },
        assignedTravelers: defaultTravelers,
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
          address: { line1: hotel.address || '', line2: '', city: hotel.city || '', state: '', country: '', postalCode: hotel.postalCode || '' },
          phone: hotel.phone || '',
        },
        assignedTravelers: defaultTravelers,
      });
    }

    if (newLegs.length > 0) {
      setLegs(prev => [...prev, ...newLegs]);

      if (legs.length === 0 && !tripData.name) {
        const suggestedName = generateTripName([...legs, ...newLegs]);
        setTripData(prev => ({ ...prev, name: suggestedName }));
      }
    }
  }, [getDefaultTravelers, legs, tripData.name, setLegs, setTripData]);

  const handleScanCancel = useCallback(() => setShowScanner(false), []);

  const handleManualEntry = useCallback(() => {
    setShowScanner(false);
    addLeg();
  }, [addLeg]);

  return {
    showScanner,
    setShowScanner,
    showSmartImport,
    setShowSmartImport,
    handleScanSuccess,
    handleScanCancel,
    handleManualEntry,
    handleSmartImport,
  };
}
