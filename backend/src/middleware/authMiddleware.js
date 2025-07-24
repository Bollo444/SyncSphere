const jwt = require('jsonwebtoken');
const { asyncHandler, AppError } = require('./errorMiddleware');
const { query } = require('../config/database');
const { getCache, setCache } = require('../config/redis');
const logger = require('../utils/logger');
const User = require('../models/User');

// Protect routes - verify JWT token
const protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    console.log('🔍 Protect middleware: No token provided');
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token'
    });
  }

  try {
    // Get token from header
    console.log('🔍 Protect middleware: Token extracted');

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔍 Protect middleware: Token verified for user:', decoded.id);

    // Check cache first
    let user;
    try {
      user = await getCache(`user:${decoded.id}`);
      console.log('🔍 Protect middleware: Cache check completed');
    } catch (cacheError) {
      console.log('🔍 Protect middleware: Cache error (continuing):', cacheError.message);
      user = null;
    }
    
    if (!user) {
      console.log('🔍 Protect middleware: Querying database for user');
      // Get user from database using User model
      const userModel = await User.findById(decoded.id);
      
      if (!userModel) {
        console.log('🔍 Protect middleware: User not found in database');
        return res.status(401).json({
          success: false,
          message: 'Not authorized, user not found'
        });
      }
      
      user = userModel.toJSON();
      console.log('🔍 Protect middleware: User found in database');
      
      // Cache user data
      try {
        await setCache(`user:${decoded.id}`, user, 300); // 5 minutes
        console.log('🔍 Protect middleware: User cached successfully');
      } catch (cacheError) {
        console.log('🔍 Protect middleware: Cache set error (continuing):', cacheError.message);
      }
    } else {
      console.log('🔍 Protect middleware: User found in cache');
    }

    // Check if user is active
    if (!user.isActive) {
      console.log('🔍 Protect middleware: User is not active');
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Check if email is verified (if email verification is enabled)
    if (process.env.REQUIRE_EMAIL_VERIFICATION === 'true' && !user.emailVerified) {
      console.log('🔍 Protect middleware: Email not verified');
      return res.status(401).json({
        success: false,
        message: 'Email not verified'
      });
    }

    console.log('🔍 Protect middleware: User authorized successfully');
    req.user = user;
    next();
  } catch (error) {
    console.error('❌ Protect middleware error:', error.message);
    console.error('❌ Stack trace:', error.stack);
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token failed'
    });
  }
});

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(`User role ${req.user.role} is not authorized to access this route`, 403)
      );
    }
    next();
  };
};

// Check if user owns the resource or is admin
const checkOwnership = (resourceUserIdField = 'user_id') => {
  return asyncHandler(async (req, res, next) => {
    // Admin can access everything
    if (req.user.role === 'admin') {
      return next();
    }

    // Get resource ID from params
    const resourceId = req.params.id;
    
    if (!resourceId) {
      return next(new AppError('Resource ID is required', 400));
    }

    // This middleware assumes the route handler will check ownership
    // The actual ownership check should be implemented in the specific route handler
    req.checkOwnership = {
      userId: req.user.id,
      resourceId,
      resourceUserIdField
    };
    
    next();
  });
};

// Rate limiting per user
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const key = `rate_limit:${req.user.id}`;
    const current = await getCache(key);
    
    if (current && current >= maxRequests) {
      return next(new AppError('Rate limit exceeded for user', 429));
    }

    const newCount = current ? current + 1 : 1;
    await setCache(key, newCount, Math.floor(windowMs / 1000));
    
    next();
  });
};

// Subscription check middleware
const requireSubscription = (requiredTier = 'basic') => {
  return asyncHandler(async (req, res, next) => {
    // Get user's subscription status
    const result = await query(
      `SELECT s.tier, s.status, s.expires_at 
       FROM subscriptions s 
       WHERE s.user_id = $1 AND s.status = 'active' AND s.expires_at > NOW()`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return next(new AppError('Active subscription required', 402));
    }

    const subscription = result.rows[0];
    
    // Check if subscription tier is sufficient
    const tierHierarchy = { 'basic': 1, 'premium': 2, 'enterprise': 3 };
    const userTierLevel = tierHierarchy[subscription.tier] || 0;
    const requiredTierLevel = tierHierarchy[requiredTier] || 0;
    
    if (userTierLevel < requiredTierLevel) {
      return next(new AppError(`${requiredTier} subscription or higher required`, 402));
    }

    req.subscription = subscription;
    next();
  });
};

// Feature flag middleware
const requireFeature = (featureName) => {
  return (req, res, next) => {
    const featureEnabled = process.env[`ENABLE_${featureName.toUpperCase()}`] === 'true';
    
    if (!featureEnabled) {
      return next(new AppError('Feature not available', 503));
    }
    
    next();
  };
};

module.exports = {
  protect,
  authorize,
  checkOwnership,
  userRateLimit,
  requireSubscription,
  requireFeature
};