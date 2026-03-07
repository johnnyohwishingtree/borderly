const React = require('react');

const passthrough = (props) => React.createElement('div', null, props.children);

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
  FullWindowOverlay: passthrough,
  ScreenFooter: passthrough,
  ScreenContentWrapper: passthrough,
  ScreenStackHeaderConfig: passthrough,
  ScreenStackHeaderSubview: passthrough,
  ScreenStackHeaderLeftView: passthrough,
  ScreenStackHeaderCenterView: passthrough,
  ScreenStackHeaderRightView: passthrough,
  ScreenStackHeaderBackButtonImage: passthrough,
  ScreenStackHeaderSearchBarView: passthrough,
  SearchBar: passthrough,
  isSearchBarAvailableForCurrentPlatform: false,
  executeNativeBackPress: () => {},
  useTransitionProgress: () => ({ progress: { value: 1 } }),
  compatibilityFlags: {},
  featureFlags: {},
};
