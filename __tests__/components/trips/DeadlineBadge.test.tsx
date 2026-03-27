import { render } from '@testing-library/react-native';
import DeadlineBadge from '@/components/trips/DeadlineBadge';
import { LegDeadline } from '@/services/deadline/deadlineService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeDeadline(overrides: Partial<LegDeadline> = {}): LegDeadline {
  return {
    legId: 'leg-1',
    countryCode: 'JPN',
    hoursRemaining: 72,
    status: 'not-started',
    windowNote: 'Submit before departure',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests: visual states
// ---------------------------------------------------------------------------

describe('DeadlineBadge', () => {
  describe('Not Started state', () => {
    it('renders "Not Started" label for not-started status with normal urgency', () => {
      const { getByText } = render(
        <DeadlineBadge deadline={makeDeadline({ status: 'not-started', hoursRemaining: 120 })} />,
      );
      getByText('Not Started');
    });
  });

  describe('In Progress state', () => {
    it('renders "In Progress" label for in-progress status with normal urgency', () => {
      const { getByText } = render(
        <DeadlineBadge deadline={makeDeadline({ status: 'in-progress', hoursRemaining: 96 })} />,
      );
      getByText('In Progress');
    });
  });

  describe('Ready state', () => {
    it('renders "Ready" label for ready status', () => {
      const { getByText } = render(
        <DeadlineBadge deadline={makeDeadline({ status: 'ready', hoursRemaining: 24 })} />,
      );
      getByText('Ready');
    });

    it('still shows "Ready" even when hours remaining are low (ready takes precedence)', () => {
      const { getByText } = render(
        <DeadlineBadge deadline={makeDeadline({ status: 'ready', hoursRemaining: 5 })} />,
      );
      getByText('Ready');
    });
  });

  describe('Due Soon (warning) state', () => {
    it('renders "Due Soon" label when urgency is warning (hoursRemaining ≤ 48, > 24)', () => {
      const { getByText } = render(
        <DeadlineBadge
          deadline={makeDeadline({ status: 'not-started', hoursRemaining: 48 })}
        />,
      );
      getByText('Due Soon');
    });

    it('renders "Due Soon" for 36 hours remaining', () => {
      const { getByText } = render(
        <DeadlineBadge
          deadline={makeDeadline({ status: 'not-started', hoursRemaining: 36 })}
        />,
      );
      getByText('Due Soon');
    });
  });

  describe('Act Now (critical) state', () => {
    it('renders "Act Now" label when urgency is critical (hoursRemaining ≤ 24)', () => {
      const { getByText } = render(
        <DeadlineBadge
          deadline={makeDeadline({ status: 'not-started', hoursRemaining: 24 })}
        />,
      );
      getByText('Act Now');
    });

    it('renders "Act Now" for 10 hours remaining', () => {
      const { getByText } = render(
        <DeadlineBadge
          deadline={makeDeadline({ status: 'in-progress', hoursRemaining: 10 })}
        />,
      );
      getByText('Act Now');
    });
  });

  describe('Overdue state', () => {
    it('renders "Overdue" label when status is overdue', () => {
      const { getByText } = render(
        <DeadlineBadge deadline={makeDeadline({ status: 'overdue', hoursRemaining: -5 })} />,
      );
      getByText('Overdue');
    });

    it('renders "Overdue" when hoursRemaining is negative', () => {
      const { getByText } = render(
        <DeadlineBadge
          deadline={makeDeadline({ status: 'not-started', hoursRemaining: -1 })}
        />,
      );
      getByText('Overdue');
    });
  });

  describe('No-deadline state', () => {
    it('returns null for no-deadline status with normal urgency', () => {
      const { queryByTestId } = render(
        <DeadlineBadge
          deadline={makeDeadline({ status: 'no-deadline', hoursRemaining: 0 })}
          testID="badge"
        />,
      );
      expect(queryByTestId('badge')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Countdown label
  // -------------------------------------------------------------------------

  describe('countdown label', () => {
    it('shows days (plural) when hoursRemaining > 24 — e.g. 72 h → "3 days left"', () => {
      const { getByText } = render(
        <DeadlineBadge deadline={makeDeadline({ status: 'not-started', hoursRemaining: 72 })} />,
      );
      getByText('· 3 days left');
    });

    it('shows singular "day" when exactly 1 day remains', () => {
      // 36 h rounds to 2 days; 30 h rounds to 1 day
      const { getByText } = render(
        <DeadlineBadge
          deadline={makeDeadline({ status: 'not-started', hoursRemaining: 30 })}
        />,
      );
      // 30/24 = 1.25 → rounds to 1 day
      getByText('· 1 day left');
    });

    it('shows hours when hoursRemaining is ≤ 24 and > 0', () => {
      const { getByText } = render(
        <DeadlineBadge
          deadline={makeDeadline({ status: 'in-progress', hoursRemaining: 10 })}
        />,
      );
      getByText('· 10h left');
    });

    it('shows no countdown label when overdue (hoursRemaining ≤ 0)', () => {
      const { queryByText } = render(
        <DeadlineBadge deadline={makeDeadline({ status: 'overdue', hoursRemaining: -2 })} />,
      );
      expect(queryByText(/left/)).toBeNull();
    });

    it('shows no countdown label for ready status', () => {
      const { queryByText } = render(
        <DeadlineBadge deadline={makeDeadline({ status: 'ready', hoursRemaining: 48 })} />,
      );
      expect(queryByText('Ready')).not.toBeNull();
      expect(queryByText(/left/)).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Accessibility / testID
  // -------------------------------------------------------------------------

  describe('testID', () => {
    it('uses default testID derived from legId', () => {
      const { getByTestId } = render(
        <DeadlineBadge deadline={makeDeadline({ legId: 'leg-42', status: 'not-started', hoursRemaining: 72 })} />,
      );
      getByTestId('deadline-badge-leg-42');
    });

    it('accepts a custom testID', () => {
      const { getByTestId } = render(
        <DeadlineBadge
          deadline={makeDeadline({ status: 'not-started', hoursRemaining: 72 })}
          testID="my-custom-badge"
        />,
      );
      getByTestId('my-custom-badge');
    });

    it('has correct accessibilityLabel for overdue badge', () => {
      const { getByLabelText } = render(
        <DeadlineBadge deadline={makeDeadline({ status: 'overdue', hoursRemaining: -3 })} />,
      );
      getByLabelText('Overdue');
    });

    it('has correct accessibilityLabel including countdown for not-started badge', () => {
      const { getByLabelText } = render(
        <DeadlineBadge deadline={makeDeadline({ status: 'not-started', hoursRemaining: 72 })} />,
      );
      getByLabelText('Not Started, 3 days left');
    });
  });
});
