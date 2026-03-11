import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Share,
  Platform,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { Card, Button, LoadingSpinner } from '../../components/ui';
import { QRFullScreen } from '../../components/wallet';
import { SavedQRCode } from '../../services/storage/models';
import { databaseService } from '../../services/storage';

type QRDetailRouteParams = {
  QRDetail: {
    qrCodeId: string;
  };
};

export default function QRDetailScreen() {
  const route = useRoute<RouteProp<QRDetailRouteParams, 'QRDetail'>>();
  const navigation = useNavigation();
  const [qrCode, setQrCode] = useState<SavedQRCode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fullScreenVisible, setFullScreenVisible] = useState(false);

  const { qrCodeId } = route.params;

  const loadQRCode = useCallback(async () => {
    try {
      setIsLoading(true);
      const db = await databaseService.getDatabase();
      const qrCodesCollection = db.collections.get<SavedQRCode>('saved_qr_codes');
      const foundQRCode = await qrCodesCollection.find(qrCodeId);
      setQrCode(foundQRCode);
    } catch (error) {
      console.error('Error loading QR code:', error);
      Alert.alert(
        'Error',
        'Failed to load QR code details.',
        [
          {
            text: 'Go Back',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } finally {
      setIsLoading(false);
    }
  }, [qrCodeId, navigation]);

  useEffect(() => {
    loadQRCode();
  }, [loadQRCode]);

  const handleViewFullScreen = () => {
    setFullScreenVisible(true);
  };

  const handleShare = async () => {
    if (!qrCode || !qrCode.imageBase64) {
      Alert.alert('Error', 'No QR code image to share');
      return;
    }

    try {
      const imageUri = `data:image/png;base64,${qrCode.imageBase64}`;
      
      if (Platform.OS === 'ios') {
        await Share.share({
          url: imageUri,
          message: `QR Code: ${qrCode.label}`,
        });
      } else {
        await Share.share({
          message: `QR Code: ${qrCode.label}`,
          title: 'Share QR Code',
        });
      }
    } catch (error) {
      console.error('Error sharing QR code:', error);
      Alert.alert('Error', 'Failed to share QR code');
    }
  };

  const handleDelete = async () => {
    if (!qrCode) return;

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
          onPress: async () => {
            try {
              const db = await databaseService.getDatabase();
              await db.write(async () => {
                await qrCode.destroyPermanently();
              });
              
              Alert.alert(
                'Success',
                'QR code deleted successfully',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.goBack(),
                  },
                ]
              );
            } catch (error) {
              console.error('Error deleting QR code:', error);
              Alert.alert('Error', 'Failed to delete QR code. Please try again.');
            }
          },
        },
      ]
    );
  };

  const getTypeColor = (type: SavedQRCode['type']) => {
    switch (type) {
      case 'immigration':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'customs':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'health':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'combined':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
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
        return 'Unknown';
    }
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

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <LoadingSpinner />
        <Text className="text-gray-600 mt-4">Loading QR code...</Text>
      </View>
    );
  }

  if (!qrCode) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center px-4">
        <Text className="text-xl font-semibold text-gray-900 mb-2">
          QR Code Not Found
        </Text>
        <Text className="text-gray-600 text-center mb-6">
          The requested QR code could not be found.
        </Text>
        <Button
          title="Go Back"
          onPress={() => navigation.goBack()}
          variant="primary"
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-6 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900" numberOfLines={1}>
          {qrCode.label}
        </Text>
        <View className={`inline-flex px-3 py-1 rounded-full border mt-2 ${getTypeColor(qrCode.type)}`}>
          <Text className="text-sm font-medium">
            {getTypeLabel(qrCode.type)}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4">
        <View className="py-4 space-y-4">
          {/* QR Code Display */}
          <Card>
            <View className="p-6">
              <Text className="text-lg font-semibold text-gray-900 mb-4 text-center">
                QR Code
              </Text>
              
              <TouchableOpacity
                onPress={handleViewFullScreen}
                className="items-center mb-4 active:opacity-70"
              >
                <View className="w-64 h-64 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                  {qrCode.imageBase64 ? (
                    <Image
                      source={{ uri: `data:image/png;base64,${qrCode.imageBase64}` }}
                      className="w-full h-full"
                      resizeMode="contain"
                    />
                  ) : (
                    <View className="w-full h-full bg-gray-200 items-center justify-center">
                      <Text className="text-gray-500 text-lg">No Image</Text>
                    </View>
                  )}
                </View>
                
                <Text className="text-sm text-blue-600 mt-3">
                  Tap for full screen view
                </Text>
              </TouchableOpacity>
            </View>
          </Card>

          {/* Details */}
          <Card>
            <View className="p-4">
              <Text className="text-lg font-semibold text-gray-900 mb-4">
                Details
              </Text>
              
              <View className="space-y-3">
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Type:</Text>
                  <Text className="text-gray-900 font-medium">
                    {getTypeLabel(qrCode.type)}
                  </Text>
                </View>
                
                <View className="flex-row justify-between">
                  <Text className="text-gray-600">Saved:</Text>
                  <Text className="text-gray-900 font-medium">
                    {formatDate(qrCode.savedAt)}
                  </Text>
                </View>
                
                {qrCode.legId && (
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600">Trip Leg:</Text>
                    <Text className="text-gray-900 font-medium">
                      Associated
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </Card>

          {/* Actions */}
          <Card>
            <View className="p-4 space-y-3">
              <Text className="text-lg font-semibold text-gray-900 mb-2">
                Actions
              </Text>
              
              <Button
                title="View Full Screen"
                onPress={handleViewFullScreen}
                variant="primary"
              />
              
              <Button
                title="Share QR Code"
                onPress={handleShare}
                variant="outline"
              />
              
              <Button
                title="Delete QR Code"
                onPress={handleDelete}
                variant="outline"
              />
            </View>
          </Card>

          {/* Usage Instructions */}
          <Card>
            <View className="p-4">
              <Text className="text-lg font-semibold text-gray-900 mb-3">
                How to Use
              </Text>
              
              <View className="space-y-3">
                <View className="flex-row items-start space-x-3">
                  <Text className="text-blue-600 font-bold">1.</Text>
                  <Text className="text-sm text-gray-600 flex-1">
                    Show this QR code to immigration or customs officers at the airport
                  </Text>
                </View>
                
                <View className="flex-row items-start space-x-3">
                  <Text className="text-blue-600 font-bold">2.</Text>
                  <Text className="text-sm text-gray-600 flex-1">
                    Use full-screen view for better scanning
                  </Text>
                </View>
                
                <View className="flex-row items-start space-x-3">
                  <Text className="text-blue-600 font-bold">3.</Text>
                  <Text className="text-sm text-gray-600 flex-1">
                    Keep your phone charged and ensure screen brightness is at maximum
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        </View>

        {/* Bottom spacing */}
        <View className="h-20" />
      </ScrollView>

      {/* Full Screen QR Display */}
      <QRFullScreen
        qrCode={qrCode}
        visible={fullScreenVisible}
        onClose={() => setFullScreenVisible(false)}
        onDelete={handleDelete}
      />
    </View>
  );
}
