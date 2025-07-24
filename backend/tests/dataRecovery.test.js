const request = require('supertest');
const app = require('../src/app');
const DataRecoveryService = require('../src/services/dataRecovery/dataRecoveryService');
const RecoverySession = require('../src/models/RecoverySession');

describe('Data Recovery', () => {
  let testUser;
  let authToken;
  let testDevice;
  let recoverySession;
  
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
      deviceType: 'iOS'
    });
  });
  
  afterEach(async () => {
    // Clean up test data after each test
    await global.testHelpers.cleanupTestData();
  });
  
  describe('POST /api/recovery/start', () => {
    const recoveryData = {
      deviceId: null, // Will be set in beforeEach
      recoveryType: 'deleted_files',
      scanDepth: 'deep',
      fileTypes: ['photos', 'videos', 'documents']
    };
    
    beforeEach(() => {
      recoveryData.deviceId = testDevice._id.toString();
    });
    
    it('should start recovery session successfully', async () => {
      const response = await request(app)
        .post('/api/recovery/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send(recoveryData)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.session).toBeDefined();
      expect(response.body.data.session.deviceId).toBe(recoveryData.deviceId);
      expect(response.body.data.session.recoveryType).toBe(recoveryData.recoveryType);
      expect(response.body.data.session.status).toBe('scanning');
    });
    
    it('should fail with invalid device ID', async () => {
      const invalidData = {
        ...recoveryData,
        deviceId: 'invalid-device-id'
      };
      
      const response = await request(app)
        .post('/api/recovery/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
    
    it('should fail with invalid recovery type', async () => {
      const invalidData = {
        ...recoveryData,
        recoveryType: 'invalid_type'
      };
      
      const response = await request(app)
        .post('/api/recovery/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/recovery/start')
        .send(recoveryData)
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail if device belongs to another user', async () => {
      const otherUser = await global.testHelpers.createTestUser({ email: 'other@example.com' });
      const otherDevice = await global.testHelpers.createTestDevice({
        userId: otherUser._id,
        deviceName: 'Other Device'
      });
      
      const invalidData = {
        ...recoveryData,
        deviceId: otherDevice._id.toString()
      };
      
      const response = await request(app)
        .post('/api/recovery/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(403);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('GET /api/recovery/sessions', () => {
    beforeEach(async () => {
      // Create test recovery sessions
      recoverySession = new RecoverySession({
        userId: testUser._id,
        deviceId: testDevice._id,
        recoveryType: 'deleted_files',
        status: 'completed',
        scanDepth: 'deep',
        fileTypes: ['photos', 'videos'],
        startedAt: new Date(),
        completedAt: new Date(),
        filesFound: 150,
        filesRecovered: 120
      });
      await recoverySession.save();
      
      const session2 = new RecoverySession({
        userId: testUser._id,
        deviceId: testDevice._id,
        recoveryType: 'system_restore',
        status: 'scanning',
        scanDepth: 'quick',
        startedAt: new Date()
      });
      await session2.save();
    });
    
    it('should get user recovery sessions successfully', async () => {
      const response = await request(app)
        .get('/api/recovery/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.sessions).toBeDefined();
      expect(response.body.data.sessions.length).toBe(2);
      expect(response.body.data.pagination).toBeDefined();
    });
    
    it('should filter sessions by status', async () => {
      const response = await request(app)
        .get('/api/recovery/sessions?status=completed')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.sessions.length).toBe(1);
      expect(response.body.data.sessions[0].status).toBe('completed');
    });
    
    it('should filter sessions by recovery type', async () => {
      const response = await request(app)
        .get('/api/recovery/sessions?recoveryType=deleted_files')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.sessions.length).toBe(1);
      expect(response.body.data.sessions[0].recoveryType).toBe('deleted_files');
    });
    
    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/recovery/sessions?page=1&limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.sessions.length).toBe(1);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(1);
    });
    
    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/recovery/sessions')
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('GET /api/recovery/sessions/:id', () => {
    beforeEach(async () => {
      recoverySession = new RecoverySession({
        userId: testUser._id,
        deviceId: testDevice._id,
        recoveryType: 'deleted_files',
        status: 'completed',
        scanDepth: 'deep',
        fileTypes: ['photos'],
        startedAt: new Date(),
        completedAt: new Date(),
        filesFound: 50,
        filesRecovered: 45,
        recoveredFiles: [
          {
            fileName: 'photo1.jpg',
            filePath: '/DCIM/Camera/photo1.jpg',
            fileSize: 2048576,
            fileType: 'image/jpeg',
            recoveredAt: new Date()
          }
        ]
      });
      await recoverySession.save();
    });
    
    it('should get recovery session details successfully', async () => {
      const response = await request(app)
        .get(`/api/recovery/sessions/${recoverySession._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.session).toBeDefined();
      expect(response.body.data.session._id).toBe(recoverySession._id.toString());
      expect(response.body.data.session.recoveredFiles).toBeDefined();
    });
    
    it('should fail with invalid session ID', async () => {
      const response = await request(app)
        .get('/api/recovery/sessions/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail for non-existent session', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/recovery/sessions/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail without authentication', async () => {
      const response = await request(app)
        .get(`/api/recovery/sessions/${recoverySession._id}`)
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('POST /api/recovery/sessions/:id/pause', () => {
    beforeEach(async () => {
      recoverySession = new RecoverySession({
        userId: testUser._id,
        deviceId: testDevice._id,
        recoveryType: 'deleted_files',
        status: 'scanning',
        scanDepth: 'deep',
        startedAt: new Date()
      });
      await recoverySession.save();
    });
    
    it('should pause recovery session successfully', async () => {
      const response = await request(app)
        .post(`/api/recovery/sessions/${recoverySession._id}/pause`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.session.status).toBe('paused');
    });
    
    it('should fail to pause completed session', async () => {
      // Update session to completed
      recoverySession.status = 'completed';
      await recoverySession.save();
      
      const response = await request(app)
        .post(`/api/recovery/sessions/${recoverySession._id}/pause`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail without authentication', async () => {
      const response = await request(app)
        .post(`/api/recovery/sessions/${recoverySession._id}/pause`)
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('POST /api/recovery/sessions/:id/resume', () => {
    beforeEach(async () => {
      recoverySession = new RecoverySession({
        userId: testUser._id,
        deviceId: testDevice._id,
        recoveryType: 'deleted_files',
        status: 'paused',
        scanDepth: 'deep',
        startedAt: new Date()
      });
      await recoverySession.save();
    });
    
    it('should resume recovery session successfully', async () => {
      const response = await request(app)
        .post(`/api/recovery/sessions/${recoverySession._id}/resume`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.session.status).toBe('scanning');
    });
    
    it('should fail to resume non-paused session', async () => {
      // Update session to scanning
      recoverySession.status = 'scanning';
      await recoverySession.save();
      
      const response = await request(app)
        .post(`/api/recovery/sessions/${recoverySession._id}/resume`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail without authentication', async () => {
      const response = await request(app)
        .post(`/api/recovery/sessions/${recoverySession._id}/resume`)
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('POST /api/recovery/sessions/:id/cancel', () => {
    beforeEach(async () => {
      recoverySession = new RecoverySession({
        userId: testUser._id,
        deviceId: testDevice._id,
        recoveryType: 'deleted_files',
        status: 'scanning',
        scanDepth: 'deep',
        startedAt: new Date()
      });
      await recoverySession.save();
    });
    
    it('should cancel recovery session successfully', async () => {
      const response = await request(app)
        .post(`/api/recovery/sessions/${recoverySession._id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.session.status).toBe('cancelled');
    });
    
    it('should fail to cancel completed session', async () => {
      // Update session to completed
      recoverySession.status = 'completed';
      await recoverySession.save();
      
      const response = await request(app)
        .post(`/api/recovery/sessions/${recoverySession._id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail without authentication', async () => {
      const response = await request(app)
        .post(`/api/recovery/sessions/${recoverySession._id}/cancel`)
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('POST /api/recovery/sessions/:id/download', () => {
    beforeEach(async () => {
      recoverySession = new RecoverySession({
        userId: testUser._id,
        deviceId: testDevice._id,
        recoveryType: 'deleted_files',
        status: 'completed',
        scanDepth: 'deep',
        startedAt: new Date(),
        completedAt: new Date(),
        filesFound: 10,
        filesRecovered: 8,
        recoveredFiles: [
          {
            fileName: 'photo1.jpg',
            filePath: '/DCIM/Camera/photo1.jpg',
            fileSize: 2048576,
            fileType: 'image/jpeg',
            recoveredAt: new Date()
          }
        ]
      });
      await recoverySession.save();
    });
    
    it('should initiate download successfully', async () => {
      const downloadData = {
        fileIds: ['0'], // Index of files to download
        format: 'zip'
      };
      
      const response = await request(app)
        .post(`/api/recovery/sessions/${recoverySession._id}/download`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(downloadData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.downloadUrl).toBeDefined();
      expect(response.body.data.expiresAt).toBeDefined();
    });
    
    it('should fail for incomplete session', async () => {
      // Update session to scanning
      recoverySession.status = 'scanning';
      await recoverySession.save();
      
      const downloadData = {
        fileIds: ['0'],
        format: 'zip'
      };
      
      const response = await request(app)
        .post(`/api/recovery/sessions/${recoverySession._id}/download`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(downloadData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail with invalid file IDs', async () => {
      const downloadData = {
        fileIds: ['999'], // Non-existent file index
        format: 'zip'
      };
      
      const response = await request(app)
        .post(`/api/recovery/sessions/${recoverySession._id}/download`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(downloadData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail without authentication', async () => {
      const downloadData = {
        fileIds: ['0'],
        format: 'zip'
      };
      
      const response = await request(app)
        .post(`/api/recovery/sessions/${recoverySession._id}/download`)
        .send(downloadData)
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });
});