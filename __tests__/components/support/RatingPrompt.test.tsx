/**
 * Tests for RatingPrompt component.
 * Covers: modal visibility, star rating selection, submission via feedbackCollector,
 * detailed feedback toggle on low rating, close/dismiss, trigger titles.
 */
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import RatingPrompt from '../../../src/components/support/RatingPrompt';
import { feedbackCollector } from '../../../src/services/support/feedbackCollector';

jest.mock('lucide-react-native', () => ({
  Lock: 'Lock',
}));

jest.mock('@/components/ui', () => {
  const { TouchableOpacity, Text, View } = require('react-native');
  return {
    Button: ({ title, onPress, disabled, loading, testID }: any) => (
      <TouchableOpacity
        onPress={disabled || loading ? undefined : onPress}
        testID={testID}
        accessibilityRole="button"
      >
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
    Card: ({ children }: any) => <View>{children}</View>,
  };
});

jest.mock('@/services/support/feedbackCollector', () => ({
  feedbackCollector: {
    submitFeedback: jest.fn(),
  },
}));

const mockSubmitFeedback = feedbackCollector.submitFeedback as jest.MockedFunction<typeof feedbackCollector.submitFeedback>;

describe('RatingPrompt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert');
  });

  // ─── Visibility ───────────────────────────────────────────────────────────

  it('renders modal when visible', () => {
    const { getByText } = render(
      <RatingPrompt visible={true} onClose={jest.fn()} />,
    );
    getByText('Rate your experience');
  });

  it('passes visible=false to Modal when not visible', () => {
    const { UNSAFE_getByType } = render(
      <RatingPrompt visible={false} onClose={jest.fn()} />,
    );
    const { Modal } = require('react-native');
    expect(UNSAFE_getByType(Modal).props.visible).toBe(false);
  });

  // ─── Trigger titles ──────────────────────────────────────────────────────

  it('shows app-usage trigger title', () => {
    const { getByText } = render(
      <RatingPrompt visible={true} onClose={jest.fn()} trigger="app-usage" />,
    );
    getByText("How's your experience?");
  });

  it('shows form-completion trigger title', () => {
    const { getByText } = render(
      <RatingPrompt visible={true} onClose={jest.fn()} trigger="form-completion" />,
    );
    getByText('How was form filling?');
  });

  // ─── Star rating selection ────────────────────────────────────────────────

  it('allows selecting a star rating', () => {
    const { getByText } = render(
      <RatingPrompt visible={true} onClose={jest.fn()} />,
    );
    // Press the 4-star emoji button (😊)
    fireEvent.press(getByText('😊'));
    getByText('Good (4/5)');
  });

  it('shows correct text for each rating value', () => {
    const { getByText } = render(
      <RatingPrompt visible={true} onClose={jest.fn()} />,
    );

    fireEvent.press(getByText('😞'));
    getByText('Very Poor (1/5)');

    fireEvent.press(getByText('🤩'));
    getByText('Excellent (5/5)');
  });

  // ─── Submit rating ───────────────────────────────────────────────────────

  it('shows alert when submitting without a rating', () => {
    const { getByText } = render(
      <RatingPrompt visible={true} onClose={jest.fn()} />,
    );
    fireEvent.press(getByText('Submit Rating'));
    expect(Alert.alert).toHaveBeenCalledWith('Please Rate', 'Please select a rating before continuing.');
  });

  it('submits high rating via feedbackCollector and shows thank you', async () => {
    mockSubmitFeedback.mockResolvedValue({ success: true, feedbackId: '1' });
    const onClose = jest.fn();
    const onFeedbackSubmitted = jest.fn();

    const { getByText } = render(
      <RatingPrompt visible={true} onClose={onClose} onFeedbackSubmitted={onFeedbackSubmitted} />,
    );

    fireEvent.press(getByText('🤩')); // 5 stars
    fireEvent.press(getByText('Submit Rating'));

    await waitFor(() => {
      expect(mockSubmitFeedback).toHaveBeenCalledWith(
        expect.objectContaining({ rating: 5, type: 'general' }),
      );
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Thank you!',
        expect.stringContaining('positive feedback'),
        expect.any(Array),
      );
    });
  });

  it('shows detailed feedback form on low rating (≤3)', async () => {
    mockSubmitFeedback.mockResolvedValue({ success: true, feedbackId: '2' });

    const { getByText } = render(
      <RatingPrompt visible={true} onClose={jest.fn()} />,
    );

    fireEvent.press(getByText('😐')); // 3 stars
    fireEvent.press(getByText('Submit Rating'));

    await waitFor(() => {
      getByText('Help us improve!');
      getByText('Share Detailed Feedback');
      getByText('No Thanks');
    });
  });

  it('shows error alert when submission fails', async () => {
    mockSubmitFeedback.mockResolvedValue({ success: false, feedbackId: '' });

    const { getByText } = render(
      <RatingPrompt visible={true} onClose={jest.fn()} />,
    );

    fireEvent.press(getByText('😊')); // 4 stars
    fireEvent.press(getByText('Submit Rating'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to submit rating. Please try again.');
    });
  });

  // ─── Close/dismiss ───────────────────────────────────────────────────────

  it('calls onClose when "Maybe Later" is pressed', () => {
    const onClose = jest.fn();
    const { getByText } = render(
      <RatingPrompt visible={true} onClose={onClose} />,
    );
    fireEvent.press(getByText('Maybe Later'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
