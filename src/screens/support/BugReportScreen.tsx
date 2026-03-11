import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Alert, TextInput, Platform } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { Lock } from 'lucide-react-native';
import { Button, Card, StatusBadge, Select, SelectOption, Toggle } from '@/components/ui';
import { useAppStore } from '@/stores/useAppStore';
import { useProfileStore } from '@/stores/useProfileStore';
import { useTripStore } from '@/stores/useTripStore';

interface BugReportScreenProps {
  route?: RouteProp<any, any>;
}

export default function BugReportScreen({ route: _route }: BugReportScreenProps) {
  const navigation = useNavigation();
  const { preferences } = useAppStore();
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

  const generateDiagnosticInfo = useCallback(() => {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      platformVersion: Platform.Version,
      appVersion: '1.0.0',
      language: preferences.language,
      theme: preferences.theme,
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
  }, [preferences, profile, trips]);

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
      case 'low': return '🟢';
      case 'medium': return '🟡';
      case 'high': return '🟠';
      case 'critical': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-4 space-y-4">
        {/* Header */}
        <View className="mb-4">
          <Text className="text-2xl font-bold text-gray-900">Report a Bug</Text>
          <Text className="text-base text-gray-600">Help us fix issues and improve the app</Text>
        </View>

        {/* Severity */}
        <Card>
          <View className="flex-row items-center mb-4">
            <Text className="text-lg font-semibold text-gray-900 mr-3">Bug Severity</Text>
            <StatusBadge 
              status={getSeverityStatus(severity)} 
              size="small" 
              text={`${getSeverityEmoji(severity)} ${severity.charAt(0).toUpperCase() + severity.slice(1)}`} 
            />
          </View>
          
          <Select
            label="How severe is this issue?"
            options={severityOptions}
            value={severity}
            onValueChange={setSeverity}
          />
          
          <Text className="text-xs text-gray-500 mt-2">
            Select the severity that best describes the impact of this bug
          </Text>
        </Card>

        {/* Category */}
        <Card>
          <Text className="text-lg font-semibold text-gray-900 mb-4">Bug Category</Text>
          
          <Select
            label="Which area of the app is affected?"
            options={categoryOptions}
            value={category}
            onValueChange={setCategory}
          />
        </Card>

        {/* Title */}
        <Card>
          <Text className="text-lg font-semibold text-gray-900 mb-4">Bug Title</Text>
          
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Brief description of the bug (e.g., 'App crashes when scanning passport')"
            className="border border-gray-300 rounded-lg p-3 text-gray-900 bg-white"
            maxLength={100}
          />
          
          <Text className="text-xs text-gray-500 mt-2">
            {title.length}/100 characters
          </Text>
        </Card>

        {/* Description */}
        <Card>
          <Text className="text-lg font-semibold text-gray-900 mb-4">Bug Description</Text>
          
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe what happened, what you expected to happen, and any error messages you saw..."
            multiline
            numberOfLines={6}
            className="border border-gray-300 rounded-lg p-3 text-gray-900 bg-white"
            style={{ minHeight: 120, textAlignVertical: 'top' }}
            maxLength={1000}
          />
          
          <Text className="text-xs text-gray-500 mt-2">
            {description.length}/1000 characters
          </Text>
        </Card>

        {/* Steps to Reproduce */}
        <Card>
          <Text className="text-lg font-semibold text-gray-900 mb-4">Steps to Reproduce (Optional)</Text>
          
          <TextInput
            value={stepsToReproduce}
            onChangeText={setStepsToReproduce}
            placeholder="1. Open the app&#10;2. Go to passport scan&#10;3. Point camera at passport&#10;4. App crashes"
            multiline
            numberOfLines={4}
            className="border border-gray-300 rounded-lg p-3 text-gray-900 bg-white"
            style={{ minHeight: 80, textAlignVertical: 'top' }}
            maxLength={500}
          />
          
          <Text className="text-xs text-gray-500 mt-2">
            {stepsToReproduce.length}/500 characters • List specific steps to help us reproduce the issue
          </Text>
        </Card>

        {/* Diagnostic Information */}
        <Card>
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-lg font-semibold text-gray-900">Include Diagnostic Info</Text>
              <Text className="text-sm text-gray-600">Help us debug faster with technical details</Text>
            </View>
            <Toggle
              value={includeDiagnostics}
              onValueChange={setIncludeDiagnostics}
            />
          </View>

          {includeDiagnostics && diagnosticInfo && (
            <View className="bg-gray-50 p-4 rounded-lg">
              <Text className="text-sm font-medium text-gray-900 mb-3">📊 Diagnostic Information Preview</Text>
              <View className="space-y-2">
                <View className="flex-row justify-between">
                  <Text className="text-xs text-gray-600">Platform:</Text>
                  <Text className="text-xs text-gray-900">{diagnosticInfo.platform} {diagnosticInfo.platformVersion}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-xs text-gray-600">App Version:</Text>
                  <Text className="text-xs text-gray-900">{diagnosticInfo.appVersion}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-xs text-gray-600">Trips Count:</Text>
                  <Text className="text-xs text-gray-900">{diagnosticInfo.deviceInfo.tripsCount}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-xs text-gray-600">Profile Setup:</Text>
                  <Text className="text-xs text-gray-900">{diagnosticInfo.deviceInfo.hasProfile ? 'Yes' : 'No'}</Text>
                </View>
              </View>
              
              <Text className="text-xs text-gray-500 mt-3">
                ℹ️ No personal or passport data is included
              </Text>
            </View>
          )}
        </Card>

        {/* Privacy Notice */}
        <Card>
          <View className="bg-orange-50 p-4 rounded-lg">
            <View className="flex-row items-center mb-2">
              <Lock size={20} color="#7c2d12" />
              <Text className="text-base font-semibold text-orange-900 ml-2">Privacy & Security</Text>
            </View>
            <Text className="text-sm text-orange-800 mb-2">
              Bug reports help us fix issues while protecting your privacy.
            </Text>
            <Text className="text-xs text-orange-700">
              • No passport or personal data is included
              • Only technical info needed for debugging
              • Reports are used solely for bug fixing
            </Text>
          </View>
        </Card>

        {/* Submit Button */}
        <View className="pt-4">
          <Button
            title={isSubmitting ? "Submitting Report..." : "Submit Bug Report"}
            onPress={handleSubmitBugReport}
            disabled={isSubmitting || !title.trim() || !description.trim()}
            loading={isSubmitting}
            fullWidth
          />
          
          <Text className="text-xs text-gray-500 text-center mt-3">
            Thank you for helping us improve Borderly! We'll investigate this issue promptly.
          </Text>
        </View>

        {/* Bottom spacing */}
        <View className="h-8" />
      </View>
    </ScrollView>
  );
}