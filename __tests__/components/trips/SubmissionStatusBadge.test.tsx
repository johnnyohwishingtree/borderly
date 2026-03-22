/**
 * Unit tests for SubmissionStatusBadge component.
 *
 * Verifies correct rendering for all three status states,
 * null render when status is undefined, and testID behaviour.
 */

import { render, screen } from '@testing-library/react-native';
import SubmissionStatusBadge from '../../../src/components/trips/SubmissionStatusBadge';

// ---------------------------------------------------------------------------
// Null render when status is undefined
// ---------------------------------------------------------------------------

describe('SubmissionStatusBadge — null when status is undefined', () => {
  it('returns null when status prop is not provided', () => {
    const { toJSON } = render(<SubmissionStatusBadge />);
    expect(toJSON()).toBeNull();
  });

  it('returns null when no status prop is passed at all', () => {
    // Omitting status prop entirely (same as undefined) — verified via null render
    const { toJSON } = render(<SubmissionStatusBadge />);
    expect(toJSON()).toBeNull();
  });
});

/** Traverse rendered JSON tree and collect all text content strings. */
function collectTextContent(node: unknown): string[] {
  if (!node || typeof node !== 'object') return [];
  const n = node as Record<string, unknown>;
  const texts: string[] = [];
  if (typeof n.type === 'string' && n.type === 'Text') {
    const children = n.children;
    if (Array.isArray(children)) {
      children.forEach(child => {
        if (typeof child === 'string') texts.push(child);
        else texts.push(...collectTextContent(child));
      });
    }
  } else {
    const children = n.children;
    if (Array.isArray(children)) {
      children.forEach(child => texts.push(...collectTextContent(child)));
    }
  }
  return texts;
}

// ---------------------------------------------------------------------------
// not_started — grey state
// ---------------------------------------------------------------------------

describe('SubmissionStatusBadge — not_started (grey)', () => {
  it('renders for not_started status', () => {
    render(<SubmissionStatusBadge status="not_started" />);
    expect(screen.getByTestId('submission-status-badge-not_started')).toBeTruthy();
  });

  it('displays "Not Started" label text in rendered tree', () => {
    const { toJSON } = render(<SubmissionStatusBadge status="not_started" />);
    expect(collectTextContent(toJSON())).toContain('Not Started');
  });

  it('has grey background class', () => {
    render(<SubmissionStatusBadge status="not_started" />);
    const badge = screen.getByTestId('submission-status-badge-not_started');
    expect(badge.props.className).toMatch(/bg-gray/);
  });
});

// ---------------------------------------------------------------------------
// in_progress — amber state
// ---------------------------------------------------------------------------

describe('SubmissionStatusBadge — in_progress (amber)', () => {
  it('renders for in_progress status', () => {
    render(<SubmissionStatusBadge status="in_progress" />);
    expect(screen.getByTestId('submission-status-badge-in_progress')).toBeTruthy();
  });

  it('displays "In Progress" label text in rendered tree', () => {
    const { toJSON } = render(<SubmissionStatusBadge status="in_progress" />);
    expect(collectTextContent(toJSON())).toContain('In Progress');
  });

  it('has amber background class', () => {
    render(<SubmissionStatusBadge status="in_progress" />);
    const badge = screen.getByTestId('submission-status-badge-in_progress');
    expect(badge.props.className).toMatch(/bg-amber/);
  });
});

// ---------------------------------------------------------------------------
// submitted — green state
// ---------------------------------------------------------------------------

describe('SubmissionStatusBadge — submitted (green)', () => {
  it('renders for submitted status', () => {
    render(<SubmissionStatusBadge status="submitted" />);
    expect(screen.getByTestId('submission-status-badge-submitted')).toBeTruthy();
  });

  it('displays "Submitted" label text in rendered tree', () => {
    const { toJSON } = render(<SubmissionStatusBadge status="submitted" />);
    expect(collectTextContent(toJSON())).toContain('Submitted');
  });

  it('has green background class', () => {
    render(<SubmissionStatusBadge status="submitted" />);
    const badge = screen.getByTestId('submission-status-badge-submitted');
    expect(badge.props.className).toMatch(/bg-green/);
  });
});

// ---------------------------------------------------------------------------
// testID behaviour
// ---------------------------------------------------------------------------

describe('SubmissionStatusBadge — testID', () => {
  it('uses default testID based on status', () => {
    render(<SubmissionStatusBadge status="submitted" />);
    expect(screen.getByTestId('submission-status-badge-submitted')).toBeTruthy();
  });

  it('uses custom testID when provided', () => {
    render(<SubmissionStatusBadge status="in_progress" testID="custom-badge" />);
    expect(screen.getByTestId('custom-badge')).toBeTruthy();
  });

  it('custom testID overrides the default for not_started', () => {
    render(<SubmissionStatusBadge status="not_started" testID="my-badge" />);
    expect(screen.getByTestId('my-badge')).toBeTruthy();
    expect(screen.queryByTestId('submission-status-badge-not_started')).toBeNull();
  });
});
