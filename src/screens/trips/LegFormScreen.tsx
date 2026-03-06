import React, { useEffect, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Button } from '../../components/ui';
import { DynamicForm } from '../../components/forms';
import { useFormStore } from '../../stores/useFormStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { useTripStore } from '../../stores/useTripStore';
import { schemaRegistry } from '../../services/schemas/schemaRegistry';
import { TripStackParamList } from '../../app/navigation/types';

type LegFormScreenRouteProp = RouteProp<TripStackParamList, 'LegForm'>;
type LegFormScreenNavigationProp = StackNavigationProp<TripStackParamList, 'LegForm'>;

export default function LegFormScreen() {
  const route = useRoute<LegFormScreenRouteProp>();
  const navigation = useNavigation<LegFormScreenNavigationProp>();
  const { tripId, legId } = route.params || {};

  const { profile } = useProfileStore();
  const { getTripById, getLegById, updateTripLeg } = useTripStore();
  const {
    currentForm,
    formData,
    errors,
    isValid,
    isLoading,
    generateForm,
    updateField,
    getFormData,
    resetForm,
  } = useFormStore();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOnlyCountrySpecific, setShowOnlyCountrySpecific] = useState(false);

  const trip = getTripById(tripId);
  const leg = getLegById(legId);

  useEffect(() => {
    if (!trip || !leg || !profile) {
      Alert.alert('Error', 'Trip, leg, or profile not found', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      return;
    }

    // Load the country schema and generate the form
    const schema = schemaRegistry.getSchema(leg.destinationCountry);
    if (!schema) {
      Alert.alert('Error', `Schema not found for ${leg.destinationCountry}`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      return;
    }

    generateForm(profile, leg, schema, leg.formData || {});

    return () => {
      resetForm();
    };
  }, [tripId, legId, profile, trip, leg, generateForm, resetForm, navigation]);

  const handleFieldChange = (fieldId: string, value: unknown) => {
    updateField(fieldId, value);
  };

  const handleSaveForm = async () => {
    if (!leg || !currentForm) {return;}

    setIsSubmitting(true);
    try {
      const formDataToSave = getFormData();
      await updateTripLeg(leg.id, {
        formData: formDataToSave,
        formStatus: isValid ? 'ready' : 'in_progress',
      });

      Alert.alert('Success', 'Form data saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save form data');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAsReady = async () => {
    if (!isValid) {
      Alert.alert('Validation Error', 'Please complete all required fields before marking as ready.');
      return;
    }

    if (!leg) return;
    
    setIsSubmitting(true);
    try {
      const formDataToSave = getFormData();
      await updateTripLeg(leg.id, {
        formData: formDataToSave,
        formStatus: 'ready',
      });

      Alert.alert('Success', 'Form marked as ready for submission!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to update form status');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCountryFlag = (countryCode: string): string => {
    const flags: Record<string, string> = {
      'JPN': '🇯🇵',
      'MYS': '🇲🇾',
      'SGP': '🇸🇬',
    };
    return flags[countryCode] || '🌍';
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Text className="text-gray-600">Loading form...</Text>
      </View>
    );
  }

  if (!currentForm || !leg || !trip) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Text className="text-red-600 text-center">Unable to load form</Text>
        <Button
          title="Go Back"
          onPress={() => navigation.goBack()}
          variant="outline"
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
            <Text className="text-lg font-semibold text-gray-900">
              {getCountryFlag(leg.destinationCountry)} {currentForm.countryName}
            </Text>
            <Text className="text-sm text-gray-600">
              {trip.name} • {currentForm.portalName}
            </Text>
          </View>

          <View className="flex-row space-x-2">
            <Button
              title={showOnlyCountrySpecific ? 'Show All' : 'Smart Delta'}
              onPress={() => setShowOnlyCountrySpecific(!showOnlyCountrySpecific)}
              variant="outline"
              size="small"
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

      {/* Form Content */}
      <DynamicForm
        form={currentForm}
        formData={formData}
        onFieldChange={handleFieldChange}
        errors={errors}
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
          />

          <Button
            title={isValid ? 'Mark as Ready' : 'Complete Required Fields'}
            onPress={handleMarkAsReady}
            variant="primary"
            size="medium"
            fullWidth
            loading={isSubmitting}
            disabled={!isValid}
          />
        </View>

        {isValid && (
          <View className="mt-2">
            <Button
              title="Open Submission Guide"
              onPress={() => {
                // Navigate to submission guide screen
                navigation.navigate('SubmissionGuide', {
                  tripId,
                  legId,
                });
              }}
              variant="secondary"
              size="medium"
              fullWidth
            />
          </View>
        )}
      </View>
    </View>
  );
}
