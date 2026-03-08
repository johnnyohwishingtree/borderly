/* eslint-env jest */
require('@testing-library/jest-native/extend-expect');

// Configure RNTL host component names to avoid auto-detection issues
const { configure } = require('@testing-library/react-native');
configure({
  hostComponentNames: {
    text: 'Text',
    textInput: 'TextInput',
    switch: 'Switch',
    scrollView: 'ScrollView',
    modal: 'Modal',
  },
});

// Mock react-native-css-interop
jest.mock('react-native-css-interop', () => {
  return {
    cssInterop: jest.fn(),
  };
});

// Mock lucide-react-native
jest.mock('lucide-react-native', () => {
  const React = require('react');
  const mockIcon = (name) => {
    const Icon = ({ ...props }) => React.createElement('LucideIcon', { ...props, iconName: name });
    Icon.displayName = name;
    return Icon;
  };
  return {
    Globe: mockIcon('Globe'),
    Plane: mockIcon('Plane'),
    Lock: mockIcon('Lock'),
    Smartphone: mockIcon('Smartphone'),
    Zap: mockIcon('Zap'),
    ShieldCheck: mockIcon('ShieldCheck'),
    HelpCircle: mockIcon('HelpCircle'),
    ChevronRight: mockIcon('ChevronRight'),
    ArrowRight: mockIcon('ArrowRight'),
    Check: mockIcon('Check'),
    X: mockIcon('X'),
    Plus: mockIcon('Plus'),
    Minus: mockIcon('Minus'),
  };
});

// Mock @gluestack-ui/nativewind
jest.mock('@gluestack-ui/nativewind', () => {
  return {};
});

// Mock @gluestack-style/react  
jest.mock('@gluestack-style/react', () => {
  return {
    createStyle: jest.fn(),
    styled: jest.fn(),
  };
});

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const mockComponent = (name) => {
    const Component = ({ children, ...props }) => React.createElement(name, props, children);
    Component.displayName = name;
    return Component;
  };
  return {
    default: {
      View: mockComponent('Animated.View'),
      Text: mockComponent('Animated.Text'),
      ScrollView: mockComponent('Animated.ScrollView'),
      createAnimatedComponent: jest.fn((component) => component),
    },
    Easing: {
      linear: jest.fn(),
      ease: jest.fn(),
      quad: jest.fn(),
      cubic: jest.fn(),
    },
    runOnJS: jest.fn((fn) => fn),
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((value) => value),
    withSpring: jest.fn((value) => value),
    withSequence: jest.fn((value) => value),
    interpolate: jest.fn(() => 0),
  };
});

// Mock react-native-svg
jest.mock('react-native-svg', () => {
  const React = require('react');
  const mockComponent = (name) => {
    const Component = ({ children, ...props }) => React.createElement(name, props, children);
    Component.displayName = name;
    return Component;
  };
  return {
    Svg: mockComponent('Svg'),
    Circle: mockComponent('Circle'),
    Ellipse: mockComponent('Ellipse'),
    G: mockComponent('G'),
    Text: mockComponent('SvgText'),
    TSpan: mockComponent('TSpan'),
    TextPath: mockComponent('TextPath'),
    Path: mockComponent('Path'),
    Polygon: mockComponent('Polygon'),
    Polyline: mockComponent('Polyline'),
    Line: mockComponent('Line'),
    Rect: mockComponent('Rect'),
    Use: mockComponent('Use'),
    Image: mockComponent('SvgImage'),
    Symbol: mockComponent('Symbol'),
    Defs: mockComponent('Defs'),
    LinearGradient: mockComponent('LinearGradient'),
    RadialGradient: mockComponent('RadialGradient'),
    Stop: mockComponent('Stop'),
    ClipPath: mockComponent('ClipPath'),
    Pattern: mockComponent('Pattern'),
    Mask: mockComponent('Mask'),
  };
});

// Basic Jest setup for TypeScript unit tests

// Define global __DEV__ variable
global.__DEV__ = false;

// Mock performance API for tests
global.performance = global.performance || {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => []),
  getEntriesByName: jest.fn(() => []),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
};

// Suppress console.error in tests unless explicitly testing error handling
const originalError = console.error;
beforeEach(() => {
  console.error = jest.fn();
});
afterEach(() => {
  console.error = originalError;
});

// Mock react-native modules
jest.mock('react-native', () => {
  const React = require('react');
  const mockComponent = (name) => {
    const Component = ({ children, ...props }) => React.createElement(name, props, children);
    Component.displayName = name;
    return Component;
  };
  return {
    Platform: { OS: 'ios', select: (obj) => obj.ios },
    NativeModules: {},
    View: mockComponent('View'),
    Text: mockComponent('Text'),
    TouchableOpacity: mockComponent('TouchableOpacity'),
    Pressable: mockComponent('Pressable'),
    TextInput: mockComponent('TextInput'),
    ScrollView: mockComponent('ScrollView'),
    ActivityIndicator: mockComponent('ActivityIndicator'),
    Modal: mockComponent('Modal'),
    TouchableWithoutFeedback: mockComponent('TouchableWithoutFeedback'),
    FlatList: mockComponent('FlatList'),
    Animated: {
      View: mockComponent('Animated.View'),
      Value: jest.fn(() => ({
        interpolate: jest.fn(() => 'interpolated'),
      })),
      timing: jest.fn(() => ({
        start: jest.fn(),
      })),
    },
    StatusBar: { setBarStyle: jest.fn(), setBackgroundColor: jest.fn() },
    StyleSheet: {
      create: (styles) => styles,
      flatten: (style) => Object.assign({}, ...(Array.isArray(style) ? style : [style])),
    },
    Alert: {
      alert: jest.fn(),
    },
    Linking: {
      canOpenURL: jest.fn().mockResolvedValue(true),
      openURL: jest.fn().mockResolvedValue(true),
    },
    Touchable: {
      Mixin: {},
    },
    Dimensions: {
      get: jest.fn().mockReturnValue({ width: 375, height: 812 }),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
    Vibration: {
      vibrate: jest.fn(),
      cancel: jest.fn(),
    },
  };
});

// Mock react-native-get-random-values
jest.mock('react-native-get-random-values', () => {
  // Polyfill crypto.getRandomValues for tests
  Object.defineProperty(global, 'crypto', {
    value: {
      getRandomValues: (arr) => {
        for (let i = 0; i < arr.length; i++) {
          arr[i] = Math.floor(Math.random() * 256);
        }
        return arr;
      },
    },
    writable: true,
  });
  return {};
});

// Mock react-native-keychain
jest.mock('react-native-keychain', () => ({
  setInternetCredentials: jest.fn().mockResolvedValue(true),
  getInternetCredentials: jest.fn().mockResolvedValue({ password: '{}' }),
  resetInternetCredentials: jest.fn().mockResolvedValue(true),
  getSupportedBiometryType: jest.fn().mockResolvedValue('TouchID'),
  getSecurityLevel: jest.fn().mockResolvedValue('SECURE_HARDWARE'),
  AUTHENTICATION_TYPE: {
    BIOMETRICS: 'AuthenticationWithBiometricsDevicePasscode',
  },
  ACCESS_CONTROL: {
    BIOMETRY_CURRENT_SET: 'kSecAccessControlBiometryCurrentSet',
  },
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'kSecAttrAccessibleWhenUnlockedThisDeviceOnly',
  },
  BIOMETRY_TYPE: {
    TOUCH_ID: 'TouchID',
    FACE_ID: 'FaceID',
    FINGERPRINT: 'Fingerprint',
  },
  SECURITY_LEVEL: {
    SECURE_SOFTWARE: 'SECURE_SOFTWARE',
    SECURE_HARDWARE: 'SECURE_HARDWARE',
    ANY_HARDWARE: 'ANY_HARDWARE',
    SOFTWARE: 'SOFTWARE',
  },
  STORAGE_TYPE: {
    AES: 'AES',
    RSA: 'RSA',
  },
}));

// Mock react-native-mmkv
jest.mock('react-native-mmkv', () => {
  return {
    MMKV: jest.fn().mockImplementation(() => {
      const storage = new Map();
      return {
        set: jest.fn((key, value) => {
          storage.set(key, value);
        }),
        getString: jest.fn((key) => {
          return storage.get(key) || undefined;
        }),
        getBoolean: jest.fn((key) => {
          return storage.get(key) || undefined;
        }),
        getNumber: jest.fn((key) => {
          return storage.get(key) || undefined;
        }),
        delete: jest.fn((key) => {
          storage.delete(key);
        }),
        getAllKeys: jest.fn().mockReturnValue([]),
        clearAll: jest.fn(() => {
          storage.clear();
        }),
      };
    }),
  };
});

// Mock @react-native-clipboard/clipboard
jest.mock('@react-native-clipboard/clipboard', () => ({
  Clipboard: {
    setString: jest.fn().mockResolvedValue(undefined),
    getString: jest.fn().mockResolvedValue(''),
    hasString: jest.fn().mockResolvedValue(false),
  },
}));

// Mock @react-native-async-storage/async-storage
jest.mock('@react-native-async-storage/async-storage', () => {
  const storage = new Map();
  return {
    default: {
      getItem: jest.fn((key) => {
        return Promise.resolve(storage.get(key) || null);
      }),
      setItem: jest.fn((key, value) => {
        storage.set(key, value);
        return Promise.resolve();
      }),
      removeItem: jest.fn((key) => {
        storage.delete(key);
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        storage.clear();
        return Promise.resolve();
      }),
      getAllKeys: jest.fn(() => {
        return Promise.resolve([...storage.keys()]);
      }),
      multiGet: jest.fn((keys) => {
        const result = keys.map(key => [key, storage.get(key) || null]);
        return Promise.resolve(result);
      }),
      multiSet: jest.fn((keyValuePairs) => {
        keyValuePairs.forEach(([key, value]) => {
          storage.set(key, value);
        });
        return Promise.resolve();
      }),
      multiRemove: jest.fn((keys) => {
        keys.forEach(key => {
          storage.delete(key);
        });
        return Promise.resolve();
      }),
    },
  };
});

// Mock react-native-heroicons
jest.mock('react-native-heroicons/outline', () => {
  const React = require('react');
  const mockIcon = (name) => {
    const Icon = ({ ...props }) => React.createElement('MockIcon', { ...props, iconName: name });
    Icon.displayName = name;
    return Icon;
  };
  return {
    CheckCircleIcon: mockIcon('CheckCircleIcon'),
    InformationCircleIcon: mockIcon('InformationCircleIcon'),
    LightBulbIcon: mockIcon('LightBulbIcon'),
    CheckIcon: mockIcon('CheckIcon'),
    DocumentDuplicateIcon: mockIcon('DocumentDuplicateIcon'),
    ExclamationTriangleIcon: mockIcon('ExclamationTriangleIcon'),
    ArrowTopRightOnSquareIcon: mockIcon('ArrowTopRightOnSquareIcon'),
    ClockIcon: mockIcon('ClockIcon'),
  };
});

jest.mock('react-native-heroicons/solid', () => {
  const React = require('react');
  const mockIcon = (name) => {
    const Icon = ({ ...props }) => React.createElement('MockIcon', { ...props, iconName: name });
    Icon.displayName = name;
    return Icon;
  };
  return {
    CheckIcon: mockIcon('CheckIcon'),
    CheckCircleIcon: mockIcon('CheckCircleIcon'),
    ChevronRightIcon: mockIcon('ChevronRightIcon'),
  };
});

// Mock @nozbe/watermelondb
jest.mock('@nozbe/watermelondb', () => ({
  Database: jest.fn().mockImplementation(() => ({
    collections: {
      get: jest.fn().mockReturnValue({
        query: jest.fn().mockReturnValue({
          fetch: jest.fn().mockResolvedValue([]),
          where: jest.fn().mockReturnThis(),
        }),
        create: jest.fn().mockResolvedValue({}),
        find: jest.fn().mockResolvedValue({
          update: jest.fn().mockResolvedValue({}),
          markAsDeleted: jest.fn().mockResolvedValue({}),
        }),
      }),
    },
    write: jest.fn().mockImplementation((fn) => fn()),
    unsafeResetDatabase: jest.fn().mockResolvedValue(undefined),
  })),
  Model: class MockModel {
    constructor() {
      this.id = 'mock-id';
    }
    static table = 'mock_table';
  },
  appSchema: jest.fn(),
  tableSchema: jest.fn(),
  field: () => () => {},
  date: () => () => {},
  readonly: () => () => {},
}));

jest.mock('@nozbe/watermelondb/adapters/sqlite', () => jest.fn());
jest.mock('@nozbe/watermelondb/Schema/migrations', () => ({
  schemaMigrations: jest.fn(),
  createTable: jest.fn(),
}));

// Mock react-native-image-picker
jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn((options, callback) => {
    // Mock successful image capture
    callback({
      didCancel: false,
      errorMessage: null,
      assets: [{
        uri: 'file://mock-image.jpg',
        base64: 'mockBase64String',
        width: 1000,
        height: 1000,
        fileSize: 50000,
      }],
    });
  }),
  launchImageLibrary: jest.fn((options, callback) => {
    // Mock successful image selection
    callback({
      didCancel: false,
      errorMessage: null,
      assets: [{
        uri: 'file://mock-image.jpg',
        base64: 'mockBase64String',
        width: 1000,
        height: 1000,
        fileSize: 50000,
      }],
    });
  }),
  MediaType: {
    photo: 'photo',
    video: 'video',
    mixed: 'mixed',
  },
}));

// Mock react-native-qrcode-scanner
jest.mock('react-native-qrcode-scanner', () => {
  const React = require('react');
  const mockComponent = ({ children, ...props }) => React.createElement('QRCodeScanner', props, children);
  mockComponent.displayName = 'QRCodeScanner';
  return mockComponent;
});

// Mock react-native-qrcode-svg
jest.mock('react-native-qrcode-svg', () => {
  const React = require('react');
  const mockComponent = ({ children, ...props }) => React.createElement('QRCodeSVG', props, children);
  mockComponent.displayName = 'QRCodeSVG';
  return mockComponent;
});

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialIcons', () => {
  const React = require('react');
  const mockIcon = ({ name, ...props }) => React.createElement('MaterialIcon', { ...props, iconName: name });
  mockIcon.displayName = 'MaterialIcon';
  return mockIcon;
});

jest.mock('react-native-vector-icons/Ionicons', () => {
  const React = require('react');
  const mockIcon = ({ name, ...props }) => React.createElement('Ionicon', { ...props, iconName: name });
  mockIcon.displayName = 'Ionicon';
  return mockIcon;
});

jest.mock('react-native-vector-icons/FontAwesome', () => {
  const React = require('react');
  const mockIcon = ({ name, ...props }) => React.createElement('FontAwesomeIcon', { ...props, iconName: name });
  mockIcon.displayName = 'FontAwesomeIcon';
  return mockIcon;
});

// Mock react-native-camera
jest.mock('react-native-camera', () => {
  const React = require('react');
  const RNCamera = ({ children, ...props }) => {
    React.useEffect(() => {
      if (props.onCameraReady) props.onCameraReady();
    }, []);
    return React.createElement('RNCamera', props, children);
  };
  RNCamera.Constants = {
    Type: { back: 'back', front: 'front' },
    FlashMode: { off: 'off', on: 'on', torch: 'torch', auto: 'auto' }
  };
  return { RNCamera };
});

// Mock our storage services to avoid import issues
jest.mock('@/services/storage/database', () => ({
  databaseService: {
    initialize: jest.fn().mockResolvedValue({}),
    getDatabase: jest.fn().mockResolvedValue({}),
    getTrips: jest.fn().mockResolvedValue([]),
    createTrip: jest.fn().mockResolvedValue({ id: 'mock-trip-id' }),
    updateTrip: jest.fn().mockResolvedValue({}),
    deleteTrip: jest.fn().mockResolvedValue({}),
    getTripLegs: jest.fn().mockResolvedValue([]),
    createTripLeg: jest.fn().mockResolvedValue({ id: 'mock-leg-id' }),
    updateTripLeg: jest.fn().mockResolvedValue({}),
    getQRCodes: jest.fn().mockResolvedValue([]),
    saveQRCode: jest.fn().mockResolvedValue({ id: 'mock-qr-id' }),
    deleteQRCode: jest.fn().mockResolvedValue({}),
    reset: jest.fn().mockResolvedValue({}),
    close: jest.fn().mockResolvedValue({}),
  },
}));

// Mock react-native-haptic-feedback
jest.mock('react-native-haptic-feedback', () => ({
  trigger: jest.fn(),
  HapticFeedbackTypes: {
    impactLight: 'impactLight',
    impactMedium: 'impactMedium',
    impactHeavy: 'impactHeavy',
    selection: 'selection',
    notificationSuccess: 'notificationSuccess',
    notificationWarning: 'notificationWarning',
    notificationError: 'notificationError',
  },
}));

// Mock the entire storage module to prevent model imports
jest.mock('@/services/storage', () => ({
  keychainService: {
    storeProfile: jest.fn().mockResolvedValue(undefined),
    getProfile: jest.fn().mockResolvedValue(null),
    deleteProfile: jest.fn().mockResolvedValue(undefined),
    generateEncryptionKey: jest.fn().mockResolvedValue('mock-key'),
    getEncryptionKey: jest.fn().mockResolvedValue('mock-key'),
    isAvailable: jest.fn().mockResolvedValue(true),
  },
  mmkvService: {
    getPreferences: jest.fn().mockReturnValue({
      theme: 'auto',
      language: 'en',
      onboardingComplete: false,
      biometricEnabled: false,
      lastSchemaUpdateCheck: '',
      analyticsEnabled: false,
      crashReportingEnabled: false,
    }),
    setPreference: jest.fn(),
    clearPreferences: jest.fn(),
    getFeatureFlag: jest.fn().mockReturnValue(false),
    setFeatureFlag: jest.fn(),
    getCacheItem: jest.fn().mockReturnValue(null),
    setCacheItem: jest.fn(),
    clearCache: jest.fn(),
    getString: jest.fn(),
    setString: jest.fn(),
    getBoolean: jest.fn(),
    setBoolean: jest.fn(),
    getNumber: jest.fn(),
    setNumber: jest.fn(),
    delete: jest.fn(),
    getAllKeys: jest.fn().mockReturnValue([]),
    clearAll: jest.fn(),
  },
  databaseService: {
    initialize: jest.fn().mockResolvedValue({}),
    getDatabase: jest.fn().mockResolvedValue({}),
    getTrips: jest.fn().mockResolvedValue([]),
    createTrip: jest.fn().mockResolvedValue({ id: 'mock-trip-id' }),
    updateTrip: jest.fn().mockResolvedValue({}),
    deleteTrip: jest.fn().mockResolvedValue({}),
    getTripLegs: jest.fn().mockResolvedValue([]),
    createTripLeg: jest.fn().mockResolvedValue({ id: 'mock-leg-id' }),
    updateTripLeg: jest.fn().mockResolvedValue({}),
    getQRCodes: jest.fn().mockResolvedValue([]),
    saveQRCode: jest.fn().mockResolvedValue({ id: 'mock-qr-id' }),
    deleteQRCode: jest.fn().mockResolvedValue({}),
    reset: jest.fn().mockResolvedValue({}),
    close: jest.fn().mockResolvedValue({}),
  },
}));