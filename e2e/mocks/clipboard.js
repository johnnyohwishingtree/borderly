// Web implementation of @react-native-clipboard/clipboard using the browser Clipboard API.

let fallbackStore = '';

const Clipboard = {
  getString: async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        return await navigator.clipboard.readText();
      }
    } catch {
      // Clipboard API may be blocked by permissions; fall back to in-memory store
    }
    return fallbackStore;
  },
  setString: (value) => {
    fallbackStore = value || '';
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value || '');
      }
    } catch {
      // Clipboard API may be blocked; value is still in fallbackStore
    }
  },
  hasString: async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        return text.length > 0;
      }
    } catch {
      // Fall back to in-memory check
    }
    return fallbackStore.length > 0;
  },
};

module.exports = Clipboard;
module.exports.default = Clipboard;
