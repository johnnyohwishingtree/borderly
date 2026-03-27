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
    getByText('Ready');
  });

  it('renders with success status', () => {
    const { getByText } = render(
      <StatusBadge status="success" text="Submitted" />,
    );
    getByText('Submitted');
  });

  it('renders with error status', () => {
    const { getByText } = render(
      <StatusBadge status="error" text="Failed" />,
    );
    getByText('Failed');
  });

  it('renders with warning status', () => {
    const { getByText } = render(
      <StatusBadge status="warning" text="Pending" />,
    );
    getByText('Pending');
  });

  it('renders with info status', () => {
    const { getByText } = render(
      <StatusBadge status="info" text="Draft" />,
    );
    getByText('Draft');
  });

  it('renders with neutral status', () => {
    const { getByText } = render(
      <StatusBadge status="neutral" text="Unknown" />,
    );
    getByText('Unknown');
  });

  it('renders with filled variant', () => {
    const { getByText } = render(
      <StatusBadge status="success" text="Done" variant="filled" />,
    );
    getByText('Done');
  });

  it('renders with outlined variant', () => {
    const { getByText } = render(
      <StatusBadge status="error" text="Error" variant="outlined" />,
    );
    getByText('Error');
  });

  it('renders with soft variant', () => {
    const { getByText } = render(
      <StatusBadge status="warning" text="Warn" variant="soft" />,
    );
    getByText('Warn');
  });

  it('renders in different sizes', () => {
    const { getByText, rerender } = render(
      <StatusBadge status="success" text="S" size="small" />,
    );
    getByText('S');

    rerender(<StatusBadge status="success" text="L" size="large" />);
    getByText('L');
  });

  it('has text accessibility role', () => {
    const { getByRole } = render(
      <StatusBadge status="success" text="Ready" />,
    );
    getByRole('text');
  });

  it('uses text as default accessibility label', () => {
    const { getByLabelText } = render(
      <StatusBadge status="info" text="In Progress" />,
    );
    getByLabelText('In Progress');
  });

  it('uses custom accessibility label when provided', () => {
    const { getByLabelText } = render(
      <StatusBadge
        status="success"
        text="OK"
        accessibilityLabel="Status: All good"
      />,
    );
    getByLabelText('Status: All good');
  });
});
