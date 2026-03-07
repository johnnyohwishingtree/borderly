const React = require('react');

// Mock RNCamera component for web E2E tests.
// Simulates camera initialization by calling onCameraReady after mount.
// Also simulates barcode detection for E2E testing.
// Important: Do NOT spread RN-specific props onto the div — they cause CSS errors.
const RNCamera = React.forwardRef((props, ref) => {
  const {
    children,
    onCameraReady,
    onMountError,
    onTextRecognized,
    onBarCodeRead,
    onStatusChange,
    barCodeTypes,
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
      if (onStatusChange) onStatusChange({ cameraStatus: 'READY' });
      if (onCameraReady) onCameraReady();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Add test helper to trigger barcode scan simulation
  React.useImperativeHandle(ref, () => ({
    simulateBarcodeDetection: (barcodeData, type = 'pdf417') => {
      if (onBarCodeRead) {
        onBarCodeRead({ data: barcodeData, type });
      }
    },
  }));

  return React.createElement('div', {
    'data-testid': 'camera-view',
    className,
    style: { flex: 1, backgroundColor: '#000' },
  }, children);
});

RNCamera.displayName = 'RNCamera';

RNCamera.Constants = {
  Type: { back: 'back', front: 'front' },
  FlashMode: { off: 'off', on: 'on', auto: 'auto', torch: 'torch' },
  AutoFocus: { on: 'on', off: 'off' },
  WhiteBalance: { auto: 'auto' },
  BarCodeType: {
    pdf417: 'pdf417',
    aztec: 'aztec',
    qr: 'qr',
    code128: 'code128',
    code39: 'code39',
    ean13: 'ean13',
    ean8: 'ean8',
    upce: 'upce',
    upca: 'upca',
  },
};

module.exports = { RNCamera };
