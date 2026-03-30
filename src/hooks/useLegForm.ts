import { useEffect, useState, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFormStore } from '../stores/useFormStore';
import { useProfileStore } from '../stores/useProfileStore';
import { useTripStore } from '../stores/useTripStore';
import { schemaRegistry } from '../services/schemas/schemaRegistry';
import { handleStorageError, handleValidationError } from '../services/error/errorHandler';
import { ERROR_CODES, createAppError } from '../services/error/errorHandling';
import { stripPIIFromFormData } from '../utils/piiSanitizer';
import type { TripStackParamList } from '../app/navigation/types';
import type { TravelerProfile } from '../types/profile';
import type { TravelerFormData } from '../types/trip';
import type { UseLegFormOptions, TravelerState } from './useLegFormTypes';
import {
  upsertTravelerFormData,
  persistFormData,
  buildTravelerTabs,
  resolveFormGenerationContext,
} from './useLegFormHelpers';

// Re-export for backward compatibility
export { deriveLegFormStatus } from './useLegFormHelpers';

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
  const [formError, setFormError] = useState<import('../services/error/errorHandling').AppError | string | null>(null);
  const [loadError, setLoadError] = useState<import('../services/error/errorHandling').AppError | string | null>(null);
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
  const assignedTravelers = useMemo(() => leg?.assignedTravelers ?? [], [leg?.assignedTravelers]);
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
    const ctx = resolveFormGenerationContext({
      trip, leg, profile, hasMultipleTravelers, activeTravelerId,
      travelerProfiles, getTravelerFormData, legId,
    });

    if ('error' in ctx) {
      // Empty message means "still loading" — don't show error, just wait
      if (ctx.error.userMessage) setLoadError(ctx.error);
      return;
    }

    try {
      setLoadError(null);
      generateForm(ctx.profile, leg!, ctx.schema, ctx.initialData);
    } catch (error) {
      setLoadError(createAppError(ERROR_CODES.PARSING_ERROR, (error as Error).message, 'Failed to load the form. Please try again.'));
    }

    return () => { resetForm(); };
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

    // Save current traveler's form data before switching (strip PII before DB persist)
    if (activeTravelerId) {
      const currentFormData = stripPIIFromFormData(getFormData());
      const completionPct = currentForm?.stats.completionPercentage ?? 0;
      const existingForms: TravelerFormData[] = leg.travelerFormsData ?? [];
      const updatedForms = upsertTravelerFormData(
        existingForms,
        activeTravelerId,
        currentFormData,
        isValid ? 'ready' : 'in_progress',
        completionPct,
      );
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
  }, [leg, activeTravelerId, travelerProfiles, getFormData, isValid, updateTripLeg, generateForm, getLegById, legId, currentForm]);

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
      await persistFormData({
        leg, rawFormData: getFormData(), isValid, hasMultipleTravelers,
        activeTravelerId, assignedTravelers, getLegById, legId, updateTripLeg,
        completionPercentage: currentForm?.stats.completionPercentage ?? 0,
      });
      setLastFailedOperation(null);
      Alert.alert('Success', 'Form data saved successfully!');
    } catch (error) {
      setLastFailedOperation({ type: 'save' });
      const result = await handleStorageError(error as Error, {
        screen: 'LegForm', action: 'saveForm', timestamp: Date.now(),
      }, {
        showUserFeedback: false, enableRetry: true,
        onRecoverySuccess: () => {
          setFormError(null);
          setLastFailedOperation(null);
          Alert.alert('Success', 'Form data saved successfully!');
        },
      });
      if (!result.recovered && result.error) setFormError(result.error);
    } finally {
      setIsSubmitting(false);
    }
  }, [leg, currentForm, getFormData, updateTripLeg, isValid, hasMultipleTravelers, activeTravelerId, assignedTravelers, getLegById, legId]);

  const handleMarkAsReady = useCallback(async () => {
    if (!isValid) {
      const validationError = createAppError(
        ERROR_CODES.VALIDATION_FAILED,
        'Form validation failed',
        'Please complete all required fields before marking as ready.',
      );
      await handleValidationError(new Error('Form validation failed'), {
        screen: 'LegForm', action: 'markAsReady', timestamp: Date.now(),
      }, { showUserFeedback: false, enableRetry: false });
      setFormError(validationError);
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      await persistFormData({
        leg: leg!, rawFormData: getFormData(), isValid, hasMultipleTravelers,
        activeTravelerId, assignedTravelers, getLegById, legId, updateTripLeg,
        completionPercentage: 100, statusOverride: 'ready',
      });
      setLastFailedOperation(null);
      Alert.alert('Success', 'Form marked as ready for submission!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      setLastFailedOperation({ type: 'markReady' });
      const result = await handleStorageError(error as Error, {
        screen: 'LegForm', action: 'markAsReady', timestamp: Date.now(),
      }, {
        showUserFeedback: false, enableRetry: true,
        onRecoverySuccess: () => {
          setFormError(null);
          setLastFailedOperation(null);
          Alert.alert('Success', 'Form marked as ready for submission!', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        },
      });
      if (!result.recovered && result.error) setFormError(result.error);
    } finally {
      setIsSubmitting(false);
    }
  }, [isValid, leg, getFormData, updateTripLeg, navigation, hasMultipleTravelers, activeTravelerId, assignedTravelers, getLegById, legId]);

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

  const travelerTabs = hasMultipleTravelers
    ? buildTravelerTabs({
        assignedTravelers,
        activeTravelerId,
        travelerProfiles,
        getTravelerFormData,
        legId,
        currentFormStats: currentForm?.stats ?? null,
        isValid,
      })
    : [];

  const dismissError = useCallback(() => {
    setFormError(null);
    setLastFailedOperation(null);
  }, []);

  return {
    tripData: { trip, leg },
    form: { currentForm, formData, isValid, isLoading, handleFormDataChange, reloadForm },
    submission: { isSubmitting, handleSaveForm, handleMarkAsReady, retryLastOperation },
    errors: { formError, loadError, clearFormError, clearLoadError, dismissError },
    travelers: { hasMultipleTravelers, activeTravelerId, travelerTabs, switchToTraveler },
  };
}
