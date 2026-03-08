import { Platform } from 'react-native';
import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { NAVIGATION_ANIMATIONS, ANIMATION_DURATION } from '../utils/animations';

/**
 * Navigation transition configurations for React Navigation
 */

// Standard transitions
export const STANDARD_TRANSITIONS = {
  // Slide from right (default iOS behavior)
  slideFromRight: {
    ...NAVIGATION_ANIMATIONS.slideHorizontal,
    animation: 'slide_from_right',
  } as NativeStackNavigationOptions,

  // Slide from bottom (modal style)
  slideFromBottom: {
    ...NAVIGATION_ANIMATIONS.slideVertical,
    animation: 'slide_from_bottom',
  } as NativeStackNavigationOptions,

  // Fade transition
  fade: {
    ...NAVIGATION_ANIMATIONS.fade,
    animation: 'fade',
  } as NativeStackNavigationOptions,

  // No animation
  none: {
    animation: 'none',
    gestureEnabled: false,
  } as NativeStackNavigationOptions,

  // Modal presentation
  modal: {
    ...NAVIGATION_ANIMATIONS.modal,
    presentation: 'modal',
  } as NativeStackNavigationOptions,

  // Fullscreen modal
  fullScreenModal: {
    ...NAVIGATION_ANIMATIONS.modal,
    presentation: 'fullScreenModal',
    animation: 'slide_from_bottom',
  } as NativeStackNavigationOptions,
} as const;

// Enhanced transitions with custom timing
export const ENHANCED_TRANSITIONS = {
  // Quick slide for fast navigation
  quickSlide: {
    animation: 'slide_from_right',
    animationDuration: ANIMATION_DURATION.fast,
    gestureEnabled: true,
    gestureDirection: 'horizontal',
  } as NativeStackNavigationOptions,

  // Slow fade for important transitions
  slowFade: {
    animation: 'fade',
    animationDuration: ANIMATION_DURATION.slow,
  } as NativeStackNavigationOptions,

  // Bouncy slide for playful interactions
  bouncySlide: {
    animation: 'slide_from_right',
    animationDuration: ANIMATION_DURATION.normal,
    gestureEnabled: true,
    gestureDirection: 'horizontal',
  } as NativeStackNavigationOptions,
} as const;

// Context-specific transitions
export const CONTEXT_TRANSITIONS = {
  // Onboarding flow
  onboarding: {
    animation: 'slide_from_right',
    animationDuration: ANIMATION_DURATION.normal,
    gestureEnabled: true,
    gestureDirection: 'horizontal',
    headerShown: false,
  } as NativeStackNavigationOptions,

  // Form screens
  form: {
    animation: 'slide_from_right',
    animationDuration: ANIMATION_DURATION.fast,
    gestureEnabled: Platform.OS === 'ios',
    gestureDirection: 'horizontal',
  } as NativeStackNavigationOptions,

  // Settings screens
  settings: {
    animation: 'slide_from_right',
    animationDuration: ANIMATION_DURATION.normal,
    gestureEnabled: true,
    gestureDirection: 'horizontal',
  } as NativeStackNavigationOptions,

  // Modal forms
  modalForm: {
    presentation: 'modal',
    animation: 'slide_from_bottom',
    animationDuration: ANIMATION_DURATION.normal,
    gestureEnabled: Platform.OS === 'ios',
    gestureDirection: 'vertical',
  } as NativeStackNavigationOptions,

  // QR scanner
  scanner: {
    animation: 'fade',
    animationDuration: ANIMATION_DURATION.fast,
    gestureEnabled: false,
    headerShown: false,
  } as NativeStackNavigationOptions,

  // Camera screens
  camera: {
    animation: 'slide_from_bottom',
    animationDuration: ANIMATION_DURATION.fast,
    presentation: 'modal',
    gestureEnabled: false,
    headerShown: false,
  } as NativeStackNavigationOptions,

  // Help/Info screens
  info: {
    animation: 'fade',
    animationDuration: ANIMATION_DURATION.normal,
    gestureEnabled: true,
  } as NativeStackNavigationOptions,
} as const;

// Tab bar transitions
export const TAB_TRANSITIONS = {
  // Standard tab switch
  standard: {
    animation: 'fade',
    animationDuration: ANIMATION_DURATION.fast,
  } as NativeStackNavigationOptions,

  // Quick tab switch
  quick: {
    animation: 'none',
  } as NativeStackNavigationOptions,
} as const;

// Platform-specific optimizations
export const getPlatformTransition = (
  transition: keyof typeof STANDARD_TRANSITIONS | keyof typeof CONTEXT_TRANSITIONS | NativeStackNavigationOptions,
  options?: {
    reducedMotion?: boolean;
    highPerformance?: boolean;
  }
): NativeStackNavigationOptions => {
  let baseTransition: NativeStackNavigationOptions;
  
  if (typeof transition === 'string') {
    if (transition in STANDARD_TRANSITIONS) {
      baseTransition = STANDARD_TRANSITIONS[transition as keyof typeof STANDARD_TRANSITIONS];
    } else {
      baseTransition = CONTEXT_TRANSITIONS[transition as keyof typeof CONTEXT_TRANSITIONS];
    }
  } else {
    baseTransition = transition;
  }

  // Handle reduced motion preference
  if (options?.reducedMotion) {
    return {
      ...baseTransition,
      animation: 'fade',
      animationDuration: ANIMATION_DURATION.fast,
    };
  }

  // Handle high performance mode
  if (options?.highPerformance) {
    return {
      ...baseTransition,
      animationDuration: Math.max(
        (baseTransition.animationDuration || ANIMATION_DURATION.normal) * 0.7,
        ANIMATION_DURATION.fast
      ),
    };
  }

  // Platform-specific adjustments
  if (Platform.OS === 'android') {
    return {
      ...baseTransition,
      // Slightly faster animations on Android
      animationDuration: Math.max(
        (baseTransition.animationDuration || ANIMATION_DURATION.normal) * 0.9,
        ANIMATION_DURATION.fast
      ),
    };
  }

  return baseTransition;
};

// Helper to create consistent screen options
export const createScreenOptions = (
  transition: keyof typeof STANDARD_TRANSITIONS | keyof typeof CONTEXT_TRANSITIONS | NativeStackNavigationOptions,
  overrides?: Partial<NativeStackNavigationOptions>
): NativeStackNavigationOptions => ({
  ...getPlatformTransition(transition),
  headerShown: false, // Default to no header
  ...overrides,
});

// Preset screen option configurations
export const SCREEN_OPTIONS = {
  // Main app screens
  main: createScreenOptions('slideFromRight'),
  
  // Modal screens
  modal: createScreenOptions('modal'),
  
  // Settings screens
  settings: createScreenOptions('slideFromRight', {
    headerShown: true,
    title: 'Settings',
  }),
  
  // Profile screens
  profile: createScreenOptions('slideFromRight'),
  
  // Trip screens
  trip: createScreenOptions('slideFromRight'),
  
  // Wallet screens
  wallet: createScreenOptions('slideFromRight'),
  
  // Onboarding screens
  onboarding: createScreenOptions('onboarding'),
  
  // Camera screens
  camera: createScreenOptions('camera'),
  
  // Form screens
  form: createScreenOptions('form'),
} as const;

// Helper to create tab screen options
export const createTabScreenOptions = (
  title: string,
  overrides?: Partial<NativeStackNavigationOptions>
): NativeStackNavigationOptions => ({
  ...TAB_TRANSITIONS.standard,
  title,
  headerShown: false,
  ...overrides,
});

// Common animation configs for custom animations
export const CUSTOM_ANIMATIONS = {
  // Spring animation config
  spring: {
    stiffness: 100,
    damping: 15,
    mass: 1,
  },
  
  // Timing animation config
  timing: {
    duration: ANIMATION_DURATION.normal,
    useNativeDriver: true,
  },
  
  // Gesture config
  gesture: {
    direction: 'horizontal' as const,
    enabled: true,
  },
} as const;