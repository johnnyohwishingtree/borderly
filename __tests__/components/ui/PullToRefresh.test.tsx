/**
 * Tests for PullToRefresh components.
 * Covers: PullToRefreshScrollView rendering, children, props.
 */
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { PullToRefreshScrollView } from '../../../src/components/ui/PullToRefresh';

describe('PullToRefreshScrollView', () => {
  it('renders children in scrollable container', () => {
    const { getByText } = render(
      <PullToRefreshScrollView refreshing={false} onRefresh={jest.fn()}>
        <Text>Content</Text>
      </PullToRefreshScrollView>,
    );
    getByText('Content');
  });

  it('renders with refreshing true without crashing', () => {
    const { getByText } = render(
      <PullToRefreshScrollView refreshing={true} onRefresh={jest.fn()}>
        <Text>Refreshing content</Text>
      </PullToRefreshScrollView>,
    );
    getByText('Refreshing content');
  });

  it('renders without crashing when hapticFeedback is disabled', () => {
    const { getByText } = render(
      <PullToRefreshScrollView refreshing={false} onRefresh={jest.fn()} hapticFeedback={false}>
        <Text>No haptic</Text>
      </PullToRefreshScrollView>,
    );
    getByText('No haptic');
  });

  it('accepts custom tintColor', () => {
    const { getByText } = render(
      <PullToRefreshScrollView refreshing={false} onRefresh={jest.fn()} tintColor="#ff0000">
        <Text>Colored</Text>
      </PullToRefreshScrollView>,
    );
    getByText('Colored');
  });

  it('accepts title prop', () => {
    const { getByText } = render(
      <PullToRefreshScrollView refreshing={false} onRefresh={jest.fn()} title="Pull to refresh">
        <Text>With title</Text>
      </PullToRefreshScrollView>,
    );
    getByText('With title');
  });
});
