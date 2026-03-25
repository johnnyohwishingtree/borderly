/**
 * AccommodationAutocomplete component
 *
 * Wraps a hotel/accommodation name input with Google Places Autocomplete
 * suggestions filtered to lodging types (hotels, hostels, resorts).
 * When the user types, debounced suggestions are fetched from the Google
 * Places API with `types=lodging`. Selecting a suggestion auto-fills the
 * hotel name and resolves the formatted address for the related address field.
 *
 * Graceful offline fallback: when no API key is configured or the network is
 * unavailable, the component falls back to a plain TextInput field.
 *
 * Google attribution ("Powered by Apple Maps") is always shown per API terms.
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
import {
  getLodgingSuggestions,
  getLodgingDetails,
  getPlacesApiKey,
  PlaceSuggestion,
} from '../../services/places/placesService';
import { getCountryName } from '../../constants/countries';

export interface AccommodationAutocompleteProps {
  /** Current hotel/accommodation name value */
  value: string;
  /** Called when the hotel name changes (user typing or selection) */
  onNameChange: (name: string) => void;
  /** Optional: called with structured address when a lodging is selected */
  onAddressResolved?: (address: { line1?: string; city?: string; state?: string; postalCode?: string; country?: string; formattedAddress?: string }) => void;
  /** ISO country code to scope search results (e.g., 'JPN' for Japan leg) */
  countryHint?: string;
  /** Input label — defaults to 'Hotel / Accommodation Name' */
  label?: string;
  /** Validation error message */
  error?: string;
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

export default function AccommodationAutocomplete({
  value,
  onNameChange,
  onAddressResolved,
  countryHint,
  label = 'Hotel / Accommodation Name',
  error,
  disabled = false,
  testID,
  forceOffline = false,
}: AccommodationAutocompleteProps) {
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

  // Clear debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  /**
   * Called when the user changes the hotel name input.
   * Debounces the Places API lodging search by 300ms.
   */
  const handleNameInputChange = useCallback(
    (text: string) => {
      onNameChange(text);

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
          // Append country name to query for geographic scoping
          const countryName = countryHint ? getCountryName(countryHint) : '';
          const searchQuery = countryName
            ? `${text} ${countryName}`
            : text;
          const results = await getLodgingSuggestions(
            searchQuery,
            sessionTokenRef.current,
          );
          setSuggestions(results);
          setShowSuggestions(results.length > 0);
        } finally {
          setIsLoadingSuggestions(false);
        }
      }, 300);
    },
    [hasApiKey, onNameChange, countryHint],
  );

  /**
   * Called when the user taps a lodging suggestion.
   * Fetches Place Details to get the official hotel name and formatted address.
   */
  const handleSuggestionPress = useCallback(
    async (suggestion: PlaceSuggestion) => {
      setShowSuggestions(false);
      setSuggestions([]);
      setIsLoadingDetails(true);

      try {
        const details = await getLodgingDetails(
          suggestion.placeId,
          sessionTokenRef.current,
        );

        // Regenerate session token after Place Details call (ends the session)
        sessionTokenRef.current = generateSessionToken();

        if (details) {
          // Use the official establishment name
          onNameChange(details.name || suggestion.mainText);
          // Resolve structured address for the address field below
          if (onAddressResolved) {
            onAddressResolved({
              ...details.address,
              formattedAddress: details.formattedAddress,
            });
          }
        } else {
          // Fallback: use the suggestion's main text as the hotel name
          onNameChange(suggestion.mainText);
        }
      } finally {
        setIsLoadingDetails(false);
      }
    },
    [onNameChange, onAddressResolved],
  );

  const handleBlur = useCallback(() => {
    // Delay hiding suggestions to allow tap events to fire first
    setTimeout(() => {
      setShowSuggestions(false);
    }, 150);
  }, []);

  return (
    <View testID={testID}>
      {/* Hotel name input */}
      <View style={styles.inputContainer}>
        <Input
          label={label}
          value={value}
          onChangeText={handleNameInputChange}
          onBlur={handleBlur}
          placeholder="Start typing a hotel name…"
          autoCapitalize="words"
          autoCorrect={false}
          editable={!disabled && !isLoadingDetails}
          error={error}
          testID={testID ? `${testID}-input` : 'accommodation-name-input'}
        />

        {/* Loading indicator while fetching place details */}
        {isLoadingDetails && (
          <View style={styles.detailsLoadingOverlay}>
            <ActivityIndicator size="small" color="#3b82f6" />
          </View>
        )}
      </View>

      {/* Suggestions list — renders inline (pushes content down) */}
      {showSuggestions && (
        <View
          style={styles.suggestionsContainer}
          testID={testID ? `${testID}-suggestions` : 'accommodation-suggestions'}
        >
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
                testID={`accommodation-suggestion-${suggestion.placeId}`}
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
          <View style={styles.attributionRow}>
            <Text style={styles.attributionText}>Powered by Apple Maps</Text>
          </View>
        </View>
      )}

      {/* Persistent Google attribution when autocomplete is active */}
      {hasApiKey && !showSuggestions && (
        <View style={styles.persistentAttribution}>
          <Text style={styles.attributionText}>Powered by Apple Maps</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputContainer: {
  },
  detailsLoadingOverlay: {
    position: 'absolute',
    right: 12,
    top: 44,
    zIndex: 20,
  },
  suggestionsContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginTop: 4,
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
