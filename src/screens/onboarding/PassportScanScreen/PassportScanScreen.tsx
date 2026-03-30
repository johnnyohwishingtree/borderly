import { View, Text, ScrollView } from 'react-native';
import { Controller } from 'react-hook-form';
import { Camera, Pencil, Zap } from 'lucide-react-native';
import { useTheme } from '@/utils/theme';
import { Button, Input, HelpHint, SearchableSelect, ProgressIndicator, DatePickerField, ScreenContainer } from '@/components/ui';
import { ALL_COUNTRIES } from '@/constants/countries';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { MRZScanner, PassportPreview } from '@/components/passport';
import { ContextualHelp, HelpContent } from '@/components/help';
import { usePassportScan } from '@/hooks/usePassportScan';
import { PASSPORT_SCAN_IDS } from './testIDs';
import { getTodayISO } from '@/utils/dateUtils';

export default function PassportScanScreen() {
  const { scan, profile, form, ui, navigation, family } = usePassportScan();

  const { colors } = useTheme();
  const { control, handleSubmit, formState: { errors } } = form;

  if (scan.mode === 'scanning') {
    return (
      <MRZScanner
        onScanSuccess={scan.handleSuccess}
        onScanCancel={scan.handleCancel}
        onManualEntry={scan.handleManualEntry}
        onScanError={scan.handleError}
        lowPowerMode={ui.devicePerformance === 'low'}
      />
    );
  }

  if (scan.mode === 'preview' && profile.scanned) {
    return (
      <PassportPreview
        profile={profile.scanned}
        {...(scan.result ? { scanResult: scan.result } : {})}
        onConfirm={profile.confirm}
        onEdit={profile.edit}
        onRescan={profile.rescan}
        isLoading={profile.isSubmitting}
      />
    );
  }

  const currentStep = scan.mode === 'method' ? 0 : 1;
  const totalSteps = 3;

  return (
    <ScreenContainer className="bg-white dark:bg-gray-900">
    <ScrollView className="flex-1" keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
      <View className="px-6 py-8">
        <ProgressIndicator
          currentStep={currentStep}
          totalSteps={totalSteps}
          variant="dots"
          size="medium"
          className="mb-6"
        />

        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center flex-1">
              <Camera size={24} color={colors.textPrimary} style={{ marginRight: 8 }} />
              <Text className="text-2xl font-bold text-gray-900 dark:text-white">
                {family.mode ? 'Add Family Member' : 'Passport Information'}
              </Text>
            </View>
            <ContextualHelp
              content={HelpContent.passportScanning}
              variant="icon"
              size="medium"
            />
          </View>
          <Text className="text-base text-gray-600 dark:text-gray-400 mb-4">
            {family.mode
              ? `Scan the ${family.relationship === 'spouse' ? "spouse's" :
                           family.relationship === 'child' ? "child's" :
                           family.relationship === 'parent' ? "parent's" :
                           "family member's"} passport or enter information manually. All data is stored securely on your device.`
              : 'Scan your passport or enter information manually. All data is stored securely on your device.'
            }
          </Text>

          {scan.mode !== 'manual' && (
            <HelpHint
              title="Scanning Tips"
              content="For best results, ensure good lighting and hold your passport flat. The camera will automatically detect the MRZ (Machine Readable Zone) at the bottom of your passport photo page."
              variant="tip"
              size="small"
              className="mb-4"
            />
          )}
        </View>

        {/* Error Messages */}
        <ErrorMessage
          error={ui.storageError}
          variant="card"
          showRetry
          onRetry={profile.retrySave}
          onDismiss={ui.clearStorageError}
          className="mb-4"
        />

        <ErrorMessage
          error={scan.error}
          variant="card"
          showRetry
          onRetry={scan.retry}
          onDismiss={scan.fallbackToManual}
          className="mb-4"
        />

        {/* Performance hint for low-end devices */}
        {ui.showPerformanceHint && (
          <View className="mb-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
            <View className="flex-row items-start gap-3">
              <Zap size={20} color="#ea580c" />
              <View className="flex-1">
                <Text className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-1">
                  Performance Optimization Enabled
                </Text>
                <Text className="text-xs text-orange-700 dark:text-orange-300">
                  Scanning has been optimized for your device. The process may take slightly longer for better accuracy.
                </Text>
                <Button
                  title="Dismiss"
                  onPress={() => ui.setShowPerformanceHint(false)}
                  variant="secondary"
                  size="small"
                  testID={PASSPORT_SCAN_IDS.dismissPerformanceHintButton.id}
                />
              </View>
            </View>
          </View>
        )}

        {/* Method selection */}
        {scan.mode === 'method' && (
          <>
            <View className="items-center py-8 mb-4 border border-gray-200 dark:border-gray-700 rounded-xl">
              <View className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-full mb-4 items-center justify-center">
                <Camera size={36} color="#2563eb" />
              </View>
              <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Quick Passport Scan
              </Text>
              <Text className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6 px-6">
                Point your camera at the bottom of your passport photo page
              </Text>
              <Button
                title="Start Camera Scan"
                onPress={scan.handleStart}
                variant="primary"
                size="large"
                testID={PASSPORT_SCAN_IDS.startCameraScanButton.id}
              />
            </View>

            <View className="items-center py-4">
              <Button
                title="Or enter manually"
                onPress={scan.handleManualEntry}
                variant="secondary"
                size="medium"
                testID={PASSPORT_SCAN_IDS.enterManuallyButton.id}
              />
            </View>

            {__DEV__ && (
              <View className="items-center py-2 mt-2 border-t border-gray-200 dark:border-gray-700">
                <Text className="text-xs text-gray-400 dark:text-gray-600 mb-2">Development Only</Text>
                <View className="flex-row gap-2">
                  <Button
                    title="Demo: Adult"
                    onPress={() => scan.handleDemo('adult')}
                    variant="secondary"
                    size="small"
                    testID={PASSPORT_SCAN_IDS.demoScanAdultButton.id}
                  />
                  <Button
                    title="Demo: Spouse"
                    onPress={() => scan.handleDemo('spouse')}
                    variant="secondary"
                    size="small"
                    testID={PASSPORT_SCAN_IDS.demoScanSpouseButton.id}
                  />
                  <Button
                    title="Demo: Child"
                    onPress={() => scan.handleDemo('child')}
                    variant="secondary"
                    size="small"
                    testID={PASSPORT_SCAN_IDS.demoScanChildButton.id}
                  />
                </View>
              </View>
            )}
          </>
        )}

        {/* Manual entry section */}
        {scan.mode === 'manual' && (
          <View className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <View className="flex-row items-center mb-2">
              <Pencil size={20} color={colors.textPrimary} style={{ marginRight: 8 }} />
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                Passport Details
              </Text>
            </View>
            <Text className="text-sm text-gray-500 dark:text-gray-500 mb-4">All fields are required</Text>

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
                  testID={PASSPORT_SCAN_IDS.passportNumberField.id}
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
                  testID={PASSPORT_SCAN_IDS.surnameField.id}
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
                  testID={PASSPORT_SCAN_IDS.givenNamesField.id}
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
                    testID={PASSPORT_SCAN_IDS.nationalityField.id}
                  />
                </View>
              )}
            />

            <Controller
              control={control}
              name="dateOfBirth"
              render={({ field: { onChange, value } }) => (
                <DatePickerField
                  label="Date of Birth"
                  value={value}
                  onChange={onChange}
                  error={errors.dateOfBirth?.message}
                  maxDate={getTodayISO()}
                  testID={PASSPORT_SCAN_IDS.dobField.id}
                  placeholder="Select date of birth"
                />
              )}
            />

            <Controller
              control={control}
              name="gender"
              render={({ field: { onChange, value } }) => (
                <View className="mb-4">
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Gender
                  </Text>
                  <View className="flex-row flex-wrap gap-3">
                    {[
                      { value: 'M', label: 'Male' },
                      { value: 'F', label: 'Female' },
                      { value: 'X', label: 'Other' },
                    ].map((option) => (
                      <Button
                        key={option.value}
                        title={option.label}
                        onPress={() => onChange(option.value)}
                        variant={value === option.value ? 'primary' : 'secondary'}
                        size="small"
                        testID={PASSPORT_SCAN_IDS.genderButton.dynamic.replace('{label}', option.label)}
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
              render={({ field: { onChange, value } }) => (
                <DatePickerField
                  label="Passport Expiry Date"
                  value={value}
                  onChange={onChange}
                  error={errors.passportExpiry?.message}
                  minDate={getTodayISO()}
                  testID={PASSPORT_SCAN_IDS.passportExpiryField.id}
                  placeholder="Select expiry date"
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
                    testID={PASSPORT_SCAN_IDS.issuingCountryField.id}
                  />
                </View>
              )}
            />
          </View>
        )}

      </View>
    </ScrollView>

    {/* Fixed footer CTA */}
    <View className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4 pb-8">
      {scan.mode === 'manual' && (
        <Button
          title="Continue"
          onPress={handleSubmit((data) => profile.save(data))}
          loading={profile.isSubmitting}
          size="large"
          fullWidth
          testID={PASSPORT_SCAN_IDS.passportContinueButton.id}
        />
      )}
      <View className={scan.mode === 'manual' ? 'mt-3' : ''}>
        <Button
          title="Back"
          onPress={navigation.handleBack}
          variant="secondary"
          size="large"
          fullWidth
          testID={PASSPORT_SCAN_IDS.passportBackButton.id}
        />
      </View>
    </View>
    </ScreenContainer>
  );
}
