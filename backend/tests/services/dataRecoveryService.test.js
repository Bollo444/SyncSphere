const DataRecoveryService = require('../../src/services/dataRecovery/dataRecoveryService');
const DataRecovery = require('../../src/models/DataRecovery');
const Device = require('../../src/models/Device');
const User = require('../../src/models/User');
const AppError = require('../../src/utils/AppError');
const logger = require('../../src/utils/logger');
const { setCache, deleteCache, getCache } = require('../../src/config/redis');

// Mock dependencies
jest.mock('../../src/models/DataRecovery');
jest.mock('../../src/models/Device');
jest.mock('../../src/models/User');
jest.mock('../../src/utils/AppError', () => {
  return jest.fn().mockImplementation((message, statusCode) => {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
  });
});
jest.mock('../../src/utils/logger');

describe('DataRecoveryService', () => {
  let mockUser;
  let mockDevice;
  let mockRecoverySession;
  let mockDataRecovery;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
    
    // Mock user object
    mockUser = {
      id: 'user-123',
      email: 'test@example.com'
    };

    // Mock device object
    mockDevice = {
      id: 'device-123',
      user_id: 'user-123',
      status: 'connected',
      device_type: 'mobile'
    };

    // Mock recovery session
    mockRecoverySession = {
      id: 'recovery-123',
      user_id: 'user-123',
      device_id: 'device-123',
      recovery_type: 'deleted_files',
      status: 'pending',
      progress: 0,
      total_files: 0,
      recovered_files: 0,
      failed_files: 0,
      file_types: [],
      scan_results: {},
      created_at: new Date(),
      updated_at: new Date()
    };

    // Mock DataRecovery instance
    mockDataRecovery = {
      id: 'recovery-123',
      user_id: 'user-123',
      updateStatus: jest.fn().mockResolvedValue(true),
      updateProgress: jest.fn().mockResolvedValue(true),
      complete: jest.fn().mockResolvedValue(true),
      cancel: jest.fn().mockResolvedValue(true),
      pause: jest.fn().mockResolvedValue(true),
      resume: jest.fn().mockResolvedValue(true),
      markAsFailed: jest.fn().mockResolvedValue(true),
      getSuccessRate: jest.fn().mockReturnValue(85),
      getEstimatedTimeRemaining: jest.fn().mockReturnValue(300000)
    };

    // Setup default mocks
    User.findById.mockResolvedValue(mockUser);
    Device.findById.mockResolvedValue(mockDevice);
    DataRecovery.getActiveSessions.mockResolvedValue([]);
    DataRecovery.startRecovery.mockResolvedValue(mockRecoverySession);
    DataRecovery.findById.mockResolvedValue(mockRecoverySession);
    DataRecovery.findByUserId.mockResolvedValue([mockRecoverySession]);
    DataRecovery.getRecoveryStats.mockResolvedValue({
      total_sessions: 10,
      successful_sessions: 8,
      average_success_rate: 85
    });
    DataRecovery.cleanupOldSessions.mockResolvedValue(5);
    
    // Mock DataRecovery constructor
    DataRecovery.mockImplementation(() => mockDataRecovery);
    
    setCache.mockResolvedValue(true);
    getCache.mockResolvedValue(null);
    deleteCache.mockResolvedValue(true);
    
    logger.info.mockImplementation(() => {});
    logger.error.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('startRecovery', () => {
    const recoveryOptions = {
      file_types: ['jpg', 'png'],
      deep_scan: true
    };

    it('should start recovery successfully', async () => {
      const result = await DataRecoveryService.startRecovery(
        'user-123',
        'device-123',
        'deleted_files',
        recoveryOptions
      );

      expect(User.findById).toHaveBeenCalledWith('user-123');
      expect(Device.findById).toHaveBeenCalledWith('device-123');
      expect(DataRecovery.getActiveSessions).toHaveBeenCalledWith('user-123');
      expect(DataRecovery.startRecovery).toHaveBeenCalledWith(
        'user-123',
        'device-123',
        'deleted_files',
        recoveryOptions
      );
      expect(setCache).toHaveBeenCalledWith(
        'recovery:recovery-123',
        mockRecoverySession,
        3600
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Data recovery started',
        expect.objectContaining({
          recoveryId: 'recovery-123',
          userId: 'user-123',
          deviceId: 'device-123',
          recoveryType: 'deleted_files'
        })
      );
      expect(result).toEqual(mockRecoverySession);
    });

    it('should throw error if user not found', async () => {
      User.findById.mockResolvedValue(null);

      await expect(DataRecoveryService.startRecovery('user-123', 'device-123', 'deleted_files'))
        .rejects.toThrow('User not found');
    });

    it('should throw error if device not found', async () => {
      Device.findById.mockResolvedValue(null);

      await expect(DataRecoveryService.startRecovery('user-123', 'device-123', 'deleted_files'))
        .rejects.toThrow('Device not found or not owned by user');
    });

    it('should throw error if device not owned by user', async () => {
      mockDevice.user_id = 'other-user';

      await expect(DataRecoveryService.startRecovery('user-123', 'device-123', 'deleted_files'))
        .rejects.toThrow('Device not found or not owned by user');
    });

    it('should throw error if device not connected', async () => {
      mockDevice.status = 'disconnected';

      await expect(DataRecoveryService.startRecovery('user-123', 'device-123', 'deleted_files'))
        .rejects.toThrow('Device must be connected to start recovery');
    });

    it('should throw error if too many active recoveries', async () => {
      DataRecovery.getActiveSessions.mockResolvedValue([
        { id: 'recovery-1' },
        { id: 'recovery-2' }
      ]);

      await expect(DataRecoveryService.startRecovery('user-123', 'device-123', 'deleted_files'))
        .rejects.toThrow('Maximum number of concurrent recovery sessions reached');
    });

    it('should throw error for invalid recovery type', async () => {
      await expect(DataRecoveryService.startRecovery('user-123', 'device-123', 'invalid_type'))
        .rejects.toThrow('Invalid recovery type');
    });

    it('should accept all valid recovery types', async () => {
      const validTypes = [
        'deleted_files',
        'formatted_drive',
        'corrupted_files',
        'system_crash',
        'virus_attack',
        'hardware_failure'
      ];

      for (const type of validTypes) {
        await expect(DataRecoveryService.startRecovery('user-123', 'device-123', type))
          .resolves.toEqual(mockRecoverySession);
      }
    });
  });

  describe('getRecoverySession', () => {
    it('should return cached recovery session', async () => {
      getCache.mockResolvedValue(mockRecoverySession);

      const result = await DataRecoveryService.getRecoverySession('recovery-123', 'user-123');

      expect(getCache).toHaveBeenCalledWith('recovery:recovery-123');
      expect(DataRecovery.findById).not.toHaveBeenCalled();
      expect(result).toEqual(mockRecoverySession);
    });

    it('should fetch from database and cache if not in cache', async () => {
      getCache.mockResolvedValue(null);

      const result = await DataRecoveryService.getRecoverySession('recovery-123', 'user-123');

      expect(DataRecovery.findById).toHaveBeenCalledWith('recovery-123');
      expect(setCache).toHaveBeenCalledWith(
        'recovery:recovery-123',
        mockRecoverySession,
        3600
      );
      expect(result).toEqual(mockRecoverySession);
    });

    it('should throw error if session not found', async () => {
      getCache.mockResolvedValue(null);
      DataRecovery.findById.mockResolvedValue(null);

      await expect(DataRecoveryService.getRecoverySession('recovery-123', 'user-123'))
        .rejects.toThrow('Recovery session not found');
    });

    it('should throw error if user does not own session', async () => {
      getCache.mockResolvedValue(null);
      mockRecoverySession.user_id = 'other-user';

      await expect(DataRecoveryService.getRecoverySession('recovery-123', 'user-123'))
        .rejects.toThrow('Access denied');
    });

    it('should return session without user check if userId not provided', async () => {
      getCache.mockResolvedValue(null);

      const result = await DataRecoveryService.getRecoverySession('recovery-123');

      expect(result).toEqual(mockRecoverySession);
    });
  });

  describe('getUserRecoverySessions', () => {
    it('should return user recovery sessions', async () => {
      const options = { limit: 10, offset: 0 };
      const result = await DataRecoveryService.getUserRecoverySessions('user-123', options);

      expect(DataRecovery.findByUserId).toHaveBeenCalledWith('user-123', options);
      expect(result).toEqual([mockRecoverySession]);
    });

    it('should handle empty options', async () => {
      await DataRecoveryService.getUserRecoverySessions('user-123');

      expect(DataRecovery.findByUserId).toHaveBeenCalledWith('user-123', {});
    });
  });

  describe('cancelRecovery', () => {
    beforeEach(() => {
      jest.spyOn(DataRecoveryService, 'getRecoverySession')
          .mockResolvedValue({ ...mockRecoverySession, status: 'scanning' });
    });

    it('should cancel recovery successfully', async () => {
      const result = await DataRecoveryService.cancelRecovery('recovery-123', 'user-123');

      expect(DataRecoveryService.getRecoverySession).toHaveBeenCalledWith('recovery-123', 'user-123');
      expect(mockDataRecovery.cancel).toHaveBeenCalled();
      expect(deleteCache).toHaveBeenCalledWith('recovery:recovery-123');
      expect(logger.info).toHaveBeenCalledWith(
        'Recovery session cancelled',
        { recoveryId: 'recovery-123', userId: 'user-123' }
      );
    });

    it('should throw error if recovery cannot be cancelled', async () => {
      jest.spyOn(DataRecoveryService, 'getRecoverySession')
          .mockResolvedValue({ ...mockRecoverySession, status: 'completed' });

      await expect(DataRecoveryService.cancelRecovery('recovery-123', 'user-123'))
        .rejects.toThrow('Cannot cancel recovery session in current status');
    });

    it('should allow cancelling valid statuses', async () => {
      const validStatuses = ['pending', 'scanning', 'analyzing', 'recovering', 'paused'];

      for (const status of validStatuses) {
        jest.spyOn(DataRecoveryService, 'getRecoverySession')
            .mockResolvedValue({ ...mockRecoverySession, status });

        await expect(DataRecoveryService.cancelRecovery('recovery-123', 'user-123'))
          .resolves.toBeDefined();
      }
    });
  });

  describe('pauseRecovery', () => {
    beforeEach(() => {
      jest.spyOn(DataRecoveryService, 'getRecoverySession')
          .mockResolvedValue({ ...mockRecoverySession, status: 'scanning' });
    });

    it('should pause recovery successfully', async () => {
      const result = await DataRecoveryService.pauseRecovery('recovery-123', 'user-123');

      expect(DataRecoveryService.getRecoverySession).toHaveBeenCalledWith('recovery-123', 'user-123');
      expect(mockDataRecovery.pause).toHaveBeenCalled();
      expect(deleteCache).toHaveBeenCalledWith('recovery:recovery-123');
      expect(logger.info).toHaveBeenCalledWith(
        'Recovery session paused',
        { recoveryId: 'recovery-123', userId: 'user-123' }
      );
    });

    it('should throw error if recovery cannot be paused', async () => {
      jest.spyOn(DataRecoveryService, 'getRecoverySession')
          .mockResolvedValue({ ...mockRecoverySession, status: 'completed' });

      await expect(DataRecoveryService.pauseRecovery('recovery-123', 'user-123'))
        .rejects.toThrow('Cannot pause recovery session in current status');
    });

    it('should allow pausing valid statuses', async () => {
      const validStatuses = ['scanning', 'analyzing', 'recovering'];

      for (const status of validStatuses) {
        jest.spyOn(DataRecoveryService, 'getRecoverySession')
            .mockResolvedValue({ ...mockRecoverySession, status });

        await expect(DataRecoveryService.pauseRecovery('recovery-123', 'user-123'))
          .resolves.toBeDefined();
      }
    });
  });

  describe('resumeRecovery', () => {
    beforeEach(() => {
      jest.spyOn(DataRecoveryService, 'getRecoverySession')
          .mockResolvedValue({ ...mockRecoverySession, status: 'paused' });
      jest.spyOn(DataRecoveryService, 'processRecovery').mockImplementation(() => {});
    });

    it('should resume recovery successfully', async () => {
      const result = await DataRecoveryService.resumeRecovery('recovery-123', 'user-123');

      expect(DataRecoveryService.getRecoverySession).toHaveBeenCalledWith('recovery-123', 'user-123');
      expect(mockDataRecovery.resume).toHaveBeenCalled();
      expect(DataRecoveryService.processRecovery).toHaveBeenCalledWith('recovery-123');
      expect(logger.info).toHaveBeenCalledWith(
        'Recovery session resumed',
        { recoveryId: 'recovery-123', userId: 'user-123' }
      );
    });

    it('should throw error if recovery is not paused', async () => {
      jest.spyOn(DataRecoveryService, 'getRecoverySession')
          .mockResolvedValue({ ...mockRecoverySession, status: 'scanning' });

      await expect(DataRecoveryService.resumeRecovery('recovery-123', 'user-123'))
        .rejects.toThrow('Can only resume paused recovery sessions');
    });
  });

  describe('processRecovery', () => {
    beforeEach(() => {
      jest.spyOn(DataRecoveryService, 'simulateScanning').mockResolvedValue();
      jest.spyOn(DataRecoveryService, 'simulateAnalyzing').mockResolvedValue();
      jest.spyOn(DataRecoveryService, 'simulateRecovering').mockResolvedValue();
    });

    it('should process recovery through all phases', async () => {
      await DataRecoveryService.processRecovery('recovery-123');

      expect(DataRecovery.findById).toHaveBeenCalledWith('recovery-123');
      expect(mockDataRecovery.updateStatus).toHaveBeenCalledWith('scanning');
      expect(DataRecoveryService.simulateScanning).toHaveBeenCalledWith(mockDataRecovery);
      expect(mockDataRecovery.updateStatus).toHaveBeenCalledWith('analyzing');
      expect(DataRecoveryService.simulateAnalyzing).toHaveBeenCalledWith(mockDataRecovery);
      expect(mockDataRecovery.updateStatus).toHaveBeenCalledWith('recovering');
      expect(DataRecoveryService.simulateRecovering).toHaveBeenCalledWith(mockDataRecovery);
      expect(mockDataRecovery.complete).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        'Recovery completed',
        expect.objectContaining({ recoveryId: 'recovery-123' })
      );
    });

    it('should handle recovery session not found', async () => {
      DataRecovery.findById.mockResolvedValue(null);

      await expect(DataRecoveryService.processRecovery('recovery-123'))
        .rejects.toThrow('Recovery session not found');
    });

    it('should mark recovery as failed on error', async () => {
      const error = new Error('Processing failed');
      DataRecoveryService.simulateScanning.mockRejectedValue(error);

      await DataRecoveryService.processRecovery('recovery-123');

      expect(mockDataRecovery.markAsFailed).toHaveBeenCalledWith('Processing failed');
      expect(logger.error).toHaveBeenCalledWith(
        'Error processing recovery',
        expect.objectContaining({ error: 'Processing failed' })
      );
    });
  });

  describe('getRecoveryStats', () => {
    it('should return recovery statistics', async () => {
      const result = await DataRecoveryService.getRecoveryStats('user-123', '30 days');

      expect(DataRecovery.getRecoveryStats).toHaveBeenCalledWith('user-123', '30 days');
      expect(result).toEqual({
        total_sessions: 10,
        successful_sessions: 8,
        average_success_rate: 85
      });
    });

    it('should handle no user ID provided', async () => {
      await DataRecoveryService.getRecoveryStats(null, '7 days');

      expect(DataRecovery.getRecoveryStats).toHaveBeenCalledWith(null, '7 days');
    });

    it('should use default time range', async () => {
      await DataRecoveryService.getRecoveryStats('user-123');

      expect(DataRecovery.getRecoveryStats).toHaveBeenCalledWith('user-123', '30 days');
    });
  });

  describe('getActiveRecoveries', () => {
    it('should return active recovery sessions', async () => {
      const result = await DataRecoveryService.getActiveRecoveries('user-123');

      expect(DataRecovery.getActiveSessions).toHaveBeenCalledWith('user-123');
      expect(result).toEqual([]);
    });

    it('should handle no user ID provided', async () => {
      await DataRecoveryService.getActiveRecoveries();

      expect(DataRecovery.getActiveSessions).toHaveBeenCalledWith(null);
    });
  });

  describe('cleanupOldSessions', () => {
    it('should cleanup old sessions with default days', async () => {
      const result = await DataRecoveryService.cleanupOldSessions();

      expect(DataRecovery.cleanupOldSessions).toHaveBeenCalledWith(90);
      expect(result).toBe(5);
      expect(logger.info).toHaveBeenCalledWith('Cleaned up 5 old recovery sessions');
    });

    it('should cleanup old sessions with custom days', async () => {
      await DataRecoveryService.cleanupOldSessions(30);

      expect(DataRecovery.cleanupOldSessions).toHaveBeenCalledWith(30);
    });
  });

  describe('getRecoveryProgress', () => {
    beforeEach(() => {
      jest.spyOn(DataRecoveryService, 'getRecoverySession')
          .mockResolvedValue({
            ...mockRecoverySession,
            progress: 75,
            total_files: 1000,
            recovered_files: 750,
            failed_files: 50,
            getSuccessRate: () => 85,
            getEstimatedTimeRemaining: () => 300000
          });
    });

    it('should return recovery progress', async () => {
      const result = await DataRecoveryService.getRecoveryProgress('recovery-123', 'user-123');

      expect(DataRecoveryService.getRecoverySession).toHaveBeenCalledWith('recovery-123', 'user-123');
      expect(result).toEqual({
        id: 'recovery-123',
        status: 'pending',
        progress: 75,
        total_files: 1000,
        recovered_files: 750,
        failed_files: 50,
        success_rate: 85,
        estimated_time_remaining: 300000,
        file_types: [],
        scan_results: {}
      });
    });

    it('should handle session without helper methods', async () => {
      jest.spyOn(DataRecoveryService, 'getRecoverySession')
          .mockResolvedValue(mockRecoverySession);

      const result = await DataRecoveryService.getRecoveryProgress('recovery-123', 'user-123');

      expect(result.success_rate).toBe(0);
      expect(result.estimated_time_remaining).toBeNull();
    });
  });

  describe('validateRecoveryOptions', () => {
    it('should validate deleted_files options', () => {
      const validOptions = {
        file_types: ['jpg', 'png'],
        date_range: '2024-01-01',
        deep_scan: true
      };

      expect(() => {
        DataRecoveryService.validateRecoveryOptions('deleted_files', validOptions);
      }).not.toThrow();
    });

    it('should validate formatted_drive options', () => {
      const validOptions = {
        partition_type: 'NTFS',
        file_system: 'ext4',
        deep_scan: true
      };

      expect(() => {
        DataRecoveryService.validateRecoveryOptions('formatted_drive', validOptions);
      }).not.toThrow();
    });

    it('should throw error for invalid options', () => {
      const invalidOptions = {
        invalid_option: 'value',
        another_invalid: true
      };

      expect(() => {
        DataRecoveryService.validateRecoveryOptions('deleted_files', invalidOptions);
      }).toThrow('Invalid options for recovery type deleted_files: invalid_option, another_invalid');
    });

    it('should handle unknown recovery type', () => {
      const options = { some_option: 'value' };

      expect(() => {
        DataRecoveryService.validateRecoveryOptions('unknown_type', options);
      }).toThrow('Invalid options for recovery type unknown_type: some_option');
    });

    it('should validate all recovery types with their specific options', () => {
      const testCases = [
        { type: 'deleted_files', options: { file_types: ['jpg'] } },
        { type: 'formatted_drive', options: { partition_type: 'NTFS' } },
        { type: 'corrupted_files', options: { repair_mode: 'auto' } },
        { type: 'system_crash', options: { boot_sector_recovery: true } },
        { type: 'virus_attack', options: { quarantine_scan: true } },
        { type: 'hardware_failure', options: { sector_analysis: true } }
      ];

      testCases.forEach(({ type, options }) => {
        expect(() => {
          DataRecoveryService.validateRecoveryOptions(type, options);
        }).not.toThrow();
      });
    });
  });

  describe('generateFileTypes', () => {
    it('should generate file types with random counts', () => {
      const fileTypes = DataRecoveryService.generateFileTypes();

      expect(Array.isArray(fileTypes)).toBe(true);
      fileTypes.forEach(type => {
        expect(type).toHaveProperty('extension');
        expect(type).toHaveProperty('count');
        expect(type).toHaveProperty('total_size');
        expect(type.count).toBeGreaterThan(0);
      });
    });

    it('should filter out types with zero count', () => {
      // Mock Math.random to return 0 for some types
      const originalRandom = Math.random;
      let callCount = 0;
      Math.random = jest.fn(() => {
        callCount++;
        return callCount % 2 === 0 ? 0 : 0.5; // Alternate between 0 and 0.5
      });

      const fileTypes = DataRecoveryService.generateFileTypes();

      // Should only include types where count > 0
      fileTypes.forEach(type => {
        expect(type.count).toBeGreaterThan(0);
      });

      Math.random = originalRandom;
    });
  });
});