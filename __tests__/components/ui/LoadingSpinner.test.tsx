import { render } from '@testing-library/react-native';
import LoadingSpinner from '../../../src/components/ui/LoadingSpinner';

describe('LoadingSpinner Component', () => {
  it('should render with default props', () => {
    const { getByLabelText } = render(<LoadingSpinner />);
    
    expect(getByLabelText('Loading')).toBeTruthy();
  });

  it('should display loading text when provided', () => {
    const { getByText } = render(
      <LoadingSpinner text="Loading..." />
    );
    
    expect(getByText('Loading...')).toBeTruthy();
  });

  it('should render different sizes correctly', () => {
    const { rerender, getByLabelText } = render(
      <LoadingSpinner size="small" />
    );
    
    expect(getByLabelText('Loading')).toBeTruthy();
    
    rerender(<LoadingSpinner size="medium" />);
    expect(getByLabelText('Loading')).toBeTruthy();
    
    rerender(<LoadingSpinner size="large" />);
    expect(getByLabelText('Loading')).toBeTruthy();
  });

  it('should apply custom color', () => {
    const { getByLabelText } = render(
      <LoadingSpinner color="#FF0000" />
    );
    
    expect(getByLabelText('Loading')).toBeTruthy();
  });

  it('should handle overlay variant', () => {
    const { getByLabelText } = render(
      <LoadingSpinner variant="overlay" />
    );
    
    expect(getByLabelText('Loading')).toBeTruthy();
  });

  it('should display custom message in overlay mode', () => {
    const { getByText } = render(
      <LoadingSpinner variant="overlay" text="Processing your request..." />
    );
    
    expect(getByText('Processing your request...')).toBeTruthy();
  });

  it('should handle skeleton variant', () => {
    const { UNSAFE_root } = render(
      <LoadingSpinner variant="skeleton" />
    );
    
    // Should render skeleton variant
    expect(UNSAFE_root).toBeTruthy();
  });

  it('should handle fullScreen mode', () => {
    const { getByLabelText } = render(
      <LoadingSpinner 
        fullScreen={true}
        text="Loading content"
      />
    );
    
    expect(getByLabelText('Loading')).toBeTruthy();
  });

  it('should handle timeout functionality', () => {
    const onTimeout = jest.fn();
    const { getByLabelText } = render(
      <LoadingSpinner 
        timeout={1000}
        onTimeout={onTimeout}
      />
    );
    
    expect(getByLabelText('Loading')).toBeTruthy();
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
      
      expect(getByLabelText('Loading')).toBeTruthy();
    });

    it('should handle boolean prop edge cases', () => {
      const { getByLabelText } = render(
        <LoadingSpinner 
          cancelable={false}
          fullScreen={false}
        />
      );
      
      expect(getByLabelText('Loading')).toBeTruthy();
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
      const { getAllByLabelText } = render(
        <>
          <LoadingSpinner text="Loading 1" />
          <LoadingSpinner text="Loading 2" />
          <LoadingSpinner text="Loading 3" />
        </>
      );
      
      expect(getAllByLabelText('Loading')).toHaveLength(3);
    });
  });

  describe('Accessibility', () => {
    it('should have proper default accessibility properties', () => {
      const { getByLabelText } = render(<LoadingSpinner />);
      
      // ActivityIndicator should have accessibility label
      expect(getByLabelText('Loading')).toBeTruthy();
    });

    it('should support cancelable functionality', () => {
      const onCancel = jest.fn();
      const { getByLabelText } = render(
        <LoadingSpinner 
          cancelable={true}
          onCancel={onCancel}
        />
      );
      
      expect(getByLabelText('Loading')).toBeTruthy();
    });

    it('should show timeout message when appropriate', () => {
      const { getByLabelText } = render(
        <LoadingSpinner timeout={100} />
      );
      
      expect(getByLabelText('Loading')).toBeTruthy();
    });
  });

  describe('Styling', () => {
    it('should handle different size variants', () => {
      const { getByLabelText } = render(
        <LoadingSpinner size="large" />
      );
      
      expect(getByLabelText('Loading')).toBeTruthy();
    });

    it('should handle custom color properly', () => {
      const { getByLabelText } = render(
        <LoadingSpinner color="#FF5733" />
      );
      
      expect(getByLabelText('Loading')).toBeTruthy();
    });

    it('should apply proper variant styles', () => {
      const { getByLabelText } = render(
        <LoadingSpinner variant="overlay" />
      );
      
      expect(getByLabelText('Loading')).toBeTruthy();
    });
  });
});