/**
 * Tests for LoadingIndicator component.
 * Covers: rendering, variants, sizes, progress, cancel, accessibility.
 */
import { render, fireEvent } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { ReactTestRendererJSON } from 'react-test-renderer';
import LoadingIndicator from '../../../src/components/ui/LoadingIndicator';

// Patch Animated methods to return start/stop stubs
const origLoop = Animated.loop;
const origSequence = Animated.sequence;
const origDelay = Animated.delay;
const animStub = () => ({ start: jest.fn(), stop: jest.fn() });
beforeAll(() => {
  Animated.loop = jest.fn(animStub) as any;
  Animated.sequence = jest.fn(animStub) as any;
  Animated.delay = jest.fn(animStub) as any;
});
afterAll(() => {
  Animated.loop = origLoop;
  Animated.sequence = origSequence;
  Animated.delay = origDelay;
});

describe('LoadingIndicator', () => {
  it('renders with default props', () => {
    const { toJSON } = render(<LoadingIndicator />);
    expect((toJSON() as ReactTestRendererJSON).props.accessibilityLabel).toBe('Loading');
  });

  it('renders spinner variant by default', () => {
    const { toJSON } = render(<LoadingIndicator />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('ActivityIndicator');
  });

  it('renders custom loading text', () => {
    const { getByText } = render(<LoadingIndicator text="Please wait..." />);
    getByText('Please wait...');
  });

  it('renders dots variant without crashing', () => {
    // Dots uses Animated.loop(Animated.sequence(...)) which are mocked
    expect(() => {
      const { unmount } = render(<LoadingIndicator variant="dots" />);
      unmount();
    }).not.toThrow();
  });

  it('renders pulse variant', () => {
    const { toJSON } = render(<LoadingIndicator variant="pulse" />);
    expect(toJSON()).not.toBeNull();
  });

  it('shows progress percentage when showProgress is true', () => {
    const { getByText } = render(
      <LoadingIndicator showProgress progress={0.75} />,
    );
    getByText('75%');
  });

  it('renders 0% when progress is 0', () => {
    const { getByText } = render(
      <LoadingIndicator showProgress progress={0} />,
    );
    getByText('0%');
  });

  it('does not show progress when showProgress is false', () => {
    const { queryByText } = render(
      <LoadingIndicator progress={0.5} />,
    );
    expect(queryByText('50%')).toBeNull();
  });

  it('renders cancel button when cancelable with onCancel', () => {
    const onCancel = jest.fn();
    const { getByLabelText } = render(
      <LoadingIndicator cancelable onCancel={onCancel} />,
    );
    const cancelButton = getByLabelText('Cancel loading');
    fireEvent.press(cancelButton);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not render cancel button when not cancelable', () => {
    const { queryByLabelText } = render(
      <LoadingIndicator onCancel={jest.fn()} />,
    );
    expect(queryByLabelText('Cancel loading')).toBeNull();
  });

  it('has accessible label defaulting to Loading on outer container', () => {
    const { toJSON } = render(<LoadingIndicator />);
    expect((toJSON() as ReactTestRendererJSON).props.accessibilityLabel).toBe('Loading');
  });

  it('uses custom text as accessible label', () => {
    const { toJSON } = render(<LoadingIndicator text="Saving..." />);
    expect((toJSON() as ReactTestRendererJSON).props.accessibilityLabel).toBe('Saving...');
  });

  it('renders small size', () => {
    const { toJSON } = render(<LoadingIndicator size="small" />);
    const json = JSON.stringify(toJSON());
    // Small size passes 'small' string to ActivityIndicator
    expect(json).toContain('"small"');
  });
});
