import { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Alert,
  ActionSheetIOS,
  Platform,
  ScrollView,
  RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Smartphone } from 'lucide-react-native';
import { EmptyState, Button } from '../../components/ui';
import LoadingStates, { useLoadingState } from '../../components/ui/LoadingStates';
import { HapticFeedback } from '../../components/ui/HapticFeedback';
import { QRCodeCard, QRFullScreen } from '../../components/wallet';
import { ContextualHelp, HelpContent } from '../../components/help';
import { SavedQRCode } from '../../services/storage/models';
import { useNavigation } from '@react-navigation/native';
import { databaseService } from '../../services/storage';

export default function QRWalletScreen() {
  const [qrCodes, setQrCodes] = useState<SavedQRCode[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedQR, setSelectedQR] = useState<SavedQRCode | null>(null);
  const [fullScreenVisible, setFullScreenVisible] = useState(false);
  const navigation = useNavigation();
  
  const {
    state,
    error,
    setLoading,
    setLoadingError,
    setLoadingSuccess,
    reset,
    retry
  } = useLoadingState();

  // Load QR codes from database
  const loadQRCodes = async (showLoading = false) => {
    try {
      if (showLoading) setLoading();
      
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
      setLoadingSuccess();
    } catch (error) {
      console.error('Error loading QR codes:', error);
      setLoadingError(error instanceof Error ? error.message : 'Failed to load QR codes');
    } finally {
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
    HapticFeedback.refresh();
    setIsRefreshing(true);
    reset();
    loadQRCodes();
  }, [reset]);
  
  const handleRetry = useCallback(() => {
    retry();
    loadQRCodes(true);
  }, [retry]);

  // Handle QR code press (show full screen)
  const handleQRPress = (qrCode: SavedQRCode) => {
    HapticFeedback.card();
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
    HapticFeedback.button('medium');
    navigation.navigate('AddQR' as never);
  };

  // Handle loading and error states
  if (state === 'loading' && qrCodes.length === 0) {
    return (
      <LoadingStates
        state="loading"
        variant="dots"
        size="medium"
        text="Loading your QR codes..."
        fullScreen={true}
      />
    );
  }

  if (state === 'error' || error) {
    return (
      <LoadingStates
        state="error"
        fullScreen={true}
        errorMessage={error || 'Failed to load QR codes'}
        onRetry={handleRetry}
        showRetryButton={true}
        retryButtonText="Reload QR Codes"
      />
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

        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#3b82f6"
              colors={['#3b82f6']}
            />
          }
        >
          <View className="flex-1 px-4">
            <EmptyState
              icon={<Smartphone size={40} color="#6b7280" />}
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
        </ScrollView>
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
          <ContextualHelp 
            content={HelpContent.qrWallet}
            variant="icon"
            size="medium"
          />
          
          <TouchableOpacity
            onPress={handleAddQR}
            className="bg-blue-600 rounded-full p-2"
          >
            <Text className="text-white text-xl font-bold">+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* QR Code List */}
      <ScrollView
        className="flex-1 px-4"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
            colors={['#3b82f6']}
          />
        }
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
      </ScrollView>

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
