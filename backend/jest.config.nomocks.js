module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/nomock.*.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/server.js'
  ],
  // Setup file for integration tests - ensures Redis and DB are connected
  setupFilesAfterEnv: ['<rootDir>/tests/setup.nomocks.js'],
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  maxWorkers: 1,
  clearMocks: false,
  resetMocks: false,
  restoreMocks: false
};