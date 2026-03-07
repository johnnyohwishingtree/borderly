module.exports = {
  presets: ['@react-native/babel-preset'],
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
        // Remove test properties in production
        ['react-remove-properties', {properties: ['data-testid']}],
      ],
    },
  },
};
