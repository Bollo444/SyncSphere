/**
 * SyncSphere Database Security Configuration
 * Centralized security settings and utilities
 */

const crypto = require('crypto');

/**
 * Security configuration constants
 */
const SECURITY_CONFIG = {
  // Password requirements
  PASSWORD: {
    MIN_LENGTH: 12,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL: true,
    EXCLUDE_SIMILAR: true,
    EXCLUDE_AMBIGUOUS: true,
    MAX_ATTEMPTS: 5,
    LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
    RESET_TOKEN_EXPIRY: 60 * 60 * 1000 // 1 hour
  },

  // Session security
  SESSION: {
    SECRET_LENGTH: 64,
    COOKIE_MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
    SECURE_COOKIES: process.env.NODE_ENV === 'production',
    SAME_SITE: 'strict',
    HTTP_ONLY: true
  },

  // JWT configuration
  JWT: {
    SECRET_LENGTH: 64,
    ACCESS_TOKEN_EXPIRY: '15m',
    REFRESH_TOKEN_EXPIRY: '7d',
    ALGORITHM: 'HS256'
  },

  // Rate limiting
  RATE_LIMIT: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100,
    LOGIN_MAX_REQUESTS: 5,
    LOGIN_WINDOW_MS: 15 * 60 * 1000
  },

  // Database security
  DATABASE: {
    CONNECTION_TIMEOUT: 30000,
    IDLE_TIMEOUT: 10000,
    MAX_CONNECTIONS: 20,
    SSL_MODE: process.env.NODE_ENV === 'production' ? 'require' : 'prefer',
    STATEMENT_TIMEOUT: 300000 // 5 minutes
  },

  // Encryption
  ENCRYPTION: {
    ALGORITHM: 'aes-256-gcm',
    KEY_LENGTH: 32,
    IV_LENGTH: 16,
    TAG_LENGTH: 16,
    SALT_ROUNDS: 12
  },

  // File upload security
  UPLOAD: {
    MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
    ALLOWED_MIME_TYPES: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/plain',
      'application/zip'
    ],
    SCAN_FOR_MALWARE: true,
    QUARANTINE_SUSPICIOUS: true
  },

  // Audit logging
  AUDIT: {
    LOG_LEVEL: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    RETENTION_DAYS: 90,
    SENSITIVE_FIELDS: ['password', 'token', 'secret', 'key'],
    LOG_FAILED_ATTEMPTS: true,
    LOG_SUCCESSFUL_LOGINS: true
  }
};

/**
 * Security utility functions
 */
class SecurityUtils {
  /**
   * Generate cryptographically secure random string
   * @param {number} length - Length of the string
   * @param {string} charset - Character set to use
   * @returns {string} Random string
   */
  static generateSecureRandom(
    length = 32,
    charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  ) {
    let result = '';
    const bytes = crypto.randomBytes(length * 2);

    for (let i = 0; i < length; i++) {
      const randomIndex = bytes[i % bytes.length] % charset.length;
      result += charset[randomIndex];
    }

    return result;
  }

  /**
   * Generate secure password hash
   * @param {string} password - Plain text password
   * @param {number} saltRounds - Number of salt rounds
   * @returns {Promise<string>} Password hash
   */
  static async hashPassword(password, saltRounds = SECURITY_CONFIG.ENCRYPTION.SALT_ROUNDS) {
    const bcrypt = require('bcryptjs');
    return await bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   * @param {string} password - Plain text password
   * @param {string} hash - Password hash
   * @returns {Promise<boolean>} True if password matches
   */
  static async verifyPassword(password, hash) {
    const bcrypt = require('bcryptjs');
    return await bcrypt.compare(password, hash);
  }

  /**
   * Validate password strength
   * @param {string} password - Password to validate
   * @returns {Object} Validation result
   */
  static validatePassword(password) {
    const config = SECURITY_CONFIG.PASSWORD;
    const checks = {
      length: password.length >= config.MIN_LENGTH && password.length <= config.MAX_LENGTH,
      uppercase: config.REQUIRE_UPPERCASE ? /[A-Z]/.test(password) : true,
      lowercase: config.REQUIRE_LOWERCASE ? /[a-z]/.test(password) : true,
      numbers: config.REQUIRE_NUMBERS ? /[0-9]/.test(password) : true,
      special: config.REQUIRE_SPECIAL ? /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password) : true,
      noRepeating: !/(.)\1{2,}/.test(password),
      noSequential:
        !/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|123|234|345|456|567|678|789)/i.test(
          password
        ),
      noCommon: !this.isCommonPassword(password)
    };

    const score = Object.values(checks).filter(Boolean).length;
    const maxScore = Object.keys(checks).length;

    let strength = 'Weak';
    if (score >= maxScore) strength = 'Very Strong';
    else if (score >= maxScore - 1) strength = 'Strong';
    else if (score >= maxScore - 2) strength = 'Medium';

    return {
      isValid: score >= maxScore - 2,
      strength,
      score,
      maxScore,
      checks,
      suggestions: this.getPasswordSuggestions(checks)
    };
  }

  /**
   * Check if password is commonly used
   * @param {string} password - Password to check
   * @returns {boolean} True if password is common
   */
  static isCommonPassword(password) {
    const commonPasswords = [
      'password',
      '123456',
      '123456789',
      'qwerty',
      'abc123',
      'password123',
      'admin',
      'letmein',
      'welcome',
      'monkey',
      'dragon',
      'master',
      'shadow',
      'superman',
      'michael'
    ];

    return commonPasswords.includes(password.toLowerCase());
  }

  /**
   * Get password improvement suggestions
   * @param {Object} checks - Password validation checks
   * @returns {Array} Array of suggestions
   */
  static getPasswordSuggestions(checks) {
    const suggestions = [];

    if (!checks.length) suggestions.push('Use at least 12 characters');
    if (!checks.uppercase) suggestions.push('Include uppercase letters');
    if (!checks.lowercase) suggestions.push('Include lowercase letters');
    if (!checks.numbers) suggestions.push('Include numbers');
    if (!checks.special) suggestions.push('Include special characters');
    if (!checks.noRepeating) suggestions.push('Avoid repeating characters');
    if (!checks.noSequential) suggestions.push('Avoid sequential patterns');
    if (!checks.noCommon) suggestions.push('Avoid common passwords');

    return suggestions;
  }

  /**
   * Encrypt sensitive data
   * @param {string} text - Text to encrypt
   * @param {string} key - Encryption key
   * @returns {Object} Encrypted data with IV and tag
   */
  static encrypt(text, key) {
    const algorithm = SECURITY_CONFIG.ENCRYPTION.ALGORITHM;
    const iv = crypto.randomBytes(SECURITY_CONFIG.ENCRYPTION.IV_LENGTH);
    const cipher = crypto.createCipher(algorithm, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  /**
   * Decrypt sensitive data
   * @param {Object} encryptedData - Encrypted data object
   * @param {string} key - Decryption key
   * @returns {string} Decrypted text
   */
  static decrypt(encryptedData, key) {
    const algorithm = SECURITY_CONFIG.ENCRYPTION.ALGORITHM;
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const tag = Buffer.from(encryptedData.tag, 'hex');

    const decipher = crypto.createDecipher(algorithm, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Generate JWT secret
   * @returns {string} JWT secret
   */
  static generateJWTSecret() {
    return this.generateSecureRandom(SECURITY_CONFIG.JWT.SECRET_LENGTH);
  }

  /**
   * Generate session secret
   * @returns {string} Session secret
   */
  static generateSessionSecret() {
    return this.generateSecureRandom(SECURITY_CONFIG.SESSION.SECRET_LENGTH);
  }

  /**
   * Sanitize input to prevent injection attacks
   * @param {string} input - Input to sanitize
   * @returns {string} Sanitized input
   */
  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;

    return input
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .replace(/[;\-]/g, '') // Remove SQL comment indicators
      .trim();
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} True if email is valid
   */
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Generate secure token for password reset, email verification, etc.
   * @param {number} length - Token length
   * @returns {string} Secure token
   */
  static generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash token for storage (prevents token theft from database)
   * @param {string} token - Token to hash
   * @returns {string} Hashed token
   */
  static hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Check if IP address is in allowed range
   * @param {string} ip - IP address to check
   * @param {Array} allowedRanges - Array of allowed IP ranges
   * @returns {boolean} True if IP is allowed
   */
  static isIPAllowed(ip, allowedRanges = []) {
    if (allowedRanges.length === 0) return true;

    // Simple implementation - in production, use a proper IP range library
    return allowedRanges.some(range => {
      if (range === ip) return true;
      if (range.includes('/')) {
        // CIDR notation - simplified check
        const [network, bits] = range.split('/');
        // This is a simplified implementation
        return ip.startsWith(
          network
            .split('.')
            .slice(0, Math.floor(bits / 8))
            .join('.')
        );
      }
      return false;
    });
  }

  /**
   * Log security event
   * @param {string} event - Event type
   * @param {Object} details - Event details
   * @param {string} level - Log level
   */
  static logSecurityEvent(event, details = {}, level = 'info') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      event,
      level,
      details: this.sanitizeLogData(details)
    };

    // In production, this would integrate with your logging system
    console.log(`[SECURITY] ${JSON.stringify(logEntry)}`);
  }

  /**
   * Sanitize log data to remove sensitive information
   * @param {Object} data - Data to sanitize
   * @returns {Object} Sanitized data
   */
  static sanitizeLogData(data) {
    const sanitized = { ...data };
    const sensitiveFields = SECURITY_CONFIG.AUDIT.SENSITIVE_FIELDS;

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}

/**
 * Security middleware factory
 */
class SecurityMiddleware {
  /**
   * Create rate limiting middleware
   * @param {Object} options - Rate limit options
   * @returns {Function} Express middleware
   */
  static createRateLimit(options = {}) {
    const rateLimit = require('express-rate-limit');

    return rateLimit({
      windowMs: options.windowMs || SECURITY_CONFIG.RATE_LIMIT.WINDOW_MS,
      max: options.max || SECURITY_CONFIG.RATE_LIMIT.MAX_REQUESTS,
      message: options.message || 'Too many requests, please try again later',
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        SecurityUtils.logSecurityEvent(
          'rate_limit_exceeded',
          {
            ip: req.ip,
            userAgent: req.get('User-Agent'),
            path: req.path
          },
          'warn'
        );

        res.status(429).json({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil(options.windowMs / 1000)
        });
      }
    });
  }

  /**
   * Create input validation middleware
   * @param {Object} schema - Validation schema
   * @returns {Function} Express middleware
   */
  static validateInput(schema) {
    return (req, res, next) => {
      const { error, value } = schema.validate(req.body);

      if (error) {
        SecurityUtils.logSecurityEvent(
          'input_validation_failed',
          {
            ip: req.ip,
            path: req.path,
            error: error.message
          },
          'warn'
        );

        return res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(detail => detail.message)
        });
      }

      req.body = value;
      next();
    };
  }

  /**
   * Create security headers middleware
   * @returns {Function} Express middleware
   */
  static securityHeaders() {
    const helmet = require('helmet');

    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"]
        }
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    });
  }
}

module.exports = {
  SECURITY_CONFIG,
  SecurityUtils,
  SecurityMiddleware
};
