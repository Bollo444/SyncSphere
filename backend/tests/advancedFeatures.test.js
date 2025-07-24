const request = require('supertest');
const app = require('../src/app');
const AdvancedSession = require('../src/models/AdvancedSession');
const ScreenUnlockService = require('../src/services/advanced/screenUnlockService');
const SystemRepairService = require('../src/services/advanced/systemRepairService');
const DataEraserService = require('../src/services/advanced/dataEraserService');

// Mock Device model specifically for this test
jest.mock('../src/models/Device', () => {
  return {
    findById: jest.fn().mockImplementation((id) => {
      // Return null for invalid device IDs
      if (id === 'invalid-device-id' || id.includes('invalid')) {
        return Promise.resolve(null);
      }
      
      // Return a mock device for valid IDs
      const mockDevice = {
        _id: id,
        userId: '123e4567-e89b-12d3-a456-426614174000',
        deviceName: 'Test Device',
        deviceType: 'iOS',
        model: 'iPhone 12',
        osVersion: '15.0',
        serialNumber: 'TEST123'
      };
      mockDevice.save = jest.fn().mockResolvedValue(mockDevice);
      return Promise.resolve(mockDevice);
    }),
    connect: jest.fn().mockImplementation((deviceData) => {
      const mockDevice = {
        _id: `mock-device-id-${Date.now()}`,
        id: `mock-device-id-${Date.now()}`,
        userId: '123e4567-e89b-12d3-a456-426614174000',
        deviceName: deviceData.deviceName || 'Test Device',
        deviceType: deviceData.deviceType || 'ios',
        model: deviceData.deviceModel || 'iPhone 12',
        osVersion: deviceData.osVersion || '15.0',
        serialNumber: deviceData.serialNumber || 'TEST123456789',
        isConnected: true,
        lastSeen: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...deviceData
      };
       
      mockDevice.save = jest.fn().mockResolvedValue(mockDevice);
      return Promise.resolve(mockDevice);
    })
  };
});

describe('Advanced Features', () => {
  let testUser;
  let authToken;
  let testDevice;
  let advancedSession;
  
  beforeEach(async () => {
    // Clean up any existing test data
    await global.testHelpers.cleanupTestData();
    
    // Create test user and get auth token
    testUser = await global.testHelpers.createTestUser();
    authToken = global.testHelpers.generateTestToken(testUser);
    
    // Create test device
    testDevice = await global.testHelpers.createTestDevice({
      userId: testUser._id,
      deviceName: 'Test iPhone',
      deviceType: 'iOS',
      status: 'connected'
    });
  });
  
  afterEach(async () => {
    // Clean up test data after each test
    await global.testHelpers.cleanupTestData();
  });
  
  describe('Screen Unlock Service', () => {
    describe('POST /api/advanced/screen-unlock/start', () => {
      const unlockData = {
        deviceId: null, // Will be set in beforeEach
        unlockMethod: 'pin_bruteforce',
        options: {
          pinLength: 4,
          startFrom: '0000',
          maxAttempts: 10000
        }
      };
      
      beforeEach(() => {
        unlockData.deviceId = testDevice._id.toString();
      });
      
      it('should start screen unlock session successfully', async () => {
        const response = await request(app)
          .post('/api/advanced/screen-unlock/start')
          .set('Authorization', `Bearer ${authToken}`)
          .send(unlockData)
          .expect(201);
        
        expect(response.body.success).toBe(true);
        expect(response.body.data.session).toBeDefined();
        expect(response.body.data.session.deviceId).toBe(unlockData.deviceId);
        expect(response.body.data.session.serviceType).toBe('screen_unlock');
        expect(response.body.data.session.status).toBe('running');
      });
      
      it('should fail with invalid unlock method', async () => {
        const invalidData = {
          ...unlockData,
          unlockMethod: 'invalid_method'
        };
        
        const response = await request(app)
          .post('/api/advanced/screen-unlock/start')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidData)
          .expect(400);
        
        expect(response.body.success).toBe(false);
      });
      
      it('should fail with invalid device ID', async () => {
        const invalidData = {
          ...unlockData,
          deviceId: 'invalid-device-id'
        };
        
        const response = await request(app)
          .post('/api/advanced/screen-unlock/start')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidData)
          .expect(400);
        
        expect(response.body.success).toBe(false);
      });
      
      it('should fail without authentication', async () => {
        const response = await request(app)
          .post('/api/advanced/screen-unlock/start')
          .send(unlockData)
          .expect(401);
        
        expect(response.body.success).toBe(false);
      });
      
      it('should support pattern analysis method', async () => {
        const patternData = {
          ...unlockData,
          unlockMethod: 'pattern_analysis',
          options: {
            patternSize: '3x3',
            commonPatterns: true,
            customPatterns: ['L', 'Z', 'C']
          }
        };
        
        const response = await request(app)
          .post('/api/advanced/screen-unlock/start')
          .set('Authorization', `Bearer ${authToken}`)
          .send(patternData)
          .expect(201);
        
        expect(response.body.success).toBe(true);
        expect(response.body.data.session.unlockMethod).toBe('pattern_analysis');
      });
      
      it('should support password dictionary method', async () => {
        const passwordData = {
          ...unlockData,
          unlockMethod: 'password_dictionary',
          options: {
            dictionaryType: 'common_passwords',
            includePersonalInfo: true,
            customWords: ['test123', 'password']
          }
        };
        
        const response = await request(app)
          .post('/api/advanced/screen-unlock/start')
          .set('Authorization', `Bearer ${authToken}`)
          .send(passwordData)
          .expect(201);
        
        expect(response.body.success).toBe(true);
        expect(response.body.data.session.unlockMethod).toBe('password_dictionary');
      });
    });
    
    describe('GET /api/advanced/screen-unlock/sessions/:id/progress', () => {
      beforeEach(async () => {
        advancedSession = new AdvancedSession({
          userId: testUser._id,
          deviceId: testDevice._id,
          serviceType: 'screen_unlock',
          unlockMethod: 'pin_bruteforce',
          status: 'running',
          startedAt: new Date(),
          progress: {
            currentAttempt: 1250,
            totalAttempts: 10000,
            percentage: 12.5,
            estimatedTimeRemaining: 3600000 // 1 hour in ms
          }
        });
        await advancedSession.save();
      });
      
      it('should get unlock progress successfully', async () => {
        const response = await request(app)
          .get(`/api/advanced/screen-unlock/sessions/${advancedSession._id}/progress`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(response.body.data.progress).toBeDefined();
        expect(response.body.data.progress.percentage).toBe(12.5);
        expect(response.body.data.progress.currentAttempt).toBe(1250);
      });
      
      it('should fail for non-existent session', async () => {
        const fakeId = '507f1f77bcf86cd799439011';
        const response = await request(app)
          .get(`/api/advanced/screen-unlock/sessions/${fakeId}/progress`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(404);
        
        expect(response.body.success).toBe(false);
      });
      
      it('should fail without authentication', async () => {
        const response = await request(app)
          .get(`/api/advanced/screen-unlock/sessions/${advancedSession._id}/progress`)
          .expect(401);
        
        expect(response.body.success).toBe(false);
      });
    });
  });
  
  describe('System Repair Service', () => {
    describe('POST /api/advanced/system-repair/start', () => {
      const repairData = {
        deviceId: null, // Will be set in beforeEach
        repairType: 'ios_system_recovery',
        issues: ['boot_loop', 'white_screen', 'stuck_apple_logo'],
        repairMode: 'standard'
      };
      
      beforeEach(() => {
        repairData.deviceId = testDevice._id.toString();
      });
      
      it('should start system repair session successfully', async () => {
        const response = await request(app)
          .post('/api/advanced/system-repair/start')
          .set('Authorization', `Bearer ${authToken}`)
          .send(repairData)
          .expect(201);
        
        expect(response.body.success).toBe(true);
        expect(response.body.data.session).toBeDefined();
        expect(response.body.data.session.serviceType).toBe('system_repair');
        expect(response.body.data.session.repairType).toBe('ios_system_recovery');
        expect(response.body.data.session.status).toBe('scanning');
      });
      
      it('should fail with invalid repair type', async () => {
        const invalidData = {
          ...repairData,
          repairType: 'invalid_repair_type'
        };
        
        const response = await request(app)
          .post('/api/advanced/system-repair/start')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidData)
          .expect(400);
        
        expect(response.body.success).toBe(false);
      });
      
      it('should support Android system repair', async () => {
        // Update device to Android
        testDevice.deviceType = 'Android';
        await testDevice.save();
        
        const androidRepairData = {
          ...repairData,
          repairType: 'android_system_recovery',
          issues: ['bootloader_corruption', 'system_partition_error']
        };
        
        const response = await request(app)
          .post('/api/advanced/system-repair/start')
          .set('Authorization', `Bearer ${authToken}`)
          .send(androidRepairData)
          .expect(201);
        
        expect(response.body.success).toBe(true);
        expect(response.body.data.session.repairType).toBe('android_system_recovery');
      });
      
      it('should support advanced repair mode', async () => {
        const advancedRepairData = {
          ...repairData,
          repairMode: 'advanced',
          preserveData: false
        };
        
        const response = await request(app)
          .post('/api/advanced/system-repair/start')
          .set('Authorization', `Bearer ${authToken}`)
          .send(advancedRepairData)
          .expect(201);
        
        expect(response.body.success).toBe(true);
        expect(response.body.data.session.repairMode).toBe('advanced');
      });
      
      it('should fail without authentication', async () => {
        const response = await request(app)
          .post('/api/advanced/system-repair/start')
          .send(repairData)
          .expect(401);
        
        expect(response.body.success).toBe(false);
      });
    });
    
    describe('GET /api/advanced/system-repair/sessions/:id/diagnosis', () => {
      beforeEach(async () => {
        advancedSession = new AdvancedSession({
          userId: testUser._id,
          deviceId: testDevice._id,
          serviceType: 'system_repair',
          repairType: 'ios_system_recovery',
          status: 'completed',
          startedAt: new Date(),
          completedAt: new Date(),
          diagnosis: {
            detectedIssues: [
              {
                issue: 'corrupted_system_files',
                severity: 'high',
                description: 'Critical system files are corrupted',
                fixable: true
              },
              {
                issue: 'bootloader_damage',
                severity: 'medium',
                description: 'Bootloader has minor corruption',
                fixable: true
              }
            ],
            systemHealth: 65,
            recommendedActions: ['system_restore', 'firmware_update']
          }
        });
        await advancedSession.save();
      });
      
      it('should get system diagnosis successfully', async () => {
        const response = await request(app)
          .get(`/api/advanced/system-repair/sessions/${advancedSession._id}/diagnosis`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(response.body.data.diagnosis).toBeDefined();
        expect(response.body.data.diagnosis.detectedIssues).toHaveLength(2);
        expect(response.body.data.diagnosis.systemHealth).toBe(65);
      });
      
      it('should fail for incomplete diagnosis', async () => {
        // Update session to running status
        advancedSession.status = 'scanning';
        advancedSession.diagnosis = undefined;
        await advancedSession.save();
        
        const response = await request(app)
          .get(`/api/advanced/system-repair/sessions/${advancedSession._id}/diagnosis`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
        
        expect(response.body.success).toBe(false);
      });
      
      it('should fail without authentication', async () => {
        const response = await request(app)
          .get(`/api/advanced/system-repair/sessions/${advancedSession._id}/diagnosis`)
          .expect(401);
        
        expect(response.body.success).toBe(false);
      });
    });
  });
  
  describe('Data Eraser Service', () => {
    describe('POST /api/advanced/data-eraser/start', () => {
      const eraseData = {
        deviceId: null, // Will be set in beforeEach
        eraseMethod: 'dod_5220_22_m',
        dataCategories: ['photos', 'videos', 'documents', 'messages'],
        securityLevel: 'high',
        verifyErasure: true
      };
      
      beforeEach(() => {
        eraseData.deviceId = testDevice._id.toString();
      });
      
      it('should start data erasure session successfully', async () => {
        const response = await request(app)
          .post('/api/advanced/data-eraser/start')
          .set('Authorization', `Bearer ${authToken}`)
          .send(eraseData)
          .expect(201);
        
        expect(response.body.success).toBe(true);
        expect(response.body.data.session).toBeDefined();
        expect(response.body.data.session.serviceType).toBe('data_eraser');
        expect(response.body.data.session.eraseMethod).toBe('dod_5220_22_m');
        expect(response.body.data.session.status).toBe('preparing');
      });
      
      it('should fail with invalid erase method', async () => {
        const invalidData = {
          ...eraseData,
          eraseMethod: 'invalid_method'
        };
        
        const response = await request(app)
          .post('/api/advanced/data-eraser/start')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidData)
          .expect(400);
        
        expect(response.body.success).toBe(false);
      });
      
      it('should support quick erase method', async () => {
        const quickEraseData = {
          ...eraseData,
          eraseMethod: 'quick_erase',
          securityLevel: 'low'
        };
        
        const response = await request(app)
          .post('/api/advanced/data-eraser/start')
          .set('Authorization', `Bearer ${authToken}`)
          .send(quickEraseData)
          .expect(201);
        
        expect(response.body.success).toBe(true);
        expect(response.body.data.session.eraseMethod).toBe('quick_erase');
      });
      
      it('should support Gutmann method', async () => {
        const gutmannData = {
          ...eraseData,
          eraseMethod: 'gutmann',
          securityLevel: 'maximum',
          passes: 35
        };
        
        const response = await request(app)
          .post('/api/advanced/data-eraser/start')
          .set('Authorization', `Bearer ${authToken}`)
          .send(gutmannData)
          .expect(201);
        
        expect(response.body.success).toBe(true);
        expect(response.body.data.session.eraseMethod).toBe('gutmann');
      });
      
      it('should fail with empty data categories', async () => {
        const invalidData = {
          ...eraseData,
          dataCategories: []
        };
        
        const response = await request(app)
          .post('/api/advanced/data-eraser/start')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidData)
          .expect(400);
        
        expect(response.body.success).toBe(false);
      });
      
      it('should fail without authentication', async () => {
        const response = await request(app)
          .post('/api/advanced/data-eraser/start')
          .send(eraseData)
          .expect(401);
        
        expect(response.body.success).toBe(false);
      });
    });
    
    describe('GET /api/advanced/data-eraser/sessions/:id/verification', () => {
      beforeEach(async () => {
        advancedSession = new AdvancedSession({
          userId: testUser._id,
          deviceId: testDevice._id,
          serviceType: 'data_eraser',
          eraseMethod: 'dod_5220_22_m',
          status: 'completed',
          startedAt: new Date(),
          completedAt: new Date(),
          verification: {
            verified: true,
            verificationMethod: 'forensic_scan',
            dataRecoverable: false,
            confidence: 99.8,
            verifiedCategories: {
              photos: { erased: 1250, verified: 1250, recoverable: 0 },
              videos: { erased: 85, verified: 85, recoverable: 0 },
              documents: { erased: 340, verified: 340, recoverable: 0 }
            }
          }
        });
        await advancedSession.save();
      });
      
      it('should get erasure verification successfully', async () => {
        const response = await request(app)
          .get(`/api/advanced/data-eraser/sessions/${advancedSession._id}/verification`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(response.body.data.verification).toBeDefined();
        expect(response.body.data.verification.verified).toBe(true);
        expect(response.body.data.verification.confidence).toBe(99.8);
        expect(response.body.data.verification.verifiedCategories).toBeDefined();
      });
      
      it('should fail for incomplete verification', async () => {
        // Update session to running status
        advancedSession.status = 'erasing';
        advancedSession.verification = undefined;
        await advancedSession.save();
        
        const response = await request(app)
          .get(`/api/advanced/data-eraser/sessions/${advancedSession._id}/verification`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
        
        expect(response.body.success).toBe(false);
      });
      
      it('should fail without authentication', async () => {
        const response = await request(app)
          .get(`/api/advanced/data-eraser/sessions/${advancedSession._id}/verification`)
          .expect(401);
        
        expect(response.body.success).toBe(false);
      });
    });
  });
  
  describe('Common Advanced Features Operations', () => {
    describe('GET /api/advanced/sessions', () => {
      beforeEach(async () => {
        // Create multiple advanced sessions
        const session1 = new AdvancedSession({
          userId: testUser._id,
          deviceId: testDevice._id,
          serviceType: 'screen_unlock',
          unlockMethod: 'pin_bruteforce',
          status: 'completed',
          startedAt: new Date(Date.now() - 86400000), // 1 day ago
          completedAt: new Date(Date.now() - 82800000) // 23 hours ago
        });
        await session1.save();
        
        const session2 = new AdvancedSession({
          userId: testUser._id,
          deviceId: testDevice._id,
          serviceType: 'system_repair',
          repairType: 'ios_system_recovery',
          status: 'running',
          startedAt: new Date()
        });
        await session2.save();
        
        const session3 = new AdvancedSession({
          userId: testUser._id,
          deviceId: testDevice._id,
          serviceType: 'data_eraser',
          eraseMethod: 'quick_erase',
          status: 'failed',
          startedAt: new Date(Date.now() - 172800000), // 2 days ago
          error: 'Device disconnected during operation'
        });
        await session3.save();
      });
      
      it('should get all advanced sessions successfully', async () => {
        const response = await request(app)
          .get('/api/advanced/sessions')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(response.body.data.sessions).toBeDefined();
        expect(response.body.data.sessions.length).toBe(3);
        expect(response.body.data.pagination).toBeDefined();
      });
      
      it('should filter sessions by service type', async () => {
        const response = await request(app)
          .get('/api/advanced/sessions?serviceType=screen_unlock')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(response.body.data.sessions.length).toBe(1);
        expect(response.body.data.sessions[0].serviceType).toBe('screen_unlock');
      });
      
      it('should filter sessions by status', async () => {
        const response = await request(app)
          .get('/api/advanced/sessions?status=completed')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(response.body.data.sessions.length).toBe(1);
        expect(response.body.data.sessions[0].status).toBe('completed');
      });
      
      it('should support pagination', async () => {
        const response = await request(app)
          .get('/api/advanced/sessions?page=1&limit=2')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(response.body.data.sessions.length).toBe(2);
        expect(response.body.data.pagination.page).toBe(1);
        expect(response.body.data.pagination.limit).toBe(2);
      });
      
      it('should fail without authentication', async () => {
        const response = await request(app)
          .get('/api/advanced/sessions')
          .expect(401);
        
        expect(response.body.success).toBe(false);
      });
    });
    
    describe('POST /api/advanced/sessions/:id/stop', () => {
      beforeEach(async () => {
        advancedSession = new AdvancedSession({
          userId: testUser._id,
          deviceId: testDevice._id,
          serviceType: 'screen_unlock',
          unlockMethod: 'pin_bruteforce',
          status: 'running',
          startedAt: new Date()
        });
        await advancedSession.save();
      });
      
      it('should stop advanced session successfully', async () => {
        const response = await request(app)
          .post(`/api/advanced/sessions/${advancedSession._id}/stop`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
        
        expect(response.body.success).toBe(true);
        expect(response.body.data.session.status).toBe('stopped');
      });
      
      it('should fail to stop completed session', async () => {
        // Update session to completed
        advancedSession.status = 'completed';
        await advancedSession.save();
        
        const response = await request(app)
          .post(`/api/advanced/sessions/${advancedSession._id}/stop`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);
        
        expect(response.body.success).toBe(false);
      });
      
      it('should fail without authentication', async () => {
        const response = await request(app)
          .post(`/api/advanced/sessions/${advancedSession._id}/stop`)
          .expect(401);
        
        expect(response.body.success).toBe(false);
      });
    });
  });
});