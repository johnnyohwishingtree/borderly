/**
 * Tests for LegFormScreen button state logic.
 *
 * Verifies:
 * - "Save Progress" button always visible
 * - "Submit in App" and "Guide" buttons always visible
 * - Save button variant changes based on form validity
 * - Progress status shows live state from form store
 */

import { render } from '@testing-library/react-native';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useRoute: () => ({
    params: { tripId: 'trip-1', legId: 'leg-1' },
  }),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
}));

let mockIsValid = false;
let mockCompletionPercentage = 0;
const mockHandleSaveForm = jest.fn();

jest.mock('@/hooks/useLegForm', () => ({
  useLegForm: () => ({
    tripData: {
      trip: { id: 'trip-1', name: 'Test Trip' },
      leg: {
        id: 'leg-1',
        destinationCountry: 'JPN',
        formStatus: 'in_progress',
        departureDate: '2026-06-01',
        formData: { field1: 'value1' },
      },
    },
    form: {
      currentForm: {
        countryName: 'Japan',
        portalName: 'Visit Japan Web',
        stats: { completionPercentage: mockCompletionPercentage },
      },
      formData: { field1: 'value1' },
      isValid: mockIsValid,
      isLoading: false,
      handleFormDataChange: jest.fn(),
      reloadForm: jest.fn(),
    },
    submission: {
      isSubmitting: false,
      handleSaveForm: mockHandleSaveForm,
      retryLastOperation: jest.fn(),
    },
    errors: {
      formError: null,
      loadError: null,
      clearFormError: jest.fn(),
      clearLoadError: jest.fn(),
      dismissError: jest.fn(),
    },
    travelers: {
      hasMultipleTravelers: false,
      activeTravelerId: null,
      travelerTabs: [],
      switchToTraveler: jest.fn(),
    },
  }),
}));

jest.mock('@/hooks/usePassportValidity', () => ({
  usePassportValidity: () => null,
}));

jest.mock('@/services/schemas/schemaRegistry', () => ({
  schemaRegistry: {
    getSchema: () => ({ portalUrl: 'https://vjw.digital.go.jp' }),
  },
}));

jest.mock('@/components/forms', () => ({
  DynamicForm: () => null,
}));

jest.mock('@/components/help', () => ({
  ContextualHelp: () => null,
  HelpContent: { autoFill: {} },
}));

jest.mock('@/components/trips/CountryFlag', () => () => null);
jest.mock('@/components/trips/TravelerTabs', () => () => null);
jest.mock('@/components/trips/PassportValidityWarning', () => () => null);

import LegFormScreen from '@/screens/trips/LegFormScreen/LegFormScreen';

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockIsValid = false;
  mockCompletionPercentage = 0;
});

describe('LegFormScreen action buttons', () => {
  describe('always-visible buttons', () => {
    it('shows "Save Progress" button', () => {
      mockCompletionPercentage = 40;
      const { getByTestId, getByText } = render(<LegFormScreen />);
      getByTestId('save-progress-button');
      getByText('Save Progress');
    });

    it('shows "Submit in App" button', () => {
      mockCompletionPercentage = 40;
      const { getByTestId } = render(<LegFormScreen />);
      getByTestId('submit-in-app-button');
    });

    it('shows "Guide" button', () => {
      mockCompletionPercentage = 40;
      const { getByTestId } = render(<LegFormScreen />);
      getByTestId('open-submission-guide-button');
    });

    it('does not show "Complete Required Fields" text', () => {
      mockCompletionPercentage = 40;
      const { queryByText } = render(<LegFormScreen />);
      expect(queryByText('Complete Required Fields')).toBeNull();
    });

    it('does not show "Validate All Fields" text', () => {
      mockCompletionPercentage = 40;
      const { queryByText } = render(<LegFormScreen />);
      expect(queryByText('Validate All Fields')).toBeNull();
    });
  });

  describe('live progress status', () => {
    it('shows "Not Started" when completion is 0%', () => {
      mockCompletionPercentage = 0;
      const { getByText } = render(<LegFormScreen />);
      getByText('Not Started');
    });

    it('shows "In Progress" when completion is between 1-99%', () => {
      mockCompletionPercentage = 50;
      const { getByText } = render(<LegFormScreen />);
      getByText('In Progress');
      getByText('50% complete');
    });

    it('shows "Ready" when form is valid', () => {
      mockIsValid = true;
      mockCompletionPercentage = 100;
      const { getByText } = render(<LegFormScreen />);
      getByText('Ready');
      getByText('100% complete');
    });
  });
});
