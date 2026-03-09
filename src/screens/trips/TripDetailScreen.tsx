import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Map, Upload, ClipboardList, Trash2 } from 'lucide-react-native';
import { useTripStore } from '../../stores/useTripStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { LegCard } from '../../components/trips';
import { Button, StatusBadge } from '../../components/ui';
import { Trip, TripLeg } from '../../types/trip';
import { FamilyMember } from '../../types/profile';

interface RouteParams {
  tripId: string;
}

export default function TripDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { tripId } = route.params as RouteParams;
  
  const { getTripById, deleteTrip } = useTripStore();
  const { getAllProfiles, loadFamilyProfiles } = useProfileStore();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);

  useEffect(() => {
    const foundTrip = getTripById(tripId);
    setTrip(foundTrip || null);
  }, [tripId, getTripById]);

  // Load family members for traveler details
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        await loadFamilyProfiles();
        const profiles = await getAllProfiles();
        const members: FamilyMember[] = Array.from(profiles.values()).map(profile => ({
          ...profile,
          relationship: profile.relationship || 'self',
        }));
        setFamilyMembers(members);
      } catch (error) {
        console.error('Failed to load family profiles:', error);
      }
    };
    
    loadProfiles();
  }, [getAllProfiles, loadFamilyProfiles]);

  const handleLegPress = (leg: TripLeg) => {
    // Navigate to leg form screen
    (navigation as any).navigate('LegForm', { legId: leg.id });
  };

  const handleEditTrip = () => {
    // Navigate to edit trip screen or show edit modal
    Alert.alert('Edit Trip', 'Edit functionality coming soon');
  };

  const handleDeleteTrip = () => {
    Alert.alert(
      'Delete Trip',
      'Are you sure you want to delete this trip? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTrip(tripId);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete trip');
            }
          },
        },
      ]
    );
  };

  const handleAddDestination = () => {
    // Navigate to add destination screen
    Alert.alert('Add Destination', 'Add destination functionality coming soon');
  };

  const getOverallProgress = () => {
    if (!trip || trip.legs.length === 0) return { completed: 0, total: 0, percentage: 0 };
    
    const completed = trip.legs.filter(leg => 
      leg.formStatus === 'submitted' || leg.formStatus === 'ready'
    ).length;
    
    return {
      completed,
      total: trip.legs.length,
      percentage: (completed / trip.legs.length) * 100,
    };
  };

  const getStatusColor = (status: Trip['status']) => {
    switch (status) {
      case 'upcoming':
        return 'info';
      case 'active':
        return 'success';
      case 'completed':
        return 'neutral';
      default:
        return 'neutral';
    }
  };

  const getStatusText = (status: Trip['status']) => {
    switch (status) {
      case 'upcoming':
        return 'Upcoming';
      case 'active':
        return 'Active';
      case 'completed':
        return 'Completed';
      default:
        return 'Unknown';
    }
  };

  if (!trip) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Text className="text-lg text-gray-600">Trip not found</Text>
        <View className="mt-4">
          <Button
            title="Go Back"
            onPress={() => navigation.goBack()}
            variant="outline"
          />
        </View>
      </View>
    );
  }

  const progress = getOverallProgress();

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="bg-white px-4 py-6 border-b border-gray-100">
          <View className="flex-row items-start justify-between mb-4">
            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-900 mb-2">
                {trip.name}
              </Text>
              <Text className="text-base text-gray-600 mb-3">
                {trip.legs.length} destination{trip.legs.length > 1 ? 's' : ''}
              </Text>
              <StatusBadge 
                status={getStatusColor(trip.status)}
                text={getStatusText(trip.status)}
                size="medium"
              />
            </View>
            <TouchableOpacity
              onPress={handleEditTrip}
              className="ml-4 p-2"
              activeOpacity={0.7}
            >
              <Text className="text-blue-600 font-medium">Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Progress Overview */}
          {trip.legs.length > 0 && (
            <View className="bg-gray-50 rounded-lg p-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-sm font-medium text-gray-700">
                  Overall Progress
                </Text>
                <Text className="text-sm text-gray-600">
                  {progress.completed}/{progress.total} completed
                </Text>
              </View>
              <View className="bg-gray-200 rounded-full h-2">
                <View 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </View>
            </View>
          )}
        </View>

        {/* Trip Timeline */}
        <View className="px-4 py-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-xl font-bold text-gray-900">Itinerary</Text>
            <TouchableOpacity
              onPress={handleAddDestination}
              className="bg-blue-50 px-3 py-2 rounded-lg"
              activeOpacity={0.7}
            >
              <Text className="text-blue-600 font-medium text-sm">+ Add Destination</Text>
            </TouchableOpacity>
          </View>

          {trip.legs.length === 0 ? (
            <View className="bg-white rounded-lg p-6 items-center">
              <Map size={40} color="#6b7280" style={{ marginBottom: 12 }} />
              <Text className="text-lg font-semibold text-gray-900 mb-2">
                No destinations yet
              </Text>
              <Text className="text-base text-gray-600 text-center mb-4">
                Add your first destination to start planning your forms
              </Text>
              <Button
                title="Add Destination"
                onPress={handleAddDestination}
                variant="primary"
              />
            </View>
          ) : (
            <View>
              {trip.legs
                .sort((a, b) => a.order - b.order)
                .map((leg, index) => (
                  <View key={leg.id} className="relative">
                    <LegCard 
                      leg={leg}
                      onPress={() => handleLegPress(leg)}
                      showFormStatus={true}
                      familyMembers={familyMembers}
                      showTravelerDetails={true}
                    />
                    
                    {/* Timeline connector */}
                    {index < trip.legs.length - 1 && (
                      <View className="absolute left-8 top-20 w-0.5 h-4 bg-gray-300 z-10" />
                    )}
                  </View>
                ))}
            </View>
          )}
        </View>

        {/* Actions */}
        <View className="px-4 pb-8">
          <View className="bg-white rounded-lg p-4 space-y-3">
            <TouchableOpacity
              onPress={() => Alert.alert('Export', 'Export functionality coming soon')}
              className="flex-row items-center py-3 border-b border-gray-100"
              activeOpacity={0.7}
            >
              <Upload size={28} color="#374151" style={{ marginRight: 12 }} />
              <View>
                <Text className="text-base font-medium text-gray-900">Export Trip</Text>
                <Text className="text-sm text-gray-600">Save your trip data</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => Alert.alert('Share', 'Share functionality coming soon')}
              className="flex-row items-center py-3 border-b border-gray-100"
              activeOpacity={0.7}
            >
              <ClipboardList size={28} color="#374151" style={{ marginRight: 12 }} />
              <View>
                <Text className="text-base font-medium text-gray-900">Share Itinerary</Text>
                <Text className="text-sm text-gray-600">Copy trip details</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDeleteTrip}
              className="flex-row items-center py-3"
              activeOpacity={0.7}
            >
              <Trash2 size={28} color="#dc2626" style={{ marginRight: 12 }} />
              <View>
                <Text className="text-base font-medium text-red-600">Delete Trip</Text>
                <Text className="text-sm text-gray-600">Remove this trip permanently</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
