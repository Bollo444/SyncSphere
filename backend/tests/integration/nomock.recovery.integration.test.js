// Data Recovery Integration Tests (No Mocks)
// Uses real database connections for end-to-end data recovery testing
// Run with: npx jest --config jest.config.nomocks.js nomock.recovery.integration.test.js

const request = require('supertest');
const app = require('../../src/app');
const { connectDB, query } = require('../../src/config/database');
const path = require('path');
const fs = require('fs');

describe('Data Recovery Integration Tests (No Mocks)', () => {
  const testUser = {
    email: 'recovery.integration.test@example.com',
    password: 'TestPassword123!',
    firstName: 'Recovery',
    lastName: 'Integration',
    confirmPassword: 'TestPassword123!',
    acceptTerms: true
  };

  const testDevice = {
    deviceType: 'ios',
    deviceModel: 'iPhone 13',
    osVersion: '16.0',
    serialNumber: 'RECOVERY123456789',
    deviceName: 'Recovery Test Device',
    capabilities: {
      dataRecovery: true,
      phoneTransfer: true,
      backup: true
    }
  };

  let userId;
  let deviceId;
  let authToken;
  let recoverySessionId;

  beforeAll(async () => {
    await connectDB();
    
    // Ensure tables exist
    const User = require('../../src/models/User');
    const Device = require('../../src/models/Device');
    const DataRecovery = require('../../src/models/DataRecovery');
    await User.createTable();
    await Device.createTable();
    await DataRecovery.createTable();
    
    // Clean up any existing test data
    await query('DELETE FROM data_recovery_sessions WHERE user_id IN (SELECT id FROM users WHERE email = $1)', [testUser.email]);
    await query('DELETE FROM devices WHERE user_id IN (SELECT id FROM users WHERE email = $1)', [testUser.email]);
    await query('DELETE FROM users WHERE email = $1', [testUser.email]);

    // Register test user
    const userResponse = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);
    
    console.log('User registration response:', JSON.stringify(userResponse.body, null, 2));
    
    if (!userResponse.body.success) {
      throw new Error(`User registration failed: ${JSON.stringify(userResponse.body)}`);
    }
    
    userId = userResponse.body.data.user.id;
    authToken = userResponse.body.data.token;
    
    // Check user status in database
    const userCheck = await query('SELECT id, email, is_active, email_verified FROM users WHERE id = $1', [userId]);
    console.log('User in database:', userCheck.rows[0]);

    // Register test device
    const deviceResponse = await request(app)
      .post('/api/v1/devices/register')
      .set('Authorization', `Bearer ${authToken}`)
      .send(testDevice);
    
    if (!deviceResponse.body.data || !deviceResponse.body.data.id) {
      throw new Error(`Device registration failed: ${JSON.stringify(deviceResponse.body)}`);
    }
    
    deviceId = deviceResponse.body.data.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (recoverySessionId) {
      await query('DELETE FROM data_recovery_sessions WHERE id = $1', [recoverySessionId]);
    }
    if (deviceId) {
      await query('DELETE FROM devices WHERE id = $1', [deviceId]);
    }
    if (userId) {
      await query('DELETE FROM users WHERE id = $1', [userId]);
    }
  });

  describe('POST /api/v1/recovery/start', () => {
    test('should start device scan successfully', async () => {
      const scanData = {
        deviceId: deviceId,
        recoveryType: 'deleted_files',
        scanDepth: 'quick'
      };

      const response = await request(app)
        .post('/api/v1/recovery/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send(scanData)
        .expect(201);

      console.log('🔍 Recovery response:', JSON.stringify(response.body, null, 2));
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('deviceId', deviceId);
      expect(response.body.data).toHaveProperty('recoveryType', scanData.recoveryType);
      expect(response.body.data).toHaveProperty('scanDepth', scanData.scanDepth);
      expect(response.body.data).toHaveProperty('status', 'pending');

      recoverySessionId = response.body.data.id;

      // Verify session was created in database
      const dbSession = await query('SELECT * FROM data_recovery_sessions WHERE id = $1', [recoverySessionId]);
      expect(dbSession.rows).toHaveLength(1);
      expect(dbSession.rows[0].device_id).toBe(deviceId);
      expect(dbSession.rows[0].data_types).toContain(scanData.recoveryType);
      expect(dbSession.rows[0].status).toBe('in_progress');
    });

    test('should reject scan without authentication', async () => {
      const scanData = {
        deviceId: deviceId,
        recoveryType: 'deleted_files',
        scanDepth: 'quick'
      };

      const response = await request(app)
        .post('/api/v1/recovery/start')
        .send(scanData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
    });

    test('should reject scan with invalid device ID', async () => {
      const scanData = {
        deviceId: '123e4567-e89b-12d3-a456-426614174999', // Non-existent device
        recoveryType: 'deleted_files',
        scanDepth: 'quick'
      };

      const response = await request(app)
        .post('/api/v1/recovery/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send(scanData)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    test('should reject scan with invalid scan type', async () => {
      const scanData = {
        deviceId: deviceId,
        recoveryType: 'invalid_recovery_type',
        scanDepth: 'quick'
      };

      const response = await request(app)
        .post('/api/v1/recovery/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send(scanData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    test('should reject scan with missing required fields', async () => {
      const scanData = {
        deviceId: deviceId
        // Missing recoveryType
      };

      const response = await request(app)
        .post('/api/v1/recovery/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send(scanData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/v1/recovery/sessions', () => {
    test('should get user recovery sessions', async () => {
      const response = await request(app)
        .get('/api/v1/recovery/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('sessions');
      expect(Array.isArray(response.body.data.sessions)).toBe(true);
      expect(response.body.data.sessions.length).toBeGreaterThan(0);
      
      // Should include our test session
      const sessionIds = response.body.data.sessions.map(session => session.id);
      expect(sessionIds).toContain(recoverySessionId);

      // Check session structure
      const testSession = response.body.data.sessions.find(session => session.id === recoverySessionId);
      expect(testSession).toHaveProperty('deviceId', deviceId);
      expect(testSession).toHaveProperty('scanType', 'quick');
      expect(testSession).toHaveProperty('status');
      expect(testSession).toHaveProperty('dataTypes');
      expect(testSession).toHaveProperty('createdAt');
    });

    test('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/recovery/sessions')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/v1/recovery/sessions/:id', () => {
    test('should get specific recovery session', async () => {
      const response = await request(app)
        .get(`/api/v1/recovery/sessions/${recoverySessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('session');
      expect(response.body.data.session).toHaveProperty('id', recoverySessionId);
      expect(response.body.data.session).toHaveProperty('deviceId', deviceId);
      expect(response.body.data.session).toHaveProperty('scanType', 'quick');
      expect(response.body.data.session).toHaveProperty('status');
      expect(response.body.data.session).toHaveProperty('dataTypes');
      expect(response.body.data.session).toHaveProperty('progress');
      expect(response.body.data.session).toHaveProperty('createdAt');
    });

    test('should reject request for non-existent session', async () => {
      const fakeSessionId = '123e4567-e89b-12d3-a456-426614174999';
      
      const response = await request(app)
        .get(`/api/v1/recovery/sessions/${fakeSessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    test('should reject request without authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/recovery/sessions/${recoverySessionId}`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('PUT /api/v1/recovery/sessions/:id/status', () => {
    test('should update session status', async () => {
      const statusUpdate = {
        status: 'completed',
        progress: 100,
        foundFiles: {
          photos: 150,
          contacts: 200,
          messages: 500
        }
      };

      const response = await request(app)
        .put(`/api/v1/recovery/sessions/${recoverySessionId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(statusUpdate)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Session status updated successfully');
      expect(response.body.data.session).toHaveProperty('status', statusUpdate.status);
      expect(response.body.data.session).toHaveProperty('progress', statusUpdate.progress);
      expect(response.body.data.session).toHaveProperty('foundFiles');

      // Verify update in database
      const dbSession = await query('SELECT * FROM recovery_sessions WHERE id = $1', [recoverySessionId]);
      expect(dbSession.rows[0].status).toBe(statusUpdate.status);
      expect(dbSession.rows[0].progress).toBe(statusUpdate.progress);
    });

    test('should reject status update with invalid status', async () => {
      const invalidUpdate = {
        status: 'invalid_status',
        progress: 50
      };

      const response = await request(app)
        .put(`/api/v1/recovery/sessions/${recoverySessionId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    test('should reject status update without authentication', async () => {
      const statusUpdate = {
        status: 'paused',
        progress: 75
      };

      const response = await request(app)
        .put(`/api/v1/recovery/sessions/${recoverySessionId}/status`)
        .send(statusUpdate)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/v1/recovery/sessions/:id/export', () => {
    test('should initiate data export', async () => {
      const exportData = {
        selectedFiles: {
          photos: ['photo1.jpg', 'photo2.jpg'],
          contacts: ['contact1.vcf', 'contact2.vcf'],
          messages: ['message1.txt']
        },
        exportFormat: 'zip',
        includeMetadata: true
      };

      const response = await request(app)
        .post(`/api/v1/recovery/sessions/${recoverySessionId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(exportData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Export initiated successfully');
      expect(response.body.data).toHaveProperty('exportId');
      expect(response.body.data).toHaveProperty('estimatedSize');
      expect(response.body.data).toHaveProperty('downloadUrl');
    });

    test('should reject export with empty file selection', async () => {
      const exportData = {
        selectedFiles: {},
        exportFormat: 'zip'
      };

      const response = await request(app)
        .post(`/api/v1/recovery/sessions/${recoverySessionId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(exportData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    test('should reject export with invalid format', async () => {
      const exportData = {
        selectedFiles: {
          photos: ['photo1.jpg']
        },
        exportFormat: 'invalid_format'
      };

      const response = await request(app)
        .post(`/api/v1/recovery/sessions/${recoverySessionId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(exportData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('DELETE /api/v1/recovery/sessions/:id', () => {
    test('should delete recovery session', async () => {
      // Create a temporary session for deletion test
      const tempScanData = {
        deviceId: deviceId,
        recoveryType: 'deleted_files',
        scanDepth: 'deep'
      };

      const createResponse = await request(app)
        .post('/api/v1/recovery/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send(tempScanData);

      const tempSessionId = createResponse.body.data.id;

      // Delete the session
      const deleteResponse = await request(app)
        .delete(`/api/v1/recovery/sessions/${tempSessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(deleteResponse.body).toHaveProperty('success', true);
      expect(deleteResponse.body).toHaveProperty('message', 'Recovery session deleted successfully');

      // Verify session is deleted from database
      const dbSession = await query('SELECT * FROM data_recovery_sessions WHERE id = $1', [tempSessionId]);
      expect(dbSession.rows).toHaveLength(0);

      // Verify session is no longer accessible
      await request(app)
        .get(`/api/v1/recovery/sessions/${tempSessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    test('should reject deletion of non-existent session', async () => {
      const fakeSessionId = '123e4567-e89b-12d3-a456-426614174999';
      
      const response = await request(app)
        .delete(`/api/v1/recovery/sessions/${fakeSessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    test('should reject deletion without authentication', async () => {
      const response = await request(app)
        .delete(`/api/v1/recovery/sessions/${recoverySessionId}`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Recovery Flow Integration', () => {
    test('should complete full recovery flow: scan -> monitor -> export -> cleanup', async () => {
      // Step 1: Start scan
      const scanData = {
        deviceId: deviceId,
        recoveryType: 'deleted_files',
        scanDepth: 'quick'
      };

      const scanResponse = await request(app)
        .post('/api/v1/recovery/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send(scanData)
        .expect(201);

      const flowSessionId = scanResponse.body.data.id;

      try {
        // Step 2: Monitor progress
        const statusResponse = await request(app)
          .get(`/api/v1/recovery/sessions/${flowSessionId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(statusResponse.body.data.session.status).toBe('pending');

        // Step 3: Update to completed
        const updateResponse = await request(app)
          .put(`/api/v1/recovery/sessions/${flowSessionId}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            status: 'completed',
            progress: 100,
            foundFiles: { photos: 50, contacts: 100 }
          })
          .expect(200);

        expect(updateResponse.body.data.session.status).toBe('completed');

        // Step 4: Export data
        const exportResponse = await request(app)
          .post(`/api/v1/recovery/sessions/${flowSessionId}/export`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            selectedFiles: {
              photos: ['photo1.jpg'],
              contacts: ['contact1.vcf']
            },
            exportFormat: 'zip'
          })
          .expect(200);

        expect(exportResponse.body.data).toHaveProperty('exportId');
        expect(exportResponse.body.data).toHaveProperty('downloadUrl');

        // Step 5: Verify session in list
        const listResponse = await request(app)
          .get('/api/v1/recovery/sessions')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const sessionIds = listResponse.body.data.sessions.map(s => s.id);
        expect(sessionIds).toContain(flowSessionId);

      } finally {
        // Step 6: Cleanup
        await request(app)
          .delete(`/api/v1/recovery/sessions/${flowSessionId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);
      }
    });
  });
});