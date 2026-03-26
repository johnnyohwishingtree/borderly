/**
 * Unit tests for PassportScanScreen.
 *
 * Covers all screen modes (method, scanning, preview, manual),
 * error states, performance hint, and user interactions.
 */
import { render, screen, fireEvent } from '@testing-library/react-native';
import PassportScanScreen from '@/screens/onboarding/PassportScanScreen/PassportScanScreen';

// ── Mock return values (module-level stable references) ───────────────────────

const mockHandleScanSuccess = jest.fn();
const mockHandleScanError = jest.fn();
const mockHandleScanCancel = jest.fn();
const mockHandleManualEntry = jest.fn();
const mockHandleStartScanning = jest.fn();
const mockHandleBack = jest.fn();
const mockHandleConfirmScanned = jest.fn();
const mockHandleEditScanned = jest.fn();
const mockHandleRescan = jest.fn();
const mockRetrySave = jest.fn();
const mockRetryScan = jest.fn();
const mockFallbackToManual = jest.fn();
const mockHandleDemoScan = jest.fn();
const mockClearStorageError = jest.fn();
const mockSaveProfileData = jest.fn();
const mockSetShowPerformanceHint = jest.fn();
const mockHandleSubmit = jest.fn((cb: (data: unknown) => void) => () => cb({}));

interface MockHookReturn {
  mode: 'method' | 'scanning' | 'preview' | 'manual';
  scanResult: unknown;
  scannedProfile: Record<string, string> | null;
  isSubmitting: boolean;
  devicePerformance: 'low' | 'medium' | 'high';
  showPerformanceHint: boolean;
  setShowPerformanceHint: jest.Mock;
  storageError: string | null;
  scanError: string | null;
  familyMode: boolean;
  relationship: string;
  form: {
    control: Record<string, unknown>;
    handleSubmit: jest.Mock;
    formState: { errors: Record<string, unknown> };
  };
  clearStorageError: jest.Mock;
  saveProfileData: jest.Mock;
  handleScanSuccess: jest.Mock;
  handleScanError: jest.Mock;
  handleScanCancel: jest.Mock;
  handleManualEntry: jest.Mock;
  handleStartScanning: jest.Mock;
  handleBack: jest.Mock;
  handleConfirmScanned: jest.Mock;
  handleEditScanned: jest.Mock;
  handleRescan: jest.Mock;
  retrySave: jest.Mock;
  retryScan: jest.Mock;
  fallbackToManual: jest.Mock;
  handleDemoScan: jest.Mock;
}

const defaultHookReturn: MockHookReturn = {
  mode: 'method',
  scanResult: null,
  scannedProfile: null,
  isSubmitting: false,
  devicePerformance: 'medium',
  showPerformanceHint: false,
  setShowPerformanceHint: mockSetShowPerformanceHint,
  storageError: null,
  scanError: null,
  familyMode: false,
  relationship: 'self',
  form: {
    control: {},
    handleSubmit: mockHandleSubmit,
    formState: { errors: {} },
  },
  clearStorageError: mockClearStorageError,
  saveProfileData: mockSaveProfileData,
  handleScanSuccess: mockHandleScanSuccess,
  handleScanError: mockHandleScanError,
  handleScanCancel: mockHandleScanCancel,
  handleManualEntry: mockHandleManualEntry,
  handleStartScanning: mockHandleStartScanning,
  handleBack: mockHandleBack,
  handleConfirmScanned: mockHandleConfirmScanned,
  handleEditScanned: mockHandleEditScanned,
  handleRescan: mockHandleRescan,
  retrySave: mockRetrySave,
  retryScan: mockRetryScan,
  fallbackToManual: mockFallbackToManual,
  handleDemoScan: mockHandleDemoScan,
};

let mockHookReturn: MockHookReturn = { ...defaultHookReturn };

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../../src/hooks/usePassportScan', () => ({
  usePassportScan: () => mockHookReturn,
}));

jest.mock('../../../src/utils/theme', () => ({
  useTheme: () => ({
    colors: { textPrimary: '#000', textSecondary: '#666' },
    isDark: false,
  }),
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const Icon = ({ testID }: { testID?: string }) => React.createElement('View', { testID });
  return { Camera: Icon, Pencil: Icon, Zap: Icon };
});

jest.mock('../../../src/components/ui', () => {
  const React = require('react');
  return {
    Button: ({ title, onPress, testID, loading }: { title: string; onPress?: () => void; testID?: string; loading?: boolean }) =>
      React.createElement('TouchableOpacity', { onPress, testID, disabled: loading },
        React.createElement('Text', null, title)),
    Input: ({ label, testID, value, onChangeText }: { label?: string; testID?: string; value?: string; onChangeText?: (v: string) => void }) =>
      React.createElement('View', { testID },
        label ? React.createElement('Text', null, label) : null,
        React.createElement('TextInput', { value, onChangeText, testID: `${testID}-field` })),
    HelpHint: ({ title, testID }: { title?: string; testID?: string }) =>
      React.createElement('View', { testID }, React.createElement('Text', null, title)),
    SearchableSelect: ({ label, testID }: { label?: string; testID?: string }) =>
      React.createElement('View', { testID }, label ? React.createElement('Text', null, label) : null),
    ProgressIndicator: ({ testID }: { testID?: string }) =>
      React.createElement('View', { testID: testID ?? 'progress-indicator' }),
    DatePickerField: ({ label, testID }: { label?: string; testID?: string }) =>
      React.createElement('View', { testID }, label ? React.createElement('Text', null, label) : null),
    ScreenContainer: ({ children, ...props }: any) =>
      React.createElement('View', props, children),
  };
});

jest.mock('../../../src/components/ui/ErrorMessage', () => {
  const React = require('react');
  return {
    ErrorMessage: ({ error, onRetry, onDismiss }: { error?: string | null; variant?: string; showRetry?: boolean; onRetry?: () => void; onDismiss?: () => void }) => {
      if (!error) return null;
      return React.createElement('View', { testID: 'error-message' },
        React.createElement('Text', null, typeof error === 'string' ? error : 'Error'),
        onRetry ? React.createElement('TouchableOpacity', { testID: 'error-retry-button', onPress: onRetry }) : null,
        onDismiss ? React.createElement('TouchableOpacity', { testID: 'error-dismiss-button', onPress: onDismiss }) : null,
      );
    },
  };
});

jest.mock('../../../src/components/passport', () => {
  const React = require('react');
  return {
    MRZScanner: ({ onScanSuccess, onScanCancel, onManualEntry, onScanError }: any) =>
      React.createElement('View', { testID: 'mrz-scanner' },
        React.createElement('TouchableOpacity', { testID: 'mock-scan-success', onPress: () => onScanSuccess({}) }),
        React.createElement('TouchableOpacity', { testID: 'mock-scan-cancel', onPress: onScanCancel }),
        React.createElement('TouchableOpacity', { testID: 'mock-manual-entry', onPress: onManualEntry }),
        React.createElement('TouchableOpacity', { testID: 'mock-scan-error', onPress: () => onScanError(new Error('test')) }),
      ),
    PassportPreview: ({ onConfirm, onEdit, onRescan, isLoading }: any) =>
      React.createElement('View', { testID: 'passport-preview' },
        React.createElement('TouchableOpacity', { testID: 'preview-confirm', onPress: onConfirm }),
        React.createElement('TouchableOpacity', { testID: 'preview-edit', onPress: onEdit }),
        React.createElement('TouchableOpacity', { testID: 'preview-rescan', onPress: onRescan }),
        isLoading ? React.createElement('Text', null, 'Loading...') : null,
      ),
  };
});

jest.mock('../../../src/components/help', () => {
  const React = require('react');
  return {
    ContextualHelp: () => React.createElement('View', { testID: 'contextual-help' }),
    HelpContent: { passportScanning: {} },
  };
});

jest.mock('../../../src/constants/countries', () => ({
  ALL_COUNTRIES: [
    { code: 'USA', name: 'United States' },
    { code: 'JPN', name: 'Japan' },
  ],
}));

jest.mock('../../../src/utils/dateUtils', () => ({
  getTodayISO: () => '2026-03-26',
}));

// react-hook-form Controller mock — renders the child with mock field
jest.mock('react-hook-form', () => {
  return {
    Controller: ({ render }: { render: (props: any) => any; name: string }) =>
      render({
        field: { onChange: jest.fn(), onBlur: jest.fn(), value: '' },
        fieldState: { error: undefined },
      }),
    useForm: () => ({
      control: {},
      handleSubmit: mockHandleSubmit,
      formState: { errors: {} },
    }),
  };
});

// ── Test setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockHookReturn = { ...defaultHookReturn };
});

// ── Method selection mode ─────────────────────────────────────────────────────

describe('PassportScanScreen — method selection mode', () => {
  it('renders the "Passport Information" title', () => {
    render(<PassportScanScreen />);

    expect(screen.getByText('Passport Information')).toBeTruthy();
  });

  it('renders "Quick Passport Scan" heading', () => {
    render(<PassportScanScreen />);

    expect(screen.getByText('Quick Passport Scan')).toBeTruthy();
  });

  it('renders "Start Camera Scan" button', () => {
    render(<PassportScanScreen />);

    expect(screen.getByTestId('start-camera-scan-button')).toBeTruthy();
  });

  it('pressing "Start Camera Scan" calls handleStartScanning', () => {
    render(<PassportScanScreen />);

    fireEvent.press(screen.getByTestId('start-camera-scan-button'));

    expect(mockHandleStartScanning).toHaveBeenCalledTimes(1);
  });

  it('renders "Or enter manually" button', () => {
    render(<PassportScanScreen />);

    expect(screen.getByTestId('enter-manually-button')).toBeTruthy();
  });

  it('pressing "Or enter manually" calls handleManualEntry', () => {
    render(<PassportScanScreen />);

    fireEvent.press(screen.getByTestId('enter-manually-button'));

    expect(mockHandleManualEntry).toHaveBeenCalledTimes(1);
  });

  it('renders scanning tips hint', () => {
    render(<PassportScanScreen />);

    expect(screen.getByText('Scanning Tips')).toBeTruthy();
  });

  it('renders Back button', () => {
    render(<PassportScanScreen />);

    expect(screen.getByTestId('passport-back-button')).toBeTruthy();
  });

  it('pressing Back calls handleBack', () => {
    render(<PassportScanScreen />);

    fireEvent.press(screen.getByTestId('passport-back-button'));

    expect(mockHandleBack).toHaveBeenCalledTimes(1);
  });

  it('does not render Continue button in method mode', () => {
    render(<PassportScanScreen />);

    expect(screen.queryByTestId('passport-continue-button')).toBeNull();
  });
});

// ── Family mode ───────────────────────────────────────────────────────────────

describe('PassportScanScreen — family mode', () => {
  it('shows "Add Family Member" title when familyMode is true', () => {
    mockHookReturn = { ...defaultHookReturn, familyMode: true, relationship: 'spouse' };

    render(<PassportScanScreen />);

    expect(screen.getByText('Add Family Member')).toBeTruthy();
  });

  it('shows spouse-specific description text', () => {
    mockHookReturn = { ...defaultHookReturn, familyMode: true, relationship: 'spouse' };

    render(<PassportScanScreen />);

    expect(screen.getByText(/spouse's passport/)).toBeTruthy();
  });

  it('shows child-specific description text', () => {
    mockHookReturn = { ...defaultHookReturn, familyMode: true, relationship: 'child' };

    render(<PassportScanScreen />);

    expect(screen.getByText(/child's passport/)).toBeTruthy();
  });
});

// ── Scanning mode ─────────────────────────────────────────────────────────────

describe('PassportScanScreen — scanning mode', () => {
  beforeEach(() => {
    mockHookReturn = { ...defaultHookReturn, mode: 'scanning' };
  });

  it('renders MRZScanner component', () => {
    render(<PassportScanScreen />);

    expect(screen.getByTestId('mrz-scanner')).toBeTruthy();
  });

  it('does not render the method selection UI', () => {
    render(<PassportScanScreen />);

    expect(screen.queryByText('Quick Passport Scan')).toBeNull();
  });

  it('MRZScanner onScanSuccess calls handleScanSuccess', () => {
    render(<PassportScanScreen />);

    fireEvent.press(screen.getByTestId('mock-scan-success'));

    expect(mockHandleScanSuccess).toHaveBeenCalledTimes(1);
  });

  it('MRZScanner onScanCancel calls handleScanCancel', () => {
    render(<PassportScanScreen />);

    fireEvent.press(screen.getByTestId('mock-scan-cancel'));

    expect(mockHandleScanCancel).toHaveBeenCalledTimes(1);
  });

  it('MRZScanner onScanError calls handleScanError', () => {
    render(<PassportScanScreen />);

    fireEvent.press(screen.getByTestId('mock-scan-error'));

    expect(mockHandleScanError).toHaveBeenCalledTimes(1);
  });
});

// ── Preview mode ──────────────────────────────────────────────────────────────

describe('PassportScanScreen — preview mode', () => {
  const scannedProfile = {
    passportNumber: 'L12345678',
    surname: 'SMITH',
    givenNames: 'JOHN',
    nationality: 'USA',
  };

  beforeEach(() => {
    mockHookReturn = { ...defaultHookReturn, mode: 'preview', scannedProfile };
  });

  it('renders PassportPreview component', () => {
    render(<PassportScanScreen />);

    expect(screen.getByTestId('passport-preview')).toBeTruthy();
  });

  it('does not render method selection or manual entry UI', () => {
    render(<PassportScanScreen />);

    expect(screen.queryByText('Quick Passport Scan')).toBeNull();
    expect(screen.queryByTestId('passport-number-input')).toBeNull();
  });

  it('confirm button calls handleConfirmScanned', () => {
    render(<PassportScanScreen />);

    fireEvent.press(screen.getByTestId('preview-confirm'));

    expect(mockHandleConfirmScanned).toHaveBeenCalledTimes(1);
  });

  it('edit button calls handleEditScanned', () => {
    render(<PassportScanScreen />);

    fireEvent.press(screen.getByTestId('preview-edit'));

    expect(mockHandleEditScanned).toHaveBeenCalledTimes(1);
  });

  it('rescan button calls handleRescan', () => {
    render(<PassportScanScreen />);

    fireEvent.press(screen.getByTestId('preview-rescan'));

    expect(mockHandleRescan).toHaveBeenCalledTimes(1);
  });

  it('shows loading state when isSubmitting is true', () => {
    mockHookReturn = { ...defaultHookReturn, mode: 'preview', scannedProfile, isSubmitting: true };

    render(<PassportScanScreen />);

    expect(screen.getByText('Loading...')).toBeTruthy();
  });

  it('does not render preview when scannedProfile is null (falls through to method view)', () => {
    mockHookReturn = { ...defaultHookReturn, mode: 'preview', scannedProfile: null };

    render(<PassportScanScreen />);

    // Falls through the preview guard to the main view
    expect(screen.queryByTestId('passport-preview')).toBeNull();
    expect(screen.getByText('Passport Information')).toBeTruthy();
  });
});

// ── Manual entry mode ─────────────────────────────────────────────────────────

describe('PassportScanScreen — manual entry mode', () => {
  beforeEach(() => {
    mockHookReturn = { ...defaultHookReturn, mode: 'manual' };
  });

  it('renders "Passport Details" heading', () => {
    render(<PassportScanScreen />);

    expect(screen.getByText('Passport Details')).toBeTruthy();
  });

  it('renders passport number input', () => {
    render(<PassportScanScreen />);

    expect(screen.getByTestId('passport-number-input')).toBeTruthy();
  });

  it('renders surname input', () => {
    render(<PassportScanScreen />);

    expect(screen.getByTestId('surname-input')).toBeTruthy();
  });

  it('renders given names input', () => {
    render(<PassportScanScreen />);

    expect(screen.getByTestId('given-names-input')).toBeTruthy();
  });

  it('renders nationality select', () => {
    render(<PassportScanScreen />);

    expect(screen.getByTestId('nationality-input')).toBeTruthy();
  });

  it('renders date of birth field', () => {
    render(<PassportScanScreen />);

    expect(screen.getByTestId('dob-input')).toBeTruthy();
  });

  it('renders gender buttons', () => {
    render(<PassportScanScreen />);

    expect(screen.getByTestId('gender-Male-button')).toBeTruthy();
    expect(screen.getByTestId('gender-Female-button')).toBeTruthy();
    expect(screen.getByTestId('gender-Other-button')).toBeTruthy();
  });

  it('renders passport expiry field', () => {
    render(<PassportScanScreen />);

    expect(screen.getByTestId('passport-expiry-input')).toBeTruthy();
  });

  it('renders issuing country select', () => {
    render(<PassportScanScreen />);

    expect(screen.getByTestId('issuing-country-input')).toBeTruthy();
  });

  it('renders Continue button', () => {
    render(<PassportScanScreen />);

    expect(screen.getByTestId('passport-continue-button')).toBeTruthy();
  });

  it('does not show scanning tips in manual mode', () => {
    render(<PassportScanScreen />);

    expect(screen.queryByText('Scanning Tips')).toBeNull();
  });

  it('"All fields are required" text is shown', () => {
    render(<PassportScanScreen />);

    expect(screen.getByText('All fields are required')).toBeTruthy();
  });
});

// ── Error states ──────────────────────────────────────────────────────────────

describe('PassportScanScreen — error states', () => {
  it('shows storage error message when storageError is set', () => {
    mockHookReturn = { ...defaultHookReturn, storageError: 'Failed to save profile' };

    render(<PassportScanScreen />);

    expect(screen.getByText('Failed to save profile')).toBeTruthy();
  });

  it('shows scan error message when scanError is set', () => {
    mockHookReturn = { ...defaultHookReturn, scanError: 'Camera failed' };

    render(<PassportScanScreen />);

    expect(screen.getByText('Camera failed')).toBeTruthy();
  });

  it('does not show error messages when no errors', () => {
    render(<PassportScanScreen />);

    expect(screen.queryByTestId('error-message')).toBeNull();
  });
});

// ── Performance hint ──────────────────────────────────────────────────────────

describe('PassportScanScreen — performance hint', () => {
  it('shows performance hint when showPerformanceHint is true', () => {
    mockHookReturn = { ...defaultHookReturn, showPerformanceHint: true };

    render(<PassportScanScreen />);

    expect(screen.getByText('Performance Optimization Enabled')).toBeTruthy();
  });

  it('does not show performance hint when showPerformanceHint is false', () => {
    render(<PassportScanScreen />);

    expect(screen.queryByText('Performance Optimization Enabled')).toBeNull();
  });

  it('dismiss button calls setShowPerformanceHint(false)', () => {
    mockHookReturn = { ...defaultHookReturn, showPerformanceHint: true };

    render(<PassportScanScreen />);

    fireEvent.press(screen.getByTestId('dismiss-performance-hint-button'));

    expect(mockSetShowPerformanceHint).toHaveBeenCalledWith(false);
  });
});
