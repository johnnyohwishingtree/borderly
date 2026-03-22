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
  it('has accessibilityRole="text" for not_started', () => {
    render(<SubmissionStatusBadge status="not_started" />);
    const badge = screen.getByTestId('submission-status-badge-not_started');
    expect(badge.props.accessibilityRole).toBe('text');
  });

  it('has accessibilityRole="text" for in_progress', () => {
    render(<SubmissionStatusBadge status="in_progress" />);
    const badge = screen.getByTestId('submission-status-badge-in_progress');
    expect(badge.props.accessibilityRole).toBe('text');
  });

  it('has accessibilityRole="text" for submitted', () => {
    render(<SubmissionStatusBadge status="submitted" />);
    const badge = screen.getByTestId('submission-status-badge-submitted');
    expect(badge.props.accessibilityRole).toBe('text');
  });
});

// ---------------------------------------------------------------------------
// accessible={true}
// ---------------------------------------------------------------------------

describe('SubmissionStatusBadge a11y — accessible prop', () => {
  it('has accessible={true} for not_started', () => {
    render(<SubmissionStatusBadge status="not_started" />);
    const badge = screen.getByTestId('submission-status-badge-not_started');
    expect(badge.props.accessible).toBe(true);
  });

  it('has accessible={true} for in_progress', () => {
    render(<SubmissionStatusBadge status="in_progress" />);
    const badge = screen.getByTestId('submission-status-badge-in_progress');
    expect(badge.props.accessible).toBe(true);
  });

  it('has accessible={true} for submitted', () => {
    render(<SubmissionStatusBadge status="submitted" />);
    const badge = screen.getByTestId('submission-status-badge-submitted');
    expect(badge.props.accessible).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// accessibilityLabel content
// ---------------------------------------------------------------------------

describe('SubmissionStatusBadge a11y — accessibilityLabel', () => {
  it('label is "Submission not started" for not_started', () => {
    render(<SubmissionStatusBadge status="not_started" />);
    const badge = screen.getByTestId('submission-status-badge-not_started');
    expect(badge.props.accessibilityLabel).toBe('Submission not started');
  });

  it('label is "Submission in progress" for in_progress', () => {
    render(<SubmissionStatusBadge status="in_progress" />);
    const badge = screen.getByTestId('submission-status-badge-in_progress');
    expect(badge.props.accessibilityLabel).toBe('Submission in progress');
  });

  it('label is "Submission complete" for submitted', () => {
    render(<SubmissionStatusBadge status="submitted" />);
    const badge = screen.getByTestId('submission-status-badge-submitted');
    expect(badge.props.accessibilityLabel).toBe('Submission complete');
  });

  it('is findable by accessibilityLabel for not_started', () => {
    render(<SubmissionStatusBadge status="not_started" />);
    expect(screen.getByLabelText('Submission not started')).toBeTruthy();
  });

  it('is findable by accessibilityLabel for in_progress', () => {
    render(<SubmissionStatusBadge status="in_progress" />);
    expect(screen.getByLabelText('Submission in progress')).toBeTruthy();
  });

  it('is findable by accessibilityLabel for submitted', () => {
    render(<SubmissionStatusBadge status="submitted" />);
    expect(screen.getByLabelText('Submission complete')).toBeTruthy();
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

  it('inner Text node for not_started has accessibilityElementsHidden', () => {
    const { toJSON } = render(<SubmissionStatusBadge status="not_started" />);
    expect(findHiddenNode(toJSON())).toBe(true);
  });

  it('inner Text node for in_progress has accessibilityElementsHidden', () => {
    const { toJSON } = render(<SubmissionStatusBadge status="in_progress" />);
    expect(findHiddenNode(toJSON())).toBe(true);
  });

  it('inner Text node for submitted has accessibilityElementsHidden', () => {
    const { toJSON } = render(<SubmissionStatusBadge status="submitted" />);
    expect(findHiddenNode(toJSON())).toBe(true);
  });
});
