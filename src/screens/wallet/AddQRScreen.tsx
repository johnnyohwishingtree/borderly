import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card, Button, LoadingSpinner, Select } from '../../components/ui';
import { QRCaptureService } from '../../services/camera/qrCapture';
import { database } from '../../services/storage';
import { SavedQRCode } from '../../services/storage/models';

interface QRFormData {
  label: string;
  type: SavedQRCode['type'];
  legId?: string;
}

export default function AddQRScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [formData, setFormData] = useState<QRFormData>({
    label: '',
    type: 'combined',
  });
  const navigation = useNavigation();

  const qrTypeOptions = [
    { value: 'immigration', label: 'Immigration' },
    { value: 'customs', label: 'Customs' },
    { value: 'health', label: 'Health' },
    { value: 'combined', label: 'Combined' },
  ] as const;

  const handleCameraCapture = async () => {
    setIsLoading(true);
    try {
      const result = await QRCaptureService.captureFromCamera();
      
      if (result.success && result.imageUri && result.base64) {
        setCapturedImage(result.imageUri);
        setBase64Image(result.base64);
        
        // Auto-generate a label based on current date
        const now = new Date();
        const defaultLabel = `QR Code - ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        setFormData(prev => ({ ...prev, label: defaultLabel }));
      } else if (result.error && result.error !== 'User cancelled camera') {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
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
        setCapturedImage(result.imageUri);
        setBase64Image(result.base64);
        
        // Auto-generate a label based on current date
        const now = new Date();
        const defaultLabel = `QR Code - ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        setFormData(prev => ({ ...prev, label: defaultLabel }));
      } else if (result.error && result.error !== 'User cancelled image selection') {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to import image');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCaptureOptions = async () => {
    if (Platform.OS === 'ios') {
      Alert.alert(
        'Add QR Code',
        'Choose how you want to add your QR code',
        [
          {
            text: 'Take Photo',
            onPress: handleCameraCapture,
          },
          {
            text: 'Choose from Library',
            onPress: handleLibraryImport,
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    } else {
      // For Android, show a simple alert
      Alert.alert(
        'Add QR Code',
        'Choose how you want to add your QR code',
        [
          {
            text: 'Take Photo',
            onPress: handleCameraCapture,
          },
          {
            text: 'Choose from Library',
            onPress: handleLibraryImport,
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
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
      await database.write(async () => {
        const qrCodesCollection = database.collections.get<SavedQRCode>('saved_qr_codes');
        
        await qrCodesCollection.create((qrCode) => {
          qrCode.legId = formData.legId || '';
          qrCode.type = formData.type;
          qrCode.imageBase64 = base64Image;
          qrCode.label = formData.label.trim();
        });
      });

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

  const handleReset = () => {
    setCapturedImage(null);
    setBase64Image(null);
    setFormData({
      label: '',
      type: 'combined',
    });
  };

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
                  <Text className="text-3xl">📱</Text>
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
                    source={{ uri: capturedImage }}
                    className="w-40 h-40 rounded-lg"
                    resizeMode="contain"
                  />
                </View>

                <Text className="text-sm text-gray-500 text-center">
                  QR code image captured successfully
                </Text>
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
                    options={qrTypeOptions}
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
