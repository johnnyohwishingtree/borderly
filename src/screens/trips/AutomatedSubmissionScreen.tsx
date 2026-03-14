/**
 * AutomatedSubmissionScreen - Full-screen automated submission interface
 *
 * Orchestrates the automated submission process using the SubmissionEngine
 * and provides a complete user experience with progress tracking and fallback.
 *
 * @deprecated Use PortalSubmissionScreen instead. This component will be removed in a future release.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, Alert, SafeAreaView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { 
  SubmissionEngine, 
  SubmissionSession, 
  SubmissionResult, 
  SubmissionStatus,
  AutomationStepResult
} from '@/services/submission/submissionEngine';
import { AutomatedSubmissionView } from '@/components/submission/AutomatedSubmissionView';
import { Button, LoadingSpinner } from '@/components/ui';

// Mock route types since AutomatedSubmission may not be in navigation yet
type AutomatedSubmissionScreenRouteProp = RouteProp<any, 'AutomatedSubmission'>;
type AutomatedSubmissionScreenNavigationProp = NativeStackNavigationProp<any, 'AutomatedSubmission'>;

interface AutomatedSubmissionScreenProps {}

/**
 * AutomatedSubmissionScreen Component
 */
export const AutomatedSubmissionScreen: React.FC<AutomatedSubmissionScreenProps> = () => {
  const navigation = useNavigation<AutomatedSubmissionScreenNavigationProp>();
  const route = useRoute<AutomatedSubmissionScreenRouteProp>();
  
  // Route parameters (with fallbacks for development)
  const { legId, filledForm } = (route.params || {}) as any;
  
  // Stores
  // const tripStore = useTripStore();
  
  // State
  const [submissionEngine] = useState(() => new SubmissionEngine({
    debug: {
      captureScreenshots: __DEV__,
      logJavaScript: __DEV__,
      saveSessionData: __DEV__
    }
  }));
  const [currentSession, setCurrentSession] = useState<SubmissionSession | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>('not_started');
  const [isInitializing, setIsInitializing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);

  // Get leg data (mock implementation) — memoized to keep useCallback deps stable
  const leg = useMemo(
    () => (legId ? { id: legId, destinationCountry: legId } as any : null),
    [legId]
  );
  
  /**
   * Initialize automated submission
   */
  const initializeSubmission = useCallback(async () => {
    if (!leg || !filledForm) {
      setErrorMessage('Missing required data for submission');
      return;
    }

    setIsInitializing(true);
    setErrorMessage(null);

    try {
      // Start automated submission
      const result = await submissionEngine.startSubmission(
        leg,
        filledForm,
        'automated'
      );
      
      setSubmissionResult(result);
      
      // Get the active session
      const session = submissionEngine.getActiveSession(result.sessionId);
      if (session) {
        setCurrentSession(session);
        setSubmissionStatus(session.status);
      }
      
    } catch (error) {
      setErrorMessage(`Failed to initialize submission: ${(error as Error).message}`);
      setSubmissionStatus('failed');
    } finally {
      setIsInitializing(false);
    }
  }, [leg, filledForm, submissionEngine]);

  /**
   * Handle submission status changes
   */
  const handleStatusChange = useCallback((status: SubmissionStatus) => {
    setSubmissionStatus(status);
    
    // Update leg form status in store (mock implementation)
    if (leg) {
      console.log(`Would update leg ${leg.id} status to:`, status);
    }
  }, [leg]);

  /**
   * Handle step completion
   */
  const handleStepComplete = useCallback((stepId: string, result: AutomationStepResult) => {
    setCurrentSession(prevSession => {
      if (!prevSession) {
        return null;
      }

      if (result.success) {
        return {
          ...prevSession,
          progress: {
            ...prevSession.progress,
            completedSteps: [...prevSession.progress.completedSteps, stepId],
          },
        };
      } else {
        return {
          ...prevSession,
          progress: {
            ...prevSession.progress,
            failedSteps: [...prevSession.progress.failedSteps, stepId],
          },
          errors: [
            ...prevSession.errors,
            {
              stepId,
              error: result.error || 'Unknown error',
              timestamp: new Date().toISOString(),
              retryable: true
            }
          ],
        };
      }
    });
  }, []);

  /**
   * Handle submission errors
   */
  const handleError = useCallback((error: string) => {
    setErrorMessage(error);
    setSubmissionStatus('failed');
  }, []);

  /**
   * Handle fallback to manual submission
   */
  const handleFallbackToManual = useCallback((reason: string) => {
    Alert.alert(
      'Switch to Manual Submission',
      `Automation encountered an issue: ${reason}\n\nWould you like to continue with the manual submission guide?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Continue Manually',
          onPress: () => {
            navigation.navigate('SubmissionGuide', { 
              legId, 
              filledForm,
              automationFailed: true,
              failureReason: reason
            });
          }
        }
      ]
    );
  }, [navigation, legId, filledForm]);

  /**
   * Handle successful submission completion
   */
  const handleSubmissionComplete = useCallback((result: { qrCode?: string; confirmationNumber?: string }) => {
    setSubmissionStatus('completed');
    
    Alert.alert(
      'Submission Successful!',
      'Your form has been submitted successfully. Your confirmation details have been saved.',
      [
        {
          text: 'View QR Code',
          onPress: () => {
            if (result.qrCode) {
              // Save QR code and navigate to QR wallet
              navigation.navigate('QRDetail', { 
                qrCode: result.qrCode,
                legId: legId
              });
            }
          }
        },
        {
          text: 'Done',
          style: 'default',
          onPress: () => navigation.goBack()
        }
      ]
    );
  }, [navigation, legId]);

  /**
   * Handle retry submission
   */
  const handleRetry = useCallback(() => {
    setErrorMessage(null);
    setSubmissionStatus('not_started');
    setCurrentSession(null);
    setSubmissionResult(null);
    initializeSubmission();
  }, [initializeSubmission]);

  /**
   * Handle cancel submission
   */
  const handleCancel = useCallback(() => {
    Alert.alert(
      'Cancel Submission',
      'Are you sure you want to cancel the automated submission?',
      [
        {
          text: 'Continue Submission',
          style: 'cancel'
        },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: () => {
            if (currentSession) {
              submissionEngine.cancelSubmission(currentSession.id);
            }
            navigation.goBack();
          }
        }
      ]
    );
  }, [currentSession, submissionEngine, navigation]);

  // Initialize submission on mount
  useEffect(() => {
    initializeSubmission();
  }, [initializeSubmission]);

  // Set up header with cancel button
  useEffect(() => {
    navigation.setOptions({
      title: 'Automated Submission',
      headerLeft: () => (
        <Button
          title="Cancel"
          variant="outline"
          onPress={handleCancel}
          size="small"
        />
      )
    });
  }, [navigation, handleCancel]);

  /**
   * Render initialization screen
   */
  const renderInitialization = () => (
    <View className="flex-1 justify-center items-center p-6 bg-gray-50">
      <LoadingSpinner size="large" color="#10B981" />
      <Text className="text-lg font-semibold text-gray-800 mt-4">
        Setting up automated submission...
      </Text>
      <Text className="text-sm text-gray-600 mt-2 text-center">
        We're preparing to automatically fill your {leg?.destinationCountry} form
      </Text>
    </View>
  );

  /**
   * Render error screen
   */
  const renderError = () => (
    <View className="flex-1 justify-center items-center p-6 bg-gray-50">
      <View className="bg-red-50 rounded-lg p-6 max-w-md w-full">
        <Text className="text-lg font-semibold text-red-800 mb-2">
          Submission Failed
        </Text>
        <Text className="text-sm text-red-600 mb-4">
          {errorMessage}
        </Text>
        
        <View className="space-y-3">
          <Button
            title="Try Again"
            onPress={handleRetry}
            variant="primary"
          />
          <Button
            title="Switch to Manual"
            onPress={() => handleFallbackToManual(errorMessage || 'Automation failed')}
            variant="secondary"
          />
        </View>
      </View>
    </View>
  );

  /**
   * Render success screen
   */
  const renderSuccess = () => (
    <View className="flex-1 justify-center items-center p-6 bg-gray-50">
      <View className="bg-green-50 rounded-lg p-6 max-w-md w-full">
        <Text className="text-lg font-semibold text-green-800 mb-2">
          Submission Complete!
        </Text>
        <Text className="text-sm text-green-600 mb-4">
          Your form has been successfully submitted to the government portal.
        </Text>
        
        {submissionResult && (
          <View className="mb-4">
            <Text className="text-xs text-green-700 font-medium mb-1">
              Submission Details:
            </Text>
            <Text className="text-xs text-green-600">
              Duration: {Math.round(submissionResult.duration / 1000)}s
            </Text>
            <Text className="text-xs text-green-600">
              Steps completed: {submissionResult.stepsCompleted}
            </Text>
            {submissionResult.confirmationNumber && (
              <Text className="text-xs text-green-600">
                Confirmation: {submissionResult.confirmationNumber}
              </Text>
            )}
          </View>
        )}
        
        <Button
          title="Done"
          onPress={() => navigation.goBack()}
          variant="primary"
        />
      </View>
    </View>
  );

  // Don't render if required data is missing
  if (!leg || !filledForm) {
    return renderError();
  }

  // Render different states
  if (isInitializing || submissionStatus === 'not_started') {
    return renderInitialization();
  }
  
  if (submissionStatus === 'failed' && errorMessage) {
    return renderError();
  }
  
  if (submissionStatus === 'completed') {
    return renderSuccess();
  }

  // Render automated submission interface
  if (currentSession) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <AutomatedSubmissionView
          session={currentSession}
          onStatusChange={handleStatusChange}
          onStepComplete={handleStepComplete}
          onError={handleError}
          onFallbackToManual={handleFallbackToManual}
          onSubmissionComplete={handleSubmissionComplete}
        />
      </SafeAreaView>
    );
  }

  // Fallback loading state
  return renderInitialization();
};

export default AutomatedSubmissionScreen;