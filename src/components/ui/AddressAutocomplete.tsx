/**
 * AddressAutocomplete component
 *
 * Wraps address input fields with Apple MapKit / Photon autocomplete suggestions.
 * When the user types in the address line 1 field, debounced suggestions are
 * fetched from the Apple MapKit. Selecting a suggestion auto-fills all
 * structured address sub-fields (line1, city, state, postalCode, country).
 *
 * Graceful offline fallback: when no API key is configured or the network is
 * unavailable, the component falls back to plain TextInput fields.
 *
 * Apple Maps attribution is shown when autocomplete is active.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Input from './Input';
import { Address } from '../../types/profile';
import {
  getAutocompleteSuggestions,
  getPlaceDetails,
  getPlacesApiKey,
  PlaceSuggestion,
} from '../../services/places/placesService';
import { ADDRESS_AUTOCOMPLETE_IDS } from './testIDs';

export interface AddressAutocompleteProps {
  value: Address;
  onAddressChange: (address: Address) => void;
  label?: string;
  errors?: Partial<Record<keyof Address, string>>;
  disabled?: boolean;
  testID?: string;
  /** Optional override to force offline mode (e.g., in tests) */
  forceOffline?: boolean;
}

/** Generate a simple UUID-like session token */
function generateSessionToken(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

/** Default empty address */
const EMPTY_ADDRESS: Address = {
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
};

export default function AddressAutocomplete({
  value,
  onAddressChange,
  label = 'Address',
  errors = {},
  disabled = false,
  testID,
  forceOffline = false,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Session token: one per autocomplete session (autocomplete queries + single
  // Place Details call). Regenerated after each Place Details fetch.
  const sessionTokenRef = useRef<string>(generateSessionToken());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check whether autocomplete is available (API key configured + not forced offline)
  const hasApiKey = !forceOffline && !!getPlacesApiKey();

  // Clear suggestions when component unmounts
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  /**
   * Called when the user changes the address line1 field.
   * Debounces the Places API call by 300ms.
   */
  const handleLine1Change = useCallback(
    (text: string) => {
      onAddressChange({ ...value, line1: text });

      if (!hasApiKey || text.trim().length < 3) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      // Clear previous debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(async () => {
        setIsLoadingSuggestions(true);
        try {
          const results = await getAutocompleteSuggestions(
            text,
            sessionTokenRef.current,
          );
          setSuggestions(results);
          setShowSuggestions(results.length > 0);
        } finally {
          setIsLoadingSuggestions(false);
        }
      }, 300);
    },
    [hasApiKey, onAddressChange, value],
  );

  /**
   * Called when the user taps a suggestion from the dropdown.
   * Fetches Place Details and auto-fills all address sub-fields.
   */
  const handleSuggestionPress = useCallback(
    async (suggestion: PlaceSuggestion) => {
      setShowSuggestions(false);
      setSuggestions([]);
      setIsLoadingDetails(true);

      try {
        const details = await getPlaceDetails(
          suggestion.placeId,
          sessionTokenRef.current,
        );

        // Regenerate session token after Place Details call (ends the session)
        sessionTokenRef.current = generateSessionToken();

        if (details) {
          onAddressChange({
            ...EMPTY_ADDRESS,
            ...value,
            line1: details.address.line1 ?? suggestion.mainText,
            city: details.address.city ?? value.city,
            state: details.address.state ?? value.state ?? '',
            postalCode: details.address.postalCode ?? value.postalCode,
            country: details.address.country ?? value.country,
          });
        } else {
          // Fallback: use the suggestion description as line1
          onAddressChange({ ...value, line1: suggestion.description });
        }
      } finally {
        setIsLoadingDetails(false);
      }
    },
    [onAddressChange, value],
  );

  const handleLine1Blur = useCallback(() => {
    // Delay hiding suggestions to allow tap events to fire first
    setTimeout(() => {
      setShowSuggestions(false);
    }, 150);
  }, []);

  const updateField = useCallback(
    (field: keyof Address, text: string) => {
      onAddressChange({ ...value, [field]: text });
    },
    [onAddressChange, value],
  );

  return (
    <View testID={testID}>
      {/* Label */}
      {label ? (
        <Text className="text-sm font-semibold text-gray-700 mb-2">{label}</Text>
      ) : null}

      {/* Address Line 1 with autocomplete */}
      <View style={styles.line1Container}>
        <Input
          label="Address Line 1"
          value={value.line1}
          onChangeText={handleLine1Change}
          onBlur={handleLine1Blur}
          placeholder="Start typing an address…"
          autoCapitalize="words"
          autoCorrect={false}
          editable={!disabled && !isLoadingDetails}
          error={errors.line1}
          testID={testID ? `${testID}-line1` : ADDRESS_AUTOCOMPLETE_IDS.line1.id}
        />

        {/* Loading indicator while fetching details */}
        {isLoadingDetails && (
          <View style={styles.detailsLoadingOverlay}>
            <ActivityIndicator size="small" color="#3b82f6" />
          </View>
        )}

        {/* Autocomplete suggestions dropdown */}
        {showSuggestions && (
          <View style={styles.suggestionsContainer} testID={ADDRESS_AUTOCOMPLETE_IDS.suggestions.id}>
            {isLoadingSuggestions && (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color="#6b7280" />
                <Text style={styles.loadingText}>Searching…</Text>
              </View>
            )}
            {!isLoadingSuggestions &&
              suggestions.map((suggestion) => (
                <TouchableOpacity
                  key={suggestion.placeId}
                  style={styles.suggestionRow}
                  onPress={() => handleSuggestionPress(suggestion)}
                  testID={ADDRESS_AUTOCOMPLETE_IDS.suggestion(suggestion.placeId).id}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel={suggestion.description}
                >
                  <Text style={styles.suggestionMain} numberOfLines={1}>
                    {suggestion.mainText}
                  </Text>
                  <Text style={styles.suggestionSecondary} numberOfLines={1}>
                    {suggestion.secondaryText}
                  </Text>
                </TouchableOpacity>
              ))}
            {/* Apple Maps attribution — required by Apple Maps terms */}
            <View style={styles.attributionRow}>
              <Text style={styles.attributionText}>Powered by Apple Maps</Text>
            </View>
          </View>
        )}
      </View>

      {/* Address Line 2 */}
      <Input
        label="Address Line 2 (Optional)"
        value={value.line2 ?? ''}
        onChangeText={(text: string) => updateField('line2', text)}
        placeholder="Apt, suite, unit, etc."
        autoCapitalize="words"
        editable={!disabled}
        error={errors.line2}
        testID={testID ? `${testID}-line2` : ADDRESS_AUTOCOMPLETE_IDS.line2.id}
      />

      {/* City and State row */}
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input
            label="City"
            value={value.city}
            onChangeText={(text: string) => updateField('city', text)}
            placeholder="City"
            autoCapitalize="words"
            editable={!disabled}
            error={errors.city}
            testID={testID ? `${testID}-city` : ADDRESS_AUTOCOMPLETE_IDS.city.id}
          />
        </View>
        <View className="flex-1">
          <Input
            label="State / Province"
            value={value.state ?? ''}
            onChangeText={(text: string) => updateField('state', text)}
            placeholder="State"
            autoCapitalize="characters"
            editable={!disabled}
            error={errors.state}
            testID={testID ? `${testID}-state` : ADDRESS_AUTOCOMPLETE_IDS.state.id}
          />
        </View>
      </View>

      {/* Postal code and Country row */}
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input
            label="Postal Code"
            value={value.postalCode}
            onChangeText={(text: string) => updateField('postalCode', text)}
            placeholder="Postal code"
            autoCapitalize="characters"
            editable={!disabled}
            error={errors.postalCode}
            testID={testID ? `${testID}-postal-code` : ADDRESS_AUTOCOMPLETE_IDS.postalCode.id}
          />
        </View>
        <View className="flex-1">
          <Input
            label="Country"
            value={value.country}
            onChangeText={(text: string) => updateField('country', text)}
            placeholder="Country code (e.g. USA)"
            autoCapitalize="characters"
            editable={!disabled}
            error={errors.country}
            testID={testID ? `${testID}-country` : ADDRESS_AUTOCOMPLETE_IDS.country.id}
          />
        </View>
      </View>

      {/* Persistent Apple Maps attribution when autocomplete is active */}
      {hasApiKey && !showSuggestions && (
        <View style={styles.persistentAttribution}>
          <Text style={styles.attributionText}>Powered by Apple Maps</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  line1Container: {
    position: 'relative',
    zIndex: 10,
  },
  detailsLoadingOverlay: {
    position: 'absolute',
    right: 12,
    top: 44,
    zIndex: 20,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 100,
    maxHeight: 240,
    overflow: 'hidden',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  suggestionRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  suggestionMain: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  suggestionSecondary: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 1,
  },
  attributionRow: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f9fafb',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'flex-end',
  },
  persistentAttribution: {
    alignItems: 'flex-end',
    marginTop: -12,
    marginBottom: 8,
  },
  attributionText: {
    fontSize: 10,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
});
