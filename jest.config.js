module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest',
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx'
      },
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-navigation|@react-navigation|zustand|react-native-get-random-values)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/android/', '<rootDir>/ios/'],
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
