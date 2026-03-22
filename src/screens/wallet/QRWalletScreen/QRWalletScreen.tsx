import { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActionSheetIOS,
  Platform,
  ScrollView,
  RefreshControl,
  Modal,
  AccessibilityInfo,
  findNodeHandle,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Smartphone, Filter, Users, X } from 'lucide-react-native';
import { EmptyState, Button, ScreenContainer } from '@/components/ui';
import LoadingStates, { useLoadingState } from '@/components/ui/LoadingStates';
import { HapticFeedback } from '@/components/ui/HapticFeedback';
import { QRCodeCard, QRFullScreen } from '@/components/wallet';
import { ContextualHelp, HelpContent } from '@/components/help';
import { SavedQRCode } from '@/services/storage/models';
import { useNavigation } from '@react-navigation/native';
import { databaseService } from '@/services/storage';
import { useProfileStore } from '@/stores/useProfileStore';
import type { TravelerProfile } from '@/types/profile';
import { useAccessibilityFocus } from '@/hooks/useAccessibilityFocus';

export default function QRWalletScreen() {
  const [qrCodes, setQrCodes] = useState<SavedQRCode[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedQR, setSelectedQR] = useState<SavedQRCode | null>(null);
  const [fullScreenVisible, setFullScreenVisible] = useState(false);
  const [travelers, setTravelers] = useState<Map<string, TravelerProfile>>(new Map());
  const [selectedTravelerFilter, setSelectedTravelerFilter] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const navigation = useNavigation();
  const { getAllProfiles } = useProfileStore();

  // Accessibility: focus management for filter modal
  const filterTriggerRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);
  const { ref: filterModalTitleRef } = useAccessibilityFocus({ shouldFocus: showFilterModal, delay: 350 });

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
  const loadQRCodes = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading();

      // Load traveler profiles
      const profilesMap = await getAllProfiles();
      setTravelers(profilesMap);

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
    } catch (err) {
      console.error('Error loading QR codes:', err);
      setLoadingError(err instanceof Error ? err.message : 'Failed to load QR codes');
    } finally {
      setIsRefreshing(false);
    }
  }, [getAllProfiles, setLoading, setLoadingSuccess, setLoadingError]);

  // Load QR codes when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadQRCodes(true);
    }, [loadQRCodes])
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
      const tag = findNodeHandle(filterTriggerRef.current as unknown as React.Component<unknown, unknown>);
      if (tag != null) AccessibilityInfo.setAccessibilityFocus(tag);
    }, 100);
  }, []);

  // Filter QR codes by selected traveler
  const filteredQRCodes = useMemo(() => {
    if (!selectedTravelerFilter) return qrCodes;
    if (selectedTravelerFilter === 'unassigned') {
      return qrCodes.filter(qr => !qr.travelerId);
    }
    return qrCodes.filter(qr => qr.travelerId === selectedTravelerFilter);
  }, [qrCodes, selectedTravelerFilter]);


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
            } catch (err) {
              console.error('Error deleting QR code:', err);
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
      <ScreenContainer className="bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <View className="bg-white dark:bg-gray-800 px-4 py-6 border-b border-gray-100 dark:border-gray-700">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-900 dark:text-white">QR Wallet</Text>
              <Text className="text-base text-gray-600 dark:text-gray-400 mt-1">
                Your saved entry codes
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleAddQR}
              className="bg-blue-600 dark:bg-blue-500 rounded-full items-center justify-center"
              style={{ width: 44, height: 44 }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Add QR code"
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
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer className="bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <View className="bg-white dark:bg-gray-800 px-4 py-6 border-b border-gray-100 dark:border-gray-700">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">QR Wallet</Text>
            <Text className="text-base text-gray-600 dark:text-gray-400 mt-1">
              {selectedTravelerFilter
                ? `${filteredQRCodes.length} code${filteredQRCodes.length !== 1 ? 's' : ''} for ${travelers.get(selectedTravelerFilter)?.givenNames || 'Unknown'}`
                : `${qrCodes.length} saved code${qrCodes.length !== 1 ? 's' : ''}`
              }
            </Text>
            {selectedTravelerFilter && (
              <TouchableOpacity
                onPress={() => setSelectedTravelerFilter(null)}
                className="mt-1 flex-row items-center"
                style={{ minHeight: 44 }}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Clear traveler filter"
              >
                <Text className="text-sm text-blue-600 dark:text-blue-400 mr-1">Clear filter</Text>
                <X size={14} color="#2563eb" />
              </TouchableOpacity>
            )}
          </View>

          {travelers.size > 1 && (
            <TouchableOpacity
              ref={filterTriggerRef}
              onPress={() => setShowFilterModal(true)}
              className="bg-gray-100 dark:bg-gray-700 rounded-full items-center justify-center mr-3"
              style={{ width: 44, height: 44 }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel="Filter QR codes by traveler"
            >
              <Filter size={20} color="#6b7280" />
            </TouchableOpacity>
          )}

          <ContextualHelp
            content={HelpContent.qrWallet}
            variant="icon"
            size="medium"
          />

          <TouchableOpacity
            onPress={handleAddQR}
            className="bg-blue-600 dark:bg-blue-500 rounded-full items-center justify-center"
            style={{ width: 44, height: 44 }}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Add QR code"
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
          {filteredQRCodes.map((qrCode) => (
            <QRCodeCard
              key={qrCode.id}
              qrCode={qrCode}
              onPress={handleQRPress}
              onLongPress={handleQRLongPress}
              showTravelerInfo={true}
              travelerName={qrCode.travelerId ? travelers.get(qrCode.travelerId)?.givenNames || 'Unknown' : 'Unassigned'}
            />
          ))}
        </View>

        {/* Bottom spacing */}
        <View className="h-20" />
      </ScrollView>

      {/* Family Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseFilterModal}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white dark:bg-gray-800 rounded-t-xl p-4">
            <View className="flex-row items-center justify-between mb-4">
              <Text
                ref={filterModalTitleRef}
                className="text-lg font-semibold text-gray-900 dark:text-white"
                accessibilityRole="header"
              >
                Filter by Traveler
              </Text>
              <TouchableOpacity
                onPress={handleCloseFilterModal}
                className="items-center justify-center"
                style={{ width: 44, height: 44 }}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Close filter"
              >
                <X size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView className="max-h-80">
              {/* All travelers option */}
              <TouchableOpacity
                onPress={() => {
                  setSelectedTravelerFilter(null);
                  handleCloseFilterModal();
                }}
                className={`p-4 rounded-lg border mb-2 ${
                  !selectedTravelerFilter
                    ? 'bg-blue-50 dark:bg-blue-950 border-blue-500'
                    : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                }`}
              >
                <View className="flex-row items-center">
                  <Users size={20} color={!selectedTravelerFilter ? "#3B82F6" : "#6b7280"} />
                  <Text className={`ml-3 font-medium ${
                    !selectedTravelerFilter ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'
                  }`}>
                    All Travelers
                  </Text>
                  <Text className="ml-auto text-sm text-gray-500 dark:text-gray-400">
                    {qrCodes.length} codes
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Individual travelers */}
              {Array.from(travelers.values()).map((traveler) => {
                const travelerQRCount = qrCodes.filter(qr => qr.travelerId === traveler.id).length;
                const isSelected = selectedTravelerFilter === traveler.id;

                return (
                  <TouchableOpacity
                    key={traveler.id}
                    onPress={() => {
                      setSelectedTravelerFilter(traveler.id);
                      handleCloseFilterModal();
                    }}
                    className={`p-4 rounded-lg border mb-2 ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950 border-blue-500'
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <View className="flex-row items-center">
                      <View className={`w-8 h-8 rounded-full items-center justify-center ${
                        isSelected ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-500'
                      }`}>
                        <Text className={`text-sm font-bold ${
                          isSelected ? 'text-white' : 'text-gray-600 dark:text-gray-200'
                        }`}>
                          {traveler.givenNames.charAt(0)}
                        </Text>
                      </View>
                      <View className="ml-3 flex-1">
                        <Text className={`font-medium ${
                          isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'
                        }`}>
                          {traveler.givenNames} {traveler.surname}
                        </Text>
                        <Text className={`text-sm ${
                          isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {traveler.relationship === 'self' ? 'Primary' : traveler.relationship}
                        </Text>
                      </View>
                      <Text className="text-sm text-gray-500 dark:text-gray-400">
                        {travelerQRCount} code{travelerQRCount !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {/* Unassigned QR codes */}
              {qrCodes.some(qr => !qr.travelerId) && (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedTravelerFilter('unassigned');
                    handleCloseFilterModal();
                  }}
                  className={`p-4 rounded-lg border mb-2 ${
                    selectedTravelerFilter === 'unassigned'
                      ? 'bg-blue-50 dark:bg-blue-950 border-blue-500'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <View className="flex-row items-center">
                    <View className={`w-8 h-8 rounded-full items-center justify-center ${
                      selectedTravelerFilter === 'unassigned' ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-500'
                    }`}>
                      <Text className={`text-sm font-bold ${
                        selectedTravelerFilter === 'unassigned' ? 'text-white' : 'text-gray-600 dark:text-gray-200'
                      }`}>
                        ?
                      </Text>
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className={`font-medium ${
                        selectedTravelerFilter === 'unassigned' ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'
                      }`}>
                        Unassigned
                      </Text>
                      <Text className={`text-sm ${
                        selectedTravelerFilter === 'unassigned' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        No traveler specified
                      </Text>
                    </View>
                    <Text className="text-sm text-gray-500 dark:text-gray-400">
                      {qrCodes.filter(qr => !qr.travelerId).length} codes
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
    </ScreenContainer>
  );
}
