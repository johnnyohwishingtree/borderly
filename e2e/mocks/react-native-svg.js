// Mock for react-native-svg
import React from 'react';

const createSvgComponent = (name) => {
  const Component = ({ children, ...props }) => React.createElement(name, props, children);
  Component.displayName = name;
  return Component;
};

export default createSvgComponent('Svg');
export const Svg = createSvgComponent('Svg');
export const Circle = createSvgComponent('Circle');
export const Rect = createSvgComponent('Rect');
export const Path = createSvgComponent('Path');
export const G = createSvgComponent('G');
export const Line = createSvgComponent('Line');
export const Text = createSvgComponent('SvgText');
export const Defs = createSvgComponent('Defs');
export const ClipPath = createSvgComponent('ClipPath');
export const Polygon = createSvgComponent('Polygon');
export const Polyline = createSvgComponent('Polyline');
export const Ellipse = createSvgComponent('Ellipse');
export const LinearGradient = createSvgComponent('LinearGradient');
export const RadialGradient = createSvgComponent('RadialGradient');
export const Stop = createSvgComponent('Stop');
