import { CountryFormSchema } from '../../src/types/schema';
import { validateSchemaCompletely, loadSchema } from '../../src/services/schemas/schemaLoader';
import { getSchemaByCountryCode } from '../../src/schemas';
import CAN from '../../src/schemas/CAN.json';

describe('Canada (CAN) Schema', () => {
  const schema = CAN as CountryFormSchema;

  // ── 1. Schema structure fields ──────────────────────────────────────────────

  test('should have correct country metadata', () => {
    expect(schema.countryCode).toBe('CAN');
    expect(schema.countryName).toBe('Canada');
    expect(schema.portalName).toBe('Electronic Travel Authorization (eTA) — Archived');
    expect(schema.portalUrl).toBe(
      'https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/eta.html',
    );
    expect(schema.schemaVersion).toBe('2.1.0');
  });

  test('should have lastUpdated in ISO format', () => {
    expect(schema.lastUpdated).toBeDefined();
    expect(() => new Date(schema.lastUpdated)).not.toThrow();
  });

  // ── 2. Archive handling ─────────────────────────────────────────────────────

  test('should have implementationStatus set to archived', () => {
    expect(schema.metadata).toBeDefined();
    expect(schema.metadata.implementationStatus).toBe('archived');
  });

  test('should have a non-empty archiveReason', () => {
    const archiveReason = schema.metadata.archiveReason;
    expect(archiveReason).toBeDefined();
    expect(typeof archiveReason).toBe('string');
    expect(archiveReason!.trim().length).toBeGreaterThan(0);
  });

  test('archiveReason should mention ArriveCAN or discontinued', () => {
    const archiveReason = schema.metadata.archiveReason!;
    const reason = archiveReason.toLowerCase();
    const mentionsContext = reason.includes('arrivecan') || reason.includes('discontinued');
    expect(mentionsContext).toBe(true);
  });

  // ── 3. Metadata fields ──────────────────────────────────────────────────────

  test('should have metadata with expected fields', () => {
    const metadata = schema.metadata;
    expect(metadata.priority).toBe(8);
    expect(metadata.complexity).toBe('medium');
    expect(metadata.popularity).toBe(75);
    expect(metadata.supportedLanguages).toContain('en');
    expect(metadata.supportedLanguages).toContain('fr');
    expect(metadata.maintenanceFrequency).toBe('as_needed');
  });

  // ── 4. Submission timing duration strings ───────────────────────────────────

  test('should have valid submission timing requirements', () => {
    expect(schema.submission).toBeDefined();
    expect(schema.submission.earliestBeforeArrival).toBe('730d');
    expect(schema.submission.latestBeforeArrival).toBe('0h');
    expect(schema.submission.recommended).toBe('72h');
    expect(schema.submission.processingTime).toBe('24h');
  });

  test('submission timing values should match duration string format (number + unit)', () => {
    const durationPattern = /^\d+[dhm]$/;
    expect(schema.submission.earliestBeforeArrival).toMatch(durationPattern);
    expect(schema.submission.latestBeforeArrival).toMatch(durationPattern);
    expect(schema.submission.recommended).toMatch(durationPattern);
    expect(schema.submission.processingTime).toMatch(durationPattern);
  });

  // ── 5. changeDetection.monitoredSelectors ───────────────────────────────────

  test('should have changeDetection with non-empty monitoredSelectors', () => {
    expect(schema.changeDetection).toBeDefined();
    expect(schema.changeDetection.monitoredSelectors).toBeDefined();
    expect(schema.changeDetection.monitoredSelectors.length).toBeGreaterThan(0);
  });

  test('monitoredSelectors should be CSS selector strings', () => {
    schema.changeDetection.monitoredSelectors.forEach((selector: string) => {
      expect(typeof selector).toBe('string');
      expect(selector.trim().length).toBeGreaterThan(0);
    });
  });

  // ── 6. Portal flow ──────────────────────────────────────────────────────────

  test('portalFlow should not require an account', () => {
    expect(schema.portalFlow).toBeDefined();
    expect(schema.portalFlow.requiresAccount).toBe(false);
  });

  test('portalFlow should support multi-step but not save progress', () => {
    expect(schema.portalFlow.multiStep).toBe(true);
    expect(schema.portalFlow.canSaveProgress).toBe(false);
  });

  test('portalFlow prerequisites should include passport and payment', () => {
    const prerequisites = schema.portalFlow.prerequisites;
    expect(prerequisites).toBeDefined();
    expect(prerequisites!.length).toBeGreaterThanOrEqual(2);

    const types = prerequisites!.map(p => p.type);
    expect(types).toContain('document');
    expect(types).toContain('payment');

    const paymentPrereq = prerequisites!.find(p => p.type === 'payment');
    expect(paymentPrereq!.required).toBe(true);

    const descriptions = prerequisites!.map(p => p.description.toLowerCase());
    expect(descriptions.some(d => d.includes('passport'))).toBe(true);
  });

  // ── 7. Sections structure ───────────────────────────────────────────────────

  test('should have all required sections', () => {
    const sectionIds = schema.sections.map(s => s.id);
    expect(sectionIds).toContain('personal');
    expect(sectionIds).toContain('nationality');
    expect(sectionIds).toContain('passport');
    expect(sectionIds).toContain('contact');
    expect(sectionIds).toContain('address');
    expect(sectionIds).toContain('employment');
    expect(sectionIds).toContain('travel');
    expect(sectionIds).toContain('background');
  });

  // ── 8. Required fields with valid autoFillSource paths ─────────────────────

  test('personal section should have core required fields with autoFillSource', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    expect(personalSection).toBeDefined();

    const surnameField = personalSection.fields.find(f => f.id === 'surname')!;
    expect(surnameField.required).toBe(true);
    expect(surnameField.autoFillSource).toBe('profile.surname');

    const givenNamesField = personalSection.fields.find(f => f.id === 'givenNames')!;
    expect(givenNamesField.required).toBe(true);
    expect(givenNamesField.autoFillSource).toBe('profile.givenNames');

    const dobField = personalSection.fields.find(f => f.id === 'dateOfBirth')!;
    expect(dobField.required).toBe(true);
    expect(dobField.autoFillSource).toBe('profile.dateOfBirth');

    const countryOfBirthField = personalSection.fields.find(f => f.id === 'countryOfBirth')!;
    expect(countryOfBirthField.required).toBe(true);
    expect(countryOfBirthField.autoFillSource).toBe('profile.countryOfBirth');

    const genderField = personalSection.fields.find(f => f.id === 'gender')!;
    expect(genderField.required).toBe(true);
    expect(genderField.autoFillSource).toBe('profile.gender');
  });

  test('passport section should have required passport fields with autoFillSource', () => {
    const passportSection = schema.sections.find(s => s.id === 'passport')!;
    expect(passportSection).toBeDefined();

    const fieldIds = passportSection.fields.map(f => f.id);
    expect(fieldIds).toContain('passportNumber');
    expect(fieldIds).toContain('passportCountry');
    expect(fieldIds).toContain('passportIssueDate');
    expect(fieldIds).toContain('passportExpiryDate');

    const passportNumberField = passportSection.fields.find(f => f.id === 'passportNumber')!;
    expect(passportNumberField.required).toBe(true);
    expect(passportNumberField.autoFillSource).toBe('profile.passportNumber');

    const passportExpiryField = passportSection.fields.find(f => f.id === 'passportExpiryDate')!;
    expect(passportExpiryField.required).toBe(true);
    expect(passportExpiryField.autoFillSource).toBe('profile.passportExpiry');
  });

  test('fields with autoFillSource should reference valid profile or leg paths', () => {
    const validPrefixes = ['profile.', 'leg.'];

    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        const autoFill = field.autoFillSource;
        if (autoFill) {
          const hasValidPrefix = validPrefixes.some(prefix => autoFill.startsWith(prefix));
          expect(hasValidPrefix).toBe(true);
        }
      });
    });
  });

  test('all required fields should have required set to true (boolean)', () => {
    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        expect(typeof field.required).toBe('boolean');
      });
    });
  });

  // ── 9. Optional fields with correct defaults ────────────────────────────────

  test('employerName should be optional (required: false) with autoFillSource', () => {
    const employmentSection = schema.sections.find(s => s.id === 'employment')!;
    expect(employmentSection).toBeDefined();

    const employerNameField = employmentSection.fields.find(f => f.id === 'employerName')!;
    expect(employerNameField).toBeDefined();
    expect(employerNameField.required).toBe(false);
    expect(employerNameField.autoFillSource).toBe('profile.employerName');
  });

  // ── 10. Field validation rules ──────────────────────────────────────────────

  test('email field should have a validation pattern', () => {
    const contactSection = schema.sections.find(s => s.id === 'contact')!;
    expect(contactSection).toBeDefined();

    const emailField = contactSection.fields.find(f => f.id === 'email')!;
    expect(emailField).toBeDefined();
    expect(emailField.required).toBe(true);
    expect((emailField as any).validation).toBeDefined();
    expect((emailField as any).validation!.pattern).toBeDefined();
    expect((emailField as any).validation!.pattern).toContain('@');
  });

  test('confirmEmail field should also have a validation pattern', () => {
    const contactSection = schema.sections.find(s => s.id === 'contact')!;
    const confirmEmailField = contactSection.fields.find(f => f.id === 'confirmEmail')!;

    expect(confirmEmailField).toBeDefined();
    expect(confirmEmailField.required).toBe(true);
    expect(confirmEmailField.countrySpecific).toBe(true);
    expect((confirmEmailField as any).validation).toBeDefined();
    expect((confirmEmailField as any).validation!.pattern).toBeDefined();
  });

  // ── 11. Country-specific fields ─────────────────────────────────────────────

  test('gender field should have three options including non-binary option', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    const genderField = personalSection.fields.find(f => f.id === 'gender')!;

    expect(genderField.type).toBe('select');
    const genderValues = genderField.options!.map(o => o.value);
    expect(genderValues).toContain('M');
    expect(genderValues).toContain('F');
    expect(genderValues).toContain('X');
  });

  test('maritalStatus field should be country-specific with multiple options', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    const maritalStatusField = personalSection.fields.find(f => f.id === 'maritalStatus')!;

    expect(maritalStatusField).toBeDefined();
    expect(maritalStatusField.countrySpecific).toBe(true);
    expect(maritalStatusField.required).toBe(true);
    expect(maritalStatusField.type).toBe('select');

    const statusValues = maritalStatusField.options!.map(o => o.value);
    expect(statusValues).toContain('single');
    expect(statusValues).toContain('married');
    expect(statusValues).toContain('divorced');
    expect(statusValues).toContain('widowed');
  });

  test('travel section should have Canada-specific purposeOfVisit field', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    expect(travelSection).toBeDefined();

    const purposeField = travelSection.fields.find(f => f.id === 'purposeOfVisit')!;
    expect(purposeField).toBeDefined();
    expect(purposeField.countrySpecific).toBe(true);
    expect(purposeField.required).toBe(true);

    const purposes = purposeField.options!.map(o => o.value);
    expect(purposes).toContain('tourism');
    expect(purposes).toContain('business');
    expect(purposes).toContain('transit');
  });

  test('background section should have Canada-specific security questions', () => {
    const backgroundSection = schema.sections.find(s => s.id === 'background')!;
    expect(backgroundSection).toBeDefined();

    const fieldIds = backgroundSection.fields.map(f => f.id);
    expect(fieldIds).toContain('criminalOffence');
    expect(fieldIds).toContain('immigrationOffence');
    expect(fieldIds).toContain('medicalCondition');
    expect(fieldIds).toContain('tuberculosis');
    expect(fieldIds).toContain('governmentPosition');
    expect(fieldIds).toContain('militaryService');
    expect(fieldIds).toContain('warCrimes');

    backgroundSection.fields.forEach(field => {
      expect(field.countrySpecific).toBe(true);
      expect(field.type).toBe('boolean');
      expect(field.required).toBe(true);
    });
  });

  // ── 12. Submission guide ────────────────────────────────────────────────────

  test('should have complete submission guide with 14 steps', () => {
    expect(schema.submissionGuide).toHaveLength(14);
  });

  test('submission guide steps should have incrementing order', () => {
    const orders = schema.submissionGuide.map(s => s.order);
    orders.forEach((order, index) => {
      expect(order).toBe(index + 1);
    });
  });

  test('each submission guide step should have non-empty title and description', () => {
    schema.submissionGuide.forEach(step => {
      expect(step.title).toEqual(expect.stringMatching(/\S/));
      expect(step.description).toEqual(expect.stringMatching(/\S/));
    });
  });

  test('submission guide should reference valid field IDs', () => {
    const allFieldIds = new Set<string>();
    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        allFieldIds.add(field.id);
      });
    });

    schema.submissionGuide.forEach(step => {
      step.fieldsOnThisScreen.forEach(fieldId => {
        expect(allFieldIds.has(fieldId)).toBe(true);
      });
    });
  });

  // ── 13. Uniqueness & integrity ──────────────────────────────────────────────

  test('should have unique field IDs across all sections', () => {
    const allFieldIds = new Set<string>();

    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        expect(allFieldIds.has(field.id)).toBe(false);
        allFieldIds.add(field.id);
      });
    });
  });

  test('should validate against schema structure', () => {
    expect(() => {
      const validatedSchema = loadSchema(schema, 'CAN');
      validateSchemaCompletely(validatedSchema);
    }).not.toThrow();
  });

  test('should be accessible via schema registry', async () => {
    const registrySchema = await getSchemaByCountryCode('CAN');
    expect(registrySchema).toBeDefined();
    expect(registrySchema?.countryCode).toBe('CAN');
  });
});
