import { View, Text, ScrollView, Alert } from 'react-native';
import { Controller } from 'react-hook-form';
import { Camera, Pencil } from 'lucide-react-native';
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
    <ScreenContainer className="bg-surface">
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
              <Text className="text-2xl font-bold text-primary">
                {family.mode ? 'Add Family Member' : 'Passport Information'}
              </Text>
            </View>
            <ContextualHelp
              content={HelpContent.passportScanning}
              variant="icon"
              size="medium"
            />
          </View>
          <Text className="text-base text-secondary mb-4">
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

        {/* Method selection */}
        {scan.mode === 'method' && (
          <>
            <View className="items-center py-8 mb-4 border border-border-default rounded-xl">
              <View className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-full mb-4 items-center justify-center">
                <Camera size={36} color="#2563eb" />
              </View>
              <Text className="text-lg font-semibold text-primary mb-2">
                Quick Passport Scan
              </Text>
              <Text className="text-sm text-secondary text-center mb-6 px-6">
                Point your camera at the bottom of your passport photo page
              </Text>
              <Button
                title="Scan Passport"
                onPress={() => {
                  Alert.alert(
                    'Scan Passport',
                    'How would you like to scan?',
                    [
                      { text: 'Camera Scan', onPress: scan.handleStart },
                      { text: 'Import from Photo', onPress: scan.handleManualEntry },
                      { text: 'Cancel', style: 'cancel' },
                    ],
                  );
                }}
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

          </>
        )}

        {/* Manual entry section */}
        {scan.mode === 'manual' && (
          <View className="border border-border-default rounded-xl p-4">
            <View className="flex-row items-center mb-2">
              <Pencil size={20} color={colors.textPrimary} style={{ marginRight: 8 }} />
              <Text className="text-lg font-semibold text-primary">
                Passport Details
              </Text>
            </View>
            <Text className="text-sm text-tertiary mb-4">All fields are required</Text>

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
                  <Text className="text-sm font-medium text-secondary mb-2">
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
                    <Text className="text-sm text-error mt-1">{errors.gender.message}</Text>
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
    <View className="bg-surface border-t border-border-default px-6 py-4 pb-8">
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
