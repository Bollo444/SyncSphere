const User = require('../../models/User');
const Device = require('../../models/Device');
const AppError = require('../../utils/AppError');
const { setCache, deleteCache, getCache } = require('../../config/redis');
const { query, pool } = require('../../config/database');

class UserService {
  // Get user profile
  async getUserProfile(userId) {
    const userObj = await User.findById(userId);
    if (!userObj) {
      throw new AppError('User not found', 404);
    }
    
    // Cache for 15 minutes
    await setCache(`user:${userId}`, userObj, 15 * 60);
    
    return {
      success: true,
      user: userObj
    };
  }
  
  // Update user profile
  async updateUserProfile(userId, updates) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Validate email uniqueness if email is being updated
    if (updates.email && updates.email !== user.email) {
      const existingUser = await User.findByEmail(updates.email);
      if (existingUser) {
        throw new AppError('Email already in use', 400);
      }
    }
    
    // Validate updates
    const allowedUpdates = ['firstName', 'lastName', 'email', 'phoneNumber', 'timezone', 'language', 'preferences'];
    const filteredUpdates = {};
    
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });
    
    if (Object.keys(filteredUpdates).length === 0) {
      throw new AppError('No valid fields to update', 400);
    }
    
    // Update profile
    Object.assign(user, filteredUpdates);
    await user.save();
    
    // Update cache
    await setCache(`user:${userId}`, user, 15 * 60);
    
    return {
      success: true,
      user: user,
      message: 'Profile updated successfully'
    };
  }
  
  // Get user statistics
  async getUserStats(userId) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Mock statistics for testing
    const stats = {
      totalRecoveries: 5,
      totalTransfers: 3,
      storageUsed: 1024000000,
      lastActivity: new Date()
    };
    
    return {
      success: true,
      stats
    };
  }
  
  // Get user devices
  async getUserDevices(userId, options = {}) {
    const { page = 1, limit = 10, status, deviceType, sortBy = 'last_connected', sortOrder = 'DESC' } = options;
    
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Build query conditions
    let whereConditions = ['user_id = $1', 'deleted_at IS NULL'];
    let queryParams = [userId];
    let paramIndex = 2;
    
    if (status) {
      whereConditions.push(`status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }
    
    if (deviceType) {
      whereConditions.push(`device_type = $${paramIndex}`);
      queryParams.push(deviceType);
      paramIndex++;
    }
    
    // Calculate offset
    const offset = (page - 1) * limit;
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM devices
      WHERE ${whereConditions.join(' AND ')}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);
    
    // Get devices
    const devicesQuery = `
      SELECT *
      FROM devices
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);
    
    const devicesResult = await query(devicesQuery, queryParams);
    
    return {
      devices: devicesResult.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  // Update user preferences
  async updatePreferences(userId, preferences) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Validate preferences structure
    const allowedPreferences = {
      notifications: {
        email: ['device_connected', 'device_disconnected', 'data_transfer_complete', 'security_alerts'],
        push: ['device_connected', 'device_disconnected', 'data_transfer_complete', 'security_alerts'],
        sms: ['security_alerts']
      },
      privacy: {
        shareUsageData: 'boolean',
        allowAnalytics: 'boolean'
      },
      interface: {
        theme: ['light', 'dark', 'auto'],
        language: 'string',
        timezone: 'string'
      }
    };
    
    // Validate and sanitize preferences
    const validatedPreferences = this.validatePreferences(preferences, allowedPreferences);
    
    // Update preferences
    await query(
      'UPDATE users SET preferences = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(validatedPreferences), userId]
    );
    
    // Update cache
    await deleteCache(`user:${userId}`);
    
    return validatedPreferences;
  }
  
  // Get user activity log
  async getActivityLog(userId, options = {}) {
    const { page = 1, limit = 20, startDate, endDate, action } = options;
    
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Build query conditions
    let whereConditions = ['user_id = $1'];
    let queryParams = [userId];
    let paramIndex = 2;
    
    if (startDate) {
      whereConditions.push(`created_at >= $${paramIndex}`);
      queryParams.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      whereConditions.push(`created_at <= $${paramIndex}`);
      queryParams.push(endDate);
      paramIndex++;
    }
    
    if (action) {
      whereConditions.push(`action = $${paramIndex}`);
      queryParams.push(action);
      paramIndex++;
    }
    
    // Calculate offset
    const offset = (page - 1) * limit;
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM user_activity_logs
      WHERE ${whereConditions.join(' AND ')}
    `;
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);
    
    // Get activity logs
    const logsQuery = `
      SELECT *
      FROM user_activity_logs
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);
    
    const logsResult = await query(logsQuery, queryParams);
    
    return {
      logs: logsResult.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  // Delete user account
  async deleteAccount(userId, password) {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Check if user has active subscription for soft delete
    if (user.subscriptionTier && user.subscriptionTier !== 'free' && user.hasActiveSubscription) {
      // Soft delete for users with active subscriptions
      user.isActive = false;
      await user.save();
      
      await deleteCache(`user:${userId}`);
      
      return {
        success: true,
        message: 'Account has been deactivated due to active subscription'
      };
    }
    
    // Verify password if provided
    if (password) {
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new AppError('Password is incorrect', 400);
      }
    }
    
    // Delete user
    await user.delete();
    
    // Clear all caches
    await deleteCache(`user:${userId}`);
    await deleteCache(`refresh_token:${userId}`);
    
    return {
      success: true,
      message: 'Account deleted successfully'
    };
  }
  
  // Get all users (admin only)
  async getAllUsers(options = {}) {
    const result = await User.findAll(options);
    
    return {
      success: true,
      users: result.users,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit: options.limit || 10
      }
    };
  }
  
  // Update user role (admin only)
  async updateUserRole(userId, newRole) {
    const validRoles = ['user', 'admin', 'moderator'];
    
    if (!validRoles.includes(newRole)) {
      throw new AppError('Invalid role', 400);
    }
    
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Update role
    user.role = newRole;
    await user.save();
    
    // Clear cache
    await deleteCache(`user:${userId}`);
    
    return {
      success: true,
      user,
      message: 'User role updated successfully'
    };
  }
  
  // Change password
  async changePassword(userId, passwordData) {
    const { currentPassword, newPassword } = passwordData;
    
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      throw new AppError('Current password is incorrect', 400);
    }
    
    // Validate new password strength
    if (newPassword.length < 8) {
      throw new AppError('Password does not meet requirements', 400);
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    // Clear cache
    await deleteCache(`user:${userId}`);
    
    return {
      success: true,
      message: 'Password changed successfully'
    };
  }
  
  // Helper methods
  validatePreferences(preferences, schema) {
    const validated = {};
    
    Object.keys(schema).forEach(category => {
      if (preferences[category]) {
        validated[category] = {};
        
        Object.keys(schema[category]).forEach(key => {
          const value = preferences[category][key];
          const expectedType = schema[category][key];
          
          if (Array.isArray(expectedType)) {
            if (Array.isArray(value)) {
              // Array of allowed values - filter valid ones
              validated[category][key] = value.filter(v => expectedType.includes(v));
            } else if (expectedType.includes(value)) {
              // Single value enum validation
              validated[category][key] = value;
            }
          } else if (expectedType === 'boolean') {
            if (typeof value === 'boolean') {
              validated[category][key] = value;
            }
          } else if (expectedType === 'string') {
            if (typeof value === 'string') {
              validated[category][key] = value;
            }
          }
        });
      }
    });
    
    return validated;
  }
  
  getStorageLimit(subscriptionTier) {
    const limits = {
      free: 5 * 1024 * 1024 * 1024, // 5GB
      basic: 50 * 1024 * 1024 * 1024, // 50GB
      premium: 500 * 1024 * 1024 * 1024, // 500GB
      enterprise: -1 // Unlimited
    };
    
    return limits[subscriptionTier] || limits.free;
  }
}

module.exports = UserService;