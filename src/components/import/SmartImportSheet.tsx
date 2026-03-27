/**
 * SmartImportSheet — Modal with two tabs for importing trip data:
 * 1. Paste Confirmation: paste booking email text to extract flights + hotels
 * 2. Flight Lookup: enter a flight number to look up airline + route
 */

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { X, ClipboardPaste, Search, Plane, Building2 } from 'lucide-react-native';
import { Button, Card } from '../ui';
import { parseConfirmationText } from '../../services/import/confirmationParser';
import { lookupFlight } from '../../services/import/flightLookup';
import type {
  ParsedFlightInfo,
  ParsedHotelInfo,
  ConfirmationParseResult,
} from '../../types/import';
import { SMART_IMPORT_SHEET_IDS } from './testIDs';

type Tab = 'paste' | 'flight';

export interface SmartImportResult {
  flights: ParsedFlightInfo[];
  hotels: ParsedHotelInfo[];
}

interface SmartImportSheetProps {
  onImport: (result: SmartImportResult) => void;
  onClose: () => void;
}

export default function SmartImportSheet({
  onImport,
  onClose,
}: SmartImportSheetProps) {
  const [activeTab, setActiveTab] = useState<Tab>('paste');

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-200">
        <Text className="text-lg font-bold text-gray-900">Smart Import</Text>
        <TouchableOpacity
          onPress={onClose}
          testID={SMART_IMPORT_SHEET_IDS.closeButton.id}
          accessibilityLabel="Close"
        >
          <X size={24} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View className="flex-row border-b border-gray-200">
        <TabButton
          label="Paste Confirmation"
          icon={<ClipboardPaste size={16} color={activeTab === 'paste' ? '#2563eb' : '#6b7280'} />}
          active={activeTab === 'paste'}
          onPress={() => setActiveTab('paste')}
          testID={SMART_IMPORT_SHEET_IDS.tabPaste.id}
        />
        <TabButton
          label="Flight Lookup"
          icon={<Search size={16} color={activeTab === 'flight' ? '#2563eb' : '#6b7280'} />}
          active={activeTab === 'flight'}
          onPress={() => setActiveTab('flight')}
          testID={SMART_IMPORT_SHEET_IDS.tabFlight.id}
        />
      </View>

      {/* Tab Content */}
      {activeTab === 'paste' ? (
        <PasteTab onImport={onImport} />
      ) : (
        <FlightTab onImport={onImport} />
      )}
    </SafeAreaView>
  );
}

// --- Tab Button ---

function TabButton({
  label,
  icon,
  active,
  onPress,
  testID,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      testID={testID}
      className={`flex-1 flex-row items-center justify-center py-3 ${
        active ? 'border-b-2 border-blue-600' : ''
      }`}
    >
      {icon}
      <Text
        className={`ml-2 text-sm font-medium ${
          active ? 'text-blue-600' : 'text-gray-500'
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// --- Paste Confirmation Tab ---

function PasteTab({
  onImport,
}: {
  onImport: (result: SmartImportResult) => void;
}) {
  const [text, setText] = useState('');
  const [parseResult, setParseResult] = useState<ConfirmationParseResult | null>(
    null
  );

  const handleParse = () => {
    if (!text.trim()) return;
    const result = parseConfirmationText(text);
    setParseResult(result);
  };

  const handleImport = () => {
    if (!parseResult) return;
    onImport({
      flights: parseResult.flights,
      hotels: parseResult.hotels,
    });
  };

  const hasResults =
    parseResult &&
    (parseResult.flights.length > 0 || parseResult.hotels.length > 0);

  return (
    <ScrollView className="flex-1 p-4" keyboardDismissMode="on-drag">
      <Text className="text-sm text-gray-600 mb-3">
        Paste a booking confirmation email or text. We'll extract flight and
        hotel details automatically.
      </Text>

      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Paste your booking confirmation here..."
        multiline
        numberOfLines={8}
        textAlignVertical="top"
        className="border border-gray-300 rounded-lg p-3 text-base text-gray-900 mb-4 min-h-[160px]"
        testID={SMART_IMPORT_SHEET_IDS.pasteConfirmationField.id}
      />

      <Button
        title="Parse"
        onPress={handleParse}
        variant="primary"
        fullWidth
        disabled={!text.trim()}
        testID={SMART_IMPORT_SHEET_IDS.parseConfirmationButton.id}
      />

      {parseResult && !hasResults && (
        <View className="mt-4 p-4 bg-yellow-50 rounded-lg">
          <Text className="text-sm text-yellow-800">
            No flight or hotel information found. Try pasting a different
            confirmation or use the Flight Lookup tab.
          </Text>
        </View>
      )}

      {hasResults && (
        <View className="mt-4">
          <Text className="text-base font-semibold text-gray-900 mb-3">
            Found Information
          </Text>

          {parseResult.flights.map((flight, i) => (
            <FlightResultCard key={`flight-${i}`} flight={flight} />
          ))}

          {parseResult.hotels.map((hotel, i) => (
            <HotelResultCard key={`hotel-${i}`} hotel={hotel} />
          ))}

          <View className="mt-2 mb-4">
            <Text className="text-xs text-gray-500">
              Confidence: {Math.round(parseResult.confidence * 100)}%
            </Text>
          </View>

          <Button
            title="Import to Trip"
            onPress={handleImport}
            variant="primary"
            fullWidth
            testID={SMART_IMPORT_SHEET_IDS.importParsedDataButton.id}
          />
        </View>
      )}
    </ScrollView>
  );
}

// --- Flight Lookup Tab ---

function FlightTab({
  onImport,
}: {
  onImport: (result: SmartImportResult) => void;
}) {
  const [flightNumber, setFlightNumber] = useState('');
  const [arrivalAirport, setArrivalAirport] = useState('');
  const [departureAirport, setDepartureAirport] = useState('');
  const [date, setDate] = useState('');
  const [result, setResult] = useState<ParsedFlightInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = () => {
    setError(null);
    setResult(null);

    const options: { date?: string; arrivalAirport?: string; departureAirport?: string } = {};
    if (arrivalAirport) options.arrivalAirport = arrivalAirport;
    if (departureAirport) options.departureAirport = departureAirport;
    if (date) options.date = date;

    const lookupResult = lookupFlight(flightNumber, options);

    if (lookupResult.success && lookupResult.flight) {
      setResult(lookupResult.flight);
    } else {
      setError(lookupResult.error || 'Lookup failed');
    }
  };

  const handleImport = () => {
    if (!result) return;
    onImport({ flights: [result], hotels: [] });
  };

  return (
    <ScrollView className="flex-1 p-4" keyboardDismissMode="on-drag">
      <Text className="text-sm text-gray-600 mb-3">
        Enter a flight number to look up airline and route info.
      </Text>

      <View className="mb-3">
        <Text className="text-sm font-medium text-gray-700 mb-1">
          Flight Number
        </Text>
        <TextInput
          value={flightNumber}
          onChangeText={setFlightNumber}
          placeholder="e.g., NH101, JL723, SQ12"
          autoCapitalize="characters"
          className="border border-gray-300 rounded-lg p-3 text-base text-gray-900"
          testID={SMART_IMPORT_SHEET_IDS.flightNumberField.id}
        />
      </View>

      <View className="flex-row gap-3 mb-3">
        <View className="flex-1">
          <Text className="text-sm font-medium text-gray-700 mb-1">
            From (Optional)
          </Text>
          <TextInput
            value={departureAirport}
            onChangeText={setDepartureAirport}
            placeholder="e.g., LAX"
            autoCapitalize="characters"
            maxLength={3}
            className="border border-gray-300 rounded-lg p-3 text-base text-gray-900"
            testID={SMART_IMPORT_SHEET_IDS.departureAirportField.id}
          />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-medium text-gray-700 mb-1">
            To (Optional)
          </Text>
          <TextInput
            value={arrivalAirport}
            onChangeText={setArrivalAirport}
            placeholder="e.g., NRT"
            autoCapitalize="characters"
            maxLength={3}
            className="border border-gray-300 rounded-lg p-3 text-base text-gray-900"
            testID={SMART_IMPORT_SHEET_IDS.arrivalAirportField.id}
          />
        </View>
      </View>

      <View className="mb-4">
        <Text className="text-sm font-medium text-gray-700 mb-1">
          Date (Optional)
        </Text>
        <TextInput
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          className="border border-gray-300 rounded-lg p-3 text-base text-gray-900"
          testID={SMART_IMPORT_SHEET_IDS.flightDateField.id}
        />
      </View>

      <Button
        title="Look Up Flight"
        onPress={handleLookup}
        variant="primary"
        fullWidth
        disabled={!flightNumber.trim()}
        testID={SMART_IMPORT_SHEET_IDS.lookupFlightButton.id}
      />

      {error && (
        <View className="mt-4 p-4 bg-red-50 rounded-lg">
          <Text className="text-sm text-red-800">{error}</Text>
        </View>
      )}

      {result && (
        <View className="mt-4">
          <FlightResultCard flight={result} />
          <Button
            title="Import to Trip"
            onPress={handleImport}
            variant="primary"
            fullWidth
            testID={SMART_IMPORT_SHEET_IDS.importFlightButton.id}
          />
        </View>
      )}
    </ScrollView>
  );
}

// --- Result Cards ---

function FlightResultCard({ flight }: { flight: ParsedFlightInfo }) {
  return (
    <Card className="mb-3" variant="outlined">
      <View className="p-3">
        <View className="flex-row items-center mb-2">
          <Plane size={16} color="#2563eb" />
          <Text className="ml-2 text-sm font-semibold text-gray-900">
            {flight.flightNumber}
          </Text>
          {flight.airlineName && (
            <Text className="ml-2 text-sm text-gray-600">
              {flight.airlineName}
            </Text>
          )}
        </View>
        {(flight.departureAirport || flight.arrivalAirport) && (
          <Text className="text-sm text-gray-700">
            {flight.departureCity || flight.departureAirport || '?'}{' '}
            → {flight.arrivalCity || flight.arrivalAirport || '?'}
          </Text>
        )}
        {flight.flightDate && (
          <Text className="text-xs text-gray-500 mt-1">
            {flight.flightDate}
          </Text>
        )}
        {flight.destinationCountry && (
          <Text className="text-xs text-blue-600 mt-1">
            Destination: {flight.destinationCountry}
          </Text>
        )}
      </View>
    </Card>
  );
}

function HotelResultCard({ hotel }: { hotel: ParsedHotelInfo }) {
  return (
    <Card className="mb-3" variant="outlined">
      <View className="p-3">
        <View className="flex-row items-center mb-2">
          <Building2 size={16} color="#059669" />
          <Text className="ml-2 text-sm font-semibold text-gray-900">
            {hotel.name}
          </Text>
        </View>
        {hotel.address && (
          <Text className="text-sm text-gray-700">{hotel.address}</Text>
        )}
        {(hotel.checkInDate || hotel.checkOutDate) && (
          <Text className="text-xs text-gray-500 mt-1">
            {hotel.checkInDate || '?'} → {hotel.checkOutDate || '?'}
          </Text>
        )}
        {hotel.bookingReference && (
          <Text className="text-xs text-gray-500 mt-1">
            Ref: {hotel.bookingReference}
          </Text>
        )}
      </View>
    </Card>
  );
}
