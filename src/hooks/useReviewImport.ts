import { useState, useCallback, useMemo } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { TripStackParamList } from '@/app/navigation/types';
import type { Trip, TripLeg } from '@/types/trip';
import type { DraftTripResult } from '@/services/import/tripAutoCreator';
import { useTripStore } from '@/stores/useTripStore';

type ConfidenceLevel = 'high' | 'medium' | 'low';

interface UseReviewImportReturn {
  draft: {
    draftTrip: Trip;
    confidence: number;
    confidenceLevel: ConfidenceLevel;
    hasMissingFields: boolean;
  };
  status: {
    isSaving: boolean;
    saveError: string;
  };
  actions: {
    updateTripName: (name: string) => void;
    updateLeg: (legIndex: number, updates: Partial<TripLeg>) => void;
    removeLeg: (legIndex: number) => void;
    handleConfirm: () => void;
    handleCancel: () => void;
  };
}

function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.7) return 'high';
  if (confidence >= 0.4) return 'medium';
  return 'low';
}

export function useReviewImport(): UseReviewImportReturn {
  const navigation = useNavigation<NativeStackNavigationProp<TripStackParamList>>();
  const route = useRoute<RouteProp<TripStackParamList, 'ReviewImport'>>();
  const createTrip = useTripStore(state => state.createTrip);
  const addTripLeg = useTripStore(state => state.addTripLeg);

  const draftResult: DraftTripResult = useMemo(
    () => JSON.parse(route.params.draftTripJson),
    [route.params.draftTripJson]
  );

  const [draftTrip, setDraftTrip] = useState<Trip>(draftResult.trip);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const confidence = draftResult.confidence;
  const confidenceLevel = getConfidenceLevel(confidence);

  const hasMissingFields = useMemo(() => {
    if (!draftTrip.name.trim()) return true;
    return draftTrip.legs.some(
      leg => !leg.destinationCountry || !leg.arrivalDate
    );
  }, [draftTrip]);

  const updateTripName = useCallback((name: string) => {
    setDraftTrip(prev => ({ ...prev, name }));
  }, []);

  const updateLeg = useCallback(
    (legIndex: number, updates: Partial<TripLeg>) => {
      setDraftTrip(prev => ({
        ...prev,
        legs: prev.legs.map((leg, i) =>
          i === legIndex ? { ...leg, ...updates } : leg
        ),
      }));
    },
    []
  );

  const removeLeg = useCallback((legIndex: number) => {
    setDraftTrip(prev => ({
      ...prev,
      legs: prev.legs
        .filter((_, i) => i !== legIndex)
        .map((leg, i) => ({ ...leg, order: i })),
    }));
  }, []);

  const handleConfirm = useCallback(async () => {
    setIsSaving(true);
    setSaveError('');

    try {
      const savedTrip = await createTrip({ ...draftTrip, legs: [] });

      for (const leg of draftTrip.legs) {
        await addTripLeg(savedTrip.id, leg);
      }

      navigation.replace('TripDetail', { tripId: savedTrip.id });
    } catch {
      setSaveError('Could not save the trip. Please try again.');
      setIsSaving(false);
    }
  }, [draftTrip, createTrip, addTripLeg, navigation]);

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return {
    draft: {
      draftTrip,
      confidence,
      confidenceLevel,
      hasMissingFields,
    },
    status: {
      isSaving,
      saveError,
    },
    actions: {
      updateTripName,
      updateLeg,
      removeLeg,
      handleConfirm,
      handleCancel,
    },
  };
}
