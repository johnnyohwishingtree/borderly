/**
 * Unit tests for FAQScreen.
 *
 * Covers rendering of search input, category filters, FAQ items
 * expand/collapse, and navigation buttons.
 */
import { render, screen, fireEvent } from '@testing-library/react-native';
import FAQScreen from '@/screens/help/FAQScreen/FAQScreen';

// ── Mock return values (module-level stable references) ───────────────────────

const mockNavigation = { navigate: jest.fn() };

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
  return { Globe: Icon, Plane: Icon, Lock: Icon, Smartphone: Icon, Zap: Icon, ShieldCheck: Icon, HelpCircle: Icon };
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

jest.mock('../../../src/constants/countries', () => ({
  formatSupportedCountryList: () => 'Japan, Malaysia, Singapore',
}));

// ── Test setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Header ────────────────────────────────────────────────────────────────────

describe('FAQScreen — header', () => {
  it('renders FAQ title', () => {
    render(<FAQScreen />);
    screen.getByText('Frequently Asked Questions');
  });

  it('renders subtitle text', () => {
    render(<FAQScreen />);
    screen.getByText('Search and browse common questions');
  });
});

// ── Search ────────────────────────────────────────────────────────────────────

describe('FAQScreen — search', () => {
  it('renders search input with correct placeholder', () => {
    render(<FAQScreen />);
    screen.getByPlaceholderText('Search questions, answers, or topics...');
  });

  it('filters FAQs when search term is entered', () => {
    render(<FAQScreen />);
    const searchInput = screen.getByPlaceholderText('Search questions, answers, or topics...');
    fireEvent.changeText(searchInput, 'passport');

    // Should show result count
    screen.getByText(/Found .* results for "passport"/);
  });

  it('shows "No questions found" when search matches nothing', () => {
    render(<FAQScreen />);
    const searchInput = screen.getByPlaceholderText('Search questions, answers, or topics...');
    fireEvent.changeText(searchInput, 'xyznonexistent');

    screen.getByText('No questions found');
  });

  it('shows Clear button when search term is entered', () => {
    render(<FAQScreen />);
    const searchInput = screen.getByPlaceholderText('Search questions, answers, or topics...');
    fireEvent.changeText(searchInput, 'passport');

    screen.getByText('Clear');
  });

  it('clears search and resets category when Clear Search is pressed', () => {
    render(<FAQScreen />);
    const searchInput = screen.getByPlaceholderText('Search questions, answers, or topics...');
    fireEvent.changeText(searchInput, 'xyznonexistent');

    // Press "Clear Search" button in empty state
    fireEvent.press(screen.getByText('Clear Search'));

    // All FAQs should be visible again (count badge shows 15 of 15)
    screen.getByText('15 of 15');
  });
});

// ── Category filters ──────────────────────────────────────────────────────────

describe('FAQScreen — category filters', () => {
  it('renders all category filter buttons', () => {
    render(<FAQScreen />);

    screen.getByText('All Topics');
    screen.getByText('Passport & Scanning');
    screen.getByText('Security & Privacy');
    screen.getByText('Trips & Countries');
    screen.getByText('Forms & Submission');
    screen.getByText('QR Codes');
    screen.getByText('Performance');
    screen.getByText('Sharing & Updates');
    screen.getByText('Offline Usage');
  });

  it('filters FAQs when a category is selected', () => {
    render(<FAQScreen />);

    fireEvent.press(screen.getByText('Security & Privacy'));

    // Should show category indicator
    screen.getByText('Showing Security & Privacy questions');
  });
});

// ── FAQ expand/collapse ───────────────────────────────────────────────────────

describe('FAQScreen — expand/collapse', () => {
  it('shows FAQ questions as collapsed by default', () => {
    render(<FAQScreen />);

    // Questions should be visible with + prefix
    screen.getByText(/\+ How do I scan my passport\?/);
  });

  it('expands FAQ to show answer when question is pressed', () => {
    render(<FAQScreen />);

    fireEvent.press(screen.getByText(/\+ How do I scan my passport\?/));

    // Answer should now be visible
    screen.getByText(/Point your camera at the bottom of your passport/);
  });

  it('collapses FAQ when expanded question is pressed again', () => {
    render(<FAQScreen />);

    // Expand
    fireEvent.press(screen.getByText(/\+ How do I scan my passport\?/));
    screen.getByText(/Point your camera at the bottom of your passport/);

    // Collapse (now shows − prefix)
    fireEvent.press(screen.getByText(/− How do I scan my passport\?/));

    // Answer should no longer be visible
    expect(screen.queryByText(/Point your camera at the bottom of your passport/)).toBeNull();
  });

  it('shows tags when FAQ is expanded', () => {
    render(<FAQScreen />);

    fireEvent.press(screen.getByText(/\+ How do I scan my passport\?/));

    screen.getByText('#passport');
    screen.getByText('#scan');
    screen.getByText('#mrz');
  });
});

// ── Navigation buttons ────────────────────────────────────────────────────────

describe('FAQScreen — navigation buttons', () => {
  it('renders "Still Need Help?" section with action buttons', () => {
    render(<FAQScreen />);

    screen.getByText('Still Need Help?');
    screen.getByText('View User Guide');
    screen.getByText('Troubleshooting');
    screen.getByText('Send Feedback');
    screen.getByText('Report Bug');
  });
});
