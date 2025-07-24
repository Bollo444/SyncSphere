const AuthService = require('../../../src/services/auth/authService');
const UserFactory = require('../../factories/userFactory');
const TestHelpers = require('../../utils/testHelpers');

// Mock dependencies
jest.mock('../../../src/models/User');
jest.mock('../../../src/services/email/emailService');

const User = require('../../../src/models/User');
const emailService = require('../../../src/services/email/emailService');

describe('AuthService', () => {
  let authService;
  let mockUser;

  beforeEach(() => {
    authService = new AuthService();
    mockUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
      isActive: true,
      emailVerified: true,
      generateToken: jest.fn().mockReturnValue('mock-jwt-token'),
      generateRefreshToken: jest.fn().mockReturnValue('mock-refresh-token'),
      generatePasswordResetToken: jest.fn().mockReturnValue('mock-reset-token'),
      comparePassword: jest.fn().mockResolvedValue(true),
      save: jest.fn().mockResolvedValue(true)
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const userData = await UserFactory.create();
      userData.acceptTerms = true; // Add required field

      User.findByEmail = jest.fn().mockResolvedValue(null);
      User.create = jest.fn().mockResolvedValue(mockUser);
      emailService.sendVerificationEmail = jest.fn().mockResolvedValue(true);

      const result = await authService.register(userData);

      expect(User.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName
        })
      );
      expect(result).toEqual({
        success: true,
        user: mockUser,
        tokens: {
          accessToken: 'mock-jwt-token',
          refreshToken: 'mock-refresh-token'
        }
      });
    });

    it('should throw error if user already exists', async () => {
      const userData = await UserFactory.create();
      userData.acceptTerms = true; // Add required field

      User.findByEmail = jest.fn().mockResolvedValue(mockUser);

      await expect(authService.register(userData)).rejects.toThrow(
        'User already exists with this email'
      );

      expect(User.findByEmail).toHaveBeenCalledWith(userData.email);
      expect(User.create).not.toHaveBeenCalled();
    });

    it('should handle email service failure gracefully', async () => {
      const userData = await UserFactory.create();
      userData.acceptTerms = true; // Add required field

      User.findByEmail = jest.fn().mockResolvedValue(null);
      User.create = jest.fn().mockResolvedValue(mockUser);
      emailService.sendVerificationEmail = jest
        .fn()
        .mockRejectedValue(new Error('Email service error'));

      const result = await authService.register(userData);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      // Should still return tokens even if email fails
      expect(result.tokens).toBeDefined();
    });

    it('should validate required fields', async () => {
      const incompleteData = { email: 'test@example.com' };

      await expect(authService.register(incompleteData)).rejects.toThrow('Missing required fields');
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      User.findByEmail = jest.fn().mockResolvedValue(mockUser);

      const result = await authService.login(credentials);

      expect(User.findByEmail).toHaveBeenCalledWith(credentials.email);
      expect(mockUser.comparePassword).toHaveBeenCalledWith(credentials.password);
      expect(result).toEqual({
        success: true,
        user: mockUser,
        tokens: {
          accessToken: 'mock-jwt-token',
          refreshToken: 'mock-refresh-token'
        }
      });
    });

    it('should throw error for non-existent user', async () => {
      const credentials = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      User.findByEmail = jest.fn().mockResolvedValue(null);

      await expect(authService.login(credentials)).rejects.toThrow('Invalid credentials');

      expect(User.findByEmail).toHaveBeenCalledWith(credentials.email);
    });

    it('should throw error for invalid password', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      mockUser.comparePassword = jest.fn().mockResolvedValue(false);
      User.findByEmail = jest.fn().mockResolvedValue(mockUser);

      await expect(authService.login(credentials)).rejects.toThrow('Invalid credentials');

      expect(mockUser.comparePassword).toHaveBeenCalledWith(credentials.password);
    });

    it('should throw error for inactive user', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      const inactiveUser = { ...mockUser, isActive: false };
      User.findByEmail = jest.fn().mockResolvedValue(inactiveUser);

      await expect(authService.login(credentials)).rejects.toThrow('Account is deactivated');
    });

    it('should allow login for unverified email if verification is disabled', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'password123'
      };

      const unverifiedUser = { ...mockUser, emailVerified: false };
      User.findByEmail = jest.fn().mockResolvedValue(unverifiedUser);

      // Mock environment variable
      process.env.ENABLE_EMAIL_VERIFICATION = 'false';

      const result = await authService.login(credentials);

      expect(result.success).toBe(true);
      expect(result.user).toEqual(unverifiedUser);
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh valid token', async () => {
      const refreshToken = 'valid-refresh-token';

      User.findByRefreshToken = jest.fn().mockResolvedValue(mockUser);

      const result = await authService.refreshToken(refreshToken);

      expect(User.findByRefreshToken).toHaveBeenCalledWith(refreshToken);
      expect(result).toEqual({
        success: true,
        tokens: {
          accessToken: 'mock-jwt-token',
          refreshToken: 'mock-refresh-token'
        }
      });
    });

    it('should throw error for invalid refresh token', async () => {
      const refreshToken = 'invalid-refresh-token';

      User.findByRefreshToken = jest.fn().mockResolvedValue(null);

      await expect(authService.refreshToken(refreshToken)).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email for existing user', async () => {
      const email = 'test@example.com';

      User.findByEmail = jest.fn().mockResolvedValue(mockUser);
      emailService.sendPasswordResetEmail = jest.fn().mockResolvedValue(true);

      const result = await authService.forgotPassword(email);

      expect(User.findByEmail).toHaveBeenCalledWith(email);
      expect(mockUser.save).toHaveBeenCalled();
      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        mockUser,
        expect.any(String)
      );
      expect(result).toEqual({
        success: true,
        message: 'Password reset email sent'
      });
    });

    it('should not reveal if user does not exist', async () => {
      const email = 'nonexistent@example.com';

      User.findByEmail = jest.fn().mockResolvedValue(null);

      const result = await authService.forgotPassword(email);

      expect(result).toEqual({
        success: true,
        message: 'Password reset email sent'
      });
      expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should successfully reset password with valid token', async () => {
      const resetData = {
        token: 'valid-reset-token',
        password: 'newpassword123'
      };

      mockUser.passwordResetToken = 'valid-reset-token';
      mockUser.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour from now

      User.findByPasswordResetToken = jest.fn().mockResolvedValue(mockUser);

      const result = await authService.resetPassword(resetData);

      expect(User.findByPasswordResetToken).toHaveBeenCalledWith(resetData.token);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'Password reset successful'
      });
    });

    it('should throw error for invalid reset token', async () => {
      const resetData = {
        token: 'invalid-reset-token',
        password: 'newpassword123'
      };

      User.findByPasswordResetToken = jest.fn().mockResolvedValue(null);

      await expect(authService.resetPassword(resetData)).rejects.toThrow(
        'Invalid or expired reset token'
      );
    });

    it('should throw error for expired reset token', async () => {
      const resetData = {
        token: 'expired-reset-token',
        password: 'newpassword123'
      };

      mockUser.passwordResetToken = 'expired-reset-token';
      mockUser.passwordResetExpires = new Date(Date.now() - 3600000); // 1 hour ago

      User.findByPasswordResetToken = jest.fn().mockResolvedValue(mockUser);

      await expect(authService.resetPassword(resetData)).rejects.toThrow(
        'Invalid or expired reset token'
      );
    });
  });

  describe('verifyEmail', () => {
    it('should successfully verify email with valid token', async () => {
      const token = 'valid-verification-token';

      mockUser.emailVerificationToken = token;
      mockUser.emailVerified = false;

      User.findByEmailVerificationToken = jest.fn().mockResolvedValue(mockUser);

      const result = await authService.verifyEmail(token);

      expect(User.findByEmailVerificationToken).toHaveBeenCalledWith(token);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'Email verified successfully'
      });
    });

    it('should throw error for invalid verification token', async () => {
      const token = 'invalid-verification-token';

      User.findByEmailVerificationToken = jest.fn().mockResolvedValue(null);

      await expect(authService.verifyEmail(token)).rejects.toThrow('Invalid verification token');
    });

    it('should handle already verified email', async () => {
      const token = 'valid-verification-token';

      mockUser.emailVerificationToken = token;
      mockUser.emailVerified = true;

      User.findByEmailVerificationToken = jest.fn().mockResolvedValue(mockUser);

      const result = await authService.verifyEmail(token);

      expect(result).toEqual({
        success: true,
        message: 'Email already verified'
      });
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      const userId = mockUser.id;

      User.findById = jest.fn().mockResolvedValue(mockUser);

      const result = await authService.logout(userId);

      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'Logged out successfully'
      });
    });

    it('should handle logout for non-existent user', async () => {
      const userId = 'non-existent-id';

      User.findById = jest.fn().mockResolvedValue(null);

      await expect(authService.logout(userId)).rejects.toThrow('User not found');
    });
  });

  describe('validateToken', () => {
    it('should validate and return user for valid token', async () => {
      const token = TestHelpers.generateToken({ id: mockUser.id });

      User.findById = jest.fn().mockResolvedValue(mockUser);

      const result = await authService.validateToken(token);

      expect(User.findById).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({
        success: true,
        user: mockUser
      });
    });

    it('should throw error for invalid token', async () => {
      const token = 'invalid-token';

      // Don't mock User.findById since jwt.verify will throw first
      await expect(authService.validateToken(token)).rejects.toThrow('Invalid token');
    });

    it('should throw error for expired token', async () => {
      const token = TestHelpers.generateExpiredToken({ id: mockUser.id });

      // Don't mock User.findById since jwt.verify will throw TokenExpiredError first
      await expect(authService.validateToken(token)).rejects.toThrow('Token expired');
    });
  });
});
