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
      data: {
        passengerName: 'DOE/JOHN',
        legs: [{
          passengerName: 'DOE/JOHN',
          departureAirport: 'LAX',
          arrivalAirport: 'NRT',
          operatingCarrierDesignator: 'JL',
          flightNumber: 'JL062',
          flightDate: '2024-05-02T00:00:00.000Z',
          compartmentCode: 'Y',
          seatNumber: '12A',
          checkInSequenceNumber: '001',
          passengerStatus: '',
          // Legacy fields for compatibility
          fromCity: 'LAX',
          toCity: 'NRT',
          dateOfFlight: '123', // Julian day
          airlineNumericCode: '131',
          documentFormSerialNumber: 'ABC123',
          marketingCarrierDesignator: 'JL',
        }]
      },
      meta: {
        formatCode: 'M',
        numberOfLegs: 1,
      },
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
        data: {
          ...mockSingleLegData.data,
          legs: [{
            ...mockSingleLegData.data.legs[0],
            toCity: 'KUL',
            operatingCarrierDesignator: 'MH',
            flightNumber: 'MH0002',
          }],
        },
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
        data: {
          ...mockSingleLegData.data,
          legs: [{
            ...mockSingleLegData.data.legs[0],
            toCity: 'SIN',
            operatingCarrierDesignator: 'SQ',
            flightNumber: 'SQ0012',
          }],
        },
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
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const unsupportedData = {
        ...mockSingleLegData,
        data: {
          ...mockSingleLegData.data,
          legs: [{
            ...mockSingleLegData.data.legs[0],
            toCity: 'ICN', // Korea - not supported
            operatingCarrierDesignator: 'KE',
            flightNumber: 'KE0001',
          }],
        },
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

      expect(consoleWarnSpy).toHaveBeenCalledWith('Destination airport ICN (KOR) is not in supported countries');
      consoleWarnSpy.mockRestore();
    });

    it('should handle unknown destination airport', () => {
      const unknownAirportData = {
        ...mockSingleLegData,
        data: {
          ...mockSingleLegData.data,
          legs: [{
            ...mockSingleLegData.data.legs[0],
            toCity: 'XXX', // Unknown airport
          }],
        },
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
        data: {
          ...mockSingleLegData.data,
          legs: [{
            ...mockSingleLegData.data.legs[0],
            operatingCarrierDesignator: '',
            marketingCarrierDesignator: 'JL',
          }],
        },
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
        data: {
          passengerName: '',
          legs: [],
        },
        meta: {
          formatCode: 'M',
          numberOfLegs: 0,
        },
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
        data: {
          passengerName: 'DOE/JOHN',
          legs: [{
            passengerName: 'DOE/JOHN',
            fromCity: '', // Missing
            toCity: 'NRT',
            flightNumber: 'JL062',
            dateOfFlight: '123',
          }],
        },
        meta: {
          formatCode: 'M',
          numberOfLegs: 1,
        },
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
        data: {
          passengerName: 'DOE/JOHN',
          legs: [{
            passengerName: 'DOE/JOHN',
            fromCity: 'LAX',
            toCity: 'NRT',
            operatingCarrierDesignator: '',
            marketingCarrierDesignator: '',
            flightNumber: 'JL062',
            dateOfFlight: '123',
          }],
        },
        meta: {
          formatCode: 'M',
          numberOfLegs: 1,
        },
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
        data: {
          ...mockSingleLegData.data,
          legs: [{
            ...mockSingleLegData.data.legs[0],
            flightDate: undefined, // Remove ISO date
            dateOfFlight: '999', // Invalid Julian day
          }],
        },
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
      data: {
        passengerName: 'DOE/JOHN',
        legs: [
          {
            passengerName: 'DOE/JOHN',
            departureAirport: 'LAX',
            arrivalAirport: 'ICN',
            operatingCarrierDesignator: 'KE',
            flightNumber: 'KE0017',
            flightDate: '2024-05-02T00:00:00.000Z',
            compartmentCode: 'Y',
            seatNumber: '12A',
            // Legacy fields for compatibility
            fromCity: 'LAX',
            toCity: 'ICN',
            dateOfFlight: '123',
          },
          {
            passengerName: 'DOE/JOHN',
            departureAirport: 'ICN',
            arrivalAirport: 'NRT',
            operatingCarrierDesignator: 'JL',
            flightNumber: 'JL0958',
            flightDate: '2024-05-03T00:00:00.000Z',
            compartmentCode: 'Y',
            seatNumber: '14C',
            // Legacy fields for compatibility
            fromCity: 'ICN',
            toCity: 'NRT',
            dateOfFlight: '124',
          },
        ],
      },
      meta: {
        formatCode: 'M',
        numberOfLegs: 2,
      },
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
        data: {
          passengerName: 'DOE/JOHN',
          legs: [
            mockMultiLegData.data.legs[0],
            {
              ...mockMultiLegData.data.legs[1],
              departureAirport: '', // Missing departure  
              fromCity: '', // Missing departure
            },
          ],
        },
        meta: {
          formatCode: 'M',
          numberOfLegs: 2,
        },
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
        data: {
          passengerName: 'DOE/JOHN',
          legs: [
            {
              passengerName: 'DOE/JOHN',
              departureAirport: '', // Missing
              arrivalAirport: 'NRT',
              fromCity: '', // Missing
              toCity: 'NRT',
              flightNumber: 'JL062',
            },
          ],
        },
        meta: {
          formatCode: 'M',
          numberOfLegs: 1,
        },
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
      expect(message).toContain('KOR is not yet supported');
      expect(message).toContain('Currently supported countries:');
    });
  });
});