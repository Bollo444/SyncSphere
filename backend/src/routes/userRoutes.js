const express = require('express');
const UserService = require('../services/users/userService');
const { protect, authorize } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorMiddleware');
const { 
  validateUpdateProfile,
  validatePagination,
  validateUUID,
  handleValidationErrors 
} = require('../middleware/validationMiddleware');

const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
router.get('/profile', asyncHandler(async (req, res) => {
  const user = await UserService.getProfile(req.user.id);
  
  res.json({
    success: true,
    data: user
  });
}));

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', 
  validateUpdateProfile,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const user = await UserService.updateProfile(req.user.id, req.body);
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  })
);

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private
router.get('/stats', asyncHandler(async (req, res) => {
  const stats = await UserService.getUserStats(req.user.id);
  
  res.json({
    success: true,
    data: stats
  });
}));

// @desc    Get user devices
// @route   GET /api/users/devices
// @access  Private
router.get('/devices',
  validatePagination,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { page, limit, status, deviceType, sortBy, sortOrder } = req.query;
    
    const result = await UserService.getUserDevices(req.user.id, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      status,
      deviceType,
      sortBy,
      sortOrder
    });
    
    res.json({
      success: true,
      data: result.devices,
      pagination: result.pagination
    });
  })
);

// @desc    Update user preferences
// @route   PUT /api/users/preferences
// @access  Private
router.put('/preferences', asyncHandler(async (req, res) => {
  const preferences = await UserService.updatePreferences(req.user.id, req.body);
  
  res.json({
    success: true,
    message: 'Preferences updated successfully',
    data: preferences
  });
}));

// @desc    Get user activity log
// @route   GET /api/users/activity
// @access  Private
router.get('/activity',
  validatePagination,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { page, limit, startDate, endDate, action } = req.query;
    
    const result = await UserService.getActivityLog(req.user.id, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      startDate,
      endDate,
      action
    });
    
    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination
    });
  })
);

// @desc    Delete user account
// @route   DELETE /api/users/account
// @access  Private
router.delete('/account', asyncHandler(async (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({
      success: false,
      message: 'Password is required to delete account'
    });
  }
  
  await UserService.deleteAccount(req.user.id, password);
  
  res.json({
    success: true,
    message: 'Account deleted successfully'
  });
}));

// Admin routes
// @desc    Get all users (Admin only)
// @route   GET /api/users/admin/users
// @access  Private/Admin
router.get('/admin/users',
  authorize('admin'),
  validatePagination,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { page, limit, search, status, role } = req.query;
    
    // Build query conditions
    let whereConditions = ['deleted_at IS NULL'];
    let queryParams = [];
    let paramIndex = 1;
    
    if (search) {
      whereConditions.push(`(email ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }
    
    if (status) {
      whereConditions.push(`is_active = $${paramIndex}`);
      queryParams.push(status === 'active');
      paramIndex++;
    }
    
    if (role) {
      whereConditions.push(`role = $${paramIndex}`);
      queryParams.push(role);
      paramIndex++;
    }
    
    // Calculate offset
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const offset = (pageNum - 1) * limitNum;
    
    // Get total count
    const { query } = require('../config/database');
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users
      WHERE ${whereConditions.join(' AND ')}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);
    
    // Get users
    const usersQuery = `
      SELECT 
        id, email, first_name, last_name, role, subscription_tier,
        is_active, email_verified, created_at, last_login,
        (SELECT COUNT(*) FROM devices WHERE user_id = users.id AND deleted_at IS NULL) as device_count
      FROM users
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limitNum, offset);
    
    const usersResult = await query(usersQuery, queryParams);
    
    res.json({
      success: true,
      data: usersResult.rows,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  })
);

// @desc    Get user by ID (Admin only)
// @route   GET /api/users/admin/users/:id
// @access  Private/Admin
router.get('/admin/users/:id',
  authorize('admin'),
  validateUUID('id'),
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const user = await UserService.getProfile(req.params.id);
    const stats = await UserService.getUserStats(req.params.id);
    
    res.json({
      success: true,
      data: {
        user,
        stats
      }
    });
  })
);

// @desc    Update user role (Admin only)
// @route   PUT /api/users/admin/users/:id/role
// @access  Private/Admin
router.put('/admin/users/:id/role',
  authorize('admin'),
  validateUUID('id'),
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { role } = req.body;
    
    if (!['user', 'admin', 'moderator'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role. Must be user, admin, or moderator'
      });
    }
    
    const { query } = require('../config/database');
    await query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2',
      [role, req.params.id]
    );
    
    res.json({
      success: true,
      message: 'User role updated successfully'
    });
  })
);

// @desc    Deactivate/Activate user (Admin only)
// @route   PUT /api/users/admin/users/:id/status
// @access  Private/Admin
router.put('/admin/users/:id/status',
  authorize('admin'),
  validateUUID('id'),
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value'
      });
    }
    
    const { query } = require('../config/database');
    await query(
      'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2',
      [isActive, req.params.id]
    );
    
    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  })
);

// @desc    Get platform statistics (Admin only)
// @route   GET /api/users/admin/stats
// @access  Private/Admin
router.get('/admin/stats',
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const { query } = require('../config/database');
    
    // Get user statistics
    const userStats = await query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
        COUNT(CASE WHEN email_verified = true THEN 1 END) as verified_users,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users_30d,
        COUNT(CASE WHEN last_login >= NOW() - INTERVAL '7 days' THEN 1 END) as active_users_7d
      FROM users 
      WHERE deleted_at IS NULL
    `);
    
    // Get device statistics
    const deviceStats = await query(`
      SELECT 
        COUNT(*) as total_devices,
        COUNT(CASE WHEN status = 'connected' THEN 1 END) as connected_devices,
        COUNT(DISTINCT user_id) as users_with_devices,
        AVG(CASE WHEN user_id IS NOT NULL THEN 
          (SELECT COUNT(*) FROM devices d2 WHERE d2.user_id = devices.user_id AND d2.deleted_at IS NULL)
        END) as avg_devices_per_user
      FROM devices 
      WHERE deleted_at IS NULL
    `);
    
    // Get subscription statistics
    const subscriptionStats = await query(`
      SELECT 
        subscription_tier,
        COUNT(*) as count
      FROM users 
      WHERE deleted_at IS NULL
      GROUP BY subscription_tier
    `);
    
    res.json({
      success: true,
      data: {
        users: userStats.rows[0],
        devices: deviceStats.rows[0],
        subscriptions: subscriptionStats.rows
      }
    });
  })
);

module.exports = router;