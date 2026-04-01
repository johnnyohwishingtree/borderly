import { View, Text, ScrollView, TextInput } from 'react-native';
import { Lock } from 'lucide-react-native';
import { Button, Card, StatusBadge, Select, Toggle, ScreenContainer } from '@/components/ui';
import { useBugReport } from '@/hooks/useBugReport';

export default function BugReportScreen() {
  const { fields, diagnostics, submission, options, helpers } = useBugReport();
  const {
    severity, setSeverity, category, setCategory,
    title, setTitle, description, setDescription,
    stepsToReproduce, setStepsToReproduce,
  } = fields;
  const { includeDiagnostics, setIncludeDiagnostics, diagnosticInfo } = diagnostics;
  const { isSubmitting, handleSubmitBugReport } = submission;
  const { severityOptions, categoryOptions } = options;
  const { getSeverityStatus, getSeverityEmoji } = helpers;

  return (
    <ScreenContainer className="bg-surface-secondary">
    <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" className="flex-1">
      <View className="p-4 space-y-4">
        {/* Header */}
        <View className="mb-4">
          <Text className="text-2xl font-bold text-primary">Report a Bug</Text>
          <Text className="text-base text-secondary">Help us fix issues and improve the app</Text>
        </View>

        {/* Severity */}
        <Card>
          <View className="flex-row items-center mb-4">
            <Text className="text-lg font-semibold text-primary mr-3">Bug Severity</Text>
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

          <Text className="text-xs text-tertiary mt-2">
            Select the severity that best describes the impact of this bug
          </Text>
        </Card>

        {/* Category */}
        <Card>
          <Text className="text-lg font-semibold text-primary mb-4">Bug Category</Text>

          <Select
            label="Which area of the app is affected?"
            options={categoryOptions}
            value={category}
            onValueChange={setCategory}
          />
        </Card>

        {/* Title */}
        <Card>
          <Text className="text-lg font-semibold text-primary mb-4">Bug Title</Text>

          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Brief description of the bug (e.g., 'App crashes when scanning passport')"
            className="border border-border-default rounded-lg p-3 text-primary bg-surface"
            maxLength={100}
          />

          <Text className="text-xs text-tertiary mt-2">
            {title.length}/100 characters
          </Text>
        </Card>

        {/* Description */}
        <Card>
          <Text className="text-lg font-semibold text-primary mb-4">Bug Description</Text>

          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe what happened, what you expected to happen, and any error messages you saw..."
            multiline
            numberOfLines={6}
            className="border border-border-default rounded-lg p-3 text-primary bg-surface"
            style={{ minHeight: 120, textAlignVertical: 'top' }}
            maxLength={1000}
          />

          <Text className="text-xs text-tertiary mt-2">
            {description.length}/1000 characters
          </Text>
        </Card>

        {/* Steps to Reproduce */}
        <Card>
          <Text className="text-lg font-semibold text-primary mb-4">Steps to Reproduce (Optional)</Text>

          <TextInput
            value={stepsToReproduce}
            onChangeText={setStepsToReproduce}
            placeholder="1. Open the app&#10;2. Go to passport scan&#10;3. Point camera at passport&#10;4. App crashes"
            multiline
            numberOfLines={4}
            className="border border-border-default rounded-lg p-3 text-primary bg-surface"
            style={{ minHeight: 80, textAlignVertical: 'top' }}
            maxLength={500}
          />

          <Text className="text-xs text-tertiary mt-2">
            {stepsToReproduce.length}/500 characters • List specific steps to help us reproduce the issue
          </Text>
        </Card>

        {/* Diagnostic Information */}
        <Card>
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-lg font-semibold text-primary">Include Diagnostic Info</Text>
              <Text className="text-sm text-secondary">Help us debug faster with technical details</Text>
            </View>
            <Toggle
              value={includeDiagnostics}
              onValueChange={setIncludeDiagnostics}
            />
          </View>

          {includeDiagnostics && diagnosticInfo && (
            <View className="bg-surface-secondary p-4 rounded-lg">
              <Text className="text-sm font-medium text-primary mb-3">Diagnostic Information Preview</Text>
              <View className="space-y-2">
                <View className="flex-row justify-between">
                  <Text className="text-xs text-secondary">Platform:</Text>
                  <Text className="text-xs text-primary">{diagnosticInfo.platform} {diagnosticInfo.platformVersion}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-xs text-secondary">App Version:</Text>
                  <Text className="text-xs text-primary">{diagnosticInfo.appVersion}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-xs text-secondary">Trips Count:</Text>
                  <Text className="text-xs text-primary">{diagnosticInfo.deviceInfo.tripsCount}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-xs text-secondary">Profile Setup:</Text>
                  <Text className="text-xs text-primary">{diagnosticInfo.deviceInfo.hasProfile ? 'Yes' : 'No'}</Text>
                </View>
              </View>

              <Text className="text-xs text-tertiary mt-3">
                No personal or passport data is included
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

          <Text className="text-xs text-tertiary text-center mt-3">
            Thank you for helping us improve Borderly! We'll investigate this issue promptly.
          </Text>
        </View>

        {/* Bottom spacing */}
        <View className="h-8" />
      </View>
    </ScrollView>
    </ScreenContainer>
  );
}
