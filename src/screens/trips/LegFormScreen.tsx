import { useEffect, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Button } from '../../components/ui';
import { ErrorMessage, useErrorMessage } from '../../components/ui/ErrorMessage';
import { DynamicForm } from '../../components/forms';
import { ContextualHelp, HelpContent } from '../../components/help';
import CountryFlag from '../../components/trips/CountryFlag';
import { useFormStore } from '../../stores/useFormStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { useTripStore } from '../../stores/useTripStore';
import { schemaRegistry } from '../../services/schemas/schemaRegistry';
import { TripStackParamList } from '../../app/navigation/types';
import { handleStorageError, handleValidationError } from '../../services/error/errorHandler';
import { ERROR_CODES, createAppError } from '../../utils/errorHandling';

type LegFormScreenRouteProp = RouteProp<TripStackParamList, 'LegForm'>;

export default function LegFormScreen() {
  const route = useRoute<LegFormScreenRouteProp>();
  const navigation = useNavigation();
  const { tripId, legId } = route.params || {};

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
  } = useFormStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOnlyCountrySpecific, setShowOnlyCountrySpecific] = useState(false);
  const { error: formError, showError: showFormError, clearError: clearFormError } = useErrorMessage();
  const { error: loadError, showError: showLoadError, clearError: clearLoadError } = useErrorMessage();
  const [lastFailedOperation, setLastFailedOperation] = useState<{ type: 'save' | 'markReady' } | null>(null);

  const trip = getTripById(tripId);
  const leg = getLegById(legId);

  useEffect(() => {
    if (!trip || !leg || !profile) {
      const error = createAppError(
        ERROR_CODES.PARSING_ERROR,
        'Trip, leg, or profile not found',
        'Required data is missing. Please try navigating back and trying again.'
      );
      showLoadError(error);
      return;
    }

    // Load the country schema and generate the form
    const schema = schemaRegistry.getSchema(leg.destinationCountry);
    if (!schema) {
      const error = createAppError(
        ERROR_CODES.PARSING_ERROR,
        `Schema not found for ${leg.destinationCountry}`,
        `Form template for ${leg.destinationCountry} is not available. Please contact support.`
      );
      showLoadError(error);
      return;
    }

    try {
      clearLoadError(); // Clear any previous load errors
      generateForm(profile, leg, schema, leg.formData || {});
    } catch (error) {
      const appError = createAppError(
        ERROR_CODES.PARSING_ERROR,
        (error as Error).message,
        'Failed to load the form. Please try again.'
      );
      showLoadError(appError);
    }

    return () => {
      resetForm();
    };
  }, [tripId, legId, profile, trip, leg, generateForm, resetForm, navigation, showLoadError, clearLoadError]);

  const handleFormDataChange = (_newFormData: Record<string, unknown>) => {
    // Form data is automatically updated in the store
    // No additional action needed here
  };

  const handleSaveForm = async () => {
    if (!leg || !currentForm) { return; }

    setIsSubmitting(true);
    clearFormError(); // Clear any previous form errors
    
    try {
      const formDataToSave = getFormData();
      await updateTripLeg(leg.id, {
        formData: formDataToSave,
        formStatus: isValid ? 'ready' : 'in_progress',
      });

      setLastFailedOperation(null); // Clear any failed operation
      Alert.alert('Success', 'Form data saved successfully!');
    } catch (error) {
      // Store the failed operation for retry
      setLastFailedOperation({ type: 'save' });
      
      const result = await handleStorageError(error as Error, {
        screen: 'LegForm',
        action: 'saveForm',
        timestamp: Date.now()
      }, {
        showUserFeedback: false, // We'll show our own UI
        enableRetry: true,
        onRecoverySuccess: () => {
          clearFormError();
          setLastFailedOperation(null);
          Alert.alert('Success', 'Form data saved successfully!');
        }
      });
      
      if (!result.recovered && result.error) {
        showFormError(result.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAsReady = async () => {
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
        showUserFeedback: false, // We'll show our own UI
        enableRetry: false
      });
      
      showFormError(validationError);
      return;
    }

    setIsSubmitting(true);
    clearFormError(); // Clear any previous form errors
    
    try {
      const formDataToSave = getFormData();
      await updateTripLeg(leg!.id, {
        formData: formDataToSave,
        formStatus: 'ready',
      });

      setLastFailedOperation(null); // Clear any failed operation
      Alert.alert('Success', 'Form marked as ready for submission!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      // Store the failed operation for retry
      setLastFailedOperation({ type: 'markReady' });
      
      const result = await handleStorageError(error as Error, {
        screen: 'LegForm',
        action: 'markAsReady',
        timestamp: Date.now()
      }, {
        showUserFeedback: false, // We'll show our own UI
        enableRetry: true,
        onRecoverySuccess: () => {
          clearFormError();
          setLastFailedOperation(null);
          Alert.alert('Success', 'Form marked as ready for submission!', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        }
      });
      
      if (!result.recovered && result.error) {
        showFormError(result.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };


  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Text className="text-gray-600">Loading form...</Text>
      </View>
    );
  }

  if (!currentForm || !leg || !trip || loadError) {
    return (
      <View className="flex-1 bg-gray-50 px-6 py-8">
        <ErrorMessage
          error={loadError || 'Unable to load form'}
          variant="fullscreen"
          showRetry
          onRetry={() => {
            clearLoadError();
            // Try to reload
            if (profile && leg) {
              const schema = schemaRegistry.getSchema(leg.destinationCountry);
              if (schema) {
                generateForm(profile, leg, schema, leg.formData || {});
              }
            }
          }}
          onDismiss={() => navigation.goBack()}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <View className="flex-row items-center">
              <CountryFlag countryCode={leg.destinationCountry} size="small" className="mr-2" />
              <Text className="text-lg font-semibold text-gray-900">
                {currentForm.countryName}
              </Text>
            </View>
            <Text className="text-sm text-gray-600">
              {trip.name} • {currentForm.portalName}
            </Text>
          </View>

          <View className="flex-row space-x-2">
            <ContextualHelp 
              content={HelpContent.autoFill}
              variant="icon"
              size="small"
            />
            <Button
              title={showOnlyCountrySpecific ? 'Show All' : 'Smart Delta'}
              onPress={() => setShowOnlyCountrySpecific(!showOnlyCountrySpecific)}
              variant="outline"
              size="small"
              testID="smart-delta-button"
            />
          </View>
        </View>

        {/* Form Status */}
        <View className="mt-3">
          <View className="flex-row items-center space-x-2">
            <View
              className={`w-3 h-3 rounded-full ${
                leg.formStatus === 'ready' ? 'bg-green-500' :
                leg.formStatus === 'in_progress' ? 'bg-yellow-500' :
                leg.formStatus === 'submitted' ? 'bg-blue-500' :
                'bg-gray-300'
              }`}
            />
            <Text className="text-sm text-gray-600 capitalize">
              {leg.formStatus.replace('_', ' ')}
            </Text>
            {currentForm.stats.completionPercentage > 0 && (
              <Text className="text-sm text-green-600 font-medium">
                {currentForm.stats.completionPercentage}% complete
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Error Messages */}
      <View className="px-4">
        <ErrorMessage
          error={formError}
          variant="card"
          showRetry
          onRetry={async () => {
            clearFormError();
            // Retry the last failed operation
            if (lastFailedOperation?.type === 'save') {
              await handleSaveForm();
            } else if (lastFailedOperation?.type === 'markReady') {
              await handleMarkAsReady();
            }
          }}
          onDismiss={() => {
            clearFormError();
            setLastFailedOperation(null);
          }}
          className="mt-4"
        />
      </View>

      {/* Form Content */}
      <DynamicForm
        form={currentForm}
        onFormDataChange={handleFormDataChange}
        initialFormData={leg.formData || {}}
        showOnlyCountrySpecific={showOnlyCountrySpecific}
        collapsibleSections={true}
        showFormStats={!showOnlyCountrySpecific}
      />

      {/* Action Buttons */}
      <View className="bg-white border-t border-gray-200 px-4 py-3">
        <View className="flex-row space-x-3">
          <Button
            title="Save Progress"
            onPress={handleSaveForm}
            variant="outline"
            size="medium"
            loading={isSubmitting}
            disabled={Object.keys(formData).length === 0}
            testID="save-progress-button"
          />

          <Button
            title={isValid ? 'Mark as Ready' : 'Complete Required Fields'}
            onPress={handleMarkAsReady}
            variant="primary"
            size="medium"
            fullWidth
            loading={isSubmitting}
            disabled={!isValid}
            testID="mark-ready-button"
          />
        </View>

        {isValid && (
          <View className="mt-2">
            <Button
              title="Open Submission Guide"
              onPress={() => {
                // Navigate to submission guide screen
                (navigation as any).navigate('SubmissionGuide', {
                  tripId,
                  legId,
                });
              }}
              variant="secondary"
              testID="open-submission-guide-button"
              size="medium"
              fullWidth
            />
          </View>
        )}
      </View>
    </View>
  );
}
