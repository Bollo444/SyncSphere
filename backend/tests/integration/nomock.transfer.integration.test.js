// Phone Transfer Integration Tests (No Mocks)
// Uses real database connections for end-to-end phone transfer testing
// Run with: npx jest --config jest.config.nomocks.js nomock.transfer.integration.test.js

const request = require('supertest');
const app = require('../../src/app');
const { connectDB, query } = require('../../src/config/database');

describe('Phone Transfer Integration Tests (No Mocks)', () => {
  const testUser = {
    email: 'transfer.integration.test@example.com',
    password: 'TestPassword123!',
    firstName: 'Transfer',
    lastName: 'Integration',
    confirmPassword: 'TestPassword123!',
    acceptTerms: true
  };

  const sourceDevice = {
    deviceType: 'ios',
    deviceModel: 'iPhone 12',
    osVersion: '15.0',
    serialNumber: 'SOURCE123456789',
    deviceName: 'Source Test Device',
    capabilities: {
      dataRecovery: true,
      phoneTransfer: true,
      backup: true
    }
  };

  const targetDevice = {
    deviceType: 'ios',
    deviceModel: 'iPhone 14',
    osVersion: '16.0',
    serialNumber: 'TARGET123456789',
    deviceName: 'Target Test Device',
    capabilities: {
      dataRecovery: true,
      phoneTransfer: true,
      backup: true
    }
  };

  let userId;
  let sourceDeviceId;
  let targetDeviceId;
  let authToken;
  let transferSessionId;

  beforeAll(async () => {
    await connectDB();
    
    // Clean up any existing test data
    await query('DELETE FROM transfer_sessions WHERE user_id IN (SELECT id FROM users WHERE email = $1)', [testUser.email]);
    await query('DELETE FROM devices WHERE "userId" IN (SELECT id FROM users WHERE email = $1)', [testUser.email]);
    await query('DELETE FROM users WHERE email = $1', [testUser.email]);

    // Register test user
    const userResponse = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);
    
    userId = userResponse.body.data.user.id;
    authToken = userResponse.body.data.token;

    // Register source device
    const sourceResponse = await request(app)
      .post('/api/v1/devices/register')
      .set('Authorization', `Bearer ${authToken}`)
      .send(sourceDevice);
    
    sourceDeviceId = sourceResponse.body.data.id;

    // Register target device
    const targetResponse = await request(app)
      .post('/api/v1/devices/register')
      .set('Authorization', `Bearer ${authToken}`)
      .send(targetDevice);
    
    targetDeviceId = targetResponse.body.data.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (transferSessionId) {
      await query('DELETE FROM transfer_sessions WHERE id = $1', [transferSessionId]);
    }
    if (sourceDeviceId) {
      await query('DELETE FROM devices WHERE id = $1', [sourceDeviceId]);
    }
    if (targetDeviceId) {
      await query('DELETE FROM devices WHERE id = $1', [targetDeviceId]);
    }
    if (userId) {
      await query('DELETE FROM users WHERE id = $1', [userId]);
    }
  });

  describe('POST /api/v1/transfer/initiate', () => {
    test('should initiate phone transfer successfully', async () => {
      const transferData = {
        sourceDeviceId: sourceDeviceId,
        targetDeviceId: targetDeviceId,
        transferType: 'full',
        dataTypes: ['contacts', 'photos', 'messages', 'apps'],
        transferMethod: 'wireless'
      };

      const response = await request(app)
        .post('/api/v1/transfer/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transferData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Transfer initiated successfully');
      expect(response.body.data).toHaveProperty('session');
      expect(response.body.data.session).toHaveProperty('id');
      expect(response.body.data.session).toHaveProperty('sourceDeviceId', sourceDeviceId);
      expect(response.body.data.session).toHaveProperty('targetDeviceId', targetDeviceId);
      expect(response.body.data.session).toHaveProperty('transferType', transferData.transferType);
      expect(response.body.data.session).toHaveProperty('status', 'preparing');
      expect(response.body.data.session).toHaveProperty('dataTypes');
      expect(response.body.data.session.dataTypes).toEqual(expect.arrayContaining(transferData.dataTypes));
      expect(response.body.data.session).toHaveProperty('transferMethod', transferData.transferMethod);

      transferSessionId = response.body.data.session.id;

      // Verify session was created in database
      const dbSession = await query('SELECT * FROM transfer_sessions WHERE id = $1', [transferSessionId]);
      expect(dbSession.rows).toHaveLength(1);
      expect(dbSession.rows[0].source_device_id).toBe(sourceDeviceId);
      expect(dbSession.rows[0].target_device_id).toBe(targetDeviceId);
      expect(dbSession.rows[0].transfer_type).toBe(transferData.transferType);
      expect(dbSession.rows[0].status).toBe('preparing');
    });

    test('should reject transfer without authentication', async () => {
      const transferData = {
        sourceDeviceId: sourceDeviceId,
        targetDeviceId: targetDeviceId,
        transferType: 'full',
        dataTypes: ['contacts']
      };

      const response = await request(app)
        .post('/api/v1/transfer/initiate')
        .send(transferData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
    });

    test('should reject transfer with same source and target device', async () => {
      const transferData = {
        sourceDeviceId: sourceDeviceId,
        targetDeviceId: sourceDeviceId, // Same as source
        transferType: 'full',
        dataTypes: ['contacts']
      };

      const response = await request(app)
        .post('/api/v1/transfer/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transferData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
    });

    test('should reject transfer with invalid device IDs', async () => {
      const transferData = {
        sourceDeviceId: '123e4567-e89b-12d3-a456-426614174999', // Non-existent
        targetDeviceId: targetDeviceId,
        transferType: 'full',
        dataTypes: ['contacts']
      };

      const response = await request(app)
        .post('/api/v1/transfer/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transferData)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
    });

    test('should reject transfer with invalid transfer type', async () => {
      const transferData = {
        sourceDeviceId: sourceDeviceId,
        targetDeviceId: targetDeviceId,
        transferType: 'invalid_type',
        dataTypes: ['contacts']
      };

      const response = await request(app)
        .post('/api/v1/transfer/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transferData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
    });

    test('should reject transfer with empty data types', async () => {
      const transferData = {
        sourceDeviceId: sourceDeviceId,
        targetDeviceId: targetDeviceId,
        transferType: 'selective',
        dataTypes: []
      };

      const response = await request(app)
        .post('/api/v1/transfer/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transferData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
    });
  });

  describe('GET /api/v1/transfer/sessions', () => {
    test('should get user transfer sessions', async () => {
      const response = await request(app)
        .get('/api/v1/transfer/sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('sessions');
      expect(Array.isArray(response.body.data.sessions)).toBe(true);
      expect(response.body.data.sessions.length).toBeGreaterThan(0);
      
      // Should include our test session
      const sessionIds = response.body.data.sessions.map(session => session.id);
      expect(sessionIds).toContain(transferSessionId);

      // Check session structure
      const testSession = response.body.data.sessions.find(session => session.id === transferSessionId);
      expect(testSession).toHaveProperty('sourceDeviceId', sourceDeviceId);
      expect(testSession).toHaveProperty('targetDeviceId', targetDeviceId);
      expect(testSession).toHaveProperty('transferType', 'full');
      expect(testSession).toHaveProperty('status');
      expect(testSession).toHaveProperty('dataTypes');
      expect(testSession).toHaveProperty('createdAt');
    });

    test('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/transfer/sessions')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
    });
  });

  describe('GET /api/v1/transfer/sessions/:id', () => {
    test('should get specific transfer session', async () => {
      const response = await request(app)
        .get(`/api/v1/transfer/sessions/${transferSessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('session');
      expect(response.body.data.session).toHaveProperty('id', transferSessionId);
      expect(response.body.data.session).toHaveProperty('sourceDeviceId', sourceDeviceId);
      expect(response.body.data.session).toHaveProperty('targetDeviceId', targetDeviceId);
      expect(response.body.data.session).toHaveProperty('transferType', 'full');
      expect(response.body.data.session).toHaveProperty('status');
      expect(response.body.data.session).toHaveProperty('dataTypes');
      expect(response.body.data.session).toHaveProperty('progress');
      expect(response.body.data.session).toHaveProperty('createdAt');
    });

    test('should reject request for non-existent session', async () => {
      const fakeSessionId = '123e4567-e89b-12d3-a456-426614174999';
      
      const response = await request(app)
        .get(`/api/v1/transfer/sessions/${fakeSessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
    });

    test('should reject request without authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/transfer/sessions/${transferSessionId}`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
    });
  });

  describe('PUT /api/v1/transfer/sessions/:id/status', () => {
    test('should update transfer session status', async () => {
      const statusUpdate = {
        status: 'transferring',
        progress: 45,
        currentStep: 'Transferring contacts',
        transferredData: {
          contacts: 150,
          photos: 0,
          messages: 0,
          apps: 0
        }
      };

      const response = await request(app)
        .put(`/api/v1/transfer/sessions/${transferSessionId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(statusUpdate)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Transfer status updated successfully');
      expect(response.body.data.session).toHaveProperty('status', statusUpdate.status);
      expect(response.body.data.session).toHaveProperty('progress', statusUpdate.progress);
      expect(response.body.data.session).toHaveProperty('currentStep', statusUpdate.currentStep);
      expect(response.body.data.session).toHaveProperty('transferredData');

      // Verify update in database
      const dbSession = await query('SELECT * FROM transfer_sessions WHERE id = $1', [transferSessionId]);
      expect(dbSession.rows[0].status).toBe(statusUpdate.status);
      expect(dbSession.rows[0].progress).toBe(statusUpdate.progress);
    });

    test('should reject status update with invalid status', async () => {
      const invalidUpdate = {
        status: 'invalid_status',
        progress: 50
      };

      const response = await request(app)
        .put(`/api/v1/transfer/sessions/${transferSessionId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
    });

    test('should reject status update without authentication', async () => {
      const statusUpdate = {
        status: 'paused',
        progress: 75
      };

      const response = await request(app)
        .put(`/api/v1/transfer/sessions/${transferSessionId}/status`)
        .send(statusUpdate)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
    });
  });

  describe('POST /api/v1/transfer/sessions/:id/pause', () => {
    test('should pause transfer session', async () => {
      const response = await request(app)
        .post(`/api/v1/transfer/sessions/${transferSessionId}/pause`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Transfer paused successfully');
      expect(response.body.data.session).toHaveProperty('status', 'paused');

      // Verify pause in database
      const dbSession = await query('SELECT * FROM transfer_sessions WHERE id = $1', [transferSessionId]);
      expect(dbSession.rows[0].status).toBe('paused');
    });

    test('should reject pause for non-existent session', async () => {
      const fakeSessionId = '123e4567-e89b-12d3-a456-426614174999';
      
      const response = await request(app)
        .post(`/api/v1/transfer/sessions/${fakeSessionId}/pause`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
    });

    test('should reject pause without authentication', async () => {
      const response = await request(app)
        .post(`/api/v1/transfer/sessions/${transferSessionId}/pause`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
    });
  });

  describe('POST /api/v1/transfer/sessions/:id/resume', () => {
    test('should resume transfer session', async () => {
      const response = await request(app)
        .post(`/api/v1/transfer/sessions/${transferSessionId}/resume`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Transfer resumed successfully');
      expect(response.body.data.session).toHaveProperty('status', 'transferring');

      // Verify resume in database
      const dbSession = await query('SELECT * FROM transfer_sessions WHERE id = $1', [transferSessionId]);
      expect(dbSession.rows[0].status).toBe('transferring');
    });

    test('should reject resume for non-existent session', async () => {
      const fakeSessionId = '123e4567-e89b-12d3-a456-426614174999';
      
      const response = await request(app)
        .post(`/api/v1/transfer/sessions/${fakeSessionId}/resume`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
    });

    test('should reject resume without authentication', async () => {
      const response = await request(app)
        .post(`/api/v1/transfer/sessions/${transferSessionId}/resume`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
    });
  });

  describe('POST /api/v1/transfer/sessions/:id/cancel', () => {
    test('should cancel transfer session', async () => {
      // Create a temporary session for cancellation test
      const tempTransferData = {
        sourceDeviceId: sourceDeviceId,
        targetDeviceId: targetDeviceId,
        transferType: 'selective',
        dataTypes: ['contacts']
      };

      const createResponse = await request(app)
        .post('/api/v1/transfer/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(tempTransferData);

      const tempSessionId = createResponse.body.data.session.id;

      // Cancel the session
      const cancelResponse = await request(app)
        .post(`/api/v1/transfer/sessions/${tempSessionId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(cancelResponse.body).toHaveProperty('success', true);
      expect(cancelResponse.body).toHaveProperty('message', 'Transfer cancelled successfully');
      expect(cancelResponse.body.data.session).toHaveProperty('status', 'cancelled');

      // Verify cancellation in database
      const dbSession = await query('SELECT * FROM transfer_sessions WHERE id = $1', [tempSessionId]);
      expect(dbSession.rows[0].status).toBe('cancelled');

      // Clean up
      await query('DELETE FROM transfer_sessions WHERE id = $1', [tempSessionId]);
    });

    test('should reject cancellation of non-existent session', async () => {
      const fakeSessionId = '123e4567-e89b-12d3-a456-426614174999';
      
      const response = await request(app)
        .post(`/api/v1/transfer/sessions/${fakeSessionId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
    });

    test('should reject cancellation without authentication', async () => {
      const response = await request(app)
        .post(`/api/v1/transfer/sessions/${transferSessionId}/cancel`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(
        response.body.message || response.body.error?.message
      ).toBeDefined();
    });
  });

  describe('Transfer Flow Integration', () => {
    test('should complete full transfer flow: initiate -> monitor -> pause -> resume -> complete', async () => {
      // Step 1: Initiate transfer
      const transferData = {
        sourceDeviceId: sourceDeviceId,
        targetDeviceId: targetDeviceId,
        transferType: 'selective',
        dataTypes: ['contacts', 'photos'],
        transferMethod: 'cable'
      };

      const initiateResponse = await request(app)
        .post('/api/v1/transfer/initiate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transferData)
        .expect(201);

      const flowSessionId = initiateResponse.body.data.session.id;

      try {
        // Step 2: Monitor initial status
        const statusResponse = await request(app)
          .get(`/api/v1/transfer/sessions/${flowSessionId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(statusResponse.body.data.session.status).toBe('preparing');

        // Step 3: Update to transferring
        const updateResponse = await request(app)
          .put(`/api/v1/transfer/sessions/${flowSessionId}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            status: 'transferring',
            progress: 25,
            currentStep: 'Transferring contacts'
          })
          .expect(200);

        expect(updateResponse.body.data.session.status).toBe('transferring');

        // Step 4: Pause transfer
        const pauseResponse = await request(app)
          .post(`/api/v1/transfer/sessions/${flowSessionId}/pause`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(pauseResponse.body.data.session.status).toBe('paused');

        // Step 5: Resume transfer
        const resumeResponse = await request(app)
          .post(`/api/v1/transfer/sessions/${flowSessionId}/resume`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(resumeResponse.body.data.session.status).toBe('transferring');

        // Step 6: Complete transfer
        const completeResponse = await request(app)
          .put(`/api/v1/transfer/sessions/${flowSessionId}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            status: 'completed',
            progress: 100,
            currentStep: 'Transfer completed',
            transferredData: {
              contacts: 200,
              photos: 150
            }
          })
          .expect(200);

        expect(completeResponse.body.data.session.status).toBe('completed');
        expect(completeResponse.body.data.session.progress).toBe(100);

        // Step 7: Verify session in list
        const listResponse = await request(app)
          .get('/api/v1/transfer/sessions')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const sessionIds = listResponse.body.data.sessions.map(s => s.id);
        expect(sessionIds).toContain(flowSessionId);

      } finally {
        // Cleanup
        await query('DELETE FROM transfer_sessions WHERE id = $1', [flowSessionId]);
      }
    });
  });
});