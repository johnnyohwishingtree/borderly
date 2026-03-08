import { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { trigger } from 'react-native-haptic-feedback';
import { useTripStore } from '../../stores/useTripStore';
import { TripCard } from '../../components/trips';
import { LoadingSpinner, EmptyState, SkeletonList, PullToRefreshFlatList } from '../../components/ui';
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

  useEffect(() => {
    loadTrips({ refresh: true });
  }, []);

  const handleTripPress = (trip: Trip) => {
    // Navigate to trip detail screen
    (navigation as any).navigate('TripDetail', { tripId: trip.id });
  };

  const handleCreateTrip = () => {
    trigger('impactLight', { enableVibrateFallback: true });
    (navigation as any).navigate('CreateTrip');
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
      icon={<Text className="text-4xl">✈️</Text>}
      title="No trips yet"
      description="Create your first trip to start planning your travel declarations"
      buttonProps={{
        title: "Create Your First Trip",
        onPress: handleCreateTrip,
        variant: "primary",
        size: "large"
      }}
      variant="illustration"
    />
  );

  const renderErrorState = () => (
    <EmptyState
      icon={<Text className="text-4xl text-red-600">⚠️</Text>}
      title="Something went wrong"
      description={error || "Unable to load your trips. Please try again."}
      buttonProps={{
        title: "Try Again",
        onPress: loadTrips,
        variant: "outline"
      }}
      variant="default"
    />
  );

  if (isLoading && trips.length === 0) {
    return (
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white px-4 py-6 border-b border-gray-100">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-gray-900">Your Trips</Text>
              <Text className="text-base text-gray-600 mt-1">
                Loading your itineraries...
              </Text>
            </View>
          </View>
        </View>
        
        {/* Skeleton Loading */}
        <View className="flex-1 px-4 pt-4">
          <SkeletonList 
            itemCount={3}
            lines={4}
            spacing="normal"
            className="space-y-4"
          />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-gray-50">
        {/* Header */}
        <View className="bg-white px-4 py-6 border-b border-gray-100">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-gray-900">Your Trips</Text>
              <Text className="text-base text-gray-600 mt-1">
                Unable to load trips
              </Text>
            </View>
          </View>
        </View>
        
        {renderErrorState()}
      </View>
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
        <PullToRefreshFlatList
          data={trips}
          renderItem={renderTripCard}
          keyExtractor={(item: Trip) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          refreshing={isLoading && trips.length > 0}
          onRefresh={() => loadTrips({ refresh: true })}
          onEndReached={() => {
            if (hasMoreTrips && !isLoadingMore) {
              loadMoreTrips();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={() => {
            if (isLoadingMore) {
              return (
                <View className="py-4 items-center">
                  <LoadingSpinner size="small" text="Loading more trips..." variant="spinner" />
                </View>
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
          hapticFeedback={true}
          title="Refreshing trips..."
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
