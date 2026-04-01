import { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Modal,
} from 'react-native';
import { Smartphone, Filter, Users, X } from 'lucide-react-native';
import { EmptyState, Button, ScreenContainer } from '@/components/ui';
import LoadingStates from '@/components/ui/LoadingStates';
import { QRCodeCard, QRFullScreen } from '@/components/wallet';
import { ContextualHelp, HelpContent } from '@/components/help';
import { useAccessibilityFocus } from '@/hooks/useAccessibilityFocus';
import { useQRWallet } from '@/hooks/useQRWallet';

export default function QRWalletScreen() {
  const filterTriggerRef = useRef<React.ElementRef<typeof TouchableOpacity>>(null);
  const { ref: filterModalTitleRef } = useAccessibilityFocus({ shouldFocus: false, delay: 350 });

  const {
    data: { qrCodes, filteredQRCodes, travelers },
    loading: { state, error, isRefreshing, onRefresh, handleRetry },
    fullScreen: { selectedQR, fullScreenVisible, handleQRPress, handleCloseFullScreen },
    filter: {
      selectedTravelerFilter,
      setSelectedTravelerFilter,
      showFilterModal,
      setShowFilterModal,
      handleCloseFilterModal,
    },
    actions: { handleQRLongPress, handleDeleteQR, handleAddQR },
  } = useQRWallet({ filterTriggerRef });

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
      <ScreenContainer className="bg-surface-secondary">
        {/* Header */}
        <View className="bg-surface px-4 py-6 border-b border-border-default">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-base text-secondary">
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
    <ScreenContainer className="bg-surface-secondary">
      {/* Header */}
      <View className="bg-surface px-4 py-6 border-b border-border-default">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-base text-secondary">
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
                <Text className="text-sm text-accent mr-1">Clear filter</Text>
                <X size={14} color="#2563eb" />
              </TouchableOpacity>
            )}
          </View>

          {travelers.size > 1 && (
            <TouchableOpacity
              ref={filterTriggerRef}
              onPress={() => setShowFilterModal(true)}
              className="bg-surface-tertiary rounded-full items-center justify-center mr-3"
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
          <View className="bg-surface rounded-t-xl p-4">
            <View className="flex-row items-center justify-between mb-4">
              <Text
                ref={filterModalTitleRef}
                className="text-lg font-semibold text-primary"
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
                    : 'bg-surface-secondary border-border-default'
                }`}
              >
                <View className="flex-row items-center">
                  <Users size={20} color={!selectedTravelerFilter ? "#3B82F6" : "#6b7280"} />
                  <Text className={`ml-3 font-medium ${
                    !selectedTravelerFilter ? 'text-accent' : 'text-primary'
                  }`}>
                    All Travelers
                  </Text>
                  <Text className="ml-auto text-sm text-tertiary">
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
                        : 'bg-surface-secondary border-border-default'
                    }`}
                  >
                    <View className="flex-row items-center">
                      <View className={`w-8 h-8 rounded-full items-center justify-center ${
                        isSelected ? 'bg-blue-500' : 'bg-gray-300'
                      }`}>
                        <Text className={`text-sm font-bold ${
                          isSelected ? 'text-white' : 'text-secondary'
                        }`}>
                          {traveler.givenNames.charAt(0)}
                        </Text>
                      </View>
                      <View className="ml-3 flex-1">
                        <Text className={`font-medium ${
                          isSelected ? 'text-accent' : 'text-primary'
                        }`}>
                          {traveler.givenNames} {traveler.surname}
                        </Text>
                        <Text className={`text-sm ${
                          isSelected ? 'text-accent' : 'text-tertiary'
                        }`}>
                          {traveler.relationship === 'self' ? 'Primary' : traveler.relationship}
                        </Text>
                      </View>
                      <Text className="text-sm text-tertiary">
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
                      : 'bg-surface-secondary border-border-default'
                  }`}
                >
                  <View className="flex-row items-center">
                    <View className={`w-8 h-8 rounded-full items-center justify-center ${
                      selectedTravelerFilter === 'unassigned' ? 'bg-blue-500' : 'bg-gray-300'
                    }`}>
                      <Text className={`text-sm font-bold ${
                        selectedTravelerFilter === 'unassigned' ? 'text-white' : 'text-secondary'
                      }`}>
                        ?
                      </Text>
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className={`font-medium ${
                        selectedTravelerFilter === 'unassigned' ? 'text-accent' : 'text-primary'
                      }`}>
                        Unassigned
                      </Text>
                      <Text className={`text-sm ${
                        selectedTravelerFilter === 'unassigned' ? 'text-accent' : 'text-tertiary'
                      }`}>
                        No traveler specified
                      </Text>
                    </View>
                    <Text className="text-sm text-tertiary">
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
        onClose={handleCloseFullScreen}
        onDelete={handleDeleteQR}
      />
    </ScreenContainer>
  );
}
