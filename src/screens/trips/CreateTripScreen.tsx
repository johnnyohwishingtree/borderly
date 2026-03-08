import { useState } from 'react';
import { View, Text, ScrollView, Alert, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Button, Input, Card } from '../../components/ui';
import { CountryFlag } from '../../components/trips';
import { AutoFilledBadge } from '../../components/forms';
import { BoardingPassScanner } from '../../components/boarding';
import { useTripStore } from '../../stores/useTripStore';
import { TripLeg, Accommodation } from '../../types/trip';
import { Address } from '../../types/profile';
import { ParsedBoardingPass } from '../../types/boarding';
import { 
  isBoardingPassSupported, 
  getUnsupportedDestinationMessage
} from '../../services/boarding/boardingPassParser';

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
  autoFilledFields?: {
    destinationCountry?: 'auto';
    arrivalDate?: 'auto';
    flightNumber?: 'auto';
    airlineCode?: 'auto';
    arrivalAirport?: 'auto';
  };
}

const COUNTRIES = [
  { code: 'JPN', name: 'Japan' },
  { code: 'MYS', name: 'Malaysia' },
  { code: 'SGP', name: 'Singapore' },
];

const COUNTRY_NAMES = COUNTRIES.reduce((acc, country) => {
  acc[country.code] = country.name;
  return acc;
}, {} as Record<string, string>);

const FieldHeader = ({ label, autoFilled }: { label: string; autoFilled?: boolean }) => (
  <View className="flex-row items-center justify-between mb-2">
    <Text className="text-sm font-medium text-gray-700">{label}</Text>
    {autoFilled && <AutoFilledBadge source="auto" size="small" />}
  </View>
);

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
  const [showScanner, setShowScanner] = useState(false);

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
    
    // Clear auto-filled flag when user manually edits a field
    const autoFilledFields = newLegs[index].autoFilledFields;
    if (autoFilledFields) {
      const fieldKey = field as keyof typeof autoFilledFields;
      if (fieldKey in autoFilledFields) {
        delete autoFilledFields[fieldKey];
      }
    }
    
    setLegs(newLegs);
  };

  const handleScanSuccess = (parsedPass: ParsedBoardingPass) => {
    setShowScanner(false);
    
    // Check if destination is supported
    if (!isBoardingPassSupported(parsedPass)) {
      const message = getUnsupportedDestinationMessage(parsedPass);
      Alert.alert(
        'Destination Not Supported',
        `${message}\n\nYou can still add this destination manually.`,
        [
          { text: 'Add Manually', onPress: addLeg },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    // Create new leg with auto-filled data
    const newLeg: LegFormData = {
      destinationCountry: parsedPass.destinationCountry || '',
      arrivalDate: parsedPass.flightDate,
      departureDate: '',
      flightNumber: parsedPass.flightNumber,
      airlineCode: parsedPass.airlineCode,
      arrivalAirport: parsedPass.arrivalAirport,
      accommodation: {
        name: '',
        address: {
          line1: '',
          city: '',
          country: parsedPass.destinationCountry || '',
          postalCode: '',
        },
        phone: '',
      },
      autoFilledFields: {
        destinationCountry: 'auto',
        arrivalDate: 'auto',
        flightNumber: 'auto',
        airlineCode: 'auto',
        arrivalAirport: 'auto',
      },
    };

    setLegs([...legs, newLeg]);
    
    // Auto-suggest trip name if this is the first leg
    if (legs.length === 0 && !tripData.name) {
      const suggestedName = generateTripName([newLeg]);
      setTripData(prev => ({ ...prev, name: suggestedName }));
    }
  };

  const handleScanCancel = () => {
    setShowScanner(false);
  };

  const handleManualEntry = () => {
    setShowScanner(false);
    addLeg();
  };

  const generateTripName = (tripLegs: LegFormData[]): string => {
    if (tripLegs.length === 0) return '';
    
    const destinations = tripLegs
      .map(leg => COUNTRY_NAMES[leg.destinationCountry])
      .filter(Boolean);
    
    if (destinations.length === 0) return '';
    
    if (destinations.length === 1) {
      return `Trip to ${destinations[0]}`;
    } else if (destinations.length === 2) {
      return `${destinations[0]} & ${destinations[1]}`;
    } else {
      return `Multi-Country Trip`;
    }
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
              <FieldHeader label="Country" autoFilled={!!leg.autoFilledFields?.destinationCountry} />
              <View className="flex-row flex-wrap gap-2">
                {COUNTRIES.map((countryOption) => (
                  <Button
                    key={countryOption.code}
                    title={countryOption.name}
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
                <FieldHeader label="Arrival Date" autoFilled={!!leg.autoFilledFields?.arrivalDate} />
                <Input
                  value={leg.arrivalDate}
                  onChangeText={(text) => updateLeg(index, 'arrivalDate', text)}
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
                  onChangeText={(text) => updateLeg(index, 'departureDate', text)}
                  placeholder="YYYY-MM-DD"
                  keyboardType="default"
                />
              </View>
            </View>

            <View className="flex-row space-x-3">
              <View className="flex-1">
                <FieldHeader label="Flight Number" autoFilled={!!leg.autoFilledFields?.flightNumber} />
                <Input
                  value={leg.flightNumber}
                  onChangeText={(text) => updateLeg(index, 'flightNumber', text)}
                  placeholder="e.g., NH123"
                  autoCapitalize="characters"
                />
              </View>
              <View className="flex-1">
                <FieldHeader label="Airline Code" autoFilled={!!leg.autoFilledFields?.airlineCode} />
                <Input
                  value={leg.airlineCode}
                  onChangeText={(text) => updateLeg(index, 'airlineCode', text)}
                  placeholder="e.g., NH"
                  autoCapitalize="characters"
                />
              </View>
            </View>

            <View>
              <FieldHeader label="Arrival Airport" autoFilled={!!leg.autoFilledFields?.arrivalAirport} />
              <Input
                value={leg.arrivalAirport}
                onChangeText={(text) => updateLeg(index, 'arrivalAirport', text)}
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
                    onChangeText={(text) => updateLeg(index, 'accommodation.name', text)}
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
                    onChangeText={(text) => updateLeg(index, 'accommodation.address.line1', text)}
                    placeholder="Street address"
                  />
                </View>

                <View className="flex-row space-x-3">
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-700 mb-1">City</Text>
                    <Input
                      value={leg.accommodation.address.city}
                      onChangeText={(text) => updateLeg(index, 'accommodation.address.city', text)}
                      placeholder="City"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-700 mb-1">Postal Code</Text>
                    <Input
                      value={leg.accommodation.address.postalCode}
                      onChangeText={(text) => updateLeg(index, 'accommodation.address.postalCode', text)}
                      placeholder="Postal code"
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-1">Phone (Optional)</Text>
                  <Input
                    value={leg.accommodation.phone}
                    onChangeText={(text) => updateLeg(index, 'accommodation.phone', text)}
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
                <MaterialIcons name="flight" size={32} color="#374151" style={{ marginRight: 12 }} />
                <Text className="text-xl font-bold text-gray-900">Trip Details</Text>
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Trip Name</Text>
                <Input
                  value={tripData.name}
                  onChangeText={(text) => setTripData(prev => ({ ...prev, name: text }))}
                  placeholder="e.g., Asia Summer 2025"
                  error={errors.tripName}
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
                <MaterialIcons name="place" size={32} color="#374151" style={{ marginRight: 12 }} />
                <Text className="text-xl font-bold text-gray-900">Destinations</Text>
              </View>
              <View className="flex-row space-x-2">
                <Button
                  title="📷 Scan"
                  onPress={() => setShowScanner(true)}
                  variant="outline"
                  size="small"
                />
                <Button
                  title="+ Add"
                  onPress={addLeg}
                  variant="primary"
                  size="small"
                />
              </View>
            </View>

            {errors.legs && (
              <Text className="text-red-500 text-sm mb-3">{errors.legs}</Text>
            )}

            {legs.length === 0 ? (
              <Card variant="outlined">
                <View className="p-6 items-center">
                  <MaterialIcons name="public" size={64} color="#9ca3af" style={{ marginBottom: 16 }} />
                  <Text className="text-lg font-semibold text-gray-900 mb-2">No destinations added yet</Text>
                  <Text className="text-sm text-gray-600 text-center mb-4">
                    Add your travel destinations to plan your customs declarations
                  </Text>
                  <View className="flex-row space-x-3">
                    <Button
                      title="📷 Scan Boarding Pass"
                      onPress={() => setShowScanner(true)}
                      variant="primary"
                    />
                    <Button
                      title="Add Manually"
                      onPress={addLeg}
                      variant="outline"
                    />
                  </View>
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

      {/* Boarding Pass Scanner Modal */}
      <Modal
        visible={showScanner}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <BoardingPassScanner
          onScanSuccess={handleScanSuccess}
          onScanCancel={handleScanCancel}
          onManualEntry={handleManualEntry}
        />
      </Modal>
    </View>
  );
}
