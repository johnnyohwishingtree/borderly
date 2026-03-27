/**
 * Tests for SmartImportSheet component.
 * Covers: tab rendering/switching, paste confirmation parsing, flight lookup,
 * import callbacks, close button.
 */
import { render, fireEvent } from '@testing-library/react-native';
import SmartImportSheet from '../../../src/components/import/SmartImportSheet';
import { parseConfirmationText } from '../../../src/services/import/confirmationParser';
import { lookupFlight } from '../../../src/services/import/flightLookup';
import type { ConfirmationParseResult, FlightLookupResult } from '../../../src/types/import';

jest.mock('lucide-react-native', () => ({
  X: 'X',
  ClipboardPaste: 'ClipboardPaste',
  Search: 'Search',
  Plane: 'Plane',
  Building2: 'Building2',
}));

jest.mock('../../../src/components/ui', () => {
  const { TouchableOpacity, Text, View } = require('react-native');
  return {
    Button: ({ title, onPress, disabled, testID }: any) => (
      <TouchableOpacity onPress={disabled ? undefined : onPress} testID={testID}>
        <Text>{title}</Text>
      </TouchableOpacity>
    ),
    Card: ({ children }: any) => <View>{children}</View>,
  };
});

jest.mock('../../../src/services/import/confirmationParser', () => ({
  parseConfirmationText: jest.fn(),
}));

jest.mock('../../../src/services/import/flightLookup', () => ({
  lookupFlight: jest.fn(),
}));

const mockParseConfirmationText = parseConfirmationText as jest.MockedFunction<typeof parseConfirmationText>;
const mockLookupFlight = lookupFlight as jest.MockedFunction<typeof lookupFlight>;

const parsedResult: ConfirmationParseResult = {
  flights: [
    {
      flightNumber: 'NH101',
      airlineCode: 'NH',
      airlineName: 'All Nippon Airways',
      departureAirport: 'LAX',
      arrivalAirport: 'NRT',
      departureCity: 'Los Angeles',
      arrivalCity: 'Tokyo',
      flightDate: '2026-05-01',
      destinationCountry: 'JPN',
    },
  ],
  hotels: [
    {
      name: 'Tokyo Hotel',
      address: '1-1 Chiyoda',
      checkInDate: '2026-05-01',
      checkOutDate: '2026-05-05',
      bookingReference: 'ABC123',
    },
  ],
  rawText: 'booking text',
  confidence: 0.85,
};

const lookupResult: FlightLookupResult = {
  success: true,
  flight: {
    flightNumber: 'JL723',
    airlineCode: 'JL',
    airlineName: 'Japan Airlines',
    departureAirport: 'SFO',
    arrivalAirport: 'NRT',
  },
};

describe('SmartImportSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── Tab rendering ────────────────────────────────────────────────────────

  it('renders both tabs', () => {
    const { getByText } = render(
      <SmartImportSheet onImport={jest.fn()} onClose={jest.fn()} />,
    );
    getByText('Paste Confirmation');
    getByText('Flight Lookup');
  });

  it('shows paste tab content by default', () => {
    const { getByTestId } = render(
      <SmartImportSheet onImport={jest.fn()} onClose={jest.fn()} />,
    );
    getByTestId('paste-confirmation-field');
  });

  it('switches to flight tab on press', () => {
    const { getByTestId, queryByTestId } = render(
      <SmartImportSheet onImport={jest.fn()} onClose={jest.fn()} />,
    );
    fireEvent.press(getByTestId('tab-flight'));
    getByTestId('flight-number-field');
    expect(queryByTestId('paste-confirmation-field')).toBeNull();
  });

  it('switches back to paste tab', () => {
    const { getByTestId } = render(
      <SmartImportSheet onImport={jest.fn()} onClose={jest.fn()} />,
    );
    fireEvent.press(getByTestId('tab-flight'));
    fireEvent.press(getByTestId('tab-paste'));
    getByTestId('paste-confirmation-field');
  });

  // ─── Close ────────────────────────────────────────────────────────────────

  it('calls onClose when close button pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <SmartImportSheet onImport={jest.fn()} onClose={onClose} />,
    );
    fireEvent.press(getByTestId('smart-import-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // ─── Paste tab: parse and import ─────────────────────────────────────────

  it('calls parseConfirmationText on parse and displays results', () => {
    mockParseConfirmationText.mockReturnValue(parsedResult);

    const { getByTestId, getByText } = render(
      <SmartImportSheet onImport={jest.fn()} onClose={jest.fn()} />,
    );

    fireEvent.changeText(getByTestId('paste-confirmation-field'), 'booking email text');
    fireEvent.press(getByTestId('parse-confirmation-button'));

    expect(mockParseConfirmationText).toHaveBeenCalledWith('booking email text');
    getByText('NH101');
    getByText('Tokyo Hotel');
    getByText('Found Information');
  });

  it('calls onImport with parsed data when import button pressed', () => {
    mockParseConfirmationText.mockReturnValue(parsedResult);
    const onImport = jest.fn();

    const { getByTestId } = render(
      <SmartImportSheet onImport={onImport} onClose={jest.fn()} />,
    );

    fireEvent.changeText(getByTestId('paste-confirmation-field'), 'booking text');
    fireEvent.press(getByTestId('parse-confirmation-button'));
    fireEvent.press(getByTestId('import-parsed-data-button'));

    expect(onImport).toHaveBeenCalledWith({
      flights: parsedResult.flights,
      hotels: parsedResult.hotels,
    });
  });

  it('shows no-results message when parse finds nothing', () => {
    mockParseConfirmationText.mockReturnValue({
      flights: [],
      hotels: [],
      rawText: 'random text',
      confidence: 0,
    });

    const { getByTestId, getByText } = render(
      <SmartImportSheet onImport={jest.fn()} onClose={jest.fn()} />,
    );

    fireEvent.changeText(getByTestId('paste-confirmation-field'), 'random text');
    fireEvent.press(getByTestId('parse-confirmation-button'));

    getByText(/No flight or hotel information found/);
  });

  // ─── Flight tab: lookup and import ────────────────────────────────────────

  it('calls lookupFlight on lookup and displays result', () => {
    mockLookupFlight.mockReturnValue(lookupResult);

    const { getByTestId, getByText } = render(
      <SmartImportSheet onImport={jest.fn()} onClose={jest.fn()} />,
    );

    fireEvent.press(getByTestId('tab-flight'));
    fireEvent.changeText(getByTestId('flight-number-field'), 'JL723');
    fireEvent.press(getByTestId('lookup-flight-button'));

    expect(mockLookupFlight).toHaveBeenCalledWith('JL723', {});
    getByText('JL723');
    getByText('Japan Airlines');
  });

  it('calls onImport with flight data when import button pressed', () => {
    mockLookupFlight.mockReturnValue(lookupResult);
    const onImport = jest.fn();

    const { getByTestId } = render(
      <SmartImportSheet onImport={onImport} onClose={jest.fn()} />,
    );

    fireEvent.press(getByTestId('tab-flight'));
    fireEvent.changeText(getByTestId('flight-number-field'), 'JL723');
    fireEvent.press(getByTestId('lookup-flight-button'));
    fireEvent.press(getByTestId('import-flight-button'));

    expect(onImport).toHaveBeenCalledWith({
      flights: [lookupResult.flight],
      hotels: [],
    });
  });

  it('shows error message when lookup fails', () => {
    mockLookupFlight.mockReturnValue({
      success: false,
      error: 'Flight not found',
    });

    const { getByTestId, getByText } = render(
      <SmartImportSheet onImport={jest.fn()} onClose={jest.fn()} />,
    );

    fireEvent.press(getByTestId('tab-flight'));
    fireEvent.changeText(getByTestId('flight-number-field'), 'XX999');
    fireEvent.press(getByTestId('lookup-flight-button'));

    getByText('Flight not found');
  });
});
