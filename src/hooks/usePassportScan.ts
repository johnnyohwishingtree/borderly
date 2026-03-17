import { useState, useEffect, useCallback } from 'react';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { OnboardingStackParamList } from '../app/navigation/types';
import { useProfileStore } from '../stores/useProfileStore';
import { type MRZParseResult } from '../services/passport/mrzParser';
import { type TravelerProfile } from '../types/profile';
import { detectDevicePerformance } from '../utils/imageUtils';
import { handleStorageError, handleCameraError, errorHandler } from '../services/error/errorHandler';
import { isStorageError } from '../services/error/errorHandling';
import type { AppError } from '../services/error/errorHandling';

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

/**
 * Encapsulates passport scanning and profile creation logic:
 * - Mode management (method selection, scanning, preview, manual)
 * - MRZ scan result handling
 * - Profile saving with error recovery
 * - Device performance detection
 */
export function usePassportScan() {
  const navigation = useNavigation<NativeStackNavigationProp<OnboardingStackParamList, 'PassportScan'>>();
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
  const [storageError, setStorageError] = useState<AppError | string | null>(null);
  const [scanError, setScanError] = useState<AppError | string | null>(null);
  const [lastFailedOperation, setLastFailedOperation] = useState<{ type: 'save' | 'scan', data?: Partial<TravelerProfile> } | null>(null);

  const form = useForm<PassportFormData>({
    resolver: zodResolver(passportSchema),
    defaultValues: { gender: 'M' },
  });

  useEffect(() => {
    const { tier } = detectDevicePerformance();
    setDevicePerformance(tier);
    if (tier === 'low') {
      setShowPerformanceHint(true);
    }
  }, []);

  const generateProfileId = useCallback(() => {
    const timestamp = Date.now();
    const randomPart1 = Math.random().toString(36).substring(2, 10);
    const randomPart2 = Math.random().toString(36).substring(2, 10);
    return `profile_${timestamp}_${randomPart1}_${randomPart2}`;
  }, []);

  const saveProfileData = useCallback(async (profileData: Partial<TravelerProfile>) => {
    setIsSubmitting(true);
    setStorageError(null);

    try {
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
        relationship: familyMode ? (relationship as 'self' | 'spouse' | 'child' | 'parent' | 'other') : 'self',
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
      setLastFailedOperation(null);

      if (familyMode) {
        navigation.navigate('FamilyManagement' as any);
      } else {
        navigation.navigate('ConfirmProfile');
      }
    } catch (error) {
      setLastFailedOperation({ type: 'save', data: profileData });

      const err = error as Error;
      const errorContext = {
        screen: 'PassportScan',
        action: 'saveProfile',
        timestamp: Date.now()
      };
      const recoveryOptions = {
        showUserFeedback: false,
        enableRetry: true,
        onRecoverySuccess: () => {
          setStorageError(null);
          setLastFailedOperation(null);
          if (familyMode) {
            navigation.navigate('FamilyManagement' as any);
          } else {
            navigation.navigate('ConfirmProfile');
          }
        }
      };

      const result = isStorageError(err)
        ? await handleStorageError(err, errorContext, recoveryOptions)
        : await errorHandler.handleError(err, errorContext, recoveryOptions);

      if (!result.recovered && result.error) {
        setStorageError(result.error);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [generateProfileId, saveProfile, familyMode, relationship, navigation]);

  const handleScanSuccess = useCallback((result: MRZParseResult) => {
    setScanError(null);
    setScanResult(result);
    setScannedProfile(result.profile || null);
    setMode('preview');
  }, []);

  const handleScanError = useCallback(async (error: Error) => {
    setLastFailedOperation({ type: 'scan' });

    const result = await handleCameraError(error, {
      screen: 'PassportScan',
      action: 'mrzScanning',
      timestamp: Date.now()
    }, {
      showUserFeedback: false,
      enableRetry: true,
      onRecoverySuccess: () => {
        setScanError(null);
        setLastFailedOperation(null);
        setMode('scanning');
      },
      fallbackAction: () => {
        setMode('manual');
      }
    });

    if (!result.recovered && result.error) {
      setScanError(result.error);
    }
  }, []);

  const handleBack = useCallback(() => {
    if (mode === 'method') {
      navigation.goBack();
    } else {
      setMode('method');
      setScanResult(null);
      setScannedProfile(null);
    }
  }, [mode, navigation]);

  const handleConfirmScanned = useCallback(async () => {
    if (scannedProfile) {
      await saveProfileData(scannedProfile);
    }
  }, [scannedProfile, saveProfileData]);

  const handleEditScanned = useCallback(() => {
    if (scannedProfile) {
      form.setValue('passportNumber', scannedProfile.passportNumber || '');
      form.setValue('surname', scannedProfile.surname || '');
      form.setValue('givenNames', scannedProfile.givenNames || '');
      form.setValue('nationality', scannedProfile.nationality || '');
      form.setValue('dateOfBirth', scannedProfile.dateOfBirth || '');
      form.setValue('gender', scannedProfile.gender || 'M');
      form.setValue('passportExpiry', scannedProfile.passportExpiry || '');
      form.setValue('issuingCountry', scannedProfile.issuingCountry || '');
    }
    setMode('manual');
  }, [scannedProfile, form]);

  const handleRescan = useCallback(() => {
    setScanResult(null);
    setScannedProfile(null);
    setMode('scanning');
  }, []);

  const retrySave = useCallback(async () => {
    setStorageError(null);
    if (lastFailedOperation?.type === 'save' && lastFailedOperation.data) {
      await saveProfileData(lastFailedOperation.data);
    }
  }, [lastFailedOperation, saveProfileData]);

  const retryScan = useCallback(() => {
    setScanError(null);
    setLastFailedOperation(null);
    setMode('scanning');
  }, []);

  const fallbackToManual = useCallback(() => {
    setScanError(null);
    setLastFailedOperation(null);
    setMode('manual');
  }, []);

  return {
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
    clearStorageError: useCallback(() => setStorageError(null), []),
    saveProfileData,
    handleScanSuccess,
    handleScanError,
    handleScanCancel: useCallback(() => { setScanError(null); setMode('method'); }, []),
    handleManualEntry: useCallback(() => setMode('manual'), []),
    handleStartScanning: useCallback(() => setMode('scanning'), []),
    handleBack,
    handleConfirmScanned,
    handleEditScanned,
    handleRescan,
    retrySave,
    retryScan,
    fallbackToManual,
  };
}

export type { PassportFormData };
