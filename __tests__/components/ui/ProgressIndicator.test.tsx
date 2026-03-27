/**
 * Tests for ProgressIndicator component.
 * Covers: rendering steps, current step highlight, labels, variants.
 */
import { render } from '@testing-library/react-native';
import ProgressIndicator from '../../../src/components/ui/ProgressIndicator';

describe('ProgressIndicator', () => {
  it('renders correct number of steps for horizontal variant', () => {
    const { getAllByLabelText } = render(
      <ProgressIndicator currentStep={0} totalSteps={4} />,
    );
    // Each step has an accessibilityLabel like "Step N of 4: Step N"
    const steps = getAllByLabelText(/Step \d+ of 4/);
    expect(steps).toHaveLength(4);
  });

  it('marks current step correctly', () => {
    const { getByLabelText } = render(
      <ProgressIndicator currentStep={1} totalSteps={3} />,
    );
    const step2 = getByLabelText('Step 2 of 3: Step 2');
    // Current step has bg-blue-500
    expect(step2.props.className).toContain('bg-blue-500');
  });

  it('marks completed steps', () => {
    const { getByLabelText } = render(
      <ProgressIndicator currentStep={2} totalSteps={3} />,
    );
    const step1 = getByLabelText('Step 1 of 3: Step 1');
    // Completed step has bg-blue-600
    expect(step1.props.className).toContain('bg-blue-600');
  });

  it('renders step labels when showLabels is true', () => {
    const { getByText } = render(
      <ProgressIndicator
        currentStep={0}
        totalSteps={3}
        showLabels
        labels={['Personal', 'Passport', 'Review']}
      />,
    );
    expect(getByText('Personal')).toBeTruthy();
    expect(getByText('Passport')).toBeTruthy();
    expect(getByText('Review')).toBeTruthy();
  });

  it('uses default labels when custom labels not provided', () => {
    const { getByLabelText } = render(
      <ProgressIndicator currentStep={0} totalSteps={2} />,
    );
    expect(getByLabelText('Step 1 of 2: Step 1')).toBeTruthy();
    expect(getByLabelText('Step 2 of 2: Step 2')).toBeTruthy();
  });

  it('renders dots variant', () => {
    const { getAllByLabelText } = render(
      <ProgressIndicator currentStep={1} totalSteps={3} variant="dots" />,
    );
    const dots = getAllByLabelText(/Step \d+ of 3/);
    expect(dots).toHaveLength(3);
  });

  it('renders vertical variant', () => {
    const { getAllByLabelText } = render(
      <ProgressIndicator currentStep={0} totalSteps={3} variant="vertical" />,
    );
    const steps = getAllByLabelText(/Step \d+ of 3/);
    expect(steps).toHaveLength(3);
  });

  it('renders vertical variant with labels', () => {
    const { getByText } = render(
      <ProgressIndicator
        currentStep={1}
        totalSteps={2}
        variant="vertical"
        showLabels
        labels={['Info', 'Confirm']}
      />,
    );
    expect(getByText('Info')).toBeTruthy();
    expect(getByText('Confirm')).toBeTruthy();
  });

  it('sets accessibility value on each step', () => {
    const { getByLabelText } = render(
      <ProgressIndicator currentStep={1} totalSteps={3} variant="dots" />,
    );
    const dot = getByLabelText('Step 1 of 3');
    expect(dot.props.accessibilityValue).toEqual({
      now: 2,
      min: 1,
      max: 3,
    });
  });
});
