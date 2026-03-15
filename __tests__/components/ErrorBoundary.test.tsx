/**
 * Unit tests for ErrorBoundary component
 * Tests error catching, fallback UI rendering, and reset functionality.
 */
import { render, fireEvent } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import ErrorBoundary, { useErrorHandler } from '../../src/components/ui/ErrorBoundary';

// Mock dependencies
jest.mock('../../src/utils/errorHandling', () => ({
  createAppError: jest.fn((_code: string, message: string) => ({
    code: _code,
    message,
    recoverable: true,
    userMessage: 'An error occurred',
  })),
  logError: jest.fn(),
  ERROR_CODES: {
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  },
}));

jest.mock('../../src/components/ui/Button', () => {
  const MockReact = require('react');
  const { TouchableOpacity } = require('react-native');
  return function MockButton({ title, onPress }: { title: string; onPress: () => void }) {
    return MockReact.createElement(
      TouchableOpacity,
      { onPress, testID: 'error-boundary-button' },
      MockReact.createElement(Text, null, title)
    );
  };
});

// Component that throws an error when `shouldThrow` is true
function BrokenComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test render error');
  }
  return <Text>Working component</Text>;
}

// Suppress expected error output from React's error boundary
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});
afterAll(() => {
  console.error = originalConsoleError;
});

describe('ErrorBoundary', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders children when no error occurs', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <Text>Normal content</Text>
      </ErrorBoundary>
    );

    expect(getByText('Normal content')).toBeTruthy();
  });

  it('renders default fallback UI when a child throws', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <BrokenComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByText(/sorry for the inconvenience/i)).toBeTruthy();
  });

  it('renders a "Try Again" button in the default fallback UI', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <BrokenComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Try Again')).toBeTruthy();
  });

  it('recovers to non-error state when "Try Again" is pressed after underlying issue is resolved', () => {
    // Use a mutable ref so we can fix the error condition without remounting
    const shouldThrowRef = { current: true };

    function RecoverableComponent() {
      if (shouldThrowRef.current) {
        throw new Error('Recoverable error');
      }
      return <Text>Recovered!</Text>;
    }

    const { getByText, queryByText } = render(
      <ErrorBoundary>
        <RecoverableComponent />
      </ErrorBoundary>
    );

    // Error fallback is shown
    expect(getByText('Something went wrong')).toBeTruthy();

    // Fix the underlying issue before retrying
    shouldThrowRef.current = false;

    // Press Try Again — boundary resets and re-renders children
    fireEvent.press(getByText('Try Again'));

    // Component renders normally after recovery
    expect(getByText('Recovered!')).toBeTruthy();
    expect(queryByText('Something went wrong')).toBeNull();
  });

  it('accepts a custom fallback component', () => {
    const CustomFallback = ({ error, resetError }: { error: Error; resetError: () => void }) => (
      <View>
        <Text>Custom error: {error.message}</Text>
        <Text onPress={resetError} testID="custom-reset">Reset</Text>
      </View>
    );

    const { getByText } = render(
      <ErrorBoundary fallback={CustomFallback}>
        <BrokenComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(getByText('Custom error: Test render error')).toBeTruthy();
  });

  it('calls onError callback when a child throws', () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <BrokenComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it('calls onError with the correct error message', () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <BrokenComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    const [capturedError] = onError.mock.calls[0];
    expect(capturedError.message).toBe('Test render error');
  });

  it('renders children normally when no error is thrown', () => {
    const onError = jest.fn();

    const { getByText } = render(
      <ErrorBoundary onError={onError}>
        <BrokenComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(getByText('Working component')).toBeTruthy();
    expect(onError).not.toHaveBeenCalled();
  });

  it('shows error details in development mode', () => {
    const g = global as Record<string, unknown>;
    const originalDev = g['__DEV__'];
    g['__DEV__'] = true;

    const { getByText } = render(
      <ErrorBoundary>
        <BrokenComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // In dev mode, the error message should be shown
    expect(getByText('Test render error')).toBeTruthy();

    g['__DEV__'] = originalDev;
  });

  it('does not show error details in production mode', () => {
    const g = global as Record<string, unknown>;
    const originalDev = g['__DEV__'];
    g['__DEV__'] = false;

    const { queryByText } = render(
      <ErrorBoundary>
        <BrokenComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // In production mode, the raw error message should NOT be shown
    expect(queryByText('Test render error')).toBeNull();

    g['__DEV__'] = originalDev;
  });

  it('logs error using errorHandling utilities', () => {
    const { logError } = require('../../src/utils/errorHandling');

    render(
      <ErrorBoundary>
        <BrokenComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(logError).toHaveBeenCalled();
  });

  it('can wrap multiple children', () => {
    const { getByText } = render(
      <ErrorBoundary>
        <Text>Child 1</Text>
        <Text>Child 2</Text>
        <Text>Child 3</Text>
      </ErrorBoundary>
    );

    expect(getByText('Child 1')).toBeTruthy();
    expect(getByText('Child 2')).toBeTruthy();
    expect(getByText('Child 3')).toBeTruthy();
  });
});

describe('useErrorHandler hook', () => {
  it('captures errors and re-throws them to the nearest ErrorBoundary', () => {
    function ComponentWithHook() {
      const { captureError } = useErrorHandler();

      const handlePress = () => {
        captureError(new Error('Hook-captured error'));
      };

      return (
        <Text testID="trigger" onPress={handlePress}>
          Trigger Error
        </Text>
      );
    }

    const { getByTestId, getByText } = render(
      <ErrorBoundary>
        <ComponentWithHook />
      </ErrorBoundary>
    );

    // Initially renders fine
    expect(getByText('Trigger Error')).toBeTruthy();

    // Pressing the button triggers an error which propagates to ErrorBoundary
    fireEvent.press(getByTestId('trigger'));

    // ErrorBoundary should now show the fallback UI
    expect(getByText('Something went wrong')).toBeTruthy();
  });
});
