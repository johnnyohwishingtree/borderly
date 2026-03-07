import { View, Text, ScrollView, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import { OnboardingStackParamList } from '../../app/navigation/types';
import { Button, Card, Input, ProgressBar } from '../../components/ui';
import { ErrorMessage, useErrorMessage } from '../../components/ui/ErrorMessage';
import { MRZScanner, PassportPreview } from '../../components/passport';
import { useProfileStore } from '../../stores/useProfileStore';
import { type MRZParseResult } from '../../services/passport/mrzParser';
import { type TravelerProfile } from '../../types/profile';
import { detectDevicePerformance } from '../../utils/imageUtils';
import { handleStorageError, handleValidationError, handleCameraError } from '../../services/error/errorHandler';

type PassportScanScreenNavigationProp = NativeStackNavigationProp<OnboardingStackParamList, 'PassportScan'>;

const passportSchema = z.object({
  passportNumber: z.string().min(1, 'Passport number is required').min(6, 'Invalid passport number'),
  surname: z.string().min(1, 'Surname is required'),
  givenNames: z.string().min(1, 'Given names are required'),
  nationality: z.string().min(3, 'Nationality is required').max(3, 'Use 3-letter country code'),
  dateOfBirth: z.string().min(1, 'Date of birth is required').regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format'),
  gender: z.enum(['M', 'F', 'X']),
  passportExpiry: z.string().min(1, 'Passport expiry date is required').regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format'),
  issuingCountry: z.string().min(3, 'Issuing country is required').max(3, 'Use 3-letter country code'),
});

type PassportFormData = z.infer<typeof passportSchema>;

export default function PassportScanScreen() {
  const navigation = useNavigation<PassportScanScreenNavigationProp>();
  const { saveProfile } = useProfileStore();
  const [mode, setMode] = useState<'method' | 'scanning' | 'preview' | 'manual'>('method');
  const [scanResult, setScanResult] = useState<MRZParseResult | null>(null);
  const [scannedProfile, setScannedProfile] = useState<Partial<TravelerProfile> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [devicePerformance, setDevicePerformance] = useState<'low' | 'medium' | 'high'>('medium');
  const [showPerformanceHint, setShowPerformanceHint] = useState(false);
  const { error: storageError, showError: showStorageError, clearError: clearStorageError } = useErrorMessage();
  const { error: scanError, showError: showScanError, clearError: clearScanError } = useErrorMessage();
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PassportFormData>({
    resolver: zodResolver(passportSchema),
    defaultValues: {
      gender: 'M',
    },
  });

  // Detect device performance on mount
  useEffect(() => {
    const { tier } = detectDevicePerformance();
    setDevicePerformance(tier);
    
    // Show hint for low-end devices
    if (tier === 'low') {
      setShowPerformanceHint(true);
    }
  }, []);

  const generateProfileId = () => {
    // Generate a secure UUID-like identifier using timestamp and multiple random sources
    const timestamp = Date.now();
    const randomPart1 = Math.random().toString(36).substring(2, 10);
    const randomPart2 = Math.random().toString(36).substring(2, 10);
    return `profile_${timestamp}_${randomPart1}_${randomPart2}`;
  };

  const saveProfileData = async (profileData: Partial<TravelerProfile>) => {
    setIsSubmitting(true);
    clearStorageError(); // Clear any previous storage errors
    
    try {
      // Ensure all required TravelerProfile fields are provided with defaults
      const completeProfile: TravelerProfile = {
        id: generateProfileId(),
        passportNumber: profileData.passportNumber || '',
        surname: profileData.surname || '',
        givenNames: profileData.givenNames || '',
        nationality: profileData.nationality || '',
        dateOfBirth: profileData.dateOfBirth || '',
        gender: profileData.gender || 'X',
        passportExpiry: profileData.passportExpiry || '',
        issuingCountry: profileData.issuingCountry || '',
        email: profileData.email || '',
        phoneNumber: profileData.phoneNumber || '',
        defaultDeclarations: {
          hasItemsToDeclar: false,
          carryingCurrency: false,
          carryingProhibitedItems: false,
          visitedFarm: false,
          hasCriminalRecord: false,
          carryingCommercialGoods: false,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveProfile(completeProfile);
      navigation.navigate('ConfirmProfile');
    } catch (error) {
      const result = await handleStorageError(error as Error, {
        screen: 'PassportScan',
        action: 'saveProfile',
        timestamp: Date.now()
      }, {
        showUserFeedback: false, // We'll show our own UI
        enableRetry: true,
        onRecoverySuccess: () => {
          clearStorageError();
          navigation.navigate('ConfirmProfile');
        }
      });
      
      if (!result.recovered && result.error) {
        showStorageError(result.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = async (data: PassportFormData) => {
    await saveProfileData(data);
  };

  const handleBack = () => {
    if (mode === 'method') {
      navigation.goBack();
    } else {
      setMode('method');
      setScanResult(null);
      setScannedProfile(null);
    }
  };

  // Camera scanning handlers
  const handleScanSuccess = (result: MRZParseResult) => {
    clearScanError(); // Clear any previous scan errors
    setScanResult(result);
    setScannedProfile(result.profile || null);
    setMode('preview');
  };

  const handleScanError = async (error: Error) => {
    const result = await handleCameraError(error, {
      screen: 'PassportScan',
      action: 'mrzScanning',
      timestamp: Date.now()
    }, {
      showUserFeedback: false, // We'll show our own UI
      enableRetry: true,
      onRecoverySuccess: () => {
        clearScanError();
        setMode('scanning'); // Retry scanning
      },
      fallbackAction: () => {
        setMode('manual'); // Fall back to manual entry
      }
    });
    
    if (!result.recovered && result.error) {
      showScanError(result.error);
    }
  };

  const handleScanCancel = () => {
    clearScanError();
    setMode('method');
  };

  const handleManualEntry = () => {
    setMode('manual');
  };

  const handleStartScanning = () => {
    setMode('scanning');
  };

  // Preview handlers
  const handleConfirmScanned = async () => {
    if (scannedProfile) {
      await saveProfileData(scannedProfile);
    }
  };

  const handleEditScanned = () => {
    // Pre-fill manual form with scanned data
    if (scannedProfile) {
      setValue('passportNumber', scannedProfile.passportNumber || '');
      setValue('surname', scannedProfile.surname || '');
      setValue('givenNames', scannedProfile.givenNames || '');
      setValue('nationality', scannedProfile.nationality || '');
      setValue('dateOfBirth', scannedProfile.dateOfBirth || '');
      setValue('gender', scannedProfile.gender || 'M');
      setValue('passportExpiry', scannedProfile.passportExpiry || '');
      setValue('issuingCountry', scannedProfile.issuingCountry || '');
    }
    setMode('manual');
  };

  const handleRescan = () => {
    setScanResult(null);
    setScannedProfile(null);
    setMode('scanning');
  };

  // Render different modes
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
    <ScrollView className="flex-1 bg-gradient-to-b from-blue-50 to-white">
      <View className="px-6 py-8">
        {/* Progress indicator */}
        <ProgressBar progress={50} className="mb-6" />
        
        <View className="mb-6">
          <View className="flex-row items-center mb-2">
            <MaterialIcons name="camera-alt" size={24} color="#111827" style={{ marginRight: 8 }} />
            <Text className="text-2xl font-bold text-gray-900">
              Passport Information
            </Text>
          </View>
          <Text className="text-base text-gray-600">
            Scan your passport or enter information manually. All data is stored securely on your device.
          </Text>
        </View>

        {/* Error Messages */}
        <ErrorMessage
          error={storageError}
          variant="card"
          showRetry
          onRetry={() => {
            clearStorageError();
            // Retry the last operation (would need to track this)
          }}
          onDismiss={clearStorageError}
          className="mb-4"
        />

        <ErrorMessage
          error={scanError}
          variant="card"
          showRetry
          onRetry={() => {
            clearScanError();
            setMode('scanning'); // Retry scanning
          }}
          onDismiss={() => {
            clearScanError();
            setMode('manual'); // Fall back to manual
          }}
          className="mb-4"
        />

        {/* Performance hint for low-end devices */}
        {showPerformanceHint && (
          <Card variant="elevated" className="mb-4 bg-orange-50 border border-orange-200">
            <View className="flex-row items-start space-x-3 p-4">
              <Text className="text-orange-600 text-lg">⚡</Text>
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
                  <Text className="text-4xl">📷</Text>
                </View>
                <Text className="text-lg font-semibold text-gray-900 mb-2">
                  {devicePerformance === 'low' ? 'Optimized Passport Scan' : 'Quick Passport Scan'}
                </Text>
                <Text className="text-sm text-gray-600 text-center mb-6">
                  Automatically fill your information by scanning the MRZ (Machine Readable Zone) on your passport
                  {devicePerformance === 'low' && '\n\n⚡ Optimized for your device performance'}
                </Text>
                <Button
                  title="Start Camera Scan"
                  onPress={handleStartScanning}
                  variant="primary"
                  size="large"
                />
              </View>
            </Card>

            <Card variant="elevated" className="mb-6 bg-white shadow-lg">
              <View className="items-center py-6">
                <View className="w-20 h-20 border-4 border-dashed border-gray-300 rounded-lg mb-4 items-center justify-center">
                  <Text className="text-2xl">✏️</Text>
                </View>
                <Text className="text-lg font-semibold text-gray-900 mb-2">
                  Manual Entry
                </Text>
                <Text className="text-sm text-gray-600 text-center mb-4">
                  Enter your passport information by hand if camera scanning isn't working
                </Text>
                <Button
                  title="Enter Manually"
                  onPress={handleManualEntry}
                  variant="outline"
                  size="medium"
                />
              </View>
            </Card>
          </>
        )}

        {/* Manual entry section */}
        {mode === 'manual' && (
          <Card variant="elevated" className="bg-white shadow-lg">
            <View className="flex-row items-center mb-4">
              <MaterialIcons name="edit" size={20} color="#111827" style={{ marginRight: 8 }} />
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
                />
              )}
            />

            <Controller
              control={control}
              name="nationality"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Nationality"
                  placeholder="e.g., USA, CAN, GBR"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.nationality?.message}
                  autoCapitalize="characters"
                  helperText="Use 3-letter country code"
                  maxLength={3}
                  required
                />
              )}
            />

            <Controller
              control={control}
              name="dateOfBirth"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Date of Birth"
                  placeholder="YYYY-MM-DD"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.dateOfBirth?.message}
                  helperText="Format: YYYY-MM-DD"
                  required
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
                  placeholder="YYYY-MM-DD"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.passportExpiry?.message}
                  helperText="Format: YYYY-MM-DD"
                  required
                />
              )}
            />

            <Controller
              control={control}
              name="issuingCountry"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Issuing Country"
                  placeholder="e.g., USA, CAN, GBR"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.issuingCountry?.message}
                  autoCapitalize="characters"
                  helperText="Use 3-letter country code"
                  maxLength={3}
                  required
                />
              )}
            />
          </Card>
        )}

        <View className="mt-6 space-y-4">
          {mode === 'manual' && (
            <Button
              title="Continue"
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
              size="large"
              fullWidth
            />
          )}

          <Button
            title="Back"
            onPress={handleBack}
            variant="outline"
            size="large"
            fullWidth
          />
        </View>
      </View>
    </ScrollView>
  );
}
