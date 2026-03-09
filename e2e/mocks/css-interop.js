// Mock for react-native-css-interop (NativeWind v4 runtime)
// Uses CommonJS to be compatible with webpack resolution
const cssInterop = (component) => component;
const remapProps = (component) => component;
const useColorScheme = () => ({ colorScheme: 'light', setColorScheme: () => {}, toggleColorScheme: () => {} });
const useUnstableNativeVariable = () => null;
const useSafeAreaEnv = () => {};
const vars = (v) => v;
const rem = { get: () => 14, set: () => {} };
const colorScheme = { get: () => 'light', set: () => {} };
const createInteropElement = (type, props) => props;
const StyleSheet = { create: (s) => s };

module.exports = {
  cssInterop,
  remapProps,
  useColorScheme,
  useUnstableNativeVariable,
  useSafeAreaEnv,
  vars,
  rem,
  colorScheme,
  createInteropElement,
  StyleSheet,
};
