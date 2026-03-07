import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  SafeAreaView,
  Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { 
  ArrowLeftIcon, 
  GlobeAltIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon 
} from 'react-native-heroicons/outline';
import { 
  GuideProgress, 
  StepCard,
} from '../../components/guide';
import { Button, Card, StatusBadge } from '../../components/ui';
import { useFormStore, useTripStore } from '../../stores';
import { generateFilledForm } from '../../services/forms/formEngine';
import { getSchemaForCountry } from '../../services/schemas/schemaRegistry';
import { formatFieldValue } from '../../utils/fieldFormatters';

type SubmissionGuideScreenProps = {
  route: {
    params: {
      tripId: string;
      legId: string;
      countryCode: string;
    };
  };
};

export default function SubmissionGuideScreen() {
  const navigation = useNavigation();
  const route = useRoute() as SubmissionGuideScreenProps['route'];
  const { tripId, legId, countryCode } = route.params;

  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Store hooks
  const { trips } = useTripStore();
  const { profile } = useFormStore();

  // Find trip and leg
  const trip = trips.find(t => t.id === tripId);
  const leg = trip?.legs.find(l => l.id === legId);

  // Load schema and generate form data
  const { schema, filledForm } = useMemo(() => {
    if (!leg || !profile) return { schema: null, filledForm: null };

    const countrySchema = getSchemaForCountry(countryCode);
    if (!countrySchema) return { schema: null, filledForm: null };

    const form = generateFilledForm(profile, leg, countrySchema, leg.formData);
    
    return { schema: countrySchema, filledForm: form };
  }, [leg, profile, countryCode]);

  // Prepare field data for StepCard components
  const fieldsData = useMemo(() => {
    if (!filledForm) return {};

    const data: { [fieldId: string]: { label: string; value: string; portalFieldName?: string } } = {};
    
    filledForm.sections.forEach(section => {
      section.fields.forEach(field => {
        data[field.id] = {
          label: field.label,
          value: formatFieldValue(field.currentValue, field.type),
          portalFieldName: field.portalFieldName,
        };
      });
    });

    return data;
  }, [filledForm]);

  useEffect(() => {
    if (schema && filledForm) {
      setIsLoading(false);
    }
  }, [schema, filledForm]);

  const handleStepComplete = (stepOrder: number) => {
    if (!completedSteps.includes(stepOrder)) {
      setCompletedSteps(prev => [...prev, stepOrder]);
    }
    
    // Auto-advance to next step if not at the end
    if (stepOrder < (schema?.submissionGuide.length || 0)) {
      setCurrentStep(stepOrder + 1);
    }
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
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center">
          <Text className="text-lg text-gray-600">Loading submission guide...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totalSteps = schema.submissionGuide.length;
  const completionStatus = getCompletionStatus();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-3">
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => navigation.goBack()}
            className="flex-row items-center"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <ArrowLeftIcon size={24} color="#374151" />
            <Text className="text-lg font-semibold text-gray-900 ml-2">
              Back
            </Text>
          </Pressable>
          
          <StatusBadge 
            status={completionStatus}
            text={
              completionStatus === 'complete' ? 'Complete' :
              completionStatus === 'in_progress' ? 'In Progress' :
              'Not Started'
            }
          />
        </View>

        <View className="mt-3">
          <Text className="text-xl font-bold text-gray-900">
            {schema.countryName} Submission Guide
          </Text>
          <Text className="text-sm text-gray-600 mt-1">
            {schema.portalName} • Step-by-step walkthrough
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4">
          {/* Portal Information Card */}
          <Card className="mb-6">
            <View className="p-4">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <GlobeAltIcon size={24} color="#3B82F6" />
                  <Text className="text-lg font-semibold text-gray-900 ml-3">
                    {schema.portalName}
                  </Text>
                </View>
                <Button
                  title="Open Portal"
                  onPress={handleOpenPortal}
                  variant="primary"
                  size="small"
                />
              </View>
              
              {/* Timing Information */}
              <View className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <View className="flex-row items-center mb-2">
                  <ClockIcon size={18} color="#3B82F6" />
                  <Text className="text-sm font-medium text-blue-900 ml-2">
                    Submission Timing
                  </Text>
                </View>
                <View className="space-y-1">
                  <Text className="text-sm text-blue-800">
                    <Text className="font-medium">Recommended:</Text> Submit {schema.submission.recommended} before arrival
                  </Text>
                  <Text className="text-sm text-blue-800">
                    <Text className="font-medium">Earliest:</Text> {schema.submission.earliestBeforeArrival} before arrival
                  </Text>
                  <Text className="text-sm text-blue-800">
                    <Text className="font-medium">Latest:</Text> {schema.submission.latestBeforeArrival} before arrival
                  </Text>
                </View>
              </View>

              {/* Form Completion Summary */}
              <View className="mt-4">
                <Text className="text-sm font-medium text-gray-900 mb-2">
                  Your Form Status:
                </Text>
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm text-gray-600">
                    {filledForm.stats.autoFilled + filledForm.stats.userFilled} of {filledForm.stats.totalFields} fields complete
                  </Text>
                  <View className="bg-green-100 px-2 py-1 rounded-full">
                    <Text className="text-sm font-medium text-green-700">
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
            stepTitles={schema.submissionGuide.map(step => step.title)}
            variant="horizontal"
            showLabels={false}
          />

          {/* Warning for Incomplete Form */}
          {filledForm.stats.remaining > 0 && (
            <Card className="mb-4 bg-yellow-50 border-yellow-200">
              <View className="p-4">
                <View className="flex-row items-center">
                  <ExclamationTriangleIcon size={20} color="#F59E0B" />
                  <Text className="text-sm font-medium text-yellow-800 ml-2">
                    Complete your form first
                  </Text>
                </View>
                <Text className="text-sm text-yellow-700 mt-2">
                  You have {filledForm.stats.remaining} fields that need attention before starting the submission guide.
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
            {schema.submissionGuide.map((step) => (
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
            <Card className="mt-6 bg-green-50 border-green-200">
              <View className="p-4">
                <View className="flex-row items-center mb-3">
                  <CheckCircleIcon size={24} color="#10B981" />
                  <Text className="text-lg font-semibold text-green-900 ml-3">
                    Submission Complete!
                  </Text>
                </View>
                <Text className="text-sm text-green-800 mb-4">
                  You've successfully completed all submission steps for {schema.countryName}. 
                  Don't forget to save any QR codes to your wallet for easy access at the airport.
                </Text>
                <View className="flex-row space-x-3">
                  <Button
                    title="Save QR Code"
                    onPress={() => {
                      // Navigate to QR capture/save screen
                      navigation.navigate('AddQR', { 
                        tripId, 
                        legId, 
                        countryCode: schema.countryCode 
                      });
                    }}
                    variant="primary"
                    size="medium"
                    fullWidth={false}
                  />
                  <Button
                    title="Back to Trip"
                    onPress={() => navigation.navigate('TripDetail', { tripId })}
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
  );
}
