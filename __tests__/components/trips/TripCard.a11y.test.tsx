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
