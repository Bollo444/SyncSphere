const { query } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class User {
  constructor(userData) {
    this.id = userData.id;
    this.email = userData.email;
    this.firstName = userData.first_name;
    this.lastName = userData.last_name;
    this.role = userData.role;
    this.isActive = userData.is_active;
    this.emailVerified = userData.email_verified;
    this.lastLogin = userData.last_login;
    this.createdAt = userData.created_at;
    this.updatedAt = userData.updated_at;
  }

  // Create user table
  static async createTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin', 'support')),
        is_active BOOLEAN DEFAULT true,
        email_verified BOOLEAN DEFAULT false,
        email_verification_token VARCHAR(255),
        email_verification_expires TIMESTAMP,
        password_reset_token VARCHAR(255),
        password_reset_expires TIMESTAMP,
        last_login TIMESTAMP,
        login_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
      CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
    `;
    
    await query(createTableQuery);
  }

  // Create a new user
  static async create(userData) {
    const { email, password, firstName, lastName, role = 'user' } = userData;
    
    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Generate email verification token if email verification is enabled
    let emailVerificationToken = null;
    let emailVerificationExpires = null;
    
    if (process.env.ENABLE_EMAIL_VERIFICATION === 'true') {
      emailVerificationToken = crypto.randomBytes(32).toString('hex');
      emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    }
    
    // Generate a unique ID for SQLite compatibility
    const userId = crypto.randomUUID();
    
    const insertQuery = `
      INSERT INTO users (
        id, email, password_hash, first_name, last_name, role,
        email_verification_token, email_verification_expires
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    
    await query(insertQuery, [
      userId,
      email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      role,
      emailVerificationToken,
      emailVerificationExpires
    ]);
    
    // Fetch the created user
    const selectQuery = 'SELECT * FROM users WHERE id = $1';
    const result = await query(selectQuery, [userId]);
    
    const user = new User(result.rows[0]);
    user.emailVerificationToken = emailVerificationToken;
    
    return user;
  }

  // Find user by email
  static async findByEmail(email) {
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    return result.rows.length > 0 ? new User(result.rows[0]) : null;
  }

  // Find user by ID
  static async findById(id) {
    const result = await query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    
    return result.rows.length > 0 ? new User(result.rows[0]) : null;
  }

  // Find user by email verification token
  static async findByEmailVerificationToken(token) {
    const result = await query(
      'SELECT * FROM users WHERE email_verification_token = $1 AND email_verification_expires > NOW()',
      [token]
    );
    
    return result.rows.length > 0 ? new User(result.rows[0]) : null;
  }

  // Find user by password reset token
  static async findByPasswordResetToken(token) {
    const result = await query(
      'SELECT * FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()',
      [token]
    );
    
    return result.rows.length > 0 ? new User(result.rows[0]) : null;
  }

  // Verify password
  async verifyPassword(password) {
    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [this.id]
    );
    
    if (result.rows.length === 0) {
      return false;
    }
    
    return await bcrypt.compare(password, result.rows[0].password_hash);
  }

  // Update password
  async updatePassword(newPassword) {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    
    await query(
      'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [passwordHash, this.id]
    );
  }

  // Generate JWT token
  generateToken() {
    return jwt.sign(
      { id: this.id, email: this.email, role: this.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
  }

  // Generate refresh token
  generateRefreshToken() {
    return jwt.sign(
      { id: this.id, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d' }
    );
  }

  // Verify email
  async verifyEmail() {
    await query(
      'UPDATE users SET email_verified = true, email_verification_token = NULL, email_verification_expires = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [this.id]
    );
    
    this.emailVerified = true;
  }

  // Generate password reset token
  async generatePasswordResetToken() {
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    await query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [resetToken, resetExpires, this.id]
    );
    
    return resetToken;
  }

  // Update last login
  async updateLastLogin() {
    await query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP, login_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [this.id]
    );
    
    this.lastLogin = new Date();
  }

  // Handle failed login attempt
  async handleFailedLogin() {
    const maxAttempts = 5;
    const lockDuration = 15 * 60 * 1000; // 15 minutes
    
    const result = await query(
      'SELECT login_attempts FROM users WHERE id = $1',
      [this.id]
    );
    
    const currentAttempts = result.rows[0]?.login_attempts || 0;
    const newAttempts = currentAttempts + 1;
    
    if (newAttempts >= maxAttempts) {
      const lockUntil = new Date(Date.now() + lockDuration);
      await query(
        'UPDATE users SET login_attempts = $1, locked_until = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        [newAttempts, lockUntil, this.id]
      );
    } else {
      await query(
        'UPDATE users SET login_attempts = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newAttempts, this.id]
      );
    }
  }

  // Check if account is locked
  async isLocked() {
    const result = await query(
      'SELECT locked_until FROM users WHERE id = $1',
      [this.id]
    );
    
    const lockedUntil = result.rows[0]?.locked_until;
    return lockedUntil && new Date() < new Date(lockedUntil);
  }

  // Update user profile
  async updateProfile(updates) {
    const allowedUpdates = ['first_name', 'last_name'];
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedUpdates.includes(key)) {
        updateFields.push(`${key} = $${paramCount}`);
        updateValues.push(value);
        paramCount++;
      }
    }
    
    if (updateFields.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(this.id);
    
    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING first_name, last_name, updated_at
    `;
    
    const result = await query(updateQuery, updateValues);
    
    if (result.rows.length > 0) {
      this.firstName = result.rows[0].first_name;
      this.lastName = result.rows[0].last_name;
      this.updatedAt = result.rows[0].updated_at;
    }
  }

  // Deactivate user
  async deactivate() {
    await query(
      'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [this.id]
    );
    
    this.isActive = false;
  }

  // Get user's public data (safe for API responses)
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      role: this.role,
      isActive: this.isActive,
      emailVerified: this.emailVerified,
      lastLogin: this.lastLogin,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = User;