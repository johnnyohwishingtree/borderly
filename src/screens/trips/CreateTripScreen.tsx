import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Plane, MapPin, Globe } from 'lucide-react-native';
import { Button, Input, Card } from '../../components/ui';
import { CountryFlag, TravelerSelector } from '../../components/trips';
import { AutoFilledBadge } from '../../components/forms';
import { ContextualHelp, HelpContent } from '../../components/help';
import { BoardingPassScanner } from '../../components/boarding';
import { useTripStore } from '../../stores/useTripStore';
import { useProfileStore } from '../../stores/useProfileStore';
import { TripLeg, Accommodation } from '../../types/trip';
import { Address, FamilyMember } from '../../types/profile';
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
  assignedTravelers: string[]; // Array of traveler profile IDs
  autoFilledFields?: {
    destinationCountry?: 'auto';
    arrivalDate?: 'auto';
    flightNumber?: 'auto';
    airlineCode?: 'auto';
    arrivalAirport?: 'auto';
  };
}

import { SUPPORTED_COUNTRIES, getCountryName } from '../../constants/countries';

const FieldHeader = ({ label, autoFilled }: { label: string; autoFilled?: boolean }) => (
  <View className="flex-row items-center justify-between mb-2">
    <Text className="text-sm font-medium text-gray-700">{label}</Text>
    {autoFilled && <AutoFilledBadge source="auto" size="small" />}
  </View>
);

export default function CreateTripScreen() {
  const navigation = useNavigation();
  const { createTrip, addTripLeg } = useTripStore();
  const { getAllProfiles, loadFamilyProfiles } = useProfileStore();

  const [tripData, setTripData] = useState<TripFormData>({
    name: '',
    status: 'upcoming',
  });

  const [legs, setLegs] = useState<LegFormData[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showScanner, setShowScanner] = useState(false);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);

  // Load family members on component mount
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

  // When family members load, assign the primary traveler to any legs that have no travelers
  useEffect(() => {
    if (familyMembers.length > 0 && legs.length > 0) {
      const needsUpdate = legs.some(leg => leg.assignedTravelers.length === 0);
      if (needsUpdate) {
        setLegs(legs.map(leg => {
          if (leg.assignedTravelers.length === 0) {
            return { ...leg, assignedTravelers: [familyMembers[0].id] };
          }
          return leg;
        }));
      }
    }
  }, [familyMembers, legs]);

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
      assignedTravelers: familyMembers.length > 0 ? [familyMembers[0].id] : [], // Default to primary traveler if available
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

  const updateLegTravelers = (index: number, travelerIds: string[]) => {
    const newLegs = [...legs];
    newLegs[index].assignedTravelers = travelerIds;
    setLegs(newLegs);
  };

  const handleTravelerToggle = (legIndex: number, travelerId: string) => {
    const leg = legs[legIndex];
    const isCurrentlySelected = leg.assignedTravelers.includes(travelerId);
    
    if (isCurrentlySelected) {
      updateLegTravelers(legIndex, leg.assignedTravelers.filter(id => id !== travelerId));
    } else {
      updateLegTravelers(legIndex, [...leg.assignedTravelers, travelerId]);
    }
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
      assignedTravelers: familyMembers.length > 0 ? [familyMembers[0].id] : [], // Default to primary traveler if available
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
      .map(leg => getCountryName(leg.destinationCountry))
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

  const validateTrip = (): Record<string, string> => {
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
      if (leg.assignedTravelers.length === 0) {
        newErrors[`leg${index}.travelers`] = 'At least one traveler must be selected';
      }
    });

    setErrors(newErrors);
    return newErrors;
  };

  const handleCreateTrip = async () => {
    const validationErrors = validateTrip();
    if (Object.keys(validationErrors).length > 0) {
      const errorList = Object.entries(validationErrors).map(([k, v]) => `${k}: ${v}`).join('\n');
      Alert.alert('Validation Error', errorList || 'Please fix the errors below');
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
          assignedTravelers: leg.assignedTravelers,
          travelerFormsData: leg.assignedTravelers.map(travelerId => ({
            travelerId,
            formData: {},
            formStatus: 'not_started' as const,
          })),
        } as Omit<TripLeg, 'id' | 'tripId'>);
      }

      Alert.alert('Success', 'Trip created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
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
              testID={`remove-leg-${index}-button`}
            />
          </View>

          <View className="space-y-3">
            <View>
              <FieldHeader label="Country" autoFilled={!!leg.autoFilledFields?.destinationCountry} />
              <View className="flex-row flex-wrap gap-2">
                {SUPPORTED_COUNTRIES.map((countryOption) => (
                  <Button
                    key={countryOption.code}
                    title={countryOption.name}
                    onPress={() => updateLeg(index, 'destinationCountry', countryOption.code)}
                    variant={leg.destinationCountry === countryOption.code ? 'primary' : 'outline'}
                    size="small"
                    testID={`country-${countryOption.code}`}
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
                  testID={`leg-${index}-arrival-date`}
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
                  testID={`leg-${index}-departure-date`}
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
                  testID={`leg-${index}-flight-number`}
                />
              </View>
              <View className="flex-1">
                <FieldHeader label="Airline Code" autoFilled={!!leg.autoFilledFields?.airlineCode} />
                <Input
                  value={leg.airlineCode}
                  onChangeText={(text) => updateLeg(index, 'airlineCode', text)}
                  placeholder="e.g., NH"
                  autoCapitalize="characters"
                  testID={`leg-${index}-airline-code`}
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
                testID={`leg-${index}-arrival-airport`}
              />
            </View>

            {/* Traveler Selection */}
            {familyMembers.length > 0 && (
              <View className="border-t border-gray-200 pt-4">
                <TravelerSelector
                  travelers={familyMembers}
                  selectedTravelerIds={leg.assignedTravelers}
                  onToggleTraveler={(travelerId) => handleTravelerToggle(index, travelerId)}
                  title="Who is traveling to this destination?"
                  subtitle="Select which family members will visit this country."
                  showCompact={true}
                  minSelection={1}
                />
                {errors[`leg${index}.travelers`] && (
                  <Text className="text-red-500 text-sm mt-1">{errors[`leg${index}.travelers`]}</Text>
                )}
              </View>
            )}

            <View className="border-t border-gray-200 pt-4">
              <Text className="text-base font-semibold text-gray-900 mb-3">Accommodation</Text>

              <View className="space-y-3">
                <View>
                  <Text className="text-sm font-medium text-gray-700 mb-1">Hotel/Accommodation Name</Text>
                  <Input
                    value={leg.accommodation.name}
                    onChangeText={(text) => updateLeg(index, 'accommodation.name', text)}
                    placeholder="e.g., Park Hyatt Tokyo"
                    testID={`leg-${index}-accommodation-name`}
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
                    testID={`leg-${index}-accommodation-address`}
                  />
                </View>

                <View className="flex-row space-x-3">
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-700 mb-1">City</Text>
                    <Input
                      value={leg.accommodation.address.city}
                      onChangeText={(text) => updateLeg(index, 'accommodation.address.city', text)}
                      placeholder="City"
                      testID={`leg-${index}-accommodation-city`}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-gray-700 mb-1">Postal Code</Text>
                    <Input
                      value={leg.accommodation.address.postalCode}
                      onChangeText={(text) => updateLeg(index, 'accommodation.address.postalCode', text)}
                      placeholder="Postal code"
                      testID={`leg-${index}-accommodation-postal-code`}
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
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-2xl font-bold text-gray-900 flex-1">Create New Trip</Text>
          <ContextualHelp 
            content={HelpContent.tripManagement}
            variant="icon"
            size="medium"
          />
        </View>
        <Text className="text-base text-gray-600">Plan your multi-country journey</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled">
        <View className="p-4">

          <Card className="mb-6" variant="outlined">
            <View className="p-5">
              <View className="flex-row items-center mb-4">
                <Plane size={32} color="#374151" style={{ marginRight: 12 }} />
                <Text className="text-xl font-bold text-gray-900">Trip Details</Text>
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-700 mb-2">Trip Name</Text>
                <Input
                  value={tripData.name}
                  onChangeText={(text) => setTripData(prev => ({ ...prev, name: text }))}
                  placeholder="e.g., Asia Summer 2025"
                  error={errors.tripName}
                  testID="trip-name-input"
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
                <MapPin size={32} color="#374151" style={{ marginRight: 12 }} />
                <Text className="text-xl font-bold text-gray-900">Destinations</Text>
              </View>
              <View className="flex-row space-x-2">
                <Button
                  title="Scan"
                  onPress={() => setShowScanner(true)}
                  variant="outline"
                  size="small"
                  testID="scan-destination-button"
                />
                <Button
                  title="+ Add"
                  onPress={addLeg}
                  variant="primary"
                  size="small"
                  testID="add-destination-button"
                />
              </View>
            </View>

            {errors.legs && (
              <Text className="text-red-500 text-sm mb-3">{errors.legs}</Text>
            )}

            {legs.length === 0 ? (
              <Card variant="outlined">
                <View className="p-6 items-center">
                  <Globe size={64} color="#9ca3af" style={{ marginBottom: 16 }} />
                  <Text className="text-lg font-semibold text-gray-900 mb-2">No destinations added yet</Text>
                  <Text className="text-sm text-gray-600 text-center mb-4">
                    Add your travel destinations to plan your customs declarations
                  </Text>
                  <View className="flex-row space-x-3">
                    <Button
                      title="Scan Boarding Pass"
                      onPress={() => setShowScanner(true)}
                      variant="primary"
                      testID="empty-state-scan-button"
                    />
                    <Button
                      title="Add Manually"
                      onPress={addLeg}
                      variant="outline"
                      testID="empty-state-add-button"
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
              testID="create-trip-button"
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
