/**
 * AutomatedSubmissionView - WebView component for automated government portal submissions
 *
 * Provides a secure WebView interface for automated form filling with
 * progress tracking, error handling, and fallback to manual submission.
 *
 * @deprecated Use PortalSubmissionScreen instead. This component will be removed in a future release.
 */

import React from 'react';
import { View, Text } from 'react-native';
import { 
  SubmissionSession, 
  SubmissionStatus,
  AutomationStepResult
} from '@/types/submission';
import { Button } from '@/components/ui';

interface AutomatedSubmissionViewProps {
  session: SubmissionSession;
  onStatusChange: (status: SubmissionStatus) => void;
  onStepComplete: (stepId: string, result: AutomationStepResult) => void;
  onError: (error: string) => void;
  onFallbackToManual: (reason: string) => void;
  onSubmissionComplete: (result: { qrCode?: string; confirmationNumber?: string }) => void;
}

/**
 * AutomatedSubmissionView Component
 * 
 * Note: This is a stub implementation. The full WebView integration
 * will be completed when react-native-webview dependency is added.
 */
export const AutomatedSubmissionView: React.FC<AutomatedSubmissionViewProps> = ({
  session,
  onFallbackToManual
}) => {
  const handleManualFallback = () => {
    onFallbackToManual('WebView not yet implemented - falling back to manual submission');
  };

  return (
    <View className="flex-1 justify-center items-center p-6 bg-gray-50">
      <View className="bg-blue-50 rounded-lg p-6 max-w-md w-full">
        <Text className="text-lg font-semibold text-blue-800 mb-2">
          Automated Submission
        </Text>
        <Text className="text-sm text-blue-600 mb-4">
          WebView integration for {session.countryCode} portal automation is being prepared.
        </Text>
        <Text className="text-xs text-blue-500 mb-4">
          Session ID: {session.id}
        </Text>
        
        <Button
          title="Continue with Manual Submission"
          onPress={handleManualFallback}
          variant="primary"
        />
      </View>
    </View>
  );
};

/**
 * Utility functions
 */

/**
 * Format error message for display
 */
export const formatErrorMessage = (error: string): string => {
  if (error.length > 100) {
    return error.substring(0, 97) + '...';
  }
  return error;
};

/**
 * Get status color for UI
 */
export const getStatusColor = (status: SubmissionStatus): string => {
  const colors: Record<SubmissionStatus, string> = {
    'not_started': '#6B7280',
    'initializing': '#F59E0B',
    'in_progress': '#10B981',
    'completed': '#059669',
    'failed': '#DC2626',
    'manual_fallback': '#F59E0B'
  };
  
  return colors[status] || colors.not_started;
};

/**
 * Get status text for display
 */
export const getStatusText = (status: SubmissionStatus): string => {
  const texts: Record<SubmissionStatus, string> = {
    'not_started': 'Not Started',
    'initializing': 'Initializing',
    'in_progress': 'In Progress',
    'completed': 'Completed',
    'failed': 'Failed',
    'manual_fallback': 'Manual Required'
  };
  
  return texts[status] || 'Unknown';
};

export default AutomatedSubmissionView;