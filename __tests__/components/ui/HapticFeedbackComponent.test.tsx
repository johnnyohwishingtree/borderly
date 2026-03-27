/**
 * Tests for HapticFeedback utility object and triggerHaptic function.
 * Covers: all semantic feedback methods, HAPTIC_PATTERNS mapping.
 */
import { HapticFeedback, HAPTIC_PATTERNS, triggerHaptic } from '../../../src/components/ui/HapticFeedback';
import { trigger } from 'react-native-haptic-feedback';

describe('HapticFeedback', () => {
  beforeEach(() => {
    (trigger as jest.Mock).mockClear();
  });

  it('triggers button feedback with light haptic by default', () => {
    HapticFeedback.button();
    expect(trigger).toHaveBeenCalledWith(
      HAPTIC_PATTERNS.light,
      expect.objectContaining({ enableVibrateFallback: true }),
    );
  });

  it('triggers button feedback with medium haptic for large size', () => {
    HapticFeedback.button('large');
    expect(trigger).toHaveBeenCalledWith(
      HAPTIC_PATTERNS.medium,
      expect.objectContaining({ enableVibrateFallback: true }),
    );
  });

  it('triggers toggle feedback with selection haptic', () => {
    HapticFeedback.toggle();
    expect(trigger).toHaveBeenCalledWith(
      HAPTIC_PATTERNS.selection,
      expect.objectContaining({ enableVibrateFallback: true }),
    );
  });

  it('triggers card feedback with light haptic', () => {
    HapticFeedback.card();
    expect(trigger).toHaveBeenCalledWith(
      HAPTIC_PATTERNS.light,
      expect.objectContaining({ enableVibrateFallback: true }),
    );
  });

  it('triggers success feedback', () => {
    HapticFeedback.success();
    expect(trigger).toHaveBeenCalledWith(
      HAPTIC_PATTERNS.success,
      expect.objectContaining({ enableVibrateFallback: true }),
    );
  });

  it('triggers error feedback', () => {
    HapticFeedback.error();
    expect(trigger).toHaveBeenCalledWith(
      HAPTIC_PATTERNS.error,
      expect.objectContaining({ enableVibrateFallback: true }),
    );
  });

  it('triggers warning feedback', () => {
    HapticFeedback.warning();
    expect(trigger).toHaveBeenCalledWith(
      HAPTIC_PATTERNS.warning,
      expect.objectContaining({ enableVibrateFallback: true }),
    );
  });

  it('triggers longPress feedback with heavy haptic', () => {
    HapticFeedback.longPress();
    expect(trigger).toHaveBeenCalledWith(
      HAPTIC_PATTERNS.heavy,
      expect.objectContaining({ enableVibrateFallback: true }),
    );
  });

  it('triggers tab feedback with selection haptic', () => {
    HapticFeedback.tab();
    expect(trigger).toHaveBeenCalledWith(
      HAPTIC_PATTERNS.selection,
      expect.objectContaining({ enableVibrateFallback: true }),
    );
  });
});

describe('triggerHaptic', () => {
  beforeEach(() => {
    (trigger as jest.Mock).mockClear();
  });

  it('triggers haptic with pattern name', () => {
    triggerHaptic('light');
    expect(trigger).toHaveBeenCalledWith(
      HAPTIC_PATTERNS.light,
      expect.objectContaining({ enableVibrateFallback: true }),
    );
  });
});

describe('HAPTIC_PATTERNS', () => {
  it('maps light to impactLight', () => {
    expect(HAPTIC_PATTERNS.light).toBe('impactLight');
  });

  it('maps success to notificationSuccess', () => {
    expect(HAPTIC_PATTERNS.success).toBe('notificationSuccess');
  });

  it('maps error to notificationError', () => {
    expect(HAPTIC_PATTERNS.error).toBe('notificationError');
  });
});
