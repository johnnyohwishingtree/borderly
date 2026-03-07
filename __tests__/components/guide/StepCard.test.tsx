import { render, fireEvent } from '@testing-library/react-native';
import StepCard from '../../../src/components/guide/StepCard';
import { SubmissionStep } from '../../../src/types/schema';

// Mock CopyableField component
jest.mock('../../../src/components/guide/CopyableField', () => {
  return function MockCopyableField({ label, value }: any) {
    return <div data-testid="copyable-field">{label}: {value}</div>;
  };
});

describe('StepCard', () => {
  const mockStep: SubmissionStep = {
    order: 1,
    title: 'Test Step',
    description: 'This is a test step description',
    fieldsOnThisScreen: ['field1', 'field2'],
    tips: ['Tip 1', 'Tip 2'],
  };

  const mockFieldsData = {
    field1: { label: 'Field 1', value: 'Value 1', portalFieldName: 'Portal Field 1' },
    field2: { label: 'Field 2', value: 'Value 2' },
  };

  it('renders step card with basic information', () => {
    const { getByText } = render(
      <StepCard
        step={mockStep}
        isCompleted={false}
        isCurrent={true}
      />
    );

    expect(getByText('Step 1')).toBeTruthy();
    expect(getByText('Test Step')).toBeTruthy();
    expect(getByText('This is a test step description')).toBeTruthy();
    expect(getByText('Current')).toBeTruthy();
  });

  it('shows completed status correctly', () => {
    const { getByText } = render(
      <StepCard
        step={mockStep}
        isCompleted={true}
        isCurrent={false}
      />
    );

    expect(getByText('Completed')).toBeTruthy();
  });

  it('shows fields when step is current', () => {
    const { getByText } = render(
      <StepCard
        step={mockStep}
        isCompleted={false}
        isCurrent={true}
        fieldsData={mockFieldsData}
      />
    );

    expect(getByText('Information needed for this step:')).toBeTruthy();
  });

  it('shows tips when step is current', () => {
    const { getByText } = render(
      <StepCard
        step={mockStep}
        isCompleted={false}
        isCurrent={true}
      />
    );

    expect(getByText('Tips & Reminders:')).toBeTruthy();
    expect(getByText('Tip 1')).toBeTruthy();
    expect(getByText('Tip 2')).toBeTruthy();
  });

  it('shows mark complete button for current incomplete step', () => {
    const mockOnMarkComplete = jest.fn();
    
    const { getByText } = render(
      <StepCard
        step={mockStep}
        isCompleted={false}
        isCurrent={true}
        onMarkComplete={mockOnMarkComplete}
      />
    );

    expect(getByText('Mark as Complete')).toBeTruthy();
  });

  it('calls onMarkComplete when button is pressed', () => {
    const mockOnMarkComplete = jest.fn();
    
    const { getByText } = render(
      <StepCard
        step={mockStep}
        isCompleted={false}
        isCurrent={true}
        onMarkComplete={mockOnMarkComplete}
      />
    );

    fireEvent.press(getByText('Mark as Complete'));
    expect(mockOnMarkComplete).toHaveBeenCalled();
  });

  it('does not show mark complete button for completed step', () => {
    const mockOnMarkComplete = jest.fn();
    
    const { queryByText } = render(
      <StepCard
        step={mockStep}
        isCompleted={true}
        isCurrent={false}
        onMarkComplete={mockOnMarkComplete}
      />
    );

    expect(queryByText('Mark as Complete')).toBeNull();
  });

  it('shows collapsed state for future steps', () => {
    const { getByText } = render(
      <StepCard
        step={mockStep}
        isCompleted={false}
        isCurrent={false}
      />
    );

    expect(getByText('Complete previous steps to unlock this step')).toBeTruthy();
  });

  it('does not show fields and tips for future steps', () => {
    const { queryByText } = render(
      <StepCard
        step={mockStep}
        isCompleted={false}
        isCurrent={false}
        fieldsData={mockFieldsData}
      />
    );

    expect(queryByText('Information needed for this step:')).toBeNull();
    expect(queryByText('Tips & Reminders:')).toBeNull();
  });

  it('handles step without tips', () => {
    const stepWithoutTips = {
      ...mockStep,
      tips: undefined,
    };

    const { queryByText } = render(
      <StepCard
        step={stepWithoutTips}
        isCompleted={false}
        isCurrent={true}
      />
    );

    expect(queryByText('Tips & Reminders:')).toBeNull();
  });

  it('handles step without fields', () => {
    const stepWithoutFields: SubmissionStep = {
      ...mockStep,
      fieldsOnThisScreen: [],
    };

    const { queryByText } = render(
      <StepCard
        step={stepWithoutFields}
        isCompleted={false}
        isCurrent={true}
      />
    );

    expect(queryByText('Information needed for this step:')).toBeNull();
  });

  it('handles missing field data gracefully', () => {
    const { queryByTestId } = render(
      <StepCard
        step={mockStep}
        isCompleted={false}
        isCurrent={true}
        fieldsData={{}} // Empty fields data
      />
    );

    // Should not render any copyable fields
    expect(queryByTestId('copyable-field')).toBeNull();
  });

  it('applies correct styling for different step states', () => {
    const completedStep = render(
      <StepCard
        step={mockStep}
        isCompleted={true}
        isCurrent={false}
      />
    );

    const currentStep = render(
      <StepCard
        step={mockStep}
        isCompleted={false}
        isCurrent={true}
      />
    );

    const futureStep = render(
      <StepCard
        step={mockStep}
        isCompleted={false}
        isCurrent={false}
      />
    );

    // All should render the basic step structure
    expect(completedStep.getByText('Test Step')).toBeTruthy();
    expect(currentStep.getByText('Test Step')).toBeTruthy();
    expect(futureStep.getByText('Test Step')).toBeTruthy();
  });

  it('renders with empty tips array', () => {
    const stepWithEmptyTips: SubmissionStep = {
      ...mockStep,
      tips: [],
    };

    const { queryByText } = render(
      <StepCard
        step={stepWithEmptyTips}
        isCompleted={false}
        isCurrent={true}
      />
    );

    expect(queryByText('Tips & Reminders:')).toBeNull();
  });

  it('handles step with screenshot asset', () => {
    const stepWithScreenshot: SubmissionStep = {
      ...mockStep,
      screenshotAsset: 'path/to/screenshot.png',
    };

    const { getByText } = render(
      <StepCard
        step={stepWithScreenshot}
        isCompleted={false}
        isCurrent={true}
      />
    );

    // Should still render normally (screenshot handling would be in implementation)
    expect(getByText('Test Step')).toBeTruthy();
  });
});