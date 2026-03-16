import React, { useEffect, forwardRef } from 'react';

// Mock RNCamera component for web.
// On web, camera hardware is not available via react-native-camera.
// Instead of faking a working camera, we immediately report "unavailable"
// so the MRZScanner shows its built-in fallback UI (Demo Scan / Manual Entry).
const RNCamera = forwardRef(function RNCamera(props, ref) {
  const {
    children,
    onMountError,
    onStatusChange,
  } = props;

  useEffect(() => {
    // Signal that the camera is not available on web.
    // MRZScanner handles this gracefully with "Try Demo Scan" and "Enter Manually" buttons.
    const timer = setTimeout(() => {
      if (onMountError) {
        onMountError(new Error('Camera is not available in the web browser'));
      } else if (onStatusChange) {
        onStatusChange({ cameraStatus: 'NOT_AUTHORIZED' });
      }
    }, 100);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div data-testid="camera-view">{children}</div>;
});

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

export { RNCamera };
