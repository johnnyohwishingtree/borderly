import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { QRCaptureService } from '@/services/camera/qrCapture';
import { databaseService } from '@/services/storage';
import { SavedQRCode } from '@/services/storage/models';
import {
  compressBase64Image,
  analyzeImageQuality,
  generateProgressiveVersions,
  validateImageForProcessing,
  detectDevicePerformance,
  ImageProcessor,
  type ImageQualityMetrics,
} from '@/utils/imageUtils';

export interface QRFormData {
  label: string;
  type: SavedQRCode['type'];
  legId?: string;
}

const qrTypeOptions = [
  { value: 'immigration', label: 'Immigration' },
  { value: 'customs', label: 'Customs' },
  { value: 'health', label: 'Health' },
  { value: 'combined', label: 'Combined' },
] as const;

export function useAddQR() {
  const [isLoading, setIsLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [progressiveImage, setProgressiveImage] = useState<{
    placeholder?: string;
    lowQuality?: string;
    mediumQuality?: string;
    fullQuality: string;
  } | null>(null);
  const [imageQuality, setImageQuality] = useState<ImageQualityMetrics | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<{
    success: boolean;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    deviceOptimized?: boolean;
  } | null>(null);
  const [formData, setFormData] = useState<QRFormData>({
    label: '',
    type: 'combined',
  });
  const [devicePerformance, setDevicePerformance] = useState<'low' | 'medium' | 'high'>('medium');
  const navigation = useNavigation();

  // Memory management for images with enhanced cleanup
  const clearImageMemory = useCallback(() => {
    setCapturedImage(null);
    setBase64Image(null);
    setProgressiveImage(null);
    setImageQuality(null);
    setCompressionInfo(null);

    // Force garbage collection hint if in development
    if (__DEV__ && (globalThis as any).gc) {
      setTimeout(() => (globalThis as any).gc && (globalThis as any).gc(), 100);
    }
  }, []);

  // Detect device performance and cleanup on unmount
  useEffect(() => {
    const { tier } = detectDevicePerformance();
    setDevicePerformance(tier);

    return () => {
      clearImageMemory();
    };
  }, [clearImageMemory]);

  // Comprehensive image processing for QR codes
  const processImageForStorage = useCallback(async (base64: string) => {
    // Validate image first
    const validation = validateImageForProcessing(base64);
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    // Analyze quality
    const quality = analyzeImageQuality(base64);
    setImageQuality(quality);

    // Get device-appropriate compression settings
    const { recommendedSettings } = detectDevicePerformance();

    // Compress for storage with device-appropriate settings
    let compressionResult;
    if (devicePerformance === 'low') {
      compressionResult = await ImageProcessor.processForLowEndDevice(base64, recommendedSettings);
    } else {
      compressionResult = await compressBase64Image(base64, recommendedSettings);
    }

    // Normalize compression result for UI display
    setCompressionInfo({
      success: compressionResult.success,
      originalSize: compressionResult.originalSize,
      compressedSize: compressionResult.compressedSize,
      compressionRatio: compressionResult.compressionRatio,
      deviceOptimized: 'memoryOptimized' in compressionResult ? compressionResult.memoryOptimized : false,
    });

    // Generate progressive versions for better UX
    const finalBase64 = compressionResult.success
      ? ((compressionResult as any).processedBase64 || (compressionResult as any).compressedBase64 || base64)
      : base64;

    const progressive = await generateProgressiveVersions(
      finalBase64,
      { enableBlurPlaceholder: devicePerformance !== 'low' }
    );

    if (progressive.success) {
      setProgressiveImage(progressive);
    }

    return finalBase64;
  }, [devicePerformance]);

  // Shared logic for processing a captured/imported image
  const processAndSetImage = useCallback(async (
    imageUri: string,
    rawBase64: string,
  ) => {
    // Clear any existing images first to free memory
    if (capturedImage || base64Image) {
      clearImageMemory();
      await new Promise<void>(resolve => setTimeout(resolve, 50));
    }

    setCapturedImage(imageUri);

    const optimizedBase64 = await processImageForStorage(rawBase64);
    setBase64Image(optimizedBase64);

    // Auto-generate a label based on current date
    const now = new Date();
    const defaultLabel = `QR Code - ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    setFormData(prev => ({ ...prev, label: defaultLabel }));
  }, [capturedImage, base64Image, clearImageMemory, processImageForStorage]);

  // Validate and process an image result from camera or library
  const handleImageResult = useCallback(async (
    result: { success: boolean; imageUri?: string; base64?: string; error?: string },
    cancelMessage: string,
  ) => {
    if (result.success && result.imageUri && result.base64) {
      const validation = await QRCaptureService.validateImageUri(result.imageUri);
      if (!validation.isValid) {
        Alert.alert('Invalid Image', validation.error || 'The captured image is not valid');
        return;
      }

      const qualityCheck = QRCaptureService.validateImageQuality(result.base64);
      if (!qualityCheck.isValid) {
        Alert.alert('Image Quality Issue', qualityCheck.error || 'Image quality is not sufficient');
        return;
      }

      if (qualityCheck.warnings && qualityCheck.warnings.length > 0) {
        Alert.alert(
          'Image Quality Warning',
          qualityCheck.warnings.join('\n') + '\n\nDo you want to continue?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Continue',
              onPress: async () => {
                try {
                  await processAndSetImage(result.imageUri!, result.base64!);
                } catch (error) {
                  console.error('Error processing captured image:', error);
                  Alert.alert('Processing Error', 'Failed to process the captured image. Please try again.');
                }
              },
            },
          ]
        );
        return;
      }

      try {
        await processAndSetImage(result.imageUri, result.base64);
      } catch (error) {
        console.error('Error processing captured image:', error);
        Alert.alert('Processing Error', 'Failed to process the captured image. Please try again.');
      }
    } else if (result.error && result.error !== cancelMessage) {
      Alert.alert('Error', result.error);
    }
  }, [processAndSetImage]);

  const handleCameraCapture = async () => {
    setIsLoading(true);
    try {
      const result = await QRCaptureService.captureFromCamera();
      await handleImageResult(result, 'User cancelled camera');
    } catch {
      Alert.alert('Error', 'Failed to capture image');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLibraryImport = async () => {
    setIsLoading(true);
    try {
      const result = await QRCaptureService.importFromLibrary();
      await handleImageResult(result, 'User cancelled image selection');
    } catch {
      Alert.alert('Error', 'Failed to import image');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveQR = async () => {
    if (!capturedImage || !base64Image) {
      Alert.alert('Error', 'Please capture or select a QR code image first');
      return;
    }

    if (!formData.label.trim()) {
      Alert.alert('Error', 'Please enter a label for this QR code');
      return;
    }

    setIsLoading(true);
    try {
      const db = await databaseService.getDatabase();
      await db.write(async () => {
        const qrCodesCollection = db.collections.get<SavedQRCode>('saved_qr_codes');

        await qrCodesCollection.create((qrCode: SavedQRCode) => {
          qrCode.legId = formData.legId || '';
          qrCode.type = formData.type;
          qrCode.imageBase64 = base64Image;
          qrCode.label = formData.label.trim();
        });
      });

      clearImageMemory();

      Alert.alert(
        'Success',
        'QR code saved to your wallet!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error saving QR code:', error);
      Alert.alert('Error', 'Failed to save QR code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = useCallback(() => {
    clearImageMemory();
    setFormData({
      label: '',
      type: 'combined',
    });
  }, [clearImageMemory]);

  return {
    image: {
      capturedImage,
      base64Image,
      progressiveImage,
      imageQuality,
      compressionInfo,
      devicePerformance,
    },
    form: {
      formData,
      setFormData,
      qrTypeOptions,
    },
    actions: {
      isLoading,
      handleCameraCapture,
      handleLibraryImport,
      handleSaveQR,
      handleReset,
    },
  };
}
