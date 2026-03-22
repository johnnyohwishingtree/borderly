/**
 * Unit tests for TripDetailScreen.
 *
 * Covers rendering and user interaction: trip name display, leg list,
 * Edit modal visibility, Add Destination modal visibility, and delete flow.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import TripDetailScreen from '@/screens/trips/TripDetailScreen/TripDetailScreen';
import type { Trip } from '@/types/trip';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
  useRoute: () => ({ params: { tripId: 'trip_1' } }),
  // Call the callback immediately to simulate screen gaining focus
  useFocusEffect: (cb: () => void) => cb(),
}));

const mockDeleteTrip = jest.fn().mockResolvedValue(undefined);
const mockUpdateTrip = jest.fn().mockResolvedValue(undefined);
const mockUpdateTripLeg = jest.fn().mockResolvedValue(undefined);
const mockAddTripLeg = jest.fn().mockResolvedValue(undefined);

const makeTripLeg = () => ({
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
});

const baseTrip: Trip = {
  id: 'trip_1',
  name: 'Asia Summer 2026',
  status: 'upcoming',
  legs: [makeTripLeg()],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

let mockTrips: Trip[] = [baseTrip];

const mockDuplicateTrip = jest.fn().mockResolvedValue({ id: 'duplicated_trip' });

jest.mock('../../../src/stores/useTripStore', () => ({
  useTripStore: (selector?: (s: { trips: Trip[]; deleteTrip: typeof mockDeleteTrip; updateTrip: typeof mockUpdateTrip; updateTripLeg: typeof mockUpdateTripLeg; addTripLeg: typeof mockAddTripLeg; duplicateTrip: typeof mockDuplicateTrip }) => unknown) => {
    const state = {
      trips: mockTrips,
      deleteTrip: mockDeleteTrip,
      updateTrip: mockUpdateTrip,
      updateTripLeg: mockUpdateTripLeg,
      addTripLeg: mockAddTripLeg,
      duplicateTrip: mockDuplicateTrip,
    };
    return selector ? selector(state) : state;
  },
}));

const mockLoadFamilyProfiles = jest.fn(() => Promise.resolve(undefined));
const mockGetAllProfiles = jest.fn(() => Promise.resolve(new Map()));

jest.mock('../../../src/stores/useProfileStore', () => ({
  useProfileStore: () => ({
    getAllProfiles: mockGetAllProfiles,
    loadFamilyProfiles: mockLoadFamilyProfiles,
    currentProfileId: null,
  }),
}));

// Mock lucide-react-native icons
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const Icon = ({ testID }: { testID?: string }) => React.createElement('View', { testID });
  return {
    Map: Icon,
    Upload: Icon,
    ClipboardList: Icon,
    Trash2: Icon,
    ChevronLeft: Icon,
    Plus: Icon,
    Copy: Icon,
  };
});

// Shallow mock for complex components
jest.mock('../../../src/components/trips', () => {
  const React = require('react');
  return {
    LegCard: ({ leg }: { leg: { destinationCountry: string } }) =>
      React.createElement('View', { testID: `leg-card-${leg.destinationCountry}` }),
    AccountSetupChecklist: () => React.createElement('View', { testID: 'account-setup-checklist' }),
    ReadinessChecklist: () => React.createElement('View', { testID: 'readiness-checklist' }),
    DuplicateTripModal: ({ testID, visible }: { testID?: string; visible?: boolean }) =>
      React.createElement('View', { testID: testID ?? 'duplicate-trip-modal', 'aria-hidden': !visible }),
  };
});

jest.mock('../../../src/components/ui', () => {
  const React = require('react');
  const ScreenContainer = ({ children, ...props }: any) =>
    React.createElement('View', props, children);
  const Button = ({ title, onPress, testID }: { title: string; onPress?: () => void; testID?: string }) =>
    React.createElement('TouchableOpacity', { onPress, testID },
      React.createElement('Text', null, title));
  const StatusBadge = ({ text }: { text: string }) =>
    React.createElement('Text', null, text);
  const Input = ({ value, onChangeText, testID, placeholder }: { value?: string; onChangeText?: (v: string) => void; testID?: string; placeholder?: string }) =>
    React.createElement('TextInput', { value, onChangeText, testID, placeholder });
  const DatePickerField = ({ value, onChange, testID, placeholder }: { value?: string; onChange?: (v: string) => void; testID?: string; placeholder?: string }) =>
    React.createElement('TextInput', { value, onChangeText: onChange, testID, placeholder });
  const SearchableSelect = ({ value, onValueChange, testID, placeholder }: { value?: string; onValueChange?: (v: string) => void; testID?: string; placeholder?: string; options?: unknown[] }) =>
    React.createElement('TextInput', { value, onChangeText: onValueChange, testID, placeholder, accessibilityRole: 'combobox' });
  return { ScreenContainer, Button, StatusBadge, Input, DatePickerField, SearchableSelect };
});

jest.mock('../../../src/constants/airports', () => ({
  ALL_AIRPORTS: [
    { value: 'NRT', label: 'Tokyo Narita (NRT)' },
    { value: 'HND', label: 'Tokyo Haneda (HND)' },
    { value: 'KUL', label: 'Kuala Lumpur (KUL)' },
    { value: 'SIN', label: 'Singapore Changi (SIN)' },
  ],
}));

jest.mock('../../../src/constants/countries', () => ({
  SUPPORTED_COUNTRIES: [
    { code: 'JPN', name: 'Japan' },
    { code: 'MYS', name: 'Malaysia' },
    { code: 'SGP', name: 'Singapore' },
  ],
}));

// ── Test setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockTrips = [baseTrip];
});

// ── Rendering tests ───────────────────────────────────────────────────────────

describe('TripDetailScreen — rendering', () => {
  it('renders the trip name', () => {
    render(<TripDetailScreen />);
    expect(screen.getByText('Asia Summer 2026')).toBeTruthy();
  });

  it('renders the destination count', () => {
    render(<TripDetailScreen />);
    expect(screen.getByText('1 destination')).toBeTruthy();
  });

  it('renders a LegCard for each leg', () => {
    render(<TripDetailScreen />);
    expect(screen.getByTestId('leg-card-JPN')).toBeTruthy();
  });

  it('renders the Edit button', () => {
    render(<TripDetailScreen />);
    expect(screen.getByTestId('edit-trip-button')).toBeTruthy();
  });

  it('renders the Add Destination button', () => {
    render(<TripDetailScreen />);
    expect(screen.getByTestId('add-destination-button')).toBeTruthy();
  });

  it('renders "Trip not found" when trip is absent from the store', () => {
    mockTrips = [];
    render(<TripDetailScreen />);
    expect(screen.getByText('Trip not found')).toBeTruthy();
  });

  it('renders plural "destinations" text when multiple legs exist', () => {
    mockTrips = [{
      ...baseTrip,
      legs: [makeTripLeg(), { ...makeTripLeg(), id: 'leg_2', order: 1 }],
    }];
    render(<TripDetailScreen />);
    expect(screen.getByText('2 destinations')).toBeTruthy();
  });
});

// ── Edit Trip modal ───────────────────────────────────────────────────────────

describe('TripDetailScreen — Edit Trip modal', () => {
  it('Edit button opens the edit modal', () => {
    render(<TripDetailScreen />);

    fireEvent.press(screen.getByTestId('edit-trip-button'));

    expect(screen.getByTestId('edit-trip-modal')).toBeTruthy();
  });

  it('edit modal shows the current trip name in the input', () => {
    render(<TripDetailScreen />);

    fireEvent.press(screen.getByTestId('edit-trip-button'));

    const input = screen.getByTestId('edit-trip-name-input');
    expect(input.props.value).toBe('Asia Summer 2026');
  });

  it('edit modal cancel button closes the modal', () => {
    render(<TripDetailScreen />);

    fireEvent.press(screen.getByTestId('edit-trip-button'));
    fireEvent.press(screen.getByTestId('edit-modal-cancel'));

    // Modal should no longer be visible
    const modal = screen.getByTestId('edit-trip-modal');
    expect(modal.props.visible).toBe(false);
  });

  it('save trip name button calls updateTrip', () => {
    render(<TripDetailScreen />);

    fireEvent.press(screen.getByTestId('edit-trip-button'));
    fireEvent.changeText(screen.getByTestId('edit-trip-name-input'), 'Renamed Trip');
    fireEvent.press(screen.getByTestId('save-trip-name-button'));

    expect(mockUpdateTrip).toHaveBeenCalledWith('trip_1', { name: 'Renamed Trip' });
  });

  it('edit modal shows an "Edit" button for each existing leg', () => {
    render(<TripDetailScreen />);

    fireEvent.press(screen.getByTestId('edit-trip-button'));

    expect(screen.getByTestId('edit-leg-leg_1-button')).toBeTruthy();
  });

  it('pressing Edit on a leg shows the leg edit form (country selector, dates)', () => {
    render(<TripDetailScreen />);

    fireEvent.press(screen.getByTestId('edit-trip-button'));
    fireEvent.press(screen.getByTestId('edit-leg-leg_1-button'));

    // Should show the country buttons
    expect(screen.getByTestId('edit-leg-country-JPN')).toBeTruthy();
    expect(screen.getByTestId('edit-leg-arrival-date')).toBeTruthy();
  });

  it('save leg button calls updateTripLeg', () => {
    render(<TripDetailScreen />);

    fireEvent.press(screen.getByTestId('edit-trip-button'));
    fireEvent.press(screen.getByTestId('edit-leg-leg_1-button'));
    fireEvent.press(screen.getByTestId('save-leg-button'));

    expect(mockUpdateTripLeg).toHaveBeenCalledWith(
      'leg_1',
      expect.objectContaining({ destinationCountry: 'JPN' })
    );
  });

  it('Edit Destination modal uses SearchableSelect (not plain Input) for arrival airport', () => {
    render(<TripDetailScreen />);

    fireEvent.press(screen.getByTestId('edit-trip-button'));
    fireEvent.press(screen.getByTestId('edit-leg-leg_1-button'));

    const airportField = screen.getByTestId('edit-leg-arrival-airport');
    // SearchableSelect mock renders with accessibilityRole="combobox"; plain Input does not
    expect(airportField.props.accessibilityRole).toBe('combobox');
  });

  it('arrival airport value is persisted correctly when saved via SearchableSelect', () => {
    render(<TripDetailScreen />);

    fireEvent.press(screen.getByTestId('edit-trip-button'));
    fireEvent.press(screen.getByTestId('edit-leg-leg_1-button'));

    fireEvent.changeText(screen.getByTestId('edit-leg-arrival-airport'), 'HND');
    fireEvent.press(screen.getByTestId('save-leg-button'));

    expect(mockUpdateTripLeg).toHaveBeenCalledWith(
      'leg_1',
      expect.objectContaining({ arrivalAirport: 'HND' })
    );
  });

  it('Edit Destination modal uses DatePickerField (not plain YYYY-MM-DD Input) for arrival date', () => {
    render(<TripDetailScreen />);

    fireEvent.press(screen.getByTestId('edit-trip-button'));
    fireEvent.press(screen.getByTestId('edit-leg-leg_1-button'));

    const arrivalField = screen.getByTestId('edit-leg-arrival-date');
    // DatePickerField mock uses placeholder "Arrival date"; plain Input used "YYYY-MM-DD"
    expect(arrivalField.props.placeholder).toBe('Arrival date');
  });

  it('Edit Destination modal uses DatePickerField for departure date', () => {
    render(<TripDetailScreen />);

    fireEvent.press(screen.getByTestId('edit-trip-button'));
    fireEvent.press(screen.getByTestId('edit-leg-leg_1-button'));

    const departureField = screen.getByTestId('edit-leg-departure-date');
    // DatePickerField mock uses placeholder "Departure date"; plain Input used "YYYY-MM-DD"
    expect(departureField.props.placeholder).toBe('Departure date');
  });

  it('arrival date value is persisted when saved via DatePickerField onChange', () => {
    render(<TripDetailScreen />);

    fireEvent.press(screen.getByTestId('edit-trip-button'));
    fireEvent.press(screen.getByTestId('edit-leg-leg_1-button'));

    // Simulate DatePickerField onChange callback updating the date
    fireEvent.changeText(screen.getByTestId('edit-leg-arrival-date'), '2026-06-15');
    fireEvent.press(screen.getByTestId('save-leg-button'));

    expect(mockUpdateTripLeg).toHaveBeenCalledWith(
      'leg_1',
      expect.objectContaining({ arrivalDate: '2026-06-15' })
    );
  });
});

// ── Add Destination modal ─────────────────────────────────────────────────────

describe('TripDetailScreen — Add Destination modal', () => {
  it('Add Destination button opens the add modal', () => {
    render(<TripDetailScreen />);

    fireEvent.press(screen.getByTestId('add-destination-button'));

    expect(screen.getByTestId('add-destination-modal')).toBeTruthy();
  });

  it('add modal shows empty form fields', () => {
    render(<TripDetailScreen />);

    fireEvent.press(screen.getByTestId('add-destination-button'));

    const arrivalInput = screen.getByTestId('new-leg-arrival-date');
    expect(arrivalInput.props.value).toBe('');
  });

  it('add modal cancel button closes the modal', () => {
    render(<TripDetailScreen />);

    fireEvent.press(screen.getByTestId('add-destination-button'));
    fireEvent.press(screen.getByTestId('add-modal-cancel'));

    const modal = screen.getByTestId('add-destination-modal');
    expect(modal.props.visible).toBe(false);
  });

  it('Add Destination empty-state button also opens the modal', () => {
    mockTrips = [{ ...baseTrip, legs: [] }];

    render(<TripDetailScreen />);

    fireEvent.press(screen.getByTestId('add-destination-empty-button'));

    expect(screen.getByTestId('add-destination-modal')).toBeTruthy();
  });

  it('confirm add destination calls addTripLeg when form is filled', () => {
    render(<TripDetailScreen />);

    fireEvent.press(screen.getByTestId('add-destination-button'));

    // Fill in required fields
    fireEvent.press(screen.getByTestId('new-leg-country-SGP'));
    fireEvent.changeText(screen.getByTestId('new-leg-arrival-date'), '2026-05-01');
    fireEvent.changeText(screen.getByTestId('new-leg-accommodation-name'), 'Marina Bay Sands');

    fireEvent.press(screen.getByTestId('confirm-add-destination-button'));

    expect(mockAddTripLeg).toHaveBeenCalledWith(
      'trip_1',
      expect.objectContaining({
        destinationCountry: 'SGP',
        arrivalDate: '2026-05-01',
      })
    );
  });
});

// ── Delete trip ───────────────────────────────────────────────────────────────

describe('TripDetailScreen — delete trip', () => {
  it('renders the Delete Trip button', () => {
    render(<TripDetailScreen />);
    expect(screen.getByText('Delete Trip')).toBeTruthy();
  });
});

// ── Family member loading ─────────────────────────────────────────────────────

describe('TripDetailScreen — family member loading via useFocusEffect', () => {
  it('calls loadFamilyProfiles on screen focus (not via useMemo)', async () => {
    render(<TripDetailScreen />);
    // useFocusEffect fires the callback immediately in the test mock.
    // Use waitFor to let the async load() complete.
    await waitFor(() => {
      expect(mockLoadFamilyProfiles).toHaveBeenCalled();
    });
  });

  it('calls getAllProfiles on screen focus to populate family members', async () => {
    render(<TripDetailScreen />);
    await waitFor(() => {
      expect(mockGetAllProfiles).toHaveBeenCalled();
    });
  });

  it('calls loadFamilyProfiles again when the screen regains focus', async () => {
    // First mount — focus fires and load runs
    const { unmount } = render(<TripDetailScreen />);
    await waitFor(() => {
      expect(mockLoadFamilyProfiles).toHaveBeenCalled();
    });
    unmount();

    jest.clearAllMocks();

    // Second mount (simulates returning to TripDetailScreen) — focus fires again
    render(<TripDetailScreen />);
    await waitFor(() => {
      expect(mockLoadFamilyProfiles).toHaveBeenCalled();
    });
  });
});
