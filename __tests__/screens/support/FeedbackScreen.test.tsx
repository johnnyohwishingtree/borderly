/**
 * Unit tests for FeedbackScreen.
 *
 * Covers rendering of 5-star rating buttons, feedback type select,
 * subject/message inputs, and submit button disabled state.
 */
import { render, screen, fireEvent } from '@testing-library/react-native';
import FeedbackScreen from '@/screens/support/FeedbackScreen/FeedbackScreen';

// ── Mock return values (module-level stable references) ───────────────────────

const mockSetFeedbackType = jest.fn();
const mockSetSubject = jest.fn();
const mockSetMessage = jest.fn();
const mockHandleRatingPress = jest.fn();
const mockHandleSubmitFeedback = jest.fn();

interface MockHookReturn {
  fields: {
    feedbackType: string;
    setFeedbackType: jest.Mock;
    rating: number;
    setRating: jest.Mock;
    subject: string;
    setSubject: jest.Mock;
    message: string;
    setMessage: jest.Mock;
  };
  submission: {
    isSubmitting: boolean;
    handleSubmitFeedback: jest.Mock;
  };
  options: {
    feedbackTypeOptions: Array<{ label: string; value: string }>;
  };
  ratingHelpers: {
    handleRatingPress: jest.Mock;
    getRatingEmoji: (star: number) => string;
    getRatingText: (rating: number) => string;
  };
}

let mockHookReturn: MockHookReturn;

function resetMockHook() {
  mockHookReturn = {
    fields: {
      feedbackType: 'general',
      setFeedbackType: mockSetFeedbackType,
      rating: 0,
      setRating: jest.fn(),
      subject: '',
      setSubject: mockSetSubject,
      message: '',
      setMessage: mockSetMessage,
    },
    submission: {
      isSubmitting: false,
      handleSubmitFeedback: mockHandleSubmitFeedback,
    },
    options: {
      feedbackTypeOptions: [
        { label: 'General Feedback', value: 'general' },
        { label: 'Feature Request', value: 'feature' },
        { label: 'User Experience', value: 'ux' },
      ],
    },
    ratingHelpers: {
      handleRatingPress: mockHandleRatingPress,
      getRatingEmoji: (star: number) => ['', '😞', '😐', '🙂', '😄', '🤩'][star],
      getRatingText: (r: number) => ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][r],
    },
  };
}

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../../src/hooks/useFeedback', () => ({
  useFeedback: () => mockHookReturn,
}));

jest.mock('../../../src/utils/theme', () => ({
  useTheme: () => ({
    colors: { textPrimary: '#000', textSecondary: '#666', success: '#22c55e', accent: '#3b82f6' },
    isDark: false,
  }),
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const Icon = ({ testID }: { testID?: string }) => React.createElement('View', { testID });
  return { Lock: Icon };
});

jest.mock('../../../src/components/ui', () => {
  const React = require('react');
  return {
    Button: ({ title, onPress, testID, disabled }: { title: string; onPress?: () => void; testID?: string; disabled?: boolean }) =>
      React.createElement('TouchableOpacity', { onPress: disabled ? undefined : onPress, testID, disabled, accessibilityState: { disabled } },
        React.createElement('Text', null, title)),
    Card: ({ children, ...props }: any) =>
      React.createElement('View', props, children),
    StatusBadge: ({ text }: { text: string; status: string; size: string }) =>
      React.createElement('Text', null, text),
    Select: ({ label, value }: any) =>
      React.createElement('View', null,
        React.createElement('Text', null, label),
        React.createElement('Text', null, value)),
    ScreenContainer: ({ children, ...props }: any) =>
      React.createElement('View', props, children),
  };
});

// ── Test setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  resetMockHook();
});

// ── Header ────────────────────────────────────────────────────────────────────

describe('FeedbackScreen — header', () => {
  it('renders title and subtitle', () => {
    render(<FeedbackScreen />);
    screen.getByText('Send Feedback');
    screen.getByText('Help us improve your travel experience');
  });
});

// ── Star rating ───────────────────────────────────────────────────────────────

describe('FeedbackScreen — star rating', () => {
  it('renders 5 star rating buttons', () => {
    render(<FeedbackScreen />);
    screen.getByText('😞');
    screen.getByText('😐');
    screen.getByText('🙂');
    screen.getByText('😄');
    screen.getByText('🤩');
  });

  it('calls handleRatingPress when a star is pressed', () => {
    render(<FeedbackScreen />);
    fireEvent.press(screen.getByText('😄'));
    expect(mockHandleRatingPress).toHaveBeenCalledWith(4);
  });

  it('shows "Not Rated" when no rating is selected', () => {
    render(<FeedbackScreen />);
    screen.getByText('Not Rated');
  });

  it('shows rating text when a rating is selected', () => {
    mockHookReturn.fields.rating = 4;
    render(<FeedbackScreen />);
    screen.getByText('Great (4/5)');
  });

  it('shows rating badge text when rated', () => {
    mockHookReturn.fields.rating = 5;
    render(<FeedbackScreen />);
    screen.getByText('Excellent');
  });
});

// ── Feedback type select ──────────────────────────────────────────────────────

describe('FeedbackScreen — feedback type', () => {
  it('renders feedback type section', () => {
    render(<FeedbackScreen />);
    screen.getByText('Feedback Category');
    screen.getByText('What type of feedback is this?');
  });
});

// ── Subject input ─────────────────────────────────────────────────────────────

describe('FeedbackScreen — subject', () => {
  it('renders subject input with placeholder', () => {
    render(<FeedbackScreen />);
    screen.getByText('Subject (Optional)');
    screen.getByPlaceholderText('Brief summary of your feedback...');
  });

  it('calls setSubject when text is entered', () => {
    render(<FeedbackScreen />);
    fireEvent.changeText(screen.getByPlaceholderText('Brief summary of your feedback...'), 'Great app');
    expect(mockSetSubject).toHaveBeenCalledWith('Great app');
  });

  it('shows character count', () => {
    render(<FeedbackScreen />);
    screen.getByText('0/100 characters');
  });
});

// ── Message input ─────────────────────────────────────────────────────────────

describe('FeedbackScreen — message', () => {
  it('renders message input with placeholder', () => {
    render(<FeedbackScreen />);
    screen.getByText('Your Feedback');
    screen.getByPlaceholderText(/Tell us about your experience/);
  });

  it('calls setMessage when text is entered', () => {
    render(<FeedbackScreen />);
    fireEvent.changeText(screen.getByPlaceholderText(/Tell us about your experience/), 'Love this app');
    expect(mockSetMessage).toHaveBeenCalledWith('Love this app');
  });

  it('shows character count', () => {
    render(<FeedbackScreen />);
    screen.getByText('0/1000 characters');
  });
});

// ── Submit button ─────────────────────────────────────────────────────────────

describe('FeedbackScreen — submit button', () => {
  it('renders submit button', () => {
    render(<FeedbackScreen />);
    screen.getByText('Submit Feedback');
  });

  it('submit button is disabled when no rating', () => {
    mockHookReturn.fields.rating = 0;
    mockHookReturn.fields.message = 'Some feedback';
    render(<FeedbackScreen />);

    const submitButton = screen.getByText('Submit Feedback').parent;
    expect(submitButton?.props.disabled).toBe(true);
  });

  it('submit button is disabled when message is empty', () => {
    mockHookReturn.fields.rating = 4;
    mockHookReturn.fields.message = '';
    render(<FeedbackScreen />);

    const submitButton = screen.getByText('Submit Feedback').parent;
    expect(submitButton?.props.disabled).toBe(true);
  });

  it('submit button calls handleSubmitFeedback when rating and message are set', () => {
    mockHookReturn.fields.rating = 4;
    mockHookReturn.fields.message = 'Great app!';
    render(<FeedbackScreen />);

    fireEvent.press(screen.getByText('Submit Feedback'));

    expect(mockHandleSubmitFeedback).toHaveBeenCalled();
  });

  it('shows "Submitting..." when isSubmitting is true', () => {
    mockHookReturn.submission.isSubmitting = true;
    render(<FeedbackScreen />);
    screen.getByText('Submitting...');
  });
});

// ── Privacy notice ────────────────────────────────────────────────────────────

describe('FeedbackScreen — privacy', () => {
  it('renders privacy notice', () => {
    render(<FeedbackScreen />);
    screen.getByText('Privacy Notice');
    screen.getByText(/No personal or passport data is included/);
  });
});
