import { useState } from 'react';
import { View, Text, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, ScreenContainer } from '@/components/ui';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { DynamicForm } from '@/components/forms';
import { ContextualHelp, HelpContent } from '@/components/help';
import CountryFlag from '@/components/trips/CountryFlag';
import TravelerTabs from '@/components/trips/TravelerTabs';
import PassportValidityWarning from '@/components/trips/PassportValidityWarning';
import { schemaRegistry } from '@/services/schemas/schemaRegistry';
import { TripStackParamList } from '@/app/navigation/types';
import { useLegForm } from '@/hooks/useLegForm';
import { usePassportValidity } from '@/hooks/usePassportValidity';

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
    // Multi-traveler
    hasMultipleTravelers,
    activeTravelerId,
    travelerTabs,
    switchToTraveler,
  } = useLegForm({ tripId, legId });

  // Passport validity check — called unconditionally (hooks rule)
  const passportWarning = usePassportValidity({
    countryCode: leg?.destinationCountry ?? '',
    departureDate: leg?.departureDate,
  });

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-gray-900">
        <Text className="text-gray-600 dark:text-gray-400">Loading form...</Text>
      </View>
    );
  }

  if (!currentForm || !leg || !trip || loadError) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900 px-6 py-8">
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
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
    <ScreenContainer className="bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <View className="flex-row items-center">
              <CountryFlag countryCode={leg.destinationCountry} size="small" className="mr-2" />
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                {currentForm.countryName}
              </Text>
            </View>
            <Text className="text-sm text-gray-600 dark:text-gray-400">
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
            <Text className="text-sm text-gray-600 dark:text-gray-400 capitalize">
              {leg.formStatus.replace('_', ' ')}
            </Text>
            {currentForm.stats.completionPercentage > 0 && (
              <Text className="text-sm text-green-600 dark:text-green-400 font-medium">
                {currentForm.stats.completionPercentage}% complete
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Traveler Tabs — only shown for multi-traveler legs */}
      {hasMultipleTravelers && (
        <TravelerTabs
          tabs={travelerTabs}
          activeTabId={activeTravelerId ?? ''}
          onTabPress={switchToTraveler}
          testID="leg-form-traveler-tabs"
        />
      )}

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

      {/* Passport Validity Warning */}
      {passportWarning && (
        <View className="px-4 mt-3">
          <PassportValidityWarning
            status={passportWarning.status}
            countryName={passportWarning.countryName}
            requiredMonths={passportWarning.requiredMonths}
            passportExpiry={passportWarning.passportExpiry}
            testID="leg-form-passport-validity-warning"
          />
        </View>
      )}

      {/* Form Content */}
      <DynamicForm
        form={currentForm}
        onFormDataChange={handleFormDataChange}
        initialFormData={leg.formData || {}}
        showOnlyCountrySpecific={showOnlyCountrySpecific}
        collapsibleSections={true}
        showFormStats={!showOnlyCountrySpecific}
      />

    </ScrollView>

      {/* Action Buttons — fixed bottom bar, always visible regardless of scroll position */}
      <View testID="action-buttons-bar" className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-3">
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
    </ScreenContainer>
    </KeyboardAvoidingView>
  );
}
