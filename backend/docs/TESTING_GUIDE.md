# Testing Guide for SyncSphere Backend

## Overview

This guide outlines best practices for testing in the SyncSphere backend, particularly around database mocking and integration testing strategies.

## Test Configuration Types

### 1. Standard Jest Config (`jest.config.js`)

**Use for**: Unit tests and component tests that benefit from mocking

**Features**:
- Database queries are mocked via `tests/setup.js`
- Fast execution
- Isolated test environment
- No real database dependencies

**Best for**:
- Service layer unit tests
- Middleware testing
- Utility function tests
- Business logic validation

```bash
# Run unit tests with mocks
npx jest tests/unit/
npx jest tests/services/
```

### 2. No-Mocks Jest Config (`jest.config.nomocks.js`)

**Use for**: Integration tests requiring real database operations

**Features**:
- No setup files or mocks
- Real database connections
- Actual authentication flow
- End-to-end request/response testing

**Best for**:
- API endpoint integration tests
- Authentication flow testing
- Database schema validation
- Cross-service integration

```bash
# Run integration tests without mocks
npx jest --config jest.config.nomocks.js
```

## File Naming Conventions

### Unit Tests (with mocks)
```
tests/unit/*.test.js
tests/services/*.test.js
tests/middleware/*.test.js
```

### Integration Tests (no mocks)
```
tests/integration/nomock.*.test.js
tests/nomock.*.test.js
```

## Authentication Testing Patterns

### ❌ Common Pitfall: Mock Interference

**Problem**: Jest setup mocks prevent real user creation and authentication

```javascript
// This will fail with 401 errors when using standard Jest config
describe('Device Tests', () => {
  beforeAll(async () => {
    // Mocked database queries return empty results
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send(userData); // This gets mocked!
    
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send(credentials); // No real user exists!
  });
});
```

### ✅ Correct Integration Test Pattern

```javascript
// Use no-mocks config for real authentication
const request = require('supertest');
const app = require('../../src/app');
const { connectDB, query } = require('../../src/config/database');

describe('Device Integration Tests (No Mocks)', () => {
  let authToken;
  
  beforeAll(async () => {
    await connectDB();
    
    // Clean up test data
    await query('DELETE FROM users WHERE email = $1', ['test@example.com']);
    
    // Real user registration
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send(userData);
    
    // Real authentication
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send(credentials);
    
    authToken = loginResponse.body.data.token;
  });
  
  test('should register device with real auth', async () => {
    const response = await request(app)
      .post('/api/v1/devices/register')
      .set('Authorization', `Bearer ${authToken}`)
      .send(deviceData);
    
    expect(response.status).toBe(201);
  });
});
```

## Database Testing Strategies

### Test Database Isolation

**Recommended**: Use separate test databases to avoid conflicts

```javascript
// Environment-specific database configuration
const DB_CONFIG = {
  development: {
    database: 'syncsphere',
    port: 5433
  },
  test: {
    database: 'syncsphere_test',
    port: 5434
  },
  integration: {
    database: 'syncsphere_integration',
    port: 5435
  }
};
```

### Test Data Cleanup

**Always clean up test data** to prevent test interference:

```javascript
beforeAll(async () => {
  // Clean up before tests
  await query('DELETE FROM devices WHERE "userId" = $1', [testUserId]);
  await query('DELETE FROM users WHERE email = $1', [testEmail]);
});

afterAll(async () => {
  // Clean up after tests
  await query('DELETE FROM devices WHERE "userId" = $1', [testUserId]);
  await query('DELETE FROM users WHERE id = $1', [testUserId]);
});
```

## Running Tests

### Unit Tests (Fast, Mocked)
```bash
# Run all unit tests with mocks
npm test

# Run specific unit test suites
npx jest tests/unit/
npx jest tests/services/
npx jest auth.test.js
```

### Integration Tests (Slower, Real DB)
```bash
# Run all integration tests without mocks
npx jest --config jest.config.nomocks.js

# Run specific integration tests
npx jest --config jest.config.nomocks.js tests/integration/
npx jest --config jest.config.nomocks.js nomock.device.test.js
```

### Full Test Suite
```bash
# Run both unit and integration tests
npm run test:all
```

## Debugging Test Issues

### Authentication Failures (401 Errors)

1. **Check if using correct Jest config**:
   - Unit tests: Use `jest.config.js` (mocked)
   - Integration tests: Use `jest.config.nomocks.js` (real DB)

2. **Verify database connection**:
   ```javascript
   beforeAll(async () => {
     await connectDB();
     console.log('Database connected for tests');
   });
   ```

3. **Debug authentication flow**:
   ```javascript
   console.log('Register Status:', registerResponse.status);
   console.log('Login Status:', loginResponse.status);
   console.log('Auth Token:', authToken ? 'RECEIVED' : 'MISSING');
   ```

### Database Schema Issues

1. **Missing tables**: Ensure all required tables exist
2. **Schema mismatches**: Verify column names and types
3. **Foreign key constraints**: Check relationship integrity

## Best Practices Summary

### ✅ Do
- Use mocked tests for unit testing business logic
- Use real database tests for integration testing
- Clean up test data before and after tests
- Use descriptive test names and file naming conventions
- Separate test databases by environment
- Debug authentication flows step by step

### ❌ Don't
- Mix mocked and real database operations in the same test
- Rely on test execution order
- Leave test data in the database
- Use production database for testing
- Ignore authentication setup in integration tests

## Troubleshooting Checklist

- [ ] Using correct Jest configuration for test type?
- [ ] Database connection established?
- [ ] Test data cleaned up properly?
- [ ] Authentication token generated and passed correctly?
- [ ] Required database tables exist?
- [ ] Environment variables set correctly?
- [ ] No conflicting mocks interfering with real operations?

## Example Test Files

### Unit Test Example
```javascript
// tests/unit/deviceService.test.js
const DeviceService = require('../../src/services/devices/deviceService');

// Uses mocked database via jest.config.js
describe('DeviceService Unit Tests', () => {
  test('should validate device data', () => {
    // Pure business logic testing
  });
});
```

### Integration Test Example
```javascript
// tests/integration/nomock.device.integration.test.js
const request = require('supertest');
const app = require('../../src/app');

// Uses real database via jest.config.nomocks.js
describe('Device Integration Tests', () => {
  test('should register device with authentication', async () => {
    // Full end-to-end testing
  });
});
```

This guide should be referenced whenever adding new tests or debugging test failures in the SyncSphere backend.