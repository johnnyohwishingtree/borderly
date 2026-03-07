/**
 * Unit tests for BCBP boarding pass parser service
 */

import {
  parseBoardingPass,
  parseMultiLegBoardingPass,
  createTripLegFromBoardingPass,
  isBoardingPassSupported,
  getUnsupportedDestinationMessage,
} from '../../../src/services/boarding/boardingPassParser';
import { ParsedBoardingPass } from '../../../src/types/boarding';

// Mock the bcbp package
jest.mock('bcbp', () => ({
  decode: jest.fn(),
}));

const mockDecode = require('bcbp').decode as jest.MockedFunction<any>;

describe('Boarding Pass Parser Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseBoardingPass', () => {
    const mockSingleLegData = {
      passengers: [{
        passengerName: 'DOE/JOHN',
        fromCity: 'LAX',
        toCity: 'NRT',
        operatingCarrierDesignator: 'JL',
        flightNumber: 'JL062',
        dateOfFlight: '123', // Julian day
        compartmentCode: 'Y',
        seatNumber: '12A',
        checkInSequenceNumber: '001',
        passengerStatus: '',
        airlineNumericCode: '131',
        documentFormSerialNumber: 'ABC123',
        selecteeIndicator: '',
        internationalDocumentationVerification: '',
        marketingCarrierDesignator: 'JL',
        frequentFlyerAirlineDesignator: '',
        frequentFlyerNumber: '',
        idAdIndicator: '',
        freeBaggageAllowance: '',
        fastTrack: '',
      }],
      formatCode: 'M',
      numberOfPassengers: 1,
    };

    it('should successfully parse a valid boarding pass to Japan', () => {
      mockDecode.mockReturnValue(mockSingleLegData);

      const result = parseBoardingPass('M1DOE/JOHN...', 2024);
      
      expect(result).toEqual({
        passengerName: 'DOE/JOHN',
        airlineCode: 'JL',
        flightNumber: 'JL062',
        departureAirport: 'LAX',
        arrivalAirport: 'NRT',
        flightDate: '2024-05-02', // Julian day 123 in 2024
        seatNumber: '12A',
        classOfService: 'Y',
        bookingReference: 'ABC123',
        destinationCountry: 'JPN',
      });
    });

    it('should successfully parse boarding pass to Malaysia', () => {
      const malaysiaData = {
        ...mockSingleLegData,
        passengers: [{
          ...mockSingleLegData.passengers[0],
          toCity: 'KUL',
          operatingCarrierDesignator: 'MH',
          flightNumber: 'MH0002',
        }],
      };
      
      mockDecode.mockReturnValue(malaysiaData);

      const result = parseBoardingPass('M1DOE/JOHN...', 2024);
      
      expect(result).toEqual(expect.objectContaining({
        arrivalAirport: 'KUL',
        destinationCountry: 'MYS',
        airlineCode: 'MH',
        flightNumber: 'MH0002',
      }));
    });

    it('should successfully parse boarding pass to Singapore', () => {
      const singaporeData = {
        ...mockSingleLegData,
        passengers: [{
          ...mockSingleLegData.passengers[0],
          toCity: 'SIN',
          operatingCarrierDesignator: 'SQ',
          flightNumber: 'SQ0012',
        }],
      };
      
      mockDecode.mockReturnValue(singaporeData);

      const result = parseBoardingPass('M1DOE/JOHN...', 2024);
      
      expect(result).toEqual(expect.objectContaining({
        arrivalAirport: 'SIN',
        destinationCountry: 'SGP',
        airlineCode: 'SQ',
        flightNumber: 'SQ0012',
      }));
    });

    it('should handle boarding pass to unsupported destination', () => {
      const unsupportedData = {
        ...mockSingleLegData,
        passengers: [{
          ...mockSingleLegData.passengers[0],
          toCity: 'ICN', // Korea - not supported
          operatingCarrierDesignator: 'KE',
          flightNumber: 'KE0001',
        }],
      };
      
      mockDecode.mockReturnValue(unsupportedData);

      const result = parseBoardingPass('M1DOE/JOHN...', 2024);
      
      // Should still parse but with warning logged
      expect(result).toEqual(expect.objectContaining({
        arrivalAirport: 'ICN',
        destinationCountry: 'KOR',
        airlineCode: 'KE',
        flightNumber: 'KE0001',
      }));
    });

    it('should handle unknown destination airport', () => {
      const unknownAirportData = {
        ...mockSingleLegData,
        passengers: [{
          ...mockSingleLegData.passengers[0],
          toCity: 'XXX', // Unknown airport
        }],
      };
      
      mockDecode.mockReturnValue(unknownAirportData);

      const result = parseBoardingPass('M1DOE/JOHN...', 2024);
      
      expect(result).toEqual(expect.objectContaining({
        arrivalAirport: 'XXX',
        destinationCountry: undefined,
      }));
    });

    it('should use marketing carrier when operating carrier is missing', () => {
      const noOperatingCarrierData = {
        ...mockSingleLegData,
        passengers: [{
          ...mockSingleLegData.passengers[0],
          operatingCarrierDesignator: '',
          marketingCarrierDesignator: 'JL',
        }],
      };
      
      mockDecode.mockReturnValue(noOperatingCarrierData);

      const result = parseBoardingPass('M1DOE/JOHN...', 2024);
      
      expect(result).toEqual(expect.objectContaining({
        airlineCode: 'JL',
      }));
    });

    it('should use current year when reference year is not provided', () => {
      mockDecode.mockReturnValue(mockSingleLegData);
      const currentYear = new Date().getFullYear();

      parseBoardingPass('M1DOE/JOHN...');
      
      expect(mockDecode).toHaveBeenCalledWith('M1DOE/JOHN...', currentYear);
    });

    it('should return error for empty passenger data', () => {
      mockDecode.mockReturnValue({
        passengers: [],
        formatCode: 'M',
        numberOfPassengers: 0,
      });

      const result = parseBoardingPass('M1DOE/JOHN...');
      
      expect(result).toEqual({
        code: 'MISSING_FIELDS',
        message: 'No passenger data found in boarding pass',
        originalData: 'M1DOE/JOHN...',
      });
    });

    it('should return error for missing required fields', () => {
      const incompleteData = {
        passengers: [{
          passengerName: 'DOE/JOHN',
          fromCity: '', // Missing
          toCity: 'NRT',
          flightNumber: 'JL062',
          dateOfFlight: '123',
        }],
        formatCode: 'M',
        numberOfPassengers: 1,
      };
      
      mockDecode.mockReturnValue(incompleteData);

      const result = parseBoardingPass('M1DOE/JOHN...');
      
      expect(result).toEqual({
        code: 'MISSING_FIELDS',
        message: 'Missing required flight information (departure/arrival airports or flight number)',
        originalData: 'M1DOE/JOHN...',
      });
    });

    it('should return error for missing airline code', () => {
      const noAirlineData = {
        passengers: [{
          passengerName: 'DOE/JOHN',
          fromCity: 'LAX',
          toCity: 'NRT',
          operatingCarrierDesignator: '',
          marketingCarrierDesignator: '',
          flightNumber: 'JL062',
          dateOfFlight: '123',
        }],
        formatCode: 'M',
        numberOfPassengers: 1,
      };
      
      mockDecode.mockReturnValue(noAirlineData);

      const result = parseBoardingPass('M1DOE/JOHN...');
      
      expect(result).toEqual({
        code: 'MISSING_FIELDS',
        message: 'Missing airline code in boarding pass',
        originalData: 'M1DOE/JOHN...',
      });
    });

    it('should return error for invalid Julian date', () => {
      const invalidDateData = {
        ...mockSingleLegData,
        passengers: [{
          ...mockSingleLegData.passengers[0],
          dateOfFlight: '999', // Invalid Julian day
        }],
      };
      
      mockDecode.mockReturnValue(invalidDateData);

      const result = parseBoardingPass('M1DOE/JOHN...', 2024);
      
      expect(result).toEqual({
        code: 'PARSE_ERROR',
        message: 'Invalid flight date format: 999',
        originalData: 'M1DOE/JOHN...',
      });
    });

    it('should return error when bcbp.decode throws', () => {
      mockDecode.mockImplementation(() => {
        throw new Error('Invalid barcode format');
      });

      const result = parseBoardingPass('INVALID_BARCODE');
      
      expect(result).toEqual({
        code: 'PARSE_ERROR',
        message: 'Failed to parse boarding pass: Invalid barcode format',
        originalData: 'INVALID_BARCODE',
      });
    });
  });

  describe('parseMultiLegBoardingPass', () => {
    const mockMultiLegData = {
      passengers: [
        {
          passengerName: 'DOE/JOHN',
          fromCity: 'LAX',
          toCity: 'ICN',
          operatingCarrierDesignator: 'KE',
          flightNumber: 'KE0017',
          dateOfFlight: '123',
          compartmentCode: 'Y',
          seatNumber: '12A',
        },
        {
          passengerName: 'DOE/JOHN',
          fromCity: 'ICN',
          toCity: 'NRT',
          operatingCarrierDesignator: 'JL',
          flightNumber: 'JL0958',
          dateOfFlight: '124',
          compartmentCode: 'Y',
          seatNumber: '14C',
        },
      ],
      formatCode: 'M',
      numberOfPassengers: 2,
    };

    it('should parse multi-leg boarding pass successfully', () => {
      mockDecode.mockReturnValue(mockMultiLegData);

      const result = parseMultiLegBoardingPass('M2DOE/JOHN...', 2024);
      
      expect(result).toEqual({
        legs: [
          expect.objectContaining({
            departureAirport: 'LAX',
            arrivalAirport: 'ICN',
            flightNumber: 'KE0017',
            airlineCode: 'KE',
            destinationCountry: 'KOR',
          }),
          expect.objectContaining({
            departureAirport: 'ICN',
            arrivalAirport: 'NRT',
            flightNumber: 'JL0958',
            airlineCode: 'JL',
            destinationCountry: 'JPN',
          }),
        ],
        totalLegs: 2,
        passengerName: 'DOE/JOHN',
      });
    });

    it('should skip legs with missing data', () => {
      const dataWithBadLeg = {
        passengers: [
          mockMultiLegData.passengers[0],
          {
            ...mockMultiLegData.passengers[1],
            fromCity: '', // Missing departure
          },
        ],
        formatCode: 'M',
        numberOfPassengers: 2,
      };
      
      mockDecode.mockReturnValue(dataWithBadLeg);

      const result = parseMultiLegBoardingPass('M2DOE/JOHN...', 2024);
      
      expect(result).toEqual({
        legs: [
          expect.objectContaining({
            departureAirport: 'LAX',
            arrivalAirport: 'ICN',
          }),
        ],
        totalLegs: 1,
        passengerName: 'DOE/JOHN',
      });
    });

    it('should return error when no valid legs found', () => {
      const noValidLegsData = {
        passengers: [
          {
            passengerName: 'DOE/JOHN',
            fromCity: '', // Missing
            toCity: 'NRT',
            flightNumber: 'JL062',
          },
        ],
        formatCode: 'M',
        numberOfPassengers: 1,
      };
      
      mockDecode.mockReturnValue(noValidLegsData);

      const result = parseMultiLegBoardingPass('M1DOE/JOHN...');
      
      expect(result).toEqual({
        code: 'MISSING_FIELDS',
        message: 'No valid flight legs found in boarding pass',
        originalData: 'M1DOE/JOHN...',
      });
    });
  });

  describe('createTripLegFromBoardingPass', () => {
    const mockParsedPass: ParsedBoardingPass = {
      passengerName: 'DOE/JOHN',
      airlineCode: 'JL',
      flightNumber: 'JL062',
      departureAirport: 'LAX',
      arrivalAirport: 'NRT',
      flightDate: '2024-05-02',
      seatNumber: '12A',
      classOfService: 'Y',
      bookingReference: 'ABC123',
      destinationCountry: 'JPN',
    };

    it('should create trip leg data from parsed boarding pass', () => {
      const tripLeg = createTripLegFromBoardingPass(mockParsedPass, 'trip-123', 1);
      
      expect(tripLeg).toEqual({
        tripId: 'trip-123',
        destinationCountry: 'JPN',
        arrivalDate: '2024-05-02',
        flightNumber: 'JL062',
        airlineCode: 'JL',
        arrivalAirport: 'NRT',
        formStatus: 'not_started',
        order: 1,
      });
    });

    it('should handle missing destination country', () => {
      const passWithoutCountry = {
        ...mockParsedPass,
        destinationCountry: undefined,
      };
      
      const tripLeg = createTripLegFromBoardingPass(passWithoutCountry, 'trip-123', 0);
      
      expect(tripLeg.destinationCountry).toBe('');
    });
  });

  describe('isBoardingPassSupported', () => {
    it('should return true for supported destinations', () => {
      const japanPass: ParsedBoardingPass = {
        passengerName: 'DOE/JOHN',
        airlineCode: 'JL',
        flightNumber: 'JL062',
        departureAirport: 'LAX',
        arrivalAirport: 'NRT',
        flightDate: '2024-05-02',
        destinationCountry: 'JPN',
      };

      expect(isBoardingPassSupported(japanPass)).toBe(true);
    });

    it('should return false for unsupported destinations', () => {
      const koreaPass: ParsedBoardingPass = {
        passengerName: 'DOE/JOHN',
        airlineCode: 'KE',
        flightNumber: 'KE001',
        departureAirport: 'LAX',
        arrivalAirport: 'ICN',
        flightDate: '2024-05-02',
        destinationCountry: 'KOR',
      };

      expect(isBoardingPassSupported(koreaPass)).toBe(false);
    });

    it('should return false when destination country is missing', () => {
      const unknownPass: ParsedBoardingPass = {
        passengerName: 'DOE/JOHN',
        airlineCode: 'XX',
        flightNumber: 'XX001',
        departureAirport: 'LAX',
        arrivalAirport: 'XXX',
        flightDate: '2024-05-02',
        destinationCountry: undefined,
      };

      expect(isBoardingPassSupported(unknownPass)).toBe(false);
    });
  });

  describe('getUnsupportedDestinationMessage', () => {
    it('should return airport not found message when country is missing', () => {
      const unknownPass: ParsedBoardingPass = {
        passengerName: 'DOE/JOHN',
        airlineCode: 'XX',
        flightNumber: 'XX001',
        departureAirport: 'LAX',
        arrivalAirport: 'XXX',
        flightDate: '2024-05-02',
        destinationCountry: undefined,
      };

      const message = getUnsupportedDestinationMessage(unknownPass);
      expect(message).toBe('Airport XXX is not in our database. Please check the airport code.');
    });

    it('should return unsupported country message', () => {
      const koreaPass: ParsedBoardingPass = {
        passengerName: 'DOE/JOHN',
        airlineCode: 'KE',
        flightNumber: 'KE001',
        departureAirport: 'LAX',
        arrivalAirport: 'ICN',
        flightDate: '2024-05-02',
        destinationCountry: 'KOR',
      };

      const message = getUnsupportedDestinationMessage(koreaPass);
      expect(message).toBe('KOR is not yet supported. Currently supported countries: Japan, Malaysia, Singapore.');
    });
  });
});