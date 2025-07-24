const DeviceService = require('../../src/services/devices/deviceService');
const Device = require('../../src/models/Device');
const User = require('../../src/models/User');
const { AppError } = require('../../src/middleware/errorMiddleware');
const { setCache, deleteCache, getCache } = require('../../src/config/redis');
const { query } = require('../../src/config/database');
const crypto = require('crypto');

// Mock dependencies
jest.mock('../../src/models/Device');
jest.mock('../../src/models/User');
jest.mock('../../src/middleware/errorMiddleware', () => ({
  AppError: jest.fn().mockImplementation((message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  })
}));
jest.mock('crypto');

describe('DeviceService', () => {
  let mockUser;
  let mockDevice;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock user object
    mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      subscriptionTier: 'basic'
    };

    // Mock device object
    mockDevice = {
      id: 'device-123',
      userId: 'user-123',
      deviceType: 'mobile',
      deviceModel: 'iPhone 15',
      osVersion: 'iOS 17.0',
      serialNumber: 'ABC123',
      deviceName: 'John\'s iPhone',
      connectionId: 'conn-123',
      status: 'connected',
      capabilities: {
        storage: 128000000000,
        wifi: true,
        cellular: true
      },
      disconnect: jest.fn(),
      delete: jest.fn(),
      updateCapabilities: jest.fn(),
      updateMetadata: jest.fn(),
      getCompatibilityInfo: jest.fn().mockReturnValue({})
    };

    // Setup default mocks
    User.findById.mockResolvedValue(mockUser);
    Device.findById.mockResolvedValue(mockDevice);
    Device.connect.mockResolvedValue(mockDevice);
    Device.findByConnectionId.mockResolvedValue(mockDevice);
    setCache.mockResolvedValue(true);
    deleteCache.mockResolvedValue(true);
    getCache.mockResolvedValue(null);
    query.mockResolvedValue({ rows: [] });
    crypto.randomBytes.mockReturnValue({ toString: jest.fn().mockReturnValue('random-hex') });
  });

  describe('connectDevice', () => {
    const deviceData = {
      deviceType: 'mobile',
      deviceModel: 'iPhone 15',
      osVersion: 'iOS 17.0',
      serialNumber: 'ABC123',
      deviceName: 'John\'s iPhone',
      capabilities: {
        storage: 128000000000,
        wifi: true
      }
    };

    beforeEach(() => {
      query.mockResolvedValue({ rows: [{ count: '2' }] }); // Current device count
    });

    it('should connect device successfully', async () => {
      const result = await DeviceService.connectDevice('user-123', deviceData);

      expect(User.findById).toHaveBeenCalledWith('user-123');
      expect(query).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM devices WHERE user_id = $1 AND deleted_at IS NULL',
        ['user-123']
      );
      expect(crypto.randomBytes).toHaveBeenCalledWith(16);
      expect(Device.connect).toHaveBeenCalledWith({
        userId: 'user-123',
        deviceType: 'mobile',
        deviceModel: 'iPhone 15',
        osVersion: 'iOS 17.0',
        serialNumber: 'ABC123',
        deviceName: 'John\'s iPhone',
        connectionId: 'random-hex',
        capabilities: deviceData.capabilities
      });
      expect(setCache).toHaveBeenCalledWith('device:device-123', mockDevice, 1800);
      expect(setCache).toHaveBeenCalledWith('connection:random-hex', 'device-123', 3600);
      expect(result).toEqual(mockDevice);
    });

    it('should use default device name if not provided', async () => {
      const deviceDataWithoutName = { ...deviceData };
      delete deviceDataWithoutName.deviceName;

      await DeviceService.connectDevice('user-123', deviceDataWithoutName);

      expect(Device.connect).toHaveBeenCalledWith(expect.objectContaining({
        deviceName: 'iPhone 15 (mobile)'
      }));
    });

    it('should throw error if user not found', async () => {
      User.findById.mockResolvedValue(null);

      await expect(DeviceService.connectDevice('user-123', deviceData))
        .rejects.toThrow('User not found');
    });

    it('should throw error if device limit reached', async () => {
      query.mockResolvedValue({ rows: [{ count: '10' }] }); // At limit for basic plan

      await expect(DeviceService.connectDevice('user-123', deviceData))
        .rejects.toThrow('Device limit reached. Your basic plan allows up to 10 devices.');
    });

    it('should allow unlimited devices for enterprise plan', async () => {
      mockUser.subscriptionTier = 'enterprise';
      query.mockResolvedValue({ rows: [{ count: '100' }] }); // High count

      const result = await DeviceService.connectDevice('user-123', deviceData);

      expect(result).toEqual(mockDevice);
    });
  });

  describe('disconnectDevice', () => {
    it('should disconnect device successfully', async () => {
      const result = await DeviceService.disconnectDevice('user-123', 'device-123');

      expect(Device.findById).toHaveBeenCalledWith('device-123');
      expect(mockDevice.disconnect).toHaveBeenCalled();
      expect(deleteCache).toHaveBeenCalledWith('device:device-123');
      expect(deleteCache).toHaveBeenCalledWith('connection:conn-123');
      expect(result).toBe(true);
    });

    it('should throw error if device not found', async () => {
      Device.findById.mockResolvedValue(null);

      await expect(DeviceService.disconnectDevice('user-123', 'device-123'))
        .rejects.toThrow('Device not found');
    });

    it('should throw error if user does not own device', async () => {
      const otherUserDevice = { ...mockDevice, userId: 'other-user' };
      Device.findById.mockResolvedValue(otherUserDevice);

      await expect(DeviceService.disconnectDevice('user-123', 'device-123'))
        .rejects.toThrow('Access denied');
    });
  });

  describe('getDevice', () => {
    it('should return cached device if available', async () => {
      getCache.mockResolvedValue(mockDevice);

      const result = await DeviceService.getDevice('user-123', 'device-123');

      expect(getCache).toHaveBeenCalledWith('device:device-123');
      expect(Device.findById).not.toHaveBeenCalled();
      expect(result).toEqual(mockDevice);
    });

    it('should fetch device from database and cache if not in cache', async () => {
      getCache.mockResolvedValue(null);

      const result = await DeviceService.getDevice('user-123', 'device-123');

      expect(getCache).toHaveBeenCalledWith('device:device-123');
      expect(Device.findById).toHaveBeenCalledWith('device-123');
      expect(setCache).toHaveBeenCalledWith('device:device-123', mockDevice, 1800);
      expect(result).toEqual(mockDevice);
    });

    it('should throw error if device not found', async () => {
      getCache.mockResolvedValue(null);
      Device.findById.mockResolvedValue(null);

      await expect(DeviceService.getDevice('user-123', 'device-123'))
        .rejects.toThrow('Device not found');
    });

    it('should throw error if user does not own device', async () => {
      getCache.mockResolvedValue(null);
      const otherUserDevice = { ...mockDevice, userId: 'other-user' };
      Device.findById.mockResolvedValue(otherUserDevice);

      await expect(DeviceService.getDevice('user-123', 'device-123'))
        .rejects.toThrow('Access denied');
    });
  });

  describe('getDeviceByConnectionId', () => {
    it('should return device from cached connection ID', async () => {
      getCache.mockResolvedValueOnce('device-123') // connection cache
               .mockResolvedValueOnce(mockDevice); // device cache

      const result = await DeviceService.getDeviceByConnectionId('conn-123');

      expect(getCache).toHaveBeenCalledWith('connection:conn-123');
      expect(getCache).toHaveBeenCalledWith('device:device-123');
      expect(result).toEqual(mockDevice);
    });

    it('should fetch device from database if connection not cached', async () => {
      getCache.mockResolvedValue(null);

      const result = await DeviceService.getDeviceByConnectionId('conn-123');

      expect(Device.findByConnectionId).toHaveBeenCalledWith('conn-123');
      expect(setCache).toHaveBeenCalledWith('connection:conn-123', 'device-123', 3600);
      expect(setCache).toHaveBeenCalledWith('device:device-123', mockDevice, 1800);
      expect(result).toEqual(mockDevice);
    });

    it('should throw error if device not found by connection ID', async () => {
      getCache.mockResolvedValue(null);
      Device.findByConnectionId.mockResolvedValue(null);

      await expect(DeviceService.getDeviceByConnectionId('conn-123'))
        .rejects.toThrow('Device not found');
    });
  });

  describe('updateDevice', () => {
    const updates = {
      deviceName: 'Updated iPhone',
      capabilities: { storage: 256000000000 },
      metadata: { location: 'office' },
      invalidField: 'should be filtered'
    };

    it('should update device successfully', async () => {
      const result = await DeviceService.updateDevice('user-123', 'device-123', updates);

      expect(Device.findById).toHaveBeenCalledWith('device-123');
      expect(mockDevice.updateCapabilities).toHaveBeenCalledWith({ storage: 256000000000 });
      expect(mockDevice.updateMetadata).toHaveBeenCalledWith({ location: 'office' });
      expect(query).toHaveBeenCalledWith(
        'UPDATE devices SET device_name = $1, updated_at = NOW() WHERE id = $2',
        ['Updated iPhone', 'device-123']
      );
      expect(deleteCache).toHaveBeenCalledWith('device:device-123');
    });

    it('should throw error if device not found', async () => {
      Device.findById.mockResolvedValue(null);

      await expect(DeviceService.updateDevice('user-123', 'device-123', updates))
        .rejects.toThrow('Device not found');
    });

    it('should throw error if user does not own device', async () => {
      const otherUserDevice = { ...mockDevice, userId: 'other-user' };
      Device.findById.mockResolvedValue(otherUserDevice);

      await expect(DeviceService.updateDevice('user-123', 'device-123', updates))
        .rejects.toThrow('Access denied');
    });

    it('should throw error if no valid fields to update', async () => {
      const invalidUpdates = { invalidField: 'value' };

      await expect(DeviceService.updateDevice('user-123', 'device-123', invalidUpdates))
        .rejects.toThrow('No valid fields to update');
    });
  });

  describe('deleteDevice', () => {
    it('should delete device successfully', async () => {
      const result = await DeviceService.deleteDevice('user-123', 'device-123');

      expect(Device.findById).toHaveBeenCalledWith('device-123');
      expect(mockDevice.delete).toHaveBeenCalled();
      expect(deleteCache).toHaveBeenCalledWith('device:device-123');
      expect(deleteCache).toHaveBeenCalledWith('connection:conn-123');
      expect(result).toBe(true);
    });

    it('should throw error if device not found', async () => {
      Device.findById.mockResolvedValue(null);

      await expect(DeviceService.deleteDevice('user-123', 'device-123'))
        .rejects.toThrow('Device not found');
    });

    it('should throw error if user does not own device', async () => {
      const otherUserDevice = { ...mockDevice, userId: 'other-user' };
      Device.findById.mockResolvedValue(otherUserDevice);

      await expect(DeviceService.deleteDevice('user-123', 'device-123'))
        .rejects.toThrow('Access denied');
    });
  });

  describe('getUserDevices', () => {
    beforeEach(() => {
      const countResult = { rows: [{ total: '5' }] };
      const devicesResult = {
        rows: [
          { id: 'device-1', device_name: 'iPhone', device_type: 'mobile' },
          { id: 'device-2', device_name: 'iPad', device_type: 'tablet' }
        ]
      };
      query.mockResolvedValueOnce(countResult)
           .mockResolvedValueOnce(devicesResult);
    });

    it('should return paginated user devices', async () => {
      const result = await DeviceService.getUserDevices('user-123', {
        page: 1,
        limit: 10,
        status: 'connected',
        deviceType: 'mobile'
      });

      expect(query).toHaveBeenCalledTimes(2);
      expect(result).toHaveProperty('devices');
      expect(result).toHaveProperty('pagination');
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 5,
        pages: 1
      });
    });

    it('should handle search parameter', async () => {
      await DeviceService.getUserDevices('user-123', {
        search: 'iPhone'
      });

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('device_name ILIKE'),
        expect.arrayContaining(['user-123', '%iPhone%'])
      );
    });

    it('should use default pagination values', async () => {
      await DeviceService.getUserDevices('user-123');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        expect.arrayContaining(['user-123', 10, 0])
      );
    });
  });

  describe('getDeviceStats', () => {
    beforeEach(() => {
      // Mock getDevice to return device
      jest.spyOn(DeviceService, 'getDevice').mockResolvedValue(mockDevice);
      
      const connectionHistoryResult = {
        rows: [
          { date: '2024-01-15', connections: 3 },
          { date: '2024-01-14', connections: 1 }
        ]
      };
      const uptimeStatsResult = {
        rows: [{ connections: 10, disconnections: 8 }]
      };
      
      query.mockResolvedValueOnce(connectionHistoryResult)
           .mockResolvedValueOnce(uptimeStatsResult);
    });

    it('should return device statistics', async () => {
      const result = await DeviceService.getDeviceStats('user-123', 'device-123');

      expect(DeviceService.getDevice).toHaveBeenCalledWith('user-123', 'device-123');
      expect(query).toHaveBeenCalledTimes(2);
      expect(result).toHaveProperty('device');
      expect(result).toHaveProperty('connectionHistory');
      expect(result).toHaveProperty('transfers');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('capabilities');
      expect(result).toHaveProperty('compatibility');
    });
  });

  describe('checkCompatibility', () => {
    it('should return compatibility info for iOS device', async () => {
      const deviceData = {
        deviceType: 'mobile',
        osVersion: 'iOS 15.0',
        capabilities: {
          storage: 128000000000,
          wifi: true,
          cellular: true
        }
      };

      const result = await DeviceService.checkCompatibility(deviceData);

      expect(result.supported).toBe(true);
      expect(result.features.dataTransfer).toBe(true);
      expect(result.features.backup).toBe(true);
      expect(result.features.sync).toBe(true);
      expect(result.limitations).toEqual([]);
    });

    it('should identify limitations for old iOS version', async () => {
      const deviceData = {
        deviceType: 'mobile',
        osVersion: 'iOS 11.0',
        capabilities: { wifi: true }
      };

      const result = await DeviceService.checkCompatibility(deviceData);

      expect(result.features.sync).toBe(false);
      expect(result.limitations).toContain('iOS version below 12.0 has limited sync capabilities');
    });

    it('should identify limitations for old Android version', async () => {
      const deviceData = {
        deviceType: 'mobile',
        osVersion: 'Android 7.0',
        capabilities: { wifi: true }
      };

      const result = await DeviceService.checkCompatibility(deviceData);

      expect(result.features.backup).toBe(false);
      expect(result.limitations).toContain('Android version below 8.0 has limited backup capabilities');
    });

    it('should identify low storage limitations', async () => {
      const deviceData = {
        deviceType: 'mobile',
        osVersion: 'iOS 15.0',
        capabilities: {
          storage: 500000000, // 500MB
          wifi: true
        }
      };

      const result = await DeviceService.checkCompatibility(deviceData);

      expect(result.limitations).toContain('Low storage space may affect backup operations');
      expect(result.recommendations).toContain('Free up storage space for optimal performance');
    });

    it('should mark device as unsupported without connectivity', async () => {
      const deviceData = {
        deviceType: 'mobile',
        osVersion: 'iOS 15.0',
        capabilities: {}
      };

      const result = await DeviceService.checkCompatibility(deviceData);

      expect(result.supported).toBe(false);
      expect(result.limitations).toContain('Device requires internet connectivity');
    });
  });

  describe('Helper methods', () => {
    describe('getUserDeviceCount', () => {
      it('should return user device count', async () => {
        query.mockResolvedValue({ rows: [{ count: '5' }] });

        const result = await DeviceService.getUserDeviceCount('user-123');

        expect(query).toHaveBeenCalledWith(
          'SELECT COUNT(*) as count FROM devices WHERE user_id = $1 AND deleted_at IS NULL',
          ['user-123']
        );
        expect(result).toBe(5);
      });
    });

    describe('getDeviceLimit', () => {
      it('should return correct device limits for different tiers', () => {
        expect(DeviceService.getDeviceLimit('free')).toBe(3);
        expect(DeviceService.getDeviceLimit('basic')).toBe(10);
        expect(DeviceService.getDeviceLimit('premium')).toBe(50);
        expect(DeviceService.getDeviceLimit('enterprise')).toBe(-1);
        expect(DeviceService.getDeviceLimit('unknown')).toBe(3);
      });
    });

    describe('logDeviceActivity', () => {
      it('should log device activity successfully', async () => {
        await DeviceService.logDeviceActivity('user-123', 'device-123', 'device_connected', {
          deviceType: 'mobile'
        });

        expect(query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO device_activity_logs'),
          ['user-123', 'device-123', 'device_connected', '{"deviceType":"mobile"}']
        );
      });

      it('should not throw error if logging fails', async () => {
        query.mockRejectedValue(new Error('Database error'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        await expect(DeviceService.logDeviceActivity('user-123', 'device-123', 'test'))
          .resolves.not.toThrow();

        expect(consoleSpy).toHaveBeenCalledWith('Failed to log device activity:', expect.any(Error));
        consoleSpy.mockRestore();
      });
    });

    describe('getDeviceById', () => {
      it('should return cached device if available', async () => {
        getCache.mockResolvedValue(mockDevice);

        const result = await DeviceService.getDeviceById('device-123');

        expect(getCache).toHaveBeenCalledWith('device:device-123');
        expect(Device.findById).not.toHaveBeenCalled();
        expect(result).toEqual(mockDevice);
      });

      it('should fetch and cache device if not in cache', async () => {
        getCache.mockResolvedValue(null);

        const result = await DeviceService.getDeviceById('device-123');

        expect(Device.findById).toHaveBeenCalledWith('device-123');
        expect(setCache).toHaveBeenCalledWith('device:device-123', mockDevice, 1800);
        expect(result).toEqual(mockDevice);
      });

      it('should throw error if device not found', async () => {
        getCache.mockResolvedValue(null);
        Device.findById.mockResolvedValue(null);

        await expect(DeviceService.getDeviceById('device-123'))
          .rejects.toThrow('Device not found');
      });
    });
  });
});