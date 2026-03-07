module.exports = {
  presets: [
    [
      '@react-native/babel-preset',
      {
        // Enable module tree shaking
        modules: false,
        // Optimize for production builds
        useTransformReactJSXExperimental: true,
      },
    ],
  ],
  plugins: [
    ['@babel/plugin-proposal-decorators', {legacy: true}],
    'nativewind/babel',
    [
      'module-resolver',
      {
        root: ['.'],
        alias: {
          '@': './src',
        },
      },
    ],
  ],
  env: {
    production: {
      plugins: [
        // Remove console statements in production for smaller bundle
        ['transform-remove-console', {exclude: ['error', 'warn']}],
        // Remove PropTypes in production
        ['react-remove-properties', {properties: ['data-testid']}],
        // Optimize imports for better tree shaking
        [
          'babel-plugin-transform-imports',
          {
            'react-native-vector-icons': {
              // Only import specific icons to reduce bundle size
              transform: 'react-native-vector-icons/dist/${member}',
              preventFullImport: true,
            },
          },
        ],
      ],
    },
    development: {
      plugins: [
        // Keep console statements in development
        // Enable better debugging
      ],
    },
  },
};
