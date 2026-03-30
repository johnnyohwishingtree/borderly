import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  SafeAreaView,
  Linking,
} from 'react-native';
import { useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { ArrowLeft, Globe, CircleCheck, TriangleAlert, Clock } from 'lucide-react-native';
import {
  GuideProgress,
  StepCard,
} from '@/components/guide';
import { Button, Card, StatusBadge, ScreenContainer } from '@/components/ui';
import TravelerTabs from '@/components/trips/TravelerTabs';
import { useSubmissionGuide } from '@/hooks/useSubmissionGuide';
import { useTripStore } from '@/stores/useTripStore';
import type { SubmissionStep } from '@/types/schema';

type SubmissionGuideScreenProps = {
  route: {
    params: {
      tripId: string;
      legId: string;
      countryCode: string;
      travelerId?: string;
    };
  };
};

export default function SubmissionGuideScreen() {
  const navigation = useNavigation();
  const route = useRoute() as SubmissionGuideScreenProps['route'];
  const { tripId, legId, countryCode, travelerId } = route.params;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { updateLegSubmissionStatus } = useTripStore();

  const {
    state: { isLoading, currentStep, activeTravelerId },
    data: { schema, filledForm, currentTraveler, completedSteps, fieldsData },
    travelers: { travelerTabs, hasMultipleTravelers },
    actions: { handleStepComplete, handleSwitchTraveler },
  } = useSubmissionGuide({ tripId, legId, countryCode, travelerId });

  const handleMarkAsSubmitted = async () => {
    setIsSubmitting(true);
    try {
      await updateLegSubmissionStatus(legId, 'submitted');
    } finally {
      setIsSubmitting(false);
    }
    (navigation as any).navigate('TripDetail', { tripId });
  };

  const handleOpenPortal = async () => {
    if (!schema?.portalUrl) {
      Alert.alert('Error', 'Portal URL not available');
      return;
    }

    try {
      const supported = await Linking.canOpenURL(schema.portalUrl);
      if (supported) {
        await Linking.openURL(schema.portalUrl);
      } else {
        Alert.alert('Error', `Unable to open ${schema.portalName}`);
      }
    } catch {
      Alert.alert('Error', 'Failed to open government portal');
    }
  };

  const getCompletionStatus = () => {
    if (!schema) return 'unknown';
    const totalSteps = schema.submissionGuide.length;
    const completed = completedSteps.length;
    if (completed === totalSteps) return 'complete';
    if (completed > 0) return 'in_progress';
    return 'not_started';
  };

  if (isLoading || !schema || !filledForm) {
    return (
      <ScreenContainer className="bg-gray-50 dark:bg-gray-900">
      <SafeAreaView className="flex-1">
        <View className="flex-1 justify-center items-center">
          <Text className="text-lg text-gray-600 dark:text-gray-400">Loading submission guide...</Text>
        </View>
      </SafeAreaView>
      </ScreenContainer>
    );
  }

  const totalSteps = schema.submissionGuide.length;
  const completionStatus = getCompletionStatus();
  const badgeStatus =
    completionStatus === 'complete'
      ? ('success' as const)
      : completionStatus === 'in_progress'
      ? ('info' as const)
      : ('neutral' as const);

  return (
    <ScreenContainer className="bg-gray-50 dark:bg-gray-900">
    <SafeAreaView className="flex-1">
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => navigation.goBack()}
            className="flex-row items-center"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <ArrowLeft size={24} color="#374151" />
            <Text className="text-lg font-semibold text-gray-900 dark:text-white ml-2">
              Back
            </Text>
          </Pressable>

          <StatusBadge
            status={badgeStatus}
            text={
              completionStatus === 'complete'
                ? 'Complete'
                : completionStatus === 'in_progress'
                ? 'In Progress'
                : 'Not Started'
            }
          />
        </View>

        <View className="mt-3">
          <Text className="text-xl font-bold text-gray-900 dark:text-white">
            {schema.countryName} Submission Guide
          </Text>
          <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {schema.portalName} • Step-by-step walkthrough
          </Text>
          {/* Show current traveler name inline when no tabs (single traveler) */}
          {!hasMultipleTravelers && currentTraveler && (
            <View className="mt-2 flex-row items-center">
              <View className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
              <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
                For: {currentTraveler.givenNames} {currentTraveler.surname}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Traveler selector tabs – shown only when multiple travelers are assigned */}
      {hasMultipleTravelers && activeTravelerId && (
        <TravelerTabs
          tabs={travelerTabs}
          activeTabId={activeTravelerId}
          onTabPress={handleSwitchTraveler}
          testID="submission-guide-traveler-tabs"
        />
      )}

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4">
          {/* Portal Information Card */}
          <Card className="mb-6">
            <View className="p-4">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Globe size={24} color="#3B82F6" />
                  <Text className="text-lg font-semibold text-gray-900 dark:text-white ml-3">
                    {schema.portalName}
                  </Text>
                </View>
              </View>
              <View className="flex-row flex-wrap gap-2 mb-3">
                <Button
                  title="Submit in App"
                  onPress={() => {
                    (navigation as any).navigate('PortalSubmission', {
                      url: schema.portalUrl,
                      countryCode: schema.countryCode,
                      tripId,
                      legId,
                    });
                  }}
                  variant="primary"
                  size="small"
                  testID="submit-in-app-button"
                />
                <Button
                  title="Open in Browser"
                  onPress={handleOpenPortal}
                  variant="secondary"
                  size="small"
                  testID="open-in-browser-button"
                />
              </View>

              {/* Timing Information */}
              <View className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                <View className="flex-row items-center mb-2">
                  <Clock size={18} color="#3B82F6" />
                  <Text className="text-sm font-medium text-blue-900 dark:text-blue-100 ml-2">
                    Submission Timing
                  </Text>
                </View>
                <View className="space-y-1">
                  <Text className="text-sm text-blue-800 dark:text-blue-200">
                    <Text className="font-medium">Recommended:</Text> Submit{' '}
                    {schema.submission.recommended} before arrival
                  </Text>
                  <Text className="text-sm text-blue-800 dark:text-blue-200">
                    <Text className="font-medium">Earliest:</Text>{' '}
                    {schema.submission.earliestBeforeArrival} before arrival
                  </Text>
                  <Text className="text-sm text-blue-800 dark:text-blue-200">
                    <Text className="font-medium">Latest:</Text>{' '}
                    {schema.submission.latestBeforeArrival} before arrival
                  </Text>
                </View>
              </View>

              {/* Form Completion Summary */}
              <View className="mt-4">
                <Text className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  {hasMultipleTravelers && currentTraveler
                    ? `${currentTraveler.givenNames}'s Form Status:`
                    : 'Your Form Status:'}
                </Text>
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-gray-600 dark:text-gray-400">
                    {filledForm.stats.autoFilled + filledForm.stats.userFilled} of{' '}
                    {filledForm.stats.totalFields} fields complete
                  </Text>
                  <View className="bg-green-100 dark:bg-green-900 px-2 py-1 rounded-full">
                    <Text className="text-sm font-medium text-green-700 dark:text-green-200">
                      {filledForm.stats.completionPercentage}% Ready
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </Card>

          {/* Progress Indicator */}
          <GuideProgress
            totalSteps={totalSteps}
            currentStep={currentStep}
            completedSteps={completedSteps}
            stepTitles={schema.submissionGuide.map(
              (step: SubmissionStep) => step.title,
            )}
            variant="horizontal"
            showLabels={false}
          />

          {/* Warning for Incomplete Form */}
          {filledForm.stats.remaining > 0 && (
            <Card className="mb-4 bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
              <View className="p-4">
                <View className="flex-row items-center">
                  <TriangleAlert size={20} color="#F59E0B" />
                  <Text className="text-sm font-medium text-yellow-800 dark:text-yellow-200 ml-2">
                    Complete your form first
                  </Text>
                </View>
                <Text className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
                  You have {filledForm.stats.remaining} fields that need
                  attention before starting the submission guide.
                </Text>
                <Button
                  title="Complete Form"
                  onPress={() => navigation.goBack()}
                  variant="outline"
                  size="small"
                  fullWidth={true}
                />
              </View>
            </Card>
          )}

          {/* Submission Steps */}
          <View className="space-y-4">
            {schema.submissionGuide.map((step: SubmissionStep) => (
              <StepCard
                key={step.order}
                step={step}
                isCompleted={completedSteps.includes(step.order)}
                isCurrent={currentStep === step.order}
                fieldsData={fieldsData}
                onMarkComplete={() => handleStepComplete(step.order)}
              />
            ))}
          </View>

          {/* Completion Actions */}
          {completedSteps.length === totalSteps && (
            <Card className="mt-6 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <View className="p-4">
                <View className="flex-row items-center mb-3">
                  <CircleCheck size={24} color="#10B981" />
                  <Text className="text-lg font-semibold text-green-900 dark:text-green-100 ml-3">
                    Submission Complete!
                  </Text>
                </View>
                <Text className="text-sm text-green-800 dark:text-green-200 mb-4">
                  You've successfully completed all submission steps for{' '}
                  {schema.countryName}. Don't forget to save any QR codes to
                  your wallet for easy access at the airport.
                </Text>
                <Button
                  title="Mark as Submitted"
                  onPress={handleMarkAsSubmitted}
                  variant="outline"
                  size="medium"
                  fullWidth={true}
                  loading={isSubmitting}
                  accessibilityLabel="Mark as submitted"
                  accessibilityRole="button"
                  testID="mark-as-submitted-button"
                />
                <View className="flex-row flex-wrap gap-3 mt-3">
                  <Button
                    title="Save QR Code"
                    onPress={() => {
                      (navigation as any).navigate('AddQR', {
                        tripId,
                        legId,
                        countryCode: schema.countryCode,
                        travelerId: currentTraveler?.id,
                      });
                    }}
                    variant="outline"
                    size="medium"
                    fullWidth={false}
                    testID="save-qr-button"
                  />
                  <Button
                    title="Back to Trip"
                    onPress={() =>
                      (navigation as any).navigate('TripDetail', { tripId })
                    }
                    variant="secondary"
                    size="medium"
                    fullWidth={false}
                  />
                </View>
              </View>
            </Card>
          )}

          {/* Bottom Spacing */}
          <View className="h-8" />
        </View>
      </ScrollView>
    </SafeAreaView>
    </ScreenContainer>
  );
}
