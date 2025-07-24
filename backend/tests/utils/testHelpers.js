const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

/**
 * Test Helper Utilities
 */
class TestHelpers {
  /**
   * Generate a JWT token for testing
   */
  static generateToken(payload = {}) {
    const defaultPayload = {
      id: uuidv4(),
      email: 'test@example.com',
      role: 'user',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 // 1 hour
    };

    return jwt.sign({ ...defaultPayload, ...payload }, process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only');
  }

  /**
   * Generate an expired JWT token for testing
   */
  static generateExpiredToken(payload = {}) {
    const defaultPayload = {
      id: uuidv4(),
      email: 'test@example.com',
      role: 'user',
      iat: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      exp: Math.floor(Date.now() / 1000) - 1800 // 30 minutes ago (expired)
    };

    return jwt.sign({ ...defaultPayload, ...payload }, process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing-only');
  }

  /**
   * Generate an admin JWT token for testing
   */
  static generateAdminToken(payload = {}) {
    return this.generateToken({
      role: 'admin',
      ...payload
    });
  }

  /**
   * Create authorization header for requests
   */
  static createAuthHeader(token) {
    return { Authorization: `Bearer ${token}` };
  }

  /**
   * Wait for a specified amount of time
   */
  static async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate random string for testing
   */
  static randomString(length = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Generate random email for testing
   */
  static randomEmail() {
    return `test${this.randomString(8)}@example.com`;
  }

  /**
   * Generate random phone number for testing
   */
  static randomPhone() {
    return `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`;
  }

  /**
   * Create mock request object
   */
  static createMockRequest(overrides = {}) {
    return {
      body: {},
      params: {},
      query: {},
      headers: {},
      user: null,
      ...overrides
    };
  }

  /**
   * Create mock response object
   */
  static createMockResponse() {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
      redirect: jest.fn().mockReturnThis(),
      locals: {}
    };
    return res;
  }

  /**
   * Create mock next function
   */
  static createMockNext() {
    return jest.fn();
  }

  /**
   * Assert response structure
   */
  static assertApiResponse(response, expectedStatus = 200) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('success');
    expect(response.body).toHaveProperty('message');

    if (response.body.success) {
      expect(response.body).toHaveProperty('data');
    } else {
      expect(response.body).toHaveProperty('error');
    }
  }

  /**
   * Assert error response structure
   */
  static assertErrorResponse(response, expectedStatus = 400) {
    expect(response.status).toBe(expectedStatus);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('error');
  }

  /**
   * Assert validation error response
   */
  static assertValidationError(response) {
    this.assertErrorResponse(response, 400);
    expect(response.body.error).toHaveProperty('type', 'validation');
    expect(response.body.error).toHaveProperty('details');
    expect(Array.isArray(response.body.error.details)).toBe(true);
  }

  /**
   * Assert authentication error response
   */
  static assertAuthError(response) {
    this.assertErrorResponse(response, 401);
    expect(response.body.error).toHaveProperty('type', 'authentication');
  }

  /**
   * Assert authorization error response
   */
  static assertAuthorizationError(response) {
    this.assertErrorResponse(response, 403);
    expect(response.body.error).toHaveProperty('type', 'authorization');
  }

  /**
   * Assert not found error response
   */
  static assertNotFoundError(response) {
    this.assertErrorResponse(response, 404);
    expect(response.body.error).toHaveProperty('type', 'not_found');
  }

  /**
   * Create test file buffer
   */
  static createTestFile(size = 1024, type = 'text/plain') {
    const buffer = Buffer.alloc(size, 'test data');
    return {
      buffer,
      originalname: 'test-file.txt',
      mimetype: type,
      size: buffer.length
    };
  }

  /**
   * Create test image buffer
   */
  static createTestImage(width = 100, height = 100) {
    // Create a simple test image buffer (minimal PNG)
    const buffer = Buffer.from([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a, // PNG signature
      0x00,
      0x00,
      0x00,
      0x0d, // IHDR chunk length
      0x49,
      0x48,
      0x44,
      0x52, // IHDR
      0x00,
      0x00,
      0x00,
      width, // Width
      0x00,
      0x00,
      0x00,
      height, // Height
      0x08,
      0x02,
      0x00,
      0x00,
      0x00, // Bit depth, color type, compression, filter, interlace
      0x00,
      0x00,
      0x00,
      0x00, // CRC (simplified)
      0x00,
      0x00,
      0x00,
      0x00, // IEND chunk length
      0x49,
      0x45,
      0x4e,
      0x44, // IEND
      0xae,
      0x42,
      0x60,
      0x82 // IEND CRC
    ]);

    return {
      buffer,
      originalname: 'test-image.png',
      mimetype: 'image/png',
      size: buffer.length
    };
  }

  /**
   * Mock database query results
   */
  static mockQueryResult(rows = [], rowCount = null) {
    return {
      rows,
      rowCount: rowCount !== null ? rowCount : rows.length,
      command: 'SELECT',
      fields: []
    };
  }

  /**
   * Mock successful database insert
   */
  static mockInsertResult(insertedData) {
    return this.mockQueryResult([insertedData], 1);
  }

  /**
   * Mock successful database update
   */
  static mockUpdateResult(updatedData) {
    return this.mockQueryResult([updatedData], 1);
  }

  /**
   * Mock successful database delete
   */
  static mockDeleteResult(deletedCount = 1) {
    return this.mockQueryResult([], deletedCount);
  }

  /**
   * Clean up test environment
   */
  static async cleanup() {
    // Clear any test data, close connections, etc.
    // This is called after each test suite
    return Promise.resolve();
  }

  /**
   * Setup test environment
   */
  static async setup() {
    // Initialize test environment, create test data, etc.
    // This is called before each test suite
    return Promise.resolve();
  }
}

module.exports = TestHelpers;
