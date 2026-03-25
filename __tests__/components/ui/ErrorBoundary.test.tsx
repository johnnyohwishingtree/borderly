/**
 * Tests for ErrorBoundary component.
 * Covers: normal rendering, error catching, fallback UI, retry, onError callback.
 */
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import ErrorBoundary from '../../../src/components/ui/ErrorBoundary';

// Component that throws on render
function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test component error');
  }
  return <Text>Normal content</Text>;
}

// Suppress console.error during error boundary tests
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <Text>Child content</Text>
      </ErrorBoundary>,
    );
    expect(getByText('Child content')).toBeTruthy();
  });

  it('renders fallback UI when a child throws', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(getByText(/something went wrong/i)).toBeTruthy();
  });

  it('shows a try again button in the default fallback', () => {
    const { getAllByText } = render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    const tryAgainElements = getAllByText(/try again/i);
    expect(tryAgainElements.length).toBeGreaterThan(0);
  });

  it('calls resetError from custom fallback to recover', () => {
    let shouldThrow = true;

    function ConditionalThrow() {
      if (shouldThrow) throw new Error('fail');
      return <Text>Recovered</Text>;
    }

    function CustomFallback({ resetError }: { error: Error; resetError: () => void }) {
      return (
        <Text testID="reset-btn" onPress={() => {
          shouldThrow = false;
          resetError();
        }}>Reset</Text>
      );
    }

    const { getByTestId, getByText } = render(
      <ErrorBoundary fallback={CustomFallback}>
        <ConditionalThrow />
      </ErrorBoundary>,
    );

    fireEvent.press(getByTestId('reset-btn'));
    expect(getByText('Recovered')).toBeTruthy();
  });

  it('calls onError callback when error occurs', () => {
    const onError = jest.fn();
    render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) }),
    );
  });

  it('renders custom fallback when provided', () => {
    function CustomFallback({ error }: { error: Error; resetError: () => void }) {
      return <Text>Custom error: {error.message}</Text>;
    }

    const { getByText } = render(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(getByText('Custom error: Test component error')).toBeTruthy();
  });
});
