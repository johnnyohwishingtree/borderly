import { render, fireEvent } from '@testing-library/react-native';
import LegFormScreen from '@/screens/trips/LegFormScreen/LegFormScreen';
import { useLegForm } from '@/hooks/useLegForm';
import { usePassportValidity } from '@/hooks/usePassportValidity';
import { useRoute, useNavigation } from '@react-navigation/native';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

jest.mock('@/hooks/useLegForm', () => ({
  useLegForm: jest.fn(),
}));

jest.mock('@/hooks/usePassportValidity', () => ({
  usePassportValidity: jest.fn(),
}));

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockNav = { navigate: mockNavigate, goBack: mockGoBack };

jest.mock('@react-navigation/native', () => ({
  useRoute: jest.fn(),
  useNavigation: jest.fn(),
}));

jest.mock('@/services/schemas/schemaRegistry', () => ({
  schemaRegistry: {
    getSchema: jest.fn().mockReturnValue({ portalUrl: 'https://portal.example.com' }),
  },
}));

jest.mock('lucide-react-native', () => {
  const { View } = require('react-native');
  return new Proxy({}, { get: () => () => <View testID="lucide-icon" /> });
});

jest.mock('@/components/trips', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ countryCode }: any) => <View testID={`flag-${countryCode}`} />,
    CountryFlag: ({ countryCode }: any) => <View testID={`flag-${countryCode}`} />,
    TravelerTabs: ({ tabs, onTabPress, testID }: any) => {
      const { View: V, Text, TouchableOpacity } = require('react-native');
      return (
        <V testID={testID}>
          {tabs.map((t: any) => (
            <TouchableOpacity key={t.id} testID={`tab-${t.id}`} onPress={() => onTabPress(t.id)}>
              <Text>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </V>
      );
    },
    PassportValidityWarning: ({ status, testID }: any) => {
      const { View: V, Text } = require('react-native');
      return <V testID={testID}><Text>{status}</Text></V>;
    },
  };
});

jest.mock('@/components/trips/TravelerTabs', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return ({ tabs, onTabPress, testID }: any) => (
    <View testID={testID}>
      {tabs.map((t: any) => (
        <TouchableOpacity key={t.id} testID={`tab-${t.id}`} onPress={() => onTabPress(t.id)}>
          <Text>{t.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
});

jest.mock('@/components/trips/PassportValidityWarning', () => {
  const { View, Text } = require('react-native');
  return ({ status, testID }: any) => (
    <View testID={testID}><Text>{status}</Text></View>
  );
});

jest.mock('@/components/forms', () => {
  const { View } = require('react-native');
  return {
    DynamicForm: () => <View testID="dynamic-form" />,
  };
});

jest.mock('@/components/help', () => {
  const { View } = require('react-native');
  return {
    ContextualHelp: () => <View testID="contextual-help" />,
    HelpContent: { autoFill: {} },
  };
});

jest.mock('@/components/ui', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    ScreenContainer: ({ children }: any) => <View testID="screen-container">{children}</View>,
    Button: ({ title, onPress, testID, disabled, loading }: any) => (
      <TouchableOpacity onPress={onPress} testID={testID} disabled={disabled || loading}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
  };
});

jest.mock('@/components/ui/ErrorMessage', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    ErrorMessage: ({ error, onRetry, onDismiss }: any) => {
      if (!error) return null;
      const msg = typeof error === 'string' ? error : error.message || 'Error';
      return (
        <View testID="error-message">
          <Text>{msg}</Text>
          {onRetry && (
            <TouchableOpacity testID="error-retry-button" onPress={onRetry}>
              <Text>Retry</Text>
            </TouchableOpacity>
          )}
          {onDismiss && (
            <TouchableOpacity testID="error-dismiss-button" onPress={onDismiss}>
              <Text>Dismiss</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    },
  };
});

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const mockHandleSaveForm = jest.fn();
const mockHandleFormDataChange = jest.fn();
const mockRetryLastOperation = jest.fn();
const mockReloadForm = jest.fn();
const mockClearLoadError = jest.fn();
const mockDismissError = jest.fn();
const mockSwitchToTraveler = jest.fn();

function makeLegFormResult(overrides?: Record<string, unknown>) {
  const flat = {
    trip: { name: 'Japan Trip' },
    leg: { destinationCountry: 'JPN', formStatus: 'draft', departureDate: '2026-06-01', formData: {} },
    currentForm: {
      countryName: 'Japan',
      portalName: 'Visit Japan Web',
      stats: { completionPercentage: 50 },
    },
    formData: { fullName: 'John Doe' },
    isValid: false,
    isLoading: false,
    isSubmitting: false,
    formError: null,
    loadError: null,
    clearLoadError: mockClearLoadError,
    handleFormDataChange: mockHandleFormDataChange,
    handleSaveForm: mockHandleSaveForm,
    retryLastOperation: mockRetryLastOperation,
    reloadForm: mockReloadForm,
    dismissError: mockDismissError,
    hasMultipleTravelers: false,
    activeTravelerId: null,
    travelerTabs: [],
    switchToTraveler: mockSwitchToTraveler,
    ...overrides,
  };

  return {
    tripData: { trip: flat.trip, leg: flat.leg },
    form: {
      currentForm: flat.currentForm,
      formData: flat.formData,
      isValid: flat.isValid,
      isLoading: flat.isLoading,
      handleFormDataChange: flat.handleFormDataChange,
      reloadForm: flat.reloadForm,
    },
    submission: {
      isSubmitting: flat.isSubmitting,
      handleSaveForm: flat.handleSaveForm,
      retryLastOperation: flat.retryLastOperation,
    },
    errors: {
      formError: flat.formError,
      loadError: flat.loadError,
      clearLoadError: flat.clearLoadError,
      clearFormError: jest.fn(),
      dismissError: flat.dismissError,
    },
    travelers: {
      hasMultipleTravelers: flat.hasMultipleTravelers,
      activeTravelerId: flat.activeTravelerId,
      travelerTabs: flat.travelerTabs,
      switchToTraveler: flat.switchToTraveler,
    },
  };
}

function setup(legFormOverrides?: Record<string, unknown>, passportWarning: unknown = null) {
  (useRoute as unknown as jest.Mock).mockReturnValue({
    params: { tripId: 'trip-1', legId: 'leg-1' },
  });
  (useNavigation as unknown as jest.Mock).mockReturnValue(mockNav);
  (useLegForm as unknown as jest.Mock).mockReturnValue(makeLegFormResult(legFormOverrides));
  (usePassportValidity as unknown as jest.Mock).mockReturnValue(passportWarning);
}

// ---------------------------------------------------------------------------
// LegFormScreen — loading state
// ---------------------------------------------------------------------------

describe('LegFormScreen — loading state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup({ isLoading: true });
  });

  it('shows loading text when isLoading is true', () => {
    const { getByText } = render(<LegFormScreen />);
    getByText('Loading form...');
  });
});

// ---------------------------------------------------------------------------
// LegFormScreen — error state (loadError)
// ---------------------------------------------------------------------------

describe('LegFormScreen — error state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup({ loadError: 'Failed to load form', currentForm: undefined, leg: undefined, trip: undefined });
  });

  it('shows error message when loadError is present', () => {
    const { getByTestId } = render(<LegFormScreen />);
    getByTestId('error-message');
  });

  it('shows retry button in error state', () => {
    const { getByTestId } = render(<LegFormScreen />);
    getByTestId('error-retry-button');
  });

  it('calls clearLoadError and reloadForm when retry is pressed', () => {
    const { getByTestId } = render(<LegFormScreen />);
    fireEvent.press(getByTestId('error-retry-button'));
    expect(mockClearLoadError).toHaveBeenCalledTimes(1);
    expect(mockReloadForm).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// LegFormScreen — normal rendering
// ---------------------------------------------------------------------------

describe('LegFormScreen — normal rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup();
  });

  it('renders the country name in the header', () => {
    const { getByText } = render(<LegFormScreen />);
    getByText('Japan');
  });

  it('renders the trip name and portal name', () => {
    const { getByText } = render(<LegFormScreen />);
    getByText(/Japan Trip/);
    getByText(/Visit Japan Web/);
  });

  it('renders the dynamic form', () => {
    const { getByTestId } = render(<LegFormScreen />);
    getByTestId('dynamic-form');
  });

  it('shows completion percentage when > 0', () => {
    const { getByText } = render(<LegFormScreen />);
    getByText('50% complete');
  });

  it('shows "In Progress" status when partially complete and not valid', () => {
    const { getByText } = render(<LegFormScreen />);
    getByText('In Progress');
  });

  it('shows Smart Delta button', () => {
    const { getByTestId } = render(<LegFormScreen />);
    getByTestId('smart-delta-button');
  });
});

// ---------------------------------------------------------------------------
// LegFormScreen — save flow (not valid)
// ---------------------------------------------------------------------------

describe('LegFormScreen — save flow (not valid)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup({ isValid: false });
  });

  it('shows "Save Progress" button when form is not valid', () => {
    const { getByTestId } = render(<LegFormScreen />);
    getByTestId('save-progress-button');
  });

  it('calls handleSaveForm when save progress is pressed', () => {
    const { getByTestId } = render(<LegFormScreen />);
    fireEvent.press(getByTestId('save-progress-button'));
    expect(mockHandleSaveForm).toHaveBeenCalledTimes(1);
  });

  it('disables save button when formData is empty', () => {
    setup({ isValid: false, formData: {} });
    const { getByTestId } = render(<LegFormScreen />);
    expect(getByTestId('save-progress-button').props.disabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// LegFormScreen — valid form actions
// ---------------------------------------------------------------------------

describe('LegFormScreen — valid form actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup({ isValid: true });
  });

  it('shows "Save Progress" button when form is valid', () => {
    const { getByTestId } = render(<LegFormScreen />);
    getByTestId('save-progress-button');
  });

  it('shows "Submit in App" button when form is valid', () => {
    const { getByTestId } = render(<LegFormScreen />);
    getByTestId('submit-in-app-button');
  });

  it('navigates to PortalSubmission when submit in app is pressed', () => {
    const { getByTestId } = render(<LegFormScreen />);
    fireEvent.press(getByTestId('submit-in-app-button'));
    expect(mockNavigate).toHaveBeenCalledWith('PortalSubmission', expect.objectContaining({
      countryCode: 'JPN',
      tripId: 'trip-1',
      legId: 'leg-1',
    }));
  });

  it('shows "Guide" button when form is valid', () => {
    const { getByTestId } = render(<LegFormScreen />);
    getByTestId('open-submission-guide-button');
  });

  it('navigates to SubmissionGuide when guide button is pressed', () => {
    const { getByTestId } = render(<LegFormScreen />);
    fireEvent.press(getByTestId('open-submission-guide-button'));
    expect(mockNavigate).toHaveBeenCalledWith('SubmissionGuide', expect.objectContaining({
      tripId: 'trip-1',
      legId: 'leg-1',
      countryCode: 'JPN',
    }));
  });

  it('shows "Ready" status text when form is valid', () => {
    const { getByText } = render(<LegFormScreen />);
    getByText('Ready');
  });
});

// ---------------------------------------------------------------------------
// LegFormScreen — form error display
// ---------------------------------------------------------------------------

describe('LegFormScreen — form error', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup({ formError: 'Save failed' });
  });

  it('displays form error message', () => {
    const { getByText } = render(<LegFormScreen />);
    getByText('Save failed');
  });

  it('calls retryLastOperation when retry is pressed', () => {
    const { getByTestId } = render(<LegFormScreen />);
    fireEvent.press(getByTestId('error-retry-button'));
    expect(mockRetryLastOperation).toHaveBeenCalledTimes(1);
  });

  it('calls dismissError when dismiss is pressed', () => {
    const { getByTestId } = render(<LegFormScreen />);
    fireEvent.press(getByTestId('error-dismiss-button'));
    expect(mockDismissError).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// LegFormScreen — passport validity warning
// ---------------------------------------------------------------------------

describe('LegFormScreen — passport validity warning', () => {
  it('shows passport warning when present', () => {
    setup({}, {
      status: 'expiring',
      countryName: 'Japan',
      requiredMonths: 6,
      passportExpiry: '2026-08-01',
    });
    const { getByTestId } = render(<LegFormScreen />);
    getByTestId('leg-form-passport-validity-warning');
  });

  it('does not show passport warning when null', () => {
    setup({}, null);
    const { queryByTestId } = render(<LegFormScreen />);
    expect(queryByTestId('leg-form-passport-validity-warning')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// LegFormScreen — multi-traveler tabs
// ---------------------------------------------------------------------------

describe('LegFormScreen — multi-traveler', () => {
  it('does not show traveler tabs for single traveler', () => {
    setup({ hasMultipleTravelers: false });
    const { queryByTestId } = render(<LegFormScreen />);
    expect(queryByTestId('leg-form-traveler-tabs')).toBeNull();
  });

  it('shows traveler tabs when hasMultipleTravelers is true', () => {
    setup({
      hasMultipleTravelers: true,
      activeTravelerId: 'traveler-1',
      travelerTabs: [
        { id: 'traveler-1', label: 'Me' },
        { id: 'traveler-2', label: 'Spouse' },
      ],
    });
    const { getByTestId } = render(<LegFormScreen />);
    getByTestId('leg-form-traveler-tabs');
  });
});
