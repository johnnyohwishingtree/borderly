import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
} from 'react-native';
import { Smartphone } from 'lucide-react-native';
import { Card, Button, LoadingSpinner, Select, ScreenContainer } from '@/components/ui';
import { SavedQRCode } from '@/services/storage/models';
import { useAddQR } from '@/hooks/useAddQR';

export default function AddQRScreen() {
  const {
    image: { capturedImage, progressiveImage, imageQuality, compressionInfo, devicePerformance },
    form: { formData, setFormData, qrTypeOptions },
    actions: { isLoading, handleCameraCapture, handleLibraryImport, handleSaveQR, handleReset },
  } = useAddQR();

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-gray-900 items-center justify-center">
        <LoadingSpinner />
        <Text className="text-gray-600 dark:text-gray-400 mt-4">Processing...</Text>
      </View>
    );
  }

  return (
    <ScreenContainer className="bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 px-4 py-6 border-b border-gray-100 dark:border-gray-700">
        <Text className="text-2xl font-bold text-gray-900 dark:text-white">Add QR Code</Text>
        <Text className="text-base text-gray-600 dark:text-gray-400 mt-1">
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

                <Text className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Capture QR Code
                </Text>
                <Text className="text-gray-600 dark:text-gray-400 text-center mb-6">
                  Take a photo of your QR code or choose one from your photo library
                </Text>

                <View className="w-full space-y-3">
                  <Button
                    title="Take Photo"
                    onPress={handleCameraCapture}
                    variant="secondary"
                  />
                  <Button
                    title="Choose from Library"
                    onPress={handleLibraryImport}
                    variant="secondary"
                  />
                </View>
              </View>
            </Card>
          ) : (
            <Card>
              <View className="p-4">
                <View className="flex-row items-center justify-between mb-4">
                  <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                    Captured QR Code
                  </Text>
                  <TouchableOpacity
                    onPress={handleReset}
                    className="px-4 bg-gray-100 dark:bg-gray-700 rounded-full items-center justify-center"
                    style={{ minHeight: 44 }}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Reset captured image"
                  >
                    <Text className="text-sm text-gray-600 dark:text-gray-300">Reset</Text>
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

                <Text className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  QR code image captured successfully
                </Text>

                {/* Image quality info */}
                {imageQuality && (
                  <View className="mt-3 space-y-2">
                    {imageQuality.warnings.length > 0 && (
                      <View className="bg-yellow-50 dark:bg-yellow-950 p-2 rounded">
                        <Text className="text-xs font-medium text-yellow-800 dark:text-yellow-200">Quality Notes:</Text>
                        {imageQuality.warnings.map((warning: string, index: number) => (
                          <Text key={index} className="text-xs text-yellow-700 dark:text-yellow-300">
                            • {warning}
                          </Text>
                        ))}
                      </View>
                    )}

                    {compressionInfo && (
                      <View className="bg-blue-50 dark:bg-blue-950 p-2 rounded">
                        <Text className="text-xs font-medium text-blue-800 dark:text-blue-200">
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
                      <View className="bg-green-50 dark:bg-green-950 p-2 rounded">
                        <Text className="text-xs font-medium text-green-800 dark:text-green-200">
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
                <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                  QR Code Details
                </Text>

                {/* Label Input */}
                <View>
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Label *
                  </Text>
                  <TextInput
                    value={formData.label}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, label: text }))}
                    placeholder="e.g., Visit Japan Web - Customs"
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    multiline={false}
                  />
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Give this QR code a descriptive name
                  </Text>
                </View>

                {/* Type Select */}
                <View>
                  <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
              <Text className="text-base font-semibold text-gray-900 dark:text-white mb-3">
                Tips for QR Code Capture
              </Text>

              <View className="space-y-3">
                <View className="flex-row items-start gap-3">
                  <Text className="text-blue-600 dark:text-blue-400 font-bold">1.</Text>
                  <Text className="text-sm text-gray-600 dark:text-gray-400 flex-1">
                    Make sure the QR code is clearly visible and not blurry
                  </Text>
                </View>

                <View className="flex-row items-start gap-3">
                  <Text className="text-blue-600 dark:text-blue-400 font-bold">2.</Text>
                  <Text className="text-sm text-gray-600 dark:text-gray-400 flex-1">
                    Ensure good lighting when taking the photo
                  </Text>
                </View>

                <View className="flex-row items-start gap-3">
                  <Text className="text-blue-600 dark:text-blue-400 font-bold">3.</Text>
                  <Text className="text-sm text-gray-600 dark:text-gray-400 flex-1">
                    Keep the QR code flat and avoid shadows
                  </Text>
                </View>

                <View className="flex-row items-start gap-3">
                  <Text className="text-blue-600 dark:text-blue-400 font-bold">4.</Text>
                  <Text className="text-sm text-gray-600 dark:text-gray-400 flex-1">
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
    </ScreenContainer>
  );
}
