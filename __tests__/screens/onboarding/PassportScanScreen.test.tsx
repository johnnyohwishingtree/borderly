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
  scan: {
    result: unknown;
    error: string | null;
    mode: 'method' | 'scanning' | 'preview' | 'manual';
    handleSuccess: jest.Mock;
    handleError: jest.Mock;
    handleCancel: jest.Mock;
    handleStart: jest.Mock;
    handleManualEntry: jest.Mock;
    handleDemo: jest.Mock;
    retry: jest.Mock;
    fallbackToManual: jest.Mock;
  };
  profile: {
    scanned: Record<string, string> | null;
    isSubmitting: boolean;
    save: jest.Mock;
    confirm: jest.Mock;
    edit: jest.Mock;
    rescan: jest.Mock;
    retrySave: jest.Mock;
  };
  form: {
    control: Record<string, unknown>;
    handleSubmit: jest.Mock;
    formState: { errors: Record<string, unknown> };
  };
  ui: {
    devicePerformance: 'low' | 'medium' | 'high';
    showPerformanceHint: boolean;
    setShowPerformanceHint: jest.Mock;
    storageError: string | null;
    clearStorageError: jest.Mock;
  };
  navigation: {
    handleBack: jest.Mock;
  };
  family: {
    mode: boolean;
    relationship: string;
  };
}

const defaultHookReturn: MockHookReturn = {
  scan: {
    result: null,
    error: null,
    mode: 'method',
    handleSuccess: mockHandleScanSuccess,
    handleError: mockHandleScanError,
    handleCancel: mockHandleScanCancel,
    handleStart: mockHandleStartScanning,
    handleManualEntry: mockHandleManualEntry,
    handleDemo: mockHandleDemoScan,
    retry: mockRetryScan,
    fallbackToManual: mockFallbackToManual,
  },
  profile: {
    scanned: null,
    isSubmitting: false,
    save: mockSaveProfileData,
    confirm: mockHandleConfirmScanned,
    edit: mockHandleEditScanned,
    rescan: mockHandleRescan,
    retrySave: mockRetrySave,
  },
  form: {
    control: {},
    handleSubmit: mockHandleSubmit,
    formState: { errors: {} },
  },
  ui: {
    devicePerformance: 'medium',
    showPerformanceHint: false,
    setShowPerformanceHint: mockSetShowPerformanceHint,
    storageError: null,
    clearStorageError: mockClearStorageError,
  },
  navigation: {
    handleBack: mockHandleBack,
  },
  family: {
    mode: false,
    relationship: 'self',
  },
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
    Controller: ({ render: renderFn }: { render: (props: any) => any; name: string }) =>
      renderFn({
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

    screen.getByText('Passport Information');
  });

  it('renders "Quick Passport Scan" heading', () => {
    render(<PassportScanScreen />);

    screen.getByText('Quick Passport Scan');
  });

  it('renders "Start Camera Scan" button', () => {
    render(<PassportScanScreen />);

    screen.getByTestId('start-camera-scan-button');
  });

  it('pressing "Start Camera Scan" calls handleStartScanning', () => {
    render(<PassportScanScreen />);

    fireEvent.press(screen.getByTestId('start-camera-scan-button'));

    expect(mockHandleStartScanning).toHaveBeenCalledTimes(1);
  });

  it('renders "Or enter manually" button', () => {
    render(<PassportScanScreen />);

    screen.getByTestId('enter-manually-button');
  });

  it('pressing "Or enter manually" calls handleManualEntry', () => {
    render(<PassportScanScreen />);

    fireEvent.press(screen.getByTestId('enter-manually-button'));

    expect(mockHandleManualEntry).toHaveBeenCalledTimes(1);
  });

  it('renders scanning tips hint', () => {
    render(<PassportScanScreen />);

    screen.getByText('Scanning Tips');
  });

  it('renders Back button', () => {
    render(<PassportScanScreen />);

    screen.getByTestId('passport-back-button');
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
    mockHookReturn = { ...defaultHookReturn, family: { mode: true, relationship: 'spouse' } };

    render(<PassportScanScreen />);

    screen.getByText('Add Family Member');
  });

  it('shows spouse-specific description text', () => {
    mockHookReturn = { ...defaultHookReturn, family: { mode: true, relationship: 'spouse' } };

    render(<PassportScanScreen />);

    screen.getByText(/spouse's passport/);
  });

  it('shows child-specific description text', () => {
    mockHookReturn = { ...defaultHookReturn, family: { mode: true, relationship: 'child' } };

    render(<PassportScanScreen />);

    screen.getByText(/child's passport/);
  });
});

// ── Scanning mode ─────────────────────────────────────────────────────────────

describe('PassportScanScreen — scanning mode', () => {
  beforeEach(() => {
    mockHookReturn = { ...defaultHookReturn, scan: { ...defaultHookReturn.scan, mode: 'scanning' } };
  });

  it('renders MRZScanner component', () => {
    render(<PassportScanScreen />);

    screen.getByTestId('mrz-scanner');
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
    mockHookReturn = { ...defaultHookReturn, scan: { ...defaultHookReturn.scan, mode: 'preview' }, profile: { ...defaultHookReturn.profile, scanned: scannedProfile } };
  });

  it('renders PassportPreview component', () => {
    render(<PassportScanScreen />);

    screen.getByTestId('passport-preview');
  });

  it('does not render method selection or manual entry UI', () => {
    render(<PassportScanScreen />);

    expect(screen.queryByText('Quick Passport Scan')).toBeNull();
    expect(screen.queryByTestId('passport-number-field')).toBeNull();
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
    mockHookReturn = { ...defaultHookReturn, scan: { ...defaultHookReturn.scan, mode: 'preview' }, profile: { ...defaultHookReturn.profile, scanned: scannedProfile, isSubmitting: true } };

    render(<PassportScanScreen />);

    screen.getByText('Loading...');
  });

  it('does not render preview when scannedProfile is null (falls through to method view)', () => {
    mockHookReturn = { ...defaultHookReturn, scan: { ...defaultHookReturn.scan, mode: 'preview' }, profile: { ...defaultHookReturn.profile, scanned: null } };

    render(<PassportScanScreen />);

    // Falls through the preview guard to the main view
    expect(screen.queryByTestId('passport-preview')).toBeNull();
    screen.getByText('Passport Information');
  });
});

// ── Manual entry mode ─────────────────────────────────────────────────────────

describe('PassportScanScreen — manual entry mode', () => {
  beforeEach(() => {
    mockHookReturn = { ...defaultHookReturn, scan: { ...defaultHookReturn.scan, mode: 'manual' } };
  });

  it('renders "Passport Details" heading', () => {
    render(<PassportScanScreen />);

    screen.getByText('Passport Details');
  });

  it('renders passport number input', () => {
    render(<PassportScanScreen />);

    screen.getByTestId('passport-number-field');
  });

  it('renders surname input', () => {
    render(<PassportScanScreen />);

    screen.getByTestId('surname-field');
  });

  it('renders given names input', () => {
    render(<PassportScanScreen />);

    screen.getByTestId('given-names-field');
  });

  it('renders nationality select', () => {
    render(<PassportScanScreen />);

    screen.getByTestId('nationality-field');
  });

  it('renders date of birth field', () => {
    render(<PassportScanScreen />);

    screen.getByTestId('dob-field');
  });

  it('renders gender buttons', () => {
    render(<PassportScanScreen />);

    screen.getByTestId('gender-Male-button');
    screen.getByTestId('gender-Female-button');
    screen.getByTestId('gender-Other-button');
  });

  it('renders passport expiry field', () => {
    render(<PassportScanScreen />);

    screen.getByTestId('passport-expiry-field');
  });

  it('renders issuing country select', () => {
    render(<PassportScanScreen />);

    screen.getByTestId('issuing-country-field');
  });

  it('renders Continue button', () => {
    render(<PassportScanScreen />);

    screen.getByTestId('passport-continue-button');
  });

  it('does not show scanning tips in manual mode', () => {
    render(<PassportScanScreen />);

    expect(screen.queryByText('Scanning Tips')).toBeNull();
  });

  it('"All fields are required" text is shown', () => {
    render(<PassportScanScreen />);

    screen.getByText('All fields are required');
  });
});

// ── Error states ──────────────────────────────────────────────────────────────

describe('PassportScanScreen — error states', () => {
  it('shows storage error message when storageError is set', () => {
    mockHookReturn = { ...defaultHookReturn, ui: { ...defaultHookReturn.ui, storageError: 'Failed to save profile' } };

    render(<PassportScanScreen />);

    screen.getByText('Failed to save profile');
  });

  it('shows scan error message when scanError is set', () => {
    mockHookReturn = { ...defaultHookReturn, scan: { ...defaultHookReturn.scan, error: 'Camera failed' } };

    render(<PassportScanScreen />);

    screen.getByText('Camera failed');
  });

  it('does not show error messages when no errors', () => {
    render(<PassportScanScreen />);

    expect(screen.queryByTestId('error-message')).toBeNull();
  });
});

// ── Performance hint ──────────────────────────────────────────────────────────

describe('PassportScanScreen — performance hint', () => {
  it('shows performance hint when showPerformanceHint is true', () => {
    mockHookReturn = { ...defaultHookReturn, ui: { ...defaultHookReturn.ui, showPerformanceHint: true } };

    render(<PassportScanScreen />);

    screen.getByText('Performance Optimization Enabled');
  });

  it('does not show performance hint when showPerformanceHint is false', () => {
    render(<PassportScanScreen />);

    expect(screen.queryByText('Performance Optimization Enabled')).toBeNull();
  });

  it('dismiss button calls setShowPerformanceHint(false)', () => {
    mockHookReturn = { ...defaultHookReturn, ui: { ...defaultHookReturn.ui, showPerformanceHint: true } };

    render(<PassportScanScreen />);

    fireEvent.press(screen.getByTestId('dismiss-performance-hint-button'));

    expect(mockSetShowPerformanceHint).toHaveBeenCalledWith(false);
  });
});
