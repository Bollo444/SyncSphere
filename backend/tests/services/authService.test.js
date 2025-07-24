const AuthService = require('../../src/services/auth/authService');
const User = require('../../src/models/User');
const { AppError } = require('../../src/middleware/errorMiddleware');
const { setCache, deleteCache, getCache } = require('../../src/config/redis');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Mock dependencies
jest.mock('../../src/models/User');
jest.mock('../../src/middleware/errorMiddleware', () => ({
  AppError: jest.fn().mockImplementation((message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  })
}));
jest.mock('jsonwebtoken');
jest.mock('crypto');

describe('AuthService', () => {
  let mockUser;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset environment variables
    process.env = {
      ...originalEnv,
      JWT_SECRET: 'test-jwt-secret-key-for-testing-only',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      JWT_EXPIRE: '7d',
      ENABLE_EMAIL_VERIFICATION: 'false'
    };

    // Mock user object
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'user',
      isActive: true,
      emailVerified: true,
      emailVerificationToken: 'verification-token',
      toJSON: jest.fn().mockReturnValue({
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      }),
      generateToken: jest.fn().mockReturnValue('access-token'),
      generateRefreshToken: jest.fn().mockReturnValue('refresh-token'),
      verifyPassword: jest.fn(),
      isLocked: jest.fn().mockResolvedValue(false),
      handleFailedLogin: jest.fn(),
      updateLastLogin: jest.fn(),
      verifyEmail: jest.fn(),
      generatePasswordResetToken: jest.fn().mockResolvedValue('reset-token'),
      updatePassword: jest.fn(),
      updateProfile: jest.fn(),
      deactivate: jest.fn()
    };

    // Setup default mocks
    User.findByEmail.mockResolvedValue(null);
    User.create.mockResolvedValue(mockUser);
    User.findById.mockResolvedValue(mockUser);
    User.findByEmailVerificationToken.mockResolvedValue(mockUser);
    User.findByPasswordResetToken.mockResolvedValue(mockUser);
    setCache.mockResolvedValue(true);
    deleteCache.mockResolvedValue(true);
    getCache.mockResolvedValue(null);
    jwt.sign.mockReturnValue('jwt-token');
    jwt.verify.mockReturnValue({ id: 'user-123', email: 'test@example.com', type: 'refresh' });
    crypto.randomBytes.mockReturnValue({ toString: jest.fn().mockReturnValue('random-token') });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('register', () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      acceptTerms: true
    };

    it('should register a new user successfully when email verification is disabled', async () => {
      const result = await AuthService.register(userData);

      expect(User.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(User.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe'
      });
      expect(setCache).toHaveBeenCalledWith('refresh_token:user-123', 'refresh-token', 2592000);
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should register user without tokens when email verification is enabled', async () => {
      process.env.ENABLE_EMAIL_VERIFICATION = 'true';
      
      const result = await AuthService.register(userData);

      expect(result).toHaveProperty('user');
      expect(result).not.toHaveProperty('token');
      expect(result).not.toHaveProperty('refreshToken');
    });

    it('should throw error if terms are not accepted', async () => {
      const userDataWithoutTerms = { ...userData, acceptTerms: false };

      await expect(AuthService.register(userDataWithoutTerms))
        .rejects.toThrow('You must accept the terms and conditions');
    });

    it('should throw error if user already exists', async () => {
      User.findByEmail.mockResolvedValue(mockUser);

      await expect(AuthService.register(userData))
        .rejects.toThrow('User with this email already exists');
    });
  });

  describe('login', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'password123',
      rememberMe: false
    };

    beforeEach(() => {
      User.findByEmail.mockResolvedValue(mockUser);
      mockUser.verifyPassword.mockResolvedValue(true);
    });

    it('should login user successfully', async () => {
      const result = await AuthService.login(loginData);

      expect(User.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUser.isLocked).toHaveBeenCalled();
      expect(mockUser.verifyPassword).toHaveBeenCalledWith('password123');
      expect(mockUser.updateLastLogin).toHaveBeenCalled();
      expect(jwt.sign).toHaveBeenCalled();
      expect(setCache).toHaveBeenCalledWith('refresh_token:user-123', 'refresh-token', 2592000);
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresAt');
    });

    it('should extend token expiry when rememberMe is true', async () => {
      const loginDataWithRemember = { ...loginData, rememberMe: true };
      
      await AuthService.login(loginDataWithRemember);

      expect(jwt.sign).toHaveBeenCalledWith(
        { id: 'user-123', email: 'test@example.com', role: 'user' },
        'test-jwt-secret-key-for-testing-only',
        { expiresIn: '30d' }
      );
      expect(setCache).toHaveBeenCalledWith('refresh_token:user-123', 'refresh-token', 7776000);
    });

    it('should throw error if user not found', async () => {
      User.findByEmail.mockResolvedValue(null);

      await expect(AuthService.login(loginData))
        .rejects.toThrow('Invalid email or password');
    });

    it('should throw error if account is locked', async () => {
      mockUser.isLocked.mockResolvedValue(true);

      await expect(AuthService.login(loginData))
        .rejects.toThrow('Account is temporarily locked due to too many failed login attempts');
    });

    it('should throw error if account is inactive', async () => {
      mockUser.isActive = false;

      await expect(AuthService.login(loginData))
        .rejects.toThrow('Account is deactivated');
    });

    it('should handle failed login and throw error for invalid password', async () => {
      mockUser.verifyPassword.mockResolvedValue(false);

      await expect(AuthService.login(loginData))
        .rejects.toThrow('Invalid email or password');
      
      expect(mockUser.handleFailedLogin).toHaveBeenCalled();
    });

    it('should throw error if email is not verified when verification is enabled', async () => {
      process.env.ENABLE_EMAIL_VERIFICATION = 'true';
      mockUser.emailVerified = false;

      await expect(AuthService.login(loginData))
        .rejects.toThrow('Please verify your email address before logging in');
    });
  });

  describe('logout', () => {
    it('should logout user successfully', async () => {
      jwt.verify.mockReturnValue({ id: 'user-123' });
      
      const result = await AuthService.logout('refresh-token');

      expect(jwt.verify).toHaveBeenCalledWith('refresh-token', 'test-refresh-secret');
      expect(deleteCache).toHaveBeenCalledWith('refresh_token:user-123');
      expect(deleteCache).toHaveBeenCalledWith('user:user-123');
      expect(result).toBe(true);
    });

    it('should return false for invalid token without throwing error', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      const result = await AuthService.logout('invalid-token');

      expect(result).toBe(false);
    });
  });

  describe('refreshToken', () => {
    beforeEach(() => {
      jwt.verify.mockReturnValue({ id: 'user-123', type: 'refresh' });
      getCache.mockResolvedValue('refresh-token');
    });

    it('should refresh token successfully', async () => {
      const result = await AuthService.refreshToken('refresh-token');

      expect(jwt.verify).toHaveBeenCalledWith('refresh-token', 'test-refresh-secret');
      expect(getCache).toHaveBeenCalledWith('refresh_token:user-123');
      expect(User.findById).toHaveBeenCalledWith('user-123');
      expect(mockUser.generateToken).toHaveBeenCalled();
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('expiresAt');
    });

    it('should throw error for invalid token type', async () => {
      jwt.verify.mockReturnValue({ id: 'user-123', type: 'access' });

      await expect(AuthService.refreshToken('refresh-token'))
        .rejects.toThrow('Invalid token type');
    });

    it('should throw error if token not found in cache', async () => {
      getCache.mockResolvedValue(null);

      await expect(AuthService.refreshToken('refresh-token'))
        .rejects.toThrow('Invalid or expired refresh token');
    });

    it('should throw error if cached token does not match', async () => {
      getCache.mockResolvedValue('different-token');

      await expect(AuthService.refreshToken('refresh-token'))
        .rejects.toThrow('Invalid or expired refresh token');
    });

    it('should throw error if user not found or inactive', async () => {
      User.findById.mockResolvedValue(null);

      await expect(AuthService.refreshToken('refresh-token'))
        .rejects.toThrow('User not found or inactive');
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const result = await AuthService.verifyEmail('verification-token');

      expect(User.findByEmailVerificationToken).toHaveBeenCalledWith('verification-token');
      expect(mockUser.verifyEmail).toHaveBeenCalled();
      expect(mockUser.generateToken).toHaveBeenCalled();
      expect(mockUser.generateRefreshToken).toHaveBeenCalled();
      expect(setCache).toHaveBeenCalledWith('refresh_token:user-123', 'refresh-token', 2592000);
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw error for invalid verification token', async () => {
      User.findByEmailVerificationToken.mockResolvedValue(null);

      await expect(AuthService.verifyEmail('invalid-token'))
        .rejects.toThrow('Invalid or expired verification token');
    });
  });

  describe('resendEmailVerification', () => {
    beforeEach(() => {
      User.findByEmail.mockResolvedValue(mockUser);
      mockUser.emailVerified = false;
    });

    it('should resend email verification successfully', async () => {
      const result = await AuthService.resendEmailVerification('test@example.com');

      expect(User.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(crypto.randomBytes).toHaveBeenCalledWith(32);
      expect(result).toBe(true);
    });

    it('should return true even if user not found (security)', async () => {
      User.findByEmail.mockResolvedValue(null);
      
      const result = await AuthService.resendEmailVerification('nonexistent@example.com');

      expect(result).toBe(true);
    });

    it('should throw error if email is already verified', async () => {
      mockUser.emailVerified = true;

      await expect(AuthService.resendEmailVerification('test@example.com'))
        .rejects.toThrow('Email is already verified');
    });
  });

  describe('requestPasswordReset', () => {
    it('should request password reset successfully', async () => {
      User.findByEmail.mockResolvedValue(mockUser);
      
      const result = await AuthService.requestPasswordReset('test@example.com');

      expect(User.findByEmail).toHaveBeenCalledWith('test@example.com');
      expect(mockUser.generatePasswordResetToken).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should return true even if user not found (security)', async () => {
      User.findByEmail.mockResolvedValue(null);
      
      const result = await AuthService.requestPasswordReset('nonexistent@example.com');

      expect(result).toBe(true);
    });

    it('should return true for inactive account (security)', async () => {
      mockUser.isActive = false;
      User.findByEmail.mockResolvedValue(mockUser);
      
      const result = await AuthService.requestPasswordReset('test@example.com');

      expect(result).toBe(true);
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const result = await AuthService.resetPassword('reset-token', 'newpassword123');

      expect(User.findByPasswordResetToken).toHaveBeenCalledWith('reset-token');
      expect(mockUser.updatePassword).toHaveBeenCalledWith('newpassword123');
      expect(mockUser.generateToken).toHaveBeenCalled();
      expect(mockUser.generateRefreshToken).toHaveBeenCalled();
      expect(setCache).toHaveBeenCalledWith('refresh_token:user-123', 'refresh-token', 2592000);
      expect(deleteCache).toHaveBeenCalledWith('user:user-123');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw error for invalid reset token', async () => {
      User.findByPasswordResetToken.mockResolvedValue(null);

      await expect(AuthService.resetPassword('invalid-token', 'newpassword123'))
        .rejects.toThrow('Invalid or expired reset token');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      mockUser.verifyPassword.mockResolvedValue(true);
      
      const result = await AuthService.changePassword('user-123', 'oldpassword', 'newpassword123');

      expect(User.findById).toHaveBeenCalledWith('user-123');
      expect(mockUser.verifyPassword).toHaveBeenCalledWith('oldpassword');
      expect(mockUser.updatePassword).toHaveBeenCalledWith('newpassword123');
      expect(deleteCache).toHaveBeenCalledWith('user:user-123');
      expect(result).toBe(true);
    });

    it('should throw error if user not found', async () => {
      User.findById.mockResolvedValue(null);

      await expect(AuthService.changePassword('user-123', 'oldpassword', 'newpassword123'))
        .rejects.toThrow('User not found');
    });

    it('should throw error if current password is incorrect', async () => {
      mockUser.verifyPassword.mockResolvedValue(false);

      await expect(AuthService.changePassword('user-123', 'wrongpassword', 'newpassword123'))
        .rejects.toThrow('Current password is incorrect');
    });
  });

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const updates = { firstName: 'Jane', lastName: 'Smith' };
      
      const result = await AuthService.updateProfile('user-123', updates);

      expect(User.findById).toHaveBeenCalledWith('user-123');
      expect(mockUser.updateProfile).toHaveBeenCalledWith(updates);
      expect(setCache).toHaveBeenCalledWith('user:user-123', mockUser.toJSON(), 900);
      expect(result).toEqual(mockUser.toJSON());
    });

    it('should throw error if user not found', async () => {
      User.findById.mockResolvedValue(null);

      await expect(AuthService.updateProfile('user-123', { firstName: 'Jane' }))
        .rejects.toThrow('User not found');
    });
  });

  describe('deactivateAccount', () => {
    it('should deactivate account successfully', async () => {
      mockUser.verifyPassword.mockResolvedValue(true);
      
      const result = await AuthService.deactivateAccount('user-123', 'password123');

      expect(User.findById).toHaveBeenCalledWith('user-123');
      expect(mockUser.verifyPassword).toHaveBeenCalledWith('password123');
      expect(mockUser.deactivate).toHaveBeenCalled();
      expect(deleteCache).toHaveBeenCalledWith('user:user-123');
      expect(deleteCache).toHaveBeenCalledWith('refresh_token:user-123');
      expect(result).toBe(true);
    });

    it('should throw error if user not found', async () => {
      User.findById.mockResolvedValue(null);

      await expect(AuthService.deactivateAccount('user-123', 'password123'))
        .rejects.toThrow('User not found');
    });

    it('should throw error if password is incorrect', async () => {
      mockUser.verifyPassword.mockResolvedValue(false);

      await expect(AuthService.deactivateAccount('user-123', 'wrongpassword'))
        .rejects.toThrow('Password is incorrect');
    });
  });

  describe('verifyToken', () => {
    beforeEach(() => {
      jwt.verify.mockReturnValue({ id: 'user-123', email: 'test@example.com' });
    });

    it('should verify token and return cached user', async () => {
      const cachedUser = { id: 'user-123', email: 'test@example.com' };
      getCache.mockResolvedValue(cachedUser);
      
      const result = await AuthService.verifyToken('valid-token');

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
      expect(getCache).toHaveBeenCalledWith('user:user-123');
      expect(User.findById).not.toHaveBeenCalled();
      expect(result).toEqual({ user: cachedUser });
    });

    it('should verify token and fetch user from database if not cached', async () => {
      getCache.mockResolvedValue(null);
      
      const result = await AuthService.verifyToken('valid-token');

      expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
      expect(getCache).toHaveBeenCalledWith('user:user-123');
      expect(User.findById).toHaveBeenCalledWith('user-123');
      expect(setCache).toHaveBeenCalledWith('user:user-123', mockUser.toJSON(), 900);
      expect(result).toEqual({ user: mockUser.toJSON() });
    });

    it('should throw error for invalid token', async () => {
      jwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(AuthService.verifyToken('invalid-token'))
        .rejects.toThrow('Invalid token');
    });

    it('should throw error if user not found or inactive', async () => {
      getCache.mockResolvedValue(null);
      User.findById.mockResolvedValue(null);

      await expect(AuthService.verifyToken('valid-token'))
        .rejects.toThrow('User not found or inactive');
    });
  });
});