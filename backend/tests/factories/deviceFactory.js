const { v4: uuidv4 } = require('uuid');

/**
 * Device Factory for generating test device data
 */
class DeviceFactory {
  static create(overrides = {}) {
    const defaultDevice = {
      id: uuidv4(),
      userId: uuidv4(),
      deviceName: 'Test Device',
      deviceType: 'mobile',
      deviceModel: 'iPhone 14 Pro',
      osType: 'iOS',
      osVersion: '17.1',
      appVersion: '1.0.0',
      lastSync: new Date(),
      status: 'active',
      connectionId: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return { ...defaultDevice, ...overrides };
  }

  static createMobile(overrides = {}) {
    return this.create({
      deviceType: 'mobile',
      deviceModel: 'iPhone 14 Pro',
      osType: 'iOS',
      osVersion: '17.1',
      ...overrides
    });
  }

  static createAndroid(overrides = {}) {
    return this.create({
      deviceType: 'mobile',
      deviceModel: 'Samsung Galaxy S23',
      osType: 'Android',
      osVersion: '14.0',
      ...overrides
    });
  }

  static createDesktop(overrides = {}) {
    return this.create({
      deviceType: 'desktop',
      deviceModel: 'MacBook Pro',
      osType: 'macOS',
      osVersion: '14.1',
      ...overrides
    });
  }

  static createTablet(overrides = {}) {
    return this.create({
      deviceType: 'tablet',
      deviceModel: 'iPad Pro',
      osType: 'iPadOS',
      osVersion: '17.1',
      ...overrides
    });
  }

  static createOffline(overrides = {}) {
    return this.create({
      status: 'inactive',
      lastSync: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      ...overrides
    });
  }

  static createSyncing(overrides = {}) {
    return this.create({
      status: 'syncing',
      lastSync: new Date(),
      ...overrides
    });
  }

  static createWithError(overrides = {}) {
    return this.create({
      status: 'error',
      lastSync: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      ...overrides
    });
  }

  static createBatch(count = 3, userId = null, overrides = {}) {
    const devices = [];
    const baseUserId = userId || uuidv4();

    for (let i = 0; i < count; i++) {
      const device = this.create({
        userId: baseUserId,
        deviceName: `Test Device ${i + 1}`,
        ...overrides
      });
      devices.push(device);
    }
    return devices;
  }
}

module.exports = DeviceFactory;
