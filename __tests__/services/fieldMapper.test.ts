import {
  resolveAutoFillPath,
  validateAutoFillPath,
  getAvailablePaths,
  type FormContext,
} from '../../src/services/forms/fieldMapper';
import { TravelerProfile } from '../../src/types/profile';
import { TripLeg } from '../../src/types/trip';

// Mock data for testing
const mockProfile: TravelerProfile = {
  id: 'test-profile-id',
  passportNumber: 'L898902C3',
  surname: 'JOHNSON',
  givenNames: 'JOHNNY MICHAEL',
  nationality: 'USA',
  dateOfBirth: '1990-04-08',
  gender: 'M',
  passportExpiry: '2030-04-08',
  issuingCountry: 'USA',
  email: 'johnny@example.com',
  phoneNumber: '+1234567890',
  homeAddress: {
    line1: '123 Main St',
    line2: 'Apt 4B',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'USA',
  },
  occupation: 'Software Engineer',
  defaultDeclarations: {
    hasItemsToDeclar: false,
    carryingCurrency: true,
    carryingProhibitedItems: false,
    visitedFarm: false,
    hasCriminalRecord: false,
    carryingCommercialGoods: false,
  },
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

const mockTripLeg: TripLeg = {
  id: 'test-leg-id',
  tripId: 'test-trip-id',
  destinationCountry: 'JPN',
  arrivalDate: '2025-07-15T14:30:00Z',
  departureDate: '2025-07-22T10:15:00Z',
  flightNumber: 'NH107',
  airlineCode: 'NH',
  arrivalAirport: 'NRT',
  accommodation: {
    name: 'Park Hyatt Tokyo',
    address: {
      line1: '3-7-1-2 Nishi-Shinjuku',
      city: 'Tokyo',
      state: 'Tokyo',
      postalCode: '163-1055',
      country: 'JPN',
    },
    phone: '+81-3-5322-1234',
    bookingReference: 'PH123456',
  },
  formStatus: 'not_started',
  order: 1,
};

const mockContext: FormContext = {
  profile: mockProfile,
  leg: mockTripLeg,
};

describe('FieldMapper', () => {
  describe('resolveAutoFillPath', () => {
    describe('profile paths', () => {
      it('should resolve basic profile fields', () => {
        expect(resolveAutoFillPath('profile.passportNumber', mockContext)).toBe('L898902C3');
        expect(resolveAutoFillPath('profile.surname', mockContext)).toBe('JOHNSON');
        expect(resolveAutoFillPath('profile.givenNames', mockContext)).toBe('JOHNNY MICHAEL');
        expect(resolveAutoFillPath('profile.nationality', mockContext)).toBe('USA');
        expect(resolveAutoFillPath('profile.dateOfBirth', mockContext)).toBe('1990-04-08');
        expect(resolveAutoFillPath('profile.gender', mockContext)).toBe('M');
        expect(resolveAutoFillPath('profile.email', mockContext)).toBe('johnny@example.com');
        expect(resolveAutoFillPath('profile.occupation', mockContext)).toBe('Software Engineer');
      });

      it('should resolve nested profile fields', () => {
        expect(resolveAutoFillPath('profile.homeAddress.line1', mockContext)).toBe('123 Main St');
        expect(resolveAutoFillPath('profile.homeAddress.line2', mockContext)).toBe('Apt 4B');
        expect(resolveAutoFillPath('profile.homeAddress.city', mockContext)).toBe('New York');
        expect(resolveAutoFillPath('profile.homeAddress.state', mockContext)).toBe('NY');
        expect(resolveAutoFillPath('profile.homeAddress.postalCode', mockContext)).toBe('10001');
        expect(resolveAutoFillPath('profile.homeAddress.country', mockContext)).toBe('USA');
      });

      it('should resolve declaration defaults', () => {
        expect(resolveAutoFillPath('profile.defaultDeclarations.hasItemsToDeclar', mockContext)).toBe(false);
        expect(resolveAutoFillPath('profile.defaultDeclarations.carryingCurrency', mockContext)).toBe(true);
        expect(resolveAutoFillPath('profile.defaultDeclarations.carryingProhibitedItems', mockContext)).toBe(false);
        expect(resolveAutoFillPath('profile.defaultDeclarations.visitedFarm', mockContext)).toBe(false);
        expect(resolveAutoFillPath('profile.defaultDeclarations.hasCriminalRecord', mockContext)).toBe(false);
        expect(resolveAutoFillPath('profile.defaultDeclarations.carryingCommercialGoods', mockContext)).toBe(false);
      });
    });

    describe('trip leg paths', () => {
      it('should resolve basic leg fields', () => {
        expect(resolveAutoFillPath('leg.destinationCountry', mockContext)).toBe('JPN');
        expect(resolveAutoFillPath('leg.arrivalDate', mockContext)).toBe('2025-07-15T14:30:00Z');
        expect(resolveAutoFillPath('leg.departureDate', mockContext)).toBe('2025-07-22T10:15:00Z');
        expect(resolveAutoFillPath('leg.flightNumber', mockContext)).toBe('NH107');
        expect(resolveAutoFillPath('leg.airlineCode', mockContext)).toBe('NH');
        expect(resolveAutoFillPath('leg.arrivalAirport', mockContext)).toBe('NRT');
      });

      it('should resolve accommodation fields', () => {
        expect(resolveAutoFillPath('leg.accommodation.name', mockContext)).toBe('Park Hyatt Tokyo');
        expect(resolveAutoFillPath('leg.accommodation.phone', mockContext)).toBe('+81-3-5322-1234');
        expect(resolveAutoFillPath('leg.accommodation.bookingReference', mockContext)).toBe('PH123456');
      });

      it('should resolve accommodation address fields', () => {
        expect(resolveAutoFillPath('leg.accommodation.address.line1', mockContext)).toBe('3-7-1-2 Nishi-Shinjuku');
        expect(resolveAutoFillPath('leg.accommodation.address.city', mockContext)).toBe('Tokyo');
        expect(resolveAutoFillPath('leg.accommodation.address.state', mockContext)).toBe('Tokyo');
        expect(resolveAutoFillPath('leg.accommodation.address.postalCode', mockContext)).toBe('163-1055');
        expect(resolveAutoFillPath('leg.accommodation.address.country', mockContext)).toBe('JPN');
      });
    });

    describe('computed fields', () => {
      it('should calculate duration correctly', () => {
        const duration = resolveAutoFillPath('leg._calculatedDuration', mockContext);
        expect(duration).toBe(7); // 7 days from July 15-22
      });

      it('should handle missing departure date', () => {
        const contextWithoutDeparture: FormContext = {
          ...mockContext,
          leg: {
            ...mockTripLeg,
            departureDate: undefined,
          },
        };

        const duration = resolveAutoFillPath('leg._calculatedDuration', contextWithoutDeparture);
        expect(duration).toBeUndefined();
      });

      it('should handle invalid dates', () => {
        const contextWithInvalidDate: FormContext = {
          ...mockContext,
          leg: {
            ...mockTripLeg,
            arrivalDate: 'invalid-date',
            departureDate: '2025-07-22',
          },
        };

        const duration = resolveAutoFillPath('leg._calculatedDuration', contextWithInvalidDate);
        expect(duration).toBeUndefined();
      });

      it('should handle departure before arrival', () => {
        const contextWithWrongDates: FormContext = {
          ...mockContext,
          leg: {
            ...mockTripLeg,
            arrivalDate: '2025-07-22',
            departureDate: '2025-07-15',
          },
        };

        const duration = resolveAutoFillPath('leg._calculatedDuration', contextWithWrongDates);
        expect(duration).toBeUndefined();
      });

      it('should format address correctly', () => {
        const formatted = resolveAutoFillPath('leg.accommodation.address._formatted', mockContext);
        expect(formatted).toBe('3-7-1-2 Nishi-Shinjuku, Tokyo, Tokyo, 163-1055');
      });

      it('should handle address with missing line2', () => {
        const contextWithoutLine2: FormContext = {
          ...mockContext,
          leg: {
            ...mockTripLeg,
            accommodation: {
              ...mockTripLeg.accommodation,
              address: {
                line1: '123 Main St',
                city: 'New York',
                state: 'NY',
                postalCode: '10001',
                country: 'USA',
              },
            },
          },
        };

        const formatted = resolveAutoFillPath('leg.accommodation.address._formatted', contextWithoutLine2);
        expect(formatted).toBe('123 Main St, New York, NY, 10001');
      });

      it('should handle missing address', () => {
        const contextWithoutAddress: FormContext = {
          ...mockContext,
          leg: {
            ...mockTripLeg,
            accommodation: {
              name: 'Hotel',
              address: undefined as any,
            },
          },
        };

        const formatted = resolveAutoFillPath('leg.accommodation.address._formatted', contextWithoutAddress);
        expect(formatted).toBeUndefined();
      });

      it('should handle empty address fields', () => {
        const contextWithEmptyAddress: FormContext = {
          ...mockContext,
          leg: {
            ...mockTripLeg,
            accommodation: {
              name: 'Hotel',
              address: {
                line1: '',
                city: '',
                postalCode: '',
                country: '',
              },
            },
          },
        };

        const formatted = resolveAutoFillPath('leg.accommodation.address._formatted', contextWithEmptyAddress);
        expect(formatted).toBeUndefined();
      });
    });

    describe('error handling', () => {
      it('should return undefined for non-existent paths', () => {
        expect(resolveAutoFillPath('profile.nonExistentField', mockContext)).toBeUndefined();
        expect(resolveAutoFillPath('leg.nonExistentField', mockContext)).toBeUndefined();
        expect(resolveAutoFillPath('profile.homeAddress.nonExistentField', mockContext)).toBeUndefined();
      });

      it('should return undefined for invalid nested paths', () => {
        expect(resolveAutoFillPath('profile.passportNumber.invalidNested', mockContext)).toBeUndefined();
        expect(resolveAutoFillPath('leg.arrivalDate.invalidNested', mockContext)).toBeUndefined();
      });

      it('should handle null/undefined values in path', () => {
        const contextWithNulls: FormContext = {
          profile: {
            ...mockProfile,
            homeAddress: undefined,
          },
          leg: {
            ...mockTripLeg,
            accommodation: undefined as any,
          },
        };

        expect(resolveAutoFillPath('profile.homeAddress.line1', contextWithNulls)).toBeUndefined();
        expect(resolveAutoFillPath('leg.accommodation.name', contextWithNulls)).toBeUndefined();
      });

      it('should handle empty path', () => {
        expect(resolveAutoFillPath('', mockContext)).toEqual(mockContext);
      });

      it('should handle single-level path', () => {
        expect(resolveAutoFillPath('profile', mockContext)).toEqual(mockProfile);
        expect(resolveAutoFillPath('leg', mockContext)).toEqual(mockTripLeg);
      });
    });
  });

  describe('validateAutoFillPath', () => {
    it('should validate correct paths', () => {
      const result = validateAutoFillPath('profile.passportNumber', mockContext);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate computed paths', () => {
      const result = validateAutoFillPath('leg._calculatedDuration', mockContext);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle invalid paths gracefully', () => {
      const result = validateAutoFillPath('invalid.path', mockContext);
      expect(result.isValid).toBe(true); // Returns undefined, which is valid
      expect(result.error).toBeUndefined();
    });
  });

  describe('getAvailablePaths', () => {
    it('should return all available paths from profile', () => {
      const paths = getAvailablePaths(mockProfile, 'profile');

      expect(paths).toContain('profile.id');
      expect(paths).toContain('profile.passportNumber');
      expect(paths).toContain('profile.surname');
      expect(paths).toContain('profile.givenNames');
      expect(paths).toContain('profile.homeAddress');
      expect(paths).toContain('profile.homeAddress.line1');
      expect(paths).toContain('profile.homeAddress.line2');
      expect(paths).toContain('profile.homeAddress.city');
      expect(paths).toContain('profile.defaultDeclarations');
      expect(paths).toContain('profile.defaultDeclarations.hasItemsToDeclar');
      expect(paths).toContain('profile.defaultDeclarations.carryingCurrency');
    });

    it('should return all available paths from trip leg', () => {
      const paths = getAvailablePaths(mockTripLeg, 'leg');

      expect(paths).toContain('leg.id');
      expect(paths).toContain('leg.destinationCountry');
      expect(paths).toContain('leg.arrivalDate');
      expect(paths).toContain('leg.accommodation');
      expect(paths).toContain('leg.accommodation.name');
      expect(paths).toContain('leg.accommodation.address');
      expect(paths).toContain('leg.accommodation.address.line1');
      expect(paths).toContain('leg.accommodation.address.city');
    });

    it('should work without prefix', () => {
      const paths = getAvailablePaths({ name: 'test', value: 42 });

      expect(paths).toContain('name');
      expect(paths).toContain('value');
    });

    it('should handle empty objects', () => {
      const paths = getAvailablePaths({});
      expect(paths).toHaveLength(0);
    });

    it('should handle primitive values', () => {
      const paths = getAvailablePaths('string');
      expect(paths).toHaveLength(0);

      const paths2 = getAvailablePaths(42);
      expect(paths2).toHaveLength(0);

      const paths3 = getAvailablePaths(null);
      expect(paths3).toHaveLength(0);
    });

    it('should not traverse arrays', () => {
      const objWithArray = {
        items: ['item1', 'item2'],
        name: 'test',
      };

      const paths = getAvailablePaths(objWithArray);

      expect(paths).toContain('items');
      expect(paths).toContain('name');
      expect(paths).not.toContain('items.0');
      expect(paths).not.toContain('items.1');
    });
  });

  describe('duration calculation edge cases', () => {
    it('should handle same-day trips', () => {
      const sameDayContext: FormContext = {
        ...mockContext,
        leg: {
          ...mockTripLeg,
          arrivalDate: '2025-07-15T10:00:00Z',
          departureDate: '2025-07-15T20:00:00Z',
        },
      };

      const duration = resolveAutoFillPath('leg._calculatedDuration', sameDayContext);
      expect(duration).toBe(1); // Should round up to 1 day
    });

    it('should handle fractional days correctly', () => {
      const fractionalContext: FormContext = {
        ...mockContext,
        leg: {
          ...mockTripLeg,
          arrivalDate: '2025-07-15T14:00:00Z',
          departureDate: '2025-07-16T02:00:00Z',
        },
      };

      const duration = resolveAutoFillPath('leg._calculatedDuration', fractionalContext);
      expect(duration).toBe(1); // 12 hours should round up to 1 day
    });

    it('should handle long trips', () => {
      const longTripContext: FormContext = {
        ...mockContext,
        leg: {
          ...mockTripLeg,
          arrivalDate: '2025-01-01',
          departureDate: '2025-12-31',
        },
      };

      const duration = resolveAutoFillPath('leg._calculatedDuration', longTripContext);
      expect(duration).toBe(364); // Most of the year
    });
  });

  describe('address formatting edge cases', () => {
    it('should handle minimal address', () => {
      const minimalContext: FormContext = {
        ...mockContext,
        leg: {
          ...mockTripLeg,
          accommodation: {
            name: 'Hotel',
            address: {
              line1: 'Street',
              city: 'City',
              postalCode: '12345',
              country: 'USA',
            },
          },
        },
      };

      const formatted = resolveAutoFillPath('leg.accommodation.address._formatted', minimalContext);
      expect(formatted).toBe('Street, City, 12345');
    });

    it('should handle only required fields', () => {
      const minimalContext: FormContext = {
        ...mockContext,
        leg: {
          ...mockTripLeg,
          accommodation: {
            name: 'Hotel',
            address: {
              line1: 'Street',
              city: '',
              postalCode: '',
              country: '',
            },
          },
        },
      };

      const formatted = resolveAutoFillPath('leg.accommodation.address._formatted', minimalContext);
      expect(formatted).toBe('Street');
    });
  });
});