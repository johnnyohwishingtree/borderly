import { useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Plane } from 'lucide-react-native';
import { useTripStore } from '../../stores/useTripStore';
import { TripCard } from '../../components/trips';
import { EmptyState } from '../../components/ui';
import LoadingStates, { useLoadingState } from '../../components/ui/LoadingStates';
import { HapticFeedback } from '../../components/ui/HapticFeedback';
import { Trip } from '../../types/trip';

export default function TripListScreen() {
  const navigation = useNavigation();
  const { 
    trips, 
    isLoading, 
    isLoadingMore, 
    error, 
    hasMoreTrips, 
    loadTrips, 
    loadMoreTrips 
  } = useTripStore();
  
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
  }, [fetchTrips]);

  const handleTripPress = (trip: Trip) => {
    HapticFeedback.navigation();
    (navigation as any).navigate('TripDetail', { tripId: trip.id });
  };

  const handleCreateTrip = () => {
    HapticFeedback.button('large');
    (navigation as any).navigate('CreateTrip');
  };

  const handleRefresh = async () => {
    HapticFeedback.refresh();
    await fetchTrips();
  };

  const renderTripCard = ({ item }: { item: Trip }) => (
    <TripCard 
      trip={item}
      onPress={() => handleTripPress(item)}
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
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-6 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-gray-900">Your Trips</Text>
            <Text className="text-base text-gray-600 mt-1">
              {trips.length === 0 
                ? 'Manage your travel itineraries' 
                : `${trips.length} trip${trips.length > 1 ? 's' : ''}`
              }
            </Text>
          </View>
          {trips.length > 0 && (
            <TouchableOpacity
              onPress={handleCreateTrip}
              className="bg-blue-600 px-4 py-2 rounded-full min-h-[44px] min-w-[44px] items-center justify-center"
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
            if (!hasMoreTrips && trips.length > 0) {
              return (
                <View className="py-4 items-center">
                  <Text className="text-gray-500 text-sm">No more trips to show</Text>
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

      {/* Floating Action Button */}
      {trips.length > 0 && (
        <TouchableOpacity
          onPress={handleCreateTrip}
          className="absolute bottom-6 right-6 bg-blue-600 w-14 h-14 rounded-full items-center justify-center shadow-lg"
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
      )}
    </View>
  );
}
