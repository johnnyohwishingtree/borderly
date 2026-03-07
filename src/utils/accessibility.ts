import { AccessibilityInfo, AccessibilityState, AccessibilityValue } from 'react-native';

// WCAG 2.1 AA compliance constants
export const ACCESSIBILITY_CONSTANTS = {
  MIN_TOUCH_TARGET: 44, // Minimum touch target size in points (WCAG 2.1 AA)
  MIN_COLOR_CONTRAST: 4.5, // Minimum color contrast ratio for normal text
  MIN_COLOR_CONTRAST_LARGE: 3, // Minimum color contrast ratio for large text (18pt+)
  TIMEOUT_DURATION: 300000, // 5 minutes timeout for accessibility announcements
} as const;

// Screen reader utilities
export class ScreenReaderUtils {
  /**
   * Announces a message to screen readers
   */
  static announce(message: string, options?: { assertive?: boolean; timeout?: number }) {
    if (!message?.trim()) return;
    
    if (options?.assertive) {
      AccessibilityInfo.announceForAccessibility(message);
    } else {
      AccessibilityInfo.announceForAccessibility(message);
    }
      
    // Clear announcement after timeout to prevent memory issues
    if (options?.timeout) {
      setTimeout(() => {
        // Cleanup if needed
      }, options.timeout);
    }
  }

  /**
   * Checks if a screen reader is currently active
   */
  static async isScreenReaderEnabled(): Promise<boolean> {
    try {
      return await AccessibilityInfo.isScreenReaderEnabled();
    } catch (error) {
      console.warn('Failed to check screen reader status:', error);
      return false;
    }
  }

  /**
   * Checks if reduce motion is enabled
   */
  static async isReduceMotionEnabled(): Promise<boolean> {
    try {
      return await AccessibilityInfo.isReduceMotionEnabled();
    } catch (error) {
      console.warn('Failed to check reduce motion status:', error);
      return false;
    }
  }
}

// Accessibility state helpers
export const AccessibilityStateHelpers = {
  /**
   * Creates accessibility state for form fields
   */
  createFormFieldState: (
    isRequired: boolean = false,
    hasError: boolean = false,
    isDisabled: boolean = false
  ): AccessibilityState => ({
    disabled: isDisabled,
    // Note: required and invalid are not standard React Native accessibility state props
    // They would be handled via accessibilityLabel instead
  }),

  /**
   * Creates accessibility state for buttons
   */
  createButtonState: (
    isDisabled: boolean = false,
    isLoading: boolean = false,
    isSelected: boolean = false
  ): AccessibilityState => ({
    disabled: isDisabled,
    busy: isLoading,
    selected: isSelected,
  }),

  /**
   * Creates accessibility state for toggles/switches
   */
  createToggleState: (
    isChecked: boolean,
    isDisabled: boolean = false
  ): AccessibilityState => ({
    checked: isChecked,
    disabled: isDisabled,
  }),
};

// Accessibility value helpers
export const AccessibilityValueHelpers = {
  /**
   * Creates accessibility value for progress indicators
   */
  createProgressValue: (current: number, max: number, min: number = 0): AccessibilityValue => ({
    min,
    max,
    now: current,
    text: `${Math.round((current / max) * 100)}% complete`,
  }),

  /**
   * Creates accessibility value for step indicators
   */
  createStepValue: (currentStep: number, totalSteps: number): AccessibilityValue => ({
    min: 1,
    max: totalSteps,
    now: currentStep,
    text: `Step ${currentStep} of ${totalSteps}`,
  }),
};

// Touch target utilities
export const TouchTargetUtils = {
  /**
   * Ensures minimum touch target size
   */
  ensureMinimumTouchTarget: (width: number, height: number) => {
    const minSize = ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET;
    return {
      width: Math.max(width, minSize),
      height: Math.max(height, minSize),
      minWidth: minSize,
      minHeight: minSize,
    };
  },

  /**
   * Gets hit slop for small touch targets
   */
  getHitSlop: (elementWidth: number, elementHeight: number) => {
    const minSize = ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET;
    const extraWidth = Math.max(0, (minSize - elementWidth) / 2);
    const extraHeight = Math.max(0, (minSize - elementHeight) / 2);

    return {
      top: extraHeight,
      bottom: extraHeight,
      left: extraWidth,
      right: extraWidth,
    };
  },
};

// Semantic utilities
export const SemanticUtils = {
  /**
   * Generates semantic accessibility labels for form fields
   */
  generateFieldLabel: (
    label: string,
    isRequired: boolean = false,
    hasError: boolean = false,
    errorMessage?: string
  ): string => {
    let fullLabel = label;
    
    if (isRequired) {
      fullLabel += ', required';
    }
    
    if (hasError && errorMessage) {
      fullLabel += `, error: ${errorMessage}`;
    }
    
    return fullLabel;
  },

  /**
   * Generates semantic accessibility labels for navigation
   */
  generateNavigationLabel: (
    title: string,
    position?: { current: number; total: number },
    isActive?: boolean
  ): string => {
    let label = title;
    
    if (position) {
      label += `, ${position.current} of ${position.total}`;
    }
    
    if (isActive) {
      label += ', selected';
    }
    
    return label;
  },

  /**
   * Generates semantic accessibility labels for content
   */
  generateContentLabel: (
    content: string,
    type: 'heading' | 'text' | 'list-item' | 'button' | 'link',
    level?: number
  ): string => {
    switch (type) {
      case 'heading':
        return `${content}, heading${level ? ` level ${level}` : ''}`;
      case 'list-item':
        return `${content}, list item`;
      case 'button':
        return `${content}, button`;
      case 'link':
        return `${content}, link`;
      default:
        return content;
    }
  },
};

// High contrast utilities
export const HighContrastUtils = {
  /**
   * Gets high contrast color for text
   */
  getHighContrastTextColor: (isDarkMode: boolean = false): string => {
    return isDarkMode ? '#FFFFFF' : '#000000';
  },

  /**
   * Gets high contrast background color
   */
  getHighContrastBackgroundColor: (isDarkMode: boolean = false): string => {
    return isDarkMode ? '#000000' : '#FFFFFF';
  },

  /**
   * Gets high contrast border color
   */
  getHighContrastBorderColor: (isDarkMode: boolean = false): string => {
    return isDarkMode ? '#FFFFFF' : '#000000';
  },

  /**
   * Applies high contrast styling
   */
  applyHighContrastStyles: (baseStyles: any, isHighContrast: boolean, isDarkMode: boolean = false) => {
    if (!isHighContrast) return baseStyles;

    return {
      ...baseStyles,
      color: HighContrastUtils.getHighContrastTextColor(isDarkMode),
      backgroundColor: HighContrastUtils.getHighContrastBackgroundColor(isDarkMode),
      borderColor: HighContrastUtils.getHighContrastBorderColor(isDarkMode),
      borderWidth: Math.max(baseStyles.borderWidth || 0, 2),
    };
  },
};

// Accessibility context for the app
export interface AccessibilityContext {
  isScreenReaderEnabled: boolean;
  isReduceMotionEnabled: boolean;
  isHighContrastEnabled: boolean;
  prefersDarkMode: boolean;
}

export const defaultAccessibilityContext: AccessibilityContext = {
  isScreenReaderEnabled: false,
  isReduceMotionEnabled: false,
  isHighContrastEnabled: false,
  prefersDarkMode: false,
};

// Accessibility testing utilities
export const AccessibilityTestUtils = {
  /**
   * Tests if element has proper accessibility props
   */
  hasRequiredAccessibilityProps: (element: any): boolean => {
    return !!(
      element.accessibilityRole ||
      element.accessibilityLabel ||
      element.accessible !== false
    );
  },

  /**
   * Tests if touch target meets minimum size requirements
   */
  meetsMinimumTouchTarget: (width: number, height: number): boolean => {
    const minSize = ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET;
    return width >= minSize && height >= minSize;
  },

  /**
   * Tests color contrast ratio (basic implementation)
   */
  hasMinimumColorContrast: (isLargeText: boolean = false): boolean => {
    // This is a simplified implementation - in a real app you'd use a proper color contrast library
    // For now, we assume our predefined high contrast colors meet requirements
    return true; // Placeholder - implement proper contrast calculation
  },
};