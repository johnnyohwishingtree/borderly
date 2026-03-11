import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Smartphone } from 'lucide-react-native';
import { Card, Button, LoadingSpinner, Select } from '../../components/ui';
import { QRCaptureService } from '../../services/camera/qrCapture';
import { databaseService } from '../../services/storage';
import { SavedQRCode } from '../../services/storage/models';
import {
  compressBase64Image,
  analyzeImageQuality,
  generateProgressiveVersions,
  validateImageForProcessing,
  detectDevicePerformance,
  ImageProcessor,
  type ImageQualityMetrics,
} from '../../utils/imageUtils';

interface QRFormData {
  label: string;
  type: SavedQRCode['type'];
  legId?: string;
}

export default function AddQRScreen() {
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
      // Small delay to allow state updates to complete
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

  const qrTypeOptions = [
    { value: 'immigration', label: 'Immigration' },
    { value: 'customs', label: 'Customs' },
    { value: 'health', label: 'Health' },
    { value: 'combined', label: 'Combined' },
  ] as const;

  // Comprehensive image processing for QR codes
  const processImageForStorage = useCallback(async (base64: string) => {
    try {
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
    } catch (error) {
      console.error('Error processing image:', error);
      throw error;
    }
  }, [devicePerformance]);

  const handleCameraCapture = async () => {
    setIsLoading(true);
    try {
      const result = await QRCaptureService.captureFromCamera();
      
      if (result.success && result.imageUri && result.base64) {
        // Validate the captured image
        const validation = await QRCaptureService.validateImageUri(result.imageUri);
        if (!validation.isValid) {
          Alert.alert('Invalid Image', validation.error || 'The captured image is not valid');
          return;
        }

        // Check image quality
        const qualityCheck = QRCaptureService.validateImageQuality(result.base64);
        if (!qualityCheck.isValid) {
          Alert.alert('Image Quality Issue', qualityCheck.error || 'Image quality is not sufficient');
          return;
        }

        // Enhanced image processing function
        const setOptimizedImageData = async () => {
          try {
            // Clear any existing images first to free memory
            if (capturedImage || base64Image) {
              clearImageMemory();
              // Small delay to allow cleanup
              await new Promise<void>(resolve => setTimeout(resolve, 50));
            }

            setCapturedImage(result.imageUri!);
            
            // Process image with comprehensive optimization
            const optimizedBase64 = await processImageForStorage(result.base64!);
            setBase64Image(optimizedBase64);
            
            // Auto-generate a label based on current date
            const now = new Date();
            const defaultLabel = `QR Code - ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            setFormData(prev => ({ ...prev, label: defaultLabel }));
          } catch (error) {
            console.error('Error processing captured image:', error);
            Alert.alert('Processing Error', 'Failed to process the captured image. Please try again.');
            return;
          }
        };

        // Show warnings if any
        if (qualityCheck.warnings && qualityCheck.warnings.length > 0) {
          Alert.alert(
            'Image Quality Warning',
            qualityCheck.warnings.join('\n') + '\n\nDo you want to continue?',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Continue', 
                onPress: setOptimizedImageData
              },
            ]
          );
          return;
        }

        await setOptimizedImageData();
      } else if (result.error && result.error !== 'User cancelled camera') {
        Alert.alert('Error', result.error);
      }
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
      
      if (result.success && result.imageUri && result.base64) {
        // Validate the imported image
        const validation = await QRCaptureService.validateImageUri(result.imageUri);
        if (!validation.isValid) {
          Alert.alert('Invalid Image', validation.error || 'The selected image is not valid');
          return;
        }

        // Check image quality
        const qualityCheck = QRCaptureService.validateImageQuality(result.base64);
        if (!qualityCheck.isValid) {
          Alert.alert('Image Quality Issue', qualityCheck.error || 'Image quality is not sufficient');
          return;
        }

        // Enhanced image processing function
        const setOptimizedImageData = async () => {
          try {
            // Clear any existing images first to free memory
            if (capturedImage || base64Image) {
              clearImageMemory();
              // Small delay to allow cleanup
              await new Promise<void>(resolve => setTimeout(resolve, 50));
            }

            setCapturedImage(result.imageUri!);
            
            // Process image with comprehensive optimization
            const optimizedBase64 = await processImageForStorage(result.base64!);
            setBase64Image(optimizedBase64);
            
            // Auto-generate a label based on current date
            const now = new Date();
            const defaultLabel = `QR Code - ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            setFormData(prev => ({ ...prev, label: defaultLabel }));
          } catch (error) {
            console.error('Error processing captured image:', error);
            Alert.alert('Processing Error', 'Failed to process the captured image. Please try again.');
            return;
          }
        };

        // Show warnings if any
        if (qualityCheck.warnings && qualityCheck.warnings.length > 0) {
          Alert.alert(
            'Image Quality Warning',
            qualityCheck.warnings.join('\n') + '\n\nDo you want to continue?',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Continue', 
                onPress: setOptimizedImageData
              },
            ]
          );
          return;
        }

        await setOptimizedImageData();
      } else if (result.error && result.error !== 'User cancelled image selection') {
        Alert.alert('Error', result.error);
      }
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

      // Clear images from memory after successful save
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

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <LoadingSpinner />
        <Text className="text-gray-600 mt-4">Processing...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-6 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900">Add QR Code</Text>
        <Text className="text-base text-gray-600 mt-1">
          Save a QR code to your wallet
        </Text>
      </View>

      <ScrollView className="flex-1 px-4">
        <View className="py-4 space-y-4">
          {/* Capture Section */}
          {!capturedImage ? (
            <Card>
              <View className="p-6 items-center">
                <View className="w-24 h-24 bg-blue-100 rounded-full items-center justify-center mb-4">
                  <Smartphone size={32} color="#3b82f6" />
                </View>
                
                <Text className="text-lg font-semibold text-gray-900 mb-2">
                  Capture QR Code
                </Text>
                <Text className="text-gray-600 text-center mb-6">
                  Take a photo of your QR code or choose one from your photo library
                </Text>

                <View className="w-full space-y-3">
                  <Button
                    title="Take Photo"
                    onPress={handleCameraCapture}
                    variant="primary"
                  />
                  <Button
                    title="Choose from Library"
                    onPress={handleLibraryImport}
                    variant="outline"
                  />
                </View>
              </View>
            </Card>
          ) : (
            <Card>
              <View className="p-4">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-lg font-semibold text-gray-900">
                    Captured QR Code
                  </Text>
                  <TouchableOpacity
                    onPress={handleReset}
                    className="px-3 py-1 bg-gray-100 rounded-full"
                  >
                    <Text className="text-sm text-gray-600">Reset</Text>
                  </TouchableOpacity>
                </View>

                <View className="items-center mb-4">
                  <Image
                    source={{ 
                      uri: progressiveImage?.mediumQuality || progressiveImage?.lowQuality || capturedImage 
                    }}
                    className="w-40 h-40 rounded-lg"
                    resizeMode="contain"
                  />
                </View>

                <Text className="text-sm text-gray-500 text-center">
                  QR code image captured successfully
                </Text>
                
                {/* Image quality info */}
                {imageQuality && (
                  <View className="mt-3 space-y-2">
                    {imageQuality.warnings.length > 0 && (
                      <View className="bg-yellow-50 p-2 rounded">
                        <Text className="text-xs font-medium text-yellow-800">Quality Notes:</Text>
                        {imageQuality.warnings.map((warning: string, index: number) => (
                          <Text key={index} className="text-xs text-yellow-700">
                            • {warning}
                          </Text>
                        ))}
                      </View>
                    )}
                    
                    {compressionInfo && (
                      <View className="bg-blue-50 p-2 rounded">
                        <Text className="text-xs font-medium text-blue-800">
                          {compressionInfo.compressionRatio !== undefined 
                            ? `Processing: ${Math.round(compressionInfo.compressionRatio * 100)}%`
                            : 'Image optimized for device'
                          }
                          {compressionInfo.originalSize && compressionInfo.compressedSize && (
                            <Text>
                              {' '}({compressionInfo.originalSize > 1024 * 1024 
                                ? `${(compressionInfo.originalSize / (1024 * 1024)).toFixed(1)}MB` 
                                : `${(compressionInfo.originalSize / 1024).toFixed(0)}KB`
                              } → {compressionInfo.compressedSize > 1024 * 1024
                                ? `${(compressionInfo.compressedSize / (1024 * 1024)).toFixed(1)}MB`
                                : `${(compressionInfo.compressedSize / 1024).toFixed(0)}KB`
                              })
                            </Text>
                          )}
                        </Text>
                      </View>
                    )}
                    
                    {devicePerformance === 'low' && (
                      <View className="bg-green-50 p-2 rounded">
                        <Text className="text-xs font-medium text-green-800">
                          ⚡ Device-optimized processing applied
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </Card>
          )}

          {/* Form Section */}
          {capturedImage && (
            <Card>
              <View className="p-4 space-y-4">
                <Text className="text-lg font-semibold text-gray-900">
                  QR Code Details
                </Text>

                {/* Label Input */}
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    Label *
                  </Text>
                  <TextInput
                    value={formData.label}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, label: text }))}
                    placeholder="e.g., Visit Japan Web - Customs"
                    className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                    multiline={false}
                  />
                  <Text className="text-xs text-gray-500 mt-1">
                    Give this QR code a descriptive name
                  </Text>
                </View>

                {/* Type Select */}
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-2">
                    Type
                  </Text>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => 
                      setFormData(prev => ({ ...prev, type: value as SavedQRCode['type'] }))
                    }
                    options={[...qrTypeOptions]}
                    placeholder="Select QR code type"
                  />
                  <Text className="text-xs text-gray-500 mt-1">
                    What type of declaration does this QR code represent?
                  </Text>
                </View>

                {/* Save Button */}
                <View className="pt-4">
                  <Button
                    title="Save to Wallet"
                    onPress={handleSaveQR}
                    variant="primary"
                    disabled={!formData.label.trim()}
                  />
                </View>
              </View>
            </Card>
          )}

          {/* Help Section */}
          <Card>
            <View className="p-4">
              <Text className="text-base font-semibold text-gray-900 mb-3">
                Tips for QR Code Capture
              </Text>
              
              <View className="space-y-3">
                <View className="flex-row items-start space-x-3">
                  <Text className="text-blue-600 font-bold">1.</Text>
                  <Text className="text-sm text-gray-600 flex-1">
                    Make sure the QR code is clearly visible and not blurry
                  </Text>
                </View>
                
                <View className="flex-row items-start space-x-3">
                  <Text className="text-blue-600 font-bold">2.</Text>
                  <Text className="text-sm text-gray-600 flex-1">
                    Ensure good lighting when taking the photo
                  </Text>
                </View>
                
                <View className="flex-row items-start space-x-3">
                  <Text className="text-blue-600 font-bold">3.</Text>
                  <Text className="text-sm text-gray-600 flex-1">
                    Keep the QR code flat and avoid shadows
                  </Text>
                </View>
                
                <View className="flex-row items-start space-x-3">
                  <Text className="text-blue-600 font-bold">4.</Text>
                  <Text className="text-sm text-gray-600 flex-1">
                    QR codes work best when captured straight-on
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        </View>

        {/* Bottom spacing */}
        <View className="h-20" />
      </ScrollView>
    </View>
  );
}
