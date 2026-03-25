// Web implementation of react-native-mmkv using localStorage for persistence.
// Tests can pre-seed MMKV keys via window.__BORDERLY_STATE__.mmkv

const PREFIX = '__mmkv_';

let _seeded = false;
function seedFromInjectedState() {
  if (_seeded) return;
  _seeded = true;
  if (typeof window !== 'undefined' && window.__BORDERLY_STATE__ && window.__BORDERLY_STATE__.mmkv) {
    const mmkv = window.__BORDERLY_STATE__.mmkv;
    for (const [key, value] of Object.entries(mmkv)) {
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify(value));
      } catch { /* ignore */ }
    }
  }
}

class MMKV {
  set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // localStorage may be full or unavailable; silently fail
    }
  }
  getString(key) {
    seedFromInjectedState();
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
