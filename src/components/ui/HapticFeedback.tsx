import { trigger, HapticFeedbackTypes } from 'react-native-haptic-feedback';
import { Platform } from 'react-native';

/**
 * Centralized haptic feedback utilities
 * Provides consistent haptic feedback patterns across the app
 */

export { HapticFeedbackTypes };

export const HAPTIC_PATTERNS = {
  // Light feedback for subtle interactions
  light: HapticFeedbackTypes.impactLight,
  
  // Medium feedback for standard interactions
  medium: HapticFeedbackTypes.impactMedium,
  
  // Heavy feedback for important actions
  heavy: HapticFeedbackTypes.impactHeavy,
  
  // Selection feedback for picker/selection controls
  selection: HapticFeedbackTypes.selection,
  
  // Success feedback for completed actions
  success: HapticFeedbackTypes.notificationSuccess,
  
  // Warning feedback for warnings
  warning: HapticFeedbackTypes.notificationWarning,
  
  // Error feedback for errors
  error: HapticFeedbackTypes.notificationError,
  
  // Soft feedback for very light interactions
  soft: HapticFeedbackTypes.soft,
  
  // Rigid feedback for firm interactions
  rigid: HapticFeedbackTypes.rigid,
} as const;

export interface HapticOptions {
  enableVibrateFallback?: boolean;
  ignoreAndroidSystemSettings?: boolean;
  delay?: number;
}

const DEFAULT_OPTIONS: HapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
  delay: 0,
};

/**
 * Trigger haptic feedback with optional delay
 */
export const triggerHaptic = (
  pattern: keyof typeof HAPTIC_PATTERNS | HapticFeedbackTypes,
  options: HapticOptions = {}
): void => {
  const hapticType = typeof pattern === 'string' && pattern in HAPTIC_PATTERNS 
    ? HAPTIC_PATTERNS[pattern as keyof typeof HAPTIC_PATTERNS]
    : pattern as HapticFeedbackTypes;
  
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  
  const triggerOptions = {
    enableVibrateFallback: mergedOptions.enableVibrateFallback!,
    ignoreAndroidSystemSettings: mergedOptions.ignoreAndroidSystemSettings!,
  };

  if (mergedOptions.delay && mergedOptions.delay > 0) {
    setTimeout(() => {
      trigger(hapticType, triggerOptions);
    }, mergedOptions.delay);
  } else {
    trigger(hapticType, triggerOptions);
  }
};

/**
 * Predefined haptic feedback functions for common use cases
 */
export const HapticFeedback = {
  // Button press feedback
  button: (size: 'small' | 'medium' | 'large' = 'medium') => {
    const pattern = size === 'large' ? 'medium' : 'light';
    triggerHaptic(pattern);
  },
  
  // Toggle/switch feedback
  toggle: () => {
    triggerHaptic('selection');
  },
  
  // Tab switch feedback
  tab: () => {
    triggerHaptic('selection');
  },
  
  // Card press feedback
  card: () => {
    triggerHaptic('light');
  },
  
  // List item selection feedback
  listItem: () => {
    triggerHaptic('light');
  },
  
  // Form field focus feedback
  focus: () => {
    triggerHaptic('soft');
  },
  
  // Success action feedback
  success: () => {
    triggerHaptic('success');
  },
  
  // Error feedback
  error: () => {
    triggerHaptic('error');
  },
  
  // Warning feedback
  warning: () => {
    triggerHaptic('warning');
  },
  
  // Long press feedback
  longPress: () => {
    triggerHaptic('heavy');
  },
  
  // Drag start feedback
  dragStart: () => {
    triggerHaptic('medium');
  },
  
  // Drag end feedback
  dragEnd: () => {
    triggerHaptic('light');
  },
  
  // Refresh feedback
  refresh: () => {
    triggerHaptic('light');
  },
  
  // Delete/destructive action feedback
  destructive: () => {
    triggerHaptic('heavy');
  },
  
  // Modal open/close feedback
  modal: (isOpening: boolean) => {
    triggerHaptic(isOpening ? 'light' : 'light');
  },
  
  // Navigation feedback
  navigation: () => {
    triggerHaptic('light');
  },
  
  // Camera capture feedback
  capture: () => {
    triggerHaptic('heavy');
  },
  
  // QR scan success feedback
  scanSuccess: () => {
    triggerHaptic('success');
  },
  
  // Form submission feedback
  submit: () => {
    triggerHaptic('medium');
  },
} as const;

/**
 * Platform-specific haptic feedback helper
 */
export const PlatformHaptic = {
  // iOS-specific patterns
  ios: {
    peek: () => Platform.OS === 'ios' && triggerHaptic('light'),
    pop: () => Platform.OS === 'ios' && triggerHaptic('medium'),
  },
  
  // Android-specific patterns
  android: {
    contextClick: () => Platform.OS === 'android' && triggerHaptic('heavy'),
    virtualKey: () => Platform.OS === 'android' && triggerHaptic('light'),
  },
};

/**
 * Haptic feedback sequence helper
 */
export const HapticSequence = {
  // Double tap feedback
  doubleTap: () => {
    triggerHaptic('light');
    triggerHaptic('light', { delay: 100 });
  },
  
  // Success celebration
  celebration: () => {
    triggerHaptic('success');
    triggerHaptic('light', { delay: 150 });
    triggerHaptic('light', { delay: 300 });
  },
  
  // Error shake
  errorShake: () => {
    triggerHaptic('error');
    triggerHaptic('light', { delay: 100 });
    triggerHaptic('light', { delay: 200 });
  },
  
  // Loading complete
  loadingComplete: () => {
    triggerHaptic('light');
    triggerHaptic('success', { delay: 100 });
  },
} as const;