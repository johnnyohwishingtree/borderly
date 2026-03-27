import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { ClipboardPaste, Camera, AlertCircle } from 'lucide-react-native';
import { ScreenContainer, Button } from '@/components/ui';
import LoadingStates from '@/components/ui/LoadingStates';
import { BoardingPassScanner } from '@/components/boarding';
import { useImportTrip } from '@/hooks/useImportTrip';
import { IMPORT_TRIP_IDS } from './testIDs';

function TabButton({
  label,
  icon,
  active,
  onPress,
  testID,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      testID={testID}
      className={`flex-1 flex-row items-center justify-center py-3 min-h-[44px] ${
        active ? 'border-b-2 border-blue-600' : ''
      }`}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
    >
      {icon}
      <Text
        className={`ml-2 text-sm font-medium ${
          active ? 'text-blue-600' : 'text-gray-500 dark:text-gray-400'
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function ImportTripScreen() {
  const {
    mode,
    setMode,
    status,
    errorMessage,
    confirmationText,
    setConfirmationText,
    handleParseConfirmation,
    handleBoardingPassScanned,
    handleScanCancel,
    handleRetry,
  } = useImportTrip();

  if (status === 'parsing') {
    return (
      <LoadingStates
        state="loading"
        variant="spinner"
        size="medium"
        text="Processing your booking..."
        fullScreen={true}
      />
    );
  }

  if (mode === 'scan') {
    return (
      <BoardingPassScanner
        onScanSuccess={handleBoardingPassScanned}
        onScanCancel={handleScanCancel}
        onManualEntry={handleScanCancel}
      />
    );
  }

  return (
    <ScreenContainer className="bg-gray-50 dark:bg-gray-900">
      {/* Tab Bar */}
      <View className="flex-row border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <TabButton
          label="Paste confirmation"
          icon={<ClipboardPaste size={16} color="#2563eb" />}
          active={true}
          onPress={() => setMode('paste')}
          testID={IMPORT_TRIP_IDS.importTabPasteButton.id}
        />
        <TabButton
          label="Scan boarding pass"
          icon={<Camera size={16} color="#6b7280" />}
          active={false}
          onPress={() => setMode('scan')}
          testID={IMPORT_TRIP_IDS.importTabScanButton.id}
        />
      </View>

      {/* Paste Tab Content */}
      <ScrollView className="flex-1 p-4" keyboardDismissMode="on-drag">
        <Text className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Paste a booking confirmation email or text. Flight and hotel details
          will be extracted automatically.
        </Text>

        <TextInput
          value={confirmationText}
          onChangeText={setConfirmationText}
          placeholder="Paste your booking confirmation here..."
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={8}
          textAlignVertical="top"
          className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 text-base text-gray-900 dark:text-gray-100 mb-4 min-h-[160px] bg-white dark:bg-gray-800"
          testID={IMPORT_TRIP_IDS.importConfirmationField.id}
          accessibilityLabel="Booking confirmation text"
          accessibilityHint="Paste your booking email or confirmation text here"
        />

        {/* Error message */}
        {status === 'error' && (
          <View
            className="flex-row items-start bg-red-50 dark:bg-red-900/20 p-4 rounded-lg mb-4"
            accessibilityLiveRegion="polite"
            testID={IMPORT_TRIP_IDS.importErrorMessage.id}
          >
            <AlertCircle size={18} color="#DC2626" />
            <View className="flex-1 ml-2">
              <Text className="text-sm text-red-800 dark:text-red-300">
                {errorMessage}
              </Text>
              <TouchableOpacity
                onPress={handleRetry}
                className="mt-2 min-h-[44px] justify-center"
                testID={IMPORT_TRIP_IDS.importTryAgainButton.id}
                accessibilityRole="button"
                accessibilityLabel="Try again"
              >
                <Text className="text-sm font-medium text-red-700 dark:text-red-400">
                  Try again
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Button
          title="Import trip"
          onPress={handleParseConfirmation}
          variant="primary"
          fullWidth
          disabled={!confirmationText.trim()}
          testID={IMPORT_TRIP_IDS.importParseButton.id}
        />
      </ScrollView>
    </ScreenContainer>
  );
}
