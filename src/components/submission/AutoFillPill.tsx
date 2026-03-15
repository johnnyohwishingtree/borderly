import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Sparkles, X } from 'lucide-react-native';
import { ProfileSelector } from './ProfileSelector';
import type { ProfileOption } from './ProfileSelector';

export type { ProfileOption };

export interface AutoFillPillProps {
  /** List of profiles available to fill as */
  profiles: ProfileOption[];
  /** Currently selected profile ID */
  selectedProfileId: string;
  /** Called when the user selects a different profile */
  onProfileChange: (profileId: string) => void;
  /** Called when the user taps "Auto-fill Now" */
  onAutoFill: () => void;
  /** Called when the user dismisses the pill */
  onDismiss: () => void;
  testID?: string;
}

/**
 * AutoFillPill — floating "Auto-fill available" pill shown at the bottom
 * of the WebView when form fields are detected on the page.
 *
 * Design:
 * - Floating card anchored to the bottom of the WebView
 * - Shows profile selector when multiple family profiles are available
 * - User explicitly taps "Auto-fill Now" to trigger filling
 * - Can be dismissed without filling
 */
export function AutoFillPill({
  profiles,
  selectedProfileId,
  onProfileChange,
  onAutoFill,
  onDismiss,
  testID,
}: AutoFillPillProps) {
  const showProfileSelector = profiles.length > 1;

  return (
    <View style={styles.container} testID={testID ?? 'autofill-pill'} pointerEvents="box-none">
      <View style={styles.pill}>
        {/* Header row */}
        <View style={styles.header}>
          <Sparkles size={16} color="#2563EB" />
          <Text style={styles.title}>Auto-fill available</Text>
          <Pressable
            onPress={onDismiss}
            style={styles.dismissButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Dismiss auto-fill pill"
            testID="autofill-pill-dismiss"
          >
            <X size={16} color="#9CA3AF" />
          </Pressable>
        </View>

        {/* Profile selector (only shown for family trips with multiple profiles) */}
        {showProfileSelector && (
          <View style={styles.profileRow}>
            <Text style={styles.fillAsLabel}>Fill as:</Text>
            <View style={styles.selectorWrapper}>
              <ProfileSelector
                profiles={profiles}
                selectedProfileId={selectedProfileId}
                onSelect={onProfileChange}
                testID="autofill-pill-profile-selector"
              />
            </View>
          </View>
        )}

        {/* Single profile label (shown when only one profile) */}
        {!showProfileSelector && profiles.length === 1 && (
          <Text style={styles.singleProfileLabel} testID="autofill-pill-single-profile">
            Fill as: {profiles[0].name} ({profiles[0].relationship})
          </Text>
        )}

        {/* Auto-fill Now button */}
        <Pressable
          onPress={onAutoFill}
          style={({ pressed }) => [styles.fillButton, pressed && styles.fillButtonPressed]}
          accessibilityLabel="Auto-fill form fields now"
          testID="autofill-pill-fill-button"
        >
          <Text style={styles.fillButtonText}>Auto-fill Now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    zIndex: 50,
  },
  pill: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 6,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  dismissButton: {
    padding: 2,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 8,
  },
  fillAsLabel: {
    fontSize: 13,
    color: '#6B7280',
    paddingTop: 9,
  },
  selectorWrapper: {
    flex: 1,
  },
  singleProfileLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  fillButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 11,
    alignItems: 'center',
  },
  fillButtonPressed: {
    backgroundColor: '#1D4ED8',
  },
  fillButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
