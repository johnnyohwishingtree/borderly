import { View, Text, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, Pencil, Zap } from 'lucide-react-native';

import { OnboardingStackParamList } from '../../app/navigation/types';
import { Button, Card, Input, ProgressBar, HelpHint } from '../../components/ui';
import { ErrorMessage, useErrorMessage } from '../../components/ui/ErrorMessage';
import { MRZScanner, PassportPreview } from '../../components/passport';
import { ContextualHelp, HelpContent } from '../../components/help';
import { useProfileStore } from '../../stores/useProfileStore';
import { type MRZParseResult } from '../../services/passport/mrzParser';
import { type TravelerProfile } from '../../types/profile';
import { detectDevicePerformance } from '../../utils/imageUtils';
import { handleStorageError, handleCameraError, errorHandler } from '../../services/error/errorHandler';
import { isStorageError } from '../../utils/errorHandling';

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
  const route = useRoute<RouteProp<OnboardingStackParamList, 'PassportScan'>>();
  const { saveProfile } = useProfileStore();
  
  const familyMode = route.params?.familyMode || false;
  const relationship = route.params?.relationship || 'self';
  const [mode, setMode] = useState<'method' | 'scanning' | 'preview' | 'manual'>('method');
  const [scanResult, setScanResult] = useState<MRZParseResult | null>(null);
  const [scannedProfile, setScannedProfile] = useState<Partial<TravelerProfile> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [devicePerformance, setDevicePerformance] = useState<'low' | 'medium' | 'high'>('medium');
  const [showPerformanceHint, setShowPerformanceHint] = useState(false);
  const { error: storageError, showError: showStorageError, clearError: clearStorageError } = useErrorMessage();
  const { error: scanError, showError: showScanError, clearError: clearScanError } = useErrorMessage();
  const [lastFailedOperation, setLastFailedOperation] = useState<{ type: 'save' | 'scan', data?: any } | null>(null);
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
        relationship: familyMode ? relationship as any : 'self',
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
      setLastFailedOperation(null); // Clear any failed operation
      
      if (familyMode) {
        // Navigate back to family management
        navigation.navigate('FamilyManagement' as any);
      } else {
        navigation.navigate('ConfirmProfile');
      }
    } catch (error) {
      // Store the failed operation for retry
      setLastFailedOperation({ type: 'save', data: profileData });

      // Classify the error — only treat actual storage errors as storage errors
      const err = error as Error;
      const handler = isStorageError(err) ? handleStorageError : errorHandler.handleError.bind(errorHandler);

      const result = await handler(err, {
        screen: 'PassportScan',
        action: 'saveProfile',
        timestamp: Date.now()
      }, {
        showUserFeedback: false, // We'll show our own UI
        enableRetry: true,
        onRecoverySuccess: () => {
          clearStorageError();
          setLastFailedOperation(null);
          if (familyMode) {
            navigation.navigate('FamilyManagement' as any);
          } else {
            navigation.navigate('ConfirmProfile');
          }
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
    // Store the failed operation for retry
    setLastFailedOperation({ type: 'scan' });
    
    const result = await handleCameraError(error, {
      screen: 'PassportScan',
      action: 'mrzScanning',
      timestamp: Date.now()
    }, {
      showUserFeedback: false, // We'll show our own UI
      enableRetry: true,
      onRecoverySuccess: () => {
        clearScanError();
        setLastFailedOperation(null);
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
          onRetry={async () => {
            clearStorageError();
            // Retry the last failed save operation
            if (lastFailedOperation?.type === 'save' && lastFailedOperation.data) {
              await saveProfileData(lastFailedOperation.data);
            }
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
            setLastFailedOperation(null);
            setMode('scanning'); // Retry scanning
          }}
          onDismiss={() => {
            clearScanError();
            setLastFailedOperation(null);
            setMode('manual'); // Fall back to manual
          }}
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
                  {devicePerformance === 'low' && '\n\n⚡ Optimized for your device performance'}
                </Text>
                
                <HelpHint
                  content="Look for the two lines of text at the bottom of your passport photo page. This is the MRZ that contains your passport information."
                  variant="info"
                  size="small"
                  className="mb-4"
                />
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
                  <Pencil size={28} color="#374151" />
                </View>
                <Text className="text-lg font-semibold text-gray-900 mb-2">
                  Manual Entry
                </Text>
                <Text className="text-sm text-gray-600 text-center mb-4">
                  Enter your passport information by hand if camera scanning isn't working
                </Text>
                
                <HelpHint
                  content="You can find this information on your passport photo page. Make sure to enter dates in YYYY-MM-DD format and country codes as 3 letters (e.g., USA, GBR, JPN)."
                  variant="tip"
                  size="small"
                  className="mb-4"
                />
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
