/**
 * Unit tests for HelpScreen.
 *
 * Covers rendering of search toggle, category filters, FAQ expand/collapse,
 * and navigation to FAQ/Troubleshooting/Feedback/BugReport screens.
 */
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import HelpScreen from '@/screens/support/HelpScreen/HelpScreen';

// ── Mock return values (module-level stable references) ───────────────────────

const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate };

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
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
  return {
    Globe: Icon, Plane: Icon, Lock: Icon, Smartphone: Icon, Zap: Icon,
    ShieldCheck: Icon, HelpCircle: Icon, CircleAlert: Icon,
    X: Icon, Search: Icon, SearchX: Icon, TrendingUp: Icon,
    CircleHelp: Icon, BookOpen: Icon, Wrench: Icon, Info: Icon,
  };
});

jest.mock('../../../src/components/ui', () => {
  const React = require('react');
  return {
    Button: ({ title, onPress, testID }: { title: string; onPress?: () => void; testID?: string }) =>
      React.createElement('TouchableOpacity', { onPress, testID },
        React.createElement('Text', null, title)),
    Card: ({ children, ...props }: any) =>
      React.createElement('View', props, children),
    StatusBadge: ({ text }: { text: string; status: string; size: string }) =>
      React.createElement('Text', null, text),
    ScreenContainer: ({ children, ...props }: any) =>
      React.createElement('View', props, children),
  };
});

jest.mock('../../../src/components/help', () => {
  const React = require('react');
  return {
    SearchableHelp: ({ isVisible, onClose }: { isVisible: boolean; onClose: () => void; onNavigate: (type: string, id: string) => void }) =>
      isVisible ? React.createElement('View', { testID: 'searchable-help' },
        React.createElement('TouchableOpacity', { onPress: onClose, testID: 'close-search' },
          React.createElement('Text', null, 'Close Search'))) : null,
  };
});

jest.mock('../../../src/constants/countries', () => ({
  formatSupportedCountryList: () => 'Japan, Malaysia, Singapore',
}));

// ── Test setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Header ────────────────────────────────────────────────────────────────────

describe('HelpScreen — header', () => {
  it('renders title and subtitle', () => {
    render(<HelpScreen />);
    screen.getByText('Help & Support');
    screen.getByText('Find answers and get assistance');
  });
});

// ── Search toggle ─────────────────────────────────────────────────────────────

describe('HelpScreen — search toggle', () => {
  it('renders Search All Help Topics button', () => {
    render(<HelpScreen />);
    screen.getByText('Search All Help Topics');
  });

  it('opens search modal when Search button is pressed', () => {
    render(<HelpScreen />);

    fireEvent.press(screen.getByText('Search All Help Topics'));

    screen.getByTestId('searchable-help');
  });

  it('closes search modal when close is triggered', () => {
    render(<HelpScreen />);

    fireEvent.press(screen.getByText('Search All Help Topics'));
    screen.getByTestId('searchable-help');

    fireEvent.press(screen.getByTestId('close-search'));
    expect(screen.queryByTestId('searchable-help')).toBeNull();
  });
});

// ── Category filters ──────────────────────────────────────────────────────────

describe('HelpScreen — category filters', () => {
  it('renders all category buttons', () => {
    render(<HelpScreen />);

    screen.getByText('All Topics');
    screen.getByText('Passport & Scanning');
    screen.getByText('Security & Privacy');
    screen.getByText('Trips & Countries');
    screen.getByText('Forms & Submission');
    screen.getByText('QR Codes');
    screen.getByText('Performance');
  });

  it('shows category indicator when non-all category selected', () => {
    render(<HelpScreen />);

    fireEvent.press(screen.getByText('Security & Privacy'));

    screen.getByText('Showing Security & Privacy questions');
  });

  it('filters FAQs by selected category', () => {
    render(<HelpScreen />);

    fireEvent.press(screen.getByText('Security & Privacy'));

    // Security FAQs should be visible, others hidden
    screen.getByText(/Is my passport data secure\?/);
    screen.getByText('2 questions');
  });
});

// ── FAQ expand/collapse ───────────────────────────────────────────────────────

describe('HelpScreen — FAQ expand/collapse', () => {
  it('shows FAQ questions as collapsed by default', () => {
    render(<HelpScreen />);
    screen.getByText(/\+ How do I scan my passport\?/);
  });

  it('expands FAQ to show answer when pressed', () => {
    render(<HelpScreen />);

    fireEvent.press(screen.getByText(/\+ How do I scan my passport\?/));

    screen.getByText(/Point your camera at the bottom of your passport/);
  });

  it('collapses FAQ when pressed again', () => {
    render(<HelpScreen />);

    fireEvent.press(screen.getByText(/\+ How do I scan my passport\?/));
    fireEvent.press(screen.getByText(/− How do I scan my passport\?/));

    expect(screen.queryByText(/Point your camera at the bottom of your passport/)).toBeNull();
  });

  it('shows tags when FAQ is expanded', () => {
    render(<HelpScreen />);

    fireEvent.press(screen.getByText(/\+ How do I scan my passport\?/));

    screen.getByText('#passport');
    screen.getByText('#scan');
  });
});

// ── Navigation to other screens ───────────────────────────────────────────────

describe('HelpScreen — navigation', () => {
  it('navigates to FAQ screen', () => {
    render(<HelpScreen />);

    // The "Frequently Asked Questions" button in Help Categories
    const faqButtons = screen.getAllByText('Frequently Asked Questions');
    // First one is the nav button (in Help Categories), second is FAQ section heading
    fireEvent.press(faqButtons[0]);

    expect(mockNavigate).toHaveBeenCalledWith('FAQ');
  });

  it('navigates to Troubleshooting screen', () => {
    render(<HelpScreen />);

    fireEvent.press(screen.getByText('Troubleshooting Guide'));

    expect(mockNavigate).toHaveBeenCalledWith('Troubleshooting');
  });

  it('navigates to Feedback screen', () => {
    render(<HelpScreen />);

    fireEvent.press(screen.getByText('Send Feedback'));

    expect(mockNavigate).toHaveBeenCalledWith('Feedback');
  });

  it('navigates to BugReport screen', () => {
    render(<HelpScreen />);

    fireEvent.press(screen.getByText('Report Bug'));

    expect(mockNavigate).toHaveBeenCalledWith('BugReport');
  });

  it('shows User Guide alert when User Guide is pressed', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<HelpScreen />);

    fireEvent.press(screen.getByText('User Guide'));

    expect(alertSpy).toHaveBeenCalledWith(
      'User Guide',
      expect.stringContaining('future update'),
      expect.any(Array),
    );
  });
});

// ── Contact support ───────────────────────────────────────────────────────────

describe('HelpScreen — contact support', () => {
  it('shows Alert with options when Contact Support is pressed', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<HelpScreen />);

    fireEvent.press(screen.getByText('Contact Support'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Contact Support',
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({ text: 'Send Feedback' }),
        expect.objectContaining({ text: 'Report Bug' }),
        expect.objectContaining({ text: 'Email Support' }),
        expect.objectContaining({ text: 'Cancel' }),
      ]),
    );
  });

  it('navigates to Feedback from Contact Support alert', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<HelpScreen />);

    fireEvent.press(screen.getByText('Contact Support'));

    const alertButtons = alertSpy.mock.calls[0][2] as Array<{ text: string; onPress?: () => void }>;
    alertButtons.find(b => b.text === 'Send Feedback')?.onPress?.();

    expect(mockNavigate).toHaveBeenCalledWith('Feedback');
  });

  it('opens email link from Contact Support alert', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const linkingSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as any);
    render(<HelpScreen />);

    fireEvent.press(screen.getByText('Contact Support'));

    const alertButtons = alertSpy.mock.calls[0][2] as Array<{ text: string; onPress?: () => void }>;
    alertButtons.find(b => b.text === 'Email Support')?.onPress?.();

    expect(linkingSpy).toHaveBeenCalledWith('mailto:support@borderly.app?subject=Borderly%20Support%20Request');
  });
});

// ── Emergency section ─────────────────────────────────────────────────────────

describe('HelpScreen — emergency section', () => {
  it('renders emergency travel support section', () => {
    render(<HelpScreen />);
    screen.getByText('Emergency Travel Support');
  });
});

// ── App info ──────────────────────────────────────────────────────────────────

describe('HelpScreen — app info', () => {
  it('renders app version', () => {
    render(<HelpScreen />);
    screen.getByText('1.0.0 (MVP)');
  });

  it('renders privacy info', () => {
    render(<HelpScreen />);
    screen.getByText('Local-first, No cloud sync');
  });
});
