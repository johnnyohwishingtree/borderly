import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckCircle, AlertTriangle, X } from 'lucide-react-native';

export interface AutoFillBannerProps {
  /** Whether the banner is visible. Changing to true triggers the appear animation. */
  visible: boolean;
  /** Number of fields that were successfully auto-filled. */
  filledCount: number;
  /** Total number of fields that were attempted. */
  totalCount: number;
  /** Number of fields that failed to fill (will appear in the fallback panel). */
  failedCount: number;
  /** Called after the auto-dismiss animation completes, or when the user taps X. */
  onDismiss?: () => void;
  /** How long to show the banner before auto-dismissing (ms). Default: 4000. */
  autoDismissMs?: number;
  testID?: string;
}

/**
 * AutoFillBanner — animated feedback banner shown after page-aware auto-fill.
 *
 * Appears with a fade-in, stays visible for `autoDismissMs`, then fades out.
 * The user can also dismiss it manually. When `failedCount > 0`, the banner
 * takes on a warning style and directs the user to the fallback panel below.
 */
export function AutoFillBanner({
  visible,
  filledCount,
  totalCount,
  failedCount,
  onDismiss,
  autoDismissMs = 4000,
  testID,
}: AutoFillBannerProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShouldRender(false);
          onDismiss?.();
        });
      }, autoDismissMs);

      return () => clearTimeout(timer);
    } else {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setShouldRender(false);
      });
      return;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleDismiss = () => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShouldRender(false);
      onDismiss?.();
    });
  };

  if (!shouldRender) {
    return null;
  }

  const hasFailures = failedCount > 0;
  const skippedCount = totalCount - filledCount - failedCount;

  let message: string;
  if (totalCount === 0) {
    message = 'No fields to auto-fill on this page';
  } else if (filledCount === 0 && hasFailures) {
    message = `${failedCount} field${failedCount !== 1 ? 's' : ''} could not be auto-filled — see below to copy manually`;
  } else {
    const filledText = `${filledCount} of ${totalCount} field${totalCount !== 1 ? 's' : ''} auto-filled`;
    const extras: string[] = [];
    if (skippedCount > 0) {
      extras.push(`${skippedCount} already filled`);
    }
    if (failedCount > 0) {
      extras.push(`${failedCount} failed — see below`);
    }
    const suffix = extras.length > 0
      ? ` (${extras.join(', ')})`
      : ' — please review before continuing';
    message = filledText + suffix;
  }

  return (
    <Animated.View
      testID={testID}
      style={[
        styles.container,
        hasFailures ? styles.warningContainer : styles.successContainer,
        { opacity },
      ]}
    >
      <View style={styles.content}>
        {hasFailures ? (
          <AlertTriangle
            size={16}
            color="#92400E"
            accessibilityLabel="Warning"
          />
        ) : (
          <CheckCircle
            size={16}
            color="#1D4ED8"
            accessibilityLabel="Success"
          />
        )}
        <Text
          style={[styles.text, hasFailures ? styles.warningText : styles.successText]}
          testID={testID ? `${testID}-message` : undefined}
        >
          {message}
        </Text>
      </View>
      <Pressable
        onPress={handleDismiss}
        style={({ pressed }) => [styles.dismissButton, { opacity: pressed ? 0.5 : 1 }]}
        accessibilityLabel="Dismiss auto-fill notification"
        testID={testID ? `${testID}-dismiss` : undefined}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <X size={14} color={hasFailures ? '#92400E' : '#1D4ED8'} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
    marginHorizontal: 12,
    marginTop: 6,
    marginBottom: 2,
  },
  successContainer: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  warningContainer: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 8,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    flexWrap: 'wrap',
    lineHeight: 18,
  },
  successText: {
    color: '#1D4ED8',
  },
  warningText: {
    color: '#92400E',
  },
  dismissButton: {
    padding: 2,
    marginLeft: 8,
  },
});
