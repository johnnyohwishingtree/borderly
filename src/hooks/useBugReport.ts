import { useState, useEffect, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '@/stores/useAppStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { useTripStore } from '@/stores/useTripStore';
import type { SelectOption } from '@/components/ui/Select';

const severityOptions: SelectOption[] = [
  { label: 'Low - Minor inconvenience', value: 'low' },
  { label: 'Medium - Affects functionality', value: 'medium' },
  { label: 'High - Blocks important features', value: 'high' },
  { label: 'Critical - App crashes or data loss', value: 'critical' },
];

const categoryOptions: SelectOption[] = [
  { label: 'General App Issues', value: 'general' },
  { label: 'Passport Scanning', value: 'passport-scan' },
  { label: 'Form Generation', value: 'form-generation' },
  { label: 'Country Portals', value: 'country-portals' },
  { label: 'QR Code Wallet', value: 'qr-wallet' },
  { label: 'Data Storage', value: 'data-storage' },
  { label: 'Performance', value: 'performance' },
  { label: 'UI/UX Issues', value: 'ui-ux' },
];

export function useBugReport() {
  const navigation = useNavigation();
  const { preferences, theme } = useAppStore();
  const { profile } = useProfileStore();
  const { trips } = useTripStore();

  const [severity, setSeverity] = useState<string>('medium');
  const [category, setCategory] = useState<string>('general');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [stepsToReproduce, setStepsToReproduce] = useState<string>('');
  const [includeDiagnostics, setIncludeDiagnostics] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);

  const generateDiagnosticInfo = useCallback(() => {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      platformVersion: Platform.Version,
      appVersion: '1.0.0',
      language: preferences.language,
      theme,
      biometricEnabled: preferences.biometricEnabled,
      analyticsEnabled: preferences.analyticsEnabled,
      deviceInfo: {
        hasProfile: !!profile,
        tripsCount: trips.length,
        lastActivity: new Date().toISOString(),
      },
      memory: {
        // In a real app, you'd get actual memory usage
        estimated: '< 100MB',
      },
      features: {
        cameraAvailable: true, // Would check actual camera availability
        biometricsAvailable: true, // Would check actual biometrics
        keychainAvailable: true, // Would check keychain
      },
    };
    setDiagnosticInfo(diagnostics);
  }, [preferences, profile, trips, theme]);

  useEffect(() => {
    generateDiagnosticInfo();
  }, [generateDiagnosticInfo]);

  const handleSubmitBugReport = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Information', 'Please provide a bug title.');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Missing Information', 'Please describe the bug you encountered.');
      return;
    }

    setIsSubmitting(true);

    try {
      const bugReport = {
        id: `bug-${Date.now()}`,
        title: title.trim(),
        description: description.trim(),
        stepsToReproduce: stepsToReproduce.trim(),
        severity,
        category,
        timestamp: new Date().toISOString(),
        diagnostics: includeDiagnostics ? diagnosticInfo : null,
      };

      // In a real implementation, this would send the bug report to a service
      await new Promise(resolve => setTimeout(() => resolve(undefined), 1500));

      console.log('Bug report submitted:', bugReport);

      Alert.alert(
        'Bug Report Submitted',
        `Thank you for reporting this ${severity} severity issue. We'll investigate and work on a fix.`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setTitle('');
              setDescription('');
              setStepsToReproduce('');
              setSeverity('medium');
              setCategory('general');
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      console.error('Failed to submit bug report:', error);
      Alert.alert('Submission Failed', 'Failed to submit bug report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSeverityStatus = (sev: string) => {
    switch (sev) {
      case 'low': return 'info';
      case 'medium': return 'warning';
      case 'high': return 'error';
      case 'critical': return 'error';
      default: return 'neutral';
    }
  };

  const getSeverityEmoji = (sev: string) => {
    switch (sev) {
      case 'low': return '\u{1F7E2}';
      case 'medium': return '\u{1F7E1}';
      case 'high': return '\u{1F7E0}';
      case 'critical': return '\u{1F534}';
      default: return '\u26AA';
    }
  };

  return {
    // State
    severity,
    setSeverity,
    category,
    setCategory,
    title,
    setTitle,
    description,
    setDescription,
    stepsToReproduce,
    setStepsToReproduce,
    includeDiagnostics,
    setIncludeDiagnostics,
    isSubmitting,
    diagnosticInfo,

    // Constants
    severityOptions,
    categoryOptions,

    // Callbacks
    handleSubmitBugReport,

    // Helpers
    getSeverityStatus,
    getSeverityEmoji,
  };
}
