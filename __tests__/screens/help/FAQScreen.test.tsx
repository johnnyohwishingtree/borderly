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
    expect(screen.getByText('Frequently Asked Questions')).toBeTruthy();
  });

  it('renders subtitle text', () => {
    render(<FAQScreen />);
    expect(screen.getByText('Search and browse common questions')).toBeTruthy();
  });
});

// ── Search ────────────────────────────────────────────────────────────────────

describe('FAQScreen — search', () => {
  it('renders search input with correct placeholder', () => {
    render(<FAQScreen />);
    expect(screen.getByPlaceholderText('Search questions, answers, or topics...')).toBeTruthy();
  });

  it('filters FAQs when search term is entered', () => {
    render(<FAQScreen />);
    const searchInput = screen.getByPlaceholderText('Search questions, answers, or topics...');
    fireEvent.changeText(searchInput, 'passport');

    // Should show result count
    expect(screen.getByText(/Found .* results for "passport"/)).toBeTruthy();
  });

  it('shows "No questions found" when search matches nothing', () => {
    render(<FAQScreen />);
    const searchInput = screen.getByPlaceholderText('Search questions, answers, or topics...');
    fireEvent.changeText(searchInput, 'xyznonexistent');

    expect(screen.getByText('No questions found')).toBeTruthy();
  });

  it('shows Clear button when search term is entered', () => {
    render(<FAQScreen />);
    const searchInput = screen.getByPlaceholderText('Search questions, answers, or topics...');
    fireEvent.changeText(searchInput, 'passport');

    expect(screen.getByText('Clear')).toBeTruthy();
  });

  it('clears search and resets category when Clear Search is pressed', () => {
    render(<FAQScreen />);
    const searchInput = screen.getByPlaceholderText('Search questions, answers, or topics...');
    fireEvent.changeText(searchInput, 'xyznonexistent');

    // Press "Clear Search" button in empty state
    fireEvent.press(screen.getByText('Clear Search'));

    // All FAQs should be visible again (count badge shows 15 of 15)
    expect(screen.getByText('15 of 15')).toBeTruthy();
  });
});

// ── Category filters ──────────────────────────────────────────────────────────

describe('FAQScreen — category filters', () => {
  it('renders all category filter buttons', () => {
    render(<FAQScreen />);

    expect(screen.getByText('All Topics')).toBeTruthy();
    expect(screen.getByText('Passport & Scanning')).toBeTruthy();
    expect(screen.getByText('Security & Privacy')).toBeTruthy();
    expect(screen.getByText('Trips & Countries')).toBeTruthy();
    expect(screen.getByText('Forms & Submission')).toBeTruthy();
    expect(screen.getByText('QR Codes')).toBeTruthy();
    expect(screen.getByText('Performance')).toBeTruthy();
    expect(screen.getByText('Sharing & Updates')).toBeTruthy();
    expect(screen.getByText('Offline Usage')).toBeTruthy();
  });

  it('filters FAQs when a category is selected', () => {
    render(<FAQScreen />);

    fireEvent.press(screen.getByText('Security & Privacy'));

    // Should show category indicator
    expect(screen.getByText('Showing Security & Privacy questions')).toBeTruthy();
  });
});

// ── FAQ expand/collapse ───────────────────────────────────────────────────────

describe('FAQScreen — expand/collapse', () => {
  it('shows FAQ questions as collapsed by default', () => {
    render(<FAQScreen />);

    // Questions should be visible with + prefix
    expect(screen.getByText(/\+ How do I scan my passport\?/)).toBeTruthy();
  });

  it('expands FAQ to show answer when question is pressed', () => {
    render(<FAQScreen />);

    fireEvent.press(screen.getByText(/\+ How do I scan my passport\?/));

    // Answer should now be visible
    expect(screen.getByText(/Point your camera at the bottom of your passport/)).toBeTruthy();
  });

  it('collapses FAQ when expanded question is pressed again', () => {
    render(<FAQScreen />);

    // Expand
    fireEvent.press(screen.getByText(/\+ How do I scan my passport\?/));
    expect(screen.getByText(/Point your camera at the bottom of your passport/)).toBeTruthy();

    // Collapse (now shows − prefix)
    fireEvent.press(screen.getByText(/− How do I scan my passport\?/));

    // Answer should no longer be visible
    expect(screen.queryByText(/Point your camera at the bottom of your passport/)).toBeNull();
  });

  it('shows tags when FAQ is expanded', () => {
    render(<FAQScreen />);

    fireEvent.press(screen.getByText(/\+ How do I scan my passport\?/));

    expect(screen.getByText('#passport')).toBeTruthy();
    expect(screen.getByText('#scan')).toBeTruthy();
    expect(screen.getByText('#mrz')).toBeTruthy();
  });
});

// ── Navigation buttons ────────────────────────────────────────────────────────

describe('FAQScreen — navigation buttons', () => {
  it('renders "Still Need Help?" section with action buttons', () => {
    render(<FAQScreen />);

    expect(screen.getByText('Still Need Help?')).toBeTruthy();
    expect(screen.getByText('View User Guide')).toBeTruthy();
    expect(screen.getByText('Troubleshooting')).toBeTruthy();
    expect(screen.getByText('Send Feedback')).toBeTruthy();
    expect(screen.getByText('Report Bug')).toBeTruthy();
  });
});
