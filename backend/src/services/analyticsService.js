const { query } = require('../config/database');
const redis = require('../config/redis');
const AppError = require('../utils/AppError');

class AnalyticsService {
  // Initialize analytics tables
  static async initializeTables() {
    const { usingSQLite } = require('../config/database');
    
    if (usingSQLite) {
      // SQLite-compatible schema
      const createTablesQuery = `
        -- User activity tracking
        CREATE TABLE IF NOT EXISTS user_activities (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          user_id TEXT,
          activity_type VARCHAR(50) NOT NULL,
          activity_data TEXT DEFAULT '{}',
          ip_address TEXT,
          user_agent TEXT,
          session_id VARCHAR(255),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- System metrics
        CREATE TABLE IF NOT EXISTS system_metrics (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          metric_type VARCHAR(50) NOT NULL,
          metric_name VARCHAR(100) NOT NULL,
          metric_value REAL,
          metric_data TEXT DEFAULT '{}',
          recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Business metrics
        CREATE TABLE IF NOT EXISTS business_metrics (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          metric_date DATE NOT NULL,
          metric_type VARCHAR(50) NOT NULL,
          metric_value REAL NOT NULL,
          metric_data TEXT DEFAULT '{}',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(metric_date, metric_type)
        );

        -- Error tracking
        CREATE TABLE IF NOT EXISTS error_logs (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          user_id TEXT,
          error_type VARCHAR(100) NOT NULL,
          error_message TEXT,
          error_stack TEXT,
          request_url TEXT,
          request_method VARCHAR(10),
          request_data TEXT,
          ip_address TEXT,
          user_agent TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Performance metrics
        CREATE TABLE IF NOT EXISTS performance_metrics (
          id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
          endpoint VARCHAR(255) NOT NULL,
          method VARCHAR(10) NOT NULL,
          response_time INTEGER NOT NULL,
          status_code INTEGER NOT NULL,
          user_id TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type);
        CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at);
        
        CREATE INDEX IF NOT EXISTS idx_system_metrics_type ON system_metrics(metric_type);
        CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded_at ON system_metrics(recorded_at);
        
        CREATE INDEX IF NOT EXISTS idx_business_metrics_date ON business_metrics(metric_date);
        CREATE INDEX IF NOT EXISTS idx_business_metrics_type ON business_metrics(metric_type);
        
        CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs(error_type);
        CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);
        
        CREATE INDEX IF NOT EXISTS idx_performance_metrics_endpoint ON performance_metrics(endpoint);
        CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(created_at);
      `;
      await query(createTablesQuery);
    } else {
      // PostgreSQL schema
      const createTablesQuery = `
        -- User activity tracking
        CREATE TABLE IF NOT EXISTS user_activities (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          activity_type VARCHAR(50) NOT NULL,
          activity_data JSONB DEFAULT '{}',
          ip_address INET,
          user_agent TEXT,
          session_id VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- System metrics
        CREATE TABLE IF NOT EXISTS system_metrics (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          metric_type VARCHAR(50) NOT NULL,
          metric_name VARCHAR(100) NOT NULL,
          metric_value NUMERIC,
          metric_data JSONB DEFAULT '{}',
          recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Business metrics
        CREATE TABLE IF NOT EXISTS business_metrics (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          metric_date DATE NOT NULL,
          metric_type VARCHAR(50) NOT NULL,
          metric_value NUMERIC NOT NULL,
          metric_data JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(metric_date, metric_type)
        );

        -- Error tracking
        CREATE TABLE IF NOT EXISTS error_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          error_type VARCHAR(100) NOT NULL,
          error_message TEXT,
          error_stack TEXT,
          request_url TEXT,
          request_method VARCHAR(10),
          request_data JSONB,
          ip_address INET,
          user_agent TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Performance metrics
        CREATE TABLE IF NOT EXISTS performance_metrics (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          endpoint VARCHAR(255) NOT NULL,
          method VARCHAR(10) NOT NULL,
          response_time INTEGER NOT NULL, -- in milliseconds
          status_code INTEGER NOT NULL,
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type);
        CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at);
        
        CREATE INDEX IF NOT EXISTS idx_system_metrics_type ON system_metrics(metric_type);
        CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded_at ON system_metrics(recorded_at);
        
        CREATE INDEX IF NOT EXISTS idx_business_metrics_date ON business_metrics(metric_date);
        CREATE INDEX IF NOT EXISTS idx_business_metrics_type ON business_metrics(metric_type);
        
        CREATE INDEX IF NOT EXISTS idx_error_logs_type ON error_logs(error_type);
        CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);
        
        CREATE INDEX IF NOT EXISTS idx_performance_metrics_endpoint ON performance_metrics(endpoint);
        CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(created_at);
      `;
      await query(createTablesQuery);
     }
  }

  // Track user activity
  static async trackUserActivity(userId, activityType, activityData = {}, metadata = {}) {
    try {
      const queryText = `
        INSERT INTO user_activities (
          user_id, activity_type, activity_data, ip_address, user_agent, session_id
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;

      const values = [
        userId,
        activityType,
        JSON.stringify(activityData),
        metadata.ipAddress || null,
        metadata.userAgent || null,
        metadata.sessionId || null
      ];

      const result = await query(queryText, values);
      
      // Also cache recent activity in Redis for real-time analytics
      const cacheKey = `user_activity:${userId}:recent`;
      const activityRecord = {
        id: result.rows[0].id,
        type: activityType,
        data: activityData,
        timestamp: new Date().toISOString()
      };
      
      await redis.lpush(cacheKey, JSON.stringify(activityRecord));
      await redis.ltrim(cacheKey, 0, 99); // Keep last 100 activities
      await redis.expire(cacheKey, 86400); // Expire after 24 hours

      return result.rows[0].id;
    } catch (error) {
      console.error('Error tracking user activity:', error);
      throw error;
    }
  }

  // Record system metrics
  static async recordSystemMetric(metricType, metricName, metricValue, metricData = {}) {
    try {
      const queryText = `
        INSERT INTO system_metrics (metric_type, metric_name, metric_value, metric_data)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `;

      const values = [
        metricType,
        metricName,
        metricValue,
        JSON.stringify(metricData)
      ];

      const result = await query(queryText, values);
      
      // Cache latest metrics in Redis
      const cacheKey = `system_metrics:${metricType}:${metricName}`;
      const metricRecord = {
        value: metricValue,
        data: metricData,
        timestamp: new Date().toISOString()
      };
      
      await redis.setex(cacheKey, 3600, JSON.stringify(metricRecord)); // Cache for 1 hour

      return result.rows[0].id;
    } catch (error) {
      console.error('Error recording system metric:', error);
      throw error;
    }
  }

  // Record business metrics
  static async recordBusinessMetric(metricDate, metricType, metricValue, metricData = {}) {
    try {
      const queryText = `
        INSERT INTO business_metrics (metric_date, metric_type, metric_value, metric_data)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (metric_date, metric_type)
        DO UPDATE SET 
          metric_value = EXCLUDED.metric_value,
          metric_data = EXCLUDED.metric_data,
          created_at = CURRENT_TIMESTAMP
        RETURNING id
      `;

      const values = [
        metricDate,
        metricType,
        metricValue,
        JSON.stringify(metricData)
      ];

      const result = await query(queryText, values);
      return result.rows[0].id;
    } catch (error) {
      console.error('Error recording business metric:', error);
      throw error;
    }
  }

  // Log errors
  static async logError(error, metadata = {}) {
    try {
      const queryText = `
        INSERT INTO error_logs (
          user_id, error_type, error_message, error_stack, 
          request_url, request_method, request_data, ip_address, user_agent
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `;

      const values = [
        metadata.userId || null,
        error.name || 'Error',
        error.message || 'Unknown error',
        error.stack || null,
        metadata.requestUrl || null,
        metadata.requestMethod || null,
        metadata.requestData ? JSON.stringify(metadata.requestData) : null,
        metadata.ipAddress || null,
        metadata.userAgent || null
      ];

      const result = await query(queryText, values);
      return result.rows[0].id;
    } catch (logError) {
      console.error('Error logging error:', logError);
      // Don't throw here to avoid infinite loops
    }
  }

  // Record performance metrics
  static async recordPerformanceMetric(endpoint, method, responseTime, statusCode, userId = null) {
    try {
      const queryText = `
        INSERT INTO performance_metrics (endpoint, method, response_time, status_code, user_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;

      const values = [endpoint, method, responseTime, statusCode, userId];
      const result = await query(queryText, values);
      
      // Update real-time performance metrics in Redis
      const cacheKey = `performance:${endpoint}:${method}`;
      const performanceData = {
        response_time: responseTime,
        status_code: statusCode,
        timestamp: new Date().toISOString()
      };
      
      await redis.lpush(cacheKey, JSON.stringify(performanceData));
      await redis.ltrim(cacheKey, 0, 999); // Keep last 1000 requests
      await redis.expire(cacheKey, 86400); // Expire after 24 hours

      return result.rows[0].id;
    } catch (error) {
      console.error('Error recording performance metric:', error);
      // Don't throw to avoid affecting request performance
    }
  }

  // Get user activity analytics
  static async getUserActivityAnalytics(userId, options = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate = new Date(),
        activityTypes = null
      } = options;

      let queryText = `
        SELECT 
          activity_type,
          COUNT(*) as count,
          DATE_TRUNC('day', created_at) as date
        FROM user_activities
        WHERE user_id = $1 AND created_at BETWEEN $2 AND $3
      `;

      const values = [userId, startDate, endDate];

      if (activityTypes && activityTypes.length > 0) {
        queryText += ` AND activity_type = ANY($4)`;
        values.push(activityTypes);
      }

      queryText += ` GROUP BY activity_type, DATE_TRUNC('day', created_at) ORDER BY date DESC`;

      const result = await query(queryText, values);
      
      // Group by activity type
      const analytics = {};
      result.rows.forEach(row => {
        if (!analytics[row.activity_type]) {
          analytics[row.activity_type] = [];
        }
        analytics[row.activity_type].push({
          date: row.date,
          count: parseInt(row.count)
        });
      });

      return analytics;
    } catch (error) {
      console.error('Error getting user activity analytics:', error);
      throw error;
    }
  }

  // Get system performance analytics
  static async getSystemPerformanceAnalytics(options = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
        endDate = new Date(),
        endpoint = null
      } = options;

      let queryText = `
        SELECT 
          endpoint,
          method,
          AVG(response_time) as avg_response_time,
          MIN(response_time) as min_response_time,
          MAX(response_time) as max_response_time,
          COUNT(*) as request_count,
          COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count
        FROM performance_metrics
        WHERE created_at BETWEEN $1 AND $2
      `;

      const values = [startDate, endDate];

      if (endpoint) {
        queryText += ` AND endpoint = $3`;
        values.push(endpoint);
      }

      queryText += ` GROUP BY endpoint, method ORDER BY request_count DESC`;

      const result = await query(queryText, values);
      
      return result.rows.map(row => ({
        endpoint: row.endpoint,
        method: row.method,
        avg_response_time: Math.round(parseFloat(row.avg_response_time)),
        min_response_time: parseInt(row.min_response_time),
        max_response_time: parseInt(row.max_response_time),
        request_count: parseInt(row.request_count),
        error_count: parseInt(row.error_count),
        error_rate: parseFloat((row.error_count / row.request_count * 100).toFixed(2))
      }));
    } catch (error) {
      console.error('Error getting system performance analytics:', error);
      throw error;
    }
  }

  // Get business metrics dashboard
  static async getBusinessMetricsDashboard(options = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate = new Date(),
        metricTypes = ['daily_active_users', 'new_registrations', 'data_recovery_sessions', 'phone_transfers', 'subscription_revenue']
      } = options;

      const queryText = `
        SELECT 
          metric_date,
          metric_type,
          metric_value,
          metric_data
        FROM business_metrics
        WHERE metric_date BETWEEN $1 AND $2
          AND metric_type = ANY($3)
        ORDER BY metric_date DESC, metric_type
      `;

      const values = [startDate, endDate, metricTypes];
      const result = await query(queryText, values);
      
      // Group by metric type
      const dashboard = {};
      result.rows.forEach(row => {
        if (!dashboard[row.metric_type]) {
          dashboard[row.metric_type] = [];
        }
        dashboard[row.metric_type].push({
          date: row.metric_date,
          value: parseFloat(row.metric_value),
          data: row.metric_data
        });
      });

      return dashboard;
    } catch (error) {
      console.error('Error getting business metrics dashboard:', error);
      throw error;
    }
  }

  // Get error analytics
  static async getErrorAnalytics(options = {}) {
    try {
      const {
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        endDate = new Date(),
        errorType = null
      } = options;

      let queryText = `
        SELECT 
          error_type,
          error_message,
          COUNT(*) as occurrence_count,
          MAX(created_at) as last_occurrence
        FROM error_logs
        WHERE created_at BETWEEN $1 AND $2
      `;

      const values = [startDate, endDate];

      if (errorType) {
        queryText += ` AND error_type = $3`;
        values.push(errorType);
      }

      queryText += ` GROUP BY error_type, error_message ORDER BY occurrence_count DESC LIMIT 50`;

      const result = await query(queryText, values);
      
      return result.rows.map(row => ({
        error_type: row.error_type,
        error_message: row.error_message,
        occurrence_count: parseInt(row.occurrence_count),
        last_occurrence: row.last_occurrence
      }));
    } catch (error) {
      console.error('Error getting error analytics:', error);
      throw error;
    }
  }

  // Generate daily business metrics
  static async generateDailyBusinessMetrics(date = new Date()) {
    try {
      const targetDate = new Date(date);
      targetDate.setHours(0, 0, 0, 0);
      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);

      // Daily Active Users
      const dauQuery = `
        SELECT COUNT(DISTINCT user_id) as count
        FROM user_activities
        WHERE created_at >= $1 AND created_at < $2
      `;
      const dauResult = await query(dauQuery, [targetDate, nextDate]);
      await this.recordBusinessMetric(targetDate, 'daily_active_users', dauResult.rows[0].count);

      // New Registrations
      const newUsersQuery = `
        SELECT COUNT(*) as count
        FROM users
        WHERE created_at >= $1 AND created_at < $2
      `;
      const newUsersResult = await query(newUsersQuery, [targetDate, nextDate]);
      await this.recordBusinessMetric(targetDate, 'new_registrations', newUsersResult.rows[0].count);

      // Data Recovery Sessions
      const recoveryQuery = `
        SELECT COUNT(*) as count
        FROM data_recovery_sessions
        WHERE created_at >= $1 AND created_at < $2
      `;
      const recoveryResult = await query(recoveryQuery, [targetDate, nextDate]);
      await this.recordBusinessMetric(targetDate, 'data_recovery_sessions', recoveryResult.rows[0].count);

      // Phone Transfers
      const transferQuery = `
        SELECT COUNT(*) as count
        FROM phone_transfers
        WHERE created_at >= $1 AND created_at < $2
      `;
      const transferResult = await query(transferQuery, [targetDate, nextDate]);
      await this.recordBusinessMetric(targetDate, 'phone_transfers', transferResult.rows[0].count);

      // Subscription Revenue (simplified - would need Stripe integration for real data)
      const revenueQuery = `
        SELECT COUNT(*) * 9.99 as revenue
        FROM subscriptions
        WHERE status = 'active' AND plan_id != 'free'
          AND created_at >= $1 AND created_at < $2
      `;
      const revenueResult = await query(revenueQuery, [targetDate, nextDate]);
      await this.recordBusinessMetric(targetDate, 'subscription_revenue', revenueResult.rows[0].revenue || 0);

      console.log(`Generated business metrics for ${targetDate.toISOString().split('T')[0]}`);
    } catch (error) {
      console.error('Error generating daily business metrics:', error);
      throw error;
    }
  }

  // Get real-time metrics from Redis
  static async getRealTimeMetrics() {
    try {
      const metrics = {};
      
      // Get active users (users with activity in last hour)
      const activeUsersKey = 'realtime:active_users';
      const activeUsers = await redis.scard(activeUsersKey);
      metrics.active_users = activeUsers;
      
      // Get current system load (if available)
      const systemLoadKey = 'system_metrics:performance:cpu_usage';
      const systemLoad = await redis.get(systemLoadKey);
      if (systemLoad) {
        metrics.system_load = JSON.parse(systemLoad);
      }
      
      // Get error rate (errors in last hour)
      const errorRateKey = 'realtime:error_rate';
      const errorRate = await redis.get(errorRateKey);
      metrics.error_rate = errorRate ? parseFloat(errorRate) : 0;
      
      return metrics;
    } catch (error) {
      console.error('Error getting real-time metrics:', error);
      return {};
    }
  }

  // Update real-time active users
  static async updateActiveUsers(userId) {
    try {
      const activeUsersKey = 'realtime:active_users';
      await redis.sadd(activeUsersKey, userId);
      await redis.expire(activeUsersKey, 3600); // Expire after 1 hour
    } catch (error) {
      console.error('Error updating active users:', error);
    }
  }

  // Clean up old analytics data
  static async cleanupOldData(retentionDays = 90) {
    try {
      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
      
      const queries = [
        'DELETE FROM user_activities WHERE created_at < $1',
        'DELETE FROM system_metrics WHERE recorded_at < $1',
        'DELETE FROM error_logs WHERE created_at < $1',
        'DELETE FROM performance_metrics WHERE created_at < $1'
      ];
      
      let totalDeleted = 0;
      for (const queryText of queries) {
        const result = await query(queryText, [cutoffDate]);
        totalDeleted += result.rowCount;
      }
      
      console.log(`Cleaned up ${totalDeleted} old analytics records`);
      return totalDeleted;
    } catch (error) {
      console.error('Error cleaning up old analytics data:', error);
      throw error;
    }
  }
}

module.exports = AnalyticsService;