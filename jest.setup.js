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

// Basic Jest setup for TypeScript unit tests

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
  AUTHENTICATION_TYPE: {
    BIOMETRICS: 'AuthenticationWithBiometricsDevicePasscode',
  },
  ACCESS_CONTROL: {
    BIOMETRY_CURRENT_SET: 'kSecAccessControlBiometryCurrentSet',
  },
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'kSecAttrAccessibleWhenUnlockedThisDeviceOnly',
  },
}));

// Mock react-native-mmkv
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    getBoolean: jest.fn(),
    getNumber: jest.fn(),
    delete: jest.fn(),
    getAllKeys: jest.fn().mockReturnValue([]),
    clearAll: jest.fn(),
  })),
}));

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
