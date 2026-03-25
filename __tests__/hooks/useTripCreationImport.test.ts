import { renderHook, act } from '@testing-library/react-native';
import { Alert } from 'react-native';

jest.mock('@/services/boarding/boardingPassParser', () => ({
  isBoardingPassSupported: jest.fn().mockReturnValue(true),
  getUnsupportedDestinationMessage: jest.fn().mockReturnValue('Not supported yet'),
}));

jest.mock('@/constants/countries', () => ({
  getCountryName: (code: string) => {
    const names: Record<string, string> = { JPN: 'Japan', SGP: 'Singapore', MYS: 'Malaysia' };
    return names[code] || code;
  },
}));

import { useTripCreationImport } from '@/hooks/useTripCreationImport';
import { isBoardingPassSupported } from '@/services/boarding/boardingPassParser';
import type { ParsedBoardingPass } from '@/types/boarding';
import type { SmartImportResult } from '@/components/import';
import type { LegFormData, TripFormData } from '@/hooks/useTripCreationTypes';

const makeBoardingPass = (overrides: Partial<ParsedBoardingPass> = {}): ParsedBoardingPass => ({
  passengerName: 'DOE/JOHN',
  flightNumber: 'NH123',
  flightDate: '2026-04-01',
  airlineCode: 'NH',
  departureAirport: 'NRT',
  arrivalAirport: 'SIN',
  destinationCountry: 'SGP',
  seatNumber: '12A',
  bookingReference: 'ABC123',
  ...overrides,
});

const makeSmartImportResult = (overrides: Partial<SmartImportResult> = {}): SmartImportResult => ({
  flights: [
    {
      flightNumber: 'JL456',
      airlineCode: 'JL',
      flightDate: '2026-05-10',
      arrivalAirport: 'NRT',
      destinationCountry: 'JPN',
      departureAirport: 'LAX',
    },
  ],
  hotels: [],
  ...overrides,
});

function createMockOptions(overrides: Partial<{
  legs: LegFormData[];
  tripData: TripFormData;
}> = {}) {
  const setLegs = jest.fn((updater) => {
    if (typeof updater === 'function') updater([]);
  });
  const setTripData = jest.fn((updater) => {
    if (typeof updater === 'function') updater({ name: '', status: 'upcoming' as const });
  });
  return {
    legs: overrides.legs ?? [],
    tripData: overrides.tripData ?? { name: '', status: 'upcoming' as const },
    setLegs,
    setTripData,
    getDefaultTravelers: jest.fn(() => ['traveler_1']),
    addLeg: jest.fn(),
  };
}

describe('useTripCreationImport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isBoardingPassSupported as jest.Mock).mockReturnValue(true);
  });

  describe('initial state', () => {
    it('starts with scanner and smart import hidden', () => {
      const opts = createMockOptions();
      const { result } = renderHook(() => useTripCreationImport(opts));

      expect(result.current.showScanner).toBe(false);
      expect(result.current.showSmartImport).toBe(false);
    });
  });

  describe('handleScanSuccess', () => {
    it('adds a leg from a supported boarding pass', () => {
      const opts = createMockOptions();
      const { result } = renderHook(() => useTripCreationImport(opts));

      act(() => {
        result.current.handleScanSuccess(makeBoardingPass());
      });

      expect(opts.setLegs).toHaveBeenCalled();
      // The updater should add a leg with the boarding pass data
      const updater = opts.setLegs.mock.calls[0][0];
      const newLegs = updater([]);
      expect(newLegs).toHaveLength(1);
      expect(newLegs[0].destinationCountry).toBe('SGP');
      expect(newLegs[0].flightNumber).toBe('NH123');
      expect(newLegs[0].arrivalAirport).toBe('SIN');
      expect(newLegs[0].assignedTravelers).toEqual(['traveler_1']);
    });

    it('auto-fills fields are marked on scanned leg', () => {
      const opts = createMockOptions();
      const { result } = renderHook(() => useTripCreationImport(opts));

      act(() => {
        result.current.handleScanSuccess(makeBoardingPass());
      });

      const updater = opts.setLegs.mock.calls[0][0];
      const newLegs = updater([]);
      expect(newLegs[0].autoFilledFields).toEqual({
        destinationCountry: 'auto',
        arrivalDate: 'auto',
        flightNumber: 'auto',
        airlineCode: 'auto',
        arrivalAirport: 'auto',
      });
    });

    it('suggests trip name when first leg is scanned and trip has no name', () => {
      const opts = createMockOptions();
      const { result } = renderHook(() => useTripCreationImport(opts));

      act(() => {
        result.current.handleScanSuccess(makeBoardingPass({ destinationCountry: 'JPN' }));
      });

      expect(opts.setTripData).toHaveBeenCalled();
      const updater = opts.setTripData.mock.calls[0][0];
      const updated = updater({ name: '', status: 'upcoming' });
      expect(updated.name).toBe('Trip to Japan');
    });

    it('does not overwrite existing trip name', () => {
      const opts = createMockOptions({ tripData: { name: 'My Trip', status: 'upcoming' } });
      const { result } = renderHook(() => useTripCreationImport(opts));

      act(() => {
        result.current.handleScanSuccess(makeBoardingPass());
      });

      expect(opts.setTripData).not.toHaveBeenCalled();
    });

    it('shows alert for unsupported destination', () => {
      (isBoardingPassSupported as jest.Mock).mockReturnValue(false);
      jest.spyOn(Alert, 'alert');

      const opts = createMockOptions();
      const { result } = renderHook(() => useTripCreationImport(opts));

      act(() => {
        result.current.handleScanSuccess(makeBoardingPass());
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Destination Not Supported',
        expect.stringContaining('You can still add this destination manually'),
        expect.any(Array),
      );
      // Should NOT add a leg
      expect(opts.setLegs).not.toHaveBeenCalled();
    });

    it('hides scanner after scan', () => {
      const opts = createMockOptions();
      const { result } = renderHook(() => useTripCreationImport(opts));

      act(() => {
        result.current.setShowScanner(true);
      });

      expect(result.current.showScanner).toBe(true);

      act(() => {
        result.current.handleScanSuccess(makeBoardingPass());
      });

      expect(result.current.showScanner).toBe(false);
    });
  });

  describe('handleSmartImport', () => {
    it('adds legs from flight data', () => {
      const opts = createMockOptions();
      const { result } = renderHook(() => useTripCreationImport(opts));

      act(() => {
        result.current.handleSmartImport(makeSmartImportResult());
      });

      expect(opts.setLegs).toHaveBeenCalled();
      const updater = opts.setLegs.mock.calls[0][0];
      const newLegs = updater([]);
      expect(newLegs).toHaveLength(1);
      expect(newLegs[0].destinationCountry).toBe('JPN');
      expect(newLegs[0].flightNumber).toBe('JL456');
    });

    it('creates leg from hotel-only import', () => {
      const opts = createMockOptions();
      const { result } = renderHook(() => useTripCreationImport(opts));

      act(() => {
        result.current.handleSmartImport(makeSmartImportResult({
          flights: [],
          hotels: [{
            name: 'Park Hyatt',
            address: '3-7-1-2 Nishi Shinjuku',
            city: 'Tokyo',
            checkInDate: '2026-05-10',
            checkOutDate: '2026-05-14',
            phone: '+81-3-5322-1234',
            postalCode: '163-1055',
          }],
        }));
      });

      const updater = opts.setLegs.mock.calls[0][0];
      const newLegs = updater([]);
      expect(newLegs).toHaveLength(1);
      expect(newLegs[0].accommodation.name).toBe('Park Hyatt');
      expect(newLegs[0].arrivalDate).toBe('2026-05-10');
      expect(newLegs[0].departureDate).toBe('2026-05-14');
    });

    it('attaches hotel to first flight leg', () => {
      const opts = createMockOptions();
      const { result } = renderHook(() => useTripCreationImport(opts));

      act(() => {
        result.current.handleSmartImport(makeSmartImportResult({
          hotels: [{
            name: 'Hilton Tokyo',
            address: '6-6-2 Nishi-Shinjuku',
            city: 'Tokyo',
            checkInDate: '2026-05-10',
            checkOutDate: '2026-05-13',
            phone: '+81-3-3344-5588',
            postalCode: '160-0023',
          }],
        }));
      });

      const updater = opts.setLegs.mock.calls[0][0];
      const newLegs = updater([]);
      expect(newLegs[0].accommodation.name).toBe('Hilton Tokyo');
      expect(newLegs[0].departureDate).toBe('2026-05-13');
    });

    it('hides smart import modal after import', () => {
      const opts = createMockOptions();
      const { result } = renderHook(() => useTripCreationImport(opts));

      act(() => {
        result.current.setShowSmartImport(true);
      });

      expect(result.current.showSmartImport).toBe(true);

      act(() => {
        result.current.handleSmartImport(makeSmartImportResult());
      });

      expect(result.current.showSmartImport).toBe(false);
    });

    it('does nothing when import has no flights or hotels', () => {
      const opts = createMockOptions();
      const { result } = renderHook(() => useTripCreationImport(opts));

      act(() => {
        result.current.handleSmartImport({ flights: [], hotels: [] });
      });

      expect(opts.setLegs).not.toHaveBeenCalled();
    });
  });

  describe('handleScanCancel', () => {
    it('hides the scanner', () => {
      const opts = createMockOptions();
      const { result } = renderHook(() => useTripCreationImport(opts));

      act(() => {
        result.current.setShowScanner(true);
      });

      act(() => {
        result.current.handleScanCancel();
      });

      expect(result.current.showScanner).toBe(false);
    });
  });

  describe('handleManualEntry', () => {
    it('hides scanner and calls addLeg', () => {
      const opts = createMockOptions();
      const { result } = renderHook(() => useTripCreationImport(opts));

      act(() => {
        result.current.setShowScanner(true);
      });

      act(() => {
        result.current.handleManualEntry();
      });

      expect(result.current.showScanner).toBe(false);
      expect(opts.addLeg).toHaveBeenCalled();
    });
  });
});
