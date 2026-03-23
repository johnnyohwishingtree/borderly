import { useEffect, useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, RefreshControl, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Plane } from 'lucide-react-native';
import { useTripStore } from '@/stores/useTripStore';
import { useAppStore } from '@/stores/useAppStore';
import { TripCard, DuplicateTripModal } from '@/components/trips';
import { EmptyState, InfoBanner, ScreenContainer } from '@/components/ui';
import LoadingStates, { useLoadingState } from '@/components/ui/LoadingStates';
import { HapticFeedback } from '@/components/ui/HapticFeedback';
import { Trip } from '@/types/trip';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export default function TripListScreen() {
  const navigation = useNavigation();
  const {
    trips,
    isLoading,
    isLoadingMore,
    error,
    hasMoreTrips,
    loadTrips,
    loadMoreTrips,
    deleteTrip,
    duplicateTrip,
  } = useTripStore();

  const [duplicateTargetId, setDuplicateTargetId] = useState<string | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);

  const {
    lastSchemaRefreshTime,
    schemaRefreshCountries,
    schemaBannerDismissedAt,
    dismissSchemaBanner,
    loadPersistedAppState,
    hasSeenFirstRunPrompt,
    dismissFirstRunPrompt,
  } = useAppStore();

  const {
    state,
    setLoading,
    setLoadingError,
    setLoadingSuccess,
    reset,
  } = useLoadingState();

  const fetchTrips = useCallback(async () => {
    setLoading();
    try {
      await loadTrips({ refresh: true });
      setLoadingSuccess();
    } catch (err) {
      setLoadingError(err instanceof Error ? err.message : 'Failed to load trips');
    }
  }, [setLoading, loadTrips, setLoadingSuccess, setLoadingError]);

  useEffect(() => {
    fetchTrips();
    loadPersistedAppState();
  }, [fetchTrips, loadPersistedAppState]);

  /**
   * The "schemas updated" banner should show when:
   * 1. An OTA schema refresh has occurred (lastSchemaRefreshTime !== null), AND
   * 2. The refresh was within the last 24 hours, AND
   * 3. The user has not dismissed the banner since the last refresh.
   */
  const showSchemaBanner =
    lastSchemaRefreshTime !== null &&
    Date.now() - lastSchemaRefreshTime < TWENTY_FOUR_HOURS_MS &&
    (schemaBannerDismissedAt === null || schemaBannerDismissedAt < lastSchemaRefreshTime);

  const schemaBannerMessage = (() => {
    if (schemaRefreshCountries.length === 0) {
      return 'Form data updated — country entry forms have new fields.';
    }
    if (schemaRefreshCountries.length === 1) {
      return `Form data updated — ${schemaRefreshCountries[0]} entry form has new fields.`;
    }
    const listed = schemaRefreshCountries.slice(0, 2).join(' & ');
    const extra = schemaRefreshCountries.length > 2 ? ` and ${schemaRefreshCountries.length - 2} more` : '';
    return `Form data updated — ${listed}${extra} entry forms have new fields.`;
  })();

  const handleTripPress = (trip: Trip) => {
    HapticFeedback.navigation();
    (navigation as any).navigate('TripDetail', { tripId: trip.id });
  };

  const handleCreateTrip = () => {
    HapticFeedback.button('large');
    (navigation as any).navigate('CreateTrip');
  };

  const handleCreateFromTemplate = () => {
    HapticFeedback.button('medium');
    (navigation as any).navigate('Templates');
  };

  const handleRefresh = async () => {
    HapticFeedback.refresh();
    await fetchTrips();
  };

  const handleDeleteTrip = useCallback((trip: Trip) => {
    Alert.alert(
      'Delete Trip',
      `Are you sure you want to delete "${trip.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTrip(trip.id);
            } catch {
              Alert.alert('Error', 'Failed to delete trip');
            }
          },
        },
      ],
    );
  }, [deleteTrip]);

  const handleOpenDuplicateModal = useCallback((trip: Trip) => {
    setDuplicateError(null);
    setDuplicateTargetId(trip.id);
  }, []);

  const handleCloseDuplicateModal = useCallback(() => {
    setDuplicateTargetId(null);
    setDuplicateError(null);
  }, []);

  const handleConfirmDuplicate = useCallback(async (newDepartureDate: string) => {
    if (!duplicateTargetId) {return;}
    setIsDuplicating(true);
    setDuplicateError(null);
    try {
      const newTrip = await duplicateTrip(duplicateTargetId, newDepartureDate);
      setDuplicateTargetId(null);
      (navigation as any).navigate('TripDetail', { tripId: newTrip.id });
    } catch {
      setDuplicateError('Failed to duplicate trip. Please try again.');
    } finally {
      setIsDuplicating(false);
    }
  }, [duplicateTargetId, duplicateTrip, navigation]);

  const renderTripCard = ({ item }: { item: Trip }) => (
    <TripCard
      trip={item}
      onPress={() => handleTripPress(item)}
      onDuplicate={() => handleOpenDuplicateModal(item)}
      onDelete={() => handleDeleteTrip(item)}
      showProgress={true}
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
        testID: "create-first-trip-button",
      }}
      secondaryButtonProps={{
        title: "Use a Template",
        onPress: handleCreateFromTemplate,
        variant: "outline",
        size: "large",
        testID: "use-template-button",
      }}
      variant="illustration"
    />
  );


  // Handle loading states
  if (state === 'loading' && trips.length === 0) {
    return (
      <LoadingStates
        state="loading"
        variant="spinner"
        size="medium"
        text="Loading your trips..."
        fullScreen={true}
        onCancel={() => reset()}
        cancelable={true}
      />
    );
  }

  if (state === 'error' || error) {
    return (
      <LoadingStates
        state="error"
        fullScreen={true}
        errorMessage={error || 'Failed to load trips'}
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
          testID="first-run-welcome-banner"
        />
      )}

      {/* Schema update banner */}
      {showSchemaBanner && (
        <InfoBanner
          message={schemaBannerMessage}
          onDismiss={dismissSchemaBanner}
          testID="schema-update-banner"
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
              onPress={handleCreateFromTemplate}
              className="bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg min-h-[44px] items-center justify-center"
              activeOpacity={0.7}
              testID="templates-nav-button"
              accessibilityRole="button"
              accessibilityLabel="Create trip from template"
              accessibilityHint="Choose a saved template to pre-fill destinations"
            >
              <Text className="text-gray-700 dark:text-gray-300 font-medium text-sm">From Template</Text>
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

      {/* Trip List */}
      {trips.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={trips}
          renderItem={renderTripCard}
          keyExtractor={(item: Trip) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
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
          getItemLayout={(_: any, index: number) => ({
            length: 200, // Approximate height of TripCard
            offset: 200 * index,
            index,
          })}
        />
      )}

      {/* Floating Action Buttons */}
      {trips.length > 0 && (
        <View className="absolute bottom-20 right-6 items-end space-y-3">
          <TouchableOpacity
            onPress={handleCreateFromTemplate}
            className="bg-white dark:bg-gray-700 px-4 h-11 rounded-full items-center justify-center shadow-md flex-row"
            activeOpacity={0.8}
            testID="fab-from-template-button"
            accessibilityRole="button"
            accessibilityLabel="Create trip from template"
            accessibilityHint="Choose a saved template to pre-fill destinations"
          >
            <Text className="text-gray-700 dark:text-gray-200 font-medium text-sm">From Template</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleCreateTrip}
            className="bg-blue-600 dark:bg-blue-500 w-14 h-14 rounded-full items-center justify-center shadow-lg"
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Create new trip"
            accessibilityHint="Add a new travel itinerary"
            style={{
              minHeight: 56, // Minimum 56x56 for floating action button
              minWidth: 56,
            }}
          >
            <Text className="text-white text-2xl font-light">+</Text>
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
        testID="trip-list-duplicate-trip-modal"
      />
    </ScreenContainer>
  );
}
