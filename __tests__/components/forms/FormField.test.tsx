import { render, screen, fireEvent } from '@testing-library/react-native';
import FormField from '../../../src/components/forms/FormField';
import { ALL_AIRPORTS, getAirportByCode, getAirportLabel } from '../../../src/constants/airports';
import type { FilledFormField } from '../../../src/services/forms/formEngine';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeField(overrides: Partial<FilledFormField> = {}): FilledFormField {
  return {
    id: 'testField',
    label: 'Test Field',
    type: 'text',
    required: false,
    countrySpecific: false,
    currentValue: '',
    source: 'empty',
    needsUserInput: true,
    ...overrides,
  };
}

/**
 * Simulate the SearchableSelect filter algorithm so we can unit-test search
 * without relying on FlatList rendering (FlatList is mocked in tests).
 */
function filterAirports(query: string): { value: string; label: string }[] {
  if (!query.trim()) return ALL_AIRPORTS;
  const q = query.toLowerCase();
  return ALL_AIRPORTS.filter(
    o => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
  );
}

// ---------------------------------------------------------------------------
// Airport database unit tests
// ---------------------------------------------------------------------------

describe('ALL_AIRPORTS database', () => {
  it('contains more than 400 airports', () => {
    expect(ALL_AIRPORTS.length).toBeGreaterThan(400);
  });

  it('every entry has a non-empty value (IATA code) and label', () => {
    ALL_AIRPORTS.forEach(airport => {
      expect(airport.value.trim()).not.toBe('');
      expect(airport.label.trim()).not.toBe('');
    });
  });

  it('every IATA code is exactly 3 uppercase letters', () => {
    ALL_AIRPORTS.forEach(airport => {
      expect(airport.value).toMatch(/^[A-Z]{3}$/);
    });
  });

  it('IATA code appears inside the label so search-by-code works', () => {
    ALL_AIRPORTS.forEach(airport => {
      expect(airport.label).toContain(`(${airport.value})`);
    });
  });

  it('has no duplicate IATA codes', () => {
    const codes = ALL_AIRPORTS.map(a => a.value);
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });

  it('includes key airports for supported destinations', () => {
    const codes = new Set(ALL_AIRPORTS.map(a => a.value));
    // Japan
    expect(codes.has('NRT')).toBe(true);
    expect(codes.has('HND')).toBe(true);
    expect(codes.has('KIX')).toBe(true);
    // Malaysia
    expect(codes.has('KUL')).toBe(true);
    expect(codes.has('KUA')).toBe(true);
    expect(codes.has('PEN')).toBe(true);
    expect(codes.has('BKI')).toBe(true);
    expect(codes.has('JHB')).toBe(true);
    expect(codes.has('LGK')).toBe(true);
    expect(codes.has('KCH')).toBe(true);
    // Singapore
    expect(codes.has('SIN')).toBe(true);
    // Global hubs
    expect(codes.has('LHR')).toBe(true);
    expect(codes.has('JFK')).toBe(true);
    expect(codes.has('DXB')).toBe(true);
    expect(codes.has('SYD')).toBe(true);
    expect(codes.has('DOH')).toBe(true);
    expect(codes.has('FRA')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Airport search / filter logic
// ---------------------------------------------------------------------------

describe('airport search logic', () => {
  it('returns all airports when query is empty', () => {
    expect(filterAirports('').length).toBe(ALL_AIRPORTS.length);
  });

  it('finds Tokyo Narita by IATA code (NRT)', () => {
    const results = filterAirports('NRT');
    expect(results.some(a => a.value === 'NRT')).toBe(true);
  });

  it('finds Tokyo Narita by lowercase iata code', () => {
    const results = filterAirports('nrt');
    expect(results.some(a => a.value === 'NRT')).toBe(true);
  });

  it('finds Tokyo Narita by city name', () => {
    const results = filterAirports('tokyo');
    expect(results.some(a => a.value === 'NRT')).toBe(true);
    expect(results.some(a => a.value === 'HND')).toBe(true);
  });

  it('finds Tokyo Narita by airport name', () => {
    const results = filterAirports('narita');
    expect(results.some(a => a.value === 'NRT')).toBe(true);
  });

  it('finds Singapore Changi by city name', () => {
    const results = filterAirports('singapore');
    expect(results.some(a => a.value === 'SIN')).toBe(true);
  });

  it('finds Singapore Changi by airport name', () => {
    const results = filterAirports('changi');
    expect(results.some(a => a.value === 'SIN')).toBe(true);
  });

  it('finds Kuala Lumpur KLIA by IATA code', () => {
    const results = filterAirports('KUL');
    expect(results.some(a => a.value === 'KUL')).toBe(true);
  });

  it('finds Kuala Lumpur KLIA by city', () => {
    const results = filterAirports('kuala lumpur');
    expect(results.some(a => a.value === 'KUL')).toBe(true);
  });

  it('finds Penang airport', () => {
    const results = filterAirports('penang');
    expect(results.some(a => a.value === 'PEN')).toBe(true);
  });

  it('returns empty array for a nonsense query', () => {
    expect(filterAirports('XXXXXXXXXX').length).toBe(0);
  });

  it('partial matching works — "london" returns multiple London airports', () => {
    const results = filterAirports('london');
    const londonCodes = results.map(a => a.value);
    expect(londonCodes).toContain('LHR');
    expect(londonCodes).toContain('LGW');
    expect(londonCodes).toContain('STN');
    expect(londonCodes).toContain('LTN');
  });
});

// ---------------------------------------------------------------------------
// getAirportByCode helper
// ---------------------------------------------------------------------------

describe('getAirportByCode', () => {
  it('returns the airport for a known IATA code', () => {
    const airport = getAirportByCode('NRT');
    expect(airport).toBeDefined();
    expect(airport?.value).toBe('NRT');
    expect(airport?.label).toContain('Tokyo');
    expect(airport?.label).toContain('NRT');
  });

  it('returns the airport for Singapore Changi', () => {
    const airport = getAirportByCode('SIN');
    expect(airport).toBeDefined();
    expect(airport?.label).toContain('Singapore');
    expect(airport?.label).toContain('SIN');
  });

  it('returns undefined for an unknown code', () => {
    expect(getAirportByCode('ZZZ')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getAirportLabel helper
// ---------------------------------------------------------------------------

describe('getAirportLabel', () => {
  it('returns a human-readable label for a known code', () => {
    const label = getAirportLabel('SIN');
    expect(label).toContain('Singapore');
    expect(label).toContain('SIN');
  });

  it('returns a label for KUL', () => {
    const label = getAirportLabel('KUL');
    expect(label).toContain('Kuala Lumpur');
    expect(label).toContain('KUL');
  });

  it('falls back to the raw code for an unknown IATA code', () => {
    expect(getAirportLabel('ZZZ')).toBe('ZZZ');
  });
});

// ---------------------------------------------------------------------------
// FormField — keyboard type and autoCapitalize for text fields
// ---------------------------------------------------------------------------

describe('FormField — keyboard type for text fields', () => {
  const mockOnValueChange = jest.fn();

  beforeEach(() => {
    mockOnValueChange.mockClear();
  });

  it('uses email-address keyboard and no auto-capitalization for an email field', () => {
    const field = makeField({ id: 'email', label: 'Email', type: 'text' });
    render(<FormField field={field} onValueChange={mockOnValueChange} />);
    const input = screen.getByTestId('input-email');
    expect(input.props.keyboardType).toBe('email-address');
    expect(input.props.autoCapitalize).toBe('none');
  });

  it('uses email-address keyboard and no auto-capitalization for contactEmail field', () => {
    const field = makeField({ id: 'contactEmail', label: 'Contact Email', type: 'text' });
    render(<FormField field={field} onValueChange={mockOnValueChange} />);
    const input = screen.getByTestId('input-contactEmail');
    expect(input.props.keyboardType).toBe('email-address');
    expect(input.props.autoCapitalize).toBe('none');
  });

  it('uses phone-pad keyboard for phoneNumber field', () => {
    const field = makeField({ id: 'phoneNumber', label: 'Phone Number', type: 'text' });
    render(<FormField field={field} onValueChange={mockOnValueChange} />);
    const input = screen.getByTestId('input-phoneNumber');
    expect(input.props.keyboardType).toBe('phone-pad');
    expect(input.props.autoCapitalize).toBe('sentences');
  });

  it('uses phone-pad keyboard for mobile field', () => {
    const field = makeField({ id: 'mobile', label: 'Mobile', type: 'text' });
    render(<FormField field={field} onValueChange={mockOnValueChange} />);
    const input = screen.getByTestId('input-mobile');
    expect(input.props.keyboardType).toBe('phone-pad');
    expect(input.props.autoCapitalize).toBe('sentences');
  });

  it('uses phone-pad keyboard for phone field', () => {
    const field = makeField({ id: 'phone', label: 'Phone', type: 'text' });
    render(<FormField field={field} onValueChange={mockOnValueChange} />);
    const input = screen.getByTestId('input-phone');
    expect(input.props.keyboardType).toBe('phone-pad');
    expect(input.props.autoCapitalize).toBe('sentences');
  });

  it('uses default keyboard and sentences auto-capitalization for a regular text field', () => {
    const field = makeField({ id: 'firstName', label: 'First Name', type: 'text' });
    render(<FormField field={field} onValueChange={mockOnValueChange} />);
    const input = screen.getByTestId('input-firstName');
    expect(input.props.keyboardType).toBe('default');
    expect(input.props.autoCapitalize).toBe('sentences');
  });
});

// ---------------------------------------------------------------------------
// FormField rendering with optionsSource: 'airports'
// ---------------------------------------------------------------------------

describe('FormField — airport autocomplete rendering', () => {
  const mockOnValueChange = jest.fn();

  beforeEach(() => {
    mockOnValueChange.mockClear();
  });

  it('renders a SearchableSelect when type is searchable_select + optionsSource airports', () => {
    const field = makeField({
      id: 'arrivalAirport',
      label: 'Arrival Airport',
      type: 'searchable_select',
      optionsSource: 'airports',
    });

    render(
      <FormField
        field={field}
        onValueChange={mockOnValueChange}
      />,
    );

    expect(screen.getByTestId('searchable-select-arrivalAirport-trigger')).toBeTruthy();
  });

  it('shows the field label in the form', () => {
    const field = makeField({
      id: 'arrivalAirport',
      label: 'Arrival Airport',
      type: 'searchable_select',
      optionsSource: 'airports',
    });

    render(
      <FormField
        field={field}
        onValueChange={mockOnValueChange}
      />,
    );

    // getAllByText handles the label appearing in both FormField and SearchableSelect
    const matches = screen.getAllByText('Arrival Airport');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('opens the search panel when the trigger is pressed', () => {
    const field = makeField({
      id: 'arrivalAirport',
      label: 'Arrival Airport',
      type: 'searchable_select',
      optionsSource: 'airports',
    });

    render(
      <FormField
        field={field}
        onValueChange={mockOnValueChange}
      />,
    );

    fireEvent.press(screen.getByTestId('searchable-select-arrivalAirport-trigger'));

    expect(screen.getByTestId('searchable-select-arrivalAirport-panel')).toBeTruthy();
    expect(screen.getByTestId('searchable-select-arrivalAirport-search')).toBeTruthy();
  });

  it('displays a placeholder hint for the trigger button', () => {
    const field = makeField({
      id: 'arrivalAirport',
      label: 'Arrival Airport',
      type: 'searchable_select',
      optionsSource: 'airports',
    });

    render(
      <FormField
        field={field}
        onValueChange={mockOnValueChange}
      />,
    );

    // Default SearchableSelect placeholder contains the label
    expect(screen.getByText('Search Arrival Airport...')).toBeTruthy();
  });

  it('displays the selected airport label when a value is already set', () => {
    const field = makeField({
      id: 'arrivalAirport',
      label: 'Arrival Airport',
      type: 'searchable_select',
      optionsSource: 'airports',
      currentValue: 'KUL',
    });

    render(
      <FormField
        field={field}
        value="KUL"
        onValueChange={mockOnValueChange}
      />,
    );

    expect(screen.getByText('Kuala Lumpur KLIA (KUL)')).toBeTruthy();
  });

  it('shows required asterisk when field is required', () => {
    const field = makeField({
      id: 'arrivalAirport',
      label: 'Arrival Airport',
      type: 'searchable_select',
      optionsSource: 'airports',
      required: true,
    });

    render(
      <FormField
        field={field}
        onValueChange={mockOnValueChange}
      />,
    );

    expect(screen.getByText('*')).toBeTruthy();
  });

  it('renders an error message when error prop is provided', () => {
    const field = makeField({
      id: 'arrivalAirport',
      label: 'Arrival Airport',
      type: 'searchable_select',
      optionsSource: 'airports',
    });

    render(
      <FormField
        field={field}
        onValueChange={mockOnValueChange}
        error="Please select an airport"
      />,
    );

    // getAllByText because error may appear in both the FormField and SearchableSelect
    const errorTexts = screen.getAllByText('Please select an airport');
    expect(errorTexts.length).toBeGreaterThanOrEqual(1);
  });

  it('is disabled when the disabled prop is true', () => {
    const field = makeField({
      id: 'arrivalAirport',
      label: 'Arrival Airport',
      type: 'searchable_select',
      optionsSource: 'airports',
    });

    render(
      <FormField
        field={field}
        onValueChange={mockOnValueChange}
        disabled
      />,
    );

    const trigger = screen.getByTestId('searchable-select-arrivalAirport-trigger');
    // Pressing a disabled trigger should NOT open the panel
    fireEvent.press(trigger);
    expect(screen.queryByTestId('searchable-select-arrivalAirport-panel')).toBeNull();
  });

  it('shows help text when provided', () => {
    const field = makeField({
      id: 'arrivalAirport',
      label: 'Arrival Airport',
      type: 'searchable_select',
      optionsSource: 'airports',
      helpText: 'Search by airport name or IATA code',
    });

    render(
      <FormField
        field={field}
        onValueChange={mockOnValueChange}
      />,
    );

    expect(screen.getByText('Search by airport name or IATA code')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// FormField — country optionsSource still works (regression guard)
// ---------------------------------------------------------------------------

describe('FormField — country autocomplete (regression)', () => {
  it('still renders SearchableSelect for optionsSource: countries', () => {
    const field = makeField({
      id: 'nationality',
      label: 'Nationality',
      type: 'searchable_select',
      optionsSource: 'countries',
    });

    render(
      <FormField
        field={field}
        onValueChange={jest.fn()}
      />,
    );

    expect(screen.getByTestId('searchable-select-nationality-trigger')).toBeTruthy();
  });

  it('falls back to inline options when optionsSource is unrecognised', () => {
    const field = makeField({
      id: 'testSelect',
      label: 'Test',
      type: 'searchable_select',
      options: [{ value: 'foo', label: 'Foo' }],
      optionsSource: 'unknown_source',
    });

    render(
      <FormField
        field={field}
        value="foo"
        onValueChange={jest.fn()}
      />,
    );

    // "Foo" is in the inline options so the selected label should display
    expect(screen.getByText('Foo')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// FormField — airline autocomplete rendering
// ---------------------------------------------------------------------------

import { ALL_AIRLINES, filterAirlines, getAirlineByCode, getAirlineLabel } from '../../../src/constants/airlines';

describe('ALL_AIRLINES database', () => {
  it('contains at least 150 airlines', () => {
    expect(ALL_AIRLINES.length).toBeGreaterThan(150);
  });

  it('every entry has a non-empty value (IATA code) and label', () => {
    ALL_AIRLINES.forEach(airline => {
      expect(airline.value.trim()).not.toBe('');
      expect(airline.label.trim()).not.toBe('');
    });
  });

  it('IATA code appears inside the label so search-by-code works', () => {
    ALL_AIRLINES.forEach(airline => {
      expect(airline.label).toContain(`(${airline.value})`);
    });
  });

  it('has no duplicate IATA codes', () => {
    const codes = ALL_AIRLINES.map(a => a.value);
    const unique = new Set(codes);
    expect(unique.size).toBe(codes.length);
  });

  it('includes key airlines for supported destinations', () => {
    const codes = new Set(ALL_AIRLINES.map(a => a.value));
    // Japan
    expect(codes.has('NH')).toBe(true);
    expect(codes.has('JL')).toBe(true);
    // Malaysia
    expect(codes.has('MH')).toBe(true);
    expect(codes.has('AK')).toBe(true);
    // Singapore
    expect(codes.has('SQ')).toBe(true);
    expect(codes.has('TR')).toBe(true);
    // Global hubs
    expect(codes.has('EK')).toBe(true);
    expect(codes.has('QR')).toBe(true);
    expect(codes.has('QF')).toBe(true);
  });
});

describe('airline search logic', () => {
  it('returns all airlines when query is empty', () => {
    expect(filterAirlines('').length).toBe(ALL_AIRLINES.length);
  });

  it('finds Singapore Airlines by IATA code (SQ)', () => {
    const results = filterAirlines('SQ');
    expect(results.some(a => a.value === 'SQ')).toBe(true);
  });

  it('finds Singapore Airlines by lowercase code (sq)', () => {
    const results = filterAirlines('sq');
    expect(results.some(a => a.value === 'SQ')).toBe(true);
  });

  it('finds All Nippon Airways by name (nippon)', () => {
    const results = filterAirlines('nippon');
    expect(results.some(a => a.value === 'NH')).toBe(true);
  });

  it('finds Malaysia Airlines by name', () => {
    const results = filterAirlines('malaysia');
    expect(results.some(a => a.value === 'MH')).toBe(true);
  });

  it('finds Emirates by name', () => {
    const results = filterAirlines('emirates');
    expect(results.some(a => a.value === 'EK')).toBe(true);
  });

  it('returns empty array for a nonsense query', () => {
    expect(filterAirlines('XXXXXXXXXX').length).toBe(0);
  });
});

describe('getAirlineByCode', () => {
  it('returns the airline for a known IATA code', () => {
    const airline = getAirlineByCode('SQ');
    expect(airline).toBeDefined();
    expect(airline?.value).toBe('SQ');
    expect(airline?.label).toContain('Singapore');
    expect(airline?.label).toContain('SQ');
  });

  it('returns undefined for an unknown code', () => {
    expect(getAirlineByCode('ZZ')).toBeUndefined();
  });
});

describe('getAirlineLabel', () => {
  it('returns a human-readable label for a known code', () => {
    const label = getAirlineLabel('SQ');
    expect(label).toContain('Singapore');
    expect(label).toContain('SQ');
  });

  it('falls back to the raw code for an unknown IATA code', () => {
    expect(getAirlineLabel('ZZ')).toBe('ZZ');
  });
});

describe('FormField — airline autocomplete rendering', () => {
  const mockOnValueChange = jest.fn();

  beforeEach(() => {
    mockOnValueChange.mockClear();
  });

  it('renders a SearchableSelect when type is searchable_select + optionsSource airlines', () => {
    const field = makeField({
      id: 'airlineCode',
      label: 'Airline',
      type: 'searchable_select',
      optionsSource: 'airlines',
    });

    render(
      <FormField
        field={field}
        onValueChange={mockOnValueChange}
      />,
    );

    expect(screen.getByTestId('searchable-select-airlineCode-trigger')).toBeTruthy();
  });

  it('shows the field label in the form', () => {
    const field = makeField({
      id: 'airlineCode',
      label: 'Airline',
      type: 'searchable_select',
      optionsSource: 'airlines',
    });

    render(
      <FormField
        field={field}
        onValueChange={mockOnValueChange}
      />,
    );

    const matches = screen.getAllByText('Airline');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('opens the search panel when the trigger is pressed', () => {
    const field = makeField({
      id: 'airlineCode',
      label: 'Airline',
      type: 'searchable_select',
      optionsSource: 'airlines',
    });

    render(
      <FormField
        field={field}
        onValueChange={mockOnValueChange}
      />,
    );

    fireEvent.press(screen.getByTestId('searchable-select-airlineCode-trigger'));

    expect(screen.getByTestId('searchable-select-airlineCode-panel')).toBeTruthy();
    expect(screen.getByTestId('searchable-select-airlineCode-search')).toBeTruthy();
  });

  it('displays a placeholder hint for the trigger button', () => {
    const field = makeField({
      id: 'airlineCode',
      label: 'Airline',
      type: 'searchable_select',
      optionsSource: 'airlines',
    });

    render(
      <FormField
        field={field}
        onValueChange={mockOnValueChange}
      />,
    );

    expect(screen.getByText('Search Airline...')).toBeTruthy();
  });

  it('displays the selected airline label when a value is already set', () => {
    const field = makeField({
      id: 'airlineCode',
      label: 'Airline',
      type: 'searchable_select',
      optionsSource: 'airlines',
      currentValue: 'SQ',
    });

    render(
      <FormField
        field={field}
        value="SQ"
        onValueChange={mockOnValueChange}
      />,
    );

    expect(screen.getByText('Singapore Airlines (SQ)')).toBeTruthy();
  });

  it('shows help text when provided', () => {
    const field = makeField({
      id: 'airlineCode',
      label: 'Airline',
      type: 'searchable_select',
      optionsSource: 'airlines',
      helpText: 'Search by airline name or IATA code',
    });

    render(
      <FormField
        field={field}
        onValueChange={mockOnValueChange}
      />,
    );

    expect(screen.getByText('Search by airline name or IATA code')).toBeTruthy();
  });

  it('is disabled when the disabled prop is true', () => {
    const field = makeField({
      id: 'airlineCode',
      label: 'Airline',
      type: 'searchable_select',
      optionsSource: 'airlines',
    });

    render(
      <FormField
        field={field}
        onValueChange={mockOnValueChange}
        disabled
      />,
    );

    const trigger = screen.getByTestId('searchable-select-airlineCode-trigger');
    // Pressing a disabled trigger should NOT open the panel
    fireEvent.press(trigger);
    expect(screen.queryByTestId('searchable-select-airlineCode-panel')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// FormField — accommodation autocomplete (optionsSource: 'accommodations')
// ---------------------------------------------------------------------------

describe('FormField — accommodation autocomplete rendering', () => {
  const mockOnValueChange = jest.fn();

  beforeEach(() => {
    mockOnValueChange.mockClear();
  });

  it('renders AccommodationAutocomplete when type is searchable_select + optionsSource accommodations', () => {
    const field = makeField({
      id: 'hotelName',
      label: 'Hotel / Accommodation Name',
      type: 'searchable_select',
      optionsSource: 'accommodations',
    });

    render(
      <FormField
        field={field}
        onValueChange={mockOnValueChange}
      />,
    );

    // The AccommodationAutocomplete renders a text input (not a searchable-select trigger)
    expect(screen.getByTestId('accommodation-hotelName-input')).toBeTruthy();
  });

  it('renders the field label', () => {
    const field = makeField({
      id: 'hotelName',
      label: 'Hotel / Accommodation Name',
      type: 'searchable_select',
      optionsSource: 'accommodations',
    });

    render(
      <FormField
        field={field}
        onValueChange={mockOnValueChange}
      />,
    );

    // Label appears in the FormField header (and possibly in the Input label too)
    const matches = screen.getAllByText('Hotel / Accommodation Name');
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('shows the current value in the text input', () => {
    const field = makeField({
      id: 'hotelName',
      label: 'Hotel / Accommodation Name',
      type: 'searchable_select',
      optionsSource: 'accommodations',
      currentValue: 'Park Hyatt Tokyo',
    });

    render(
      <FormField
        field={field}
        value="Park Hyatt Tokyo"
        onValueChange={mockOnValueChange}
      />,
    );

    const input = screen.getByTestId('accommodation-hotelName-input');
    expect(input.props.value).toBe('Park Hyatt Tokyo');
  });

  it('calls onValueChange with the hotel name field id when text changes', () => {
    const field = makeField({
      id: 'hotelName',
      label: 'Hotel / Accommodation Name',
      type: 'searchable_select',
      optionsSource: 'accommodations',
    });

    render(
      <FormField
        field={field}
        onValueChange={mockOnValueChange}
      />,
    );

    const input = screen.getByTestId('accommodation-hotelName-input');
    fireEvent.changeText(input, 'Hilton');

    expect(mockOnValueChange).toHaveBeenCalledWith('hotelName', 'Hilton');
  });

  it('shows the required asterisk when field is required', () => {
    const field = makeField({
      id: 'hotelName',
      label: 'Hotel / Accommodation Name',
      type: 'searchable_select',
      optionsSource: 'accommodations',
      required: true,
    });

    render(
      <FormField
        field={field}
        onValueChange={mockOnValueChange}
      />,
    );

    expect(screen.getByText('*')).toBeTruthy();
  });

  it('renders an error message when error prop is provided', () => {
    const field = makeField({
      id: 'hotelName',
      label: 'Hotel / Accommodation Name',
      type: 'searchable_select',
      optionsSource: 'accommodations',
    });

    render(
      <FormField
        field={field}
        onValueChange={mockOnValueChange}
        error="Accommodation name is required"
      />,
    );

    // Error message may appear in both the Input component and the FormField error section
    const errorTexts = screen.getAllByText('Accommodation name is required');
    expect(errorTexts.length).toBeGreaterThanOrEqual(1);
  });

  it('renders a disabled input when the disabled prop is true', () => {
    const field = makeField({
      id: 'hotelName',
      label: 'Hotel / Accommodation Name',
      type: 'searchable_select',
      optionsSource: 'accommodations',
    });

    render(
      <FormField
        field={field}
        onValueChange={mockOnValueChange}
        disabled
      />,
    );

    const input = screen.getByTestId('accommodation-hotelName-input');
    // Disabled input is not editable
    expect(input.props.editable).toBe(false);
  });

  it('shows help text when provided', () => {
    const field = makeField({
      id: 'hotelName',
      label: 'Hotel / Accommodation Name',
      type: 'searchable_select',
      optionsSource: 'accommodations',
      helpText: 'Search for your hotel in Japan',
    });

    render(
      <FormField
        field={field}
        onValueChange={mockOnValueChange}
      />,
    );

    expect(screen.getByText('Search for your hotel in Japan')).toBeTruthy();
  });

  it('works with accommodationName field id (Singapore schema pattern)', () => {
    const field = makeField({
      id: 'accommodationName',
      label: 'Name of Accommodation',
      type: 'searchable_select',
      optionsSource: 'accommodations',
    });

    render(
      <FormField
        field={field}
        onValueChange={mockOnValueChange}
      />,
    );

    expect(screen.getByTestId('accommodation-accommodationName-input')).toBeTruthy();
  });

  it('calls onValueChange with the name field when typing (accommodationName pattern)', () => {
    const field = makeField({
      id: 'accommodationName',
      label: 'Name of Accommodation',
      type: 'searchable_select',
      optionsSource: 'accommodations',
    });

    render(
      <FormField
        field={field}
        onValueChange={mockOnValueChange}
      />,
    );

    const input = screen.getByTestId('accommodation-accommodationName-input');
    fireEvent.changeText(input, 'Marina Bay Sands');

    expect(mockOnValueChange).toHaveBeenCalledWith('accommodationName', 'Marina Bay Sands');
  });
});
