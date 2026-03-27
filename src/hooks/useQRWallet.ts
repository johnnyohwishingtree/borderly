import { useState, useCallback, useMemo } from 'react';
import {
  Alert,
  ActionSheetIOS,
  Platform,
  AccessibilityInfo,
  findNodeHandle,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useLoadingState } from '@/components/ui/LoadingStates';
import { HapticFeedback } from '@/components/ui/HapticFeedback';
import { SavedQRCode } from '@/services/storage/models';
import { databaseService } from '@/services/storage';
import { useProfileStore } from '@/stores/useProfileStore';
import type { TravelerProfile } from '@/types/profile';

interface UseQRWalletOptions {
  filterTriggerRef: React.RefObject<any>;
}

export function useQRWallet({ filterTriggerRef }: UseQRWalletOptions) {
  const [qrCodes, setQrCodes] = useState<SavedQRCode[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedQR, setSelectedQR] = useState<SavedQRCode | null>(null);
  const [fullScreenVisible, setFullScreenVisible] = useState(false);
  const [travelers, setTravelers] = useState<Map<string, TravelerProfile>>(
    new Map(),
  );
  const [selectedTravelerFilter, setSelectedTravelerFilter] = useState<
    string | null
  >(null);
  const [showFilterModal, setShowFilterModal] = useState(false);

  const navigation = useNavigation();
  const { getAllProfiles } = useProfileStore();

  const {
    state,
    error,
    setLoading,
    setLoadingError,
    setLoadingSuccess,
    reset,
    retry,
  } = useLoadingState();

  // Load QR codes from database
  const loadQRCodes = useCallback(
    async (showLoading = false) => {
      try {
        if (showLoading) setLoading();

        // Load traveler profiles
        const profilesMap = await getAllProfiles();
        setTravelers(profilesMap);

        const db = await databaseService.getDatabase();
        const qrCodesCollection =
          db.collections.get<SavedQRCode>('saved_qr_codes');
        const allQRCodes = await qrCodesCollection.query().fetch();

        // Sort by saved date, most recent first
        const sortedQRCodes = allQRCodes.sort(
          (a: SavedQRCode, b: SavedQRCode) =>
            b.savedAt.getTime() - a.savedAt.getTime(),
        );

        setQrCodes(sortedQRCodes);
        setLoadingSuccess();
      } catch (err) {
        console.error('Error loading QR codes:', err);
        setLoadingError(
          err instanceof Error ? err.message : 'Failed to load QR codes',
        );
      } finally {
        setIsRefreshing(false);
      }
    },
    [getAllProfiles, setLoading, setLoadingSuccess, setLoadingError],
  );

  // Load QR codes when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadQRCodes(true);
    }, [loadQRCodes]),
  );

  // Pull to refresh
  const onRefresh = useCallback(() => {
    HapticFeedback.refresh();
    setIsRefreshing(true);
    reset();
    loadQRCodes();
  }, [reset, loadQRCodes]);

  const handleRetry = useCallback(() => {
    retry();
    loadQRCodes(true);
  }, [retry, loadQRCodes]);

  // Close filter modal and return focus to the trigger button
  const handleCloseFilterModal = useCallback(() => {
    setShowFilterModal(false);
    setTimeout(() => {
      const tag = findNodeHandle(
        filterTriggerRef.current as unknown as React.Component<
          unknown,
          unknown
        >,
      );
      if (tag != null) AccessibilityInfo.setAccessibilityFocus(tag);
    }, 100);
  }, [filterTriggerRef]);

  // Filter QR codes by selected traveler
  const filteredQRCodes = useMemo(() => {
    if (!selectedTravelerFilter) return qrCodes;
    if (selectedTravelerFilter === 'unassigned') {
      return qrCodes.filter((qr) => !qr.travelerId);
    }
    return qrCodes.filter((qr) => qr.travelerId === selectedTravelerFilter);
  }, [qrCodes, selectedTravelerFilter]);

  // Handle QR code deletion
  const handleDeleteQR = useCallback(
    async (qrCode: SavedQRCode) => {
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
              } catch (err) {
                console.error('Error deleting QR code:', err);
                Alert.alert(
                  'Error',
                  'Failed to delete QR code. Please try again.',
                );
              }
            },
          },
        ],
      );
    },
    [loadQRCodes],
  );

  // Handle QR code press (show full screen)
  const handleQRPress = useCallback((qrCode: SavedQRCode) => {
    HapticFeedback.card();
    setSelectedQR(qrCode);
    setFullScreenVisible(true);
  }, []);

  // Handle QR code long press (show options)
  const handleQRLongPress = useCallback(
    (qrCode: SavedQRCode) => {
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
          },
        );
      } else {
        Alert.alert(qrCode.label, 'Choose an action', [
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
        ]);
      }
    },
    [handleQRPress, handleDeleteQR],
  );

  // Navigate to Add QR screen
  const handleAddQR = useCallback(() => {
    HapticFeedback.button('medium');
    navigation.navigate('AddQR' as never);
  }, [navigation]);

  // Close full screen display
  const handleCloseFullScreen = useCallback(() => {
    setFullScreenVisible(false);
    setSelectedQR(null);
  }, []);

  return {
    data: { qrCodes, filteredQRCodes, travelers },
    loading: { state, error, isRefreshing, loadQRCodes, onRefresh, handleRetry },
    fullScreen: { selectedQR, fullScreenVisible, handleQRPress, handleCloseFullScreen },
    filter: {
      selectedTravelerFilter,
      setSelectedTravelerFilter,
      showFilterModal,
      setShowFilterModal,
      handleCloseFilterModal,
    },
    actions: { handleQRLongPress, handleDeleteQR, handleAddQR },
  };
}
