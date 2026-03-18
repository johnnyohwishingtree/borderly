module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  forceExit: true,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.(js|jsx)$': ['babel-jest', {
      configFile: false,
      presets: ['@react-native/babel-preset'],
      plugins: [
        ['@babel/plugin-proposal-decorators', { legacy: true }],
        ['module-resolver', { root: ['.'], alias: { '@': './src' } }],
      ],
    }],
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-navigation|@react-navigation|zustand|react-native-get-random-values)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/android/', '<rootDir>/ios/', '<rootDir>/.claude/', '<rootDir>/__tests__/e2e/'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/__tests__/**',
    '!src/app/App.tsx',
  ],
  testMatch: [
    '**/__tests__/**/*.(test|spec).(ts|tsx|js)',
    '!**/__tests__/App.test.tsx',
  ],
};
