module.exports = {
  root: true,
  extends: ['@react-native'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        '@typescript-eslint/no-shadow': ['error'],
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/no-non-null-assertion': 'warn',
        'no-shadow': 'off',
        'no-undef': 'off',
      },
    },
    {
      files: ['jest.setup.js', 'e2e/mocks/**/*.js', '__tests__/**/*.js'],
      env: {
        jest: true,
      },
    },
    {
      files: ['scripts/**/*.js'],
      env: {
        node: true,
      },
    },
  ],
};
