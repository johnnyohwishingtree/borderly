/**
 * Tests for src/utils/animations.ts
 *
 * Covers animation constants, getPlatformAnimation, createSpringConfig,
 * createTimingConfig, and createStaggerConfig.
 */

import { Platform } from 'react-native';
import {
  ANIMATION_DURATION,
  ANIMATION_CURVES,
  SCALE_ANIMATIONS,
  OPACITY_ANIMATIONS,
  TRANSFORM_ANIMATIONS,
  NAVIGATION_ANIMATIONS,
  FEEDBACK_ANIMATIONS,
  LOADING_ANIMATIONS,
  getPlatformAnimation,
  createSpringConfig,
  createTimingConfig,
  createStaggerConfig,
} from '../../src/utils/animations';

// ---------------------------------------------------------------------------
// ANIMATION_DURATION
// ---------------------------------------------------------------------------

describe('ANIMATION_DURATION', () => {
  it('has four duration tiers', () => {
    expect(ANIMATION_DURATION.fast).toBe(150);
    expect(ANIMATION_DURATION.normal).toBe(250);
    expect(ANIMATION_DURATION.slow).toBe(350);
    expect(ANIMATION_DURATION.slowest).toBe(500);
  });

  it('durations increase monotonically', () => {
    expect(ANIMATION_DURATION.fast).toBeLessThan(ANIMATION_DURATION.normal);
    expect(ANIMATION_DURATION.normal).toBeLessThan(ANIMATION_DURATION.slow);
    expect(ANIMATION_DURATION.slow).toBeLessThan(ANIMATION_DURATION.slowest);
  });
});

// ---------------------------------------------------------------------------
// ANIMATION_CURVES
// ---------------------------------------------------------------------------

describe('ANIMATION_CURVES', () => {
  it('contains standard easing curves', () => {
    expect(ANIMATION_CURVES.easeOut).toBe('easeOut');
    expect(ANIMATION_CURVES.easeIn).toBe('easeIn');
    expect(ANIMATION_CURVES.easeInOut).toBe('easeInOut');
    expect(ANIMATION_CURVES.linear).toBe('linear');
    expect(ANIMATION_CURVES.spring).toBe('spring');
  });
});

// ---------------------------------------------------------------------------
// SCALE_ANIMATIONS
// ---------------------------------------------------------------------------

describe('SCALE_ANIMATIONS', () => {
  it('tap starts below 1 and returns to 1', () => {
    expect(SCALE_ANIMATIONS.tap.pressIn).toBeLessThan(1);
    expect(SCALE_ANIMATIONS.tap.pressOut).toBe(1.0);
  });

  it('bounce has the most dramatic scale change', () => {
    expect(SCALE_ANIMATIONS.bounce.pressIn).toBeLessThan(SCALE_ANIMATIONS.tap.pressIn);
  });
});

// ---------------------------------------------------------------------------
// OPACITY_ANIMATIONS
// ---------------------------------------------------------------------------

describe('OPACITY_ANIMATIONS', () => {
  it('fade goes from fully visible to fully hidden', () => {
    expect(OPACITY_ANIMATIONS.fade.show).toBe(1.0);
    expect(OPACITY_ANIMATIONS.fade.hide).toBe(0.0);
  });

  it('subtle keeps partial visibility', () => {
    expect(OPACITY_ANIMATIONS.subtle.hide).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// TRANSFORM_ANIMATIONS
// ---------------------------------------------------------------------------

describe('TRANSFORM_ANIMATIONS', () => {
  it('slideUp starts below and ends at origin', () => {
    expect(TRANSFORM_ANIMATIONS.slideUp.from.translateY).toBeGreaterThan(0);
    expect(TRANSFORM_ANIMATIONS.slideUp.to.translateY).toBe(0);
  });

  it('slideDown starts above and ends at origin', () => {
    expect(TRANSFORM_ANIMATIONS.slideDown.from.translateY).toBeLessThan(0);
    expect(TRANSFORM_ANIMATIONS.slideDown.to.translateY).toBe(0);
  });

  it('scaleIn starts smaller and ends at full size', () => {
    expect(TRANSFORM_ANIMATIONS.scaleIn.from.scale).toBeLessThan(1);
    expect(TRANSFORM_ANIMATIONS.scaleIn.to.scale).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// NAVIGATION_ANIMATIONS
// ---------------------------------------------------------------------------

describe('NAVIGATION_ANIMATIONS', () => {
  it('slideHorizontal enables gestures', () => {
    expect(NAVIGATION_ANIMATIONS.slideHorizontal.gestureEnabled).toBe(true);
    expect(NAVIGATION_ANIMATIONS.slideHorizontal.animation).toBe('slide_from_right');
  });

  it('none disables animation', () => {
    expect(NAVIGATION_ANIMATIONS.none.animation).toBe('none');
  });

  it('fade uses fast duration', () => {
    expect(NAVIGATION_ANIMATIONS.fade.animationDuration).toBe(ANIMATION_DURATION.fast);
  });
});

// ---------------------------------------------------------------------------
// FEEDBACK_ANIMATIONS
// ---------------------------------------------------------------------------

describe('FEEDBACK_ANIMATIONS', () => {
  it('success scales up then back down', () => {
    expect(FEEDBACK_ANIMATIONS.success.scale.from).toBeLessThan(1);
    expect(FEEDBACK_ANIMATIONS.success.scale.to).toBeGreaterThan(1);
    expect(FEEDBACK_ANIMATIONS.success.scale.back).toBe(1.0);
  });

  it('pulse loops', () => {
    expect(FEEDBACK_ANIMATIONS.pulse.loop).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// LOADING_ANIMATIONS
// ---------------------------------------------------------------------------

describe('LOADING_ANIMATIONS', () => {
  it('spinner rotates 360 degrees and loops', () => {
    expect(LOADING_ANIMATIONS.spinner.rotation).toBe(360);
    expect(LOADING_ANIMATIONS.spinner.loop).toBe(true);
  });

  it('shimmer translates horizontally', () => {
    expect(LOADING_ANIMATIONS.shimmer.translateX.from).toBeLessThan(0);
    expect(LOADING_ANIMATIONS.shimmer.translateX.to).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// getPlatformAnimation
// ---------------------------------------------------------------------------

describe('getPlatformAnimation', () => {
  const originalOS = Platform.OS;

  afterEach(() => {
    (Platform as any).OS = originalOS;
  });

  it('returns base duration on iOS with no options', () => {
    (Platform as any).OS = 'ios';
    expect(getPlatformAnimation('normal')).toBe(250);
  });

  it('returns reduced duration on Android', () => {
    (Platform as any).OS = 'android';
    expect(getPlatformAnimation('normal')).toBe(250 * 0.9);
  });

  it('halves duration when reducedMotion is true', () => {
    (Platform as any).OS = 'ios';
    expect(getPlatformAnimation('normal', { reducedMotion: true })).toBe(125);
  });

  it('reduces by 20% in high performance mode', () => {
    (Platform as any).OS = 'ios';
    expect(getPlatformAnimation('normal', { highPerformance: true })).toBe(200);
  });

  it('reducedMotion takes priority over highPerformance', () => {
    (Platform as any).OS = 'ios';
    expect(getPlatformAnimation('fast', { reducedMotion: true, highPerformance: true })).toBe(75);
  });

  it('works for all duration keys', () => {
    (Platform as any).OS = 'ios';
    expect(getPlatformAnimation('fast')).toBe(150);
    expect(getPlatformAnimation('slow')).toBe(350);
    expect(getPlatformAnimation('slowest')).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// createSpringConfig
// ---------------------------------------------------------------------------

describe('createSpringConfig', () => {
  it('returns default spring config when called without args', () => {
    const config = createSpringConfig();
    expect(config).toEqual({
      stiffness: 100,
      damping: 15,
      mass: 1,
      overshootClamping: false,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 0.01,
    });
  });

  it('accepts custom stiffness, damping, and mass', () => {
    const config = createSpringConfig(200, 20, 2);
    expect(config.stiffness).toBe(200);
    expect(config.damping).toBe(20);
    expect(config.mass).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// createTimingConfig
// ---------------------------------------------------------------------------

describe('createTimingConfig', () => {
  it('returns timing config with given duration and default easing', () => {
    const config = createTimingConfig(300);
    expect(config.duration).toBe(300);
    expect(config.easing).toBe('easeOut');
  });

  it('uses default easeOut easing', () => {
    const config = createTimingConfig(100);
    expect(config.easing).toBe(ANIMATION_CURVES.easeOut);
  });
});

// ---------------------------------------------------------------------------
// createStaggerConfig
// ---------------------------------------------------------------------------

describe('createStaggerConfig', () => {
  it('returns array of delays for each item', () => {
    const delays = createStaggerConfig(3);
    expect(delays).toHaveLength(3);
    expect(delays[0]).toBe(0);
  });

  it('uses baseDelay between items', () => {
    const delays = createStaggerConfig(3, 100);
    expect(delays).toEqual([0, 100, 200]);
  });

  it('caps delay to maxDelay / itemCount', () => {
    // baseDelay=100, but maxDelay=60, itemCount=3 => delay = min(100, 20) = 20
    const delays = createStaggerConfig(3, 100, 60);
    expect(delays).toEqual([0, 20, 40]);
  });

  it('returns empty array for zero items', () => {
    const delays = createStaggerConfig(0);
    expect(delays).toEqual([]);
  });

  it('returns single zero delay for one item', () => {
    const delays = createStaggerConfig(1);
    expect(delays).toEqual([0]);
  });
});
