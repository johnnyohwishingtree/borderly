/**
 * Tests for Divider component.
 * Covers: rendering, orientation, text label, text position.
 */
import { render } from '@testing-library/react-native';
import { ReactTestRendererJSON } from 'react-test-renderer';
import Divider from '../../../src/components/ui/Divider';

/** Narrow toJSON() to single node. */
function root(toJSON: () => ReturnType<ReturnType<typeof render>['toJSON']>) {
  return toJSON() as ReactTestRendererJSON;
}

describe('Divider', () => {
  it('renders horizontal by default', () => {
    const r = root(render(<Divider />).toJSON);
    expect(r).not.toBeNull();
    expect(r.type).toBe('View');
  });

  it('renders vertical when orientation is vertical', () => {
    const r = root(render(<Divider orientation="vertical" />).toJSON);
    expect(r.props.className).toContain('h-full');
  });

  it('shows label text when provided on horizontal divider', () => {
    const { getByText } = render(<Divider text="OR" />);
    getByText('OR');
  });

  it('renders as flex-row container when text is provided', () => {
    const r = root(render(<Divider text="OR" />).toJSON);
    expect(r.props.className).toContain('flex-row');
  });

  it('renders divider lines on both sides when textPosition is center', () => {
    const r = root(render(<Divider text="OR" textPosition="center" />).toJSON);
    expect(r.children).toHaveLength(3);
  });

  it('omits left line when textPosition is left', () => {
    const r = root(render(<Divider text="OR" textPosition="left" />).toJSON);
    expect(r.children).toHaveLength(2);
  });

  it('omits right line when textPosition is right', () => {
    const r = root(render(<Divider text="OR" textPosition="right" />).toJSON);
    expect(r.children).toHaveLength(2);
  });

  it('applies medium thickness styles', () => {
    const r = root(render(<Divider thickness="medium" />).toJSON);
    expect(r.props.className).toContain('h-0.5');
  });

  it('applies thick thickness styles', () => {
    const r = root(render(<Divider thickness="thick" />).toJSON);
    expect(r.props.className).toContain('h-1');
  });

  it('applies dark color styles', () => {
    const r = root(render(<Divider color="dark" />).toJSON);
    expect(r.props.className).toContain('bg-border-light');
  });

  it('applies dashed variant styles', () => {
    const r = root(render(<Divider variant="dashed" />).toJSON);
    expect(r.props.className).toContain('border-dashed');
  });

  it('passes through additional ViewProps', () => {
    const r = root(render(<Divider testID="my-divider" />).toJSON);
    expect(r.props.testID).toBe('my-divider');
  });
});
