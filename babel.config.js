module.exports = {
  presets: [
    ['@react-native/babel-preset', {jsxImportSource: 'nativewind'}],
    'nativewind/babel',
  ],
  plugins: [
    ['@babel/plugin-proposal-decorators', {legacy: true}],
    [
      'module-resolver',
      {
        root: ['.'],
        alias: {
          '@': './src',
        },
      },
    ],
    'react-native-reanimated/plugin', // must be last
  ],
  env: {
    production: {
      plugins: [
        ['transform-remove-console', {exclude: ['error', 'warn']}],
        ['react-remove-properties', {properties: ['data-testid']}],
      ],
    },
  },
};
