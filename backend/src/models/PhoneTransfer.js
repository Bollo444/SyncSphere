const { getPool } = require('../config/database');

const getDbPool = () => {
  try {
    return getPool();
  } catch (error) {
    // For testing, return a mock pool
    if (process.env.NODE_ENV === 'test') {
      return {
        query: jest.fn().mockResolvedValue({ rows: [] })
      };
    }
    throw error;
  }
};
const { v4: uuidv4 } = require('uuid');
const AppError = require('../utils/AppError');

class PhoneTransfer {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.source_device_id = data.source_device_id;
    this.target_device_id = data.target_device_id;
    this.transfer_type = data.transfer_type;
    this.status = data.status;
    this.progress = data.progress;
    this.data_types = data.data_types;
    this.total_items = data.total_items;
    this.transferred_items = data.transferred_items;
    this.failed_items = data.failed_items;
    this.transfer_size = data.transfer_size;
    this.transferred_size = data.transferred_size;
    this.transfer_speed = data.transfer_speed;
    this.connection_method = data.connection_method;
    this.encryption_enabled = data.encryption_enabled;
    this.compression_enabled = data.compression_enabled;
    this.transfer_options = data.transfer_options;
    this.error_log = data.error_log;
    this.estimated_completion = data.estimated_completion;
    this.actual_completion = data.actual_completion;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create phone_transfers table
  static async createTable() {
    try {
      // First, create the function if it doesn't exist
      await getDbPool().query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql';
      `);

      // Then create the table
      await getDbPool().query(`
        CREATE TABLE IF NOT EXISTS phone_transfers (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          source_device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
          target_device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
          transfer_type VARCHAR(50) NOT NULL CHECK (transfer_type IN ('full_transfer', 'selective_transfer', 'backup_restore', 'clone_device')),
          status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'preparing', 'connecting', 'transferring', 'verifying', 'completed', 'failed', 'cancelled', 'paused')),
          progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
          data_types JSONB DEFAULT '[]'::jsonb,
          total_items INTEGER DEFAULT 0,
          transferred_items INTEGER DEFAULT 0,
          failed_items INTEGER DEFAULT 0,
          transfer_size BIGINT DEFAULT 0,
          transferred_size BIGINT DEFAULT 0,
          transfer_speed FLOAT DEFAULT 0,
          connection_method VARCHAR(20) CHECK (connection_method IN ('wifi', 'cable', 'bluetooth', 'cloud')),
          encryption_enabled BOOLEAN DEFAULT true,
          compression_enabled BOOLEAN DEFAULT true,
          transfer_options JSONB DEFAULT '{}'::jsonb,
          error_log TEXT[],
          estimated_completion TIMESTAMP,
          actual_completion TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT different_devices CHECK (source_device_id != target_device_id)
        );
      `);

      // Create indexes
      await getDbPool().query(`
        CREATE INDEX IF NOT EXISTS idx_phone_transfers_user_id ON phone_transfers(user_id);
        CREATE INDEX IF NOT EXISTS idx_phone_transfers_source_device ON phone_transfers(source_device_id);
        CREATE INDEX IF NOT EXISTS idx_phone_transfers_target_device ON phone_transfers(target_device_id);
        CREATE INDEX IF NOT EXISTS idx_phone_transfers_status ON phone_transfers(status);
        CREATE INDEX IF NOT EXISTS idx_phone_transfers_created_at ON phone_transfers(created_at);
      `);

      // Finally, create the trigger (drop first to avoid conflicts)
      try {
        await getDbPool().query(`DROP TRIGGER IF EXISTS update_phone_transfers_updated_at ON phone_transfers;`);
        await getDbPool().query(`
          CREATE TRIGGER update_phone_transfers_updated_at
            BEFORE UPDATE ON phone_transfers
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        `);
      } catch (triggerError) {
        // Ignore trigger creation errors as they're not critical
        console.log('Note: Trigger creation skipped:', triggerError.message);
      }
    } catch (error) {
      console.error('Error creating phone_transfers table:', error);
      throw error;
    }
  }

  // Start a new phone transfer
  static async startTransfer(userId, sourceDeviceId, targetDeviceId, transferType, dataTypes, options = {}) {
    const id = uuidv4();
    const query = `
      INSERT INTO phone_transfers (
        id, user_id, source_device_id, target_device_id, transfer_type, 
        data_types, connection_method, encryption_enabled, compression_enabled, transfer_options
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      id,
      userId,
      sourceDeviceId,
      targetDeviceId,
      transferType,
      JSON.stringify(dataTypes),
      options.connectionMethod || 'wifi',
      options.encryptionEnabled !== false,
      options.compressionEnabled !== false,
      JSON.stringify(options)
    ];

    const result = await getDbPool().query(query, values);
    return new PhoneTransfer(result.rows[0]);
  }

  // Find transfer by ID
  static async findById(id) {
    const query = `
      SELECT pt.*, 
        sd.device_name as source_device_name, sd.device_type as source_device_type, sd.os_version as source_os_version,
        td.device_name as target_device_name, td.device_type as target_device_type, td.os_version as target_os_version,
        u.email as user_email
      FROM phone_transfers pt
      LEFT JOIN devices sd ON pt.source_device_id = sd.id
      LEFT JOIN devices td ON pt.target_device_id = td.id
      LEFT JOIN users u ON pt.user_id = u.id
      WHERE pt.id = $1
    `;

    const result = await getDbPool().query(query, [id]);
    return result.rows[0] ? new PhoneTransfer(result.rows[0]) : null;
  }

  // Find transfers by user ID
  static async findByUserId(userId, options = {}) {
    const { limit = 20, offset = 0, status, transferType } = options;
    
    let query = `
      SELECT pt.*, 
        sd.device_name as source_device_name, sd.device_type as source_device_type,
        td.device_name as target_device_name, td.device_type as target_device_type
      FROM phone_transfers pt
      LEFT JOIN devices sd ON pt.source_device_id = sd.id
      LEFT JOIN devices td ON pt.target_device_id = td.id
      WHERE pt.user_id = $1
    `;
    
    const values = [userId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND pt.status = $${paramCount}`;
      values.push(status);
    }

    if (transferType) {
      paramCount++;
      query += ` AND pt.transfer_type = $${paramCount}`;
      values.push(transferType);
    }

    query += ` ORDER BY pt.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);

    const result = await getDbPool().query(query, values);
    return result.rows.map(row => new PhoneTransfer(row));
  }

  // Get active transfers
  static async getActiveTransfers(userId = null) {
    let query = `
      SELECT pt.*, 
        sd.device_name as source_device_name, sd.device_type as source_device_type,
        td.device_name as target_device_name, td.device_type as target_device_type,
        u.email as user_email
      FROM phone_transfers pt
      LEFT JOIN devices sd ON pt.source_device_id = sd.id
      LEFT JOIN devices td ON pt.target_device_id = td.id
      LEFT JOIN users u ON pt.user_id = u.id
      WHERE pt.status IN ('pending', 'preparing', 'connecting', 'transferring', 'verifying', 'paused')
    `;
    
    const values = [];
    
    if (userId) {
      query += ` AND pt.user_id = $1`;
      values.push(userId);
    }
    
    query += ` ORDER BY pt.created_at DESC`;

    const result = await getDbPool().query(query, values);
    return result.rows.map(row => new PhoneTransfer(row));
  }

  // Update transfer progress
  async updateProgress(progress, additionalData = {}) {
    const {
      totalItems,
      transferredItems,
      failedItems,
      transferSize,
      transferredSize,
      transferSpeed,
      errorLog,
      estimatedCompletion
    } = additionalData;

    let query = `UPDATE phone_transfers SET progress = $1`;
    const values = [progress];
    let paramCount = 1;

    if (totalItems !== undefined) {
      paramCount++;
      query += `, total_items = $${paramCount}`;
      values.push(totalItems);
    }

    if (transferredItems !== undefined) {
      paramCount++;
      query += `, transferred_items = $${paramCount}`;
      values.push(transferredItems);
    }

    if (failedItems !== undefined) {
      paramCount++;
      query += `, failed_items = $${paramCount}`;
      values.push(failedItems);
    }

    if (transferSize !== undefined) {
      paramCount++;
      query += `, transfer_size = $${paramCount}`;
      values.push(transferSize);
    }

    if (transferredSize !== undefined) {
      paramCount++;
      query += `, transferred_size = $${paramCount}`;
      values.push(transferredSize);
    }

    if (transferSpeed !== undefined) {
      paramCount++;
      query += `, transfer_speed = $${paramCount}`;
      values.push(transferSpeed);
    }

    if (errorLog) {
      paramCount++;
      query += `, error_log = array_append(COALESCE(error_log, ARRAY[]::text[]), $${paramCount})`;
      values.push(errorLog);
    }

    if (estimatedCompletion) {
      paramCount++;
      query += `, estimated_completion = $${paramCount}`;
      values.push(estimatedCompletion);
    }

    query += ` WHERE id = $${paramCount + 1} RETURNING *`;
    values.push(this.id);

    const result = await getDbPool().query(query, values);
    if (result.rows[0]) {
      Object.assign(this, result.rows[0]);
    }
    return this;
  }

  // Update transfer status
  async updateStatus(status, completionTime = null) {
    let query = `UPDATE phone_transfers SET status = $1`;
    const values = [status];
    
    if (completionTime && (status === 'completed' || status === 'failed' || status === 'cancelled')) {
      query += `, actual_completion = $2 WHERE id = $3 RETURNING *`;
      values.push(completionTime, this.id);
    } else {
      query += ` WHERE id = $2 RETURNING *`;
      values.push(this.id);
    }

    const result = await getDbPool().query(query, values);
    if (result.rows[0]) {
      Object.assign(this, result.rows[0]);
    }
    return this;
  }

  // Cancel transfer
  async cancel() {
    return this.updateStatus('cancelled', new Date());
  }

  // Pause transfer
  async pause() {
    return this.updateStatus('paused');
  }

  // Resume transfer
  async resume() {
    return this.updateStatus('connecting');
  }

  // Complete transfer
  async complete() {
    await this.updateProgress(100);
    return this.updateStatus('completed', new Date());
  }

  // Mark as failed
  async markAsFailed(errorMessage) {
    if (errorMessage) {
      await this.updateProgress(this.progress, { errorLog: errorMessage });
    }
    return this.updateStatus('failed', new Date());
  }

  // Get transfer statistics
  static async getTransferStats(userId = null, timeRange = '30 days') {
    let query = `
      SELECT 
        COUNT(*) as total_transfers,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_transfers,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transfers,
        COUNT(CASE WHEN status IN ('pending', 'preparing', 'connecting', 'transferring', 'verifying', 'paused') THEN 1 END) as active_transfers,
        AVG(CASE WHEN status = 'completed' THEN progress END) as avg_completion_rate,
        SUM(transferred_items) as total_transferred_items,
        SUM(failed_items) as total_failed_items,
        SUM(transferred_size) as total_transferred_size,
        AVG(transfer_speed) as avg_transfer_speed,
        transfer_type,
        COUNT(*) as type_count
      FROM phone_transfers
      WHERE created_at >= NOW() - INTERVAL '${timeRange}'
    `;
    
    const values = [];
    
    if (userId) {
      query += ` AND user_id = $1`;
      values.push(userId);
    }
    
    query += ` GROUP BY transfer_type`;

    const result = await getDbPool().query(query, values);
    return result.rows;
  }

  // Delete old completed transfers
  static async cleanupOldTransfers(daysOld = 90) {
    const query = `
      DELETE FROM phone_transfers 
      WHERE status IN ('completed', 'failed', 'cancelled') 
      AND created_at < NOW() - INTERVAL '${daysOld} days'
      RETURNING id
    `;

    const result = await getDbPool().query(query);
    return result.rowCount;
  }

  // Calculate transfer success rate
  getSuccessRate() {
    if (!this.total_items || this.total_items === 0) {
      return 0;
    }
    return Math.round((this.transferred_items / this.total_items) * 100);
  }

  // Get estimated time remaining
  getEstimatedTimeRemaining() {
    if (!this.estimated_completion) {
      return null;
    }
    
    const now = new Date();
    const estimated = new Date(this.estimated_completion);
    const remaining = estimated.getTime() - now.getTime();
    
    return remaining > 0 ? remaining : 0;
  }

  // Get transfer speed in human readable format
  getFormattedTransferSpeed() {
    if (!this.transfer_speed) {
      return '0 MB/s';
    }

    const speed = this.transfer_speed; // Assuming speed is in MB/s
    if (speed < 1) {
      return `${(speed * 1024).toFixed(1)} KB/s`;
    } else if (speed < 1024) {
      return `${speed.toFixed(1)} MB/s`;
    } else {
      return `${(speed / 1024).toFixed(1)} GB/s`;
    }
  }

  // Get formatted transfer size
  getFormattedTransferSize() {
    if (!this.transfer_size) {
      return '0 B';
    }

    const size = this.transfer_size; // Assuming size is in bytes
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let unitIndex = 0;
    let formattedSize = size;

    while (formattedSize >= 1024 && unitIndex < units.length - 1) {
      formattedSize /= 1024;
      unitIndex++;
    }

    return `${formattedSize.toFixed(1)} ${units[unitIndex]}`;
  }

  // Get data types summary
  getDataTypesSummary() {
    if (!this.data_types || !Array.isArray(this.data_types)) {
      return {};
    }

    return this.data_types.reduce((acc, dataType) => {
      acc[dataType.type] = {
        count: dataType.count,
        size: dataType.size,
        transferred: dataType.transferred || 0,
        enabled: dataType.enabled !== false
      };
      return acc;
    }, {});
  }

  // Convert to JSON for API responses
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      source_device: {
        id: this.source_device_id,
        name: this.source_device_name,
        type: this.source_device_type,
        os_version: this.source_os_version
      },
      target_device: {
        id: this.target_device_id,
        name: this.target_device_name,
        type: this.target_device_type,
        os_version: this.target_os_version
      },
      transfer_type: this.transfer_type,
      status: this.status,
      progress: this.progress,
      data_types: this.data_types,
      total_items: this.total_items,
      transferred_items: this.transferred_items,
      failed_items: this.failed_items,
      transfer_size: this.transfer_size,
      transferred_size: this.transferred_size,
      transfer_speed: this.transfer_speed,
      formatted_transfer_speed: this.getFormattedTransferSpeed(),
      formatted_transfer_size: this.getFormattedTransferSize(),
      connection_method: this.connection_method,
      encryption_enabled: this.encryption_enabled,
      compression_enabled: this.compression_enabled,
      success_rate: this.getSuccessRate(),
      estimated_time_remaining: this.getEstimatedTimeRemaining(),
      data_types_summary: this.getDataTypesSummary(),
      created_at: this.created_at,
      updated_at: this.updated_at,
      estimated_completion: this.estimated_completion,
      actual_completion: this.actual_completion
    };
  }
}

module.exports = PhoneTransfer;