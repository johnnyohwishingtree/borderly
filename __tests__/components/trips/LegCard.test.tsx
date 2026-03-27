/**
 * Unit tests for LegCard component — submission status features.
 *
 * Covers:
 * - SubmissionStatusBadge renders for each submissionStatus value
 * - "Mark as Submitted" button is shown when onMarkAsSubmitted is provided
 *   and submissionStatus is not yet 'submitted'
 * - "Mark as Submitted" button is hidden when leg is already submitted
 * - "Mark as Submitted" button calls the callback when pressed
 * - Button has correct a11y role, label, and hint
 */

import { render, screen, fireEvent } from '@testing-library/react-native';
import LegCard from '@/components/trips/LegCard';
import type { TripLeg } from '@/types/trip';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeLeg(overrides: Partial<TripLeg> = {}): TripLeg {
  return {
    id: 'leg-1',
    tripId: 'trip-1',
    destinationCountry: 'JPN',
    arrivalDate: '2027-08-01',
    departureDate: '2027-08-10',
    formStatus: 'ready',
    submissionStatus: 'not_started',
    order: 0,
    accommodation: {
      name: 'Park Hyatt Tokyo',
      address: {
        line1: '3-7-1-2 Nishi-Shinjuku',
        city: 'Shinjuku',
        postalCode: '163-1055',
        country: 'Japan',
      },
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// SubmissionStatusBadge integration
// ---------------------------------------------------------------------------

describe('LegCard — SubmissionStatusBadge', () => {
  it('renders SubmissionStatusBadge with not_started status by default', () => {
    render(<LegCard leg={makeLeg()} />);
    screen.getByTestId('submission-status-badge-JPN');
  });

  it('renders SubmissionStatusBadge with not_started status', () => {
    render(<LegCard leg={makeLeg({ submissionStatus: 'not_started' })} />);
    const badge = screen.getByTestId('submission-status-badge-JPN');
    expect(badge.props.accessibilityLabel).toBe('Submission not started');
  });

  it('renders SubmissionStatusBadge with in_progress status', () => {
    render(<LegCard leg={makeLeg({ submissionStatus: 'in_progress' })} />);
    const badge = screen.getByTestId('submission-status-badge-JPN');
    expect(badge.props.accessibilityLabel).toBe('Submission in progress');
  });

  it('renders SubmissionStatusBadge with submitted status', () => {
    render(<LegCard leg={makeLeg({ submissionStatus: 'submitted' })} />);
    const badge = screen.getByTestId('submission-status-badge-JPN');
    expect(badge.props.accessibilityLabel).toBe('Submission complete');
  });
});

// ---------------------------------------------------------------------------
// "Mark as Submitted" button — visibility
// ---------------------------------------------------------------------------

describe('LegCard — "Mark as Submitted" button visibility', () => {
  it('shows the button when onMarkAsSubmitted is provided and status is not_started', () => {
    render(
      <LegCard
        leg={makeLeg({ submissionStatus: 'not_started' })}
        onMarkAsSubmitted={jest.fn()}
      />,
    );
    screen.getByTestId('mark-submitted-JPN');
  });

  it('shows the button when onMarkAsSubmitted is provided and status is in_progress', () => {
    render(
      <LegCard
        leg={makeLeg({ submissionStatus: 'in_progress' })}
        onMarkAsSubmitted={jest.fn()}
      />,
    );
    screen.getByTestId('mark-submitted-JPN');
  });

  it('hides the button when submissionStatus is already submitted', () => {
    render(
      <LegCard
        leg={makeLeg({ submissionStatus: 'submitted' })}
        onMarkAsSubmitted={jest.fn()}
      />,
    );
    expect(screen.queryByTestId('mark-submitted-JPN')).toBeNull();
  });

  it('hides the button when onMarkAsSubmitted is not provided', () => {
    render(<LegCard leg={makeLeg({ submissionStatus: 'not_started' })} />);
    expect(screen.queryByTestId('mark-submitted-JPN')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// "Mark as Submitted" button — callback
// ---------------------------------------------------------------------------

describe('LegCard — "Mark as Submitted" button callback', () => {
  it('calls onMarkAsSubmitted when pressed', () => {
    const onMarkAsSubmitted = jest.fn();
    render(
      <LegCard
        leg={makeLeg({ submissionStatus: 'not_started' })}
        onMarkAsSubmitted={onMarkAsSubmitted}
      />,
    );
    fireEvent.press(screen.getByTestId('mark-submitted-JPN'));
    expect(onMarkAsSubmitted).toHaveBeenCalledTimes(1);
  });

  it('calls onMarkAsSubmitted only once per tap', () => {
    const onMarkAsSubmitted = jest.fn();
    render(
      <LegCard
        leg={makeLeg({ submissionStatus: 'in_progress' })}
        onMarkAsSubmitted={onMarkAsSubmitted}
      />,
    );
    fireEvent.press(screen.getByTestId('mark-submitted-JPN'));
    fireEvent.press(screen.getByTestId('mark-submitted-JPN'));
    expect(onMarkAsSubmitted).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// "Mark as Submitted" button — accessibility
// ---------------------------------------------------------------------------

describe('LegCard — "Mark as Submitted" button accessibility', () => {
  it('has accessibilityRole="button"', () => {
    render(
      <LegCard
        leg={makeLeg({ submissionStatus: 'not_started' })}
        onMarkAsSubmitted={jest.fn()}
      />,
    );
    const btn = screen.getByTestId('mark-submitted-JPN');
    expect(btn.props.accessibilityRole).toBe('button');
  });

  it('has descriptive accessibilityLabel including country name', () => {
    render(
      <LegCard
        leg={makeLeg({ submissionStatus: 'not_started' })}
        onMarkAsSubmitted={jest.fn()}
      />,
    );
    const btn = screen.getByTestId('mark-submitted-JPN');
    expect(btn.props.accessibilityLabel).toMatch(/Japan/i);
    expect(btn.props.accessibilityLabel).toMatch(/submitted/i);
  });

  it('has accessibilityHint explaining the action', () => {
    render(
      <LegCard
        leg={makeLeg({ submissionStatus: 'not_started' })}
        onMarkAsSubmitted={jest.fn()}
      />,
    );
    const btn = screen.getByTestId('mark-submitted-JPN');
    expect(typeof btn.props.accessibilityHint).toBe('string');
    expect(btn.props.accessibilityHint.length).toBeGreaterThan(0);
  });

  it('has accessible={true}', () => {
    render(
      <LegCard
        leg={makeLeg({ submissionStatus: 'not_started' })}
        onMarkAsSubmitted={jest.fn()}
      />,
    );
    const btn = screen.getByTestId('mark-submitted-JPN');
    expect(btn.props.accessible).toBe(true);
  });
});
