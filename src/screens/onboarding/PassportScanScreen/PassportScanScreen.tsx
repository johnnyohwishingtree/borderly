import { View, Text, ScrollView, Pressable, Alert, NativeModules } from 'react-native';
import { Controller } from 'react-hook-form';
import { Camera, Pencil, Check } from 'lucide-react-native';
import { useTheme } from '@/utils/theme';
import { Button, Input, HelpHint, SearchableSelect, ProgressIndicator, DatePickerField, ScreenContainer } from '@/components/ui';
import { ALL_COUNTRIES } from '@/constants/countries';
import { ErrorMessage } from '@/components/ui/ErrorMessage';
import { MRZScanner, PassportPreview } from '@/components/passport';
import { ContextualHelp, HelpContent } from '@/components/help';
import { usePassportScan } from '@/hooks/usePassportScan';
import { selectImageFromLibrary } from '@/services/imagePickerService';
import { parseMRZ } from '@/services/passport/mrzScanner/mrzParser';
import { PASSPORT_SCAN_IDS } from './testIDs';
import { getTodayISO } from '@/utils/dateUtils';

export default function PassportScanScreen() {
  const { scan, profile, form, ui, navigation, family, familyLoop } = usePassportScan();

  const { colors } = useTheme();
  const { control, handleSubmit, formState: { errors } } = form;

  // Add Another Traveler prompt
  if (scan.mode === 'add_another') {
    const lastAdded = familyLoop.addedProfiles[familyLoop.addedProfiles.length - 1];
    return (
      <ScreenContainer className="bg-surface">
        <View className="flex-1 justify-center items-center px-6">
          <View className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full items-center justify-center mb-6">
            <Check size={40} color="#16a34a" />
          </View>
          <Text className="text-2xl font-bold text-primary text-center mb-2">
            {lastAdded ? `${lastAdded.givenNames} ${lastAdded.surname}` : 'Profile'} Added
          </Text>
          <Text className="text-base text-secondary text-center mb-2">
            {familyLoop.addedProfiles.length} {familyLoop.addedProfiles.length === 1 ? 'traveler' : 'travelers'} registered
          </Text>
          <Text className="text-sm text-tertiary text-center mb-8">
            Scan another passport to add a family member, or continue to the app.
          </Text>
          <View className="w-full space-y-3">
            <Button
              title="Add Another Traveler"
              onPress={familyLoop.handleAddAnother}
              variant="primary"
              size="large"
              fullWidth
            />
            <Button
              title="Done"
              onPress={familyLoop.handleDoneAddingProfiles}
              variant="secondary"
              size="large"
              fullWidth
            />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  // Family Summary — shown after Done when 2+ profiles
  if (scan.mode === 'family_summary') {
    return (
      <ScreenContainer className="bg-surface">
        <ScrollView className="flex-1">
          <View className="px-6 py-8">
            <Text className="text-2xl font-bold text-primary text-center mb-2">
              Your Travel Group
            </Text>
            <Text className="text-base text-secondary text-center mb-6">
              Tap a profile to set as primary. The primary profile auto-fills forms by default.
            </Text>

            <View className="space-y-3">
              {familyLoop.addedProfiles.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => familyLoop.handleChangePrimary(p.id)}
                  className={`p-4 rounded-xl border-2 ${
                    p.isPrimary
                      ? 'border-green-500 bg-green-50 dark:bg-green-950'
                      : 'border-border-default bg-surface'
                  }`}
                  accessibilityRole="button"
                  accessibilityLabel={`${p.givenNames} ${p.surname}${p.isPrimary ? ', primary profile' : ''}`}
                >
                  <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-lg font-semibold text-primary">
                        {p.givenNames} {p.surname}
                      </Text>
                      {p.isPrimary && (
                        <Text className="text-sm text-green-600 dark:text-green-400 font-medium">
                          Primary Profile
                        </Text>
                      )}
                    </View>
                    {p.isPrimary && <Check size={24} color="#16a34a" />}
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>

        <View className="bg-surface border-t border-border-default px-6 py-4 pb-8">
          <Button
            title="Continue"
            onPress={familyLoop.handleFamilySummaryContinue}
            variant="primary"
            size="large"
            fullWidth
          />
        </View>
      </ScreenContainer>
    );
  }

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
                      {
                        text: 'Import from Photo',
                        onPress: async () => {
                          const result = await selectImageFromLibrary();
                          if (!result.success || !result.imageUri) return;

                          try {
                            const { ImageBarcodeScanner } = NativeModules;
                            if (!ImageBarcodeScanner) {
                              Alert.alert('Error', 'Barcode scanning not available.');
                              scan.handleManualEntry();
                              return;
                            }

                            const barcodes = await ImageBarcodeScanner.scanBarcodesInImage(result.imageUri);
                            if (!barcodes || barcodes.length === 0) {
                              Alert.alert('No Data Found', 'Could not read passport data from this photo. Please try a clearer image or enter manually.');
                              scan.handleManualEntry();
                              return;
                            }

                            // QR payload may contain MRZ lines separated by newline
                            const payload = barcodes[0].value;
                            const lines = payload.split('\n').filter((l: string) => l.length >= 30);

                            if (lines.length >= 2) {
                              const mrzResult = parseMRZ(lines[0], lines[1]);
                              if (mrzResult && !('error' in mrzResult)) {
                                scan.handleSuccess(mrzResult);
                                return;
                              }
                            }

                            Alert.alert('Could Not Parse', 'The photo was read but passport data could not be extracted. Please enter manually.');
                            scan.handleManualEntry();
                          } catch (err) {
                            Alert.alert('Import Failed', err instanceof Error ? err.message : 'Unknown error');
                            scan.handleManualEntry();
                          }
                        },
                      },
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
