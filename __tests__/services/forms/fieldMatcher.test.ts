import {
  matchField,
  matchAllFields,
  detectCountryFromUrl,
  type InputAttributes,
} from '@/services/forms/fieldMatcher';
import type { CountryFormSchema } from '@/types/schema';

// Minimal schema fixture for testing
const mockSchema: CountryFormSchema = {
  countryCode: 'JPN',
  countryName: 'Japan',
  schemaVersion: '1.0.0',
  lastUpdated: '2025-06-01T00:00:00Z',
  portalUrl: 'https://vjw-lp.digital.go.jp/en/registration/',
  portalName: 'Visit Japan Web',
  submissionDeadlineHours: 24,
  recommendedLeadTimeHours: 72,
  submissionWindowNote: 'Submit 24-72 h before arrival',
  metadata: {
    priority: 1,
    complexity: 'low',
    popularity: 95,
    lastVerified: '2025-06-01T00:00:00Z',
    supportedLanguages: ['en', 'ja'],
    implementationStatus: 'complete',
    maintenanceFrequency: 'monthly',
  },
  changeDetection: {
    monitoredSelectors: [],
    changeThreshold: 10,
    fallbackActions: [],
  },
  submission: {
    earliestBeforeArrival: '14d',
    latestBeforeArrival: '0h',
    recommended: '72h',
  },
  portalFlow: {
    requiresAccount: true,
    multiStep: true,
    canSaveProgress: true,
  },
  sections: [
    {
      id: 'passport',
      title: 'Passport Details',
      fields: [
        {
          id: 'passportNumber',
          label: 'Passport number',
          type: 'text',
          required: true,
          autoFillSource: 'profile.passportNumber',
          countrySpecific: false,
          portalFieldName: 'Passport number',
        },
        {
          id: 'surname',
          label: 'Surname',
          type: 'text',
          required: true,
          autoFillSource: 'profile.surname',
          countrySpecific: false,
          portalFieldName: 'Surname',
        },
        {
          id: 'givenNames',
          label: 'Given name',
          type: 'text',
          required: true,
          autoFillSource: 'profile.givenNames',
          countrySpecific: false,
          portalFieldName: 'Given name',
        },
        {
          id: 'dateOfBirth',
          label: 'Date of birth',
          type: 'date',
          required: true,
          autoFillSource: 'profile.dateOfBirth',
          countrySpecific: false,
          portalFieldName: 'Date of birth',
        },
        {
          id: 'nationality',
          label: 'Nationality or citizenship',
          type: 'searchable_select',
          required: true,
          autoFillSource: 'profile.nationality',
          countrySpecific: false,
          portalFieldName: 'Nationality or citizenship',
        },
      ],
    },
    {
      id: 'contact',
      title: 'Contact Information',
      fields: [
        {
          id: 'email',
          label: 'Email address',
          type: 'text',
          required: false,
          autoFillSource: 'profile.email',
          countrySpecific: false,
          portalFieldName: 'Email address',
        },
        {
          id: 'phoneNumber',
          label: 'Phone number',
          type: 'text',
          required: false,
          autoFillSource: 'profile.phoneNumber',
          countrySpecific: false,
          portalFieldName: 'Phone number',
        },
      ],
    },
  ],
  submissionGuide: [],
};

describe('detectCountryFromUrl', () => {
  it('detects Japan from vjw.digital.go.jp', () => {
    expect(detectCountryFromUrl('https://vjw-lp.digital.go.jp/en/registration/')).toBe('JPN');
  });

  it('detects Singapore from eservices.ica.gov.sg', () => {
    expect(detectCountryFromUrl('https://eservices.ica.gov.sg/sgarrivalcard')).toBe('SGP');
  });

  it('detects Malaysia from imigresen-online.imi.gov.my', () => {
    expect(detectCountryFromUrl('https://imigresen-online.imi.gov.my/mdac/main')).toBe('MYS');
  });

  it('detects Thailand from tp.consular.go.th', () => {
    expect(detectCountryFromUrl('https://tp.consular.go.th/')).toBe('THA');
  });

  it('detects USA from cbpone.cbp.dhs.gov', () => {
    expect(detectCountryFromUrl('https://cbpone.cbp.dhs.gov/')).toBe('USA');
  });

  it('detects Australia from online.abf.gov.au', () => {
    expect(detectCountryFromUrl('https://online.abf.gov.au/incoming-passenger-card/')).toBe('AUS');
  });

  it('detects UK from www.gov.uk', () => {
    expect(detectCountryFromUrl('https://www.gov.uk/apply-electronic-travel-authorisation')).toBe('GBR');
  });

  it('detects Canada from www.canada.ca', () => {
    expect(detectCountryFromUrl('https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/eta.html')).toBe('CAN');
  });

  it('returns null for unknown domains', () => {
    expect(detectCountryFromUrl('https://www.google.com')).toBeNull();
  });

  it('returns null for invalid URLs', () => {
    expect(detectCountryFromUrl('not-a-url')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(detectCountryFromUrl('')).toBeNull();
  });
});

describe('matchField', () => {
  describe('Strategy 1: autocomplete attribute', () => {
    it('matches given-name to givenNames', () => {
      const result = matchField({ autocomplete: 'given-name' }, mockSchema);
      expect(result).not.toBeNull();
      expect(result!.field.id).toBe('givenNames');
      expect(result!.confidence).toBe('high');
      expect(result!.strategy).toBe('autocomplete');
    });

    it('matches family-name to surname', () => {
      const result = matchField({ autocomplete: 'family-name' }, mockSchema);
      expect(result).not.toBeNull();
      expect(result!.field.id).toBe('surname');
      expect(result!.confidence).toBe('high');
      expect(result!.strategy).toBe('autocomplete');
    });

    it('matches email autocomplete', () => {
      const result = matchField({ autocomplete: 'email' }, mockSchema);
      expect(result).not.toBeNull();
      expect(result!.field.id).toBe('email');
      expect(result!.confidence).toBe('high');
    });

    it('matches tel autocomplete to phoneNumber', () => {
      const result = matchField({ autocomplete: 'tel' }, mockSchema);
      expect(result).not.toBeNull();
      expect(result!.field.id).toBe('phoneNumber');
    });

    it('matches bday to dateOfBirth', () => {
      const result = matchField({ autocomplete: 'bday' }, mockSchema);
      expect(result).not.toBeNull();
      expect(result!.field.id).toBe('dateOfBirth');
    });

    it('strips section prefix from autocomplete', () => {
      const result = matchField({ autocomplete: 'shipping given-name' }, mockSchema);
      expect(result).not.toBeNull();
      expect(result!.field.id).toBe('givenNames');
    });

    it('handles case-insensitive autocomplete', () => {
      const result = matchField({ autocomplete: 'Family-Name' }, mockSchema);
      expect(result).not.toBeNull();
      expect(result!.field.id).toBe('surname');
    });

    it('returns null for unrecognized autocomplete values', () => {
      const result = matchField({ autocomplete: 'cc-number' }, mockSchema);
      expect(result).toBeNull();
    });
  });

  describe('Strategy 2: portalFieldName matching', () => {
    it('matches exact portal field name (case-insensitive)', () => {
      const result = matchField({ labelText: 'Passport number' }, mockSchema);
      expect(result).not.toBeNull();
      expect(result!.field.id).toBe('passportNumber');
      expect(result!.confidence).toBe('high');
      expect(result!.strategy).toBe('portalFieldName');
    });

    it('matches portal field name with different casing', () => {
      const result = matchField({ labelText: 'passport number' }, mockSchema);
      expect(result).not.toBeNull();
      expect(result!.field.id).toBe('passportNumber');
    });

    it('matches multi-word portal field names', () => {
      const result = matchField({ labelText: 'Nationality or citizenship' }, mockSchema);
      expect(result).not.toBeNull();
      expect(result!.field.id).toBe('nationality');
    });

    it('does not match partial portal field names', () => {
      const result = matchField({ labelText: 'Passport' }, mockSchema);
      // Should fall through to fuzzy match, not portalFieldName
      expect(result?.strategy).not.toBe('portalFieldName');
    });
  });

  describe('Strategy 3: name/id attribute matching', () => {
    it('matches exact field ID via name attribute', () => {
      const result = matchField({ name: 'passportNumber' }, mockSchema);
      expect(result).not.toBeNull();
      expect(result!.field.id).toBe('passportNumber');
      expect(result!.confidence).toBe('medium');
      expect(result!.strategy).toBe('fieldId');
    });

    it('matches exact field ID via id attribute', () => {
      const result = matchField({ id: 'surname' }, mockSchema);
      expect(result).not.toBeNull();
      expect(result!.field.id).toBe('surname');
      expect(result!.confidence).toBe('medium');
    });

    it('matches field ID as substring of name', () => {
      const result = matchField({ name: 'input_passportNumber_1' }, mockSchema);
      expect(result).not.toBeNull();
      expect(result!.field.id).toBe('passportNumber');
    });

    it('handles case-insensitive matching', () => {
      const result = matchField({ name: 'PASSPORTNUMBER' }, mockSchema);
      expect(result).not.toBeNull();
      expect(result!.field.id).toBe('passportNumber');
    });
  });

  describe('Strategy 4: fuzzy matching', () => {
    it('matches label text against schema field label', () => {
      const result = matchField({ labelText: 'Given name' }, mockSchema);
      expect(result).not.toBeNull();
      expect(result!.field.id).toBe('givenNames');
      // Could be portalFieldName (exact match) or fuzzy
    });

    it('matches placeholder text', () => {
      const result = matchField({ placeholder: 'Enter your surname' }, mockSchema);
      expect(result).not.toBeNull();
      expect(result!.field.id).toBe('surname');
      expect(result!.confidence).toBe('low');
      expect(result!.strategy).toBe('fuzzy');
    });

    it('returns null when no match is found', () => {
      const result = matchField({
        placeholder: 'Credit card number',
        name: 'ccNumber',
        id: 'cc_field',
      }, mockSchema);
      expect(result).toBeNull();
    });
  });

  describe('strategy priority', () => {
    it('prefers autocomplete over portalFieldName', () => {
      const result = matchField({
        autocomplete: 'given-name',
        labelText: 'Surname', // would match a different field
      }, mockSchema);
      expect(result).not.toBeNull();
      expect(result!.field.id).toBe('givenNames');
      expect(result!.strategy).toBe('autocomplete');
    });

    it('prefers portalFieldName over name/id', () => {
      const result = matchField({
        labelText: 'Passport number',
        name: 'surname', // would match a different field
      }, mockSchema);
      expect(result).not.toBeNull();
      expect(result!.field.id).toBe('passportNumber');
      expect(result!.strategy).toBe('portalFieldName');
    });

    it('prefers name over id', () => {
      const result = matchField({
        name: 'passportNumber',
        id: 'surname',
      }, mockSchema);
      expect(result).not.toBeNull();
      expect(result!.field.id).toBe('passportNumber');
    });
  });
});

describe('matchAllFields', () => {
  it('matches multiple input elements', () => {
    const inputs: InputAttributes[] = [
      { autocomplete: 'given-name' },
      { autocomplete: 'family-name' },
      { labelText: 'Passport number' },
    ];

    const results = matchAllFields(inputs, mockSchema);

    expect(results.size).toBe(3);
    expect(results.get(inputs[0])!.field.id).toBe('givenNames');
    expect(results.get(inputs[1])!.field.id).toBe('surname');
    expect(results.get(inputs[2])!.field.id).toBe('passportNumber');
  });

  it('skips inputs that cannot be matched', () => {
    const inputs: InputAttributes[] = [
      { autocomplete: 'given-name' },
      { name: 'unknownField', id: 'xyz' },
    ];

    const results = matchAllFields(inputs, mockSchema);

    expect(results.size).toBe(1);
    expect(results.get(inputs[0])!.field.id).toBe('givenNames');
    expect(results.has(inputs[1])).toBe(false);
  });

  it('returns empty map when no inputs match', () => {
    const inputs: InputAttributes[] = [
      { name: 'creditCard' },
      { id: 'cvv' },
    ];

    const results = matchAllFields(inputs, mockSchema);
    expect(results.size).toBe(0);
  });
});
