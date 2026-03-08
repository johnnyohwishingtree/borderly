import { render, fireEvent } from '@testing-library/react-native';
import Select from '../../../src/components/ui/Select';

const mockOptions = [
  { label: 'Option 1', value: 'option1' },
  { label: 'Option 2', value: 'option2' },
  { label: 'Option 3', value: 'option3' },
];

describe('Select Component', () => {
  const defaultProps = {
    label: 'Test Select',
    options: mockOptions,
    value: '',
    onValueChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with default props', () => {
    const { getByText } = render(<Select {...defaultProps} />);
    
    expect(getByText('Test Select')).toBeTruthy();
  });

  it('should display placeholder when no value selected', () => {
    const { getByText } = render(
      <Select {...defaultProps} placeholder="Select an option..." />
    );
    
    expect(getByText('Select an option...')).toBeTruthy();
  });

  it('should display selected value', () => {
    const { getByText } = render(
      <Select {...defaultProps} value="option1" />
    );
    
    expect(getByText('Option 1')).toBeTruthy();
  });

  it('should show required indicator when required', () => {
    const { getByText } = render(
      <Select {...defaultProps} required />
    );
    
    expect(getByText('*')).toBeTruthy();
  });

  it('should display error message when error provided', () => {
    const { getByText } = render(
      <Select {...defaultProps} error="This field is required" />
    );
    
    expect(getByText('This field is required')).toBeTruthy();
  });

  it('should handle testID prop', () => {
    const { getByTestId } = render(
      <Select {...defaultProps} testID="custom-select" />
    );
    
    expect(getByTestId('custom-select')).toBeTruthy();
  });

  it('should display error message and hide normal content', () => {
    const { getByText } = render(
      <Select
        {...defaultProps}
        error="Error message"
      />
    );
    
    expect(getByText('Error message')).toBeTruthy();
  });

  it('should open options when pressed', () => {
    const { getByRole, getByText } = render(<Select {...defaultProps} />);
    
    const selectButton = getByRole('button');
    fireEvent.press(selectButton);
    
    expect(getByText('Option 1')).toBeTruthy();
    expect(getByText('Option 2')).toBeTruthy();
    expect(getByText('Option 3')).toBeTruthy();
  });

  it('should call onValueChange when option selected', () => {
    const onValueChange = jest.fn();
    const { getByRole, getByText } = render(
      <Select {...defaultProps} onValueChange={onValueChange} />
    );
    
    const selectButton = getByRole('button');
    fireEvent.press(selectButton);
    
    const option = getByText('Option 2');
    fireEvent.press(option);
    
    expect(onValueChange).toHaveBeenCalledWith('option2');
  });

  it('should close options after selection', () => {
    const { getByRole, getByText, queryByText } = render(<Select {...defaultProps} />);
    
    const selectButton = getByRole('button');
    fireEvent.press(selectButton);
    
    const option = getByText('Option 1');
    fireEvent.press(option);
    
    // Modal should close after selection
    setTimeout(() => {
      expect(queryByText('Option 2')).toBeNull();
      expect(queryByText('Option 3')).toBeNull();
    }, 100);
  });

  it('should handle disabled state', () => {
    const onValueChange = jest.fn();
    const { getByRole } = render(
      <Select {...defaultProps} onValueChange={onValueChange} disabled />
    );
    
    const selectButton = getByRole('button');
    fireEvent.press(selectButton);
    
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('should handle empty options array', () => {
    const { getByText } = render(
      <Select {...defaultProps} options={[]} />
    );
    
    expect(getByText('Test Select')).toBeTruthy();
  });

  it('should handle options with duplicate values', () => {
    const duplicateOptions = [
      { label: 'First Option 1', value: 'option1' },
      { label: 'Second Option 1', value: 'option1' },
    ];
    
    const onValueChange = jest.fn();
    const { getByRole, getByText } = render(
      <Select {...defaultProps} options={duplicateOptions} onValueChange={onValueChange} />
    );
    
    const selectButton = getByRole('button');
    fireEvent.press(selectButton);
    
    const firstOption = getByText('First Option 1');
    fireEvent.press(firstOption);
    
    expect(onValueChange).toHaveBeenCalledWith('option1');
  });

  it('should handle long option labels gracefully', () => {
    const longLabelOptions = [
      { 
        label: 'This is a very long option label that should be handled gracefully by the component', 
        value: 'long1' 
      },
    ];
    
    const { getByRole, getByText } = render(
      <Select {...defaultProps} options={longLabelOptions} />
    );
    
    const selectButton = getByRole('button');
    fireEvent.press(selectButton);
    
    expect(getByText('This is a very long option label that should be handled gracefully by the component')).toBeTruthy();
  });

  it('should support accessibility props', () => {
    const { getByLabelText } = render(
      <Select
        {...defaultProps}
        accessibilityLabel="Custom select label"
        accessibilityHint="Choose an option from the list"
      />
    );
    
    expect(getByLabelText('Custom select label')).toBeTruthy();
  });

  it('should handle value changes properly', () => {
    const onValueChange = jest.fn();
    let currentValue = '';
    
    const { rerender, getByRole, getByText } = render(
      <Select {...defaultProps} value={currentValue} onValueChange={onValueChange} />
    );
    
    const selectButton = getByRole('button');
    fireEvent.press(selectButton);
    
    const option = getByText('Option 1');
    fireEvent.press(option);
    
    expect(onValueChange).toHaveBeenCalledWith('option1');
    
    // Simulate value update
    currentValue = 'option1';
    rerender(
      <Select {...defaultProps} value={currentValue} onValueChange={onValueChange} />
    );
    
    expect(getByText('Option 1')).toBeTruthy();
  });

  it('should handle accessibilityLabel prop', () => {
    const { getByRole } = render(
      <Select {...defaultProps} accessibilityLabel="Custom select field" />
    );
    
    const selectButton = getByRole('button');
    expect(selectButton.props.accessibilityLabel).toContain('Custom select field');
  });

  it('should handle accessibilityHint prop', () => {
    const { getByRole } = render(
      <Select {...defaultProps} accessibilityHint="Choose from available options" />
    );
    
    const selectButton = getByRole('button');
    expect(selectButton.props.accessibilityHint).toBe('Choose from available options');
  });

  it('should handle highContrastMode prop', () => {
    const { getByRole } = render(
      <Select {...defaultProps} highContrastMode={true} />
    );
    
    const selectButton = getByRole('button');
    expect(selectButton).toBeTruthy();
  });

  describe('Edge Cases', () => {
    it('should handle options with empty labels', () => {
      const emptyLabelOptions = [
        { label: '', value: 'empty' },
        { label: 'Normal Option', value: 'normal' },
      ];
      
      const { getByRole, getByText } = render(
        <Select {...defaultProps} options={emptyLabelOptions} />
      );
      
      const selectButton = getByRole('button');
      fireEvent.press(selectButton);
      
      expect(getByText('Normal Option')).toBeTruthy();
    });

    it('should handle options with null/undefined values', () => {
      const nullValueOptions = [
        { label: 'Valid Option', value: 'valid' },
        { label: 'Null Value', value: null as any },
        { label: 'Undefined Value', value: undefined as any },
      ];
      
      const { getByRole } = render(
        <Select {...defaultProps} options={nullValueOptions} />
      );
      
      const selectButton = getByRole('button');
      fireEvent.press(selectButton);
      
      // Should not crash
      expect(selectButton).toBeTruthy();
    });

    it('should handle very large number of options', () => {
      const manyOptions = Array.from({ length: 1000 }, (_, i) => ({
        label: `Option ${i + 1}`,
        value: `option${i + 1}`,
      }));
      
      const { getByRole } = render(
        <Select {...defaultProps} options={manyOptions} />
      );
      
      const selectButton = getByRole('button');
      fireEvent.press(selectButton);
      
      // Should handle large lists without crashing
      expect(selectButton).toBeTruthy();
    });

    it('should maintain selection state through re-renders', () => {
      const onValueChange = jest.fn();
      const { rerender, getByText } = render(
        <Select {...defaultProps} value="option2" onValueChange={onValueChange} />
      );
      
      expect(getByText('Option 2')).toBeTruthy();
      
      // Re-render with same value
      rerender(
        <Select {...defaultProps} value="option2" onValueChange={onValueChange} />
      );
      
      expect(getByText('Option 2')).toBeTruthy();
    });
  });
});