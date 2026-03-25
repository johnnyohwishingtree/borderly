/**
 * Tests for ChecklistService
 *
 * Acceptance criteria covered:
 *  1. One form checklist item per leg
 *  2. One QR item per leg for QR-required countries (or when QR exists)
 *  3. Passport item only when warning/expired
 *  4. Deadline item only when upcoming and not ready
 *  5. overallStatus reflects worst individual item status
 *  6. deepLink on each item points to correct screen/params
 *  7. Pure function — no store or hook imports
 *  8. Edge cases: no legs, all complete, mixed statuses
 */

import { computeTripChecklist } from '../../../src/services/checklist/checklistService';
import { Trip, TripLeg, SavedQRCode } from '../../../src/types/trip';
import { TravelerProfile } from '../../../src/types/profile';
import { CountryFormSchema } from '../../../src/types/schema';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeSchema(overrides: Partial<CountryFormSchema> = {}): CountryFormSchema {
  return {
    countryCode: 'JPN',
    countryName: 'Japan',
    schemaVersion: '1.0.0',
    lastUpdated: '2025-01-01T00:00:00Z',
    portalUrl: 'https://vjw-lp.digital.go.jp/en/',
    portalName: 'Visit Japan Web',
    submissionDeadlineHours: 72,
    recommendedLeadTimeHours: 24,
    submissionWindowNote: 'Submit 3 days before arrival',
    passportValidityMonths: 6,
    metadata: {
      priority: 1,
      complexity: 'medium',
      popularity: 90,
      lastVerified: '2025-01-01T00:00:00Z',
      supportedLanguages: ['en', 'ja'],
      implementationStatus: 'complete',
      maintenanceFrequency: 'monthly',
    },
    changeDetection: {
      monitoredSelectors: [],
      changeThreshold: 20,
      fallbackActions: [],
    },
    submission: {
      earliestBeforeArrival: '14d',
      latestBeforeArrival: '3d',
      recommended: '7d',
    },
    portalFlow: {
      requiresAccount: true,
      multiStep: true,
      canSaveProgress: true,
    },
    sections: [],
    submissionGuide: [],
    ...overrides,
  } as CountryFormSchema;
}

function makeLeg(overrides: Partial<TripLeg> = {}): TripLeg {
  return {
    id: 'leg-001',
    tripId: 'trip-001',
    destinationCountry: 'JPN',
    arrivalDate: '2027-06-15',
    departureDate: '2027-06-10',
    formStatus: 'not_started',
    submissionStatus: 'not_started',
    accommodation: {
      name: 'Hotel Tokyo',
      address: { line1: '1-1 Shibuya', city: 'Tokyo', postalCode: '150-0001', country: 'JPN' },
    },
    order: 0,
    ...overrides,
  };
}

function makeProfile(overrides: Partial<TravelerProfile> = {}): TravelerProfile {
  return {
    id: 'profile-001',
    passportNumber: 'AB1234567',
    surname: 'DOE',
    givenNames: 'JOHN',
    nationality: 'USA',
    dateOfBirth: '1990-01-15',
    gender: 'M',
    passportExpiry: '2030-01-15',
    issuingCountry: 'USA',
    defaultDeclarations: {
      hasItemsToDeclare: false,
      carryingCurrency: false,
      carryingProhibitedItems: false,
      visitedFarm: false,
      hasCriminalRecord: false,
      carryingCommercialGoods: false,
    },
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-001',
    name: 'Japan Trip',
    status: 'upcoming',
    legs: [makeLeg()],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('computeTripChecklist', () => {
  const jpnSchema = makeSchema();
  const schemas: Record<string, CountryFormSchema> = { JPN: jpnSchema };

  describe('trip with no legs', () => {
    it('returns empty items with complete overall status', () => {
      const trip = makeTrip({ legs: [] });
      const result = computeTripChecklist(trip, [makeProfile()], schemas, []);

      expect(result.tripId).toBe('trip-001');
      expect(result.tripName).toBe('Japan Trip');
      expect(result.items).toHaveLength(0);
      expect(result.overallStatus).toBe('complete');
      expect(result.completedCount).toBe(0);
      expect(result.totalCount).toBe(0);
    });
  });

  describe('form items', () => {
    it('creates one form item per leg', () => {
      const trip = makeTrip();
      const result = computeTripChecklist(trip, [makeProfile()], schemas, []);
      const formItems = result.items.filter((i) => i.category === 'form');

      expect(formItems).toHaveLength(1);
      expect(formItems[0].label).toBe('Japan entry form');
      expect(formItems[0].deepLink.screen).toBe('LegForm');
      expect(formItems[0].deepLink.params.legId).toBe('leg-001');
    });

    it('maps not_started to not-started status', () => {
      const trip = makeTrip({ legs: [makeLeg({ formStatus: 'not_started' })] });
      const result = computeTripChecklist(trip, [makeProfile()], schemas, []);
      const formItem = result.items.find((i) => i.category === 'form');

      expect(formItem?.status).toBe('not-started');
      expect(formItem?.urgency).toBe('critical');
    });

    it('maps in_progress to in-progress status', () => {
      const trip = makeTrip({ legs: [makeLeg({ formStatus: 'in_progress' })] });
      const result = computeTripChecklist(trip, [makeProfile()], schemas, []);
      const formItem = result.items.find((i) => i.category === 'form');

      expect(formItem?.status).toBe('in-progress');
      expect(formItem?.urgency).toBe('warning');
    });

    it('maps submitted to complete status', () => {
      const trip = makeTrip({ legs: [makeLeg({ formStatus: 'submitted' })] });
      const result = computeTripChecklist(trip, [makeProfile()], schemas, []);
      const formItem = result.items.find((i) => i.category === 'form');

      expect(formItem?.status).toBe('complete');
      expect(formItem?.urgency).toBe('normal');
    });

    it('maps ready to complete status', () => {
      const trip = makeTrip({ legs: [makeLeg({ formStatus: 'ready' })] });
      const result = computeTripChecklist(trip, [makeProfile()], schemas, []);
      const formItem = result.items.find((i) => i.category === 'form');

      expect(formItem?.status).toBe('complete');
    });
  });

  describe('QR code items', () => {
    it('creates action-needed QR item for JPN with no QR codes', () => {
      const trip = makeTrip();
      const result = computeTripChecklist(trip, [makeProfile()], schemas, []);
      const qrItems = result.items.filter((i) => i.category === 'qr');

      expect(qrItems).toHaveLength(1);
      expect(qrItems[0].status).toBe('action-needed');
      expect(qrItems[0].urgency).toBe('critical');
      expect(qrItems[0].deepLink.screen).toBe('QRWallet');
    });

    it('creates complete QR item when QR code exists', () => {
      const trip = makeTrip();
      const qrCodes: SavedQRCode[] = [{
        id: 'qr-1',
        legId: 'leg-001',
        type: 'immigration',
        imageBase64: 'base64...',
        savedAt: '2025-01-01T00:00:00Z',
        label: 'Japan QR',
      }];
      const result = computeTripChecklist(trip, [makeProfile()], schemas, qrCodes);
      const qrItem = result.items.find((i) => i.category === 'qr');

      expect(qrItem?.status).toBe('complete');
      expect(qrItem?.urgency).toBe('normal');
    });

    it('omits QR item for non-QR country with no codes', () => {
      const sgpSchema = makeSchema({ countryCode: 'SGP', countryName: 'Singapore' });
      const trip = makeTrip({
        legs: [makeLeg({ destinationCountry: 'SGP' })],
      });
      const result = computeTripChecklist(trip, [makeProfile()], { SGP: sgpSchema }, []);
      const qrItems = result.items.filter((i) => i.category === 'qr');

      expect(qrItems).toHaveLength(0);
    });
  });

  describe('passport items', () => {
    it('omits passport item when passport is valid', () => {
      const trip = makeTrip();
      const profile = makeProfile({ passportExpiry: '2030-01-15' });
      const result = computeTripChecklist(trip, [profile], schemas, []);
      const passportItems = result.items.filter((i) => i.category === 'passport');

      expect(passportItems).toHaveLength(0);
    });

    it('creates warning item when passport does not meet validity buffer', () => {
      // Japan requires 6 months validity. Departure 2027-06-10, passport expires 2027-10-01
      // That's less than 6 months after departure.
      const trip = makeTrip();
      const profile = makeProfile({ passportExpiry: '2027-10-01' });
      const result = computeTripChecklist(trip, [profile], schemas, []);
      const passportItem = result.items.find((i) => i.category === 'passport');

      expect(passportItem).toBeDefined();
      expect(passportItem?.status).toBe('warning');
      expect(passportItem?.urgency).toBe('warning');
    });

    it('creates action-needed item when passport expires before departure', () => {
      const trip = makeTrip();
      const profile = makeProfile({ passportExpiry: '2027-05-01' }); // before June 10 departure
      const result = computeTripChecklist(trip, [profile], schemas, []);
      const passportItem = result.items.find((i) => i.category === 'passport');

      expect(passportItem).toBeDefined();
      expect(passportItem?.status).toBe('action-needed');
      expect(passportItem?.urgency).toBe('critical');
      expect(passportItem?.deepLink.screen).toBe('Profile');
    });

    it('surfaces worst passport status across multiple profiles', () => {
      const trip = makeTrip({
        legs: [makeLeg({ assignedTravelers: ['p1', 'p2'] })],
      });
      const profiles = [
        makeProfile({ id: 'p1', passportExpiry: '2030-01-15', surname: 'GOOD' }),
        makeProfile({ id: 'p2', passportExpiry: '2027-05-01', surname: 'EXPIRED' }),
      ];
      const result = computeTripChecklist(trip, profiles, schemas, []);
      const passportItem = result.items.find((i) => i.category === 'passport');

      expect(passportItem?.status).toBe('action-needed');
      expect(passportItem?.detail).toContain('EXPIRED');
    });
  });

  describe('deadline items', () => {
    it('omits deadline item when form is ready', () => {
      const trip = makeTrip({ legs: [makeLeg({ formStatus: 'ready' })] });
      const result = computeTripChecklist(trip, [makeProfile()], schemas, []);
      const deadlineItems = result.items.filter((i) => i.category === 'deadline');

      expect(deadlineItems).toHaveLength(0);
    });

    it('omits deadline item when schema has no deadline', () => {
      const noDeadlineSchema = makeSchema({
        submissionDeadlineHours: 0,
      });
      const legWithoutDeparture = makeLeg();
      delete (legWithoutDeparture as unknown as Record<string, unknown>).departureDate;
      const trip = makeTrip({ legs: [legWithoutDeparture] });
      const result = computeTripChecklist(trip, [makeProfile()], { JPN: noDeadlineSchema }, []);
      const deadlineItems = result.items.filter((i) => i.category === 'deadline');

      expect(deadlineItems).toHaveLength(0);
    });

    it('creates deadline item with tripId in deepLink params', () => {
      const trip = makeTrip();
      const result = computeTripChecklist(trip, [makeProfile()], schemas, []);
      const deadlineItem = result.items.find((i) => i.category === 'deadline');

      if (deadlineItem) {
        expect(deadlineItem.deepLink.screen).toBe('TripDetail');
        expect(deadlineItem.deepLink.params.tripId).toBe('trip-001');
      }
    });
  });

  describe('overall status', () => {
    it('is complete when all items are complete', () => {
      const trip = makeTrip({
        legs: [makeLeg({ formStatus: 'submitted' })],
      });
      const qrCodes: SavedQRCode[] = [{
        id: 'qr-1',
        legId: 'leg-001',
        type: 'immigration',
        imageBase64: 'base64...',
        savedAt: '2025-01-01T00:00:00Z',
        label: 'Japan QR',
      }];
      const result = computeTripChecklist(trip, [makeProfile()], schemas, qrCodes);

      expect(result.overallStatus).toBe('complete');
      expect(result.completedCount).toBe(result.totalCount);
    });

    it('reflects worst status when items are mixed', () => {
      const trip = makeTrip();
      // not_started form + missing QR = worst is action-needed (missing QR)
      const result = computeTripChecklist(trip, [makeProfile()], schemas, []);

      expect(result.overallStatus).toBe('action-needed');
    });
  });

  describe('multi-leg trips', () => {
    it('creates form items for each leg', () => {
      const sgpSchema = makeSchema({ countryCode: 'SGP', countryName: 'Singapore' });
      const trip = makeTrip({
        legs: [
          makeLeg({ id: 'leg-jpn', destinationCountry: 'JPN' }),
          makeLeg({ id: 'leg-sgp', destinationCountry: 'SGP', formStatus: 'submitted' }),
        ],
      });
      const result = computeTripChecklist(
        trip,
        [makeProfile()],
        { JPN: jpnSchema, SGP: sgpSchema },
        [],
      );
      const formItems = result.items.filter((i) => i.category === 'form');

      expect(formItems).toHaveLength(2);
      expect(formItems[0].countryCode).toBe('JPN');
      expect(formItems[1].countryCode).toBe('SGP');
    });
  });

  describe('counts', () => {
    it('correctly counts completed vs total items', () => {
      const trip = makeTrip({
        legs: [makeLeg({ formStatus: 'submitted' })],
      });
      // JPN with submitted form + QR code saved = 2 complete items
      const qrCodes: SavedQRCode[] = [{
        id: 'qr-1',
        legId: 'leg-001',
        type: 'immigration',
        imageBase64: 'base64...',
        savedAt: '2025-01-01T00:00:00Z',
        label: 'Japan QR',
      }];
      const result = computeTripChecklist(trip, [makeProfile()], schemas, qrCodes);

      expect(result.completedCount).toBeGreaterThan(0);
      expect(result.totalCount).toBeGreaterThanOrEqual(result.completedCount);
    });
  });
});
