const request = require('supertest');
const app = require('../src/app');
const Device = require('../src/models/Device');
const DeviceService = require('../src/services/devices/deviceService');

describe('Device Management', () => {
  let testUser;
  let authToken;
  let testDevice;
  
  beforeEach(async () => {
    // Clean up any existing test data
    await global.testHelpers.cleanupTestData();
    
    // Create test user and get auth token
    testUser = await global.testHelpers.createTestUser();
    authToken = global.testHelpers.generateTestToken(testUser);
  });
  
  afterEach(async () => {
    // Clean up test data after each test
    await global.testHelpers.cleanupTestData();
  });
  
  describe('POST /api/devices/scan', () => {
    it('should scan for connected devices successfully', async () => {
      const response = await request(app)
        .post('/api/devices/scan')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.devices).toBeDefined();
      expect(Array.isArray(response.body.data.devices)).toBe(true);
    });
    
    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/devices/scan')
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('POST /api/devices/connect', () => {
    const deviceData = {
      deviceId: 'test-device-123',
      deviceName: 'Test iPhone',
      deviceType: 'iOS',
      osVersion: '17.0',
      model: 'iPhone 14 Pro',
      serialNumber: 'ABC123DEF456'
    };
    
    it('should connect device successfully', async () => {
      const response = await request(app)
        .post('/api/devices/connect')
        .set('Authorization', `Bearer ${authToken}`)
        .send(deviceData)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.device).toBeDefined();
      expect(response.body.data.device.deviceName).toBe(deviceData.deviceName);
      expect(response.body.data.device.userId).toBe(testUser._id.toString());
    });
    
    it('should fail with invalid device data', async () => {
      const invalidData = {
        deviceId: '', // Empty device ID
        deviceName: 'Test Device'
      };
      
      const response = await request(app)
        .post('/api/devices/connect')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
    
    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/devices/connect')
        .send(deviceData)
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('GET /api/devices', () => {
    beforeEach(async () => {
      // Create test devices
      testDevice = await global.testHelpers.createTestDevice({
        userId: testUser._id,
        deviceName: 'Test Device 1',
        deviceType: 'iOS'
      });
      
      await global.testHelpers.createTestDevice({
        userId: testUser._id,
        deviceName: 'Test Device 2',
        deviceType: 'Android'
      });
    });
    
    it('should get user devices successfully', async () => {
      const response = await request(app)
        .get('/api/devices')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.devices).toBeDefined();
      expect(response.body.data.devices.length).toBe(2);
      expect(response.body.data.pagination).toBeDefined();
    });
    
    it('should filter devices by type', async () => {
      const response = await request(app)
        .get('/api/devices?deviceType=iOS')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.devices.length).toBe(1);
      expect(response.body.data.devices[0].deviceType).toBe('iOS');
    });
    
    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/devices?page=1&limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.devices.length).toBe(1);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(1);
    });
    
    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/devices')
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('GET /api/devices/:id', () => {
    beforeEach(async () => {
      testDevice = await global.testHelpers.createTestDevice({
        userId: testUser._id,
        deviceName: 'Test Device',
        deviceType: 'iOS'
      });
    });
    
    it('should get device details successfully', async () => {
      const response = await request(app)
        .get(`/api/devices/${testDevice._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.device).toBeDefined();
      expect(response.body.data.device._id).toBe(testDevice._id.toString());
    });
    
    it('should fail with invalid device ID', async () => {
      const response = await request(app)
        .get('/api/devices/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail for non-existent device', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .get(`/api/devices/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail without authentication', async () => {
      const response = await request(app)
        .get(`/api/devices/${testDevice._id}`)
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('PUT /api/devices/:id', () => {
    beforeEach(async () => {
      testDevice = await global.testHelpers.createTestDevice({
        userId: testUser._id,
        deviceName: 'Test Device',
        deviceType: 'iOS'
      });
    });
    
    it('should update device successfully', async () => {
      const updateData = {
        deviceName: 'Updated Device Name',
        nickname: 'My iPhone'
      };
      
      const response = await request(app)
        .put(`/api/devices/${testDevice._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.device.deviceName).toBe(updateData.deviceName);
      expect(response.body.data.device.nickname).toBe(updateData.nickname);
    });
    
    it('should fail with invalid update data', async () => {
      const invalidData = {
        deviceType: 'InvalidType' // Should be iOS, Android, or Windows
      };
      
      const response = await request(app)
        .put(`/api/devices/${testDevice._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail without authentication', async () => {
      const response = await request(app)
        .put(`/api/devices/${testDevice._id}`)
        .send({ deviceName: 'New Name' })
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('DELETE /api/devices/:id', () => {
    beforeEach(async () => {
      testDevice = await global.testHelpers.createTestDevice({
        userId: testUser._id,
        deviceName: 'Test Device',
        deviceType: 'iOS'
      });
    });
    
    it('should delete device successfully', async () => {
      const response = await request(app)
        .delete(`/api/devices/${testDevice._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      
      // Verify device is deleted
      const getResponse = await request(app)
        .get(`/api/devices/${testDevice._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
    
    it('should fail for non-existent device', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const response = await request(app)
        .delete(`/api/devices/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail without authentication', async () => {
      const response = await request(app)
        .delete(`/api/devices/${testDevice._id}`)
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('POST /api/devices/:id/disconnect', () => {
    beforeEach(async () => {
      testDevice = await global.testHelpers.createTestDevice({
        userId: testUser._id,
        deviceName: 'Test Device',
        deviceType: 'iOS',
        status: 'connected'
      });
    });
    
    it('should disconnect device successfully', async () => {
      const response = await request(app)
        .post(`/api/devices/${testDevice._id}/disconnect`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.device.status).toBe('disconnected');
    });
    
    it('should fail for already disconnected device', async () => {
      // First disconnect
      await request(app)
        .post(`/api/devices/${testDevice._id}/disconnect`)
        .set('Authorization', `Bearer ${authToken}`);
      
      // Try to disconnect again
      const response = await request(app)
        .post(`/api/devices/${testDevice._id}/disconnect`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
    
    it('should fail without authentication', async () => {
      const response = await request(app)
        .post(`/api/devices/${testDevice._id}/disconnect`)
        .expect(401);
      
      expect(response.body.success).toBe(false);
    });
  });
});