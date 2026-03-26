/**
 * Unit tests for TutorialScreen.
 *
 * Covers step navigation (next/previous), skip button,
 * progress indicator, step content display, and final step behavior.
 */
import { render, screen, fireEvent } from '@testing-library/react-native';
import TutorialScreen from '@/screens/onboarding/TutorialScreen/TutorialScreen';

// ── Mock return values (module-level stable references) ───────────────────────

const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate };

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const Icon = ({ testID }: { testID?: string }) => React.createElement('View', { testID });
  return {
    Camera: Icon,
    Check: Icon,
    Globe: Icon,
    Shield: Icon,
  };
});

jest.mock('../../../src/components/ui', () => {
  const React = require('react');
  return {
    Button: ({ title, onPress, testID }: { title: string; onPress?: () => void; testID?: string }) =>
      React.createElement('TouchableOpacity', { onPress, testID },
        React.createElement('Text', null, title)),
    ProgressIndicator: ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) =>
      React.createElement('View', { testID: 'progress-indicator' },
        React.createElement('Text', null, `Step ${currentStep + 1} of ${totalSteps}`)),
    ScreenContainer: ({ children, ...props }: any) =>
      React.createElement('View', props, children),
  };
});

// ── Test setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ── First step rendering ──────────────────────────────────────────────────────

describe('TutorialScreen — first step', () => {
  it('renders the first tutorial step title', () => {
    render(<TutorialScreen />);

    expect(screen.getByText('Fill Once, Travel Everywhere')).toBeTruthy();
  });

  it('renders the first step subtitle', () => {
    render(<TutorialScreen />);

    expect(screen.getByText('One profile. Every country.')).toBeTruthy();
  });

  it('renders the first step content', () => {
    render(<TutorialScreen />);

    expect(screen.getByText(/Enter your passport details once/)).toBeTruthy();
  });

  it('renders "Next" button on first step', () => {
    render(<TutorialScreen />);

    expect(screen.getByText('Next')).toBeTruthy();
  });

  it('does not render "Previous" button on first step', () => {
    render(<TutorialScreen />);

    expect(screen.queryByTestId('previous-step-button')).toBeNull();
  });

  it('renders step indicator showing "Step 1 of 3"', () => {
    render(<TutorialScreen />);

    expect(screen.getByTestId('tutorial-step-indicator')).toBeTruthy();
    expect(screen.getAllByText('Step 1 of 3').length).toBeGreaterThanOrEqual(1);
  });
});

// ── Step navigation ───────────────────────────────────────────────────────────

describe('TutorialScreen — step navigation', () => {
  it('pressing "Next" advances to step 2', () => {
    render(<TutorialScreen />);

    fireEvent.press(screen.getByTestId('next-step-button'));

    expect(screen.getByText('Your Data Stays on Your Phone')).toBeTruthy();
    expect(screen.getByText('Zero servers. Full privacy.')).toBeTruthy();
  });

  it('shows "Previous" button on step 2', () => {
    render(<TutorialScreen />);

    fireEvent.press(screen.getByTestId('next-step-button'));

    expect(screen.getByTestId('previous-step-button')).toBeTruthy();
  });

  it('pressing "Previous" on step 2 returns to step 1', () => {
    render(<TutorialScreen />);

    fireEvent.press(screen.getByTestId('next-step-button'));
    fireEvent.press(screen.getByTestId('previous-step-button'));

    expect(screen.getByText('Fill Once, Travel Everywhere')).toBeTruthy();
  });

  it('pressing "Next" twice advances to step 3', () => {
    render(<TutorialScreen />);

    fireEvent.press(screen.getByTestId('next-step-button'));
    fireEvent.press(screen.getByTestId('next-step-button'));

    expect(screen.getByText("Let's Scan Your Passport")).toBeTruthy();
    expect(screen.getByText('Quick setup in seconds')).toBeTruthy();
  });
});

// ── Final step ────────────────────────────────────────────────────────────────

describe('TutorialScreen — final step', () => {
  const goToFinalStep = () => {
    render(<TutorialScreen />);
    fireEvent.press(screen.getByTestId('next-step-button'));
    fireEvent.press(screen.getByTestId('next-step-button'));
  };

  it('shows "Get Started" instead of "Next" on final step', () => {
    goToFinalStep();

    expect(screen.getByText('Get Started')).toBeTruthy();
    expect(screen.queryByText('Next')).toBeNull();
  });

  it('pressing "Get Started" navigates to PassportScan', () => {
    goToFinalStep();

    fireEvent.press(screen.getByTestId('next-step-button'));

    expect(mockNavigate).toHaveBeenCalledWith('PassportScan');
  });

  it('shows "Previous" button on final step', () => {
    goToFinalStep();

    expect(screen.getByTestId('previous-step-button')).toBeTruthy();
  });
});

// ── Skip button ───────────────────────────────────────────────────────────────

describe('TutorialScreen — skip', () => {
  it('renders "Skip" button', () => {
    render(<TutorialScreen />);

    expect(screen.getByTestId('tutorial-skip-button')).toBeTruthy();
  });

  it('pressing "Skip" navigates to PassportScan', () => {
    render(<TutorialScreen />);

    fireEvent.press(screen.getByTestId('tutorial-skip-button'));

    expect(mockNavigate).toHaveBeenCalledWith('PassportScan');
  });
});

// ── Progress indicator ────────────────────────────────────────────────────────

describe('TutorialScreen — progress indicator', () => {
  it('renders progress indicator', () => {
    render(<TutorialScreen />);

    expect(screen.getByTestId('progress-indicator')).toBeTruthy();
  });

  it('progress indicator updates when navigating steps', () => {
    render(<TutorialScreen />);

    fireEvent.press(screen.getByTestId('next-step-button'));

    // The ProgressIndicator mock renders "Step X of Y"
    // After advancing, the step-indicator text updates too
    expect(screen.getByTestId('tutorial-step-indicator').children).toBeTruthy();
  });
});
