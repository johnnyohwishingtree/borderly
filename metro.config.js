const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const config = mergeConfig(getDefaultConfig(__dirname), {
  transformer: {
    // Enable Hermes for better performance
    hermesCommand: 'hermes',
    minifierConfig: {
      // Optimize minification for smaller bundle size
      ecma: 2018,
      keep_classnames: false,
      keep_fnames: false,
      mangle: {
        toplevel: true,
        keep_classnames: false,
        keep_fnames: false,
      },
      module: true,
      output: {
        ascii_only: true,
        comments: false,
        webkit: true,
      },
      sourceMap: false,
      toplevel: true,
      warnings: false,
    },
    // Enable optimizations for tree shaking
    unstable_allowRequireContext: true,
  },
  resolver: {
    // Asset extensions for optimization
    assetExts: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ttf', 'otf', 'woff', 'woff2'],
    // Alias for absolute imports
    alias: {
      '@': './src',
    },
  },
  serializer: {
    // Enable tree shaking and dead code elimination
    processModuleFilter: (modules) => {
      // Filter out development-only modules in production
      if (process.env.NODE_ENV === 'production') {
        return modules.filter(module => {
          // Remove dev tools and debug utilities
          const path = module.path;
          return !path.includes('__DEV__') && 
                 !path.includes('react-devtools') &&
                 !path.includes('flipper') &&
                 !path.includes('.test.') &&
                 !path.includes('.spec.');
        });
      }
      return modules;
    },
    // Bundle splitting configuration
    createModuleIdFactory: () => (path) => {
      // Create shorter module IDs for better compression
      const hash = require('crypto').createHash('sha256').update(path).digest('hex');
      return hash.substring(0, 8);
    },
  },
  // Enable experimental code splitting
  experimental: {
    treeShaking: true,
  },
});

module.exports = config;
