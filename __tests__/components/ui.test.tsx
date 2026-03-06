import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';

describe('UI Components', () => {
  describe('Button', () => {
    it('should render with default props', () => {
      const onPress = jest.fn();
      const { getByText } = render(<Button title="Test Button" onPress={onPress} />);
      
      expect(getByText('Test Button')).toBeTruthy();
    });

    it('should call onPress when pressed', () => {
      const onPress = jest.fn();
      const { getByText } = render(<Button title="Test Button" onPress={onPress} />);
      
      const button = getByText('Test Button');
      fireEvent.press(button);
      
      expect(onPress).toHaveBeenCalledTimes(1);
    });

    it('should not call onPress when disabled', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <Button title="Test Button" onPress={onPress} disabled />
      );
      
      const button = getByText('Test Button');
      fireEvent.press(button);
      
      expect(onPress).not.toHaveBeenCalled();
    });

    it('should not call onPress when loading', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <Button title="Test Button" onPress={onPress} loading />
      );
      
      const button = getByText('Test Button');
      fireEvent.press(button);
      
      expect(onPress).not.toHaveBeenCalled();
    });

    it('should show loading indicator when loading', () => {
      const onPress = jest.fn();
      const { getByTestId } = render(
        <Button title="Test Button" onPress={onPress} loading />
      );
      
      // ActivityIndicator should be present
      expect(() => getByTestId('activity-indicator')).not.toThrow();
    });

    describe('variants', () => {
      it('should render primary variant correctly', () => {
        const onPress = jest.fn();
        const { getByText } = render(
          <Button title="Primary" onPress={onPress} variant="primary" />
        );
        
        expect(getByText('Primary')).toBeTruthy();
      });

      it('should render secondary variant correctly', () => {
        const onPress = jest.fn();
        const { getByText } = render(
          <Button title="Secondary" onPress={onPress} variant="secondary" />
        );
        
        expect(getByText('Secondary')).toBeTruthy();
      });

      it('should render outline variant correctly', () => {
        const onPress = jest.fn();
        const { getByText } = render(
          <Button title="Outline" onPress={onPress} variant="outline" />
        );
        
        expect(getByText('Outline')).toBeTruthy();
      });
    });

    describe('sizes', () => {
      it('should render small size correctly', () => {
        const onPress = jest.fn();
        const { getByText } = render(
          <Button title="Small" onPress={onPress} size="small" />
        );
        
        expect(getByText('Small')).toBeTruthy();
      });

      it('should render medium size correctly', () => {
        const onPress = jest.fn();
        const { getByText } = render(
          <Button title="Medium" onPress={onPress} size="medium" />
        );
        
        expect(getByText('Medium')).toBeTruthy();
      });

      it('should render large size correctly', () => {
        const onPress = jest.fn();
        const { getByText } = render(
          <Button title="Large" onPress={onPress} size="large" />
        );
        
        expect(getByText('Large')).toBeTruthy();
      });
    });

    it('should render full width when specified', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <Button title="Full Width" onPress={onPress} fullWidth />
      );
      
      expect(getByText('Full Width')).toBeTruthy();
    });
  });

  describe('Input', () => {
    it('should render with default props', () => {
      const { getByDisplayValue } = render(<Input value="test" onChangeText={() => {}} />);
      
      expect(getByDisplayValue('test')).toBeTruthy();
    });

    it('should render with label', () => {
      const { getByText } = render(
        <Input label="Test Label" value="" onChangeText={() => {}} />
      );
      
      expect(getByText('Test Label')).toBeTruthy();
    });

    it('should render required indicator when required', () => {
      const { getByText } = render(
        <Input label="Required Field" value="" onChangeText={() => {}} required />
      );
      
      expect(getByText('Required Field')).toBeTruthy();
      expect(getByText('*')).toBeTruthy();
    });

    it('should render error message when error provided', () => {
      const { getByText } = render(
        <Input value="" onChangeText={() => {}} error="This is an error" />
      );
      
      expect(getByText('This is an error')).toBeTruthy();
    });

    it('should render helper text when provided and no error', () => {
      const { getByText } = render(
        <Input value="" onChangeText={() => {}} helperText="This is helper text" />
      );
      
      expect(getByText('This is helper text')).toBeTruthy();
    });

    it('should not render helper text when error is present', () => {
      const { queryByText } = render(
        <Input
          value=""
          onChangeText={() => {}}
          helperText="Helper text"
          error="Error message"
        />
      );
      
      expect(queryByText('Helper text')).toBeNull();
      expect(queryByText('Error message')).toBeTruthy();
    });

    it('should call onChangeText when text changes', () => {
      const onChangeText = jest.fn();
      const { getByDisplayValue } = render(
        <Input value="initial" onChangeText={onChangeText} />
      );
      
      const input = getByDisplayValue('initial');
      fireEvent.changeText(input, 'new text');
      
      expect(onChangeText).toHaveBeenCalledWith('new text');
    });

    it('should pass through TextInput props', () => {
      const { getByPlaceholderText } = render(
        <Input
          value=""
          onChangeText={() => {}}
          placeholder="Enter text here"
          maxLength={10}
          autoCapitalize="characters"
        />
      );
      
      expect(getByPlaceholderText('Enter text here')).toBeTruthy();
    });

    it('should handle onBlur events', () => {
      const onBlur = jest.fn();
      const { getByDisplayValue } = render(
        <Input value="test" onChangeText={() => {}} onBlur={onBlur} />
      );
      
      const input = getByDisplayValue('test');
      fireEvent(input, 'blur');
      
      expect(onBlur).toHaveBeenCalled();
    });
  });

  describe('Card', () => {
    it('should render children correctly', () => {
      const { getByText } = render(
        <Card>
          <div>Card Content</div>
        </Card>
      );
      
      expect(getByText('Card Content')).toBeTruthy();
    });

    it('should render with default variant', () => {
      const { getByText } = render(
        <Card>
          <div>Default Card</div>
        </Card>
      );
      
      expect(getByText('Default Card')).toBeTruthy();
    });

    it('should render with elevated variant', () => {
      const { getByText } = render(
        <Card variant="elevated">
          <div>Elevated Card</div>
        </Card>
      );
      
      expect(getByText('Elevated Card')).toBeTruthy();
    });

    it('should render with outlined variant', () => {
      const { getByText } = render(
        <Card variant="outlined">
          <div>Outlined Card</div>
        </Card>
      );
      
      expect(getByText('Outlined Card')).toBeTruthy();
    });

    it('should accept custom className', () => {
      const { getByText } = render(
        <Card className="custom-class">
          <div>Custom Card</div>
        </Card>
      );
      
      expect(getByText('Custom Card')).toBeTruthy();
    });
  });

  describe('Component Integration', () => {
    it('should work together in a form', () => {
      const onPress = jest.fn();
      const onChangeText = jest.fn();
      
      const { getByText, getByPlaceholderText } = render(
        <Card>
          <Input
            label="Username"
            placeholder="Enter username"
            value=""
            onChangeText={onChangeText}
            required
          />
          <Button title="Submit" onPress={onPress} />
        </Card>
      );
      
      expect(getByText('Username')).toBeTruthy();
      expect(getByText('*')).toBeTruthy();
      expect(getByPlaceholderText('Enter username')).toBeTruthy();
      expect(getByText('Submit')).toBeTruthy();
      
      const submitButton = getByText('Submit');
      fireEvent.press(submitButton);
      
      expect(onPress).toHaveBeenCalled();
    });

    it('should show error states properly in form', () => {
      const { getByText } = render(
        <Card>
          <Input
            label="Email"
            value="invalid-email"
            onChangeText={() => {}}
            error="Please enter a valid email"
            required
          />
          <Button title="Submit" onPress={() => {}} disabled />
        </Card>
      );
      
      expect(getByText('Email')).toBeTruthy();
      expect(getByText('Please enter a valid email')).toBeTruthy();
      expect(getByText('Submit')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should support accessibility props on Button', () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <Button
          title="Accessible Button"
          onPress={onPress}
          accessibilityLabel="Custom accessibility label"
          accessibilityHint="This button does something"
        />
      );
      
      expect(getByText('Accessible Button')).toBeTruthy();
    });

    it('should support accessibility props on Input', () => {
      const { getByDisplayValue } = render(
        <Input
          label="Accessible Input"
          value=""
          onChangeText={() => {}}
          accessibilityLabel="Custom input label"
          accessibilityHint="Enter your information here"
        />
      );
      
      // Input should be accessible
      expect(getByDisplayValue('')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string title on Button', () => {
      const onPress = jest.fn();
      const { getByText } = render(<Button title="" onPress={onPress} />);
      
      // Should render without crashing
      expect(() => getByText('')).not.toThrow();
    });

    it('should handle undefined values gracefully in Input', () => {
      const { container } = render(
        <Input
          value={undefined as any}
          onChangeText={() => {}}
          label={undefined}
          error={undefined}
          helperText={undefined}
        />
      );
      
      // Should render without crashing
      expect(container).toBeTruthy();
    });

    it('should handle complex children in Card', () => {
      const { getByText } = render(
        <Card>
          <div>
            <p>Complex content</p>
            <button>Nested button</button>
          </div>
        </Card>
      );
      
      expect(getByText('Complex content')).toBeTruthy();
      expect(getByText('Nested button')).toBeTruthy();
    });
  });
});