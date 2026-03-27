/**
 * Tests for Skeleton components (SkeletonLine, SkeletonCard, SkeletonList).
 * Covers: rendering, dimensions, variants, composability.
 */
import { render } from '@testing-library/react-native';
import { ReactTestRendererJSON } from 'react-test-renderer';
import { SkeletonLine, SkeletonCard, SkeletonList } from '../../../src/components/ui/Skeleton';

describe('SkeletonLine', () => {
  it('renders with default dimensions', () => {
    const { toJSON } = render(<SkeletonLine />);
    const root = toJSON() as ReactTestRendererJSON;
    expect(root.props.style).toEqual({ width: '100%', height: 16 });
  });

  it('applies custom width and height', () => {
    const { toJSON } = render(<SkeletonLine width={200} height={24} />);
    const root = toJSON() as ReactTestRendererJSON;
    expect(root.props.style).toEqual({ width: 200, height: 24 });
  });

  it('applies text variant (rounded)', () => {
    const { toJSON } = render(<SkeletonLine variant="text" />);
    const root = toJSON() as ReactTestRendererJSON;
    expect(root.props.className).toContain('rounded');
  });

  it('applies circular variant (rounded-full)', () => {
    const { toJSON } = render(<SkeletonLine variant="circular" />);
    const root = toJSON() as ReactTestRendererJSON;
    expect(root.props.className).toContain('rounded-full');
  });

  it('applies rectangular variant (rounded-lg)', () => {
    const { toJSON } = render(<SkeletonLine variant="rectangular" />);
    const root = toJSON() as ReactTestRendererJSON;
    expect(root.props.className).toContain('rounded-lg');
  });

  it('applies animate-pulse class', () => {
    const { toJSON } = render(<SkeletonLine />);
    const root = toJSON() as ReactTestRendererJSON;
    expect(root.props.className).toContain('animate-pulse');
  });
});

describe('SkeletonCard', () => {
  it('renders default 3 skeleton lines', () => {
    const { toJSON } = render(<SkeletonCard />);
    const json = JSON.stringify(toJSON());
    // Should contain multiple skeleton lines with animate-pulse
    const pulseCount = (json.match(/animate-pulse/g) || []).length;
    expect(pulseCount).toBe(3);
  });

  it('renders custom number of lines', () => {
    const { toJSON } = render(<SkeletonCard lines={5} />);
    const json = JSON.stringify(toJSON());
    const pulseCount = (json.match(/animate-pulse/g) || []).length;
    expect(pulseCount).toBe(5);
  });

  it('renders avatar when showAvatar is true', () => {
    const { toJSON } = render(<SkeletonCard showAvatar />);
    const json = JSON.stringify(toJSON());
    // Avatar is a circular skeleton (rounded-full) with width 40
    expect(json).toContain('rounded-full');
    const pulseCount = (json.match(/animate-pulse/g) || []).length;
    // 3 lines + 1 avatar = 4 skeletons
    expect(pulseCount).toBe(4);
  });

  it('does not render avatar by default', () => {
    const { toJSON } = render(<SkeletonCard />);
    const json = JSON.stringify(toJSON());
    // No circular skeleton for avatar
    expect(json).not.toContain('rounded-full');
  });
});

describe('SkeletonList', () => {
  it('renders default 3 cards', () => {
    const { toJSON } = render(<SkeletonList />);
    const json = JSON.stringify(toJSON());
    // 3 cards × 3 lines = 9 skeleton lines
    const pulseCount = (json.match(/animate-pulse/g) || []).length;
    expect(pulseCount).toBe(9);
  });

  it('renders custom item count', () => {
    const { toJSON } = render(<SkeletonList itemCount={2} />);
    const json = JSON.stringify(toJSON());
    // 2 cards × 3 lines = 6
    const pulseCount = (json.match(/animate-pulse/g) || []).length;
    expect(pulseCount).toBe(6);
  });

  it('passes showAvatar to cards', () => {
    const { toJSON } = render(<SkeletonList itemCount={1} showAvatar />);
    const json = JSON.stringify(toJSON());
    expect(json).toContain('rounded-full');
    // 1 card with avatar: 3 lines + 1 avatar = 4
    const pulseCount = (json.match(/animate-pulse/g) || []).length;
    expect(pulseCount).toBe(4);
  });
});
