/**
 * Tests for StatusBadge component.
 * Covers: rendering, status types, variants, sizes, accessibility.
 */
import { render } from '@testing-library/react-native';
import StatusBadge from '../../../src/components/ui/StatusBadge';

describe('StatusBadge', () => {
  it('renders the badge text', () => {
    const { getByText } = render(
      <StatusBadge status="success" text="Ready" />,
    );
    expect(getByText('Ready')).toBeTruthy();
  });

  it('renders with success status', () => {
    const { getByText } = render(
      <StatusBadge status="success" text="Submitted" />,
    );
    expect(getByText('Submitted')).toBeTruthy();
  });

  it('renders with error status', () => {
    const { getByText } = render(
      <StatusBadge status="error" text="Failed" />,
    );
    expect(getByText('Failed')).toBeTruthy();
  });

  it('renders with warning status', () => {
    const { getByText } = render(
      <StatusBadge status="warning" text="Pending" />,
    );
    expect(getByText('Pending')).toBeTruthy();
  });

  it('renders with info status', () => {
    const { getByText } = render(
      <StatusBadge status="info" text="Draft" />,
    );
    expect(getByText('Draft')).toBeTruthy();
  });

  it('renders with neutral status', () => {
    const { getByText } = render(
      <StatusBadge status="neutral" text="Unknown" />,
    );
    expect(getByText('Unknown')).toBeTruthy();
  });

  it('renders with filled variant', () => {
    const { getByText } = render(
      <StatusBadge status="success" text="Done" variant="filled" />,
    );
    expect(getByText('Done')).toBeTruthy();
  });

  it('renders with outlined variant', () => {
    const { getByText } = render(
      <StatusBadge status="error" text="Error" variant="outlined" />,
    );
    expect(getByText('Error')).toBeTruthy();
  });

  it('renders with soft variant', () => {
    const { getByText } = render(
      <StatusBadge status="warning" text="Warn" variant="soft" />,
    );
    expect(getByText('Warn')).toBeTruthy();
  });

  it('renders in different sizes', () => {
    const { getByText, rerender } = render(
      <StatusBadge status="success" text="S" size="small" />,
    );
    expect(getByText('S')).toBeTruthy();

    rerender(<StatusBadge status="success" text="L" size="large" />);
    expect(getByText('L')).toBeTruthy();
  });

  it('has text accessibility role', () => {
    const { getByRole } = render(
      <StatusBadge status="success" text="Ready" />,
    );
    expect(getByRole('text')).toBeTruthy();
  });

  it('uses text as default accessibility label', () => {
    const { getByLabelText } = render(
      <StatusBadge status="info" text="In Progress" />,
    );
    expect(getByLabelText('In Progress')).toBeTruthy();
  });

  it('uses custom accessibility label when provided', () => {
    const { getByLabelText } = render(
      <StatusBadge
        status="success"
        text="OK"
        accessibilityLabel="Status: All good"
      />,
    );
    expect(getByLabelText('Status: All good')).toBeTruthy();
  });
});
