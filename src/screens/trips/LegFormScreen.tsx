import { useState } from 'react';
import { View, Text, Alert, ScrollView } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../../components/ui';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { DynamicForm } from '../../components/forms';
import { ContextualHelp, HelpContent } from '../../components/help';
import CountryFlag from '../../components/trips/CountryFlag';
import { schemaRegistry } from '../../services/schemas/schemaRegistry';
import { TripStackParamList } from '../../app/navigation/types';
import { useLegForm } from '../../hooks/useLegForm';

type LegFormScreenRouteProp = RouteProp<TripStackParamList, 'LegForm'>;

export default function LegFormScreen() {
  const route = useRoute<LegFormScreenRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<TripStackParamList>>();
  const { tripId, legId } = route.params || {};

  const [showOnlyCountrySpecific, setShowOnlyCountrySpecific] = useState(false);

  const {
    trip,
    leg,
    currentForm,
    formData,
    isValid,
    isLoading,
    isSubmitting,
    formError,
    loadError,
    clearLoadError,
    handleFormDataChange,
    handleSaveForm,
    handleMarkAsReady,
    retryLastOperation,
    reloadForm,
    dismissError,
  } = useLegForm({ tripId, legId });

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
            reloadForm();
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

      <ScrollView className="flex-1" keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      {/* Error Messages */}
      <View className="px-4">
        <ErrorMessage
          error={formError}
          variant="card"
          showRetry
          onRetry={retryLastOperation}
          onDismiss={dismissError}
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
        <View className="space-y-2">
          <Button
            title="Save Progress"
            onPress={handleSaveForm}
            variant="outline"
            size="medium"
            fullWidth
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
          <View className="mt-2 flex-row space-x-3">
            <View className="flex-1">
              <Button
                title="Submit in App"
                onPress={() => {
                  const countryCode = leg.destinationCountry;
                  const schema = schemaRegistry.getSchema(countryCode);
                  if (schema?.portalUrl) {
                    navigation.navigate('PortalSubmission', {
                      url: schema.portalUrl,
                      countryCode,
                      tripId,
                      legId,
                    });
                  } else {
                    Alert.alert('Error', `Portal URL not found for ${countryCode}.`);
                  }
                }}
                variant="primary"
                testID="submit-in-app-button"
                size="medium"
                fullWidth
              />
            </View>
            <Button
              title="Guide"
              onPress={() => {
                navigation.navigate('SubmissionGuide', {
                  tripId,
                  legId,
                  countryCode: leg.destinationCountry,
                });
              }}
              variant="secondary"
              testID="open-submission-guide-button"
              size="medium"
            />
          </View>
        )}
      </View>
    </ScrollView>
    </View>
  );
}
