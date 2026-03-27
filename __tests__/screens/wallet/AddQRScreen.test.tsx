/**
 * Unit tests for AddQRScreen.
 *
 * Covers capture section (camera/library buttons), captured image preview,
 * reset button, form fields (label, type), save button states,
 * image quality warnings, and loading state.
 */
import { render, screen, fireEvent } from '@testing-library/react-native';
import AddQRScreen from '@/screens/wallet/AddQRScreen/AddQRScreen';

// ── Mock return values (module-level stable references) ───────────────────────

const mockHandleCameraCapture = jest.fn();
const mockHandleLibraryImport = jest.fn();
const mockHandleSaveQR = jest.fn();
const mockHandleReset = jest.fn();
const mockSetFormData = jest.fn();

const qrTypeOptions = [
  { value: 'immigration', label: 'Immigration' },
  { value: 'customs', label: 'Customs' },
  { value: 'health', label: 'Health' },
  { value: 'combined', label: 'Combined' },
] as const;

const defaultUseAddQRReturn = {
  image: {
    capturedImage: null as string | null,
    base64Image: null as string | null,
    progressiveImage: null as { placeholder?: string; lowQuality?: string; mediumQuality?: string; fullQuality: string } | null,
    imageQuality: null as { warnings: string[]; overallScore: number } | null,
    compressionInfo: null as { success: boolean; originalSize: number; compressedSize: number; compressionRatio: number } | null,
    devicePerformance: 'medium' as 'low' | 'medium' | 'high',
  },
  form: {
    formData: { label: '', type: 'combined' as 'immigration' | 'customs' | 'health' | 'combined' },
    setFormData: mockSetFormData,
    qrTypeOptions,
  },
  actions: {
    isLoading: false,
    handleCameraCapture: mockHandleCameraCapture,
    handleLibraryImport: mockHandleLibraryImport,
    handleSaveQR: mockHandleSaveQR,
    handleReset: mockHandleReset,
  },
};

let mockUseAddQRReturn = { ...defaultUseAddQRReturn };

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../../src/hooks/useAddQR', () => ({
  useAddQR: () => mockUseAddQRReturn,
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const Icon = ({ testID }: { testID?: string }) => React.createElement('View', { testID });
  return { Smartphone: Icon };
});

jest.mock('../../../src/components/ui', () => {
  const React = require('react');
  const ScreenContainer = ({ children, ...props }: any) =>
    React.createElement('View', props, children);
  const Card = ({ children }: any) =>
    React.createElement('View', { testID: 'card' }, children);
  const Button = ({ title, onPress, disabled }: any) =>
    React.createElement(
      'TouchableOpacity',
      {
        testID: `button-${title.replace(/\s+/g, '-').toLowerCase()}`,
        onPress,
        disabled,
        accessibilityState: { disabled: !!disabled },
      },
      React.createElement('Text', null, title),
    );
  const LoadingSpinner = () =>
    React.createElement('View', { testID: 'loading-spinner' });
  const Select = ({ onValueChange, options, placeholder }: any) =>
    React.createElement(
      'View',
      { testID: 'type-select' },
      React.createElement('Text', null, placeholder),
      ...options.map((opt: { value: string; label: string }) =>
        React.createElement(
          'TouchableOpacity',
          { key: opt.value, testID: `select-option-${opt.value}`, onPress: () => onValueChange(opt.value) },
          React.createElement('Text', null, opt.label),
        ),
      ),
    );
  return { Card, Button, LoadingSpinner, Select, ScreenContainer };
});

jest.mock('../../../src/services/storage/models', () => ({
  SavedQRCode: class MockSavedQRCode {},
}));

// ── Test setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAddQRReturn = { ...defaultUseAddQRReturn };
});

// ── Header ────────────────────────────────────────────────────────────────────

describe('AddQRScreen — header', () => {
  it('renders the "Add QR Code" header', () => {
    render(<AddQRScreen />);

    expect(screen.getByText('Add QR Code')).toBeTruthy();
    expect(screen.getByText('Save a QR code to your wallet')).toBeTruthy();
  });
});

// ── Loading state ─────────────────────────────────────────────────────────────

describe('AddQRScreen — loading state', () => {
  it('shows loading spinner when isLoading is true', () => {
    mockUseAddQRReturn = {
      ...defaultUseAddQRReturn,
      actions: { ...defaultUseAddQRReturn.actions, isLoading: true },
    };

    render(<AddQRScreen />);

    expect(screen.getByTestId('loading-spinner')).toBeTruthy();
    expect(screen.getByText('Processing...')).toBeTruthy();
  });

  it('does not show loading spinner when isLoading is false', () => {
    render(<AddQRScreen />);

    expect(screen.queryByTestId('loading-spinner')).toBeNull();
  });
});

// ── Capture section (no image) ───────────────────────────────────────────────

describe('AddQRScreen — capture section (no image)', () => {
  it('shows capture section with camera and library buttons when no image', () => {
    render(<AddQRScreen />);

    expect(screen.getByText('Capture QR Code')).toBeTruthy();
    expect(screen.getByText('Take Photo')).toBeTruthy();
    expect(screen.getByText('Choose from Library')).toBeTruthy();
  });

  it('pressing Take Photo calls handleCameraCapture', () => {
    render(<AddQRScreen />);

    fireEvent.press(screen.getByText('Take Photo'));

    expect(mockHandleCameraCapture).toHaveBeenCalledTimes(1);
  });

  it('pressing Choose from Library calls handleLibraryImport', () => {
    render(<AddQRScreen />);

    fireEvent.press(screen.getByText('Choose from Library'));

    expect(mockHandleLibraryImport).toHaveBeenCalledTimes(1);
  });

  it('does not show form fields when no image captured', () => {
    render(<AddQRScreen />);

    expect(screen.queryByText('QR Code Details')).toBeNull();
    expect(screen.queryByText('Label *')).toBeNull();
  });
});

// ── Captured image preview ───────────────────────────────────────────────────

describe('AddQRScreen — captured image preview', () => {
  beforeEach(() => {
    mockUseAddQRReturn = {
      ...defaultUseAddQRReturn,
      image: { ...defaultUseAddQRReturn.image, capturedImage: 'file:///some/image.jpg' },
      form: { ...defaultUseAddQRReturn.form, formData: { label: 'Test QR', type: 'immigration' } },
    };
  });

  it('shows captured image preview after capture', () => {
    render(<AddQRScreen />);

    expect(screen.getByText('Captured QR Code')).toBeTruthy();
    expect(screen.getByText('QR code image captured successfully')).toBeTruthy();
  });

  it('does not show capture buttons when image is captured', () => {
    render(<AddQRScreen />);

    expect(screen.queryByText('Take Photo')).toBeNull();
    expect(screen.queryByText('Choose from Library')).toBeNull();
  });

  it('shows reset button to clear captured image', () => {
    render(<AddQRScreen />);

    expect(screen.getByLabelText('Reset captured image')).toBeTruthy();
  });

  it('pressing reset calls handleReset', () => {
    render(<AddQRScreen />);

    fireEvent.press(screen.getByLabelText('Reset captured image'));

    expect(mockHandleReset).toHaveBeenCalledTimes(1);
  });
});

// ── Form fields ──────────────────────────────────────────────────────────────

describe('AddQRScreen — form fields', () => {
  beforeEach(() => {
    mockUseAddQRReturn = {
      ...defaultUseAddQRReturn,
      image: { ...defaultUseAddQRReturn.image, capturedImage: 'file:///some/image.jpg' },
      form: { ...defaultUseAddQRReturn.form, formData: { label: '', type: 'combined' } },
    };
  });

  it('renders label input and type selector', () => {
    render(<AddQRScreen />);

    expect(screen.getByText('Label *')).toBeTruthy();
    expect(screen.getByText('Type')).toBeTruthy();
    expect(screen.getByTestId('type-select')).toBeTruthy();
  });

  it('renders label input with placeholder', () => {
    render(<AddQRScreen />);

    expect(screen.getByPlaceholderText('e.g., Visit Japan Web - Customs')).toBeTruthy();
  });

  it('renders type selector with all QR type options', () => {
    render(<AddQRScreen />);

    expect(screen.getByText('Immigration')).toBeTruthy();
    expect(screen.getByText('Customs')).toBeTruthy();
    expect(screen.getByText('Health')).toBeTruthy();
    expect(screen.getByText('Combined')).toBeTruthy();
  });
});

// ── Save button states ───────────────────────────────────────────────────────

describe('AddQRScreen — save button', () => {
  it('save button is disabled when label is empty', () => {
    mockUseAddQRReturn = {
      ...defaultUseAddQRReturn,
      image: { ...defaultUseAddQRReturn.image, capturedImage: 'file:///some/image.jpg' },
      form: { ...defaultUseAddQRReturn.form, formData: { label: '', type: 'combined' } },
    };

    render(<AddQRScreen />);

    const saveButton = screen.getByTestId('button-save-to-wallet');
    expect(saveButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('save button is enabled when label has text', () => {
    mockUseAddQRReturn = {
      ...defaultUseAddQRReturn,
      image: { ...defaultUseAddQRReturn.image, capturedImage: 'file:///some/image.jpg' },
      form: { ...defaultUseAddQRReturn.form, formData: { label: 'Japan Entry QR', type: 'immigration' } },
    };

    render(<AddQRScreen />);

    const saveButton = screen.getByTestId('button-save-to-wallet');
    expect(saveButton.props.accessibilityState?.disabled).toBe(false);
  });

  it('pressing save calls handleSaveQR when form is valid', () => {
    mockUseAddQRReturn = {
      ...defaultUseAddQRReturn,
      image: { ...defaultUseAddQRReturn.image, capturedImage: 'file:///some/image.jpg' },
      form: { ...defaultUseAddQRReturn.form, formData: { label: 'Japan Entry QR', type: 'immigration' } },
    };

    render(<AddQRScreen />);

    fireEvent.press(screen.getByText('Save to Wallet'));

    expect(mockHandleSaveQR).toHaveBeenCalledTimes(1);
  });
});

// ── Image quality warnings ───────────────────────────────────────────────────

describe('AddQRScreen — image quality warnings', () => {
  it('shows quality warnings when imageQuality has warnings', () => {
    mockUseAddQRReturn = {
      ...defaultUseAddQRReturn,
      image: {
        ...defaultUseAddQRReturn.image,
        capturedImage: 'file:///some/image.jpg',
        imageQuality: {
          warnings: ['Image is slightly blurry', 'Low contrast detected'],
          overallScore: 0.6,
        },
      },
      form: { ...defaultUseAddQRReturn.form, formData: { label: 'Test QR', type: 'combined' } },
    };

    render(<AddQRScreen />);

    expect(screen.getByText('Quality Notes:')).toBeTruthy();
    expect(screen.getByText('• Image is slightly blurry')).toBeTruthy();
    expect(screen.getByText('• Low contrast detected')).toBeTruthy();
  });

  it('does not show quality warnings when no warnings', () => {
    mockUseAddQRReturn = {
      ...defaultUseAddQRReturn,
      image: {
        ...defaultUseAddQRReturn.image,
        capturedImage: 'file:///some/image.jpg',
        imageQuality: {
          warnings: [],
          overallScore: 0.95,
        },
      },
      form: { ...defaultUseAddQRReturn.form, formData: { label: 'Test QR', type: 'combined' } },
    };

    render(<AddQRScreen />);

    expect(screen.queryByText('Quality Notes:')).toBeNull();
  });

  it('shows compression info when available', () => {
    mockUseAddQRReturn = {
      ...defaultUseAddQRReturn,
      image: {
        ...defaultUseAddQRReturn.image,
        capturedImage: 'file:///some/image.jpg',
        imageQuality: { warnings: [], overallScore: 0.9 },
        compressionInfo: {
          success: true,
          originalSize: 2 * 1024 * 1024,
          compressedSize: 500 * 1024,
          compressionRatio: 0.25,
        },
      },
      form: { ...defaultUseAddQRReturn.form, formData: { label: 'Test QR', type: 'combined' } },
    };

    render(<AddQRScreen />);

    expect(screen.getByText(/Processing: 25%/)).toBeTruthy();
  });

  it('shows device-optimized message for low-end devices', () => {
    mockUseAddQRReturn = {
      ...defaultUseAddQRReturn,
      image: {
        ...defaultUseAddQRReturn.image,
        capturedImage: 'file:///some/image.jpg',
        imageQuality: { warnings: [], overallScore: 0.9 },
        devicePerformance: 'low',
      },
      form: { ...defaultUseAddQRReturn.form, formData: { label: 'Test QR', type: 'combined' } },
    };

    render(<AddQRScreen />);

    expect(screen.getByText(/Device-optimized processing applied/)).toBeTruthy();
  });
});

// ── Tips section ─────────────────────────────────────────────────────────────

describe('AddQRScreen — tips section', () => {
  it('renders QR code capture tips', () => {
    render(<AddQRScreen />);

    expect(screen.getByText('Tips for QR Code Capture')).toBeTruthy();
    expect(screen.getByText(/Make sure the QR code is clearly visible/)).toBeTruthy();
    expect(screen.getByText(/Ensure good lighting/)).toBeTruthy();
    expect(screen.getByText(/Keep the QR code flat/)).toBeTruthy();
    expect(screen.getByText(/QR codes work best when captured straight-on/)).toBeTruthy();
  });
});
