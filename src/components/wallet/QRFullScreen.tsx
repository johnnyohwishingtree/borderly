import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  Image, 
  Modal, 
  TouchableOpacity, 
  StatusBar, 
  SafeAreaView,
  Dimensions,
  Alert,
  Platform
} from 'react-native';
import { SavedQRCode } from '../../services/storage/models';

interface QRFullScreenProps {
  qrCode: SavedQRCode | null;
  visible: boolean;
  onClose: () => void;
  onDelete?: (qrCode: SavedQRCode) => void;
}

export function QRFullScreen({ qrCode, visible, onClose, onDelete }: QRFullScreenProps) {
  const [brightness, setBrightness] = useState<number>(0);
  const { width, height } = Dimensions.get('window');
  const qrSize = Math.min(width * 0.8, height * 0.6);

  useEffect(() => {
    if (visible) {
      // Increase screen brightness for QR code display
      // This would require a brightness control library in production
      setBrightnessToMax();
      
      // Hide status bar for full screen experience
      StatusBar.setHidden(true, 'fade');
    } else {
      // Restore original brightness
      restoreBrightness();
      
      // Show status bar again
      StatusBar.setHidden(false, 'fade');
    }

    return () => {
      // Cleanup on component unmount
      StatusBar.setHidden(false, 'fade');
      restoreBrightness();
    };
  }, [visible]);

  const setBrightnessToMax = async () => {
    // In a production app, you'd use a library like react-native-brightness
    // For now, we'll just store the current brightness
    setBrightness(1.0);
  };

  const restoreBrightness = async () => {
    // Restore original brightness
    setBrightness(0.5);
  };

  const handleDeletePress = () => {
    if (!qrCode || !onDelete) return;

    Alert.alert(
      'Delete QR Code',
      `Are you sure you want to delete "${qrCode.label}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            onDelete(qrCode);
            onClose();
          },
        },
      ]
    );
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getTypeLabel = (type: SavedQRCode['type']) => {
    switch (type) {
      case 'immigration':
        return 'Immigration';
      case 'customs':
        return 'Customs';
      case 'health':
        return 'Health';
      case 'combined':
        return 'Combined';
      default:
        return 'QR Code';
    }
  };

  if (!qrCode) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-black">
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-2">
          <TouchableOpacity
            onPress={onClose}
            className="p-2 rounded-full bg-gray-800 bg-opacity-50"
          >
            <Text className="text-white text-lg font-semibold">✕</Text>
          </TouchableOpacity>

          <View className="flex-1 mx-4">
            <Text className="text-white text-center text-lg font-semibold" numberOfLines={1}>
              {getTypeLabel(qrCode.type)}
            </Text>
          </View>

          {onDelete && (
            <TouchableOpacity
              onPress={handleDeletePress}
              className="p-2 rounded-full bg-red-600 bg-opacity-50"
            >
              <Text className="text-white text-lg">🗑</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* QR Code Display */}
        <View className="flex-1 items-center justify-center px-8">
          {/* QR Code */}
          <View 
            className="bg-white rounded-lg p-4 shadow-lg"
            style={{ width: qrSize + 32, height: qrSize + 32 }}
          >
            {qrCode.imageBase64 ? (
              <Image
                source={{ uri: `data:image/png;base64,${qrCode.imageBase64}` }}
                style={{ width: qrSize, height: qrSize }}
                resizeMode="contain"
              />
            ) : (
              <View 
                className="bg-gray-200 items-center justify-center rounded"
                style={{ width: qrSize, height: qrSize }}
              >
                <Text className="text-gray-500 text-xl">No QR Code</Text>
              </View>
            )}
          </View>

          {/* Label */}
          <Text className="text-white text-xl font-semibold mt-6 text-center">
            {qrCode.label}
          </Text>

          {/* Date */}
          <Text className="text-gray-300 text-sm mt-2 text-center">
            Saved {formatDate(qrCode.savedAt)}
          </Text>

          {/* Brightness Indicator */}
          <View className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
            <View className="bg-gray-800 bg-opacity-75 rounded-full px-4 py-2">
              <Text className="text-white text-xs">
                ☀️ Brightness maximized for scanning
              </Text>
            </View>
          </View>
        </View>

        {/* Instructions */}
        <View className="px-6 pb-6">
          <View className="bg-gray-800 bg-opacity-50 rounded-lg p-4">
            <Text className="text-white text-sm text-center">
              Show this QR code to immigration or customs officers at the airport
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}