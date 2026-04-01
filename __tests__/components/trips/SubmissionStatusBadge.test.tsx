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
    screen.getByTestId('submission-status-badge-not_started');
  });

  it('displays "Not Started" label text in rendered tree', () => {
    const { toJSON } = render(<SubmissionStatusBadge status="not_started" />);
    expect(collectTextContent(toJSON())).toContain('Not Started');
  });

  it('has grey background class', () => {
    render(<SubmissionStatusBadge status="not_started" />);
    const badge = screen.getByTestId('submission-status-badge-not_started');
    expect(badge.props.className).toMatch(/bg-surface-tertiary|bg-gray/);
  });
});

// ---------------------------------------------------------------------------
// in_progress — amber state
// ---------------------------------------------------------------------------

describe('SubmissionStatusBadge — in_progress (amber)', () => {
  it('renders for in_progress status', () => {
    render(<SubmissionStatusBadge status="in_progress" />);
    screen.getByTestId('submission-status-badge-in_progress');
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
    screen.getByTestId('submission-status-badge-submitted');
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
    screen.getByTestId('submission-status-badge-submitted');
  });

  it('uses custom testID when provided', () => {
    render(<SubmissionStatusBadge status="in_progress" testID="custom-badge" />);
    screen.getByTestId('custom-badge');
  });

  it('custom testID overrides the default for not_started', () => {
    render(<SubmissionStatusBadge status="not_started" testID="my-badge" />);
    screen.getByTestId('my-badge');
    expect(screen.queryByTestId('submission-status-badge-not_started')).toBeNull();
  });
});
