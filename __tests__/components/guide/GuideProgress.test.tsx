import React from 'react';
import { render } from '@testing-library/react-native';
import GuideProgress from '../../../src/components/guide/GuideProgress';

describe('GuideProgress', () => {
  const defaultProps = {
    totalSteps: 5,
    currentStep: 3,
    completedSteps: [1, 2],
  };

  it('renders correctly with basic props', () => {
    const { getByText } = render(<GuideProgress {...defaultProps} />);

    expect(getByText('Step 3 of 5')).toBeTruthy();
    expect(getByText('40% Complete')).toBeTruthy();
  });

  it('displays step titles when provided', () => {
    const stepTitles = [
      'First Step',
      'Second Step', 
      'Third Step',
      'Fourth Step',
      'Fifth Step'
    ];

    const { getAllByText } = render(
      <GuideProgress 
        {...defaultProps} 
        stepTitles={stepTitles}
        showLabels={true}
      />
    );

    stepTitles.forEach(title => {
      expect(getAllByText(title).length).toBeGreaterThan(0);
    });
  });

  it('shows current step information', () => {
    const stepTitles = ['Step 1', 'Step 2', 'Current Title', 'Step 4', 'Step 5'];

    const { getByText, getAllByText } = render(
      <GuideProgress 
        {...defaultProps}
        stepTitles={stepTitles}
      />
    );

    expect(getByText('Current Step:')).toBeTruthy();
    // Use getAllByText since "Current Title" appears in both step label and current step info
    expect(getAllByText('Current Title').length).toBeGreaterThan(0);
  });

  it('calculates completion percentage correctly', () => {
    const { getByText } = render(
      <GuideProgress 
        totalSteps={10}
        currentStep={5}
        completedSteps={[1, 2, 3, 4]}
      />
    );

    expect(getByText('40% Complete')).toBeTruthy();
  });

  it('handles 100% completion', () => {
    const { getByText } = render(
      <GuideProgress 
        totalSteps={3}
        currentStep={3}
        completedSteps={[1, 2, 3]}
      />
    );

    expect(getByText('100% Complete')).toBeTruthy();
  });

  it('handles 0% completion', () => {
    const { getByText } = render(
      <GuideProgress 
        totalSteps={5}
        currentStep={1}
        completedSteps={[]}
      />
    );

    expect(getByText('0% Complete')).toBeTruthy();
  });

  it('renders in vertical variant', () => {
    const { getByText } = render(
      <GuideProgress 
        {...defaultProps}
        variant="vertical"
      />
    );

    // Should still show the same text content
    expect(getByText('Step 3 of 5')).toBeTruthy();
  });

  it('hides labels when showLabels is false', () => {
    const stepTitles = ['Label One', 'Label Two', 'Label Three', 'Label Four', 'Label Five'];

    const { queryAllByText } = render(
      <GuideProgress 
        {...defaultProps}
        stepTitles={stepTitles}
        showLabels={false}
      />
    );

    // Labels should not be rendered - check that none of the unique labels appear
    stepTitles.forEach(title => {
      expect(queryAllByText(title)).toHaveLength(0);
    });
  });

  it('renders different sizes correctly', () => {
    const sizes = ['small', 'medium', 'large'] as const;
    
    sizes.forEach(size => {
      const { getByText } = render(
        <GuideProgress 
          {...defaultProps}
          size={size}
        />
      );

      expect(getByText('Step 3 of 5')).toBeTruthy();
    });
  });

  it('handles edge case with no steps', () => {
    const { getByText } = render(
      <GuideProgress 
        totalSteps={0}
        currentStep={0}
        completedSteps={[]}
      />
    );

    expect(getByText('Step 0 of 0')).toBeTruthy();
  });

  it('handles edge case with invalid current step', () => {
    const { getByText } = render(
      <GuideProgress 
        totalSteps={5}
        currentStep={10} // Invalid: greater than total
        completedSteps={[1, 2]}
      />
    );

    expect(getByText('Step 10 of 5')).toBeTruthy();
  });

  it('handles edge case with duplicate completed steps', () => {
    const { getByText } = render(
      <GuideProgress 
        totalSteps={5}
        currentStep={3}
        completedSteps={[1, 1, 2, 2]} // Duplicates
      />
    );

    // Should still calculate percentage based on unique completed steps
    expect(getByText('40% Complete')).toBeTruthy();
  });

  it('does not show current step info when no step titles provided', () => {
    const { queryByText } = render(
      <GuideProgress {...defaultProps} />
    );

    expect(queryByText('Current Step:')).toBeNull();
  });

  it('handles single step progress', () => {
    const { getByText } = render(
      <GuideProgress 
        totalSteps={1}
        currentStep={1}
        completedSteps={[]}
      />
    );

    expect(getByText('Step 1 of 1')).toBeTruthy();
    expect(getByText('0% Complete')).toBeTruthy();
  });
});