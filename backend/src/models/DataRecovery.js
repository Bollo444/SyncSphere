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

class DataRecovery {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.device_id = data.device_id;
    this.session_type = data.session_type;
    this.recovery_type = data.data_types && data.data_types.length > 0 ? data.data_types[0] : data.session_type;
    this.status = data.status;
    this.progress = data.progress_percentage || data.progress || 0;
    this.total_files = data.total_files;
    this.recovered_files = data.recovered_files;
    this.failed_files = data.failed_files;
    this.data_types = data.data_types;
    this.scan_results = data.scan_results;
    this.recovery_options = data.recovery_options;
    this.error_log = data.error_log;
    this.error_message = data.error_message;
    this.estimated_completion = data.estimated_completion;
    this.actual_completion = data.completed_at || data.actual_completion;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create data_recovery_sessions table
  static async createTable() {
    // Table is created by init-db.sql script
    // This method is kept for compatibility but does nothing
    return Promise.resolve();
  }

  // Start a new data recovery session
  static async startRecovery(userId, deviceId, recoveryType, options = {}) {
    const id = uuidv4();
    
    // Map recovery types to session types based on the database schema
    const sessionTypeMap = {
      'deleted_files': 'scan',
      'formatted_drive': 'restore', 
      'corrupted_files': 'scan',
      'system_crash': 'restore',
      'virus_attack': 'scan',
      'hardware_failure': 'restore'
    };
    
    const sessionType = sessionTypeMap[recoveryType] || 'scan';
    
    const query = `
      INSERT INTO data_recovery_sessions (
        id, user_id, device_id, session_type, recovery_options, status, data_types
      ) VALUES ($1, $2, $3, $4, $5, 'pending', $6)
      RETURNING *
    `;

    const values = [
      id,
      userId,
      deviceId,
      sessionType,
      JSON.stringify(options),
      [recoveryType] // Store original recovery type in data_types as PostgreSQL array
    ];

    const result = await getDbPool().query(query, values);
    return new DataRecovery(result.rows[0]);
  }

  // Find recovery session by ID
  static async findById(id) {
    const query = `
      SELECT dr.*, d.device_name, d.device_type, u.email as user_email
      FROM data_recovery_sessions dr
      LEFT JOIN devices d ON dr.device_id = d.id
      LEFT JOIN users u ON dr.user_id = u.id
      WHERE dr.id = $1
    `;

    const result = await getDbPool().query(query, [id]);
    return result.rows[0] ? new DataRecovery(result.rows[0]) : null;
  }

  // Find recovery sessions by user ID
  static async findByUserId(userId, options = {}) {
    const { limit = 20, offset = 0, status, recoveryType } = options;
    
    let query = `
      SELECT dr.*, d.device_name, d.device_type
      FROM data_recovery_sessions dr
      LEFT JOIN devices d ON dr.device_id = d.id
      WHERE dr.user_id = $1
    `;
    
    const values = [userId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND dr.status = $${paramCount}`;
      values.push(status);
    }

    if (recoveryType) {
      paramCount++;
      query += ` AND $${paramCount} = ANY(dr.data_types)`;
      values.push(recoveryType);
    }

    query += ` ORDER BY dr.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    values.push(limit, offset);

    const result = await getDbPool().query(query, values);
    return result.rows.map(row => new DataRecovery(row));
  }

  // Get active recovery sessions
  static async getActiveSessions(userId = null) {
    let query = `
      SELECT dr.*, d.device_name, d.device_type, u.email as user_email
      FROM data_recovery_sessions dr
      LEFT JOIN devices d ON dr.device_id = d.id
      LEFT JOIN users u ON dr.user_id = u.id
      WHERE dr.status IN ('pending', 'in_progress')
    `;
    
    const values = [];
    
    if (userId) {
      query += ` AND dr.user_id = $1`;
      values.push(userId);
    }
    
    query += ` ORDER BY dr.created_at DESC`;

    const result = await getDbPool().query(query, values);
    return result.rows.map(row => new DataRecovery(row));
  }

  // Update recovery progress
  async updateProgress(progress, additionalData = {}) {
    const {
      totalFiles,
      recoveredFiles,
      failedFiles,
      scanResults,
      errorLog,
      estimatedCompletion
    } = additionalData;

    let query = `UPDATE data_recovery_sessions SET progress_percentage = $1`;
    const values = [progress];
    let paramCount = 1;

    if (totalFiles !== undefined) {
      paramCount++;
      query += `, total_files = $${paramCount}`;
      values.push(totalFiles);
    }

    if (recoveredFiles !== undefined) {
      paramCount++;
      query += `, recovered_files = $${paramCount}`;
      values.push(recoveredFiles);
    }

    if (failedFiles !== undefined) {
      paramCount++;
      query += `, failed_files = $${paramCount}`;
      values.push(failedFiles);
    }

    if (scanResults) {
      paramCount++;
      query += `, scan_results = $${paramCount}`;
      values.push(JSON.stringify(scanResults));
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

  // Update recovery status
  async updateStatus(status, completionTime = null) {
    let query = `UPDATE data_recovery_sessions SET status = $1`;
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

  // Cancel recovery session
  async cancel() {
    return this.updateStatus('cancelled', new Date());
  }

  // Pause recovery session (cancel instead since paused is not supported)
  async pause() {
    return this.updateStatus('cancelled');
  }

  // Resume recovery session
  async resume() {
    return this.updateStatus('in_progress');
  }

  // Complete recovery session
  async complete() {
    await this.updateProgress(100);
    return this.updateStatus('completed', new Date());
  }

  // Convert to JSON with camelCase field names for API responses
  toJSON() {
    const options = this.recovery_options || {};
    return {
      id: this.id,
      userId: this.user_id,
      deviceId: this.device_id,
      sessionType: this.session_type,
      recoveryType: this.recovery_type,
      status: this.status,
      progress: this.progress,
      totalFiles: this.total_files,
      recoveredFiles: this.recovered_files,
      failedFiles: this.failed_files,
      dataTypes: this.data_types,
      scanResults: this.scan_results,
      recoveryOptions: this.recovery_options,
      scanDepth: options.scanDepth || options.scan_depth,
      errorLog: this.error_log,
      errorMessage: this.error_message,
      estimatedCompletion: this.estimated_completion,
      actualCompletion: this.actual_completion,
      createdAt: this.created_at,
      updatedAt: this.updated_at,
      deviceName: this.device_name,
      deviceType: this.device_type,
      userEmail: this.user_email
    };
  }

  // Mark as failed
  async markAsFailed(errorMessage) {
    if (errorMessage) {
      await this.updateProgress(this.progress, { errorLog: errorMessage });
    }
    return this.updateStatus('failed', new Date());
  }

  // Get recovery statistics
  static async getRecoveryStats(userId = null, timeRange = '30 days') {
    let query = `
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sessions,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_sessions,
        COUNT(CASE WHEN status IN ('pending', 'in_progress') THEN 1 END) as active_sessions,
        AVG(CASE WHEN status = 'completed' THEN progress END) as avg_completion_rate,
        SUM(recovered_files) as total_recovered_files,
        SUM(failed_files) as total_failed_files,
        recovery_type,
        COUNT(*) as type_count
      FROM data_recovery_sessions
      WHERE created_at >= NOW() - INTERVAL '${timeRange}'
    `;
    
    const values = [];
    
    if (userId) {
      query += ` AND user_id = $1`;
      values.push(userId);
    }
    
    query += ` GROUP BY recovery_type`;

    const result = await getDbPool().query(query, values);
    return result.rows;
  }

  // Delete old completed sessions
  static async cleanupOldSessions(daysOld = 90) {
    const query = `
      DELETE FROM data_recovery_sessions 
      WHERE status IN ('completed', 'failed', 'cancelled') 
      AND created_at < NOW() - INTERVAL '${daysOld} days'
      RETURNING id
    `;

    const result = await getDbPool().query(query);
    return result.rowCount;
  }

  // Get file type distribution for a recovery session
  getFileTypeDistribution() {
    if (!this.file_types || !Array.isArray(this.file_types)) {
      return {};
    }

    return this.file_types.reduce((acc, fileType) => {
      acc[fileType.extension] = {
        count: fileType.count,
        size: fileType.total_size,
        recovered: fileType.recovered || 0
      };
      return acc;
    }, {});
  }

  // Calculate recovery success rate
  getSuccessRate() {
    if (!this.total_files || this.total_files === 0) {
      return 0;
    }
    return Math.round((this.recovered_files / this.total_files) * 100);
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


}

module.exports = DataRecovery;