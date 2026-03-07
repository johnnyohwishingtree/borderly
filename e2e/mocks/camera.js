const React = require('react');

// Mock RNCamera component for web E2E tests.
// Simulates camera initialization by calling onCameraReady after mount.
// Important: Do NOT spread RN-specific props onto the div — they cause CSS errors.
const RNCamera = React.forwardRef((props, ref) => {
  const {
    children,
    onCameraReady,
    onMountError,
    onTextRecognized,
    // Strip RN-specific props that are invalid on HTML elements
    type,
    flashMode,
    captureAudio,
    className,
    style,
    ...rest
  } = props;

  React.useEffect(() => {
    // Simulate camera ready after a short delay
    const timer = setTimeout(() => {
      if (onCameraReady) onCameraReady();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return React.createElement('div', {
    'data-testid': 'camera-view',
    style: { flex: 1, backgroundColor: '#000' },
  }, children);
});

RNCamera.displayName = 'RNCamera';

RNCamera.Constants = {
  Type: { back: 'back', front: 'front' },
  FlashMode: { off: 'off', on: 'on', auto: 'auto', torch: 'torch' },
  AutoFocus: { on: 'on', off: 'off' },
  WhiteBalance: { auto: 'auto' },
  BarCodeType: {},
};

module.exports = { RNCamera };
