const React = require('react');

const flexFill = { display: 'flex', flexGrow: 1, flexShrink: 1, flexBasis: '0%', flexDirection: 'column' };

const passthrough = (props) => React.createElement('div', { style: flexFill }, props.children);
const noop = (props) => React.createElement('div', null, props.children);

module.exports = {
  enableScreens: () => {},
  enableFreeze: () => {},
  screensEnabled: () => true,
  freezeEnabled: () => false,
  Screen: passthrough,
  InnerScreen: passthrough,
  ScreenContext: React.createContext(null),
  ScreenContainer: passthrough,
  ScreenStack: passthrough,
  ScreenStackItem: passthrough,
  FullWindowOverlay: noop,
  ScreenFooter: noop,
  ScreenContentWrapper: passthrough,
  ScreenStackHeaderConfig: noop,
  ScreenStackHeaderSubview: noop,
  ScreenStackHeaderLeftView: noop,
  ScreenStackHeaderCenterView: noop,
  ScreenStackHeaderRightView: noop,
  ScreenStackHeaderBackButtonImage: noop,
  ScreenStackHeaderSearchBarView: noop,
  SearchBar: noop,
  isSearchBarAvailableForCurrentPlatform: false,
  executeNativeBackPress: () => {},
  useTransitionProgress: () => ({ progress: { value: 1 } }),
  compatibilityFlags: {},
  featureFlags: {},
};
