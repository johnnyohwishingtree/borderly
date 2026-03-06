import React, { useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Button, Input, Card } from '../../components/ui';
import { CountryFlag } from '../../components/trips';
import { useTripStore } from '../../stores/useTripStore';
import { TripLeg, Accommodation } from '../../types/trip';
import { Address } from '../../types/profile';

interface TripFormData {
  name: string;
  status: 'upcoming' | 'active' | 'completed';
}

interface LegFormData {
  destinationCountry: string;
  arrivalDate: string;
  departureDate: string;
  flightNumber: string;
  airlineCode: string;
  arrivalAirport: string;
  accommodation: {
    name: string;
    address: {
      line1: string;
      city: string;
      country: string;
      postalCode: string;
    };
    phone: string;
  };
}

const COUNTRIES = [
  { code: 'JPN', name: 'Japan', flag: '🇯🇵' },
  { code: 'MYS', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'SGP', name: 'Singapore', flag: '🇸🇬' },
];

export default function CreateTripScreen() {
  const navigation = useNavigation();
  const { createTrip, addTripLeg } = useTripStore();

  const [tripData, setTripData] = useState<TripFormData>({
    name: '',
    status: 'upcoming',
  });

  const [legs, setLegs] = useState<LegFormData[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addLeg = () => {
    const newLeg: LegFormData = {
      destinationCountry: '',
      arrivalDate: '',
      departureDate: '',
      flightNumber: '',
      airlineCode: '',
      arrivalAirport: '',
      accommodation: {
        name: '',
        address: {
          line1: '',
          city: '',
          country: '',
          postalCode: '',
        },
        phone: '',
      },
    };
    setLegs([...legs, newLeg]);
  };

  const removeLeg = (index: number) => {
    const newLegs = legs.filter((_, i) => i !== index);
    setLegs(newLegs);
  };

  const updateLeg = (index: number, field: string, value: string) => {
    const newLegs = [...legs];
    const keys = field.split('.');
    let current: any = newLegs[index];

    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    setLegs(newLegs);
  };

  const validateTrip = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!tripData.name.trim()) {
      newErrors.tripName = 'Trip name is required';
    }

    if (legs.length === 0) {
      newErrors.legs = 'At least one destination is required';
    }

    legs.forEach((leg, index) => {
      if (!leg.destinationCountry) {
        newErrors[`leg${index}.country`] = 'Country is required';
      }
      if (!leg.arrivalDate) {
        newErrors[`leg${index}.arrival`] = 'Arrival date is required';
      }
      if (!leg.accommodation.name) {
        newErrors[`leg${index}.accommodation`] = 'Accommodation name is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateTrip = async () => {
    if (!validateTrip()) {
      Alert.alert('Validation Error', 'Please fix the errors below');
      return;
    }

    setIsCreating(true);
    try {
      const trip = await createTrip({
        name: tripData.name,
        status: tripData.status,
        legs: [],
      });

      // Add all legs to the trip
      for (let i = 0; i < legs.length; i++) {
        const leg = legs[i];
        await addTripLeg(trip.id, {
          destinationCountry: leg.destinationCountry,
          arrivalDate: leg.arrivalDate,
          departureDate: leg.departureDate,
          flightNumber: leg.flightNumber,
          airlineCode: leg.airlineCode,
          arrivalAirport: leg.arrivalAirport,
          accommodation: {
            name: leg.accommodation.name,
            address: {
              line1: leg.accommodation.address.line1,
              line2: '',
              city: leg.accommodation.address.city,
              state: '',
              postalCode: leg.accommodation.address.postalCode,
              country: leg.accommodation.address.country,
            } as Address,
            phone: leg.accommodation.phone,
          } as Accommodation,
          formStatus: 'not_started',
          order: i,
        } as Omit<TripLeg, 'id' | 'tripId'>);
      }

      Alert.alert('Success', 'Trip created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to create trip. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const renderLegCard = (leg: LegFormData, index: number) => {
    const country = COUNTRIES.find(c => c.code === leg.destinationCountry);

    return (
      <Card key={index} className="mb-4" variant="outlined">
        <View className="p-4">
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center">
              {leg.destinationCountry && (
                <CountryFlag countryCode={leg.destinationCountry} size="medium" showName />
              )}
              {!leg.destinationCountry && (
                <Text className="text-lg font-semibold text-gray-900">
                  Destination {index + 1}
                </Text>
              )}
            </View>
            <Button
              title="Remove"
              onPress={() => removeLeg(index)}
              variant="outline"
              size="small"
            />
          </View>

          <View className="space-y-3">
            <View>
              <Text className="text-sm font-medium text-gray-700 mb-2">Country</Text>
              <View className="flex-row flex-wrap gap-2">
                {COUNTRIES.map((countryOption) => (
                  <Button
                    key={countryOption.code}
                    title={`${countryOption.flag} ${countryOption.name}`}
                    onPress={() => updateLeg(index, 'destinationCountry', countryOption.code)}
                    variant={leg.destinationCountry === countryOption.code ? 'primary' : 'outline'}
                    size="small"
                  />
                ))}
              </View>
              {errors[`leg${index}.country`] && (
                <Text className="text-red-500 text-sm mt-1">{errors[`leg${index}.country`]}</Text>
              )}
            </View>

            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-1">Arrival Date</Text>
                <Input
                  value={leg.arrivalDate}
                  onValueChange={(value) => updateLeg(index, 'arrivalDate', value as string)}
                  placeholder="YYYY-MM-DD"
                  keyboardType="default"
                />
                {errors[`leg${index}.arrival`] && (
                  <Text className="text-red-500 text-sm mt-1">{errors[`leg${index}.arrival`]}</Text>
                )}
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-1">Departure Date</Text>
                <Input
                  value={leg.departureDate}
                  onValueChange={(value) => updateLeg(index, 'departureDate', value as string)}
                  placeholder="YYYY-MM-DD"
                  keyboardType="default"
                />
              </View>
            </View>

            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-1">Flight Number</Text>
                <Input
                  value={leg.flightNumber}
                  onValueChange={(value) => updateLeg(index, 'flightNumber', value as string)}
                  placeholder="e.g., NH123"
                  autoCapitalize="characters"
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-gray-700 mb-1">Airline Code</Text>
                <Input
                  value={leg.airlineCode}
                  onValueChange={(value) => updateLeg(index, 'airlineCode', value as string)}
                  placeholder="e.g., NH"
                  autoCapitalize="characters"
                />
              </View>
            </View>

            <View>
              <Text className="text-sm font-medium text-gray-700 mb-1">Arrival Airport</Text>
              <Input
                value={leg.arrivalAirport}
                onValueChange={(value) => updateLeg(index, 'arrivalAirport', value as string)}
                placeholder="e.g., NRT"
                autoCapitalize="characters"
              />
            </View>

            <View className="border-t border-gray-200 pt-4">
              <Text className="text-base font-semibold text-gray-900 mb-3">Accommodation</Text>

              <View className="space-y-3">
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-1">Hotel/Accommodation Name</Text>
                  <Input
                    value={leg.accommodation.name}
                    onValueChange={(value) => updateLeg(index, 'accommodation.name', value as string)}
                    placeholder="e.g., Park Hyatt Tokyo"
                  />
                  {errors[`leg${index}.accommodation`] && (
                    <Text className="text-red-500 text-sm mt-1">{errors[`leg${index}.accommodation`]}</Text>
                  )}
                </View>

                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-1">Address</Text>
                  <Input
                    value={leg.accommodation.address.line1}
                    onValueChange={(value) => updateLeg(index, 'accommodation.address.line1', value as string)}
                    placeholder="Street address"
                  />
                </View>

                <View className="flex-row space-x-3">
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-700 mb-1">City</Text>
                    <Input
                      value={leg.accommodation.address.city}
                      onValueChange={(value) => updateLeg(index, 'accommodation.address.city', value as string)}
                      placeholder="City"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-700 mb-1">Postal Code</Text>
                    <Input
                      value={leg.accommodation.address.postalCode}
                      onValueChange={(value) => updateLeg(index, 'accommodation.address.postalCode', value as string)}
                      placeholder="Postal code"
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-1">Phone (Optional)</Text>
                  <Input
                    value={leg.accommodation.phone}
                    onValueChange={(value) => updateLeg(index, 'accommodation.phone', value as string)}
                    placeholder="Hotel phone number"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            </View>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-4 py-6 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900 mb-2">Create New Trip</Text>
        <Text className="text-base text-gray-600">Plan your multi-country journey</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-4">

          <Card className="mb-6" variant="outlined">
            <View className="p-5">
              <View className="flex-row items-center mb-4">
                <Text className="text-4xl mr-3">✈️</Text>
                <Text className="text-xl font-bold text-gray-900">Trip Details</Text>
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Trip Name</Text>
                <Input
                  value={tripData.name}
                  onValueChange={(value) => setTripData(prev => ({ ...prev, name: value as string }))}
                  placeholder="e.g., Asia Summer 2025"
                  error={!!errors.tripName}
                />
                {errors.tripName && (
                  <Text className="text-red-500 text-sm mt-1">{errors.tripName}</Text>
                )}
              </View>
            </View>
          </Card>

          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <Text className="text-4xl mr-3">🗺️</Text>
                <Text className="text-xl font-bold text-gray-900">Destinations</Text>
              </View>
              <Button
                title="+ Add"
                onPress={addLeg}
                variant="primary"
                size="small"
              />
            </View>

            {errors.legs && (
              <Text className="text-red-500 text-sm mb-3">{errors.legs}</Text>
            )}

            {legs.length === 0 ? (
              <Card variant="outlined">
                <View className="p-6 items-center">
                  <Text className="text-6xl mb-4">🌏</Text>
                  <Text className="text-lg font-semibold text-gray-900 mb-2">No destinations added yet</Text>
                  <Text className="text-sm text-gray-600 text-center mb-4">
                    Add your travel destinations to plan your customs declarations
                  </Text>
                  <Button
                    title="Add Your First Destination"
                    onPress={addLeg}
                    variant="outline"
                  />
                </View>
              </Card>
            ) : (
              legs.map(renderLegCard)
            )}
          </View>

          <View className="pb-8">
            <Button
              title={isCreating ? 'Creating Trip...' : 'Create Trip'}
              onPress={handleCreateTrip}
              variant="primary"
              size="large"
              fullWidth
              loading={isCreating}
              disabled={legs.length === 0 || !tripData.name.trim()}
            />
            {(legs.length === 0 || !tripData.name.trim()) && (
              <Text className="text-sm text-gray-500 text-center mt-2">
                {!tripData.name.trim() ? 'Enter a trip name' : 'Add at least one destination'} to continue
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
