import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  Modal, 
  TouchableOpacity, 
  StatusBar, 
  SafeAreaView,
  Dimensions,
  Alert
} from 'react-native';
import { SavedQRCode } from '../../services/storage/models';

interface QRFullScreenProps {
  qrCode: SavedQRCode | null;
  visible: boolean;
  onClose: () => void;
  onDelete?: (qrCode: SavedQRCode) => void;
}

export function QRFullScreen({ qrCode, visible, onClose, onDelete }: QRFullScreenProps) {
  const { width, height } = Dimensions.get('window');
  const qrSize = Math.min(width * 0.8, height * 0.6);

  useEffect(() => {
    if (visible) {
      // Hide status bar for full screen experience
      try {
        StatusBar.setHidden(true, 'fade');
      } catch (error) {
        // Fallback for platforms that don't support StatusBar.setHidden
        console.warn('StatusBar.setHidden not supported:', error);
      }
    } else {
      // Show status bar again
      try {
        StatusBar.setHidden(false, 'fade');
      } catch (error) {
        console.warn('StatusBar.setHidden not supported:', error);
      }
    }

    return () => {
      // Cleanup on component unmount
      try {
        StatusBar.setHidden(false, 'fade');
      } catch (error) {
        console.warn('StatusBar.setHidden not supported:', error);
      }
    };
  }, [visible]);


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