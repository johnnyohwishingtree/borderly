import { View, Text, ScrollView } from 'react-native';
import { Controller } from 'react-hook-form';
import { Camera, Pencil, Zap } from 'lucide-react-native';
import { Button, Card, Input, ProgressBar, HelpHint, SearchableSelect } from '../../components/ui';
import { ALL_COUNTRIES } from '../../constants/countries';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { MRZScanner, PassportPreview } from '../../components/passport';
import { ContextualHelp, HelpContent } from '../../components/help';
import { usePassportScan } from '../../hooks/usePassportScan';

export default function PassportScanScreen() {
  const {
    mode,
    scanResult,
    scannedProfile,
    isSubmitting,
    devicePerformance,
    showPerformanceHint,
    setShowPerformanceHint,
    storageError,
    scanError,
    familyMode,
    relationship,
    form,
    clearStorageError,
    saveProfileData,
    handleScanSuccess,
    handleScanError,
    handleScanCancel,
    handleManualEntry,
    handleStartScanning,
    handleBack,
    handleConfirmScanned,
    handleEditScanned,
    handleRescan,
    retrySave,
    retryScan,
    fallbackToManual,
  } = usePassportScan();

  const { control, handleSubmit, formState: { errors } } = form;

  if (mode === 'scanning') {
    return (
      <MRZScanner
        onScanSuccess={handleScanSuccess}
        onScanCancel={handleScanCancel}
        onManualEntry={handleManualEntry}
        onScanError={handleScanError}
        lowPowerMode={devicePerformance === 'low'}
      />
    );
  }

  if (mode === 'preview' && scannedProfile) {
    return (
      <PassportPreview
        profile={scannedProfile}
        {...(scanResult ? { scanResult } : {})}
        onConfirm={handleConfirmScanned}
        onEdit={handleEditScanned}
        onRescan={handleRescan}
        isLoading={isSubmitting}
      />
    );
  }

  return (
    <ScrollView className="flex-1 bg-gradient-to-b from-blue-50 to-white" keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
      <View className="px-6 py-8">
        <ProgressBar progress={50} className="mb-6" />

        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center flex-1">
              <Camera size={24} color="#111827" style={{ marginRight: 8 }} />
              <Text className="text-2xl font-bold text-gray-900">
                {familyMode ? 'Add Family Member' : 'Passport Information'}
              </Text>
            </View>
            <ContextualHelp
              content={HelpContent.passportScanning}
              variant="icon"
              size="medium"
            />
          </View>
          <Text className="text-base text-gray-600 mb-4">
            {familyMode
              ? `Scan the ${relationship === 'spouse' ? "spouse's" :
                           relationship === 'child' ? "child's" :
                           relationship === 'parent' ? "parent's" :
                           "family member's"} passport or enter information manually. All data is stored securely on your device.`
              : 'Scan your passport or enter information manually. All data is stored securely on your device.'
            }
          </Text>

          <HelpHint
            title="Scanning Tips"
            content="For best results, ensure good lighting and hold your passport flat. The camera will automatically detect the MRZ (Machine Readable Zone) at the bottom of your passport photo page."
            variant="tip"
            size="small"
            className="mb-4"
          />
        </View>

        {/* Error Messages */}
        <ErrorMessage
          error={storageError}
          variant="card"
          showRetry
          onRetry={retrySave}
          onDismiss={clearStorageError}
          className="mb-4"
        />

        <ErrorMessage
          error={scanError}
          variant="card"
          showRetry
          onRetry={retryScan}
          onDismiss={fallbackToManual}
          className="mb-4"
        />

        {/* Performance hint for low-end devices */}
        {showPerformanceHint && (
          <Card variant="elevated" className="mb-4 bg-orange-50 border border-orange-200">
            <View className="flex-row items-start space-x-3 p-4">
              <Zap size={20} color="#ea580c" />
              <View className="flex-1">
                <Text className="text-sm font-medium text-orange-800 mb-1">
                  Performance Optimization Enabled
                </Text>
                <Text className="text-xs text-orange-700">
                  Scanning has been optimized for your device. The process may take slightly longer for better accuracy.
                </Text>
                <Button
                  title="Dismiss"
                  onPress={() => setShowPerformanceHint(false)}
                  variant="outline"
                  size="small"
                  testID="dismiss-performance-hint-button"
                />
              </View>
            </View>
          </Card>
        )}

        {/* Method selection */}
        {mode === 'method' && (
          <>
            <Card variant="elevated" className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50">
              <View className="items-center py-8">
                <View className="w-32 h-32 border-4 border-dashed border-gray-300 rounded-lg mb-4 items-center justify-center">
                  <Camera size={40} color="#374151" />
                </View>
                <Text className="text-lg font-semibold text-gray-900 mb-2">
                  {devicePerformance === 'low' ? 'Optimized Passport Scan' : 'Quick Passport Scan'}
                </Text>
                <Text className="text-sm text-gray-600 text-center mb-4">
                  Automatically fill your information by scanning the MRZ (Machine Readable Zone) on your passport
                </Text>
                <Button
                  title="Start Camera Scan"
                  onPress={handleStartScanning}
                  variant="primary"
                  size="large"
                  testID="start-camera-scan-button"
                />
              </View>
            </Card>

            <View className="items-center py-4">
              <Button
                title="Or enter manually"
                onPress={handleManualEntry}
                variant="outline"
                size="medium"
                testID="enter-manually-button"
              />
            </View>
          </>
        )}

        {/* Manual entry section */}
        {mode === 'manual' && (
          <Card variant="elevated" className="bg-white shadow-lg">
            <View className="flex-row items-center mb-4">
              <Pencil size={20} color="#111827" style={{ marginRight: 8 }} />
              <Text className="text-lg font-semibold text-gray-900">
                Passport Information
              </Text>
            </View>

            <Controller
              control={control}
              name="passportNumber"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Passport Number"
                  placeholder="Enter passport number"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.passportNumber?.message}
                  autoCapitalize="characters"
                  required
                  testID="passport-number-input"
                />
              )}
            />

            <Controller
              control={control}
              name="surname"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Surname (Family Name)"
                  placeholder="Enter surname"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.surname?.message}
                  autoCapitalize="words"
                  required
                  testID="surname-input"
                />
              )}
            />

            <Controller
              control={control}
              name="givenNames"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Given Names"
                  placeholder="Enter given names"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.givenNames?.message}
                  autoCapitalize="words"
                  required
                  testID="given-names-input"
                />
              )}
            />

            <Controller
              control={control}
              name="nationality"
              render={({ field: { onChange, value } }) => (
                <View className="mb-4">
                  <SearchableSelect
                    label="Nationality"
                    options={ALL_COUNTRIES}
                    value={value}
                    onValueChange={onChange}
                    placeholder="Search nationality..."
                    error={errors.nationality?.message}
                    testID="nationality-input"
                    required
                  />
                </View>
              )}
            />

            <Controller
              control={control}
              name="dateOfBirth"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Date of Birth"
                  placeholder="Enter date"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.dateOfBirth?.message}
                  helperText="Format: YYYY-MM-DD"
                  required
                  testID="dob-input"
                />
              )}
            />

            <Controller
              control={control}
              name="gender"
              render={({ field: { onChange, value } }) => (
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    Gender <Text className="text-red-500">*</Text>
                  </Text>
                  <View className="flex-row space-x-4">
                    {[
                      { value: 'M', label: 'Male' },
                      { value: 'F', label: 'Female' },
                      { value: 'X', label: 'Other' },
                    ].map((option) => (
                      <Button
                        key={option.value}
                        title={option.label}
                        onPress={() => onChange(option.value)}
                        variant={value === option.value ? 'primary' : 'outline'}
                        size="small"
                        testID={`gender-${option.label}-button`}
                      />
                    ))}
                  </View>
                  {errors.gender && (
                    <Text className="text-sm text-red-500 mt-1">{errors.gender.message}</Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="passportExpiry"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Passport Expiry Date"
                  placeholder="Enter date"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.passportExpiry?.message}
                  helperText="Format: YYYY-MM-DD"
                  required
                  testID="passport-expiry-input"
                />
              )}
            />

            <Controller
              control={control}
              name="issuingCountry"
              render={({ field: { onChange, value } }) => (
                <View className="mb-4">
                  <SearchableSelect
                    label="Issuing Country"
                    options={ALL_COUNTRIES}
                    value={value}
                    onValueChange={onChange}
                    placeholder="Search issuing country..."
                    error={errors.issuingCountry?.message}
                    testID="issuing-country-input"
                    required
                  />
                </View>
              )}
            />
          </Card>
        )}

        <View className="mt-6 space-y-4">
          {mode === 'manual' && (
            <Button
              title="Continue"
              onPress={handleSubmit((data) => saveProfileData(data))}
              loading={isSubmitting}
              size="large"
              fullWidth
              testID="passport-continue-button"
            />
          )}

          <Button
            title="Back"
            onPress={handleBack}
            variant="outline"
            size="large"
            fullWidth
            testID="passport-back-button"
          />
        </View>
      </View>
    </ScrollView>
  );
}
