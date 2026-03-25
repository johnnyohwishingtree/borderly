/**
 * Unit tests for useFeedback hook.
 *
 * Tests feedback form state, validation, submission, and helper functions.
 */
import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useFeedback } from '../../src/hooks/useFeedback';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
}));

jest.mock('../../src/stores/useAppStore', () => ({
  useAppStore: () => ({
    preferences: {
      language: 'en',
      analyticsEnabled: true,
    },
  }),
}));

jest.spyOn(Alert, 'alert');

// ── Lifecycle ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useFeedback', () => {
  describe('initial state', () => {
    it('returns correct default values', () => {
      const { result } = renderHook(() => useFeedback());

      expect(result.current.feedbackType).toBe('general');
      expect(result.current.rating).toBe(0);
      expect(result.current.subject).toBe('');
      expect(result.current.message).toBe('');
      expect(result.current.isSubmitting).toBe(false);
    });
  });

  describe('handleRatingPress', () => {
    it('sets the rating to the given value', () => {
      const { result } = renderHook(() => useFeedback());

      act(() => {
        result.current.handleRatingPress(4);
      });

      expect(result.current.rating).toBe(4);
    });

    it('can change rating to a different value', () => {
      const { result } = renderHook(() => useFeedback());

      act(() => {
        result.current.handleRatingPress(3);
      });
      expect(result.current.rating).toBe(3);

      act(() => {
        result.current.handleRatingPress(5);
      });
      expect(result.current.rating).toBe(5);
    });
  });

  describe('handleSubmitFeedback', () => {
    it('shows alert when message is empty', async () => {
      const { result } = renderHook(() => useFeedback());

      // Set a rating but leave message empty
      act(() => {
        result.current.handleRatingPress(3);
      });

      await act(async () => {
        await result.current.handleSubmitFeedback();
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Missing Information',
        'Please provide your feedback message.',
      );
    });

    it('shows alert when message is only whitespace', async () => {
      const { result } = renderHook(() => useFeedback());

      act(() => {
        result.current.handleRatingPress(3);
        result.current.setMessage('   ');
      });

      await act(async () => {
        await result.current.handleSubmitFeedback();
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Missing Information',
        'Please provide your feedback message.',
      );
    });

    it('shows alert when rating is 0', async () => {
      const { result } = renderHook(() => useFeedback());

      act(() => {
        result.current.setMessage('Great app!');
      });

      await act(async () => {
        await result.current.handleSubmitFeedback();
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Missing Rating',
        'Please provide a rating for your experience.',
      );
    });

    it('submits successfully, resets form, and calls goBack', async () => {
      const { result } = renderHook(() => useFeedback());

      act(() => {
        result.current.handleRatingPress(5);
        result.current.setMessage('Excellent app!');
        result.current.setSubject('Praise');
        result.current.setFeedbackType('feature');
      });

      // Start submission
      let submitPromise: Promise<void>;
      act(() => {
        submitPromise = result.current.handleSubmitFeedback();
      });

      // isSubmitting should be true while awaiting
      expect(result.current.isSubmitting).toBe(true);

      // Advance past the simulated delay
      await act(async () => {
        jest.advanceTimersByTime(1000);
        await submitPromise!;
      });

      // isSubmitting should be false after completion
      expect(result.current.isSubmitting).toBe(false);

      // Alert.alert should have been called with success message
      expect(Alert.alert).toHaveBeenCalledWith(
        'Thank You!',
        'Your feedback has been submitted successfully. We appreciate your input!',
        expect.arrayContaining([
          expect.objectContaining({ text: 'OK' }),
        ]),
      );

      // Simulate pressing OK on the alert
      const alertCall = (Alert.alert as jest.Mock).mock.calls[0];
      const okButton = alertCall[2][0];
      act(() => {
        okButton.onPress();
      });

      // Form should be reset
      expect(result.current.feedbackType).toBe('general');
      expect(result.current.rating).toBe(0);
      expect(result.current.subject).toBe('');
      expect(result.current.message).toBe('');

      // Navigation should go back
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('getRatingEmoji', () => {
    it('returns correct emoji for each rating value', () => {
      const { result } = renderHook(() => useFeedback());

      expect(result.current.getRatingEmoji(1)).toBe('\u{1F61E}');
      expect(result.current.getRatingEmoji(2)).toBe('\u{1F615}');
      expect(result.current.getRatingEmoji(3)).toBe('\u{1F610}');
      expect(result.current.getRatingEmoji(4)).toBe('\u{1F60A}');
      expect(result.current.getRatingEmoji(5)).toBe('\u{1F929}');
    });

    it('returns star emoji for invalid rating', () => {
      const { result } = renderHook(() => useFeedback());

      expect(result.current.getRatingEmoji(0)).toBe('\u2B50');
      expect(result.current.getRatingEmoji(6)).toBe('\u2B50');
      expect(result.current.getRatingEmoji(-1)).toBe('\u2B50');
    });
  });

  describe('getRatingText', () => {
    it('returns correct text for each rating value', () => {
      const { result } = renderHook(() => useFeedback());

      expect(result.current.getRatingText(1)).toBe('Very Poor');
      expect(result.current.getRatingText(2)).toBe('Poor');
      expect(result.current.getRatingText(3)).toBe('Average');
      expect(result.current.getRatingText(4)).toBe('Good');
      expect(result.current.getRatingText(5)).toBe('Excellent');
    });

    it('returns default text for invalid rating', () => {
      const { result } = renderHook(() => useFeedback());

      expect(result.current.getRatingText(0)).toBe('Tap to rate');
      expect(result.current.getRatingText(6)).toBe('Tap to rate');
    });
  });

  describe('feedbackTypeOptions', () => {
    it('returns all feedback type options', () => {
      const { result } = renderHook(() => useFeedback());

      expect(result.current.feedbackTypeOptions).toEqual([
        { label: 'General Feedback', value: 'general' },
        { label: 'Feature Request', value: 'feature' },
        { label: 'User Experience', value: 'ux' },
        { label: 'Country Form Issues', value: 'country-forms' },
        { label: 'Performance Issues', value: 'performance' },
        { label: 'Other', value: 'other' },
      ]);
    });
  });
});
