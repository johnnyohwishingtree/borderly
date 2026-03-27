/**
 * Tests for PullToRefresh components.
 * Covers: PullToRefreshScrollView rendering, children, props.
 */
import { render } from '@testing-library/react-native';
import { ScrollView, Text } from 'react-native';
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

  it('passes refreshing state to the scroll view refresh control', () => {
    const { UNSAFE_getByType } = render(
      <PullToRefreshScrollView refreshing={true} onRefresh={jest.fn()}>
        <Text>Refreshing content</Text>
      </PullToRefreshScrollView>,
    );
    const scrollView = UNSAFE_getByType(ScrollView);
    expect(scrollView.props.refreshControl.props.refreshing).toBe(true);
  });

  it('invokes onRefresh callback when hapticFeedback is disabled', () => {
    const onRefresh = jest.fn();
    const { UNSAFE_getByType } = render(
      <PullToRefreshScrollView refreshing={false} onRefresh={onRefresh} hapticFeedback={false}>
        <Text>No haptic</Text>
      </PullToRefreshScrollView>,
    );
    const scrollView = UNSAFE_getByType(ScrollView);
    scrollView.props.refreshControl.props.onRefresh();
    expect(onRefresh).toHaveBeenCalledTimes(1);
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
