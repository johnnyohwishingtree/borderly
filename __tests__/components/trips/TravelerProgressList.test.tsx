/**
 * Unit tests for TravelerProgressList component.
 *
 * Covers:
 * - Hidden when no travelers
 * - Renders progress rows for each traveler
 * - Shows correct ready/total counts
 */

import { render, screen } from '@testing-library/react-native';
import TravelerProgressList from '../../../src/components/trips/TravelerProgressList';
import type { TravelerProgress } from '../../../src/services/readiness/travelerProgress';

const travelers: TravelerProgress[] = [
  { profileId: 'p1', name: 'John Doe', relationship: 'self', legsReady: 2, legsTotal: 3, overallStatus: 'in_progress' },
  { profileId: 'p2', name: 'Jane Doe', relationship: 'spouse', legsReady: 3, legsTotal: 3, overallStatus: 'ready' },
];

describe('TravelerProgressList — visibility', () => {
  it('returns null when travelers array is empty', () => {
    const { toJSON } = render(<TravelerProgressList travelers={[]} />);
    expect(toJSON()).toBeNull();
  });

  it('renders when travelers are provided', () => {
    render(<TravelerProgressList travelers={travelers} />);
    expect(screen.getByTestId('traveler-progress-list')).toBeTruthy();
  });
});

describe('TravelerProgressList — content', () => {
  it('renders a row for each traveler', () => {
    render(<TravelerProgressList travelers={travelers} />);
    expect(screen.getByTestId('traveler-progress-p1')).toBeTruthy();
    expect(screen.getByTestId('traveler-progress-p2')).toBeTruthy();
  });

  it('shows traveler names', () => {
    render(<TravelerProgressList travelers={travelers} />);
    expect(screen.getByText('John Doe')).toBeTruthy();
    expect(screen.getByText('Jane Doe')).toBeTruthy();
  });

  it('shows ready/total counts', () => {
    render(<TravelerProgressList travelers={travelers} />);
    expect(screen.getByText('2/3 ready')).toBeTruthy();
    expect(screen.getByText('3/3 ready')).toBeTruthy();
  });

  it('shows relationship labels', () => {
    render(<TravelerProgressList travelers={travelers} />);
    expect(screen.getByText('Primary')).toBeTruthy();
    expect(screen.getByText('Spouse')).toBeTruthy();
  });

  it('shows "Traveler Progress" heading', () => {
    render(<TravelerProgressList travelers={travelers} />);
    expect(screen.getByText('Traveler Progress')).toBeTruthy();
  });
});

describe('TravelerProgressList — accessibility', () => {
  it('each row has descriptive accessibility label', () => {
    render(<TravelerProgressList travelers={travelers} />);

    const row1 = screen.getByTestId('traveler-progress-p1');
    expect(row1.props.accessibilityLabel).toBe('John Doe, primary: 2 of 3 legs ready');

    const row2 = screen.getByTestId('traveler-progress-p2');
    expect(row2.props.accessibilityLabel).toBe('Jane Doe, spouse: 3 of 3 legs ready');
  });

  it('container has summary role', () => {
    render(<TravelerProgressList travelers={travelers} />);
    const container = screen.getByTestId('traveler-progress-list');
    expect(container.props.accessibilityRole).toBe('summary');
  });
});
