/**
 * Animation styles for Tailwind CSS classes
 * Provides consistent animation styles across the app using NativeWind
 */

// Transition classes for smooth animations
export const TRANSITION_CLASSES = {
  all: 'transition-all',
  colors: 'transition-colors',
  opacity: 'transition-opacity',
  transform: 'transition-transform',
  shadow: 'transition-shadow',
} as const;

// Duration classes
export const DURATION_CLASSES = {
  fast: 'duration-150',
  normal: 'duration-250', 
  slow: 'duration-350',
  slowest: 'duration-500',
} as const;

// Ease classes
export const EASE_CLASSES = {
  in: 'ease-in',
  out: 'ease-out',
  inOut: 'ease-in-out',
  linear: 'ease-linear',
} as const;

// Scale classes for hover/press states
export const SCALE_CLASSES = {
  none: 'scale-100',
  subtle: 'scale-[0.98]',
  normal: 'scale-95',
  press: 'scale-[0.96]',
  bounce: 'scale-105',
} as const;

// Transform classes for entrance animations
export const TRANSFORM_CLASSES = {
  slideUp: 'translate-y-2 opacity-0',
  slideDown: '-translate-y-2 opacity-0',
  slideLeft: 'translate-x-2 opacity-0',
  slideRight: '-translate-x-2 opacity-0',
  scaleIn: 'scale-95 opacity-0',
  fadeIn: 'opacity-0',
} as const;

// Shadow classes for elevation changes
export const SHADOW_CLASSES = {
  none: 'shadow-none',
  sm: 'shadow-sm',
  normal: 'shadow-md shadow-gray-900/10',
  lg: 'shadow-lg shadow-gray-900/15',
  xl: 'shadow-xl shadow-gray-900/20',
  card: 'shadow-lg shadow-gray-900/10',
  button: 'shadow-lg shadow-blue-600/25',
} as const;

// Composite animation classes
export const ANIMATION_PRESETS = {
  // Button animations
  button: {
    base: `${TRANSITION_CLASSES.all} ${DURATION_CLASSES.fast} ${EASE_CLASSES.out}`,
    hover: `${SCALE_CLASSES.bounce} ${SHADOW_CLASSES.lg}`,
    press: `${SCALE_CLASSES.press} ${SHADOW_CLASSES.sm}`,
    loading: `${TRANSITION_CLASSES.opacity} ${DURATION_CLASSES.normal}`,
  },
  
  // Card animations
  card: {
    base: `${TRANSITION_CLASSES.all} ${DURATION_CLASSES.normal} ${EASE_CLASSES.out}`,
    hover: `${SCALE_CLASSES.subtle} ${SHADOW_CLASSES.card}`,
    press: `${SCALE_CLASSES.press} ${SHADOW_CLASSES.sm}`,
    entrance: `${TRANSFORM_CLASSES.slideUp} ${TRANSITION_CLASSES.all} ${DURATION_CLASSES.normal}`,
  },
  
  // Input animations
  input: {
    base: `${TRANSITION_CLASSES.colors} ${DURATION_CLASSES.fast} ${EASE_CLASSES.out}`,
    focus: 'ring-2 ring-blue-500/20 border-blue-500',
    error: 'ring-2 ring-red-500/20 border-red-500',
  },
  
  // List item animations
  listItem: {
    base: `${TRANSITION_CLASSES.all} ${DURATION_CLASSES.fast} ${EASE_CLASSES.out}`,
    hover: `${SCALE_CLASSES.subtle} ${SHADOW_CLASSES.sm}`,
    entrance: `${TRANSFORM_CLASSES.slideLeft} ${TRANSITION_CLASSES.all} ${DURATION_CLASSES.normal}`,
  },
  
  // Modal animations
  modal: {
    backdrop: `${TRANSITION_CLASSES.opacity} ${DURATION_CLASSES.normal}`,
    content: `${TRANSFORM_CLASSES.scaleIn} ${TRANSITION_CLASSES.all} ${DURATION_CLASSES.normal}`,
  },
  
  // Loading animations
  loading: {
    spinner: 'animate-spin',
    pulse: 'animate-pulse',
    bounce: 'animate-bounce',
  },
  
  // Success/Error feedback
  feedback: {
    success: `${SCALE_CLASSES.bounce} ${TRANSITION_CLASSES.transform} ${DURATION_CLASSES.normal}`,
    error: 'animate-shake', // Custom shake animation would need to be added to tailwind config
  },
} as const;

// Helper function to combine animation classes
export const combineAnimations = (...classes: string[]): string => {
  return classes.filter(Boolean).join(' ');
};

// Helper function to create staggered animation delays
export const getStaggerDelay = (index: number, baseDelay = 50): string => {
  const delay = Math.min(index * baseDelay, 500); // Max delay of 500ms
  return `delay-[${delay}ms]`;
};

// Helper function to get entrance animation with stagger
export const getEntranceAnimation = (
  preset: keyof typeof ANIMATION_PRESETS,
  index?: number
): string => {
  const presetConfig = ANIMATION_PRESETS[preset];
  const baseAnimation = (presetConfig && 'entrance' in presetConfig) ? presetConfig.entrance : '';
  const staggerDelay = index !== undefined ? getStaggerDelay(index) : '';
  return combineAnimations(baseAnimation, staggerDelay);
};

// Common animation combinations
export const COMMON_ANIMATIONS = {
  fadeIn: combineAnimations(
    TRANSFORM_CLASSES.fadeIn,
    TRANSITION_CLASSES.opacity,
    DURATION_CLASSES.normal,
    EASE_CLASSES.out
  ),
  slideUpFade: combineAnimations(
    TRANSFORM_CLASSES.slideUp,
    TRANSITION_CLASSES.all,
    DURATION_CLASSES.normal,
    EASE_CLASSES.out
  ),
  scaleInFade: combineAnimations(
    TRANSFORM_CLASSES.scaleIn,
    TRANSITION_CLASSES.all,
    DURATION_CLASSES.normal,
    EASE_CLASSES.out
  ),
  buttonPress: combineAnimations(
    TRANSITION_CLASSES.all,
    DURATION_CLASSES.fast,
    EASE_CLASSES.out
  ),
  cardHover: combineAnimations(
    TRANSITION_CLASSES.all,
    DURATION_CLASSES.normal,
    EASE_CLASSES.out
  ),
} as const;