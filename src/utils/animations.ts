import { Platform } from 'react-native';

/**
 * Animation utilities for React Native
 * Provides consistent animation configurations across the app
 */

// Base animation configurations
export const ANIMATION_DURATION = {
  fast: 150,
  normal: 250,
  slow: 350,
  slowest: 500,
} as const;

export const ANIMATION_CURVES = {
  easeOut: 'easeOut',
  easeIn: 'easeIn',
  easeInOut: 'easeInOut',
  linear: 'linear',
  spring: 'spring',
  bounceIn: 'bounceIn',
  bounceOut: 'bounceOut',
} as const;

// Scale animations for interactive elements
export const SCALE_ANIMATIONS = {
  tap: {
    pressIn: 0.96,
    pressOut: 1.0,
    duration: ANIMATION_DURATION.fast,
  },
  subtle: {
    pressIn: 0.98,
    pressOut: 1.0,
    duration: ANIMATION_DURATION.fast,
  },
  bounce: {
    pressIn: 0.94,
    pressOut: 1.02,
    duration: ANIMATION_DURATION.normal,
  },
} as const;

// Opacity animations for fade effects
export const OPACITY_ANIMATIONS = {
  fade: {
    show: 1.0,
    hide: 0.0,
    duration: ANIMATION_DURATION.normal,
  },
  subtle: {
    show: 1.0,
    hide: 0.7,
    duration: ANIMATION_DURATION.fast,
  },
} as const;

// Transform animations for layout changes
export const TRANSFORM_ANIMATIONS = {
  slideUp: {
    from: { translateY: 20, opacity: 0 },
    to: { translateY: 0, opacity: 1 },
    duration: ANIMATION_DURATION.normal,
  },
  slideDown: {
    from: { translateY: -20, opacity: 0 },
    to: { translateY: 0, opacity: 1 },
    duration: ANIMATION_DURATION.normal,
  },
  slideLeft: {
    from: { translateX: 20, opacity: 0 },
    to: { translateX: 0, opacity: 1 },
    duration: ANIMATION_DURATION.normal,
  },
  slideRight: {
    from: { translateX: -20, opacity: 0 },
    to: { translateX: 0, opacity: 1 },
    duration: ANIMATION_DURATION.normal,
  },
  scaleIn: {
    from: { scale: 0.9, opacity: 0 },
    to: { scale: 1, opacity: 1 },
    duration: ANIMATION_DURATION.normal,
  },
} as const;

// Navigation transition configurations
export const NAVIGATION_ANIMATIONS = {
  slideHorizontal: {
    gestureEnabled: true,
    gestureDirection: 'horizontal' as const,
    animation: 'slide_from_right' as const,
    animationDuration: ANIMATION_DURATION.normal,
  },
  slideVertical: {
    gestureEnabled: true,
    gestureDirection: 'vertical' as const,
    animation: 'slide_from_bottom' as const,
    animationDuration: ANIMATION_DURATION.normal,
  },
  fade: {
    animation: 'fade' as const,
    animationDuration: ANIMATION_DURATION.fast,
  },
  modal: {
    presentation: 'modal' as const,
    animation: 'slide_from_bottom' as const,
    animationDuration: ANIMATION_DURATION.normal,
    gestureEnabled: Platform.OS === 'ios',
    gestureDirection: 'vertical' as const,
  },
  none: {
    animation: 'none' as const,
  },
} as const;

// Success/error animation configs
export const FEEDBACK_ANIMATIONS = {
  success: {
    scale: { from: 0.8, to: 1.1, back: 1.0 },
    duration: ANIMATION_DURATION.normal,
  },
  error: {
    shake: { translateX: [-10, 10, -10, 10, 0] },
    duration: ANIMATION_DURATION.slow,
  },
  pulse: {
    scale: { from: 1.0, to: 1.05, back: 1.0 },
    duration: ANIMATION_DURATION.slowest,
    loop: true,
  },
} as const;

// Loading animation configurations
export const LOADING_ANIMATIONS = {
  spinner: {
    rotation: 360,
    duration: 1000,
    loop: true,
  },
  pulse: {
    scale: { from: 0.95, to: 1.05 },
    opacity: { from: 0.5, to: 1.0 },
    duration: 1200,
    loop: true,
  },
  shimmer: {
    translateX: { from: -100, to: 100 },
    duration: 1500,
    loop: true,
  },
} as const;

// Platform-specific animation adjustments
export const getPlatformAnimation = <T extends keyof typeof ANIMATION_DURATION>(
  duration: T,
  options?: {
    reducedMotion?: boolean;
    highPerformance?: boolean;
  }
): number => {
  const baseDuration = ANIMATION_DURATION[duration];
  
  // Reduce animations if requested
  if (options?.reducedMotion) {
    return baseDuration * 0.5;
  }
  
  // Adjust for high performance mode
  if (options?.highPerformance) {
    return baseDuration * 0.8;
  }
  
  // Platform-specific adjustments
  if (Platform.OS === 'android') {
    return baseDuration * 0.9; // Slightly faster on Android
  }
  
  return baseDuration;
};

// Helper to create spring animation config
export const createSpringConfig = (
  stiffness = 100,
  damping = 15,
  mass = 1
) => ({
  stiffness,
  damping,
  mass,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
});

// Helper to create timing animation config
export const createTimingConfig = (
  duration: number,
  easing = ANIMATION_CURVES.easeOut
) => ({
  duration,
  easing,
});

// Stagger animation helper for list items
export const createStaggerConfig = (
  itemCount: number,
  baseDelay = 50,
  maxDelay = 300
) => {
  const delay = Math.min(baseDelay, maxDelay / itemCount);
  return Array.from({ length: itemCount }, (_, index) => index * delay);
};