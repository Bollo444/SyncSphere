const User = require('../../models/User');
const { AppError } = require('../../middleware/errorMiddleware');
const { setCache, deleteCache, getCache } = require('../../config/redis');
const { query } = require('../../config/database');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

class AuthService {
  // Register a new user
  static async register(userData) {
    const { email, password, firstName, lastName, acceptTerms } = userData;
    
    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      throw new AppError('Missing required fields', 400);
    }
    
    // Check if terms are accepted
    if (!acceptTerms) {
      throw new AppError('You must accept the terms and conditions', 400);
    }
    
    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      throw new AppError('User already exists with this email', 400);
    }
    
    // Create user
    const user = await User.create({
      email,
      password,
      firstName,
      lastName
    });
    
    // Generate tokens
    const accessToken = user.generateToken();
    const refreshToken = user.generateRefreshToken();
    
    // Store refresh token in cache
    await setCache(`refresh_token:${user.id}`, refreshToken, 30 * 24 * 60 * 60); // 30 days
    
    return {
      success: true,
      user,
      token: accessToken,
      refreshToken
    };
  }
  
  // Login user
  static async login({ email, password, rememberMe = false }) {
    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }
    
    // Check if account is active
    if (!user.isActive) {
      throw new AppError('Account is deactivated', 401);
    }
    
    // Verify password
    const isPasswordValid = await user.verifyPassword(password);
    if (!isPasswordValid) {
      throw new AppError('Invalid credentials', 401);
    }
    
    // Generate tokens
    const accessToken = user.generateToken();
    const refreshToken = user.generateRefreshToken();
    
    // Store refresh token in cache
    const refreshExpiry = rememberMe ? 90 * 24 * 60 * 60 : 30 * 24 * 60 * 60;
    await setCache(`refresh_token:${user.id}`, refreshToken, refreshExpiry);
    
    return {
      success: true,
      user,
      token: accessToken,
      refreshToken
    };
  }
  
  // Logout user
  static async logout(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Clear refresh token from cache
    await deleteCache(`refresh_token:${userId}`);
    
    // Clear user from cache
    await deleteCache(`user:${userId}`);
    
    // Update user logout timestamp
    await user.save();
    
    return {
      success: true,
      message: 'Logged out successfully'
    };
  }
  
  // Refresh access token
  static async refreshToken(refreshToken) {
    const user = await User.findByRefreshToken(refreshToken);
    if (!user) {
      throw new AppError('Invalid refresh token', 401);
    }
    
    if (!user.isActive) {
      throw new AppError('User not found or inactive', 401);
    }
    
    // Generate new tokens
    const accessToken = user.generateToken();
    const newRefreshToken = user.generateRefreshToken();
    
    return {
      success: true,
      token: accessToken,
      refreshToken: newRefreshToken
    };
  }
  
  // Verify email
  static async verifyEmail(token) {
    const user = await User.findByEmailVerificationToken(token);
    if (!user) {
      throw new AppError('Invalid verification token', 400);
    }
    
    // Check if already verified
    if (user.emailVerified) {
      return {
        success: true,
        message: 'Email already verified'
      };
    }
    
    // Verify email
    user.emailVerified = true;
    user.emailVerificationToken = null;
    await user.save();
    
    // Generate tokens for verified user
    const accessToken = user.generateToken();
    const refreshToken = user.generateRefreshToken();
    
    // Store refresh token in cache
    await setCache(`refresh_token:${user.id}`, refreshToken, 30 * 24 * 60 * 60); // 30 days
    
    return {
      success: true,
      message: 'Email verified successfully',
      user,
      token: accessToken,
      refreshToken
    };
  }
  
  // Resend email verification
  static async resendEmailVerification(email) {
    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not
      return true;
    }
    
    if (user.emailVerified) {
      throw new AppError('Email is already verified', 400);
    }
    
    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    // Update user with new token
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = verificationExpires;
    await user.save();
    
    // Send verification email (TODO: implement email service)
    console.log(`📧 New email verification token for ${email}: ${verificationToken}`);
    
    return true;
  }
  
  // Forgot password
  static async forgotPassword(email) {
    const user = await User.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not
      return {
        success: true,
        message: 'Password reset email sent'
      };
    }
    
    if (!user.isActive) {
      return {
        success: true,
        message: 'Password reset email sent'
      };
    }
    
    // Generate password reset token
    const resetToken = await user.generatePasswordResetToken();
    await user.save();
    
    // Send password reset email
    const emailService = require('../email/emailService');
    await emailService.sendPasswordResetEmail(user, resetToken);
    
    return {
      success: true,
      message: 'Password reset email sent'
    };
  }
  
  // Reset password
  static async resetPassword({ token, password }) {
    const user = await User.findByPasswordResetToken(token);
    if (!user) {
      throw new AppError('Invalid or expired reset token', 400);
    }
    
    // Check if token is expired
    if (user.passwordResetExpires && user.passwordResetExpires < new Date()) {
      throw new AppError('Invalid or expired reset token', 400);
    }
    
    // Update password
    user.password = password;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();
    
    // Generate tokens for user after password reset
    const accessToken = user.generateToken();
    const refreshToken = user.generateRefreshToken();
    
    // Store refresh token in cache
    await setCache(`refresh_token:${user.id}`, refreshToken, 30 * 24 * 60 * 60); // 30 days
    
    return {
      success: true,
      message: 'Password reset successful',
      user,
      token: accessToken,
      refreshToken
    };
  }
  
  // Change password
  static async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Verify current password
    const isCurrentPasswordValid = await user.verifyPassword(currentPassword);
    if (!isCurrentPasswordValid) {
      throw new AppError('Current password is incorrect', 400);
    }
    
    // Update password
    await user.updatePassword(newPassword);
    
    // Clear user cache to force re-authentication
    await deleteCache(`user:${userId}`);
    
    return true;
  }
  
  // Update user profile
  static async updateProfile(userId, updates) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Update profile
    await user.updateProfile(updates);
    
    // Update cache
    await setCache(`user:${userId}`, user.toJSON(), 15 * 60); // 15 minutes
    
    return user.toJSON();
  }
  
  // Deactivate account
  static async deactivateAccount(userId, password) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Verify password
    const isPasswordValid = await user.verifyPassword(password);
    if (!isPasswordValid) {
      throw new AppError('Password is incorrect', 400);
    }
    
    // Deactivate account
    await user.deactivate();
    
    // Clear all user sessions
    await deleteCache(`user:${userId}`);
    await deleteCache(`refresh_token:${userId}`);
    
    return true;
  }
  
  // Validate token
  static async validateToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from database
      const user = await User.findById(decoded.id);
      if (!user || !user.isActive) {
        throw new AppError('User not found or inactive', 401);
      }
      
      return {
        success: true,
        user
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Token expired', 401);
      }
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Invalid token', 401);
    }
  }
}

module.exports = AuthService;