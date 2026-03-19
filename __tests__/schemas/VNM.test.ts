import { getSchemaByCountryCode } from '../../src/schemas';
import VNM from '../../src/schemas/VNM.json';

describe('Vietnam (VNM) Schema', () => {
  const schema = VNM;

  test('should have correct country metadata', () => {
    expect(schema.countryCode).toBe('VNM');
    expect(schema.countryName).toBe('Vietnam');
    expect(schema.portalName).toBe('Vietnam e-Visa Portal');
    expect(schema.portalUrl).toBe('https://evisa.xuatnhapcanh.gov.vn/');
    expect(schema.schemaVersion).toBe('2.0.0');
  });

  test('should have valid submission timing requirements', () => {
    expect(schema.submission).toBeDefined();
    expect(schema.submission.earliestBeforeArrival).toBe('30d');
    expect(schema.submission.recommended).toBe('14d');
  });

  test('latestBeforeArrival should be 3d — e-visa must be applied well before travel', () => {
    expect(schema.submission.latestBeforeArrival).toBe('3d');
  });

  test('portalFlow should not require account registration', () => {
    expect(schema.portalFlow).toBeDefined();
    expect(schema.portalFlow.requiresAccount).toBe(false);
  });

  test('implementation status should be planned', () => {
    expect(schema.metadata).toBeDefined();
    expect(schema.metadata.implementationStatus).toBe('planned');
  });

  test('should have all required sections', () => {
    expect(schema.sections).toHaveLength(5);

    const sectionIds = schema.sections.map(s => s.id);
    expect(sectionIds).toContain('personal');
    expect(sectionIds).toContain('passport');
    expect(sectionIds).toContain('travel');
    expect(sectionIds).toContain('accommodation');
    expect(sectionIds).toContain('contact');
  });

  test('personal section should include Vietnam-specific religion field', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal');
    expect(personalSection).toBeDefined();

    const fieldIds = personalSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('surname');
    expect(fieldIds).toContain('givenName');
    expect(fieldIds).toContain('dateOfBirth');
    expect(fieldIds).toContain('religion');

    const religionField = personalSection!.fields.find(f => f.id === 'religion');
    expect(religionField).toBeDefined();
    expect(religionField!.countrySpecific).toBe(true);
    expect(religionField!.required).toBe(true);
  });

  test('religion field should have expected options', () => {
    const personalSection = schema.sections.find(s => s.id === 'personal')!;
    const religionField = personalSection.fields.find(f => f.id === 'religion')!;

    const values = (religionField as any).options!.map((o: any) => o.value);
    expect(values).toContain('buddhism');
    expect(values).toContain('christianity');
    expect(values).toContain('islam');
    expect(values).toContain('none');
  });

  test('passport section should have all required passport fields', () => {
    const passportSection = schema.sections.find(s => s.id === 'passport');
    expect(passportSection).toBeDefined();

    const fieldIds = passportSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('passportNumber');
    expect(fieldIds).toContain('passportExpiry');
    expect(fieldIds).toContain('passportIssuedDate');
    expect(fieldIds).toContain('passportIssuingAuthority');
    expect(fieldIds).toContain('passportType');
  });

  test('passport expiry should auto-fill from profile', () => {
    const passportSection = schema.sections.find(s => s.id === 'passport')!;
    const expiryField = passportSection.fields.find(f => f.id === 'passportExpiry')!;

    expect(expiryField.required).toBe(true);
    expect((expiryField as any).autoFillSource).toBe('profile.passportExpiry');
  });

  test('travel section should have Vietnam-specific port of entry field', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel');
    expect(travelSection).toBeDefined();

    const entryPortField = travelSection!.fields.find(f => f.id === 'entryPort');
    expect(entryPortField).toBeDefined();
    expect(entryPortField!.countrySpecific).toBe(true);

    const portCodes = (entryPortField as any).options!.map((o: any) => o.value);
    expect(portCodes).toContain('SGN');
    expect(portCodes).toContain('HAN');
    expect(portCodes).toContain('DAD');
  });

  test('purpose of visit should have Vietnam-specific options', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel');
    const purposeField = travelSection!.fields.find(f => f.id === 'purposeOfVisit');

    expect(purposeField).toBeDefined();
    expect(purposeField!.countrySpecific).toBe(true);

    const purposes = (purposeField as any).options!.map((o: any) => o.value);
    expect(purposes).toContain('tourism');
    expect(purposes).toContain('business');
    expect(purposes).toContain('family_visit');
    expect(purposes).toContain('transit');
  });

  test('stay duration should have validation limits matching tourist e-visa max', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const durationField = travelSection.fields.find(f => f.id === 'stayDuration')!;

    expect(durationField).toBeDefined();
    expect((durationField as any).validation).toBeDefined();
    expect((durationField as any).validation!.min).toBe(1);
    expect((durationField as any).validation!.max).toBe(30);
  });

  test('previousVietnamVisit should be a Vietnam-specific boolean field', () => {
    const travelSection = schema.sections.find(s => s.id === 'travel')!;
    const prevVisitField = travelSection.fields.find(f => f.id === 'previousVietnamVisit')!;

    expect(prevVisitField).toBeDefined();
    expect(prevVisitField.type).toBe('boolean');
    expect(prevVisitField.countrySpecific).toBe(true);
    expect(prevVisitField.required).toBe(true);
  });

  test('accommodation section should have Vietnam city/province selector', () => {
    const accommodationSection = schema.sections.find(s => s.id === 'accommodation');
    expect(accommodationSection).toBeDefined();

    const cityField = accommodationSection!.fields.find(f => f.id === 'cityOfStay');
    expect(cityField).toBeDefined();
    expect(cityField!.countrySpecific).toBe(true);

    const cities = (cityField as any).options!.map((o: any) => o.value);
    expect(cities).toContain('hanoi');
    expect(cities).toContain('ho_chi_minh');
    expect(cities).toContain('da_nang');
    expect(cities).toContain('phu_quoc');
  });

  test('accommodation address should be textarea type', () => {
    const accommodationSection = schema.sections.find(s => s.id === 'accommodation')!;
    const addressField = accommodationSection.fields.find(f => f.id === 'hotelAddress')!;

    expect(addressField.type).toBe('textarea');
  });

  test('contact section should have emergency contact fields', () => {
    const contactSection = schema.sections.find(s => s.id === 'contact');
    expect(contactSection).toBeDefined();

    const fieldIds = contactSection!.fields.map(f => f.id);
    expect(fieldIds).toContain('email');
    expect(fieldIds).toContain('phoneNumber');
    expect(fieldIds).toContain('emergencyContactName');
    expect(fieldIds).toContain('emergencyContactPhone');

    const emergencyNameField = contactSection!.fields.find(f => f.id === 'emergencyContactName')!;
    expect(emergencyNameField.countrySpecific).toBe(true);

    const emergencyPhoneField = contactSection!.fields.find(f => f.id === 'emergencyContactPhone')!;
    expect(emergencyPhoneField.countrySpecific).toBe(true);
  });

  test('email field should have validation pattern', () => {
    const contactSection = schema.sections.find(s => s.id === 'contact')!;
    const emailField = contactSection.fields.find(f => f.id === 'email')!;

    expect((emailField as any).validation).toBeDefined();
    expect((emailField as any).validation!.pattern).toBeDefined();
    expect((emailField as any).validation!.pattern).toContain('@');
  });

  test('should have complete submission guide with 10 steps', () => {
    expect(schema.submissionGuide).toHaveLength(10);

    const stepTitles = schema.submissionGuide.map(s => s.title);
    expect(stepTitles).toContain('Access Vietnam e-Visa Portal');
    expect(stepTitles).toContain('Download Your e-Visa');
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

  test('should have unique field IDs across all sections', () => {
    const allFieldIds = new Set<string>();

    schema.sections.forEach(section => {
      section.fields.forEach(field => {
        expect(allFieldIds.has(field.id)).toBe(false);
        allFieldIds.add(field.id);
      });
    });
  });

  test('should be accessible via schema registry', async () => {
    const registrySchema = await getSchemaByCountryCode('VNM');
    expect(registrySchema).toBeDefined();
    expect(registrySchema?.countryCode).toBe('VNM');
  });

  test('portalFlow should support multi-step but not save progress', () => {
    expect(schema.portalFlow.multiStep).toBe(true);
    expect(schema.portalFlow.canSaveProgress).toBe(false);
  });

  test('portalFlow should require payment prerequisite', () => {
    const prerequisites = schema.portalFlow.prerequisites;
    expect(prerequisites).toBeDefined();

    const paymentPrereq = prerequisites!.find((p: any) => p.type === 'payment');
    expect(paymentPrereq).toBeDefined();
    expect(paymentPrereq!.required).toBe(true);
  });
});
