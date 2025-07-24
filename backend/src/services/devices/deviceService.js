const Device = require('../../models/Device');
const User = require('../../models/User');
const { AppError } = require('../../middleware/errorMiddleware');
const { setCache, deleteCache, getCache } = require('../../config/redis');
const { query } = require('../../config/database');
const crypto = require('crypto');

class DeviceService {
  // Connect a new device
  static async connectDevice(userId, deviceData) {
    
    const { deviceType, deviceModel, osVersion, serialNumber, deviceName, capabilities = {} } = deviceData;
    
    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    
    // Check subscription limits
    const deviceCount = await DeviceService.getUserDeviceCount(userId);
    const deviceLimit = DeviceService.getDeviceLimit(user.subscriptionTier);
    
    if (deviceLimit !== -1 && deviceCount >= deviceLimit) {
      throw new AppError(`Device limit reached. Your ${user.subscriptionTier} plan allows up to ${deviceLimit} devices.`, 403);
    }
    
    // Generate unique connection ID
    const connectionId = crypto.randomBytes(16).toString('hex');
    
    // Connect device (handles existing devices by serial number)
    const device = await Device.connect({
      userId,
      deviceType,
      deviceModel,
      osVersion,
      serialNumber,
      deviceName: deviceName || `${deviceModel} (${deviceType})`,
      connectionId,
      capabilities
    });
    
    // Cache device for quick access
    await setCache(`device:${device.id}`, device, 30 * 60); // 30 minutes
    await setCache(`connection:${connectionId}`, device.id, 60 * 60); // 1 hour
    
    // Log activity
    await DeviceService.logDeviceActivity(userId, device.id, 'device_connected', {
      deviceType,
      deviceModel,
      connectionId
    });
    
    return device;
  }
  
  // Disconnect device
  static async disconnectDevice(userId, deviceId) {
    const device = await Device.findById(deviceId);
    if (!device) {
      throw new AppError('Device not found', 404);
    }
    
    // Check ownership
    if (device.userId !== userId) {
      throw new AppError('Access denied', 403);
    }
    
    // Disconnect device
    await device.disconnect();
    
    // Clear caches
    await deleteCache(`device:${deviceId}`);
    if (device.connectionId) {
      await deleteCache(`connection:${device.connectionId}`);
    }
    
    // Log activity
    await DeviceService.logDeviceActivity(userId, deviceId, 'device_disconnected', {
      deviceType: device.deviceType,
      deviceModel: device.deviceModel
    });
    
    return true;
  }
  
  // Get device by ID
  static async getDevice(userId, deviceId) {
    // Try cache first
    let device = await getCache(`device:${deviceId}`);
    
    if (!device) {
      const deviceObj = await Device.findById(deviceId);
      if (!deviceObj) {
        throw new AppError('Device not found', 404);
      }
      
      device = deviceObj;
      // Cache for 30 minutes
      await setCache(`device:${deviceId}`, device, 30 * 60);
    }
    
    // Check ownership
    if (device.userId !== userId) {
      throw new AppError('Access denied', 403);
    }
    
    return device;
  }
  
  // Get device by connection ID
  static async getDeviceByConnectionId(connectionId) {
    // Try cache first
    let deviceId = await getCache(`connection:${connectionId}`);
    
    if (deviceId) {
      return await DeviceService.getDeviceById(deviceId);
    }
    
    // Query database
    const device = await Device.findByConnectionId(connectionId);
    if (!device) {
      throw new AppError('Device not found', 404);
    }
    
    // Cache the connection mapping
    await setCache(`connection:${connectionId}`, device.id, 60 * 60); // 1 hour
    await setCache(`device:${device.id}`, device, 30 * 60); // 30 minutes
    
    return device;
  }
  
  // Update device information
  static async updateDevice(userId, deviceId, updates) {
    const device = await Device.findByIdAndUserId(deviceId, userId);
    if (!device) {
      throw new AppError('Device not found', 404);
    }
    
    // Validate updates
    const allowedUpdates = ['deviceName', 'capabilities', 'metadata'];
    const filteredUpdates = {};
    
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });
    
    if (Object.keys(filteredUpdates).length === 0) {
      throw new AppError('No valid fields to update', 400);
    }
    
    // Update device properties
    Object.assign(device, filteredUpdates);
    await device.save();
    
    return {
      success: true,
      device,
      message: 'Device updated successfully'
    };
  }
  
  // Delete device
  static async deleteDevice(userId, deviceId) {
    const device = await Device.findById(deviceId);
    if (!device) {
      throw new AppError('Device not found', 404);
    }
    
    // Check ownership
    if (device.userId !== userId) {
      throw new AppError('Access denied', 403);
    }
    
    // Delete device (soft delete)
    await device.delete();
    
    // Clear caches
    await deleteCache(`device:${deviceId}`);
    if (device.connectionId) {
      await deleteCache(`connection:${device.connectionId}`);
    }
    
    // Log activity
    await DeviceService.logDeviceActivity(userId, deviceId, 'device_deleted', {
      deviceType: device.deviceType,
      deviceModel: device.deviceModel
    });
    
    return true;
  }
  
  // Get user devices with filtering and pagination
  static async getUserDevices(userId, options = {}) {
    try {
      const devices = await Device.findByUserId(userId);
      return {
        success: true,
        devices
      };
    } catch (error) {
      throw error;
    }
  }

  // Add a new device
  async addDevice(userId, deviceData) {
    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Validate device data
    if (!deviceData.deviceName || !deviceData.deviceType) {
      throw new AppError('Invalid device data', 400);
    }

    // Check device limits for free users first
    if (user.subscriptionTier === 'free') {
      const deviceCount = await Device.countByUserId(userId);
      if (deviceCount >= 5) {
        throw new AppError('Device limit exceeded for free plan', 403);
      }
    }

    // Check for duplicate device (if method exists)
    if (Device.findByUserAndIdentifier) {
      const existingDevice = await Device.findByUserAndIdentifier(userId, deviceData.serialNumber || deviceData.deviceName);
      if (existingDevice) {
        throw new AppError('Device already registered', 409);
      }
    }

    // Create device
    const device = await Device.create({
      userId,
      deviceName: deviceData.deviceName,
      deviceType: deviceData.deviceType,
      deviceModel: deviceData.deviceModel,
      osType: deviceData.osType,
      osVersion: deviceData.osVersion,
      status: 'active'
    });

    return {
      success: true,
      device,
      message: 'Device added successfully'
    };
  }
  
  // Get device statistics
  static async getDeviceStats(userId, deviceId) {
    const device = await Device.findByIdAndUserId(deviceId, userId);
    if (!device) {
      throw new AppError('Device not found', 404);
    }

    const stats = await device.getStats();
    return {
      success: true,
      stats
    };
  }

  // Remove device
  async removeDevice(userId, deviceId) {
    const device = await Device.findByIdAndUserId(deviceId, userId);
    if (!device) {
      throw new AppError('Device not found', 404);
    }

    // Check for active operations
    if (device.hasActiveOperations && await device.hasActiveOperations()) {
      throw new AppError('Cannot remove device with active operations', 409);
    }

    await device.delete();
    return {
      success: true,
      message: 'Device removed successfully'
    };
  }

  // Get device details
  async getDeviceDetails(userId, deviceId) {
    const device = await Device.findByIdAndUserId(deviceId, userId);
    if (!device) {
      throw new AppError('Device not found', 404);
    }

    return {
      success: true,
      device
    };
  }

  // Sync device
  async syncDevice(userId, deviceId) {
    const device = await Device.findByIdAndUserId(deviceId, userId);
    if (!device) {
      throw new AppError('Device not found', 404);
    }

    if (device.status === 'offline') {
      throw new AppError('Device is offline', 400);
    }

    const syncResult = await device.performSync();
    return {
      success: true,
      syncResult
    };
  }

  // Get device data
  async getDeviceData(userId, deviceId, filters = {}) {
    const device = await Device.findByIdAndUserId(deviceId, userId);
    if (!device) {
      throw new AppError('Device not found', 404);
    }

    const data = await device.getData(filters);
    return {
      success: true,
      data
    };
  }

  // Update device status
  async updateDeviceStatus(userId, deviceId, newStatus) {
    const validStatuses = ['active', 'inactive', 'syncing', 'offline', 'error'];
    if (!validStatuses.includes(newStatus)) {
      throw new AppError('Invalid device status', 400);
    }

    const device = await Device.findByIdAndUserId(deviceId, userId);
    if (!device) {
      throw new AppError('Device not found', 404);
    }

    await device.updateStatus(newStatus);
    return {
      success: true,
      device,
      message: 'Device status updated'
    };
  }
  
  // Check device compatibility
  static async checkCompatibility(deviceData) {
    const { deviceType, osVersion, capabilities = {} } = deviceData;
    
    const compatibility = {
      supported: true,
      features: {
        dataTransfer: true,
        backup: true,
        sync: true,
        remoteAccess: false
      },
      limitations: [],
      recommendations: []
    };
    
    // Check OS version compatibility
    if (deviceType === 'mobile') {
      if (osVersion && osVersion.includes('iOS')) {
        const version = parseFloat(osVersion.replace('iOS ', ''));
        if (version < 12.0) {
          compatibility.limitations.push('iOS version below 12.0 has limited sync capabilities');
          compatibility.features.sync = false;
        }
      } else if (osVersion && osVersion.includes('Android')) {
        const version = parseFloat(osVersion.replace('Android ', ''));
        if (version < 8.0) {
          compatibility.limitations.push('Android version below 8.0 has limited backup capabilities');
          compatibility.features.backup = false;
        }
      }
    }
    
    // Check capabilities
    if (capabilities.storage && capabilities.storage < 1000000000) { // Less than 1GB
      compatibility.limitations.push('Low storage space may affect backup operations');
      compatibility.recommendations.push('Free up storage space for optimal performance');
    }
    
    if (!capabilities.wifi && !capabilities.cellular) {
      compatibility.supported = false;
      compatibility.limitations.push('Device requires internet connectivity');
    }
    
    return compatibility;
  }
  
  // Helper methods
  static async getUserDeviceCount(userId) {
    const result = await query(
      'SELECT COUNT(*) as count FROM devices WHERE user_id = $1',
      [userId]
    );
    return parseInt(result.rows[0].count);
  }
  
  static getDeviceLimit(subscriptionTier) {
    const limits = {
      free: 3,
      basic: 10,
      premium: 50,
      enterprise: -1 // Unlimited
    };
    
    return limits[subscriptionTier] || limits.free;
  }
  
  static async logDeviceActivity(userId, deviceId, action, metadata = {}) {
    try {
      await query(`
        INSERT INTO device_activity_logs (user_id, device_id, action, metadata, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `, [userId, deviceId, action, JSON.stringify(metadata)]);
    } catch (error) {
      // Log error but don't throw - activity logging shouldn't break main functionality
      console.error('Failed to log device activity:', error);
    }
  }
  
  static async getDeviceById(deviceId) {
    // Try cache first
    let device = await getCache(`device:${deviceId}`);
    
    if (!device) {
      const deviceObj = await Device.findById(deviceId);
      if (!deviceObj) {
        throw new AppError('Device not found', 404);
      }
      
      device = deviceObj;
      // Cache for 30 minutes
      await setCache(`device:${deviceId}`, device, 30 * 60);
    }
    
    return device;
  }
}

module.exports = DeviceService;