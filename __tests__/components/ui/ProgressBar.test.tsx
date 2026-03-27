/**
 * Tests for ProgressBar component.
 * Covers: rendering, progress values, label, percentage display, accessibility.
 */
import { render } from '@testing-library/react-native';
import ProgressBar from '../../../src/components/ui/ProgressBar';

describe('ProgressBar', () => {
  it('renders without crashing', () => {
    const { getByLabelText } = render(<ProgressBar progress={50} />);
    getByLabelText(/50.*percent/i);
  });

  it('has correct accessibility value for 0%', () => {
    const { getByLabelText } = render(<ProgressBar progress={0} />);
    const bar = getByLabelText(/0.*percent/i);
    expect(bar.props.accessibilityValue?.now).toBe(0);
    expect(bar.props.accessibilityValue?.min).toBe(0);
    expect(bar.props.accessibilityValue?.max).toBe(100);
  });

  it('has correct accessibility value for 100%', () => {
    const { getByLabelText } = render(<ProgressBar progress={100} />);
    const bar = getByLabelText(/100.*percent/i);
    expect(bar.props.accessibilityValue?.now).toBe(100);
  });

  it('clamps progress above 100 to 100', () => {
    const { getByLabelText } = render(<ProgressBar progress={150} />);
    const bar = getByLabelText(/100.*percent/i);
    expect(bar.props.accessibilityValue?.now).toBe(100);
  });

  it('clamps progress below 0 to 0', () => {
    const { getByLabelText } = render(<ProgressBar progress={-10} />);
    const bar = getByLabelText(/0.*percent/i);
    expect(bar.props.accessibilityValue?.now).toBe(0);
  });

  it('renders label when provided', () => {
    const { getByText } = render(
      <ProgressBar progress={60} label="Form completion" />,
    );
    getByText('Form completion');
  });

  it('shows percentage text when showPercentage is true', () => {
    const { getByText } = render(
      <ProgressBar progress={75} showPercentage />,
    );
    getByText('75%');
  });

  it('does not show percentage when showPercentage is false', () => {
    const { queryByText } = render(<ProgressBar progress={75} />);
    expect(queryByText('75%')).toBeNull();
  });

  it('renders with different sizes', () => {
    const { getByLabelText, rerender } = render(
      <ProgressBar progress={50} size="small" />,
    );
    getByLabelText(/50.*percent/i);

    rerender(<ProgressBar progress={50} size="large" />);
    getByLabelText(/50.*percent/i);
  });

  it('renders with different colors', () => {
    const { getByLabelText, rerender } = render(
      <ProgressBar progress={50} color="green" />,
    );
    getByLabelText(/50.*percent/i);

    rerender(<ProgressBar progress={50} color="red" />);
    getByLabelText(/50.*percent/i);
  });

  it('has accessibility text with percentage', () => {
    const { getByLabelText } = render(<ProgressBar progress={42} />);
    const bar = getByLabelText(/42.*percent/i);
    expect(bar.props.accessibilityValue?.text).toContain('42');
  });
});
