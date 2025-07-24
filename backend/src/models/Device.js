const { query } = require('../config/database');
const crypto = require('crypto');

class Device {
  constructor(deviceData) {
    this.id = deviceData.id;
    this.userId = deviceData.user_id;
    this.deviceType = deviceData.device_type;
    this.deviceModel = deviceData.device_model;
    this.osVersion = deviceData.os_version;
    this.serialNumber = deviceData.serial_number;
    this.deviceName = deviceData.device_name;
    this.connectionId = deviceData.connection_id;
    this.status = deviceData.status;
    this.lastConnected = deviceData.last_connected;
    this.capabilities = deviceData.capabilities;
    this.metadata = deviceData.metadata;
    this.createdAt = deviceData.created_at;
    this.updatedAt = deviceData.updated_at;
  }

  // Create device table
  static async createTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS devices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_type VARCHAR(20) NOT NULL CHECK (device_type IN ('ios', 'android')),
        device_model VARCHAR(100) NOT NULL,
        os_version VARCHAR(20) NOT NULL,
        serial_number VARCHAR(100),
        device_name VARCHAR(100),
        connection_id VARCHAR(255) UNIQUE,
        status VARCHAR(20) DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'connecting', 'error')),
        last_connected TIMESTAMP,
        capabilities JSONB DEFAULT '{}',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
      CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(device_type);
      CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
      CREATE INDEX IF NOT EXISTS idx_devices_connection_id ON devices(connection_id);
      CREATE INDEX IF NOT EXISTS idx_devices_last_connected ON devices(last_connected);
    `;
    
    await query(createTableQuery);
  }

  // Connect a new device
  static async connect(deviceData) {
    const {
      userId,
      deviceType,
      deviceModel,
      osVersion,
      serialNumber,
      deviceName,
      capabilities = {},
      metadata = {}
    } = deviceData;
    
    // Generate unique connection ID
    const connectionId = crypto.randomBytes(16).toString('hex');
    
    // Check if device already exists for this user
    let existingDevice = null;
    if (serialNumber) {
      const existingResult = await query(
        'SELECT * FROM devices WHERE user_id = $1 AND serial_number = $2',
        [userId, serialNumber]
      );
      
      if (existingResult.rows.length > 0) {
        existingDevice = new Device(existingResult.rows[0]);
      }
    }
    
    if (existingDevice) {
      // Update existing device
      const updateQuery = `
        UPDATE devices 
        SET device_model = $1, os_version = $2, device_name = $3, 
            connection_id = $4, status = 'connected', last_connected = CURRENT_TIMESTAMP,
            capabilities = $5, metadata = $6, updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING *
      `;
      
      const result = await query(updateQuery, [
        deviceModel,
        osVersion,
        deviceName,
        connectionId,
        JSON.stringify(capabilities),
        JSON.stringify(metadata),
        existingDevice.id
      ]);
      
      return new Device(result.rows[0]);
    } else {
      // Create new device
      const insertQuery = `
        INSERT INTO devices (
          user_id, device_type, device_model, os_version, serial_number,
          device_name, connection_id, status, last_connected, capabilities, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'connected', CURRENT_TIMESTAMP, $8, $9)
        RETURNING *
      `;
      
      const result = await query(insertQuery, [
        userId,
        deviceType,
        deviceModel,
        osVersion,
        serialNumber,
        deviceName,
        connectionId,
        JSON.stringify(capabilities),
        JSON.stringify(metadata)
      ]);
      
      return new Device(result.rows[0]);
    }
  }

  // Find device by ID
  static async findById(id) {
    const result = await query(
      'SELECT * FROM devices WHERE id = $1',
      [id]
    );
    
    return result.rows.length > 0 ? new Device(result.rows[0]) : null;
  }

  // Find device by connection ID
  static async findByConnectionId(connectionId) {
    const result = await query(
      'SELECT * FROM devices WHERE connection_id = $1',
      [connectionId]
    );
    
    return result.rows.length > 0 ? new Device(result.rows[0]) : null;
  }

  // Find devices by user ID
  static async findByUserId(userId, options = {}) {
    const { status, deviceType, limit = 50, offset = 0 } = options;
    
    let whereConditions = ['user_id = $1'];
    let params = [userId];
    let paramCount = 2;
    
    if (status) {
      whereConditions.push(`status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }
    
    if (deviceType) {
      whereConditions.push(`device_type = $${paramCount}`);
      params.push(deviceType);
      paramCount++;
    }
    
    const selectQuery = `
      SELECT * FROM devices 
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY last_connected DESC, created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    
    params.push(limit, offset);
    
    const result = await query(selectQuery, params);
    
    return result.rows.map(row => new Device(row));
  }

  // Update device status
  async updateStatus(status, metadata = {}) {
    const validStatuses = ['connected', 'disconnected', 'connecting', 'error'];
    
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}`);
    }
    
    const updateQuery = `
      UPDATE devices 
      SET status = $1, metadata = $2, updated_at = CURRENT_TIMESTAMP
      ${status === 'connected' ? ', last_connected = CURRENT_TIMESTAMP' : ''}
      WHERE id = $3
      RETURNING *
    `;
    
    const result = await query(updateQuery, [
      status,
      JSON.stringify({ ...this.metadata, ...metadata }),
      this.id
    ]);
    
    if (result.rows.length > 0) {
      const updatedDevice = new Device(result.rows[0]);
      Object.assign(this, updatedDevice);
    }
  }

  // Disconnect device
  async disconnect() {
    await this.updateStatus('disconnected');
    
    // Clear connection ID
    await query(
      'UPDATE devices SET connection_id = NULL WHERE id = $1',
      [this.id]
    );
    
    this.connectionId = null;
  }

  // Update device capabilities
  async updateCapabilities(capabilities) {
    const updateQuery = `
      UPDATE devices 
      SET capabilities = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING capabilities
    `;
    
    const result = await query(updateQuery, [
      JSON.stringify({ ...this.capabilities, ...capabilities }),
      this.id
    ]);
    
    if (result.rows.length > 0) {
      this.capabilities = result.rows[0].capabilities;
    }
  }

  // Check if device supports a specific capability
  hasCapability(capability) {
    return this.capabilities && this.capabilities[capability] === true;
  }

  // Get device compatibility info
  getCompatibilityInfo() {
    const compatibility = {
      dataRecovery: true,
      phoneTransfer: true,
      screenUnlock: false,
      systemRepair: false,
      dataEraser: true,
      whatsappTransfer: false
    };
    
    // iOS specific capabilities
    if (this.deviceType === 'ios') {
      const majorVersion = parseInt(this.osVersion.split('.')[0]);
      
      compatibility.screenUnlock = majorVersion >= 12;
      compatibility.systemRepair = majorVersion >= 13;
      compatibility.whatsappTransfer = majorVersion >= 14;
    }
    
    // Android specific capabilities
    if (this.deviceType === 'android') {
      const majorVersion = parseInt(this.osVersion.split('.')[0]);
      
      compatibility.screenUnlock = majorVersion >= 8;
      compatibility.systemRepair = majorVersion >= 9;
      compatibility.whatsappTransfer = majorVersion >= 10;
    }
    
    return compatibility;
  }

  // Update device metadata
  async updateMetadata(newMetadata) {
    const updateQuery = `
      UPDATE devices 
      SET metadata = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING metadata
    `;
    
    const result = await query(updateQuery, [
      JSON.stringify({ ...this.metadata, ...newMetadata }),
      this.id
    ]);
    
    if (result.rows.length > 0) {
      this.metadata = result.rows[0].metadata;
    }
  }

  // Delete device
  async delete() {
    await query('DELETE FROM devices WHERE id = $1', [this.id]);
  }

  // Get device statistics
  static async getStatistics(userId) {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_devices,
        COUNT(CASE WHEN status = 'connected' THEN 1 END) as connected_devices,
        COUNT(CASE WHEN device_type = 'ios' THEN 1 END) as ios_devices,
        COUNT(CASE WHEN device_type = 'android' THEN 1 END) as android_devices,
        MAX(last_connected) as last_connection
      FROM devices 
      WHERE user_id = $1
    `;
    
    const result = await query(statsQuery, [userId]);
    
    return result.rows[0] || {
      total_devices: 0,
      connected_devices: 0,
      ios_devices: 0,
      android_devices: 0,
      last_connection: null
    };
  }

  // Clean up old disconnected devices
  static async cleanupOldDevices(daysOld = 30) {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    
    const result = await query(
      'DELETE FROM devices WHERE status = \'disconnected\' AND last_connected < $1',
      [cutoffDate]
    );
    
    return result.rowCount;
  }

  // Get device's public data (safe for API responses)
  toJSON() {
    return {
      id: this.id,
      deviceType: this.deviceType,
      deviceModel: this.deviceModel,
      osVersion: this.osVersion,
      deviceName: this.deviceName,
      status: this.status,
      lastConnected: this.lastConnected,
      capabilities: this.capabilities,
      compatibility: this.getCompatibilityInfo(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Device;