const { v4: uuidv4 } = require('uuid');

/**
 * Transfer Session Factory for generating test transfer data
 */
class TransferFactory {
  static create(overrides = {}) {
    const defaultTransfer = {
      id: uuidv4(),
      userId: uuidv4(),
      sourceDeviceId: uuidv4(),
      targetDeviceId: uuidv4(),
      transferType: 'selective',
      status: 'pending',
      progress: 0,
      totalFiles: 0,
      transferredFiles: 0,
      totalSize: 0,
      transferredSize: 0,
      estimatedTimeRemaining: null,
      transferSpeed: null,
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return { ...defaultTransfer, ...overrides };
  }

  static createFullTransfer(overrides = {}) {
    return this.create({
      transferType: 'full',
      totalFiles: 5000,
      totalSize: 5 * 1024 * 1024 * 1024, // 5GB
      ...overrides
    });
  }

  static createSelectiveTransfer(overrides = {}) {
    return this.create({
      transferType: 'selective',
      totalFiles: 1500,
      totalSize: 1.5 * 1024 * 1024 * 1024, // 1.5GB
      ...overrides
    });
  }

  static createPhotoTransfer(overrides = {}) {
    return this.create({
      transferType: 'selective',
      totalFiles: 800,
      totalSize: 2 * 1024 * 1024 * 1024, // 2GB
      ...overrides
    });
  }

  static createContactTransfer(overrides = {}) {
    return this.create({
      transferType: 'selective',
      totalFiles: 500,
      totalSize: 5 * 1024 * 1024, // 5MB
      ...overrides
    });
  }

  static createPreparing(overrides = {}) {
    return this.create({
      status: 'preparing',
      progress: 0,
      ...overrides
    });
  }

  static createTransferring(overrides = {}) {
    return this.create({
      status: 'transferring',
      progress: 45,
      totalFiles: 1000,
      transferredFiles: 450,
      totalSize: 500 * 1024 * 1024,
      transferredSize: 225 * 1024 * 1024,
      transferSpeed: 15.5 * 1024 * 1024, // 15.5 MB/s
      estimatedTimeRemaining: 180, // 3 minutes
      ...overrides
    });
  }

  static createCompleted(overrides = {}) {
    return this.create({
      status: 'completed',
      progress: 100,
      totalFiles: 1200,
      transferredFiles: 1200,
      totalSize: 800 * 1024 * 1024,
      transferredSize: 800 * 1024 * 1024,
      transferSpeed: 12.3 * 1024 * 1024, // 12.3 MB/s
      estimatedTimeRemaining: 0,
      ...overrides
    });
  }

  static createFailed(overrides = {}) {
    return this.create({
      status: 'failed',
      progress: 25,
      totalFiles: 1000,
      transferredFiles: 250,
      errorMessage: 'Target device disconnected during transfer',
      ...overrides
    });
  }

  static createCancelled(overrides = {}) {
    return this.create({
      status: 'cancelled',
      progress: 60,
      totalFiles: 800,
      transferredFiles: 480,
      ...overrides
    });
  }

  static createiOSToAndroid(overrides = {}) {
    const sourceDevice = uuidv4();
    const targetDevice = uuidv4();

    return this.create({
      sourceDeviceId: sourceDevice,
      targetDeviceId: targetDevice,
      transferType: 'selective',
      totalFiles: 2000,
      totalSize: 3 * 1024 * 1024 * 1024, // 3GB
      ...overrides
    });
  }

  static createAndroidToiOS(overrides = {}) {
    const sourceDevice = uuidv4();
    const targetDevice = uuidv4();

    return this.create({
      sourceDeviceId: sourceDevice,
      targetDeviceId: targetDevice,
      transferType: 'selective',
      totalFiles: 1800,
      totalSize: 2.5 * 1024 * 1024 * 1024, // 2.5GB
      ...overrides
    });
  }

  static createBatch(count = 3, userId = null, overrides = {}) {
    const transfers = [];
    const baseUserId = userId || uuidv4();

    for (let i = 0; i < count; i++) {
      const transfer = this.create({
        userId: baseUserId,
        sourceDeviceId: uuidv4(),
        targetDeviceId: uuidv4(),
        ...overrides
      });
      transfers.push(transfer);
    }
    return transfers;
  }
}

module.exports = TransferFactory;
