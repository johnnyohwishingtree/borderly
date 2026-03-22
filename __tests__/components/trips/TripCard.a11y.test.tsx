/**
 * Accessibility tests for the TripCard component.
 * Verifies accessibilityLabel, accessibilityRole, and accessibilityHint
 * are correctly set for both interactive and non-interactive variants.
 */

import { render, screen } from '@testing-library/react-native';
import TripCard from '../../../src/components/trips/TripCard';
import type { Trip } from '../../../src/types/trip';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTrip(overrides?: Partial<Trip>): Trip {
  return {
    id: 'trip-001',
    name: 'Asia Adventure 2025',
    status: 'upcoming',
    legs: [
      {
        id: 'leg-001',
        tripId: 'trip-001',
        destinationCountry: 'JPN',
        arrivalDate: '2025-08-01',
        departureDate: '2025-08-10',
        formStatus: 'not_started',
        submissionStatus: 'not_started',
        order: 0,
        accommodation: {
          name: 'Tokyo Hotel',
          address: { line1: '1-1 Shinjuku', city: 'Tokyo', postalCode: '160-0022', country: 'Japan' },
        },
      },
    ],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// accessibilityLabel
// ---------------------------------------------------------------------------

describe('TripCard accessibilityLabel', () => {
  it('has accessibilityLabel set to the trip name', () => {
    render(<TripCard trip={makeTrip()} onPress={jest.fn()} />);
    expect(screen.getByLabelText('Asia Adventure 2025')).toBeTruthy();
  });

  it('accessibilityLabel updates when trip name changes', () => {
    const trip = makeTrip({ name: 'Europe Summer 2026' });
    render(<TripCard trip={trip} onPress={jest.fn()} />);
    expect(screen.getByLabelText('Europe Summer 2026')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// accessibilityRole — interactive (onPress provided)
// ---------------------------------------------------------------------------

describe('TripCard accessibilityRole — interactive', () => {
  it('root element has accessibilityRole "button" when onPress is provided', () => {
    render(<TripCard trip={makeTrip()} onPress={jest.fn()} />);
    // TripCard uses testID based on trip name; check the root element's role via props
    const card = screen.getByTestId('trip-card-Asia Adventure 2025');
    expect(card.props.accessibilityRole).toBe('button');
  });

  it('has accessibilityHint "Opens trip details" when interactive', () => {
    render(<TripCard trip={makeTrip()} onPress={jest.fn()} />);
    const card = screen.getByTestId('trip-card-Asia Adventure 2025');
    expect(card.props.accessibilityHint).toBe('Opens trip details');
  });
});

// ---------------------------------------------------------------------------
// accessibilityRole — non-interactive (no onPress)
// ---------------------------------------------------------------------------

describe('TripCard accessibilityRole — non-interactive', () => {
  it('has no accessibilityRole when onPress is not provided', () => {
    render(<TripCard trip={makeTrip()} />);
    const card = screen.getByTestId('trip-card-Asia Adventure 2025');
    // View renders without a button role; accessibilityRole should be undefined
    expect(card.props.accessibilityRole).toBeUndefined();
  });

  it('has no accessibilityHint when not interactive', () => {
    render(<TripCard trip={makeTrip()} />);
    const card = screen.getByTestId('trip-card-Asia Adventure 2025');
    expect(card.props.accessibilityHint).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Decorative flag icons hidden from screen readers
// ---------------------------------------------------------------------------

describe('TripCard decorative elements hidden from screen readers', () => {
  it('country flag row has importantForAccessibility="no-hide-descendants"', () => {
    render(<TripCard trip={makeTrip()} onPress={jest.fn()} />);
    // Traverse rendered tree to find the flag container
    const tree = screen.toJSON();
    const findHiddenContainer = (node: any): boolean => {
      if (!node) return false;
      if (
        node.props?.importantForAccessibility === 'no-hide-descendants' ||
        node.props?.accessibilityElementsHidden === true
      ) {
        return true;
      }
      if (Array.isArray(node.children)) {
        return node.children.some(findHiddenContainer);
      }
      return false;
    };
    expect(findHiddenContainer(tree)).toBe(true);
  });

  it('the card accessible label is set on the root element (not hidden flag text)', () => {
    render(<TripCard trip={makeTrip()} onPress={jest.fn()} />);
    const card = screen.getByTestId('trip-card-Asia Adventure 2025');
    expect(card.props.accessibilityLabel).toBe('Asia Adventure 2025');
  });
});

// ---------------------------------------------------------------------------
// testID — for automation
// ---------------------------------------------------------------------------

describe('TripCard testID', () => {
  it('renders with testID matching the trip name', () => {
    render(<TripCard trip={makeTrip()} onPress={jest.fn()} />);
    expect(screen.getByTestId('trip-card-Asia Adventure 2025')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Trip with no legs
// ---------------------------------------------------------------------------

describe('TripCard with no legs', () => {
  it('still renders with correct accessibilityLabel when legs are empty', () => {
    const trip = makeTrip({ legs: [] });
    render(<TripCard trip={trip} onPress={jest.fn()} />);
    expect(screen.getByLabelText('Asia Adventure 2025')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Submission indicator — zero submitted
// ---------------------------------------------------------------------------

describe('TripCard submission indicator a11y — zero submitted', () => {
  it('submission indicator is accessible with correct label for zero submitted', () => {
    const trip = makeTrip({
      legs: [
        {
          id: 'leg-001',
          tripId: 'trip-001',
          destinationCountry: 'JPN',
          arrivalDate: '2025-08-01',
          departureDate: '2025-08-10',
          formStatus: 'not_started',
          submissionStatus: 'not_started',
          order: 0,
          accommodation: {
            name: 'Tokyo Hotel',
            address: { line1: '1-1 Shinjuku', city: 'Tokyo', postalCode: '160-0022', country: 'Japan' },
          },
        },
        {
          id: 'leg-002',
          tripId: 'trip-001',
          destinationCountry: 'MYS',
          arrivalDate: '2025-08-11',
          departureDate: '2025-08-15',
          formStatus: 'not_started',
          submissionStatus: 'not_started',
          order: 1,
          accommodation: {
            name: 'KL Hotel',
            address: { line1: '1 Jalan Bukit Bintang', city: 'Kuala Lumpur', postalCode: '55100', country: 'Malaysia' },
          },
        },
      ],
    });
    render(<TripCard trip={trip} onPress={jest.fn()} />);
    const indicator = screen.getByTestId('trip-card-submission-indicator');
    expect(indicator.props.accessible).toBe(true);
    expect(indicator.props.accessibilityLabel).toBe('0 of 2 legs submitted');
  });

  it('submission indicator is reachable by accessibility label text', () => {
    const trip = makeTrip({
      legs: [
        {
          id: 'leg-001',
          tripId: 'trip-001',
          destinationCountry: 'JPN',
          arrivalDate: '2025-08-01',
          formStatus: 'not_started',
          submissionStatus: 'not_started',
          order: 0,
          accommodation: {
            name: 'Hotel',
            address: { line1: 'line1', city: 'Tokyo', postalCode: '100', country: 'Japan' },
          },
        },
      ],
    });
    render(<TripCard trip={trip} onPress={jest.fn()} />);
    expect(screen.getByLabelText('0 of 1 legs submitted')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Submission indicator — partial submitted
// ---------------------------------------------------------------------------

describe('TripCard submission indicator a11y — partial submitted', () => {
  it('submission indicator label reflects partial count', () => {
    const trip = makeTrip({
      legs: [
        {
          id: 'leg-001',
          tripId: 'trip-001',
          destinationCountry: 'JPN',
          arrivalDate: '2025-08-01',
          departureDate: '2025-08-10',
          formStatus: 'submitted',
          submissionStatus: 'submitted',
          order: 0,
          accommodation: {
            name: 'Tokyo Hotel',
            address: { line1: '1-1 Shinjuku', city: 'Tokyo', postalCode: '160-0022', country: 'Japan' },
          },
        },
        {
          id: 'leg-002',
          tripId: 'trip-001',
          destinationCountry: 'MYS',
          arrivalDate: '2025-08-11',
          departureDate: '2025-08-15',
          formStatus: 'not_started',
          submissionStatus: 'not_started',
          order: 1,
          accommodation: {
            name: 'KL Hotel',
            address: { line1: '1 Jalan', city: 'Kuala Lumpur', postalCode: '55100', country: 'Malaysia' },
          },
        },
        {
          id: 'leg-003',
          tripId: 'trip-001',
          destinationCountry: 'SGP',
          arrivalDate: '2025-08-16',
          departureDate: '2025-08-20',
          formStatus: 'not_started',
          submissionStatus: 'not_started',
          order: 2,
          accommodation: {
            name: 'SG Hotel',
            address: { line1: '1 Orchard', city: 'Singapore', postalCode: '238801', country: 'Singapore' },
          },
        },
      ],
    });
    render(<TripCard trip={trip} onPress={jest.fn()} />);
    const indicator = screen.getByTestId('trip-card-submission-indicator');
    expect(indicator.props.accessible).toBe(true);
    expect(indicator.props.accessibilityLabel).toBe('1 of 3 legs submitted');
  });

  it('partial indicator is discoverable by screen readers via getByLabelText', () => {
    const trip = makeTrip({
      legs: [
        {
          id: 'leg-001',
          tripId: 'trip-001',
          destinationCountry: 'JPN',
          arrivalDate: '2025-08-01',
          formStatus: 'submitted',
          submissionStatus: 'submitted',
          order: 0,
          accommodation: {
            name: 'Hotel',
            address: { line1: 'line1', city: 'Tokyo', postalCode: '100', country: 'Japan' },
          },
        },
        {
          id: 'leg-002',
          tripId: 'trip-001',
          destinationCountry: 'MYS',
          arrivalDate: '2025-08-11',
          formStatus: 'not_started',
          submissionStatus: 'not_started',
          order: 1,
          accommodation: {
            name: 'Hotel',
            address: { line1: 'line1', city: 'KL', postalCode: '100', country: 'Malaysia' },
          },
        },
      ],
    });
    render(<TripCard trip={trip} onPress={jest.fn()} />);
    expect(screen.getByLabelText('1 of 2 legs submitted')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Submission indicator — all submitted
// ---------------------------------------------------------------------------

describe('TripCard submission indicator a11y — all submitted', () => {
  it('submission indicator label is "All legs submitted" when all are submitted', () => {
    const trip = makeTrip({
      legs: [
        {
          id: 'leg-001',
          tripId: 'trip-001',
          destinationCountry: 'JPN',
          arrivalDate: '2025-08-01',
          departureDate: '2025-08-10',
          formStatus: 'submitted',
          submissionStatus: 'submitted',
          order: 0,
          accommodation: {
            name: 'Tokyo Hotel',
            address: { line1: '1-1 Shinjuku', city: 'Tokyo', postalCode: '160-0022', country: 'Japan' },
          },
        },
        {
          id: 'leg-002',
          tripId: 'trip-001',
          destinationCountry: 'MYS',
          arrivalDate: '2025-08-11',
          departureDate: '2025-08-15',
          formStatus: 'submitted',
          submissionStatus: 'submitted',
          order: 1,
          accommodation: {
            name: 'KL Hotel',
            address: { line1: '1 Jalan', city: 'Kuala Lumpur', postalCode: '55100', country: 'Malaysia' },
          },
        },
      ],
    });
    render(<TripCard trip={trip} onPress={jest.fn()} />);
    const indicator = screen.getByTestId('trip-card-submission-indicator');
    expect(indicator.props.accessible).toBe(true);
    expect(indicator.props.accessibilityLabel).toBe('All legs submitted');
  });

  it('"All legs submitted" is discoverable by screen readers via getByLabelText', () => {
    const trip = makeTrip({
      legs: [
        {
          id: 'leg-001',
          tripId: 'trip-001',
          destinationCountry: 'JPN',
          arrivalDate: '2025-08-01',
          formStatus: 'submitted',
          submissionStatus: 'submitted',
          order: 0,
          accommodation: {
            name: 'Hotel',
            address: { line1: 'line1', city: 'Tokyo', postalCode: '100', country: 'Japan' },
          },
        },
        {
          id: 'leg-002',
          tripId: 'trip-001',
          destinationCountry: 'MYS',
          arrivalDate: '2025-08-11',
          formStatus: 'submitted',
          submissionStatus: 'submitted',
          order: 1,
          accommodation: {
            name: 'Hotel',
            address: { line1: 'line1', city: 'KL', postalCode: '100', country: 'Malaysia' },
          },
        },
      ],
    });
    render(<TripCard trip={trip} onPress={jest.fn()} />);
    expect(screen.getByLabelText('All legs submitted')).toBeTruthy();
  });

  it('all-submitted indicator has accessible=true and no accessibilityRole (it is informational)', () => {
    const trip = makeTrip({
      legs: [
        {
          id: 'leg-001',
          tripId: 'trip-001',
          destinationCountry: 'JPN',
          arrivalDate: '2025-08-01',
          formStatus: 'submitted',
          submissionStatus: 'submitted',
          order: 0,
          accommodation: {
            name: 'Hotel',
            address: { line1: 'line1', city: 'Tokyo', postalCode: '100', country: 'Japan' },
          },
        },
      ],
    });
    render(<TripCard trip={trip} onPress={jest.fn()} />);
    const indicator = screen.getByTestId('trip-card-submission-indicator');
    expect(indicator.props.accessible).toBe(true);
    // Informational only — no interactive role needed
    expect(indicator.props.accessibilityRole).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Multiple status variants
// ---------------------------------------------------------------------------

describe('TripCard status variants are labelled', () => {
  it('renders with correct label for "active" status', () => {
    render(<TripCard trip={makeTrip({ status: 'active' })} onPress={jest.fn()} />);
    const card = screen.getByTestId('trip-card-Asia Adventure 2025');
    expect(card.props.accessibilityLabel).toBe('Asia Adventure 2025');
    expect(card.props.accessibilityRole).toBe('button');
  });

  it('renders with correct label for "completed" status', () => {
    render(<TripCard trip={makeTrip({ status: 'completed' })} onPress={jest.fn()} />);
    const card = screen.getByTestId('trip-card-Asia Adventure 2025');
    expect(card.props.accessibilityLabel).toBe('Asia Adventure 2025');
    expect(card.props.accessibilityRole).toBe('button');
  });
});
