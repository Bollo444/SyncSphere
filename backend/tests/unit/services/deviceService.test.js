const DeviceService = require('../../../src/services/devices/deviceService');
const DeviceFactory = require('../../factories/deviceFactory');
const UserFactory = require('../../factories/userFactory');
const TestHelpers = require('../../utils/testHelpers');

// Mock dependencies
jest.mock('../../../src/models/Device');
jest.mock('../../../src/models/User');

const Device = require('../../../src/models/Device');
const User = require('../../../src/models/User');

describe('DeviceService', () => {
  let deviceService;
  let mockDevice;
  let mockUser;

  beforeEach(() => {
    deviceService = new DeviceService();

    mockUser = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User'
    };

    mockDevice = {
      id: '456e7890-e89b-12d3-a456-426614174001',
      userId: mockUser.id,
      deviceName: 'Test Device',
      deviceType: 'mobile',
      deviceModel: 'iPhone 14 Pro',
      osType: 'iOS',
      osVersion: '17.1',
      status: 'active',
      lastSync: new Date(),
      save: jest.fn().mockResolvedValue(true),
      delete: jest.fn().mockResolvedValue(true),
      updateStatus: jest.fn().mockResolvedValue(true)
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('getUserDevices', () => {
    it('should return all devices for a user', async () => {
      const userId = mockUser.id;
      const devices = DeviceFactory.createBatch(3, userId);

      Device.findByUserId = jest.fn().mockResolvedValue(devices);

      const result = await deviceService.getUserDevices(userId);

      expect(Device.findByUserId).toHaveBeenCalledWith(userId);
      expect(result).toEqual({
        success: true,
        devices
      });
    });

    it('should return empty array for user with no devices', async () => {
      const userId = mockUser.id;

      Device.findByUserId = jest.fn().mockResolvedValue([]);

      const result = await deviceService.getUserDevices(userId);

      expect(result.devices).toEqual([]);
      expect(result.success).toBe(true);
    });

    it('should handle database errors', async () => {
      const userId = mockUser.id;

      Device.findByUserId = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(deviceService.getUserDevices(userId)).rejects.toThrow('Database error');
    });
  });

  describe('addDevice', () => {
    it('should successfully add a new device', async () => {
      const userId = mockUser.id;
      const deviceData = DeviceFactory.create({ userId });

      User.findById = jest.fn().mockResolvedValue(mockUser);
      Device.create = jest.fn().mockResolvedValue(mockDevice);

      const result = await deviceService.addDevice(userId, deviceData);

      expect(User.findById).toHaveBeenCalledWith(userId);
      expect(Device.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          deviceName: deviceData.deviceName,
          deviceType: deviceData.deviceType
        })
      );
      expect(result).toEqual({
        success: true,
        device: mockDevice,
        message: 'Device added successfully'
      });
    });

    it('should throw error for non-existent user', async () => {
      const userId = 'non-existent-id';
      const deviceData = DeviceFactory.create();

      User.findById = jest.fn().mockResolvedValue(null);

      await expect(deviceService.addDevice(userId, deviceData)).rejects.toThrow('User not found');

      expect(Device.create).not.toHaveBeenCalled();
    });

    it('should validate device data', async () => {
      const userId = mockUser.id;
      const invalidDeviceData = { deviceName: '' }; // Missing required fields

      User.findById = jest.fn().mockResolvedValue(mockUser);

      await expect(deviceService.addDevice(userId, invalidDeviceData)).rejects.toThrow(
        'Invalid device data'
      );
    });

    it('should prevent duplicate device registration', async () => {
      const userId = mockUser.id;
      const deviceData = DeviceFactory.create({ userId });

      User.findById = jest.fn().mockResolvedValue(mockUser);
      Device.findByUserAndIdentifier = jest.fn().mockResolvedValue(mockDevice);

      await expect(deviceService.addDevice(userId, deviceData)).rejects.toThrow(
        'Device already registered'
      );
    });

    it('should enforce device limits for free users', async () => {
      const userId = mockUser.id;
      const deviceData = DeviceFactory.create({ userId });
      const freeUser = { ...mockUser, subscriptionTier: 'free' };

      User.findById = jest.fn().mockResolvedValue(freeUser);
      Device.countByUserId = jest.fn().mockResolvedValue(5); // Exceeds free limit

      await expect(deviceService.addDevice(userId, deviceData)).rejects.toThrow(
        'Device limit exceeded for free plan'
      );
    });
  });

  describe('updateDevice', () => {
    it('should successfully update device', async () => {
      const userId = mockUser.id;
      const deviceId = mockDevice.id;
      const updateData = { deviceName: 'Updated Device Name' };

      Device.findByIdAndUserId = jest.fn().mockResolvedValue(mockDevice);

      const result = await deviceService.updateDevice(userId, deviceId, updateData);

      expect(Device.findByIdAndUserId).toHaveBeenCalledWith(deviceId, userId);
      expect(mockDevice.save).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        device: mockDevice,
        message: 'Device updated successfully'
      });
    });

    it('should throw error for non-existent device', async () => {
      const userId = mockUser.id;
      const deviceId = 'non-existent-id';
      const updateData = { deviceName: 'Updated Name' };

      Device.findByIdAndUserId = jest.fn().mockResolvedValue(null);

      await expect(deviceService.updateDevice(userId, deviceId, updateData)).rejects.toThrow(
        'Device not found'
      );
    });

    it('should filter out non-updatable fields', async () => {
      const userId = mockUser.id;
      const deviceId = mockDevice.id;
      const updateData = {
        deviceName: 'Updated Name',
        id: 'should-not-update',
        userId: 'should-not-update',
        createdAt: new Date()
      };

      Device.findByIdAndUserId = jest.fn().mockResolvedValue(mockDevice);

      await deviceService.updateDevice(userId, deviceId, updateData);

      expect(mockDevice.id).not.toBe(updateData.id);
      expect(mockDevice.userId).not.toBe(updateData.userId);
    });
  });

  describe('removeDevice', () => {
    it('should successfully remove device', async () => {
      const userId = mockUser.id;
      const deviceId = mockDevice.id;

      Device.findByIdAndUserId = jest.fn().mockResolvedValue(mockDevice);

      const result = await deviceService.removeDevice(userId, deviceId);

      expect(Device.findByIdAndUserId).toHaveBeenCalledWith(deviceId, userId);
      expect(mockDevice.delete).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'Device removed successfully'
      });
    });

    it('should throw error for non-existent device', async () => {
      const userId = mockUser.id;
      const deviceId = 'non-existent-id';

      Device.findByIdAndUserId = jest.fn().mockResolvedValue(null);

      await expect(deviceService.removeDevice(userId, deviceId)).rejects.toThrow(
        'Device not found'
      );
    });

    it('should prevent removal of device with active operations', async () => {
      const userId = mockUser.id;
      const deviceId = mockDevice.id;
      const deviceWithActiveOps = {
        ...mockDevice,
        hasActiveOperations: jest.fn().mockResolvedValue(true)
      };

      Device.findByIdAndUserId = jest.fn().mockResolvedValue(deviceWithActiveOps);

      await expect(deviceService.removeDevice(userId, deviceId)).rejects.toThrow(
        'Cannot remove device with active operations'
      );
    });
  });

  describe('getDeviceDetails', () => {
    it('should return device details for valid device', async () => {
      const userId = mockUser.id;
      const deviceId = mockDevice.id;

      Device.findByIdAndUserId = jest.fn().mockResolvedValue(mockDevice);

      const result = await deviceService.getDeviceDetails(userId, deviceId);

      expect(Device.findByIdAndUserId).toHaveBeenCalledWith(deviceId, userId);
      expect(result).toEqual({
        success: true,
        device: mockDevice
      });
    });

    it('should throw error for non-existent device', async () => {
      const userId = mockUser.id;
      const deviceId = 'non-existent-id';

      Device.findByIdAndUserId = jest.fn().mockResolvedValue(null);

      await expect(deviceService.getDeviceDetails(userId, deviceId)).rejects.toThrow(
        'Device not found'
      );
    });
  });

  describe('syncDevice', () => {
    it('should successfully sync device', async () => {
      const userId = mockUser.id;
      const deviceId = mockDevice.id;

      Device.findByIdAndUserId = jest.fn().mockResolvedValue(mockDevice);
      mockDevice.performSync = jest.fn().mockResolvedValue({
        success: true,
        syncedData: { files: 100, contacts: 50 }
      });

      const result = await deviceService.syncDevice(userId, deviceId);

      expect(Device.findByIdAndUserId).toHaveBeenCalledWith(deviceId, userId);
      expect(mockDevice.performSync).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.syncResult).toBeDefined();
    });

    it('should throw error for offline device', async () => {
      const userId = mockUser.id;
      const deviceId = mockDevice.id;
      const offlineDevice = { ...mockDevice, status: 'offline' };

      Device.findByIdAndUserId = jest.fn().mockResolvedValue(offlineDevice);

      await expect(deviceService.syncDevice(userId, deviceId)).rejects.toThrow('Device is offline');
    });

    it('should handle sync failures', async () => {
      const userId = mockUser.id;
      const deviceId = mockDevice.id;

      Device.findByIdAndUserId = jest.fn().mockResolvedValue(mockDevice);
      mockDevice.performSync = jest.fn().mockRejectedValue(new Error('Sync failed'));

      await expect(deviceService.syncDevice(userId, deviceId)).rejects.toThrow('Sync failed');
    });
  });

  describe('getDeviceData', () => {
    it('should return device data with filters', async () => {
      const userId = mockUser.id;
      const deviceId = mockDevice.id;
      const filters = { dataType: 'photos', limit: 100 };
      const mockData = { photos: [{ id: 1, name: 'photo1.jpg' }] };

      Device.findByIdAndUserId = jest.fn().mockResolvedValue(mockDevice);
      mockDevice.getData = jest.fn().mockResolvedValue(mockData);

      const result = await deviceService.getDeviceData(userId, deviceId, filters);

      expect(Device.findByIdAndUserId).toHaveBeenCalledWith(deviceId, userId);
      expect(mockDevice.getData).toHaveBeenCalledWith(filters);
      expect(result).toEqual({
        success: true,
        data: mockData
      });
    });

    it('should throw error for non-existent device', async () => {
      const userId = mockUser.id;
      const deviceId = 'non-existent-id';
      const filters = {};

      Device.findByIdAndUserId = jest.fn().mockResolvedValue(null);

      await expect(deviceService.getDeviceData(userId, deviceId, filters)).rejects.toThrow(
        'Device not found'
      );
    });
  });

  describe('updateDeviceStatus', () => {
    it('should successfully update device status', async () => {
      const userId = mockUser.id;
      const deviceId = mockDevice.id;
      const newStatus = 'syncing';

      Device.findByIdAndUserId = jest.fn().mockResolvedValue(mockDevice);

      const result = await deviceService.updateDeviceStatus(userId, deviceId, newStatus);

      expect(Device.findByIdAndUserId).toHaveBeenCalledWith(deviceId, userId);
      expect(mockDevice.updateStatus).toHaveBeenCalledWith(newStatus);
      expect(result).toEqual({
        success: true,
        device: mockDevice,
        message: 'Device status updated'
      });
    });

    it('should validate status values', async () => {
      const userId = mockUser.id;
      const deviceId = mockDevice.id;
      const invalidStatus = 'invalid-status';

      await expect(
        deviceService.updateDeviceStatus(userId, deviceId, invalidStatus)
      ).rejects.toThrow('Invalid device status');
    });
  });

  describe('getDeviceStats', () => {
    it('should return device statistics', async () => {
      const userId = mockUser.id;
      const deviceId = mockDevice.id;
      const mockStats = {
        totalSyncs: 10,
        lastSyncDate: new Date(),
        dataSize: 1024000000,
        recoveryCount: 3,
        transferCount: 2
      };

      Device.findByIdAndUserId = jest.fn().mockResolvedValue(mockDevice);
      mockDevice.getStats = jest.fn().mockResolvedValue(mockStats);

      const result = await deviceService.getDeviceStats(userId, deviceId);

      expect(Device.findByIdAndUserId).toHaveBeenCalledWith(deviceId, userId);
      expect(mockDevice.getStats).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        stats: mockStats
      });
    });

    it('should throw error for non-existent device', async () => {
      const userId = mockUser.id;
      const deviceId = 'non-existent-id';

      Device.findByIdAndUserId = jest.fn().mockResolvedValue(null);

      await expect(deviceService.getDeviceStats(userId, deviceId)).rejects.toThrow(
        'Device not found'
      );
    });
  });
});
