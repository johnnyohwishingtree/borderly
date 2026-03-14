import {
  getQRDetectionScript,
  JPN_QR_DETECTION_SCRIPT,
  MYS_QR_DETECTION_SCRIPT,
  SGP_QR_DETECTION_SCRIPT,
} from '../../src/services/automation/qrDetection';

describe('getQRDetectionScript', () => {
  it('returns a non-empty string for JPN', () => {
    const script = getQRDetectionScript('JPN');
    expect(script).not.toBeNull();
    expect(typeof script).toBe('string');
    expect((script as string).length).toBeGreaterThan(0);
  });

  it('returns a non-empty string for MYS', () => {
    const script = getQRDetectionScript('MYS');
    expect(script).not.toBeNull();
    expect(typeof script).toBe('string');
    expect((script as string).length).toBeGreaterThan(0);
  });

  it('returns a non-empty string for SGP', () => {
    const script = getQRDetectionScript('SGP');
    expect(script).not.toBeNull();
    expect(typeof script).toBe('string');
    expect((script as string).length).toBeGreaterThan(0);
  });

  it('returns null for an unsupported country code', () => {
    expect(getQRDetectionScript('USA')).toBeNull();
    expect(getQRDetectionScript('GBR')).toBeNull();
    expect(getQRDetectionScript('')).toBeNull();
  });

  it('returns the correct constant for JPN', () => {
    expect(getQRDetectionScript('JPN')).toBe(JPN_QR_DETECTION_SCRIPT);
  });

  it('returns the correct constant for MYS', () => {
    expect(getQRDetectionScript('MYS')).toBe(MYS_QR_DETECTION_SCRIPT);
  });

  it('returns the correct constant for SGP', () => {
    expect(getQRDetectionScript('SGP')).toBe(SGP_QR_DETECTION_SCRIPT);
  });
});

describe('JPN_QR_DETECTION_SCRIPT', () => {
  it('posts QR_PAGE_DETECTED message type', () => {
    expect(JPN_QR_DETECTION_SCRIPT).toContain('QR_PAGE_DETECTED');
  });

  it('posts QR_PAGE_CHECK message type', () => {
    expect(JPN_QR_DETECTION_SCRIPT).toContain('QR_PAGE_CHECK');
  });

  it('includes JPN country code in the output message', () => {
    expect(JPN_QR_DETECTION_SCRIPT).toContain("'JPN'");
  });

  it('uses ReactNativeWebView.postMessage', () => {
    expect(JPN_QR_DETECTION_SCRIPT).toContain('ReactNativeWebView.postMessage');
  });

  it('checks for QR-related URL fragments', () => {
    expect(JPN_QR_DETECTION_SCRIPT).toContain('complete');
    expect(JPN_QR_DETECTION_SCRIPT).toContain('result');
  });

  it('attempts to extract from canvas elements', () => {
    expect(JPN_QR_DETECTION_SCRIPT).toContain('canvas');
    expect(JPN_QR_DETECTION_SCRIPT).toContain('toDataURL');
  });

  it('ends with return true to satisfy WebView injection contract', () => {
    // The script must not end with undefined — WebView requires truthy return
    expect(JPN_QR_DETECTION_SCRIPT.trim()).toContain('return true');
  });
});

describe('MYS_QR_DETECTION_SCRIPT', () => {
  it('posts QR_PAGE_DETECTED message type', () => {
    expect(MYS_QR_DETECTION_SCRIPT).toContain('QR_PAGE_DETECTED');
  });

  it('includes MYS country code in the output message', () => {
    expect(MYS_QR_DETECTION_SCRIPT).toContain("'MYS'");
  });

  it('extracts confirmation number', () => {
    expect(MYS_QR_DETECTION_SCRIPT).toContain('confirmationNumber');
  });

  it('checks for Malaysia-specific terms', () => {
    expect(MYS_QR_DETECTION_SCRIPT).toContain('mdac');
    expect(MYS_QR_DETECTION_SCRIPT).toContain('arrival card');
  });
});

describe('SGP_QR_DETECTION_SCRIPT', () => {
  it('posts QR_PAGE_DETECTED message type', () => {
    expect(SGP_QR_DETECTION_SCRIPT).toContain('QR_PAGE_DETECTED');
  });

  it('includes SGP country code in the output message', () => {
    expect(SGP_QR_DETECTION_SCRIPT).toContain("'SGP'");
  });

  it('extracts confirmation number', () => {
    expect(SGP_QR_DETECTION_SCRIPT).toContain('confirmationNumber');
  });

  it('checks for Singapore-specific terms', () => {
    expect(SGP_QR_DETECTION_SCRIPT).toContain('sg arrival');
    expect(SGP_QR_DETECTION_SCRIPT).toContain('acknowledgement');
  });
});
