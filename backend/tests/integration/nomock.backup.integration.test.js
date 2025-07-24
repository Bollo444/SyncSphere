// Backup Integration Tests (No Mocks)
// Uses real database connections for end-to-end backup testing
// Run with: npx jest --config jest.config.nomocks.js nomock.backup.integration.test.js

const request = require('supertest');
const app = require('../../src/app');
const { connectDB, query } = require('../../src/config/database');

describe('Backup Integration Tests (No Mocks)', () => {
  const testUser = {
    email: 'backup.integration.test@example.com',
    password: 'TestPassword123!',
    firstName: 'Backup',
    lastName: 'Integration',
    confirmPassword: 'TestPassword123!',
    acceptTerms: true
  };

  const testDevice = {
    deviceType: 'android',
    deviceModel: 'Samsung Galaxy S21',
    osVersion: '12.0',
    serialNumber: 'BACKUP123456789',
    deviceName: 'Backup Test Device',
    capabilities: {
      dataRecovery: true,
      phoneTransfer: true,
      backup: true
    }
  };

  let userId;
  let deviceId;
  let authToken;
  let backupId;

  beforeAll(async () => {
    await connectDB();
    
    // Clean up any existing test data
    await query('DELETE FROM backups WHERE user_id IN (SELECT id FROM users WHERE email = $1)', [testUser.email]);
    await query('DELETE FROM devices WHERE "userId" IN (SELECT id FROM users WHERE email = $1)', [testUser.email]);
    await query('DELETE FROM users WHERE email = $1', [testUser.email]);

    // Register test user
    const userResponse = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);
    
    userId = userResponse.body.data.user.id;
    authToken = userResponse.body.data.token;

    // Register test device
    const deviceResponse = await request(app)
      .post('/api/v1/devices/register')
      .set('Authorization', `Bearer ${authToken}`)
      .send(testDevice);
    
    deviceId = deviceResponse.body.data.id;
  });

  afterAll(async () => {
    // Clean up test data
    if (backupId) {
      await query('DELETE FROM backups WHERE id = $1', [backupId]);
    }
    if (deviceId) {
      await query('DELETE FROM devices WHERE id = $1', [deviceId]);
    }
    if (userId) {
      await query('DELETE FROM users WHERE id = $1', [userId]);
    }
  });

  describe('POST /api/v1/backup/create', () => {
    test('should create backup successfully', async () => {
      const backupData = {
        deviceId: deviceId,
        backupType: 'full',
        dataTypes: ['contacts', 'photos', 'messages', 'apps', 'settings'],
        backupName: 'Test Full Backup',
        description: 'Integration test backup',
        encryption: true,
        compression: true
      };

      const response = await request(app)
        .post('/api/v1/backup/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(backupData)
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Backup created successfully');
      expect(response.body.data).toHaveProperty('backup');
      expect(response.body.data.backup).toHaveProperty('id');
      expect(response.body.data.backup).toHaveProperty('deviceId', deviceId);
      expect(response.body.data.backup).toHaveProperty('backupType', backupData.backupType);
      expect(response.body.data.backup).toHaveProperty('backupName', backupData.backupName);
      expect(response.body.data.backup).toHaveProperty('status', 'creating');
      expect(response.body.data.backup).toHaveProperty('dataTypes');
      expect(response.body.data.backup.dataTypes).toEqual(expect.arrayContaining(backupData.dataTypes));
      expect(response.body.data.backup).toHaveProperty('encryption', backupData.encryption);
      expect(response.body.data.backup).toHaveProperty('compression', backupData.compression);

      backupId = response.body.data.backup.id;

      // Verify backup was created in database
      const dbBackup = await query('SELECT * FROM backups WHERE id = $1', [backupId]);
      expect(dbBackup.rows).toHaveLength(1);
      expect(dbBackup.rows[0].device_id).toBe(deviceId);
      expect(dbBackup.rows[0].backup_type).toBe(backupData.backupType);
      expect(dbBackup.rows[0].backup_name).toBe(backupData.backupName);
      expect(dbBackup.rows[0].status).toBe('creating');
    });

    test('should reject backup creation without authentication', async () => {
      const backupData = {
        deviceId: deviceId,
        backupType: 'incremental',
        dataTypes: ['contacts']
      };

      const response = await request(app)
        .post('/api/v1/backup/create')
        .send(backupData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    test('should reject backup with invalid device ID', async () => {
      const backupData = {
        deviceId: '123e4567-e89b-12d3-a456-426614174999', // Non-existent device
        backupType: 'full',
        dataTypes: ['contacts']
      };

      const response = await request(app)
        .post('/api/v1/backup/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(backupData)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    test('should reject backup with invalid backup type', async () => {
      const backupData = {
        deviceId: deviceId,
        backupType: 'invalid_type',
        dataTypes: ['contacts']
      };

      const response = await request(app)
        .post('/api/v1/backup/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(backupData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    test('should reject backup with empty data types', async () => {
      const backupData = {
        deviceId: deviceId,
        backupType: 'selective',
        dataTypes: []
      };

      const response = await request(app)
        .post('/api/v1/backup/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(backupData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/v1/backup/list', () => {
    test('should get user backups', async () => {
      const response = await request(app)
        .get('/api/v1/backup/list')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('backups');
      expect(Array.isArray(response.body.data.backups)).toBe(true);
      expect(response.body.data.backups.length).toBeGreaterThan(0);
      
      // Should include our test backup
      const backupIds = response.body.data.backups.map(backup => backup.id);
      expect(backupIds).toContain(backupId);

      // Check backup structure
      const testBackup = response.body.data.backups.find(backup => backup.id === backupId);
      expect(testBackup).toHaveProperty('deviceId', deviceId);
      expect(testBackup).toHaveProperty('backupType', 'full');
      expect(testBackup).toHaveProperty('backupName', 'Test Full Backup');
      expect(testBackup).toHaveProperty('status');
      expect(testBackup).toHaveProperty('dataTypes');
      expect(testBackup).toHaveProperty('createdAt');
    });

    test('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/backup/list?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('backups');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination).toHaveProperty('page', 1);
      expect(response.body.data.pagination).toHaveProperty('limit', 5);
      expect(response.body.data.pagination).toHaveProperty('total');
      expect(response.body.data.pagination).toHaveProperty('totalPages');
    });

    test('should filter by device', async () => {
      const response = await request(app)
        .get(`/api/v1/backup/list?deviceId=${deviceId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('backups');
      
      // All backups should be for the specified device
      response.body.data.backups.forEach(backup => {
        expect(backup.deviceId).toBe(deviceId);
      });
    });

    test('should reject request without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/backup/list')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/v1/backup/:id', () => {
    test('should get specific backup details', async () => {
      const response = await request(app)
        .get(`/api/v1/backup/${backupId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('backup');
      expect(response.body.data.backup).toHaveProperty('id', backupId);
      expect(response.body.data.backup).toHaveProperty('deviceId', deviceId);
      expect(response.body.data.backup).toHaveProperty('backupType', 'full');
      expect(response.body.data.backup).toHaveProperty('backupName', 'Test Full Backup');
      expect(response.body.data.backup).toHaveProperty('status');
      expect(response.body.data.backup).toHaveProperty('dataTypes');
      expect(response.body.data.backup).toHaveProperty('progress');
      expect(response.body.data.backup).toHaveProperty('size');
      expect(response.body.data.backup).toHaveProperty('createdAt');
    });

    test('should reject request for non-existent backup', async () => {
      const fakeBackupId = '123e4567-e89b-12d3-a456-426614174999';
      
      const response = await request(app)
        .get(`/api/v1/backup/${fakeBackupId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    test('should reject request without authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/backup/${backupId}`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('PUT /api/v1/backup/:id/status', () => {
    test('should update backup status', async () => {
      const statusUpdate = {
        status: 'completed',
        progress: 100,
        size: 2048576, // 2MB
        backupPath: '/backups/test-backup.zip',
        checksumMd5: 'abc123def456',
        backedUpData: {
          contacts: 250,
          photos: 300,
          messages: 1000,
          apps: 50,
          settings: 1
        }
      };

      const response = await request(app)
        .put(`/api/v1/backup/${backupId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(statusUpdate)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Backup status updated successfully');
      expect(response.body.data.backup).toHaveProperty('status', statusUpdate.status);
      expect(response.body.data.backup).toHaveProperty('progress', statusUpdate.progress);
      expect(response.body.data.backup).toHaveProperty('size', statusUpdate.size);
      expect(response.body.data.backup).toHaveProperty('backupPath', statusUpdate.backupPath);
      expect(response.body.data.backup).toHaveProperty('checksumMd5', statusUpdate.checksumMd5);
      expect(response.body.data.backup).toHaveProperty('backedUpData');

      // Verify update in database
      const dbBackup = await query('SELECT * FROM backups WHERE id = $1', [backupId]);
      expect(dbBackup.rows[0].status).toBe(statusUpdate.status);
      expect(dbBackup.rows[0].progress).toBe(statusUpdate.progress);
      expect(dbBackup.rows[0].size).toBe(statusUpdate.size);
    });

    test('should reject status update with invalid status', async () => {
      const invalidUpdate = {
        status: 'invalid_status',
        progress: 50
      };

      const response = await request(app)
        .put(`/api/v1/backup/${backupId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    test('should reject status update without authentication', async () => {
      const statusUpdate = {
        status: 'failed',
        progress: 25,
        errorMessage: 'Test error'
      };

      const response = await request(app)
        .put(`/api/v1/backup/${backupId}/status`)
        .send(statusUpdate)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/v1/backup/:id/restore', () => {
    test('should initiate backup restore', async () => {
      const restoreData = {
        targetDeviceId: deviceId,
        restoreType: 'selective',
        dataTypes: ['contacts', 'photos'],
        overwriteExisting: false
      };

      const response = await request(app)
        .post(`/api/v1/backup/${backupId}/restore`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(restoreData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Restore initiated successfully');
      expect(response.body.data).toHaveProperty('restoreSession');
      expect(response.body.data.restoreSession).toHaveProperty('id');
      expect(response.body.data.restoreSession).toHaveProperty('backupId', backupId);
      expect(response.body.data.restoreSession).toHaveProperty('targetDeviceId', restoreData.targetDeviceId);
      expect(response.body.data.restoreSession).toHaveProperty('restoreType', restoreData.restoreType);
      expect(response.body.data.restoreSession).toHaveProperty('status', 'preparing');
      expect(response.body.data.restoreSession).toHaveProperty('dataTypes');
      expect(response.body.data.restoreSession.dataTypes).toEqual(expect.arrayContaining(restoreData.dataTypes));
    });

    test('should reject restore with invalid target device', async () => {
      const restoreData = {
        targetDeviceId: '123e4567-e89b-12d3-a456-426614174999', // Non-existent
        restoreType: 'full',
        dataTypes: ['contacts']
      };

      const response = await request(app)
        .post(`/api/v1/backup/${backupId}/restore`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(restoreData)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    test('should reject restore with invalid restore type', async () => {
      const restoreData = {
        targetDeviceId: deviceId,
        restoreType: 'invalid_type',
        dataTypes: ['contacts']
      };

      const response = await request(app)
        .post(`/api/v1/backup/${backupId}/restore`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(restoreData)
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    test('should reject restore without authentication', async () => {
      const restoreData = {
        targetDeviceId: deviceId,
        restoreType: 'full',
        dataTypes: ['contacts']
      };

      const response = await request(app)
        .post(`/api/v1/backup/${backupId}/restore`)
        .send(restoreData)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('POST /api/v1/backup/:id/download', () => {
    test('should generate backup download link', async () => {
      const response = await request(app)
        .post(`/api/v1/backup/${backupId}/download`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Download link generated successfully');
      expect(response.body.data).toHaveProperty('downloadUrl');
      expect(response.body.data).toHaveProperty('expiresAt');
      expect(response.body.data).toHaveProperty('fileSize');
      expect(response.body.data).toHaveProperty('fileName');
    });

    test('should reject download for incomplete backup', async () => {
      // Create an incomplete backup for testing
      const incompleteBackupData = {
        deviceId: deviceId,
        backupType: 'incremental',
        dataTypes: ['contacts'],
        backupName: 'Incomplete Test Backup'
      };

      const createResponse = await request(app)
        .post('/api/v1/backup/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteBackupData);

      const incompleteBackupId = createResponse.body.data.backup.id;

      try {
        const response = await request(app)
          .post(`/api/v1/backup/${incompleteBackupId}/download`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(400);

        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('message');
      } finally {
        // Clean up
        await query('DELETE FROM backups WHERE id = $1', [incompleteBackupId]);
      }
    });

    test('should reject download without authentication', async () => {
      const response = await request(app)
        .post(`/api/v1/backup/${backupId}/download`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('DELETE /api/v1/backup/:id', () => {
    test('should delete backup', async () => {
      // Create a temporary backup for deletion test
      const tempBackupData = {
        deviceId: deviceId,
        backupType: 'incremental',
        dataTypes: ['messages'],
        backupName: 'Temp Delete Test Backup'
      };

      const createResponse = await request(app)
        .post('/api/v1/backup/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(tempBackupData);

      const tempBackupId = createResponse.body.data.backup.id;

      // Delete the backup
      const deleteResponse = await request(app)
        .delete(`/api/v1/backup/${tempBackupId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(deleteResponse.body).toHaveProperty('success', true);
      expect(deleteResponse.body).toHaveProperty('message', 'Backup deleted successfully');

      // Verify backup is deleted from database
      const dbBackup = await query('SELECT * FROM backups WHERE id = $1', [tempBackupId]);
      expect(dbBackup.rows).toHaveLength(0);

      // Verify backup is no longer accessible
      await request(app)
        .get(`/api/v1/backup/${tempBackupId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    test('should reject deletion of non-existent backup', async () => {
      const fakeBackupId = '123e4567-e89b-12d3-a456-426614174999';
      
      const response = await request(app)
        .delete(`/api/v1/backup/${fakeBackupId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });

    test('should reject deletion without authentication', async () => {
      const response = await request(app)
        .delete(`/api/v1/backup/${backupId}`)
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Backup Flow Integration', () => {
    test('should complete full backup flow: create -> monitor -> complete -> download -> restore', async () => {
      // Step 1: Create backup
      const backupData = {
        deviceId: deviceId,
        backupType: 'selective',
        dataTypes: ['contacts', 'messages'],
        backupName: 'Flow Test Backup',
        encryption: true
      };

      const createResponse = await request(app)
        .post('/api/v1/backup/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(backupData)
        .expect(201);

      const flowBackupId = createResponse.body.data.backup.id;

      try {
        // Step 2: Monitor initial status
        const statusResponse = await request(app)
          .get(`/api/v1/backup/${flowBackupId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(statusResponse.body.data.backup.status).toBe('creating');

        // Step 3: Update to in-progress
        const progressResponse = await request(app)
          .put(`/api/v1/backup/${flowBackupId}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            status: 'in_progress',
            progress: 50,
            currentStep: 'Backing up contacts'
          })
          .expect(200);

        expect(progressResponse.body.data.backup.status).toBe('in_progress');

        // Step 4: Complete backup
        const completeResponse = await request(app)
          .put(`/api/v1/backup/${flowBackupId}/status`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            status: 'completed',
            progress: 100,
            size: 1024000,
            backupPath: '/backups/flow-test.zip',
            checksumMd5: 'flow123test456',
            backedUpData: {
              contacts: 100,
              messages: 500
            }
          })
          .expect(200);

        expect(completeResponse.body.data.backup.status).toBe('completed');
        expect(completeResponse.body.data.backup.progress).toBe(100);

        // Step 5: Generate download link
        const downloadResponse = await request(app)
          .post(`/api/v1/backup/${flowBackupId}/download`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(downloadResponse.body.data).toHaveProperty('downloadUrl');
        expect(downloadResponse.body.data).toHaveProperty('expiresAt');

        // Step 6: Initiate restore
        const restoreResponse = await request(app)
          .post(`/api/v1/backup/${flowBackupId}/restore`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            targetDeviceId: deviceId,
            restoreType: 'selective',
            dataTypes: ['contacts'],
            overwriteExisting: false
          })
          .expect(200);

        expect(restoreResponse.body.data.restoreSession).toHaveProperty('id');
        expect(restoreResponse.body.data.restoreSession.status).toBe('preparing');

        // Step 7: Verify backup in list
        const listResponse = await request(app)
          .get('/api/v1/backup/list')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const backupIds = listResponse.body.data.backups.map(b => b.id);
        expect(backupIds).toContain(flowBackupId);

      } finally {
        // Cleanup
        await query('DELETE FROM backups WHERE id = $1', [flowBackupId]);
      }
    });
  });
});