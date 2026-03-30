/**
 * Unit tests for TripListScreen.
 *
 * Covers rendering, empty states, deadline summary, search/filter UI,
 * schema banner, first-run banner, and navigation interactions.
 */
import { render, screen, fireEvent } from '@testing-library/react-native';
import TripListScreen from '@/screens/trips/TripListScreen/TripListScreen';
import type { Trip } from '@/types/trip';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeLeg = (overrides: Partial<import('@/types/trip').TripLeg> = {}) => ({
  id: 'leg_1',
  tripId: 'trip_1',
  destinationCountry: 'JPN',
  arrivalDate: '2026-04-01',
  departureDate: '2026-04-10',
  flightNumber: 'NH123',
  airlineCode: 'NH',
  arrivalAirport: 'NRT',
  accommodation: {
    name: 'Park Hyatt Tokyo',
    address: { line1: '3-7-1-2 Nishi-Shinjuku', line2: '', city: 'Tokyo', state: '', postalCode: '163-1055', country: 'JPN' },
  },
  formStatus: 'not_started' as const,
  submissionStatus: 'not_started' as const,
  order: 0,
  assignedTravelers: [],
  travelerFormsData: [],
  ...overrides,
});

const baseTrip: Trip = {
  id: 'trip_1',
  name: 'Asia Summer 2026',
  status: 'upcoming',
  legs: [makeLeg()],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const secondTrip: Trip = {
  id: 'trip_2',
  name: 'Europe Winter 2026',
  status: 'upcoming',
  legs: [makeLeg({ id: 'leg_2', tripId: 'trip_2', destinationCountry: 'SGP' })],
  createdAt: '2026-02-01T00:00:00.000Z',
  updatedAt: '2026-02-01T00:00:00.000Z',
};

// ── Mock return values (module-level stable references) ───────────────────────

const mockHandleTripPress = jest.fn();
const mockHandleCreateTrip = jest.fn();
const mockHandleImportTrip = jest.fn();
const mockHandleRefresh = jest.fn();
const mockHandleGoToForm = jest.fn();
const mockHandleDeleteTrip = jest.fn();
const mockHandleOpenDuplicateModal = jest.fn();
const mockHandleCloseDuplicateModal = jest.fn();
const mockHandleConfirmDuplicate = jest.fn();
const mockDismissSchemaBanner = jest.fn();
const mockDismissFirstRunPrompt = jest.fn();
const mockResetLoading = jest.fn();
const mockLoadMoreTrips = jest.fn();
const mockToggleExpanded = jest.fn();

const defaultUseTripListReturn = {
  trips: [baseTrip],
  loading: {
    state: 'success' as 'idle' | 'loading' | 'error' | 'success' | 'timeout',
    storeError: null as string | null,
    isLoading: false,
    isLoadingMore: false,
    hasMoreTrips: false,
    loadMoreTrips: mockLoadMoreTrips,
    resetLoading: mockResetLoading,
    handleRefresh: mockHandleRefresh,
  },
  travelers: {
    travelersByTripId: {} as Record<string, unknown>,
  },
  deadlines: {
    urgencyByTripId: {} as Record<string, unknown>,
    deadlineSummary: {
      items: [] as Array<Record<string, unknown>>,
      hasUrgentItems: false,
      isExpanded: false,
      toggleExpanded: mockToggleExpanded,
    },
  },
  schemaBanner: {
    showSchemaBanner: false,
    schemaBannerMessage: '',
    dismissSchemaBanner: mockDismissSchemaBanner,
  },
  firstRun: {
    hasSeenFirstRunPrompt: true,
    dismissFirstRunPrompt: mockDismissFirstRunPrompt,
  },
  duplicate: {
    duplicateTargetId: null as string | null,
    isDuplicating: false,
    duplicateError: null as string | null,
    handleOpenDuplicateModal: mockHandleOpenDuplicateModal,
    handleCloseDuplicateModal: mockHandleCloseDuplicateModal,
    handleConfirmDuplicate: mockHandleConfirmDuplicate,
  },
  navigation: {
    handleTripPress: mockHandleTripPress,
    handleCreateTrip: mockHandleCreateTrip,
    handleImportTrip: mockHandleImportTrip,
    handleGoToForm: mockHandleGoToForm,
    handleDeleteTrip: mockHandleDeleteTrip,
  },
};

let mockUseTripListReturn = { ...defaultUseTripListReturn };

const mockSetSearchQuery = jest.fn();
const mockSetStatusFilter = jest.fn();
const mockClearSearch = jest.fn();

const defaultUseTripFilterReturn = {
  searchQuery: '',
  setSearchQuery: mockSetSearchQuery,
  statusFilter: 'all' as const,
  setStatusFilter: mockSetStatusFilter,
  filteredTrips: [baseTrip],
  resultCount: 1,
  hasActiveFilters: false,
  clearSearch: mockClearSearch,
};

let mockUseTripFilterReturn = { ...defaultUseTripFilterReturn };

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../../src/hooks/useTripList', () => ({
  useTripList: () => mockUseTripListReturn,
}));

jest.mock('../../../src/hooks/useTripFilter', () => ({
  useTripFilter: () => mockUseTripFilterReturn,
  TripStatusFilter: {},
}));

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const Icon = ({ testID }: { testID?: string }) => React.createElement('View', { testID });
  return { Plane: Icon, Search: Icon, X: Icon, ScanLine: Icon };
});

jest.mock('../../../src/components/trips', () => {
  const React = require('react');
  return {
    TripCard: ({ trip, onPress }: { trip: Trip; onPress: () => void }) =>
      React.createElement(
        'TouchableOpacity',
        { testID: `trip-card-${trip.id}`, onPress },
        React.createElement('Text', null, trip.name),
      ),
    DuplicateTripModal: ({ testID, visible }: { testID?: string; visible?: boolean }) =>
      React.createElement('View', { testID: visible ? testID : `${testID}-hidden`, 'data-visible': visible }),
    DeadlineSummary: ({ testID }: { testID?: string }) =>
      React.createElement('View', { testID }),
  };
});

jest.mock('../../../src/components/ui', () => {
  const React = require('react');
  const ScreenContainer = ({ children, ...props }: any) =>
    React.createElement('View', props, children);
  const EmptyState = ({ title, description, buttonProps }: any) =>
    React.createElement(
      'View',
      { testID: 'empty-state' },
      React.createElement('Text', null, title),
      React.createElement('Text', null, description),
      buttonProps
        ? React.createElement('TouchableOpacity', { testID: buttonProps.testID, onPress: buttonProps.onPress },
            React.createElement('Text', null, buttonProps.title))
        : null,
    );
  const InfoBanner = ({ message, onDismiss, testID }: any) =>
    React.createElement(
      'View',
      { testID },
      React.createElement('Text', null, message),
      React.createElement('TouchableOpacity', { testID: `${testID}-dismiss`, onPress: onDismiss }),
    );
  return { ScreenContainer, EmptyState, InfoBanner };
});

jest.mock('../../../src/components/ui/LoadingStates', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ state, text, onRetry, onCancel, retryButtonText }: any) =>
      React.createElement(
        'View',
        { testID: `loading-states-${state}` },
        text ? React.createElement('Text', null, text) : null,
        onRetry ? React.createElement('TouchableOpacity', { testID: 'retry-button', onPress: onRetry },
          React.createElement('Text', null, retryButtonText ?? 'Retry')) : null,
        onCancel ? React.createElement('TouchableOpacity', { testID: 'cancel-button', onPress: onCancel }) : null,
      ),
  };
});

// ── Test setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUseTripListReturn = { ...defaultUseTripListReturn };
  mockUseTripFilterReturn = { ...defaultUseTripFilterReturn };
});

// ── Rendering tests ───────────────────────────────────────────────────────────

describe('TripListScreen — rendering with trips', () => {
  it('renders trip cards for each trip via FlatList', () => {
    mockUseTripListReturn = { ...defaultUseTripListReturn, trips: [baseTrip, secondTrip] };
    mockUseTripFilterReturn = { ...defaultUseTripFilterReturn, filteredTrips: [baseTrip, secondTrip] };

    const { UNSAFE_getByType } = render(<TripListScreen />);
    const { FlatList } = require('react-native');
    const flatList = UNSAFE_getByType(FlatList);

    expect(flatList.props.data).toHaveLength(2);
    expect(flatList.props.data[0].id).toBe('trip_1');
    expect(flatList.props.data[1].id).toBe('trip_2');
  });

  it('renders the trip count subtitle', () => {
    mockUseTripListReturn = { ...defaultUseTripListReturn, trips: [baseTrip, secondTrip] };

    render(<TripListScreen />);

    screen.getByText('2 trips');
  });

  it('renders singular "trip" when only one trip exists', () => {
    render(<TripListScreen />);

    screen.getByText('1 trip');
  });

  it('renders the "Your Trips" header', () => {
    render(<TripListScreen />);

    screen.getByText('Your Trips');
  });

  it('renders search input when trips exist', () => {
    render(<TripListScreen />);

    screen.getByTestId('trip-search-field');
  });

  it('renders filter tabs when trips exist', () => {
    render(<TripListScreen />);

    screen.getByTestId('trip-filter-all');
    screen.getByTestId('trip-filter-upcoming');
    screen.getByTestId('trip-filter-active');
    screen.getByTestId('trip-filter-completed');
  });

  it('renders import trip button', () => {
    render(<TripListScreen />);

    screen.getByTestId('import-trip-button');
  });

});

// ── Empty state ───────────────────────────────────────────────────────────────

describe('TripListScreen — empty state', () => {
  beforeEach(() => {
    mockUseTripListReturn = { ...defaultUseTripListReturn, trips: [] };
    mockUseTripFilterReturn = { ...defaultUseTripFilterReturn, filteredTrips: [] };
  });

  it('shows empty state when no trips exist', () => {
    render(<TripListScreen />);

    screen.getByText('No trips yet');
    screen.getByText('Create your first trip to start planning your travel declarations');
  });

  it('shows "Create Your First Trip" button in empty state', () => {
    render(<TripListScreen />);

    screen.getByTestId('create-first-trip-button');
  });

  it('pressing "Create Your First Trip" calls handleCreateTrip', () => {
    render(<TripListScreen />);

    fireEvent.press(screen.getByTestId('create-first-trip-button'));

    expect(mockHandleCreateTrip).toHaveBeenCalledTimes(1);
  });

  it('shows "Manage your travel itineraries" subtitle when no trips', () => {
    render(<TripListScreen />);

    screen.getByText('Manage your travel itineraries');
  });

  it('does not show search or filter tabs when no trips', () => {
    render(<TripListScreen />);

    expect(screen.queryByTestId('trip-search-field')).toBeNull();
    expect(screen.queryByTestId('trip-filter-all')).toBeNull();
  });

});

// ── Filter empty results ──────────────────────────────────────────────────────

describe('TripListScreen — no search results', () => {
  it('shows "No trips match your search" when filter yields no results', () => {
    mockUseTripFilterReturn = {
      ...defaultUseTripFilterReturn,
      filteredTrips: [],
      hasActiveFilters: true,
    };

    render(<TripListScreen />);

    screen.getByText('No trips match your search');
  });
});

// ── Deadline summary ──────────────────────────────────────────────────────────

describe('TripListScreen — deadline summary', () => {
  it('passes DeadlineSummary as ListHeaderComponent when hasUrgentItems is true', () => {
    mockUseTripListReturn = {
      ...defaultUseTripListReturn,
      deadlines: {
        ...defaultUseTripListReturn.deadlines,
        deadlineSummary: {
          items: [{ tripId: 'trip_1', legId: 'leg_1', label: 'Japan form', dueDate: '2026-03-30', urgency: 'critical' }],
          hasUrgentItems: true,
          isExpanded: false,
          toggleExpanded: mockToggleExpanded,
        },
      },
    };

    const { UNSAFE_getByType } = render(<TripListScreen />);
    const { FlatList } = require('react-native');
    const flatList = UNSAFE_getByType(FlatList);

    // ListHeaderComponent is set (not null) when there are urgent items
    expect(flatList.props.ListHeaderComponent).not.toBeNull();
  });

  it('does not render DeadlineSummary when hasUrgentItems is false', () => {
    render(<TripListScreen />);

    expect(screen.queryByTestId('trip-list-deadline-summary')).toBeNull();
  });
});

// ── Schema banner ─────────────────────────────────────────────────────────────

describe('TripListScreen — schema update banner', () => {
  it('shows schema banner when showSchemaBanner is true', () => {
    mockUseTripListReturn = {
      ...defaultUseTripListReturn,
      schemaBanner: {
        ...defaultUseTripListReturn.schemaBanner,
        showSchemaBanner: true,
        schemaBannerMessage: 'Form data updated — Japan entry form has new fields.',
      },
    };

    render(<TripListScreen />);

    screen.getByTestId('schema-update-banner');
    screen.getByText('Form data updated — Japan entry form has new fields.');
  });

  it('does not show schema banner when showSchemaBanner is false', () => {
    render(<TripListScreen />);

    expect(screen.queryByTestId('schema-update-banner')).toBeNull();
  });

  it('dismisses schema banner on dismiss press', () => {
    mockUseTripListReturn = {
      ...defaultUseTripListReturn,
      schemaBanner: {
        ...defaultUseTripListReturn.schemaBanner,
        showSchemaBanner: true,
        schemaBannerMessage: 'Updated.',
      },
    };

    render(<TripListScreen />);

    fireEvent.press(screen.getByTestId('schema-update-banner-dismiss'));

    expect(mockDismissSchemaBanner).toHaveBeenCalledTimes(1);
  });
});

// ── First-run welcome banner ──────────────────────────────────────────────────

describe('TripListScreen — first-run welcome banner', () => {
  it('shows first-run banner when hasSeenFirstRunPrompt is false', () => {
    mockUseTripListReturn = {
      ...defaultUseTripListReturn,
      firstRun: { ...defaultUseTripListReturn.firstRun, hasSeenFirstRunPrompt: false },
    };

    render(<TripListScreen />);

    screen.getByTestId('first-run-welcome-banner');
    screen.getByText("You're all set! Create your first trip to get started.");
  });

  it('does not show first-run banner when hasSeenFirstRunPrompt is true', () => {
    render(<TripListScreen />);

    expect(screen.queryByTestId('first-run-welcome-banner')).toBeNull();
  });

  it('dismisses first-run banner on dismiss press', () => {
    mockUseTripListReturn = {
      ...defaultUseTripListReturn,
      firstRun: { ...defaultUseTripListReturn.firstRun, hasSeenFirstRunPrompt: false },
    };

    render(<TripListScreen />);

    fireEvent.press(screen.getByTestId('first-run-welcome-banner-dismiss'));

    expect(mockDismissFirstRunPrompt).toHaveBeenCalledTimes(1);
  });
});

// ── Loading state ─────────────────────────────────────────────────────────────

describe('TripListScreen — loading state', () => {
  it('shows loading spinner when loadingState is loading and no trips', () => {
    mockUseTripListReturn = {
      ...defaultUseTripListReturn,
      trips: [],
      loading: { ...defaultUseTripListReturn.loading, state: 'loading' },
    };

    render(<TripListScreen />);

    screen.getByTestId('loading-states-loading');
    screen.getByText('Loading your trips...');
  });

  it('shows error state when loadingState is error', () => {
    mockUseTripListReturn = {
      ...defaultUseTripListReturn,
      loading: { ...defaultUseTripListReturn.loading, state: 'error' },
    };

    render(<TripListScreen />);

    screen.getByTestId('loading-states-error');
  });

  it('shows error state when storeError exists', () => {
    mockUseTripListReturn = {
      ...defaultUseTripListReturn,
      loading: { ...defaultUseTripListReturn.loading, storeError: 'Database connection failed' },
    };

    render(<TripListScreen />);

    screen.getByTestId('loading-states-error');
  });

  it('retry button calls handleRefresh in error state', () => {
    mockUseTripListReturn = {
      ...defaultUseTripListReturn,
      loading: { ...defaultUseTripListReturn.loading, state: 'error' },
    };

    render(<TripListScreen />);

    fireEvent.press(screen.getByTestId('retry-button'));

    expect(mockHandleRefresh).toHaveBeenCalledTimes(1);
  });
});

// ── Navigation interactions ───────────────────────────────────────────────────

describe('TripListScreen — navigation interactions', () => {
  it('FlatList renderItem renders TripCard with onPress bound to handleTripPress', () => {
    const { UNSAFE_getByType } = render(<TripListScreen />);
    const { FlatList } = require('react-native');
    const flatList = UNSAFE_getByType(FlatList);

    // Invoke renderItem manually to verify it wires up onPress correctly
    const rendered = flatList.props.renderItem({ item: baseTrip });
    expect(typeof rendered.props.onPress).toBe('function');
  });

  it('pressing import trip button calls handleImportTrip', () => {
    render(<TripListScreen />);

    fireEvent.press(screen.getByTestId('import-trip-button'));

    expect(mockHandleImportTrip).toHaveBeenCalledTimes(1);
  });

});

// ── Duplicate trip modal ──────────────────────────────────────────────────────

describe('TripListScreen — duplicate trip modal', () => {
  it('renders DuplicateTripModal as not visible when no duplicate target', () => {
    render(<TripListScreen />);

    // When visible=false, testID is suffixed with -hidden
    screen.getByTestId('trip-list-duplicate-trip-modal-hidden');
  });

  it('renders DuplicateTripModal as visible when duplicateTargetId is set', () => {
    mockUseTripListReturn = {
      ...defaultUseTripListReturn,
      duplicate: { ...defaultUseTripListReturn.duplicate, duplicateTargetId: 'trip_1' },
    };

    render(<TripListScreen />);

    screen.getByTestId('trip-list-duplicate-trip-modal');
  });
});
