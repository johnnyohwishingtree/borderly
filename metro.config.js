const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const config = mergeConfig(getDefaultConfig(__dirname), {
  transformer: {
    // Enable optimizations for tree shaking
    unstable_allowRequireContext: true,
  },
  resolver: {
    // Asset extensions for optimization
    assetExts: [...getDefaultConfig(__dirname).resolver.assetExts, 'webp'],
    // Alias for absolute imports
    alias: {
      '@': './src',
    },
  },
  serializer: {
    // Enable tree shaking and dead code elimination
    processModuleFilter: (module) => {
      // Filter out development-only modules in production
      if (process.env.NODE_ENV === 'production') {
        // Remove dev tools and debug utilities
        const path = module.path;
        return !path.includes('__DEV__') && 
               !path.includes('react-devtools') &&
               !path.includes('flipper') &&
               !path.includes('.test.') &&
               !path.includes('.spec.');
      }
      return true;
    },
  },
});

module.exports = config;
