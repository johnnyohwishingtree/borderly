/**
 * Unit tests for TripCard component — submission completion indicator.
 *
 * Covers:
 * - Zero submitted: none of the legs have submissionStatus === 'submitted'
 * - Partial submitted: some legs submitted, indicator shows X/N
 * - Full (all) submitted: all legs submitted, distinct "All submitted" state shown
 * - Indicator is hidden when showProgress=false or there are no legs
 */

import { render, screen } from '@testing-library/react-native';
import TripCard from '../../../src/components/trips/TripCard';
import type { Trip, TripLeg } from '../../../src/types/trip';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLeg(overrides: Partial<TripLeg> = {}): TripLeg {
  return {
    id: `leg-${Math.random()}`,
    tripId: 'trip-001',
    destinationCountry: 'JPN',
    arrivalDate: '2025-08-01',
    departureDate: '2025-08-10',
    formStatus: 'not_started',
    submissionStatus: 'not_started',
    order: 0,
    accommodation: {
      name: 'Tokyo Hotel',
      address: {
        line1: '1-1 Shinjuku',
        city: 'Tokyo',
        postalCode: '160-0022',
        country: 'Japan',
      },
    },
    ...overrides,
  };
}

function makeTrip(overrides?: Partial<Trip>): Trip {
  return {
    id: 'trip-001',
    name: 'Asia Adventure 2025',
    status: 'upcoming',
    legs: [
      makeLeg({ id: 'leg-001', order: 0 }),
      makeLeg({ id: 'leg-002', destinationCountry: 'MYS', order: 1 }),
      makeLeg({ id: 'leg-003', destinationCountry: 'SGP', order: 2 }),
    ],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Zero submitted state
// ---------------------------------------------------------------------------

describe('TripCard — zero submitted', () => {
  it('renders submission indicator showing 0/N submitted', () => {
    const trip = makeTrip({
      legs: [
        makeLeg({ id: 'leg-001', submissionStatus: 'not_started' }),
        makeLeg({ id: 'leg-002', submissionStatus: 'not_started' }),
        makeLeg({ id: 'leg-003', submissionStatus: 'not_started' }),
      ],
    });
    render(<TripCard trip={trip} />);
    const indicator = screen.getByTestId('trip-card-submission-indicator');
    expect(indicator).toBeTruthy();
    expect(indicator.props.accessibilityLabel).toBe('0 of 3 legs submitted');
  });

  it('shows "0/3 submitted" text for zero-submitted state', () => {
    const trip = makeTrip({
      legs: [
        makeLeg({ id: 'leg-001', submissionStatus: 'not_started' }),
        makeLeg({ id: 'leg-002', submissionStatus: 'in_progress' }),
        makeLeg({ id: 'leg-003', submissionStatus: 'not_started' }),
      ],
    });
    render(<TripCard trip={trip} />);
    expect(screen.getByText('0/3 submitted')).toBeTruthy();
  });

  it('does NOT render the "All submitted" checkmark text', () => {
    const trip = makeTrip({
      legs: [makeLeg({ id: 'leg-001', submissionStatus: 'not_started' })],
    });
    render(<TripCard trip={trip} />);
    expect(screen.queryByText('✓ All submitted')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Partial submitted state
// ---------------------------------------------------------------------------

describe('TripCard — partial submitted', () => {
  it('renders submission indicator showing X/N submitted', () => {
    const trip = makeTrip({
      legs: [
        makeLeg({ id: 'leg-001', submissionStatus: 'submitted' }),
        makeLeg({ id: 'leg-002', submissionStatus: 'submitted' }),
        makeLeg({ id: 'leg-003', submissionStatus: 'not_started' }),
      ],
    });
    render(<TripCard trip={trip} />);
    const indicator = screen.getByTestId('trip-card-submission-indicator');
    expect(indicator.props.accessibilityLabel).toBe('2 of 3 legs submitted');
  });

  it('shows correct X/N text for partial submission', () => {
    const trip = makeTrip({
      legs: [
        makeLeg({ id: 'leg-001', submissionStatus: 'submitted' }),
        makeLeg({ id: 'leg-002', submissionStatus: 'not_started' }),
        makeLeg({ id: 'leg-003', submissionStatus: 'not_started' }),
      ],
    });
    render(<TripCard trip={trip} />);
    expect(screen.getByText('1/3 submitted')).toBeTruthy();
  });

  it('counts only "submitted" legs — not "in_progress"', () => {
    const trip = makeTrip({
      legs: [
        makeLeg({ id: 'leg-001', submissionStatus: 'submitted' }),
        makeLeg({ id: 'leg-002', submissionStatus: 'in_progress' }),
        makeLeg({ id: 'leg-003', submissionStatus: 'not_started' }),
      ],
    });
    render(<TripCard trip={trip} />);
    const indicator = screen.getByTestId('trip-card-submission-indicator');
    expect(indicator.props.accessibilityLabel).toBe('1 of 3 legs submitted');
  });

  it('does NOT render the "All submitted" checkmark text', () => {
    const trip = makeTrip({
      legs: [
        makeLeg({ id: 'leg-001', submissionStatus: 'submitted' }),
        makeLeg({ id: 'leg-002', submissionStatus: 'not_started' }),
      ],
    });
    render(<TripCard trip={trip} />);
    expect(screen.queryByText('✓ All submitted')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Full (all) submitted state
// ---------------------------------------------------------------------------

describe('TripCard — all submitted', () => {
  it('renders submission indicator with "All legs submitted" accessibility label', () => {
    const trip = makeTrip({
      legs: [
        makeLeg({ id: 'leg-001', submissionStatus: 'submitted' }),
        makeLeg({ id: 'leg-002', submissionStatus: 'submitted' }),
        makeLeg({ id: 'leg-003', submissionStatus: 'submitted' }),
      ],
    });
    render(<TripCard trip={trip} />);
    const indicator = screen.getByTestId('trip-card-submission-indicator');
    expect(indicator.props.accessibilityLabel).toBe('All legs submitted');
  });

  it('shows the distinct "✓ All submitted" text', () => {
    const trip = makeTrip({
      legs: [
        makeLeg({ id: 'leg-001', submissionStatus: 'submitted' }),
        makeLeg({ id: 'leg-002', submissionStatus: 'submitted' }),
      ],
    });
    render(<TripCard trip={trip} />);
    expect(screen.getByText('✓ All submitted')).toBeTruthy();
  });

  it('does NOT show the fractional X/N text when all submitted', () => {
    const trip = makeTrip({
      legs: [
        makeLeg({ id: 'leg-001', submissionStatus: 'submitted' }),
        makeLeg({ id: 'leg-002', submissionStatus: 'submitted' }),
      ],
    });
    render(<TripCard trip={trip} />);
    expect(screen.queryByText('2/2 submitted')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('TripCard — indicator visibility', () => {
  it('hides the submission indicator when showProgress=false', () => {
    const trip = makeTrip({
      legs: [makeLeg({ id: 'leg-001', submissionStatus: 'not_started' })],
    });
    render(<TripCard trip={trip} showProgress={false} />);
    expect(screen.queryByTestId('trip-card-submission-indicator')).toBeNull();
  });

  it('hides the submission indicator when the trip has no legs', () => {
    const trip = makeTrip({ legs: [] });
    render(<TripCard trip={trip} />);
    expect(screen.queryByTestId('trip-card-submission-indicator')).toBeNull();
  });

  it('renders indicator for a single leg trip — not submitted', () => {
    const trip = makeTrip({
      legs: [makeLeg({ id: 'leg-001', submissionStatus: 'not_started' })],
    });
    render(<TripCard trip={trip} />);
    const indicator = screen.getByTestId('trip-card-submission-indicator');
    expect(indicator.props.accessibilityLabel).toBe('0 of 1 legs submitted');
  });

  it('renders indicator for a single leg trip — submitted', () => {
    const trip = makeTrip({
      legs: [makeLeg({ id: 'leg-001', submissionStatus: 'submitted' })],
    });
    render(<TripCard trip={trip} />);
    const indicator = screen.getByTestId('trip-card-submission-indicator');
    expect(indicator.props.accessibilityLabel).toBe('All legs submitted');
  });
});

// ---------------------------------------------------------------------------
// Urgency badge
// ---------------------------------------------------------------------------

describe('TripCard — urgency badge', () => {
  it('shows urgency badge when urgency prop is overdue', () => {
    const trip = makeTrip();
    render(
      <TripCard
        trip={trip}
        urgency={{ level: 'overdue', hoursRemaining: -5, countryCode: 'JPN', label: 'Overdue' }}
      />,
    );
    expect(screen.getByTestId('trip-card-urgency-Asia Adventure 2025')).toBeTruthy();
    expect(screen.getByText('Overdue')).toBeTruthy();
  });

  it('shows urgency badge when urgency prop is critical', () => {
    const trip = makeTrip();
    render(
      <TripCard
        trip={trip}
        urgency={{ level: 'critical', hoursRemaining: 12, countryCode: 'JPN', label: 'Due in 12h' }}
      />,
    );
    expect(screen.getByText('Due in 12h')).toBeTruthy();
  });

  it('shows urgency badge when urgency prop is warning', () => {
    const trip = makeTrip();
    render(
      <TripCard
        trip={trip}
        urgency={{ level: 'warning', hoursRemaining: 36, countryCode: 'JPN', label: 'Due in 2d' }}
      />,
    );
    expect(screen.getByText('Due in 2d')).toBeTruthy();
  });

  it('does NOT show urgency badge when level is normal', () => {
    const trip = makeTrip();
    render(
      <TripCard
        trip={trip}
        urgency={{ level: 'normal', hoursRemaining: 100, countryCode: 'JPN', label: 'Due in 4d' }}
      />,
    );
    expect(screen.queryByTestId('trip-card-urgency-Asia Adventure 2025')).toBeNull();
  });

  it('does NOT show urgency badge for completed trips', () => {
    const trip = makeTrip({ status: 'completed' });
    render(
      <TripCard
        trip={trip}
        urgency={{ level: 'overdue', hoursRemaining: -5, countryCode: 'JPN', label: 'Overdue' }}
      />,
    );
    expect(screen.queryByTestId('trip-card-urgency-Asia Adventure 2025')).toBeNull();
  });

  it('does NOT show urgency badge when no urgency prop', () => {
    const trip = makeTrip();
    render(<TripCard trip={trip} />);
    expect(screen.queryByTestId('trip-card-urgency-Asia Adventure 2025')).toBeNull();
  });
});
