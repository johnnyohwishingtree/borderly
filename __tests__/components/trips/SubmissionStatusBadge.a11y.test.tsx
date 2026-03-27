/**
 * Accessibility tests for SubmissionStatusBadge component.
 *
 * Verifies that the component exposes correct accessibility roles, labels,
 * and screen-reader annotations for VoiceOver (iOS) and TalkBack (Android).
 *
 * The container carries a human-readable `accessibilityLabel` and inner
 * Text nodes are hidden via `accessibilityElementsHidden` to prevent
 * double-announcement by screen readers.
 */

import { render, screen } from '@testing-library/react-native';
import SubmissionStatusBadge from '../../../src/components/trips/SubmissionStatusBadge';

// ---------------------------------------------------------------------------
// Null render when status is undefined
// ---------------------------------------------------------------------------

describe('SubmissionStatusBadge a11y — null when status is undefined', () => {
  it('returns null (no accessible element rendered) when status is undefined', () => {
    const { toJSON } = render(<SubmissionStatusBadge />);
    expect(toJSON()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// accessibilityRole
// ---------------------------------------------------------------------------

describe('SubmissionStatusBadge a11y — accessibilityRole', () => {
  it.each(['not_started', 'in_progress', 'submitted'] as const)(
    'has accessibilityRole="text" for %s',
    status => {
      render(<SubmissionStatusBadge status={status} />);
      const badge = screen.getByTestId(`submission-status-badge-${status}`);
      expect(badge.props.accessibilityRole).toBe('text');
    },
  );
});

// ---------------------------------------------------------------------------
// accessible={true}
// ---------------------------------------------------------------------------

describe('SubmissionStatusBadge a11y — accessible prop', () => {
  it.each(['not_started', 'in_progress', 'submitted'] as const)(
    'has accessible={true} for %s',
    status => {
      render(<SubmissionStatusBadge status={status} />);
      const badge = screen.getByTestId(`submission-status-badge-${status}`);
      expect(badge.props.accessible).toBe(true);
    },
  );
});

// ---------------------------------------------------------------------------
// accessibilityLabel content
// ---------------------------------------------------------------------------

describe('SubmissionStatusBadge a11y — accessibilityLabel', () => {
  it.each([
    ['not_started', 'Submission not started'],
    ['in_progress', 'Submission in progress'],
    ['submitted', 'Submission complete'],
  ] as const)('label is "%s" for %s', (status, expectedLabel) => {
    render(<SubmissionStatusBadge status={status} />);
    const badge = screen.getByTestId(`submission-status-badge-${status}`);
    expect(badge.props.accessibilityLabel).toBe(expectedLabel);
  });

  it.each([
    ['not_started', 'Submission not started'],
    ['in_progress', 'Submission in progress'],
    ['submitted', 'Submission complete'],
  ] as const)('is findable by accessibilityLabel for %s', (status, expectedLabel) => {
    render(<SubmissionStatusBadge status={status} />);
    screen.getByLabelText(expectedLabel);
  });
});

// ---------------------------------------------------------------------------
// Inner text hidden from screen readers
// ---------------------------------------------------------------------------

describe('SubmissionStatusBadge a11y — inner text hidden from screen readers', () => {
  /**
   * Traverse the rendered tree to find any node with
   * accessibilityElementsHidden=true (used to prevent double-announcement).
   */
  function findHiddenNode(node: unknown): boolean {
    if (!node || typeof node !== 'object') return false;
    const n = node as Record<string, unknown>;
    if (n.props && typeof n.props === 'object') {
      const p = n.props as Record<string, unknown>;
      if (p.accessibilityElementsHidden === true) return true;
    }
    const children = n.children;
    if (Array.isArray(children)) return children.some(findHiddenNode);
    return false;
  }

  it.each(['not_started', 'in_progress', 'submitted'] as const)(
    'inner Text node for %s has accessibilityElementsHidden',
    status => {
      const { toJSON } = render(<SubmissionStatusBadge status={status} />);
      expect(findHiddenNode(toJSON())).toBe(true);
    },
  );
});
