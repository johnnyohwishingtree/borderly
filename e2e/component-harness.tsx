/**
 * Component harness for screenshot capture.
 *
 * Renders a single component variant in isolation based on URL params:
 *   /component-harness?component=Button&variant=primary
 *
 * The harness provides a minimal container with consistent padding and
 * background, making screenshots comparable across captures.
 */
import React from 'react';
import { View, Text } from 'react-native';
import { componentRegistry } from './component-registry';

export default function ComponentHarness() {
  const params = new URLSearchParams(window.location.search);
  const componentName = params.get('component');
  const variantName = params.get('variant') || 'default';

  if (!componentName) {
    return (
      <View style={{ padding: 20 }}>
        <Text>Component harness — pass ?component=Name&amp;variant=variant</Text>
        <Text style={{ marginTop: 10, fontWeight: 'bold' }}>
          Registered components: {Object.keys(componentRegistry).join(', ')}
        </Text>
      </View>
    );
  }

  const entry = componentRegistry[componentName];
  if (!entry) {
    return (
      <View style={{ padding: 20 }}>
        <Text>Unknown component: {componentName}</Text>
        <Text>Available: {Object.keys(componentRegistry).join(', ')}</Text>
      </View>
    );
  }

  const variant = entry.variants[variantName];
  if (!variant) {
    return (
      <View style={{ padding: 20 }}>
        <Text>Unknown variant: {variantName} for {componentName}</Text>
        <Text>Available: {Object.keys(entry.variants).join(', ')}</Text>
      </View>
    );
  }

  return (
    <View
      testID="component-harness"
      style={{ padding: 16, backgroundColor: '#ffffff', minHeight: 64 }}
    >
      {variant.render()}
    </View>
  );
}
