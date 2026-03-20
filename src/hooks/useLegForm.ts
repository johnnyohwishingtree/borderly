import { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFormStore } from '../stores/useFormStore';
import { useProfileStore } from '../stores/useProfileStore';
import { useTripStore } from '../stores/useTripStore';
import { schemaRegistry } from '../services/schemas/schemaRegistry';
import { handleStorageError, handleValidationError } from '../services/error/errorHandler';
import { ERROR_CODES, createAppError } from '../services/error/errorHandling';
import type { TripStackParamList } from '../app/navigation/types';
import type { AppError } from '../services/error/errorHandling';
import type { TravelerProfile } from '../types/profile';
import type { TravelerFormData } from '../types/trip';
import type { TravelerTab } from '../components/trips/TravelerTabs';

interface UseLegFormOptions {
  tripId: string;
  legId: string;
}

/** Combined traveler state — updated atomically to avoid split renders */
interface TravelerState {
  activeTravelerId: string | null;
  profiles: Map<string, TravelerProfile>;
}

/**
 * Encapsulates the business logic for LegFormScreen:
 * - Loads the trip/leg/profile and generates the form
 * - Handles traveler switching for multi-traveler legs
 * - Handles save and mark-as-ready operations with error recovery
 * - Exposes form state and actions to the screen
 */
export function useLegForm({ tripId, legId }: UseLegFormOptions) {
  const navigation = useNavigation<NativeStackNavigationProp<TripStackParamList>>();
  const { profile, getProfile } = useProfileStore();
  const { getTripById, getLegById, updateTripLeg, getTravelerFormData } = useTripStore();
  const {
    currentForm,
    formData,
    isValid,
    isLoading,
    generateForm,
    getFormData,
    resetForm,
    updateField,
  } = useFormStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<AppError | string | null>(null);
  const [loadError, setLoadError] = useState<AppError | string | null>(null);
  const [lastFailedOperation, setLastFailedOperation] = useState<{ type: 'save' | 'markReady' } | null>(null);

  // Multi-traveler state: combined so that profiles + activeId are always in sync
  const [travelerState, setTravelerState] = useState<TravelerState>({
    activeTravelerId: null,
    profiles: new Map(),
  });
  const { activeTravelerId, profiles: travelerProfiles } = travelerState;

  const trip = getTripById(tripId);
  const leg = getLegById(legId);

  // Derived: whether this leg has multiple assigned travelers
  const assignedTravelers = leg?.assignedTravelers ?? [];
  const hasMultipleTravelers = assignedTravelers.length > 1;

  // The profile to use for form generation: traveler profile (multi) or current profile (single)
  const activeProfile = hasMultipleTravelers
    ? (activeTravelerId ? travelerProfiles.get(activeTravelerId) ?? null : null)
    : profile;

  const clearFormError = useCallback(() => setFormError(null), []);
  const clearLoadError = useCallback(() => setLoadError(null), []);

  // Load traveler profiles for multi-traveler legs
  useEffect(() => {
    if (!hasMultipleTravelers || !leg) {
      setTravelerState({ activeTravelerId: null, profiles: new Map() });
      return;
    }

    let cancelled = false;

    const loadProfiles = async () => {
      const profileMap = new Map<string, TravelerProfile>();

      for (const travelerId of assignedTravelers) {
        try {
          const travelerProfile = await getProfile(travelerId);
          if (travelerProfile && !cancelled) {
            profileMap.set(travelerId, travelerProfile);
          }
        } catch {
          // Skip profiles that fail to load; form will show an error
        }
      }

      if (!cancelled) {
        // Default active traveler: current profile if in list, otherwise first
        const currentProfileInList =
          profile?.id && assignedTravelers.includes(profile.id) ? profile.id : null;
        const defaultTravelerId = currentProfileInList ?? assignedTravelers[0] ?? null;

        // Atomic update: both profiles and activeTravelerId in one render
        setTravelerState({
          profiles: profileMap,
          activeTravelerId: defaultTravelerId,
        });
      }
    };

    loadProfiles();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legId, hasMultipleTravelers]);

  // Generate form when data is ready
  useEffect(() => {
    if (!trip || !leg) {
      const error = createAppError(
        ERROR_CODES.PARSING_ERROR,
        'Trip, leg, or profile not found',
        'Required data is missing. Please try navigating back and trying again.'
      );
      setLoadError(error);
      return;
    }

    // For multi-traveler legs, wait until profiles are loaded and an active traveler is set
    if (hasMultipleTravelers) {
      if (!activeTravelerId || travelerProfiles.size === 0) {
        // Still loading profiles — don't generate yet
        return;
      }

      const travelerProfile = travelerProfiles.get(activeTravelerId);
      if (!travelerProfile) {
        const error = createAppError(
          ERROR_CODES.PARSING_ERROR,
          `Profile not found for traveler ${activeTravelerId}`,
          'Unable to load traveler profile. Please go back and try again.'
        );
        setLoadError(error);
        return;
      }

      const schema = schemaRegistry.getSchema(leg.destinationCountry);
      if (!schema) {
        const error = createAppError(
          ERROR_CODES.PARSING_ERROR,
          `Schema not found for ${leg.destinationCountry}`,
          `Form template for ${leg.destinationCountry} is not available. Please contact support.`
        );
        setLoadError(error);
        return;
      }

      try {
        setLoadError(null);
        const storedData = getTravelerFormData(legId, activeTravelerId)?.formData ?? {};
        generateForm(travelerProfile, leg, schema, storedData);
      } catch (error) {
        const appError = createAppError(
          ERROR_CODES.PARSING_ERROR,
          (error as Error).message,
          'Failed to load the form. Please try again.'
        );
        setLoadError(appError);
      }

      return;
    }

    // Single-traveler path (existing behaviour)
    if (!profile) {
      const error = createAppError(
        ERROR_CODES.PARSING_ERROR,
        'Trip, leg, or profile not found',
        'Required data is missing. Please try navigating back and trying again.'
      );
      setLoadError(error);
      return;
    }

    const schema = schemaRegistry.getSchema(leg.destinationCountry);
    if (!schema) {
      const error = createAppError(
        ERROR_CODES.PARSING_ERROR,
        `Schema not found for ${leg.destinationCountry}`,
        `Form template for ${leg.destinationCountry} is not available. Please contact support.`
      );
      setLoadError(error);
      return;
    }

    try {
      setLoadError(null);
      generateForm(profile, leg, schema, leg.formData || {});
    } catch (error) {
      const appError = createAppError(
        ERROR_CODES.PARSING_ERROR,
        (error as Error).message,
        'Failed to load the form. Please try again.'
      );
      setLoadError(appError);
    }

    return () => {
      resetForm();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, legId, profile, trip, leg, generateForm, resetForm, activeTravelerId, travelerState, hasMultipleTravelers]);

  // Reset form on unmount
  useEffect(() => {
    return () => {
      resetForm();
    };
  }, [resetForm]);

  /**
   * Switch active traveler. Saves current form data first, then regenerates
   * the form for the new traveler.
   */
  const switchToTraveler = useCallback(async (travelerId: string) => {
    if (!leg || travelerId === activeTravelerId) {
      return;
    }

    // Save current traveler's form data before switching
    if (activeTravelerId) {
      const currentFormData = getFormData();
      const existingForms: TravelerFormData[] = leg.travelerFormsData ?? [];
      const updatedForms = existingForms.map<TravelerFormData>(tf =>
        tf.travelerId === activeTravelerId
          ? { ...tf, formData: currentFormData, formStatus: isValid ? 'ready' : 'in_progress' }
          : tf
      );
      if (!existingForms.find(tf => tf.travelerId === activeTravelerId)) {
        updatedForms.push({
          travelerId: activeTravelerId,
          formData: currentFormData,
          formStatus: isValid ? 'ready' : 'in_progress',
        });
      }
      try {
        await updateTripLeg(leg.id, { travelerFormsData: updatedForms });
      } catch {
        // Non-fatal: switching proceeds even if save fails
      }
    }

    // Switch to the new traveler (keep profiles unchanged, only update active id)
    setTravelerState(prev => ({ ...prev, activeTravelerId: travelerId }));

    // Generate form for the new traveler
    const newProfile = travelerProfiles.get(travelerId);
    if (newProfile && leg) {
      const schema = schemaRegistry.getSchema(leg.destinationCountry);
      if (schema) {
        const freshLeg = getLegById(legId);
        const storedData = freshLeg?.travelerFormsData?.find(tf => tf.travelerId === travelerId)?.formData ?? {};
        generateForm(newProfile, leg, schema, storedData);
      }
    }
  }, [leg, activeTravelerId, travelerProfiles, getFormData, isValid, updateTripLeg, generateForm, getLegById, legId]);

  const handleFormDataChange = useCallback((newFormData: Record<string, unknown>) => {
    const storeData = useFormStore.getState().formData;
    for (const [fieldId, value] of Object.entries(newFormData)) {
      if (storeData[fieldId] !== value) {
        updateField(fieldId, value);
      }
    }
  }, [updateField]);

  const handleSaveForm = useCallback(async () => {
    if (!leg || !currentForm) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      const formDataToSave = getFormData();

      if (hasMultipleTravelers && activeTravelerId) {
        // Save per-traveler form data
        const freshLeg = getLegById(legId);
        const existingForms: TravelerFormData[] = freshLeg?.travelerFormsData ?? [];
        const updatedForms = existingForms.map<TravelerFormData>(tf =>
          tf.travelerId === activeTravelerId
            ? { ...tf, formData: formDataToSave, formStatus: isValid ? 'ready' : 'in_progress' }
            : tf
        );
        if (!existingForms.find(tf => tf.travelerId === activeTravelerId)) {
          updatedForms.push({
            travelerId: activeTravelerId,
            formData: formDataToSave,
            formStatus: isValid ? 'ready' : 'in_progress',
          });
        }
        await updateTripLeg(leg.id, { travelerFormsData: updatedForms });
      } else {
        // Legacy single-traveler save
        await updateTripLeg(leg.id, {
          formData: formDataToSave,
          formStatus: isValid ? 'ready' : 'in_progress',
        });
      }

      setLastFailedOperation(null);
      Alert.alert('Success', 'Form data saved successfully!');
    } catch (error) {
      setLastFailedOperation({ type: 'save' });

      const result = await handleStorageError(error as Error, {
        screen: 'LegForm',
        action: 'saveForm',
        timestamp: Date.now()
      }, {
        showUserFeedback: false,
        enableRetry: true,
        onRecoverySuccess: () => {
          setFormError(null);
          setLastFailedOperation(null);
          Alert.alert('Success', 'Form data saved successfully!');
        }
      });

      if (!result.recovered && result.error) {
        setFormError(result.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [leg, currentForm, getFormData, updateTripLeg, isValid, hasMultipleTravelers, activeTravelerId, getLegById, legId]);

  const handleMarkAsReady = useCallback(async () => {
    if (!isValid) {
      const validationError = createAppError(
        ERROR_CODES.VALIDATION_FAILED,
        'Form validation failed',
        'Please complete all required fields before marking as ready.'
      );

      await handleValidationError(new Error('Form validation failed'), {
        screen: 'LegForm',
        action: 'markAsReady',
        timestamp: Date.now()
      }, {
        showUserFeedback: false,
        enableRetry: false
      });

      setFormError(validationError);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const formDataToSave = getFormData();

      if (hasMultipleTravelers && activeTravelerId) {
        // Mark this specific traveler as ready
        const freshLeg = getLegById(legId);
        const existingForms: TravelerFormData[] = freshLeg?.travelerFormsData ?? [];
        const updatedForms = existingForms.map<TravelerFormData>(tf =>
          tf.travelerId === activeTravelerId
            ? { ...tf, formData: formDataToSave, formStatus: 'ready' }
            : tf
        );
        if (!existingForms.find(tf => tf.travelerId === activeTravelerId)) {
          updatedForms.push({
            travelerId: activeTravelerId,
            formData: formDataToSave,
            formStatus: 'ready',
          });
        }
        await updateTripLeg(leg!.id, { travelerFormsData: updatedForms });
      } else {
        // Legacy single-traveler mark-as-ready
        await updateTripLeg(leg!.id, {
          formData: formDataToSave,
          formStatus: 'ready',
        });
      }

      setLastFailedOperation(null);
      Alert.alert('Success', 'Form marked as ready for submission!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      setLastFailedOperation({ type: 'markReady' });

      const result = await handleStorageError(error as Error, {
        screen: 'LegForm',
        action: 'markAsReady',
        timestamp: Date.now()
      }, {
        showUserFeedback: false,
        enableRetry: true,
        onRecoverySuccess: () => {
          setFormError(null);
          setLastFailedOperation(null);
          Alert.alert('Success', 'Form marked as ready for submission!', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        }
      });

      if (!result.recovered && result.error) {
        setFormError(result.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [isValid, leg, getFormData, updateTripLeg, navigation, hasMultipleTravelers, activeTravelerId, getLegById, legId]);

  const retryLastOperation = useCallback(async () => {
    setFormError(null);
    if (lastFailedOperation?.type === 'save') {
      await handleSaveForm();
    } else if (lastFailedOperation?.type === 'markReady') {
      await handleMarkAsReady();
    }
  }, [lastFailedOperation, handleSaveForm, handleMarkAsReady]);

  const reloadForm = useCallback(() => {
    setLoadError(null);
    const currentProfile = activeProfile;
    if (currentProfile && leg) {
      const schema = schemaRegistry.getSchema(leg.destinationCountry);
      if (schema) {
        const existingData = hasMultipleTravelers && activeTravelerId
          ? getTravelerFormData(legId, activeTravelerId)?.formData ?? {}
          : leg.formData ?? {};
        generateForm(currentProfile, leg, schema, existingData);
      }
    }
  }, [activeProfile, leg, generateForm, hasMultipleTravelers, activeTravelerId, getTravelerFormData, legId]);

  /**
   * Tab data for the TravelerTabs component. Empty when single-traveler.
   */
  const travelerTabs: TravelerTab[] = hasMultipleTravelers
    ? assignedTravelers.map((travelerId): TravelerTab => {
        const travelerProfile = travelerProfiles.get(travelerId);
        const isActive = travelerId === activeTravelerId;
        const storedFormEntry = getTravelerFormData(legId, travelerId);

        let completionPercentage = 0;
        let formStatus: TravelerFormData['formStatus'] = storedFormEntry?.formStatus ?? 'not_started';

        if (isActive && currentForm) {
          completionPercentage = currentForm.stats.completionPercentage;
          // Keep formStatus live for active traveler based on isValid
          if (isValid && completionPercentage === 100) {
            formStatus = 'ready';
          } else if (completionPercentage > 0) {
            formStatus = 'in_progress';
          }
        } else if (storedFormEntry) {
          if (storedFormEntry.formStatus === 'ready' || storedFormEntry.formStatus === 'submitted') {
            completionPercentage = 100;
          } else if (storedFormEntry.formStatus === 'in_progress') {
            // Estimate from stored field count
            completionPercentage = Math.min(
              Math.round((Object.keys(storedFormEntry.formData).length / 5) * 20),
              90
            );
          }
        }

        const firstName = travelerProfile?.givenNames?.split(' ')[0] ?? 'Traveler';

        return {
          id: travelerId,
          name: firstName,
          completionPercentage,
          formStatus,
        };
      })
    : [];

  return {
    trip,
    leg,
    currentForm,
    formData,
    isValid,
    isLoading,
    isSubmitting,
    formError,
    loadError,
    clearFormError,
    clearLoadError,
    handleFormDataChange,
    handleSaveForm,
    handleMarkAsReady,
    retryLastOperation,
    reloadForm,
    // Multi-traveler
    hasMultipleTravelers,
    activeTravelerId,
    travelerTabs,
    switchToTraveler,
    dismissError: useCallback(() => {
      setFormError(null);
      setLastFailedOperation(null);
    }, []),
  };
}
