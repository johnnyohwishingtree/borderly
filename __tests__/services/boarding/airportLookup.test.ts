/**
 * Unit tests for airport lookup service
 */

import {
  lookupAirport,
  getCountryFromAirport,
  isSupportedDestination,
  getAirportsByCountry,
  getSupportedDestinationAirports,
  AIRPORT_DATABASE,
  SUPPORTED_COUNTRIES,
} from '../../../src/services/boarding/airportLookup';

describe('Airport Lookup Service', () => {
  describe('lookupAirport', () => {
    it('should return airport info for valid IATA codes', () => {
      const airport = lookupAirport('NRT');
      expect(airport).toEqual({
        code: 'NRT',
        name: 'Narita International Airport',
        city: 'Tokyo',
        country: 'JPN',
      });
    });

    it('should handle lowercase airport codes', () => {
      const airport = lookupAirport('sin');
      expect(airport).toEqual({
        code: 'SIN',
        name: 'Singapore Changi Airport',
        city: 'Singapore',
        country: 'SGP',
      });
    });

    it('should return null for unknown airport codes', () => {
      const airport = lookupAirport('XXX');
      expect(airport).toBeNull();
    });

    it('should return null for empty strings', () => {
      const airport = lookupAirport('');
      expect(airport).toBeNull();
    });
  });

  describe('getCountryFromAirport', () => {
    it('should return correct country code for supported destination airports', () => {
      expect(getCountryFromAirport('NRT')).toBe('JPN');
      expect(getCountryFromAirport('KUL')).toBe('MYS');
      expect(getCountryFromAirport('SIN')).toBe('SGP');
    });

    it('should return correct country code for departure airports', () => {
      expect(getCountryFromAirport('LAX')).toBe('USA');
      expect(getCountryFromAirport('LHR')).toBe('GBR');
      expect(getCountryFromAirport('ICN')).toBe('KOR');
    });

    it('should return null for unknown airports', () => {
      expect(getCountryFromAirport('XXX')).toBeNull();
    });

    it('should handle lowercase input', () => {
      expect(getCountryFromAirport('nrt')).toBe('JPN');
    });
  });

  describe('isSupportedDestination', () => {
    it('should return true for supported destination countries', () => {
      expect(isSupportedDestination('NRT')).toBe(true); // Japan
      expect(isSupportedDestination('HND')).toBe(true); // Japan
      expect(isSupportedDestination('KUL')).toBe(true); // Malaysia
      expect(isSupportedDestination('PEN')).toBe(true); // Malaysia
      expect(isSupportedDestination('SIN')).toBe(true); // Singapore
    });

    it('should return true for newly added supported countries', () => {
      expect(isSupportedDestination('LAX')).toBe(true); // USA
      expect(isSupportedDestination('LHR')).toBe(true); // UK
    });

    it('should return false for unsupported countries', () => {
      expect(isSupportedDestination('CDG')).toBe(false); // France - not a supported destination
    });

    it('should return false for unknown airports', () => {
      expect(isSupportedDestination('XXX')).toBe(false);
    });

    it('should handle lowercase input', () => {
      expect(isSupportedDestination('nrt')).toBe(true);
    });
  });

  describe('getAirportsByCountry', () => {
    it('should return all Japanese airports', () => {
      const japanAirports = getAirportsByCountry('JPN');
      expect(japanAirports).toHaveLength(6);
      
      const codes = japanAirports.map(a => a.code);
      expect(codes).toContain('NRT');
      expect(codes).toContain('HND');
      expect(codes).toContain('KIX');
      expect(codes).toContain('FUK');
      expect(codes).toContain('CTS');
      expect(codes).toContain('ITM');
    });

    it('should return all Malaysian airports', () => {
      const malaysiaAirports = getAirportsByCountry('MYS');
      expect(malaysiaAirports).toHaveLength(5);
      
      const codes = malaysiaAirports.map(a => a.code);
      expect(codes).toContain('KUL');
      expect(codes).toContain('PEN');
      expect(codes).toContain('BKI');
      expect(codes).toContain('KCH');
      expect(codes).toContain('LGK');
    });

    it('should return Singapore airport', () => {
      const singaporeAirports = getAirportsByCountry('SGP');
      expect(singaporeAirports).toHaveLength(1);
      expect(singaporeAirports[0].code).toBe('SIN');
    });

    it('should return empty array for countries with no airports', () => {
      const airports = getAirportsByCountry('ZZZ');
      expect(airports).toHaveLength(0);
    });

    it('should return US airports', () => {
      const usAirports = getAirportsByCountry('USA');
      expect(usAirports.length).toBeGreaterThan(0);
      
      const codes = usAirports.map(a => a.code);
      expect(codes).toContain('LAX');
      expect(codes).toContain('SFO');
      expect(codes).toContain('JFK');
    });
  });

  describe('getSupportedDestinationAirports', () => {
    it('should return airports from all supported countries', () => {
      const supportedAirports = getSupportedDestinationAirports();

      // Should include airports from all 8 supported countries
      const japanCount = supportedAirports.filter(a => a.country === 'JPN').length;
      const malaysiaCount = supportedAirports.filter(a => a.country === 'MYS').length;
      const singaporeCount = supportedAirports.filter(a => a.country === 'SGP').length;

      expect(japanCount).toBe(6);
      expect(malaysiaCount).toBe(5);
      expect(singaporeCount).toBe(1);

      // All supported airports should be from supported countries
      const supportedCountrySet = new Set(SUPPORTED_COUNTRIES);
      for (const airport of supportedAirports) {
        expect(supportedCountrySet.has(airport.country)).toBe(true);
      }
    });

    it('should not include airports from unsupported countries', () => {
      const supportedAirports = getSupportedDestinationAirports();
      const codes = supportedAirports.map(a => a.code);

      // France is not a supported destination
      expect(codes).not.toContain('CDG');
    });
  });

  describe('Airport Database Validation', () => {
    it('should have all required supported destination airports', () => {
      // Japan airports
      expect(AIRPORT_DATABASE.NRT).toMatchObject({ code: 'NRT', country: 'JPN' });
      expect(AIRPORT_DATABASE.HND).toMatchObject({ code: 'HND', country: 'JPN' });
      expect(AIRPORT_DATABASE.KIX).toMatchObject({ code: 'KIX', country: 'JPN' });
      expect(AIRPORT_DATABASE.FUK).toMatchObject({ code: 'FUK', country: 'JPN' });
      expect(AIRPORT_DATABASE.CTS).toMatchObject({ code: 'CTS', country: 'JPN' });
      expect(AIRPORT_DATABASE.ITM).toMatchObject({ code: 'ITM', country: 'JPN' });

      // Malaysia airports
      expect(AIRPORT_DATABASE.KUL).toMatchObject({ code: 'KUL', country: 'MYS' });
      expect(AIRPORT_DATABASE.PEN).toMatchObject({ code: 'PEN', country: 'MYS' });
      expect(AIRPORT_DATABASE.BKI).toMatchObject({ code: 'BKI', country: 'MYS' });
      expect(AIRPORT_DATABASE.KCH).toMatchObject({ code: 'KCH', country: 'MYS' });
      expect(AIRPORT_DATABASE.LGK).toMatchObject({ code: 'LGK', country: 'MYS' });

      // Singapore airports
      expect(AIRPORT_DATABASE.SIN).toMatchObject({ code: 'SIN', country: 'SGP' });
    });

    it('should have valid airport data structure', () => {
      Object.values(AIRPORT_DATABASE).forEach(airport => {
        expect(airport).toHaveProperty('code');
        expect(airport).toHaveProperty('name');
        expect(airport).toHaveProperty('city');
        expect(airport).toHaveProperty('country');
        
        expect(typeof airport.code).toBe('string');
        expect(typeof airport.name).toBe('string');
        expect(typeof airport.city).toBe('string');
        expect(typeof airport.country).toBe('string');
        
        expect(airport.code.length).toBe(3);
        expect(airport.country.length).toBe(3);
      });
    });

    it('should have consistent country codes', () => {
      const validCountryCodes = [
        'JPN', 'MYS', 'SGP', 'USA', 'CAN', 'GBR', 'FRA', 'DEU', 'NLD',
        'KOR', 'HKG', 'TWN', 'THA', 'IDN', 'PHL', 'AUS', 'NZL'
      ];
      
      Object.values(AIRPORT_DATABASE).forEach(airport => {
        expect(validCountryCodes).toContain(airport.country);
      });
    });
  });

  describe('SUPPORTED_COUNTRIES constant', () => {
    it('should contain all supported countries', () => {
      expect(SUPPORTED_COUNTRIES).toContain('JPN');
      expect(SUPPORTED_COUNTRIES).toContain('MYS');
      expect(SUPPORTED_COUNTRIES).toContain('SGP');
      expect(SUPPORTED_COUNTRIES).toContain('THA');
      expect(SUPPORTED_COUNTRIES).toContain('VNM');
      expect(SUPPORTED_COUNTRIES).toContain('GBR');
      expect(SUPPORTED_COUNTRIES).toContain('USA');
      expect(SUPPORTED_COUNTRIES).toContain('CAN');
      expect(SUPPORTED_COUNTRIES).toContain('AUS');
    });

    it('should be an array matching constants/countries.ts', () => {
      expect(Array.isArray(SUPPORTED_COUNTRIES)).toBe(true);
      expect(SUPPORTED_COUNTRIES.length).toBe(14);
    });
  });
});