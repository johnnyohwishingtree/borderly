/**
 * Unit tests for QRDetailScreen.
 *
 * Covers QR display, type badges, metadata (saved date, trip leg),
 * share button, delete button, loading state, and not-found state.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert, Share } from 'react-native';
import QRDetailScreen from '@/screens/wallet/QRDetailScreen/QRDetailScreen';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeQR = (overrides: Record<string, unknown> = {}) => ({
  id: 'qr_1',
  legId: 'leg_1',
  travelerId: 'traveler_1',
  type: 'immigration' as const,
  imageBase64: 'abc123',
  savedAt: new Date('2026-03-01T10:30:00.000Z'),
  label: 'Japan Entry QR',
  destroyPermanently: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

// ── Mock return values (module-level stable references) ───────────────────────

const mockGoBack = jest.fn();
const mockNavigation = { goBack: mockGoBack };
const mockRouteParams = { params: { qrCodeId: 'qr_1' } };

let mockFindResult: ReturnType<typeof makeQR> | null = makeQR();
let mockFindShouldThrow = false;

jest.mock('@react-navigation/native', () => ({
  useRoute: () => mockRouteParams,
  useNavigation: () => mockNavigation,
}));

jest.mock('../../../src/services/storage', () => ({
  databaseService: {
    getDatabase: jest.fn().mockImplementation(() =>
      Promise.resolve({
        collections: {
          get: () => ({
            find: () => {
              if (mockFindShouldThrow) return Promise.reject(new Error('Not found'));
              return Promise.resolve(mockFindResult);
            },
          }),
        },
        write: (fn: () => Promise<void>) => fn(),
      }),
    ),
  },
}));

jest.mock('../../../src/services/storage/models', () => ({
  SavedQRCode: class MockSavedQRCode {},
}));

jest.mock('../../../src/components/ui', () => {
  const React = require('react');
  const ScreenContainer = ({ children, ...props }: any) =>
    React.createElement('View', props, children);
  const Card = ({ children }: any) =>
    React.createElement('View', { testID: 'card' }, children);
  const Button = ({ title, onPress }: any) =>
    React.createElement(
      'TouchableOpacity',
      { testID: `button-${title.replace(/\s+/g, '-').toLowerCase()}`, onPress },
      React.createElement('Text', null, title),
    );
  const LoadingSpinner = () =>
    React.createElement('View', { testID: 'loading-spinner' });
  return { Card, Button, LoadingSpinner, ScreenContainer };
});

jest.mock('../../../src/components/wallet', () => {
  const React = require('react');
  return {
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

// ── Test setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockFindResult = makeQR();
  mockFindShouldThrow = false;
});

// ── Loading state ─────────────────────────────────────────────────────────────

describe('QRDetailScreen — loading state', () => {
  it('shows loading spinner and text initially', () => {
    const { databaseService } = require('../../../src/services/storage');
    databaseService.getDatabase.mockImplementationOnce(() => new Promise(() => {}));

    render(<QRDetailScreen />);

    screen.getByTestId('loading-spinner');
    screen.getByText('Loading QR code...');
  });
});

// ── Not found state ───────────────────────────────────────────────────────────

describe('QRDetailScreen — not found state', () => {
  beforeEach(() => {
    mockFindResult = null;
  });

  it('shows not-found state when QR code is null', async () => {
    render(<QRDetailScreen />);

    await screen.findByText('QR Code Not Found');
    screen.getByText('The requested QR code could not be found.');
  });

  it('shows Go Back button and pressing it navigates back', async () => {
    render(<QRDetailScreen />);

    const goBackBtn = await screen.findByText('Go Back');
    fireEvent.press(goBackBtn);

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});

// ── Error state ───────────────────────────────────────────────────────────────

describe('QRDetailScreen — error loading', () => {
  it('shows alert when database load fails', async () => {
    mockFindShouldThrow = true;
    const alertSpy = jest.spyOn(Alert, 'alert');

    render(<QRDetailScreen />);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Error',
      'Failed to load QR code details.',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Go Back' }),
      ]),
    );
  });
});

// ── QR code display ──────────────────────────────────────────────────────────

describe('QRDetailScreen — QR code display', () => {
  it('renders QR code label as header', async () => {
    render(<QRDetailScreen />);

    await screen.findByText('Japan Entry QR');
  });

  it('renders tap-for-full-screen hint', async () => {
    render(<QRDetailScreen />);

    await screen.findByText('Tap for full screen view');
  });

  it('shows "No Image" when imageBase64 is empty', async () => {
    mockFindResult = makeQR({ imageBase64: '' });

    render(<QRDetailScreen />);

    await screen.findByText('No Image');
  });
});

// ── Type badges ──────────────────────────────────────────────────────────────

describe('QRDetailScreen — type badges', () => {
  it.each([
    ['immigration', 'Immigration'],
    ['customs', 'Customs'],
    ['health', 'Health'],
    ['combined', 'Combined'],
  ] as const)('shows %s type badge', async (type, label) => {
    mockFindResult = makeQR({ type });

    render(<QRDetailScreen />);

    await waitFor(() => {
      expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(1);
    });
  });
});

// ── Metadata ─────────────────────────────────────────────────────────────────

describe('QRDetailScreen — metadata', () => {
  it('shows save date and type labels', async () => {
    render(<QRDetailScreen />);

    await screen.findByText('Saved:');
    screen.getByText('Type:');
  });

  it('shows trip leg association when legId exists', async () => {
    render(<QRDetailScreen />);

    await screen.findByText('Trip Leg:');
    screen.getByText('Associated');
  });
});

// ── Action buttons ───────────────────────────────────────────────────────────

describe('QRDetailScreen — action buttons', () => {
  it('renders all action buttons', async () => {
    render(<QRDetailScreen />);

    await screen.findByText('View Full Screen');
    screen.getByText('Share QR Code');
    screen.getByText('Delete QR Code');
  });
});

// ── Share ─────────────────────────────────────────────────────────────────────

describe('QRDetailScreen — share', () => {
  it('calls Share.share when share button is pressed', async () => {
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as any);

    render(<QRDetailScreen />);

    const shareBtn = await screen.findByText('Share QR Code');
    fireEvent.press(shareBtn);

    await waitFor(() => {
      expect(shareSpy).toHaveBeenCalled();
    });
  });
});

// ── Delete ────────────────────────────────────────────────────────────────────

describe('QRDetailScreen — delete', () => {
  it('shows confirmation alert when delete is pressed', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');

    render(<QRDetailScreen />);

    const deleteBtn = await screen.findByText('Delete QR Code');
    fireEvent.press(deleteBtn);

    expect(alertSpy).toHaveBeenCalledWith(
      'Delete QR Code',
      'Are you sure you want to delete "Japan Entry QR"? This action cannot be undone.',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
        expect.objectContaining({ text: 'Delete', style: 'destructive' }),
      ]),
    );
  });
});

// ── Full screen view ─────────────────────────────────────────────────────────

describe('QRDetailScreen — full screen view', () => {
  it('opens full screen when tapping QR image area', async () => {
    render(<QRDetailScreen />);

    const tapHint = await screen.findByText('Tap for full screen view');
    fireEvent.press(tapHint);

    screen.getByTestId('qr-full-screen');
  });

  it('opens full screen when pressing View Full Screen button', async () => {
    render(<QRDetailScreen />);

    const btn = await screen.findByText('View Full Screen');
    fireEvent.press(btn);

    screen.getByTestId('qr-full-screen');
  });
});

// ── Usage instructions ───────────────────────────────────────────────────────

describe('QRDetailScreen — usage instructions', () => {
  it('renders usage instructions section', async () => {
    render(<QRDetailScreen />);

    await screen.findByText('How to Use');
    screen.getByText(/Show this QR code to immigration/);
    screen.getByText(/Use full-screen view/);
    screen.getByText(/Keep your phone charged/);
  });
});
