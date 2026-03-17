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

interface UseLegFormOptions {
  tripId: string;
  legId: string;
}

/**
 * Encapsulates the business logic for LegFormScreen:
 * - Loads the trip/leg/profile and generates the form
 * - Handles save and mark-as-ready operations with error recovery
 * - Exposes form state and actions to the screen
 */
export function useLegForm({ tripId, legId }: UseLegFormOptions) {
  const navigation = useNavigation<NativeStackNavigationProp<TripStackParamList>>();
  const { profile } = useProfileStore();
  const { getTripById, getLegById, updateTripLeg } = useTripStore();
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

  const trip = getTripById(tripId);
  const leg = getLegById(legId);

  const clearFormError = useCallback(() => setFormError(null), []);
  const clearLoadError = useCallback(() => setLoadError(null), []);

  useEffect(() => {
    if (!trip || !leg || !profile) {
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
  }, [tripId, legId, profile, trip, leg, generateForm, resetForm]);

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
      await updateTripLeg(leg.id, {
        formData: formDataToSave,
        formStatus: isValid ? 'ready' : 'in_progress',
      });

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
  }, [leg, currentForm, getFormData, updateTripLeg, isValid]);

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
      await updateTripLeg(leg!.id, {
        formData: formDataToSave,
        formStatus: 'ready',
      });

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
  }, [isValid, leg, getFormData, updateTripLeg, navigation]);

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
    if (profile && leg) {
      const schema = schemaRegistry.getSchema(leg.destinationCountry);
      if (schema) {
        generateForm(profile, leg, schema, leg.formData || {});
      }
    }
  }, [profile, leg, generateForm]);

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
    dismissError: useCallback(() => {
      setFormError(null);
      setLastFailedOperation(null);
    }, []),
  };
}
