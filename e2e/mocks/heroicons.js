// Mock for react-native-heroicons
// Returns null to avoid dual-React createElement issues in webpack

const handler = {
  get: (_target, name) => {
    if (name === '__esModule') return true;
    if (name === 'default') return new Proxy({}, handler);
    return (_props) => null;
  },
};

module.exports = new Proxy({}, handler);
