import {
  generateFilledForm,
  updateFormData,
  validateFormCompletion,
  getCountrySpecificFields,
  exportFormData,
  calculateFormProgress,
  type FilledForm,
} from '../../src/services/forms/formEngine';
import { TravelerProfile } from '../../src/types/profile';
import { TripLeg } from '../../src/types/trip';
import { CountryFormSchema } from '../../src/types/schema';

// Mock data for testing
const mockProfile: TravelerProfile = {
  id: 'test-profile-id',
  passportNumber: 'L898902C3',
  surname: 'JOHNSON',
  givenNames: 'JOHNNY',
  nationality: 'USA',
  dateOfBirth: '1990-04-08',
  gender: 'M',
  passportExpiry: '2030-04-08',
  issuingCountry: 'USA',
  email: 'johnny@example.com',
  phoneNumber: '+1234567890',
  homeAddress: {
    line1: '123 Main St',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'USA',
  },
  occupation: 'Software Engineer',
  defaultDeclarations: {
    hasItemsToDeclar: false,
    carryingCurrency: false,
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
  arrivalDate: '2025-07-15',
  departureDate: '2025-07-22',
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
  },
  formStatus: 'not_started',
  order: 1,
};

const mockSchema: CountryFormSchema = {
  countryCode: 'JPN',
  countryName: 'Japan',
  schemaVersion: '1.0.0',
  lastUpdated: '2025-06-01T00:00:00Z',
  portalUrl: 'https://vjw-lp.digital.go.jp/en/',
  portalName: 'Visit Japan Web',
  submission: {
    earliestBeforeArrival: '14d',
    latestBeforeArrival: '0h',
    recommended: '72h',
  },
  sections: [
    {
      id: 'personal',
      title: 'Personal Information',
      fields: [
        {
          id: 'surname',
          label: 'Surname',
          type: 'text',
          required: true,
          autoFillSource: 'profile.surname',
          countrySpecific: false,
        },
        {
          id: 'givenNames',
          label: 'Given Names',
          type: 'text',
          required: true,
          autoFillSource: 'profile.givenNames',
          countrySpecific: false,
        },
        {
          id: 'passportNumber',
          label: 'Passport Number',
          type: 'text',
          required: true,
          autoFillSource: 'profile.passportNumber',
          countrySpecific: false,
        },
      ],
    },
    {
      id: 'travel',
      title: 'Travel Information',
      fields: [
        {
          id: 'arrivalDate',
          label: 'Arrival Date',
          type: 'date',
          required: true,
          autoFillSource: 'leg.arrivalDate',
          countrySpecific: false,
        },
        {
          id: 'durationOfStay',
          label: 'Duration of Stay',
          type: 'number',
          required: true,
          autoFillSource: 'leg._calculatedDuration',
          countrySpecific: false,
        },
        {
          id: 'purposeOfVisit',
          label: 'Purpose of Visit',
          type: 'select',
          required: true,
          countrySpecific: true,
          options: [
            { value: 'tourism', label: 'Tourism' },
            { value: 'business', label: 'Business' },
          ],
        },
      ],
    },
    {
      id: 'accommodation',
      title: 'Accommodation',
      fields: [
        {
          id: 'hotelName',
          label: 'Hotel Name',
          type: 'text',
          required: true,
          autoFillSource: 'leg.accommodation.name',
          countrySpecific: false,
        },
        {
          id: 'hotelAddress',
          label: 'Hotel Address',
          type: 'text',
          required: true,
          autoFillSource: 'leg.accommodation.address._formatted',
          countrySpecific: false,
        },
      ],
    },
    {
      id: 'customs',
      title: 'Customs Declarations',
      fields: [
        {
          id: 'carryingProhibitedItems',
          label: 'Carrying prohibited items?',
          type: 'boolean',
          required: true,
          autoFillSource: 'profile.defaultDeclarations.carryingProhibitedItems',
          countrySpecific: false,
        },
        {
          id: 'currencyOver1M',
          label: 'Carrying over ¥1M?',
          type: 'boolean',
          required: true,
          countrySpecific: true,
        },
      ],
    },
  ],
  submissionGuide: [],
};

describe('FormEngine', () => {
  describe('generateFilledForm', () => {
    it('should generate a filled form with auto-filled fields', () => {
      const result = generateFilledForm(mockProfile, mockTripLeg, mockSchema);

      expect(result.countryCode).toBe('JPN');
      expect(result.countryName).toBe('Japan');
      expect(result.portalName).toBe('Visit Japan Web');
      expect(result.sections).toHaveLength(4);

      // Check auto-filled fields
      const surnameField = result.sections[0].fields[0];
      expect(surnameField.id).toBe('surname');
      expect(surnameField.currentValue).toBe('JOHNSON');
      expect(surnameField.source).toBe('auto');
      expect(surnameField.needsUserInput).toBe(false);

      const givenNamesField = result.sections[0].fields[1];
      expect(givenNamesField.currentValue).toBe('JOHNNY');
      expect(givenNamesField.source).toBe('auto');

      const passportField = result.sections[0].fields[2];
      expect(passportField.currentValue).toBe('L898902C3');
      expect(passportField.source).toBe('auto');
    });

    it('should calculate duration correctly', () => {
      const result = generateFilledForm(mockProfile, mockTripLeg, mockSchema);

      const durationField = result.sections[1].fields[1];
      expect(durationField.id).toBe('durationOfStay');
      expect(durationField.currentValue).toBe(7); // 7 days from July 15-22
      expect(durationField.source).toBe('auto');
    });

    it('should format address correctly', () => {
      const result = generateFilledForm(mockProfile, mockTripLeg, mockSchema);

      const addressField = result.sections[2].fields[1];
      expect(addressField.id).toBe('hotelAddress');
      expect(addressField.currentValue).toBe('3-7-1-2 Nishi-Shinjuku, Tokyo, Tokyo, 163-1055');
      expect(addressField.source).toBe('auto');
    });

    it('should mark fields needing user input', () => {
      const result = generateFilledForm(mockProfile, mockTripLeg, mockSchema);

      const purposeField = result.sections[1].fields[2];
      expect(purposeField.id).toBe('purposeOfVisit');
      expect(purposeField.needsUserInput).toBe(true);
      expect(purposeField.source).toBe('default');
      expect(purposeField.currentValue).toBe('tourism'); // First option as default

      const currencyField = result.sections[3].fields[1];
      expect(currencyField.id).toBe('currencyOver1M');
      expect(currencyField.needsUserInput).toBe(true);
      expect(currencyField.source).toBe('default');
      expect(currencyField.currentValue).toBe(false); // Boolean default
    });

    it('should use existing form data when provided', () => {
      const existingData = {
        purposeOfVisit: 'business',
        currencyOver1M: true,
      };

      const result = generateFilledForm(mockProfile, mockTripLeg, mockSchema, existingData);

      const purposeField = result.sections[1].fields[2];
      expect(purposeField.currentValue).toBe('business');
      expect(purposeField.source).toBe('user');
      expect(purposeField.needsUserInput).toBe(false);

      const currencyField = result.sections[3].fields[1];
      expect(currencyField.currentValue).toBe(true);
      expect(currencyField.source).toBe('user');
      expect(currencyField.needsUserInput).toBe(false);
    });

    it('should calculate statistics correctly', () => {
      const result = generateFilledForm(mockProfile, mockTripLeg, mockSchema);

      // 10 total fields: personal (3) + travel (3) + accommodation (2) + customs (2)
      expect(result.stats.totalFields).toBe(10);
      expect(result.stats.autoFilled).toBe(8); // surname, givenNames, passportNumber, arrivalDate, durationOfStay, hotelName, hotelAddress, carryingProhibitedItems
      expect(result.stats.userFilled).toBe(0);
      expect(result.stats.remaining).toBe(2); // purposeOfVisit, currencyOver1M
      expect(result.stats.completionPercentage).toBe(80); // 8/10 = 80%
    });

    it('should handle missing auto-fill sources gracefully', () => {
      const schemaWithMissingSource: CountryFormSchema = {
        ...mockSchema,
        sections: [
          {
            id: 'test',
            title: 'Test Section',
            fields: [
              {
                id: 'missingField',
                label: 'Missing Field',
                type: 'text',
                required: true,
                autoFillSource: 'profile.nonExistentField',
                countrySpecific: false,
              },
            ],
          },
        ],
      };

      const result = generateFilledForm(mockProfile, mockTripLeg, schemaWithMissingSource);

      const field = result.sections[0].fields[0];
      expect(field.needsUserInput).toBe(true);
      expect(field.source).toBe('empty');
      expect(field.currentValue).toBe('');
    });
  });

  describe('updateFormData', () => {
    it('should update form data correctly', () => {
      const currentData = { field1: 'value1' };
      const updated = updateFormData(currentData, 'field2', 'value2');

      expect(updated).toEqual({
        field1: 'value1',
        field2: 'value2',
      });

      // Should not mutate original object
      expect(currentData).toEqual({ field1: 'value1' });
    });

    it('should overwrite existing field values', () => {
      const currentData = { field1: 'oldValue' };
      const updated = updateFormData(currentData, 'field1', 'newValue');

      expect(updated).toEqual({ field1: 'newValue' });
    });
  });

  describe('validateFormCompletion', () => {
    let filledForm: FilledForm;

    beforeEach(() => {
      filledForm = generateFilledForm(mockProfile, mockTripLeg, mockSchema);
    });

    it('should identify missing required fields', () => {
      const result = validateFormCompletion(filledForm);

      expect(result.isComplete).toBe(false);
      expect(result.missingFields).toContain('purposeOfVisit');
      expect(result.missingFields).toContain('currencyOver1M');
    });

    it('should validate complete form correctly', () => {
      // Fill in the missing fields
      filledForm.sections[1].fields[2].currentValue = 'tourism';
      filledForm.sections[1].fields[2].needsUserInput = false;
      filledForm.sections[3].fields[1].currentValue = false;
      filledForm.sections[3].fields[1].needsUserInput = false;

      const result = validateFormCompletion(filledForm);

      expect(result.isComplete).toBe(true);
      expect(result.missingFields).toHaveLength(0);
    });
  });

  describe('getCountrySpecificFields', () => {
    it('should return only country-specific fields needing input', () => {
      const filledForm = generateFilledForm(mockProfile, mockTripLeg, mockSchema);
      const countrySpecific = getCountrySpecificFields(filledForm);

      expect(countrySpecific).toHaveLength(2);
      expect(countrySpecific.map(f => f.id)).toEqual(['purposeOfVisit', 'currencyOver1M']);

      countrySpecific.forEach(field => {
        expect(field.countrySpecific).toBe(true);
        expect(field.needsUserInput).toBe(true);
      });
    });
  });

  describe('exportFormData', () => {
    it('should export form data correctly', () => {
      const filledForm = generateFilledForm(mockProfile, mockTripLeg, mockSchema);

      // Fill in missing fields and mark as user-filled
      filledForm.sections[1].fields[2].currentValue = 'business';
      filledForm.sections[1].fields[2].source = 'user';
      filledForm.sections[3].fields[1].currentValue = true;
      filledForm.sections[3].fields[1].source = 'user';

      const exported = exportFormData(filledForm);

      expect(exported).toEqual({
        surname: 'JOHNSON',
        givenNames: 'JOHNNY',
        passportNumber: 'L898902C3',
        arrivalDate: '2025-07-15',
        durationOfStay: 7,
        purposeOfVisit: 'business',
        hotelName: 'Park Hyatt Tokyo',
        hotelAddress: '3-7-1-2 Nishi-Shinjuku, Tokyo, Tokyo, 163-1055',
        carryingProhibitedItems: false,
        currencyOver1M: true,
      });
    });

    it('should exclude empty values from export', () => {
      const filledForm = generateFilledForm(mockProfile, mockTripLeg, mockSchema);
      const exported = exportFormData(filledForm);

      // Should not include empty/default values that need user input
      expect(exported).not.toHaveProperty('purposeOfVisit');
      expect(exported).not.toHaveProperty('currencyOver1M');
    });
  });

  describe('calculateFormProgress', () => {
    it('should calculate section progress correctly', () => {
      const filledForm = generateFilledForm(mockProfile, mockTripLeg, mockSchema);
      const progress = calculateFormProgress(filledForm);

      expect(progress.totalSections).toBe(4);
      expect(progress.completedSections).toBe(2); // personal and accommodation sections are complete

      expect(progress.sectionProgress).toHaveLength(4);

      const personalProgress = progress.sectionProgress[0];
      expect(personalProgress.sectionId).toBe('personal');
      expect(personalProgress.completed).toBe(3);
      expect(personalProgress.total).toBe(3);

      const travelProgress = progress.sectionProgress[1];
      expect(travelProgress.sectionId).toBe('travel');
      expect(travelProgress.completed).toBe(2);
      expect(travelProgress.total).toBe(3);
    });
  });

  describe('edge cases', () => {
    it('should handle trip leg without departure date', () => {
      const legWithoutDeparture: TripLeg = {
        ...mockTripLeg,
        departureDate: undefined,
      };

      const result = generateFilledForm(mockProfile, legWithoutDeparture, mockSchema);
      const durationField = result.sections[1].fields[1];

      expect(durationField.currentValue).toBe(0); // Default for number field
      expect(durationField.source).toBe('default');
      expect(durationField.needsUserInput).toBe(true);
    });

    it('should handle accommodation without address', () => {
      const legWithoutAddress: TripLeg = {
        ...mockTripLeg,
        accommodation: {
          name: 'Hotel Name',
          address: {
            line1: '',
            city: '',
            postalCode: '',
            country: '',
          },
        },
      };

      const result = generateFilledForm(mockProfile, legWithoutAddress, mockSchema);
      const addressField = result.sections[2].fields[1];

      expect(addressField.currentValue).toBe(''); // Empty formatted address
      expect(addressField.source).toBe('empty');
      expect(addressField.needsUserInput).toBe(true);
    });

    it('should handle empty schema sections', () => {
      const emptySchema: CountryFormSchema = {
        ...mockSchema,
        sections: [],
      };

      const result = generateFilledForm(mockProfile, mockTripLeg, emptySchema);

      expect(result.sections).toHaveLength(0);
      expect(result.stats.totalFields).toBe(0);
      expect(result.stats.completionPercentage).toBe(0);
    });
  });
});
