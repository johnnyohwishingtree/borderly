/**
 * Mock for @react-native-async-storage/async-storage
 * Used in webpack builds for E2E testing
 */

const storage = new Map();

const AsyncStorage = {
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
};

export default AsyncStorage;