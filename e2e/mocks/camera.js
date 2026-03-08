const React = require('react');

// Mock RNCamera component for web E2E tests.
// Simulates camera initialization by calling onCameraReady after mount.
// Also simulates barcode scanning for BoardingPassScanner tests.
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

  React.useEffect(() => {
    // Simulate barcode detection if onBarCodeRead is provided (BoardingPassScanner)
    if (onBarCodeRead && barCodeTypes) {
      const barcodeTimer = setTimeout(() => {
        // Simulate scanning a sample BCBP barcode after 2 seconds
        const sampleBCBP = 'M1DESMARAIS/LUC       EABC123 YULFRAAC 0834 226F001A0025 106>60000';
        onBarCodeRead({
          data: sampleBCBP,
          type: 'pdf417'
        });
      }, 2000);
      return () => clearTimeout(barcodeTimer);
    }
  }, [onBarCodeRead, barCodeTypes]);

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
  },
};

module.exports = { RNCamera };
