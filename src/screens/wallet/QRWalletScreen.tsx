import { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Alert,
  ActionSheetIOS,
  Platform
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { EmptyState, Button, SkeletonList, PullToRefreshScrollView } from '../../components/ui';
import { QRCodeCard, QRFullScreen } from '../../components/wallet';
import { SavedQRCode } from '../../services/storage/models';
import { useNavigation } from '@react-navigation/native';
import { databaseService } from '../../services/storage';

export default function QRWalletScreen() {
  const [qrCodes, setQrCodes] = useState<SavedQRCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedQR, setSelectedQR] = useState<SavedQRCode | null>(null);
  const [fullScreenVisible, setFullScreenVisible] = useState(false);
  const navigation = useNavigation();

  // Load QR codes from database
  const loadQRCodes = async (showLoading = false) => {
    try {
      if (showLoading) setIsLoading(true);
      
      const db = await databaseService.getDatabase();
      const qrCodesCollection = db.collections.get<SavedQRCode>('saved_qr_codes');
      const allQRCodes = await qrCodesCollection
        .query()
        .fetch();

      // Sort by saved date, most recent first
      const sortedQRCodes = allQRCodes.sort(
        (a: SavedQRCode, b: SavedQRCode) => b.savedAt.getTime() - a.savedAt.getTime()
      );

      setQrCodes(sortedQRCodes);
    } catch (error) {
      console.error('Error loading QR codes:', error);
      Alert.alert('Error', 'Failed to load QR codes. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Load QR codes when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadQRCodes(true);
    }, [])
  );

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadQRCodes();
  }, []);

  // Handle QR code press (show full screen)
  const handleQRPress = (qrCode: SavedQRCode) => {
    setSelectedQR(qrCode);
    setFullScreenVisible(true);
  };

  // Handle QR code long press (show options)
  const handleQRLongPress = (qrCode: SavedQRCode) => {
    const options = ['View Full Screen', 'Delete', 'Cancel'];
    const destructiveButtonIndex = 1;
    const cancelButtonIndex = 2;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex,
          cancelButtonIndex,
          title: qrCode.label,
        },
        (buttonIndex) => {
          switch (buttonIndex) {
            case 0:
              handleQRPress(qrCode);
              break;
            case 1:
              handleDeleteQR(qrCode);
              break;
          }
        }
      );
    } else {
      Alert.alert(
        qrCode.label,
        'Choose an action',
        [
          {
            text: 'View Full Screen',
            onPress: () => handleQRPress(qrCode),
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => handleDeleteQR(qrCode),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );
    }
  };

  // Handle QR code deletion
  const handleDeleteQR = async (qrCode: SavedQRCode) => {
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
              
              // Reload QR codes
              await loadQRCodes();
              
              Alert.alert('Success', 'QR code deleted successfully');
            } catch (error) {
              console.error('Error deleting QR code:', error);
              Alert.alert('Error', 'Failed to delete QR code. Please try again.');
            }
          },
        },
      ]
    );
  };

  // Navigate to Add QR screen
  const handleAddQR = () => {
    navigation.navigate('AddQR' as never);
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white px-4 py-6 border-b border-gray-100">
          <Text className="text-2xl font-bold text-gray-900">QR Wallet</Text>
          <Text className="text-base text-gray-600 mt-1">
            Loading your saved codes...
          </Text>
        </View>

        {/* Skeleton Loading */}
        <View className="flex-1 px-4 pt-4">
          <SkeletonList 
            itemCount={4}
            lines={3}
            spacing="normal"
            className="space-y-3"
          />
        </View>
      </View>
    );
  }

  if (qrCodes.length === 0) {
    return (
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white px-4 py-6 border-b border-gray-100">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-900">QR Wallet</Text>
              <Text className="text-base text-gray-600 mt-1">
                Your saved entry codes
              </Text>
            </View>
            
            <TouchableOpacity
              onPress={handleAddQR}
              className="bg-blue-600 rounded-full p-2"
            >
              <Text className="text-white text-xl font-bold">+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <PullToRefreshScrollView
          className="flex-1"
          refreshing={isRefreshing} 
          onRefresh={onRefresh}
          hapticFeedback={true}
          title="Refreshing codes..."
        >
          <View className="flex-1 px-4">
            <EmptyState
              icon={<Text className="text-4xl">📱</Text>}
              title="No QR codes saved"
              description="Add QR codes from your travel submissions for quick access at border crossings"
              variant="illustration"
            />
            
            <View className="mt-6">
              <Button
                title="Add QR Code"
                onPress={handleAddQR}
                variant="primary"
              />
            </View>
          </View>
        </PullToRefreshScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-6 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-2xl font-bold text-gray-900">QR Wallet</Text>
            <Text className="text-base text-gray-600 mt-1">
              {qrCodes.length} saved code{qrCodes.length !== 1 ? 's' : ''}
            </Text>
          </View>
          
          <TouchableOpacity
            onPress={handleAddQR}
            className="bg-blue-600 rounded-full p-2"
          >
            <Text className="text-white text-xl font-bold">+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* QR Code List */}
      <PullToRefreshScrollView
        className="flex-1 px-4"
        refreshing={isRefreshing} 
        onRefresh={onRefresh}
        hapticFeedback={true}
        title="Refreshing codes..."
      >
        <View className="py-4">
          {qrCodes.map((qrCode) => (
            <QRCodeCard
              key={qrCode.id}
              qrCode={qrCode}
              onPress={handleQRPress}
              onLongPress={handleQRLongPress}
            />
          ))}
        </View>

        {/* Bottom spacing */}
        <View className="h-20" />
      </PullToRefreshScrollView>

      {/* Full Screen QR Display */}
      <QRFullScreen
        qrCode={selectedQR}
        visible={fullScreenVisible}
        onClose={() => {
          setFullScreenVisible(false);
          setSelectedQR(null);
        }}
        onDelete={handleDeleteQR}
      />
    </View>
  );
}
