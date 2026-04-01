import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { GluestackUIProvider } from '../../../src/components/ui/gluestack-ui-provider';

describe('GluestackUIProvider', () => {
  it('renders children in light mode without crashing', () => {
    const { getByText } = render(
      <GluestackUIProvider mode="light">
        <Text>Hello</Text>
      </GluestackUIProvider>,
    );
    expect(getByText('Hello')).toBeTruthy();
  });

  it('renders children in dark mode without crashing', () => {
    const { getByText } = render(
      <GluestackUIProvider mode="dark">
        <Text>Dark</Text>
      </GluestackUIProvider>,
    );
    expect(getByText('Dark')).toBeTruthy();
  });

  it('renders children in system mode without crashing', () => {
    const { getByText } = render(
      <GluestackUIProvider mode="system">
        <Text>System</Text>
      </GluestackUIProvider>,
    );
    expect(getByText('System')).toBeTruthy();
  });

  it('switches from light to dark without crashing', () => {
    const { rerender, getByText } = render(
      <GluestackUIProvider mode="light">
        <Text>Content</Text>
      </GluestackUIProvider>,
    );

    // Switch to dark — this was the crash scenario
    rerender(
      <GluestackUIProvider mode="dark">
        <Text>Content</Text>
      </GluestackUIProvider>,
    );

    expect(getByText('Content')).toBeTruthy();
  });
});
