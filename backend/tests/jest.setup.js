// Jest setup file that runs after test environment is initialized
// This file contains lifecycle hooks and test utilities

console.log('🚀 Jest setup completed - lifecycle hooks applied');

// Global test timeout
jest.setTimeout(60000);

// Setup before all tests
beforeAll(async () => {
  console.log('✅ Test environment initialized with mocks');
});

// Cleanup after all tests
afterAll(async () => {
  console.log('✅ Test cleanup completed');
});

// Clean up before each test
beforeEach(async () => {
  // Reset all mocks except the essential database and Redis mocks
  // Don't clear mocks that are set up in setup.js
  // jest.clearAllMocks(); // Commented out to preserve database mocks
});