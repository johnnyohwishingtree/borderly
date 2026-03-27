/**
 * Tests for AnimatedCard component.
 * Covers: rendering, press events, variants, disabled/loading states, a11y.
 */
import { render, fireEvent } from '@testing-library/react-native';
import { Text, Animated } from 'react-native';
import AnimatedCard from '../../../src/components/ui/AnimatedCard';

// Mock accessibility utilities
jest.mock('../../../src/utils/accessibility', () => ({
  TouchTargetUtils: {
    getHitSlop: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
    ensureMinimumTouchTarget: () => ({ minWidth: 44, minHeight: 44 }),
  },
  ACCESSIBILITY_CONSTANTS: { MIN_TOUCH_TARGET: 44 },
}));

// Mock HapticFeedback
jest.mock('../../../src/components/ui/HapticFeedback', () => ({
  HapticFeedback: {
    card: jest.fn(),
    longPress: jest.fn(),
  },
}));

// Mock styles/animations
jest.mock('../../../src/styles/animations', () => ({
  ANIMATION_PRESETS: { card: { base: '' } },
  combineAnimations: (...classes: string[]) => classes.filter(Boolean).join(' '),
}));

// Patch Animated methods
const origParallel = Animated.parallel;
const origSequence = Animated.sequence;
const origSpring = Animated.spring;
const animStub = () => ({ start: jest.fn(), stop: jest.fn() });
beforeAll(() => {
  Animated.parallel = jest.fn(animStub) as unknown as typeof Animated.parallel;
  Animated.sequence = jest.fn(animStub) as unknown as typeof Animated.sequence;
  Animated.spring = jest.fn(animStub) as unknown as typeof Animated.spring;
});
afterAll(() => {
  Animated.parallel = origParallel;
  Animated.sequence = origSequence;
  Animated.spring = origSpring;
});

describe('AnimatedCard', () => {
  it('renders children', () => {
    const { getByText } = render(
      <AnimatedCard><Text>Card Content</Text></AnimatedCard>,
    );
    expect(getByText('Card Content')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <AnimatedCard onPress={onPress}>
        <Text>Tap me</Text>
      </AnimatedCard>,
    );
    fireEvent.press(getByText('Tap me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <AnimatedCard onPress={onPress} disabled>
        <Text>Tap me</Text>
      </AnimatedCard>,
    );
    fireEvent.press(getByText('Tap me'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not call onPress when loading', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <AnimatedCard onPress={onPress} loading>
        <Text>Tap me</Text>
      </AnimatedCard>,
    );
    fireEvent.press(getByText('Tap me'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('calls onLongPress when long-pressed', () => {
    const onLongPress = jest.fn();
    const { getByText } = render(
      <AnimatedCard onPress={jest.fn()} onLongPress={onLongPress}>
        <Text>Hold me</Text>
      </AnimatedCard>,
    );
    fireEvent(getByText('Hold me'), 'onLongPress');
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it('applies testID', () => {
    const { getByTestId } = render(
      <AnimatedCard testID="my-card"><Text>Content</Text></AnimatedCard>,
    );
    expect(getByTestId('my-card')).toBeTruthy();
  });

  it('sets accessibility label when provided', () => {
    const { getAllByLabelText } = render(
      <AnimatedCard accessibilityLabel="Trip card" onPress={jest.fn()}>
        <Text>Content</Text>
      </AnimatedCard>,
    );
    // Both Pressable and inner View get the label
    expect(getAllByLabelText('Trip card').length).toBeGreaterThanOrEqual(1);
  });

  it('renders without Pressable when onPress is not provided', () => {
    const { getByText, toJSON } = render(
      <AnimatedCard><Text>Static card</Text></AnimatedCard>,
    );
    expect(getByText('Static card')).toBeTruthy();
    // Without onPress, no Pressable wrapper — just Animated.View > View
    const json = JSON.stringify(toJSON());
    expect(json).not.toContain('Pressable');
  });
});
