/**
 * Unit tests for TroubleshootingScreen.
 *
 * Covers rendering of search, category filters, issue cards with
 * show/hide solutions, and email support link via Alert.
 */
import { render, screen, fireEvent } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import TroubleshootingScreen from '@/screens/help/TroubleshootingScreen/TroubleshootingScreen';

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
  return { Globe: Icon, Plane: Icon, Lock: Icon, Smartphone: Icon, Zap: Icon, ShieldCheck: Icon, HelpCircle: Icon, AlertTriangle: Icon, CircleAlert: Icon };
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

jest.mock('../../../src/components/ui/HelpHint', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ title, content }: { title: string; content: string }) =>
      React.createElement('View', null,
        React.createElement('Text', null, title),
        React.createElement('Text', null, content)),
  };
});

// ── Test setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Header ────────────────────────────────────────────────────────────────────

describe('TroubleshootingScreen — header', () => {
  it('renders title and subtitle', () => {
    render(<TroubleshootingScreen />);
    expect(screen.getByText('Troubleshooting Guide')).toBeTruthy();
    expect(screen.getByText('Solve common issues and problems')).toBeTruthy();
  });

  it('renders travel emergency warning', () => {
    render(<TroubleshootingScreen />);
    expect(screen.getByText('Travel Emergency')).toBeTruthy();
  });
});

// ── Search ────────────────────────────────────────────────────────────────────

describe('TroubleshootingScreen — search', () => {
  it('renders search input', () => {
    render(<TroubleshootingScreen />);
    expect(screen.getByPlaceholderText('Describe your problem or search symptoms...')).toBeTruthy();
  });

  it('filters issues when search term is entered', () => {
    render(<TroubleshootingScreen />);
    const searchInput = screen.getByPlaceholderText('Describe your problem or search symptoms...');
    fireEvent.changeText(searchInput, 'passport');

    expect(screen.getByText(/Found .* solutions for "passport"/)).toBeTruthy();
  });

  it('shows no results state when search matches nothing', () => {
    render(<TroubleshootingScreen />);
    const searchInput = screen.getByPlaceholderText('Describe your problem or search symptoms...');
    fireEvent.changeText(searchInput, 'xyznonexistent');

    expect(screen.getByText('No issues found')).toBeTruthy();
  });

  it('shows Clear button when search term is entered', () => {
    render(<TroubleshootingScreen />);
    const searchInput = screen.getByPlaceholderText('Describe your problem or search symptoms...');
    fireEvent.changeText(searchInput, 'camera');

    expect(screen.getByText('Clear')).toBeTruthy();
  });
});

// ── Category filters ──────────────────────────────────────────────────────────

describe('TroubleshootingScreen — categories', () => {
  it('renders all category buttons', () => {
    render(<TroubleshootingScreen />);

    expect(screen.getByText('All Issues')).toBeTruthy();
    expect(screen.getByText('Passport Scanning')).toBeTruthy();
    expect(screen.getByText('App Performance')).toBeTruthy();
    expect(screen.getByText('Forms & Auto-fill')).toBeTruthy();
    expect(screen.getByText('QR Codes')).toBeTruthy();
    expect(screen.getByText('Security & Biometrics')).toBeTruthy();
    expect(screen.getByText('Government Portals')).toBeTruthy();
    expect(screen.getByText('Data & Sync')).toBeTruthy();
    expect(screen.getByText('Network Issues')).toBeTruthy();
  });

  it('filters issues when a category is selected', () => {
    render(<TroubleshootingScreen />);

    fireEvent.press(screen.getByText('Passport Scanning'));

    // Should show only passport-related issues
    expect(screen.getByText('Passport scanning not working')).toBeTruthy();
    expect(screen.getByText('1 issues')).toBeTruthy();
  });
});

// ── Issue cards with show/hide solutions ───────────────────────────────────────

describe('TroubleshootingScreen — issue cards', () => {
  it('renders issue problems', () => {
    render(<TroubleshootingScreen />);
    expect(screen.getByText('Passport scanning not working')).toBeTruthy();
    expect(screen.getByText('App crashes on startup')).toBeTruthy();
  });

  it('renders severity badges', () => {
    render(<TroubleshootingScreen />);
    // Multiple severity badges are rendered
    expect(screen.getAllByText('High Priority').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Critical').length).toBeGreaterThan(0);
  });

  it('shows "Show Solutions" button for each issue', () => {
    render(<TroubleshootingScreen />);
    const showButtons = screen.getAllByText('Show Solutions');
    expect(showButtons.length).toBe(10);
  });

  it('expands issue to show symptoms and solutions', () => {
    render(<TroubleshootingScreen />);

    // Press first "Show Solutions" button
    fireEvent.press(screen.getAllByText('Show Solutions')[0]);

    // Symptoms should be visible
    expect(screen.getByText('Common Symptoms:')).toBeTruthy();
    expect(screen.getByText(/Camera won't focus/)).toBeTruthy();

    // Solutions should be visible
    expect(screen.getByText('Solutions to Try:')).toBeTruthy();
    expect(screen.getByText(/Ensure good lighting/)).toBeTruthy();
  });

  it('toggles between Show/Hide Solutions', () => {
    render(<TroubleshootingScreen />);

    // Expand
    fireEvent.press(screen.getAllByText('Show Solutions')[0]);
    expect(screen.getByText('Hide Solutions')).toBeTruthy();

    // Collapse
    fireEvent.press(screen.getByText('Hide Solutions'));
    expect(screen.queryByText('Common Symptoms:')).toBeNull();
  });

  it('shows tags when issue is expanded', () => {
    render(<TroubleshootingScreen />);

    fireEvent.press(screen.getAllByText('Show Solutions')[0]);

    expect(screen.getByText('#passport')).toBeTruthy();
    expect(screen.getByText('#scanning')).toBeTruthy();
  });
});

// ── Contact support (email link) ──────────────────────────────────────────────

describe('TroubleshootingScreen — contact support', () => {
  it('renders Contact Support button', () => {
    render(<TroubleshootingScreen />);
    expect(screen.getByText('Contact Support')).toBeTruthy();
  });

  it('shows Alert with support options when Contact Support is pressed', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    render(<TroubleshootingScreen />);

    fireEvent.press(screen.getByText('Contact Support'));

    expect(alertSpy).toHaveBeenCalledWith(
      'Contact Support',
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({ text: 'Email Support' }),
        expect.objectContaining({ text: 'Cancel' }),
      ]),
    );
  });

  it('opens email link when Email Support option is selected', () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const linkingSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined as any);
    render(<TroubleshootingScreen />);

    fireEvent.press(screen.getByText('Contact Support'));

    // Find the Email Support button in the alert options and call its onPress
    const alertButtons = alertSpy.mock.calls[0][2] as Array<{ text: string; onPress?: () => void }>;
    const emailButton = alertButtons.find(b => b.text === 'Email Support');
    emailButton?.onPress?.();

    expect(linkingSpy).toHaveBeenCalledWith('mailto:support@borderly.app?subject=Troubleshooting%20Support');
  });
});

// ── System information ────────────────────────────────────────────────────────

describe('TroubleshootingScreen — system info', () => {
  it('renders system information section', () => {
    render(<TroubleshootingScreen />);
    expect(screen.getByText('System Information')).toBeTruthy();
    expect(screen.getByText(/App version: 1.0.0/)).toBeTruthy();
  });
});
