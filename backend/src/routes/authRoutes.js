const express = require('express');
const { asyncHandler } = require('../middleware/errorMiddleware');
const {
  validateUserRegistration,
  validateUserLogin,
  validatePasswordReset,
  validatePasswordUpdate,
  validateEmail
} = require('../middleware/validationMiddleware');
const { protect, requireFeature } = require('../middleware/authMiddleware');
const AuthService = require('../services/auth/authService');

const router = express.Router();

// @desc    Register new user
// @route   POST /api/v1/auth/register
// @access  Public
router.post('/register', 
  requireFeature('registration'),
  validateUserRegistration,
  asyncHandler(async (req, res) => {
    const { email, password, firstName, lastName, acceptTerms } = req.body;
    
    const result = await AuthService.register({
      email,
      password,
      firstName,
      lastName,
      acceptTerms
    });
    
    res.status(201).json({
      success: true,
      message: process.env.ENABLE_EMAIL_VERIFICATION === 'true' 
        ? 'Registration successful. Please check your email to verify your account.'
        : 'Registration successful. You can now log in.',
      data: {
        user: result.user,
        ...(process.env.ENABLE_EMAIL_VERIFICATION !== 'true' && {
          token: result.token,
          refreshToken: result.refreshToken
        })
      }
    });
  })
);

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
router.post('/login',
  validateUserLogin,
  asyncHandler(async (req, res) => {
    const { email, password, rememberMe } = req.body;
    
    const result = await AuthService.login({ email, password, rememberMe });
    
    // Set HTTP-only cookie for refresh token
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        tokens: {
          accessToken: result.token,
          refreshToken: result.refreshToken
        }
      }
    });
  })
);

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
router.post('/logout',
  protect,
  asyncHandler(async (req, res) => {
    console.log('🔓 Logout route called for user:', req.user?.id);
    
    const refreshToken = req.cookies.refreshToken;
    console.log('🍪 Refresh token from cookies:', refreshToken ? 'present' : 'not present');
    
    if (refreshToken) {
      try {
        console.log('🔄 Calling AuthService.logout...');
        await AuthService.logout(refreshToken);
        console.log('✅ AuthService.logout completed successfully');
      } catch (error) {
        console.error('❌ Logout service error:', error.message);
        console.error('❌ Logout service stack:', error.stack);
        // Continue with logout even if service fails
      }
    }
    
    // Clear refresh token cookie
    res.clearCookie('refreshToken');
    
    console.log('✅ Logout successful, sending response');
    res.json({
      success: true,
      message: 'Logout successful'
    });
  })
);

// @desc    Refresh access token
// @route   POST /api/v1/auth/refresh
// @access  Public
router.post('/refresh',
  asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not provided'
      });
    }
    
    const result = await AuthService.refreshToken(refreshToken);
    
    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: result.token,
        refreshToken: result.refreshToken
      }
    });
  })
);

// @desc    Verify email
// @route   GET /api/v1/auth/verify-email/:token
// @access  Public
router.get('/verify-email/:token',
  requireFeature('email_verification'),
  asyncHandler(async (req, res) => {
    const { token } = req.params;
    
    const result = await AuthService.verifyEmail(token);
    
    res.json({
      success: true,
      message: 'Email verified successfully',
      data: {
        user: result.user,
        tokens: {
          accessToken: result.token,
          refreshToken: result.refreshToken
        }
      }
    });
  })
);

// @desc    Resend email verification
// @route   POST /api/v1/auth/resend-verification
// @access  Public
router.post('/resend-verification',
  requireFeature('email_verification'),
  validateEmail,
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    
    await AuthService.resendEmailVerification(email);
    
    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });
  })
);

// @desc    Request password reset
// @route   POST /api/v1/auth/forgot-password
// @access  Public
router.post('/forgot-password',
  requireFeature('password_reset'),
  validatePasswordReset,
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    
    await AuthService.requestPasswordReset(email);
    
    res.json({
      success: true,
      message: 'Password reset email sent successfully'
    });
  })
);

// @desc    Reset password
// @route   POST /api/v1/auth/reset-password/:token
// @access  Public
router.post('/reset-password/:token',
  requireFeature('password_reset'),
  asyncHandler(async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;
    
    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }
    
    const result = await AuthService.resetPassword(token, password);
    
    res.json({
      success: true,
      message: 'Password reset successful',
      data: {
        user: result.user,
        tokens: {
          accessToken: result.token,
          refreshToken: result.refreshToken
        }
      }
    });
  })
);

// @desc    Change password
// @route   PUT /api/v1/auth/change-password
// @access  Private
router.put('/change-password',
  protect,
  validatePasswordUpdate,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    await AuthService.changePassword(req.user.id, currentPassword, newPassword);
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  })
);

// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
router.get('/me',
  protect,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  })
);

// @desc    Update user profile
// @route   PUT /api/v1/auth/profile
// @access  Private
router.put('/profile',
  protect,
  asyncHandler(async (req, res) => {
    const { firstName, lastName } = req.body;
    
    const updatedUser = await AuthService.updateProfile(req.user.id, {
      firstName,
      lastName
    });
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: updatedUser
      }
    });
  })
);

// @desc    Deactivate account
// @route   DELETE /api/v1/auth/account
// @access  Private
router.delete('/account',
  protect,
  asyncHandler(async (req, res) => {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to deactivate account'
      });
    }
    
    await AuthService.deactivateAccount(req.user.id, password);
    
    // Clear refresh token cookie
    res.clearCookie('refreshToken');
    
    res.json({
      success: true,
      message: 'Account deactivated successfully'
    });
  })
);

// @desc    Verify token and get user
// @route   GET /api/v1/auth/verify
// @access  Private
router.get('/verify',
  protect,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      message: 'Token verified successfully',
      data: {
        user: req.user
      }
    });
  })
);

// @desc    Check authentication status
// @route   GET /api/v1/auth/status
// @access  Public
router.get('/status',
  asyncHandler(async (req, res) => {
    let isAuthenticated = false;
    let user = null;
    
    // Check if user is authenticated
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const result = await AuthService.verifyToken(token);
        isAuthenticated = true;
        user = result.user;
      } catch (error) {
        // Token is invalid or expired
      }
    }
    
    res.json({
      success: true,
      data: {
        isAuthenticated,
        user
      }
    });
  })
);

module.exports = router;