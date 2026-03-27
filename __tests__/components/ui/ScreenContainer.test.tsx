/**
 * Tests for ScreenContainer component.
 * Covers: rendering children, applying className, native platform behavior.
 */
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ReactTestRendererJSON } from 'react-test-renderer';
import ScreenContainer from '../../../src/components/ui/ScreenContainer';

describe('ScreenContainer', () => {
  it('renders children', () => {
    const { getByText } = render(
      <ScreenContainer><Text>Screen content</Text></ScreenContainer>,
    );
    getByText('Screen content');
  });

  it('applies flex-1 base class', () => {
    const { toJSON } = render(
      <ScreenContainer><Text>Content</Text></ScreenContainer>,
    );
    const root = toJSON() as ReactTestRendererJSON;
    expect(root.props.className).toContain('flex-1');
  });

  it('applies custom className', () => {
    const { toJSON } = render(
      <ScreenContainer className="bg-gray-50"><Text>Content</Text></ScreenContainer>,
    );
    const root = toJSON() as ReactTestRendererJSON;
    expect(root.props.className).toContain('bg-gray-50');
  });

  it('passes through ViewProps like testID', () => {
    const { getByTestId } = render(
      <ScreenContainer testID="screen"><Text>Content</Text></ScreenContainer>,
    );
    getByTestId('screen');
  });

  it('renders on native platform (not web) as single wrapper', () => {
    // Default platform in tests is not 'web', so should render single wrapper
    const { toJSON } = render(
      <ScreenContainer><Text>Content</Text></ScreenContainer>,
    );
    const root = toJSON() as ReactTestRendererJSON;
    // On native: single View with flex-1
    expect(root.type).toBe('View');
    expect(root.props.className).toContain('flex-1');
  });
});
