export interface TroubleshootingItem {
  id: string;
  problem: string;
  symptoms: string[];
  solutions: string[];
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
}

export interface TroubleshootingCategory {
  label: string;
  value: string;
}

export const TROUBLESHOOTING_ITEMS: TroubleshootingItem[] = [
  {
    id: 'trouble-1',
    problem: 'Passport scanning not working',
    symptoms: ['Camera won\'t focus', 'No text detected', 'Wrong data extracted'],
    solutions: [
      'Ensure good lighting - use natural light or bright room lighting',
      'Clean your camera lens with a soft cloth',
      'Hold phone steady and align MRZ lines within the frame',
      'Try different angles - slightly tilt the passport',
      'Check passport condition - ensure MRZ text is not damaged or worn',
      'If scanning continues to fail, tap "Enter Manually" to input data by hand',
    ],
    category: 'passport',
    severity: 'high',
    tags: ['passport', 'scanning', 'camera', 'mrz', 'detection'],
  },
  {
    id: 'trouble-2',
    problem: 'App crashes on startup',
    symptoms: ['App closes immediately', 'Black screen on launch', 'Error messages'],
    solutions: [
      'Force close the app completely and restart',
      'Restart your device',
      'Check available storage space (need at least 100MB free)',
      'Update to the latest app version if available',
      'Check if biometric authentication is working on your device',
      'If problem persists, try clearing app cache in device settings',
    ],
    category: 'performance',
    severity: 'critical',
    tags: ['crash', 'startup', 'launch', 'error'],
  },
  {
    id: 'trouble-3',
    problem: 'Form auto-fill not working correctly',
    symptoms: ['Fields remain empty', 'Wrong data in fields', 'Partial auto-fill'],
    solutions: [
      'Check that your profile is complete in Profile → Edit Profile',
      'Verify passport data was scanned or entered correctly',
      'Update trip dates and destinations in trip details',
      'Some fields are intentionally left empty as they require manual input',
      'Clear app cache and restart the app',
      'Re-scan passport if multiple fields are incorrect',
    ],
    category: 'forms',
    severity: 'medium',
    tags: ['autofill', 'forms', 'profile', 'data'],
  },
  {
    id: 'trouble-4',
    problem: 'Cannot save or scan QR codes',
    symptoms: ['QR scanner won\'t open', 'Saved QR codes don\'t appear', 'Camera permission denied'],
    solutions: [
      'Check camera permissions in device settings',
      'Ensure QR code is clear and well-lit when scanning',
      'Try manual entry instead of scanning',
      'Restart the app if camera is unresponsive',
      'Verify sufficient storage space for saving QR codes',
      'Check that QR code format is supported (most standard formats work)',
    ],
    category: 'qr',
    severity: 'medium',
    tags: ['qr', 'camera', 'permissions', 'scanning', 'saving'],
  },
  {
    id: 'trouble-5',
    problem: 'Biometric authentication fails',
    symptoms: ['Face ID not working', 'Touch ID fails', 'Keeps asking for PIN'],
    solutions: [
      'Check that biometric authentication is set up in device settings',
      'Try using alternative authentication method (PIN/password)',
      'Restart the app and try again',
      'Re-enable biometric authentication in Settings → Security & Privacy',
      'Ensure your face/finger is clean and properly positioned',
      'If problem persists, disable and re-enable biometric authentication',
    ],
    category: 'security',
    severity: 'high',
    tags: ['biometric', 'faceid', 'touchid', 'authentication', 'security'],
  },
  {
    id: 'trouble-6',
    problem: 'App running very slowly',
    symptoms: ['Long loading times', 'Laggy scrolling', 'Delayed responses'],
    solutions: [
      'Close other apps to free up device memory',
      'Clear app cache in Settings → Data Management',
      'Restart the app completely',
      'Check available device storage (need at least 500MB free)',
      'Update to latest app version',
      'Restart your device if performance is still poor',
    ],
    category: 'performance',
    severity: 'low',
    tags: ['performance', 'slow', 'memory', 'cache', 'storage'],
  },
  {
    id: 'trouble-7',
    problem: 'Government portal submission errors',
    symptoms: ['Portal shows validation errors', 'Data not accepted', 'Submission fails'],
    solutions: [
      'Double-check all copied data for accuracy',
      'Verify date formats match portal requirements (usually YYYY-MM-DD)',
      'Ensure all required fields are completed',
      'Check passport expiry date is more than 6 months from travel',
      'Try submitting during off-peak hours for better portal performance',
      'Always verify requirements on official government websites',
    ],
    category: 'submission',
    severity: 'high',
    tags: ['submission', 'portal', 'government', 'validation', 'errors'],
  },
  {
    id: 'trouble-8',
    problem: 'Data sync or loss issues',
    symptoms: ['Profile data missing', 'Trips disappeared', 'QR codes lost'],
    solutions: [
      'Data is stored locally - if device is reset, data may be lost',
      'Check if data is temporarily hidden due to biometric lock',
      'Try unlocking with biometric authentication',
      'If data was accidentally deleted, it cannot be recovered',
      'Regularly export your data through Settings → Privacy → Export Data',
      'Consider taking screenshots of important information as backup',
    ],
    category: 'data',
    severity: 'critical',
    tags: ['data', 'loss', 'sync', 'backup', 'recovery'],
  },
  {
    id: 'trouble-9',
    problem: 'Internet connectivity issues',
    symptoms: ['Portal won\'t load', 'Submission fails', 'No network error'],
    solutions: [
      'Borderly works offline - internet is only needed for government portals',
      'Check your internet connection',
      'Try switching between WiFi and mobile data',
      'Government portals may be temporarily down - try again later',
      'Use VPN if accessing portals from abroad',
      'Verify portal URLs are correct and official',
    ],
    category: 'network',
    severity: 'medium',
    tags: ['internet', 'connectivity', 'portal', 'network', 'offline'],
  },
  {
    id: 'trouble-10',
    problem: 'App won\'t open government portals',
    symptoms: ['Portal links don\'t work', 'Browser won\'t open', 'Submission guide errors'],
    solutions: [
      'Check if default browser is set correctly',
      'Try copying portal URL and opening manually',
      'Ensure portal is available in your region',
      'Some portals have geographic restrictions',
      'Clear browser cache and try again',
      'Try different browser if available',
    ],
    category: 'portal',
    severity: 'medium',
    tags: ['portal', 'browser', 'links', 'submission', 'access'],
  },
];

export const CATEGORIES: TroubleshootingCategory[] = [
  { label: 'All Issues', value: 'all' },
  { label: 'Passport Scanning', value: 'passport' },
  { label: 'App Performance', value: 'performance' },
  { label: 'Forms & Auto-fill', value: 'forms' },
  { label: 'QR Codes', value: 'qr' },
  { label: 'Security & Biometrics', value: 'security' },
  { label: 'Government Portals', value: 'submission' },
  { label: 'Data & Sync', value: 'data' },
  { label: 'Network Issues', value: 'network' },
];
