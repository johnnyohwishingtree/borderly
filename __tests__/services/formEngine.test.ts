import {
  generateFilledForm,
  updateFormData,
  validateFormCompletion,
  getCountrySpecificFields,
  exportFormData,
  calculateFormProgress,
  clearAllCaches,
  type FilledForm,
} from '../../src/services/forms/formEngine';
import { batchAutoFill } from '../../src/services/forms/autoFillLogic';
import { validateFormWithCrossChecks } from '../../src/services/forms/validators';
import { clearPathCache } from '../../src/services/forms/fieldMapper';
import { clearSchemaCache } from '../../src/services/schemas/schemaLoader';
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
  metadata: {
    priority: 1,
    complexity: 'medium',
    popularity: 85,
    lastVerified: '2025-06-01T00:00:00Z',
    supportedLanguages: ['en', 'ja'],
    implementationStatus: 'complete',
    maintenanceFrequency: 'monthly',
  },
  changeDetection: {
    monitoredSelectors: ['form', 'input[type="text"]'],
    changeThreshold: 0.2,
    fallbackActions: [{ trigger: 'form_changed', action: 'notify', message: 'Form structure changed' }],
  },
  submission: {
    earliestBeforeArrival: '14d',
    latestBeforeArrival: '0h',
    recommended: '72h',
  },
  portalFlow: {
    requiresAccount: false,
    multiStep: true,
    canSaveProgress: true,
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
  beforeEach(() => {
    // Clear all caches before each test to ensure isolation
    clearAllCaches();
    clearPathCache();
    clearSchemaCache();
  });
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { departureDate: _departureDate, ...legWithoutDepartureBase } = mockTripLeg;
      const legWithoutDeparture = legWithoutDepartureBase as TripLeg;

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

  describe('Additional Coverage Tests', () => {
    describe('Field Type Validation', () => {
      it('should handle all field types correctly', () => {
        const complexSchema: CountryFormSchema = {
          ...mockSchema,
          sections: [
            {
              id: 'complex',
              title: 'Complex Fields',
              fields: [
                {
                  id: 'textField',
                  label: 'Text Field',
                  type: 'text',
                  required: true,
                  autoFillSource: 'profile.surname',
                  countrySpecific: false,
                },
                {
                  id: 'textareaField',
                  label: 'Textarea Field',
                  type: 'textarea',
                  required: true,
                  autoFillSource: 'leg.accommodation.address._formatted',
                  countrySpecific: false,
                },
                {
                  id: 'numberField',
                  label: 'Number Field',
                  type: 'number',
                  required: true,
                  autoFillSource: 'leg._calculatedDuration',
                  countrySpecific: false,
                  validation: {
                    min: 1,
                    max: 90,
                  },
                },
                {
                  id: 'dateField',
                  label: 'Date Field',
                  type: 'date',
                  required: true,
                  autoFillSource: 'profile.dateOfBirth',
                  countrySpecific: false,
                },
                {
                  id: 'booleanField',
                  label: 'Boolean Field',
                  type: 'boolean',
                  required: true,
                  autoFillSource: 'profile.defaultDeclarations.carryingProhibitedItems',
                  countrySpecific: false,
                },
                {
                  id: 'selectField',
                  label: 'Select Field',
                  type: 'select',
                  required: true,
                  countrySpecific: true,
                  options: [
                    { value: 'option1', label: 'Option 1' },
                    { value: 'option2', label: 'Option 2' },
                    { value: 'option3', label: 'Option 3' },
                  ],
                },
              ],
            },
          ],
        };

        const result = generateFilledForm(mockProfile, mockTripLeg, complexSchema);

        expect(result.sections).toHaveLength(1);
        expect(result.sections[0].fields).toHaveLength(6);

        const fields = result.sections[0].fields;

        // Text field should be auto-filled
        expect(fields[0].currentValue).toBe('JOHNSON');
        expect(fields[0].source).toBe('auto');

        // Textarea field should be auto-filled with formatted address
        expect(fields[1].currentValue).toBe('3-7-1-2 Nishi-Shinjuku, Tokyo, Tokyo, 163-1055');
        expect(fields[1].source).toBe('auto');

        // Number field should be auto-filled with duration
        expect(fields[2].currentValue).toBe(7);
        expect(fields[2].source).toBe('auto');

        // Date field should be auto-filled
        expect(fields[3].currentValue).toBe('1990-04-08');
        expect(fields[3].source).toBe('auto');

        // Boolean field should be auto-filled
        expect(fields[4].currentValue).toBe(false);
        expect(fields[4].source).toBe('auto');

        // Select field should use default (first option)
        expect(fields[5].currentValue).toBe('option1');
        expect(fields[5].source).toBe('default');
        expect(fields[5].needsUserInput).toBe(true);
      });

      it('should handle invalid field values gracefully', () => {
        const invalidAutoFillSchema: CountryFormSchema = {
          ...mockSchema,
          sections: [
            {
              id: 'invalid',
              title: 'Invalid Auto-fill',
              fields: [
                {
                  id: 'invalidDate',
                  label: 'Invalid Date',
                  type: 'date',
                  required: true,
                  autoFillSource: 'profile.surname', // Text value for date field
                  countrySpecific: false,
                },
                {
                  id: 'invalidNumber',
                  label: 'Invalid Number',
                  type: 'number',
                  required: true,
                  autoFillSource: 'profile.givenNames', // Text value for number field
                  countrySpecific: false,
                },
                {
                  id: 'emptyText',
                  label: 'Empty Text',
                  type: 'text',
                  required: true,
                  autoFillSource: 'profile.nonExistentField',
                  countrySpecific: false,
                },
              ],
            },
          ],
        };

        const result = generateFilledForm(mockProfile, mockTripLeg, invalidAutoFillSchema);
        const fields = result.sections[0].fields;

        // Invalid date should need user input
        expect(fields[0].needsUserInput).toBe(true);
        expect(fields[0].source).toBe('empty');

        // Invalid number should need user input
        expect(fields[1].needsUserInput).toBe(true);
        expect(fields[1].source).toBe('default'); // Number fields get default value (0)

        // Empty text should need user input
        expect(fields[2].needsUserInput).toBe(true);
        expect(fields[2].source).toBe('empty');
        expect(fields[2].currentValue).toBe('');
      });
    });

    describe('Complex Auto-fill Scenarios', () => {
      it('should handle nested object auto-fill paths', () => {
        const nestedProfile = {
          ...mockProfile,
          homeAddress: {
            line1: '123 Test Street',
            line2: 'Apt 4B',
            city: 'Test City',
            state: 'Test State',
            postalCode: '12345',
            country: 'USA',
          },
        };

        const nestedSchema: CountryFormSchema = {
          ...mockSchema,
          sections: [
            {
              id: 'nested',
              title: 'Nested Fields',
              fields: [
                {
                  id: 'addressLine1',
                  label: 'Address Line 1',
                  type: 'text',
                  required: true,
                  autoFillSource: 'profile.homeAddress.line1',
                  countrySpecific: false,
                },
                {
                  id: 'addressCity',
                  label: 'City',
                  type: 'text',
                  required: true,
                  autoFillSource: 'profile.homeAddress.city',
                  countrySpecific: false,
                },
                {
                  id: 'accommodationName',
                  label: 'Accommodation',
                  type: 'text',
                  required: true,
                  autoFillSource: 'leg.accommodation.name',
                  countrySpecific: false,
                },
                {
                  id: 'accommodationPhone',
                  label: 'Phone',
                  type: 'text',
                  required: false,
                  autoFillSource: 'leg.accommodation.phone',
                  countrySpecific: false,
                },
              ],
            },
          ],
        };

        const result = generateFilledForm(nestedProfile, mockTripLeg, nestedSchema);
        const fields = result.sections[0].fields;

        expect(fields[0].currentValue).toBe('123 Test Street');
        expect(fields[0].source).toBe('auto');

        expect(fields[1].currentValue).toBe('Test City');
        expect(fields[1].source).toBe('auto');

        expect(fields[2].currentValue).toBe('Park Hyatt Tokyo');
        expect(fields[2].source).toBe('auto');

        expect(fields[3].currentValue).toBe('+81-3-5322-1234');
        expect(fields[3].source).toBe('auto');
      });

      it('should handle computed field auto-fill sources', () => {
        const computedSchema: CountryFormSchema = {
          ...mockSchema,
          sections: [
            {
              id: 'computed',
              title: 'Computed Fields',
              fields: [
                {
                  id: 'duration',
                  label: 'Duration',
                  type: 'number',
                  required: true,
                  autoFillSource: 'leg._calculatedDuration',
                  countrySpecific: false,
                },
                {
                  id: 'formattedAddress',
                  label: 'Address',
                  type: 'text',
                  required: true,
                  autoFillSource: 'leg.accommodation.address._formatted',
                  countrySpecific: false,
                },
              ],
            },
          ],
        };

        const result = generateFilledForm(mockProfile, mockTripLeg, computedSchema);
        const fields = result.sections[0].fields;

        expect(fields[0].currentValue).toBe(7); // July 15-22 = 7 days
        expect(fields[0].source).toBe('auto');

        expect(fields[1].currentValue).toBe('3-7-1-2 Nishi-Shinjuku, Tokyo, Tokyo, 163-1055');
        expect(fields[1].source).toBe('auto');
      });
    });

    describe('Form Statistics Edge Cases', () => {
      it('should handle form with no required fields', () => {
        const optionalSchema: CountryFormSchema = {
          ...mockSchema,
          sections: [
            {
              id: 'optional',
              title: 'Optional Fields',
              fields: [
                {
                  id: 'optionalField1',
                  label: 'Optional 1',
                  type: 'text',
                  required: false,
                  autoFillSource: 'profile.surname',
                  countrySpecific: false,
                },
                {
                  id: 'optionalField2',
                  label: 'Optional 2',
                  type: 'text',
                  required: false,
                  countrySpecific: true,
                },
              ],
            },
          ],
        };

        const result = generateFilledForm(mockProfile, mockTripLeg, optionalSchema);

        expect(result.stats.totalFields).toBe(2);
        expect(result.stats.autoFilled).toBe(1);
        expect(result.stats.remaining).toBe(1);
        expect(result.stats.completionPercentage).toBe(50);
      });

      it('should calculate completion percentage correctly with edge cases', () => {
        // Test with 0 fields
        const emptySchema: CountryFormSchema = {
          ...mockSchema,
          sections: [],
        };

        const emptyResult = generateFilledForm(mockProfile, mockTripLeg, emptySchema);
        expect(emptyResult.stats.completionPercentage).toBe(0);

        // Test with 100% completion - create a completely fresh schema to avoid caching issues
        const fullAutoSchema: CountryFormSchema = {
          countryCode: 'TEST',
          countryName: 'Test Country',
          schemaVersion: '1.0.1',
          lastUpdated: '2025-06-01T00:00:00Z',
          portalUrl: 'https://test.example.com/',
          portalName: 'Test Portal',
          metadata: {
            priority: 1,
            complexity: 'low',
            popularity: 50,
            lastVerified: '2025-06-01T00:00:00Z',
            supportedLanguages: ['en'],
            implementationStatus: 'complete',
            maintenanceFrequency: 'monthly',
          },
          changeDetection: {
            monitoredSelectors: ['form'],
            changeThreshold: 0.2,
            fallbackActions: [{ trigger: 'test', action: 'notify' }],
          },
          submission: {
            earliestBeforeArrival: '14d',
            latestBeforeArrival: '0h',
            recommended: '72h',
          },
          portalFlow: {
            requiresAccount: false,
            multiStep: false,
            canSaveProgress: false,
          },
          sections: [
            {
              id: 'full',
              title: 'Fully Auto',
              fields: [
                {
                  id: 'field1',
                  label: 'Field 1',
                  type: 'text',
                  required: true,
                  autoFillSource: 'profile.surname',
                  countrySpecific: false,
                },
                {
                  id: 'field2',
                  label: 'Field 2',
                  type: 'text',
                  required: true,
                  autoFillSource: 'profile.givenNames',
                  countrySpecific: false,
                },
              ],
            },
          ],
          submissionGuide: [],
        };

        const fullResult = generateFilledForm(mockProfile, mockTripLeg, fullAutoSchema);
        expect(fullResult.stats.completionPercentage).toBe(100);
      });
    });

    describe('Form Data Update Edge Cases', () => {
      it('should handle updating with null and undefined values', () => {
        const data = { existing: 'value' };

        const withNull = updateFormData(data, 'nullField', null);
        expect(withNull.nullField).toBe(null);

        const withUndefined = updateFormData(data, 'undefinedField', undefined);
        expect(withUndefined.undefinedField).toBe(undefined);

        // Original data should not be mutated
        expect(data).toEqual({ existing: 'value' });
      });

      it('should handle updating with complex objects', () => {
        const data = { simple: 'value' };
        const complexValue = {
          nested: {
            array: [1, 2, 3],
            object: { key: 'value' },
          },
        };

        const result = updateFormData(data, 'complex', complexValue);
        expect(result.complex).toEqual(complexValue);
        expect(result.simple).toBe('value');
      });
    });

    describe('Country Specific Fields Edge Cases', () => {
      it('should return empty array when no country-specific fields exist', () => {
        const noCountrySchema: CountryFormSchema = {
          ...mockSchema,
          sections: [
            {
              id: 'no-country',
              title: 'No Country Specific',
              fields: [
                {
                  id: 'field1',
                  label: 'Field 1',
                  type: 'text',
                  required: true,
                  autoFillSource: 'profile.surname',
                  countrySpecific: false,
                },
              ],
            },
          ],
        };

        const form = generateFilledForm(mockProfile, mockTripLeg, noCountrySchema);
        const countrySpecific = getCountrySpecificFields(form);

        expect(countrySpecific).toHaveLength(0);
      });

      it('should return only fields that need user input', () => {
        const mixedSchema: CountryFormSchema = {
          ...mockSchema,
          sections: [
            {
              id: 'mixed',
              title: 'Mixed Fields',
              fields: [
                {
                  id: 'autoCountryField',
                  label: 'Auto Country Field',
                  type: 'text',
                  required: true,
                  autoFillSource: 'profile.surname',
                  countrySpecific: true,
                },
                {
                  id: 'userCountryField',
                  label: 'User Country Field',
                  type: 'select',
                  required: true,
                  countrySpecific: true,
                  options: [{ value: 'test', label: 'Test' }],
                },
                {
                  id: 'normalField',
                  label: 'Normal Field',
                  type: 'text',
                  required: true,
                  countrySpecific: false,
                },
              ],
            },
          ],
        };

        const form = generateFilledForm(mockProfile, mockTripLeg, mixedSchema);
        const countrySpecific = getCountrySpecificFields(form);

        // Should only return the user country field (not auto-filled)
        expect(countrySpecific).toHaveLength(1);
        expect(countrySpecific[0].id).toBe('userCountryField');
      });
    });

    describe('Form Export Edge Cases', () => {
      it('should exclude fields with empty or falsy values appropriately', () => {
        const form = generateFilledForm(mockProfile, mockTripLeg, mockSchema);

        // Manually set some fields to test export logic
        form.sections[0].fields[0].currentValue = ''; // Empty string
        form.sections[0].fields[0].source = 'user';

        form.sections[0].fields[1].currentValue = null; // Null
        form.sections[0].fields[1].source = 'user';

        form.sections[0].fields[2].currentValue = false; // Boolean false
        form.sections[0].fields[2].source = 'auto';

        const exported = exportFormData(form);

        // Should include valid false boolean but exclude empty string and null
        expect(exported).not.toHaveProperty(form.sections[0].fields[0].id);
        expect(exported).not.toHaveProperty(form.sections[0].fields[1].id);
        expect(exported).toHaveProperty(form.sections[0].fields[2].id, false);
      });
    });
  });

  describe('store-level form generation and validation', () => {
    // Use a future trip leg so arrivalDate passes isValidTravelDate
    const futureTripLeg: TripLeg = {
      ...mockTripLeg,
      arrivalDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0], // 30 days from now
      departureDate: new Date(Date.now() + 37 * 86400000).toISOString().split('T')[0], // 37 days from now
    };

    // Schema that includes dateOfBirth — reproduces the bug where
    // batchAutoFill rejected past dates, leaving dateOfBirth out of
    // formData while the form UI showed 100% complete.
    const schemaWithDateOfBirth: CountryFormSchema = {
      ...mockSchema,
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
              id: 'dateOfBirth',
              label: 'Date of Birth',
              type: 'date',
              required: true,
              autoFillSource: 'profile.dateOfBirth',
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
          ],
        },
        {
          id: 'customs',
          title: 'Customs',
          fields: [
            {
              id: 'carryingProhibitedItems',
              label: 'Carrying prohibited items?',
              type: 'boolean',
              required: true,
              countrySpecific: false,
            },
          ],
        },
      ],
      submissionGuide: [],
    };

    it('should include dateOfBirth in batchAutoFill formData', () => {
      const form = generateFilledForm(mockProfile, futureTripLeg, schemaWithDateOfBirth);
      const allFields = form.sections.flatMap(s => s.fields);

      // Simulate what the store's generateForm does
      const enhancedFormData: Record<string, unknown> = {};
      const autoFillResults = batchAutoFill(
        allFields,
        { profile: mockProfile, leg: futureTripLeg },
        { enableSmartDefaults: true, enableFallbacks: true, confidenceThreshold: 0.7 }
      );
      Object.entries(autoFillResults).forEach(([fieldId, result]) => {
        if (!enhancedFormData[fieldId] && result.value !== undefined) {
          enhancedFormData[fieldId] = result.value;
        }
      });

      // dateOfBirth MUST be in formData — this was the root cause of
      // "100% complete but can't mark as ready"
      expect(enhancedFormData.dateOfBirth).toBe('1990-04-08');
      expect(enhancedFormData.surname).toBe('JOHNSON');
      expect(enhancedFormData.arrivalDate).toBeDefined();
    });

    it('should produce isValid=true when all required fields are auto-filled', () => {
      const form = generateFilledForm(mockProfile, futureTripLeg, schemaWithDateOfBirth);
      const allFields = form.sections.flatMap(s => s.fields);

      // Build formData the same way the store does
      const enhancedFormData: Record<string, unknown> = {};
      const autoFillResults = batchAutoFill(
        allFields,
        { profile: mockProfile, leg: futureTripLeg },
        { enableSmartDefaults: true, enableFallbacks: true, confidenceThreshold: 0.7 }
      );
      Object.entries(autoFillResults).forEach(([fieldId, result]) => {
        if (!enhancedFormData[fieldId] && result.value !== undefined) {
          enhancedFormData[fieldId] = result.value;
        }
      });

      const validationResult = validateFormWithCrossChecks(allFields, enhancedFormData, {
        countryCode: 'JPN',
        profileData: mockProfile,
      });

      // Every required field is auto-fillable — form must be valid
      expect(validationResult.isValid).toBe(true);
      expect(Object.keys(validationResult.errors)).toHaveLength(0);
      expect(validationResult.crossFieldErrors).toHaveLength(0);
    });

    it('should reject meatProducts=true for Japan (country-specific rule)', () => {
      const form = generateFilledForm(mockProfile, futureTripLeg, schemaWithDateOfBirth);
      const allFields = form.sections.flatMap(s => s.fields);

      // Build valid formData, then set meatProducts to true
      const enhancedFormData: Record<string, unknown> = {};
      const autoFillResults = batchAutoFill(
        allFields,
        { profile: mockProfile, leg: futureTripLeg },
        { enableSmartDefaults: true, enableFallbacks: true, confidenceThreshold: 0.7 }
      );
      Object.entries(autoFillResults).forEach(([fieldId, result]) => {
        if (!enhancedFormData[fieldId] && result.value !== undefined) {
          enhancedFormData[fieldId] = result.value;
        }
      });
      enhancedFormData.meatProducts = true;

      const validationResult = validateFormWithCrossChecks(allFields, enhancedFormData, {
        countryCode: 'JPN',
        profileData: mockProfile,
      });

      // meatProducts=true should be rejected for Japan
      expect(validationResult.isValid).toBe(false);
    });
  });
});
