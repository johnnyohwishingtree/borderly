import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTripStore } from '../../stores/useTripStore';
import { TripCard } from '../../components/trips';
import { Button } from '../../components/ui';
import { Trip } from '../../types/trip';

export default function TripListScreen() {
  const navigation = useNavigation();
  const { trips, isLoading, error, loadTrips } = useTripStore();

  useEffect(() => {
    loadTrips();
  }, []);

  const handleTripPress = (trip: Trip) => {
    // Navigate to trip detail screen
    (navigation as any).navigate('TripDetail', { tripId: trip.id });
  };

  const handleCreateTrip = () => {
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
    <View className="flex-1 justify-center items-center px-6">
      <View className="items-center mb-8">
        <Text className="text-6xl mb-4">✈️</Text>
        <Text className="text-xl font-bold text-gray-900 mb-2 text-center">
          No trips yet
        </Text>
        <Text className="text-base text-gray-600 text-center mb-6">
          Create your first trip to start planning your travel declarations
        </Text>
        <Button
          title="Create Your First Trip"
          onPress={handleCreateTrip}
          variant="primary"
          size="large"
        />
      </View>
    </View>
  );

  const renderErrorState = () => (
    <View className="flex-1 justify-center items-center px-6">
      <Text className="text-xl font-bold text-red-600 mb-2">Error</Text>
      <Text className="text-base text-gray-600 text-center mb-4">{error}</Text>
      <Button
        title="Try Again"
        onPress={loadTrips}
        variant="outline"
      />
    </View>
  );

  if (error) {
    return (
      <View className="flex-1 bg-gray-50">
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
              className="bg-blue-600 px-4 py-2 rounded-full"
              activeOpacity={0.7}
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
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          refreshing={isLoading}
          onRefresh={loadTrips}
        />
      )}

      {/* Floating Action Button */}
      {trips.length > 0 && (
        <TouchableOpacity
          onPress={handleCreateTrip}
          className="absolute bottom-6 right-6 bg-blue-600 w-14 h-14 rounded-full items-center justify-center shadow-lg"
          activeOpacity={0.8}
        >
          <Text className="text-white text-2xl font-light">+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
