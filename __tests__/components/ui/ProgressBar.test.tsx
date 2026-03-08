import React from 'react';
import { render } from '@testing-library/react-native';
import { ProgressBar } from '../../../src/components/ui/ProgressBar';

describe('ProgressBar Component', () => {
  const defaultProps = {
    progress: 0.5, // 50%
    testID: 'progress-bar',
  };

  it('should render with default props', () => {
    const { getByTestId } = render(<ProgressBar {...defaultProps} />);
    
    expect(getByTestId('progress-bar')).toBeTruthy();
  });

  it('should display correct progress percentage', () => {
    const { getByText } = render(
      <ProgressBar {...defaultProps} progress={0.75} showPercentage />
    );
    
    expect(getByText('75%')).toBeTruthy();
  });

  it('should handle 0% progress', () => {
    const { getByText } = render(
      <ProgressBar {...defaultProps} progress={0} showPercentage />
    );
    
    expect(getByText('0%')).toBeTruthy();
  });

  it('should handle 100% progress', () => {
    const { getByText } = render(
      <ProgressBar {...defaultProps} progress={1} showPercentage />
    );
    
    expect(getByText('100%')).toBeTruthy();
  });

  it('should display custom label when provided', () => {
    const { getByText } = render(
      <ProgressBar {...defaultProps} label="Loading files..." />
    );
    
    expect(getByText('Loading files...')).toBeTruthy();
  });

  it('should handle different color variants', () => {
    const { rerender, getByTestId } = render(
      <ProgressBar {...defaultProps} color="primary" />
    );
    
    expect(getByTestId('progress-bar')).toBeTruthy();
    
    rerender(<ProgressBar {...defaultProps} color="success" />);
    expect(getByTestId('progress-bar')).toBeTruthy();
    
    rerender(<ProgressBar {...defaultProps} color="warning" />);
    expect(getByTestId('progress-bar')).toBeTruthy();
    
    rerender(<ProgressBar {...defaultProps} color="danger" />);
    expect(getByTestId('progress-bar')).toBeTruthy();
  });

  it('should handle custom colors', () => {
    const { getByTestId } = render(
      <ProgressBar {...defaultProps} color="#FF5733" />
    );
    
    expect(getByTestId('progress-bar')).toBeTruthy();
  });

  it('should handle different sizes', () => {
    const { rerender, getByTestId } = render(
      <ProgressBar {...defaultProps} size="small" />
    );
    
    expect(getByTestId('progress-bar')).toBeTruthy();
    
    rerender(<ProgressBar {...defaultProps} size="medium" />);
    expect(getByTestId('progress-bar')).toBeTruthy();
    
    rerender(<ProgressBar {...defaultProps} size="large" />);
    expect(getByTestId('progress-bar')).toBeTruthy();
  });

  it('should support indeterminate mode', () => {
    const { getByTestId } = render(
      <ProgressBar {...defaultProps} indeterminate />
    );
    
    expect(getByTestId('progress-bar')).toBeTruthy();
  });

  it('should hide percentage in indeterminate mode', () => {
    const { queryByText } = render(
      <ProgressBar 
        {...defaultProps} 
        progress={0.7} 
        indeterminate 
        showPercentage 
      />
    );
    
    // Should not show percentage when indeterminate
    expect(queryByText('70%')).toBeNull();
  });

  it('should display custom progress text', () => {
    const { getByText } = render(
      <ProgressBar 
        {...defaultProps} 
        progress={0.3} 
        progressText="3 of 10 files" 
      />
    );
    
    expect(getByText('3 of 10 files')).toBeTruthy();
  });

  it('should prioritize progressText over percentage', () => {
    const { getByText, queryByText } = render(
      <ProgressBar 
        {...defaultProps} 
        progress={0.3} 
        showPercentage 
        progressText="3 of 10 files" 
      />
    );
    
    expect(getByText('3 of 10 files')).toBeTruthy();
    expect(queryByText('30%')).toBeNull();
  });

  it('should handle progress values outside 0-1 range', () => {
    const { rerender, getByText } = render(
      <ProgressBar {...defaultProps} progress={-0.1} showPercentage />
    );
    
    // Should clamp to 0%
    expect(getByText('0%')).toBeTruthy();
    
    rerender(<ProgressBar {...defaultProps} progress={1.5} showPercentage />);
    
    // Should clamp to 100%
    expect(getByText('100%')).toBeTruthy();
  });

  it('should support accessibility props', () => {
    const { getByLabelText } = render(
      <ProgressBar 
        {...defaultProps} 
        accessibilityLabel="File upload progress"
        accessibilityHint="Shows current upload progress"
      />
    );
    
    expect(getByLabelText('File upload progress')).toBeTruthy();
  });

  it('should have proper accessibility value', () => {
    const { getByTestId } = render(
      <ProgressBar {...defaultProps} progress={0.75} />
    );
    
    const progressBar = getByTestId('progress-bar');
    expect(progressBar.props.accessibilityValue).toEqual({
      min: 0,
      max: 100,
      now: 75,
    });
  });

  it('should handle animated progress changes', () => {
    const { rerender, getByTestId } = render(
      <ProgressBar {...defaultProps} progress={0.2} animated />
    );
    
    expect(getByTestId('progress-bar')).toBeTruthy();
    
    rerender(<ProgressBar {...defaultProps} progress={0.8} animated />);
    expect(getByTestId('progress-bar')).toBeTruthy();
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined progress gracefully', () => {
      const { getByTestId } = render(
        <ProgressBar {...defaultProps} progress={null as any} />
      );
      
      expect(getByTestId('progress-bar')).toBeTruthy();
    });

    it('should handle NaN progress values', () => {
      const { getByText } = render(
        <ProgressBar {...defaultProps} progress={NaN} showPercentage />
      );
      
      // Should default to 0%
      expect(getByText('0%')).toBeTruthy();
    });

    it('should handle very small progress values', () => {
      const { getByText } = render(
        <ProgressBar {...defaultProps} progress={0.001} showPercentage />
      );
      
      expect(getByText('0%')).toBeTruthy();
    });

    it('should handle very large progress values', () => {
      const { getByText } = render(
        <ProgressBar {...defaultProps} progress={999} showPercentage />
      );
      
      // Should clamp to 100%
      expect(getByText('100%')).toBeTruthy();
    });

    it('should handle empty label gracefully', () => {
      const { queryByText } = render(
        <ProgressBar {...defaultProps} label="" />
      );
      
      expect(queryByText('')).toBeNull();
    });

    it('should handle extremely long labels', () => {
      const longLabel = 'This is an extremely long label that might cause layout issues if not handled properly by the component';
      
      const { getByText } = render(
        <ProgressBar {...defaultProps} label={longLabel} />
      );
      
      expect(getByText(longLabel)).toBeTruthy();
    });
  });

  describe('Styling', () => {
    it('should accept custom container styles', () => {
      const customStyle = { marginTop: 20 };
      
      const { getByTestId } = render(
        <ProgressBar {...defaultProps} style={customStyle} />
      );
      
      expect(getByTestId('progress-bar')).toBeTruthy();
    });

    it('should apply proper background color', () => {
      const { getByTestId } = render(
        <ProgressBar {...defaultProps} backgroundColor="#F0F0F0" />
      );
      
      expect(getByTestId('progress-bar')).toBeTruthy();
    });

    it('should handle style arrays', () => {
      const style1 = { marginTop: 10 };
      const style2 = { marginBottom: 10 };
      
      const { getByTestId } = render(
        <ProgressBar {...defaultProps} style={[style1, style2]} />
      );
      
      expect(getByTestId('progress-bar')).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should handle rapid progress updates', () => {
      const { rerender, getByTestId } = render(
        <ProgressBar {...defaultProps} progress={0.1} />
      );
      
      // Simulate rapid updates
      for (let i = 0.2; i <= 1.0; i += 0.1) {
        rerender(<ProgressBar {...defaultProps} progress={i} />);
      }
      
      expect(getByTestId('progress-bar')).toBeTruthy();
    });

    it('should not cause memory leaks with animations', () => {
      const { unmount } = render(
        <ProgressBar {...defaultProps} progress={0.5} animated />
      );
      
      // Should unmount without issues
      unmount();
    });
  });

  describe('Formatting', () => {
    it('should format percentage with proper precision', () => {
      const { getByText } = render(
        <ProgressBar {...defaultProps} progress={0.333333} showPercentage />
      );
      
      // Should round to nearest whole number
      expect(getByText('33%')).toBeTruthy();
    });

    it('should handle decimal precision in progress text', () => {
      const { getByText } = render(
        <ProgressBar 
          {...defaultProps} 
          progress={0.333} 
          progressText="33.3%" 
        />
      );
      
      expect(getByText('33.3%')).toBeTruthy();
    });
  });
});