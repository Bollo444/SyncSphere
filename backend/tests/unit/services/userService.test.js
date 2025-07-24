const UserService = require('../../../src/services/users/userService');
const UserFactory = require('../../factories/userFactory');
const TestHelpers = require('../../utils/testHelpers');

// Mock dependencies
jest.mock('../../../src/models/User');
jest.mock('../../../src/services/email/emailService');

const User = require('../../../src/models/User');
const emailService = require('../../../src/services/email/emailService');

describe('UserService', () => {
  let userService;
  let mockUser;

  beforeEach(() => {
    userService = new UserService();
    mockUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'user',
      subscriptionTier: 'free',
      isActive: true,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      save: jest.fn().mockResolvedValue(true),
      delete: jest.fn().mockResolvedValue(true),
      comparePassword: jest.fn().mockResolvedValue(true)
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('getUserProfile', () => {
    it('should return user profile for valid user ID', async () => {
      User.findById = jest.fn().mockResolvedValue(mockUser);

      const result = await userService.getUserProfile(mockUser.id);

      expect(User.findById).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual({
        success: true,
        user: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName
        })
      });
    });

    it('should throw error for non-existent user', async () => {
      const userId = 'non-existent-id';
      User.findById = jest.fn().mockResolvedValue(null);

      await expect(userService.getUserProfile(userId)).rejects.toThrow('User not found');

      expect(User.findById).toHaveBeenCalledWith(userId);
    });

    it('should handle database errors', async () => {
      const userId = mockUser.id;
      User.findById = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(userService.getUserProfile(userId)).rejects.toThrow('Database error');
    });
  });

  describe('updateUserProfile', () => {
    it('should successfully update user profile', async () => {
      const userId = mockUser.id;
      const updateData = {
        firstName: 'Updated',
        lastName: 'Name'
      };

      const updatedUser = { ...mockUser, ...updateData };
      User.findById = jest.fn().mockResolvedValue(mockUser);
      mockUser.save = jest.fn().mockResolvedValue(updatedUser);

      const result = await userService.updateUserProfile(userId, updateData);

      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        user: expect.objectContaining({
          firstName: 'Updated',
          lastName: 'Name'
        }),
        message: 'Profile updated successfully'
      });
    });

    it('should throw error for non-existent user', async () => {
      const userId = 'non-existent-id';
      const updateData = { firstName: 'Updated' };

      User.findById = jest.fn().mockResolvedValue(null);

      await expect(userService.updateUserProfile(userId, updateData)).rejects.toThrow(
        'User not found'
      );
    });

    it('should validate email uniqueness when updating email', async () => {
      const userId = mockUser.id;
      const updateData = { email: 'newemail@example.com' };

      User.findById = jest.fn().mockResolvedValue(mockUser);
      User.findByEmail = jest.fn().mockResolvedValue(null);

      await userService.updateUserProfile(userId, updateData);

      expect(User.findByEmail).toHaveBeenCalledWith(updateData.email);
    });

    it('should throw error when updating to existing email', async () => {
      const userId = mockUser.id;
      const updateData = { email: 'existing@example.com' };
      const existingUser = { id: 'different-id', email: 'existing@example.com' };

      User.findById = jest.fn().mockResolvedValue(mockUser);
      User.findByEmail = jest.fn().mockResolvedValue(existingUser);

      await expect(userService.updateUserProfile(userId, updateData)).rejects.toThrow(
        'Email already in use'
      );
    });

    it('should not validate email uniqueness when updating to same email', async () => {
      const userId = mockUser.id;
      const updateData = { email: mockUser.email };

      User.findById = jest.fn().mockResolvedValue(mockUser);

      await userService.updateUserProfile(userId, updateData);

      expect(User.findByEmail).not.toHaveBeenCalled();
    });

    it('should filter out non-updatable fields', async () => {
      const userId = mockUser.id;
      const updateData = {
        firstName: 'Updated',
        id: 'should-not-update',
        role: 'admin',
        createdAt: new Date()
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);

      await userService.updateUserProfile(userId, updateData);

      expect(mockUser.id).not.toBe(updateData.id);
      expect(mockUser.role).not.toBe(updateData.role);
    });
  });

  describe('changePassword', () => {
    it('should successfully change password with valid current password', async () => {
      const userId = mockUser.id;
      const passwordData = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123'
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);
      mockUser.comparePassword = jest.fn().mockResolvedValue(true);

      const result = await userService.changePassword(userId, passwordData);

      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(mockUser.comparePassword).toHaveBeenCalledWith(passwordData.currentPassword);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'Password changed successfully'
      });
    });

    it('should throw error for incorrect current password', async () => {
      const userId = mockUser.id;
      const passwordData = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123'
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);
      mockUser.comparePassword = jest.fn().mockResolvedValue(false);

      await expect(userService.changePassword(userId, passwordData)).rejects.toThrow(
        'Current password is incorrect'
      );

      expect(mockUser.save).not.toHaveBeenCalled();
    });

    it('should throw error for non-existent user', async () => {
      const userId = 'non-existent-id';
      const passwordData = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123'
      };

      User.findById = jest.fn().mockResolvedValue(null);

      await expect(userService.changePassword(userId, passwordData)).rejects.toThrow(
        'User not found'
      );
    });

    it('should validate new password strength', async () => {
      const userId = mockUser.id;
      const passwordData = {
        currentPassword: 'oldpassword',
        newPassword: '123' // Too weak
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);

      await expect(userService.changePassword(userId, passwordData)).rejects.toThrow(
        'Password does not meet requirements'
      );
    });
  });

  describe('deleteAccount', () => {
    it('should successfully delete user account', async () => {
      const userId = mockUser.id;

      User.findById = jest.fn().mockResolvedValue(mockUser);

      const result = await userService.deleteAccount(userId);

      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(mockUser.delete).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'Account deleted successfully'
      });
    });

    it('should throw error for non-existent user', async () => {
      const userId = 'non-existent-id';

      User.findById = jest.fn().mockResolvedValue(null);

      await expect(userService.deleteAccount(userId)).rejects.toThrow('User not found');
    });

    it('should handle soft delete for users with active subscriptions', async () => {
      const userId = mockUser.id;
      const userWithSubscription = {
        ...mockUser,
        subscriptionTier: 'premium',
        hasActiveSubscription: true
      };

      User.findById = jest.fn().mockResolvedValue(userWithSubscription);

      const result = await userService.deleteAccount(userId);

      expect(userWithSubscription.save).toHaveBeenCalled();
      expect(result.message).toContain('deactivated');
    });
  });

  describe('getAllUsers', () => {
    it('should return paginated list of users', async () => {
      const users = await UserFactory.createBatch(5);
      const paginationOptions = { page: 1, limit: 10 };

      User.findAll = jest.fn().mockResolvedValue({
        users,
        total: 5,
        page: 1,
        totalPages: 1
      });

      const result = await userService.getAllUsers(paginationOptions);

      expect(User.findAll).toHaveBeenCalledWith(paginationOptions);
      expect(result).toEqual({
        success: true,
        users,
        pagination: {
          total: 5,
          page: 1,
          totalPages: 1,
          limit: 10
        }
      });
    });

    it('should apply search filters', async () => {
      const searchOptions = {
        page: 1,
        limit: 10,
        search: 'test@example.com',
        role: 'user'
      };

      User.findAll = jest.fn().mockResolvedValue({
        users: [mockUser],
        total: 1,
        page: 1,
        totalPages: 1
      });

      await userService.getAllUsers(searchOptions);

      expect(User.findAll).toHaveBeenCalledWith(searchOptions);
    });

    it('should handle empty results', async () => {
      const paginationOptions = { page: 1, limit: 10 };

      User.findAll = jest.fn().mockResolvedValue({
        users: [],
        total: 0,
        page: 1,
        totalPages: 0
      });

      const result = await userService.getAllUsers(paginationOptions);

      expect(result.users).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe('updateUserRole', () => {
    it('should successfully update user role', async () => {
      const userId = mockUser.id;
      const newRole = 'admin';

      User.findById = jest.fn().mockResolvedValue(mockUser);

      const result = await userService.updateUserRole(userId, newRole);

      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(mockUser.save).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        user: mockUser,
        message: 'User role updated successfully'
      });
    });

    it('should validate role value', async () => {
      const userId = mockUser.id;
      const invalidRole = 'invalid-role';

      await expect(userService.updateUserRole(userId, invalidRole)).rejects.toThrow('Invalid role');
    });

    it('should throw error for non-existent user', async () => {
      const userId = 'non-existent-id';
      const newRole = 'admin';

      User.findById = jest.fn().mockResolvedValue(null);

      await expect(userService.updateUserRole(userId, newRole)).rejects.toThrow('User not found');
    });
  });

  describe('getUserStats', () => {
    it('should return user statistics', async () => {
      const userId = mockUser.id;
      const mockStats = {
        totalRecoveries: 5,
        totalTransfers: 3,
        storageUsed: 1024000000,
        lastActivity: new Date()
      };

      User.findById = jest.fn().mockResolvedValue(mockUser);
      User.getUserStats = jest.fn().mockResolvedValue(mockStats);

      const result = await userService.getUserStats(userId);

      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(result).toEqual({
        success: true,
        stats: expect.objectContaining({
          totalRecoveries: expect.any(Number),
          totalTransfers: expect.any(Number),
          storageUsed: expect.any(Number),
          lastActivity: expect.any(Date)
        })
      });
    });

    it('should throw error for non-existent user', async () => {
      const userId = 'non-existent-id';

      User.findById = jest.fn().mockResolvedValue(null);

      await expect(userService.getUserStats(userId)).rejects.toThrow('User not found');
    });
  });
});
