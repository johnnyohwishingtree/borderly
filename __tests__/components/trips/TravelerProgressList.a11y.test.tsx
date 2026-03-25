/**
 * Accessibility tests for TravelerProgressList component.
 *
 * Verifies:
 * - Container has accessibilityRole="summary"
 * - Each traveler row has descriptive accessibilityLabel
 * - Each row has accessibilityRole="text"
 * - No a11y noise for empty state
 */

import { render, screen } from '@testing-library/react-native';
import TravelerProgressList from '../../../src/components/trips/TravelerProgressList';
import type { TravelerProgress } from '../../../src/services/readiness/travelerProgress';

const travelers: TravelerProgress[] = [
  { profileId: 'p1', name: 'John Doe', relationship: 'self', legsReady: 1, legsTotal: 2, overallStatus: 'in_progress' },
  { profileId: 'p2', name: 'Jane Doe', relationship: 'spouse', legsReady: 2, legsTotal: 2, overallStatus: 'ready' },
  { profileId: 'p3', name: 'Alex Doe', relationship: 'child', legsReady: 0, legsTotal: 2, overallStatus: 'not_started' },
];

describe('TravelerProgressList a11y — container', () => {
  it('has accessibilityRole="summary"', () => {
    render(<TravelerProgressList travelers={travelers} />);
    const container = screen.getByTestId('traveler-progress-list');
    expect(container.props.accessibilityRole).toBe('summary');
  });
});

describe('TravelerProgressList a11y — traveler rows', () => {
  it('self row has descriptive label', () => {
    render(<TravelerProgressList travelers={travelers} />);
    const row = screen.getByTestId('traveler-progress-p1');
    expect(row.props.accessible).toBe(true);
    expect(row.props.accessibilityRole).toBe('text');
    expect(row.props.accessibilityLabel).toBe('John Doe, primary: 1 of 2 legs ready');
  });

  it('spouse row has descriptive label', () => {
    render(<TravelerProgressList travelers={travelers} />);
    const row = screen.getByTestId('traveler-progress-p2');
    expect(row.props.accessibilityLabel).toBe('Jane Doe, spouse: 2 of 2 legs ready');
  });

  it('child row has descriptive label', () => {
    render(<TravelerProgressList travelers={travelers} />);
    const row = screen.getByTestId('traveler-progress-p3');
    expect(row.props.accessibilityLabel).toBe('Alex Doe, child: 0 of 2 legs ready');
  });
});

describe('TravelerProgressList a11y — empty state', () => {
  it('renders nothing for empty travelers (no a11y noise)', () => {
    const { toJSON } = render(<TravelerProgressList travelers={[]} />);
    expect(toJSON()).toBeNull();
  });
});
