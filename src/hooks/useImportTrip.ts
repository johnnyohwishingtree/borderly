import { useState, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { TripStackParamList } from '@/app/navigation/types';
import { parseConfirmationText } from '@/services/import/confirmationParser';
import { createTripFromParsedData } from '@/services/import/tripAutoCreator';
import type { ConfirmationParseResult, ParsedFlightInfo } from '@/types/import';
import type { ParsedBoardingPass } from '@/types/boarding';
import { useTripStore } from '@/stores/useTripStore';

type ImportMode = 'paste' | 'scan';
type ImportStatus = 'idle' | 'parsing' | 'success' | 'error';

interface UseImportTripReturn {
  mode: ImportMode;
  setMode: (mode: ImportMode) => void;
  status: ImportStatus;
  errorMessage: string;
  confirmationText: string;
  setConfirmationText: (text: string) => void;
  handleParseConfirmation: () => void;
  handleBoardingPassScanned: (parsedPass: ParsedBoardingPass) => void;
  handleScanCancel: () => void;
  handleRetry: () => void;
}

export function useImportTrip(): UseImportTripReturn {
  const navigation = useNavigation<NativeStackNavigationProp<TripStackParamList>>();
  const createTrip = useTripStore(state => state.createTrip);
  const addTripLeg = useTripStore(state => state.addTripLeg);

  const [mode, setMode] = useState<ImportMode>('paste');
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmationText, setConfirmationText] = useState('');

  const saveTripAndNavigate = useCallback(
    async (parseResult: ConfirmationParseResult) => {
      const { trip } = createTripFromParsedData(parseResult);

      if (trip.legs.length === 0) {
        setStatus('error');
        setErrorMessage(
          'No flight or hotel information found. Try pasting a different confirmation.'
        );
        return;
      }

      try {
        const savedTrip = await createTrip({ ...trip, legs: [] });

        for (const leg of trip.legs) {
          await addTripLeg(savedTrip.id, leg);
        }

        setStatus('success');
        navigation.replace('TripDetail', { tripId: savedTrip.id });
      } catch {
        setStatus('error');
        setErrorMessage('Could not save the trip. Please try again.');
      }
    },
    [createTrip, addTripLeg, navigation]
  );

  const handleParseConfirmation = useCallback(() => {
    if (!confirmationText.trim()) return;

    setStatus('parsing');
    setErrorMessage('');

    try {
      const result = parseConfirmationText(confirmationText);

      if (result.flights.length === 0 && result.hotels.length === 0) {
        setStatus('error');
        setErrorMessage(
          'No flight or hotel information found. Try pasting a different confirmation.'
        );
        return;
      }

      saveTripAndNavigate(result);
    } catch {
      setStatus('error');
      setErrorMessage(
        'Could not parse the confirmation text. Check the format and try again.'
      );
    }
  }, [confirmationText, saveTripAndNavigate]);

  const handleBoardingPassScanned = useCallback(
    (parsedPass: ParsedBoardingPass) => {
      setStatus('parsing');
      setErrorMessage('');

      const flight: ParsedFlightInfo = {
        flightNumber: parsedPass.flightNumber,
        airlineCode: parsedPass.airlineCode,
        departureAirport: parsedPass.departureAirport,
        arrivalAirport: parsedPass.arrivalAirport,
        flightDate: parsedPass.flightDate,
      };
      if (parsedPass.destinationCountry) {
        flight.destinationCountry = parsedPass.destinationCountry;
      }

      const parseResult: ConfirmationParseResult = {
        flights: [flight],
        hotels: [],
        rawText: `Boarding pass: ${parsedPass.flightNumber}`,
        confidence: 0.9,
      };

      saveTripAndNavigate(parseResult);
    },
    [saveTripAndNavigate]
  );

  const handleScanCancel = useCallback(() => {
    setMode('paste');
  }, []);

  const handleRetry = useCallback(() => {
    setStatus('idle');
    setErrorMessage('');
  }, []);

  return {
    mode,
    setMode,
    status,
    errorMessage,
    confirmationText,
    setConfirmationText,
    handleParseConfirmation,
    handleBoardingPassScanned,
    handleScanCancel,
    handleRetry,
  };
}
