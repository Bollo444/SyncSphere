const request = require('supertest');
const app = require('../src/app');
const TransferSession = require('../src/models/TransferSession');
const PhoneTransferService = require('../src/services/phoneTransfer/phoneTransferService');

describe('Phone Transfer', () => {
  let testUser;
  let authToken;
  let sourceDevice;
  let targetDevice;
  let transferSession;
  
  beforeEach(async () => {
    // Clean up any existing test data
    await global.testHelpers.cleanupTestData();
    
    // Create test user and get auth token
    testUser = await global.testHelpers.createTestUser();
    authToken = global.testHelpers.generateTestToken(testUser);
    
    // Create test devices
    sourceDevice = await global.testHelpers.createTestDevice({
      userId: testUser._id,
      deviceName: 'Source iPhone',
      deviceType: 'iOS',
      status: 'connected'
    });
    
    targetDevice = await global.testHelpers.createTestDevice({
      userId: testUser._id,
      deviceName: 'Target iPhone',
      deviceType: 'iOS',
      status: 'connected'
    });
  });
  
  afterEach(async () => {
    // Clean up test data after each test
    await global.testHelpers.cleanupTestData();
  });
  
  describe('POST /api/transfer/start', () => {
    const transferData = {
      sourceDeviceId: null, // Will be set in beforeEach
      targetDeviceId: null, // Will be set in beforeEach
      transferType: 'full_transfer',
      dataTypes: ['contacts', 'photos', 'messages', 'apps'],
      transferMethod: 'wireless',
      overwriteExisting: false
    };
    
    beforeEach(() => {
      transferData.sourceDeviceId = sourceDevice._id.toString();
      transferData.targetDeviceId = targetDevice._id.toString();
    });
    
    it('should start transfer session successfully', async () => {
      const response = await request(app)
        .post('/api/transfer/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transferData)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.session).toBeDefined();
      expect(response.body.data.session.sourceDeviceId).toBe(transferData.sourceDeviceId);
      expect(response.body.data.session.targetDeviceId).toBe(transferData.targetDeviceId);
      expect(response.body.data.session.status).toBe('preparing');
    });
    
    it('should fail with same source and target device', async () => {
      const invalidData = {
        ...transferData,
        targetDeviceId: transferData.sourceDeviceId
      };
      
      const response = await request(app)
        .post('/api/transfer/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('same device');
    });
    
    it('should fail with invalid device IDs', async () => {
      const invalidData = {
        ...transferData,
        sourceDeviceId: 'invalid-device-id'
      };
      
      const response = await request(app)
        .post('/api/transfer/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
    
    it('should fail with invalid transfer type', async () => {
      const invalidData = {
        ...transferData,
        transferType: 'invalid_type'
      };
      
      const response = await request(app)
        .post('/api/transfer/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail with empty data types', async () => {
      const invalidData = {
        ...transferData,
        dataTypes: []
      };
      
      const response = await request(app)
        .post('/api/transfer/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/transfer/start')
        .send(transferData)
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail if devices belong to another user', async () => {
      const otherUser = await global.testHelpers.createTestUser({ email: 'other@example.com' });
      const otherDevice = await global.testHelpers.createTestDevice({
        userId: otherUser._id,
        deviceName: 'Other Device'
      });
      
      const invalidData = {
        ...transferData,
        sourceDeviceId: otherDevice._id.toString()
      };
      
      const response = await request(app)
        .post('/api/transfer/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(403);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('GET /api/transfer/sessions', () => {
    beforeEach(async () => {
      // Create test transfer sessions
      transferSession = new TransferSession({
        userId: testUser._id,
        sourceDeviceId: sourceDevice._id,
        targetDeviceId: targetDevice._id,
        transferType: 'full_transfer',
        dataTypes: ['contacts', 'photos'],
        transferMethod: 'wireless',
        status: 'completed',
        startedAt: new Date(),
        completedAt: new Date(),
        totalItems: 1000,
        transferredItems: 950,
        failedItems: 50
      });
      await transferSession.save();
      
      const session2 = new TransferSession({
        userId: testUser._id,
        sourceDeviceId: sourceDevice._id,
        targetDeviceId: targetDevice._id,
        transferType: 'selective_transfer',
        dataTypes: ['messages'],
        transferMethod: 'cable',
        status: 'transferring',
        startedAt: new Date(),
        totalItems: 500,
        transferredItems: 250
      });
      await session2.save();
    });
    
    it('should get user transfer sessions successfully', async () => {
      const response = await request(app)
        .get('/api/transfer/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.sessions).toBeDefined();
      expect(response.body.data.sessions.length).toBe(2);
      expect(response.body.data.pagination).toBeDefined();
    });
    
    it('should filter sessions by status', async () => {
      const response = await request(app)
        .get('/api/transfer/sessions?status=completed')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.sessions.length).toBe(1);
      expect(response.body.data.sessions[0].status).toBe('completed');
    });
    
    it('should filter sessions by transfer type', async () => {
      const response = await request(app)
        .get('/api/transfer/sessions?transferType=full_transfer')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.sessions.length).toBe(1);
      expect(response.body.data.sessions[0].transferType).toBe('full_transfer');
    });
    
    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/transfer/sessions?page=1&limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.sessions.length).toBe(1);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(1);
    });
    
    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/transfer/sessions')
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('GET /api/transfer/sessions/:id', () => {
    beforeEach(async () => {
      transferSession = new TransferSession({
        userId: testUser._id,
        sourceDeviceId: sourceDevice._id,
        targetDeviceId: targetDevice._id,
        transferType: 'full_transfer',
        dataTypes: ['contacts', 'photos'],
        transferMethod: 'wireless',
        status: 'completed',
        startedAt: new Date(),
        completedAt: new Date(),
        totalItems: 100,
        transferredItems: 95,
        failedItems: 5,
        transferDetails: {
          contacts: { total: 50, transferred: 50, failed: 0 },
          photos: { total: 50, transferred: 45, failed: 5 }
        }
      });
      await transferSession.save();
    });
    
    it('should get transfer session details successfully', async () => {
      const response = await request(app)
        .get(`/api/transfer/sessions/${transferSession._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.session).toBeDefined();
      expect(response.body.data.session._id).toBe(transferSession._id.toString());
      expect(response.body.data.session.transferDetails).toBeDefined();
    });
    
    it('should fail with invalid session ID', async () => {
      const response = await request(app)
        .get('/api/transfer/sessions/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail for non-existent session', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/transfer/sessions/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail without authentication', async () => {
      const response = await request(app)
        .get(`/api/transfer/sessions/${transferSession._id}`)
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('POST /api/transfer/sessions/:id/pause', () => {
    beforeEach(async () => {
      transferSession = new TransferSession({
        userId: testUser._id,
        sourceDeviceId: sourceDevice._id,
        targetDeviceId: targetDevice._id,
        transferType: 'full_transfer',
        dataTypes: ['contacts'],
        transferMethod: 'wireless',
        status: 'transferring',
        startedAt: new Date()
      });
      await transferSession.save();
    });
    
    it('should pause transfer session successfully', async () => {
      const response = await request(app)
        .post(`/api/transfer/sessions/${transferSession._id}/pause`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.session.status).toBe('paused');
    });
    
    it('should fail to pause completed session', async () => {
      // Update session to completed
      transferSession.status = 'completed';
      await transferSession.save();
      
      const response = await request(app)
        .post(`/api/transfer/sessions/${transferSession._id}/pause`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail without authentication', async () => {
      const response = await request(app)
        .post(`/api/transfer/sessions/${transferSession._id}/pause`)
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('POST /api/transfer/sessions/:id/resume', () => {
    beforeEach(async () => {
      transferSession = new TransferSession({
        userId: testUser._id,
        sourceDeviceId: sourceDevice._id,
        targetDeviceId: targetDevice._id,
        transferType: 'full_transfer',
        dataTypes: ['contacts'],
        transferMethod: 'wireless',
        status: 'paused',
        startedAt: new Date()
      });
      await transferSession.save();
    });
    
    it('should resume transfer session successfully', async () => {
      const response = await request(app)
        .post(`/api/transfer/sessions/${transferSession._id}/resume`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.session.status).toBe('transferring');
    });
    
    it('should fail to resume non-paused session', async () => {
      // Update session to transferring
      transferSession.status = 'transferring';
      await transferSession.save();
      
      const response = await request(app)
        .post(`/api/transfer/sessions/${transferSession._id}/resume`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail without authentication', async () => {
      const response = await request(app)
        .post(`/api/transfer/sessions/${transferSession._id}/resume`)
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('POST /api/transfer/sessions/:id/cancel', () => {
    beforeEach(async () => {
      transferSession = new TransferSession({
        userId: testUser._id,
        sourceDeviceId: sourceDevice._id,
        targetDeviceId: targetDevice._id,
        transferType: 'full_transfer',
        dataTypes: ['contacts'],
        transferMethod: 'wireless',
        status: 'transferring',
        startedAt: new Date()
      });
      await transferSession.save();
    });
    
    it('should cancel transfer session successfully', async () => {
      const response = await request(app)
        .post(`/api/transfer/sessions/${transferSession._id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.session.status).toBe('cancelled');
    });
    
    it('should fail to cancel completed session', async () => {
      // Update session to completed
      transferSession.status = 'completed';
      await transferSession.save();
      
      const response = await request(app)
        .post(`/api/transfer/sessions/${transferSession._id}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail without authentication', async () => {
      const response = await request(app)
        .post(`/api/transfer/sessions/${transferSession._id}/cancel`)
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('GET /api/transfer/compatibility', () => {
    it('should check device compatibility successfully', async () => {
      const response = await request(app)
        .get(`/api/transfer/compatibility?sourceId=${sourceDevice._id}&targetId=${targetDevice._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.compatible).toBeDefined();
      expect(response.body.data.supportedDataTypes).toBeDefined();
      expect(response.body.data.transferMethods).toBeDefined();
    });
    
    it('should fail with missing device IDs', async () => {
      const response = await request(app)
        .get('/api/transfer/compatibility')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail with invalid device IDs', async () => {
      const response = await request(app)
        .get('/api/transfer/compatibility?sourceId=invalid&targetId=invalid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail without authentication', async () => {
      const response = await request(app)
        .get(`/api/transfer/compatibility?sourceId=${sourceDevice._id}&targetId=${targetDevice._id}`)
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('POST /api/transfer/estimate', () => {
    const estimateData = {
      sourceDeviceId: null, // Will be set in beforeEach
      targetDeviceId: null, // Will be set in beforeEach
      dataTypes: ['contacts', 'photos'],
      transferMethod: 'wireless'
    };
    
    beforeEach(() => {
      estimateData.sourceDeviceId = sourceDevice._id.toString();
      estimateData.targetDeviceId = targetDevice._id.toString();
    });
    
    it('should get transfer estimate successfully', async () => {
      const response = await request(app)
        .post('/api/transfer/estimate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(estimateData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.estimatedTime).toBeDefined();
      expect(response.body.data.estimatedSize).toBeDefined();
      expect(response.body.data.itemCounts).toBeDefined();
    });
    
    it('should fail with invalid device IDs', async () => {
      const invalidData = {
        ...estimateData,
        sourceDeviceId: 'invalid-id'
      };
      
      const response = await request(app)
        .post('/api/transfer/estimate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/transfer/estimate')
        .send(estimateData)
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });
});