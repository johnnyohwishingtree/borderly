import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, Text, View, ScrollView } from 'react-native';
import { X, ChevronDown, ChevronUp, CheckCircle, AlertCircle } from 'lucide-react-native';

/** Individual field result from the auto-fill script. */
export interface AutoFillFieldResult {
  id: string;
  status: 'filled' | 'failed' | 'not_found' | 'skipped';
  error?: string;
}

export interface AutoFillBannerProps {
  /** Number of fields successfully auto-filled */
  filled: number;
  /** Total number of fields that were attempted */
  total: number;
  /** Field-level results for the expandable detail section (optional) */
  results?: AutoFillFieldResult[];
  /** Called when the banner is dismissed (by user or auto-dismiss timer) */
  onDismiss: () => void;
  testID?: string;
}

/**
 * AutoFillBanner — shows "X of Y fields auto-filled" feedback after page-level auto-fill.
 *
 * - Success style (green) when all fields were filled.
 * - Warning style (amber) when some fields could not be filled.
 * - Auto-dismisses after 4 seconds.
 * - Can be manually dismissed via the X button.
 * - Optionally shows an expandable list of field-level results.
 */
export function AutoFillBanner({ filled, total, results, onDismiss, testID }: AutoFillBannerProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const [isExpanded, setIsExpanded] = useState(false);

  const dismiss = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
    // Call immediately — don't wait for animation to complete
    onDismiss();
  }, [opacity, onDismiss]);

  useEffect(() => {
    // Fade in on mount
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Auto-dismiss after 4 s
    const timer = setTimeout(dismiss, 4000);
    return () => clearTimeout(timer);
  }, [opacity, dismiss]);

  const isWarning = filled < total;
  const bgColor = isWarning ? '#FFFBEB' : '#F0FDF4';
  const borderColor = isWarning ? '#FCD34D' : '#86EFAC';
  const textColor = isWarning ? '#92400E' : '#166534';
  const iconColor = isWarning ? '#B45309' : '#16A34A';
  const fieldWord = total === 1 ? 'field' : 'fields';

  const hasResults = results && results.length > 0;
  const filledResults = results?.filter(r => r.status === 'filled') ?? [];
  const failedResults = results?.filter(r => r.status === 'failed' || r.status === 'not_found') ?? [];
  const skippedResults = results?.filter(r => r.status === 'skipped') ?? [];

  return (
    <Animated.View style={{ opacity }} testID={testID ?? 'autofill-banner'}>
      <View
        style={{
          backgroundColor: bgColor,
          borderTopWidth: 1,
          borderTopColor: borderColor,
        }}
      >
        {/* Main banner row */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 10,
          }}
        >
          <Text
            style={{ flex: 1, fontSize: 13, color: textColor, fontWeight: '500' }}
            testID="autofill-banner-message"
          >
            {filled} of {total} {fieldWord} auto-filled — please review before continuing
          </Text>

          {/* Expand/collapse toggle if we have field results */}
          {hasResults && (
            <Pressable
              onPress={() => setIsExpanded(prev => !prev)}
              style={{ marginLeft: 4, padding: 4 }}
              accessibilityLabel={isExpanded ? 'Hide field details' : 'Show field details'}
              testID="autofill-banner-expand-toggle"
            >
              {isExpanded ? (
                <ChevronUp size={14} color={iconColor} />
              ) : (
                <ChevronDown size={14} color={iconColor} />
              )}
            </Pressable>
          )}

          <Pressable
            onPress={dismiss}
            style={{ marginLeft: 4, padding: 4 }}
            accessibilityLabel="Dismiss auto-fill notification"
            testID="autofill-banner-dismiss"
          >
            <X size={16} color={iconColor} />
          </Pressable>
        </View>

        {/* Expandable field-level detail */}
        {isExpanded && hasResults && (
          <ScrollView
            style={{ maxHeight: 160 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10 }}
            testID="autofill-banner-details"
          >
            {filledResults.length > 0 && (
              <>
                <Text style={{ fontSize: 11, color: textColor, fontWeight: '600', marginBottom: 4 }}>
                  Filled ({filledResults.length})
                </Text>
                {filledResults.map(r => (
                  <View
                    key={r.id}
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}
                    testID={`autofill-result-${r.id}`}
                  >
                    <CheckCircle size={12} color="#16A34A" />
                    <Text style={{ fontSize: 12, color: '#166534', marginLeft: 4 }}>{r.id}</Text>
                  </View>
                ))}
              </>
            )}

            {failedResults.length > 0 && (
              <>
                <Text style={{ fontSize: 11, color: '#92400E', fontWeight: '600', marginTop: 6, marginBottom: 4 }}>
                  Could not fill ({failedResults.length})
                </Text>
                {failedResults.map(r => (
                  <View
                    key={r.id}
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}
                    testID={`autofill-result-${r.id}`}
                  >
                    <AlertCircle size={12} color="#B45309" />
                    <Text style={{ fontSize: 12, color: '#92400E', marginLeft: 4 }}>
                      {r.id}{r.error ? ` — ${r.error}` : ''}
                    </Text>
                  </View>
                ))}
              </>
            )}

            {skippedResults.length > 0 && (
              <>
                <Text style={{ fontSize: 11, color: '#6B7280', fontWeight: '600', marginTop: 6, marginBottom: 4 }}>
                  Already filled ({skippedResults.length})
                </Text>
                {skippedResults.map(r => (
                  <View
                    key={r.id}
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}
                    testID={`autofill-result-${r.id}`}
                  >
                    <Text style={{ fontSize: 12, color: '#6B7280', marginLeft: 16 }}>{r.id}</Text>
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        )}
      </View>
    </Animated.View>
  );
}
