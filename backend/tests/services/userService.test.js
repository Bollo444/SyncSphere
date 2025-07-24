const UserService = require('../../src/services/users/userService');
const User = require('../../src/models/User');
const Device = require('../../src/models/Device');
const { AppError } = require('../../src/middleware/errorMiddleware');
const { setCache, deleteCache, getCache } = require('../../src/config/redis');
const { query, pool } = require('../../src/config/database');

// Mock dependencies
jest.mock('../../src/models/User');
jest.mock('../../src/models/Device');
jest.mock('../../src/middleware/errorMiddleware', () => ({
  AppError: jest.fn().mockImplementation((message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  })
}));

describe('UserService', () => {
  let mockUser;
  let mockDevice;
  let mockClient;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock user object
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      subscriptionTier: 'basic',
      createdAt: new Date('2024-01-01'),
      lastLogin: new Date('2024-01-15'),
      toJSON: jest.fn().mockReturnValue({
        id: 'user-123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe'
      }),
      updateProfile: jest.fn(),
      verifyPassword: jest.fn()
    };

    // Mock device object
    mockDevice = {
      id: 'device-123',
      user_id: 'user-123',
      device_name: 'iPhone 15',
      device_type: 'mobile',
      status: 'connected'
    };

    // Mock database client
    mockClient = {
      query: jest.fn(),
      release: jest.fn()
    };

    // Setup default mocks
    User.findById.mockResolvedValue(mockUser);
    setCache.mockResolvedValue(true);
    getCache.mockResolvedValue(null);
    deleteCache.mockResolvedValue(true);
    query.mockResolvedValue({ rows: [] });
    pool.connect.mockResolvedValue(mockClient);
  });

  describe('getProfile', () => {
    it('should return cached user profile if available', async () => {
      const cachedUser = { id: 'user-123', email: 'test@example.com' };
      getCache.mockResolvedValue(cachedUser);

      const result = await UserService.getProfile('user-123');

      expect(getCache).toHaveBeenCalledWith('user:user-123');
      expect(User.findById).not.toHaveBeenCalled();
      expect(result).toEqual(cachedUser);
    });

    it('should fetch user from database and cache if not in cache', async () => {
      getCache.mockResolvedValue(null);
      const userJSON = { id: 'user-123', email: 'test@example.com' };
      mockUser.toJSON.mockReturnValue(userJSON);

      const result = await UserService.getProfile('user-123');

      expect(getCache).toHaveBeenCalledWith('user:user-123');
      expect(User.findById).toHaveBeenCalledWith('user-123');
      expect(setCache).toHaveBeenCalledWith('user:user-123', userJSON, 900);
      expect(result).toEqual(userJSON);
    });

    it('should throw error if user not found', async () => {
      getCache.mockResolvedValue(null);
      User.findById.mockResolvedValue(null);

      await expect(UserService.getProfile('user-123'))
        .rejects.toThrow('User not found');
    });
  });

  describe('updateProfile', () => {
    it('should update user profile with valid fields', async () => {
      const updates = {
        firstName: 'Jane',
        lastName: 'Smith',
        phoneNumber: '+1234567890',
        invalidField: 'should be filtered'
      };
      const updatedUserJSON = { ...mockUser.toJSON(), ...updates };
      mockUser.toJSON.mockReturnValue(updatedUserJSON);

      const result = await UserService.updateProfile('user-123', updates);

      expect(User.findById).toHaveBeenCalledWith('user-123');
      expect(mockUser.updateProfile).toHaveBeenCalledWith({
        firstName: 'Jane',
        lastName: 'Smith',
        phoneNumber: '+1234567890'
      });
      expect(setCache).toHaveBeenCalledWith('user:user-123', updatedUserJSON, 900);
      expect(result).toEqual(updatedUserJSON);
    });

    it('should throw error if user not found', async () => {
      User.findById.mockResolvedValue(null);

      await expect(UserService.updateProfile('user-123', { firstName: 'Jane' }))
        .rejects.toThrow('User not found');
    });

    it('should throw error if no valid fields to update', async () => {
      const updates = { invalidField: 'value' };

      await expect(UserService.updateProfile('user-123', updates))
        .rejects.toThrow('No valid fields to update');
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      const deviceStatsResult = {
        rows: [{
          total_devices: 5,
          connected_devices: 3,
          disconnected_devices: 2,
          mobile_devices: 2,
          tablet_devices: 1,
          laptop_devices: 1,
          desktop_devices: 1
        }]
      };
      const activityStatsResult = {
        rows: [
          { date: '2024-01-15', connections: 3 },
          { date: '2024-01-14', connections: 1 }
        ]
      };

      query.mockResolvedValueOnce(deviceStatsResult)
           .mockResolvedValueOnce(activityStatsResult);

      const result = await UserService.getUserStats('user-123');

      expect(User.findById).toHaveBeenCalledWith('user-123');
      expect(query).toHaveBeenCalledTimes(2);
      expect(result).toHaveProperty('devices');
      expect(result).toHaveProperty('activity');
      expect(result).toHaveProperty('storage');
      expect(result).toHaveProperty('accountAge');
      expect(result).toHaveProperty('lastLogin');
      expect(result.devices).toEqual(deviceStatsResult.rows[0]);
      expect(result.activity).toEqual(activityStatsResult.rows);
    });

    it('should throw error if user not found', async () => {
      User.findById.mockResolvedValue(null);

      await expect(UserService.getUserStats('user-123'))
        .rejects.toThrow('User not found');
    });
  });

  describe('getUserDevices', () => {
    it('should return paginated user devices', async () => {
      const countResult = { rows: [{ total: '10' }] };
      const devicesResult = {
        rows: [
          { id: 'device-1', device_name: 'iPhone', device_type: 'mobile' },
          { id: 'device-2', device_name: 'iPad', device_type: 'tablet' }
        ]
      };

      query.mockResolvedValueOnce(countResult)
           .mockResolvedValueOnce(devicesResult);

      const result = await UserService.getUserDevices('user-123', {
        page: 1,
        limit: 5,
        status: 'connected'
      });

      expect(User.findById).toHaveBeenCalledWith('user-123');
      expect(query).toHaveBeenCalledTimes(2);
      expect(result).toHaveProperty('devices');
      expect(result).toHaveProperty('pagination');
      expect(result.devices).toEqual(devicesResult.rows);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 5,
        total: 10,
        pages: 2
      });
    });

    it('should throw error if user not found', async () => {
      User.findById.mockResolvedValue(null);

      await expect(UserService.getUserDevices('user-123'))
        .rejects.toThrow('User not found');
    });
  });

  describe('updatePreferences', () => {
    it('should update user preferences with valid data', async () => {
      const preferences = {
        notifications: {
          email: ['device_connected', 'security_alerts'],
          push: ['device_disconnected']
        },
        privacy: {
          shareUsageData: true,
          allowAnalytics: false
        }
      };

      query.mockResolvedValue({ rows: [] });

      const result = await UserService.updatePreferences('user-123', preferences);

      expect(User.findById).toHaveBeenCalledWith('user-123');
      expect(query).toHaveBeenCalledWith(
        'UPDATE users SET preferences = $1, updated_at = NOW() WHERE id = $2',
        [JSON.stringify(result), 'user-123']
      );
      expect(deleteCache).toHaveBeenCalledWith('user:user-123');
    });

    it('should throw error if user not found', async () => {
      User.findById.mockResolvedValue(null);

      await expect(UserService.updatePreferences('user-123', {}))
        .rejects.toThrow('User not found');
    });
  });

  describe('getActivityLog', () => {
    it('should return paginated activity logs', async () => {
      const countResult = { rows: [{ total: '5' }] };
      const logsResult = {
        rows: [
          { id: 'log-1', action: 'login', created_at: new Date() },
          { id: 'log-2', action: 'device_connected', created_at: new Date() }
        ]
      };

      query.mockResolvedValueOnce(countResult)
           .mockResolvedValueOnce(logsResult);

      const result = await UserService.getActivityLog('user-123', {
        page: 1,
        limit: 10,
        action: 'login'
      });

      expect(User.findById).toHaveBeenCalledWith('user-123');
      expect(query).toHaveBeenCalledTimes(2);
      expect(result).toHaveProperty('logs');
      expect(result).toHaveProperty('pagination');
      expect(result.logs).toEqual(logsResult.rows);
    });

    it('should throw error if user not found', async () => {
      User.findById.mockResolvedValue(null);

      await expect(UserService.getActivityLog('user-123'))
        .rejects.toThrow('User not found');
    });
  });

  describe('deleteAccount', () => {
    it('should delete user account with valid password', async () => {
      mockUser.verifyPassword.mockResolvedValue(true);
      mockClient.query.mockResolvedValue({ rows: [] });

      const result = await UserService.deleteAccount('user-123', 'password123');

      expect(User.findById).toHaveBeenCalledWith('user-123');
      expect(mockUser.verifyPassword).toHaveBeenCalledWith('password123');
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(deleteCache).toHaveBeenCalledWith('user:user-123');
      expect(deleteCache).toHaveBeenCalledWith('refresh_token:user-123');
      expect(result).toBe(true);
    });

    it('should throw error if user not found', async () => {
      User.findById.mockResolvedValue(null);

      await expect(UserService.deleteAccount('user-123', 'password123'))
        .rejects.toThrow('User not found');
    });

    it('should throw error if password is incorrect', async () => {
      mockUser.verifyPassword.mockResolvedValue(false);

      await expect(UserService.deleteAccount('user-123', 'wrongpassword'))
        .rejects.toThrow('Password is incorrect');
    });

    it('should rollback transaction on error', async () => {
      mockUser.verifyPassword.mockResolvedValue(true);
      mockClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(UserService.deleteAccount('user-123', 'password123'))
        .rejects.toThrow('Failed to delete account');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('validatePreferences', () => {
    it('should validate and filter preferences correctly', () => {
      const preferences = {
        notifications: {
          email: ['device_connected', 'invalid_option'],
          push: ['security_alerts']
        },
        privacy: {
          shareUsageData: true,
          allowAnalytics: 'invalid_boolean'
        },
        interface: {
          theme: 'dark',
          language: 'en'
        }
      };

      const schema = {
        notifications: {
          email: ['device_connected', 'device_disconnected', 'security_alerts'],
          push: ['device_connected', 'device_disconnected', 'security_alerts']
        },
        privacy: {
          shareUsageData: 'boolean',
          allowAnalytics: 'boolean'
        },
        interface: {
          theme: ['light', 'dark', 'auto'],
          language: 'string'
        }
      };

      const result = UserService.validatePreferences(preferences, schema);

      expect(result.notifications.email).toEqual(['device_connected']);
      expect(result.notifications.push).toEqual(['security_alerts']);
      expect(result.privacy.shareUsageData).toBe(true);
      expect(result.privacy.allowAnalytics).toBeUndefined();
      expect(result.interface.theme).toBe('dark');
      expect(result.interface.language).toBe('en');
    });
  });

  describe('getStorageLimit', () => {
    it('should return correct storage limits for different tiers', () => {
      expect(UserService.getStorageLimit('free')).toBe(5 * 1024 * 1024 * 1024);
      expect(UserService.getStorageLimit('basic')).toBe(50 * 1024 * 1024 * 1024);
      expect(UserService.getStorageLimit('premium')).toBe(500 * 1024 * 1024 * 1024);
      expect(UserService.getStorageLimit('enterprise')).toBe(-1);
      expect(UserService.getStorageLimit('unknown')).toBe(5 * 1024 * 1024 * 1024);
    });
  });
});