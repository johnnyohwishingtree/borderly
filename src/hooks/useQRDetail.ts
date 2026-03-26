import { useState, useCallback, useEffect, useRef } from 'react';
import { Alert, Share, Platform } from 'react-native';
import { SavedQRCode } from '@/services/storage/models';
import { databaseService } from '@/services/storage';

type QRType = SavedQRCode['type'];

export interface UseQRDetailReturn {
  qrCode: SavedQRCode | null;
  isLoading: boolean;
  fullScreenVisible: boolean;
  handleViewFullScreen: () => void;
  handleCloseFullScreen: () => void;
  handleShare: () => Promise<void>;
  handleDelete: (onSuccess: () => void) => void;
  getTypeColor: (type: QRType) => string;
  getTypeLabel: (type: QRType) => string;
  formatDate: (date: Date) => string;
}

export function getTypeColor(type: QRType): string {
  switch (type) {
    case 'immigration':
      return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700';
    case 'customs':
      return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700';
    case 'health':
      return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700';
    case 'combined':
      return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-700';
    default:
      return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600';
  }
}

export function getTypeLabel(type: QRType): string {
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
}

export function formatQRDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export interface UseQRDetailOptions {
  qrCodeId: string;
  onLoadError: () => void;
}

export function useQRDetail({ qrCodeId, onLoadError }: UseQRDetailOptions): UseQRDetailReturn {
  const [qrCode, setQrCode] = useState<SavedQRCode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fullScreenVisible, setFullScreenVisible] = useState(false);
  const onLoadErrorRef = useRef(onLoadError);
  onLoadErrorRef.current = onLoadError;

  const loadQRCode = useCallback(async () => {
    try {
      setIsLoading(true);
      const db = await databaseService.getDatabase();
      const qrCodesCollection = db.collections.get<SavedQRCode>('saved_qr_codes');
      const foundQRCode = await qrCodesCollection.find(qrCodeId);
      setQrCode(foundQRCode);
    } catch (error) {
      console.error('Error loading QR code:', error);
      Alert.alert('Error', 'Failed to load QR code details.', [
        { text: 'Go Back', onPress: () => onLoadErrorRef.current() },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [qrCodeId]);

  useEffect(() => {
    loadQRCode();
  }, [loadQRCode]);

  const handleViewFullScreen = useCallback(() => {
    setFullScreenVisible(true);
  }, []);

  const handleCloseFullScreen = useCallback(() => {
    setFullScreenVisible(false);
  }, []);

  const handleShare = useCallback(async () => {
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
  }, [qrCode]);

  const handleDelete = useCallback(
    (onSuccess: () => void) => {
      if (!qrCode) return;

      Alert.alert(
        'Delete QR Code',
        `Are you sure you want to delete "${qrCode.label}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                const db = await databaseService.getDatabase();
                await db.write(async () => {
                  await qrCode.destroyPermanently();
                });

                Alert.alert('Success', 'QR code deleted successfully', [
                  { text: 'OK', onPress: onSuccess },
                ]);
              } catch (error) {
                console.error('Error deleting QR code:', error);
                Alert.alert('Error', 'Failed to delete QR code. Please try again.');
              }
            },
          },
        ],
      );
    },
    [qrCode],
  );

  return {
    qrCode,
    isLoading,
    fullScreenVisible,
    handleViewFullScreen,
    handleCloseFullScreen,
    handleShare,
    handleDelete,
    getTypeColor,
    getTypeLabel,
    formatDate: formatQRDate,
  };
}

export default useQRDetail;
