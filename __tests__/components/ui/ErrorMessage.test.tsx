// React imported for JSX
import { Text, Pressable } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { ErrorMessage, useErrorMessage } from '../../../src/components/ui/ErrorMessage';
import { createAppError, ERROR_CODES } from '../../../src/utils/errorHandling';

describe('ErrorMessage Component', () => {
  const mockError = createAppError(
    ERROR_CODES.NETWORK_UNAVAILABLE,
    'Network error details',
    'Please check your internet connection'
  );

  it('renders null when no error', () => {
    const { queryByText } = render(<ErrorMessage error={null} />);
    expect(queryByText('Error')).toBeNull();
  });

  it('renders string error', () => {
    const { getAllByText } = render(<ErrorMessage error="Something went wrong" />);
    const elements = getAllByText('Something went wrong');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  it('renders AppError with user message', () => {
    const { getByText } = render(<ErrorMessage error={mockError} />);
    expect(getByText('Please check your internet connection')).toBeTruthy();
  });

  it('shows retry button when showRetry is true and error is recoverable', () => {
    const onRetryMock = jest.fn();
    const { getByText } = render(
      <ErrorMessage 
        error={mockError} 
        showRetry 
        onRetry={onRetryMock}
      />
    );
    
    const retryButton = getByText('Try Again');
    expect(retryButton).toBeTruthy();
    
    fireEvent.press(retryButton);
    expect(onRetryMock).toHaveBeenCalled();
  });

  it('shows dismiss button when onDismiss is provided', () => {
    const onDismissMock = jest.fn();
    const { getByText } = render(
      <ErrorMessage 
        error={mockError} 
        onDismiss={onDismissMock}
      />
    );
    
    const dismissButton = getByText('Dismiss');
    expect(dismissButton).toBeTruthy();
    
    fireEvent.press(dismissButton);
    expect(onDismissMock).toHaveBeenCalled();
  });

  it('applies different variants correctly', () => {
    const { getByText: getInlineText } = render(
      <ErrorMessage error="Test Inline" variant="inline" />
    );
    const { getByText: getCardText } = render(
      <ErrorMessage error="Test Card" variant="card" />
    );
    const { getByText: getFullscreenText } = render(
      <ErrorMessage error="Test Fullscreen" variant="fullscreen" />
    );

    // All variants should render the error message
    expect(getInlineText('Test Inline')).toBeTruthy();
    expect(getCardText('Test Card')).toBeTruthy();
    expect(getFullscreenText('Test Fullscreen')).toBeTruthy();
  });
});

describe('useErrorMessage Hook', () => {
  const TestComponent = () => {
    const { error, showError, clearError } = useErrorMessage();
    
    return (
      <>
        <ErrorMessage error={error} />
        <Pressable 
          onPress={() => showError('Test error')}
          testID="show-error"
        >
          <Text>Show Error</Text>
        </Pressable>
        <Pressable 
          onPress={clearError}
          testID="clear-error"
        >
          <Text>Clear Error</Text>
        </Pressable>
      </>
    );
  };

  it('manages error state correctly', () => {
    const { getByTestId, queryByText, getByText } = render(<TestComponent />);
    
    // Initially no error
    expect(queryByText('Test error')).toBeNull();
    
    // Show error
    fireEvent.press(getByTestId('show-error'));
    expect(getByText('Test error')).toBeTruthy();
    
    // Clear error
    fireEvent.press(getByTestId('clear-error'));
    expect(queryByText('Test error')).toBeNull();
  });
});