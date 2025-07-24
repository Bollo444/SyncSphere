const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

/**
 * User Factory for generating test user data
 */
class UserFactory {
  static async create(overrides = {}) {
    const defaultUser = {
      id: uuidv4(),
      email: `test${Date.now()}@example.com`,
      password: 'TestPassword123!',
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
      subscriptionTier: 'free',
      isActive: true,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const userData = { ...defaultUser, ...overrides };

    // Hash password if provided
    if (userData.password) {
      userData.passwordHash = await bcrypt.hash(userData.password, 10);
    }

    return userData;
  }

  static async createAdmin(overrides = {}) {
    return this.create({
      role: 'admin',
      subscriptionTier: 'premium',
      ...overrides
    });
  }

  static async createPremiumUser(overrides = {}) {
    return this.create({
      subscriptionTier: 'premium',
      ...overrides
    });
  }

  static async createUnverifiedUser(overrides = {}) {
    return this.create({
      emailVerified: false,
      emailVerificationToken: uuidv4(),
      ...overrides
    });
  }

  static async createInactiveUser(overrides = {}) {
    return this.create({
      isActive: false,
      ...overrides
    });
  }

  static async createBatch(count = 5, overrides = {}) {
    const users = [];
    for (let i = 0; i < count; i++) {
      const user = await this.create({
        email: `test${Date.now()}_${i}@example.com`,
        firstName: `Test${i}`,
        ...overrides
      });
      users.push(user);
    }
    return users;
  }
}

module.exports = UserFactory;
