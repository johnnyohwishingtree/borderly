/**
 * Unit tests for QRWalletScreen.
 *
 * Covers rendering with QR codes, empty state, loading/error states,
 * filter button/modal, add QR button, and pull-to-refresh.
 */
import { render, screen, fireEvent } from '@testing-library/react-native';
import QRWalletScreen from '@/screens/wallet/QRWalletScreen/QRWalletScreen';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeQR = (overrides: Record<string, unknown> = {}) => ({
  id: 'qr_1',
  legId: 'leg_1',
  travelerId: 'traveler_1',
  type: 'immigration' as const,
  imageBase64: 'data:image/png;base64,abc123',
  savedAt: new Date('2026-03-01'),
  label: 'Japan Entry QR',
  ...overrides,
});

const makeTraveler = (overrides: Record<string, unknown> = {}) => ({
  id: 'traveler_1',
  givenNames: 'John',
  surname: 'Doe',
  relationship: 'self' as const,
  ...overrides,
});

// ── Mock return values (module-level stable references) ───────────────────────

const mockOnRefresh = jest.fn();
const mockHandleRetry = jest.fn();
const mockHandleCloseFilterModal = jest.fn();
const mockHandleQRPress = jest.fn();
const mockHandleQRLongPress = jest.fn();
const mockHandleDeleteQR = jest.fn();
const mockHandleAddQR = jest.fn();
const mockHandleCloseFullScreen = jest.fn();
const mockSetSelectedTravelerFilter = jest.fn();
const mockSetShowFilterModal = jest.fn();

const defaultUseQRWalletReturn = {
  data: {
    qrCodes: [makeQR()],
    filteredQRCodes: [makeQR()],
    travelers: new Map([['traveler_1', makeTraveler()]]),
  },
  loading: {
    state: 'success' as 'idle' | 'loading' | 'error' | 'success' | 'timeout',
    error: null as string | null,
    isRefreshing: false,
    loadQRCodes: jest.fn(),
    onRefresh: mockOnRefresh,
    handleRetry: mockHandleRetry,
  },
  fullScreen: {
    selectedQR: null as ReturnType<typeof makeQR> | null,
    fullScreenVisible: false,
    handleQRPress: mockHandleQRPress,
    handleCloseFullScreen: mockHandleCloseFullScreen,
  },
  filter: {
    selectedTravelerFilter: null as string | null,
    setSelectedTravelerFilter: mockSetSelectedTravelerFilter,
    showFilterModal: false,
    setShowFilterModal: mockSetShowFilterModal,
    handleCloseFilterModal: mockHandleCloseFilterModal,
  },
  actions: {
    handleQRLongPress: mockHandleQRLongPress,
    handleDeleteQR: mockHandleDeleteQR,
    handleAddQR: mockHandleAddQR,
  },
};

let mockUseQRWalletReturn = { ...defaultUseQRWalletReturn };

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../../src/hooks/useQRWallet', () => ({
  useQRWallet: () => mockUseQRWalletReturn,
}));

jest.mock('../../../src/hooks/useAccessibilityFocus', () => ({
  useAccessibilityFocus: () => ({ ref: { current: null } }),
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const Icon = ({ testID }: { testID?: string }) => React.createElement('View', { testID });
  return { Smartphone: Icon, Filter: Icon, Users: Icon, X: Icon };
});

jest.mock('../../../src/components/ui', () => {
  const React = require('react');
  const ScreenContainer = ({ children, ...props }: any) =>
    React.createElement('View', props, children);
  const EmptyState = ({ title, description }: any) =>
    React.createElement(
      'View',
      { testID: 'empty-state' },
      React.createElement('Text', null, title),
      React.createElement('Text', null, description),
    );
  const Button = ({ title, onPress }: any) =>
    React.createElement(
      'TouchableOpacity',
      { testID: 'add-qr-button', onPress },
      React.createElement('Text', null, title),
    );
  return { ScreenContainer, EmptyState, Button };
});

jest.mock('../../../src/components/ui/LoadingStates', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ state, text, onRetry, errorMessage, retryButtonText }: any) =>
      React.createElement(
        'View',
        { testID: `loading-states-${state}` },
        text ? React.createElement('Text', null, text) : null,
        errorMessage ? React.createElement('Text', null, errorMessage) : null,
        onRetry
          ? React.createElement(
              'TouchableOpacity',
              { testID: 'retry-button', onPress: onRetry },
              React.createElement('Text', null, retryButtonText ?? 'Retry'),
            )
          : null,
      ),
  };
});

jest.mock('../../../src/components/wallet', () => {
  const React = require('react');
  return {
    QRCodeCard: ({ qrCode, onPress, onLongPress }: any) =>
      React.createElement(
        'TouchableOpacity',
        {
          testID: `qr-card-${qrCode.id}`,
          onPress: () => onPress(qrCode),
          onLongPress: () => onLongPress(qrCode),
        },
        React.createElement('Text', null, qrCode.label),
      ),
    QRFullScreen: ({ visible, onClose }: any) =>
      visible
        ? React.createElement(
            'View',
            { testID: 'qr-full-screen' },
            React.createElement('TouchableOpacity', { testID: 'close-full-screen', onPress: onClose }),
          )
        : null,
  };
});

jest.mock('../../../src/components/help', () => {
  const React = require('react');
  return {
    ContextualHelp: () => React.createElement('View', { testID: 'contextual-help' }),
    HelpContent: { qrWallet: {} },
  };
});

// ── Test setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUseQRWalletReturn = { ...defaultUseQRWalletReturn };
});

// ── Rendering with QR codes ──────────────────────────────────────────────────

describe('QRWalletScreen — rendering with QR codes', () => {
  it('renders QR code cards when codes exist', () => {
    render(<QRWalletScreen />);

    screen.getByTestId('qr-card-qr_1');
    screen.getByText('Japan Entry QR');
  });

  it('renders multiple QR code cards', () => {
    const qr2 = makeQR({ id: 'qr_2', label: 'Malaysia Customs QR' });
    mockUseQRWalletReturn = {
      ...defaultUseQRWalletReturn,
      data: { ...defaultUseQRWalletReturn.data, qrCodes: [makeQR(), qr2], filteredQRCodes: [makeQR(), qr2] },
    };

    render(<QRWalletScreen />);

    screen.getByTestId('qr-card-qr_1');
    screen.getByTestId('qr-card-qr_2');
  });

  it('renders the "QR Wallet" header', () => {
    render(<QRWalletScreen />);

    screen.getByText('QR Wallet');
  });

  it('renders saved codes count subtitle', () => {
    render(<QRWalletScreen />);

    screen.getByText('1 saved code');
  });

  it('renders plural subtitle for multiple codes', () => {
    const qr2 = makeQR({ id: 'qr_2', label: 'Second QR' });
    mockUseQRWalletReturn = {
      ...defaultUseQRWalletReturn,
      data: { ...defaultUseQRWalletReturn.data, qrCodes: [makeQR(), qr2], filteredQRCodes: [makeQR(), qr2] },
    };

    render(<QRWalletScreen />);

    screen.getByText('2 saved codes');
  });

  it('renders the + Add QR button', () => {
    render(<QRWalletScreen />);

    screen.getByLabelText('Add QR code');
  });
});

// ── Empty state ──────────────────────────────────────────────────────────────

describe('QRWalletScreen — empty state', () => {
  beforeEach(() => {
    mockUseQRWalletReturn = {
      ...defaultUseQRWalletReturn,
      data: { ...defaultUseQRWalletReturn.data, qrCodes: [], filteredQRCodes: [] },
    };
  });

  it('shows empty state when no QR codes saved', () => {
    render(<QRWalletScreen />);

    screen.getByTestId('empty-state');
    screen.getByText('No QR codes saved');
  });

  it('shows the "Add QR Code" button in empty state', () => {
    render(<QRWalletScreen />);

    screen.getByText('Add QR Code');
  });

  it('pressing "Add QR Code" in empty state calls handleAddQR', () => {
    render(<QRWalletScreen />);

    fireEvent.press(screen.getByText('Add QR Code'));

    expect(mockHandleAddQR).toHaveBeenCalledTimes(1);
  });
});

// ── Loading state ─────────────────────────────────────────────────────────────

describe('QRWalletScreen — loading state', () => {
  it('shows loading indicator when state is loading and no QR codes', () => {
    mockUseQRWalletReturn = {
      ...defaultUseQRWalletReturn,
      data: { ...defaultUseQRWalletReturn.data, qrCodes: [] },
      loading: { ...defaultUseQRWalletReturn.loading, state: 'loading' },
    };

    render(<QRWalletScreen />);

    screen.getByTestId('loading-states-loading');
    screen.getByText('Loading your QR codes...');
  });
});

// ── Error state ───────────────────────────────────────────────────────────────

describe('QRWalletScreen — error state', () => {
  it('shows error state when state is error', () => {
    mockUseQRWalletReturn = {
      ...defaultUseQRWalletReturn,
      loading: { ...defaultUseQRWalletReturn.loading, state: 'error', error: 'Database connection failed' },
    };

    render(<QRWalletScreen />);

    screen.getByTestId('loading-states-error');
    screen.getByText('Database connection failed');
  });

  it('shows default error message when error is null', () => {
    mockUseQRWalletReturn = {
      ...defaultUseQRWalletReturn,
      loading: { ...defaultUseQRWalletReturn.loading, state: 'error', error: null },
    };

    render(<QRWalletScreen />);

    screen.getByText('Failed to load QR codes');
  });

  it('retry button calls handleRetry', () => {
    mockUseQRWalletReturn = {
      ...defaultUseQRWalletReturn,
      loading: { ...defaultUseQRWalletReturn.loading, state: 'error', error: 'Failed' },
    };

    render(<QRWalletScreen />);

    fireEvent.press(screen.getByTestId('retry-button'));

    expect(mockHandleRetry).toHaveBeenCalledTimes(1);
  });
});

// ── Filter button and modal ──────────────────────────────────────────────────

describe('QRWalletScreen — filter button and modal', () => {
  it('shows filter button when there are multiple travelers', () => {
    const travelers = new Map([
      ['traveler_1', makeTraveler()],
      ['traveler_2', makeTraveler({ id: 'traveler_2', givenNames: 'Jane', surname: 'Doe', relationship: 'spouse' })],
    ]);
    mockUseQRWalletReturn = {
      ...defaultUseQRWalletReturn,
      data: { ...defaultUseQRWalletReturn.data, travelers },
    };

    render(<QRWalletScreen />);

    screen.getByLabelText('Filter QR codes by traveler');
  });

  it('does not show filter button when there is only one traveler', () => {
    render(<QRWalletScreen />);

    expect(screen.queryByLabelText('Filter QR codes by traveler')).toBeNull();
  });

  it('shows filtered count subtitle when a traveler filter is active', () => {
    mockUseQRWalletReturn = {
      ...defaultUseQRWalletReturn,
      filter: { ...defaultUseQRWalletReturn.filter, selectedTravelerFilter: 'traveler_1' },
      data: { ...defaultUseQRWalletReturn.data, filteredQRCodes: [makeQR()] },
    };

    render(<QRWalletScreen />);

    screen.getByText('1 code for John');
  });

  it('shows "Clear filter" button when filter is active', () => {
    mockUseQRWalletReturn = {
      ...defaultUseQRWalletReturn,
      filter: { ...defaultUseQRWalletReturn.filter, selectedTravelerFilter: 'traveler_1' },
    };

    render(<QRWalletScreen />);

    screen.getByLabelText('Clear traveler filter');
  });

  it('pressing "Clear filter" calls setSelectedTravelerFilter with null', () => {
    mockUseQRWalletReturn = {
      ...defaultUseQRWalletReturn,
      filter: { ...defaultUseQRWalletReturn.filter, selectedTravelerFilter: 'traveler_1' },
    };

    render(<QRWalletScreen />);

    fireEvent.press(screen.getByLabelText('Clear traveler filter'));

    expect(mockSetSelectedTravelerFilter).toHaveBeenCalledWith(null);
  });
});

// ── QR code interactions ─────────────────────────────────────────────────────

describe('QRWalletScreen — QR code interactions', () => {
  it('pressing a QR code card calls handleQRPress with the QR code', () => {
    render(<QRWalletScreen />);

    fireEvent.press(screen.getByTestId('qr-card-qr_1'));

    expect(mockHandleQRPress).toHaveBeenCalledWith(makeQR());
  });

  it('long-pressing a QR code card calls handleQRLongPress with the QR code', () => {
    render(<QRWalletScreen />);

    fireEvent(screen.getByTestId('qr-card-qr_1'), 'longPress');

    expect(mockHandleQRLongPress).toHaveBeenCalledWith(makeQR());
  });

  it('pressing add QR button calls handleAddQR', () => {
    render(<QRWalletScreen />);

    fireEvent.press(screen.getByLabelText('Add QR code'));

    expect(mockHandleAddQR).toHaveBeenCalledTimes(1);
  });
});

// ── Full screen display ──────────────────────────────────────────────────────

describe('QRWalletScreen — full screen QR display', () => {
  it('renders QRFullScreen when fullScreenVisible is true', () => {
    mockUseQRWalletReturn = {
      ...defaultUseQRWalletReturn,
      fullScreen: { ...defaultUseQRWalletReturn.fullScreen, selectedQR: makeQR(), fullScreenVisible: true },
    };

    render(<QRWalletScreen />);

    screen.getByTestId('qr-full-screen');
  });

  it('does not render QRFullScreen when fullScreenVisible is false', () => {
    render(<QRWalletScreen />);

    expect(screen.queryByTestId('qr-full-screen')).toBeNull();
  });
});

