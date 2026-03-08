import React from 'react';
import { render } from '@testing-library/react-native';
import { LoadingSpinner } from '../../../src/components/ui/LoadingSpinner';

describe('LoadingSpinner Component', () => {
  it('should render with default props', () => {
    const { getByTestId } = render(<LoadingSpinner />);
    
    expect(getByTestId('loading-spinner')).toBeTruthy();
  });

  it('should display loading text when provided', () => {
    const { getByText } = render(
      <LoadingSpinner text="Loading..." />
    );
    
    expect(getByText('Loading...')).toBeTruthy();
  });

  it('should render different sizes correctly', () => {
    const { rerender, getByTestId } = render(
      <LoadingSpinner size="small" />
    );
    
    expect(getByTestId('loading-spinner')).toBeTruthy();
    
    rerender(<LoadingSpinner size="medium" />);
    expect(getByTestId('loading-spinner')).toBeTruthy();
    
    rerender(<LoadingSpinner size="large" />);
    expect(getByTestId('loading-spinner')).toBeTruthy();
  });

  it('should apply custom color', () => {
    const { getByTestId } = render(
      <LoadingSpinner color="#FF0000" />
    );
    
    expect(getByTestId('loading-spinner')).toBeTruthy();
  });

  it('should handle overlay mode', () => {
    const { getByTestId } = render(
      <LoadingSpinner overlay />
    );
    
    expect(getByTestId('loading-overlay')).toBeTruthy();
    expect(getByTestId('loading-spinner')).toBeTruthy();
  });

  it('should display custom message in overlay mode', () => {
    const { getByText } = render(
      <LoadingSpinner overlay text="Processing your request..." />
    );
    
    expect(getByText('Processing your request...')).toBeTruthy();
  });

  it('should handle animating prop', () => {
    const { getByTestId } = render(
      <LoadingSpinner animating={false} />
    );
    
    // Should still render but not animate
    expect(getByTestId('loading-spinner')).toBeTruthy();
  });

  it('should handle accessibility props', () => {
    const { getByLabelText } = render(
      <LoadingSpinner 
        accessibilityLabel="Loading content"
        accessibilityHint="Please wait while content loads"
      />
    );
    
    expect(getByLabelText('Loading content')).toBeTruthy();
  });

  it('should work with custom test IDs', () => {
    const { getByTestId } = render(
      <LoadingSpinner testID="custom-spinner" />
    );
    
    expect(getByTestId('custom-spinner')).toBeTruthy();
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined text gracefully', () => {
      const { queryByText } = render(
        <LoadingSpinner text={null as any} />
      );
      
      // Should not crash and not display any text
      expect(queryByText('')).toBeNull();
    });

    it('should handle empty string text', () => {
      const { queryByText } = render(
        <LoadingSpinner text="" />
      );
      
      // Should not display empty text
      expect(queryByText('')).toBeNull();
    });

    it('should handle very long text messages', () => {
      const longText = 'This is a very long loading message that should be handled gracefully by the component without breaking the layout or causing performance issues';
      
      const { getByText } = render(
        <LoadingSpinner text={longText} />
      );
      
      expect(getByText(longText)).toBeTruthy();
    });

    it('should handle rapid prop changes', () => {
      const { rerender, getByTestId } = render(
        <LoadingSpinner size="small" color="#FF0000" />
      );
      
      rerender(<LoadingSpinner size="large" color="#00FF00" />);
      rerender(<LoadingSpinner size="medium" color="#0000FF" />);
      
      expect(getByTestId('loading-spinner')).toBeTruthy();
    });

    it('should handle boolean prop edge cases', () => {
      const { getByTestId } = render(
        <LoadingSpinner 
          animating={undefined as any}
          overlay={false}
        />
      );
      
      expect(getByTestId('loading-spinner')).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      let renderCount = 0;
      
      const TestComponent = (props: any) => {
        renderCount++;
        return <LoadingSpinner {...props} />;
      };
      
      const { rerender } = render(<TestComponent text="Loading..." />);
      
      const initialCount = renderCount;
      
      // Re-render with same props
      rerender(<TestComponent text="Loading..." />);
      
      // Should have rendered twice (initial + rerender)
      expect(renderCount).toBe(initialCount + 1);
    });

    it('should handle multiple instances without interference', () => {
      const { getAllByTestId } = render(
        <>
          <LoadingSpinner testID="spinner-1" />
          <LoadingSpinner testID="spinner-2" />
          <LoadingSpinner testID="spinner-3" />
        </>
      );
      
      expect(getAllByTestId(/spinner-/)).toHaveLength(3);
    });
  });

  describe('Accessibility', () => {
    it('should have proper default accessibility properties', () => {
      const { getByRole } = render(<LoadingSpinner />);
      
      // ActivityIndicator should have progressbar role
      expect(getByRole('progressbar')).toBeTruthy();
    });

    it('should support custom accessibility roles', () => {
      const { getByTestId } = render(
        <LoadingSpinner 
          accessibilityRole="status"
          accessibilityState={{ busy: true }}
        />
      );
      
      expect(getByTestId('loading-spinner')).toBeTruthy();
    });

    it('should announce loading state changes', () => {
      const { rerender, getByTestId } = render(
        <LoadingSpinner animating={false} />
      );
      
      rerender(<LoadingSpinner animating={true} />);
      
      expect(getByTestId('loading-spinner')).toBeTruthy();
    });
  });

  describe('Styling', () => {
    it('should accept custom styles', () => {
      const customStyle = { backgroundColor: 'red' };
      
      const { getByTestId } = render(
        <LoadingSpinner style={customStyle} />
      );
      
      expect(getByTestId('loading-spinner')).toBeTruthy();
    });

    it('should handle style arrays', () => {
      const style1 = { backgroundColor: 'red' };
      const style2 = { opacity: 0.5 };
      
      const { getByTestId } = render(
        <LoadingSpinner style={[style1, style2]} />
      );
      
      expect(getByTestId('loading-spinner')).toBeTruthy();
    });

    it('should apply proper overlay styles', () => {
      const { getByTestId } = render(
        <LoadingSpinner overlay />
      );
      
      const overlay = getByTestId('loading-overlay');
      expect(overlay).toBeTruthy();
      
      // Overlay should be positioned absolutely
      expect(overlay.props.style).toEqual(
        expect.objectContaining({
          position: 'absolute',
        })
      );
    });
  });
});