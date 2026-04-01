/**
 * Unit tests for AddFamilyMemberScreen.
 *
 * Covers rendering of relationship select, camera scan button,
 * manual entry button, and navigation with familyMode params.
 */
import { render, screen, fireEvent } from '@testing-library/react-native';
import AddFamilyMemberScreen from '@/screens/profile/AddFamilyMemberScreen/AddFamilyMemberScreen';

// ── Mock return values (module-level stable references) ───────────────────────

const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate };
const mockRoute = { params: {} };

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => mockRoute,
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
  return { Camera: Icon, Pencil: Icon };
});

jest.mock('../../../src/components/ui', () => {
  const React = require('react');
  return {
    Button: ({ title, onPress, testID }: { title: string; onPress?: () => void; testID?: string }) =>
      React.createElement('TouchableOpacity', { onPress, testID },
        React.createElement('Text', null, title)),
    Card: ({ children, ...props }: any) =>
      React.createElement('View', props, children),
    Select: ({ label, value, onValueChange, options, testID }: any) =>
      React.createElement('View', { testID },
        React.createElement('Text', null, label),
        React.createElement('Text', null, value),
        ...options.map((opt: any) =>
          React.createElement('TouchableOpacity', {
            key: opt.value,
            onPress: () => onValueChange(opt.value),
            testID: `select-option-${opt.value}`,
          }, React.createElement('Text', null, opt.label))
        )),
    ScreenContainer: ({ children, ...props }: any) =>
      React.createElement('View', props, children),
  };
});

// ── Test setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockRoute.params = {};
});

// ── Header ────────────────────────────────────────────────────────────────────

describe('AddFamilyMemberScreen — header', () => {
  it('renders subtitle', () => {
    render(<AddFamilyMemberScreen />);
    screen.getByText('Create a new family travel profile');
  });
});

// ── Relationship select ───────────────────────────────────────────────────────

describe('AddFamilyMemberScreen — relationship select', () => {
  it('renders relationship select with default spouse', () => {
    render(<AddFamilyMemberScreen />);
    screen.getByTestId('relationship-select');
    screen.getByText('spouse');
  });

  it('renders all relationship options', () => {
    render(<AddFamilyMemberScreen />);
    screen.getByText('Spouse');
    screen.getByText('Child');
    screen.getByText('Parent');
    screen.getByText('Sibling');
    screen.getByText('Other Family');
  });

  it('updates description when relationship is changed to child', () => {
    render(<AddFamilyMemberScreen />);

    fireEvent.press(screen.getByTestId('select-option-child'));

    screen.getByText('Add your child to your family profile');
  });

  it('shows spouse description by default', () => {
    render(<AddFamilyMemberScreen />);
    screen.getByText('Add your spouse or partner to your family profile');
  });
});

// ── Camera scan button ────────────────────────────────────────────────────────

describe('AddFamilyMemberScreen — camera scan', () => {
  it('renders "Start Camera Scan" button', () => {
    render(<AddFamilyMemberScreen />);
    screen.getByTestId('start-camera-scan-button');
  });

  it('navigates to PassportScan with familyMode and relationship when scan is pressed', () => {
    render(<AddFamilyMemberScreen />);

    fireEvent.press(screen.getByTestId('start-camera-scan-button'));

    expect(mockNavigate).toHaveBeenCalledWith('PassportScan', {
      familyMode: true,
      relationship: 'spouse',
    });
  });

  it('passes updated relationship when changed before scanning', () => {
    render(<AddFamilyMemberScreen />);

    fireEvent.press(screen.getByTestId('select-option-child'));
    fireEvent.press(screen.getByTestId('start-camera-scan-button'));

    expect(mockNavigate).toHaveBeenCalledWith('PassportScan', {
      familyMode: true,
      relationship: 'child',
    });
  });
});

// ── Manual entry button ───────────────────────────────────────────────────────

describe('AddFamilyMemberScreen — manual entry', () => {
  it('renders "Enter Manually" button', () => {
    render(<AddFamilyMemberScreen />);
    screen.getByTestId('enter-manually-family-button');
  });

  it('navigates to PassportScan with familyMode when manual entry is pressed', () => {
    render(<AddFamilyMemberScreen />);

    fireEvent.press(screen.getByTestId('enter-manually-family-button'));

    expect(mockNavigate).toHaveBeenCalledWith('PassportScan', {
      familyMode: true,
      relationship: 'spouse',
    });
  });
});

// ── Privacy section ───────────────────────────────────────────────────────────

describe('AddFamilyMemberScreen — privacy info', () => {
  it('renders privacy and security section', () => {
    render(<AddFamilyMemberScreen />);
    screen.getByText('Privacy & Security');
    screen.getByText(/All family member data is encrypted/);
  });
});
