import { View, Text, TextInput, TouchableOpacity, FlatList, RefreshControl, ScrollView } from 'react-native';
import { Plane, Search, X, FileDown } from 'lucide-react-native';
import { useTripFilter, TripStatusFilter } from '@/hooks/useTripFilter';
import { useTripList } from '@/hooks/useTripList';
import { TripCard, DuplicateTripModal, DeadlineSummary } from '@/components/trips';
import { EmptyState, InfoBanner, ScreenContainer } from '@/components/ui';
import LoadingStates from '@/components/ui/LoadingStates';
import { Trip } from '@/types/trip';
import { TRIP_LIST_IDS } from './testIDs';

const FILTER_TABS: { key: TripStatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'active', label: 'Active' },
  { key: 'completed', label: 'Completed' },
];

export default function TripListScreen() {
  const {
    trips,
    loading: {
      state: loadingState,
      storeError,
      isLoading,
      isLoadingMore,
      hasMoreTrips,
      loadMoreTrips,
      resetLoading,
      handleRefresh,
    },
    travelers: { travelersByTripId },
    deadlines: { urgencyByTripId, deadlineSummary },
    schemaBanner: { showSchemaBanner, schemaBannerMessage, dismissSchemaBanner },
    firstRun: { hasSeenFirstRunPrompt, dismissFirstRunPrompt },
    duplicate: {
      duplicateTargetId,
      isDuplicating,
      duplicateError,
      handleOpenDuplicateModal,
      handleCloseDuplicateModal,
      handleConfirmDuplicate,
    },
    navigation: {
      handleTripPress,
      handleCreateTrip,
      handleImportTrip,
      handleGoToForm,
      handleDeleteTrip,
    },
  } = useTripList();

  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    filteredTrips,
    hasActiveFilters,
    clearSearch,
  } = useTripFilter(trips);

  const renderTripCard = ({ item }: { item: Trip }) => (
    <TripCard
      trip={item}
      onPress={() => handleTripPress(item)}
      onDuplicate={() => handleOpenDuplicateModal(item)}
      onDelete={() => handleDeleteTrip(item)}
      showProgress={true}
      urgency={urgencyByTripId[item.id]}
      travelers={travelersByTripId[item.id]}
    />
  );

  const renderEmptyState = () => (
    <EmptyState
      icon={<Plane size={40} color="#6b7280" />}
      title="No trips yet"
      description="Create your first trip to start planning your travel declarations"
      buttonProps={{
        title: "Create Your First Trip",
        onPress: handleCreateTrip,
        variant: "primary",
        size: "large",
        testID: TRIP_LIST_IDS.createFirstTripButton.id,
      }}
      variant="illustration"
    />
  );

  // Handle loading states
  if (loadingState === 'loading' && trips.length === 0) {
    return (
      <LoadingStates
        state="loading"
        variant="spinner"
        size="medium"
        text="Loading your trips..."
        fullScreen={true}
        onCancel={() => resetLoading()}
        cancelable={true}
      />
    );
  }

  if (loadingState === 'error' || storeError) {
    return (
      <LoadingStates
        state="error"
        fullScreen={true}
        errorMessage={storeError || 'Failed to load trips'}
        onRetry={handleRefresh}
        showRetryButton={true}
        retryButtonText="Reload Trips"
      />
    );
  }

  return (
    <ScreenContainer className="bg-gray-50 dark:bg-gray-900">
      {/* First-run welcome banner — shown once after onboarding completes */}
      {!hasSeenFirstRunPrompt && (
        <InfoBanner
          message="You're all set! Create your first trip to get started."
          onDismiss={dismissFirstRunPrompt}
          testID={TRIP_LIST_IDS.firstRunWelcomeBanner.id}
        />
      )}

      {/* Schema update banner */}
      {showSchemaBanner && (
        <InfoBanner
          message={schemaBannerMessage}
          onDismiss={dismissSchemaBanner}
          testID={TRIP_LIST_IDS.schemaUpdateBanner.id}
        />
      )}

      {/* Header */}
      <View className="bg-white dark:bg-gray-800 px-4 py-6 border-b border-gray-100 dark:border-gray-700">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">Your Trips</Text>
            <Text className="text-base text-gray-600 dark:text-gray-400 mt-1">
              {trips.length === 0
                ? 'Manage your travel itineraries'
                : `${trips.length} trip${trips.length > 1 ? 's' : ''}`
              }
            </Text>
          </View>
          <View className="flex-row items-center gap-x-2">
            <TouchableOpacity
              onPress={handleImportTrip}
              className="bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg min-h-[44px] items-center justify-center"
              activeOpacity={0.7}
              testID={TRIP_LIST_IDS.importTripButton.id}
              accessibilityRole="button"
              accessibilityLabel="Import trip"
              accessibilityHint="Import a trip from a booking confirmation or boarding pass"
            >
              <FileDown size={16} color="#374151" />
            </TouchableOpacity>
            {trips.length > 0 && (
              <TouchableOpacity
                onPress={handleCreateTrip}
                className="bg-blue-600 dark:bg-blue-500 px-4 py-2 rounded-full min-h-[44px] min-w-[44px] items-center justify-center"
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Add new trip"
                accessibilityHint="Create a new travel itinerary"
              >
                <Text className="text-white font-semibold">+ Add Trip</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Search and Filter */}
      {trips.length > 0 && (
        <View className="bg-white dark:bg-gray-800 px-4 pb-3 border-b border-gray-100 dark:border-gray-700">
          {/* Search bar */}
          <View className="flex-row items-center bg-gray-100 dark:bg-gray-700 rounded-lg px-3 min-h-[44px]">
            <Search size={18} color="#9CA3AF" />
            <TextInput
              className="flex-1 ml-2 text-base text-gray-900 dark:text-gray-100 py-2"
              placeholder="Search trips..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              accessibilityLabel="Search trips"
              accessibilityHint="Filter trips by name"
              testID={TRIP_LIST_IDS.tripSearchField.id}
              returnKeyType="search"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={clearSearch}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                testID={TRIP_LIST_IDS.tripSearchClear.id}
              >
                <X size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Status filter tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-3"
            contentContainerStyle={{ gap: 8 }}
          >
            {FILTER_TABS.map(tab => {
              const isSelected = statusFilter === tab.key;
              return (
                <TouchableOpacity
                  key={tab.key}
                  onPress={() => setStatusFilter(tab.key)}
                  className={`px-4 py-1.5 rounded-full min-h-[36px] items-center justify-center ${
                    isSelected
                      ? 'bg-blue-600 dark:bg-blue-500'
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={`${tab.label} trips`}
                  testID={TRIP_LIST_IDS.tripFilterTab.id.replace('${key}', tab.key)}
                >
                  <Text
                    className={`text-sm font-medium ${
                      isSelected
                        ? 'text-white'
                        : 'text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Trip List */}
      {trips.length === 0 ? (
        renderEmptyState()
      ) : filteredTrips.length === 0 && hasActiveFilters ? (
        <EmptyState
          icon={<Search size={40} color="#6b7280" />}
          title="No trips match your search"
          description="Try a different search term or filter"
          variant="illustration"
        />
      ) : (
        <FlatList
          data={filteredTrips}
          renderItem={renderTripCard}
          keyExtractor={(item: Trip) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            deadlineSummary.hasUrgentItems ? (
              <DeadlineSummary
                items={deadlineSummary.items}
                isExpanded={deadlineSummary.isExpanded}
                onToggleExpanded={deadlineSummary.toggleExpanded}
                onGoToForm={handleGoToForm}
                testID={TRIP_LIST_IDS.tripListDeadlineSummary.id}
              />
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={isLoading && trips.length > 0}
              onRefresh={handleRefresh}
              tintColor="#3b82f6"
              colors={['#3b82f6']}
            />
          }
          onEndReached={() => {
            if (hasMoreTrips && !isLoadingMore) {
              loadMoreTrips();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() => {
            if (isLoadingMore) {
              return (
                <LoadingStates
                  state="loading"
                  variant="dots"
                  size="small"
                  text="Loading more trips..."
                  fullScreen={false}
                />
              );
            }
            if (!hasMoreTrips && trips.length >= 5) {
              return (
                <View className="py-4 items-center">
                  <Text className="text-gray-500 dark:text-gray-400 text-sm">No more trips to show</Text>
                </View>
              );
            }
            return null;
          }}
          accessibilityLabel="List of your trips"
          accessibilityHint="Swipe down to refresh, scroll to bottom to load more trips"
          initialNumToRender={10}
          maxToRenderPerBatch={5}
          windowSize={10}
          removeClippedSubviews={true}
          getItemLayout={(_data, index) => ({
            length: 200,
            offset: 200 * index,
            index,
          })}
        />
      )}

      {/* Floating Action Buttons */}
      {trips.length > 0 && (
        <View className="absolute bottom-20 right-6 items-end space-y-3">
          <TouchableOpacity
            onPress={handleCreateTrip}
            className="bg-blue-600 dark:bg-blue-500 w-14 h-14 rounded-full items-center justify-center shadow-lg"
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Create new trip"
            accessibilityHint="Add a new travel itinerary"
            style={{
              minHeight: 56,
              minWidth: 56,
            }}
          >
            <Text className="text-white text-2xl font-medium">+</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Duplicate Trip Modal */}
      <DuplicateTripModal
        visible={duplicateTargetId !== null}
        onClose={handleCloseDuplicateModal}
        onConfirm={handleConfirmDuplicate}
        loading={isDuplicating}
        error={duplicateError}
        testID={TRIP_LIST_IDS.tripListDuplicateTripModal.id}
      />
    </ScreenContainer>
  );
}
