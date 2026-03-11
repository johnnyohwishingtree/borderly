import React, { useEffect, forwardRef } from 'react';

// Mock RNCamera component for web E2E tests.
// Uses named imports to ensure same React instance as the app.
const RNCamera = forwardRef(function RNCamera(props, ref) {
  const {
    children,
    onCameraReady,
    onStatusChange,
    onBarCodeRead,
    barCodeTypes,
  } = props;

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onStatusChange) onStatusChange({ cameraStatus: 'READY' });
      if (onCameraReady) onCameraReady();
    }, 100);
    return () => clearTimeout(timer);
  }, [onCameraReady, onStatusChange]);

  useEffect(() => {
    if (onBarCodeRead && barCodeTypes) {
      const barcodeTimer = setTimeout(() => {
        const sampleBCBP = 'M1DESMARAIS/LUC       EABC123 YULFRAAC 0834 226F001A0025 106>60000';
        onBarCodeRead({ data: sampleBCBP, type: 'pdf417' });
      }, 2000);
      return () => clearTimeout(barcodeTimer);
    }
  }, [onBarCodeRead, barCodeTypes]);

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
