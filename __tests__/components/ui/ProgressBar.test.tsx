import { render } from '@testing-library/react-native';
import ProgressBar from '../../../src/components/ui/ProgressBar';

describe('ProgressBar Component', () => {
  const defaultProps = {
    progress: 50, // 50%
  };

  it('should render with default props', () => {
    const { UNSAFE_root } = render(<ProgressBar {...defaultProps} />);
    
    expect(UNSAFE_root).toBeTruthy();
  });

  it('should display correct progress percentage', () => {
    const { getByText } = render(
      <ProgressBar {...defaultProps} progress={75} showPercentage />
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
      <ProgressBar {...defaultProps} progress={100} showPercentage />
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
    const { rerender, UNSAFE_root } = render(
      <ProgressBar {...defaultProps} color="blue" />
    );
    
    expect(UNSAFE_root).toBeTruthy();
    
    rerender(<ProgressBar {...defaultProps} color="green" />);
    expect(UNSAFE_root).toBeTruthy();
    
    rerender(<ProgressBar {...defaultProps} color="red" />);
    expect(UNSAFE_root).toBeTruthy();
    
    rerender(<ProgressBar {...defaultProps} color="yellow" />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('should handle purple and gray colors', () => {
    const { UNSAFE_root } = render(
      <ProgressBar {...defaultProps} color="purple" />
    );
    
    expect(UNSAFE_root).toBeTruthy();
  });

  it('should handle different sizes', () => {
    const { rerender, container } = render(
      <ProgressBar {...defaultProps} size="small" />
    );
    
    expect(UNSAFE_root).toBeTruthy();
    
    rerender(<ProgressBar {...defaultProps} size="medium" />);
    expect(UNSAFE_root).toBeTruthy();
    
    rerender(<ProgressBar {...defaultProps} size="large" />);
    expect(UNSAFE_root).toBeTruthy();
  });

  it('should support animated mode', () => {
    const { UNSAFE_root } = render(
      <ProgressBar {...defaultProps} animated={true} />
    );
    
    expect(UNSAFE_root).toBeTruthy();
  });

  it('should show percentage when enabled', () => {
    const { getByText } = render(
      <ProgressBar 
        {...defaultProps} 
        progress={70} 
        showPercentage 
      />
    );
    
    // Should show percentage when enabled
    expect(getByText('70%')).toBeTruthy();
  });

  it('should display custom label', () => {
    const { getByText } = render(
      <ProgressBar 
        {...defaultProps} 
        progress={30} 
        label="Loading files" 
      />
    );
    
    expect(getByText('Loading files')).toBeTruthy();
  });

  it('should show both label and percentage', () => {
    const { getByText } = render(
      <ProgressBar 
        {...defaultProps} 
        progress={30} 
        showPercentage 
        label="Loading files" 
      />
    );
    
    expect(getByText('Loading files')).toBeTruthy();
    expect(getByText('30%')).toBeTruthy();
  });

  it('should handle progress values outside 0-100 range', () => {
    const { rerender, getByText } = render(
      <ProgressBar {...defaultProps} progress={-10} showPercentage />
    );
    
    // Should clamp to 0%
    expect(getByText('0%')).toBeTruthy();
    
    rerender(<ProgressBar {...defaultProps} progress={150} showPercentage />);
    
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
    const { getByRole } = render(
      <ProgressBar {...defaultProps} progress={75} />
    );
    
    const progressBar = getByRole('progressbar');
    expect(progressBar.props.accessibilityValue).toEqual(
      expect.objectContaining({
        min: 0,
        max: 100,
        now: 75,
      })
    );
  });

  it('should handle animated progress changes', () => {
    const { rerender, container } = render(
      <ProgressBar {...defaultProps} progress={20} animated />
    );
    
    expect(UNSAFE_root).toBeTruthy();
    
    rerender(<ProgressBar {...defaultProps} progress={80} animated />);
    expect(UNSAFE_root).toBeTruthy();
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined progress gracefully', () => {
      const { UNSAFE_root } = render(
        <ProgressBar {...defaultProps} progress={null as any} />
      );
      
      expect(UNSAFE_root).toBeTruthy();
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
        <ProgressBar {...defaultProps} progress={0.1} showPercentage />
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
      
      const { UNSAFE_root } = render(
        <ProgressBar {...defaultProps} style={customStyle} />
      );
      
      expect(UNSAFE_root).toBeTruthy();
    });

    it('should handle different colors', () => {
      const { UNSAFE_root } = render(
        <ProgressBar {...defaultProps} color="gray" />
      );
      
      expect(UNSAFE_root).toBeTruthy();
    });

    it('should handle class name prop', () => {
      const { UNSAFE_root } = render(
        <ProgressBar {...defaultProps} className="custom-progress" />
      );
      
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should handle rapid progress updates', () => {
      const { rerender, container } = render(
        <ProgressBar {...defaultProps} progress={10} />
      );
      
      // Simulate rapid updates
      for (let i = 20; i <= 100; i += 10) {
        rerender(<ProgressBar {...defaultProps} progress={i} />);
      }
      
      expect(UNSAFE_root).toBeTruthy();
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
        <ProgressBar {...defaultProps} progress={33.333333} showPercentage />
      );
      
      // Should round to nearest whole number
      expect(getByText('33%')).toBeTruthy();
    });

    it('should display label with percentage correctly', () => {
      const { getByText } = render(
        <ProgressBar 
          {...defaultProps} 
          progress={33} 
          label="Loading" 
          showPercentage
        />
      );
      
      expect(getByText('Loading')).toBeTruthy();
      expect(getByText('33%')).toBeTruthy();
    });
  });
});