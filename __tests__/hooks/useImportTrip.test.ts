import { renderHook, act } from '@testing-library/react-native';

// Mock navigation
const mockReplace = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    replace: mockReplace,
  }),
}));

jest.mock('@/services/import/confirmationParser', () => ({
  parseConfirmationText: jest.fn(),
}));

jest.mock('@/services/import/tripAutoCreator', () => ({
  createTripFromParsedData: jest.fn(),
}));

import { useImportTrip } from '@/hooks/useImportTrip';
import { parseConfirmationText } from '@/services/import/confirmationParser';
import { createTripFromParsedData } from '@/services/import/tripAutoCreator';
import type { ParsedBoardingPass } from '@/types/boarding';

const mockParseConfirmationText = parseConfirmationText as jest.MockedFunction<typeof parseConfirmationText>;
const mockCreateTripFromParsedData = createTripFromParsedData as jest.MockedFunction<typeof createTripFromParsedData>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useImportTrip', () => {
  it('starts with paste mode and idle status', () => {
    const { result } = renderHook(() => useImportTrip());
    expect(result.current.mode).toBe('paste');
    expect(result.current.status).toBe('idle');
    expect(result.current.confirmationText).toBe('');
  });

  it('switches mode when setMode is called', () => {
    const { result } = renderHook(() => useImportTrip());
    act(() => result.current.setMode('scan'));
    expect(result.current.mode).toBe('scan');
  });

  it('does nothing when parsing empty text', () => {
    const { result } = renderHook(() => useImportTrip());
    act(() => result.current.handleParseConfirmation());
    expect(mockParseConfirmationText).not.toHaveBeenCalled();
  });

  it('shows error when no flights or hotels are parsed', () => {
    mockParseConfirmationText.mockReturnValue({
      flights: [],
      hotels: [],
      rawText: 'random text',
      confidence: 0,
    });

    const { result } = renderHook(() => useImportTrip());
    act(() => result.current.setConfirmationText('random text'));
    act(() => result.current.handleParseConfirmation());

    expect(result.current.status).toBe('error');
    expect(result.current.errorMessage).toContain('No flight or hotel');
  });

  it('navigates to ReviewImport on successful parse', () => {
    const mockTrip = {
      id: 'trip-abc',
      name: 'Tokyo Trip',
      status: 'upcoming' as const,
      legs: [{ id: 'leg-1', tripId: 'trip-abc', destinationCountry: 'JPN', arrivalDate: '2025-07-15', accommodation: { name: '', address: { line1: '', city: '', postalCode: '', country: '' } }, formStatus: 'not_started' as const, submissionStatus: 'not_started' as const, order: 0 }],
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    };

    mockParseConfirmationText.mockReturnValue({
      flights: [{ flightNumber: 'NH101', airlineCode: 'NH' }],
      hotels: [],
      rawText: 'NH101',
      confidence: 0.8,
    });
    mockCreateTripFromParsedData.mockReturnValue({ trip: mockTrip, confidence: 0.7 });

    const { result } = renderHook(() => useImportTrip());
    act(() => result.current.setConfirmationText('NH101 LAX NRT'));
    act(() => result.current.handleParseConfirmation());

    expect(mockReplace).toHaveBeenCalledWith('ReviewImport', {
      draftTripJson: expect.any(String),
    });
    expect(result.current.status).toBe('success');
  });

  it('shows error when createTripFromParsedData returns no legs', () => {
    mockParseConfirmationText.mockReturnValue({
      flights: [{ flightNumber: 'XX123', airlineCode: 'XX' }],
      hotels: [],
      rawText: 'XX123',
      confidence: 0.3,
    });
    mockCreateTripFromParsedData.mockReturnValue({
      trip: { id: 'x', name: 'x', status: 'upcoming', legs: [], createdAt: '', updatedAt: '' },
      confidence: 0,
    });

    const { result } = renderHook(() => useImportTrip());
    act(() => result.current.setConfirmationText('XX123'));
    act(() => result.current.handleParseConfirmation());

    expect(result.current.status).toBe('error');
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('navigates to ReviewImport on boarding pass scan', () => {
    const boardingPass: ParsedBoardingPass = {
      passengerName: 'DOE/JOHN',
      flightNumber: 'NH101',
      airlineCode: 'NH',
      departureAirport: 'LAX',
      arrivalAirport: 'NRT',
      flightDate: '2025-07-15',
      destinationCountry: 'JPN',
    };

    const mockTrip = {
      id: 'trip-bp',
      name: 'Tokyo Trip',
      status: 'upcoming' as const,
      legs: [{ id: 'leg-1', tripId: 'trip-bp', destinationCountry: 'JPN', arrivalDate: '2025-07-15', accommodation: { name: '', address: { line1: '', city: '', postalCode: '', country: '' } }, formStatus: 'not_started' as const, submissionStatus: 'not_started' as const, order: 0 }],
      createdAt: '',
      updatedAt: '',
    };
    mockCreateTripFromParsedData.mockReturnValue({ trip: mockTrip, confidence: 0.9 });

    const { result } = renderHook(() => useImportTrip());
    act(() => result.current.handleBoardingPassScanned(boardingPass));

    expect(mockCreateTripFromParsedData).toHaveBeenCalledWith(
      expect.objectContaining({
        flights: [expect.objectContaining({ flightNumber: 'NH101', destinationCountry: 'JPN' })],
      })
    );
    expect(mockReplace).toHaveBeenCalledWith('ReviewImport', expect.any(Object));
  });

  it('resets to idle on handleRetry', () => {
    mockParseConfirmationText.mockReturnValue({
      flights: [],
      hotels: [],
      rawText: 'bad',
      confidence: 0,
    });

    const { result } = renderHook(() => useImportTrip());
    act(() => result.current.setConfirmationText('bad'));
    act(() => result.current.handleParseConfirmation());
    expect(result.current.status).toBe('error');

    act(() => result.current.handleRetry());
    expect(result.current.status).toBe('idle');
    expect(result.current.errorMessage).toBe('');
  });

  it('switches to paste mode on handleScanCancel', () => {
    const { result } = renderHook(() => useImportTrip());
    act(() => result.current.setMode('scan'));
    expect(result.current.mode).toBe('scan');

    act(() => result.current.handleScanCancel());
    expect(result.current.mode).toBe('paste');
  });
});
