// Web implementation of react-native-mmkv using localStorage for persistence.

const PREFIX = '__mmkv_';

class MMKV {
  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // localStorage may be full or unavailable; silently fail
    }
  }
  getString(key) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw === null) return undefined;
      const parsed = JSON.parse(raw);
      return typeof parsed === 'string' ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  getBoolean(key) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw === null) return undefined;
      const parsed = JSON.parse(raw);
      return typeof parsed === 'boolean' ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  getNumber(key) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (raw === null) return undefined;
      const parsed = JSON.parse(raw);
      return typeof parsed === 'number' ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  delete(key) {
    try {
      localStorage.removeItem(PREFIX + key);
    } catch {
      // ignore
    }
  }
  getAllKeys() {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX)) {
          keys.push(k.slice(PREFIX.length));
        }
      }
      return keys;
    } catch {
      return [];
    }
  }
  clearAll() {
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIX)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch {
      // ignore
    }
  }
}
module.exports = { MMKV };
