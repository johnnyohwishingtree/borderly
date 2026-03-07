const store = {};
class MMKV {
  set(key, value) { store[key] = value; }
  getString(key) { return store[key]; }
  getBoolean(key) { return store[key]; }
  getNumber(key) { return store[key]; }
  delete(key) { delete store[key]; }
  getAllKeys() { return Object.keys(store); }
  clearAll() { Object.keys(store).forEach(k => delete store[k]); }
}
module.exports = { MMKV };
