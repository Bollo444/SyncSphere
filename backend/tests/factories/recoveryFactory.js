const { v4: uuidv4 } = require('uuid');

/**
 * Recovery Session Factory for generating test recovery data
 */
class RecoveryFactory {
  static create(overrides = {}) {
    const defaultRecovery = {
      id: uuidv4(),
      userId: uuidv4(),
      deviceId: uuidv4(),
      recoveryType: 'photos',
      status: 'pending',
      progress: 0,
      totalFiles: 0,
      recoveredFiles: 0,
      totalSize: 0,
      recoveredSize: 0,
      options: {
        includeDeleted: true,
        dateRange: null,
        fileTypes: ['jpg', 'png', 'mp4'],
        maxFileSize: 100 * 1024 * 1024 // 100MB
      },
      errorMessage: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return { ...defaultRecovery, ...overrides };
  }

  static createPhotoRecovery(overrides = {}) {
    return this.create({
      recoveryType: 'photos',
      totalFiles: 150,
      totalSize: 500 * 1024 * 1024, // 500MB
      options: {
        includeDeleted: true,
        fileTypes: ['jpg', 'png', 'heic', 'raw'],
        maxFileSize: 50 * 1024 * 1024 // 50MB
      },
      ...overrides
    });
  }

  static createContactRecovery(overrides = {}) {
    return this.create({
      recoveryType: 'contacts',
      totalFiles: 500,
      totalSize: 2 * 1024 * 1024, // 2MB
      options: {
        includeDeleted: true,
        fileTypes: ['vcf'],
        maxFileSize: 1024 * 1024 // 1MB
      },
      ...overrides
    });
  }

  static createMessageRecovery(overrides = {}) {
    return this.create({
      recoveryType: 'messages',
      totalFiles: 1000,
      totalSize: 50 * 1024 * 1024, // 50MB
      options: {
        includeDeleted: true,
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
          end: new Date()
        },
        fileTypes: ['txt', 'json'],
        maxFileSize: 10 * 1024 * 1024 // 10MB
      },
      ...overrides
    });
  }

  static createFullRecovery(overrides = {}) {
    return this.create({
      recoveryType: 'full',
      totalFiles: 5000,
      totalSize: 2 * 1024 * 1024 * 1024, // 2GB
      options: {
        includeDeleted: true,
        fileTypes: ['*'],
        maxFileSize: 100 * 1024 * 1024 // 100MB
      },
      ...overrides
    });
  }

  static createScanning(overrides = {}) {
    return this.create({
      status: 'scanning',
      progress: 25,
      totalFiles: 100,
      recoveredFiles: 25,
      ...overrides
    });
  }

  static createRecovering(overrides = {}) {
    return this.create({
      status: 'recovering',
      progress: 60,
      totalFiles: 200,
      recoveredFiles: 120,
      totalSize: 100 * 1024 * 1024,
      recoveredSize: 60 * 1024 * 1024,
      ...overrides
    });
  }

  static createCompleted(overrides = {}) {
    return this.create({
      status: 'completed',
      progress: 100,
      totalFiles: 150,
      recoveredFiles: 150,
      totalSize: 200 * 1024 * 1024,
      recoveredSize: 200 * 1024 * 1024,
      ...overrides
    });
  }

  static createFailed(overrides = {}) {
    return this.create({
      status: 'failed',
      progress: 30,
      totalFiles: 100,
      recoveredFiles: 30,
      errorMessage: 'Device connection lost during recovery',
      ...overrides
    });
  }

  static createCancelled(overrides = {}) {
    return this.create({
      status: 'cancelled',
      progress: 45,
      totalFiles: 200,
      recoveredFiles: 90,
      ...overrides
    });
  }

  static createBatch(count = 3, userId = null, overrides = {}) {
    const recoveries = [];
    const baseUserId = userId || uuidv4();

    for (let i = 0; i < count; i++) {
      const recovery = this.create({
        userId: baseUserId,
        ...overrides
      });
      recoveries.push(recovery);
    }
    return recoveries;
  }
}

module.exports = RecoveryFactory;
