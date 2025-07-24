module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/server.js'
  ],
  setupFiles: ['<rootDir>/tests/setup.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js'],
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  maxWorkers: 1, // Run tests sequentially to avoid race conditions
  clearMocks: false, // Changed to false to preserve our mocks
  resetMocks: false, // Changed to false to preserve our mocks
  restoreMocks: false // Changed to false to preserve our mocks
};