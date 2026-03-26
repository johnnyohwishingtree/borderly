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
  const iconColor = isWarning ? '#B45309' : '#16A34A';
  const fieldWord = total === 1 ? 'field' : 'fields';

  const hasResults = results && results.length > 0;
  const filledResults = results?.filter(r => r.status === 'filled') ?? [];
  const failedResults = results?.filter(r => r.status === 'failed' || r.status === 'not_found') ?? [];
  const skippedResults = results?.filter(r => r.status === 'skipped') ?? [];

  const bannerBg = isWarning ? 'bg-amber-50' : 'bg-green-50';
  const bannerBorder = isWarning ? 'border-t-amber-300' : 'border-t-green-300';
  const messageText = isWarning ? 'text-amber-900' : 'text-green-900';

  return (
    <Animated.View style={{ opacity }} testID={testID ?? 'autofill-banner'}>
      <View
        className={`${bannerBg} border-t ${bannerBorder}`}
      >
        {/* Main banner row */}
        <View className="flex-row items-center px-4 py-2.5">
          <Text
            className={`flex-1 text-[13px] ${messageText} font-medium`}
            testID="autofill-banner-message"
          >
            {filled} of {total} {fieldWord} auto-filled — please review before continuing
          </Text>

          {/* Expand/collapse toggle if we have field results */}
          {hasResults && (
            <Pressable
              onPress={() => setIsExpanded(prev => !prev)}
              className="ml-1 p-1"
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
            className="ml-1 p-1"
            accessibilityLabel="Dismiss auto-fill notification"
            testID="autofill-banner-dismiss"
          >
            <X size={16} color={iconColor} />
          </Pressable>
        </View>

        {/* Expandable field-level detail */}
        {isExpanded && hasResults && (
          <ScrollView
            className="max-h-[160px]"
            contentContainerClassName="px-4 pb-2.5"
            testID="autofill-banner-details"
          >
            {filledResults.length > 0 && (
              <>
                <Text className={`text-[11px] ${messageText} font-semibold mb-1`}>
                  Filled ({filledResults.length})
                </Text>
                {filledResults.map(r => (
                  <View
                    key={r.id}
                    className="flex-row items-center mb-0.5"
                    testID={`autofill-result-${r.id}`}
                  >
                    <CheckCircle size={12} color="#16A34A" />
                    <Text className="text-xs text-green-900 ml-1">{r.id}</Text>
                  </View>
                ))}
              </>
            )}

            {failedResults.length > 0 && (
              <>
                <Text className="text-[11px] text-amber-900 font-semibold mt-1.5 mb-1">
                  Could not fill ({failedResults.length})
                </Text>
                {failedResults.map(r => (
                  <View
                    key={r.id}
                    className="flex-row items-center mb-0.5"
                    testID={`autofill-result-${r.id}`}
                  >
                    <AlertCircle size={12} color="#B45309" />
                    <Text className="text-xs text-amber-900 ml-1">
                      {r.id}{r.error ? ` — ${r.error}` : ''}
                    </Text>
                  </View>
                ))}
              </>
            )}

            {skippedResults.length > 0 && (
              <>
                <Text className="text-[11px] text-gray-500 font-semibold mt-1.5 mb-1">
                  Already filled ({skippedResults.length})
                </Text>
                {skippedResults.map(r => (
                  <View
                    key={r.id}
                    className="flex-row items-center mb-0.5"
                    testID={`autofill-result-${r.id}`}
                  >
                    <Text className="text-xs text-gray-500 ml-4">{r.id}</Text>
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
